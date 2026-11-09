/** Annotated footage: the video-essay move on a picture. The picture drifts while it registers, then for each mark the camera stops,
 * pushes in on a detail (or stays wide), and a pen draws on it (a circle, an arrow, an underline or a span) with a few words beside
 * it. The rest of the frame dims, so the eye goes where the mark is. One picture, one thesis, a few marks.
 *
 * Research (doc 32, P2, and §5, §13): signalling, cues that direct attention to the relevant part of a picture, improves learning
 * (meta-analyses, grade A); video essays use the freeze-and-draw move to build an argument on footage (grade C, practice).
 *
 * Pure functions of the frame: the plan holds the timing, `annotateFrame` the camera and the marks at one frame for one output size.
 */
import type { ImageAsset } from "./scene-templates";
import { readingSeconds, readingWords } from "./film-cards";

export type AnnotateMarkKind = "circle" | "arrow" | "underline" | "span";
export type AnnotateSide = "left" | "right" | "above" | "below";
export interface AnnotateRegion { x: number; y: number; width: number; height: number }
export interface AnnotateMark {
  id: string;
  kind: AnnotateMarkKind;
  /** The detail, as fractions of the picture. */
  region: AnnotateRegion;
  /** What the mark says: a few words. */
  note: string;
  /** The scene frame the pen starts to draw. The camera arrives just before it. */
  at: number;
  /** `push`: the camera moves in until the detail fills about a third of the frame. `wide`: the whole picture.
   * @default push, but wide for a span */
  view?: "push" | "wide";
  /** Where the note sits, and an arrow comes from. @default the side with the most room */
  side?: AnnotateSide;
}
export interface AnnotateContent {
  image: ImageAsset & { width: number; height: number };
  /** What the scene shows, for a screen reader. */
  label: string;
  /** The thesis, set over the picture while it registers, before the first mark. */
  title?: string;
  marks: readonly AnnotateMark[];
  /** The pen's colour. @default a warm red-orange that holds on sky, rock and water */
  color?: string;
}
export interface AnnotateProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
export interface PlannedMark extends AnnotateMark {
  view: "push" | "wide";
  /** The camera starts towards this mark's view; the pen draws from `at` to `drawn`; the note arrives at `noteIn`; `out` is when the
   * camera leaves for the next mark and this one fades (none for the last). */
  moveStart: number; drawn: number; noteIn: number; out?: number;
}
export interface AnnotatePlan { content: AnnotateContent; durationFrames: number; fps: number; marks: readonly PlannedMark[]; title?: { start: number; end: number } }

/** Frames for the camera's move to a mark, the pen's stroke, the note's arrival and a mark's exit, at a frame rate. */
export const annotateTiming = (fps: number) => ({ move: Math.round(fps * .8), draw: Math.round(fps * .55), note: Math.round(fps * .33), out: Math.round(fps * .33) });

