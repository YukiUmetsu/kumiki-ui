/** Pooled, GPU-driven dust puffs and dirt clods for footfalls and impacts (hooves, wheels, landings).
 *
 * Nothing is allocated after construction. Each emitter owns fixed-size instanced buffers used as ring
 * buffers: `emit` writes a few instances' start state (origin, velocity, birth time, life, size, seed) and
 * marks just that range for upload; the vertex shaders compute every particle's position from those
 * constants and the current time (drag, buoyancy and wind for dust; a ballistic flight that stops on the
 * ground for clods). So the CPU cost per frame is one uniform update, whatever the particle count.
 *
 * Look: dust is lit by the sun with strong forward scattering, so a backlit plume glows the way dust does
 * against a low sun; puffs grow fast then slowly, rise a little, drift downwind and thin out. Clods are
 * small dark lumps thrown back and up from the hoof, tumbling, landing and fading. Colours default to dry
 * prairie loam; set them from the ground material.
 */
import {
  BufferAttribute, Color, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  MeshStandardMaterial, NormalBlending, ShaderMaterial, UniformsLib, UniformsUtils, Vector3,
} from "three";

export interface DustBurst {
  /** Contact point in the world. */
  position: Vector3;
  /** Scene time of the contact (s); may be slightly in the past for sub-frame accuracy. */
  time: number;
  /** Direction loose earth is thrown (world): back from the direction of travel and up. */
  kick: Vector3;
  /** Throw speed (m/s) and how much earth: 0 (a light touch) … 1 (a hard strike) … 2. */
  speed: number;
  intensity: number;
  /** Ground height under the contact. */
  groundY: number;
}

export interface ImpactDustOptions {
  maxPuffs?: number;
  maxClods?: number;
  dustColor?: string;
  clodColor?: string;
  /** Wind (m/s) that carries the dust. */
  wind?: readonly [number, number, number];
  /** Opacity scale for the dust. */
  density?: number;
  seed?: number;
}

const PUFF_VERTEX = /* glsl */`
attribute vec3 aOrigin; attribute vec3 aVel; attribute float aBirth; attribute float aLife; attribute vec2 aSize; attribute float aSeed; attribute float aDensity;
uniform float uTime; uniform vec3 uWind; uniform float uDrag; uniform float uRise; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uAmbient;
varying vec2 vUv; varying float vAlpha; varying vec3 vLight; varying float vSeed;
#include <fog_pars_vertex>
void main() {
  float age = uTime - aBirth;
  if (age < 0.0 || age > aLife) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  float life = age / aLife;
  float size = mix(aSize.x, aSize.y, sqrt(life));
  vec3 drift = aVel * (1.0 - exp(-uDrag * age)) / uDrag + uWind * age * smoothstep(0.0, 0.6, age) + vec3(0.0, 0.5 * uRise * age * age, 0.0);
  vec3 center = aOrigin + drift;
  // Keep most of the puff above the ground it rose from.
  center.y = max(center.y, aOrigin.y + size * 0.38);
  float a = aSeed * 6.2831 + age * (aSeed - 0.5) * 0.9;
  vec2 c = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 world = center + (right * c.x + up * c.y) * size;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vec3 toCamera = normalize(cameraPosition - center);
  float forward = pow(max(0.0, dot(-toCamera, uSunDir)), 5.0);
  vLight = uAmbient + uSunColor * (0.42 + 2.2 * forward);
  // Thin out puffs close to the lens: a chase camera drives through the dust trail.
  float near = smoothstep(1.2, 6.0, length(cameraPosition - center));
  vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.35, 1.0, life)) * aDensity * near;
  vUv = position.xy + 0.5; vSeed = aSeed;
  #include <fog_vertex>
}`;

