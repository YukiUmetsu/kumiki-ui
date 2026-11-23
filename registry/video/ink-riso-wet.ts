/**
 * INK-RISO1 wet ink: the marks a loaded brush leaves on absorbent paper (水墨), for an ink-riso sheet.
 *
 *   inkBloom    a wash that spreads: crisp, feathered or lost edges, a dark rim, a pale water line, mottled pigment
 *   inkHair     a sheet of hair between guide curves: roots that feather into skin, strands that part, open sheens
 *   inkSide     a side-tip stroke (側鋒): dark along one edge, grey along the other, pooled at the head, dry at the tail
 *   inkThread   a fine line (游絲) whose width and strength both change along it
 *   paintInk    the sheet as a painting: continuous ink on xuan paper, without the press
 *
 * Tones are what the eye sees (0 paper … 1 full ink). Marks glaze: ink over ink gets darker, as layers of wash do.
 */
import { inkFbm2, inkHash2, inkNoise2, inkRgb, inkSpline, inkFillMask } from "./ink-riso-press";
import type { InkRisoPrint, InkRisoSheet } from "./ink-riso-press";
import type { InkRisoPen, PenNode, PenPoint, PenShape } from "./ink-riso-pen";

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
/** What the eye calls a tone, as the share of light the ink takes. */
const take = (t: number) => { const u = 1 - clamp(t); return 1 - u * u; };
/** A ramp that opens strand by strand: `n` is the strand's own number, 0–1. */
const comb = (a: number, n: number, k = 0.9) => clamp(a * (1 + k) - k * n);

// ---- distance ------------------------------------------------------------------------------------------------------------------
const FAR = 1e12;
function edt(f: Float64Array, w: number, h: number): Float64Array {
  const n = Math.max(w, h), v = new Int32Array(n), z = new Float64Array(n + 1), g = new Float64Array(n), d = new Float64Array(n);
  const line = (len: number) => {
    let k = 0; v[0] = 0; z[0] = -FAR; z[1] = FAR;
    for (let q = 1; q < len; q++) {
      let s = (g[q] + q * q - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = (g[q] + q * q - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = FAR;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + g[v[k]]; }
  };
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) g[y] = f[y * w + x]; line(h); for (let y = 0; y < h; y++) f[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) g[x] = f[y * w + x]; line(w); for (let x = 0; x < w; x++) f[y * w + x] = d[x]; }
  return f;
}
/** Signed distance to a shape's edge, sheet units (inside is positive), sampled on a coarse grid. */
interface Field { x0: number; y0: number; w: number; h: number; step: number; d: Float32Array }
function distanceField(sheet: InkRisoSheet, shape: PenShape, pad: number): Field {
  const S = sheet.spec.scale;
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  for (const p of shape) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); }
  const big = (bx1 - bx0 + 2 * pad) * (by1 - by0 + 2 * pad) * S * S > 500000, step = big ? Math.max(1, Math.round(S * 0.9)) : 1, k = S / step;
  const m = inkFillMask({ ...sheet, w: Math.ceil(sheet.w / step), h: Math.ceil(sheet.h / step), spec: { ...sheet.spec, scale: k } }, shape, pad * k);
  const n = m.w * m.h, a = new Float64Array(n), c = new Float64Array(n), d = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = m.a[i]; a[i] = v >= 1 ? FAR : v <= 0 ? 0 : Math.max(0, v - 0.5) ** 2; c[i] = v >= 1 ? 0 : v <= 0 ? FAR : Math.max(0, 0.5 - v) ** 2; }
  if (n) { edt(a, m.w, m.h); edt(c, m.w, m.h); }
  for (let i = 0; i < n; i++) d[i] = (Math.min(1e4, Math.sqrt(a[i])) - Math.min(1e4, Math.sqrt(c[i]))) / k;
  return { x0: m.x0, y0: m.y0, w: m.w, h: m.h, step, d };
}

