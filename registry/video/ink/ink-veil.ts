/**
 * INK-FILM1 veil: paper laid over ink by degrees. It is how mist is painted (the paper is the mist), and how the foot of a mountain goes
 * out. In a layer of a film the veil also hides what lies behind.
 */
import { inkFillMask } from "../ink-riso-press";
import type { InkRisoPen, PenShape } from "../ink-riso-pen";

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
function veilPixel(pen: InkRisoPen, q: number, a: number) {
  const { sheet } = pen, L = sheet.layer;
  for (const id of Object.keys(sheet.plates)) { const p = sheet.plates[id]; p.solid[q] *= 1 - a; p.tone[q] *= 1 - a; }
  if (L) { L.cover[q] = 1 - (1 - L.cover[q]) * (1 - a); L.gain[q] *= 1 - a; if (a > 0.5) L.when[q] = L.marks.length; }
}
/** Veil a box of pen units; `amount` is asked at every pixel, pen units, 0–1. */
export function inkVeil(pen: InkRisoPen, box: readonly [x: number, y: number, width: number, height: number], amount: (x: number, y: number) => number): void {
  const { sheet } = pen, S = sheet.spec.scale, [x, y, w, h] = box, c = [pen.at(x, y), pen.at(x + w, y), pen.at(x, y + h), pen.at(x + w, y + h)];
  const x0 = Math.max(0, Math.floor(Math.min(...c.map(p => p[0])) * S)), x1 = Math.min(sheet.w - 1, Math.ceil(Math.max(...c.map(p => p[0])) * S)), y0 = Math.max(0, Math.floor(Math.min(...c.map(p => p[1])) * S)), y1 = Math.min(sheet.h - 1, Math.ceil(Math.max(...c.map(p => p[1])) * S));
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { const [u, v] = pen.local((X + 0.5) / S, (Y + 0.5) / S), a = clamp(amount(u, v)); if (a > 0.002) veilPixel(pen, Y * sheet.w + X, a); }
  if (sheet.layer) sheet.layer.marks.push(1);
}
/** Points of an oval, pen units. */
export const inkOval = (x: number, y: number, rx: number, ry: number): [number, number][] => Array.from({ length: 24 }, (_, i) => [x + Math.cos((i / 24) * 6.28319) * rx, y + Math.sin((i / 24) * 6.28319) * ry]);
/** In a layer of a film, hide what lies behind a shape without touching any ink: bare skin between a face and its hair, say. A still has nothing behind it and is not changed. */
export function inkCover(pen: InkRisoPen, shape: PenShape): void {
  const { sheet } = pen, L = sheet.layer; if (!L) return;
  const m = inkFillMask(sheet, shape);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const a = m.a[y * m.w + x], q = (y + m.y0) * sheet.w + x + m.x0; if (a > L.cover[q]) L.cover[q] = a; }
  L.marks.push(1);
}
/** Let the ink of a box go out, and with it what it hides: `keep` is asked at every pixel, pen units, 1 = all of it. For the foot of a robe or a root, where a drawing stops without a line. */
export function inkFade(pen: InkRisoPen, box: readonly [x: number, y: number, width: number, height: number], keep: (x: number, y: number) => number, o: { /** Leave the ink alone: only what it hides goes out. */ coverOnly?: boolean } = {}): void {
  const { sheet } = pen, S = sheet.spec.scale, [x, y, w, h] = box, c = [pen.at(x, y), pen.at(x + w, y), pen.at(x, y + h), pen.at(x + w, y + h)], L = sheet.layer;
  const x0 = Math.max(0, Math.floor(Math.min(...c.map(p => p[0])) * S)), x1 = Math.min(sheet.w - 1, Math.ceil(Math.max(...c.map(p => p[0])) * S)), y0 = Math.max(0, Math.floor(Math.min(...c.map(p => p[1])) * S)), y1 = Math.min(sheet.h - 1, Math.ceil(Math.max(...c.map(p => p[1])) * S));
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const [u, v] = pen.local((X + 0.5) / S, (Y + 0.5) / S), k = clamp(keep(u, v)), q = Y * sheet.w + X; if (k > 0.998) continue;
    if (!o.coverOnly) for (const id of Object.keys(sheet.plates)) { const p = sheet.plates[id]; p.solid[q] *= k; p.tone[q] *= k; }
    if (L) { L.cover[q] *= k; if (!o.coverOnly) L.gain[q] *= k; }
  }
}
/** Veil a shape (sheet units, from `pen.shape`), with how much at each place. */
export function inkVeilShape(pen: InkRisoPen, shape: PenShape, amount: number | ((x: number, y: number) => number) = 1): void {
  const { sheet } = pen, S = sheet.spec.scale, m = inkFillMask(sheet, shape);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const a = m.a[y * m.w + x]; if (!a) continue;
    const X = x + m.x0, Y = y + m.y0, k = typeof amount === "number" ? amount : clamp(amount(...pen.local((X + 0.5) / S, (Y + 0.5) / S)));
    if (a * k > 0.002) veilPixel(pen, Y * sheet.w + X, a * k);
  }
  if (sheet.layer) sheet.layer.marks.push(1);
}
