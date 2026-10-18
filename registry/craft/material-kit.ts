/** Reusable physically based surfaces for crafted 3D products.
 * Real material response, not a single glossy color on every mesh.
 * No downloads, shader plugins, runtime global cache or renderer ownership.
 */
import {
  DataTexture, LinearFilter, MeshPhysicalMaterial, RGBAFormat, RepeatWrapping,
  UnsignedByteType,
} from "three";

export type CraftSurface = "anodized-metal" | "brushed-metal" | "painted-metal" |
  "molded-polymer" | "soft-touch" | "optical-glass" | "elastomer" |
  "ceramic" | "display-glass" | "indicator";

export interface SurfaceRecipe {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  emissive?: string;
  emissiveIntensity?: number;
  /** Tiny seeded roughness detail, never a generic grunge texture. */
  grain?: "machined" | "molded" | "matte";
}

export const CRAFT_SURFACES: Readonly<Record<CraftSurface, SurfaceRecipe>> = {
  "anodized-metal": { color: "#6e7881", metalness: .85, roughness: .35, clearcoat: .14, grain: "machined" },
  "brushed-metal": { color: "#b1b9bc", metalness: .96, roughness: .29, grain: "machined" },
  "painted-metal": { color: "#3b4149", metalness: .44, roughness: .34, clearcoat: .55, clearcoatRoughness: .23 },
  "molded-polymer": { color: "#252c35", metalness: .02, roughness: .68, grain: "molded" },
  "soft-touch": { color: "#11191f", metalness: 0, roughness: .89, grain: "matte" },
  "optical-glass": { color: "#b1c9d4", metalness: .02, roughness: .07, transmission: .88, thickness: .26, ior: 1.49, clearcoat: .45 },
  "elastomer": { color: "#13181b", metalness: 0, roughness: .97, grain: "matte" },
  "ceramic": { color: "#ded9d1", metalness: .02, roughness: .21, clearcoat: .28 },
  "display-glass": { color: "#111d29", metalness: .06, roughness: .11, clearcoat: .9, clearcoatRoughness: .08 },
  "indicator": { color: "#9df2cd", metalness: 0, roughness: .35, emissive: "#34cd90", emissiveIntensity: 1.2 },
};

function microRoughness(kind: "machined" | "molded" | "matte", seed: number): DataTexture {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  let state = seed >>> 0 || 1;
  const noise = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967295;
  };
  const stripe = Array.from({ length: size }, () => noise());
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = kind === "machined"
      ? (.62 + stripe[y] * .28 + noise() * .10)
      : kind === "molded"
        ? (.76 + noise() * .24) : (.90 + noise() * .10);
    const index = (y * size + x) * 4;
    pixels[index] = 255;
    pixels[index + 1] = Math.round(value * 255); // Three.js roughnessMap reads G.
    pixels[index + 2] = 255;
    pixels[index + 3] = 255;
  }
  const map = new DataTexture(pixels, size, size, RGBAFormat, UnsignedByteType);
  map.wrapS = map.wrapT = RepeatWrapping;
  map.magFilter = LinearFilter;
  map.repeat.set(kind === "machined" ? 4 : 6, kind === "machined" ? 12 : 6);
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

export interface CraftMaterialOptions {
  /** Names map to individual semantic surface recipes. */
  overrides?: Partial<Record<CraftSurface, Partial<SurfaceRecipe>>>;
  /** Deterministic pattern seed, used only for microscopic roughness. */
  seed?: number;
}

export function createCraftMaterialKit(options: CraftMaterialOptions = {}) {
  const materials = {} as Record<CraftSurface, MeshPhysicalMaterial>;
  const textures: DataTexture[] = [];
  const specs = {} as Record<CraftSurface, SurfaceRecipe>;
  const keys = Object.keys(CRAFT_SURFACES) as CraftSurface[];
  keys.forEach((key, index) => {
    const spec = { ...CRAFT_SURFACES[key], ...options.overrides?.[key] };
    specs[key] = spec;
    const material = new MeshPhysicalMaterial({
      color: spec.color,
      metalness: spec.metalness, roughness: spec.roughness,
      clearcoat: spec.clearcoat ?? 0,
      clearcoatRoughness: spec.clearcoatRoughness ?? .15,
      transmission: spec.transmission ?? 0,
      thickness: spec.thickness ?? 0,
      ior: spec.ior ?? 1.5,
      emissive: spec.emissive ?? "#000000",
      emissiveIntensity: spec.emissiveIntensity ?? 0,
    });
    if (spec.grain) {
      const texture = microRoughness(spec.grain, (options.seed ?? 91) + index * 211);
      textures.push(texture);
      material.roughnessMap = texture;
    }
    materials[key] = material;
  });
  return {
    materials,
    specs,
    get(id: CraftSurface) { return materials[id]; },
    /** Dispose only objects this kit owns. No global state or shared disposal. */
    dispose() { Object.values(materials).forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); },
  };
}
export type CraftMaterialKit = ReturnType<typeof createCraftMaterialKit>;
