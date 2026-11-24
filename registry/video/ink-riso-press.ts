/**
 * INK-RISO1: Chinese brush ink printed as risograph spot colours, on the CPU, independent of the DOM and of a clock.
 *
 *   brush   a stroke is a spline with pressure; every pixel it touches knows where it lies along and across the brush,
 *           so bristles split along the stroke (飛白), edges follow the paper's tooth, and a dry brush runs out of ink
 *   wash    a filled shape with a watery edge, a pooled rim and a tonal gradient
 *   plate   each spot ink has two masters: `solid` (line work, printed without a screen) and `tone` (screened)
 *   press   screens (AM dots or a grain-touch scatter), registration, dot gain, pinholes and mottle, then inks overprinted
 *           as transmittances on cotton paper
 *
 * A picture is drawn back to front: `knock` clears every plate inside a shape, so a figure is opaque paper first and
 * never shows the background through its face.
 */

export type Pt = readonly [number, number];
/** A brush node: x, y in design units, pressure 0–1 (the share of the stroke's full width). */
export type BrushNode = readonly [number, number, number];
export interface InkRisoPlateSpec {
  id: string;
  /** The ink, as a solid on white uncoated stock (sRGB hex). */
  ink: string;
  /** Screen: round dots at an angle ("am"), or a fine random grain ("grain"). */
  screen: "am" | "grain";
  /** Dot pitch (am) or grain size (grain) in design units, and the screen angle in degrees (am). */
  cell: number; angle: number;
  /** Registration error: shift in design units, and rotation in degrees about the sheet's centre. */
  register: Pt; rotate?: number;
  /** Density of a solid, 0–1 (the rest is paper showing through a translucent ink). */
  density?: number;
  /** How unevenly the drum lays ink, and how many pinholes it leaves: 1 is a riso drum's usual. */
  mottle?: number; pinholes?: number;
  /** A body colour (粉): it covers the paper and may be lighter than it. Only paintings know it (`paintInk`, film cels), and it must come before the inks laid over it. */
  opaque?: boolean;
}
export interface InkRisoSheetSpec {
  /** Design size and output pixels per design unit. */
  width: number; height: number; scale: number;
  paper: string;
  seed: number;
  /** Plates in print order. */
  plates: readonly InkRisoPlateSpec[];
  /** Unprinted margin around the image, design units: a risograph cannot print to the edge of the sheet. */
  margin?: number;
}
export interface InkRisoPlate { spec: InkRisoPlateSpec; solid: Float32Array; tone: Float32Array }
/**
 * What a sheet also remembers when it is one layer of a larger painting: how much of what lies under it each pixel hides (`knock`
 * hides it all when it clears the last plate, the darkest), and when ink reached each pixel, as the number of the mark plus the share of that mark already drawn. `marks`
 * holds how long each mark takes the hand, in design units of travel.
 */
export interface InkRisoLayer { cover: Float32Array; when: Float32Array; gain: Float32Array; marks: number[] }
export interface InkRisoSheet { spec: InkRisoSheetSpec; w: number; h: number; plates: Record<string, InkRisoPlate>; layer?: InkRisoLayer }

export interface BrushStroke {
  points: readonly BrushNode[];
  /** Width at full pressure, design units. */
  width: number;
  /** Ink density 0–1: 1 prints solid; less goes to the screened master. */
  ink?: number;
  /** Dryness 0 (loaded) … 1 (only a few bristles), and at the stroke's end. */
  dry?: number; dryEnd?: number;
  /** Edge roughness against the paper, 0–1. */
  rough?: number;
  /** Number of bristle clumps across the width. */
  bristles?: number;
  /** A slanted brush: how much the width swells across `slantAngle` (degrees). */
  slant?: number; slantAngle?: number;
  /** Streak length in design units. */
  streak?: number;
  /** "lift" takes ink off both of the plate's masters instead of laying it (a wiped line, a resist). */
  mode?: "lay" | "lift";
  seed?: number;
}
export interface WashOptions {
  /** Tone 0–1, or a tone per point (design units). */
  tone: number | ((x: number, y: number) => number);
  /** Edge softness, design units (wet paper), and how far the edge wanders. */
  soft?: number; wander?: number;
  /** Darker rim where the wash pools, 0–1, and the rim's width. */
  pool?: number; poolWidth?: number;
  /** Granulation 0–1. */
  grain?: number;
  /** "max" lays it over, "multiply" glazes it, "erase" lifts ink. */
  mode?: "max" | "glaze" | "erase";
  seed?: number;
}

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sstep = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

