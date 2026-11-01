/** Seeded, tileable PBR materials for UV-mapped terrain and props. All maps
 * are built locally in bounded CPU work; there are no downloaded textures,
 * async services, runtime clocks, or renderer-specific shader patches.
 * Authoring aim: useful background/supporting material variation, not a
 * substitute for measured hero scans or authored displacement geometry.
 */
import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace,
  UnsignedByteType, RGBAFormat, Vector2 } from "three";

export type CraftNaturalMaterialKind = "forest-soil" | "moss" | "weathered-stone" |
  "dry-sand" | "bark" | "leaf";

export interface CraftNaturalMaterialSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  kind: CraftNaturalMaterialKind;
  /** UV repeats in U and V; both default to 1. Use geometry UVs deliberately. */
  repeat?: readonly [number, number];
  /** 0–1, darkens the base and reduces roughness without making it metallic. */
  wetness?: number;
  /** Optional sRGB tint multiplied over the material's generated palette. */
  tint?: number;
  /** 128 for distant shots, 256 by default, 512 for inspected close-ups. */
  resolution?: 128 | 256 | 512;
}

type Preset = { low: number; high: number; roughness: number; normal: number; grain: number };
const PRESETS: Record<CraftNaturalMaterialKind, Preset> = {
  "forest-soil": { low: 0x342d25, high: 0x6e5943, roughness: .95, normal: 2.1, grain: 11 },
  moss: { low: 0x28442c, high: 0x729268, roughness: .98, normal: 1.5, grain: 4 },
  "weathered-stone": { low: 0x595e55, high: 0x9c9d8d, roughness: .88, normal: 2.5, grain: 6 },
  "dry-sand": { low: 0xae9472, high: 0xe1c9a0, roughness: .97, normal: .7, grain: 19 },
  bark: { low: 0x3a2921, high: 0x81624c, roughness: .94, normal: 2.6, grain: 26 },
  leaf: { low: 0x365739, high: 0x879e5c, roughness: .72, normal: .65, grain: 5 },
};

export function validateCraftNaturalMaterial(spec: CraftNaturalMaterialSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() || spec.id.length > 96 ||
    !Number.isSafeInteger(spec.seed) || !Object.prototype.hasOwnProperty.call(PRESETS, spec.kind))
    throw new Error("Natural material needs schemaVersion 1, id, safe integer seed and supported kind.");
  if (spec.repeat !== undefined && (!Array.isArray(spec.repeat) || spec.repeat.length !== 2 ||
    !spec.repeat.every(n => Number.isFinite(n) && n > 0 && n <= 64)))
    throw new Error("Natural material repeat must contain two finite numbers in (0,64].");
  if (spec.wetness !== undefined && (!Number.isFinite(spec.wetness) || spec.wetness < 0 || spec.wetness > 1))
    throw new Error("Natural material wetness must be between 0 and 1.");
  if (spec.tint !== undefined && (!Number.isInteger(spec.tint) || spec.tint < 0 || spec.tint > 0xffffff))
    throw new Error("Natural material tint must be an sRGB integer color.");
  if (spec.resolution !== undefined && ![128, 256, 512].includes(spec.resolution))
    throw new Error("Natural material resolution must be 128, 256 or 512.");
}

