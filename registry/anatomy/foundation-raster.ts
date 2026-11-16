/**
 * Shared raster foundation: the pieces every pixel renderer in the library needs, computed on the CPU so the same code
 * runs in a browser canvas, a film render and a unit test.
 *
 * - `Raster`: linear-light RGB with straight alpha (Float32), encoded to 8-bit sRGB only at the end (`encodeSrgb`).
 * - Seeded noise: value, gradient (Perlin-style), fractal sums, cellular (Worley) and domain warping. The same seed
 *   always gives the same image.
 * - Separable Gaussian blur on any number of channels.
 * - Anti-aliased tapered strokes (hairs, lashes, fibres, grain lines) by distance to the segment.
 * - A triangle rasteriser with depth test and barycentrics, for G-buffers.
 * - A radix-2 complex FFT in one and two dimensions (spectral oceans, texture spectra).
 */

export type RGB3 = readonly [number, number, number];

export interface Raster { width: number; height: number; rgb: Float32Array; alpha: Float32Array }

export function createRaster(width: number, height: number, fill: RGB3 = [0, 0, 0], alpha = 0): Raster {
  const n = width * height, rgb = new Float32Array(n * 3), a = new Float32Array(n);
  if (fill[0] || fill[1] || fill[2]) for (let i = 0; i < n; i++) { rgb[i * 3] = fill[0]; rgb[i * 3 + 1] = fill[1]; rgb[i * 3 + 2] = fill[2]; }
  if (alpha) a.fill(alpha);
  return { width, height, rgb, alpha: a };
}

const srgbEncode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
export const srgbDecode = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
/** Hex colour → linear RGB. */
export const linearOf = (hex: string): RGB3 => { const n = parseInt(hex.replace("#", "").slice(0, 6), 16); return [srgbDecode(((n >> 16) & 255) / 255), srgbDecode(((n >> 8) & 255) / 255), srgbDecode((n & 255) / 255)]; };
/** Linear RGB → hex. */
export const hexOfLinear = (c: RGB3): string => `#${c.map(v => Math.round(Math.min(1, Math.max(0, srgbEncode(Math.max(0, v)))) * 255).toString(16).padStart(2, "0")).join("")}`;

/**
 * Encode to 8-bit sRGBA. `filmic` rolls highlights off smoothly (a Hable-style curve normalised so 1.0 stays 1.0 at
 * the white point) instead of clipping them; `exposure` multiplies linear light first.
 */
export function encodeSrgb(r: Raster, o: { exposure?: number; toneMap?: "none" | "filmic"; white?: number } = {}): Uint8ClampedArray {
  const n = r.width * r.height, out = new Uint8ClampedArray(n * 4), ex = o.exposure ?? 1, film = o.toneMap === "filmic", W = o.white ?? 4;
  const hable = (x: number) => ((x * (0.15 * x + 0.05) + 0.004) / (x * (0.15 * x + 0.5) + 0.06)) - 0.0667;
  const hw = hable(W);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      let v = Math.max(0, r.rgb[i * 3 + c] * ex);
      if (film) v = hable(v) / hw;
      out[i * 4 + c] = Math.round(Math.min(1, srgbEncode(Math.min(1, v))) * 255);
    }
    out[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, r.alpha[i])) * 255);
  }
  return out;
}

/** Box-downsample by an integer factor (supersampling), alpha-weighted. */
export function downsample(r: Raster, k: number): Raster {
  if (k <= 1) return r;
  const w = Math.floor(r.width / k), h = Math.floor(r.height / k), out = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0, cr = 0, cg = 0, cb = 0;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const s = (y * k + j) * r.width + (x * k + i), al = r.alpha[s];
      a += al; cr += r.rgb[s * 3] * al; cg += r.rgb[s * 3 + 1] * al; cb += r.rgb[s * 3 + 2] * al;
    }
    const d = y * w + x;
    out.alpha[d] = a / (k * k);
    if (a > 0) { out.rgb[d * 3] = cr / a; out.rgb[d * 3 + 1] = cg / a; out.rgb[d * 3 + 2] = cb / a; }
  }
  return out;
}

/** Composite `top` over `r` at full size (straight alpha). */
export function over(r: Raster, top: Raster): void {
  const n = r.width * r.height;
  for (let i = 0; i < n; i++) {
    const a = top.alpha[i];
    if (a <= 0) continue;
    const b = r.alpha[i], oa = a + b * (1 - a);
    for (let c = 0; c < 3; c++) r.rgb[i * 3 + c] = (top.rgb[i * 3 + c] * a + r.rgb[i * 3 + c] * b * (1 - a)) / Math.max(1e-6, oa);
    r.alpha[i] = oa;
  }
}

// ---- Noise ---------------------------------------------------------------------------------------------------------------------

