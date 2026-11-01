/** Seeded optical glass surfaces for closed, UV-mapped 3D objects.
 * Transmission/IOR and absorption are physically based MeshPhysicalMaterial
 * parameters. Normal/roughness maps are authored only when the finish needs
 * surface microstructure; clear glass is not fake alpha transparency.
 */
import { Color, DataTexture, FrontSide, LinearFilter, LinearMipmapLinearFilter,
  MeshPhysicalMaterial, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType,
  Vector2 } from "three";

export type CraftGlassKind = "clear" | "smoked" | "amber" | "frosted" | "ribbed" | "rain-streaked";

export interface CraftGlassSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  kind: CraftGlassKind;
  /** Surface texture size; higher resolutions cost memory, not render passes. */
  resolution?: 128 | 256 | 512;
  repeat?: readonly [number, number];
  /** World-space optical depth, not a replacement for actual closed geometry. */
  thickness?: number;
  ior?: number;
  /** Absorption distance in world units, for tinted glass. */
  attenuationDistance?: number;
  /** Optional attenuation color override, specified as sRGB integer. */
  tint?: number;
}

const KINDS = ["clear", "smoked", "amber", "frosted", "ribbed", "rain-streaked"] as const;
const TAU = Math.PI * 2;
const unit = (v: number) => Math.max(0, Math.min(1, v));
const byte = (v: number) => Math.round(unit(v) * 255);
const hash = (x: number, y: number, seed: number) => {
  let n = Math.imul(x ^ seed, 0x9e3779b1) ^ Math.imul(y + seed, 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
function periodicNoise(u: number, v: number, density: number, seed: number) {
  const x = u * density, y = v * density, ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const at = (dx: number, dy: number) => hash((ix + dx + density) % density,
    (iy + dy + density) % density, seed);
  return (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) +
    (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
}
function droplet(u: number, v: number, seed: number) {
  const nx = 10, ny = 19, x = u * nx, y = v * ny;
  const ix = Math.floor(x), iy = Math.floor(y);
  let closest = Infinity;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy, px = (cx + nx) % nx, py = (cy + ny) % ny;
    const tx = cx + .15 + hash(px, py, seed) * .7;
    const ty = cy + .15 + hash(px, py, seed + 29) * .7;
    // Elongated vertical tear drops, with tiny isolated droplets too.
    const distance = Math.hypot((x - tx) * 1.25, (y - ty) * .8);
    if (distance < closest) closest = distance;
  }
  return Math.pow(1 - unit(closest / .32), 2);
}

const FINISHES: Record<CraftGlassKind, { roughness: number; thickness: number;
  absorption: number; attenuation: number }> = {
  clear: { roughness: .025, thickness: .3, absorption: 0xffffff, attenuation: Infinity },
  smoked: { roughness: .055, thickness: .45, absorption: 0x607584, attenuation: 1.3 },
  amber: { roughness: .065, thickness: .45, absorption: 0xd69a52, attenuation: 1.7 },
  frosted: { roughness: .56, thickness: .24, absorption: 0xd4e5e7, attenuation: 4 },
  ribbed: { roughness: .16, thickness: .35, absorption: 0xe2edf0, attenuation: 5 },
  "rain-streaked": { roughness: .095, thickness: .25, absorption: 0xebf3f6, attenuation: 6 },
};

export function validateCraftGlassMaterial(spec: CraftGlassSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() ||
    spec.id.length > 96 || !Number.isSafeInteger(spec.seed) || !KINDS.includes(spec.kind))
    throw new Error("Glass requires schemaVersion 1, id, integer seed and a supported finish.");
  if (spec.resolution !== undefined && ![128, 256, 512].includes(spec.resolution))
    throw new Error("Glass resolution must be 128, 256 or 512.");
  if (spec.repeat !== undefined && (!Array.isArray(spec.repeat) || spec.repeat.length !== 2 ||
    !spec.repeat.every(n => Number.isFinite(n) && n > 0 && n <= 32)))
    throw new Error("Glass repeat must have two values in (0,32].");
  if (spec.thickness !== undefined && (!Number.isFinite(spec.thickness) ||
    spec.thickness < .01 || spec.thickness > 10))
    throw new Error("Glass thickness must be .01–10 world units.");
  if (spec.ior !== undefined && (!Number.isFinite(spec.ior) || spec.ior < 1 || spec.ior > 2.5))
    throw new Error("Glass IOR must be 1–2.5.");
  if (spec.attenuationDistance !== undefined && (!Number.isFinite(spec.attenuationDistance) ||
    spec.attenuationDistance <= 0 || spec.attenuationDistance > 1000))
    throw new Error("Glass attenuationDistance must be finite within (0,1000].");
  if (spec.tint !== undefined && (!Number.isInteger(spec.tint) || spec.tint < 0 || spec.tint > 0xffffff))
    throw new Error("Glass tint must be an sRGB integer color.");
}

export function createCraftGlassMaterial(spec: CraftGlassSpec) {
  validateCraftGlassMaterial(spec);
  const finish = FINISHES[spec.kind], size = spec.resolution ?? 256;
  let normalMap: DataTexture | null = null, roughnessMap: DataTexture | null = null;
  if (spec.kind === "frosted" || spec.kind === "ribbed" || spec.kind === "rain-streaked") {
    const relief = new Float32Array(size * size), rough = new Uint8Array(size * size * 4),
      normal = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, index = y * size + x;
      const fine = periodicNoise(u, v, 75, spec.seed + 17);
      let value: number, finishRough: number;
      if (spec.kind === "frosted") {
        value = .24 * periodicNoise(u, v, 47, spec.seed) + .15 * fine;
        finishRough = .47 + .17 * fine;
      } else if (spec.kind === "ribbed") {
        const bands = Math.sin(TAU * (18 * u + .03 * Math.sin(TAU * 3 * v)));
        value = .42 * bands + .055 * fine;
        finishRough = .09 + .1 * fine;
      } else {
        const streak = Math.pow(1 - Math.abs(Math.sin(TAU * (11 * u +
          .015 * Math.sin(TAU * 4 * v)))), 14);
        const drop = droplet(u, v, spec.seed + 23);
        value = .08 * streak + .27 * drop + .03 * fine;
        finishRough = .05 + .08 * fine - .025 * drop;
      }
      relief[index] = value;
      const offset = index * 4;
      rough[offset] = rough[offset + 2] = rough[offset + 3] = 255;
      rough[offset + 1] = byte(finishRough);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const dx = (relief[y * size + (x - 1 + size) % size] -
        relief[y * size + (x + 1) % size]) * size / 128;
      const dy = (relief[((y - 1 + size) % size) * size + x] -
        relief[((y + 1) % size) * size + x]) * size / 128;
      const length = Math.hypot(dx, dy, 1);
      normal[o] = byte((dx / length + 1) * .5);
      normal[o + 1] = byte((dy / length + 1) * .5);
      normal[o + 2] = byte((1 / length + 1) * .5);
      normal[o + 3] = 255;
    }
    const texture = (bytes: Uint8Array) => {
      const t = new DataTexture(bytes, size, size, RGBAFormat, UnsignedByteType);
      t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = NoColorSpace;
      t.magFilter = LinearFilter; t.minFilter = LinearMipmapLinearFilter;
      t.generateMipmaps = true; t.anisotropy = 4;
      t.repeat.set(...(spec.repeat ?? [1, 1])); t.needsUpdate = true;
      return t;
    };
    normalMap = texture(normal); roughnessMap = texture(rough);
  }
  const material = new MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: normalMap ? 1 : finish.roughness,
    transmission: 1, thickness: spec.thickness ?? finish.thickness,
    ior: spec.ior ?? 1.52, attenuationColor: new Color(spec.tint ?? finish.absorption),
    attenuationDistance: spec.attenuationDistance ?? finish.attenuation,
    clearcoat: 0, normalMap, roughnessMap, normalScale: new Vector2(1, 1),
    side: FrontSide, depthWrite: true,
  });
  material.name = spec.id;
  material.userData.glassFinish = { ...spec, repeat: [...(spec.repeat ?? [1, 1])] };
  let disposed = false;
  return { material, normalMap, roughnessMap, width: normalMap ? size : 0,
    height: normalMap ? size : 0, dispose() {
      if (disposed) return; disposed = true;
      material.dispose(); normalMap?.dispose(); roughnessMap?.dispose();
    } };
}
