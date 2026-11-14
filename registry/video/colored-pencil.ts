/** CP1: deterministic, data-only coloured-pencil geometry. No frame clock, renderer or source assets.
 * Each stroke retains its own pressure, direction and drying-independent paper position.
 */
export type PencilAspect = "landscape" | "portrait";
export interface PencilTiming { startFrame: number; durationFrames: number }
export interface PencilPigmentLayer extends PencilTiming {
  /** Pigment colour, authored by the caller. */
  color: string;
  /** Hatch direction in degrees relative to the paper, not the camera. */
  angle: number;
  /** Separation between parallel pencil marks in paper coordinates. */
  spacing: number;
  /** Normalised pencil pressure, 0–1. Used for stroke width and deposition opacity. */
  pressure: number;
  /** Width of the pencil tip in paper units, 0.3–4. */
  tipWidth: number;
  /** Controls seeded waviness, not frame jitter. */
  seed: number;
}
export interface PencilTrace extends PencilTiming {
  path: string;
  color: string;
  width: number;
  opacity?: number;
}
export interface PencilRegion {
  id: string;
  /** Authored silhouette in paper-local SVG coordinates. */
  path: string;
  bounds: readonly [number, number, number, number];
  /** The specimen is positioned by the author, not randomly rearranged per frame. */
  transform?: string;
  /** Optional exceedingly light base tone; hatching remains the actual visible pigment. */
  underpaint?: string;
  layers: readonly PencilPigmentLayer[];
  contour: PencilTrace;
  details?: readonly PencilTrace[];
}
export interface PencilDrawingSpec {
  version: 1;
  width: number;
  height: number;
  seed: number;
  paper: string;
  paperTooth: number;
  regions: readonly PencilRegion[];
}
export interface PencilMark extends PencilTiming {
  path: string;
  width: number;
  opacity: number;
}
/** Stable integer hash; deterministic across server, Chromium and out-of-order seeks. */
export function pencilHash(seed: number, index: number, salt: number): number {
  let x = Math.imul((seed | 0) ^ Math.imul(index + 1, 0x9e3779b1), 0x85ebca6b) ^ (salt | 0);
  x = Math.imul(x ^ (x >>> 16), 0xc2b2ae35);
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}
export function evaluatePencilMark(frame: number, timing: PencilTiming, reducedMotion = false): number {
  if (!Number.isSafeInteger(frame) || frame < 0 ||
      !Number.isSafeInteger(timing.startFrame) || timing.startFrame < 0 ||
      !Number.isSafeInteger(timing.durationFrames) || timing.durationFrames < 1)
    throw new RangeError("Pencil marks require nonnegative integer frame/startFrame and positive durationFrames.");
  return reducedMotion ? 1 : Math.max(0, Math.min(1, (frame - timing.startFrame) / timing.durationFrames));
}
const HEX = /^#[0-9a-f]{6}$/i;
const validTrace = (trace: PencilTrace): boolean =>
  typeof trace.path === "string" && trace.path.length > 2 && trace.path.length <= 12000 &&
  /^[Mm]/.test(trace.path) && HEX.test(trace.color) &&
  Number.isFinite(trace.width) && trace.width >= .2 && trace.width <= 10 &&
  (trace.opacity === undefined || (Number.isFinite(trace.opacity) && trace.opacity >= 0 && trace.opacity <= 1)) &&
  Number.isSafeInteger(trace.startFrame) && trace.startFrame >= 0 &&
  Number.isSafeInteger(trace.durationFrames) && trace.durationFrames >= 1;
