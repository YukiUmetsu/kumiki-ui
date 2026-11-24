/**
 * INK-FILM1 motion: pure functions of time that move the points of a cel. Nothing here keeps state, so any frame can be asked for first.
 *
 * Places are page units of the cel's subject; lengths of time are seconds.
 */
import type { InkPoses } from "./ink-cel";

type P = readonly [number, number];
export type InkMotion =
  /** Hair, ribbons, sleeves, branches: still at `from`, free at `to`; a wave runs down it. `lean` is how far the free end is carried downwind. */
  | { kind: "sway"; from: P; to: P; amount: number; seconds?: number; lag?: number; power?: number; lean?: number; gust?: number; phase?: number }
  /** A head, a pendant: rocks about a point. */
  | { kind: "turn"; at: P; degrees: number; seconds?: number; phase?: number; offset?: number }
  /** Breath: swells from a point, up and down only by default. */
  | { kind: "breathe"; at: P; amount: number; seconds?: number; wide?: number; phase?: number }
  /** Travels at a steady pace (units a second); with `back`, out and back over that many seconds instead. */
  | { kind: "drift"; by: P; back?: number; phase?: number }
  /** Water: rows slide against each other, less toward `still`. */
  | { kind: "ripple"; amount: number; length: number; seconds?: number; still?: number; from?: number }
  /** Along places, at times; smooth through them. `face` turns it to where it goes. */
  | { kind: "path"; keys: readonly { at: number; x: number; y: number; scale?: number; rotate?: number }[]; pivot?: P; face?: boolean; loop?: boolean };

const TAU = Math.PI * 2, clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const inkSmooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
/** Wind: two slow waves that do not repeat together, −1..1. */
export const inkWind = (t: number, seconds: number, phase = 0) => 0.72 * Math.sin((TAU * t) / seconds + phase) + 0.28 * Math.sin((TAU * t) / (seconds * 1.73) + phase * 2.3 + 1.1);

