/**
 * INK-FILM1 places: the small built things that give a landscape its scale and its people 點景 — a boat and its boatman, a pavilion, a
 * pagoda, a bridge, houses with white walls and black tiles.
 *
 * Each is ruled by hand, not with a ruler: lines bow a little, a roof is a few loaded strokes with the tiles drawn down it, and the wall is
 * the paper.
 */
import { inkFbm2 } from "../ink-riso-press";
import type { InkRisoPen, PenNode, PenPoint } from "../ink-riso-pen";
import { inkBloom, inkSide, inkThread } from "../ink-riso-wet";
import type { InkPart, InkSubject } from "./ink-cel";
import { inkRandom } from "./ink-brush-kit";
import { inkPlates } from "./ink-pigments";
import type { InkPigment } from "./ink-pigments";
import { inkVeilShape } from "./ink-veil";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a || 1e-9))); return t * t * (3 - 2 * t); };
/** A hand-ruled line: bows a little, pressed at the ends. */
const rule = (p: InkRisoPen, a: PenPoint, b: PenPoint, width: number, ink: number, seed: number, bow = 0.006) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = inkFbm2(seed, 1.3, 2.7, 2) - 0.5, k = bow * (n > 0 ? 1 : -1) * 2; inkThread(p, "ink", [[a[0], a[1], 1], [a[0] + dx * 0.35 - dy * k, a[1] + dy * 0.35 + dx * k, 0.82], [a[0] + dx * 0.7 - dy * k * 0.6, a[1] + dy * 0.7 + dx * k * 0.6, 0.78], [b[0], b[1], 0.95]], width, { ink, inkEnd: ink * 0.85, seed, tremor: 0.5 }); };
const along = (q: readonly PenPoint[], t: number): PenPoint => { const k = Math.max(0, Math.min(1, t)) * (q.length - 1), i = Math.min(q.length - 2, Math.floor(k)), f = k - i; return [lerp(q[i][0], q[i + 1][0], f), lerp(q[i][1], q[i + 1][1], f)]; };
const flip = (q: readonly PenPoint[]) => [...q].reverse();
/** Strokes across the water under something, broken, shorter away from it. */
function shimmer(p: InkRisoPen, x: number, y: number, half: number, depth: number, n: number, ink: number, seed: number) {
  const r = inkRandom(seed);
  for (let i = 0; i < n; i++) { const t = i / n, w = half * lerp(1, 0.35, t) * r.in(0.5, 1), cx = x + (r.next() - 0.5) * half * 0.7, Y = y + depth * t + r.in(-2, 2); inkSide(p, "ink", Array.from({ length: 6 }, (_, j) => [cx - w + (2 * w * j) / 5, Y + (r.next() - 0.5) * 2.4, Math.sin(Math.PI * (0.1 + 0.8 * (j / 5)))] as const), r.in(3, 8), { tip: ink * lerp(1, 0.35, t), belly: ink * 0.3, side: 1, head: 0.1, rim: 0, dry: 0.3, dryEnd: 1, seed: seed * 3 + i }); }
}

