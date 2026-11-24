/**
 * INK-RISO1 工筆 gōngbǐ: hair painted as washes that lie on one another, the companion of `paintGongbiFace`.
 *
 * A lock is an outline and colours at places: the colour runs from one place into the next, as wet ink does. Its edge is crisp where one
 * lock lies on another and lost where hair grows out of skin. Over the washes come a few long soft streaks that follow a guide sheet, dark
 * lines where locks part, pale lines wiped beside them, and single hairs. Everything is in the level frame of `InkHead` (see
 * `ink-riso-gongbi`).
 */
import { inkSpline } from "./ink-riso-press";
import type { PenPoint } from "./ink-riso-pen";
import type { InkSheetForm } from "./ink-riso-coiffure";
import type { InkHead } from "./ink-riso-face";
import { gongbiField, gongbiSkin } from "./ink-riso-gongbi";
import type { GongbiHand, GongbiMix, GongbiNode, GongbiPlace, GongbiWash } from "./ink-riso-gongbi";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Where an edge is not as crisp as the rest: near a line or a point, how far that speaks for, how soft it is there. Level units. */
export interface GongbiLost { along: readonly PenPoint[]; reach: number; soft: number }
export interface GongbiLock {
  outline: readonly PenPoint[];
  /** Its colours, place by place. */
  places: readonly GongbiPlace[];
  /** Softness of the edge (default 0.012), and where it is softer or crisper. */
  soft?: number; lost?: readonly GongbiLost[];
  /** How much it hides of what it lies on, 0–1 (default 1). At 0 it is a glaze. */
  cover?: number;
  /** How the wash lies (its softness comes from above). */
  wash?: Omit<GongbiWash, "soft">;
}
/** How far a place lies from a line. */
export function gongbiOff(line: readonly PenPoint[]): (x: number, y: number) => number {
  if (line.length === 1) return (x, y) => Math.hypot(x - line[0][0], y - line[0][1]);
  return (x, y) => { let best = Infinity; for (let i = 1; i < line.length; i++) { const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1], k = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)); best = Math.min(best, Math.hypot(x - a[0] - dx * k, y - a[1] - dy * k)); } return best; };
}
/** Softness at a place. */
export function gongbiSoftness(soft: number, lost: readonly GongbiLost[] = []): (x: number, y: number) => number {
  const near = lost.map(q => [gongbiOff(inkSpline(q.along, 0.06).map(p => [p[0], p[1]] as const)), q.reach, q.soft] as const);
  return (x, y) => { let s = soft; for (const [off, reach, to] of near) { const d = off(x, y) / reach; if (d < 3) s = lerp(s, to, Math.exp(-d * d)); } return s; };
}
/** Colours of a lock, as they are read off a place: x, y, the colour there, how far it speaks (default 0.22). Hair takes no chalk. */
export function gongbiHues(colour: (of: string, white?: number) => GongbiMix): (list: readonly (readonly [x: number, y: number, of: string, reach?: number])[]) => GongbiPlace[] {
  return list => list.map(([x, y, of, reach = 0.22]) => ({ at: [x, y], mix: colour(of, 0), reach }));
}
/** A line beside a line, `off` to the right of its direction (negative: to the left). */
export function gongbiBeside(path: readonly PenPoint[], off: number): PenPoint[] {
  const n = path.length;
  return path.map((p, i) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [p[0] - ((b[1] - a[1]) / l) * off, p[1] + ((b[0] - a[0]) / l) * off]; });
}
/** A line along a band: `u` is 0 in its middle, 1 and -1 on its edges. */
export function gongbiAlong(nodes: readonly GongbiNode[], u: number): PenPoint[] {
  const path = nodes.map(([x, y]): PenPoint => [x, y]), right = gongbiBeside(path, 1);
  return nodes.map(([x, y, w], i) => [x + (right[i][0] - x) * w * u, y + (right[i][1] - y) * w * u]);
}
/** The outline of a band: its middle, with half widths. */
export function gongbiBand(nodes: readonly GongbiNode[]): PenPoint[] {
  const P = inkSpline(nodes, 0.05), n = P.length, side = (k: 1 | -1) => P.map((p, i): PenPoint => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = k * Math.max(0.001, p[2]); return [p[0] + (-(b[1] - a[1]) / l) * w, p[1] + ((b[0] - a[0]) / l) * w]; });
  return [...side(1), ...side(-1).reverse()];
}
/** One lock: its colours take the place of what it lies on, as far as it covers; at 0 they are laid over it. */
export function paintGongbiLock(h: GongbiHand, lock: GongbiLock, seed: number): void {
  const shape = h.shape(lock.outline), wash: GongbiWash = { mottle: 0.2, cloud: 0.16, wander: 0.006, wave: 0.4, rim: 0.12, rimWidth: 0.02, ...lock.wash, soft: gongbiSoftness(lock.soft ?? 0.012, lock.lost), seed }, cover = lock.cover ?? 1;
  if (cover > 0) h.melt(shape, gongbiField(lock.places), cover, wash); else gongbiSkin(h, shape, lock.places, wash);
}

