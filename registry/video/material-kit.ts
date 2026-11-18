/**
 * The shared parts of material transitions (registry item `material-transitions`): the frame a material draws, seeded
 * noise, easing and polygon rasterising. `film-material.ts` and the material families (`material-glass.ts`, …) use it.
 *
 * Coordinates are in frame heights: x runs from 0 to the frame's aspect (width / height), y from 0 to 1, so a circle
 * stays round at any output size. Grids are `cols × rows` cells, row-major, sampled at cell centres.
 */

/** One overlay over the frame: a colour shown through `alpha`, blended onto what is below. */
export interface MaterialLayer {
  id: string;
  color: string;
  alpha: Uint8ClampedArray;
  blend: "normal" | "multiply" | "screen";
  /** Blur what is behind the layer by this many pixels per 1000 px of frame height (frosted glass). */
  backdropBlur?: number;
  /** With `backdropBlur`: how much of `color` lies over the blurred backdrop, 0..1. @default 0.36 */
  veil?: number;
}

/** A crisp overlay drawn as vectors: crack lines, shard glints, page edges, soft shadows. */
export interface MaterialVector {
  id: string;
  /** Rings of points, [x0, y0, x1, y1, …] in frame heights. */
  rings: readonly (readonly number[])[];
  /** Closed rings are filled; open ones are lines. */
  closed: boolean;
  fill?: string;
  /** A linear gradient fill instead of `fill`, from (x1, y1) to (x2, y2) in frame heights. Stops are [offset, colour, alpha]. */
  gradient?: { x1: number; y1: number; x2: number; y2: number; stops: readonly (readonly [number, string, number])[] };
  stroke?: string;
  /** Stroke width in thousandths of the frame height. */
  width?: number;
  alpha: number;
  /** Per-ring alpha multipliers (a glint that differs from shard to shard). */
  alphas?: readonly number[];
  blend: "normal" | "multiply" | "screen";
  /** A soft edge: Gaussian blur in thousandths of the frame height (shadows). */
  blur?: number;
  /** Draw only outside these rings: a shadow cast past an object onto what lies under it, not onto the object. */
  outside?: readonly (readonly number[])[];
}

/**
 * A warp: the scene drawn displaced. It is a backward map: a cell shows the scene's own picture from (x + dx, y + dy),
 * in frame heights. Glass bends the picture smoothly; shards and torn halves move as rigid pieces.
 */
export interface MaterialWarp {
  dx: Float32Array;
  dy: Float32Array;
  /** Which piece each cell belongs to; −1 draws nothing. The warp jumps between pieces and is smooth within one. */
  owner?: Int16Array;
  /** How much of the scene shows in each cell, 0..255. @default all of it */
  cover?: Uint8ClampedArray;
  /** A blur after the warp, in thousandths of the frame height along x and y (motion blur through moving glass). */
  blur?: readonly [number, number];
  /** Where the blur applies, 0..255. @default everywhere */
  blurMask?: Uint8ClampedArray;
}

export interface MaterialFrame {
  /** The incoming scene's opacity, 0..255 per cell. */
  reveal: Uint8ClampedArray;
  layers: MaterialLayer[];
  /** Vector overlays, drawn after `layers`, in order. */
  vectors?: MaterialVector[];
  /** The outgoing scene drawn displaced. */
  warpOut?: MaterialWarp;
  /** The incoming scene drawn displaced. */
  warpIn?: MaterialWarp;
  /** The outgoing scene shows only inside these rings (their union), in frame heights: crisp edges for shards, torn
   * halves and a peeling page. */
  outClip?: readonly (readonly number[])[];
  /** The incoming scene lies under the outgoing one, which breaks, tears or peels away to show it. */
  incomingBelow?: boolean;
  /** An exact transform of the whole outgoing layer, [a, b, c, d, e, f] with e and f in frame heights: x' = a·x + c·y + e.
   * `warpOut` and its cover are then in the layer's own coordinates, so the warp holds only what the transform cannot. */
  outMatrix?: readonly [number, number, number, number, number, number];
}

/* ------------------------------------------------------------------ *
 * Noise and easing
 * ------------------------------------------------------------------ */

export function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let sum = 0, amp = 0.5, total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x, y, seed + o * 17);
    total += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / total;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const byte = (v: number) => Math.round(255 * clamp01(v));

