/**
 * COLLAGE1 geometry: deterministic noise, SVG path flattening and paper-edge construction.
 *
 * Everything here is a pure function of its inputs. A torn edge is derived from the shape, a seed and an
 * edge style, never from the frame, so a cutout keeps the exact same silhouette while it moves, and a
 * seek in any order draws the same paper.
 */

export type Point = readonly [number, number];
export type Polyline = Point[];
export interface Subpath { points: Polyline; closed: boolean }

// ---- Deterministic randomness ---------------------------------------------------------------------------------------------------

/** 32-bit integer hash of up to four integers. */
export function hashInts(a: number, b = 0, c = 0, d = 0): number {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1) ^ Math.imul(d | 0, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}
/** Uniform [0,1) from integer coordinates. */
export const hash01 = (a: number, b = 0, c = 0, d = 0) => hashInts(a, b, c, d) / 4294967296;
/** Signed [-1,1) from integer coordinates. */
export const hashSigned = (a: number, b = 0, c = 0, d = 0) => hash01(a, b, c, d) * 2 - 1;
/** Stable seed from a string id, so two cutouts never share a tear by accident. */
export function seedOf(text: string, base = 0): number {
  let h = 2166136261 ^ base;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth 1D value noise in [-1,1]. */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hashSigned(seed, i) * (1 - u) + hashSigned(seed, i + 1) * u;
}
/** Fractal 1D noise, roughly in [-1,1]. */
export function fbm1(seed: number, x: number, octaves = 4, gain = .5): number {
  let sum = 0, amp = 1, norm = 0, freq = 1;
  for (let o = 0; o < octaves; o++) { sum += noise1(seed + o * 7919, x * freq) * amp; norm += amp; amp *= gain; freq *= 2.03; }
  return sum / norm;
}
/** Smooth 2D value noise in [-1,1]. */
export function noise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hashSigned(seed, xi, yi), b = hashSigned(seed, xi + 1, yi), c = hashSigned(seed, xi, yi + 1), d = hashSigned(seed, xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// ---- SVG path flattening ---------------------------------------------------------------------------------------------------------

const PATH_TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
const PATH_SAFE = /^[0-9.,+\-\seEMmLlHhVvCcSsQqTtAaZz]*$/;

/** True when `d` contains only SVG path syntax, starts with a move and stays within a bounded size. */
export function isSafePath(d: unknown): d is string {
  return typeof d === "string" && d.length > 0 && d.length <= 40000 && PATH_SAFE.test(d) && /^\s*[Mm]/.test(d);
}

function arcPoints(x1: number, y1: number, rx: number, ry: number, phi: number, large: boolean, sweep: boolean, x2: number, y2: number, out: Point[]) {
  if (rx === 0 || ry === 0) { out.push([x2, y2]); return; }
  rx = Math.abs(rx); ry = Math.abs(ry);
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const lambda = xp * xp / (rx * rx) + yp * yp / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = coef * rx * yp / ry, cyp = -coef * ry * xp / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = angle(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = angle((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= Math.PI * 2;
  if (sweep && dt < 0) dt += Math.PI * 2;
  const steps = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 18)));
  for (let i = 1; i <= steps; i++) {
    const t = t1 + dt * i / steps;
    out.push([cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos]);
  }
}

/**
 * Flatten an SVG path into polylines. Curves are subdivided by length so a tear sampled along the result has
 * even spacing. Supports every path command, relative and absolute.
 */
export function flattenPath(d: string, step = 6): Subpath[] {
  if (!isSafePath(d)) throw new RangeError("COLLAGE1 path must be bounded SVG path data beginning with M.");
  const tokens = [...d.matchAll(PATH_TOKEN)].map(m => m[1] ?? Number(m[2]));
  const result: Subpath[] = [];
  let current: Point[] = [], x = 0, y = 0, sx = 0, sy = 0, cmd = "", lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = "";
  let i = 0;
  const num = () => {
    const v = tokens[i++];
    if (typeof v !== "number" || !Number.isFinite(v)) throw new RangeError("COLLAGE1 path has a missing or invalid number.");
    return v;
  };
  const flush = (closed: boolean) => { if (current.length > 1) result.push({ points: current, closed }); current = []; };
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    const len = Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(ex - x2, ey - y2);
    const n = Math.max(2, Math.min(200, Math.ceil(len / step)));
    for (let k = 1; k <= n; k++) {
      const t = k / n, m = 1 - t;
      current.push([m * m * m * x + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * ex, m * m * m * y + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * ey]);
    }
  };
  const quad = (qx: number, qy: number, ex: number, ey: number) => {
    const len = Math.hypot(qx - x, qy - y) + Math.hypot(ex - qx, ey - qy);
    const n = Math.max(2, Math.min(200, Math.ceil(len / step)));
    for (let k = 1; k <= n; k++) {
      const t = k / n, m = 1 - t;
      current.push([m * m * x + 2 * m * t * qx + t * t * ex, m * m * y + 2 * m * t * qy + t * t * ey]);
    }
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === "string") { cmd = t; i++; if (cmd === "Z" || cmd === "z") { if (current.length) current.push([sx, sy]); flush(true); x = sx; y = sy; prev = cmd; continue; } }
    else if (!cmd) throw new RangeError("COLLAGE1 path must start with a command.");
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (C) {
      case "M": {
        flush(false);
        x = num() + ox; y = num() + oy; sx = x; sy = y; current = [[x, y]];
        cmd = rel ? "l" : "L"; break;
      }
      case "L": { x = num() + ox; y = num() + oy; current.push([x, y]); break; }
      case "H": { x = num() + ox; current.push([x, y]); break; }
      case "V": { y = num() + oy; current.push([x, y]); break; }
      case "C": {
        const x1 = num() + ox, y1 = num() + oy, x2 = num() + ox, y2 = num() + oy, ex = num() + ox, ey = num() + oy;
        cubic(x1, y1, x2, y2, ex, ey); lcx = x2; lcy = y2; x = ex; y = ey; break;
      }
      case "S": {
        const reflect = prev.toUpperCase() === "C" || prev.toUpperCase() === "S";
        const x1 = reflect ? 2 * x - lcx : x, y1 = reflect ? 2 * y - lcy : y;
        const x2 = num() + ox, y2 = num() + oy, ex = num() + ox, ey = num() + oy;
        cubic(x1, y1, x2, y2, ex, ey); lcx = x2; lcy = y2; x = ex; y = ey; break;
      }
      case "Q": {
        const qx = num() + ox, qy = num() + oy, ex = num() + ox, ey = num() + oy;
        quad(qx, qy, ex, ey); lqx = qx; lqy = qy; x = ex; y = ey; break;
      }
      case "T": {
        const reflect = prev.toUpperCase() === "Q" || prev.toUpperCase() === "T";
        const qx = reflect ? 2 * x - lqx : x, qy = reflect ? 2 * y - lqy : y;
        const ex = num() + ox, ey = num() + oy;
        quad(qx, qy, ex, ey); lqx = qx; lqy = qy; x = ex; y = ey; break;
      }
      case "A": {
        const rx = num(), ry = num(), rot = num(), large = num() !== 0, sweep = num() !== 0, ex = num() + ox, ey = num() + oy;
        arcPoints(x, y, rx, ry, rot * Math.PI / 180, large, sweep, ex, ey, current); x = ex; y = ey; break;
      }
      default: throw new RangeError("COLLAGE1 path has an unsupported command " + cmd + ".");
    }
    prev = cmd;
    if (current.length > 20000) throw new RangeError("COLLAGE1 path is too detailed.");
  }
  flush(false);
  return result;
}

