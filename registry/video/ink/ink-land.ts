/**
 * INK-FILM1 land: mountains, ranges and mist as a Chinese painter builds them.
 *
 * A landform (`ink-terrain`) says where the faces, hollows and ridges are; every mark on it is a brush stroke. Tops are paper, one side gets
 * the water, and the dark lies in the hollow behind the next ridge. Ridge lines are pressed and lifted, heavy on the shade side and broken
 * on the light one; texture strokes 皴 fall with the slope; dots 苔點 and far trees sit along the ridges. The foot goes out in mist: paper.
 */
import { inkFbm2, inkHash2 } from "../ink-riso-press";
import type { InkRisoPen, PenNode, PenPoint } from "../ink-riso-pen";
import { inkBlob, inkBloom, inkSide, inkThread } from "../ink-riso-wet";
import type { InkPaintContext, InkPart, InkSubject } from "./ink-cel";
import { inkRandom } from "./ink-brush-kit";
import { inkPlates } from "./ink-pigments";
import { createInkTerrain } from "./ink-terrain";
import type { InkLandKind, InkTerrain } from "./ink-terrain";
import type { InkPigment } from "./ink-pigments";
import { inkVeil, inkVeilShape } from "./ink-veil";

export { inkRandom };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a || 1e-9)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Dots of growth 苔點: short presses of a wet brush, in clusters along a line. */
export function inkMoss(p: InkRisoPen, plate: string, line: readonly PenPoint[], o: { n: number; size: number; ink: number; spread: number; seed: number }): void {
  const r = inkRandom(o.seed), at = (t: number): PenPoint => { const k = clamp(t) * (line.length - 1), i = Math.min(line.length - 2, Math.floor(k)), f = k - i; return [lerp(line[i][0], line[i + 1][0], f), lerp(line[i][1], line[i + 1][1], f)]; };
  if (line.length < 2) return;
  for (let k = 0; k < o.n; ) {
    const c = r.next(), m = 3 + Math.floor(r.next() * 7);
    for (let i = 0; i < m && k < o.n; i++, k++) {
      const [x, y] = at(c + (r.next() - 0.5) * 0.12), s = o.size * r.in(0.4, 1.15), a = r.in(-0.7, 0.3), X = x + (r.next() - 0.5) * o.spread, Y = y + (r.next() - 0.6) * o.spread * 0.7;
      const ring = Array.from({ length: 8 }, (_, j) => { const b = (j / 8) * 6.283, u = Math.cos(b) * s * 1.3 * (1 + 0.34 * (r.next() - 0.5)), v = Math.sin(b) * s * 0.66 * (1 + 0.34 * (r.next() - 0.5)); return p.at(X + u * Math.cos(a) - v * Math.sin(a), Y + u * Math.sin(a) + v * Math.cos(a)); });
      p.wash(plate, ring, { tone: clamp(o.ink * r.in(0.55, 1.05)), soft: 0.5, mode: "glaze" });
    }
  }
}
/** Trees seen from far off: a bare trunk or two, and dabs of leaf laid side by side. */
export function inkFarTree(p: InkRisoPen, plate: string, x: number, y: number, size: number, o: { ink: number; seed: number; kind?: "pine" | "leaf" }): void {
  const r = inkRandom(o.seed), lean = r.in(-0.16, 0.16), pine = o.kind !== "leaf", w = Math.max(0.9, size * 0.05);
  p.line(plate, [[x, y, 1], [x + lean * size * 0.4, y - size * 0.5, 0.8], [x + lean * size, y - size, 0.3]], w, { ink: clamp(o.ink * 1.05), seed: o.seed });
  const n = pine ? 4 + Math.floor(r.next() * 3) : 7 + Math.floor(r.next() * 6);
  for (let i = 0; i < n; i++) {
    const t = pine ? 0.36 + 0.66 * (i / (n - 1)) : 0.4 + 0.66 * r.next(), cx = x + lean * size * t + (r.next() - 0.5) * size * (pine ? 0.16 : 0.42), cy = y - size * t, rx = size * (pine ? lerp(0.32, 0.13, (t - 0.36) / 0.66) : 0.13) * r.in(0.7, 1.25), ry = rx * (pine ? 0.26 : 0.66);
    const ring = Array.from({ length: 11 }, (_, j) => { const b = (j / 11) * 6.283, k = 1 + 0.5 * (r.next() - 0.5); return p.at(cx + Math.cos(b) * rx * k, cy + Math.sin(b) * ry * k - (pine ? Math.abs(Math.cos(b)) * -ry * 0.4 : 0)); });
    p.wash(plate, ring, { tone: clamp(o.ink * r.in(0.5, 1)), soft: 0.7, mode: "glaze" });
  }
}