// ---- noise ---------------------------------------------------------------------------------------------------------------------
export function inkHash2(seed: number, x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
export function inkNoise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = inkHash2(seed, xi, yi), b = inkHash2(seed, xi + 1, yi), c = inkHash2(seed, xi, yi + 1), d = inkHash2(seed, xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function inkFbm2(seed: number, x: number, y: number, octaves = 4): number {
  let s = 0, a = 0.5, t = 0;
  for (let o = 0; o < octaves; o++) { s += a * inkNoise2(seed + o * 57, x, y); t += a; a *= 0.5; x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; }
  return s / t;
}

// ---- sheet ---------------------------------------------------------------------------------------------------------------------
export function createInkRisoSheet(spec: InkRisoSheetSpec, o: { /** Keep cover and stroke order, for a layer of a larger painting. */ layer?: boolean } = {}): InkRisoSheet {
  const w = Math.round(spec.width * spec.scale), h = Math.round(spec.height * spec.scale);
  const plates: Record<string, InkRisoPlate> = {};
  for (const p of spec.plates) plates[p.id] = { spec: p, solid: new Float32Array(w * h), tone: new Float32Array(w * h) };
  return o.layer ? { spec, w, h, plates, layer: { cover: new Float32Array(w * h), when: new Float32Array(w * h), gain: new Float32Array(w * h), marks: [] } } : { spec, w, h, plates };
}
/** A new mark on a layer; `travel` is how far the hand goes for it, design units. Returns its number (0 when the sheet keeps no order). */
export function inkMarkStart(sheet: InkRisoSheet, travel: number): number { return sheet.layer ? sheet.layer.marks.push(Math.max(1, travel)) - 1 : 0; }
/** Ink reached a pixel: `at` is the mark's number plus the share of it drawn, `gain` how much darker the pixel got. The mark that darkened it most keeps the time. */
export function inkMarkHit(layer: InkRisoLayer, q: number, at: number, gain: number): void { if (gain > layer.gain[q]) { layer.gain[q] = gain; layer.when[q] = at; } }

// ---- curves --------------------------------------------------------------------------------------------------------------------
/** Centripetal Catmull–Rom through nodes of any dimension, sampled about every `step` units. */
export function inkSpline<T extends readonly number[]>(pts: readonly T[], step: number, closed = false): number[][] {
  const n = pts.length;
  if (n < 2) return pts.map(p => [...p]);
  const at = (i: number): readonly number[] => {
    if (closed) return pts[((i % n) + n) % n];
    if (i < 0) return pts[0].map((v, k) => 2 * v - pts[1][k]);
    if (i >= n) return pts[n - 1].map((v, k) => 2 * v - pts[n - 2][k]);
    return pts[i];
  };
  const out: number[][] = [];
  const dim = pts[0].length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const d = (a: readonly number[], b: readonly number[]) => Math.max(1e-4, Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1])));
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(2, Math.ceil(len / step));
    for (let j = i === 0 ? 0 : 1; j <= m; j++) {
      const t = t1 + (t2 - t1) * (j / m);
      const q: number[] = [];
      for (let k = 0; k < dim; k++) {
        const A1 = ((t1 - t) * p0[k] + t * p1[k]) / t1, A2 = ((t2 - t) * p1[k] + (t - t1) * p2[k]) / (t2 - t1), A3 = ((t3 - t) * p2[k] + (t - t2) * p3[k]) / (t3 - t2);
        const B1 = ((t2 - t) * A1 + t * A2) / t2, B2 = ((t3 - t) * A2 + (t - t1) * A3) / (t3 - t1);
        q.push(((t2 - t) * B1 + (t - t1) * B2) / (t2 - t1));
      }
      out.push(q);
    }
  }
  if (closed) out.pop();
  return out;
}

