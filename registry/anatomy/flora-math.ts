/**
 * FLORA2 math: vectors, splines, rotation-minimizing frames, radius profiles and the heavy elastica (a rod that sags
 * under its own weight). Pure functions with no renderer. Noise comes from `foundation-raster` (art-foundations), so
 * the engine needs no extra package.
 */
import type { Range } from "./foundation-shapes";

export type V3 = readonly [number, number, number];
export const UP: V3 = [0, 1, 0];
export const add = (a: V3, b: V3, s = 1): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: V3): V3 => { const l = length3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const smooth = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };
export const DEG = Math.PI / 180;
/** The golden angle, 137.508°: the divergence of most spiral phyllotaxis (Vogel 1979). */
export const GOLDEN_ANGLE = 180 * (3 - Math.sqrt(5));

/** Rotates `v` about the unit `axis` by `angle` radians (Rodrigues). */
export function rotateAxis(v: V3, axis: V3, angle: number): V3 {
  const c = Math.cos(angle), s = Math.sin(angle), k = dot(axis, v) * (1 - c), x = cross(axis, v);
  return [v[0] * c + x[0] * s + axis[0] * k, v[1] * c + x[1] * s + axis[1] * k, v[2] * c + x[2] * s + axis[2] * k];
}
/** A unit vector at right angles to `v`. */
export function perpendicular(v: V3): V3 {
  const a: V3 = Math.abs(v[1]) < 0.9 ? UP : [1, 0, 0];
  return normalize(cross(v, a));
}

/** Rotation-minimizing frames (parallel transport) along a polyline: tangent, normal, binormal at each point. */
export function transportFrames(points: readonly V3[]): { t: V3[]; n: V3[]; b: V3[] } {
  const t: V3[] = [], n: V3[] = [], b: V3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], c = points[Math.min(points.length - 1, i + 1)];
    t.push(normalize(sub(c, a)));
  }
  n.push(perpendicular(t[0]));
  for (let i = 1; i < points.length; i++) {
    const axis = cross(t[i - 1], t[i]), s = length3(axis);
    n.push(s < 1e-9 ? n[i - 1] : normalize(rotateAxis(n[i - 1], scale(axis, 1 / s), Math.atan2(s, dot(t[i - 1], t[i])))));
  }
  for (let i = 0; i < points.length; i++) {
    const nn = normalize(sub(n[i], scale(t[i], dot(n[i], t[i]))));
    n[i] = nn; b.push(cross(t[i], nn));
  }
  return { t, n, b };
}

/** Centripetal Catmull–Rom spline through `points`, `samples` points per span. Keeps the end points. */
export function catmullRom(points: readonly V3[], samples: number): V3[] {
  if (points.length < 3 || samples <= 1) return points.slice();
  const out: V3[] = [];
  const P = [add(points[0], sub(points[0], points[1])), ...points, add(points[points.length - 1], sub(points[points.length - 1], points[points.length - 2]))];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const k = (a: V3, b: V3) => Math.max(1e-6, Math.sqrt(length3(sub(b, a))));
    const t1 = k(p0, p1), t2 = t1 + k(p1, p2), t3 = t2 + k(p2, p3);
    for (let j = 0; j < samples; j++) {
      const t = t1 + (t2 - t1) * (j / samples);
      const a1 = lerp3(p0, p1, (t - 0) / t1), a2 = lerp3(p1, p2, (t - t1) / (t2 - t1)), a3 = lerp3(p2, p3, (t - t2) / (t3 - t2));
      const b1 = lerp3(a1, a2, t / t2), b2 = lerp3(a2, a3, (t - t1) / (t3 - t1));
      out.push(lerp3(b1, b2, (t - t1) / (t2 - t1)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** A point on the cubic Bézier curve p0 p1 p2 p3 at t. */
export function bezier3(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1], a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2]];
}

/** Stops `[t, value]` along an axis (t 0 at the foot, 1 at the tip). */
export type ProfileStops = readonly (readonly [number, number])[];
/** Monotone cubic interpolation (Fritsch–Carlson) through the stops: no overshoot, so a radius never bulges past its stops. */
export function profileAt(stops: ProfileStops, t: number): number {
  const n = stops.length;
  if (n === 0) return 1;
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[n - 1][0]) return stops[n - 1][1];
  let i = 0;
  while (t > stops[i + 1][0]) i++;
  const slope = (j: number) => (stops[j + 1][1] - stops[j][1]) / (stops[j + 1][0] - stops[j][0]);
  const tangent = (j: number) => {
    if (j === 0) return slope(0);
    if (j === n - 1) return slope(n - 2);
    const a = slope(j - 1), b = slope(j);
    return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b);
  };
  const [x0, y0] = stops[i], [x1, y1] = stops[i + 1], h = x1 - x0, u = (t - x0) / h;
  const h00 = 2 * u ** 3 - 3 * u * u + 1, h10 = u ** 3 - 2 * u * u + u, h01 = -2 * u ** 3 + 3 * u * u, h11 = u ** 3 - u * u;
  return h00 * y0 + h10 * h * tangent(i) + h01 * y1 + h11 * h * tangent(i + 1);
}

