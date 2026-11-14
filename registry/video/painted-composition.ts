/**
 * WM2 — medium-native authored shape painting.
 * WM1 creates physical brush trails; WM2 can paint ANY independently authored SVG silhouette.
 * Neither the scene graph nor the material evaluator owns a playback clock.
 */
import { inspectPaintSurface, paintClamp, paintHash } from "./watercolour-brush";
import type { PaintStroke, PaintSurfaceSpec, PaintIssue } from "./watercolour-brush";

export interface PaintWash {
  kind: "wash";
  id: string;
  /** Closed SVG geometry describing the actual subject. Paths are never inferred from the brush trail. */
  path: string;
  /** Conservative [x,y,width,height] of the silhouette; drives fixed-paper pigment sampling. */
  bounds: readonly [number, number, number, number];
  pigment: string;
  /** Second hue can bleed and granulate inside the first instead of acting as flat color overlay. */
  accent?: string;
  tone: 1 | 2 | 3 | 4 | 5;
  opacity: number;
  water: number;
  granulation: number;
  edgePooling: number;
  /** Color reserved as untouched white paper inside paths. */
  reservePaths?: readonly string[];
  /** Optional thin secondary pigment veins/drawn highlights remain distinct authored paths. */
  details?: readonly { path: string; color: string; width: number; opacity: number }[];
  startFrame: number;
  /** Zero for a pre-painted underpainting; otherwise a real authored brush-path reveal is required. */
  paintFrames: number;
  spreadFrames: number;
  dryFrames: number;
  /** A stroke that sweeps across the silhouette, progressively revealing pigment inside its original bounds. */
  brushPath?: string;
  brushWidth?: number;
}
export interface PaintBrushLayer {
  kind: "brush";
  id: string;
  stroke: PaintStroke;
}
export interface PaintedImageLayer {
  kind: "image";
  id: string;
  /** Local/HTTPS image asset. Image remains original source media, not synthetically repainted. */
  href: string;
  bounds: readonly [number, number, number, number];
  /** A supplied subject mask is required; an arbitrary photograph cannot become a watercolor by a filter. */
  silhouettePath: string;
  opacity: number;
}
export type PaintedLayer = PaintWash | PaintBrushLayer | PaintedImageLayer;
export interface PaintedCompositionSpec {
  version: 1;
  width: number;
  height: number;
  seed: number;
  paper: { color: string; tooth: number };
  /** Ordered physical pigment passes; reordering changes optical results. */
  layers: readonly PaintedLayer[];
}
export interface WashFrame {
  deposit: number;
  spread: number;
  absorption: number;
  wetness: number;
  settled: boolean;
}
export interface PigmentGrain {
  x: number; y: number; radius: number; strength: number; accent: boolean;
}
const HEX = /^#[0-9a-f]{6}$/i;
const valid = (n: number, a: number, b: number) => Number.isFinite(n) && n >= a && n <= b;
const int = (n: number, a: number, b: number) => Number.isSafeInteger(n) && n >= a && n <= b;
const smooth = (n: number) => { const t = paintClamp(n); return t * t * (3 - 2 * t); };
const pathValid = (p: unknown): p is string =>
  typeof p === "string" && p.length >= 4 && p.length <= 65536 &&
  /^[Mm]\s*[-+.\d]/.test(p) && /^[MmLlHhVvCcSsQqTtAaZz0-9eE,\s.+-]+$/.test(p);
const regionValid = (b: readonly number[], w: number, h: number) =>
  b.length === 4 && b.every(Number.isFinite) && b[2] > 0 && b[3] > 0 &&
  b[0] >= 0 && b[1] >= 0 && b[0] + b[2] <= w && b[1] + b[3] <= h;

