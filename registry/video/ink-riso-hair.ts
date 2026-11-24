/**
 * Hair the way ink portraits build it: not a cap but separate swept locks, each tapered at both ends with paper left where two of them
 * meet, and fine hairs that share a root and part as they fall.
 */
import { inkHash2, inkNoise2, inkSpline } from "./ink-riso-press";
import type { InkRisoPen, PenPoint } from "./ink-riso-pen";
import { inkBlob, inkBloom, inkHair, inkThread } from "./ink-riso-wet";
import type { InkSheetForm } from "./ink-riso-coiffure";

/** A point of a lock's middle and half its width there, pen units. */
export type InkLockNode = readonly [x: number, y: number, half: number];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sample = (q: readonly (readonly number[])[], t: number) => { const x = clamp(t) * (q.length - 1), i = Math.min(q.length - 2, Math.floor(x)), f = x - i; return q[i].map((v, k) => lerp(v, q[i + 1][k], f)); };

export interface InkSweepOptions {
  /** Ink of the lock, 0–1 (default 0.92), and at its end (default the same). */
  load?: number; loadEnd?: number;
  /** How far its root and its tip break into hairs, shares of the length (default 0.06, 0.1). */
  root?: number; tip?: number;
  /** Share of the width over which hairs peel off on its left and right edge, seen along its run (default 0.16, 0.16). */
  edge?: readonly [number, number];
  /** Paper or pale ink between its strands: how many, where along, how wide (sheet units), how open. */
  slits?: { n: number; from: number; to: number; width: number; open?: number };
  /** How strongly strands differ, 0–1 (default 0.3). */
  streak?: number;
  /** Where light crosses the lock. */
  sheen?: readonly { at: number; width: number; amount: number; lean?: number }[];
  /** Single hairs that run along it, some just outside its edges: how many (default 6), their width in sheet units (default 1.2), and how far out (shares of its half width, default 1.24). */
  hairs?: number; hairWidth?: number; stray?: number;
  /** A lit crest along the lock: where across it (0 its left edge, 1 its right) and how much it opens, 0–1. */
  round?: { at: number; amount: number; width?: number };
  /** Hairs that go on past its end, pen units (default 0). */
  over?: number;
  /** 0–1: how much of what lies under it gives way (default 1). */
  cover?: number;
  /** Plates cleared under it, so it reads in front of colour. */
  clear?: readonly string[];
  /** The wash it is painted from: how much of its ink a place takes (1 all of it), pen units. Locks given the same one share one light, as hair painted wet does. */
  wash?: (x: number, y: number) => number;
  dry?: number; dryEnd?: number;
  /** Plies laid over it (inkSweep only): see inkPlies. */
  plies?: Partial<Omit<InkPlyOptions, "seed">> & { n: number };
  seed: number;
}
/** One swept lock along its middle line. Give it no width at either end and it tapers like a brush lifted off. */
export function inkSweep(pen: InkRisoPen, plate: string, nodes: readonly InkLockNode[], o: InkSweepOptions): void {
  const P = inkSpline(nodes, 1) as unknown as number[][], n = P.length, M = 25;
  const side = P.map((p, i) => { const a = P[Math.max(0, i - 3)], b = P[Math.min(n - 1, i + 3)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [p[0], p[1], Math.max(0, p[2]), -(b[1] - a[1]) / l, (b[0] - a[0]) / l]; });
  const rail = (u: number): PenPoint[] => Array.from({ length: M }, (_, i) => { const q = sample(side, i / (M - 1)); return [q[0] + q[3] * q[2] * u, q[1] + q[4] * q[2] * u]; });
  const rails = [-1, -0.5, 0, 0.5, 1].map(rail), load = o.load ?? 0.92;
  inkTress(pen, plate, rails, o);
  if (o.plies) inkPlies(pen, plate, rails, { load: [load, load * 0.82], loadEnd: (o.loadEnd ?? load) / load, root: 0.1, tip: 0.2, hairs: 2, stray: 1.2, hairWidth: o.hairWidth, streak: 0.45, seed: o.seed + 300, ...o.plies });
}
/** The same lock between guide lines, left edge to right edge, all with the same number of points: what a form in three dimensions gives. */
export function inkTress(pen: InkRisoPen, plate: string, guides: readonly (readonly PenPoint[])[], o: InkSweepOptions): void {
  const G = guides.length - 1;
  /** `u` from −1 to 1 across; past the edges it goes on as far as half the lock's own width. */
  const at = (t: number, u: number): PenPoint => { const x = (clamp(u, -1, 1) + 1) / 2 * G, i = Math.min(G - 1, Math.floor(x)), f = x - i, a = sample(guides[i], t), b = sample(guides[i + 1], t), q: PenPoint = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; if (Math.abs(u) <= 1) return q; const l = sample(guides[0], t), r = sample(guides[G], t), e = (Math.abs(u) - 1) * Math.sign(u) / 2, w = Math.hypot(r[0] - l[0], r[1] - l[1]), k = w > 1e-6 ? Math.max(1, (0.18 * wide) / w) : 0; return [q[0] + (r[0] - l[0]) * e * k, q[1] + (r[1] - l[1]) * e * k]; };
  const wide = Math.max(...guides[0].map((p, i) => Math.hypot(guides[G][i][0] - p[0], guides[G][i][1] - p[1])));
  if (o.clear?.length) pen.knock(pen.shape([...guides[0], ...[...guides[G]].reverse()]), o.clear as string[]);
  const load = o.load ?? 0.92, end = o.loadEnd ?? load;
  const wash = o.wash, W = 12, N = 32, field = wash && Array.from({ length: N + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, j) => wash(...at(i / N, (2 * j) / W - 1))));
  const washed = field ? (v: number, u: number) => { const y = clamp(v) * N, x = clamp(u) * W, i = Math.min(N - 1, Math.floor(y)), j = Math.min(W - 1, Math.floor(x)), f = y - i, g = x - j; return lerp(lerp(field[i][j], field[i][j + 1], g), lerp(field[i + 1][j], field[i + 1][j + 1], g), f); } : null;
  inkHair(pen, plate, guides, { load, root: o.root ?? 0.06, tip: o.tip ?? 0.1, edge: o.edge ?? [0.16, 0.16], slits: o.slits, streak: o.streak ?? 0.3, sheen: o.sheen, round: o.round, strand: 1.1, along: washed ? (v, u) => lerp(1, end / load, ss(0.3, 1, v)) * washed(v, u) : v => lerp(1, end / load, ss(0.3, 1, v)), dry: o.dry, dryEnd: o.dryEnd, cover: o.cover ?? 1, seed: o.seed });
  const H = o.hairs ?? 6, out = o.stray ?? 1.24;
  for (let i = 0; i < H; i++) {
    const r = (k: number) => inkHash2(o.seed * 13 + 5, i, k), u0 = (r(0) < 0.5 ? -1 : 1) * lerp(0.5, out, r(1) ** 0.7), t0 = 0.3 * r(2) ** 1.6, t1 = 1 - 0.22 * r(3) ** 2, bow = (r(4) - 0.5) * 0.5, m = 9;
    const pts = Array.from({ length: m }, (_, k) => { const f = k / (m - 1); return at(lerp(t0, t1, f), u0 * (0.75 + 0.25 * Math.sin(Math.PI * f)) + bow * Math.sin(Math.PI * f)); });
    if (o.over) { const a = pts[m - 2], b = pts[m - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = o.over * lerp(0.4, 1.2, r(5)), tw = (r(6) - 0.5) * 0.9; pts.push([b[0] + (d * (b[0] - a[0] - tw * (b[1] - a[1]))) / l, b[1] + (d * (b[1] - a[1] + tw * (b[0] - a[0]))) / l]); }
    strand(pen, plate, pts, (o.hairWidth ?? 1.2) * lerp(0.6, 1.2, r(7)), lerp(0.6, 0.95, r(8)) * load, o.seed * 17 + i);
  }
}
/** One hair: thin, fuller past its root, gone at its end. */
function strand(pen: InkRisoPen, plate: string, pts: readonly PenPoint[], width: number, ink: number, seed: number, fade = 0.55) {
  const n = pts.length - 1;
  inkThread(pen, plate, pts.map((q, i) => { const t = i / n; return [q[0], q[1], 0.16 + 0.84 * ss(0, 0.2, t) * (1 - ss(0.45, 1, t)) - 0.14 * ss(0.8, 1, t)] as const; }), width, { ink, mid: ink, inkEnd: ink * fade, tremor: 0.35, seed });
}

export interface InkWispOptions {
  /** How many hairs. */
  n: number;
  /** Thinnest and thickest hair, sheet units (default [0.7, 1.8]); palest and darkest (default [0.35, 0.9]). */
  width?: readonly [number, number]; ink?: readonly [number, number];
  /** Share by which the shortest hairs fall short (default 0.4). */
  short?: number;
  /** How far a hair leaves its place between the guides, as a share of their gap (default 0.2), and how it waves, pen units (default 0). */
  stray?: number; wave?: number;
  /** Hairs stay together near the root up to this share of the length (default 0.12). */
  root?: number;
  /** Where between the first (0) and the last guide (1) hairs are thickest on the ground: 0.5 spreads them evenly (default). */
  lean?: number;
  seed: number;
}
/** Fine hairs between guide paths (root first, all with the same number of nodes), mixed thick and thin, dark and pale. */
export function inkWisps(pen: InkRisoPen, plate: string, guides: readonly (readonly PenPoint[])[], o: InkWispOptions): void {
  const G = guides.map(g => inkSpline(g, 1) as unknown as number[][]), [w0, w1] = o.width ?? [0.7, 1.8], [k0, k1] = o.ink ?? [0.35, 0.9], M = 15, ex = Math.log(0.5) / Math.log(clamp(o.lean ?? 0.5, 0.05, 0.95));
  const at = (u: number, t: number): number[] => { const x = clamp(u) * (G.length - 1), i = Math.min(G.length - 2, Math.floor(x)), a = sample(G[i], t), b = sample(G[i + 1], t), f = u <= 0 || u >= 1 ? u : x - i; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
  for (let i = 0; i < o.n; i++) {
    const r = (k: number) => inkHash2(o.seed * 19 + 3, i, k), u0 = ((i + 0.15 + 0.7 * r(0)) / o.n) ** ex, end = 1 - (o.short ?? 0.4) * r(1) ** 1.5, str = (o.stray ?? 0.2) * (r(2) - 0.5) * 2, ph = r(3) * 6.28, hold = o.root ?? 0.12;
    const pts = Array.from({ length: M }, (_, k) => {
      const f = k / (M - 1), t = end * f, free = ss(0, Math.max(0.02, hold * 4), t), u = lerp(0.5, u0, 0.25 + 0.75 * free) + str * free * Math.sin(Math.PI * Math.min(1, f * 0.9) + 0.4), q = at(u, t), b = at(u, Math.min(1, t + 0.02)), a = at(u, Math.max(0, t - 0.02)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = (o.wave ?? 0) * free * (Math.sin(ph + 5.2 * t) + 0.6 * (inkNoise2(o.seed + i, t * 3, 7) - 0.5));
      return [q[0] - ((b[1] - a[1]) / l) * w, q[1] + ((b[0] - a[0]) / l) * w] as PenPoint;
    });
    const big = r(5) ** 1.8;
    strand(pen, plate, pts, lerp(w0, w1, big), lerp(k0, k1, 0.35 * r(6) + 0.65 * big), o.seed * 23 + i, 0.45);
  }
}

export type InkGapShape = "wedge" | "leaf" | ((t: number) => number);
const GAP = { wedge: (t: number) => (1 - t) ** 0.8, leaf: (t: number) => Math.sin(Math.PI * t) ** 0.8 };
/** Paper let into a mass, `width` at its widest, sheet units. A wedge is wide where two locks part and points into the hair; a leaf lies along a lock, a point at both ends; a function gives the width along it, 0–1. */
export function inkGap(pen: InkRisoPen, plates: readonly string[], path: readonly PenPoint[], width: number, shape: InkGapShape = "wedge"): void {
  const n = inkSpline(path, 2) as unknown as number[][], w = typeof shape === "string" ? GAP[shape] : shape;
  pen.lift(n.map((p, i) => [p[0], p[1], Math.max(0.02, w(i / (n.length - 1)))] as const), width, plates);
}

/** Where a place lies in a lock, for a wash that rounds it: how far along (0 at the first node, 1 at the last) and how far across (−1 and 1 on its edges). Pen units. */
export function inkAcross(nodes: readonly InkLockNode[]): (x: number, y: number) => readonly [along: number, across: number] {
  const P = inkSpline(nodes as readonly (readonly number[])[], 4), n = P.length - 1;
  return (x, y) => {
    let best = Infinity, t = 0, d = 0;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, k = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2), px = x - a[0] - dx * k, py = y - a[1] - dy * k, q = px * px + py * py;
      if (q < best) { best = q; t = (i + k) / n; d = Math.sign(dx * py - dy * px) * Math.sqrt(q) / Math.max(0.5, lerp(a[2], b[2], k)); }
    }
    return [t, d];
  };
}

// ---- what makes a combed sheet soft ----------------------------------------------------------------------------------------------
type Range = readonly [number, number];
export interface InkClumpOptions extends Omit<InkSweepOptions, "load" | "loadEnd"> {
  n: number;
  /** Along the root line, and half its width there. */
  s: Range; half: Range;
  /** Where along the strand it starts and ends (default [0, 0.16], [0.8, 1]). */
  from?: Range; to?: Range;
  /** How far it arches off the sheet, mm (default [1, 6]); how far it wanders sideways, shares of the root line (default 0.02). */
  lift?: Range; drift?: number;
  /** Along the strand: how much of the width of `s` is left, 1 all of it. Clumps draw in together, so paper can open beside them. */
  gather?: (t: number) => number;
  /** Darkest and palest ink. */
  load: Range; loadEnd?: number;
}
/** The same light, at a place of its own: lined up across locks it reads as a shine painted over them all. */
const ownLight = (o: Pick<InkSweepOptions, "round" | "sheen">, a: number, b: number): Pick<InkSweepOptions, "round" | "sheen"> => ({ round: o.round && { ...o.round, at: o.round.at + 0.3 * (a - 0.5), amount: o.round.amount * lerp(0.4, 1.4, b) }, sheen: o.sheen?.map(q => ({ ...q, at: q.at + 0.26 * (b - 0.5), amount: q.amount * lerp(0.3, 1.5, a) })) });
export interface InkPlyOptions extends Omit<InkSweepOptions, "load" | "loadEnd"> {
  n: number;
  /** Half a ply's width, shares of the hank's half width (default [0.14, 0.32]); how far it wanders across, and how far past the hank's edges one may lie (default 0.1, 0.06). */
  half?: Range; wander?: number; out?: number;
  /** Where along the hank it starts and ends (default [0, 0.2], [0.8, 1]). */
  from?: Range; to?: Range;
  load: Range; loadEnd?: number;
}
/** The plies of a hank, laid over it between its guides: each starts, wanders and ends by itself, so the hank is not one flat ribbon. */
export function inkPlies(pen: InkRisoPen, plate: string, guides: readonly (readonly PenPoint[])[], o: InkPlyOptions): void {
  const G = guides.length - 1, N = 25;
  const at = (t: number, u: number): PenPoint => { const x = clamp((u + 1) / 2) * G, i = Math.min(G - 1, Math.floor(x)), f = x - i + (u < -1 ? ((u + 1) / 2) * G : u > 1 ? ((u - 1) / 2) * G : 0), a = sample(guides[i], t), b = sample(guides[i + 1], t); return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
  for (let i = 0; i < o.n; i++) {
    const r = (k: number) => inkHash2(o.seed * 47 + 17, i, k), between = (a: Range, k: number, e = 1) => lerp(a[0], a[1], r(k) ** e), edge = 1 + (o.out ?? 0.06), h = between(o.half ?? [0.14, 0.32], 1, 1.3);
    const c = lerp(-edge + h, edge - h, clamp((i + 0.5 + 0.7 * (r(0) - 0.5)) / o.n)), t0 = between(o.from ?? [0, 0.2], 2, 1.2), t1 = between(o.to ?? [0.8, 1], 3), d = (o.wander ?? 0.1) * (r(4) < 0.5 ? -1 : 1) * lerp(0.4, 1, r(5)), ph = 6.28 * r(6), load = between(o.load, 7);
    const rail = (e: number) => Array.from({ length: N }, (_, k) => { const f = k / (N - 1); return at(lerp(t0, t1, f), c + d * Math.sin(Math.PI * f) * Math.sin(ph + 3.4 * f) + e * h * Math.sin(Math.PI * lerp(0.06, 0.97, f ** 0.85)) ** 0.7); });
    inkTress(pen, plate, [-1, -0.5, 0, 0.5, 1].map(rail), { ...o, ...ownLight(o, r(9), r(10)), load, loadEnd: o.loadEnd == null ? undefined : o.loadEnd * load, seed: o.seed + i * 7 });
  }
}
/**
 * Locks laid over a combed sheet, no two alike: each is a leaf that starts and ends at its own place, arches off the sheet, wanders a
 * little and carries its own ink. A sheet of equal bands reads as a comb's teeth; this is what makes it hair.
 */
export function inkClumps(pen: InkRisoPen, plate: string, form: InkSheetForm, o: InkClumpOptions): void {
  const mid = (o.s[0] + o.s[1]) / 2;
  for (let i = 0; i < o.n; i++) {
    const r = (k: number) => inkHash2(o.seed * 37 + 11, i, k), between = (a: Range, k: number, e = 1) => lerp(a[0], a[1], r(k) ** e);
    const c = lerp(o.s[0], o.s[1], (i + 0.2 + 0.6 * r(0)) / o.n), h = between(o.half, 1, 1.4), from = between(o.from ?? [0, 0.16], 2, 1.3), to = between(o.to ?? [0.8, 1], 3), d = (o.drift ?? 0.02) * (r(4) < 0.5 ? -1 : 1) * lerp(0.4, 1, r(5)), ph = 6.28 * r(6);
    const f = (t: number) => clamp((t - from) / (to - from)), load = between(o.load, 7);
    const guides = form.lock(c - h, c + h, { from, to, flat: true, lift: between(o.lift ?? [1, 6], 8), pinch: t => Math.sin(Math.PI * lerp(0.06, 0.97, f(t) ** 0.85)) ** 0.7 * (0.4 + 0.6 * (o.gather?.(t) ?? 1)), drift: t => d * Math.sin(Math.PI * f(t)) * Math.sin(ph + 3.4 * f(t)) + (mid - c) * (1 - (o.gather?.(t) ?? 1)) });
    inkTress(pen, plate, guides, { ...o, ...ownLight(o, r(9), r(10)), load, loadEnd: o.loadEnd == null ? undefined : o.loadEnd * load, seed: o.seed + i * 7 });
  }
}
export interface InkHankOptions {
  /** Ink of the wash, 0–1, or a function of the place (pen units). */
  tone: number | ((x: number, y: number) => number);
  /** How much the wash is let down along its middle, so that the hank is round, 0–1 (default 0.3), and which side the light is on, −1…1 (default −0.2). */
  round?: number; light?: number;
  /** Shares of the length over which it starts and ends (default 0.04, 0.12), and the ink left at its very end (default 0.6). */
  root?: number; tip?: number; end?: number;
  /** The earth plate under it (hair is warm), and how much (default none). */
  earth?: string; earthTone?: number;
  /** Softness of its edges (default 1.2), and the load, streaks and loose hairs of the dry glaze over it (default 0.3, 0.8, 2). */
  soft?: number; glaze?: number; streak?: number; hairs?: number; stray?: number; hairWidth?: number;
  /** Plates wiped from under it. */
  clear?: readonly string[];
  seed: number;
}

/** One hank of hair as a wet wash, rounded across, with its hairs dragged over it as a glaze. Where `inkSweep` is a loaded brush, this is water with ink in it. Given as a swollen line, or as a piece of a sheet (`InkSheetForm.lock`). */
export function inkHank(pen: InkRisoPen, plate: string, of: readonly InkLockNode[] | { sheet: readonly (readonly PenPoint[])[] }, o: InkHankOptions): void {
  const { round = 0.3, light = -0.2, root = 0.04, tip = 0.12, end = 0.6, soft = 1.2, glaze = 0.3, streak = 0.8, hairs = 2, stray = 1.4, hairWidth = 1.1, seed } = o, sheet = "sheet" in of ? of.sheet : null;
  const nodes: readonly InkLockNode[] = sheet ? sheet[0].map((p, i) => { const z = sheet[sheet.length - 1][i]; return [(p[0] + z[0]) / 2, (p[1] + z[1]) / 2, Math.hypot(p[0] - z[0], p[1] - z[1]) / 2] as const; }) : of as readonly InkLockNode[];
  const shape = sheet ? pen.shape([...sheet[0], ...[...sheet[sheet.length - 1]].reverse()]) : inkBlob(pen, nodes), where = inkAcross(nodes);
  const ink = typeof o.tone === "number" ? () => o.tone as number : o.tone;
  const tone = (x: number, y: number) => { const [t, d] = where(x, y); return clamp(ink(x, y) * (1 + 0.5 * round - 1.3 * round * Math.exp(-(((d - light) / 0.5) ** 2))) * (root > 0 ? lerp(0.5, 1, ss(0, root, t)) : 1) * lerp(1, end, ss(1 - tip, 1, t))); };
  if (o.clear?.length) pen.knock(shape, [...o.clear]);
  if (o.earth) inkBloom(pen, o.earth, shape, { tone: (X, Y) => (o.earthTone ?? 0.16) * lerp(1, end, ss(1 - tip, 1, where(...pen.local(X, Y))[0])), soft, wander: 0.5, wave: 50, fringe: 0.3, rim: 0.1, mottle: 0.2, seed: seed + 500 });
  inkBloom(pen, plate, shape, { tone: (X, Y) => tone(...pen.local(X, Y)), soft, wander: 0.7, wave: 40, fringe: 0.3, rim: 0.24, rimWidth: 3, mottle: 0.34, cloud: 26, seed: seed + 501 });
  if (glaze <= 0) return;
  const dry: InkSweepOptions = { load: glaze, cover: 0, wash: (x, y) => 0.4 + tone(x, y), root, tip: tip * 0.5, edge: [0.12, 0.12], streak, hairs, stray, hairWidth, clear: [], seed };
  if (sheet) inkTress(pen, plate, sheet, dry); else inkSweep(pen, plate, nodes, dry);
}

export interface InkFlyawayOptions {
  n: number;
  /** Along the root line; where along the strand a hair leaves and how much of it it runs (defaults [0, 1], [0, 0.35], [0.4, 0.8]). */
  s?: Range; from?: Range; length?: Range;
  /** How far it stands off the sheet, mm (default [2, 9]); how far it wanders sideways, shares of the root line (default 0.05). */
  lift?: Range; drift?: number;
  /** Pen units it goes on past its end, and how far it curls there, radians (defaults 0, 1.4). */
  tail?: number; curl?: number;
  width?: Range; ink?: Range;
  seed: number;
}
/**
 * Single hairs that stand off a sheet. Seen from the side of the head they arch past its outline as loose loops; seen from the front
 * they lie over it. The lift is in three dimensions, so a head turned any way gets them where its outline is.
 */
export function inkFlyaways(pen: InkRisoPen, plate: string, form: InkSheetForm, o: InkFlyawayOptions): void {
  const [w0, w1] = o.width ?? [0.7, 1.5], [k0, k1] = o.ink ?? [0.3, 0.85], M = 17;
  for (let i = 0; i < o.n; i++) {
    const r = (k: number) => inkHash2(o.seed * 41 + 13, i, k), between = (a: Range, k: number, e = 1) => lerp(a[0], a[1], r(k) ** e);
    const s0 = lerp((o.s ?? [0, 1])[0], (o.s ?? [0, 1])[1], (i + r(0)) / o.n), t0 = between(o.from ?? [0, 0.35], 1), t1 = Math.min(1, t0 + between(o.length ?? [0.4, 0.8], 2)), L = between(o.lift ?? [2, 9], 3, 1.5), d = (o.drift ?? 0.05) * (r(4) - 0.5) * 2, ph = 6.28 * r(5);
    const pts: PenPoint[] = Array.from({ length: M }, (_, k) => { const f = k / (M - 1); return form.point(s0 + d * Math.sin(Math.PI * f) * Math.sin(ph + 3 * f), lerp(t0, t1, f), L * Math.sin(Math.PI * Math.min(1, f * 0.94 + 0.03)) ** 0.8); });
    if (o.tail) {
      let [x, y] = pts[M - 1], a = Math.atan2(y - pts[M - 2][1], x - pts[M - 2][0]);
      const len = o.tail * lerp(0.3, 1, r(6)), turn = (o.curl ?? 1.4) * (r(7) - 0.5) * 2;
      for (let k = 0; k < 8; k++) { a += turn / 8; x += Math.cos(a) * len / 8; y += Math.sin(a) * len / 8; pts.push([x, y]); }
    }
    const big = r(8) ** 1.8;
    strand(pen, plate, pts, lerp(w0, w1, big), lerp(k0, k1, 0.4 * r(9) + 0.6 * big), o.seed * 43 + i, 0.5);
  }
}
