/** Caustics: the bright, moving web of light that water and glass focus onto the floor beneath them.
 *
 * Method (after Evan Wallace's WebGL Water): look at the light-bending surfaces from the light and record each one's surface normal and
 * depth. Then a dense grid of light rays is traced through that record: every ray refracts at the surface and lands on the floor, and a
 * grid triangle that lands smaller than it started is brighter, by the ratio of the two areas. Rays converge into lines and knots of
 * light and diverge into soft dark gaps, which is what makes caustics read as real. Red, green and blue refract by slightly different
 * amounts, so focused edges split into a faint spectrum, as through a real lens.
 *
 * The result is a texture on a floor-aligned catcher plane, added to the floor's own light and tinted by the floor's albedo. It reads
 * only the casters' current geometry, so a water surface displaced on the CPU from the frame number gives the same pattern at that
 * frame every time, in any order. No time, no randomness, no downloads.
 */
import {
  AdditiveBlending, Color, CustomBlending, DoubleSide, HalfFloatType, LinearFilter, Mesh, OneFactor, OrthographicCamera, PlaneGeometry,
  RGBAFormat, Scene, ShaderMaterial, Texture, Vector2, Vector3, WebGLRenderTarget, AddEquation,
} from "three";
import type { MeshStandardMaterial, Object3D, WebGLRenderer } from "three";

export interface CausticsOptions {
  /** Direction light travels, from the light into the scene. Normalised for you. */
  light: readonly [number, number, number];
  /** World height of the floor that catches the light. */
  floorY: number;
  /** The square of floor that can receive caustics: its centre on the floor and half its side. */
  area: { x: number; z: number; half: number };
  /** Refractive index: 1.33 for water, 1.5 for glass. @default 1.33 */
  ior?: number;
  /** Spread of the index between red and blue. 0 is no colour fringing; 0.01 to 0.02 is a subtle real lens. @default 0.012 */
  dispersion?: number;
  /** Size of the caustic texture. @default 512 */
  resolution?: number;
  /** Rays per side of the traced grid. More rays give finer lines. @default 256 */
  grid?: number;
  /** Size of the light's view of the casters. @default 256 */
  normalResolution?: number;
  /** Colour and strength of the focused light. @default "#fff6e6", 1 */
  color?: string;
  intensity?: number;
  /** The floor's albedo map, so the added light takes the floor's colour. Sampled with the catcher's own UVs over `area`. */
  albedo?: Texture;
  /** The layer the casters are drawn on for the light's view. @default 7 */
  layer?: number;
}
export interface Caustics {
  /** A plane over `area`, just above the floor, that adds the caustic light. Add it to the scene, or use `applyCaustics` on the floor. */
  catcher: Mesh;
  /** The traced light, linear and unclamped: 1 is the light that would arrive with no bending. */
  readonly texture: Texture;
  /** Area centre x, z and half size, shared with materials that sample it. */
  readonly areaUniform: Vector3;
  readonly texelUniform: Vector2;
  /** Marks objects (and their children) as light-bending casters. */
  addCaster(object: Object3D): void;
  /** Traces the caustics for the casters' current shapes. Call once per frame, before the scene renders. */
  update(renderer: WebGLRenderer, scene: Scene): void;
  set(options: { intensity?: number; color?: string }): void;
  dispose(): void;
}