// ---- washes --------------------------------------------------------------------------------------------------------------------
export interface InkBloomOptions {
  /** Tone at a point of the sheet's own units, or one tone. */
  tone: number | ((x: number, y: number) => number);
  /** Edge softness, pen units: 0.6 is a dried edge, 20 a lost one. A function makes one shape both. */
  soft?: number | ((x: number, y: number) => number);
  /** How far the edge wanders from the shape, and the length of that wander (pen units). */
  wander?: number; wave?: number;
  /** Feathered fringe: how far ink creeps along the fibres, and the fringe's tooth. */
  fringe?: number; tooth?: number;
  /** Pigment carried to the edge, 0–1, and the width of that rim. */
  rim?: number; rimWidth?: number;
  /** The pale line clean water leaves inside the edge: strength, depth from the edge, width. */
  halo?: number; haloAt?: number; haloWidth?: number;
  /** Uneven pigment 0–1, and the size of its clouds. */
  mottle?: number; cloud?: number;
  /** "glaze" adds ink; "lift" is clean water dropped in: it pushes ink out of the shape and into the rim. */
  mode?: "glaze" | "lift";
  seed: number;
}
/** A wash. The shape is in sheet units (`pen.shape`). */
export function inkBloom(pen: InkRisoPen, plate: string, shape: PenShape, o: InkBloomOptions): void {
  const sheet = pen.sheet, S = sheet.spec.scale, buf = sheet.plates[plate].tone, seed = o.seed * 61 + sheet.spec.seed;
  const wander = o.wander ?? 6, wave = o.wave ?? 46, fringe = o.fringe ?? 2, tooth = o.tooth ?? 3.2, rim = o.rim ?? 0.35, rimW = o.rimWidth ?? 4;
  const halo = o.halo ?? 0, haloAt = o.haloAt ?? 10, haloW = o.haloWidth ?? 3, mottle = o.mottle ?? 0.25, cloud = o.cloud ?? 60;
  const softF = typeof o.soft === "function" ? o.soft : null, soft0 = typeof o.soft === "number" ? o.soft : 0.7, toneF = typeof o.tone === "function" ? o.tone : null, tone0 = typeof o.tone === "number" ? o.tone : 1;
  const maxSoft = softF ? 60 : soft0, F = distanceField(sheet, shape, wander + fringe + maxSoft + 4);
  if (F.w < 2 || F.h < 2) return;
  const ox = F.x0 * F.step, oy = F.y0 * F.step, W = Math.min(sheet.w - ox, F.w * F.step), H = Math.min(sheet.h - oy, F.h * F.step);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = clamp((x + 0.5) / F.step - 0.5, 0, F.w - 1.001), gy = clamp((y + 0.5) / F.step - 0.5, 0, F.h - 1.001), ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, j = iy * F.w + ix;
    let d = (F.d[j] * (1 - fx) + F.d[j + 1] * fx) * (1 - fy) + (F.d[j + F.w] * (1 - fx) + F.d[j + F.w + 1] * fx) * fy;
    if (d < -(wander + fringe + maxSoft)) continue;
    const X = (x + ox) / S, Y = (y + oy) / S, s = softF ? softF(X, Y) : soft0;
    d += (inkFbm2(seed, X / wave, Y / wave, 3) - 0.5) * 2 * wander;
    if (fringe && Math.abs(d) < fringe * 3 + s) { const q = inkNoise2(seed + 4, X / tooth, Y / tooth) * 0.65 + inkNoise2(seed + 5, X / (tooth * 0.42), Y / (tooth * 0.42)) * 0.35; d += (q - 0.5) * 2 * fringe; }
    const c = s <= 0.8 ? clamp(d * S / Math.max(0.6, s * S) + 0.5) : sstep(-s * 0.5, s, d);
    if (c <= 0.002) continue;
    const q = (y + oy) * sheet.w + x + ox, inside = Math.max(0, d), edge = Math.exp(-inside / rimW);
    let t = toneF ? toneF(X, Y) : tone0;
    if (halo) { const at = haloAt * (0.6 + 0.9 * inkNoise2(seed + 7, X / 30, Y / 30)), k = (inside - at) / haloW; t *= 1 - halo * Math.exp(-k * k) * (0.35 + 0.65 * inkNoise2(seed + 8, X / 42, Y / 42)); }
    if (mottle) t *= 1 + mottle * (inkFbm2(seed + 11, X / cloud, Y / cloud, 4) - 0.5) * 2 + mottle * 0.45 * (inkNoise2(seed + 12, X / 2.2, Y / 2.2) - 0.5);
    if (o.mode === "lift") { const k = clamp(t * c * (1 - edge * 0.9)); buf[q] = clamp(buf[q] * (1 - k) + rim * edge * c * buf[q] * 0.6); continue; }
    t *= 1 + rim * edge * (0.55 + 0.9 * inkNoise2(seed + 9, X / 24, Y / 24)) * (s > 6 ? 0.3 : 1);
    buf[q] = 1 - (1 - buf[q]) * (1 - take(t * c));
  }
}
/** The outline of a swollen line: [x, y, radius] nodes in the pen's units, as a shape in sheet units. */
export function inkBlob(pen: InkRisoPen, nodes: readonly (readonly [number, number, number])[]): number[][] {
  const P = inkSpline(nodes, 2), L: number[][] = [], R: number[][] = [], n = P.length;
  const cap = (c: number[], a0: number) => Array.from({ length: 11 }, (_, i) => { const a = a0 + (i / 10) * Math.PI; return [c[0] + Math.cos(a) * c[2], c[1] + Math.sin(a) * c[2]]; });
  for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], th = Math.atan2(b[1] - a[1], b[0] - a[0]), r = Math.max(0.2, P[i][2]); L.push([P[i][0] + Math.sin(th) * r, P[i][1] - Math.cos(th) * r]); R.push([P[i][0] - Math.sin(th) * r, P[i][1] + Math.cos(th) * r]); }
  const a0 = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]), a1 = Math.atan2(P[n - 1][1] - P[n - 2][1], P[n - 1][0] - P[n - 2][0]);
  return [...L, ...cap(P[n - 1], a1 - Math.PI / 2), ...R.reverse(), ...cap(P[0], a0 + Math.PI / 2)].map(p => pen.at(p[0], p[1]));
}

