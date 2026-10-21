/** R01 `InspectThenQuantify` — overview → focus → reveal → annotate → linked chart.
 *
 * A composition recipe over existing parts, not a new timeline:
 * - the camera is the HeroView the viewer already understands (orbit angles, zoom, target);
 * - the reveal is an asset action (e.g. a house's `roof-peel`), driven by its local frame;
 * - the annotation is anchored to the focused part;
 * - the chart is any economic chart, driven by its own reveal frame.
 *
 * {@link compileInspectThenQuantify} lays out beats with explicit holds. Holds
 * shorter than `minHold` are reported (`hold-short`). A target outside the
 * subject, or a missing chart, is an error. With the asset's authored bounds, it
 * also checks that the focus target projects inside the scene area at the
 * focus beat (`target-offscreen`). {@link evaluateInspectThenQuantify} is pure
 * per frame and ends in an explicit final state (`chart`).
 */
import { fitHeroCamera } from "../craft/hero-viewer";
import type { HeroView } from "../craft/hero-viewer";

type Box = { min: readonly number[]; max: readonly number[] };
export type ITQBeat = "overview" | "focus" | "reveal" | "annotate" | "transition" | "quantify";

export interface InspectThenQuantifySpec {
  id: string;
  /** The whole subject's authored bounds (asset units). */
  subject: Box;
  /** The part to inspect. */
  target: { id: string; label: string; bounds: Box };
  overview?: { azimuth: number; elevation: number };
  focus?: { azimuth: number; elevation: number; /** @default fitted to the target */ zoom?: number };
  /** Asset action that reveals the inside (played during the reveal beat). */
  reveal?: { action: string; frames: number };
  annotation?: { text: string; /** Asset-space point; default the target's top center. */ anchor?: readonly [number, number, number] };
  chart: { title: string; /** Frames the chart's own reveal takes. */ revealFrames: number };
  /** Beat lengths in frames. */
  timing?: Partial<Record<ITQBeat, number>>;
  /** Minimum readable hold for labeled beats. @default 24 */
  minHold?: number;
  /** Output aspect, which decides how the chart enters. @default "16:9" */
  aspect?: "16:9" | "9:16";
}

export interface ITQPlan {
  spec: InspectThenQuantifySpec;
  beats: { beat: ITQBeat; start: number; end: number; label: string }[];
  durationFrames: number;
  overviewView: HeroView;
  focusView: HeroView;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string }[];
}

export interface ITQFrame {
  beat: ITQBeat;
  /** Progress within the current beat, 0–1. */
  progress: number;
  label: string;
  /** Camera for the viewer this frame. */
  view: HeroView;
  /** Reveal action state (null before the reveal beat). */
  action: { id: string; frame: number } | null;
  annotationOpacity: number;
  /** Normalized stage rects (0–1): where the 3D scene and the chart sit. */
  scene: { x: number; y: number; scale: number };
  chart: { x: number; y: number; width: number; height: number; opacity: number };
  /** Frame to pass to the chart (its own reveal clock). */
  chartFrame: number;
  final: boolean;
}