// ---- Polygon utilities -----------------------------------------------------------------------------------------------------------

export function signedArea(poly: readonly Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
export function bounds(points: readonly Point[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
export function polylineLength(points: readonly Point[], closed = false): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  if (closed && points.length > 1) total += Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]);
  return total;
}
/** Even-spaced resampling; a closed loop drops a duplicated end point first. */
export function resample(points: readonly Point[], spacing: number, closed: boolean): Point[] {
  let pts = points.slice();
  if (closed && pts.length > 2) {
    const a = pts[0], b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) pts = pts.slice(0, -1);
  }
  if (pts.length < 2) return pts;
  const loop = closed ? [...pts, pts[0]] : pts;
  const total = polylineLength(loop);
  const n = Math.max(closed ? 8 : 2, Math.min(4000, Math.round(total / Math.max(.5, spacing))));
  const out: Point[] = [];
  let seg = 0, segStart = 0, segLen = Math.hypot(loop[1][0] - loop[0][0], loop[1][1] - loop[0][1]);
  const count = closed ? n : n + 1;
  for (let k = 0; k < count; k++) {
    const target = total * k / n;
    while (seg < loop.length - 2 && segStart + segLen < target) {
      segStart += segLen; seg++;
      segLen = Math.hypot(loop[seg + 1][0] - loop[seg][0], loop[seg + 1][1] - loop[seg][1]);
    }
    const t = segLen > 0 ? Math.min(1, Math.max(0, (target - segStart) / segLen)) : 0;
    out.push([loop[seg][0] + (loop[seg + 1][0] - loop[seg][0]) * t, loop[seg][1] + (loop[seg + 1][1] - loop[seg][1]) * t]);
  }
  return out;
}
/** Position and tangent angle (degrees) at a distance fraction along a polyline. */
export function pointAlong(points: readonly Point[], fraction: number): { x: number; y: number; angle: number } {
  if (points.length === 0) return { x: 0, y: 0, angle: 0 };
  if (points.length === 1) return { x: points[0][0], y: points[0][1], angle: 0 };
  const total = polylineLength(points), target = total * Math.min(1, Math.max(0, fraction));
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (walked + len >= target || i === points.length - 1) {
      const t = len > 0 ? Math.min(1, (target - walked) / len) : 0;
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
    }
    walked += len;
  }
  const a = points[points.length - 2], b = points[points.length - 1];
  return { x: b[0], y: b[1], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}