export function inspectPencilDrawing(spec: PencilDrawingSpec): string[] {
  const issues: string[] = [];
  if (spec.version !== 1) issues.push("version: CP1 requires version 1.");
  if (![spec.width, spec.height].every(n => Number.isSafeInteger(n) && n >= 100 && n <= 4096))
    issues.push("size: page must be 100–4096 paper units.");
  if (!Number.isSafeInteger(spec.seed) || spec.seed < 0 || spec.seed > 2147483647)
    issues.push("seed: must be a nonnegative signed 31-bit integer.");
  if (!HEX.test(spec.paper)) issues.push("paper: must be a six-digit hexadecimal colour.");
  if (!Number.isFinite(spec.paperTooth) || spec.paperTooth < 0 || spec.paperTooth > 1)
    issues.push("paperTooth: must be within 0..1.");
  if (!Array.isArray(spec.regions) || spec.regions.length === 0 || spec.regions.length > 24) {
    issues.push("regions: 1–24 named specimens or facets required.");
    return issues;
  }
  const ids = new Set<string>();
  for (const [i, region] of spec.regions.entries()) {
    const at = "regions[" + i + "]";
    if (!/^[A-Za-z][\w-]{0,48}$/.test(region.id) || ids.has(region.id))
      issues.push(at + ".id: must be unique, short and safe.");
    ids.add(region.id);
    if (typeof region.path !== "string" || !/^[Mm]/.test(region.path) || region.path.length > 12000)
      issues.push(at + ".path: expected bounded authored SVG contour.");
    if (!Array.isArray(region.bounds) || region.bounds.length !== 4 ||
      !region.bounds.every((n: number) => Number.isFinite(n) && Math.abs(n) <= 4096) ||
      region.bounds[2] <= 0 || region.bounds[3] <= 0)
      issues.push(at + ".bounds: finite local rectangle with positive extent required.");
    if (region.transform !== undefined &&
      (typeof region.transform !== "string" || region.transform.length > 160 ||
       !/^(?:[ \w.,()\-+])+$/.test(region.transform)))
      issues.push(at + ".transform: unsupported SVG transform.");
    if (region.underpaint !== undefined && !HEX.test(region.underpaint))
      issues.push(at + ".underpaint: invalid hex colour.");
    if (!validTrace(region.contour)) issues.push(at + ".contour: invalid graphite stroke.");
    if (!Array.isArray(region.layers) || region.layers.length < 1 || region.layers.length > 6) {
      issues.push(at + ".layers: require 1–6 pigment passes.");
      continue;
    }
    for (const [j, layer] of region.layers.entries()) {
      if (!HEX.test(layer.color) || !Number.isFinite(layer.angle) || Math.abs(layer.angle) > 180 ||
          !Number.isFinite(layer.spacing) || layer.spacing < 3 || layer.spacing > 32 ||
          !Number.isFinite(layer.pressure) || layer.pressure < 0 || layer.pressure > 1 ||
          !Number.isFinite(layer.tipWidth) || layer.tipWidth < .3 || layer.tipWidth > 4 ||
          !Number.isSafeInteger(layer.seed) || layer.seed < 0 ||
          !Number.isSafeInteger(layer.startFrame) || layer.startFrame < 0 ||
          !Number.isSafeInteger(layer.durationFrames) || layer.durationFrames < 8)
        issues.push(at + ".layers[" + j + "]: invalid colour, pressure, pitch, frame timing or tip.");
      if (Number.isFinite(region.bounds[2]) && Number.isFinite(region.bounds[3]) &&
          region.bounds[2] > 0 && region.bounds[3] > 0 &&
          Number.isFinite(layer.spacing) && layer.spacing > 0 &&
          Math.ceil(Math.hypot(region.bounds[2], region.bounds[3]) * 1.6 / layer.spacing) > 320)
        issues.push(at + ".layers[" + j + "]: hatch exceeds the 320-stroke per-pass budget.");
    }
    if ((region.details?.length ?? 0) > 80 || region.details?.some((trace: PencilTrace) => !validTrace(trace)))
      issues.push(at + ".details: up to 80 bounded graphite details allowed.");
  }
  return issues;
}
/** Author time belongs to the individual mark; after deposition there is NO evolving noise.
 * The region clips rotated stroke geometry, so parallel lines become a physical surface, not a photo shader.
 */
export function hatchPencilRegion(region: PencilRegion, layer: PencilPigmentLayer): PencilMark[] {
  const [x, y, width, height] = region.bounds;
  if (![x, y, width, height, layer.spacing, layer.pressure, layer.tipWidth, layer.angle]
    .every(Number.isFinite) || width <= 0 || height <= 0 ||
    layer.spacing < 3 || layer.spacing > 32 ||
    layer.pressure < 0 || layer.pressure > 1 ||
    layer.tipWidth < .3 || layer.tipWidth > 4 ||
    Math.abs(layer.angle) > 180 ||
    !Number.isSafeInteger(layer.seed) || !Number.isSafeInteger(layer.startFrame) ||
    !Number.isSafeInteger(layer.durationFrames) || layer.durationFrames < 8)
    throw new RangeError("Invalid pencil hatch geometry or timing.");
  const span = Math.hypot(width, height) * 1.6;
  const rows = Math.ceil(span / layer.spacing);
  if (rows > 320) throw new RangeError("Pencil hatch density exceeds 320 marks.");
  const cx = x + width / 2, cy = y + height / 2;
  return Array.from({ length: rows }, (_, i): PencilMark => {
    const jitter = (pencilHash(layer.seed, i, 1) - .5) * layer.spacing * .18;
    const yy = cy - span / 2 + i * layer.spacing + jitter;
    const startX = cx - span / 2, endX = cx + span / 2;
    const bow = (pencilHash(layer.seed, i, 2) - .5) * 3.4;
    const start = layer.startFrame + Math.floor(i * Math.max(0, layer.durationFrames - 14) / Math.max(1, rows - 1));
    const pressure = .48 + pencilHash(layer.seed, i, 3) * .52;
    const widthHere = layer.tipWidth * (.36 + .64 * layer.pressure) * pressure;
    return {
      path: "M" + startX.toFixed(2) + " " + yy.toFixed(2) +
        " Q" + cx.toFixed(2) + " " + (yy + bow).toFixed(2) +
        " " + endX.toFixed(2) + " " + (yy + (pencilHash(layer.seed, i, 4) - .5) * 2).toFixed(2),
      width: widthHere,
      opacity: (.19 + layer.pressure * .48) * (.65 + pencilHash(layer.seed, i, 5) * .35),
      startFrame: start,
      durationFrames: 14,
    };
  });
}