export function inspectPaintedComposition(spec: PaintedCompositionSpec): PaintIssue[] {
  const issues: PaintIssue[] = [], add = (code: string, path: string, message: string) =>
    issues.push({ code, path, message });
  if (!spec || spec.version !== 1) { add("version", "/version", "Expected WM2 version 1."); return issues; }
  if (!int(spec.width, 240, 8192)) add("width", "/width", "Width must be 240..8192.");
  if (!int(spec.height, 240, 8192)) add("height", "/height", "Height must be 240..8192.");
  if (!int(spec.seed, 0, 2147483647)) add("seed", "/seed", "Seed must be nonnegative 31-bit.");
  if (!spec.paper || !HEX.test(spec.paper.color)) add("paper", "/paper/color", "Paper must be six-digit hex.");
  if (!spec.paper || !valid(spec.paper.tooth, 0, 1)) add("tooth", "/paper/tooth", "Tooth must be 0..1.");
  if (!Array.isArray(spec.layers) || spec.layers.length < 1 || spec.layers.length > 160) {
    add("layers", "/layers", "Supply 1..160 ordered paint/image/brush layers.");
    return issues;
  }
  const seen = new Set<string>();
  spec.layers.forEach((layer, i) => {
    const p = "/layers/" + i;
    if (!layer || typeof layer.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(layer.id) || seen.has(layer.id))
      add("id", p + "/id", "Layer ID must be unique lowercase kebab-case.");
    else seen.add(layer.id);
    if (layer.kind === "brush") {
      const s: PaintSurfaceSpec = { version: 1, medium: "watercolour",
        width: spec.width, height: spec.height, seed: spec.seed, paper: spec.paper, strokes: [layer.stroke] };
      issues.push(...inspectPaintSurface(s).map(issue => ({
        ...issue, path: p + issue.path.replace(/^\/strokes\/0/, "/stroke"),
      })));
      return;
    }
    if (layer.kind === "image") {
      if (!regionValid(layer.bounds, spec.width, spec.height)) add("bounds", p + "/bounds", "Image must fit within paper.");
      if (!pathValid(layer.silhouettePath)) add("image-path", p + "/silhouettePath", "Supply an original SVG subject silhouette.");
      if (!/^(https:\/\/|\.\.?\/|\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(layer.href))
        add("image-href", p + "/href", "Use a local image, HTTPS URL or PNG/JPEG/WebP data URL.");
      if (!valid(layer.opacity, 0, 1)) add("image-opacity", p + "/opacity", "Opacity must be 0..1.");
      return;
    }
    if (layer.kind !== "wash") { add("kind", p + "/kind", "Layer kind must be wash, brush or image."); return; }
    if (!pathValid(layer.path)) add("path", p + "/path", "Use an SVG path beginning with M, with no markup.");
    if (!regionValid(layer.bounds, spec.width, spec.height)) add("bounds", p + "/bounds", "Bounds must fit within paper.");
    if (!HEX.test(layer.pigment)) add("pigment", p + "/pigment", "Pigment must be a six-digit hex color.");
    if (layer.accent && !HEX.test(layer.accent)) add("accent", p + "/accent", "Accent must be a six-digit hex color.");
    if (!int(layer.tone, 1, 5)) add("tone", p + "/tone", "Tone must be 1..5.");
    for (const k of ["opacity", "water", "granulation", "edgePooling"] as const)
      if (!valid(layer[k], 0, 1)) add(k, p + "/" + k, k + " must be 0..1.");
    if (!int(layer.startFrame, 0, 10000000)) add("start", p + "/startFrame", "Start frame must be nonnegative.");
    for (const k of ["paintFrames", "spreadFrames", "dryFrames"] as const)
      if (!int(layer[k], 0, 3600)) add(k, p + "/" + k, k + " must be 0..3600.");
    if (layer.paintFrames > 0 && (!pathValid(layer.brushPath) || !valid(layer.brushWidth ?? NaN, 1, 2048)))
      add("paint-path", p + "/brushPath", "Animated washes require a valid brushPath and brushWidth (1..2048).");
    if (layer.reservePaths && (layer.reservePaths.length > 64 || layer.reservePaths.some(v => !pathValid(v))))
      add("reserves", p + "/reservePaths", "Reserve paths must be authored SVG paths (max 64).");
    if (layer.details && (layer.details.length > 128 || layer.details.some(d =>
      !pathValid(d.path) || !HEX.test(d.color) || !valid(d.width, .1, 96) || !valid(d.opacity, 0, 1))))
      add("details", p + "/details", "Detail paths require SVG geometry, color, width and opacity.");
  });
  return issues;
}

/** Absolute-frame drying is independent of rendering order. Negative time is an unpainted sheet. */
export function evaluatePaintWash(w: PaintWash, frame: number, reducedMotion = false): WashFrame {
  if (!int(frame, 0, 10000000)) throw new RangeError("Wash frame must be nonnegative integer.");
  if (reducedMotion) return { deposit: 1, spread: 1, absorption: 1, wetness: 0, settled: true };
  const before = frame - w.startFrame;
  const deposit = w.paintFrames === 0 ? (before >= 0 ? 1 : 0) : smooth(before / w.paintFrames);
  const after = before - w.paintFrames;
  const spread = after < 0 ? 0 : w.spreadFrames === 0 ? 1 : smooth(after / w.spreadFrames);
  const absorption = after < 0 ? 0 : w.dryFrames === 0 ? 1 : smooth(after / w.dryFrames);
  const settled = deposit === 1 && spread === 1 && absorption === 1;
  return { deposit, spread, absorption, wetness: deposit === 0 ? 0 : w.water * (1 - absorption), settled };
}

/** Nonuniform paper-coupled pigment granulation, bounded to the authored shape at render time. */
export function samplePigmentGrains(w: PaintWash, seed: number): PigmentGrain[] {
  const [x, y, width, height] = w.bounds;
  const count = Math.min(200, Math.max(18, Math.round(width * height / 1800 * w.granulation)));
  return Array.from({ length: count }, (_, i) => {
    const px = paintHash(seed + 41, i, 17), py = paintHash(seed + 47, i, 23);
    return { x: x + width * px, y: y + height * py,
      radius: .4 + 2.6 * paintHash(seed + 67, i, 29),
      strength: .04 + .2 * paintHash(seed + 73, i, 31),
      accent: paintHash(seed + 79, i, 37) > .78 };
  });
}

/** Author-facing presets are just defaults, not a second timeline or a paint API tied to demo artwork. */
export const PAINTED_PALETTES = {
  botanical: ["#597C65", "#9DB49A", "#C6A9D8"],
  coastal: ["#4F8791", "#A6CAD1", "#E4B5A0"],
  heritage: ["#4B4D55", "#7F8799", "#B3A6A0"],
  science: ["#2A6E82", "#67B1AA", "#E1BD78"],
  editorial: ["#573B56", "#A08EB2", "#D7B196"],
} as const;