// ---- brush ---------------------------------------------------------------------------------------------------------------------
interface Scratch { depth: Float32Array; s: Float32Array; u: Float32Array; r: Float32Array }
const scratchOf = new WeakMap<InkRisoSheet, Scratch>();
function scratch(sheet: InkRisoSheet): Scratch {
  let k = scratchOf.get(sheet);
  if (!k) { const n = sheet.w * sheet.h; k = { depth: new Float32Array(n).fill(-1e9), s: new Float32Array(n), u: new Float32Array(n), r: new Float32Array(n) }; scratchOf.set(sheet, k); }
  return k;
}
/** Deposit one brush stroke on a plate. */
export function brush(sheet: InkRisoSheet, plateId: string, o: BrushStroke): void {
  const { w, h, spec } = sheet, S = spec.scale, plate = sheet.plates[plateId], k = scratch(sheet);
  const seed = (o.seed ?? 1) * 131 + spec.seed, rough = o.rough ?? 0.35;
  const P = inkSpline(o.points, 1.1 / S);
  if (P.length < 2) return;
  const n = P.length, len = new Float32Array(n);
  for (let i = 1; i < n; i++) len[i] = len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const total = len[n - 1] || 1;
  const sa = ((o.slantAngle ?? -50) * Math.PI) / 180;
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const sl = 1 + (o.slant ?? 0) * (Math.abs(Math.sin(dir - sa)) - 0.6);
    // The paper's drag: a slow swell along the stroke and a fine tremor in the width.
    const live = 1 + 0.07 * (inkNoise2(seed, len[i] / 26, 3) - 0.5) + 0.06 * rough * (inkNoise2(seed + 5, len[i] / 3.2, 7) - 0.5);
    R[i] = Math.max(0.12, 0.5 * o.width * clamp(P[i][2], 0, 1.4) * sl * live) * S;
  }
  const touched: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const ax = P[i][0] * S, ay = P[i][1] * S, bx = P[i + 1][0] * S, by = P[i + 1][1] * S, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, L = Math.sqrt(L2);
    const pad = Math.max(R[i], R[i + 1]) + 2.5;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - pad)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + pad));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - pad)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + pad));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay;
      const t = clamp((px * dx + py * dy) / L2);
      const ex = px - dx * t, ey = py - dy * t, d = Math.sqrt(ex * ex + ey * ey), r = R[i] + (R[i + 1] - R[i]) * t, dep = r - d;
      if (dep < -2) continue;
      const q = y * w + x;
      if (dep > k.depth[q]) {
        if (k.depth[q] < -1e8) touched.push(q);
        k.depth[q] = dep;
        k.s[q] = len[i] + (len[i + 1] - len[i]) * t;
        k.u[q] = ((dx * py - dy * px) / L) / Math.max(0.5, r);
        k.r[q] = r;
      }
    }
  }
  const ink = o.ink ?? 1, dry0 = o.dry ?? 0, dry1 = o.dryEnd ?? dry0, K = o.bristles ?? 9, streak = o.streak ?? Math.max(30, o.width * 5);
  const solid = ink >= 0.9, buf = solid ? plate.solid : plate.tone, layer = o.mode === "lift" ? undefined : sheet.layer, mark = layer ? inkMarkStart(sheet, total) : 0;
  for (const q of touched) {
    const x = q % w, y = (q / w) | 0, s = k.s[q], u = k.u[q], r = k.r[q], f = s / total;
    const dry = dry0 + (dry1 - dry0) * sstep(0.25, 1, f);
    let dep = k.depth[q];
    const tooth = 0.6 * inkNoise2(spec.seed + 11, x / 2.3, y / 2.3) + 0.4 * inkNoise2(spec.seed + 12, x / 5.1, y / 5.1);
    dep += (tooth - 0.5) * (0.5 + r * 0.05) * rough * 1.6;
    if (dry > 0.02) dep -= Math.abs(inkNoise2(seed + 21, s / 7, u > 0 ? 1 : 9) - 0.2) * r * 0.5 * dry;
    let c = clamp(dep + 0.5);
    if (c > 0 && dry > 0.01) {
      const wob = (inkNoise2(seed + 3, s / 60, 0) - 0.5) * 1.2;
      const b1 = inkNoise2(seed + 31, (u + wob * 0.12) * K * 0.5 + 40, s / streak), b2 = inkNoise2(seed + 32, (u + wob * 0.08) * K * 1.25 + 80, s / (streak * 0.55));
      const b = sstep(0.12, 0.88, 0.6 * b1 + 0.4 * b2);
      const avail = 1.08 - dry * (0.95 + 0.2 * u * u);
      c *= sstep(-0.09, 0.09, avail - (0.74 * b + 0.26 * tooth));
    }
    k.depth[q] = -1e9;
    if (c <= 0) continue;
    const a = solid ? c : c * ink;
    if (o.mode === "lift") { plate.solid[q] *= 1 - a; plate.tone[q] *= 1 - a; continue; }
    const was = buf[q];
    buf[q] = solid ? 1 - (1 - was) * (1 - a) : Math.max(was, a);
    if (layer) inkMarkHit(layer, q, mark + f * 0.999, buf[q] - was);
  }
}

