/**
 * A painted face on the 468 points of a face mesh: EXPR1's action units (FACS) move the paint, and the depth of the points
 * says what comes forward when the head turns. The points are measured on each painting, so each face keeps its own
 * proportions: a child's large eyes and an old man's narrow ones move by the same muscles. Pure: no DOM, no state.
 */
import { createFace } from "../anatomy/anatomy-face";
import type { FaceStudy } from "../anatomy/anatomy-face";
import { expressFace } from "../anatomy/expression-face";

/** Strength (0–1) of each action unit: 1 and 2 raise the inner and outer brow, 4 lowers it, 6 raises the cheek, 12 the corners of the lips. */
export type FaceUnits = Readonly<Record<number, number>>;
/** x, y in the rest pose of the rig, and depth (+ to the viewer), all in rig units. MediaPipe's order. */
export type FacePoints = readonly (readonly [number, number, number])[];

const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
/** Outer and inner outline of the lips: the marks of a painted mouth, the same list for each mouth. */
export const LIP_MARKS = [61, 291, 13, 14, 0, 17, 40, 37, 267, 270, 91, 84, 314, 321, 78, 308, 81, 311, 178, 402] as const;

const NEAR = 10;
interface Lattice { x: number; y: number; dx: number; dy: number; nx: number; ny: number; near: Uint16Array; weight: Float32Array; relief: Float32Array; unit: number }
const lattices = new WeakMap<FacePoints, Lattice>();

/** Nodes over the face and a little round it; each knows the points near it, and how much they move it. */
function latticeOf(pts: FacePoints): Lattice {
  const had = lattices.get(pts); if (had) return had;
  const oval = OVAL.map(i => pts[i]), x0 = Math.min(...oval.map(p => p[0])), x1 = Math.max(...oval.map(p => p[0])), y0 = Math.min(...oval.map(p => p[1])), y1 = Math.max(...oval.map(p => p[1]));
  const W = x1 - x0, pad = 0.2 * W, nx = 36, ny = 44, x = x0 - pad, y = y0 - pad * 1.4, dx = (W + 2 * pad) / (nx - 1), dy = (y1 - y0 + pad * 2.2) / (ny - 1);
  const near = new Uint16Array(nx * ny * NEAR), weight = new Float32Array(nx * ny * NEAR), count = Math.min(468, pts.length), sigma = 0.032 * W;
  // how far each point stands out from the skin round it: the nose, the lips, the chin; eyes lie in
  const out = Float32Array.from({ length: count }, (_, i) => { let s = 0, n = 0; for (let k = 0; k < count; k++) { const d = Math.hypot(pts[k][0] - pts[i][0], pts[k][1] - pts[i][1]) / (0.2 * W); if (d < 1) { const w = (1 - d * d) ** 2; s += w * pts[k][2]; n += w; } } return pts[i][2] - s / n; });
  const relief = new Float32Array(nx * ny), order = Array.from({ length: count }, (_, i) => i);
  for (let j = 0, node = 0; j < ny; j++) for (let i = 0; i < nx; i++, node++) {
    const X = x + i * dx, Y = y + j * dy, d = order.map(k => Math.hypot(pts[k][0] - X, pts[k][1] - Y)), best = [...order].sort((a, b) => d[a] - d[b]).slice(0, NEAR);
    const reach = Math.max(sigma, d[best[0]] * 0.8), far = Math.min(1, Math.max(0, (d[best[0]] - 0.03 * W) / (0.15 * W))), all = 1 - far * far * (3 - 2 * far);
    let sum = 0; const w = best.map(k => { const g = Math.exp(-((d[k] / reach) ** 2)); sum += g; return g; });
    best.forEach((k, q) => { near[node * NEAR + q] = k; weight[node * NEAR + q] = (w[q] / (sum || 1)) * all; relief[node] += (w[q] / (sum || 1)) * all * out[k]; });
  }
  const l: Lattice = { x, y, dx, dy, nx, ny, near, weight, relief, unit: W }; lattices.set(pts, l); return l;
}

