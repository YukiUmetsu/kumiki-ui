/** Painted textures for crafted assets: print, engraving, labels and relief.
 *
 * Uses a 2D canvas when one exists (browsers, Storybook, video export) and
 * falls back to a tiny neutral DataTexture elsewhere (Node/jsdom tests), so
 * asset construction never depends on a canvas implementation. All painters
 * receive a seeded PRNG; never call Math.random() inside a painter.
 */
import {
  CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace,
  RGBAFormat, RepeatWrapping, SRGBColorSpace,
} from "three";
import type { Texture } from "three";

export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number, random: () => number) => void;

export interface PaintOptions {
  /** "srgb" for albedo/print; "data" for roughness, height, masks. */
  color?: "srgb" | "data";
  repeat?: boolean;
  seed?: number;
  /** Anisotropic filtering for grazing views of paper and labels. */
  anisotropy?: number;
  /** Fallback RGBA (0–255) used without a canvas. */
  fallback?: readonly [number, number, number, number];
}

export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createContext(width: number, height: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas.getContext("2d", { willReadFrequently: false });
}

/** True when real painted textures will be produced (not the fallback). */
export function canPaintTextures(): boolean {
  return createContext(1, 1) !== null;
}

function fallbackTexture(rgba: readonly [number, number, number, number], color: "srgb" | "data"): DataTexture {
  const data = new Uint8Array(16);
  for (let i = 0; i < 4; i++) data.set(rgba, i * 4);
  const texture = new DataTexture(data, 2, 2, RGBAFormat);
  texture.colorSpace = color === "srgb" ? SRGBColorSpace : NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function finish<T extends Texture>(texture: T, options: PaintOptions): T {
  texture.colorSpace = (options.color ?? "srgb") === "srgb" ? SRGBColorSpace : NoColorSpace;
  if (options.repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = options.anisotropy ?? 8;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Paint a texture. Returns a neutral 2×2 fallback when no canvas exists. */
export function paintTexture(width: number, height: number, painter: Painter, options: PaintOptions = {}): Texture {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192)
    throw new Error("Painted texture dimensions must be integers between 1 and 8192.");
  const ctx = createContext(width, height);
  if (!ctx) return fallbackTexture(options.fallback ?? [200, 200, 200, 255], options.color ?? "srgb");
  painter(ctx, width, height, seededRandom(options.seed ?? 1));
  return finish(new CanvasTexture(ctx.canvas), options);
}

/**
 * Paint a grayscale height field (white = raised) and convert it to a
 * tangent-space normal map with a Sobel filter. `strength` scales slopes.
 * Optionally also returns the painted height as an albedo-usable texture.
 */
export function paintNormalMap(width: number, height: number, painter: Painter,
  options: PaintOptions & { strength?: number } = {}): Texture {
  const ctx = createContext(width, height);
  if (!ctx) return fallbackTexture([128, 128, 255, 255], "data");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height);
  painter(ctx, width, height, seededRandom(options.seed ?? 1));
  return normalFromContext(ctx, options.strength ?? 2, options);
}

/** Sobel normal map from an already painted canvas (luminance = height). */
export function normalFromContext(ctx: CanvasRenderingContext2D, strength: number, options: PaintOptions = {}): Texture {
  const { width, height } = ctx.canvas;
  const source = ctx.getImageData(0, 0, width, height).data;
  const heightAt = (x: number, y: number) => {
    const xx = options.repeat ? (x + width) % width : Math.max(0, Math.min(width - 1, x));
    const yy = options.repeat ? (y + height) % height : Math.max(0, Math.min(height - 1, y));
    const i = (yy * width + xx) * 4;
    return (source[i] * .299 + source[i + 1] * .587 + source[i + 2] * .114) / 255;
  };
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = (heightAt(x + 1, y - 1) + 2 * heightAt(x + 1, y) + heightAt(x + 1, y + 1)) -
      (heightAt(x - 1, y - 1) + 2 * heightAt(x - 1, y) + heightAt(x - 1, y + 1));
    const dy = (heightAt(x - 1, y + 1) + 2 * heightAt(x, y + 1) + heightAt(x + 1, y + 1)) -
      (heightAt(x - 1, y - 1) + 2 * heightAt(x, y - 1) + heightAt(x + 1, y - 1));
    // Canvas rows run top-down while UV v runs bottom-up: flip the Y slope.
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const i = (y * width + x) * 4;
    out[i] = Math.round((nx * .5 + .5) * 255); out[i + 1] = Math.round((ny * .5 + .5) * 255);
    out[i + 2] = Math.round((nz * .5 + .5) * 255); out[i + 3] = 255;
  }
  // DataTexture rows are bottom-up when flipY is false; canvas data is top-down.
  const flipped = new Uint8Array(out.length);
  for (let y = 0; y < height; y++) flipped.set(out.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
  const texture = new DataTexture(flipped, width, height, RGBAFormat);
  return finish(texture, { ...options, color: "data" });
}

/** Paint once, get both the albedo texture and a normal map derived from it. */
export function paintWithRelief(width: number, height: number, painter: Painter,
  options: PaintOptions & { strength?: number; invert?: boolean } = {}): { map: Texture; normalMap: Texture } {
  const ctx = createContext(width, height);
  if (!ctx) return {
    map: fallbackTexture(options.fallback ?? [200, 200, 200, 255], options.color ?? "srgb"),
    normalMap: fallbackTexture([128, 128, 255, 255], "data"),
  };
  painter(ctx, width, height, seededRandom(options.seed ?? 1));
  const map = finish(new CanvasTexture(ctx.canvas), options);
  let relief = ctx;
  if (options.invert) {
    const copy = createContext(width, height)!;
    copy.filter = "invert(1) grayscale(1)";
    copy.drawImage(ctx.canvas, 0, 0);
    relief = copy;
  }
  return { map, normalMap: normalFromContext(relief, options.strength ?? 1.5, options) };
}