export interface InkBoatOptions { seed?: number; /** A boatman with a pole at the stern. */ boatman?: boolean; /** A mat awning amidships. */ awning?: boolean; lantern?: boolean; pigment?: InkPigment }
/** A river boat, broadside on, with its boatman. */
export function inkBoat(o: InkBoatOptions = {}): InkSubject {
  const seed = o.seed ?? 1, W = 720, H = 460, wl = 330, man = o.boatman ?? true, awning = o.awning ?? true;
  const gunwale: PenPoint[] = [[92, 262], [180, 290], [300, 304], [420, 304], [530, 292], [632, 258]], keel: PenPoint[] = [[104, 268], [150, 306], [230, 328], [350, 334], [470, 330], [560, 308], [620, 268]];
  return { id: "boat", label: man ? "A river boat and its boatman" : "A river boat", page: { width: W, height: H }, plates: inkPlates([o.pigment ?? "ochre", "cinnabar", "ink"]), seed, parts: [
    { id: "water", box: [40, 300, 640, 150], motion: [{ kind: "ripple", amount: 2.2, length: 150, seconds: 3.4, still: 0 }], draw: ({ page: p }) => { shimmer(p, 362, wl + 10, 250, 92, 15, 0.62, seed + 60); inkBloom(p, "ink", [...Array.from({ length: 20 }, (_, i) => p.at(130 + 23 * i, wl + 4)), ...Array.from({ length: 20 }, (_, i) => p.at(567 - 23 * i, wl + 66 + 10 * Math.sin(i)))], { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.3 * ss(wl + 66, wl, y) * ss(120, 230, x) * ss(590, 480, x) * (0.4 + inkFbm2(seed, x / 120, y / 10, 2)); }, soft: 5, wander: 2, mottle: 0.4, seed }); } },
    { id: "boat", box: [60, 20, 640, 330], group: "boat", motion: [{ kind: "turn", at: [360, wl], degrees: 0.7, seconds: 4.6 }], draw: ({ page: p }) => {
      const plate = o.pigment ?? "ochre", hull = p.shape([...gunwale, ...flip(keel)], true);
      if (man) {
        // the boatman: straw hat and cape, leaning on the pole
        rule(p, [436, 66], [640, 366], 3, 0.8, seed + 1, 0.003);
        for (const [x0, x1, t] of [[580, 570, 0.62], [594, 602, 0.85]] as const) inkSide(p, "ink", [[x0, 228, 0.9], [lerp(x0, x1, 0.5) + 2, 256, 1], [x1, 284, 0.8]], 19, { tip: t, belly: t * 0.55, side: 1, head: 0.4, rim: 0, dry: 0.1, dryEnd: 0.4, seed: seed + x0 });
        const back: PenPoint[] = [[556, 172], [574, 160], [594, 170], [608, 196], [618, 236], [598, 246], [572, 244], [562, 222], [556, 196]];
        inkVeilShape(p, p.shape(back), 1);
        inkBloom(p, plate, p.shape(back), { tone: 0.34, soft: 1, wander: 0.4, fringe: 0.5, rim: 0.2, mottle: 0.4, seed: seed + 2 });
        inkBloom(p, "ink", p.shape(back), { tone: (X, Y) => { const [x] = p.local(X, Y); return 0.16 + 0.4 * ss(566, 616, x); }, soft: 1, wander: 0.4, fringe: 0.5, mottle: 0.5, seed: seed + 3 });
        for (let i = 0; i < 13; i++) { const u = i / 12, r = inkFbm2(seed + 4, i * 3.1, 1, 2); inkThread(p, "ink", [[lerp(566, 590, u), 168, 0.4], [lerp(560, 606, u), 204, 1], [lerp(558, 622, u), 238 + 16 * r, 0.3]], 2.6, { ink: 0.45 + 0.5 * u, inkEnd: 0.3, seed: seed + 100 + i, tremor: 0.7 }); }
        for (const [hx, hy, sx, sy] of [[540, 218, 570, 194], [523, 193, 564, 182]] as const) { inkSide(p, "ink", [[sx, sy, 0.8], [lerp(sx, hx, 0.5), lerp(sy, hy, 0.5) + 5, 1], [hx + 5, hy + 1, 0.7]], 14, { tip: 0.82, belly: 0.4, side: 1, head: 0.3, rim: 0, dry: 0.1, dryEnd: 0.3, seed: seed + hx }); inkBloom(p, plate, p.disc(hx, hy, 6.5), { tone: 0.6, soft: 0.8, wander: 0, fringe: 0.5, rim: 0.3, seed: seed + hy }); }
        inkBloom(p, plate, p.shape([[540, 148], [552, 144], [566, 148], [570, 164], [562, 174], [548, 172], [541, 162]]), { tone: 0.52, soft: 0.8, wander: 0.3, fringe: 0.5, rim: 0.4, seed: seed + 6 });
        inkSide(p, "ink", [[571, 150, 0.7], [573, 162, 1], [568, 172, 0.5]], 8, { tip: 0.9, belly: 0.6, side: 1, dry: 0.1, seed: seed + 7 });
        const brim: PenPoint[] = [[508, 160], [536, 130], [552, 114], [558, 114], [578, 128], [600, 150], [562, 152], [530, 158]];
        inkVeilShape(p, p.shape(brim), 1); inkBloom(p, plate, p.shape(brim), { tone: (X, Y) => { const [x] = p.local(X, Y); return 0.3 + 0.25 * ss(540, 600, x); }, soft: 0.8, wander: 0.3, fringe: 0.5, rim: 0.4, mottle: 0.4, seed: seed + 5 });
        for (let i = 0; i < 9; i++) rule(p, [555, 116], [lerp(512, 596, i / 8), lerp(159, 150, i / 8)], 1.2, 0.4 + 0.04 * i, seed + 70 + i);
        inkSide(p, "ink", [[506, 162, 0.4], [534, 133, 0.9], [555, 112, 0.6], [580, 130, 1], [602, 151, 0.6]], 4.4, { tip: 0.92, belly: 0.5, side: 0, seed: seed + 8, dry: 0.08 });
        inkSide(p, "ink", [[506, 162, 0.5], [532, 160, 1], [566, 154, 1], [602, 151, 0.5]], 3.4, { tip: 0.85, belly: 0.5, side: 0, seed: seed + 9, dry: 0.12 });
      }
      inkVeilShape(p, hull, 1);
      inkBloom(p, plate, hull, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.2 + 0.2 * inkFbm2(seed + 3, x / 120, y / 8, 2); }, soft: 1, wander: 0.6, rim: 0.2, mottle: 0.4, seed: seed + 8 });
      inkBloom(p, "ink", hull, { tone: (X, Y) => { const [x, y] = p.local(X, Y), t = (x - 92) / 540, g = along(gunwale, t)[1], k = along(keel, t)[1]; return 0.08 + 0.75 * ss(0.15, 1, (y - g) / (k - g + 1)); }, soft: 1, wander: 0.6, rim: 0.3, mottle: 0.5, seed: seed + 9 });
      inkSide(p, "ink", keel.map(([x, y], i) => [x, y - 6, i === 0 || i === keel.length - 1 ? 0.25 : 1] as const), 24, { tip: 0.98, belly: 0.25, side: 1, head: 0.2, rim: 0, dry: 0.08, dryEnd: 0.55, seed: seed + 10 });
      inkSide(p, "ink", gunwale.map(([x, y], i) => [x, y, [0.9, 0.8, 0.7, 0.75, 0.85, 1][i]] as const), 5.4, { tip: 0.95, belly: 0.6, side: 0, dry: 0.08, dryEnd: 0.4, seed: seed + 11 });
      rule(p, [122, 283], [300, 314], 1.6, 0.62, seed + 12); rule(p, [300, 314], [430, 314], 1.6, 0.62, seed + 13); rule(p, [430, 314], [600, 280], 1.6, 0.62, seed + 14);
      if (awning) {
        const roof: PenPoint[] = [[236, 296], [232, 250], [252, 214], [300, 196], [372, 194], [424, 208], [448, 244], [446, 298]], end: PenPoint[] = [[402, 300], [400, 256], [412, 222], [424, 208], [448, 244], [446, 298]];
        inkVeilShape(p, p.shape([...roof, [340, 306]]), 1);
        inkBloom(p, plate, p.shape([...roof, [340, 306]]), { tone: (X, Y) => 0.34 + 0.2 * inkFbm2(seed + 5, X / 30, Y / 30, 2), soft: 1, wander: 1, rim: 0.3, mottle: 0.5, seed: seed + 15 });
        inkBloom(p, "ink", p.shape([...roof, [340, 306]]), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.1 + 0.34 * ss(250, 300, y) + 0.2 * ss(330, 440, x); }, soft: 1, wander: 1, mottle: 0.5, seed: seed + 16 });
        for (let i = 0; i < 8; i++) { const x = 252 + i * 21, top = 196 + (i < 2 ? (2 - i) * 9 : 0) + (i > 5 ? (i - 5) * 4 : 0); inkThread(p, "ink", [[x - 4, 300, 0.6], [x - 6, 250, 1], [x + 6, top + 2, 0.7]], 1.7, { ink: 0.58, inkEnd: 0.4, seed: seed + 20 + i, tremor: 0.7 }); }
        for (let i = 0; i < 4; i++) inkThread(p, "ink", [[236, 284 - i * 22, 0.7], [320, 279 - i * 25, 1], [404, 286 - i * 22, 0.7]], 1.4, { ink: 0.46, inkEnd: 0.36, seed: seed + 30 + i, tremor: 0.7 });
        inkBloom(p, "ink", p.shape(end), { tone: 0.72, soft: 1.4, wander: 1, rim: 0.2, mottle: 0.4, seed: seed + 17 });
        inkSide(p, "ink", roof.map(([x, y], i) => [x, y, i === 0 || i === roof.length - 1 ? 0.5 : 1] as const), 5, { tip: 0.94, belly: 0.5, side: 0, dry: 0.1, dryEnd: 0.4, seed: seed + 18 });
      }
      if (o.lantern) { rule(p, [116, 270], [104, 176], 2.4, 0.8, seed + 40); inkBloom(p, "cinnabar", p.disc(106, 196, 17), { tone: 0.95, soft: 0.8, wander: 0.3, fringe: 0.5, rim: 0.3, mottle: 0.3, seed: seed + 41 }); rule(p, [98, 180], [114, 180], 3, 0.9, seed + 42); rule(p, [99, 213], [113, 213], 2.6, 0.9, seed + 43); }
    } },
  ] };
}

