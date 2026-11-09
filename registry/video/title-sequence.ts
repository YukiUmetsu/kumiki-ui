/** Title sequence: a film's opening built on one symbol for its story, in cut paper. The pieces of the symbol arrive one at a time and
 * settle with a paper's shadow, animated on twos as stop motion is; then the title snaps in, word by word, into a place set into the
 * symbol, and the credits after it.
 *
 * Research (doc 32, P2, §10): Saul Bass condensed a film into one symbol and set its title into it; Kyle Cooper's titles work as a
 * metaphor for the story and were made by hand, on a tabletop (grade C, practice and criticism). The checks hold it to one symbol of a
 * few pieces, built before the title arrives, and give the title and each credit their reading time.
 *
 * Pure functions of the frame.
 */
import { readingSeconds, readingWords } from "./film-cards";

export type TitlePoint = readonly [number, number];
export interface TitleBox { x: number; y: number; width: number; height: number }
export interface TitleShape {
  id: string;
  /** The piece's outline on the canvas: a polygon. */
  points: readonly TitlePoint[];
  color: string;
  /** Where the piece comes from: slid in from an edge, or set down (it grows from a little smaller, as a piece dropped onto the table).
   * @default "down" */
  from?: "left" | "right" | "top" | "bottom" | "down";
  /** The scene frame it starts to arrive, and how long it takes. @default frames: 14 */
  at: number;
  frames?: number;
  /** How rough its cut edge is, 0 (a clean cut) to 1 (torn). @default 0.4 */
  rough?: number;
}
export interface TitleText { text: string; at: number; box: TitleBox; align?: "start" | "middle" | "end"; color?: string }
export interface TitleSequenceContent {
  /** What the sequence shows, for a screen reader. */
  label: string;
  canvas: { width: number; height: number };
  /** The paper the pieces are laid on. @default a warm cream */
  ground?: string;
  shapes: readonly TitleShape[];
  /** The title, set word by word into its box. */
  title: TitleText;
  /** Lines after the title: who made it, where its pictures come from. */
  credits?: readonly TitleText[];
  /** Frames per drawing: 2 is "on twos", the stop-motion cadence; 1 is smooth. @default 2 */
  cadence?: 1 | 2;
}
export interface TitleProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
export interface TitlePlan { content: TitleSequenceContent; durationFrames: number; fps: number; shapes: ReadonlyArray<TitleShape & { frames: number; edge: readonly TitlePoint[] }> }

const seedOf = (id: string) => { let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
/** A cut edge: each side of the polygon is split into short runs, each nudged across the side by a seeded amount, so the paper looks cut
 * by hand. The same piece is cut the same way on every render. */
export function cutEdge(shape: Pick<TitleShape, "id" | "points" | "rough">, canvas: { width: number; height: number }): TitlePoint[] {
  const rough = shape.rough ?? .4, amp = rough * Math.max(canvas.width, canvas.height) * .0028, step = Math.max(canvas.width, canvas.height) * .012;
  let seed = seedOf(shape.id) || 1;
  const rand = () => { seed = Math.imul(seed ^ seed >>> 15, 2246822507) ^ Math.imul(seed ^ seed >>> 13, 3266489909); return ((seed >>>= 0) % 10000) / 10000 - .5; };
  const out: TitlePoint[] = [], pts = shape.points;
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step)), nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
    for (let k = 0; k < n; k++) { const t = k / n, j = k === 0 ? 0 : rand() * amp * 2; out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]); }
  });
  return out;
}

