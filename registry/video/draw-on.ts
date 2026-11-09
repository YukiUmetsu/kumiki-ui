/** Draw-on: line art that draws itself, stroke by stroke, with the pen's tip on the end of the line. A closed shape's wash blooms once it
 * is drawn, and a label lands when its stroke is done. The camera is locked; the drawing is the motion.
 *
 * Research (doc 32, P3, §9): hand-drawn explainers hold attention by showing a thing being made, one part at a time (grade C, practice);
 * one part per beat is the same staging rule as the chart morph's.
 *
 * Strokes are authored as points on a canvas of the author's size and smoothed through them (Catmull-Rom), so the pen's place along a
 * stroke is plain arithmetic: no DOM measuring, the same on every render. Pure functions of the frame.
 */
import { readingSeconds, readingWords } from "./film-cards";

export type DrawPoint = readonly [number, number];
export interface DrawStroke {
  id: string;
  /** Points on the canvas the line passes through, in order. */
  points: readonly DrawPoint[];
  /** A closed outline joins its last point to its first. */
  closed?: boolean;
  /** Corners instead of a smooth curve through the points: for straight edges, arrows and ruled lines. */
  corners?: boolean;
  /** The scene frame the pen starts this stroke, and how long it takes. @default frames: from its length at a hand's pace */
  at: number;
  frames?: number;
  /** A watercolour wash inside a closed outline, which blooms once the outline is drawn. */
  fill?: string;
  /** The ink. @default the drawing's ink */
  color?: string;
  /** Line weight in canvas units. @default the drawing's weight */
  weight?: number;
  /** Dashed, for an edge that is not there yet (a line of collapse, a path to come). */
  dashed?: boolean;
  /** A few words that land beside the stroke when it is done, at a point on the canvas. */
  label?: { text: string; at: DrawPoint; align?: "start" | "middle" | "end" };
}
export interface DrawOnContent {
  /** What the drawing shows, for a screen reader. */
  label: string;
  /** The author's canvas, in any units; the strokes' points use them. It is fitted into the output's safe area. */
  canvas: { width: number; height: number };
  strokes: readonly DrawStroke[];
  /** A heading over the drawing. */
  title?: string;
  /** `paper`: dark ink on warm paper. `board`: chalk-white on a dark board. @default "paper" */
  surface?: "paper" | "board";
  /** @default the surface's ink */
  ink?: string;
  /** @default 1/220 of the canvas's larger side */
  weight?: number;
}
export interface DrawProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
export interface PlannedStroke extends DrawStroke { frames: number; length: number; path: string; samples: readonly DrawPoint[]; lengths: readonly number[] }
export interface DrawOnPlan { content: DrawOnContent; durationFrames: number; fps: number; strokes: readonly PlannedStroke[] }

/** A hand draws a line at about a third of the canvas a second, and never a stroke in under a third of a second. */
const PACE = .34, MIN_SECONDS = .33, SAMPLES = 16;