const center = (b: Box) => [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2) as [number, number, number];
const radius = (b: Box) => Math.hypot(...[0, 1, 2].map((k) => b.max[k] - b.min[k])) / 2;
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Project a point with the viewer's own camera fit; returns NDC (−1..1) or null behind the camera. */
export function projectWithHeroView(subject: Box, view: HeroView, aspect: number, p: readonly number[]): [number, number] | null {
  const pose = fitHeroCamera({ bounds: { min: subject.min as [number, number, number], max: subject.max as [number, number, number] } }, view, aspect);
  const f = [0, 1, 2].map((k) => pose.target[k] - pose.position[k]), fl = Math.hypot(...f), fw = f.map((x) => x / fl);
  const right = [fw[1] * 0 - fw[2] * 1, fw[2] * 0 - fw[0] * 0, fw[0] * 1 - fw[1] * 0], rl = Math.hypot(...right) || 1, r = right.map((x) => x / rl);
  const up = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  const d = [0, 1, 2].map((k) => p[k] - pose.position[k]), z = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2];
  if (z <= 0) return null;
  const t = Math.tan((pose.fov * Math.PI) / 360);
  return [(d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z / (t * aspect), (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / z / t] as [number, number];
}

export function compileInspectThenQuantify(spec: InspectThenQuantifySpec): ITQPlan {
  const diagnostics: ITQPlan["diagnostics"] = [];
  const minHold = spec.minHold ?? 24;
  const t = { overview: 36, focus: 40, reveal: spec.reveal?.frames ?? 0, annotate: 48, transition: 30, quantify: Math.max(spec.chart.revealFrames + 30, 60), ...spec.timing };
  const outside = [0, 1, 2].some((k) => spec.target.bounds.min[k] < spec.subject.min[k] - 1e-6 || spec.target.bounds.max[k] > spec.subject.max[k] + 1e-6);
  if (outside) diagnostics.push({ code: "target-outside-subject", severity: "error", message: `Target "${spec.target.id}" extends beyond the subject bounds; the camera cannot frame it from the overview.` });
  if (!spec.chart.title.trim()) diagnostics.push({ code: "chart-missing", severity: "error", message: "InspectThenQuantify needs a linked chart." });
  const order: ITQBeat[] = ["overview", "focus", ...(spec.reveal ? ["reveal" as const] : []), ...(spec.annotation ? ["annotate" as const] : []), "transition", "quantify"];
  const labels: Record<ITQBeat, string> = { overview: "Whole object", focus: `Focus: ${spec.target.label}`, reveal: "Reveal inside", annotate: spec.annotation?.text ?? "", transition: "To the numbers", quantify: spec.chart.title };
  let cursor = 0;
  const beats = order.map((beat) => { const len = Math.max(1, Math.round(t[beat])), b = { beat, start: cursor, end: cursor + len, label: labels[beat] }; cursor += len; return b; });
  for (const b of beats) if ((b.beat === "overview" || b.beat === "annotate" || b.beat === "quantify") && b.end - b.start < minHold) diagnostics.push({ code: "hold-short", severity: "warning", message: `The ${b.beat} beat holds ${b.end - b.start} frames; under the ${minHold}-frame minimum for a labeled hold.` });
  const sr = radius(spec.subject), tr = Math.max(1e-3, radius(spec.target.bounds));
  const overviewView: HeroView = { azimuth: spec.overview?.azimuth ?? 28, elevation: spec.overview?.elevation ?? 16, zoom: 1, target: center(spec.subject) };
  const focusView: HeroView = { azimuth: spec.focus?.azimuth ?? overviewView.azimuth, elevation: spec.focus?.elevation ?? overviewView.elevation, zoom: spec.focus?.zoom ?? Math.min(8, (sr / tr) * 0.75), target: center(spec.target.bounds) };
  // Visibility of the target at the focus beat, using the viewer's own camera fit (16:9 or 9:16 canvas).
  const aspect = (spec.aspect ?? "16:9") === "16:9" ? 16 / 9 : 9 / 16;
  const tb = spec.target.bounds, corners: number[][] = [];
  for (const x of [tb.min[0], tb.max[0]]) for (const y of [tb.min[1], tb.max[1]]) for (const z of [tb.min[2], tb.max[2]]) corners.push([x, y, z]);
  const ndc = corners.map((c) => projectWithHeroView(spec.subject, focusView, aspect, c));
  const inside = ndc.filter((q) => q && Math.abs(q[0]) <= 1 && Math.abs(q[1]) <= 1).length;
  if (inside < corners.length) diagnostics.push({ code: "target-offscreen", severity: inside === 0 ? "error" : "warning", message: `At the focus beat ${corners.length - inside} of ${corners.length} target corners fall outside the frame; lower the focus zoom.` });
  return { spec, beats, durationFrames: cursor, overviewView, focusView, diagnostics };
}

const lerpView = (a: HeroView, b: HeroView, k: number): HeroView => ({
  azimuth: (a.azimuth ?? 0) + ((b.azimuth ?? 0) - (a.azimuth ?? 0)) * k,
  elevation: (a.elevation ?? 0) + ((b.elevation ?? 0) - (a.elevation ?? 0)) * k,
  zoom: (a.zoom ?? 1) * ((b.zoom ?? 1) / (a.zoom ?? 1)) ** k,
  target: [0, 1, 2].map((i) => (a.target?.[i] ?? 0) + ((b.target?.[i] ?? 0) - (a.target?.[i] ?? 0)) * k) as [number, number, number],
});

/** The composition at an absolute frame. Pure. */
export function evaluateInspectThenQuantify(plan: ITQPlan, frame: number): ITQFrame {
  const b = plan.beats.find((x) => frame < x.end) ?? plan.beats[plan.beats.length - 1];
  const progress = Math.max(0, Math.min(1, (frame - b.start) / Math.max(1, b.end - b.start)));
  const idx = (beat: ITQBeat) => plan.beats.find((x) => x.beat === beat);
  const focusB = idx("focus")!, revealB = idx("reveal"), transB = idx("transition")!, quantB = idx("quantify")!;
  const push = ease((frame - focusB.start) / Math.max(1, focusB.end - focusB.start));
  const view = lerpView(plan.overviewView, plan.focusView, push);
  const action = plan.spec.reveal && revealB && frame >= revealB.start ? { id: plan.spec.reveal.action, frame: Math.min(frame, revealB.end) - revealB.start } : null;
  const annB = idx("annotate");
  const annotationOpacity = annB ? ease((frame - annB.start) / 12) * (1 - ease((frame - transB.end + 6) / 10)) : 0;
  const k = ease((frame - transB.start) / Math.max(1, transB.end - transB.start));
  const portrait = (plan.spec.aspect ?? "16:9") === "9:16";
  // The scene shrinks toward the left (landscape) or top (portrait); the chart takes the rest.
  const scale = 1 - 0.44 * k;
  const scene = portrait ? { x: (1 - scale) / 2, y: 0.02 * k, scale } : { x: 0.02 * k, y: (1 - scale) / 2, scale };
  const chart = portrait ? { x: 0.04, y: scale + 0.02, width: 0.92, height: 1 - scale - 0.04, opacity: k } : { x: scale + 0.02, y: 0.08, width: 1 - scale - 0.04, height: 0.84, opacity: k };
  return { beat: b.beat, progress, label: b.label, view, action, annotationOpacity, scene, chart, chartFrame: Math.max(0, frame - quantB.start), final: frame >= quantB.end - 1 };
}