export interface InkPavilionOptions { seed?: number; pigment?: InkPigment; /** Strength of the ink. */ ink?: number }
/** An open pavilion with a pointed roof and upturned eaves. */
export function inkPavilion(o: InkPavilionOptions = {}): InkSubject {
  const seed = o.seed ?? 1, W = 640, H = 620, k = o.ink ?? 1, plate = o.pigment ?? "umber", peak: PenPoint = [320, 96];
  // eave corners: far left, near left, near right, far right; the near ones kick up and out
  const L: PenPoint = [78, 238], N: PenPoint = [214, 292], R: PenPoint = [438, 290], F: PenPoint = [566, 234];
  const hip = (c: PenPoint, sag: number): PenPoint[] => [peak, [lerp(peak[0], c[0], 0.22), lerp(peak[1], c[1], 0.4) + sag * 0.5], [lerp(peak[0], c[0], 0.58), lerp(peak[1], c[1], 0.78) + sag], [lerp(peak[0], c[0], 0.88), lerp(peak[1], c[1], 0.98) + sag * 0.6], [c[0] + (c[0] < 320 ? -14 : 14), c[1] - 16]];
  const eave = (a: PenPoint, b: PenPoint, sag: number): PenPoint[] => [[a[0], a[1] - 14], [lerp(a[0], b[0], 0.14), lerp(a[1], b[1], 0.14) + sag * 0.5], [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) + sag], [lerp(a[0], b[0], 0.86), lerp(a[1], b[1], 0.86) + sag * 0.5], [b[0], b[1] - 14]];
  const floor = 520;
  return { id: "pavilion", label: "An open pavilion", page: { width: W, height: H }, plates: inkPlates([plate, "ink"]), seed, parts: [{ id: "pavilion", draw: ({ page: p }) => {
    let s = seed * 40;
    const posts: [number, number, number, number][] = [[122, 250, floor - 22, 0.6], [228, 296, floor + 8, 1], [424, 296, floor + 8, 1], [522, 246, floor - 22, 0.6], [290, 270, floor - 40, 0.42], [356, 270, floor - 40, 0.42]];
    // floor and steps
    const plat: PenPoint[] = [[78, floor - 18], [206, floor + 16], [446, floor + 16], [566, floor - 18], [566, floor + 10], [446, floor + 50], [206, floor + 50], [78, floor + 10]];
    inkVeilShape(p, plat.map(q => p.at(...q)), 1);
    inkBloom(p, "ink", plat.map(q => p.at(...q)), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return k * (0.08 + 0.22 * ss(380, 560, x) + 0.1 * inkFbm2(seed + 2, x / 40, y / 20, 2)) * ss(floor + 60, floor, y); }, soft: 1, wander: 1, rim: 0.2, mottle: 0.5, seed: s++ });
    for (const [a, b] of [[plat[0], plat[1]], [plat[1], plat[2]], [plat[2], plat[3]]] as const) rule(p, a, b, 3.6, 0.85 * k, s++);
    rule(p, plat[7], plat[6], 4.6, 0.8 * k, s++); rule(p, plat[6], plat[5], 5, 0.88 * k, s++); rule(p, plat[5], plat[4], 4.6, 0.8 * k, s++); rule(p, plat[1], plat[6], 3, 0.7 * k, s++); rule(p, plat[2], plat[5], 3, 0.7 * k, s++); rule(p, plat[0], plat[7], 3, 0.6 * k, s++); rule(p, plat[3], plat[4], 3, 0.6 * k, s++);
    // posts and rails
    for (const [x, y0, y1, m] of [...posts].sort((a, b) => a[3] - b[3])) { const w = lerp(6, 12, m), q = [p.at(x - w / 2, y0), p.at(x + w / 2, y0), p.at(x + w / 2, y1), p.at(x - w / 2, y1)]; inkVeilShape(p, q, 1); inkBloom(p, plate, q, { tone: 0.5 * lerp(0.6, 1, m), soft: 0.6, wander: 0.2, fringe: 0.5, rim: 0.4, mottle: 0.4, seed: s++ }); inkSide(p, "ink", [[x + w * 0.28, y0, 0.8], [x + w * 0.24, (y0 + y1) / 2, 1], [x + w * 0.28, y1, 0.9]], w * 0.62, { tip: 0.9 * k * lerp(0.6, 1, m), belly: 0.2, side: 1, head: 0.1, dry: 0.2, dryEnd: 0.6, seed: s++ }); rule(p, [x - w / 2, y0], [x - w / 2, y1], 1.5, 0.6 * k, s++); }
    const rail = (a: PenPoint, b: PenPoint, gap: boolean) => { for (const d of [-64, -44]) if (!gap) rule(p, [a[0], a[1] + d], [b[0], b[1] + d], d === -64 ? 3.2 : 2, 0.78 * k, s++); if (!gap) for (let i = 1; i < 7; i++) { const x = lerp(a[0], b[0], i / 7), y = lerp(a[1], b[1], i / 7); rule(p, [x, y - 44], [x, y - 4], 1.8, 0.62 * k, s++); } };
    rail([122, floor - 22], [228, floor + 8], false); rail([424, floor + 8], [522, floor - 22], false);
    // roof: two faces and the near one, tiles drawn down them to the eave
    const face = (a: PenPoint, b: PenPoint, sagA: number, sagB: number, sag: number, shade: number) => {
      const ha = hip(a, sagA), hb = hip(b, sagB), e = eave(a, b, sag), shape = [...ha, ...e, ...flip(hb)], q = p.shape(shape.map(v => v), true);
      inkVeilShape(p, q, 1);
      inkBloom(p, "ink", q, { tone: (X, Y) => { const [x, y] = p.local(X, Y), t = (y - peak[1]) / (e[2][1] - peak[1]); return k * lerp(0.26, 0.6, shade) * (0.62 + 0.5 * t) * (0.7 + 0.6 * inkFbm2(seed + 7, x / 60, y / 60, 2)); }, soft: 1, wander: 1, rim: 0.3, rimWidth: 4, mottle: 0.5, cloud: 30, seed: s++ });
      for (let i = 1; i < 12; i++) { const u = i / 12, top: PenPoint = along(ha, 0.04 + 0.1 * Math.abs(u - 0.5)), m: PenPoint = [lerp(along(ha, 0.5)[0], along(hb, 0.5)[0], u), lerp(along(ha, 0.5)[1], along(hb, 0.5)[1], u) + 8 * Math.sin(Math.PI * u)], end = along(e, u); inkThread(p, "ink", [[lerp(peak[0], top[0], 0.4), peak[1] + 18, 0.3], [m[0], m[1], 0.9], [end[0], end[1], 1]], 3, { ink: 0.8 * k, inkEnd: 0.9 * k, seed: s++, tremor: 0.8 }); }
      inkSide(p, "ink", e.map(([x, y], i) => [x, y, [0.5, 0.9, 1, 0.9, 0.5][i]] as const), 11, { tip: 0.98 * k, belly: 0.5, side: 1, head: 0.2, dry: 0.08, dryEnd: 0.4, seed: s++ });
    };
    face(L, N, 10, 16, 12, 0.35); face(R, F, 16, 10, 12, 1); face(N, R, 16, 16, 15, 0.62);
    for (const [c, sag] of [[L, 10], [F, 10], [N, 16], [R, 16]] as const) inkSide(p, "ink", hip(c, sag).map(([x, y], i) => [x, y, [0.55, 0.8, 0.95, 1, 0.35][i]] as const), 12, { tip: 0.98 * k, belly: 0.6, side: 1, head: 0.2, rim: 0.1, dry: 0.06, dryEnd: 0.35, seed: s++ });
    // finial
    inkBloom(p, "ink", p.shape([[320, 44], [331, 62], [326, 74], [336, 90], [320, 104], [304, 90], [314, 74], [309, 62]]), { tone: 0.95 * k, soft: 0.8, wander: 0.4, fringe: 0.5, rim: 0.2, seed: s++ });
    // beams under the eave
    rule(p, [122, 262], [228, 308], 4.6, 0.85 * k, s++); rule(p, [228, 310], [424, 310], 5, 0.9 * k, s++); rule(p, [424, 308], [522, 260], 4.6, 0.85 * k, s++);
  } }] };
}