export type InkCun = "axe" | "hemp" | "rain" | "none";
export interface InkMassifOptions {
  seed?: number;
  /** Page size. */
  width?: number; height?: number;
  kind?: InkLandKind;
  /** Summits: x and width as shares of the page width, height as a share of the page height, z 0 near to 1 far. Left out, `count` of them are placed by the seed along a vein. */
  summits?: readonly { x: number; z: number; height: number; width: number }[];
  count?: number;
  /** Texture strokes: axe-cut 斧劈 for rock, hemp fibre 披麻 for earth, raindrop 雨點, or none. */
  cun?: InkCun;
  /** Which side is in shade. */
  shade?: 1 | -1;
  /** Strength of line and texture, of water, of spurs and gullies; dots and trees along the ridges. */
  ink?: number; texture?: number; water?: number; rough?: number; moss?: number; trees?: number;
  /** Where the mist stands, as a share of the page height from the foot, and how soft its edge is. */
  mist?: number; mistEdge?: number;
  /** A colour laid over the water, and how much. */
  tint?: InkPigment | null; tintAmount?: number;
  /** A waterfall: where on the page (shares of its width and height), from its lip to its spray, how wide at the foot, in how many drops. */
  falls?: { x: number; top: number; foot: number; width?: number; steps?: number };
}
/** Summits along a dragon vein 龍脈: the host peak, guests that bow to it, and shoulders that come forward to the left and the right by turns. */
function vein(kind: InkLandKind, n: number, base: number, r: ReturnType<typeof inkRandom>) {
  const x0 = r.in(0.4, 0.6), dir = r.chance(0.5) ? 1 : -1, apart = kind === "karst" ? 1.5 : kind === "pillar" ? 1 : 1;
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0, side = (i % 2 ? dir : -dir), host = i === 0, step = Math.ceil(i / 2) / Math.ceil((n - 1) / 2 || 1);
    return { x: clamp(x0 + (host ? 0 : side * apart * (0.07 + 0.3 * step * r.in(0.75, 1.1))), 0.1, 0.9), z: clamp(0.74 - 0.52 * t + r.in(-0.05, 0.05), 0.2, 0.9), height: host ? 0.74 : lerp(0.6, 0.2, t ** 0.8) * r.in(0.84, 1.16), width: base * (host ? 1 : lerp(0.84, 0.5, t)) * r.in(0.86, 1.14) };
  });
}
/** A quantity of the surface, averaged over the surface round each place and not across its edges. */
function massOf(A: Float32Array, T: InkTerrain, r: number): Float32Array {
  const { nx, ny, z } = T, run = (src: Float32Array, step: number, count: number, lines: number, jump: number) => {
    const out = new Float32Array(src.length);
    for (let l = 0; l < lines; l++) for (let i = 0; i < count; i++) {
      const q = l * jump + i * step; if (z[q] < 0) continue;
      let sum = src[q], n = 1;
      for (const d of [-1, 1]) for (let k = 1; k <= r; k += 2) { const j = i + d * k; if (j < 0 || j >= count) break; const p = l * jump + j * step; if (z[p] < 0 || Math.abs(z[p] - z[q]) > 90) break; sum += src[p]; n++; }
      out[q] = sum / n;
    }
    return out;
  };
  return run(run(A, 1, nx, ny, nx), nx, ny, nx, 1);
}
/** The landform of a massif, and its random stream after the summits are placed. */
function massifForm(o: InkMassifOptions) {
  const W = o.width ?? 1600, H = o.height ?? 1200, seed = o.seed ?? 1, r = inkRandom(seed), kind = o.kind ?? "crag";
  const base = kind === "pillar" ? 0.17 : kind === "karst" ? 0.2 : kind === "hill" ? 0.6 : 0.5, n = o.count ?? (kind === "pillar" ? 9 : kind === "karst" ? 6 : 7);
  const summits = (o.summits ?? vein(kind, n, base, r)).map(s => ({ x: s.x * W, z: s.z, height: Math.min(s.height, 0.82 - 0.2 * Math.min(1, s.z)) * H, width: s.width * W }));
  return { W, H, seed, r, kind, make: () => createInkTerrain({ width: W, height: H, foot: H * 0.96, rise: H * 0.2, depth: W * 0.5, kind, summits, rough: o.rough ?? 1, seed }) };
}
/** Where the massif stands against the sky: page y over page x. Use it to set a tree, a pavilion or a figure on it. */
export function inkSkyline(o: InkMassifOptions): (x: number) => number {
  const { H, make } = massifForm(o), T = make();
  return x => { const i = Math.max(0, Math.min(T.nx - 1, Math.floor(x / T.cell))); for (let j = 0; j < T.ny; j++) if (T.z[j * T.nx + i] >= 0) return (j + 0.5) * T.cell; return H; };
}
/** Peaks going out in mist: the middle distance of a landscape. */
export function inkMassif(o: InkMassifOptions = {}): InkSubject {
  const { W, H, seed, r, kind, make } = massifForm(o), shade = o.shade ?? 1, ink = o.ink ?? 1, texture = o.texture ?? 1, water = o.water ?? 1;
  return { id: `massif-${seed}`, label: "Mountain peaks in mist", page: { width: W, height: H }, plates: inkPlates(o.tint ? [o.tint, "ink"] : ["ink"]), seed, parts: [{ id: "rock", draw: c => paintTerrain(c.page, make()) }, ...(o.falls ? fallsParts(W, H, { x: o.falls.x * W, y0: o.falls.top * H, y1: o.falls.foot * H, width: (o.falls.width ?? 0.06) * W, steps: clamp(o.falls.steps ?? 2, 1, 4), seed, ink }) : [])] };

  function paintTerrain(p: InkRisoPen, T: InkTerrain) {
    const level = H * (o.mist ?? 0.2), edge = H * (o.mistEdge ?? 0.3), far = W * 0.5;
    let s = seed * 31 + 7;
    /** 0 in the mist, 1 clear of it: by height over the ground, in drifts. */
    const clear = (x: number, y: number, z: number, h: number) => { const drift = inkFbm2(seed + 61, x / 260, (y + z * 0.4) / 110, 4), local = level * (0.6 + 0.55 * (z / far)); return ss(0, 1, (h - local * 0.55) / edge + 0.62 * (drift - 0.42)); };
    const cells = new Float32Array(T.nx * T.ny), dark = new Float32Array(T.nx * T.ny), wet = new Float32Array(T.nx * T.ny), turns = new Float32Array(T.nx * T.ny), rocky = kind === "pillar" || kind === "crag";
    for (let j = 0; j < T.ny; j++) for (let i = 0; i < T.nx; i++) {
      const q = j * T.nx + i, z = T.z[q]; if (z < 0) continue;
      const x = (i + 0.5) * T.cell, y = (j + 0.5) * T.cell, [sx, sz] = T.slope(x, z), len = Math.hypot(sx, sz), hollow = clamp(T.bend(x, z) * 0.16, -1, 1), turn = (shade * sx) / Math.hypot(1, sx, sz), away = lerp(1, 0.7, z / far);
      cells[q] = clear(x, y, z, T.h[q]) * ss(0, far * 0.09, z); turns[q] = turn;
      const soft = kind === "karst", top = soft ? ss(0.1, 0.85, T.h[q] / (0.5 * H)) : 0, face = clamp(0.46 - turn * (soft ? 0.34 : 0.6) + hollow * (soft ? 0.2 : 0.6) + top * 0.3 - (soft ? 0.1 : 0));
      dark[q] = face * away * ss(0.1, 0.7, len);
      wet[q] = (0.05 + 0.62 * ss(0.3, 1, face) ** 1.3) * away;
    }
    // the mass as a whole: one side in shade, the crown dark with growth, the foot pale. Without it a rock is only texture
    if (rocky) {
      const form = massOf(turns, T, Math.round((W * 0.02) / T.cell));
      for (let q = 0; q < form.length; q++) { const z = T.z[q]; if (z < 0) continue; const away = lerp(1, 0.6, z / far), y = (Math.floor(q / T.nx) + 0.5) * T.cell, x = ((q % T.nx) + 0.5) * T.cell, plane = inkFbm2(seed + 83, x / 46 + y / 150, y / 120, 2), side = ss(0.22, -0.5, form[q] + (plane - 0.5) * 0.7), crown = ss(H * 0.2, H * 0.62, T.h[q]);
        wet[q] = wet[q] * 0.7 + (0.04 + 0.4 * side + 0.12 * crown * (0.4 + side)) * away; dark[q] = clamp(dark[q] * (0.5 + 0.75 * side) + 0.16 * side * away); }
    }
    // what stands behind a ridge is pale next to it: that is what sets the ridge before it
    for (let i = 0; i < T.nx; i++) { let d = 1e6, depth = -1, gap = 0; for (let j = T.ny - 1; j >= 0; j--) { const q = j * T.nx + i, z = T.z[q]; if (z < 0) break; if (depth >= 0 && z - depth > 14) { d = 0; gap = ss(14, 110, z - depth); } else d += T.cell; depth = z; cells[q] *= lerp(1, 0.16 + 0.84 * ss(-6, 84, d), gap); } }
    for (let q = 0; q < cells.length; q++) { dark[q] *= cells[q]; wet[q] *= cells[q]; }
    const read = (A: Float32Array, x: number, y: number) => { const u = x / T.cell - 0.5, v = y / T.cell - 0.5, i = Math.max(0, Math.min(T.nx - 2, Math.floor(u))), j = Math.max(0, Math.min(T.ny - 2, Math.floor(v))), f = clamp(u - i), g = clamp(v - j), q = j * T.nx + i; return (A[q] * (1 - f) + A[q + 1] * f) * (1 - g) + (A[q + T.nx] * (1 - f) + A[q + T.nx + 1] * f) * g; };
    const page = [p.at(0, 0), p.at(W, 0), p.at(W, H), p.at(0, H)];
    inkVeil(p, [0, 0, W, H], (x, y) => ss(0.02, 0.5, read(cells, x, y)));
    if (water > 0) {
      inkBloom(p, "ink", page, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return water * read(wet, x, y) * (0.66 + 0.68 * inkFbm2(seed + 71, x / 70, y / 70, 3)); }, soft: 1.2, wander: 0, fringe: 0, mottle: 0.5, cloud: 40, seed: s++ });
      if (o.tint) inkBloom(p, o.tint, page, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return (o.tintAmount ?? 0.26) * read(cells, x, y) * (0.4 + 0.9 * read(dark, x, y)) * (0.5 + inkFbm2(seed + 73, x / 120, y / 90, 2)); }, soft: 2, wander: 0, fringe: 0, mottle: 0.5, cloud: 60, seed: s++ });
    }
    // texture: strokes fall with the slope, most of them where it is dark
    const cun = o.cun ?? (kind === "hill" ? "hemp" : kind === "karst" ? "none" : "axe"), tries = cun === "none" ? 0 : Math.round(((W * H) / 420) * texture * (cun === "rain" ? 1.5 : 1));
    const strokes: { z: number; go: () => void }[] = [];
    for (let k = 0; k < tries; k++) {
      const x = r.next() * W, y = r.next() * H, z = T.depthAt(x, y); if (z < 0) continue;
      const d = read(dark, x, y), want = d ** 1.5 * 1.15 + 0.025 * read(cells, x, y); if (r.next() > want) continue;
      const pts: PenNode[] = [], steps = cun === "hemp" ? 9 + Math.floor(r.next() * 14) : cun === "rain" ? 2 : 4 + Math.floor(r.next() * 6), size = cun === "rain" ? 5 : 7;
      const lean = rocky ? (inkFbm2(seed + 85, x / 64, y / 64, 2) - 0.5) * 2.6 : 0;
      let wx = x, wz = z;
      for (let i = 0; i < steps; i++) {
        const [px, py] = T.project(wx, wz); if (Math.abs(T.depthAt(px, py + 1) - wz) > 26) break;
        pts.push([px + lean * i * size * 0.5, py, 1]);
        const [gx, gz] = T.slope(wx, wz), g = Math.hypot(gx, gz, 0.25), st = size / Math.max(0.5, Math.hypot(gx / g, 0.2 + g * 0.5));
        wx -= (gx / g) * st * 0.8; wz -= (gz / g) * st * 0.8 + 0.4; if (wz < 0) break;
      }
      if (pts.length < (cun === "rain" ? 2 : 3)) continue;
      const L = pts.length - 1, ez = read(cells, pts[L][0], pts[L][1]), tone = clamp(ink * (0.12 + d * 1.15) * r.in(0.65, 1.25)), id = s++;
      const press = pts.map(([a, b], i) => [a + (r.next() - 0.5) * 1.2, b, (i === 0 ? 0.55 : 1 - 0.7 * (i / L) ** 1.6) * (0.5 + 0.5 * Math.min(1, ez * 2))] as const);
      if (cun === "hemp") strokes.push({ z, go: () => inkThread(p, "ink", press, r.in(1.3, 3.6) * lerp(1, 0.7, z / far), { ink: tone, inkEnd: tone * 0.15, seed: id, tremor: 0.9 }) });
      else { const w = (cun === "rain" ? r.in(4, 9) : r.in(7, 24) * (0.5 + 0.7 * d)) * lerp(1, 0.62, z / far); strokes.push({ z, go: () => inkSide(p, "ink", press, w, { tip: clamp(tone * 1.15), belly: tone * 0.12, side: shade > 0 ? -1 : 1, head: 0.35, rim: 0, dry: 0.3, dryEnd: 1.05, grain: 1, seed: id }) }); }
    }
    strokes.sort((a, b) => b.z - a.z);
    const ridges = [...T.ridges].sort((a, b) => b[0].z - a[0].z);
    let at = 0;
    for (const run of ridges) {
      while (at < strokes.length && strokes[at].z > run[0].z) strokes[at++].go();
      paintRidge(run);
    }
    while (at < strokes.length) strokes[at++].go();

    function paintRidge(run: InkTerrain["ridges"][number]) {
      const away = lerp(1, 0.6, run[0].z / far), seen = run.map(m => read(cells, m.x, m.y + T.cell)), big = Math.min(1, run.length / 40), tall = run.map(m => clamp(m.jump / 120));
      // heavy on the shade side, broken on the light one
      let from = 0;
      while (from < run.length - 4) {
        const n = Math.max(6, Math.min(run.length - from, Math.round(r.in(22, 70)))), part = run.slice(from, from + n), f0 = from; from += n - (r.chance(0.7) ? 2 : -Math.round(r.in(1, 5)));
        const face = part.reduce((a, m) => a + m.face, 0) / n, shadeSide = ss(-0.4, 0.5, -shade * face), lost = seen.slice(f0, f0 + n).reduce((a, v) => a + v, 0) / n; if (lost < 0.07) continue;
        const w = r.in(5, 11) * away * (0.4 + 0.7 * shadeSide) * (0.5 + 0.5 * big), pts: PenNode[] = [];
        part.forEach((m, i) => { if (i % 2 && i !== n - 1) return; const t = i / (n - 1); pts.push([m.x, m.y + w * 0.3, (0.35 + 0.65 * Math.sin(Math.PI * (0.1 + 0.84 * t))) * ss(0.08, 0.6, seen[f0 + i]) * (0.4 + 0.6 * tall[f0 + i]) * r.in(0.7, 1.15)]); });
        if (pts.length < 3) continue;
        // a line is lost where the mist stands
        const open = pts.findIndex(q => q[2]! > 0.2), end = pts.length - [...pts].reverse().findIndex(q => q[2]! > 0.2); if (open < 0 || end - open < 3) continue;
        pts.splice(end); pts.splice(0, open);
        const tone = clamp(ink * away * (0.55 + 0.5 * shadeSide) * ss(0.02, 0.45, lost) * 1.1);
        inkSide(p, "ink", pts, w, { tip: tone, belly: tone * 0.5, side: 0, head: 0.15, rim: 0.05, dry: lerp(0.24, 0.1, shadeSide), dryEnd: lerp(1, 0.8, shadeSide), grain: 0.8, seed: s++ });
        if (shadeSide > 0.45 && cun !== "none" && cun !== "hemp" && big > 0.4) { const bw = r.in(14, 34) * away; inkSide(p, "ink", pts.map(([a, b, q]) => [a, b + bw * 0.42, q] as const), bw, { tip: tone * 0.72, belly: 0.02, side: face > 0 ? -1 : 1, head: 0.2, rim: 0, dry: 0.36, dryEnd: 1.1, grain: 1.2, seed: s++ }); }
      }
      const open = run.filter((_, i) => seen[i] > 0.35);
      if (open.length < 6) return;
      const line = open.map(m => [m.x, m.y] as const), span = open.length * T.cell;
      if (o.moss !== 0) inkMoss(p, "ink", line, { n: Math.round((o.moss ?? 0.7) * span * 0.16 * r.in(0.3, 1.2)), size: 3 * away + 0.6, ink: 0.95 * ink * away, spread: 12 * away, seed: s++ });
      if (o.trees) for (let k = 0, m = Math.round(o.trees * span * (rocky ? 0.09 : 0.05)); k < m; ) { const c = Math.floor(r.next() * open.length), q = 2 + Math.floor(r.next() * 5); for (let i = 0; i < q && k < m; i++, k++) { const e = open[Math.max(0, Math.min(open.length - 1, c + Math.round((r.next() - 0.5) * 12)))]; if (Math.abs(e.face) < (rocky ? 6 : 2.6)) inkFarTree(p, "ink", e.x, e.y + 4, r.in(rocky ? 20 : 14, rocky ? 44 : 34) * away, { ink: r.in(0.6, 1) * ink * away, seed: s++ }); else s++; } }
    }
  }
}