/** A line drawn with one breath: thin, full, thin. */
export interface GongbiHair {
  path: readonly PenPoint[];
  /** Half a width where it is fullest. */
  half: number; tone: GongbiMix;
  /** Its width at the root and at the tip as a share of that (default 0.15 and 0). */
  root?: number; tip?: number;
  soft?: number; along?: (t: number) => number;
}
const swell = (path: readonly PenPoint[], half: number, root = 0.15, tip = 0): GongbiNode[] => {
  let length = 0; for (let i = 1; i < path.length; i++) length += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  const n = Math.max(7, Math.min(28, Math.round(length / 0.06))), P = inkSpline(path, length / (n * 6));
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), q = P[Math.round(t * (P.length - 1))]; return [q[0], q[1], half * Math.min(lerp(root, 1, ss(0, 0.4, t)), lerp(tip, 1, ss(0, 0.6, 1 - t)))] as const; });
};
export function paintGongbiHair(h: GongbiHand, hair: GongbiHair): void {
  h.stroke({ nodes: swell(hair.path, hair.half, hair.root, hair.tip), tone: hair.tone, soft: hair.soft ?? 0.005, along: hair.along });
}
/** The light beside a lock: ink wiped off along a line. */
export function liftGongbiHair(h: GongbiHand, hair: Omit<GongbiHair, "tone"> & { amount: number }): void {
  h.lift({ nodes: swell(hair.path, hair.half, hair.root, hair.tip), soft: hair.soft ?? 0.006, along: hair.along }, hair.amount, ["ink", "earth", "cool", "warm"]);
}
/** Lines in the order they are listed: path, half width, strength, softness, colour. */
export type GongbiHairLine = readonly [path: readonly PenPoint[], half: number, strength: number, soft?: number, tone?: GongbiMix];
export function paintGongbiLines(h: GongbiHand, list: readonly GongbiHairLine[], tone: GongbiMix): void {
  for (const [path, half, v, soft = 0.005, own = tone] of list) paintGongbiHair(h, { path, half, tone: own, soft, along: () => v });
}
export function liftGongbiLines(h: GongbiHand, list: readonly GongbiHairLine[]): void {
  for (const [path, half, amount, soft = 0.006] of list) liftGongbiHair(h, { path, half, amount, soft, root: 0 });
}
/** Where one lock lies on another: a dark line, and a light one beside it (`gap` to the right of its direction; negative: to the left). */
export interface GongbiSeam { path: readonly PenPoint[]; half: number; strength?: number; light?: number; gap?: number; soft?: number }
export function paintGongbiSeams(h: GongbiHand, list: readonly GongbiSeam[], tone: GongbiMix): void {
  for (const { path, half, strength = 0.9, light = 0, gap = half * 2, soft = 0.005 } of list) {
    paintGongbiHair(h, { path, half, tone, soft, along: () => strength });
    if (light > 0) liftGongbiHair(h, { path: gongbiBeside(path, gap), half: half * 0.7, amount: light, soft: 0.005, root: 0 });
  }
}

export interface GongbiFlow {
  /** How many, and which part of the sheet they are spread over (0–1 across, 0–1 along: where they start, how long they are). */
  n: number; s?: readonly [number, number]; from?: readonly [number, number]; length?: readonly [number, number];
  /** Half widths, softness, strength: each streak takes one between. */
  half: readonly [number, number]; soft?: readonly [number, number]; ink: readonly [number, number];
  /** What they are drawn with; without it they are lights. */
  tone?: GongbiMix;
  /** How far a streak runs across the sheet from its root to its tip (share of `s`). */
  drift?: number;
  seed: number;
}
/** Long soft streaks that follow a sheet of guides: they give a wash its direction. */
export function paintGongbiFlow(h: GongbiHand, head: InkHead, form: InkSheetForm, o: GongbiFlow): void {
  let k = 0;
  const dice = () => { const v = Math.sin(o.seed * 12.9898 + k++ * 78.233) * 43758.5453; return v - Math.floor(v); }, pick = (r: readonly [number, number]) => lerp(r[0], r[1], dice());
  const [s0, s1] = o.s ?? [0, 1];
  for (let i = 0; i < o.n; i++) {
    const s = lerp(s0, s1, (i + 0.15 + 0.7 * dice()) / o.n), a = pick(o.from ?? [0, 0.3]), b = Math.min(1, a + pick(o.length ?? [0.4, 0.8])), d = (dice() - 0.5) * 2 * (o.drift ?? 0.04), half = pick(o.half), soft = pick(o.soft ?? [0.01, 0.02]), ink = pick(o.ink);
    const path = Array.from({ length: 10 }, (_, j) => { const t = j / 9; return head.fromLevel(form.point(clamp(s + d * t), lerp(a, b, t))); });
    if (o.tone) paintGongbiHair(h, { path, half, tone: o.tone, soft, along: () => ink }); else liftGongbiHair(h, { path, half, soft, amount: ink });
  }
}