const PUFF_FRAGMENT = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying vec2 vUv; varying float vAlpha; varying vec3 vLight; varying float vSeed;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv - 0.5;
  float d = length(p) * 2.0;
  vec2 q = vUv * 3.0 + vSeed * 17.0;
  float n = noise(q) * 0.55 + noise(q * 2.1 + 3.7) * 0.3 + noise(q * 4.3 - 1.3) * 0.15;
  float density = 1.0 - smoothstep(0.25, 1.0, d + (n - 0.5) * 0.7);
  float a = density * density * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * vLight * (0.82 + 0.36 * n), a);
  #include <fog_fragment>
}`;

/** Ring-buffer bookkeeping shared by both emitters: which instance range changed since the last upload. */
class Ring {
  next = 0; lo = Infinity; hi = -1; wrapped = false;
  constructor(readonly size: number) {}
  take(): number {
    const i = this.next;
    this.next = (this.next + 1) % this.size;
    if (this.next === 0) this.wrapped = true;
    this.lo = Math.min(this.lo, i); this.hi = Math.max(this.hi, i);
    return i;
  }
  flush(attributes: readonly InstancedBufferAttribute[]) {
    if (this.hi < 0) return;
    for (const attr of attributes) {
      attr.clearUpdateRanges();
      if (!this.wrapped) attr.addUpdateRange(this.lo * attr.itemSize, (this.hi - this.lo + 1) * attr.itemSize);
      attr.needsUpdate = true;
    }
    this.lo = Infinity; this.hi = -1; this.wrapped = false;
  }
}

const attr = (count: number, size: number) => {
  const a = new InstancedBufferAttribute(new Float32Array(count * size), size);
  a.setUsage(DynamicDrawUsage);
  return a;
};

export class ImpactDust {
  readonly object = new Group();
  private readonly puffs: { ring: Ring; geometry: InstancedBufferGeometry; material: ShaderMaterial; a: Record<string, InstancedBufferAttribute> };
  private readonly clods: { ring: Ring; geometry: InstancedBufferGeometry; material: MeshStandardMaterial; a: Record<string, InstancedBufferAttribute>; uniforms: { uTime: { value: number } } };
  private seed: number;

  constructor(options: ImpactDustOptions = {}) {
    this.seed = options.seed ?? 4242;
    this.object.name = "impact-dust";
    // ---- dust puffs: camera-facing quads
    const maxPuffs = options.maxPuffs ?? 900;
    const quad = new InstancedBufferGeometry();
    quad.setAttribute("position", new BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    const pa = { aOrigin: attr(maxPuffs, 3), aVel: attr(maxPuffs, 3), aBirth: attr(maxPuffs, 1), aLife: attr(maxPuffs, 1), aSize: attr(maxPuffs, 2), aSeed: attr(maxPuffs, 1), aDensity: attr(maxPuffs, 1) };
    pa.aBirth.array.fill(-1e6);
    for (const [name, a] of Object.entries(pa)) quad.setAttribute(name, a);
    quad.instanceCount = maxPuffs;
    const wind = options.wind ?? [-1.2, 0, .6];
    const puffMaterial = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, {
        uTime: { value: 0 }, uWind: { value: new Vector3(...wind) }, uDrag: { value: 2.4 }, uRise: { value: .18 },
        uSunDir: { value: new Vector3(0, 1, 0) }, uSunColor: { value: new Color("#ffe2b8") }, uAmbient: { value: new Color("#7c6f62") },
        uColor: { value: new Color(options.dustColor ?? "#c2a47e") }, uOpacity: { value: options.density ?? .55 },
      }]),
      vertexShader: PUFF_VERTEX, fragmentShader: PUFF_FRAGMENT, transparent: true, depthWrite: false, blending: NormalBlending, fog: true,
    });
    puffMaterial.name = "impact-dust-puff";
    const puffMesh = new Mesh(quad, puffMaterial);
    puffMesh.frustumCulled = false; puffMesh.renderOrder = 10; puffMesh.name = "dust-puffs";
    this.object.add(puffMesh);
    this.puffs = { ring: new Ring(maxPuffs), geometry: quad, material: puffMaterial, a: pa };

    // ---- clods: tumbling lumps on a ballistic path, lit like the scene
    const maxClods = options.maxClods ?? 1200;
    const rock = new IcosahedronGeometry(1, 0);
    const lump = new InstancedBufferGeometry();
    lump.index = rock.index; lump.setAttribute("position", rock.getAttribute("position")); lump.setAttribute("normal", rock.getAttribute("normal"));
    const ca = { aOrigin: attr(maxClods, 3), aVel: attr(maxClods, 3), aBirth: attr(maxClods, 1), aLife: attr(maxClods, 1), aScale: attr(maxClods, 1), aSpin: attr(maxClods, 4), aGround: attr(maxClods, 1) };
    ca.aBirth.array.fill(-1e6);
    for (const [name, a] of Object.entries(ca)) lump.setAttribute(name, a);
    lump.instanceCount = maxClods;
    rock.dispose();
    const clodMaterial = new MeshStandardMaterial({ color: options.clodColor ?? "#6a5238", roughness: .95, flatShading: true });
    clodMaterial.name = "impact-dust-clod";
    const uniforms = { uTime: { value: 0 } };
    clodMaterial.onBeforeCompile = shader => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
attribute vec3 aOrigin; attribute vec3 aVel; attribute float aBirth; attribute float aLife; attribute float aScale; attribute vec4 aSpin; attribute float aGround;
uniform float uTime;
mat3 kmAxisAngle(vec3 a, float t) { float c = cos(t), s = sin(t), k = 1.0 - c;
  return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s, a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s, a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k); }
float kmFlight() { float g = 9.81, h = aOrigin.y - aGround - aScale; return (aVel.y + sqrt(max(0.0, aVel.y * aVel.y + 2.0 * g * h))) / g; }`)
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
float kmAge = uTime - aBirth; float kmT = min(max(kmAge, 0.0), kmFlight());
mat3 kmR = kmAxisAngle(normalize(aSpin.xyz), aSpin.w * kmT);
objectNormal = kmR * objectNormal;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
float kmFade = (kmAge < 0.0 || kmAge > aLife) ? 0.0 : 1.0 - smoothstep(0.7, 1.0, kmAge / aLife);
float kmSlide = max(0.0, kmAge - kmT);
vec3 kmPos = aOrigin + aVel * kmT + vec3(0.0, -4.905 * kmT * kmT, 0.0) + vec3(aVel.x, 0.0, aVel.z) * 0.12 * (1.0 - exp(-6.0 * kmSlide));
transformed = kmPos + kmR * (transformed * vec3(1.0, 0.7, 0.85)) * aScale * kmFade;`);
    };
    const clodMesh = new Mesh(lump, clodMaterial);
    clodMesh.frustumCulled = false; clodMesh.name = "dust-clods";
    this.object.add(clodMesh);
    this.clods = { ring: new Ring(maxClods), geometry: lump, material: clodMaterial, a: ca, uniforms };
  }

  private random() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  /** Throw a burst of dust and clods. Allocation-free. */
  emit(burst: DustBurst) {
    const r = () => this.random(), I = Math.max(0, burst.intensity);
    const { position: p, kick: k } = burst;
    const puffCount = Math.round(4 + 6 * I), clodCount = Math.round(6 + 14 * I);
    const P = this.puffs, C = this.clods;
    for (let n = 0; n < puffCount; n++) {
      const i = P.ring.take();
      const spread = .35 + .3 * r(), lift = .25 + .5 * r();
      P.a.aOrigin.setXYZ(i, p.x + (r() - .5) * .18, burst.groundY + .02, p.z + (r() - .5) * .18);
      P.a.aVel.setXYZ(i, k.x * burst.speed * spread + (r() - .5) * 1.4, burst.speed * lift * .6 + r() * .5, k.z * burst.speed * spread + (r() - .5) * 1.4);
      P.a.aBirth.setX(i, burst.time - r() * .03);
      P.a.aLife.setX(i, 1.4 + 2.2 * r() * (.6 + .4 * I));
      P.a.aSize.setXY(i, .22 + .22 * r(), 1.3 + 1.9 * r() * (.5 + .5 * I));
      P.a.aSeed.setX(i, r());
      P.a.aDensity.setX(i, (.35 + .5 * r()) * Math.min(1.3, .45 + .55 * I));
    }
    for (let n = 0; n < clodCount; n++) {
      const i = C.ring.take();
      const v = burst.speed * (.45 + .75 * r());
      // Thrown back along the kick in a cone, up at 20–60°.
      const up = .35 + .65 * r(), side = (r() - .5) * .9;
      C.a.aOrigin.setXYZ(i, p.x + (r() - .5) * .08, burst.groundY + .03, p.z + (r() - .5) * .08);
      C.a.aVel.setXYZ(i, (k.x - k.z * side) * v, v * up, (k.z + k.x * side) * v);
      C.a.aBirth.setX(i, burst.time);
      C.a.aLife.setX(i, .9 + 1.4 * r());
      C.a.aScale.setX(i, .008 + .022 * r() * r());
      C.a.aSpin.set([r() - .5, r() - .5, r() - .5, 8 + 22 * r()], i * 4);
      C.a.aGround.setX(i, burst.groundY);
    }
  }

  /** Advance the simulation clock and light; uploads only the instances written since the last call. */
  update(time: number, sunDirection?: Vector3, sunColor?: Color, ambient?: Color) {
    const u = this.puffs.material.uniforms;
    u.uTime.value = time;
    if (sunDirection) u.uSunDir.value.copy(sunDirection).normalize();
    if (sunColor) u.uSunColor.value.copy(sunColor);
    if (ambient) u.uAmbient.value.copy(ambient);
    this.clods.uniforms.uTime.value = time;
    this.puffs.ring.flush(Object.values(this.puffs.a));
    this.clods.ring.flush(Object.values(this.clods.a));
  }

  /** Change dust colour and wind at run time (for example from the ground under the hooves). */
  setLook(look: { dustColor?: string; clodColor?: string; wind?: readonly [number, number, number]; density?: number }) {
    const u = this.puffs.material.uniforms;
    if (look.dustColor) u.uColor.value.set(look.dustColor);
    if (look.wind) u.uWind.value.set(...look.wind);
    if (look.density !== undefined) u.uOpacity.value = look.density;
    if (look.clodColor) this.clods.material.color.set(look.clodColor);
  }

  dispose() {
    this.puffs.geometry.dispose(); this.puffs.material.dispose();
    this.clods.geometry.dispose(); this.clods.material.dispose();
  }
}
