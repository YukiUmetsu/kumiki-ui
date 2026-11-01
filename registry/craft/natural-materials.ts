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
}

const SIZE = 128;
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

const channel = (hex: number, shift: number) => (hex >>> shift) & 255;
const toByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const normalByte = (value: number) => toByte((value * .5 + .5) * 255);

/** One creation per shared material, not per plant instance. Dispose explicitly. */
export function createCraftNaturalMaterial(spec: CraftNaturalMaterialSpec) {
  validateCraftNaturalMaterial(spec);
  const preset = PRESETS[spec.kind], wet = spec.wetness ?? 0;
  const height = new Float32Array(SIZE * SIZE);
  const diffuse = new Uint8Array(SIZE * SIZE * 4), rough = new Uint8Array(diffuse.length),
    normal = new Uint8Array(diffuse.length);
  const axial = spec.kind === "bark";
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = x / SIZE, v = y / SIZE;
    const macro = noise(u, v, axial ? 4 : 3, axial ? 2 : 3, spec.seed);
    const mid = noise(u, v, axial ? 6 : preset.grain, axial ? 28 : preset.grain, spec.seed + 17);
    const fine = noise(u, v, axial ? 12 : preset.grain * 2,
      axial ? 56 : preset.grain * 2, spec.seed + 43);
    height[y * SIZE + x] = macro * .48 + mid * .34 + fine * .18;
  }
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const index = y * SIZE + x, offset = index * 4;
    const h = height[index], tone = Math.max(0, Math.min(1, (h - .23) * 1.7));
    for (const shift of [16, 8, 0]) {
      const low = channel(preset.low, shift), high = channel(preset.high, shift);
      const at = offset + (16 - shift) / 8;
      diffuse[at] = toByte((low + (high - low) * tone) * (1 - wet * .19));
    }
    diffuse[offset + 3] = 255;
    const r = Math.max(.25, Math.min(1, preset.roughness - wet * .34 + (h - .5) * .15));
    rough.fill(toByte(r * 255), offset, offset + 3);
    rough[offset + 3] = 255;
    const left = height[y * SIZE + (x - 1 + SIZE) % SIZE];
    const right = height[y * SIZE + (x + 1) % SIZE];
    const down = height[((y - 1 + SIZE) % SIZE) * SIZE + x];
    const up = height[((y + 1) % SIZE) * SIZE + x];
    const dx = (left - right) * preset.normal, dy = (down - up) * preset.normal;
    const len = Math.hypot(dx, dy, 1);
    normal[offset] = normalByte(dx / len);
    normal[offset + 1] = normalByte(dy / len);
    normal[offset + 2] = normalByte(1 / len);
    normal[offset + 3] = 255;
  }
  const makeTexture = (data: Uint8Array, sRGB: boolean) => {
    const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
    texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping;
    // DataTexture defaults to nearest filtering/no mipmaps, which sparkles
    // badly under oblique moving video cameras. 128px POT maps can mip safely.
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
  return { material, map, roughnessMap, normalMap, width: SIZE, height: SIZE,
    dispose() { if (disposed) return; disposed = true;
      material.dispose(); map.dispose(); roughnessMap.dispose(); normalMap.dispose(); } };
}
