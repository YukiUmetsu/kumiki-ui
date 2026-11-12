/** Panels: two to four scenes play at once, side by side or in a grid, as one `"recipeId": "panels"` scene.
 *
 * Practice (doc 34, T9): split screen is the classic before/after and two-worlds device. Nike's *You Can't Stop Us* matched 72 archive
 * clips into 36 split-screen pairs by eye, so one movement carries across the split line. Kumiki could compare two subjects in one
 * stage, but could not play two scenes at once.
 *
 * Each panel is an ordinary film scene (a card, a picture, a screen demo, a 3D shot) compiled at the panel's own size, so it reflows for
 * its box rather than being squeezed. `align` lines up the panels in time: each panel's named moment lands on the same frame of the
 * panels scene, so a turn of the head in one panel answers a turn in the next. The split opens from the centre line outward.
 */
import type { Rect } from "../motion/types";

export type PanelsLayout = "columns" | "rows" | "grid";
export interface FilmPanelsContent<Scene = unknown> {
  /** `columns` sit side by side (stacked in a vertical output), `rows` sit one above the other (side by side in a vertical output),
   * `grid` is two by two. @default "columns" */
  layout?: PanelsLayout;
  /** Two to four scenes, each with its own recipe and content. They take the panels scene's length (plus any lead `align` needs). */
  panels: readonly Scene[];
  /** Line each panel up so its moment `align.moments[i]` lands on frame `align.frame` of the panels scene: a panel whose moment comes
   * later plays ahead, one whose moment comes sooner waits on its first frame. `null` leaves a panel as it is. */
  align?: { frame: number; moments: readonly (string | null)[] };
  /** Frames the split takes to open from the centre line. @default 12 */
  openFrames?: number;
  /** The line between panels. @default a near-black */
  line?: string;
  /** Says what the viewer sees, for people who cannot. */
  label: string;
}
/** A panel's place and what it plays: `film` is the panel compiled at its box's size, played `lead` frames ahead (or, if negative, held on
 * its first frame that long). */
export interface PanelsPlan<Film = unknown> {
  boxes: readonly Rect[];
  films: readonly Film[];
  leads: readonly number[];
  openFrames: number;
  line: string;
  gap: number;
  label: string;
  /** The frame of the panels scene where each panel's aligned moment lands, if any. */
  cues: ReadonlyArray<{ id: string; frame: number }>;
}
export interface PanelsProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const COLOR = /^#[0-9a-f]{6}$/i;

/** Panel boxes for a layout in an output, with `gap` pixels of line between them. A vertical output turns columns into rows. */
export function panelBoxes(layout: PanelsLayout, count: number, width: number, height: number, gap: number): Rect[] {
  const vertical = height > width, across = layout === "grid" ? 2 : (layout === "columns") !== vertical ? count : 1;
  const down = layout === "grid" ? Math.ceil(count / 2) : across === 1 ? count : 1;
  const w = (width - gap * (across - 1)) / across, h = (height - gap * (down - 1)) / down;
  return Array.from({ length: count }, (_, i) => ({ x: (i % across) * (w + gap), y: Math.floor(i / across) * (h + gap), width: w, height: h }));
}

/** How far each panel has opened at a frame of the panels scene: a clip inset that grows from the edge it shares with the frame's centre,
 * so the split opens from the middle outward. 1 is fully open. */
export function panelOpen(frame: number, openFrames: number, index: number, reducedMotion = false): number {
  if (reducedMotion || openFrames <= 0) return 1;
  const t = Math.min(1, Math.max(0, (frame - index * 2) / openFrames));
  return 1 - (1 - t) ** 3;
}
/** A CSS clip-path inset for a panel `open` of the way. A panel opens from the edge it turns toward the frame's centre, so the split
 * opens from the middle outward: a left panel grows leftward from the centre line, a top panel upward, a middle one both ways. */
export function panelClip(box: Rect, open: number, width: number, height: number): string {
  if (open >= 1) return "none";
  const hidden = 1 - open, side = (start: number, extent: number, size: number) =>
    extent >= size - 1 ? "whole" : start + extent / 2 < size / 2 - 1 ? "before" : start + extent / 2 > size / 2 + 1 ? "after" : "middle";
  const across = side(box.x, box.width, width), down = side(box.y, box.height, height);
  const near = (where: string, edge: "before" | "after", size: number) => where === edge ? hidden * size : where === "middle" ? hidden * size / 2 : 0;
  const px = (value: number) => `${value.toFixed(1)}px`;
  return `inset(${px(near(down, "before", box.height))} ${px(near(across, "after", box.width))} ${px(near(down, "after", box.height))} ${px(near(across, "before", box.width))})`;
}

