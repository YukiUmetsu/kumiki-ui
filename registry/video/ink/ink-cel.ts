/**
 * INK-FILM1 cels: a painting in layers, so that it can move.
 *
 * A subject (a figure, a mountain, a plum branch) is a list of parts, back to front. `drawInkSubject` paints them on one sheet, as a
 * still; `paintInkCel` paints one part on its own, cropped, with what a compositor needs:
 *
 *   pixels  r, g, b  how much light the ink lets through (the cel is multiplied onto the paper, as ink is)
 *           a        how much of what lies under the cel it hides: a face before a mountain is paper, not mountain
 *   when    1–255 in the order the brush went, 0 where there is nothing: the picture can paint itself
 *
 * Everything is a pure function of its inputs; the same subject and scale give the same pixels.
 */
import { createInkRisoSheet, inkNoise2, inkRgb } from "../ink-riso-press";
import type { InkRisoPlateSpec, InkRisoSheet } from "../ink-riso-press";
import { createInkRisoPens } from "../ink-riso-pen";
import type { InkRisoPen, PenFrame } from "../ink-riso-pen";
import { paintInk } from "../ink-riso-wet";
import type { InkMotion } from "./ink-motion";

export type InkPoint = readonly [number, number];
/** What a part is painted with: the sheet, and pens on frames of the subject's own page. */
export interface InkPaintContext {
  sheet: InkRisoSheet;
  /** The page's own pen, 1 unit = 1 page unit. */
  page: InkRisoPen;
  /** Pens on local frames. */
  pens<T extends string>(frames: Readonly<Record<T, PenFrame>>): Record<T, InkRisoPen>;
  /** The pose being painted, for a part that has several. */
  pose: string;
}
export interface InkPart {
  id: string;
  draw(c: InkPaintContext): void;
  /** Page box the part stays in: x, y, width, height. Left out, the whole page is painted and cropped. */
  box?: readonly [number, number, number, number];
  /** Parts that share a group move together, with the subject's `groups` motion on top of their own. */
  group?: string;
  motion?: readonly InkMotion[];
  /** Several drawings of the same part (a wing up and down, an eye open and closed) and which one shows when. */
  poses?: InkPoses;
  /** Parallax relative to the subject's own depth, 0 = moves with it. */
  depth?: number;
  /** Only in the moving picture, or only in the still one. */
  only?: "still" | "film";
  /** What the cover is made of: the paper (default), or a body colour such as white for snow and petals. */
  body?: string;
  /** When the picture paints itself: the part's turn (default: its place, back to front), and how much its strokes come together (default 0.06; at 4 it comes up as a whole). */
  turn?: number; soft?: number;
}
export type InkPoses =
  /** A loop through poses; `blend` fades each into the next. */
  | { kind: "cycle"; order: readonly string[]; seconds: number; phase?: number; blend?: boolean }
  /** Lids: `open`, now and then through the others and back. */
  | { kind: "blink"; open: string; order: readonly string[]; every?: number; seconds?: number; seed?: number };
export interface InkSubject {
  id: string;
  /** What it shows, for a screen reader. */
  label: string;
  page: { width: number; height: number };
  plates: readonly InkRisoPlateSpec[];
  paper?: string;
  seed?: number;
  parts: readonly InkPart[];
  groups?: Readonly<Record<string, readonly InkMotion[]>>;
}
/** One painted part, cropped to its ink. Places are page units. */
export interface InkCel { key: string; x: number; y: number; width: number; height: number; w: number; h: number; pixels: Uint8ClampedArray; when: Uint8Array; body?: string }

/** The order a hand would paint them in: the parts named, first to last, then the rest; `soft` ones come up as a whole, as a face must, or its eyes stay holes till the last mark. */
export const inkPaintOrder = (parts: readonly InkPart[], order: readonly string[], soft: readonly string[] = []): InkPart[] => parts.map((p, i) => { const k = order.indexOf(p.id); return { ...p, turn: k < 0 ? order.length + i : k, ...(soft.includes(p.id) ? { soft: 4 } : {}) }; });

const context = (sheet: InkRisoSheet, view: { x: number; y: number }, pose = ""): InkPaintContext => ({
  sheet, pose, page: createInkRisoPens(sheet, { page: { x: 0, y: 0, scale: 1 } }, view).page, pens: frames => createInkRisoPens(sheet, frames, view),
});
export const inkPosesOf = (part: InkPart): readonly string[] => (!part.poses ? [""] : [...new Set(part.poses.kind === "blink" ? [part.poses.open, ...part.poses.order] : part.poses.order)]);