// ---- sheets of strands -----------------------------------------------------------------------------------------------------------
/** Rasterise the surface between guide curves; `fn` gets across (u), along (v), and the width and length there (sheet units). */
function eachSurfacePixel(sheet: InkRisoSheet, guides: readonly (readonly (readonly number[])[])[], fn: (q: number, u: number, v: number, x: number, y: number, cover: number, du: number) => void): { width: number; length: number } {
  const S = sheet.spec.scale, G = guides.length, M = 96, dense = guides.map(g => { const p = inkSpline(g, 1.5); return Array.from({ length: M + 1 }, (_, i) => { const t = (i / M) * (p.length - 1), k = Math.min(p.length - 2, t | 0), f = t - k; return [lerp(p[k][0], p[k + 1][0], f), lerp(p[k][1], p[k + 1][1], f)]; }); });
  const N = (G - 1) * 8, grid: number[][][] = [];
  for (let j = 0; j <= M; j++) { const across = G > 2 ? inkSplineAt(dense.map(g => g[j]), N) : Array.from({ length: N + 1 }, (_, i) => [lerp(dense[0][j][0], dense[1][j][0], i / N), lerp(dense[0][j][1], dense[1][j][1], i / N)]); grid.push(across); }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, width = 0, length = 0;
  for (const row of grid) for (const p of row) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (const row of grid) for (let i = 1; i < row.length; i++) width += Math.hypot(row[i][0] - row[i - 1][0], row[i][1] - row[i - 1][1]) / grid.length;
  for (let j = 1; j < grid.length; j++) { const i = N >> 1; length += Math.hypot(grid[j][i][0] - grid[j - 1][i][0], grid[j][i][1] - grid[j - 1][i][1]); }
  const bx = Math.max(0, Math.floor(x0 * S)), by = Math.max(0, Math.floor(y0 * S)), bw = Math.min(sheet.w, Math.ceil(x1 * S) + 1) - bx, bh = Math.min(sheet.h, Math.ceil(y1 * S) + 1) - by;
  if (bw <= 0 || bh <= 0) return { width, length };
  const U = new Float32Array(bw * bh).fill(-1), V = new Float32Array(bw * bh);
  const tri = (a: number[], b: number[], c: number[], ta: number[], tb: number[], tc: number[]) => {
    const ax = a[0] * S - bx, ay = a[1] * S - by, cx = c[0] * S - bx, cy = c[1] * S - by, ux = b[0] * S - bx, uy = b[1] * S - by, det = (uy - cy) * (ax - cx) + (cx - ux) * (ay - cy);
    if (Math.abs(det) < 1e-9) return;
    const X0 = Math.max(0, Math.floor(Math.min(ax, ux, cx) - 0.5)), X1 = Math.min(bw - 1, Math.ceil(Math.max(ax, ux, cx))), Y0 = Math.max(0, Math.floor(Math.min(ay, uy, cy) - 0.5)), Y1 = Math.min(bh - 1, Math.ceil(Math.max(ay, uy, cy)));
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const px = x + 0.5, py = y + 0.5, l0 = ((uy - cy) * (px - cx) + (cx - ux) * (py - cy)) / det, l1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det, l2 = 1 - l0 - l1;
      if (l0 < -1e-4 || l1 < -1e-4 || l2 < -1e-4) continue;
      const i = y * bw + x; U[i] = l0 * ta[0] + l1 * tb[0] + l2 * tc[0]; V[i] = l0 * ta[1] + l1 * tb[1] + l2 * tc[1];
    }
  };
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const p = grid[j][i], q = grid[j][i + 1], r = grid[j + 1][i], s = grid[j + 1][i + 1], u0 = i / N, u1 = (i + 1) / N, v0 = j / M, v1 = (j + 1) / M;
    tri(p, q, r, [u0, v0], [u1, v0], [u0, v1]); tri(q, s, r, [u1, v0], [u1, v1], [u0, v1]);
  }
  // how much of a pixel the form covers: where it turns away from the viewer its edge is the form's own, and it must not step
  const on = (x: number, y: number) => (x + bx < 0 || y + by < 0 || x + bx >= sheet.w || y + by >= sheet.h ? 1 : x >= 0 && y >= 0 && x < bw && y < bh && U[y * bw + x] >= 0 ? 1 : 0);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x; if (U[i] < 0) continue;
    const c = (2 * (on(x - 1, y) + on(x + 1, y) + on(x, y - 1) + on(x, y + 1)) + on(x - 1, y - 1) + on(x + 1, y - 1) + on(x - 1, y + 1) + on(x + 1, y + 1)) / 12;
    // at a side the pixel's own distance from it: counted neighbours come and go along a slanting edge, which draws a dashed line
    const u = U[i], l = on(x - 1, y) && x > 0 && U[i - 1] >= 0 ? u - U[i - 1] : NaN, r = x < bw - 1 && U[i + 1] >= 0 ? U[i + 1] - u : NaN, t = y > 0 && U[i - bw] >= 0 ? u - U[i - bw] : NaN, b = y < bh - 1 && U[i + bw] >= 0 ? U[i + bw] - u : NaN;
    const gx = Number.isNaN(l) ? (Number.isNaN(r) ? 0 : r) : Number.isNaN(r) ? l : (l + r) / 2, gy = Number.isNaN(t) ? (Number.isNaN(b) ? 0 : b) : Number.isNaN(b) ? t : (t + b) / 2, du = Math.hypot(gx, gy), d = du > 1e-6 ? Math.min(u, 1 - u) / du : 9;
    fn((y + by) * sheet.w + x + bx, u, V[i], x + bx, y + by, d < 1 ? d : d < 2 ? Math.max(d - 1, clamp((c - 0.3) / 0.7)) : clamp((c - 0.3) / 0.7), du);
  }
  return { width, length };
}
function inkSplineAt(pts: readonly (readonly number[])[], n: number): number[][] {
  const p = inkSpline(pts, 0.75);
  return Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * (p.length - 1), k = Math.min(p.length - 2, t | 0), f = t - k; return [lerp(p[k][0], p[k + 1][0], f), lerp(p[k][1], p[k + 1][1], f)]; });
}
const meanGap = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[Math.min(i, b.length - 1)][0], p[1] - b[Math.min(i, b.length - 1)][1]), 0) / a.length;

