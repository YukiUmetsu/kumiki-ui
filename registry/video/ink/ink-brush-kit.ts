/**
 * INK-FILM1 brush kit: the marks plants and animals are built from, each one touch of the brush that knows how far it reaches.
 *
 * A subject plans its marks once, from a seed, and hands them out to parts: `inkMarksPart` paints a list of marks and works out the
 * box they stay in, so a part is cheap to paint on its own. Angles are degrees, 0 to the right and 90 down the page.
 *
 *   inkDice      numbers from a seed, for subjects that must not look alike    inkRandom  its short form
 *   inkBlade     a blade in one stroke: the tip lands, the belly presses, the hair lifts
 *   inkStroke    side-tip stroke    inkLine  fine line    inkBloomed  wet wash    inkDot  a pressed dot
 *   inkClear     paper, over whatever lies behind    inkWipe  a line wiped out of wet ink
 */
import { brush, inkHash2 } from "../ink-riso-press";
import { inkSplatter } from "../ink-riso-pen";
import type { InkRisoPen, PenNode } from "../ink-riso-pen";
import { inkBloom, inkSide, inkThread } from "../ink-riso-wet";
import type { InkBloomOptions, InkSideOptions } from "../ink-riso-wet";
import type { InkPart, InkPaintContext, InkPoint } from "./ink-cel";

export const inkLerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inkClamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** A step from a point: `angle` in degrees, 0 right, 90 down. */
export const inkStep = (x: number, y: number, angle: number, length: number): [number, number] => { const r = (angle * Math.PI) / 180; return [x + Math.cos(r) * length, y + Math.sin(r) * length]; };
/** Smooth 0–1. */
export const inkEase = (a: number, b: number, v: number) => { const t = inkClamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
/** Numbers from a seed. `near` is a bell about a value, `fork` another stream that does not disturb this one. */
export interface InkDice { next(): number; range(a: number, b: number): number; near(value: number, spread: number): number; int(a: number, b: number): number; sign(): 1 | -1; chance(p: number): boolean; pick<T>(list: readonly T[]): T; fork(k: number): InkDice; seed(): number }
export function inkDice(seed: number): InkDice {
  let i = 0;
  const next = () => inkHash2(seed * 7919 + 101, i++, 17), dice: InkDice = {
    next, range: (a, b) => a + (b - a) * next(), near: (v, d) => v + d * (next() + next() - 1), int: (a, b) => a + Math.floor(next() * (b - a + 1)), sign: () => (next() < 0.5 ? -1 : 1), chance: p => next() < p,
    pick: list => list[Math.floor(next() * list.length)], fork: k => inkDice(seed * 37 + k * 1009 + 5), seed: () => 1 + Math.floor(next() * 9000),
  };
  return dice;
}
/** The short form: numbers 0–1 from a seed, in a range, from a list, or yes and no. */
export const inkRandom = (seed: number) => { let i = 0; const next = () => inkHash2(seed * 7 + 3, i++, seed); return { next, in: (a: number, b: number) => a + (b - a) * next(), pick: <T,>(q: readonly T[]) => q[Math.min(q.length - 1, Math.floor(next() * q.length))], chance: (p: number) => next() < p }; };

/** One touch of the brush: the places it passes (with how far it reaches round them), and how it is painted. */
export interface InkMark { reach: readonly (readonly [number, number, number])[]; draw(pen: InkRisoPen, c: InkPaintContext): void }
const around = (points: readonly (PenNode | InkPoint)[], pad: number) => points.map(p => [p[0], p[1], pad] as const);
/** The page box a list of marks stays in, on whole units. */
export function inkReach(marks: readonly InkMark[], page: { width: number; height: number }, pad = 6): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of marks) for (const [x, y, r] of m.reach) { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
  if (x1 < x0) return [0, 0, 8, 8];
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(page.width, Math.ceil(x1 + pad)); y1 = Math.min(page.height, Math.ceil(y1 + pad));
  return [x0, y0, Math.max(8, x1 - x0), Math.max(8, y1 - y0)];
}
/** Marks as a part of a subject. */
export function inkMarksPart(id: string, marks: readonly InkMark[], page: { width: number; height: number }, o: Omit<InkPart, "id" | "draw" | "box"> & { pad?: number } = {}): InkPart {
  const { pad, ...rest } = o;
  return { id, box: inkReach(marks, page, pad), draw: c => { for (const m of marks) m.draw(c.page, c); }, ...rest };
}

