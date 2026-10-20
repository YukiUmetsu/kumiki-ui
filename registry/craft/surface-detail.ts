/** Procedural micro-surface for UV-less or sculpted meshes.
 *
 * Patches a MeshStandard/MeshPhysical material so that:
 * - a material-specific 3D height field (cast metal pitting, stone grain,
 *   directional fur strands, paper fibre, brushed grain) perturbs the shading
 *   normal through screen-space derivatives (no UVs, no tangents needed);
 * - the same field modulates roughness, so highlights break up physically;
 * - optional per-vertex `surface` multipliers (roughness, metalness), baked
 *   from sculpt occlusion/curvature, drive patina vs polished wear.
 *
 * Detail fades out when its frequency approaches pixel size, so distant
 * shots do not shimmer. Deterministic: no textures, time or randomness.
 */
import type { Material, MeshPhysicalMaterial, MeshStandardMaterial, WebGLProgramParametersWithUniforms } from "three";

export type SurfaceDetailKind = "cast-metal" | "stone" | "fur" | "paper" | "brushed" | "hammered" | "glaze" | "fabric";

export interface SurfaceDetailOptions {
  kind: SurfaceDetailKind;
  /** Feature frequency per world unit (higher = finer). */
  frequency?: number;
  /** Relief amplitude in world units. */
  strength?: number;
  /** Fraction by which detail varies roughness (0 disables). */
  roughnessVariation?: number;
  /** Fur/brushed flow direction in object space. */
  flow?: readonly [number, number, number];
  /** Fraction by which detail varies albedo (speckled granite, paper fibre). */
  albedoVariation?: number;
  /** Read per-vertex `surface` (vec2: roughness×, metalness×) attribute. */
  vertexSurface?: boolean;
}

const KIND_ID: Record<SurfaceDetailKind, number> = {
  "cast-metal": 0, stone: 1, fur: 2, paper: 3, brushed: 4, hammered: 5, glaze: 6, fabric: 7,
};
const DEFAULTS: Record<SurfaceDetailKind, { frequency: number; strength: number; roughnessVariation: number }> = {
  "cast-metal": { frequency: 30, strength: .0008, roughnessVariation: .3 },
  stone: { frequency: 22, strength: .0022, roughnessVariation: .25 },
  fur: { frequency: 46, strength: .0042, roughnessVariation: .3 },
  paper: { frequency: 90, strength: .0004, roughnessVariation: .12 },
  brushed: { frequency: 160, strength: .00025, roughnessVariation: .3 },
  hammered: { frequency: 9, strength: .004, roughnessVariation: .2 },
  glaze: { frequency: 6, strength: .0012, roughnessVariation: .15 },
  fabric: { frequency: 70, strength: .0012, roughnessVariation: .2 },
};

const NOISE = /* glsl */`
varying vec3 vKmPos;
uniform float kmDetailFrequency;
uniform float kmDetailStrength;
uniform float kmDetailRoughness;
uniform vec3 kmDetailFlow;
uniform float kmDetailAlbedo;
float kmHash(vec3 p){
  p = fract(p * .3183099 + vec3(.71, .113, .419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
// Quintic gradient noise in [0,1]: no lattice "blocks" in derivative bump.
vec3 kmGrad(vec3 p){
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float kmNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n = mix(mix(mix(dot(kmGrad(i), f), dot(kmGrad(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                    mix(dot(kmGrad(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(kmGrad(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                mix(mix(dot(kmGrad(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(kmGrad(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                    mix(dot(kmGrad(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(kmGrad(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  return n * .5 + .5;
}
float kmFbm(vec3 p){
  float s = 0.0, a = .5;
  for (int i = 0; i < 4; i++) { s += a * kmNoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.4); a *= .5; }
  return s;
}
// Cellular dimples for hammered/peened metal.
float kmCells(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); float d = 1.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(kmHash(i + g), kmHash(i + g + 19.1), kmHash(i + g + 47.3));
    vec3 r = g + o - f; d = min(d, dot(r, r));
  }
  return sqrt(d);
}
float kmDetailHeight(vec3 p){
  vec3 q = p * kmDetailFrequency;
  #if KM_DETAIL_KIND == 0
    // Lost-wax casting: soft porosity plus faint sculptor tool undulation.
    return kmFbm(q) * .7 + kmNoise(q * 3.1) * .3;
  #elif KM_DETAIL_KIND == 1
    float grain = kmFbm(q);
    return grain * .8 + step(.82, kmNoise(q * 4.0)) * .2;
  #elif KM_DETAIL_KIND == 2
    // Strands: low frequency along the flow, high across it.
    vec3 f = normalize(kmDetailFlow);
    float along = dot(q, f);
    vec3 across = q - f * along;
    float strands = kmNoise(across * 1.6 + f * along * .18);
    float clumps = kmNoise(q * .22);
    return strands * .75 + clumps * .25;
  #elif KM_DETAIL_KIND == 3
    vec3 f = normalize(kmDetailFlow);
    return kmNoise(q) * .6 + kmNoise((q - f * dot(q, f)) * 2.0 + f * dot(q, f) * .2) * .4;
  #elif KM_DETAIL_KIND == 4
    vec3 f = normalize(kmDetailFlow);
    vec3 across = q - f * dot(q, f);
    return kmNoise(across * 2.0 + f * dot(q, f) * .02);
  #elif KM_DETAIL_KIND == 5
    return 1.0 - kmCells(q);
  #elif KM_DETAIL_KIND == 6
    return kmFbm(q) * .5 + kmNoise(q * 5.0) * .08;
  #else
    vec3 f = normalize(kmDetailFlow);
    float weft = sin(dot(q, f) * 6.2831);
    vec3 side = normalize(cross(f, vec3(.3, .9, .1)));
    float warp = sin(dot(q, side) * 6.2831);
    return .5 + .25 * weft * warp + .25 * kmNoise(q * .5);
  #endif
}
`;

