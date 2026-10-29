/**
 * Real 3D jungle for `nature-world-identity-reveal` (Three.js). Loaded only by
 * the recipe's renderer slot, so the scene-template foundation carries no hard
 * 3D dependency; the 2.5D depth-plane stage is the fallback.
 *
 * Everything is a pure function of the frame: the camera glide, wind sway,
 * the mark's rise and the motes are evaluated from `frame`, and every instance
 * comes from a seeded generator. No clock, no frame history.
 *
 * Look: scanned CC0 undergrowth instanced at many depths, procedural fan palms
 * and broad leaves, a bamboo grove and bark trunks behind, an HDRI plus a low
 * warm back-sun with soft shadows, leaf translucency, depth of field from the
 * depth buffer (alpha-tested leaves included), bloom, a warm grade and ACES.
 */
import {
  ACESFilmicToneMapping, AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DataTexture,
  DepthTexture, DirectionalLight, DoubleSide, DynamicDrawUsage, EquirectangularReflectionMapping, ExtrudeGeometry, FogExp2,
  Group, HalfFloatType, InstancedMesh, MathUtils, Matrix4, Mesh, MeshDepthMaterial, MeshPhysicalMaterial, MeshStandardMaterial,
  Object3D, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Points, Quaternion, RepeatWrapping, RGBADepthPacking,
  Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, UnsignedIntType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget,
} from "three";
import type { Material, Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { NatureWorld3DConfig } from "./nature-world-identity-reveal-stage";
export type { NatureWorld3DConfig };
export interface NatureWorld3D { render(frame: number): void; resize(width: number, height: number): void; dispose(): void }

/* ---------- deterministic helpers ---------- */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp01(n); return t * t * t * (t * (t * 6 - 15) + 10); };
/** Glide progress: velocity ramps up over ~6 frames, holds, then eases to rest at the end. */
export function glideProgress(frame: number, end: number): number {
  const ramp = Math.min(.2, 6 / Math.max(1, end)), steps = 200;
  const v = (s: number) => Math.min(1, s / ramp) * (1 - Math.pow(s, 2.4));
  const u = clamp01(frame / Math.max(1, end));
  let total = 0, at = 0;
  for (let i = 0; i < steps; i++) { const s = (i + .5) / steps, d = v(s) / steps; total += d; if (s < u) at += d; }
  return at / total;
}
/** Camera presets: positions and look targets in metres (mark at the origin of the clearing, z = −1.2). */
export function cameraAt(preset: NatureWorld3DConfig["camera"], p: number, frame: number) {
  const paths = {
    "glide": { from: [-.22, .3, 2.9], to: [0, .42, 1.0], lookFrom: [0, .32, -1.2], lookTo: [0, .3, -1.2] },
    "low-glide": { from: [-.3, .16, 2.9], to: [.02, .24, .7], lookFrom: [0, .26, -1.2], lookTo: [0, .32, -1.2] },
    "rise": { from: [-.15, .1, 2.4], to: [.05, .42, .75], lookFrom: [0, .2, -1.2], lookTo: [0, .38, -1.2] },
  }[preset];
  const lerp = (a: number[], b: number[]) => a.map((x, i) => x + (b[i] - x) * p);
  const pos = lerp(paths.from, paths.to), look = lerp(paths.lookFrom, paths.lookTo);
  // A barely-there handheld float that fades as the glide settles.
  const live = 1 - p * .7;
  pos[1] += .006 * live * Math.sin(frame * .11); pos[0] += .004 * live * Math.sin(frame * .07 + 1.3);
  return { position: new Vector3(...pos), target: new Vector3(...look) };
}