export interface InkRangeOptions { seed?: number; width?: number; height?: number; /** Ridges, back to front. */ layers?: number; /** Tone of the farthest and the nearest, 0–1. */ tone?: readonly [number, number]; pigment?: InkPigment; /** Peakedness: 0 rolling, 1 sharp. */ sharp?: number; /** Breaks in the mist at the feet, 0–1. */ mist?: number; /** How far in from its sides it is lost, share of the width (default 0.05). */ edge?: number }
/** Far mountains: one wet stroke of water each, crisp along the ridge, lost at the foot. */
export function inkRange(o: InkRangeOptions = {}): InkSubject {
  const W = o.width ?? 1920, H = o.height ?? 620, seed = o.seed ?? 1, n = o.layers ?? 3, [t0, t1] = o.tone ?? [0.1, 0.34], plate = o.pigment ?? "ink", sharp = o.sharp ?? 0.5, edge = (o.edge ?? 0.05) * W, plates: InkPigment[] = plate === "ink" ? ["ink"] : [plate, "ink"];
  const ridge = (i: number) => {
    const r = inkRandom(seed * 11 + i), bumps: { x: number; l: number; r: number; h: number }[] = [];
    for (let k = 0, n2 = 3 + Math.floor(r.next() * 3); k < n2; k++) {
      // a peak is steeper on one side than on the other, and has a shoulder or two lower down
      const x = ((k + r.in(0.1, 0.9)) / n2) * 1.1 * W - 0.05 * W, w = r.in(0.11, 0.22) * W, skew = r.in(-0.42, 0.42), h = r.in(0.4, 1), side = r.chance(0.5) ? 1 : -1;
      bumps.push({ x, l: w * (1 + skew), r: w * (1 - skew), h });
      for (let q = 0, m = 1 + Math.floor(r.next() * 2); q < m; q++) { const s2 = q ? -side : side; bumps.push({ x: x + s2 * w * r.in(0.34, 0.7), l: w * r.in(0.3, 0.62), r: w * r.in(0.3, 0.62), h: h * r.in(0.5, 0.82) }); }
    }
    return (x: number) => {
      const jag = inkFbm2(seed * 5 + i, x / (W * 0.05), i * 3.3, 5) - 0.5, bend = W * 0.012 * (inkFbm2(seed * 7 + i, x / (W * 0.03), 4 + i, 3) - 0.5) * sharp; let v = 0;
      for (const b of bumps) { const d = Math.abs(x + bend - b.x) / (x < b.x ? b.l : b.r), peak = sharp * Math.max(0, 1 - d) ** 1.3 + (1 - sharp) * Math.exp(-d * d * 1.6), hi = Math.max(v, b.h * peak), lo = Math.min(v, b.h * peak); v = hi + 0.16 * lo * lo / (hi + 0.05); }
      return Math.min(1, v * 0.8) + (0.16 + 0.12 * sharp) * jag * (0.25 + v) + 0.06 * (inkFbm2(seed + 90 + i, x / 46, 1, 3) - 0.5);
    };
  };
  return { id: `range-${seed}`, label: "Far mountains", page: { width: W, height: H }, plates: inkPlates(plates), seed, parts: Array.from({ length: n }, (_, i) => {
    const f = n > 1 ? i / (n - 1) : 1, R = ridge(i), base = H * lerp(0.6, 0.94, f), tall = H * lerp(0.5, 0.62, f) * 0.9, top = (x: number) => base - tall * Math.max(0.02, R(x)), tone = lerp(t0, t1, f);
    // where a ridge runs down to the plain it is lost, and nothing reaches the page's edge
    const there = (x: number, y: number) => ss(0.03, 0.24, R(x)) * ss(H * 0.99, H * 0.8, y) * ss(-40, edge, x) * ss(W + 40, W - edge, x);
    return { id: `ridge-${i}`, depth: lerp(-0.12, 0, f), draw: c => {
      const p = c.page, pts: PenPoint[] = []; for (let x = -60; x <= W + 60; x += 9) pts.push([x, top(x)]);
      const shape = [...pts.map(q => p.at(q[0], q[1])), p.at(W + 60, base + H * 0.2), p.at(-60, base + H * 0.2)];
      const low = (x: number, y: number) => { const d = (y - top(x)) / (tall * 0.95); return Math.exp(-Math.max(0, d) * 2.1) * ss(1.05, 0.5, d + 0.6 * (inkFbm2(seed + 33 + i, x / 210, y / 60, 3) - 0.5) * (0.6 + (o.mist ?? 0.5))); };
      inkVeilShape(p, shape, (x, y) => ss(0.02, 0.4, low(x, y)) * 0.96 * there(x, y));
      inkBloom(p, plate, shape, { tone: (X, Y) => { const [x, y] = p.local(X, Y); return tone * low(x, y) * (0.72 + 0.56 * inkFbm2(seed + 41 + i, x / 130, y / 90, 3)) * there(x, y); }, soft: 1.4, wander: 2.5, wave: 40, fringe: 0.9, tooth: 2, rim: 0.22, rimWidth: 3, mottle: 0.4, cloud: 90, seed: seed * 3 + i });
      // a second, darker touch under the highest ridges, while it is wet
      if (f > 0.3) inkBloom(p, plate, shape, { tone: (X, Y) => { const [x, y] = p.local(X, Y), d = (y - top(x)) / (tall * 0.3), n2 = inkFbm2(seed + 51 + i, x / 80, y / 46, 4); return tone * 0.9 * Math.exp(-Math.max(0, d) * 1.4) * ss(0.44, 0.68, n2) * there(x, y); }, soft: 2, wander: 3, wave: 30, fringe: 1.2, rim: 0.1, mottle: 0.4, cloud: 40, seed: seed * 3 + i + 70 });
    } };
  }) };
}
export interface InkMistOptions { seed?: number; width?: number; height?: number; /** How thick, 0–1. */ amount?: number; /** A breath of ink under the edges of the banks. */ shadow?: number; bands?: number }
/** Mist: banks of bare paper that hide what is behind them. */
export function inkMist(o: InkMistOptions = {}): InkSubject {
  const W = o.width ?? 1920, H = o.height ?? 420, seed = o.seed ?? 1, amount = o.amount ?? 0.95, n = o.bands ?? 2;
  return { id: `mist-${seed}`, label: "Mist", page: { width: W, height: H }, plates: inkPlates(["ink"]), seed, parts: Array.from({ length: n }, (_, i) => {
    const mid = H * lerp(0.36, 0.64, n > 1 ? i / (n - 1) : 0.5), th = H * 0.26, sd = seed * 9 + i * 41;
    const dens = (x: number, y: number) => { const big = inkFbm2(sd, x / (W * 0.16), y / (H * 0.5) + x / (W * 1.4), 4), wisps = inkFbm2(sd + 3, x / (W * 0.05), y / (H * 0.1), 3), d = (y - mid - (big - 0.5) * H * 0.36) / th; return ss(1.25, 0.1, Math.abs(d) + (d < 0 ? 0.55 : 0.8) * (wisps - 0.5)) * ss(0.2, 0.46, big) * ss(-10, W * 0.16, x) * ss(W + 10, W * 0.84, x); };
    return { id: `bank-${i}`, depth: i * 0.06, motion: [{ kind: "drift", by: [(i % 2 ? -1 : 1) * 42, 0], back: 16 + 5 * i, phase: i }], draw: c => {
      const p = c.page; inkVeil(p, [0, 0, W, H], (x, y) => amount * dens(x, y));
      if (o.shadow !== 0) inkBloom(p, "ink", inkBlob(p, Array.from({ length: 9 }, (_, k) => [W * (0.08 + 0.105 * k), mid + th * 0.4, th * 0.9] as [number, number, number])), { tone: (X, Y) => { const [x, y] = p.local(X, Y), a = dens(x, y), b = dens(x, y - H * 0.07); return (o.shadow ?? 0.07) * clamp(b - a) * 1.6; }, soft: 14, wander: 0, mottle: 0.5, cloud: 80, seed: sd });
    } };
  }) };
}