/** A 32-bit integer hash of (seed, x, y) as a float in [0, 1). */
export function hash2(seed: number, x: number, y: number): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Value noise in [0, 1). */
export function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), u = fade(x - xi), v = fade(y - yi);
  const a = hash2(seed, xi, yi), b = hash2(seed, xi + 1, yi), c = hash2(seed, xi, yi + 1), d = hash2(seed, xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Gradient (Perlin-style) noise, about −1…1. */
export function gradNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = fade(xf), v = fade(yf);
  const g = (ix: number, iy: number, dx: number, dy: number) => { const a = hash2(seed, ix, iy) * Math.PI * 2; return Math.cos(a) * dx + Math.sin(a) * dy; };
  const n00 = g(xi, yi, xf, yf), n10 = g(xi + 1, yi, xf - 1, yf), n01 = g(xi, yi + 1, xf, yf - 1), n11 = g(xi + 1, yi + 1, xf - 1, yf - 1);
  return 1.41 * (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v);
}
/** Fractal sum of gradient noise: `octaves` layers, each `lacunarity` times finer and `gain` times weaker; about −1…1. */
export function fbm(seed: number, x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
  let s = 0, a = 1, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { s += a * gradNoise(seed + o * 1013, x * f, y * f); norm += a; a *= gain; f *= lacunarity; }
  return s / norm;
}
/** Ridged fractal noise (sharp crests), 0…1. */
export function ridged(seed: number, x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
  let s = 0, a = 1, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { const n = 1 - Math.abs(gradNoise(seed + o * 7919, x * f, y * f)); s += a * n * n; norm += a; a *= gain; f *= lacunarity; }
  return s / norm;
}
/** Cellular (Worley) noise: distances to the nearest and second-nearest feature points, and the nearest cell's id (0–1). */
export function worley(seed: number, x: number, y: number, jitter = 1): { f1: number; f2: number; id: number; dx: number; dy: number } {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, dx = 0, dy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, px = cx + 0.5 + (hash2(seed, cx, cy) - 0.5) * jitter, py = cy + 0.5 + (hash2(seed + 1, cx, cy) - 0.5) * jitter;
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = hash2(seed + 2, cx, cy); dx = px - x; dy = py - y; } else if (d < f2) f2 = d;
  }
  return { f1, f2, id, dx, dy };
}
/** Domain-warped fractal noise: the coordinates are pushed by another noise field first (marble, smoke, clouds). */
export function warpedFbm(seed: number, x: number, y: number, warp = 1, octaves = 5): number {
  const qx = fbm(seed + 11, x, y, 4), qy = fbm(seed + 23, x + 5.2, y + 1.3, 4);
  return fbm(seed, x + warp * qx, y + warp * qy, octaves);
}

// ---- Blur ----------------------------------------------------------------------------------------------------------------------

/** Separable Gaussian blur of an interleaved Float32 image with `ch` channels; σ in pixels. Edges clamp. */
export function gaussianBlur(src: Float32Array, w: number, h: number, ch: number, sigma: number): Float32Array {
  if (sigma < 0.3) return src.slice();
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); acc += src[(y * w + xx) * ch + c] * k[i + r]; }
    tmp[(y * w + x) * ch + c] = acc;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); acc += tmp[(yy * w + x) * ch + c] * k[i + r]; }
    out[(y * w + x) * ch + c] = acc;
  }
  return out;
}

// ---- Strokes -------------------------------------------------------------------------------------------------------------------

/**
 * Draw an anti-aliased tapered stroke along a polyline (screen pixels) into a raster: width from `w0` at the start to
 * `w1` at the end, colour in linear light, opacity times coverage (distance to the segment, 1 px soft edge).
 */
export function strokePolyline(r: Raster, pts: readonly (readonly [number, number])[], w0: number, w1: number, colour: RGB3, opacity = 1): void {
  if (pts.length < 2) return;
  let total = 0;
  const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = seg[i - 1];
    const ta = total ? acc / total : 0, tb = total ? (acc + L) / total : 1;
    acc += L;
    const wa = w0 + (w1 - w0) * ta, wb = w0 + (w1 - w0) * tb, pad = Math.max(wa, wb) / 2 + 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - pad)), x1 = Math.min(r.width - 1, Math.ceil(Math.max(ax, bx) + pad));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - pad)), y1 = Math.min(r.height - 1, Math.ceil(Math.max(ay, by) + pad));
    const vx = bx - ax, vy = by - ay, vv = vx * vx + vy * vy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay, t = Math.min(1, Math.max(0, (px * vx + py * vy) / vv));
      const d = Math.hypot(px - vx * t, py - vy * t), half = (wa + (wb - wa) * t) / 2;
      // Thin strokes keep their darkness by spreading over a pixel at lower opacity.
      const cov = half >= 0.5 ? Math.min(1, Math.max(0, half + 0.5 - d)) : Math.max(0, 1 - d) * half * 2;
      if (cov <= 0) continue;
      const a = cov * opacity, i0 = y * r.width + x, b = r.alpha[i0], oa = a + b * (1 - a);
      for (let c = 0; c < 3; c++) r.rgb[i0 * 3 + c] = (colour[c] * a + r.rgb[i0 * 3 + c] * b * (1 - a)) / Math.max(1e-6, oa);
      r.alpha[i0] = oa;
    }
  }
}