/* ------------------------------------------------------------------ *
 * Polygons
 * ------------------------------------------------------------------ */

/** Twice the signed area of a ring (positive when it turns from +x toward +y). */
export function ringArea(ring: readonly number[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n;
    a += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
  }
  return a;
}

/**
 * Call `cell(k)` for every cell whose centre lies inside the ring (even–odd), on a `cols × rows` grid over a frame of
 * `aspect`. Rings are in frame heights.
 */
export function eachCellInRing(ring: readonly number[], cols: number, rows: number, aspect: number, cell: (k: number) => void): void {
  const n = ring.length / 2;
  if (n < 3) return;
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < ring.length; i += 2) { y0 = Math.min(y0, ring[i]); y1 = Math.max(y1, ring[i]); }
  const j0 = Math.max(0, Math.ceil(y0 * rows - 0.5)), j1 = Math.min(rows - 1, Math.floor(y1 * rows - 0.5));
  const xs: number[] = [];
  for (let j = j0; j <= j1; j++) {
    const y = (j + 0.5) / rows;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const ax = ring[2 * i], ay = ring[2 * i + 1], b = (i + 1) % n, bx = ring[2 * b], by = ring[2 * b + 1];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const i0 = Math.max(0, Math.ceil((xs[q] / aspect) * cols - 0.5)), i1 = Math.min(cols - 1, Math.floor((xs[q + 1] / aspect) * cols - 0.5));
      for (let i = i0; i <= i1; i++) cell(i + j * cols);
    }
  }
}

/** A ring transformed by the affine map x' = a·x + c·y + e, y' = b·x + d·y + f. */
export function transformRing(ring: readonly number[], m: readonly [number, number, number, number, number, number]): number[] {
  const out = new Array<number>(ring.length);
  for (let i = 0; i < ring.length; i += 2) {
    out[i] = m[0] * ring[i] + m[2] * ring[i + 1] + m[4];
    out[i + 1] = m[1] * ring[i] + m[3] * ring[i + 1] + m[5];
  }
  return out;
}

/** The part of a ring where nx·x + ny·y ≥ c (Sutherland–Hodgman against one line). */
export function clipHalfPlane(ring: readonly number[], nx: number, ny: number, c: number): number[] {
  const out: number[] = [];
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n, x0 = ring[i], y0 = ring[i + 1], x1 = ring[j], y1 = ring[j + 1];
    const s0 = nx * x0 + ny * y0 - c, s1 = nx * x1 + ny * y1 - c;
    if (s0 >= 0) out.push(x0, y0);
    if ((s0 >= 0) !== (s1 >= 0)) { const t = s0 / (s0 - s1); out.push(x0 + t * (x1 - x0), y0 + t * (y1 - y0)); }
  }
  return out.length >= 6 ? out : [];
}

/** A ring cut to the frame (0..aspect × 0..1). */
export function clipToFrame(ring: readonly number[], aspect: number): number[] {
  let r: number[] = ring.slice();
  for (const [nx, ny, c] of [[1, 0, 0], [-1, 0, -aspect], [0, 1, 0], [0, -1, -1]] as const) { r = clipHalfPlane(r, nx, ny, c); if (!r.length) return r; }
  return r;
}

/** A ring with no edge longer than `step`, so a curved map can bend it. */
export function densify(ring: readonly number[], step: number, closed = true): number[] {
  const out: number[] = [];
  const n = ring.length, last = closed ? n : n - 2;
  for (let i = 0; i < last; i += 2) {
    const j = (i + 2) % n, x0 = ring[i], y0 = ring[i + 1], x1 = ring[j], y1 = ring[j + 1];
    const parts = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let q = 0; q < parts; q++) out.push(x0 + ((x1 - x0) * q) / parts, y0 + ((y1 - y0) * q) / parts);
  }
  if (!closed) out.push(ring[n - 2], ring[n - 1]);
  return out;
}

/** The ring turned counter-clockwise (positive area), so rings add up under the nonzero rule. */
export function positive(ring: readonly number[]): number[] {
  if (ringArea(ring) >= 0) return ring.slice();
  const out: number[] = [];
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i], ring[i + 1]);
  return out;
}

/** The frame as a ring. */
export const frameRing = (aspect: number): number[] => [0, 0, aspect, 0, aspect, 1, 0, 1];