export interface InkPagodaOptions { seed?: number; tiers?: number; ink?: number }
/** A tall pagoda, far off: the eaves are single strokes. */
export function inkPagoda(o: InkPagodaOptions = {}): InkSubject {
  const seed = o.seed ?? 1, n = o.tiers ?? 7, W = 360, H = 1000, k = o.ink ?? 1, foot = 950, top = 190, tall = (foot - top) / n;
  return { id: "pagoda", label: "A pagoda", page: { width: W, height: H }, plates: inkPlates(["ink"]), seed, parts: [{ id: "pagoda", draw: ({ page: p }) => {
    let s = seed * 50; const cx = W / 2, half = (i: number) => lerp(88, 44, i / (n - 1));
    for (let i = 0; i < n; i++) {
      const y1 = foot - tall * i, y0 = y1 - tall, w = half(i), e = w * 1.46, ey = y0 + tall * 0.2, body = [p.at(cx - w, ey), p.at(cx + w, ey), p.at(cx + w * 1.02, y1), p.at(cx - w * 1.02, y1)];
      inkVeilShape(p, body, 1);
      inkBloom(p, "ink", body, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return k * (0.06 + 0.4 * ss(-0.1, 1, (x - cx) / w) + 0.3 * ss(tall * 0.4, 0, y - ey)) * (0.7 + 0.5 * inkFbm2(seed + 4, x / 24, y / 24, 2)); }, soft: 1, wander: 0.6, rim: 0.1, mottle: 0.5, seed: s++ });
      rule(p, [cx - w, ey], [cx - w, y1], 2, 0.6 * k, s++); rule(p, [cx + w, ey], [cx + w * 1.01, y1], 4, 0.85 * k, s++);
      for (const u of [-0.36, 0.36]) rule(p, [cx + w * u, ey + 4], [cx + w * u, y1], 1.4, 0.5 * k, s++);
      inkBloom(p, "ink", p.shape([[cx - w * 0.14, y1 - 2], [cx - w * 0.14, y1 - tall * 0.34], [cx, y1 - tall * 0.46], [cx + w * 0.14, y1 - tall * 0.34], [cx + w * 0.14, y1 - 2]]), { tone: 0.8 * k, soft: 0.8, wander: 0.3, fringe: 0.5, seed: s++ });
      if (i) { rule(p, [cx - w * 1.12, y1 - tall * 0.16], [cx + w * 1.12, y1 - tall * 0.16], 1.6, 0.6 * k, s++); for (let j = 0; j < 9; j++) { const x = cx + w * 1.08 * (j / 4 - 1); rule(p, [x, y1 - tall * 0.16], [x, y1], 1.1, 0.5 * k, s++); } }
      // eave: one loaded stroke, its ends kicked up, and the roof above it
      const roof = p.shape([[cx - e, ey - tall * 0.02], [cx - w * 0.9, ey - tall * 0.17], [cx - w * 0.72, ey - tall * 0.26], [cx + w * 0.72, ey - tall * 0.26], [cx + w * 0.9, ey - tall * 0.17], [cx + e, ey - tall * 0.02], [cx + w * 0.5, ey + tall * 0.04], [cx - w * 0.5, ey + tall * 0.04]]);
      inkVeilShape(p, roof, 1); inkBloom(p, "ink", roof, { tone: 0.5 * k, soft: 1, wander: 1, rim: 0.3, mottle: 0.5, seed: s++ });
      for (let j = 1; j < 10; j++) { const u = j / 5 - 1; rule(p, [cx + w * 0.7 * u, ey - tall * 0.24], [cx + e * 0.9 * u, ey - 1], 1.4, 0.75 * k, s++); }
      inkSide(p, "ink", [[cx - e * 1.06, ey - tall * 0.16, 0.2], [cx - e * 0.9, ey - tall * 0.02, 0.9], [cx - w * 0.5, ey + tall * 0.03, 1], [cx + w * 0.5, ey + tall * 0.03, 1], [cx + e * 0.9, ey - tall * 0.02, 0.9], [cx + e * 1.06, ey - tall * 0.16, 0.2]], 9, { tip: 0.98 * k, belly: 0.6, side: 1, head: 0.1, dry: 0.06, dryEnd: 0.3, seed: s++ });
    }
    const y0 = top + tall * 0.2, w = half(n - 1);
    const cap = p.shape([[cx - w * 1.4, y0 - 2], [cx - w * 0.5, y0 - 26], [cx, y0 - 64], [cx + w * 0.5, y0 - 26], [cx + w * 1.4, y0 - 2], [cx, y0 + 6]]); inkVeilShape(p, cap, 1); inkBloom(p, "ink", cap, { tone: 0.62 * k, soft: 1, wander: 0.8, rim: 0.3, mottle: 0.4, seed: s++ });
    for (let j = 1; j < 8; j++) { const u = j / 4 - 1; rule(p, [cx, y0 - 58], [cx + w * 1.3 * u, y0 - 2], 1.4, 0.75 * k, s++); }
    inkSide(p, "ink", [[cx - w * 1.56, y0 - 18, 0.2], [cx - w * 1.2, y0 - 4, 0.9], [cx, y0 + 5, 1], [cx + w * 1.2, y0 - 4, 0.9], [cx + w * 1.56, y0 - 18, 0.2]], 9, { tip: 0.98 * k, belly: 0.6, side: 1, seed: s++, dry: 0.05, dryEnd: 0.3 });
    rule(p, [cx, y0 - 60], [cx, y0 - 170], 4, 0.95 * k, s++); for (let j = 0; j < 5; j++) { const r = 15 - 2.4 * j; inkBloom(p, "ink", p.shape([[cx - r, y0 - 84 - j * 16], [cx, y0 - 89 - j * 16], [cx + r, y0 - 84 - j * 16], [cx, y0 - 79 - j * 16]]), { tone: 0.92 * k, soft: 0.6, wander: 0.2, fringe: 0.5, seed: s++ }); }
  } }] };
}