/** The first `fraction` of a polyline by length, ending exactly on the cut. */
export function trimPolyline(points: readonly Point[], fraction: number): Point[] {
  const f = Math.min(1, Math.max(0, fraction));
  if (f >= 1) return points.slice();
  if (f <= 0 || points.length < 2) return points.length ? [points[0]] : [];
  const total = polylineLength(points), target = total * f;
  const out: Point[] = [points[0]];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (walked + len >= target) {
      const t = len > 0 ? (target - walked) / len : 0;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      return out;
    }
    out.push(b); walked += len;
  }
  return out;
}

/** Vertex normals pointing outward for a closed loop of either winding. */
function outwardNormals(poly: readonly Point[]): Point[] {
  const orient = signedArea(poly) >= 0 ? 1 : -1, n = poly.length;
  return poly.map((_, i) => {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
    // For a counter-clockwise loop (positive area in y-down screen space is clockwise visually) the outward normal is (ty,-tx).
    return [orient * ty / len, -orient * tx / len] as Point;
  });
}
/** Outward offset of a closed loop, smoothed so concave corners do not fold. */
export function offsetLoop(poly: readonly Point[], distance: number): Point[] {
  const normals = outwardNormals(poly), n = poly.length;
  // A three-tap smoothing of the normals keeps tight concave corners from tearing the border inside out.
  return poly.map((p, i) => {
    const a = normals[(i - 1 + n) % n], b = normals[i], c = normals[(i + 1) % n];
    let nx = a[0] + 2 * b[0] + c[0], ny = a[1] + 2 * b[1] + c[1];
    const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    return [p[0] + nx * distance, p[1] + ny * distance] as Point;
  });
}

