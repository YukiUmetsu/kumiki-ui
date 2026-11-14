/**
 * WM1 — deterministic brush deposition on an authored paper plane.
 * Geometry and material phase are pure functions of the absolute frame.
 * The SVG adapter is deliberately separate: this module needs no browser, clock or WebGL.
 */
export type PaintMedium = "ink" | "watercolour";
export interface BrushPoint {
  x: number;
  y: number;
  /** Contact pressure, 0..1. */
  pressure: number;
  /** Hand speed, 0..1; faster movement gives a lighter, narrower stroke. */
  speed?: number;
}
export interface PaintStroke {
  id: string;
  color: string;
  /** Five deliberately distinct pigment strengths, from pale wash to saturated mark. */
  tone: 1 | 2 | 3 | 4 | 5;
  /** Nominal full brush diameter in paper coordinates. */
  width: number;
  /** 0 = dry, 1 = very wet. */
  water: number;
  /** 0 = near empty brush, 1 = loaded. */
  load: number;
  /** Bristle breakup rather than a postprocessed film noise layer, 0..1. */
  dryBrush: number;
  /** The pen touches the paper at this absolute frame. */
  startFrame: number;
  drawFrames: number;
  /** Diffusion is measured after the final deposited point. */
  spreadFrames: number;
  /** Absorption and evaporation settle; the fully dry image never animates. */
  dryFrames: number;
  points: readonly BrushPoint[];
}
export interface PaintSurfaceSpec {
  version: 1;
  medium: PaintMedium;
  width: number;
  height: number;
  seed: number;
  paper: { color: string; tooth: number };
  strokes: readonly PaintStroke[];
}
export interface PaintIssue { code: string; path: string; message: string }
export interface BrushSample { x: number; y: number; pressure: number; speed: number; radius: number }
export interface BrushRibbon { path: string; centerline: readonly BrushSample[] }
export interface StrokePhase {
  id: string;
  deposit: number;
  spread: number;
  absorption: number;
  wetness: number;
  settled: boolean;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const paintClamp = (v: number): number => Math.max(0, Math.min(1, v));
const valid = (v: number, a: number, b: number) => Number.isFinite(v) && v >= a && v <= b;
const smooth = (v: number) => { const x = paintClamp(v); return x * x * (3 - 2 * x); };
const ints = (v: number, a: number, b: number) => Number.isSafeInteger(v) && v >= a && v <= b;

/** Path-based preflight: reject invalid geometry and timing instead of rendering phantom strokes. */
export function inspectPaintSurface(spec: PaintSurfaceSpec): PaintIssue[] {
  const issues: PaintIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (!spec || spec.version !== 1) { add("version", "/version", "Expected WM1 version 1."); return issues; }
  if (spec.medium !== "ink" && spec.medium !== "watercolour") add("medium", "/medium", "Use ink or watercolour.");
  if (!ints(spec.width, 240, 8192)) add("width", "/width", "Use 240..8192 whole paper pixels.");
  if (!ints(spec.height, 240, 8192)) add("height", "/height", "Use 240..8192 whole paper pixels.");
  if (!ints(spec.seed, 0, 2147483647)) add("seed", "/seed", "Use a nonnegative 31-bit seed.");
  if (!spec.paper || !HEX.test(spec.paper.color)) add("paper", "/paper/color", "Paper requires a six-digit hex color.");
  if (!spec.paper || !valid(spec.paper.tooth, 0, 1)) add("tooth", "/paper/tooth", "Paper tooth must be 0..1.");
  if (!Array.isArray(spec.strokes) || spec.strokes.length < 1 || spec.strokes.length > 120) {
    add("strokes", "/strokes", "Provide 1..120 authored strokes.");
    return issues;
  }
  const ids = new Set<string>();
  spec.strokes.forEach((stroke, i) => {
    const p = "/strokes/" + i;
    if (!stroke || typeof stroke.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(stroke.id) || ids.has(stroke.id))
      add("stroke-id", p + "/id", "Stroke ID must be unique lowercase kebab-case.");
    else ids.add(stroke.id);
    if (!stroke || !HEX.test(stroke.color)) add("color", p + "/color", "Pigment color must be six-digit hex.");
    if (!stroke || !ints(stroke.tone, 1, 5)) add("tone", p + "/tone", "Tone must be an integer from 1 to 5.");
    if (!stroke || !valid(stroke.width, 1, 240)) add("brush-width", p + "/width", "Brush width must be 1..240.");
    for (const key of ["water", "load", "dryBrush"] as const) {
      if (!stroke || !valid(stroke[key], 0, 1)) add(key, p + "/" + key, key + " must be 0..1.");
    }
    if (!stroke || !ints(stroke.startFrame, 0, 10000000)) add("start", p + "/startFrame", "Start frame must be a nonnegative integer.");
    for (const key of ["drawFrames", "spreadFrames", "dryFrames"] as const) {
      if (!stroke || !ints(stroke[key], key === "drawFrames" ? 1 : 0, 3600))
        add(key, p + "/" + key, key + " must be a valid frame duration.");
    }
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length < 2 || stroke.points.length > 64) {
      add("points", p + "/points", "A stroke needs 2..64 authored control points.");
      return;
    }
    stroke.points.forEach((pt: BrushPoint, j: number) => {
      if (!pt || !valid(pt.x, 0, spec.width) || !valid(pt.y, 0, spec.height))
        add("point-bounds", p + "/points/" + j, "Each point must be inside the paper.");
      if (!pt || !valid(pt.pressure, 0, 1)) add("pressure", p + "/points/" + j + "/pressure", "Pressure must be 0..1.");
      if (pt && pt.speed !== undefined && !valid(pt.speed, 0, 1))
        add("speed", p + "/points/" + j + "/speed", "Speed must be 0..1.");
    });
    if (stroke.points.every((v: BrushPoint, j: number) => j === 0 || (v?.x === stroke.points[0]?.x && v?.y === stroke.points[0]?.y)))
      add("collapsed", p + "/points", "At least two control points must have different coordinates.");
  });
  return issues;
}