export function compileTitleSequence(content: TitleSequenceContent, durationFrames: number, fps = 30): { plan?: TitlePlan; problems: TitleProblem[] } {
  const problems: TitleProblem[] = [], say = (severity: TitleProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const { canvas, shapes, title, credits = [] } = content;
  if (!(canvas?.width > 0 && canvas?.height > 0)) say("error", "title-canvas", "/canvas", "A title sequence needs its canvas's width and height.");
  if (!shapes?.length) say("error", "title-symbol", "/shapes", "A title sequence is built on a symbol: give it the pieces it is cut from.");
  if (!title?.text?.trim()) say("error", "title-text", "/title", "A title sequence needs its title.");
  if (problems.length) return { problems };
  const ids = new Set<string>(), inside = (p: TitlePoint) => p[0] >= 0 && p[1] >= 0 && p[0] <= canvas.width && p[1] <= canvas.height;
  shapes.forEach((shape, i) => {
    const at = `/shapes/${i}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/.test(shape.id ?? "") || ids.has(shape.id)) say("error", "title-id", at + "/id", "Each piece needs a plain, unique ID.");
    ids.add(shape.id);
    if (!(shape.points?.length >= 3) || !shape.points.every(inside)) say("error", "title-shape", at + "/points", "A piece is a polygon of three or more points on the canvas.");
    if (!(Number.isSafeInteger(shape.at) && shape.at >= 0 && shape.at < durationFrames)) say("error", "title-order", at + "/at", "A piece arrives inside the scene.");
  });
  for (const [path, line] of [["/title", title] as const, ...credits.map((item, i) => [`/credits/${i}`, item] as const)]) {
    const b = line.box;
    if (!(b && b.width > 0 && b.height > 0 && inside([b.x, b.y]) && inside([b.x + b.width, b.y + b.height]))) say("error", "title-box", path + "/box", "Text is set in a box on the canvas.");
    if (!(Number.isSafeInteger(line.at) && line.at >= 0 && line.at < durationFrames)) say("error", "title-order", path + "/at", "Text arrives inside the scene.");
  }
  if (problems.some(item => item.severity === "error")) return { problems };
  // One symbol, a few pieces: past a dozen it is a collage, not a symbol.
  if (shapes.length > 12) say("warning", "title-many-pieces", "/shapes", `${shapes.length} pieces: a symbol reads at a glance; past a dozen it becomes a picture.`, "Cut it down to the pieces that make the symbol.");
  if (readingWords(title.text) > 6) say("warning", "title-long", "/title/text", "A title over six words is a sentence; set it as a line in the film.");
  if (credits.length > 4) say("warning", "title-credits", "/credits", "More than four credit lines; the rest belong at the end.");
  const planned = shapes.map(shape => ({ ...shape, frames: shape.frames ?? 14, edge: cutEdge(shape, canvas) }));
  const built = Math.max(...planned.map(shape => shape.at + shape.frames));
  if (title.at < built) say("warning", "title-before-symbol", "/title/at", "The title arrives before its symbol is whole; the symbol says what the film is about, so let it land first.", `Bring the title in at frame ${built} or later.`);
  // Each line holds for its reading time before the next arrives, and the last before the scene ends.
  const lines = [title, ...credits].map((line, i) => ({ line, path: i ? `/credits/${i - 1}` : "/title" })).sort((a, b) => a.line.at - b.line.at);
  lines.forEach(({ line, path }, i) => {
    const words = line.text.split(/\s+/).filter(Boolean).length, landed = line.at + (words - 1) * 3, until = lines[i + 1]?.line.at ?? durationFrames, need = readingSeconds(line.text) + (i === lines.length - 1 ? .6 : 0);
    if ((until - landed) / fps < need) say(i === lines.length - 1 ? "error" : "warning", i === lines.length - 1 ? "title-short" : "title-rushed", path + "/at",
      `"${line.text}" is up for ${((until - landed) / fps).toFixed(1)} s before ${i === lines.length - 1 ? "the scene ends" : "the next line"}; it needs about ${need.toFixed(1)} s.`);
  });
  return { plan: { content, durationFrames, fps, shapes: planned }, problems };
}

/** Each piece's offset, turn and scale at one frame, and how many of each line's words are down. On twos, the frame is held for two. */
export function titleFrame(plan: TitlePlan, frame: number, reducedMotion = false) {
  const { content } = plan, f = reducedMotion ? frame : frame - (frame % (content.cadence ?? 2)), W = content.canvas.width, H = content.canvas.height;
  const out3 = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
  const pieces = plan.shapes.filter(shape => f >= shape.at || reducedMotion && frame >= shape.at).map(shape => {
    const t = reducedMotion ? 1 : (f - shape.at) / shape.frames, e = out3(t), from = shape.from ?? "down", rest = 1 - e;
    // A paper piece slides in and turns a few degrees as it goes, settling square; one set down grows from a little smaller.
    const dx = from === "left" ? -W * .6 * rest : from === "right" ? W * .6 * rest : 0, dy = from === "top" ? -H * .7 * rest : from === "bottom" ? H * .7 * rest : 0;
    const turn = from === "down" ? 0 : (seedOf(shape.id) % 2 ? 1 : -1) * 7 * rest, scale = from === "down" ? .86 + .14 * e : 1;
    return { shape, dx, dy, turn, scale, lifted: rest };
  });
  const words = (line: TitleText) => Math.max(0, Math.min(line.text.split(/\s+/).filter(Boolean).length, Math.floor((f - line.at) / 3) + 1));
  return { pieces, title: words(content.title), credits: (content.credits ?? []).map(words) };
}

export function titleCues(plan: TitlePlan): Array<{ id: string; frame: number }> {
  const built = Math.max(...plan.shapes.map(shape => shape.at + shape.frames));
  return [{ id: "symbol", frame: built }, { id: "title", frame: plan.content.title.at }, ...(plan.content.credits ?? []).map((credit, i) => ({ id: `credit-${i + 1}`, frame: credit.at }))];
}

export interface TitleSafeInset { left: number; right: number; top: number; bottom: number }
/** Where the canvas sits in an output (fitted whole into the frame, centred), and a line's font size: its box's height. Shared by the
 * renderer and the checks. */
export function titleLayout(content: Pick<TitleSequenceContent, "canvas">, width: number, height: number) {
  const scale = Math.min(width / content.canvas.width, height / content.canvas.height);
  return { scale, x: (width - content.canvas.width * scale) / 2, y: (height - content.canvas.height * scale) / 2 };
}
export const titleFont = (line: TitleText, scale: number, title: boolean) => line.box.height * scale * (title ? .78 : .7);
/** Lines that would leave the safe area, or not fit their box, in an output of this size. Widths are estimated from the type size. */
export function inspectTitleOutput(content: TitleSequenceContent, width: number, height: number, safeInset?: TitleSafeInset): TitleProblem[] {
  const { scale, x, y } = titleLayout(content, width, height), problems: TitleProblem[] = [];
  const safe = { left: width * (safeInset?.left ?? 0), right: width * (1 - (safeInset?.right ?? 0)), top: height * (safeInset?.top ?? 0), bottom: height * (1 - (safeInset?.bottom ?? 0)) };
  [content.title, ...content.credits ?? []].forEach((line, i) => {
    const path = i ? `/credits/${i - 1}` : "/title", font = titleFont(line, scale, !i), need = line.text.length * font * .58, box = { x: x + line.box.x * scale, y: y + line.box.y * scale, width: line.box.width * scale, height: line.box.height * scale };
    if (need > box.width * 1.04) problems.push({ severity: "warning", code: "title-overflow", path: path + "/box", message: `In a ${width}×${height} frame, "${line.text}" is about ${Math.round(need / box.width * 100)}% of its box's width.`, hint: "Widen the box, or lower it." });
    if (box.x < safe.left - 1 || box.x + box.width > safe.right + 1 || box.y < safe.top - 1 || box.y + box.height > safe.bottom + 1) problems.push({ severity: "warning", code: "title-outside", path: path + "/box", message: `In a ${width}×${height} frame, "${line.text}" runs outside the safe area.` });
  });
  return problems;
}