/** Every part on one sheet, back to front: the still painting. `view` is the page box the sheet shows. */
export function drawInkSubject(sheet: InkRisoSheet, subject: InkSubject, view: { x: number; y: number } = { x: 0, y: 0 }): void {
  for (const part of subject.parts) if (part.only !== "film") part.draw(context(sheet, view, inkPosesOf(part)[0]));
}
/** The sheet a subject is painted on, for a still. */
export const inkSubjectSheet = (subject: InkSubject, scale: number, view?: { x: number; y: number; width: number; height: number }) => ({ width: view?.width ?? subject.page.width, height: view?.height ?? subject.page.height, scale, paper: subject.paper ?? "#F8F1E3", seed: subject.seed ?? 11, plates: [...subject.plates], margin: 0 });

/** One part, on its own. `scale` is pixels per page unit. Null when nothing was painted. */
export function paintInkCel(subject: InkSubject, part: InkPart, scale: number, pose = inkPosesOf(part)[0]): InkCel | null {
  const [x, y, width, height] = part.box ?? [0, 0, subject.page.width, subject.page.height];
  const sheet = createInkRisoSheet({ ...inkSubjectSheet(subject, scale, { x, y, width, height }) }, { layer: true });
  part.draw(context(sheet, { x, y }, pose));
  return inkCelFromSheet(sheet, { key: `${subject.id}/${part.id}${pose ? `/${pose}` : ""}`, x, y, body: part.body });
}
const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
/** A painted layer sheet as a cel: `paintInk` without its paper. */
export function inkCelFromSheet(sheet: InkRisoSheet, o: { key: string; x?: number; y?: number; body?: string }): InkCel | null {
  const { w, h, spec } = sheet, S = spec.scale, seed = spec.seed, layer = sheet.layer;
  if (!layer) throw new Error("inkCelFromSheet needs a sheet made with { layer: true }.");
  const white = spec.plates.find(ps => ps.opaque), paper = inkRgb(spec.paper), chalk = white && inkRgb(white.ink), plates = spec.plates.map(ps => ({ ...sheet.plates[ps.id], ink: inkRgb(ps.ink), density: ps.density ?? 1, opaque: !!ps.opaque }));
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = y * w + x; let any = layer.cover[q];
    for (const p of plates) any = Math.max(any, p.solid[q], p.tone[q]);
    if (any > 0.004) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < x0) return null;
  const whitened = !!white && sheet.plates[white.id].tone.some(v => v > 0.004);
  // a clear rim, so that the edge of the picture never smears when it is bent or shrunk
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(w - 1, x1 + 4); y1 = Math.min(h - 1, y1 + 4);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, pixels = new Uint8ClampedArray(cw * ch * 4), when = new Uint8Array(cw * ch);
  // the order of the marks as a clock: long marks take longer, though not in proportion, as a hand speeds up
  const ends: number[] = []; let total = 0;
  for (const m of layer.marks) ends.push((total += Math.pow(m, 0.62)));
  const clock = (at: number) => { const k = Math.min(ends.length - 1, Math.floor(at)), from = k > 0 ? ends[k - 1] : 0; return k < 0 ? 0 : (from + (ends[k] - from) * Math.min(1, at - k)) / total; };
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const X = x + x0, Y = y + y0, q = Y * w + X, p = (y * cw + x) * 4, t = [1, 1, 1];
    let any = layer.cover[q], laid = 0;
    for (const pl of plates) {
      const c = 1 - (1 - pl.solid[q]) * (1 - pl.tone[q]);
      if (c <= 0.002) continue;
      const g = inkNoise2(seed + 73, X / (1.6 * S), Y / (1.6 * S)) * 0.6 + inkNoise2(seed + 76, X / (0.7 * S), Y / (0.7 * S)) * 0.4, v = Math.min(1, Math.max(0, c * (1 + 0.3 * (g - 0.5) * (1 - c)) * pl.density));
      any = Math.max(any, v);
      if (pl.opaque) laid = v;
      else for (let k = 0; k < 3; k++) t[k] *= 1 - v * (1 - pl.ink[k]);
    }
    // a cel that has body white on it is covered with that white, and what it left as paper is let down to paper
    if (chalk && whitened) for (let k = 0; k < 3; k++) t[k] *= 1 - layer.cover[q] * (1 - laid) * (1 - paper[k] / chalk[k]);
    for (let k = 0; k < 3; k++) pixels[p + k] = Math.round(enc(t[k]) * 255);
    pixels[p + 3] = Math.round(layer.cover[q] * 255);
    if (any > 0.004) when[y * cw + x] = 1 + Math.round(254 * clock(layer.when[q]));
  }
  return { key: o.key, x: (o.x ?? 0) + x0 / S, y: (o.y ?? 0) + y0 / S, width: cw / S, height: ch / S, w: cw, h: ch, pixels, when, body: o.body ?? (whitened ? white!.ink : undefined) };
}
/** Bare paper as pixels, the same one `paintInk` makes. */
export function paintInkPaper(width: number, height: number, scale: number, paper: string, seed = 11): { width: number; height: number; rgba: Uint8ClampedArray } {
  const { rgba, width: w, height: h } = paintInk(createInkRisoSheet({ width, height, scale, paper, seed, plates: [] }));
  return { width: w, height: h, rgba };
}