/**
 * The heavy elastica: the angles (radians above horizontal) at n + 1 even steps along a rod clamped at `theta0` and
 * bent by its own weight. `gravity` is G = wL³/EI (weight per length w, length L, stiffness EI). G near 0 keeps the rod
 * straight, about 3 arches a bough, and G over 100 makes a twig hang. `tipLoad` is a weight at the tip in rod weights
 * (a flower head on its stalk, a leaf blade on its petiole).
 *
 * Solves θ″ = G((1 − s) + tipLoad)·cos θ (the moment of the weight beyond s bends the rod down) with θ(0) = θ0 and
 * θ′(1) = 0. It shoots backward from the free tip: near a hanging tip, θ + π/2 grows like an Airy function toward the
 * root, so bisecting on log(θ(1) + π/2) is well conditioned even for G in the thousands. A catenary is the same rod with
 * no stiffness and two supports. A branch has one support, so the elastica is the correct model for droop.
 */
export function heavyElastica(theta0: number, gravity: number, n = 24, tipLoad = 0): number[] {
  const key = `${theta0.toFixed(3)}|${gravity.toFixed(2)}|${n}|${tipLoad.toFixed(3)}`;
  const hit = ELASTICA_CACHE.get(key);
  if (hit) return hit;
  let result: number[];
  if (gravity <= 1e-6 || theta0 <= -Math.PI / 2 + 1e-6) result = new Array(n + 1).fill(theta0);
  else {
    const steps = Math.max(48, Math.ceil(14 * Math.cbrt(gravity * (1 + tipLoad)))), h = 1 / steps;
    const f = (s: number, a: number) => gravity * ((1 - s) + tipLoad) * Math.cos(a);
    // Integrate from the tip (s = 1, θ′ = 0) back to the root; returns θ at every step, root first.
    const back = (theta1: number) => {
      const out = new Float64Array(steps + 1);
      let th = theta1, k = 0;
      out[steps] = th;
      for (let i = steps; i > 0; i--) {
        const s = i * h, d = -h;
        const k1t = k, k1k = f(s, th);
        const k2t = k + d / 2 * k1k, k2k = f(s + d / 2, th + d / 2 * k1t);
        const k3t = k + d / 2 * k2k, k3k = f(s + d / 2, th + d / 2 * k2t);
        const k4t = k + d * k3k, k4k = f(s + d, th + d * k3t);
        th += d / 6 * (k1t + 2 * k2t + 2 * k3t + k4t);
        k += d / 6 * (k1k + 2 * k2k + 2 * k3k + k4k);
        if (!Number.isFinite(th) || th > 4) th = 4;
        out[i - 1] = th;
      }
      return out;
    };
    let lo = Math.log(1e-15), hi = Math.log(theta0 + Math.PI / 2), best = back(theta0);
    for (let it = 0; it < 64; it++) {
      const mid = (lo + hi) / 2, run = back(-Math.PI / 2 + Math.exp(mid));
      best = run;
      if (run[0] > theta0) hi = mid; else lo = mid;
      if (hi - lo < 1e-10) break;
    }
    result = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n * steps, j = Math.min(steps - 1, Math.floor(u)), t = u - j;
      result.push(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, best[j] + (best[j + 1] - best[j]) * t)));
    }
    result[0] = theta0;
  }
  if (ELASTICA_CACHE.size > 4000) ELASTICA_CACHE.clear();
  ELASTICA_CACHE.set(key, result);
  return result;
}
const ELASTICA_CACHE = new Map<string, number[]>();