/**
 * Fill a polygon (screen pixels, even–odd) and report each pixel's coverage: 4 sub-scanlines per row, exact in x.
 * Fast for large shapes (cost grows with rows × edges plus the covered area).
 */
export function fillPolygon(w: number, h: number, poly: readonly (readonly [number, number])[], onPixel: (i: number, coverage: number) => void): void {
  if (poly.length < 3) return;
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of poly) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(h - 1, Math.ceil(maxY)), S = 4, row = new Float32Array(w + 2), xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    row.fill(0);
    let any = false, lo = w, hi = -1;
    for (let s = 0; s < S; s++) {
      const sy = y + (s + 0.5) / S;
      xs.length = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > sy) !== (yj > sy)) xs.push(xi + ((sy - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, xs[k]), b = Math.min(w, xs[k + 1]);
        if (b <= a) continue;
        any = true;
        const ia = Math.floor(a), ib = Math.floor(b);
        lo = Math.min(lo, ia); hi = Math.max(hi, Math.min(w - 1, ib));
        if (ia === ib) { row[ia] += (b - a) / S; continue; }
        row[ia] += (ia + 1 - a) / S;
        for (let x = ia + 1; x < ib; x++) row[x] += 1 / S;
        if (ib < w) row[ib] += (b - ib) / S;
      }
    }
    if (!any) continue;
    for (let x = lo; x <= hi; x++) if (row[x] > 0) onPixel(y * w + x, Math.min(1, row[x]));
  }
}

// ---- Triangles -------------------------------------------------------------------------------------------------------------------

export interface TriangleBuffer { width: number; height: number; tri: Int32Array; b1: Float32Array; b2: Float32Array; depth: Float32Array }
/**
 * Rasterise triangles (screen-space x, y per vertex; z larger = nearer) with a depth test. Each pixel keeps the nearest
 * triangle's index and the barycentric weights of its second and third vertices (the first is 1 − b1 − b2).
 */
export function rasterizeTriangles(width: number, height: number, sx: Float32Array, sy: Float32Array, sz: Float32Array, tris: ArrayLike<number>,
  into?: TriangleBuffer, triOffset = 0): TriangleBuffer {
  const buf = into ?? { width, height, tri: new Int32Array(width * height).fill(-1), b1: new Float32Array(width * height), b2: new Float32Array(width * height), depth: new Float32Array(width * height).fill(-Infinity) };
  for (let t = 0; t < tris.length / 3; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
    const ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx = sx[c], cy = sy[c];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w1 = ((px - ax) * (cy - ay) - (py - ay) * (cx - ax)) / area, w2 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / area, w0 = 1 - w1 - w2;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const z = sz[a] * w0 + sz[b] * w1 + sz[c] * w2, i = y * width + x;
      if (z <= buf.depth[i]) continue;
      buf.depth[i] = z; buf.tri[i] = t + triOffset; buf.b1[i] = w1; buf.b2[i] = w2;
    }
  }
  return buf;
}

// ---- FFT --------------------------------------------------------------------------------------------------------------------------

/** In-place radix-2 complex FFT of length n (a power of two). `inverse` scales by 1/n. */
export function fft(re: Float64Array, im: Float64Array, inverse = false, offset = 0, stride = 1, n = re.length): void {
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const a = offset + i * stride, b = offset + j * stride; [re[a], re[b]] = [re[b], re[a]]; [im[a], im[b]] = [im[b], im[a]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inverse ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = offset + (i + k) * stride, b = offset + (i + k + len / 2) * stride;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[offset + i * stride] /= n; im[offset + i * stride] /= n; }
}
/** 2-D FFT of an n×n complex grid stored row-major. */
export function fft2(re: Float64Array, im: Float64Array, n: number, inverse = false): void {
  for (let y = 0; y < n; y++) fft(re, im, inverse, y * n, 1, n);
  for (let x = 0; x < n; x++) fft(re, im, inverse, x, n, n);
}

/** A seeded standard normal (Box–Muller) stream. */
export function gaussianStream(seed: number): () => number {
  let s = seed >>> 0 || 1, spare: number | null = null;
  const u = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296; };
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    const a = u(), b = u(), r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}
