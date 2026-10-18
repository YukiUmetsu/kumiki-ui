/** Procedural local reflection environment for metals and glass.
 * Three.js PBR materials need reflected softboxes, not only point lights.
 * This equirectangular map is generated once, has no external assets and
 * belongs to the caller's scene; Three's renderer performs PMREM filtering.
 */
import {
  ClampToEdgeWrapping, DataTexture, EquirectangularReflectionMapping,
  LinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType,
} from "three";
import type { Scene } from "three";

export type EnvironmentMood = "neutral" | "cool" | "warm";
export interface CraftEnvironmentOptions {
  mood?: EnvironmentMood;
  width?: 256 | 512;
  /** Scene-local intensity multiplier; the 3D renderer owns tone mapping. */
  intensity?: number;
}

const palettes: Record<EnvironmentMood, {
  base: readonly [number, number, number];
  strips: readonly (readonly [number, number, number])[];
}> = {
  neutral: { base: [39, 47, 57], strips: [[245, 248, 253], [196, 217, 240], [250, 227, 206]] },
  cool: { base: [30, 45, 58], strips: [[228, 245, 255], [168, 202, 249], [218, 238, 250]] },
  warm: { base: [52, 43, 40], strips: [[255, 241, 218], [234, 205, 180], [213, 225, 251]] },
};
const boxes = [
  { x: .13, y: .32, width: .085, height: .18, weight: 1 },
  { x: .48, y: .26, width: .075, height: .23, weight: .7 },
  { x: .84, y: .41, width: .035, height: .27, weight: .65 },
] as const;
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const wrappedDistance = (a: number, b: number) => {
  const d = Math.abs(a - b); return Math.min(d, 1 - d);
};

export function createCraftEnvironment(options: CraftEnvironmentOptions = {}) {
  const width = options.width ?? 512, height = width / 2, intensity = options.intensity ?? 1;
  if (!Number.isFinite(intensity) || intensity <= 0 || intensity > 4)
    throw new Error("Craft environment intensity must be finite between 0 and 4.");
  const palette = palettes[options.mood ?? "neutral"];
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5) / width, v = (y + .5) / height;
    const ambient = .55 + .30 * (1 - v);
    const result = palette.base.map(channel => channel * ambient);
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const du = wrappedDistance(u, box.x), dv = Math.abs(v - box.y);
      const featherX = 1 - smoothstep(box.width * .8, box.width * 1.10, du);
      const featherY = 1 - smoothstep(box.height * .85, box.height * 1.14, dv);
      const coverage = featherX * featherY * box.weight;
      for (let c = 0; c < 3; c++)
        result[c] += (palette.strips[i][c] - result[c]) * coverage;
    }
    const index = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) pixels[index + c] = Math.round(Math.max(0, Math.min(255, result[c])));
    pixels[index + 3] = 255;
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, UnsignedByteType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return {
    texture, intensity,
    /** Installs environment reflections only, retaining separate scene.background. */
    apply(scene: Scene) {
      const previous = scene.environment, previousIntensity = scene.environmentIntensity;
      scene.environment = texture;
      scene.environmentIntensity = intensity;
      return () => {
        if (scene.environment === texture) {
          scene.environment = previous;
          scene.environmentIntensity = previousIntensity;
        }
      };
    },
    dispose() { texture.dispose(); },
  };
}
export type CraftEnvironment = ReturnType<typeof createCraftEnvironment>;
