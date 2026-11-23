/**
 * INK-RISO1 pen: draw in local units (a face, a body, the page) on an ink-riso sheet, and the brush gestures built on it.
 *
 *   createInkRisoPens   one pen per local frame; they share a seed counter, so a drawing is deterministic
 *   inkSplatter         flicked drops
 */
import { brush, inkHash2, inkSpline, knock, wash } from "./ink-riso-press";
import type { BrushNode, BrushStroke, InkRisoSheet, WashOptions } from "./ink-riso-press";

/** x, y in the pen's local units, and pressure (1 when left out). */
export type PenNode = readonly [number, number, number?];
export type PenPoint = readonly [number, number];
/** Where a pen's local origin sits on the page, its units, and its tilt in degrees. */
export interface PenFrame { x: number; y: number; scale: number; rotate?: number }
export type PenShape = readonly (readonly number[])[];
export type PenWash = Omit<WashOptions, "tone"> & { tone: number | ((x: number, y: number) => number) };
export interface InkRisoPen {
  readonly sheet: InkRisoSheet;
  /** Local units to sheet units. */
  at(x: number, y: number): [number, number];
  /** Sheet units to local units. */
  local(x: number, y: number): [number, number];
  /** One brush stroke; `width` is in page units at full pressure. */
  line(plate: string, points: readonly PenNode[], width: number, o?: Partial<BrushStroke>): void;
  /** A smooth closed (or open) shape through local nodes, in sheet units. */
  shape(points: readonly PenNode[], closed?: boolean): number[][];
  /** Tone inside a shape: on the screened master, or on the solid one. A tone function is asked in local units. */
  wash(plate: string, shape: PenShape, o: PenWash, solid?: boolean): void;
  /** Clear the plates inside a shape (all of them, or the named ones). */
  knock(shape: PenShape, plates?: readonly string[]): void;
  /** Wipe ink off the named plates along a stroke. */
  lift(points: readonly PenNode[], width: number, plates: readonly string[]): void;
  /** Local disc, in sheet units. */
  disc(x: number, y: number, r: number): number[][];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** One pen per named frame. `view` crops the page: the sheet's origin in page units. */
export function createInkRisoPens<T extends string>(sheet: InkRisoSheet, frames: Readonly<Record<T, PenFrame>>, view: { x: number; y: number } = { x: 0, y: 0 }): Record<T, InkRisoPen> {
  let seed = 10;
  const make = (f: PenFrame): InkRisoPen => {
    const r = ((f.rotate ?? 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    const at = (x: number, y: number): [number, number] => [f.x + f.scale * (x * c - y * s) - view.x, f.y + f.scale * (x * s + y * c) - view.y];
    const inv = (X: number, Y: number): [number, number] => { const x = (X + view.x - f.x) / f.scale, y = (Y + view.y - f.y) / f.scale; return [x * c + y * s, -x * s + y * c]; };
    const nodes = (points: readonly PenNode[]): BrushNode[] => points.map(p => { const [x, y] = at(p[0], p[1]); return [x, y, p[2] ?? 1] as const; });
    return {
      sheet, at, local: inv,
      line: (plate, points, width, o = {}) => brush(sheet, plate, { seed: seed++, ...o, points: nodes(points), width, streak: o.streak ?? Math.max(30, width * 5) }),
      shape: (points, closed = true) => inkSpline(points.map(p => at(p[0], p[1])), 1.5, closed),
      wash: (plate, shape, o, solid = false) => { const tone = o.tone; wash(sheet, plate, shape, { ...o, seed: seed++, tone: typeof tone === "number" ? tone : (X, Y) => { const [x, y] = inv(X, Y); return tone(x, y); } }, solid); },
      knock: (shape, plates) => knock(sheet, shape, plates),
      lift: (points, width, plates) => { for (const id of plates) brush(sheet, id, { points: nodes(points), width, seed: seed++, rough: 0.25, mode: "lift" }); },
      disc: (x, y, radius) => Array.from({ length: 32 }, (_, i) => at(x + Math.cos((i / 32) * Math.PI * 2) * radius, y + Math.sin((i / 32) * Math.PI * 2) * radius)),
    };
  };
  const out = {} as Record<T, InkRisoPen>;
  for (const id of Object.keys(frames) as T[]) out[id] = make(frames[id]);
  return out;
}

/** Drops flicked from the brush, inside an ellipse. */
export function inkSplatter(pen: InkRisoPen, plate: string, o: { x: number; y: number; spread: readonly [number, number]; n: number; radius: readonly [number, number]; seed: number }): void {
  const { seed } = o;
  for (let i = 0; i < o.n; i++) {
    const a = inkHash2(seed, i, 0) * 6.283, d = Math.pow(inkHash2(seed, i, 1), 0.7), x = o.x + Math.cos(a) * d * o.spread[0], y = o.y + Math.sin(a) * d * o.spread[1];
    const r = lerp(o.radius[0], o.radius[1], Math.pow(inkHash2(seed, i, 2), 3.2)), e = 1 + 0.5 * inkHash2(seed, i, 3), th = inkHash2(seed, i, 4) * 3.14;
    const drop = Array.from({ length: 18 }, (_, k) => { const p = (k / 18) * 6.283, q = r * (1 + 0.16 * (inkHash2(seed + 3, i, k) - 0.5)), u = Math.cos(p) * q * e, v = Math.sin(p) * q; return pen.at(x + u * Math.cos(th) - v * Math.sin(th), y + u * Math.sin(th) + v * Math.cos(th)); });
    pen.wash(plate, drop, { tone: 1 }, true);
  }
}