/** Places on a path, through the keys without stopping at them; held before the first and after the last. */
function along(keys: readonly { at: number; x: number; y: number; scale?: number; rotate?: number }[], t: number) {
  const n = keys.length, at = (i: number) => keys[clamp(i, 0, n - 1)], pick = (k: (q: (typeof keys)[number]) => number) => {
    let i = 0; while (i < n - 2 && keys[i + 1].at <= t) i++;
    const a = at(i), b = at(i + 1), span = b.at - a.at, u = span <= 0 ? 0 : clamp((t - a.at) / span);
    const slope = (j: number) => { const p = at(j - 1), q = at(j + 1); return j <= 0 || j >= n - 1 ? 0 : (k(q) - k(p)) / (q.at - p.at || 1); };
    const m0 = slope(i) * span, m1 = slope(Math.min(n - 1, i + 1)) * span, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * k(a) + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * k(b) + (u3 - u2) * m1;
  };
  return { x: pick(q => q.x), y: pick(q => q.y), scale: pick(q => q.scale ?? 1), rotate: pick(q => q.rotate ?? 0) };
}
/** Where a point of a cel is at a time. `still` (0–1) scales every motion down: 0 for a viewer who asks for less of it. */
export function inkMove(motions: readonly InkMotion[] | undefined, x: number, y: number, t: number, live = 1): [number, number] {
  if (!motions) return [x, y];
  for (const m of motions) {
    if (m.kind === "sway") {
      const dx = m.to[0] - m.from[0], dy = m.to[1] - m.from[1], L = Math.hypot(dx, dy) || 1, s = ((x - m.from[0]) * dx + (y - m.from[1]) * dy) / (L * L), w = s <= 0 ? 0 : Math.pow(s, m.power ?? 1.7);
      if (!w) continue;
      const sec = m.seconds ?? 5, phase = (m.phase ?? 0) - (m.lag ?? 0.22) * TAU * Math.min(1.4, s), swing = inkWind(t, sec, phase) + (m.gust ?? 0.25) * Math.sin((TAU * t) / (sec * 0.41) + phase * 1.9) * s;
      const d = live * m.amount * w * (swing + (m.lean ?? 0));
      // aside, and a little back toward the root, so that the length holds
      x += (dy / L) * d - (dx / L) * Math.abs(d) * 0.12; y += (-dx / L) * d - (dy / L) * Math.abs(d) * 0.12;
    } else if (m.kind === "turn") {
      const a = ((m.offset ?? 0) + live * m.degrees * inkWind(t, m.seconds ?? 7, m.phase ?? 0)) * (Math.PI / 180), c = Math.cos(a), n = Math.sin(a), u = x - m.at[0], v = y - m.at[1];
      x = m.at[0] + u * c - v * n; y = m.at[1] + u * n + v * c;
    } else if (m.kind === "breathe") {
      const b = live * m.amount * (0.5 - 0.5 * Math.cos((TAU * t) / (m.seconds ?? 4.6) + (m.phase ?? 0)));
      y = m.at[1] + (y - m.at[1]) * (1 + b); x = m.at[0] + (x - m.at[0]) * (1 + b * (m.wide ?? 0.2));
    } else if (m.kind === "drift") {
      const k = m.back ? 0.5 - 0.5 * Math.cos((TAU * t) / (2 * m.back) + (m.phase ?? 0)) : t;
      x += live * m.by[0] * k; y += live * m.by[1] * k;
    } else if (m.kind === "ripple") {
      const sec = m.seconds ?? 4, far = m.still === undefined || m.from === undefined ? 1 : clamp((y - m.still) / (m.from - m.still || 1));
      x += live * m.amount * far * (Math.sin((TAU * y) / m.length + (TAU * t) / sec) + 0.5 * Math.sin((TAU * y) / (m.length * 0.43) - (TAU * t) / (sec * 0.7) + x / (m.length * 4)));
    } else {
      const k = m.keys, end = k[k.length - 1].at, at = m.loop ? t % end : t, q = along(k, at), pv = m.pivot ?? [k[0].x, k[0].y];
      let turn = q.rotate;
      if (m.face) { const f = along(k, Math.min(end, at + 0.08)), g = along(k, Math.max(0, at - 0.08)); turn += (Math.atan2(f.y - g.y, f.x - g.x) * 180) / Math.PI; }
      const a = (turn * Math.PI) / 180, c = Math.cos(a) * q.scale, n = Math.sin(a) * q.scale, u = x - pv[0], v = y - pv[1];
      x = q.x + u * c - v * n; y = q.y + u * n + v * c;
    }
  }
  return [x, y];
}
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** Which drawings of a part show at a time, with their strengths (they add up to 1). */
export function inkPoseAt(poses: InkPoses | undefined, t: number, live = 1): readonly (readonly [string, number])[] {
  if (!poses) return [["", 1]];
  if (poses.kind === "cycle") {
    const n = poses.order.length, u = ((live ? t : 0) / poses.seconds + (poses.phase ?? 0)) * n, f = u - Math.floor(u), i = ((Math.floor(u) % n) + n) % n, j = (i + 1) % n;
    if (!poses.blend || poses.order[i] === poses.order[j]) return [[poses.order[i], 1]];
    const k = inkSmooth(0, 1, f);
    return [[poses.order[i], 1 - k], [poses.order[j], k]];
  }
  // blinks fall at uneven times: one a cycle, somewhere in its first half
  const every = poses.every ?? 4.4, sec = poses.seconds ?? 0.26, c = Math.floor(t / every), at = every * (0.35 + 0.3 * hash(c + (poses.seed ?? 0))), u = (t - c * every - at) / sec, n = poses.order.length;
  if (!live || u < 0 || u >= 1) return [[poses.open, 1]];
  const list = [...poses.order, ...poses.order.slice(0, -1).reverse()];
  return [[list[Math.min(list.length - 1, Math.floor(u * list.length))] ?? poses.order[n - 1], 1]];
}