const NORMAL_VERTEX = /* glsl */`
varying vec3 vWorldNormal;
varying float vDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}`;
const NORMAL_FRAGMENT = /* glsl */`
uniform vec3 uLight;
varying vec3 vWorldNormal;
varying float vDepth;
void main() {
  vec3 n = normalize(vWorldNormal);
  // Face the light: rays enter through the side they hit.
  if (dot(n, uLight) > 0.0) n = -n;
  gl_FragColor = vec4(n, vDepth);
}`;
const RAY_VERTEX = /* glsl */`
uniform sampler2D uNormals;
uniform mat4 uLightWorld;
uniform vec2 uLightHalf;
uniform vec3 uLight;
uniform float uFloorY;
uniform float uIor;
uniform vec3 uArea;
varying vec3 vBefore;
varying vec3 vAfter;
varying float vHit;
void main() {
  vec2 uv = position.xy + 0.5;
  vec4 surface = textureLod(uNormals, uv, 0.0);
  vec3 origin = (uLightWorld * vec4((uv * 2.0 - 1.0) * uLightHalf, 0.0, 1.0)).xyz;
  vHit = surface.a > 0.0 ? 1.0 : 0.0;
  vec3 hit = origin + uLight * surface.a;
  vec3 ray = surface.a > 0.0 ? refract(uLight, normalize(surface.xyz), 1.0 / uIor) : uLight;
  if (dot(ray, ray) < 1e-6) ray = uLight;
  vec3 land = hit + ray * ((uFloorY - hit.y) / min(ray.y, -1e-4));
  vec3 straight = origin + uLight * ((uFloorY - origin.y) / min(uLight.y, -1e-4));
  vBefore = straight; vAfter = land;
  gl_Position = vec4((land.x - uArea.x) / uArea.z, -(land.z - uArea.y) / uArea.z, 0.0, 1.0);
}`;
const RAY_FRAGMENT = /* glsl */`
uniform vec3 uChannel;
varying vec3 vBefore;
varying vec3 vAfter;
varying float vHit;
void main() {
  if (vHit < 0.999) discard;
  float before = length(dFdx(vBefore)) * length(dFdy(vBefore));
  float after = length(dFdx(vAfter)) * length(dFdy(vAfter));
  float gain = clamp(before / max(after, 1e-9), 0.0, 24.0);
  gl_FragColor = vec4(uChannel * gain, 1.0);
}`;
const CATCH_VERTEX = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CATCH_FRAGMENT = /* glsl */`
uniform sampler2D uCaustics;
uniform sampler2D uAlbedo;
uniform float uUseAlbedo;
uniform vec3 uColor;
uniform float uIntensity;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  // A small tent filter softens the traced grid into continuous light.
  vec3 c = texture2D(uCaustics, vUv).rgb * 0.4;
  c += texture2D(uCaustics, vUv + vec2(uTexel.x, 0.0)).rgb * 0.15;
  c += texture2D(uCaustics, vUv - vec2(uTexel.x, 0.0)).rgb * 0.15;
  c += texture2D(uCaustics, vUv + vec2(0.0, uTexel.y)).rgb * 0.15;
  c += texture2D(uCaustics, vUv - vec2(0.0, uTexel.y)).rgb * 0.15;
  vec3 albedo = uUseAlbedo > 0.5 ? texture2D(uAlbedo, vUv).rgb : vec3(1.0);
  // Soft edge, so the catcher's square never shows.
  vec2 e = smoothstep(vec2(0.0), vec2(0.06), vUv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - vUv);
  gl_FragColor = vec4(c * albedo * uColor * uIntensity * e.x * e.y, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createCaustics(options: CausticsOptions): Caustics {
  const layer = options.layer ?? 7, light = new Vector3(...options.light).normalize();
  const resolution = options.resolution ?? 512, grid = options.grid ?? 256, normalResolution = options.normalResolution ?? 256;
  const ior = options.ior ?? 1.33, dispersion = options.dispersion ?? .012;
  const normals = new WebGLRenderTarget(normalResolution, normalResolution, { type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  const caustics = new WebGLRenderTarget(resolution, resolution, { type: HalfFloatType, format: RGBAFormat, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  const normalMaterial = new ShaderMaterial({ vertexShader: NORMAL_VERTEX, fragmentShader: NORMAL_FRAGMENT, side: DoubleSide, uniforms: { uLight: { value: light } } });
  const lightCamera = new OrthographicCamera(-1, 1, 1, -1, .01, 100);
  lightCamera.layers.set(layer);
  // The traced grid lives in its own scene, drawn by an identity camera: the vertex shader writes clip space directly.
  const rayScene = new Scene(), rayCamera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const rayGeometry = new PlaneGeometry(1, 1, grid, grid);
  const rayMaterial = new ShaderMaterial({
    vertexShader: RAY_VERTEX, fragmentShader: RAY_FRAGMENT, depthTest: false, depthWrite: false, side: DoubleSide,
    blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor,
    uniforms: { uNormals: { value: normals.texture }, uLightWorld: { value: lightCamera.matrixWorld }, uLightHalf: { value: new Vector2(1, 1) }, uLight: { value: light },
      uFloorY: { value: options.floorY }, uIor: { value: ior }, uArea: { value: new Vector3(options.area.x, options.area.z, options.area.half) }, uChannel: { value: new Vector3(1, 1, 1) } },
  });
  const rays = new Mesh(rayGeometry, rayMaterial);
  rays.frustumCulled = false;
  rayScene.add(rays);

  const catchMaterial = new ShaderMaterial({
    vertexShader: CATCH_VERTEX, fragmentShader: CATCH_FRAGMENT, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uCaustics: { value: caustics.texture }, uAlbedo: { value: options.albedo ?? null }, uUseAlbedo: { value: options.albedo ? 1 : 0 },
      uColor: { value: new Color(options.color ?? "#fff6e6") }, uIntensity: { value: options.intensity ?? 1 }, uTexel: { value: new Vector2(1 / resolution, 1 / resolution) } },
  });
  const catcher = new Mesh(new PlaneGeometry(options.area.half * 2, options.area.half * 2), catchMaterial);
  catcher.name = "caustics-catcher";
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.set(options.area.x, options.floorY + .002 * options.area.half, options.area.z);
  catcher.renderOrder = 1;
  const casters = new Set<Object3D>();
  const box = { min: new Vector3(), max: new Vector3() };

  return {
    catcher, texture: caustics.texture, areaUniform: rayMaterial.uniforms.uArea.value as Vector3, texelUniform: catchMaterial.uniforms.uTexel.value as Vector2,
    addCaster(object) { casters.add(object); object.traverse(child => child.layers.enable(layer)); },
    update(renderer, scene) {
      if (!casters.size) return;
      // Frame the casters from the light: an orthographic camera looking along the light, sized to their bounds.
      box.min.set(Infinity, Infinity, Infinity); box.max.set(-Infinity, -Infinity, -Infinity);
      const corner = new Vector3();
      for (const caster of casters) caster.traverse(child => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const b = mesh.geometry.boundingBox!;
        for (let i = 0; i < 8; i++) { corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(mesh.matrixWorld); box.min.min(corner); box.max.max(corner); }
      });
      const center = box.min.clone().add(box.max).multiplyScalar(.5), radius = box.max.distanceTo(box.min) / 2 + 1e-3;
      lightCamera.position.copy(center).addScaledVector(light, -radius * 3);
      if (Math.abs(light.y) > .95) lightCamera.up.set(0, 0, -1); else lightCamera.up.set(0, 1, 0);
      lightCamera.lookAt(center);
      Object.assign(lightCamera, { left: -radius, right: radius, top: radius, bottom: -radius, near: .001, far: radius * 6 });
      lightCamera.updateProjectionMatrix(); lightCamera.updateMatrixWorld();
      rayMaterial.uniforms.uLightHalf.value.set(radius, radius);

      const prior = { target: renderer.getRenderTarget(), override: scene.overrideMaterial, background: scene.background, color: renderer.getClearColor(new Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear };
      try {
        scene.overrideMaterial = normalMaterial; scene.background = null;
        renderer.setRenderTarget(normals); renderer.setClearColor(0x000000, 0); renderer.autoClear = true; renderer.clear();
        renderer.render(scene, lightCamera);
        scene.overrideMaterial = prior.override; scene.background = prior.background;
        renderer.setRenderTarget(caustics); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.autoClear = false;
        // One pass per colour channel, each with its own index, so focused edges split into a faint spectrum.
        const channels: Array<[number, [number, number, number]]> = dispersion > 0
          ? [[ior - dispersion, [1, 0, 0]], [ior, [0, 1, 0]], [ior + dispersion, [0, 0, 1]]] : [[ior, [1, 1, 1]]];
        for (const [index, mask] of channels) {
          rayMaterial.uniforms.uIor.value = index; rayMaterial.uniforms.uChannel.value.set(...mask);
          renderer.render(rayScene, rayCamera);
        }
      } finally {
        scene.overrideMaterial = prior.override; scene.background = prior.background;
        renderer.setRenderTarget(prior.target); renderer.setClearColor(prior.color, prior.alpha); renderer.autoClear = prior.autoClear;
      }
    },
    set({ intensity, color }) {
      if (intensity !== undefined) catchMaterial.uniforms.uIntensity.value = intensity;
      if (color) (catchMaterial.uniforms.uColor.value as Color).set(color);
    },
    dispose() {
      normals.dispose(); caustics.dispose(); normalMaterial.dispose(); rayMaterial.dispose(); rayGeometry.dispose(); catchMaterial.dispose(); catcher.geometry.dispose();
      for (const caster of casters) caster.traverse(child => child.layers.disable(layer));
    },
  };
}

/** Adds caustic light to a standard or physical material, inside the material itself. Use this for floors seen through water or glass:
 * a transmissive surface only sees opaque objects behind it, so a separate transparent catcher would vanish under the water. The light
 * is sampled by world position over the caustic area and multiplied by the material's own albedo, after the material's lighting. */
/** `replaceDirect` removes the material's direct-light terms, for a floor whose sunlight arrives only through the water: the caustics
 * are that light, redistributed. Sky and environment light still apply. */
export function applyCaustics(material: MeshStandardMaterial, caustics: Caustics, options: { intensity?: number; color?: string; replaceDirect?: boolean } = {}) {
  const uniforms = { uCausticsMap: { value: caustics.texture }, uCausticsArea: { value: caustics.areaUniform }, uCausticsColor: { value: new Color(options.color ?? "#fff6e6").multiplyScalar(options.intensity ?? 1) }, uCausticsTexel: { value: caustics.texelUniform } };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCausticsWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCausticsWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vCausticsWorld;
uniform sampler2D uCausticsMap;
uniform vec3 uCausticsArea;
uniform vec3 uCausticsColor;
uniform vec2 uCausticsTexel;`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{
  vec2 cuv = vec2((vCausticsWorld.x - uCausticsArea.x) / uCausticsArea.z, -(vCausticsWorld.z - uCausticsArea.y) / uCausticsArea.z) * 0.5 + 0.5;
  vec3 c = texture2D(uCausticsMap, cuv).rgb * 0.4 + (texture2D(uCausticsMap, cuv + vec2(uCausticsTexel.x, 0.0)).rgb + texture2D(uCausticsMap, cuv - vec2(uCausticsTexel.x, 0.0)).rgb
    + texture2D(uCausticsMap, cuv + vec2(0.0, uCausticsTexel.y)).rgb + texture2D(uCausticsMap, cuv - vec2(0.0, uCausticsTexel.y)).rgb) * 0.15;
  vec2 e = smoothstep(vec2(0.0), vec2(0.06), cuv) * smoothstep(vec2(0.0), vec2(0.06), 1.0 - cuv);
  totalEmissiveRadiance += c * uCausticsColor * diffuseColor.rgb * e.x * e.y;
}`);
    if (options.replaceDirect) shader.fragmentShader = shader.fragmentShader.replace("#include <aomap_fragment>", "reflectedLight.directDiffuse = vec3(0.0);\nreflectedLight.directSpecular = vec3(0.0);\n#include <aomap_fragment>");
  };
  material.customProgramCacheKey = () => options.replaceDirect ? "km-caustics-replace" : "km-caustics";
  material.needsUpdate = true;
  return { set(intensity: number, color = options.color ?? "#fff6e6") { uniforms.uCausticsColor.value.set(color).multiplyScalar(intensity); } };
}
