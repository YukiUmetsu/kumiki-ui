/** UV-independent running-bond masonry for Three.js WebGL materials.
 * Object-space brick course scale, seeded individual-unit albedo, physically
 * narrower mortar joints and a small recessed-joint normal perturbation.
 * Coursing fades before it becomes subpixel; trims and horizontal roofs retain
 * their original appearance. No textures, baked maps or extra draw calls.
 */
import { Color, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import type { WebGLProgramParametersWithUniforms } from "three";

export interface CraftMasonryFinishOptions {
  /** Approximate brick length in world units. Native facade module is .6. */
  brickLength?: number;
  /** Brick course height in world units. Native facade module is .3. */
  brickHeight?: number;
  /** Mortar width in world units, smaller than a quarter of either brick dimension. */
  jointWidth?: number;
  /** sRGB color of the mortar, distinct from the material's vertex/masonry color. */
  mortarColor?: number;
  /** Maximum fractional change in color between individual units. */
  colorVariation?: number;
  /** Small world-space recessed mortar relief (shading only, no mesh displacement). */
  relief?: number;
  /** Stable color variation salt; does not advance or depend on animation time. */
  seed?: number;
}

const inRange = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;

export function validateCraftMasonryFinish(options: CraftMasonryFinishOptions = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new Error("Masonry finish options must be an object.");
  const brickLength = options.brickLength ?? .6;
  const brickHeight = options.brickHeight ?? .3;
  const jointWidth = options.jointWidth ?? .024;
  const variation = options.colorVariation ?? .10;
  const relief = options.relief ?? .009;
  const mortarColor = options.mortarColor ?? 0x6a6257;
  const seed = options.seed ?? 0;
  if (!inRange(brickLength, .2, 2) || !inRange(brickHeight, .1, 1))
    throw new Error("Masonry brick dimensions must be .2–2 long and .1–1 high.");
  if (!inRange(jointWidth, .004, Math.min(brickLength, brickHeight) * .24))
    throw new Error("Masonry joint width must be .004–24% of the smaller brick dimension.");
  if (!inRange(variation, 0, .24) || !inRange(relief, 0, .025))
    throw new Error("Masonry colorVariation must be 0–.24 and relief 0–.025.");
  if (!Number.isInteger(mortarColor) || !inRange(mortarColor, 0, 0xffffff) ||
    !Number.isSafeInteger(seed))
    throw new Error("Masonry mortarColor needs RGB integer and seed needs safe integer.");
  return { brickLength, brickHeight, jointWidth, colorVariation: variation,
    relief, mortarColor, seed };
}

const VERTEX_COMMON = /* glsl */`
varying vec3 vKmBrickPos;
varying vec3 vKmBrickNormal;
`;
const FRAGMENT_COMMON = /* glsl */`
varying vec3 vKmBrickPos;
varying vec3 vKmBrickNormal;
uniform float kmBrickLength;
uniform float kmBrickHeight;
uniform float kmBrickJointWidth;
uniform float kmBrickVariation;
uniform float kmBrickRelief;
uniform float kmBrickSeed;
uniform vec3 kmBrickMortarColor;
float kmBrickJoint = 0.0;
float kmBrickHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}
void kmApplyBrickFinish(inout vec3 albedo) {
  vec3 surfaceNormal = normalize(vKmBrickNormal);
  float nx = abs(surfaceNormal.x), nz = abs(surfaceNormal.z);
  // Avoid roof/ledge faces. Dominant-axis projection uses the same unit scale
  // on perpendicular masonry walls, even on UV-less baked geometry.
  float wall = smoothstep(.58, .87, max(nx, nz));
  float across = mix(vKmBrickPos.x, vKmBrickPos.z, step(nz, nx));
  float rowCoord = vKmBrickPos.y / kmBrickHeight;
  float row = floor(rowCoord);
  float colCoord = across / kmBrickLength + mod(row, 2.0) * .5;
  vec2 cell = vec2(colCoord, rowCoord);
  vec2 fracCell = fract(cell);
  vec2 distanceToJoint = min(fracCell, 1.0 - fracCell);
  vec2 jointScale = vec2(kmBrickJointWidth / kmBrickLength, kmBrickJointWidth / kmBrickHeight);
  vec2 widthPx = max(fwidth(cell), vec2(0.00001));
  vec2 seam = 1.0 - smoothstep(jointScale, jointScale + widthPx, distanceToJoint);
  // A brick smaller than one pixel becomes its average material color, not
  // shimmery horizontal hairlines as the camera moves.
  float pixelFootprint = max(widthPx.x, widthPx.y);
  float visibility = 1.0 - smoothstep(.38, .95, pixelFootprint);
  kmBrickJoint = max(seam.x, seam.y) * visibility * wall;
  vec2 unitId = vec2(floor(colCoord), row);
  float variation = (kmBrickHash(unitId + vec2(kmBrickSeed * .137, kmBrickSeed * .719)) - .5) * 2.0;
  albedo *= 1.0 + variation * kmBrickVariation * visibility * wall;
  albedo = mix(albedo, kmBrickMortarColor, kmBrickJoint);
}
`;

/** Adds a WebGL shader hook to existing standard/physical material in place.
 * Call before `applySurfaceDetail` when combining the two finishing layers.
 */
export function applyCraftMasonryFinish<T extends MeshStandardMaterial | MeshPhysicalMaterial>(
  material: T, options: CraftMasonryFinishOptions = {}): T {
  const validated = validateCraftMasonryFinish(options);
  if (material.userData.craftMasonryFinish)
    throw new Error("Masonry finish has already been applied to this material.");
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.kmBrickLength = { value: validated.brickLength };
    shader.uniforms.kmBrickHeight = { value: validated.brickHeight };
    shader.uniforms.kmBrickJointWidth = { value: validated.jointWidth };
    shader.uniforms.kmBrickVariation = { value: validated.colorVariation };
    shader.uniforms.kmBrickRelief = { value: validated.relief };
    shader.uniforms.kmBrickSeed = { value: Math.abs(validated.seed % 9973) };
    shader.uniforms.kmBrickMortarColor = { value: new Color(validated.mortarColor) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_COMMON}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvKmBrickPos = position;\nvKmBrickNormal = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_COMMON}`)
      .replace("#include <color_fragment>", "#include <color_fragment>\nkmApplyBrickFinish(diffuseColor.rgb);")
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + kmBrickJoint * .14, .04, 1.0);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        {
          float kmMortarDepth = -kmBrickJoint * kmBrickRelief;
          vec3 kmDx = dFdx(-vViewPosition), kmDy = dFdy(-vViewPosition);
          float kmBx = dFdx(kmMortarDepth), kmBy = dFdy(kmMortarDepth);
          vec3 kmR1 = cross(kmDy, normal), kmR2 = cross(normal, kmDx);
          float kmDet = dot(kmDx, kmR1) * (gl_FrontFacing ? 1.0 : -1.0);
          vec3 kmGrad = sign(kmDet) * (kmBx * kmR1 + kmBy * kmR2);
          normal = normalize(abs(kmDet) * normal - kmGrad);
        }`);
  };
  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${previousKey()}:km-brick-bond-v1`;
  material.userData.craftMasonryFinish = { ...validated };
  material.needsUpdate = true;
  return material;
}