// ---- Paper edges -----------------------------------------------------------------------------------------------------------------

/** `torn`: hand-torn fibrous edge. `cut`: scissor-cut facets. `deckle`: soft handmade sheet edge. `clean`: exact. */
export type EdgeStyle = "torn" | "cut" | "deckle" | "clean";

export interface EdgeOptions {
  style: EdgeStyle;
  seed: number;
  /** Edge roughness amplitude in authored pixels. */
  roughness?: number;
}

/**
 * Rebuild a closed outline with a physical paper edge. The displacement is a function of arc length, so the
 * same tear repeats on every frame and scales with the paper rather than the screen.
 */
export function paperEdge(poly: readonly Point[], options: EdgeOptions): Point[] {
  const { style, seed } = options;
  if (style === "clean" || poly.length < 3) return poly.slice();
  const r = options.roughness ?? (style === "torn" ? 3.2 : style === "cut" ? 1.2 : 1.6);
  if (style === "cut") {
    // Scissors travel in short straight runs that each wander off the line a little, leaving faceted corners.
    const loop = resample(poly, 4, true), normals = outwardNormals(loop);
    const total = polylineLength(loop, true);
    // Run boundaries along the outline; the offset is linear inside each run, so each run is one straight snip.
    const marks: number[] = [0];
    for (let k = 1; marks[marks.length - 1] < total && k < 2000; k++) marks.push(marks[marks.length - 1] + 18 + hash01(seed, k) * 46);
    const last = marks.length - 1;
    const offsetAt = (k: number) => k <= 0 || k >= last ? hashSigned(seed, 0, 1) : hashSigned(seed, k, 1);
    const out: Point[] = [];
    let walked = 0, run = 0;
    for (let i = 0; i < loop.length; i++) {
      while (run < last - 1 && marks[run + 1] <= walked) run++;
      const a = marks[run], b = Math.min(total, marks[run + 1]);
      const t = b > a ? Math.min(1, Math.max(0, (walked - a) / (b - a))) : 0;
      const off = (offsetAt(run) * (1 - t) + offsetAt(run + 1) * t) * r;
      out.push([loop[i][0] + normals[i][0] * off, loop[i][1] + normals[i][1] * off]);
      const next = loop[(i + 1) % loop.length];
      walked += Math.hypot(next[0] - loop[i][0], next[1] - loop[i][1]);
    }
    return out;
  }
  const spacing = style === "torn" ? 1.6 : 3;
  const loop = resample(poly, spacing, true), normals = outwardNormals(loop);
  let walked = 0;
  return loop.map((p, i) => {
    const prev = loop[(i - 1 + loop.length) % loop.length];
    walked += i === 0 ? 0 : Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    let off: number;
    if (style === "torn") {
      // Low-frequency wander, mid-frequency bite and sparse fibre spikes.
      const wander = fbm1(seed, walked / 90, 3) * 1.25;
      const bite = fbm1(seed + 31, walked / 11, 3) * .85;
      const fibre = hash01(seed + 97, i) > .9 ? hashSigned(seed + 101, i) * .9 : 0;
      off = (wander + bite + fibre) * r;
    } else off = fbm1(seed, walked / 26, 2) * r;
    return [p[0] + normals[i][0] * off, p[1] + normals[i][1] * off] as Point;
  });
}