export interface InkBridgeOptions { seed?: number; ink?: number; /** Arches. */ arches?: 1 | 3; reflection?: boolean }
/** A humped stone bridge; its arch and the reflection of it make a circle. */
export function inkBridge(o: InkBridgeOptions = {}): InkSubject {
  const seed = o.seed ?? 1, W = 1100, H = 620, k = o.ink ?? 1, wl = 400, crest = 150, deck = (x: number) => wl - 26 - (wl - 26 - crest) * Math.exp(-(((x - 550) / 270) ** 2)), arches = o.arches === 3 ? [{ x: 550, r: 108 }, { x: 330, r: 62 }, { x: 770, r: 62 }] : [{ x: 550, r: 132 }];
  const deckLine = (x0: number, x1: number, d = 0, n = 24): PenPoint[] => Array.from({ length: n + 1 }, (_, i) => { const x = lerp(x0, x1, i / n); return [x, deck(x) + d]; });
  const parts: InkPart[] = [{ id: "bridge", box: [40, 60, 1020, 360], draw: ({ page: p }) => {
    let s = seed * 60; const arc = (a: { x: number; r: number }, r = a.r): PenPoint[] => Array.from({ length: 17 }, (_, i) => { const t = Math.PI * (1 - i / 16); return [a.x + Math.cos(t) * r, wl - Math.sin(t) * r]; });
    const body: PenPoint[] = [...deckLine(70, 1030), [1030, wl], ...[...arches].sort((a, b) => b.x - a.x).flatMap(a => flip(arc(a))), [70, wl]], q = body.map(v => p.at(...v));
    inkVeilShape(p, q, 1);
    inkBloom(p, "ink", q, { tone: (X, Y) => { const [x, y] = p.local(X, Y), n = inkFbm2(seed + 3, x / 60, y / 34, 3); return k * (0.06 + 0.2 * ss(0.4, 0.72, n) + 0.16 * ss(wl - 110, wl, y)) * ss(60, 220, x) * ss(1040, 880, x); }, soft: 1.2, wander: 1, rim: 0.1, mottle: 0.6, cloud: 40, seed: s++ });
    // courses of stone, broken
    const r = inkRandom(seed + 9);
    for (let i = 0; i < 90; i++) { const x = r.in(120, 980), y = r.in(deck(x) + 22, wl - 8); if (arches.some(a => Math.hypot(x - a.x, y - wl) < a.r + 34)) continue; const w = r.in(14, 40); rule(p, [x, y], [x + w, y + (deck(x + w) - deck(x)) * 0.5], 1.5, r.in(0.22, 0.6) * k, s++); if (r.chance(0.5)) rule(p, [x, y], [x + 1, y + 12], 1.3, 0.36 * k, s++); }
    for (const a of arches) { for (let i = 0; i <= 14; i++) { const t = Math.PI * (i / 14), c = Math.cos(t), d = Math.sin(t); rule(p, [a.x + c * a.r, wl - d * a.r], [a.x + c * (a.r + 20), wl - d * (a.r + 20)], 1.7, 0.6 * k, s++); } for (const [e, w, t] of [[0, 8, 0.95], [21, 3, 0.7]] as const) inkSide(p, "ink", arc(a, a.r + e).map(([x, y], i) => [x, y, 0.7 + 0.3 * Math.sin(i * 1.7)] as const), w, { tip: t * k, belly: 0.5, side: 0, dry: 0.12, dryEnd: 0.4, seed: s++ }); }
    inkSide(p, "ink", deckLine(64, 1036).map(([x, y], i) => [x, y, 0.75 + 0.25 * Math.sin(i * 0.9 + 1)] as const), 7, { tip: 0.95 * k, belly: 0.5, side: 0, dry: 0.12, dryEnd: 0.5, seed: s++ });
    inkSide(p, "ink", deckLine(90, 1010, 14).map(([x, y]) => [x, y, 0.8] as const), 2.4, { tip: 0.6 * k, belly: 0.3, side: 0, dry: 0.3, dryEnd: 0.7, seed: s++ });
    // parapet: slabs between posts
    for (let i = 0; i <= 20; i++) { const x = lerp(120, 980, i / 20), y = deck(x), q2 = [p.at(x - 5, y - 46), p.at(x + 5, y - 46), p.at(x + 5, y + 2), p.at(x - 5, y + 2)]; if (i < 20) { const x1 = lerp(120, 980, (i + 1) / 20), y1 = deck(x1), slab = [p.at(x, y - 34), p.at(x1, y1 - 34), p.at(x1, y1), p.at(x, y)]; inkVeilShape(p, slab, 1); rule(p, [x, y - 34], [x1, y1 - 34], 2.8, 0.85 * k, s++); rule(p, [x, y - 10], [x1, y1 - 10], 1.3, 0.45 * k, s++); } inkVeilShape(p, q2, 1); rule(p, [x - 4, y - 44], [x - 4, y], 1.6, 0.7 * k, s++); rule(p, [x + 4, y - 44], [x + 4, y], 3.4, 0.9 * k, s++); inkBloom(p, "ink", p.disc(x, y - 48, 7), { tone: 0.75 * k, soft: 0.8, wander: 0.3, fringe: 0.5, seed: s++ }); }
  } }];
  if (o.reflection !== false) parts.unshift({ id: "reflection", box: [40, 396, 1020, 220], motion: [{ kind: "ripple", amount: 2.6, length: 150, seconds: 3.2, still: 0 }], draw: ({ page: p }) => {
    let s = seed * 70 + 5;
    for (const a of arches) for (const [x0, x1] of [[0, 0.46], [0.54, 1]] as const) inkSide(p, "ink", Array.from({ length: 10 }, (_, i) => { const t = Math.PI * lerp(x0, x1, i / 9); return [a.x - Math.cos(t) * a.r * 0.98, wl + 4 + Math.sin(t) * a.r * 0.9, 0.5 + 0.5 * Math.sin(i * 2.3)] as const; }), 6, { tip: 0.42 * k, belly: 0.2, side: 0, dry: 0.35, dryEnd: 0.9, seed: s++ });
    for (const a of arches) { shimmer(p, a.x - a.r * 1.25, wl + 10, a.r * 0.5, a.r * 0.9, 9, 0.5 * k, s++); shimmer(p, a.x + a.r * 1.25, wl + 10, a.r * 0.5, a.r * 0.9, 9, 0.5 * k, s++); shimmer(p, a.x, wl + a.r * 0.96, a.r * 0.5, 26, 4, 0.4 * k, s++); }
  } });
  return { id: "bridge", label: "A humped stone bridge", page: { width: W, height: H }, plates: inkPlates(["ink"]), seed, parts };
}

