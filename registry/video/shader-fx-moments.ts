/** Ready-made effect moments, each one job done the way studio work does it. Pure builders: each returns the effect spec, the frames
 * where text should land, and the sound cues, so a film document, a React stage and an export all agree.
 */
import type { ImageAsset } from "./scene-templates";
import type { GodRaysFx, HalftoneDotsFx, LiquidMetalFx, MeshGradientFx, WaterFx } from "./shader-fx";

/** A catalog sound placed at the frame where its peak should land. */
export interface MomentCue { frame: number; sound: string; gainDb: number }

/** Where the light is in a photograph, as fractions of the frame it fills. `strength` compares the brightest area with the median: under 1.4 there is no clear light. */
export interface LightSource { x: number; y: number; strength: number }
/** Find the light in an RGBA picture, as seen through a frame of `aspect` (width over height) with cover fit. Pure and deterministic. */
export function findLightSource(pixels: ArrayLike<number>, width: number, height: number, aspect: number): LightSource {
  // The part of the picture the frame shows, with cover fit.
  const imageAspect = width / height, cropW = imageAspect > aspect ? height * aspect : width, cropH = imageAspect > aspect ? height : width / aspect;
  const left = (width - cropW) / 2, top = (height - cropH) / 2, cols = 48, rows = Math.max(8, Math.round(cols / aspect));
  const grid = new Float64Array(cols * rows), counts = new Float64Array(cols * rows);
  for (let y = Math.floor(top); y < top + cropH; y += 1) for (let x = Math.floor(left); x < left + cropW; x += 1) {
    const i = (y * width + x) * 4, cell = Math.min(rows - 1, Math.floor((y - top) / cropH * rows)) * cols + Math.min(cols - 1, Math.floor((x - left) / cropW * cols));
    grid[cell] += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]; counts[cell] += 1;
  }
  const mean = Array.from(grid, (sum, i) => counts[i] ? sum / counts[i] : 0);
  // A light is an area, not a pixel: blur, then take the brightest few percent.
  const soft = mean.map((_, i) => { const cx = i % cols, cy = Math.floor(i / cols); let sum = 0, n = 0;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < cols && y < rows) { sum += mean[y * cols + x]; n += 1; } }
    return sum / n; });
  const sorted = [...soft].sort((a, b) => a - b), cut = sorted[Math.floor(sorted.length * .97)], median = sorted[Math.floor(sorted.length / 2)] || 1;
  let sx = 0, sy = 0, sw = 0;
  soft.forEach((value, i) => { if (value >= cut) { const w = value - cut + 1; sx += (i % cols + .5) / cols * w; sy += (Math.floor(i / cols) + .5) / rows * w; sw += w; } });
  return { x: Number((sx / sw).toFixed(3)), y: Number((sy / sw).toFixed(3)), strength: Number((sorted[sorted.length - 1] / median).toFixed(2)) };
}
/** The god-rays origin for a point on the frame. Measured: the core sits at the centre plus origin times the shorter side, with y down. */
export function rayOrigin(x: number, y: number, aspect: number): { originX: number; originY: number } {
  const short = Math.min(aspect, 1);
  return { originX: Number(((x - .5) * aspect / short).toFixed(3)), originY: Number(((y - .5) / short).toFixed(3)) };
}