/** Stable paper-coordinate hash. Frame intentionally is not an input. */
export function paintHash(seed: number, x: number, y: number): number {
  let h = Math.imul((x | 0) + 113, 374761393) ^ Math.imul((y | 0) + 197, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Deposition -> diffusion -> absorption/evaporation -> permanent dry hold. */
export function evaluatePaintStroke(stroke: PaintStroke, frame: number, reducedMotion = false): StrokePhase {
  if (!ints(frame, 0, 10000000)) throw new RangeError("Paint frame must be a nonnegative integer.");
  const elapsed = frame - stroke.startFrame;
  if (reducedMotion) return { id: stroke.id, deposit: 1, spread: 1, absorption: 1, wetness: 0, settled: true };
  const deposit = smooth(elapsed / stroke.drawFrames);
  const after = elapsed - stroke.drawFrames;
  const spread = after < 0 ? 0 : stroke.spreadFrames === 0 ? 1 : smooth(after / stroke.spreadFrames);
  const absorption = after < 0 ? 0 : stroke.dryFrames === 0 ? 1 : smooth(after / stroke.dryFrames);
  const settled = deposit === 1 && spread === 1 && absorption === 1;
  return { id: stroke.id, deposit, spread, absorption,
    wetness: deposit === 0 ? 0 : stroke.water * (1 - absorption), settled };
}

/** Smooth Catmull–Rom interpolation follows hand-authored control points, never a random bezier. */
export function sampleBrushCenterline(stroke: PaintStroke): BrushSample[] {
  const pts = stroke.points;
  if (pts.length < 2) return [];
  const out: BrushSample[] = [];
  const lerp = (a: number, b: number, c: number, d: number, t: number) =>
    .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    const length = Math.hypot(c.x - b.x, c.y - b.y);
    const steps = Math.max(4, Math.min(40, Math.ceil(length / 4)));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const pressure = paintClamp(lerp(a.pressure, b.pressure, c.pressure, d.pressure, t));
      const speed = paintClamp(lerp(a.speed ?? 0, b.speed ?? 0, c.speed ?? 0, d.speed ?? 0, t));
      out.push({ x: lerp(a.x, b.x, c.x, d.x, t), y: lerp(a.y, b.y, c.y, d.y, t),
        pressure, speed, radius: stroke.width * (.12 + .88 * pressure) * (.5 - .13 * speed) });
    }
  }
  const last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y, pressure: last.pressure, speed: last.speed ?? 0,
    radius: stroke.width * (.12 + .88 * last.pressure) * (.5 - .13 * (last.speed ?? 0)) });
  return out;
}