export interface InkHousesOptions { seed?: number; count?: number; ink?: number; reflection?: boolean; width?: number; /** Colour of doors and lanterns. */ accent?: InkPigment }
/** Water-town houses 粉牆黛瓦: the walls are the paper, the roofs are black. */
export function inkHouses(o: InkHousesOptions = {}): InkSubject {
  const seed = o.seed ?? 1, n = o.count ?? 6, W = o.width ?? 1500, H = 760, k = o.ink ?? 1, wl = 520, accent = o.accent ?? "cinnabar", r0 = inkRandom(seed);
  interface House { x: number; w: number; foot: number; eave: number; ridge: number; far: number; gable: boolean }
  const list: House[] = [];
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, w = (W / n) * r0.in(0.86, 1.26), far = i % 2 ? 1 : 0, foot = wl - (far ? r0.in(26, 60) : r0.in(0, 8)), tall = r0.in(110, 190) * (far ? 1.16 : 1); list.push({ x: W * (0.06 + 0.88 * t), w, foot, eave: foot - tall, ridge: foot - tall - w * r0.in(0.18, 0.25), far, gable: r0.chance(0.4) }); }
  list.sort((a, b) => b.far - a.far || b.x - a.x);
  const parts: InkPart[] = [{ id: "houses", draw: ({ page: p }) => {
    let s = seed * 80; const r = inkRandom(seed + 5);
    for (const h of list) {
      const t = k * (h.far ? 0.78 : 1), x0 = h.x - h.w / 2, x1 = h.x + h.w / 2, wall = [p.at(x0, h.eave - 8), p.at(x1, h.eave - 8), p.at(x1, h.foot), p.at(x0, h.foot)];
      inkVeilShape(p, wall, 1);
      inkBloom(p, "ink", wall, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return t * (0.18 * ss(0.5, 0.78, inkFbm2(seed + 3, x / 70, y / 40, 3)) + 0.3 * ss(26, 0, y - h.eave) + 0.12 * ss(60, 0, h.foot - y)); }, soft: 2, wander: 0, mottle: 0.6, cloud: 40, seed: s++ });
      rule(p, [x0, h.eave], [x0, h.foot], 1.8, 0.5 * t, s++); rule(p, [x1, h.eave], [x1, h.foot], 2.6, 0.66 * t, s++);
      // roof: a broad loaded stroke down from the ridge, tiles combed through it
      const over = h.w * 0.07, roof: PenPoint[] = h.gable ? [[x0 - over, h.eave + 6], [h.x, h.ridge], [x1 + over, h.eave + 6], [x1 + over * 0.6, h.eave + 16], [h.x, h.ridge + 20], [x0 - over * 0.6, h.eave + 16]] : [[x0 - over, h.eave + 4], [x0 + h.w * 0.08, h.ridge], [x1 - h.w * 0.08, h.ridge], [x1 + over, h.eave + 4], [h.x, h.eave + 12]];
      if (h.gable) {
        const peak: PenPoint[] = [[x0, h.eave], [h.x, h.ridge + 14], [x1, h.eave]]; inkVeilShape(p, peak.map(q => p.at(...q)), 1);
        for (const [a, b] of [[[x0 - over, h.eave + 8], [h.x, h.ridge]], [[h.x, h.ridge], [x1 + over, h.eave + 8]]] as const) inkSide(p, "ink", [[a[0], a[1], 0.6], [lerp(a[0], b[0], 0.3), lerp(a[1], b[1], 0.3) + 5, 1], [lerp(a[0], b[0], 0.7), lerp(a[1], b[1], 0.7) + 4, 1], [b[0], b[1], 0.8]], 20, { tip: 0.98 * t, belly: 0.5, side: a[1] < b[1] ? 1 : 1, head: 0.2, dry: 0.1, dryEnd: 0.5, seed: s++ });
      } else {
        const q = p.shape([[roof[0][0], roof[0][1]], [lerp(roof[0][0], roof[1][0], 0.55), lerp(roof[0][1], roof[1][1], 0.45)], [roof[1][0], roof[1][1]]], false), q2 = p.shape([[roof[2][0], roof[2][1]], [lerp(roof[3][0], roof[2][0], 0.45), lerp(roof[3][1], roof[2][1], 0.55)], [roof[3][0], roof[3][1]]], false), tri = [...q, ...q2];
        inkVeilShape(p, tri, 1);
        inkBloom(p, "ink", tri, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return t * (0.42 + 0.36 * inkFbm2(seed + 8, x / 50, y / 30, 3)); }, soft: 1, wander: 1, rim: 0.3, mottle: 0.6, cloud: 30, seed: s++ });
        const m = Math.round(h.w / 13); for (let i = 1; i < m; i++) { const u = i / m, a: PenPoint = [lerp(roof[1][0], roof[2][0], u), h.ridge + 3], b: PenPoint = [lerp(roof[0][0], roof[3][0], u), h.eave + 4]; if (r.chance(0.9)) inkThread(p, "ink", [[a[0], a[1], 0.7], [lerp(a[0], b[0], 0.45), lerp(a[1], b[1], 0.55), 0.9], [b[0], b[1], 1]], 3.2, { ink: r.in(0.55, 0.95) * t, inkEnd: 0.9 * t, seed: s++, tremor: 0.8 }); }
        inkSide(p, "ink", [[roof[0][0] - 4, roof[0][1] - 8, 0.3], [roof[0][0] + 16, roof[0][1] + 3, 0.9], [h.x, h.eave + 7, 1], [roof[3][0] - 16, roof[3][1] + 3, 0.9], [roof[3][0] + 4, roof[3][1] - 8, 0.3]], 9, { tip: 0.98 * t, belly: 0.6, side: 1, dry: 0.08, dryEnd: 0.4, seed: s++ });
        inkSide(p, "ink", [[roof[1][0] - 16, h.ridge - 16, 0.3], [roof[1][0] + 4, h.ridge - 1, 1], [h.x, h.ridge + 2, 0.8], [roof[2][0] - 4, h.ridge - 1, 1], [roof[2][0] + 16, h.ridge - 16, 0.3]], 9, { tip: 0.98 * t, belly: 0.7, side: 0, dry: 0.08, dryEnd: 0.3, seed: s++ });
      }
      // windows, doors and a lantern
      const dots = 1 + Math.floor(r.next() * 3);
      for (let i = 0; i < dots; i++) { const x = x0 + h.w * (0.2 + (0.6 * (i + 0.5)) / dots), y = h.eave + (h.foot - h.eave) * r.in(0.28, 0.42), ww = r.in(16, 24), hh = r.in(20, 30), q = [p.at(x - ww / 2, y - hh / 2), p.at(x + ww / 2, y - hh / 2), p.at(x + ww / 2, y + hh / 2), p.at(x - ww / 2, y + hh / 2)]; inkBloom(p, "ink", q, { tone: 0.7 * t, soft: 0.8, wander: 0.4, fringe: 0.5, rim: 0.3, mottle: 0.5, seed: s++ }); }
      if (!h.far && r.chance(0.75)) { const x = h.x + r.in(-0.2, 0.2) * h.w, dw = 30, dh = Math.min(84, (h.foot - h.eave) * 0.52), q = [p.at(x - dw / 2, h.foot - dh), p.at(x + dw / 2, h.foot - dh), p.at(x + dw / 2, h.foot), p.at(x - dw / 2, h.foot)]; inkBloom(p, "ink", q, { tone: 0.82 * t, soft: 0.8, wander: 0.6, rim: 0.2, mottle: 0.4, seed: s++ }); if (r.chance(0.7)) { inkBloom(p, accent, p.disc(x - dw * 0.95, h.foot - dh * 0.82, 11), { tone: 0.95, soft: 0.7, wander: 0.2, fringe: 0.5, rim: 0.3, seed: s++ }); rule(p, [x - dw * 0.95, h.foot - dh * 0.82 - 26], [x - dw * 0.95, h.foot - dh * 0.82 - 9], 1.2, 0.8 * t, s++); } }
    }
    // the bank
    inkSide(p, "ink", Array.from({ length: 18 }, (_, i) => [W * (0.02 + (0.96 * i) / 17), wl + 6 + 4 * Math.sin(i * 1.9), 0.4 + 0.6 * inkFbm2(seed + 12, i / 2, 1, 2)] as PenNode), 12, { tip: 0.85 * k, belly: 0.1, side: -1, head: 0.2, dry: 0.3, dryEnd: 0.8, grain: 1, seed: s++ });
  } }];
  if (o.reflection !== false) parts.unshift({ id: "reflection", box: [0, wl, W, H - wl], motion: [{ kind: "ripple", amount: 2.4, length: 180, seconds: 3.6, still: 0 }], draw: ({ page: p }) => {
    let s = seed * 90 + 3;
    for (const h of list) { const hh = (h.foot - h.eave) * (h.far ? 1.1 : 0.8), y0 = wl + (h.far ? hh * 0.62 : hh * 0.5); shimmer(p, h.x, y0, h.w * 0.5, hh * 0.62, h.far ? 10 : 17, (h.far ? 0.34 : 0.62) * k, s++); }
    inkBloom(p, "ink", [p.at(0, wl + 8), p.at(W, wl + 8), p.at(W, wl + 170), p.at(0, wl + 170)], { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.16 * k * ss(wl + 170, wl + 20, y) * ss(0.36, 0.66, inkFbm2(seed + 14, x / 240, y / 12, 3)) * ss(0, W * 0.12, x) * ss(W, W * 0.88, x); }, soft: 4, wander: 0, mottle: 0.5, seed: s++ });
  } });
  return { id: `houses-${seed}`, label: "Houses with white walls and black tiles, by the water", page: { width: W, height: H }, plates: inkPlates([accent, "ink"]), seed, parts };
}