// ---- shapes --------------------------------------------------------------------------------------------------------------------
/** A filled closed polygon's coverage (pixels), antialiased, as a sparse box. */
export interface InkMask { x0: number; y0: number; w: number; h: number; a: Float32Array }
export function inkFillMask(sheet: InkRisoSheet, poly: readonly (readonly number[])[], pad = 0): InkMask {
  const S = sheet.spec.scale;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of poly) { x0 = Math.min(x0, p[0] * S); x1 = Math.max(x1, p[0] * S); y0 = Math.min(y0, p[1] * S); y1 = Math.max(y1, p[1] * S); }
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(sheet.w, Math.ceil(x1 + pad) + 1); y1 = Math.min(sheet.h, Math.ceil(y1 + pad) + 1);
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0), a = new Float32Array(w * h), SUB = 4;
  for (let y = 0; y < h; y++) for (let sub = 0; sub < SUB; sub++) {
    const yy = (y0 + y + (sub + 0.5) / SUB) / S, xs: [number, number][] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      if ((p[1] <= yy) !== (q[1] <= yy)) xs.push([(p[0] + ((yy - p[1]) / (q[1] - p[1])) * (q[0] - p[0])) * S - x0, p[1] < q[1] ? 1 : -1]);
    }
    xs.sort((m, n) => m[0] - n[0]);
    let wind = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      wind += xs[i][1];
      if (!wind) continue;
      const l = Math.max(0, xs[i][0]), r = Math.min(w, xs[i + 1][0]);
      for (let x = Math.floor(l); x < r; x++) a[y * w + x] += Math.max(0, Math.min(x + 1, r) - Math.max(x, l)) / SUB;
    }
  }
  for (let i = 0; i < a.length; i++) if (a[i] > 1) a[i] = 1;
  return { x0, y0, w, h, a };
}
function boxBlur(a: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma < 0.4) return a;
  let cur = a;
  const r = Math.max(1, Math.round(sigma * 0.95));
  for (let pass = 0; pass < 3; pass++) {
    const t = new Float32Array(a.length), o = new Float32Array(a.length), d = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += x >= 0 && x < w ? cur[y * w + x] : 0; for (let x = 0; x < w; x++) { t[y * w + x] = s * d; s += (x + r + 1 < w ? cur[y * w + x + r + 1] : 0) - (x - r >= 0 ? cur[y * w + x - r] : 0); } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += y >= 0 && y < h ? t[y * w + x] : 0; for (let y = 0; y < h; y++) { o[y * w + x] = s * d; s += (y + r + 1 < h ? t[(y + r + 1) * w + x] : 0) - (y - r >= 0 ? t[(y - r) * w + x] : 0); } }
    cur = o;
  }
  return cur;
}
/** Clear every plate (or the named ones) inside a closed shape: the figure is opaque paper before it is drawn. */
export function knock(sheet: InkRisoSheet, poly: readonly (readonly number[])[], plates?: readonly string[]): void {
  const m = inkFillMask(sheet, poly), L = sheet.layer, black = sheet.spec.plates[sheet.spec.plates.length - 1]?.id, hides = !plates || plates.includes(black);
  if (L) { const at = L.marks.length; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const a = m.a[y * m.w + x], q = (y + m.y0) * sheet.w + x + m.x0; if (!a) continue; if (hides) { L.cover[q] = 1 - (1 - L.cover[q]) * (1 - a); if (a > 0.5) L.when[q] = at; } L.gain[q] *= 1 - a; } }
  for (const id of plates ?? Object.keys(sheet.plates)) {
    const p = sheet.plates[id];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const a = m.a[y * m.w + x]; if (a) { const q = (y + m.y0) * sheet.w + x + m.x0; p.solid[q] *= 1 - a; p.tone[q] *= 1 - a; } }
  }
}
/** A wash over a closed shape, on the plate's screened master (or its solid master with `solid`). */
export function wash(sheet: InkRisoSheet, plateId: string, poly: readonly (readonly number[])[], o: WashOptions, solid = false): void {
  const { w, spec } = sheet, S = spec.scale, seed = (o.seed ?? 7) + spec.seed, buf = solid ? sheet.plates[plateId].solid : sheet.plates[plateId].tone;
  let pl = poly;
  if (o.wander) pl = poly.map(p => [p[0] + (inkFbm2(seed, p[0] / 24, p[1] / 24, 3) - 0.5) * 2 * o.wander!, p[1] + (inkFbm2(seed + 9, p[0] / 24, p[1] / 24, 3) - 0.5) * 2 * o.wander!]);
  const soft = (o.soft ?? 0) * S, rim = (o.poolWidth ?? 6) * S;
  const m = inkFillMask(sheet, pl, soft * 3 + 2);
  const a = boxBlur(m.a, m.w, m.h, soft), inner = o.pool ? boxBlur(m.a, m.w, m.h, rim) : null;
  const tone = o.tone, mode = o.mode ?? "max", grain = o.grain ?? 0, layer = mode === "erase" ? undefined : sheet.layer, mark = layer ? inkMarkStart(sheet, Math.sqrt(m.w * m.h) / S) : 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x;
    let c = a[i];
    if (c <= 0.002) continue;
    const X = x + m.x0, Y = y + m.y0, q = Y * w + X;
    let t = typeof tone === "number" ? tone : tone(X / S, Y / S);
    if (inner) t *= 1 + o.pool! * (clamp((1 - inner[i]) * 1.7) - 0.25);
    if (grain) t *= 1 + grain * (inkFbm2(seed + 3, X / (3.2 * S), Y / (3.2 * S), 4) - 0.5) * 2;
    c = clamp(c * t);
    const was = buf[q];
    buf[q] = mode === "erase" ? was * (1 - c) : mode === "glaze" ? 1 - (1 - was) * (1 - c) : Math.max(was, c);
    if (layer) inkMarkHit(layer, q, mark + 0.999 * (0.7 * (x / m.w) + 0.3 * (y / m.h)), buf[q] - was);
  }
}

