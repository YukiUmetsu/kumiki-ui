/**
 * Hair as geometry, for ink portraits: it is combed over the skull, gathered, wound and let fall in three dimensions, then drawn.
 *
 *   inkCombSheet   hair combed from a root line to where it is gathered, lying on the skull
 *   inkGuideSheet  hair laid along guide hairs read off a drawing
 *   inkCoil        a hank wound about an axis: a bun, a knot, a tie round its foot
 *   inkHang        a lock that leaves the head and settles under its own weight against what it touches
 *
 * Outlines are not drawn: they are where the form turns away. A sheet that follows the skull cannot give the head a wrong shape.
 */
import { inkSpline } from "./ink-riso-press";
import type { PenPoint } from "./ink-riso-pen";
import type { InkHead, InkVec3 } from "./ink-riso-face";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const add = (a: InkVec3, b: InkVec3, k = 1): InkVec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a: InkVec3, b: InkVec3): InkVec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: InkVec3, b: InkVec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: InkVec3): InkVec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Longitude from the face's middle toward the near side, latitude up, degrees; lift off the skull, mm. */
export type InkScalpPoint = readonly [lon: number, lat: number, lift: number];
/** One strand of a sheet: where it is rooted, the way it leaves, the way it arrives, where it ends. `s` is its place along the root line. */
export interface InkCombRow { s: number; root: InkScalpPoint; out: InkScalpPoint; into: InkScalpPoint; end: InkScalpPoint }
/** A sheet of hair: `s` along the root line, `t` from root to end. */
export interface InkSheetForm {
  point(s: number, t: number, lift?: number): PenPoint;
  /** A lock of the sheet as guide lines, left edge to right edge, for inkHair. `pinch` narrows it along its run, `drift` carries it sideways along `s`, `lift` arches it off the sheet, mm: its middle most, or with `flat` its whole width alike, which cannot fold over where the sheet is seen edge on. */
  lock(s0: number, s1: number, o?: { from?: number; to?: number; pinch?: (t: number) => number; drift?: (t: number) => number; flat?: boolean; across?: number; along?: number; lift?: number }): PenPoint[][];
  /** One line of it. */
  run(s: number, from?: number, to?: number, n?: number, lift?: number): PenPoint[];
}
/** One combed over a skull: it also knows where it is in depth. */
export interface InkCombForm extends InkSheetForm {
  /** mm toward the viewer. */
  depth(s: number, t: number): number;
  /** How far along the strand rooted at `s` is seen before it goes over the head's edge, 0–1. */
  seen(s: number): number;
}

const rad = Math.PI / 180;
const ball = ([lon, lat]: readonly number[]): InkVec3 => { const a = lon * rad, b = lat * rad; return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)]; };
/** Hair combed over the skull. Rows are given at a few places along the root line and blended between them on the sphere. */
export function inkCombSheet(head: InkHead, rows: readonly InkCombRow[]): InkCombForm {
  const S = rows.map(r => r.s), keys = ["root", "out", "into", "end"] as const;
  // each control runs along s as a smooth line on the sphere
  const flat = keys.map(k => rows.map(r => [...ball(r[k]), r[k][2]]));
  const tangent = (q: number[][], i: number, k: number) => { const a = Math.max(0, i - 1), b = Math.min(q.length - 1, i + 1); return (q[b][k] - q[a][k]) / (S[b] - S[a] || 1); };
  const control = (c: number, s: number): number[] => {
    const q = flat[c]; let i = 0; while (i < S.length - 2 && s > S[i + 1]) i++;
    const w = S[i + 1] - S[i] || 1, t = clamp((s - S[i]) / w, -0.2, 1.2), t2 = t * t, t3 = t2 * t;
    return q[0].map((_, k) => (2 * t3 - 3 * t2 + 1) * q[i][k] + (t3 - 2 * t2 + t) * w * tangent(q, i, k) + (-2 * t3 + 3 * t2) * q[i + 1][k] + (t3 - t2) * w * tangent(q, i + 1, k));
  };
  const at3 = (s: number, t: number, lift = 0): InkVec3 => {
    const C = [0, 1, 2, 3].map(c => control(c, s)), u = 1 - t, b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t], v = [0, 1, 2, 3].map(k => C.reduce((a, q, i) => a + q[k] * b[i], 0)), d = unit([v[0], v[1], v[2]]);
    return head.scalp(Math.atan2(d[0], d[2]) / rad, Math.asin(clamp(d[1], -1, 1)) / rad, v[3] + lift);
  };
  const point = (s: number, t: number, lift = 0) => head.at(at3(s, t, lift));
  const run = (s: number, from = 0, to = 1, n = 25, lift = 0) => Array.from({ length: n }, (_, i) => head.at(at3(s, lerp(from, to, i / (n - 1)), lift)));
  const turned = (s: number, t: number) => { const h = 0.01, a = point(s - h, t), b = point(s + h, t), c = point(s, t - h), d = point(s, t + h); return Math.sign((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])); };
  const seen = (s: number) => { const q = turned(s, 0.06); for (let t = 0.1; t < 1; t += 0.01) if (turned(s, t) !== q) return t; return 1; };
  return {
    point, run, seen, depth: (s, t) => head.depth(at3(s, t)),
    lock: (s0, s1, o = {}) => {
      const n = o.along ?? 25, m = o.across ?? 5, c = (s0 + s1) / 2, h = (s1 - s0) / 2;
      return Array.from({ length: m }, (_, j) => { const e = -1 + (2 * j) / (m - 1); return Array.from({ length: n }, (_, i) => { const t = lerp(o.from ?? 0, o.to ?? 1, i / (n - 1)); return head.at(at3(c + (o.drift?.(t) ?? 0) + h * e * (o.pinch?.(t) ?? 1), t, (o.lift ?? 0) * (o.flat ? 1 : 1 - e * e) * Math.sin(Math.PI * t))); }); });
    },
  };
}