export interface InkHairOptions {
  /** Tone of the mass, 0–1. */
  load: number;
  /** Share of the length over which the roots feather in, and the tips run out. */
  root?: number | ((u: number) => number); tip?: number;
  /** Slits where the paper shows between locks: how many, where along (0–1), their width in sheet units and how open, 0–1. */
  slits?: { n: number; from: number; to: number; width: number; open?: number };
  /** Share of the width over which strands peel off at the first and the last guide. */
  edge?: readonly [number, number];
  /** Where light opens the mass: place along, width, strength, and how it leans across. */
  sheen?: readonly { at: number; width: number; amount: number; lean?: number }[];
  /** A lit crest along the lock: where across it (0–1) and how much it opens, 0–1. Its strands break it up, so it reads round and not polished. */
  round?: { at: number; amount: number; width?: number };
  /** Width of a strand, sheet units; how strongly strands differ, 0–1. */
  strand?: number; streak?: number;
  /** Tone along the strands (v) as a factor. */
  along?: (v: number, u: number) => number;
  /** Dry brush 0–1 at the start and the end. */
  dry?: number; dryEnd?: number;
  /** 0–1: how much of the ink already there gives way, so a lit strand stays light over a dark mass. Default 0. */
  cover?: number;
  seed: number;
}
/** A sheet of hair between guide curves (pen units, root first, all with the same number of nodes). */
export function inkHair(pen: InkRisoPen, plate: string, guides: readonly (readonly PenPoint[])[], o: InkHairOptions): void {
  const sheet = pen.sheet, buf = sheet.plates[plate].tone, seed = o.seed * 89 + sheet.spec.seed, G = guides.map(g => g.map(p => pen.at(p[0], p[1])));
  let W = 0; for (let i = 1; i < G.length; i++) W += meanGap(G[i - 1], G[i]);
  const strand = o.strand ?? 1.5, K = W / strand, rootF = typeof o.root === "function" ? o.root : null, root0 = typeof o.root === "number" ? o.root : 0, tip = o.tip ?? 0, [e0, e1] = o.edge ?? [0.04, 0.04], streak = o.streak ?? 0.5, dry0 = o.dry ?? 0, dry1 = o.dryEnd ?? dry0, cover = o.cover ?? 0, S = sheet.spec.scale;
  const slits = Array.from({ length: o.slits?.n ?? 0 }, (_, i) => { const z = o.slits!, at = lerp(z.from, z.to, inkHash2(seed + 41, i, 0)), l = (0.1 + 0.22 * inkHash2(seed + 41, i, 1)) * (z.to - z.from + 0.4); return { u: (i + 0.2 + 0.6 * inkHash2(seed + 41, i, 2)) / z.n, at, l, w: (z.width * (0.35 + 0.9 * inkHash2(seed + 41, i, 3) ** 2)) / W, drift: (inkHash2(seed + 41, i, 4) - 0.5) * 0.06, open: (z.open ?? 1) * (0.55 + 0.45 * inkHash2(seed + 41, i, 5)) }; });
  eachSurfacePixel(sheet, G, (q, u, v, x, y, covers, du) => {
    const root = rootF ? rootF(u) : root0, k = u * K, n1 = inkNoise2(seed, k * 0.085, v * 1.3), n2 = inkNoise2(seed + 1, k * 0.31 + v * 0.6, v * 2.2), n3 = inkNoise2(seed + 2, k + (inkNoise2(seed + 9, k * 0.2, v * 2) - 0.5) * 1.6, v * 3.4), st = 0.4 * n1 + 0.34 * n2 + 0.26 * n3;
    const s1 = inkHash2(seed + 3, Math.floor(k * 0.9), 0), s2 = inkNoise2(seed + 4, k * 0.23, 0.5), own = 0.5 * inkNoise2(seed + 5, k * 1.1, v * 0.7) + 0.3 * s2 + 0.2 * s1;
    let a = covers;
    if (root) { const g = sstep(0, root, v); a *= 0.2 * g * g + 0.8 * comb(sstep(0.04, 1, v / root), own, 0.75); }
    if (tip) a *= comb(sstep(0, tip, 1 - v), 0.5 * own + 0.5 * inkNoise2(seed + 6, k * 0.5, 3), 0.95);
    if (e0) a *= comb(sstep(0, Math.max(e0, 3.2 * du), u + e0 * 0.5 * (inkNoise2(seed + 7, v * 7, 1) - 0.5)), n3 * 0.7 + 0.3 * inkNoise2(seed + 14, v * 3, k), 0.9);
    if (e1) a *= comb(sstep(0, Math.max(e1, 3.2 * du), 1 - u + e1 * 0.5 * (inkNoise2(seed + 8, v * 7, 1) - 0.5)), n3 * 0.7 + 0.3 * inkNoise2(seed + 15, v * 3, k), 0.9);
    if (a <= 0.004) return;
    let t = o.load * (1 + streak * (st - 0.5) * 1.5) * (0.92 + 0.2 * (inkFbm2(seed + 10, x / (70 * S), y / (70 * S), 2) - 0.3));
    // few strands catch it, and those go pale: many half-lit ones would only grey the mass, and print solid
    const lit = (o.round || o.sheen) ? sstep(0.5, 0.74, 0.35 * n2 + 0.65 * n3) : 0;
    for (const s of o.sheen ?? []) { const d = (v - s.at - (s.lean ?? 0) * (u - 0.5) - 0.16 * (own - 0.5) - 0.05 * (n2 - 0.5)) / s.width, g = Math.exp(-d * d) * s.amount; t *= 1 - clamp(g * (0.1 + 3 * lit), 0, 0.86); }
    for (const z of slits) { const f = (v - z.at) / z.l; if (f > -1 && f < 1) { const w = z.w * (1 - f * f) ** 1.5, d = Math.abs(u - z.u - z.drift * f - 0.004 * (n2 - 0.5)) / Math.max(1e-4, w); if (d < 1.4) t *= 1 - z.open * sstep(1.25, 0.6, d + 0.5 * (n3 - 0.5)); } }
    if (o.round) {
      // every strand comes into the light and leaves it at a place of its own, so no edge of it lines up across the lock
      const own2 = inkHash2(seed + 21, Math.floor(k * 0.6), 1), d = (u - o.round.at - 0.1 * (n1 - 0.5) - 0.06 * (n2 - 0.5)) / (o.round.width ?? 0.28), in0 = 0.02 + 0.42 * own, out0 = 1 - 0.5 * own2;
      t *= 1 - clamp(Math.exp(-d * d) * o.round.amount * (0.1 + 3 * lit) * sstep(in0, in0 + 0.1, v) * sstep(out0, out0 - 0.14, v), 0, 0.86);
    }
    if (o.along) t *= o.along(v, u);
    const dry = lerp(dry0, dry1, sstep(0.2, 1, v));
    if (dry > 0.01) { const tooth = 0.6 * inkNoise2(seed + 11, x / 2.3, y / 2.3) + 0.4 * inkNoise2(seed + 12, x / 5.1, y / 5.1), b = 0.55 * n2 + 0.25 * n3 + 0.2 * n1; a *= sstep(-0.1, 0.1, 1.06 - dry - (0.72 * b + 0.28 * tooth)); }
    // a covering lock replaces what it lies on; laid over the rest like a glaze, its own soft edge would open a pale line in the dark
    const ink = take(clamp(t)), glaze = 1 - (1 - buf[q]) * (1 - ink * a);
    buf[q] = lerp(glaze, lerp(buf[q], ink, a), cover);
  });
}