/** A renderer-neutral triangle mesh. Colours are linear RGB. */
export interface MeshData { positions: Float32Array; normals: Float32Array; uvs: Float32Array; colors: Float32Array; indices: Uint32Array }

/** Collects vertices and triangles, then packs them into a `MeshData` with smooth normals. */
export class MeshBuffer {
  readonly p: number[] = [];
  readonly uv: number[] = [];
  readonly c: number[] = [];
  readonly idx: number[] = [];
  get count() { return this.p.length / 3; }
  vertex(p: V3, u: number, v: number, c: V3): number {
    this.p.push(p[0], p[1], p[2]); this.uv.push(u, v); this.c.push(c[0], c[1], c[2]);
    return this.count - 1;
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c); }
  /** Appends a mesh, moved by a column-major 4×4 matrix and tinted. */
  append(m: MeshData, matrix?: ArrayLike<number>, tint?: V3) {
    const base = this.count, e = matrix;
    for (let i = 0; i < m.positions.length; i += 3) {
      const x = m.positions[i], y = m.positions[i + 1], z = m.positions[i + 2];
      if (e) this.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      else this.p.push(x, y, z);
      this.c.push(m.colors[i] * (tint ? tint[0] : 1), m.colors[i + 1] * (tint ? tint[1] : 1), m.colors[i + 2] * (tint ? tint[2] : 1));
    }
    for (let i = 0; i < m.uvs.length; i++) this.uv.push(m.uvs[i]);
    for (let i = 0; i < m.indices.length; i++) this.idx.push(m.indices[i] + base);
  }
  build(): MeshData {
    const positions = new Float32Array(this.p), indices = new Uint32Array(this.idx);
    return { positions, normals: computeNormals(positions, indices), uvs: new Float32Array(this.uv), colors: new Float32Array(this.c), indices };
  }
}

/** Area-weighted smooth vertex normals. */
function computeNormals(p: Float32Array, idx: Uint32Array): Float32Array {
  const n = new Float32Array(p.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}

/** Column-major 4×4 matrix from an origin and three axis vectors (each already scaled). */
export function basisMatrix(o: V3, x: V3, y: V3, z: V3): Float32Array {
  return new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, o[0], o[1], o[2], 1]);
}

/** Height growth with stage t ∈ [0, 1]: a logistic curve scaled so 0 → `seedling` and 1 → 1. */
export function growthCurve(t: number, seedling = 0.04, rate = 7, mid = 0.42): number {
  const g = (x: number) => 1 / (1 + Math.exp(-rate * (x - mid)));
  const u = (g(clamp(t)) - g(0)) / (g(1) - g(0));
  return seedling + (1 - seedling) * u;
}

/** A seeded draw from a graded range: triangular round the typical value, inside min…max. */
export function drawRange(rng: () => number, r: Pick<Range, "min" | "typical" | "max">): number {
  const u = rng(), { min, typical: c, max } = r;
  if (max <= min) return c;
  const f = (c - min) / (max - min);
  return u < f ? min + Math.sqrt(u * (max - min) * (c - min)) : max - Math.sqrt((1 - u) * (max - min) * (max - c));
}
export const between = (rng: () => number, a: number, b: number) => a + (b - a) * rng();
/** Index drawn with the given weights. */
export function weighted(rng: () => number, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let u = rng() * total;
  for (let i = 0; i < weights.length; i++) { u -= weights[i]; if (u <= 0) return i; }
  return weights.length - 1;
}