const TAU = Math.PI * 2;
const smoother = (t: number) => t * t * (3 - 2 * t);
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x ^ seed, 0x9e3779b1) ^ Math.imul(y + seed, 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/** Periodic value noise: seamless at repeating UV edges, including all octaves. */
function noise(u: number, v: number, px: number, py: number, seed: number) {
  const x = u * px, y = v * py, ix = Math.floor(x), iy = Math.floor(y);
  const fx = smoother(x - ix), fy = smoother(y - iy);
  const at = (dx: number, dy: number) => hash((ix + dx + px) % px, (iy + dy + py) % py, seed);
  const low = at(0, 0) * (1 - fx) + at(1, 0) * fx;
  const high = at(0, 1) * (1 - fx) + at(1, 1) * fx;
  return low * (1 - fy) + high * fy;
}

/** Periodic cellular pattern: second-nearest minus nearest gives fracture lines.
 * Feature points are jittered on a toroidal cell lattice, so seams are safe. */
function cells(u: number, v: number, xCount: number, yCount: number, seed: number) {
  const x = u * xCount, y = v * yCount;
  const ix = Math.floor(x), iy = Math.floor(y);
  let first = Infinity, second = Infinity, cellTone = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const gx = ix + dx, gy = iy + dy;
    const cx = (gx + xCount) % xCount, cy = (gy + yCount) % yCount;
    const fx = gx + .19 + .62 * hash(cx, cy, seed + 31);
    const fy = gy + .19 + .62 * hash(cx, cy, seed + 47);
    const distance = Math.hypot(x - fx, y - fy);
    if (distance < first) {
      second = first; first = distance; cellTone = hash(cx, cy, seed + 71);
    } else if (distance < second) second = distance;
  }
  return { first, edge: second - first, cellTone };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/** Surface-specific structure; uniform multiscale noise alone does not read as a material. */
function sampleSurface(kind: CraftNaturalMaterialKind, u: number, v: number, seed: number,
  grain: number): { relief: number; pigment: number; rough: number } {
  const macro = noise(u, v, 3, 3, seed), mid = noise(u, v, grain, grain, seed + 17);
  const fine = noise(u, v, grain * 2, grain * 2, seed + 43);
  if (kind === "forest-soil") {
    const clod = cells(u, v, 21, 21, seed);
    const grains = noise(u, v, 64, 64, seed + 93);
    const pebble = clod.first < .18 && clod.cellTone > .72 ? .32 : 0;
    return { relief: .24 * macro + .25 * mid + .24 * fine + .18 * grains + pebble,
      pigment: .46 * macro + .36 * fine + pebble * .8 - .08, rough: grains * .16 };
  }
  if (kind === "moss") {
    const tuft = cells(u, v, 15, 15, seed);
    const fuzz = noise(u, v, 64, 64, seed + 87);
    const cushion = Math.pow(clamp01(1 - tuft.first / .9), 1.7);
    return { relief: .14 * macro + .21 * mid + .15 * fine + cushion * .36 + fuzz * .12,
      pigment: .18 * macro + .48 * cushion + .22 * fuzz, rough: cushion * .08 };
  }
  if (kind === "weathered-stone") {
    const mineral = cells(u, v, 11, 11, seed);
    const fracture = 1 - clamp01(mineral.edge / .095);
    const speckle = noise(u, v, 51, 51, seed + 77);
    return { relief: .32 * macro + .18 * mid + .19 * speckle + .2 * mineral.cellTone - .22 * fracture,
      pigment: .32 * macro + .32 * mineral.cellTone + .21 * speckle - .21 * fracture,
      rough: .12 * fracture + .08 * speckle };
  }
  if (kind === "dry-sand") {
    const drift = Math.sin(TAU * (7 * v + .22 * Math.sin(TAU * 2 * u)));
    const grains = noise(u, v, 86, 86, seed + 113);
    return { relief: .18 * macro + .14 * mid + .14 * fine + .18 * (drift * .5 + .5) + .32 * grains,
      pigment: .21 * macro + .28 * mid + .24 * grains + .12 * drift, rough: grains * .12 };
  }
  if (kind === "bark") {
    // U runs around the trunk; V runs along its axis. The dominant grooves must
    // extend along V, rather than accidentally becoming horizontal bands.
    const warp = .19 * Math.sin(TAU * (3 * v)) +
      .23 * (noise(u, v, 6, 4, seed + 57) - .5);
    const ridges = Math.sin(TAU * (19 * u + warp));
    const furrow = Math.pow(1 - Math.abs(ridges), 3);
    const vertical = noise(u, v, 29, 5, seed + 37);
    const fissure = cells(u, v, 28, 4, seed + 99);
    const cracks = (1 - clamp01(fissure.edge / .12)) * .25;
    return { relief: .22 * macro + .3 * vertical + .3 * (ridges * .5 + .5) - .2 * furrow - cracks,
      pigment: .13 * macro + .35 * vertical + .26 * (ridges * .5 + .5) - .35 * furrow - cracks,
      rough: .09 * furrow };
  }
  const leafVeins = Math.pow(1 - Math.abs(Math.sin(TAU * 4 * u)), 14);
  const branchingVeins = Math.pow(1 - Math.abs(Math.sin(TAU * (11 * v + 2 * u))), 17);
  const veins = Math.max(leafVeins, branchingVeins * .44);
  return { relief: .22 * macro + .14 * mid + .13 * fine + .2 * veins,
    pigment: .35 * macro + .31 * mid + .21 * veins, rough: -.18 * veins };
}

const channel = (hex: number, shift: number) => (hex >>> shift) & 255;
const toByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const normalByte = (value: number) => toByte((value * .5 + .5) * 255);

/** One creation per shared material, not per plant instance. Dispose explicitly. */
export function createCraftNaturalMaterial(spec: CraftNaturalMaterialSpec) {
  validateCraftNaturalMaterial(spec);
  const size = spec.resolution ?? 256;
  const preset = PRESETS[spec.kind], wet = spec.wetness ?? 0;
  const height = new Float32Array(size * size), pigmentation = new Float32Array(size * size),
    roughDetail = new Float32Array(size * size);
  const diffuse = new Uint8Array(size * size * 4), rough = new Uint8Array(diffuse.length),
    normal = new Uint8Array(diffuse.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = y * size + x;
    const sample = sampleSurface(spec.kind, x / size, y / size, spec.seed, preset.grain);
    height[index] = sample.relief;
    pigmentation[index] = sample.pigment;
    roughDetail[index] = sample.rough;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = y * size + x, offset = index * 4;
    const h = height[index], tone = clamp01(pigmentation[index] * 1.5 + .1);
    for (const shift of [16, 8, 0]) {
      const low = channel(preset.low, shift), high = channel(preset.high, shift);
      const at = offset + (16 - shift) / 8;
      diffuse[at] = toByte((low + (high - low) * tone) * (1 - wet * .19));
    }
    diffuse[offset + 3] = 255;
    const r = Math.max(.25, Math.min(1, preset.roughness - wet * .34 +
      (h - .5) * .15 + roughDetail[index]));
    rough.fill(toByte(r * 255), offset, offset + 3);
    rough[offset + 3] = 255;
    const left = height[y * size + (x - 1 + size) % size];
    const right = height[y * size + (x + 1) % size];
    const down = height[((y - 1 + size) % size) * size + x];
    const up = height[((y + 1) % size) * size + x];
    const dx = (left - right) * preset.normal, dy = (down - up) * preset.normal;
    const len = Math.hypot(dx, dy, 1);
    normal[offset] = normalByte(dx / len);
    normal[offset + 1] = normalByte(dy / len);
    normal[offset + 2] = normalByte(1 / len);
    normal[offset + 3] = 255;
  }
  const makeTexture = (data: Uint8Array, sRGB: boolean) => {
    const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
    texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping;
    // DataTexture defaults to nearest filtering/no mipmaps, which sparkles
    // badly under oblique moving video cameras. POT maps can mip safely.
    texture.magFilter = LinearFilter; texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.anisotropy = 4;
    texture.repeat.set(...(spec.repeat ?? [1, 1]));
    if (sRGB) texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };
  const map = makeTexture(diffuse, true), roughnessMap = makeTexture(rough, false),
    normalMap = makeTexture(normal, false);
  const material = new MeshStandardMaterial({ map, roughnessMap, normalMap, roughness: 1,
    metalness: 0, normalScale: new Vector2(1, 1), color: spec.tint !== undefined ? new Color(spec.tint) : 0xffffff });
  material.name = spec.id;
  material.userData.naturalMaterial = { ...spec, repeat: [...(spec.repeat ?? [1, 1])] };
  let disposed = false;
  return { material, map, roughnessMap, normalMap, width: size, height: size,
    dispose() { if (disposed) return; disposed = true;
      material.dispose(); map.dispose(); roughnessMap.dispose(); normalMap.dispose(); } };
}