/* ---------- procedural plant geometry ---------- */
/** A pleated fan-palm leaf: folded radial segments with split tips. Origin at the petiole tip, opening along +z. */
function fanLeaf(r: () => number, radius: number): BufferGeometry {
  const pleats = 22, span = Math.PI * (1.05 + r() * .2), pos: number[] = [], col: number[] = [];
  const base = new Color("#14361a"), tip = new Color("#3f6a2c");
  for (let i = 0; i < pleats; i++) {
    const a0 = -span / 2 + span * i / pleats, a1 = -span / 2 + span * (i + 1) / pleats, am = (a0 + a1) / 2;
    const fold = (i % 2 ? 1 : -1) * radius * .045, tipR = radius * (1.04 + r() * .12);
    const P = (a: number, rr: number, z: number) => [Math.sin(a) * rr, z, Math.cos(a) * rr];
    const c0 = [0, 0, 0], e0 = P(a0, radius * .96, 0), e1 = P(a1, radius * .96, 0), mid = P(am, radius * .55, fold), tipP = P(am, tipR, fold * .4);
    for (const tri of [[c0, e0, mid], [c0, mid, e1], [e0, tipP, mid], [mid, tipP, e1]]) for (const v of tri) {
      pos.push(v[0], v[1], v[2]); const k = Math.hypot(v[0], v[2]) / radius; const cc = base.clone().lerp(tip, k * .8); col.push(cc.r, cc.g, cc.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(pos.length / 3 * 2).fill(.5), 2));
  // Cupped and drooping a little toward the rim.
  const p = g.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / radius; p.setY(i, p.getY(i) + d * d * radius * -.25 + Math.abs(x) * .15); }
  g.computeVertexNormals();
  return g;
}
/** A broad heart-shaped leaf on a grid (so it can bend), midrib crease and droop. Origin at the petiole, pointing +z. */
function broadLeaf(r: () => number, length: number): BufferGeometry {
  const nu = 10, nv = 16, pos: number[] = [], col: number[] = [], idx: number[] = [], uv: number[] = [];
  const dark = new Color("#183f1b"), light = new Color("#4f8f33"), droop = .8 + r() * .5;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const v = j / nv, u = i / nu * 2 - 1;
    const half = Math.pow(Math.sin(Math.PI * Math.min(1, v * .95 + .05)), .75) * (.42 + .18 * (1 - v)) * length;
    const x = u * half, zz = v * length - (v < .12 ? (.12 - v) * Math.abs(u) * length * .9 : 0);
    const y = -Math.abs(u) * half * .22 + Math.pow(v, 2) * -length * .3 * droop + Math.sin(v * Math.PI) * length * .08;
    pos.push(x, y, zz); uv.push((u + 1) / 2, v);
    const cc = dark.clone().lerp(light, .35 + .45 * v + .1 * (1 - Math.abs(u))); col.push(cc.r, cc.g, cc.b);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Painted leaf surface for the procedural broad leaves: midrib, curved lateral veins and soft mottling. */
function veinTexture(): CanvasTexture | undefined {
  const c = document.createElement("canvas"); c.width = 256; c.height = 512;
  const g = c.getContext("2d"); if (!g) return undefined;
  const r = rng(91);
  g.fillStyle = "#7d9a5c"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + r() * 40},${70 + r() * 50},${30 + r() * 30},${.05 + r() * .08})`; g.beginPath(); g.arc(r() * 256, r() * 512, 6 + r() * 26, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "rgba(225,240,190,.75)"; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 512); g.stroke();
  g.lineWidth = 2; g.strokeStyle = "rgba(215,235,175,.45)";
  for (let k = 0; k < 13; k++) { const y = 30 + k * 36; for (const side of [-1, 1]) { g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + side * 60, y + 18, 128 + side * 124, y + 70); g.stroke(); } }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
/** A plant: several leaves on petioles radiating from the base. */
function plant(kind: "fan" | "broad", seed: number): BufferGeometry {
  const r = rng(seed), parts: BufferGeometry[] = [], leaves = kind === "fan" ? 5 + Math.floor(r() * 4) : 4 + Math.floor(r() * 4);
  for (let k = 0; k < leaves; k++) {
    const yaw = (k / leaves) * Math.PI * 2 + r() * .6, tilt = .35 + r() * .55, stalk = kind === "fan" ? .35 + r() * .5 : .12 + r() * .25;
    const leaf = kind === "fan" ? fanLeaf(r, .32 + r() * .2) : broadLeaf(r, .28 + r() * .22);
    const stem = new CylinderGeometry(.006, .009, stalk, 5); stem.translate(0, stalk / 2, 0);
    stem.setAttribute("uv", new BufferAttribute(new Float32Array(stem.getAttribute("position").count * 2).fill(.5), 2));
    const sc = new Float32Array(stem.getAttribute("position").count * 3).fill(0); for (let i = 0; i < sc.length; i += 3) { sc[i] = .14; sc[i + 1] = .26; sc[i + 2] = .1; }
    stem.setAttribute("color", new BufferAttribute(sc, 3));
    const m = new Matrix4().compose(new Vector3(0, stalk, 0), new Quaternion().setFromEuler(new Object3D().rotation.set(-tilt, yaw, 0)), new Vector3(1, 1, 1));
    leaf.applyMatrix4(m);
    const ms = new Matrix4().makeRotationY(yaw).multiply(new Matrix4().makeRotationX(-tilt * .5));
    stem.applyMatrix4(ms);
    parts.push(leaf, stem);
  }
  const merged = mergeGeometries(parts.map(p => { const q = p.index ? p.toNonIndexed() : p; if (!q.getAttribute("normal")) q.computeVertexNormals(); return q; }));
  return merged ?? parts[0];
}

/* ---------- materials ---------- */
interface Shared { uTime: { value: number }; uSunDir: { value: Vector3 }; uSunColor: { value: Color }; uWind: { value: number } }
/** Wind sway (vertex) and leaf translucency (fragment), both driven by shared deterministic uniforms. */
function foliage(material: MeshStandardMaterial | MeshPhysicalMaterial, shared: Shared, translucency: number, windScale = 1): void {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, shared, { uTransl: { value: translucency }, uWindScale: { value: windScale } });
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
uniform float uTime; uniform float uWind; uniform float uWindScale;`).replace("#include <begin_vertex>", `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3]);
#else
  vec3 ip = vec3(0.0);
#endif
  float hh = max(transformed.y, 0.0);
  float ph = dot(ip.xz, vec2(1.7, 2.3));
  transformed.x += sin(uTime * 1.3 + ph) * uWind * uWindScale * hh * hh * 1.6;
  transformed.z += cos(uTime * 1.1 + ph * 1.3) * uWind * uWindScale * hh * hh;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uTransl;`).replace("#include <opaque_fragment>", `
  {
    // Light through the leaf: forward scattering toward the camera plus a diffuse back term.
    vec3 Vd = normalize(vViewPosition);
    vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
    float fwd = pow(clamp(dot(-Vd, L), 0.0, 1.0), 4.0);
    float back = clamp(-dot(normal, L), 0.0, 1.0);
    outgoingLight += uTransl * diffuseColor.rgb * uSunColor * (0.45 * back + 1.6 * fwd);
  }
#include <opaque_fragment>`);
  };
}

