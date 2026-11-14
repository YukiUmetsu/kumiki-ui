/**
 * INK1: pressure-shaped brush deposition on absorbent paper.
 * Pure frame evaluator and paper-space geometry, without DOM, clocks, image assets or shaders.
 * Authored centerlines represent subjects; this is not a full-frame image filter.
 */
export interface InkPoint { x: number; y: number; pressure: number }
export interface InkStroke {
  id: string;
  points: readonly InkPoint[];
  /** Full brush diameter in artwork pixels. */
  width: number;
  /** Pigment concentration, 0..1. Five calibrated values are provided below. */
  tone: number;
  /** Brush moisture, 0..1. Low water produces flying-white bristle gaps. */
  water: number;
  /** Brush pigment load, 0..1. */
  load: number;
  /** Brush angle: upright produces symmetric lines; oblique lays down a broad side-brush plane. */
  brush?: "upright" | "oblique";
  /** 0..1 contrast of the ink-loaded tip against the paler brush body. */
  tipInk?: number;
  /** 0..1 contact drag, increasing directional bristle texture. */
  drag?: number;
  /** Absolute stroke onset. */
  startFrame: number;
  /** Frames to lay down the complete centerline. */
  drawFrames: number;
  /** Frames available for capillary spreading after deposition. */
  spreadFrames: number;
  /** Frames for the wet edge to dry after spreading. */
  dryFrames: number;
  /** Small optional accent pigment; default is monochrome ink. */
  accent?: boolean;
}
export interface InkWashSpec {
  version: 1;
  width: number;
  height: number;
  paper: string;
  ink: string;
  accent?: string;
  seed: number;
  /** Sized paper is less absorbent; unsized paper takes a larger bleeding edge. */
  absorption: number;
  grain: number;
  strokes: readonly InkStroke[];
}
export const INK_TONES = { whisper: .16, pale: .31, middle: .50, dark: .73, black: 1 } as const;
export interface InkIssue { code: string; path: string; message: string }
export interface InkStrokeState {
  id: string;
  deposit: number;
  spread: number;
  absorbed: number;
  dry: number;
  tone: number;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const validNumber = (n: number, a: number, b: number) => Number.isFinite(n) && n >= a && n <= b;
const HEX = /^#[a-f0-9]{6}$/i;

/** Validate consumer data before any geometry is evaluated. */
export function inspectInkWash(spec: InkWashSpec): InkIssue[] {
  const problems: InkIssue[] = [];
  const add = (code: string, path: string, message: string) => problems.push({ code, path, message });
  if (!spec || spec.version !== 1) return [{ code: "version", path: "/version", message: "Expected INK1 version 1." }];
  for (const dim of ["width", "height"] as const) {
    if (!Number.isSafeInteger(spec[dim]) || spec[dim] < 200 || spec[dim] > 8192)
      add("dimension", "/" + dim, "Artwork dimensions must be integers from 200 to 8192.");
  }
  for (const color of ["paper", "ink", "accent"] as const) {
    if ((color !== "accent" || spec.accent !== undefined) && !HEX.test(spec[color] ?? "")) add("color", "/" + color, "Expected a six-digit hex color.");
  }
  if (!Number.isSafeInteger(spec.seed) || spec.seed < 0 || spec.seed > 2147483647) add("seed", "/seed", "Seed must be an integer in 0..2147483647.");
  if (!validNumber(spec.absorption, 0, 1)) add("absorption", "/absorption", "Absorption must be 0..1.");
  if (!validNumber(spec.grain, 0, 1)) add("grain", "/grain", "Grain must be 0..1.");
  if (!Array.isArray(spec.strokes) || spec.strokes.length > 500)
    return [...problems, { code: "strokes", path: "/strokes", message: "Provide up to 500 authored brushstrokes (zero for media-only compositions)." }];
  const seen = new Set<string>();
  spec.strokes.forEach((stroke, i) => {
    const at = "/strokes/" + i;
    if (!stroke || typeof stroke.id !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(stroke.id) || seen.has(stroke.id))
      add("stroke-id", at + "/id", "Stroke IDs must be unique, safe identifiers (1..64 characters).");
    else seen.add(stroke.id);
    if (!Array.isArray(stroke?.points) || stroke.points.length < 2 || stroke.points.length > 96) {
      add("points", at + "/points", "Each stroke needs 2..96 control points.");
    } else stroke.points.forEach((point: InkPoint, j: number) => {
      if (!point || !validNumber(point.x, -8192, 16384) || !validNumber(point.y, -8192, 16384) || !validNumber(point.pressure, 0, 1))
        add("point", at + "/points/" + j, "Point coordinates and pressure must be finite and pressure 0..1.");
    });
    for (const key of ["width", "tone", "water", "load"] as const) {
      const ranges = key === "width" ? [0.5, 240] : [0, 1];
      if (!validNumber(stroke?.[key], ranges[0], ranges[1]))
        add("brush-" + key, at + "/" + key, "Brush " + key + " must be within " + ranges.join("..") + ".");
    }
    for (const key of ["startFrame", "drawFrames", "spreadFrames", "dryFrames"] as const) {
      const min = key === "startFrame" || key === "spreadFrames" ? 0 : 1;
      if (!Number.isSafeInteger(stroke?.[key]) || stroke[key] < min || stroke[key] > 36000)
        add("timing", at + "/" + key, key + " must be an integer from " + min + " to 36000.");
    }
    if (stroke?.brush !== undefined && stroke.brush !== "upright" && stroke.brush !== "oblique")
      add("brush-orientation", at + "/brush", "Brush orientation must be upright or oblique.");
    for (const key of ["tipInk", "drag"] as const) {
      if (stroke?.[key] !== undefined && !validNumber(stroke[key]!, 0, 1))
        add("brush-"+key, at+"/"+key, key+" must be 0..1.");
    }
    if (stroke?.accent && !spec.accent) add("accent", at + "/accent", "Provide /accent before using accent pigment.");
  });
  return problems;
}
export function assertInkWash(spec: InkWashSpec): void {
  const issues = inspectInkWash(spec);
  if (issues.length) throw new Error("Invalid INK1: " + issues.map(p => p.path + " " + p.message).join("; "));
}

/** Stable seeded hash in paper/stroke coordinates; unsigned arithmetic is intentional. */
export function inkHash(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(Math.floor(x) + 101, 374761393) ^ Math.imul(Math.floor(y) + 37, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Independent deposition, capillary spread, absorption and drying are evaluated by absolute frame. */
export function evaluateInkStroke(stroke: InkStroke, frame: number, reducedMotion = false): InkStrokeState {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("INK1 frame must be a nonnegative integer.");
  if (reducedMotion) return { id: stroke.id, deposit: 1, spread: 1, absorbed: 1, dry: 1, tone: stroke.tone };
  const elapsed = frame - stroke.startFrame;
  const deposit = clamp(elapsed / stroke.drawFrames);
  const spread = clamp((elapsed - stroke.drawFrames * .24) / Math.max(1, stroke.drawFrames * .76 + stroke.spreadFrames));
  const absorbed = clamp((elapsed - stroke.drawFrames * .42) / Math.max(1, stroke.drawFrames * .58 + stroke.spreadFrames * .65));
  const dry = clamp((elapsed - stroke.drawFrames - stroke.spreadFrames) / stroke.dryFrames);
  return { id: stroke.id, deposit, spread, absorbed, dry, tone: stroke.tone };
}
export function evaluateInkWash(spec: InkWashSpec, frame: number, reducedMotion = false): InkStrokeState[] {
  assertInkWash(spec);
  return spec.strokes.map(stroke => evaluateInkStroke(stroke, frame, reducedMotion));
}

export interface InkSample { x: number; y: number; pressure: number; nx: number; ny: number; station: number }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function catmull(a: number, b: number, c: number, d: number, t: number) {
  return .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
}
/** Fixed paper-space stations: a finished stroke cannot shimmer as the current frame changes. */
export function inkSamples(stroke: InkStroke, progress = 1): InkSample[] {
  if (progress <= 0) return [];
  const p = stroke.points;
  const coords: Array<{ x: number; y: number; pressure: number }> = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    const steps = Math.min(64, Math.max(4, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 5)));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      coords.push({ x: catmull(a.x, b.x, c.x, d.x, t), y: catmull(a.y, b.y, c.y, d.y, t),
        pressure: clamp(lerp(b.pressure, c.pressure, t)) });
    }
  }
  coords.push({ ...p[p.length - 1] });
  const last = (coords.length - 1) * clamp(progress);
  const count = Math.floor(last);
  const active = coords.slice(0, count + 1);
  if (count < coords.length - 1 && last > count) {
    const a = coords[count], b = coords[count + 1], t = last - count;
    active.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), pressure: lerp(a.pressure, b.pressure, t) });
  }
  return active.map((point, i) => {
    const prev = active[Math.max(0, i - 1)], next = active[Math.min(active.length - 1, i + 1)];
    const length = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
    return { ...point, nx: -(next.y - prev.y) / length, ny: (next.x - prev.x) / length, station: i };
  });
}
const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
/** Closed variable-width pigment polygon. 'bleed' expands non-uniformly through paper fibers. */
export function inkOutline(stroke: InkStroke, seed: number, progress: number, expansion = 0): string {
  const samples = inkSamples(stroke, progress);
  if (!samples.length) return "";
  const left: string[] = [], right: string[] = [];
  samples.forEach((s, i) => {
    const total = Math.max(1, samples.length - 1);
    const across = i / total;
    const tip = Math.min(1, .16 + across * 10, .13 + (1 - across) * 12);
    // Slow variation follows paper grain, rather than a different random edge every sample.
    const slow = Math.sin(i * .19 + seed * .001) * .044;
    const jitter = slow + (inkHash(seed, Math.floor(i / 3), 11) - .5) * (.022 + stroke.water * .08);
    const r = Math.max(.1, stroke.width * (.15 + .85 * s.pressure) * tip * .5);
    const extra = expansion * (0.63 + inkHash(seed, i, 19) * .72);
    const bias = stroke.brush === "oblique" ? .52 : 0;
    const drag = stroke.drag ?? 0;
    const a = r * (1 + jitter + bias + .09 * drag) + extra;
    const b = r * (1 - jitter - bias * .74) + extra * (.78 + inkHash(seed, Math.floor(i / 4), 23) * .42);
    left.push(fmt(s.x + s.nx * a) + " " + fmt(s.y + s.ny * a));
    right.push(fmt(s.x - s.nx * b) + " " + fmt(s.y - s.ny * b));
  });
  return "M" + left.join(" L") + " L" + right.reverse().join(" L") + " Z";
}
/** Narrow irregular uninked tracks inside a dry stroke; positions are tied to stroke stations, not animation time. */
export function flyingWhite(stroke: InkStroke, seed: number, progress: number): string[] {
  if (stroke.water >= .62 || stroke.load >= .96) return [];
  const samples = inkSamples(stroke, progress);
  const output: string[] = [];
  const dryness = (1 - stroke.water) * (1 - .35 * stroke.load);
  // Real flying white follows the bristle direction for a coherent segment:
  // disconnected white flecks read as digital noise rather than dragged pigment.
  const count = Math.max(1,Math.round(2 + (stroke.drag ?? .5) * 4));
  for (let strand = 0; strand < count; strand++) {
    const begin = Math.round(inkHash(seed, strand, 17) * Math.max(0,samples.length - 8));
    const length = 5 + Math.round(inkHash(seed, strand, 23) * (8 + dryness * 12));
    if (inkHash(seed, strand, 51) > dryness * .96 || begin + 3 >= samples.length) continue;
    const offset = (strand / Math.max(1,count-1) - .5) * stroke.width * .42;
    const points: string[] = [];
    for (let i=begin; i<Math.min(samples.length,begin+length); i+=2) {
      const sample = samples[i], wiggle = (inkHash(seed, i>>2, strand+61)-.5)*stroke.width*.027;
      points.push(fmt(sample.x + sample.nx*(offset+wiggle))+" "+fmt(sample.y + sample.ny*(offset+wiggle)));
    }
    if (points.length >= 2) output.push("M"+points.join(" L"));
  }
  return output;
}

/** Full hold frame is max of authored timelines; no mutable simulation state is needed. */
export function inkHoldFrame(spec: InkWashSpec): number {
  return spec.strokes.length ? Math.max(...spec.strokes.map(s => s.startFrame + s.drawFrames + s.spreadFrames + s.dryFrames)) : 0;
}