// ---- press ---------------------------------------------------------------------------------------------------------------------
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
export const inkRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)]; };
/** Share of a cell below each threshold of the round-dot spot function, inverted: tone → threshold. */
const DOT_LUT = (() => {
  const N = 96, v: number[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) v.push(spot((x + 0.5) / N, (y + 0.5) / N));
  v.sort((a, b) => a - b);
  return Float32Array.from({ length: 257 }, (_, i) => (i === 0 ? -0.2 : i === 256 ? 1.2 : v[Math.min(v.length - 1, Math.round((i / 256) * v.length))]));
})();
function spot(fx: number, fy: number): number { return 0.5 - 0.25 * (Math.cos(TAU * (fx - 0.5)) + Math.cos(TAU * (fy - 0.5))); }

/** Share of a grain screen's spread that lies under each level: half smoothed noise, half white. */
const GRAIN_RANK = (() => {
  const n = 160, bins = new Float64Array(256); let sum = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) bins[Math.round(255 * (0.5 * sstep(0.1, 0.9, inkNoise2(91, x * 0.73, y * 0.73)) + 0.5 * inkHash2(92, x, y)))]++;
  return Float32Array.from(bins, b => (sum += b) / (n * n));
})();

export interface InkRisoPrint { width: number; height: number; rgba: Uint8ClampedArray; coverage: Record<string, Float32Array> }
/** Print the sheet. `only` prints some plates (a proof of one drum). */
export function pressInkRiso(sheet: InkRisoSheet, only?: readonly string[]): InkRisoPrint {
  const { w, h, spec } = sheet, S = spec.scale, seed = spec.seed, N = w * h;
  const paper = inkRgb(spec.paper), rgb = new Float32Array(N * 3), coverage: Record<string, Float32Array> = {};
  // Cotton paper: soft felt-side bumps lit from the upper left, fine tooth, a few fibres.
  const height = new Float32Array(N), step = Math.max(1, Math.round(S));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) height[y * w + x] = 0.55 * inkFbm2(seed + 71, x / (7 * S), y / (7 * S), 3) + 0.3 * inkNoise2(seed + 72, x / (1.5 * S), y / (1.5 * S)) + 0.15 * inkNoise2(seed + 73, x / 1.4, y / 1.4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = y * w + x, hx = height[y * w + Math.min(w - 1, x + step)] - height[y * w + Math.max(0, x - step)], hy = height[Math.min(h - 1, y + step) * w + x] - height[Math.max(0, y - step) * w + x];
    const shade = 1 - (hx + hy) * 0.085 + (inkFbm2(seed + 74, x / (170 * S), y / (170 * S), 2) - 0.5) * 0.035;
    rgb[q * 3] = paper[0] * shade; rgb[q * 3 + 1] = paper[1] * shade; rgb[q * 3 + 2] = paper[2] * (shade - 0.004);
  }
  const fibres = Math.round((spec.width * spec.height) / 2600);
  for (let i = 0; i < fibres; i++) {
    let x = inkHash2(seed + 81, i, 0) * w, y = inkHash2(seed + 81, i, 1) * h, a = inkHash2(seed + 81, i, 2) * TAU;
    const L = (5 + 22 * inkHash2(seed + 81, i, 3)) * S, tint = inkHash2(seed + 81, i, 4) < 0.6 ? 0.955 : 1.035, warm = inkHash2(seed + 81, i, 5) < 0.12;
    for (let s = 0; s < L; s += 0.7) { x += Math.cos(a) * 0.7; y += Math.sin(a) * 0.7; a += (inkHash2(seed + 82, i, s * 10) - 0.5) * 0.16; const X = x | 0, Y = y | 0; if (X < 0 || Y < 0 || X >= w || Y >= h) break; const q = (Y * w + X) * 3; rgb[q] *= warm ? 0.97 : tint; rgb[q + 1] *= warm ? 0.93 : tint; rgb[q + 2] *= warm ? 0.86 : tint; }
  }
  const mg = (spec.margin ?? 0) * S;
  for (const ps of spec.plates) {
    if (only && !only.includes(ps.id)) continue;
    const plate = sheet.plates[ps.id], ink = inkRgb(ps.ink), cov = new Float32Array(N);
    const rot = ((ps.rotate ?? 0) * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot), ox = ps.register[0] * S, oy = ps.register[1] * S;
    const an = (ps.angle * Math.PI) / 180, ca = Math.cos(an), sa = Math.sin(an), cell = ps.cell * S, pid = ps.id.charCodeAt(0) * 13 + ps.id.length;
    const aa = 1.15 / cell, pinholes = ps.pinholes ?? 1, mottle = ps.mottle ?? 1; // aa: half a pixel in spot units, near enough
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const q = y * w + x;
      // The sheet point this drum prints here.
      const rx = x - w / 2 - ox, ry = y - h / 2 - oy, sx = rx * cr + ry * sr + w / 2, sy = -rx * sr + ry * cr + h / 2;
      const ix = Math.floor(sx), iy = Math.floor(sy);
      if (ix < 0 || iy < 0 || ix >= w - 1 || iy >= h - 1) continue;
      const fx = sx - ix, fy = sy - iy, j = iy * w + ix;
      const bil = (b: Float32Array) => (b[j] * (1 - fx) + b[j + 1] * fx) * (1 - fy) + (b[j + w] * (1 - fx) + b[j + w + 1] * fx) * fy;
      let c = bil(plate.solid);
      const t = bil(plate.tone);
      const tooth = height[q];
      if (t > 0.004) {
        let on: number;
        if (ps.screen === "am") {
          const gx = (sx * ca + sy * sa) / cell, gy = (-sx * sa + sy * ca) / cell, v = spot(gx - Math.floor(gx), gy - Math.floor(gy));
          const th = DOT_LUT[Math.round(clamp(t) * 256)] + (tooth - 0.5) * 0.14 - aa * 1.1 * (1 - sstep(0, 0.14, t));
          on = clamp(0.5 + (th - v) / (2 * aa));
        } else {
          const g = cell, n1 = inkNoise2(seed + 91 + pid, sx / g, sy / g), n2 = inkHash2(seed + 92 + pid, (sx / g) * 1.0, (sy / g) * 1.0);
          // Ranked against its own spread, so tone prints as coverage; a light contrast curve keeps lines whole and paper clean.
          const v = GRAIN_RANK[Math.round(255 * (0.5 * sstep(0.1, 0.9, n1) + 0.5 * n2))], k = 0.5 * t + 0.5 * sstep(0.02, 0.9, t);
          on = sstep(-0.05, 0.05, k * 1.06 - 0.04 - v);
        }
        c = Math.max(c, on);
      }
      if (c <= 0.002) continue;
      if (mg && (x < mg || y < mg || x >= w - mg || y >= h - mg)) continue;
      // Ink transfer: the drum misses the deepest tooth (pinholes), lays unevenly and shows faint bands from the rollers.
      const pin = (sstep(0.27, 0.17, tooth) * 0.8 + (inkHash2(seed + 95 + pid, x >> 1, y >> 1) < 0.006 ? 0.45 : 0)) * pinholes;
      const mott = 1 - mottle * (0.035 - 0.07 * (inkFbm2(seed + 96 + pid, x / (34 * S), y / (34 * S), 3) - 0.5) * 2 - 0.06 * (inkFbm2(seed + 97 + pid, (x * 0.8 + y * 0.6) / (3 * S), (y * 0.8 - x * 0.6) / (3 * S), 3) - 0.5) - 0.018 * Math.sin(y / (41 * S) + pid));
      cov[q] = clamp(c * (1 - pin) * mott * (ps.density ?? 0.95));
    }
    for (let q = 0; q < N; q++) { const c = cov[q]; if (c) for (let k = 0; k < 3; k++) rgb[q * 3 + k] *= 1 - c * (1 - ink[k]); }
    coverage[ps.id] = cov;
  }
  const rgba = new Uint8ClampedArray(N * 4);
  for (let q = 0; q < N; q++) { for (let k = 0; k < 3; k++) rgba[q * 4 + k] = Math.round(enc(clamp(rgb[q * 3 + k])) * 255); rgba[q * 4 + 3] = 255; }
  return { width: w, height: h, rgba, coverage };
}