/** Apply procedural micro-surface to a material in place. Returns the same material. */
export function applySurfaceDetail<T extends MeshStandardMaterial | MeshPhysicalMaterial>(
  material: T, options: SurfaceDetailOptions): T {
  const defaults = DEFAULTS[options.kind];
  const frequency = options.frequency ?? defaults.frequency;
  const strength = options.strength ?? defaults.strength;
  const roughness = options.roughnessVariation ?? defaults.roughnessVariation;
  const flow = options.flow ?? [0, -1, 0];
  if (![frequency, strength, roughness, ...flow].every(Number.isFinite) || frequency <= 0)
    throw new Error("Surface detail needs finite positive frequency and finite strength.");
  const vertexSurface = options.vertexSurface ?? false;
  const kind = KIND_ID[options.kind];
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.kmDetailFrequency = { value: frequency };
    shader.uniforms.kmDetailStrength = { value: strength };
    shader.uniforms.kmDetailRoughness = { value: roughness };
    shader.uniforms.kmDetailAlbedo = { value: options.albedoVariation ?? 0 };
    shader.uniforms.kmDetailFlow = { value: { x: flow[0], y: flow[1], z: flow[2], isVector3: true } };
    const surfaceVarying = vertexSurface ? "varying vec2 vKmSurface;\n" : "";
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vKmPos;\n${
        vertexSurface ? "attribute vec2 surface;\n" + surfaceVarying : ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvKmPos = position;\n${
        vertexSurface ? "vKmSurface = surface;\n" : ""}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n#define KM_DETAIL_KIND ${kind}\n${surfaceVarying}${NOISE}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        float kmH = kmDetailHeight(vKmPos);
        // Fade detail as its period approaches one pixel (prevents shimmer).
        float kmFreqPx = length(fwidth(vKmPos * kmDetailFrequency));
        float kmFade = 1.0 - smoothstep(.35, .9, kmFreqPx);
        diffuseColor.rgb *= 1.0 + kmDetailAlbedo * (kmH - .5) * 2.0;
        roughnessFactor = clamp(roughnessFactor * (1.0 + kmDetailRoughness * (kmH - .5) * 2.0 * kmFade)${
          vertexSurface ? " * vKmSurface.x" : ""}, .035, 1.0);`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>${
        vertexSurface ? "\n metalnessFactor = clamp(metalnessFactor * vKmSurface.y, 0.0, 1.0);" : ""}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        {
          float kmHeight = kmH * kmDetailStrength * kmFade;
          vec3 kmSigX = dFdx(-vViewPosition), kmSigY = dFdy(-vViewPosition);
          float kmBx = dFdx(kmHeight), kmBy = dFdy(kmHeight);
          vec3 kmR1 = cross(kmSigY, normal), kmR2 = cross(normal, kmSigX);
          float kmDet = dot(kmSigX, kmR1) * (gl_FrontFacing ? 1.0 : -1.0);
          vec3 kmGrad = sign(kmDet) * (kmBx * kmR1 + kmBy * kmR2);
          normal = normalize(abs(kmDet) * normal - kmGrad);
        }`);
  };
  const key = `km-detail:${kind}:${vertexSurface ? 1 : 0}`;
  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => previousKey() + key;
  material.userData.surfaceDetail = { ...options, frequency, strength, roughnessVariation: roughness };
  material.needsUpdate = true;
  return material;
}

export function surfaceDetailOf(material: Material): SurfaceDetailOptions | undefined {
  return material.userData.surfaceDetail as SurfaceDetailOptions | undefined;
}