/* ---------- the scene ---------- */
const loadTexture = (loader: TextureLoader, src: string, srgb: boolean, repeat = 1) => loader.loadAsync(src).then(t => {
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat, repeat); if (srgb) t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t; });

export async function createNatureWorld3D(canvas: HTMLCanvasElement, cfg: NatureWorld3DConfig, width: number, height: number): Promise<NatureWorld3D> {
  const renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(width, height, false);
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = cfg.grade.exposure;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  const owned: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(x: T) => { owned.push(x); return x; };
  const tex = new TextureLoader();
  const r = rng(cfg.seed);
  // Sun: azimuth 0 sits behind the clearing (−z), so leaves are backlit and rim-lit toward camera.
  const az = MathUtils.degToRad(cfg.sun.azimuth), el = MathUtils.degToRad(cfg.sun.elevation);
  const sunDir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  const sunColor = new Color().setHSL(.1 - .04 * cfg.sun.warmth, .55 + .35 * cfg.sun.warmth, .62);
  const shared: Shared = { uTime: { value: 0 }, uSunDir: { value: sunDir }, uSunColor: { value: sunColor.clone().multiplyScalar(cfg.sun.intensity) }, uWind: { value: .05 } };

  const [hdr, groundMaps, barkMaps, gltfs, svgText] = await Promise.all([
    new HDRLoader().loadAsync(cfg.hdri),
    Promise.all([loadTexture(tex, cfg.ground.diffuse, true, 14), cfg.ground.normal ? loadTexture(tex, cfg.ground.normal, false, 14) : undefined,
      cfg.ground.arm ? loadTexture(tex, cfg.ground.arm, false, 14) : undefined]),
    cfg.bark ? Promise.all([loadTexture(tex, cfg.bark.diffuse, true), cfg.bark.normal ? loadTexture(tex, cfg.bark.normal, false) : undefined]) : Promise.resolve(undefined),
    Promise.all(cfg.undergrowth.map(u => new GLTFLoader().loadAsync(u.src))),
    fetch(cfg.mark.src).then(res => { if (!res.ok) throw new Error("Mark artwork could not be loaded."); return res.text(); }),
  ]);
  hdr.mapping = EquirectangularReflectionMapping;
  const pmrem = own(new PMREMGenerator(renderer));
  const env = own(pmrem.fromEquirectangular(hdr as DataTexture).texture);
  scene.environment = env; scene.environmentIntensity = .45;
  scene.background = hdr; scene.backgroundBlurriness = .5; scene.backgroundIntensity = .85;
  own(hdr);
  scene.fog = new FogExp2(new Color("#c7c98a").multiplyScalar(.5), .06);

  const sun = new DirectionalLight(sunColor, 4.4 * cfg.sun.intensity);
  sun.position.copy(sunDir).multiplyScalar(12); sun.target.position.set(0, 0, -.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
  scene.add(sun, sun.target);

  // Ground: leaf litter with normal and ARM, and a gentle deterministic undulation.
  const groundGeo = own(new PlaneGeometry(40, 40, 96, 96)); groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, .04 * Math.sin(x * 1.3 + 1) * Math.cos(z * 1.1) + .02 * Math.sin(x * 3.1 + z * 2.3)); }
  groundGeo.computeVertexNormals();
  const [gDiff, gNor, gArm] = groundMaps;
  const groundMat = own(new MeshStandardMaterial({ map: gDiff, normalMap: gNor, roughnessMap: gArm, aoMap: gArm, roughness: 1, color: new Color("#a99a78") }));
  const ground = new Mesh(groundGeo, groundMat); ground.receiveShadow = true; scene.add(ground);

  // Scanned undergrowth: every mesh in every file is a variant, instanced with seeded scale, yaw and tint.
  const leafTint = new Color(cfg.leafTint);
  const clearing = { x: 0, z: -1.2, r: .7 };
  const variants: { geo: BufferGeometry; mat: Material; height: number; small: boolean }[] = [];
  gltfs.forEach(g => g.scene.traverse(o => {
    const mesh = o as Mesh; if (!mesh.isMesh) return;
    const geo = mesh.geometry as BufferGeometry; geo.computeBoundingBox();
    const height = geo.boundingBox!.max.y - geo.boundingBox!.min.y;
    const src = mesh.material as MeshStandardMaterial;
    const mat = own(src.clone()); mat.side = DoubleSide; mat.alphaTest = Math.max(.4, mat.alphaTest || .5); mat.envMapIntensity = .45;
    mat.roughness = Math.min(mat.roughness, .75);
    foliage(mat, shared, .55);
    variants.push({ geo, mat, height, small: height < .1 });
  }));
  const placeInstances = (geo: BufferGeometry, mat: Material, count: number, opts: { minScale: number; maxScale: number; region: (r: () => number) => [number, number] | undefined; tintJitter: number; depthMap?: Texture }) => {
    const mesh = new InstancedMesh(geo, mat, count); mesh.castShadow = true; mesh.receiveShadow = true;
    const m = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3(), c = new Color();
    let n = 0;
    for (let tries = 0; n < count && tries < count * 20; tries++) {
      const at = opts.region(r); if (!at) continue;
      const sc = opts.minScale + (opts.maxScale - opts.minScale) * Math.pow(r(), 1.4);
      q.setFromAxisAngle(new Vector3(0, 1, 0), r() * Math.PI * 2).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (r() - .5) * .25));
      m.compose(p.set(at[0], 0, at[1]), q, s.set(sc, sc * (.9 + r() * .25), sc)); mesh.setMatrixAt(n, m);
      c.copy(leafTint).offsetHSL((r() - .5) * .04, (r() - .5) * opts.tintJitter, (r() - .5) * opts.tintJitter); mesh.setColorAt(n, c); n++;
    }
    mesh.count = n;
    if (opts.depthMap !== undefined || (mat as MeshStandardMaterial).alphaMap || (mat as MeshStandardMaterial).map) {
      // Alpha-tested shadows: leaves cast leaf-shaped shadows, not quad shadows.
      mesh.customDepthMaterial = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: (mat as MeshStandardMaterial).map, alphaTest: .5 }));
    }
    scene.add(mesh); return mesh;
  };
  const outsideClearing = (x: number, z: number, pad = 0) => Math.hypot(x - clearing.x, z - clearing.z) > clearing.r + pad;
  const density = cfg.density;
  // Big undergrowth fills the field; it thins near the camera path so leaves brush past rather than block.
  /** The glide corridor: x of the camera path at depth z (it drifts from −0.22 at z 2.7 to 0.04 at z 0.6). */
  const pathX = (z: number) => -.22 + (2.9 - z) / 1.9 * .22;
  const field = (rr: () => number): [number, number] | undefined => {
    const x = (rr() - .5) * 6.5, z = -3.4 + rr() * 6.1;
    if (!outsideClearing(x, z)) return undefined;
    // Keep the corridor open (wider near the camera), so leaves frame and brush past rather than block.
    if (z > -.6 && Math.abs(x - pathX(Math.min(2.7, z))) < .46 + Math.max(0, z) * .08) return undefined;
    return [x, z];
  };
  for (const v of variants) {
    if (v.small) placeInstances(v.geo, v.mat, Math.round(70 * density), { minScale: 2.4, maxScale: 3.6, tintJitter: .12,
      region: rr => { const x = (rr() - .5) * 6, z = -3.2 + rr() * 6; return Math.abs(x - pathX(Math.min(2.7, z))) < .12 && z > -.4 ? undefined : [x, z]; } });
    else placeInstances(v.geo, v.mat, Math.round(30 * density), { minScale: .9, maxScale: 1.7, tintJitter: .14, region: field });
  }
  // Leaves in front of the mark: a low band just ahead of it, so it reads as standing among plants.
  const frontBand = (rr: () => number): [number, number] | undefined => { const x = (rr() - .5) * 1.8; return Math.abs(x) < .22 ? undefined : [x, clearing.z + clearing.r * (.55 + rr() * .3)]; };
  variants.filter(v => !v.small).slice(0, 3).forEach(v => placeInstances(v.geo, v.mat, Math.round(1.5 * density), { minScale: .45, maxScale: .65, tintJitter: .1, region: frontBand }));
  // Procedural fan palms and broad leaves: glossy, vertex-shaded, translucent.
  const palmMat = own(new MeshPhysicalMaterial({ vertexColors: true, roughness: .5, metalness: 0, clearcoat: .2, clearcoatRoughness: .45, side: DoubleSide, envMapIntensity: .4 }));
  foliage(palmMat, shared, .35, 1.3);
  const veins = veinTexture(); if (veins) own(veins);
  const broadMat = own(new MeshPhysicalMaterial({ vertexColors: true, map: veins, roughness: .38, metalness: 0, clearcoat: .45, clearcoatRoughness: .3, side: DoubleSide }));
  foliage(broadMat, shared, .5, 1.2);
  // Fan palms stay in the mid and far field, where their pleats read and their facets do not.
  const farField = (rr: () => number) => { const at = field(rr); return at && at[1] < .1 ? at : undefined; };
  for (let k = 0; k < 4; k++) placeInstances(own(plant("fan", cfg.seed * 7 + k)), palmMat, Math.round(9 * density), { minScale: .55, maxScale: 1.1, tintJitter: .1, region: farField });
  for (let k = 0; k < 4; k++) placeInstances(own(plant("broad", cfg.seed * 11 + k)), broadMat, Math.round(12 * density), { minScale: .6, maxScale: 1.15, tintJitter: .08, region: field });

  // Grove: bamboo culms and a few bark trunks beyond the clearing, kept soft by depth of field.
  if (cfg.grove !== "none") {
    const nodeCanvas = document.createElement("canvas"); nodeCanvas.width = 16; nodeCanvas.height = 256;
    const nc = nodeCanvas.getContext("2d");
    if (nc) { const gr = nc.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#9fae4c"); gr.addColorStop(1, "#6d8a34"); nc.fillStyle = gr; nc.fillRect(0, 0, 16, 256);
      nc.fillStyle = "rgba(60,70,25,.85)"; nc.fillRect(0, 0, 16, 6); nc.fillStyle = "rgba(230,235,170,.6)"; nc.fillRect(0, 6, 16, 3); }
    const nodeTex = own(new CanvasTexture(nodeCanvas)); nodeTex.colorSpace = SRGBColorSpace; nodeTex.wrapS = nodeTex.wrapT = RepeatWrapping; nodeTex.repeat.set(1, 14);
    if (cfg.grove === "bamboo") {
      const culm = own(new CylinderGeometry(1, 1, 1, 10, 1, true)); culm.translate(0, .5, 0);
      const culmMat = own(new MeshStandardMaterial({ map: nodeTex, roughness: .5, color: new Color("#d8e3a0") }));
      const culms = placeInstances(culm, culmMat, Math.round(150 * Math.min(1.5, density)), { minScale: 1, maxScale: 1, tintJitter: .12,
        region: rr => { const x = (rr() - .5) * 11, z = -3.6 - rr() * 5; return [x, z]; } });
      // Culm radius and height are per instance: rescale the matrices non-uniformly.
      const m = new Matrix4(), p = new Vector3(), q = new Quaternion(), s = new Vector3();
      for (let i = 0; i < culms.count; i++) { culms.getMatrixAt(i, m); m.decompose(p, q, s); const rad = .028 + r() * .035; m.compose(p, new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (r() - .5) * .08), s.set(rad, 6 + r() * 3, rad)); culms.setMatrixAt(i, m); }
      culms.instanceMatrix.needsUpdate = true;
    }
    if (barkMaps) {
      const trunkGeo = own(new CylinderGeometry(1, 1.25, 1, 24, 6, true)); trunkGeo.translate(0, .5, 0);
      const tp = trunkGeo.getAttribute("position") as BufferAttribute;
      for (let i = 0; i < tp.count; i++) { const a = Math.atan2(tp.getZ(i), tp.getX(i)), y = tp.getY(i); const k = 1 + .08 * Math.sin(a * 5 + y * 3) + (y < .12 ? (.12 - y) * 2.5 : 0); tp.setX(i, tp.getX(i) * k); tp.setZ(i, tp.getZ(i) * k); }
      trunkGeo.computeVertexNormals();
      const [bDiff, bNor] = barkMaps; bDiff.repeat.set(3, 4); bNor?.repeat.set(3, 4);
      const trunkMat = own(new MeshStandardMaterial({ map: bDiff, normalMap: bNor, roughness: .9, color: new Color("#b8a68a") }));
      const trunks = new InstancedMesh(trunkGeo, trunkMat, 5); trunks.castShadow = trunks.receiveShadow = true;
      const spots: [number, number, number][] = [[1.15, -2.6, .3], [-1.6, -3.1, .24], [2.6, -4.2, .34], [-3.1, -4.6, .3], [.45, -5.4, .22]];
      spots.forEach(([x, z, rad], i) => trunks.setMatrixAt(i, new Matrix4().compose(new Vector3(x, 0, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i * 1.7), new Vector3(rad, 9, rad))));
      scene.add(trunks);
    }
  }

  // The caller's mark, extruded from its SVG, standing in the clearing.
  const data = new SVGLoader().parse(svgText);
  const shapes = data.paths.flatMap(path => SVGLoader.createShapes(path));
  const markGeoRaw = new ExtrudeGeometry(shapes, { depth: 40, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 4, curveSegments: 24 });
  markGeoRaw.computeBoundingBox();
  const bb = markGeoRaw.boundingBox!, mh = bb.max.y - bb.min.y, scale = .7 / mh;
  // SVG y grows downward: centre it, rotate half a turn about x (keeps winding), base on the ground.
  markGeoRaw.translate(-(bb.min.x + bb.max.x) / 2, -bb.max.y, -(bb.min.z + bb.max.z) / 2);
  markGeoRaw.rotateX(Math.PI);
  markGeoRaw.scale(scale, scale, scale * Math.max(.2, cfg.mark.thickness * 10));
  markGeoRaw.computeVertexNormals();
  const markGeo = own(markGeoRaw);
  const markMat = own(new MeshPhysicalMaterial({ color: new Color(cfg.mark.color), roughness: .28, metalness: .02, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: 1.6 }));
  const mark = new Mesh(markGeo, markMat); mark.castShadow = true; mark.receiveShadow = true;
  // A soft warm key from the camera side, as on a product set: the back-sun alone leaves the mark's face in shade.
  const key = new DirectionalLight(new Color("#fff2dc"), 1.6 * cfg.sun.intensity); key.position.set(-1.2, 2.2, 3.5); key.target = mark;
  scene.add(key);
  const markGroup = new Group(); markGroup.position.set(clearing.x, 0, clearing.z); markGroup.add(mark); scene.add(markGroup);

  // Sun shafts: soft additive slabs along the light direction, and pollen drifting through them.
  const shaftCanvas = document.createElement("canvas"); shaftCanvas.width = 64; shaftCanvas.height = 256;
  const sc2 = shaftCanvas.getContext("2d");
  if (sc2) { const gr = sc2.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    sc2.fillStyle = gr; sc2.fillRect(0, 0, 64, 256); const fade = sc2.createLinearGradient(0, 0, 0, 256); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(.25, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
    sc2.globalCompositeOperation = "destination-in"; sc2.fillStyle = fade; sc2.fillRect(0, 0, 64, 256); }
  const shaftTex = own(new CanvasTexture(shaftCanvas));
  const shaftMat = own(new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { map: { value: shaftTex }, color: { value: sunColor }, strength: { value: .12 * cfg.sun.intensity } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform sampler2D map; uniform vec3 color; uniform float strength; varying vec2 vUv; void main(){ gl_FragColor=vec4(color*texture2D(map,vUv).r*strength,1.0); }" }));
  const shaftGeo = own(new PlaneGeometry(1, 1));
  for (let k = 0; k < 5; k++) {
    const shaft = new Mesh(shaftGeo, shaftMat);
    const base = new Vector3((k - 2) * .55 + (r() - .5) * .3, 0, clearing.z - .2 - r() * 1.4);
    shaft.position.copy(base).addScaledVector(sunDir, 2.4);
    shaft.scale.set(.18 + r() * .25, 5.5, 1);
    shaft.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), sunDir);
    scene.add(shaft);
  }
  const moteCount = 260, motePos = new Float32Array(moteCount * 3), moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) { motePos.set([(r() - .5) * 3, .05 + r() * 1.3, clearing.z + 1.6 - r() * 3.2], i * 3); moteSeed[i] = r(); }
  const moteGeo = own(new BufferGeometry()); moteGeo.setAttribute("position", new BufferAttribute(motePos, 3)); moteGeo.setAttribute("seed", new BufferAttribute(moteSeed, 1));
  (moteGeo.getAttribute("position") as BufferAttribute).setUsage(DynamicDrawUsage);
  const moteMat = own(new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: shared.uTime, color: { value: sunColor }, pixel: { value: height / 540 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float pixel; varying float vA;
      void main(){ vec3 p = position; float t = uTime * (0.15 + seed * 0.2);
        p.x += sin(t + seed * 40.0) * 0.12; p.y += sin(t * 0.7 + seed * 17.0) * 0.08; p.z += cos(t * 0.5 + seed * 9.0) * 0.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = pixel * (1.5 + seed * 2.5) * (2.0 / -mv.z); vA = 0.35 + 0.65 * fract(seed * 13.0); }`,
    fragmentShader: `uniform vec3 color; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(color * a * vA * 1.4, 1.0); }` }));
  scene.add(new Points(moteGeo, moteMat));

  // Camera and post: depth-aware DoF (circle of confusion from the depth buffer), bloom, grade, ACES output.
  const camera = new PerspectiveCamera(32, width / height, .05, 60);
  const depthTex = (w: number, h: number) => { const d = new DepthTexture(w, h); d.type = UnsignedIntType; return d; };
  const target = new WebGLRenderTarget(width, height, { type: HalfFloatType, samples: 4 });
  target.depthTexture = depthTex(width, height);
  const composer = new EffectComposer(renderer, target);
  composer.renderTarget2.depthTexture = depthTex(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const dof = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, resolution: { value: new Vector2(width, height) },
      near: { value: camera.near }, far: { value: camera.far }, focus: { value: 2 }, aperture: { value: 1 }, maxRadius: { value: 14 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 resolution; uniform float near; uniform float far;
      uniform float focus; uniform float aperture; uniform float maxRadius; varying vec2 vUv;
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float coc(float d){ return clamp(aperture * abs(1.0 / focus - 1.0 / d) * resolution.y * 0.045, 0.0, maxRadius); }
      void main(){
        float c0 = coc(lin(vUv));
        vec3 acc = texture2D(tDiffuse, vUv).rgb; float wsum = 1.0;
        for (int i = 0; i < 48; i++) {
          float fi = float(i) + 0.5; float rr = sqrt(fi / 48.0) * maxRadius; float a = fi * 2.39996;
          vec2 off = vec2(cos(a), sin(a)) * rr / resolution;
          float cs = coc(lin(vUv + off));
          // A sample contributes if its own blur reaches here; sharp foreground does not smear behind.
          float w = smoothstep(rr - 1.5, rr + 0.5, min(cs, max(c0, cs * 0.5)) );
          acc += texture2D(tDiffuse, vUv + off).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }` });
  composer.addPass(dof);
  const bloom = new UnrealBloomPass(new Vector2(width, height), .32, .6, .92);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, saturation: { value: cfg.grade.saturation }, warmth: { value: cfg.grade.warmth } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform float saturation; uniform float warmth; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, saturation); c *= vec3(1.0 + 0.12 * warmth, 1.0 + 0.04 * warmth, 1.0 - 0.12 * warmth);
        // Gentle contrast around mid-grey, in linear light before the filmic curve.
        c = max(vec3(0.0), (c - 0.18) * 1.12 + 0.18);
        // Lift the deepest greens slightly so the jungle never turns to black mush.
        c += vec3(0.004, 0.006, 0.003);
        gl_FragColor = vec4(c, 1.0); }` });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  owned.push(composer, target, bloom);

  let w = width, h = height;
  return {
    resize(nw, nh) { w = nw; h = nh; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
      (dof.uniforms.resolution.value as Vector2).set(w, h); },
    render(frame) {
      const { dock, reveal, glideEnd, fps } = cfg.beats;
      shared.uTime.value = frame / fps;
      const p = glideProgress(frame, glideEnd);
      const cam = cameraAt(cfg.camera, p, frame);
      const portrait = h > w;
      camera.fov = portrait ? 54 : 32; camera.aspect = w / h; camera.updateProjectionMatrix();
      camera.position.copy(cam.position); camera.lookAt(cam.target);
      // The mark rises out of the undergrowth, turning so the sun runs across its face as it settles.
      const rise = smooth((frame - dock) / Math.max(1, reveal - dock));
      const turn = smooth((frame - dock) / Math.max(1, reveal + 12 - dock));
      markGroup.position.y = -.66 * (1 - rise);
      markGroup.rotation.y = -.55 * (1 - turn);
      markGroup.visible = frame >= dock - 1;
      // Focus rides the mark: soft near leaves, soft grove, crisp mark.
      const focus = camera.position.distanceTo(new Vector3(clearing.x, .3, clearing.z));
      dof.uniforms.focus.value = focus;
      dof.uniforms.aperture.value = cfg.dof * (portrait ? .8 : 1);
      dof.uniforms.tDepth.value = composer.readBuffer.depthTexture;
      dof.uniforms.near.value = camera.near; dof.uniforms.far.value = camera.far;
      composer.render();
    },
    dispose() { owned.forEach(x => x.dispose()); renderer.dispose(); },
  };
}
/** Exported for tests that exercise the deterministic geometry without WebGL. */
export const proceduralPlant = plant;