const asImage = (image: ImageAsset) => image;
/** A field of printed dots sharpens into the photograph, then a label lands. */
export function resolveIntoPicture(options: { id?: string; image: ImageAsset; startFrame?: number; revealFrames?: number; ink?: string; paper?: string }) {
  const start = options.startFrame ?? 8, end = start + (options.revealFrames ?? 78);
  const fx: HalftoneDotsFx = { id: options.id ?? "resolve", effect: "halftone-dots", layer: "background", job: "reveal", treatment: "standard", fadeFrames: 0, image: asImage(options.image),
    params: { front: options.ink ?? "#1d1a16", back: options.paper ?? "#efe8da", grid: "hex", type: "classic", grain: .25 },
    keys: [{ param: "contrast", from: 0, to: .6, startFrame: start, endFrame: end - 8 }, { param: "size", from: .95, to: .55, startFrame: start, endFrame: end },
      { param: "radius", from: 1.9, to: 1.25, startFrame: start, endFrame: end }] };
  return { fx, labelFrame: end + 2, cues: [{ frame: end - 8, sound: "riser-1s-soft", gainDb: -10 }] satisfies MomentCue[] };
}
/** Coloured beams build toward the mark, it appears backlit, and the light falls back so the mark holds the frame. */
export function resolveIntoMark(options: { id?: string; colors?: readonly string[]; startFrame?: number; back?: string }) {
  const s = options.startFrame ?? 0;
  const fx: GodRaysFx = { id: options.id ?? "gather", effect: "god-rays", layer: "background", job: "identity", treatment: "standard", rate: .5, fadeFrames: 0,
    params: { colors: options.colors ?? ["#3fb6c6aa", "#f2b45a99", "#e2667a88"], back: options.back ?? "#05090e", bloomColor: "#ffffff", density: .3, spotty: .25, bloom: .4, midSize: .18, originX: 0, originY: 0 },
    keys: [{ param: "intensity", from: 0, to: .85, startFrame: s, endFrame: s + 48 }, { param: "intensity", from: .85, to: .35, startFrame: s + 70, endFrame: s + 115 },
      { param: "midIntensity", from: 0, to: .9, startFrame: s + 24, endFrame: s + 56 }, { param: "midIntensity", from: .9, to: .55, startFrame: s + 70, endFrame: s + 115 }] };
  return { fx, markFrame: s + 50, nameFrame: s + 84, cues: [{ frame: s + 58, sound: "sting-airy-short", gainDb: -6 }] satisfies MomentCue[] };
}
/** A chrome mark. `settle` maps a host frame to the effect's frame: the flow rushes in for `rushFrames`, then slows to a crawl. */
export function markSting(options: { id?: string; mark: ImageAsset; tint?: string; startFrame?: number; rushFrames?: number }) {
  const s = options.startFrame ?? 14, rush = options.rushFrames ?? 26;
  const fx: LiquidMetalFx = { id: options.id ?? "mark", effect: "liquid-metal", layer: "overlay", job: "identity", treatment: "standard", rate: 1, fadeFrames: 0, image: asImage(options.mark),
    region: { x: .35, y: .06, width: .3, height: .58 }, params: { repetition: 3, contour: .55, softness: .12, distortion: .06, angle: 70, tint: options.tint ?? "#dfe9f1", scale: .95 } };
  const settle = (frame: number) => frame < s + rush ? Math.max(0, frame) * 2.4 : (s + rush) * 2.4 + (frame - s - rush) * .35;
  return { fx, markFrame: s, nameFrame: s + 34, settle, cues: [{ frame: s + 22, sound: "sting-airy-short", gainDb: -4 }] satisfies MomentCue[] };
}
/** Only the water in a photograph moves, below `waterline`. */
export function livingStill(options: { id?: string; image: ImageAsset; waterline: number }) {
  const fx: WaterFx = { id: options.id ?? "still", effect: "water", layer: "background", job: "living-still", treatment: "subtle", rate: .3, fadeFrames: 0, image: asImage(options.image),
    params: { caustic: .05, waves: .05, layering: .2, edges: .15, highlights: .02, size: 1.2, waterline: options.waterline } };
  return { fx, cues: [{ frame: 0, sound: "bed-stream-close", gainDb: -16 }] satisfies MomentCue[] };
}
/** The picture starts under rippling water and caustic light; the surface calms until it comes through clear. */
export function causticReveal(options: { id?: string; image: ImageAsset; startFrame?: number; calmFrames?: number }) {
  const s = options.startFrame ?? 6, end = s + (options.calmFrames ?? 90);
  const fx: WaterFx = { id: options.id ?? "caustic", effect: "water", layer: "background", job: "reveal", treatment: "standard", rate: .45, fadeFrames: 0, image: asImage(options.image),
    params: { size: .9, edges: .4 },
    keys: [{ param: "waves", from: .3, to: .03, startFrame: s, endFrame: end, ease: "out" }, { param: "caustic", from: .2, to: .04, startFrame: s, endFrame: end, ease: "out" },
      { param: "layering", from: .7, to: .15, startFrame: s, endFrame: end }, { param: "highlights", from: .12, to: .02, startFrame: s, endFrame: end }] };
  return { fx, titleFrame: end - 12, cues: [{ frame: s, sound: "bed-underwater", gainDb: -14 }, { frame: end - 20, sound: "drop-water-full", gainDb: -12 }] satisfies MomentCue[] };
}
/** Brand values for a gradient: write them down once, use them everywhere. */
export interface SignatureBrand { colors: readonly string[]; seed: number; rate?: number }
export function signatureGradient(brand: SignatureBrand, id = "signature") {
  const fx: MeshGradientFx = { id, effect: "mesh-gradient", layer: "background", job: "identity", treatment: "subtle", rate: brand.rate ?? .2, seed: brand.seed,
    params: { colors: brand.colors, distortion: .7, swirl: .15, grain: .05 } };
  return { fx, cues: [] as MomentCue[] };
}
/** Rays placed on the light in a photograph. Pass the light from `findLightSource`, or from `npm run fx:light`. */
export function lightWithASource(options: { id?: string; light: LightSource; aspect: number; tint?: readonly string[]; startFrame?: number }) {
  const s = options.startFrame ?? 10, origin = rayOrigin(options.light.x, options.light.y, options.aspect);
  const fx: GodRaysFx = { id: options.id ?? "light", effect: "god-rays", layer: "overlay", job: "reveal", treatment: "standard", seed: 4, rate: .25, fadeFrames: 0,
    params: { colors: options.tint ?? ["#ffe2c288", "#ffd0b055"], bloomColor: "#ffd9bf", density: .25, spotty: .4, bloom: .35, midSize: .14, ...origin },
    keys: [{ param: "intensity", from: 0, to: .75, startFrame: s, endFrame: s + 80 }, { param: "midIntensity", from: 0, to: .35, startFrame: s, endFrame: s + 80 }] };
  return { fx, titleFrame: s + 74, cues: [{ frame: s + 74, sound: "riser-1s-soft", gainDb: -10 }] satisfies MomentCue[] };
}