/** Closed variable-width ribbon with genuine tapered tips and deterministic edge feather.
 * Partial draw uses a prefix of the SAME complete sampled centerline, so strokes do not jump.
 */
export function buildBrushRibbon(stroke: PaintStroke, progress: number, growth = 0, seed = 0): BrushRibbon {
  const full = sampleBrushCenterline(stroke);
  const fraction = paintClamp(progress);
  if (!full.length || fraction === 0) return { path: "", centerline: [] };
  const max = fraction * (full.length - 1);
  const whole = Math.floor(max);
  const centerline = full.slice(0, whole + 1);
  if (whole < full.length - 1) {
    const a = full[whole], b = full[whole + 1], f = max - whole;
    centerline.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f,
      pressure: a.pressure + (b.pressure - a.pressure) * f,
      speed: a.speed + (b.speed - a.speed) * f, radius: a.radius + (b.radius - a.radius) * f });
  }
  if (centerline.length < 2) return { path: "", centerline };
  const left: string[] = [], right: string[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const pt = centerline[i], prev = centerline[Math.max(0, i - 1)], next = centerline[Math.min(i + 1, centerline.length - 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y, length = Math.max(.0001, Math.hypot(dx, dy));
    const u = i / (centerline.length - 1);
    const tip = Math.min(1, .07 + u * 13, .07 + (1 - u) * 13);
    const rough = (paintHash(seed, Math.floor(pt.x * 1.3), Math.floor(pt.y * 1.3)) - .5) * .115;
    const r = pt.radius * tip * Math.max(.8, 1 + growth + rough);
    const nx = -dy / length, ny = dx / length;
    left.push((pt.x + nx * r).toFixed(2) + " " + (pt.y + ny * r).toFixed(2));
    right.push((pt.x - nx * r).toFixed(2) + " " + (pt.y - ny * r).toFixed(2));
  }
  return { path: "M" + left.join(" L") + " L" + right.reverse().join(" L") + " Z", centerline };
}

/** CPU reference coverage at a paper point; alpha is bounded under repeated glazing.
 * The renderer uses the same fixed stroke geometry and stable seeded granulation.
 */
export function samplePaintCoverage(spec: PaintSurfaceSpec, frame: number, x: number, y: number, reducedMotion = false): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Sample location must be finite.");
  let remaining = 1;
  for (let i = 0; i < spec.strokes.length; i++) {
    const stroke = spec.strokes[i], phase = evaluatePaintStroke(stroke, frame, reducedMotion);
    if (!phase.deposit) continue;
    const pts = sampleBrushCenterline(stroke);
    const n = Math.max(1, Math.ceil((pts.length - 1) * phase.deposit));
    let cover = 0;
    for (let j = 0; j < n; j++) {
      const pt = pts[j], radius = pt.radius * (1 + .23 * stroke.water * phase.spread);
      const distance = Math.hypot(x - pt.x, y - pt.y) / Math.max(.001, radius);
      if (distance < 1) cover = Math.max(cover, smooth((1 - distance) * 5));
    }
    const tone = [.0, .18, .34, .50, .67, .86][stroke.tone];
    const granulation = 1 - spec.paper.tooth * .3 * paintHash(spec.seed + 59 * i, Math.floor(x * .8), Math.floor(y * .8));
    const settled = 1 - .1 * phase.absorption;
    const pigment = cover * stroke.load * tone * granulation * settled * (1 - stroke.dryBrush * .2);
    remaining *= 1 - paintClamp(pigment);
  }
  return paintClamp(1 - remaining);
}