export interface InkWaterOptions { seed?: number; width?: number; height?: number; /** How much is drawn, 0–1.5. Most of water is paper. */ amount?: number; pigment?: InkPigment; /** Horizontal tint at the far edge, 0–1. */ tone?: number; /** A light lies on the water here, share of the width: strokes part around it. */ light?: number }
/** Still water in perspective: a few strokes drawn across, close and thin far off, long and broken near. */
export function inkWater(o: InkWaterOptions = {}): InkSubject {
  const W = o.width ?? 1920, H = o.height ?? 420, seed = o.seed ?? 1, amount = o.amount ?? 0.7, plate = o.pigment ?? "ink", plates: InkPigment[] = plate === "ink" ? ["ink"] : [plate, "ink"];
  const rows = 4;
  return { id: `water-${seed}`, label: "Still water", page: { width: W, height: H }, plates: inkPlates(plates), seed, parts: [
    ...(o.tone === 0 ? [] : [{ id: "sheen", draw: (c: InkPaintContext) => { const p = c.page; inkBloom(p, plate, [p.at(0, 0), p.at(W, 0), p.at(W, H), p.at(0, H)], { tone: (X, Y) => { const [x, y] = p.local(X, Y), v = y / H, b = inkFbm2(seed + 3, x / 620, v * 9, 3); return (o.tone ?? 0.16) * ss(0.42, 0.75, b) * (1 - 0.7 * v) * ss(0, 0.34, v) * ss(1, 0.7, v) * ss(0, W * 0.12, x) * ss(W, W * 0.88, x); }, soft: 4, wander: 0, mottle: 0.5, cloud: 60, seed }); } }]),
    ...Array.from({ length: rows }, (_, k): InkPart => ({ id: `ripple-${k}`, motion: [{ kind: "drift", by: [(k % 2 ? -1 : 1) * (9 + 7 * k), 0], back: 5.5 + k * 1.3, phase: k * 1.7 }, { kind: "ripple", amount: 1.2 + 0.7 * k, length: 190 + 60 * k, seconds: 3.4 + 0.5 * k, still: 0 }], draw: (c: InkPaintContext) => {
      const p = c.page, r = inkRandom(seed * 7 + k), v0 = (k / rows) ** 1.7, v1 = ((k + 1) / rows) ** 1.7, n = Math.round((15 - 2.6 * k) * amount);
      for (let i = 0; i < n; i++) {
        const v = lerp(v0, v1, r.next()), y = H * (0.04 + 0.92 * v), len = lerp(90, 520, v) * r.in(0.4, 1.25), g = r.next(), x0 = W * (0.06 + 0.86 * (r.chance(0.55) ? (o.light === undefined ? g : clamp(o.light + (g - 0.5) * 0.34)) : g)) - len / 2, wob = lerp(1.4, 8, v);
        const pts: PenNode[] = Array.from({ length: 8 }, (_, j) => { const t = j / 7; return [x0 + len * t, y + wob * (inkFbm2(seed + 31 + i + k * 40, t * 2.2, i, 2) - 0.5) * 2, Math.sin(Math.PI * clamp(0.06 + 0.9 * t)) ** 0.7] as const; });
        inkSide(p, plate, pts, lerp(1.6, 7.5, v) * r.in(0.5, 1.2), { tip: lerp(0.34, 0.5, v) * r.in(0.6, 1.1), belly: 0.14, side: 1, head: 0.1, rim: 0, dry: lerp(0.15, 0.45, v), dryEnd: 1.1, grain: 1, seed: seed * 90 + i + k * 50 });
      }
    } }))] };
}
export interface InkMoonOptions { seed?: number; radius?: number; /** Moon left as bare paper in a wash 烘雲托月, or a sun painted in. */ kind?: "moon" | "sun"; pigment?: InkPigment; /** Depth of the wash round the moon, or of the sun, 0–1. */ tone?: number; /** How far the wash reaches, radii. */ reach?: number }
/** A moon (bare paper in a wash) or a sun (a wet disc of colour). */
export function inkMoon(o: InkMoonOptions = {}): InkSubject {
  const R = o.radius ?? 180, kind = o.kind ?? "moon", plate = o.pigment ?? (kind === "sun" ? "cinnabar" : "indigo"), reach = kind === "sun" ? 1.25 : (o.reach ?? 2.5), size = R * reach * 2, c0 = size / 2, seed = o.seed ?? 1, plates: InkPigment[] = plate === "ink" ? ["ink"] : [plate, "ink"];
  return { id: `${kind}-${seed}`, label: kind === "sun" ? "Sun" : "Moon", page: { width: size, height: size }, plates: inkPlates(plates), seed, parts: [{ id: kind, draw: c => {
    const p = c.page, round = (q: number) => Array.from({ length: 120 }, (_, i) => p.at(c0 + Math.cos((i / 120) * 6.28319) * q, c0 + Math.sin((i / 120) * 6.28319) * q));
    if (kind === "sun") { inkBloom(p, plate, round(R), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return (o.tone ?? 0.95) * (0.78 + 0.34 * inkFbm2(seed, x / (R * 0.7), y / (R * 0.5), 3)) * (1 - 0.35 * ss(0.2, 1, (y - c0) / R)); }, soft: 1.4, wander: R * 0.012, wave: R * 0.3, fringe: 1.4, tooth: 3, rim: 0.3, rimWidth: R * 0.05, mottle: 0.5, cloud: R * 0.4, seed }); return; }
    // a round of wet paper: the wash is deepest by the moon, thins outward, and gathers a little here and there
    const wash = (X: number, Y: number) => { const [x, y] = p.local(X, Y), d = Math.hypot(x - c0, (y - c0) * 1.06) / R, wx = R * 0.5 * (inkFbm2(seed + 6, x / (R * 0.9), y / (R * 0.9), 2) - 0.5), n = inkFbm2(seed + 5, (x + wx) / (R * 1.5), (y + wx * 0.8) / (R * 0.9), 3), q = Math.max(0, d - 0.9 + (n - 0.5) * 0.9) / (reach * 0.5); return (o.tone ?? 0.34) * Math.exp(-q * q * 1.5) * (0.78 + 0.44 * n) * ss(reach * 0.99, reach * 0.4, d); };
    inkBloom(p, plate, round(R * reach * 0.99), { tone: wash, soft: 10, wander: 0, mottle: 0.3, cloud: R * 0.8, seed });
    if (plate !== "ink") inkBloom(p, "ink", round(R * reach * 0.99), { tone: (X, Y) => wash(X, Y) * 0.3, soft: 10, wander: 0, mottle: 0.3, cloud: R * 0.8, seed: seed + 1 });
    inkVeilShape(p, round(R), 1);
    inkBloom(p, plate, round(R), { tone: (X, Y) => { const [x, y] = p.local(X, Y); return 0.07 * ss(0.5, 0.72, inkFbm2(seed + 9, x / (R * 0.5), y / (R * 0.5), 3)); }, soft: 4, wander: 0, mottle: 0.4, cloud: R * 0.2, seed: seed + 2 });
  } }] };
}
/** Where water falls on a page: top and foot, its middle and its width at the foot. */
interface FallsCourse { x: number; y0: number; y1: number; width: number; steps: number; seed: number; ink: number }
/** Water falling: bare paper, wet rock along it, threads, spray. */
function fallsParts(W: number, H: number, o: FallsCourse): InkPart[] {
  const { seed, steps, ink, y0: Y0, y1: Y1 } = o, span = Y1 - Y0, r0 = inkRandom(seed), box = [Math.max(0, o.x - o.width * 3), Math.max(0, Y0 - 30), Math.min(W, o.width * 6), Math.min(H - Y0 + 30, span * 1.3)] as const, dir = r0.chance(0.5) ? 1 : -1;
  // each drop is wider than the one over it and steps aside from it; between them the water runs over a lip
  const drops = Array.from({ length: steps }, (_, i) => ({ y0: Y0 + span * (i / steps + (i ? r0.in(-0.06, 0.06) : 0)), x: o.x + dir * o.width * (steps > 1 ? (i % 2 ? 0.32 : -0.2) : 0), w: o.width * lerp(0.24, 0.72, steps > 1 ? i / (steps - 1) : 0.6) * r0.in(0.9, 1.15) }));
  const at = (y: number) => { let i = 0; while (i < steps - 1 && y > drops[i + 1].y0) i++; const a = drops[i], b = drops[i + 1], end = b?.y0 ?? Y1, t = clamp((y - a.y0) / (end - a.y0)), slip = b ? ss(0.84, 1, t) : 0; return { x: lerp(a.x, b?.x ?? a.x, slip) + Math.sin(t * 2.2 + i * 1.7 + seed) * o.width * 0.05, w: lerp(a.w * (1 + 0.28 * t), b?.w ?? a.w, slip) * ss(-0.06, 0.04, (y - Y0) / span) }; };
  const jag = span * 0.06, bank = (s: -1 | 1, y: number) => { const m = at(y), k = y / jag + (s < 0 ? 0 : 0.5), c = Math.floor(k), f = ss(0.6, 1, k - c), jut = lerp(inkHash2(seed + 5, c, s), inkHash2(seed + 5, c + 1, s), f) - 0.5; return m.x + s * (m.w / 2 + jut * o.width * 0.16); };
  const column = (n: number, a = Y0, b = Y1) => Array.from({ length: n }, (_, i) => lerp(a, b, i / (n - 1)));
  return [
    { id: "falls", box, draw: ({ page: p }) => {
      const r = inkRandom(seed * 13 + 5), ys = column(34);
      for (const s of [-1, 1] as const) {
        const reach = o.width * 0.7, fadeY = (y: number) => ss(0, 0.06, (y - Y0) / span) * ss(1, 0.8, (y - Y0) / span);
        // wet rock against the water, gone a little way off
        inkBloom(p, "ink", p.shape([...ys.map(y => [bank(s, y), y] as const), ...[...ys].reverse().map(y => [bank(s, y) + s * reach, y] as const)]), { wander: 1.5, wave: 30, fringe: 1, soft: 1.2, tooth: 2.4, rim: 0.1, mottle: 0.35, cloud: 44, seed: seed * 17 + s, tone: (X, Y) => { const [x, y] = p.local(X, Y), d = (s * (x - bank(s, y))) / reach, n = inkFbm2(seed + 41, x / 30 + y / 90, y / 70, 3); return ink * 0.5 * ss(0.9, 0, d + (n - 0.4) * 0.9) * fadeY(y); } });
        // axe-cut strokes: from the water's edge down and away
        for (let y = Y0 + span * 0.02; y < Y1 - span * 0.14; y += span * 0.05) {
          const v = y + r.in(-0.02, 0.02) * span; if (r.chance(0.25)) continue;
          const x = bank(s, v) + s * 3, len = span * r.in(0.06, 0.13), lean = s * r.in(0.15, 0.7);
          inkSide(p, "ink", Array.from({ length: 5 }, (_, j) => { const t = j / 4; return [x + lean * len * t * t + r.in(-1.4, 1.4), v + len * t, (0.5 + 0.5 * (1 - t)) * Math.min(1, 0.35 + 3 * t)] as const; }), o.width * r.in(0.14, 0.26), { tip: ink * r.in(0.6, 0.95), belly: ink * 0.1, side: s < 0 ? -1 : 1, head: 0.12, dry: 0.3, dryEnd: 1.15, grain: 1, seed: seed * 7 + Math.round(y * 3) + s });
        }
        // the line where rock meets water, pressed at each corner and lifted between
        for (let k = 0; k < 6; k++) { const a = Y0 + span * ((k + r.in(0.02, 0.2)) / 7), b = Math.min(Y1 - span * 0.1, a + span * r.in(0.08, 0.16)); inkThread(p, "ink", column(9, a, b).map((y, j) => [bank(s, y) + s * 1.5, y, 0.35 + 0.65 * (j ? Math.abs(Math.sin(j * 1.4 + k)) : 1) * (1 - j / 9)] as const), o.width * r.in(0.03, 0.06), { ink: 0.9 * ink, inkEnd: 0.1, seed: seed * 11 + k * 3 + s, tremor: 1.6 }); }
      }
      inkVeilShape(p, p.shape([...ys.map(y => [bank(-1, y) + 1.5, y] as const), ...[...ys].reverse().map(y => [bank(1, y) - 1.5, y] as const)]), (_x, y) => ss(0, 0.05, (y - Y0) / span));
    } },
    // threads that run down and come round: each drawing is a quarter of a thread's length further on
    { id: "falls-threads", box, poses: { kind: "cycle", order: ["0", "1", "2", "3"], seconds: 1.2, blend: true }, draw: ({ page: p, pose }) => {
      const r = inkRandom(seed * 19), step = Number(pose || 0) / 4;
      drops.forEach((d, i) => {
        const end = drops[i + 1]?.y0 ?? Y1 - span * 0.06, long = end - d.y0, run = long * 0.46;
        for (let c = 0; c < 11; c++) {
          const u = -0.4 + (0.8 * (c + r.in(0.1, 0.9))) / 11, off = r.next(), len = run * r.in(0.5, 0.85), w = r.in(1.1, 2.3), q = r.in(0.24, 0.52);
          for (let k = -1; k < 3; k++) { const y0 = d.y0 + run * (k + off + step), mid = (y0 + len / 2 - d.y0) / long, f = ss(0.02, 0.2, mid) * ss(0.98, 0.78, mid), from = Math.max(y0, d.y0), to = Math.min(y0 + len, end); if (f < 0.02 || to - from < 8) continue; const pts: PenNode[] = Array.from({ length: 7 }, (_, j) => { const y = lerp(from, to, j / 6), m = at(y); return [m.x + u * m.w, y, 0.35 + 0.65 * Math.sin((Math.PI * j) / 6)] as const; }); inkThread(p, "ink", pts, w, { ink: q * f, inkEnd: 0.03, seed: seed * 5 + c * 7 + i * 90 + k + 1, tremor: 0.5 }); }
        }
      });
    } },
    { id: "falls-spray", box, motion: [{ kind: "drift", by: [10, 0], back: 5 }, { kind: "breathe", at: [o.x, Y1], amount: 0.03, seconds: 4 }], draw: c => inkVeil(c.page, [o.x - o.width * 3, Y1 - span * 0.26, o.width * 6, span * 0.5], (x, y) => { const n = inkFbm2(seed + 11, x / (o.width * 0.9), y / (span * 0.07), 4), d = Math.hypot((x - at(Y1).x) / (o.width * 2.3), (y - Y1) / (span * 0.17)); return ss(1.05, 0.25, d + (n - 0.5) * 0.9); }) },
  ];
}
export interface InkSkyOptions { seed?: number; width?: number; height?: number; /** Strength of the wash, 0–1. */ tone?: number; pigment?: InkPigment; /** Where it is strongest, and whether it goes out to the other side. */ from?: "top" | "bottom" | "all"; /** Pale drifts in it, 0–1. */ cloud?: number }
/** A sky laid in with one wet brush: for snow, dusk or weather. What stands before it is left as paper. */
export function inkSky(o: InkSkyOptions = {}): InkSubject {
  const W = o.width ?? 2200, H = o.height ?? 1300, seed = o.seed ?? 1, tone = o.tone ?? 0.4, pigment = o.pigment ?? "ink", from = o.from ?? "top", cloud = o.cloud ?? 0.5;
  return { id: `sky-${seed}`, label: "Sky", page: { width: W, height: H }, plates: inkPlates([pigment]), seed, parts: [{ id: "sky", soft: 0.8, draw: ({ page: p }) => inkBloom(p, pigment, p.shape([[-60, -60], [W / 2, -60], [W + 60, -60], [W + 60, H / 2], [W + 60, H + 60], [W / 2, H + 60], [-60, H + 60], [-60, H / 2]]), { wander: 0, wave: 80, fringe: 0, soft: 2, tooth: 5, rim: 0, mottle: 0.16, cloud: 170, seed: seed * 23 + 1, tone: (X, Y) => {
    const [x, y] = p.local(X, Y), v = y / H, drift = inkFbm2(seed + 5, x / (W * 0.3), y / (H * 0.13), 4), far = from === "all" ? 1 : from === "top" ? 1 - ss(0.12, 0.8, v + 0.16 * (drift - 0.5)) : ss(0.2, 0.9, v + 0.16 * (drift - 0.5));
    return tone * far * (1 - cloud * ss(0.42, 0.72, drift)) * (0.86 + 0.28 * inkFbm2(seed + 9, x / 420, y / 260, 3));
  } }) }] };
}