// ---- strokes ---------------------------------------------------------------------------------------------------------------------
export interface InkSideOptions {
  /** Tone at the brush's tip edge and at its belly edge. */
  tip: number; belly: number;
  /** Which edge of the path the tip runs on: 1 is the right hand of its direction, −1 the left, 0 the centre. */
  side?: 1 | -1 | 0;
  /** Ink pooled where the brush landed, 0–1; a rim of carried pigment, 0–1. */
  head?: number; rim?: number;
  /** Dry brush 0–1 at the start and the end, and its bristles. */
  dry?: number; dryEnd?: number; bristles?: number;
  /** How far wet edges bleed, sheet units. */
  bleed?: number;
  /** How strongly the bristles show inside the stroke. Default 0.34. */
  grain?: number;
  seed: number;
}
/** A side-tip stroke: `points` in pen units with pressure, `width` in sheet units at full pressure. */
export function inkSide(pen: InkRisoPen, plate: string, points: readonly PenNode[], width: number, o: InkSideOptions): void {
  const sheet = pen.sheet, S = sheet.spec.scale, buf = sheet.plates[plate].tone, seed = o.seed * 71 + sheet.spec.seed, side = o.side ?? 1, head = o.head ?? 0.3, rim = o.rim ?? 0.25, dry0 = o.dry ?? 0, dry1 = o.dryEnd ?? dry0, B = o.bristles ?? Math.max(6, width * 0.55), bleed = o.bleed ?? 0.5, grain = o.grain ?? 0.34;
  const P = inkSpline(points.map(p => [...pen.at(p[0], p[1]), p[2] ?? 1]), 1.2), n = P.length, len = new Float32Array(n);
  for (let i = 1; i < n; i++) len[i] = len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const total = len[n - 1] || 1, L: number[][] = [], R: number[][] = [], rad: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 2)], b = P[Math.min(n - 1, i + 2)], th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const r = Math.max(0.15, 0.5 * width * Math.max(0, P[i][2]) * (1 + 0.1 * (inkNoise2(seed, len[i] / 40, 1) - 0.5))), pad = r + bleed + 1.2 / S; rad.push(r);
    L.push([P[i][0] + Math.sin(th) * pad, P[i][1] - Math.cos(th) * pad]); R.push([P[i][0] - Math.sin(th) * pad, P[i][1] + Math.cos(th) * pad]);
  }
  eachSurfacePixel(sheet, [L, R], (q, u, v, x, y) => {
    const s = v * total, fi = v * (n - 1), i = Math.min(n - 2, fi | 0), r = lerp(rad[i], rad[i + 1], fi - i), pad = r + bleed + 1.2 / S, w = (2 * u - 1) * pad / r;
    let d = r - Math.abs(w) * r;
    if (s < r) d = Math.min(d, r - Math.hypot(r - s, w * r));
    if (total - s < r && P[n - 1][2] > 0.15) d = Math.min(d, r - Math.hypot(r - (total - s), w * r));
    const tooth = 0.6 * inkNoise2(seed + 11, x / 2.3, y / 2.3) + 0.4 * inkNoise2(seed + 12, x / 5.1, y / 5.1);
    d += (tooth - 0.5) * Math.min(1.2, 0.5 + r * 0.03) + (inkNoise2(seed + 13, s / 14, w > 0 ? 1 : 5) - 0.5) * Math.min(1.2, r * 0.12);
    let c = bleed > 0.6 ? sstep(-bleed, bleed, d) : clamp(d * S + 0.5);
    if (c <= 0.003) return;
    const across = side === 0 ? Math.abs(w) : clamp(0.5 + 0.5 * w * -side), a = across + 0.22 * (inkNoise2(seed + 2, s / 60, w * 1.4) - 0.5), f = s / total;
    let t = lerp(o.tip, o.belly, sstep(0.02, 0.86, a));
    t *= 1 + head * Math.exp(-s / (r * 1.6 + 3)) + rim * Math.exp(-Math.max(0, d) / 1.6) * 0.6;
    const bn = 0.6 * inkNoise2(seed + 31, (w + 0.14 * (inkNoise2(seed + 3, s / 60, 0) - 0.5)) * B * 0.5 + 40, s / Math.max(34, width * 4)) + 0.4 * inkNoise2(seed + 32, w * B * 1.2 + 80, s / Math.max(20, width * 2.2));
    t *= Math.max(0, 1 + grain * (bn - 0.5) * (1 + across));
    const dry = lerp(dry0, dry1, sstep(0.2, 1, f));
    if (dry > 0.01) { const avail = 1.08 - dry * (0.95 + 0.2 * w * w); c *= sstep(-0.09, 0.09, avail - (0.74 * sstep(0.12, 0.88, bn) + 0.26 * tooth)); }
    buf[q] = 1 - (1 - buf[q]) * (1 - take(clamp(t)) * c);
  });
}
/** A fine line. Pressure sets its width and `ink` → `inkEnd` its strength; `mid` is the strength half-way when it differs. */
export function inkThread(pen: InkRisoPen, plate: string, points: readonly PenNode[], width: number, o: { ink?: number; inkEnd?: number; mid?: number; tone?: (t: number) => number; tremor?: number; seed: number }): void {
  const sheet = pen.sheet, S = sheet.spec.scale, buf = sheet.plates[plate].tone, seed = o.seed * 53 + sheet.spec.seed, i0 = o.ink ?? 0.9, i1 = o.inkEnd ?? i0, im = o.mid ?? (i0 + i1) / 2, tone = o.tone ?? ((f: number) => (f < 0.5 ? lerp(i0, im, f * 2) : lerp(im, i1, f * 2 - 1)));
  const P = inkSpline(points.map(p => [...pen.at(p[0], p[1]), p[2] ?? 1]), 1.1 / S), n = P.length;
  if (n < 2) return;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const cover = new Map<number, number>(), depth = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), r = Math.max(0, 0.5 * width * P[i][2] * (1 + 0.16 * (inkNoise2(seed, i / 22, 2) - 0.5)) * S), lean = (inkNoise2(seed + 1, i / 60, 4) - 0.5) * (o.tremor ?? 0.5) * S, cx = P[i][0] * S + lean, cy = P[i][1] * S + lean * 0.6;
    if (r <= 0.02) continue;
    const R = Math.max(r, 0.5) + 1, t = tone(f), thin = Math.min(1, r / 0.5);
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(sheet.h - 1, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(sheet.w - 1, cx + R); x++) {
      const c = clamp(Math.max(r, 0.5) - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5) * thin, q = y * sheet.w + x;
      if (c > 0.01 && c * t > (cover.get(q) ?? 0) * (depth.get(q) ?? 0)) { cover.set(q, c); depth.set(q, t); }
    }
  }
  // the tooth breaks a thin line; a loaded one fills it
  for (const [q, c] of cover) { const d = depth.get(q)!, tooth = 1 + (0.36 * inkNoise2(sheet.spec.seed + 11, (q % sheet.w) / 2.3, ((q / sheet.w) | 0) / 2.3) - 0.18) * clamp(1.4 - 1.3 * d); buf[q] = 1 - (1 - buf[q]) * (1 - take(clamp(d * Math.min(1, tooth))) * c); }
}

