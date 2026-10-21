/** FlowPath (V04): illustrative directional motion along authored paths, 2D or 3D.
 *
 * One renderer-neutral grammar for air, heat, water, refrigerant, rain,
 * power, money or mechanical motion. A path is a 2D/3D polyline, an MG1
 * `MotionPath` (flattened with the shared `samplePath`), or a per-frame
 * sampler for moving anchors. Evaluation is a pure function of the plan and
 * an absolute integer frame: random seeks equal sequential playback, marker
 * counts are capped, and particle jitter is seeded and attached to each
 * particle's identity, so it never shimmers.
 *
 * Direction and speed are *illustrative* unless a measured magnitude with a
 * unit and a source is supplied; nothing here infers velocity, pressure,
 * energy transfer or conservation.
 */
import { samplePath } from "../motion/paths";
import type { MotionPath } from "../motion/paths";

export type FlowStyle = "arrows" | "streaks" | "particles" | "ribbon" | "pulse";
export type FlowPoint = readonly number[];
export type FlowPathSource = readonly FlowPoint[] | MotionPath | ((frame: number) => readonly FlowPoint[]);
export interface FlowMagnitude {
  value: number;
  unit: string;
  /** "measured" requires a source; "illustrative" values only scale the visual. */
  meaning: "illustrative" | "measured";
  source?: string;
}
export interface FlowPathSpec {
  id: string;
  path: FlowPathSource;
  /** Rounded corners (path units); 0 keeps sharp corners. */
  cornerRadius?: number;
  direction?: "forward" | "reverse";
  /** Visible frames [startFrame, endFrame); fades over `fadeFrames`. */
  window?: { startFrame: number; endFrame: number };
  fadeFrames?: number;
  /** Frames over which the track draws on from its start (0 = already drawn). */
  drawOnFrames?: number;
  style: FlowStyle;
  /** Illustrative travel speed, path units per second. */
  speed: number;
  /** Reference frame rate for `speed` (default 30). */
  fps?: number;
  /** Distance between markers along the path. */
  spacing: number;
  /** Streak / pulse length along the path (default spacing × .45). */
  length?: number;
  /** Hard cap on emitted markers (default 64, at most 512). */
  maxMarkers?: number;
  /** Seeded lateral jitter for particles (path units). */
  jitter?: { amount: number; seed: number };
  /** Fade markers within this distance of either end (default spacing × .6). */
  endFade?: number;
  magnitude?: FlowMagnitude;
}
export interface FlowMarker {
  /** Stable identity of the travelling marker (survives seeks and wrap-around). */
  id: number;
  distance: number;
  position: number[];
  tangent: number[];
  opacity: number;
}
export interface FlowSegment { from: number; to: number; opacity: number; points: number[][] }
export interface FlowDiagnostic { code: "invalid" | "density-capped" | "magnitude-unsourced" | "degenerate-path" | "dimension-mismatch"; severity: "error" | "warning" | "info"; message: string }
export interface FlowPathFrame {
  id: string;
  frame: number;
  style: FlowStyle;
  direction: "forward" | "reverse";
  dimension: 2 | 3;
  /** Window fade 0–1 (0 = not drawn). */
  opacity: number;
  /** Current polyline after corner rounding. */
  points: number[][];
  length: number;
  /** Drawn track length (draw-on). */
  drawn: number;
  /** Drawn interval in path distance: [0, drawn] forward, [length − drawn, length] reverse. */
  drawnRange: readonly [number, number];
  /** Ribbon/dash phase in path units (advances with travel). */
  phase: number;
  markers: FlowMarker[];
  /** Streak / pulse intervals along the path. */
  segments: FlowSegment[];
  semantics: "illustrative" | "measured";
  magnitude?: FlowMagnitude;
  diagnostics: FlowDiagnostic[];
}
export interface FlowPathPlan { spec: Readonly<FlowPathSpec>; dimension: 2 | 3; diagnostics: FlowDiagnostic[]; staticLine?: Polyline }

interface Polyline { points: number[][]; cumulative: number[]; length: number }

const finitePoint = (p: FlowPoint) => (p.length === 2 || p.length === 3) && p.every(Number.isFinite);
const sub = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v - b[i]);
const addScaled = (a: readonly number[], b: readonly number[], k: number) => a.map((v, i) => v + b[i] * k);
const len = (a: readonly number[]) => Math.hypot(...a);
const norm = (a: readonly number[]) => { const l = len(a) || 1; return a.map(v => v / l); };