export interface GongbiDown {
  /** The hairline, in the direction the hairs are combed. `inside` turns the side they come from: 1 the right of that direction, -1 the left. */
  line: readonly PenPoint[]; inside: 1 | -1;
  n: number; length: readonly [number, number];
  /** How far a hair turns away from the line, in degrees (0 lies along it), and how far in the hair its root is. */
  lean?: readonly [number, number]; root?: readonly [number, number];
  half: readonly [number, number]; tone: GongbiMix; ink: readonly [number, number]; soft?: number;
  seed: number;
}
/** Short hairs where the hair grows out of the skin: they come out of the mass and lie over along it. */
export function paintGongbiDown(h: GongbiHand, o: GongbiDown): void {
  let k = 0;
  const dice = () => { const v = Math.sin(o.seed * 12.9898 + k++ * 78.233) * 43758.5453; return v - Math.floor(v); }, pick = (r: readonly [number, number]) => lerp(r[0], r[1], dice());
  const P = inkSpline(o.line, 0.02), n = P.length;
  for (let i = 0; i < o.n; i++) {
    const at = Math.min(n - 2, Math.round(((i + dice()) / o.n) * (n - 1))), a = P[Math.max(0, at - 1)], b = P[Math.min(n - 1, at + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l, nx = -ty * o.inside, ny = tx * o.inside;
    const turn = (pick(o.lean ?? [4, 26]) * Math.PI) / 180, length = pick(o.length), deep = pick(o.root ?? [0.02, 0.06]), root: PenPoint = [P[at][0] + nx * deep, P[at][1] + ny * deep], dx = tx * Math.cos(turn) - nx * Math.sin(turn), dy = ty * Math.cos(turn) - ny * Math.sin(turn), bend = (dice() - 0.2) * 0.22 * length;
    paintGongbiHair(h, { path: [root, [root[0] + dx * length * 0.5 - nx * bend, root[1] + dy * length * 0.5 - ny * bend], [root[0] + dx * length, root[1] + dy * length]], half: pick(o.half), tone: o.tone, soft: o.soft ?? 0.006, root: 0.5, along: (v => t => v * (1 - 0.5 * t))(pick(o.ink)) });
  }
}

export interface GongbiPart {
  /** The part from the hairline back: its middle, with half widths. Run it along the middle of the skull (`InkHead.skull(0, latitude)`), and to nothing at its end. */
  line: readonly GongbiNode[];
  /** The skin in it, place by place: light at the hairline, as dark as the roots at its end. */
  skin: readonly GongbiPlace[];
  /** The roots that cross its edges, and how many on a side (default 8). */
  tone: GongbiMix; roots?: number;
  seed: number;
}
/** Where hair is parted: paint the locks on both sides up to its middle first; this lays the skin over their roots and lets a few grow across its edges. */
export function paintGongbiPart(h: GongbiHand, o: GongbiPart): void {
  const line = o.line.map(([x, y]): PenPoint => [x, y]), n = o.roots ?? 8, over = line.slice(1, Math.max(3, line.length - 2));
  paintGongbiLock(h, { outline: gongbiBand(o.line), places: o.skin, soft: 0.014, lost: [{ along: [line[0]], reach: 0.06, soft: 0.05 }], wash: { wander: 0.004, wave: 0.16, mottle: 0.06, cloud: 0.05, rim: 0 } }, o.seed);
  for (const [inside, lean, k] of [[1, [-82, -40], 40], [-1, [-98, -58], 41]] as const) paintGongbiDown(h, { line: over, inside, n, length: [0.08, 0.2], lean, root: [-0.016, 0.014], half: [0.0025, 0.006], tone: o.tone, ink: [0.4, 0.85], soft: 0.008, seed: o.seed + k });
}