// ---- painting --------------------------------------------------------------------------------------------------------------------
/** The sheet as a painting on xuan paper: the same masters in continuous ink, registered, without screens. */
export function paintInk(sheet: InkRisoSheet): InkRisoPrint {
  const { w, h, spec } = sheet, S = spec.scale, N = w * h, seed = spec.seed, paper = inkRgb(spec.paper), rgb = new Float32Array(N * 3), coverage: Record<string, Float32Array> = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = y * w + x, tooth = inkNoise2(seed + 73, x / (1.6 * S), y / (1.6 * S)), laid = inkNoise2(seed + 75, x / (26 * S), y / (2.2 * S));
    const shade = 1 + (inkFbm2(seed + 74, x / (150 * S), y / (150 * S), 3) - 0.5) * 0.05 + (tooth - 0.5) * 0.016 + (laid - 0.5) * 0.012;
    rgb[q * 3] = paper[0] * shade; rgb[q * 3 + 1] = paper[1] * shade; rgb[q * 3 + 2] = paper[2] * (shade - 0.006);
  }
  const fibres = Math.round((spec.width * spec.height) / 5200);
  for (let i = 0; i < fibres; i++) {
    let x = inkHash2(seed + 81, i, 0) * w, y = inkHash2(seed + 81, i, 1) * h, a = inkHash2(seed + 81, i, 2) * 6.283;
    const L = (8 + 34 * inkHash2(seed + 81, i, 3)) * S, k = inkHash2(seed + 81, i, 4) < 0.6 ? 0.972 : 1.02;
    for (let s = 0; s < L; s += 0.7) { x += Math.cos(a) * 0.7; y += Math.sin(a) * 0.7; a += (inkHash2(seed + 82, i, s * 10) - 0.5) * 0.14; const X = x | 0, Y = y | 0; if (X < 0 || Y < 0 || X >= w || Y >= h) break; const q = (Y * w + X) * 3; rgb[q] *= k; rgb[q + 1] *= k; rgb[q + 2] *= k; }
  }
  for (const ps of spec.plates) {
    const p = sheet.plates[ps.id], ink = inkRgb(ps.ink), cov = new Float32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const q = y * w + x, c = 1 - (1 - p.solid[q]) * (1 - p.tone[q]);
      if (c <= 0.002) continue;
      // Pigment settles in the paper's hollows: strongest in middle tones.
      const g = inkNoise2(seed + 73, x / (1.6 * S), y / (1.6 * S)) * 0.6 + inkNoise2(seed + 76, x / (0.7 * S), y / (0.7 * S)) * 0.4;
      const v = clamp(c * (1 + 0.3 * (g - 0.5) * (1 - c)) * (ps.density ?? 1));
      cov[q] = v;
      for (let k = 0; k < 3; k++) rgb[q * 3 + k] *= 1 - v * (1 - ink[k]);
    }
    coverage[ps.id] = cov;
  }
  const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055), rgba = new Uint8ClampedArray(N * 4);
  for (let q = 0; q < N; q++) { for (let k = 0; k < 3; k++) rgba[q * 4 + k] = Math.round(enc(clamp(rgb[q * 3 + k])) * 255); rgba[q * 4 + 3] = 255; }
  return { width: w, height: h, rgba, coverage };
}