let neutral: FaceStudy | undefined;
const moved = new Map<string, Float32Array>();
/** What the units do to the canonical face: movement of each point, in widths of the face, y down. */
function moveOf(units: FaceUnits): Float32Array {
  const key = Object.entries(units).filter(([, w]) => Math.abs(w) > 0.004).map(([k, w]) => `${k}:${w.toFixed(2)}`).join(); let m = moved.get(key);
  if (m) return m;
  neutral ??= createFace(); const f = expressFace(Object.fromEntries(key ? key.split(",").map(q => q.split(":").map(Number)) : []), neutral), side = Math.sign(f.neutral[454][0] - f.neutral[234][0]) || 1, wide = Math.abs(f.neutral[454][0] - f.neutral[234][0]);
  m = new Float32Array(936); for (let i = 0; i < 468; i++) { m[2 * i] = (side * (f.vertices[i][0] - f.neutral[i][0])) / wide; m[2 * i + 1] = -(f.vertices[i][1] - f.neutral[i][1]) / wide; }
  if (moved.size > 400) moved.clear();
  moved.set(key, m); return m;
}

type Warp = (x: number, y: number) => [number, number];
/** A value of each node, read between the nodes; 0 outside. */
function read(l: Lattice, v: Float32Array, size: number, at: number, x: number, y: number): number {
  const u = (x - l.x) / l.dx, w = (y - l.y) / l.dy; if (u < 0 || w < 0 || u >= l.nx - 1 || w >= l.ny - 1) return 0;
  const i = Math.floor(u), j = Math.floor(w), a = u - i, b = w - j, k = (j * l.nx + i) * size + at, r = l.nx * size;
  return (v[k] * (1 - a) + v[k + size] * a) * (1 - b) + (v[k + r] * (1 - a) + v[k + r + size] * a) * b;
}
/** How the paint of a face moves for some sets of units, each at a strength. */
export function expressWarp(pts: FacePoints, sets: readonly (readonly [FaceUnits, number])[]): Warp | null {
  const used = sets.filter(([u, w]) => w > 0.004 && Object.values(u).some(v => Math.abs(v) > 0.004)); if (!used.length) return null;
  const l = latticeOf(pts), v = new Float32Array(l.nx * l.ny * 2);
  for (const [units, s] of used) { const m = moveOf(units); for (let n = 0; n < l.nx * l.ny; n++) for (let q = 0; q < NEAR; q++) { const w = l.weight[n * NEAR + q] * s * l.unit, k = l.near[n * NEAR + q]; v[2 * n] += w * m[2 * k]; v[2 * n + 1] += w * m[2 * k + 1]; } }
  return (x, y) => [x + read(l, v, 2, 0, x, y), y + read(l, v, 2, 1, x, y)];
}
/** How far the paint stands out from the skin round it, in rig units. */
export function faceRelief(pts: FacePoints): (x: number, y: number) => number { const l = latticeOf(pts); return (x, y) => read(l, l.relief, 1, 0, x, y); }

/** A raised or a lowered brow as units. */
export const browUnits = (brow: number): FaceUnits => (brow > 0 ? { 1: brow * 0.75, 2: brow * 0.75 } : { 4: -brow * 0.8 });

/** Looks that each painted face can have without a painting of its own: units, and how open the mouth rests. */
export const FACE_LOOKS: Readonly<Record<string, { units: FaceUnits; mouth?: string; strength?: number }>> = {
  neutral: { units: {} },
  happy: { units: { 6: 0.55, 12: 0.7 } },
  thoughtful: { units: { 1: 0.25, 2: 0.35, 14: 0.5, 24: 0.3 } },
  puzzled: { units: { 1: 0.5, 4: 0.55, 15: 0.25 } },
  worried: { units: { 1: 0.85, 4: 0.6, 15: 0.45 } },
  sad: { units: { 1: 0.9, 4: 0.6, 15: 0.9, 41: 0.2 } },
  angry: { units: { 4: 0.95, 7: 0.5, 23: 0.7, 15: 0.3 } },
  surprised: { units: { 1: 0.95, 2: 0.95, 5: 0.6 }, mouth: "o", strength: 0.7 },
  embarrassed: { units: { 1: 0.5, 6: 0.3, 12: 0.45, 14: 0.4 } },
  relieved: { units: { 1: 0.35, 6: 0.35, 12: 0.5 } },
  focus: { units: { 4: 0.3, 7: 0.3 } },
  tired: { units: { 1: 0.2, 41: 0.55, 15: 0.2 } },
  bite: { units: { 1: 0.25, 2: 0.25, 6: 0.2 }, mouth: "a", strength: 0.85 },
  chew: { units: { 6: 0.6, 12: 0.5, 24: 0.3 } },
};