// ---- laid by guide hairs -----------------------------------------------------------------------------------------------------------
/** One guide hair of a sheet, root to end (`InkHead.level` places it), and its place along the root line. */
export interface InkGuide { s: number; path: readonly PenPoint[] }
/** The head's outline as far as hair goes off it: its middle and its mean radius on the page. */
const ringOf = (head: InkHead) => { const q = Array.from({ length: 24 }, (_, i) => Array.from({ length: 13 }, (_, j) => head.skull(i * 15, -90 + j * 15))).flat(), x = q.map(p => p[0]), y = q.map(p => p[1]), [x0, x1, y0, y1] = [Math.min(...x), Math.max(...x), Math.min(...y), Math.max(...y)]; return { c: [(x0 + x1) / 2, (y0 + y1) / 2] as const, r: (x1 - x0 + y1 - y0) / 4 }; };
/**
 * A sheet from guide hairs, for a hairstyle read off a drawing: hairs between two guides run between them, at equal shares of their
 * lengths. Two guides that share a root and part make a fan from it. `lift` carries a hair away from the head's middle, the more the
 * nearer it lies to the head's outline, as it would in three dimensions. A sheet made this way belongs to one view of one head.
 */
export function inkGuideSheet(head: InkHead, guides: readonly InkGuide[]): InkSheetForm {
  const M = 64, ring = ringOf(head), S = guides.map(g => g.s);
  const even = (path: readonly PenPoint[]): PenPoint[] => {
    const q = inkSpline(path, head.span / 160), at = [0]; for (let i = 1; i < q.length; i++) at.push(at[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    let j = 0; return Array.from({ length: M + 1 }, (_, i) => { const d = (at[at.length - 1] * i) / M; while (j < at.length - 2 && at[j + 1] < d) j++; const f = clamp((d - at[j]) / (at[j + 1] - at[j] || 1)); return [lerp(q[j][0], q[j + 1][0], f), lerp(q[j][1], q[j + 1][1], f)]; });
  };
  const P = guides.map(g => even(g.path)), along = (g: PenPoint[], t: number): PenPoint => { const x = clamp(t) * M, i = Math.min(M - 1, Math.floor(x)), f = x - i; return [lerp(g[i][0], g[i + 1][0], f), lerp(g[i][1], g[i + 1][1], f)]; };
  const point = (s: number, t: number, lift = 0): PenPoint => {
    let i = 0; while (i < S.length - 2 && s > S[i + 1]) i++;
    const f = clamp((s - S[i]) / (S[i + 1] - S[i] || 1), -0.5, 1.5), a = along(P[i], t), b = along(P[i + 1], t), x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f), k = (lift * head.unit) / Math.max(ring.r, Math.hypot(x - ring.c[0], y - ring.c[1]));
    return [x + (x - ring.c[0]) * k, y + (y - ring.c[1]) * k];
  };
  return {
    point, run: (s, from = 0, to = 1, n = 25, lift = 0) => Array.from({ length: n }, (_, i) => point(s, lerp(from, to, i / (n - 1)), lift)),
    lock: (s0, s1, o = {}) => {
      const n = o.along ?? 41, m = o.across ?? 7, c = (s0 + s1) / 2, h = (s1 - s0) / 2;
      return Array.from({ length: m }, (_, j) => { const e = -1 + (2 * j) / (m - 1); return Array.from({ length: n }, (_, i) => { const t = lerp(o.from ?? 0, o.to ?? 1, i / (n - 1)); return point(c + (o.drift?.(t) ?? 0) + h * e * (o.pinch?.(t) ?? 1), t, (o.lift ?? 0) * (o.flat ? 1 : 1 - e * e) * Math.sin(Math.PI * t)); }); });
    },
  };
}

// ---- wound -----------------------------------------------------------------------------------------------------------------------
/** The middle of a hank as it goes round: turns (1 = once), distance from the axis, height along it, half width and how far it bulges, mm. */
export interface InkCoilNode { turn: number; radius: number; height: number; half: number; bulge?: number }
export interface InkCoilPlace { foot: InkVec3; axis: InkVec3; /** Where turn 0 points; it is squared off against the axis. */ start: InkVec3 }
/** The part of a hank the viewer sees in one go round: guides from its lower edge to its upper edge, and how near it is. */
export interface InkCoilSpan { guides: PenPoint[][]; depth: number; from: number; to: number }
export interface InkCoilForm { spans: InkCoilSpan[]; point(t: number, e?: number): PenPoint; faces(t: number): number; foot: InkVec3; axis: InkVec3 }
const viewOf = (head: InkHead): InkVec3 => { const o = head.depth([0, 0, 0]); return unit([head.depth([1, 0, 0]) - o, head.depth([0, 1, 0]) - o, head.depth([0, 0, 1]) - o]); };
/** A hank wound about an axis: spans come back to front, ready to be painted one over another. */
export function inkCoil(head: InkHead, place: InkCoilPlace, nodes: readonly InkCoilNode[], o: { across?: number; along?: number; past?: number; /** Thickness of the hair on the head that may stand before it, mm (default none: never hidden). */ behind?: number } = {}): InkCoilForm {
  const a = unit(place.axis), e1 = unit(add(place.start, a, -dot(place.start, a))), e2 = cross(a, e1), eye = viewOf(head);
  const Q = inkSpline(nodes.map(n => [n.turn * 100, n.radius, n.height, n.half, n.bulge ?? n.half * 0.35]), 2), N = Q.length;
  const q = (t: number) => { const x = clamp(t) * (N - 1), i = Math.min(N - 2, Math.floor(x)), f = x - i; return Array.from(Q[i], (v, k) => lerp(v, Q[i + 1][k], f)); };
  const frame = (t: number) => {
    const [turn, r, h, w, b] = q(t), th = (turn / 100) * 2 * Math.PI, out = add([e1[0] * Math.cos(th), e1[1] * Math.cos(th), e1[2] * Math.cos(th)], e2, Math.sin(th));
    // the dome's own slope at this height, so the hank lies on it
    const g = q(Math.min(1, t + 0.04)), p = q(Math.max(0, t - 0.04)), rise = Math.abs(g[2] - p[2]) + 1e-3, lean = clamp((p[1] - g[1]) / rise, -1.2, 2.4) * Math.min(1, rise / 2), k = Math.hypot(1, lean);
    return { out, r, h, w, b, tr: -lean / k, th: 1 / k, nr: 1 / k, nh: lean / k };
  };
  const at3 = (t: number, e: number): InkVec3 => { const f = frame(t), c = f.b * (1 - e * e); return add(add(place.foot, a, f.h + f.th * f.w * e + f.nh * c), f.out, f.r + f.tr * f.w * e + f.nr * c); };
  const faces = (t: number) => { const f = frame(t); return dot(unit(add([f.out[0] * f.nr, f.out[1] * f.nr, f.out[2] * f.nr], a, f.nh)), eye); };
  const past = o.past ?? 0.06, M = 400, spans: InkCoilSpan[] = [];
  for (let i = 0, open = -1; i <= M; i++) {
    const on = faces(i / M) > -past && (o.behind === undefined || !head.hides(at3(i / M, 0), o.behind));
    if (on && open < 0) open = i;
    if (open >= 0 && (!on || i === M)) {
      const t0 = open / M, t1 = i / M, m = o.across ?? 5, n = o.along ?? 25; open = -1;
      if (t1 - t0 < 0.012) continue;
      let d = 0; for (let k = 0; k <= 8; k++) d += head.depth(at3(lerp(t0, t1, k / 8), 0)) / 9;
      spans.push({ from: t0, to: t1, depth: d, guides: Array.from({ length: m }, (_, j) => Array.from({ length: n }, (_, k) => head.at(at3(lerp(t0, t1, k / (n - 1)), -1 + (2 * j) / (m - 1))))) });
    }
  }
  return { spans: spans.sort((x, y) => x.depth - y.depth), point: (t, e = 0) => head.at(at3(t, e)), faces, foot: place.foot, axis: a };
}

// ---- let fall --------------------------------------------------------------------------------------------------------------------
export interface InkHangOptions {
  /** Pen units; which way it leaves, any length; nodes (default 28). */
  length: number; leave: PenPoint; nodes?: number;
  /** How stiffly it keeps its own line: 0 a thread … 1 a wire; and at its tip (defaults 0.3, 0.08). */
  stiff?: number; stiffEnd?: number;
  /** Its own wave: bend per length, waves along it, phase (turns); and a curl at the end, radians over the last quarter. */
  wave?: { bend: number; count: number; phase?: number; grow?: number }; curl?: number;
  /** Where it may not go: a point is moved out to the nearest free place. */
  avoid?: (q: PenPoint) => PenPoint;
  /** Down, any length (default the page's own). */
  down?: PenPoint;
}
/** A lock from where it leaves the head, settled under its own weight. */
export function inkHang(from: PenPoint, o: InkHangOptions): PenPoint[] {
  const n = o.nodes ?? 28, L = o.length / (n - 1), dl = Math.hypot(...(o.down ?? [0, 1])) || 1, g: PenPoint = o.down ? [o.down[0] / dl, o.down[1] / dl] : [0, 1], l = Math.hypot(...o.leave) || 1, d: PenPoint = [o.leave[0] / l, o.leave[1] / l];
  const k0 = o.stiff ?? 0.3, k1 = o.stiffEnd ?? 0.08, W = o.wave;
  const bend = (i: number) => { const t = i / (n - 1); return (W ? (W.bend / (n - 1)) * lerp(1 - (W.grow ?? 0), 1, t) * Math.sin(2 * Math.PI * (W.count * t + (W.phase ?? 0))) : 0) + ((o.curl ?? 0) * 4 * clamp((t - 0.75) * 400)) / (n - 1); };
  const P: [number, number][] = Array.from({ length: n }, (_, i) => { const t = i / (n - 1), s = Math.min(1, t * 2.2), x = lerp(d[0], g[0], s), y = lerp(d[1], g[1], s); return [from[0] + x * L * i, from[1] + y * L * i]; });
  for (let it = 0; it < 420; it++) {
    for (let i = 2; i < n; i++) { P[i][0] += g[0] * L * 0.035; P[i][1] += g[1] * L * 0.035; }
    for (let r = 0; r < 3; r++) {
      P[0] = [from[0], from[1]]; P[1] = [from[0] + d[0] * L, from[1] + d[1] * L];
      for (let i = 2; i < n; i++) {
        // the line it would keep by itself: straight on from the last piece, turned by its own bend
        const ax = P[i - 1][0] - P[i - 2][0], ay = P[i - 1][1] - P[i - 2][1], c = Math.cos(bend(i)), s = Math.sin(bend(i)), m = Math.hypot(ax, ay) || 1, tx = P[i - 1][0] + ((ax * c - ay * s) / m) * L, ty = P[i - 1][1] + ((ax * s + ay * c) / m) * L, k = lerp(k0, k1, i / (n - 1)) * 0.5;
        P[i][0] += (tx - P[i][0]) * k; P[i][1] += (ty - P[i][1]) * k;
      }
      if (o.avoid) for (let i = 2; i < n; i++) { const q = o.avoid([P[i][0], P[i][1]]); P[i] = [q[0], q[1]]; }
      for (let i = 2; i < n; i++) { const x = P[i][0] - P[i - 1][0], y = P[i][1] - P[i - 1][1], m = Math.hypot(x, y) || 1; P[i] = [P[i - 1][0] + (x / m) * L, P[i - 1][1] + (y / m) * L]; }
    }
  }
  return P.map(q => [q[0], q[1]] as const);
}
