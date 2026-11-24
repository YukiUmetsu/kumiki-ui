/**
 * INK-FILM1 marks: one gesture of the brush each, for titles and explainers — a circle 圓相, a sweep to write over, an underline, an arrow, a
 * splash, a tick. They are drawn in the order the brush goes, so `enter: { kind: "paint" }` writes them.
 */
import { inkFbm2 } from "../ink-riso-press";
import { inkSplatter } from "../ink-riso-pen";
import type { PenNode } from "../ink-riso-pen";
import { inkBloom, inkSide } from "../ink-riso-wet";
import type { InkSubject } from "./ink-cel";
import { inkRandom } from "./ink-brush-kit";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const plates = (p: InkPigment) => inkPlates(p === "ink" ? ["ink"] : [p, "ink"]);
export interface InkMarkOptions { seed?: number; pigment?: InkPigment; /** Strength, 0–1. */ ink?: number; /** Dryness at the end of the stroke, 0–1.3. */ dry?: number }

/** A circle in one breath 圓相. It does not close. */
export function inkEnso(o: InkMarkOptions & { radius?: number; width?: number; /** Degrees where the brush lands, and how far it goes. */ from?: number; sweep?: number } = {}): InkSubject {
  const R = o.radius ?? 320, w = o.width ?? R * 0.26, seed = o.seed ?? 1, size = (R + w) * 2.3, c = size / 2, from = ((o.from ?? 128) * Math.PI) / 180, sweep = ((o.sweep ?? 338) * Math.PI) / 180, plate = o.pigment ?? "ink";
  return { id: `enso-${seed}`, label: "A brushed circle", page: { width: size, height: size }, plates: plates(plate), seed, parts: [{ id: "circle", draw: ({ page: p }) => {
    const n = 40, pts: PenNode[] = Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = from + sweep * t, k = R * (1 + 0.05 * (inkFbm2(seed, t * 2.2, 3, 2) - 0.5) * 2 - 0.05 * t); return [c + Math.cos(a) * k * 1.02, c + Math.sin(a) * k * 0.98, (t < 0.05 ? 0.62 + t * 7 : lerp(1, 0.62, t)) * (0.86 + 0.28 * inkFbm2(seed + 1, t * 4, 1, 2))] as const; });
    inkSide(p, plate, pts, w, { tip: o.ink ?? 0.97, belly: 0.62, side: -1, head: 0.35, rim: 0.12, dry: 0.04, dryEnd: o.dry ?? 1.12, bristles: 34, grain: 1.1, seed });
    const a = from; inkSplatter(p, plate, { x: c + Math.cos(a) * R, y: c + Math.sin(a) * R, spread: [w * 0.9, w * 0.9], n: 12, radius: [1.4, w * 0.06], seed: seed + 5 });
  } }] };
}
/** A broad dry sweep, to write a word over or to rule off a page. */
export function inkSweep(o: InkMarkOptions & { length?: number; width?: number; /** How much it bows, as a share of its width. */ bow?: number } = {}): InkSubject {
  const L = o.length ?? 1200, w = o.width ?? 150, seed = o.seed ?? 1, W = L + w * 1.6, H = w * 2.2, plate = o.pigment ?? "ink", y = H / 2;
  return { id: `sweep-${seed}`, label: "A brush sweep", page: { width: W, height: H }, plates: plates(plate), seed, parts: [{ id: "sweep", draw: ({ page: p }) => { const n = 16; inkSide(p, plate, Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [w * 0.7 + L * t, y + (o.bow ?? 0.12) * w * Math.sin(Math.PI * (t * 1.1 - 0.1)) * -1 + w * 0.06 * (inkFbm2(seed, t * 3, 2, 2) - 0.5), (t < 0.06 ? 0.7 + t * 5 : 1 - 0.28 * t) * (0.94 + 0.12 * inkFbm2(seed + 2, t * 5, 1, 2))] as const; }), w, { tip: o.ink ?? 0.95, belly: 0.8, side: 1, head: 0.3, rim: 0.05, dry: 0.1, dryEnd: o.dry ?? 1.15, bristles: 44, grain: 1.2, seed }); } }] };
}
/** A line under a word. */
export function inkUnderline(o: InkMarkOptions & { length?: number; width?: number } = {}): InkSubject {
  const L = o.length ?? 600, w = o.width ?? 16, seed = o.seed ?? 1, W = L + 60, H = w * 5 + 30, plate = o.pigment ?? "cinnabar";
  return { id: `underline-${seed}`, label: "A brushed line", page: { width: W, height: H }, plates: plates(plate), seed, parts: [{ id: "line", draw: ({ page: p }) => inkSide(p, plate, Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [30 + L * t, H / 2 + w * 0.7 * Math.sin(t * 5 + seed) * (1 - t * 0.6), (t < 0.1 ? 0.5 + 5 * t : 1 - 0.55 * t)] as const; }), w, { tip: o.ink ?? 0.95, belly: 0.7, side: 1, head: 0.4, rim: 0.1, dry: 0.06, dryEnd: o.dry ?? 0.95, seed }) }] };
}
/** An arrow in two strokes. `bend` bows it, as a share of its length. */
export function inkArrow(o: InkMarkOptions & { length?: number; width?: number; bend?: number } = {}): InkSubject {
  const L = o.length ?? 520, w = o.width ?? 26, b = (o.bend ?? 0.14) * L, seed = o.seed ?? 1, W = L + 120, H = Math.abs(b) * 1.4 + w * 6 + 80, plate = o.pigment ?? "ink", y = H / 2 + b * 0.5, head = w * 3.4;
  return { id: `arrow-${seed}`, label: "A brushed arrow", page: { width: W, height: H }, plates: plates(plate), seed, parts: [{ id: "arrow", draw: ({ page: p }) => {
    const pts: PenNode[] = Array.from({ length: 11 }, (_, i) => { const t = i / 10; return [50 + L * t, y - b * 4 * t * (1 - t) * 0.5, (t < 0.08 ? 0.6 + 5 * t : 1 - 0.4 * t)] as const; }), e = pts[10], f = pts[9], a = Math.atan2(e[1] - f[1], e[0] - f[0]);
    inkSide(p, plate, pts, w, { tip: o.ink ?? 0.95, belly: 0.7, side: 1, head: 0.35, rim: 0.1, dry: 0.08, dryEnd: o.dry ?? 0.8, seed });
    for (const s of [1, -1]) { const r = a + Math.PI + s * 0.5; inkSide(p, plate, s > 0 ? [[e[0] + Math.cos(r) * head, e[1] + Math.sin(r) * head, 0.5], [e[0] + Math.cos(r) * head * 0.5, e[1] + Math.sin(r) * head * 0.46, 0.9], [e[0] + Math.cos(a) * w * 0.4, e[1] + Math.sin(a) * w * 0.4, 0.8]] : [[e[0] + Math.cos(a) * w * 0.4, e[1] + Math.sin(a) * w * 0.4, 0.9], [e[0] + Math.cos(r) * head * 0.5, e[1] + Math.sin(r) * head * 0.46, 0.9], [e[0] + Math.cos(r) * head * 1.05, e[1] + Math.sin(r) * head * 1.05, 0.3]], w * 0.9, { tip: o.ink ?? 0.95, belly: 0.7, side: s as 1 | -1, head: 0.3, dry: 0.08, dryEnd: 0.8, seed: seed + 3 + s }); }
  } }] };
}
/** Ink thrown at the paper 潑墨: a pool, runs out of it, and drops. */
export function inkSplash(o: InkMarkOptions & { radius?: number; /** Runs out of the pool. */ runs?: number; drops?: number } = {}): InkSubject {
  const R = o.radius ?? 260, seed = o.seed ?? 1, size = R * 4, c = size / 2, plate = o.pigment ?? "ink", r = inkRandom(seed);
  return { id: `splash-${seed}`, label: "Splashed ink", page: { width: size, height: size }, plates: plates(plate), seed, parts: [{ id: "pool", draw: ({ page: p }) => {
    const n = 46, spikes = Array.from({ length: o.runs ?? 9 }, () => ({ a: r.next() * 6.283, l: r.in(0.2, 1), w: r.in(0.035, 0.11) }));
    const ring = Array.from({ length: n * 3 }, (_, i) => { const a = (i / (n * 3)) * 6.283; let k = 0.72 + 0.4 * (inkFbm2(seed + 2, Math.cos(a) * 1.5 + 4, Math.sin(a) * 1.5 + 4, 3) - 0.5); for (const s of spikes) { const d = Math.abs(Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a))) / s.w; if (d < 3) k += s.l * Math.exp(-d * d) * 0.8; } return p.at(c + Math.cos(a) * k * R, c + Math.sin(a) * k * R * 0.86); });
    inkBloom(p, plate, ring, { tone: (X, Y) => { const [x, y] = p.local(X, Y), n2 = inkFbm2(seed + 6, x / (R * 0.5), y / (R * 0.5), 4); return (o.ink ?? 0.95) * (0.34 + 0.95 * n2 * n2 * 1.6); }, soft: 2, wander: R * 0.02, wave: R * 0.16, fringe: 3, rim: 0.55, rimWidth: R * 0.05, mottle: 0.6, cloud: R * 0.3, seed });
    for (const s of spikes) { const x = c + Math.cos(s.a) * R * (0.9 + s.l * 0.9), y = c + Math.sin(s.a) * R * 0.86 * (0.9 + s.l * 0.9); inkSplatter(p, plate, { x, y, spread: [R * 0.22, R * 0.22], n: 4, radius: [1.5, R * 0.05], seed: seed + Math.round(s.a * 100) }); }
    inkSplatter(p, plate, { x: c, y: c, spread: [R * 1.8, R * 1.6], n: o.drops ?? 46, radius: [1.2, R * 0.045], seed: seed + 9 });
  } }] };
}
/** A tick, or a cross. */
export function inkTick(o: InkMarkOptions & { size?: number; kind?: "tick" | "cross" } = {}): InkSubject {
  const s = o.size ?? 240, seed = o.seed ?? 1, W = s * 1.5, plate = o.pigment ?? "cinnabar", w = s * 0.16, k = o.kind ?? "tick", strokes: PenNode[][] = k === "tick" ? [[[W * 0.2, W * 0.52, 0.5], [W * 0.32, W * 0.62, 0.8], [W * 0.42, W * 0.78, 1], [W * 0.56, W * 0.5, 0.8], [W * 0.86, W * 0.16, 0.3]]] : [[[W * 0.24, W * 0.24, 0.8], [W * 0.5, W * 0.52, 1], [W * 0.8, W * 0.8, 0.5]], [[W * 0.78, W * 0.2, 0.8], [W * 0.5, W * 0.48, 1], [W * 0.2, W * 0.82, 0.4]]];
  return { id: `${k}-${seed}`, label: k === "tick" ? "A tick" : "A cross", page: { width: W, height: W }, plates: plates(plate), seed, parts: [{ id: k, draw: ({ page: p }) => strokes.forEach((q, i) => inkSide(p, plate, q, w, { tip: o.ink ?? 0.96, belly: 0.75, side: 1, head: 0.4, rim: 0.1, dry: 0.05, dryEnd: o.dry ?? 0.9, seed: seed + i })) }] };
}