export interface InkBladeOptions {
  x: number; y: number; angle: number; length: number; width: number;
  /** Degrees the blade turns between root and tip. */
  bend?: number;
  /** Strength of the ink, 0–1, and how much paler the belly edge is than the tip edge. */
  tone: number; belly?: number;
  side?: 1 | -1;
  /** Where the blade is widest, 0–1. */
  full?: number;
  /** How far the hair parted as it left the paper: 0 one point, above it a forked end. */
  torn?: number;
  /** How thin the root is, as a share of the width. */
  neck?: number;
  seed: number;
}
/** A blade in one stroke: hidden landing, thin neck, belly pressed, lifted to a point or torn off dry. */
export function inkBlade(plate: string, o: InkBladeOptions): InkMark {
  const full = o.full ?? 0.46, torn = o.torn ?? 0, neck = o.neck ?? 0.2, bend = o.bend ?? 0, side = o.side ?? 1, d = inkDice(o.seed);
  /** A blade, or only its end from `from` on, leaving the spine by `turn` degrees. */
  const blade = (n: number, from: number, to: number, turn: number, wide: number): PenNode[] => {
    const pts: PenNode[] = [];
    let x = o.x, y = o.y;
    for (let i = 0, m = Math.round(n / to); i <= m; i++) {
      const t = (i / m) * to, u = inkClamp((t / to - full) / (1 - full)), rise = neck + (1 - neck) * Math.pow(inkEase(0.03, full + 0.04, t), 1.1);
      if (t >= from) pts.push([x, y, wide * (t === 0 ? neck * 1.25 : t / to < full ? rise : Math.max(0, 1 - inkLerp(inkEase(0, 1, u), Math.pow(u, 1.7), 0.5)))]);
      [x, y] = inkStep(x, y, o.angle + bend * ((t + 0.5 / n) - 0.28) + (t >= from ? turn * inkEase(from, 1, t + 0.2) : 0), (o.length * to) / m);
    }
    return pts;
  };
  // a torn end is the hair parted: thin points of it that leave the spine
  const strokes: PenNode[][] = [blade(9, 0, 1, 0, 1)], thin: PenNode[][] = [];
  if (torn > 0) for (let k = 0, n = torn > 0.6 ? 3 : 2, s = d.sign(); k < n; k++, s = -s as 1 | -1) {
    const from = d.range(0.44, 0.6), pts = blade(10, from, d.range(0.84, 1.04), s * d.range(5, 12) * (0.5 + torn), 1);
    thin.push(pts.map(([x, y, w = 0], i) => [x, y, (i === 0 ? 0 : Math.min(1, i / 2)) * Math.max(0.12, w) * d.range(0.34, 0.5)]));
  }
  const ink = { tip: o.tone, belly: o.tone * (1 - (o.belly ?? 0.14)), side, head: 0.2, rim: 0.1, dry: 0, dryEnd: 0.06 + (o.width > 15 ? 0.24 * torn : 0), bristles: Math.max(5, o.width * 0.42), bleed: 0.45, grain: 0.14 };
  return { reach: around(strokes.flat(), o.width * 0.6 + 2), draw: pen => { for (const [k, pts] of strokes.entries()) inkSide(pen, plate, pts, o.width, { ...ink, seed: o.seed + k * 31 }); for (const [k, pts] of thin.entries()) inkThread(pen, plate, pts, o.width * 0.9, { tone: t => o.tone * inkLerp(0.3, 0.92, inkEase(0, 0.45, t)), seed: o.seed + 70 + k }); } };
}
/** A side-tip stroke through points with pressure. */
export const inkStroke = (plate: string, points: readonly PenNode[], width: number, o: InkSideOptions): InkMark => ({ reach: around(points, width * 0.62 + (o.bleed ?? 0.5) + 2), draw: pen => inkSide(pen, plate, points, width, o) });
/** A fine line through points with pressure. */
export const inkLine = (plate: string, points: readonly PenNode[], width: number, o: Parameters<typeof inkThread>[4]): InkMark => ({ reach: around(points, width + 2), draw: pen => inkThread(pen, plate, points, width, o) });
/** A wet wash inside a smooth closed shape through points. `tone` and `soft` functions get page units. */
export function inkBloomed(plate: string, points: readonly InkPoint[], o: InkBloomOptions): InkMark {
  const pad = (o.wander ?? 6) + (o.fringe ?? 2) + (typeof o.soft === "number" ? o.soft : o.soft ? 60 : 1) + 4, onPage = (f: (x: number, y: number) => number) => (pen: InkRisoPen) => (X: number, Y: number) => { const [x, y] = pen.local(X, Y); return f(x, y); };
  const { tone, soft, ...rest } = o;
  return { reach: around(points, pad), draw: pen => inkBloom(pen, plate, pen.shape(points as readonly PenNode[]), { ...rest, tone: typeof tone === "function" ? onPage(tone)(pen) : tone, soft: typeof soft === "function" ? onPage(soft)(pen) : soft }) };
}
/** Points round an uneven ellipse: `rough` is how far it strays from one. */
export function inkRound(x: number, y: number, rx: number, ry: number, o: { angle?: number; rough?: number; seed: number; n?: number }): [number, number][] {
  const n = o.n ?? 12, a = ((o.angle ?? 0) * Math.PI) / 180, rough = o.rough ?? 0.12;
  return Array.from({ length: n }, (_, i) => { const p = (i / n) * Math.PI * 2, k = 1 + rough * 2 * (inkHash2(o.seed + 3, i, 4) - 0.5), u = Math.cos(p) * rx * k, v = Math.sin(p) * ry * k; return [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)]; });
}
/** A dot pressed with the tip: longer than wide, heavier where the brush landed. */
export function inkDot(plate: string, x: number, y: number, r: number, o: { tone: number; angle?: number; long?: number; soft?: number; seed: number }): InkMark {
  const shape = inkRound(x, y, r * (o.long ?? 1.3), r, { angle: o.angle, rough: 0.16, seed: o.seed, n: 10 });
  return { reach: around(shape, 4 + (o.soft ?? 0)), draw: pen => inkBloom(pen, plate, pen.shape(shape), { tone: o.tone, soft: o.soft ?? 0.8, wander: r * 0.12, wave: r * 2, fringe: Math.min(1.2, r * 0.1), tooth: 2, rim: 0.2, rimWidth: r * 0.4, mottle: 0.2, cloud: r * 3, seed: o.seed }) };
}
/** Paper inside a smooth closed shape: hides what lies behind. `plates` clears only some inks, and hides nothing when the last plate is not one of them. */
export const inkClear = (points: readonly InkPoint[], plates?: readonly string[]): InkMark => ({ reach: around(points, 3), draw: pen => pen.knock(pen.shape(points as readonly PenNode[]), plates) });
/** A line wiped out of ink that is already there; `ink` is how much of it goes. */
export const inkWipe = (plates: readonly string[], points: readonly PenNode[], width: number, o: { ink?: number; dry?: number; seed: number }): InkMark => ({ reach: around(points, width), draw: pen => { for (const id of plates) brush(pen.sheet, id, { points: points.map(p => { const [x, y] = pen.at(p[0], p[1]); return [x, y, p[2] ?? 1] as const; }), width, ink: o.ink ?? 1, dry: o.dry ?? 0, rough: 0.3, mode: "lift", seed: o.seed }); } });
/** Drops flicked from the brush. */
export const inkSpatter = (plate: string, o: Parameters<typeof inkSplatter>[2]): InkMark => ({ reach: [[o.x - o.spread[0], o.y - o.spread[1], o.radius[1] * 2], [o.x + o.spread[0], o.y + o.spread[1], o.radius[1] * 2]], draw: pen => inkSplatter(pen, plate, o) });