/** Round interior corners with circular-ish fillets of radius `r` (N-D; collinear points pass through). */
export function filletPolyline(points: readonly FlowPoint[], r: number, steps = 6): number[][] {
  const pts = points.map(p => [...p]);
  if (r <= 0 || pts.length < 3) return pts;
  const out: number[][] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    const da = norm(sub(a, p)), db = norm(sub(b, p));
    const cos = da.reduce((s, v, k) => s + v * db[k], 0);
    if (cos < -.999) { out.push(p); continue; } // straight through
    const reach = Math.min(r, len(sub(a, p)) * .5, len(sub(b, p)) * .5);
    const s0 = addScaled(p, da, reach), s1 = addScaled(p, db, reach);
    for (let k = 0; k <= steps; k++) {
      // Quadratic Bézier with the corner as control point: tangent-continuous, stays inside the corner.
      const t = k / steps, u = 1 - t;
      out.push(s0.map((v, c) => u * u * v + 2 * u * t * p[c] + t * t * s1[c]));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function measure(points: number[][]): Polyline {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + len(sub(points[i], points[i - 1])));
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}
/** Point and unit tangent at arc distance `d` (clamped). */
export function samplePolylineAt(line: { points: number[][]; cumulative: number[]; length: number }, d: number): { position: number[]; tangent: number[] } {
  const { points, cumulative } = line;
  const x = Math.max(0, Math.min(line.length, d));
  let lo = 0, hi = cumulative.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cumulative[mid] <= x) lo = mid; else hi = mid; }
  const seg = cumulative[hi] - cumulative[lo], f = seg > 0 ? (x - cumulative[lo]) / seg : 0;
  const a = points[lo], b = points[hi];
  return { position: a.map((v, i) => v + (b[i] - v) * f), tangent: norm(sub(b, a)) };
}
function sliceLine(line: Polyline, from: number, to: number): number[][] {
  const a = Math.max(0, from), b = Math.min(line.length, to);
  if (b <= a) return [];
  const out = [samplePolylineAt(line, a).position];
  for (let i = 1; i < line.points.length - 1; i++) if (line.cumulative[i] > a && line.cumulative[i] < b) out.push([...line.points[i]]);
  out.push(samplePolylineAt(line, b).position);
  return out;
}
const hash = (seed: number, n: number) => {
  let h = (seed * 374761393 + n * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function resolvePoints(path: FlowPathSource, frame: number): FlowPoint[] {
  if (typeof path === "function") return [...path(frame)];
  if (Array.isArray(path)) return [...path];
  const samples = samplePath(path as MotionPath);
  return samples.points.map(p => [p.x, p.y]);
}

/** Validate a spec. Throws on structural errors; returns notes such as unsourced magnitudes. */
export function compileFlowPath(spec: FlowPathSpec): FlowPathPlan {
  const diagnostics: FlowDiagnostic[] = [];
  const fail = (message: string) => { throw new Error(`FlowPath "${spec.id}": ${message}`); };
  if (!spec.id?.trim()) fail("needs an ID.");
  if (!["arrows", "streaks", "particles", "ribbon", "pulse"].includes(spec.style)) fail(`unsupported style "${spec.style}".`);
  if (!(Number.isFinite(spec.speed) && spec.speed >= 0)) fail("speed must be a finite, nonnegative number of units per second.");
  if (!(Number.isFinite(spec.spacing) && spec.spacing > 0)) fail("spacing must be positive.");
  if (spec.maxMarkers !== undefined && !(Number.isInteger(spec.maxMarkers) && spec.maxMarkers > 0 && spec.maxMarkers <= 512)) fail("maxMarkers must be an integer from 1 to 512.");
  if (spec.window && !(Number.isSafeInteger(spec.window.startFrame) && Number.isSafeInteger(spec.window.endFrame) && spec.window.endFrame > spec.window.startFrame && spec.window.startFrame >= 0)) fail("window must be integer frames with end > start ≥ 0.");
  if (spec.jitter && !(Number.isFinite(spec.jitter.amount) && spec.jitter.amount >= 0 && Number.isSafeInteger(spec.jitter.seed))) fail("jitter needs a nonnegative amount and an integer seed.");
  const sample = resolvePoints(spec.path, spec.window?.startFrame ?? 0);
  if (sample.length < 2 || !sample.every(finitePoint)) fail("path needs at least two finite 2D or 3D points.");
  const dimension = sample[0].length as 2 | 3;
  if (sample.some(p => p.length !== dimension)) fail("every path point must have the same dimension.");
  if (spec.magnitude) {
    const m = spec.magnitude;
    if (!Number.isFinite(m.value) || !m.unit?.trim()) fail("magnitude needs a finite value and a unit.");
    if (m.meaning === "measured" && !m.source?.trim())
      diagnostics.push({ code: "magnitude-unsourced", severity: "error", message: `Flow "${spec.id}" claims a measured ${m.value} ${m.unit} without a source; mark it illustrative or cite the data.` });
  }
  const staticLine = typeof spec.path === "function" ? undefined : measure(filletPolyline(sample, spec.cornerRadius ?? 0));
  if (staticLine && staticLine.length < 1e-9) fail("path has zero length.");
  return { spec, dimension, diagnostics, staticLine };
}

/** Pure per-frame evaluation (any seek order). */
export function evaluateFlowPath(plan: FlowPathPlan, frame: number): FlowPathFrame {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error("FlowPath evaluates nonnegative integer frames.");
  const { spec, dimension } = plan;
  const diagnostics = [...plan.diagnostics];
  let line = plan.staticLine;
  if (!line) {
    const pts = resolvePoints(spec.path, frame);
    if (pts.length < 2 || !pts.every(finitePoint) || pts.some(p => p.length !== dimension))
      throw new Error(`FlowPath "${spec.id}" path sampler returned invalid points at frame ${frame}.`);
    line = measure(filletPolyline(pts, spec.cornerRadius ?? 0));
    if (line.length < 1e-9) diagnostics.push({ code: "degenerate-path", severity: "warning", message: `Flow "${spec.id}" collapses to zero length at frame ${frame}.` });
  }
  const start = spec.window?.startFrame ?? 0, end = spec.window?.endFrame ?? Infinity;
  const fade = Math.max(1, spec.fadeFrames ?? 8);
  const inWindow = frame >= start && frame < end;
  const opacity = !inWindow ? 0 : Math.min(1, (frame - start + 1) / fade, Number.isFinite(end) ? (end - frame) / fade : 1);
  const elapsed = Math.max(0, frame - start);
  const fps = spec.fps ?? 30;
  const travel = spec.speed * elapsed / fps;
  const L = line.length;
  const drawn = spec.drawOnFrames ? L * Math.min(1, elapsed / spec.drawOnFrames) : L;
  const reverse = spec.direction === "reverse";
  const toPath = (d: number) => reverse ? L - d : d; // d = distance travelled from the source end
  const spacing = spec.spacing, phase = travel % spacing;
  const endFade = spec.endFade ?? spacing * .6;
  const cap = spec.maxMarkers ?? 64;
  const markers: FlowMarker[] = [], segments: FlowSegment[] = [];
  const drawnRange: readonly [number, number] = reverse ? [L - drawn, L] : [0, drawn];
  const base = { id: spec.id, frame, style: spec.style, direction: reverse ? "reverse" as const : "forward" as const, dimension, opacity, points: line.points, length: L, drawn, drawnRange, phase,
    semantics: spec.magnitude?.meaning === "measured" && spec.magnitude.source ? "measured" as const : "illustrative" as const, magnitude: spec.magnitude };
  if (!opacity) return { ...base, markers, segments, diagnostics };
  // Visible extent in travel coordinates: forward flows draw on from the start, reverse from the end.
  const visibleTravel = drawn;
  const needed = Math.ceil(visibleTravel / spacing) + 1;
  if (spec.style !== "ribbon" && needed > cap)
    diagnostics.push({ code: "density-capped", severity: "info", message: `Flow "${spec.id}" needs ${needed} markers; capped at ${cap}. Increase spacing or maxMarkers.` });
  const edge = (d: number) => Math.min(1, d / Math.max(1e-6, endFade), (visibleTravel - d) / Math.max(1e-6, endFade));
  const jitterNormal = (tangent: number[], n: number): number[] => {
    if (!spec.jitter?.amount) return [];
    const r = hash(spec.jitter.seed, n) * 2 - 1, r2 = hash(spec.jitter.seed + 7919, n) * 2 - 1;
    if (dimension === 2) return [-tangent[1] * r * spec.jitter.amount, tangent[0] * r * spec.jitter.amount];
    const up = Math.abs(tangent[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
    const a = norm([tangent[1] * up[2] - tangent[2] * up[1], tangent[2] * up[0] - tangent[0] * up[2], tangent[0] * up[1] - tangent[1] * up[0]]);
    const b = [tangent[1] * a[2] - tangent[2] * a[1], tangent[2] * a[0] - tangent[0] * a[2], tangent[0] * a[1] - tangent[1] * a[0]];
    return a.map((v, i) => (v * r + b[i] * r2) * spec.jitter!.amount);
  };
  if (spec.style !== "ribbon") {
    const segLen = spec.length ?? spacing * .45;
    for (let k = 0; k < Math.min(needed, cap); k++) {
      const d = phase + k * spacing; // travel distance of the k-th marker from the source end
      if (d > visibleTravel + (spec.style === "streaks" || spec.style === "pulse" ? segLen : 0)) break;
      // Identity: how many spacings this marker has travelled since the flow began.
      const id = Math.round((travel - d) / spacing);
      const at = samplePolylineAt(line, toPath(Math.min(d, visibleTravel)));
      const tangent = reverse ? at.tangent.map(v => -v) : at.tangent;
      if (spec.style === "streaks" || spec.style === "pulse") {
        const from = Math.max(0, d - segLen), to = Math.min(visibleTravel, d);
        if (to - from <= 1e-6) continue;
        const a = toPath(from), b = toPath(to);
        segments.push({ from: Math.min(a, b), to: Math.max(a, b), opacity: Math.max(0, Math.min(1, edge(to) * 1.4)), points: sliceLine(line, Math.min(a, b), Math.max(a, b)) });
      }
      if (d <= visibleTravel) {
        const j = spec.style === "particles" ? jitterNormal(tangent, id) : [];
        markers.push({ id, distance: toPath(d), position: j.length ? at.position.map((v, i) => v + j[i]) : at.position, tangent, opacity: Math.max(0, edge(d)) });
      }
    }
  }
  return { ...base, markers, segments, diagnostics };
}