/** Smooth points into cubic Bézier segments (Catmull-Rom through every point), or keep the corners. */
function segments(stroke: Pick<DrawStroke, "points" | "closed" | "corners">): Array<[DrawPoint, DrawPoint, DrawPoint, DrawPoint]> {
  const pts = stroke.points, n = pts.length, closed = Boolean(stroke.closed), out: Array<[DrawPoint, DrawPoint, DrawPoint, DrawPoint]> = [];
  const count = closed ? n : n - 1, at = (i: number) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < count; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    if (stroke.corners) { out.push([p1, p1, p2, p2]); continue; }
    out.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
  }
  return out;
}
const bezier = (s: [DrawPoint, DrawPoint, DrawPoint, DrawPoint], t: number): DrawPoint => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
};
/** The stroke as an SVG path in canvas units, its length, and points along it with their running lengths, for the pen. */
export function strokeGeometry(stroke: Pick<DrawStroke, "points" | "closed" | "corners">) {
  const segs = segments(stroke), samples: DrawPoint[] = [stroke.points[0]], lengths = [0];
  for (const seg of segs) for (let k = 1; k <= SAMPLES; k++) {
    const p = bezier(seg, k / SAMPLES), q = samples[samples.length - 1];
    samples.push(p); lengths.push(lengths[lengths.length - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const f = (v: number) => +v.toFixed(2);
  const path = `M${f(stroke.points[0][0])},${f(stroke.points[0][1])}` + segs.map(s => `C${f(s[1][0])},${f(s[1][1])} ${f(s[2][0])},${f(s[2][1])} ${f(s[3][0])},${f(s[3][1])}`).join("") + (stroke.closed ? "Z" : "");
  return { path, samples, lengths, length: lengths[lengths.length - 1] };
}
/** The point a given share of the way along a stroke, by length. */
export function pointAlong(stroke: Pick<PlannedStroke, "samples" | "lengths" | "length">, share: number): DrawPoint {
  const target = Math.min(1, Math.max(0, share)) * stroke.length, ls = stroke.lengths;
  let lo = 0, hi = ls.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ls[mid] < target) lo = mid; else hi = mid; }
  const span = ls[hi] - ls[lo] || 1, t = (target - ls[lo]) / span, a = stroke.samples[lo], b = stroke.samples[hi];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export interface DrawSafeInset { left: number; right: number; top: number; bottom: number }
/** Where the drawing sits in an output: the type unit, the title's band, and the canvas fitted under it in the safe area. The renderer
 * and the checks share it, so what is checked is what is drawn. */
export function drawLayout(content: Pick<DrawOnContent, "canvas" | "title">, width: number, height: number, safeInset?: DrawSafeInset) {
  const vertical = height > width, u = Math.min(width, height) / 100 * (vertical ? 1.1 : 1);
  const left = width * Math.max(.06, (safeInset?.left ?? 0) + .015), right = width * (1 - Math.max(.06, (safeInset?.right ?? 0) + .015));
  const top = height * Math.max(.07, (safeInset?.top ?? 0) + .015), bottom = height * (1 - Math.max(.07, (safeInset?.bottom ?? 0) + .015));
  const titleH = content.title ? 6.4 * u : 0, area = { x: left, y: top + titleH, width: right - left, height: bottom - top - titleH };
  const scale = Math.min(area.width / content.canvas.width, area.height / content.canvas.height);
  return { u, safe: { left, right, top, bottom }, scale, x: area.x + (area.width - content.canvas.width * scale) / 2, y: area.y + (area.height - content.canvas.height * scale) / 2, labelFont: 3.2 * u };
}
/** Each label's box in an output, from the shared layout and an estimate of its width. */
export function labelBoxes(content: DrawOnContent, width: number, height: number, safeInset?: DrawSafeInset) {
  const layout = drawLayout(content, width, height, safeInset);
  return content.strokes.flatMap(stroke => {
    if (!stroke.label) return [];
    const w = stroke.label.text.length * layout.labelFont * .55, h = layout.labelFont * 1.2, align = stroke.label.align ?? "start";
    const x = layout.x + stroke.label.at[0] * layout.scale - (align === "start" ? 0 : align === "middle" ? w / 2 : w), y = layout.y + stroke.label.at[1] * layout.scale - h / 2;
    return [{ id: stroke.id, text: stroke.label.text, x, y, width: w, height: h }];
  });
}
/** Labels that would overlap one another or leave the safe area in an output of this size: a drawing made for a wide frame is small in a
 * tall one, and its labels are not. */
export function inspectDrawOnOutput(content: DrawOnContent, width: number, height: number, safeInset?: DrawSafeInset): DrawProblem[] {
  const boxes = labelBoxes(content, width, height, safeInset), { safe } = drawLayout(content, width, height, safeInset), problems: DrawProblem[] = [];
  boxes.forEach((a, i) => {
    const other = boxes.slice(i + 1).find(b => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height);
    if (other) problems.push({ severity: "warning", code: "draw-label-collision", path: `/strokes/${content.strokes.findIndex(s => s.id === a.id)}/label`, message: `In a ${width}×${height} frame, "${a.text}" overlaps "${other.text}".`, hint: "Move one label, or draw a version of the drawing for this frame's shape." });
    if (a.x < safe.left - 1 || a.x + a.width > safe.right + 1 || a.y < safe.top - 1 || a.y + a.height > safe.bottom + 1) problems.push({ severity: "warning", code: "draw-label-outside", path: `/strokes/${content.strokes.findIndex(s => s.id === a.id)}/label`, message: `In a ${width}×${height} frame, "${a.text}" runs outside the safe area.`, hint: "Move the label inward, or draw a version of the drawing for this frame's shape." });
  });
  return problems;
}

export function compileDrawOn(content: DrawOnContent, durationFrames: number, fps = 30): { plan?: DrawOnPlan; problems: DrawProblem[] } {
  const problems: DrawProblem[] = [], say = (severity: DrawProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const { canvas, strokes } = content;
  if (!(canvas?.width > 0 && canvas?.height > 0)) say("error", "draw-canvas", "/canvas", "A drawing needs its canvas's width and height.");
  if (!strokes?.length) say("error", "draw-strokes", "/strokes", "A drawing needs at least one stroke.");
  if (problems.length) return { problems };
  const ids = new Set<string>(), side = Math.max(canvas.width, canvas.height);
  strokes.forEach((stroke, i) => {
    const at = `/strokes/${i}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/.test(stroke.id ?? "") || ids.has(stroke.id)) say("error", "draw-id", at + "/id", "Each stroke needs a plain, unique ID.");
    ids.add(stroke.id);
    if (!(stroke.points?.length >= 2)) say("error", "draw-points", at + "/points", "A stroke passes through at least two points.");
    else if (stroke.points.some(([x, y]) => !(x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height))) say("error", "draw-points", at + "/points", "A stroke's points lie on the canvas.");
    if (stroke.fill && !stroke.closed) say("warning", "draw-fill-open", at + "/fill", "A wash fills a closed outline; this stroke is open.", "Set `closed`, or drop the fill.");
    if (!(Number.isSafeInteger(stroke.at) && stroke.at >= 0 && stroke.at < durationFrames)) say("error", "draw-order", at + "/at", "A stroke starts inside the scene.");
    if (stroke.label && readingWords(stroke.label.text) > 6) say("warning", "draw-label-long", at + "/label", "A label over six words is a caption; the drawing should say the rest.");
  });
  if (problems.some(item => item.severity === "error")) return { problems };
  const planned: PlannedStroke[] = strokes.map(stroke => {
    const geometry = strokeGeometry(stroke), natural = Math.max(MIN_SECONDS, geometry.length / side / PACE) * fps;
    return { ...stroke, ...geometry, frames: stroke.frames ?? Math.round(natural) };
  });
  planned.forEach((stroke, i) => {
    const at = `/strokes/${i}`, seconds = stroke.frames / fps;
    // A pen faster than a hand reads as a reveal, not a drawing.
    if (stroke.length / side / Math.max(1e-6, seconds) > PACE * 2.6) say("warning", "draw-fast", at + "/frames", `"${stroke.id}" draws ${(stroke.length / side / seconds).toFixed(1)} canvas-widths a second, faster than a hand.`, `Give it ${Math.ceil(stroke.length / side / (PACE * 2.6) * fps)} frames or more.`);
    if (stroke.at + stroke.frames > durationFrames) say("error", "draw-short", at, `"${stroke.id}" is still being drawn when the scene ends.`, `Lengthen the scene to ${stroke.at + stroke.frames + Math.round(fps)} frames.`);
    const prev = planned[i - 1];
    if (prev && stroke.at < prev.at + prev.frames) say("warning", "draw-overlap", at + "/at", `"${stroke.id}" starts before "${prev.id}" is drawn; one hand draws one line at a time.`, `Start it at frame ${prev.at + prev.frames} or later.`);
    if (prev && stroke.at < prev.at) say("error", "draw-order", at + "/at", "Strokes are drawn in the order they are listed.");
  });
  // Each label needs its reading time before the next label lands, or the scene ends.
  const labelled = planned.filter(stroke => stroke.label);
  labelled.forEach((stroke, k) => {
    const shown = stroke.at + stroke.frames, next = labelled[k + 1], until = next ? next.at + next.frames : durationFrames, need = readingSeconds(stroke.label!.text);
    if ((until - shown) / fps < need) say(next ? "warning" : "error", next ? "draw-rushed" : "draw-short", `/strokes/${planned.indexOf(stroke)}/label`,
      `"${stroke.label!.text}" has ${((until - shown) / fps).toFixed(1)} s before ${next ? "the next label lands" : "the scene ends"}; it needs about ${need.toFixed(1)} s.`);
  });
  return { plan: { content, durationFrames, fps, strokes: planned }, problems };
}

export interface DrawStrokeState { stroke: PlannedStroke; drawn: number; wash: number; label: number }
/** The drawing at one frame: how far each stroke is drawn, its wash and its label, and where the pen is (and whether it is down). Between
 * strokes the pen travels lifted to the next start; after the last it leaves. Reduced motion shows each stroke whole at its start. */
export function drawOnFrame(plan: DrawOnPlan, frame: number, reducedMotion = false) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v)), ease = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
  const strokes: DrawStrokeState[] = plan.strokes.filter(stroke => frame >= stroke.at).map(stroke => {
    const drawn = reducedMotion ? 1 : clamp((frame - stroke.at) / stroke.frames), done = stroke.at + stroke.frames;
    return { stroke, drawn, wash: stroke.fill ? (reducedMotion ? 1 : ease((frame - done) / (plan.fps * .7))) : 0, label: stroke.label ? (reducedMotion ? 1 : ease((frame - done) / (plan.fps * .35))) : 0 };
  });
  let pen: { at: DrawPoint; down: boolean; opacity: number } | undefined;
  if (!reducedMotion) {
    const active = plan.strokes.find(stroke => frame >= stroke.at && frame < stroke.at + stroke.frames);
    if (active) pen = { at: pointAlong(active, (frame - active.at) / active.frames), down: true, opacity: 1 };
    else {
      const next = plan.strokes.find(stroke => stroke.at > frame), last = [...plan.strokes].reverse().find(stroke => stroke.at + stroke.frames <= frame);
      const from = last ? pointAlong(last, 1) : next ? next.points[0] : undefined;
      if (next && from) {
        const leave = last ? last.at + last.frames : 0, t = ease((frame - leave) / Math.max(1, next.at - leave));
        pen = { at: [from[0] + (next.points[0][0] - from[0]) * t, from[1] + (next.points[0][1] - from[1]) * t], down: false, opacity: last ? 1 : clamp(frame / (plan.fps * .3)) };
      } else if (from) pen = { at: from, down: false, opacity: 1 - clamp((frame - (last!.at + last!.frames)) / (plan.fps * .5)) };
    }
  }
  return { strokes, pen };
}