/** Compact path data. Closed loops end with Z. */
export function toPathD(points: readonly Point[], closed: boolean): string {
  if (!points.length) return "";
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  let d = "M" + f(points[0][0]) + " " + f(points[0][1]);
  for (let i = 1; i < points.length; i++) d += "L" + f(points[i][0]) + " " + f(points[i][1]);
  return closed ? d + "Z" : d;
}
/** Smooth open/closed polyline through its points with Catmull-Rom → cubic Bézier segments. */
export function toSmoothPathD(points: readonly Point[], closed: boolean, tension = .5): string {
  const n = points.length;
  if (n < 3) return toPathD(points, closed);
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  const at = (i: number) => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  let d = "M" + f(points[0][0]) + " " + f(points[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const k = tension / 3;
    d += "C" + f(p1[0] + (p2[0] - p0[0]) * k) + " " + f(p1[1] + (p2[1] - p0[1]) * k) + " " +
      f(p2[0] - (p3[0] - p1[0]) * k) + " " + f(p2[1] - (p3[1] - p1[1]) * k) + " " + f(p2[0]) + " " + f(p2[1]);
  }
  return closed ? d + "Z" : d;
}

// ---- Shape primitives ------------------------------------------------------------------------------------------------------------

export type CollageShape =
  | { type: "rect"; width: number; height: number; radius?: number }
  | { type: "ellipse"; rx: number; ry: number }
  | { type: "polygon"; points: readonly (readonly [number, number])[] }
  | { type: "star"; points: number; outer: number; inner: number }
  | { type: "bubble"; width: number; height: number; radius?: number; tail: readonly [number, number]; tailWidth?: number }
  | { type: "path"; d: string };

/** Closed loops for a shape, centred on the local origin unless authored otherwise. */
export function shapeLoops(shape: CollageShape): Point[][] {
  switch (shape.type) {
    case "rect": {
      const w = shape.width / 2, h = shape.height / 2, r = Math.min(shape.radius ?? 0, w, h);
      if (r <= 0) return [[[-w, -h], [w, -h], [w, h], [-w, h]]];
      const pts: Point[] = [];
      const corner = (cx: number, cy: number, a0: number) => { for (let k = 0; k <= 6; k++) { const a = a0 + k * Math.PI / 12; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
      corner(w - r, -h + r, -Math.PI / 2); corner(w - r, h - r, 0); corner(-w + r, h - r, Math.PI / 2); corner(-w + r, -h + r, Math.PI);
      return [pts];
    }
    case "ellipse": {
      const n = Math.max(24, Math.min(160, Math.round((shape.rx + shape.ry) / 3)));
      return [Array.from({ length: n }, (_, k) => [Math.cos(k / n * Math.PI * 2) * shape.rx, Math.sin(k / n * Math.PI * 2) * shape.ry] as Point)];
    }
    case "polygon": return [shape.points.map(p => [p[0], p[1]] as Point)];
    case "star": {
      const pts: Point[] = [];
      for (let k = 0; k < shape.points * 2; k++) {
        const a = -Math.PI / 2 + k * Math.PI / shape.points, r = k % 2 ? shape.inner : shape.outer;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return [pts];
    }
    case "bubble": {
      const [box] = shapeLoops({ type: "rect", width: shape.width, height: shape.height, radius: shape.radius ?? Math.min(shape.width, shape.height) * .3 });
      // Insert the tail on the bottom edge nearest its tip.
      const tw = shape.tailWidth ?? Math.min(48, shape.width * .18), [tx, ty] = shape.tail;
      const baseX = Math.max(-shape.width / 2 + tw, Math.min(shape.width / 2 - tw, tx * .45));
      const bottom = shape.height / 2;
      const out: Point[] = [];
      let inserted = false;
      for (let i = 0; i < box.length; i++) {
        const p = box[i], q = box[(i + 1) % box.length];
        out.push(p);
        if (!inserted && Math.abs(p[1] - bottom) < .01 && Math.abs(q[1] - bottom) < .01 && p[0] > baseX && q[0] < baseX) {
          out.push([baseX + tw / 2, bottom], [tx, ty], [baseX - tw / 2, bottom]);
          inserted = true;
        }
      }
      return [out];
    }
    case "path": return flattenPath(shape.d, 5).map(s => s.points);
  }
}