/** Compiles a panels scene. `compile` compiles one scene at a given size (the film compiler, passed in to keep this module free of it)
 * and returns its film and the frames of its moments, or its diagnostics. */
export function compilePanels<Scene extends { id?: string; recipeId: string; durationFrames: number }, Film>(
  content: FilmPanelsContent<Scene>, durationFrames: number, size: { width: number; height: number; short: number },
  compile: (scene: Scene, width: number, height: number) => { film?: Film; cues: Record<string, number>; problems: readonly PanelsProblem[] },
): { plan?: PanelsPlan<Film>; problems: PanelsProblem[] } {
  const problems: PanelsProblem[] = [], say = (severity: PanelsProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const layout = content.layout ?? "columns", panels = content.panels ?? [], openFrames = content.openFrames ?? 12, line = content.line ?? "#0b0e12";
  if (!["columns", "rows", "grid"].includes(layout)) say("error", "panels-layout", "/layout", `"${layout}" is not a layout.`, "Layouts: columns, rows, grid.");
  if (panels.length < 2 || panels.length > 4) say("error", "panels-count", "/panels", "A panels scene has 2 to 4 panels.");
  if (!content.label?.trim()) say("error", "panels-label", "/label", "Panels need a text alternative.", "Say what each panel shows.");
  if (!COLOR.test(line)) say("error", "panels-line", "/line", "The line's colour is a #rrggbb colour.");
  if (!(Number.isSafeInteger(openFrames) && openFrames >= 0 && openFrames <= durationFrames)) say("error", "panels-open", "/openFrames", "The split opens over 0 frames or more, inside the scene.");
  panels.forEach((panel, i) => { if (panel.recipeId === "panels") say("error", "panels-nested", `/panels/${i}`, "A panel cannot hold panels."); });
  if (problems.some(item => item.severity === "error")) return { problems };
  const gap = Math.max(2, Math.round(size.short * .006)), boxes = panelBoxes(layout, panels.length, size.width, size.height, gap);
  if (Math.min(boxes[0].width, boxes[0].height) < size.short * .32) say("warning", "panels-small", "/panels", "Each panel's short side is under a third of the frame's, so its words will be small.", "Use fewer panels, or columns instead of a grid in a vertical output.");
  // Align: each panel plays ahead by however much puts its moment on the shared frame.
  // A film is encoded at even sizes; the panel shows its compiled film centred in the box, the odd pixel clipped.
  const even = (value: number) => Math.max(2, Math.ceil(value / 2) * 2);
  const compiledPanels = panels.map((panel, i) => compile({ ...panel, id: panel.id ?? `panel-${i + 1}` }, even(boxes[i].width), even(boxes[i].height)));
  compiledPanels.forEach((result, i) => result.problems.forEach(item => problems.push({ ...item, path: `/panels/${i}${item.path}` })));
  if (problems.some(item => item.severity === "error")) return { problems };
  const leads = panels.map((_, i) => {
    const moment = content.align?.moments[i];
    if (!content.align || !moment) return 0;
    const at = compiledPanels[i].cues[moment];
    if (at === undefined) { say("error", "panels-align", `/align/moments/${i}`, `"${moment}" is not a moment of panel ${i + 1}.`, `Moments there: ${Object.keys(compiledPanels[i].cues).join(", ")}.`); return 0; }
    // A positive lead plays the panel ahead; a negative one holds its first frame until its moment is due.
    return at - content.align.frame;
  });
  panels.forEach((panel, i) => {
    const need = durationFrames + Math.max(0, leads[i]);
    if (panel.durationFrames < need) say("error", "panels-length", `/panels/${i}/durationFrames`, `Panel ${i + 1} runs ${panel.durationFrames} frames; with its lead of ${leads[i]} it needs ${need}.`);
  });
  if (problems.some(item => item.severity === "error")) return { problems };
  const cues = content.align ? [{ id: "aligned", frame: content.align.frame }] : [];
  return { plan: { boxes, films: compiledPanels.map(result => result.film!), leads, openFrames, line, gap, label: content.label, cues }, problems };
}

/** The frame a panel shows at a frame of the panels scene. */
export const panelFrame = (frame: number, lead: number, durationFrames: number) => Math.min(durationFrames - 1, Math.max(0, frame + lead));