export function compileAnnotate(content: AnnotateContent, durationFrames: number, fps = 30): { plan?: AnnotatePlan; problems: AnnotateProblem[] } {
  const problems: AnnotateProblem[] = [], say = (severity: AnnotateProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const { image, marks } = content, T = annotateTiming(fps);
  if (!image?.src || !(image.width > 0) || !(image.height > 0)) say("error", "annotate-image", "/image", "An annotated picture needs its source and its width and height in pixels.");
  else if (!image.licenseRef) say("warning", "annotate-licence", "/image/licenseRef", "The picture names no rights record.", "Set `licenseRef` to its entry in the asset manifest.");
  if (!marks?.length) { say("error", "annotate-marks", "/marks", "A picture to annotate needs at least one mark."); return { problems }; }
  if (marks.length > 4) say("warning", "annotate-crowded", "/marks", `${marks.length} marks on one picture: past four it stops being an argument and becomes a diagram.`, "Keep the marks that prove the thesis; split the rest into another scene.");
  const ids = new Set<string>();
  marks.forEach((mark, i) => {
    const at = `/marks/${i}`, r = mark.region;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/.test(mark.id ?? "") || ids.has(mark.id)) say("error", "annotate-id", at + "/id", "Each mark needs a plain, unique ID.");
    ids.add(mark.id);
    if (!["circle", "arrow", "underline", "span"].includes(mark.kind)) say("error", "annotate-kind", at + "/kind", `"${mark.kind}" is not a mark.`, "Marks: circle, arrow, underline, span.");
    if (!(r && r.width > 0 && r.height > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= 1.0001 && r.y + r.height <= 1.0001)) say("error", "annotate-region", at + "/region", "A region is a box inside the picture, as fractions from 0 to 1.");
    if (!mark.note?.trim()) say("error", "annotate-note", at + "/note", "A mark needs its note: the few words that say what it shows.");
    else if (readingWords(mark.note) > 8) say("warning", "annotate-note-long", at + "/note", "A note over eight words competes with the picture.", "Say the rest in the voice-over or the next scene.");
    if (!(Number.isSafeInteger(mark.at) && mark.at >= 0 && mark.at < durationFrames) || (i > 0 && mark.at <= marks[i - 1].at)) say("error", "annotate-order", at + "/at", "Marks draw inside the scene, one after another.");
  });
  if (problems.some(item => item.severity === "error")) return { problems };
  const planned: PlannedMark[] = marks.map(mark => {
    const view = mark.view ?? (mark.kind === "span" ? "wide" : "push");
    return { ...mark, view, moveStart: Math.max(0, mark.at - T.move), drawn: mark.at + T.draw, noteIn: mark.at + T.draw - 2 };
  });
  planned.forEach((mark, i) => { if (planned[i + 1]) mark.out = planned[i + 1].moveStart; });
  // The viewer needs to see the picture before it is marked, and to read each note before the camera leaves it.
  const first = planned[0], title = content.title ? { start: 6, end: first.moveStart - 4 } : undefined;
  if (title && (title.end - title.start) / fps < readingSeconds(content.title!)) say("warning", "annotate-title-short", "/title", `The thesis is on screen for ${((title.end - title.start) / fps).toFixed(1)} s before the first mark; it needs about ${readingSeconds(content.title!).toFixed(1)} s.`, "Start the first mark later.");
  if (!title && first.moveStart < fps * .8) say("warning", "annotate-first-early", "/marks/0/at", "The first mark starts before the picture has registered.", "Give the picture about a second first.");
  planned.forEach((mark, i) => {
    const next = planned[i + 1], need = readingSeconds(mark.note);
    if (next && (next.moveStart - mark.noteIn) / fps < need) say("warning", "annotate-rushed", `/marks/${i + 1}/at`, `"${mark.note}" is on screen for ${((next.moveStart - mark.noteIn) / fps).toFixed(1)} s before the camera leaves; it needs about ${need.toFixed(1)} s.`, `Start "${next.id}" at frame ${Math.ceil(mark.noteIn + need * fps + T.move)} or later.`);
    if (!next && (durationFrames - mark.noteIn) / fps < need + .4) say("error", "annotate-short", "", `The last note needs about ${(need + .4).toFixed(1)} s, and the scene ends ${((durationFrames - mark.noteIn) / fps).toFixed(1)} s after it arrives.`, `Lengthen the scene to ${Math.ceil(mark.noteIn + (need + .4) * fps)} frames.`);
  });
  return { plan: { content, durationFrames, fps, marks: planned, title }, problems };
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoother = (t: number) => { const x = clamp(t); return x * x * x * (x * (x * 6 - 15) + 10); };
export interface AnnotateView { zoom: number; cx: number; cy: number }
/** The camera for a mark: the detail centred at about a third of the frame (a push), or the picture at its cover fit (wide), aimed at
 * the detail as far as the picture allows, so a narrow output still holds it. Kept inside the picture, so no edge shows. Centre in
 * picture pixels; zoom over the picture's cover fit. */
export function markView(content: AnnotateContent, mark: Pick<PlannedMark, "region" | "view">, width: number, height: number): AnnotateView {
  const { width: iw, height: ih } = content.image, cover = Math.max(width / iw, height / ih), r = mark.region;
  const zoom = mark.view === "wide" ? 1 : clamp(Math.min(width * .34 / (r.width * iw * cover), height * .34 / (r.height * ih * cover)), 1, 2.6);
  const hw = width / (2 * cover * zoom), hh = height / (2 * cover * zoom);
  return { zoom, cx: clamp((r.x + r.width / 2) * iw, hw, iw - hw), cy: clamp((r.y + r.height / 2) * ih, hh, ih - hh) };
}
/** All the marks' details together, so the opening frames what the scene is about. */
function marksRegion(marks: readonly Pick<PlannedMark, "region">[]): AnnotateRegion {
  const x0 = Math.min(...marks.map(m => m.region.x)), y0 = Math.min(...marks.map(m => m.region.y));
  const x1 = Math.max(...marks.map(m => m.region.x + m.region.width)), y1 = Math.max(...marks.map(m => m.region.y + m.region.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
export interface AnnotateMarkState { mark: PlannedMark; draw: number; note: number; opacity: number; dim: number }
/** The picture's camera and each visible mark at one frame. Before the first mark the picture drifts a few percent; once a mark is
 * being drawn the camera is still, the freeze of the video essay. Reduced motion cuts between views and draws each mark whole. */
export function annotateFrame(plan: AnnotatePlan, frame: number, width: number, height: number, reducedMotion = false) {
  const { content, marks } = plan, T = annotateTiming(plan.fps), { width: iw, height: ih } = content.image;
  // The opening is aimed at the marks' details and drifts in a few percent while the picture registers.
  const first = marks[0], aim = markView(content, { region: marksRegion(marks), view: "wide" }, width, height);
  const opening = { ...aim, zoom: 1 + .035 * smoother(frame / Math.max(1, first.moveStart)) };
  let view: AnnotateView = reducedMotion ? aim : opening;
  let from: AnnotateView = { ...aim, zoom: 1.035 };
  for (const mark of marks) {
    if (frame < mark.moveStart) break;
    const to = markView(content, mark, width, height), t = reducedMotion ? 1 : smoother((frame - mark.moveStart) / Math.max(1, mark.at - mark.moveStart));
    // Zoom moves in log space, so a push and a pull feel the same speed.
    view = { zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * t), cx: from.cx + (to.cx - from.cx) * t, cy: from.cy + (to.cy - from.cy) * t };
    from = to;
  }
  const states: AnnotateMarkState[] = marks.filter(mark => frame >= mark.at && (mark.out === undefined || frame < mark.out + T.out)).map(mark => {
    const leaving = mark.out === undefined ? 1 : 1 - clamp((frame - mark.out) / T.out);
    const draw = reducedMotion ? 1 : clamp((frame - mark.at) / T.draw), note = reducedMotion ? 1 : smoother((frame - mark.noteIn) / T.note);
    return { mark, draw, note: note * leaving, opacity: leaving, dim: smoother((frame - mark.at + 6) / 12) * leaving };
  });
  const titleOpacity = plan.title ? clamp(Math.min((frame - plan.title.start) / 10, (plan.title.end - frame) / 8)) : 0;
  return { view, cover: Math.max(width / iw, height / ih), marks: states, title: titleOpacity };
}
