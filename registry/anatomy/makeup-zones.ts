/**
 * MAKEUP1 zones: where each product sits on a face.
 *
 * The atlas (data/makeup-zones.json) is shared with the Python pipeline (scripts/makeup/kumiki_makeup/zones.py), so
 * placement learned from photographs and placement painted here agree. Zones are anchored to the 468-point MediaPipe
 * mesh that ANAT1's face, EXPR1's expressed faces and photo landmarks share, and sized in eye widths, so they follow
 * each face's own bone structure. A zone is a stroke (a polyline with a radius at each point, measured in 3D) or a
 * polygon (seen from the front); its weight is 1 in the core and falls to 0 across its blend width.
 *
 * Coordinates: the face's rest frame in mm, +x the face's own left, +y up, +z forward (ANAT1's convention).
 */
import type { Vec3 } from "./anatomy-body";
import faceData from "./data/face-mesh-mediapipe.json";
import { mirrorMap } from "./face-beauty";
import { rasterizeTriangles } from "./foundation-raster";
import atlasJson from "./data/makeup-zones.json";

const MESH_TRIS = (faceData.triangles as number[][]).flat();

export interface PointSpec {
  v?: number; mix?: [number, number][]; lerp?: [PointSpec, PointSpec, number]; a?: string;
  /** Offset in eye widths in the face frame (x flips on the mirrored side). */
  off?: [number, number, number];
  /** Stroke points: half-width of the full-strength core, eye widths. */
  r?: number;
  note?: string;
}
export type FinishId = "matte" | "velvet" | "satin" | "dewy" | "glossy" | "shimmer" | "metallic" | "glitter";
export type ProductId = "foundation" | "concealer" | "corrector" | "contour" | "bronzer" | "highlight" | "blush" | "eyeshadow" | "liner" | "brow" | "lipstick" | "lip-liner" | "gloss" | "powder";
export interface ZoneSpec {
  id: string; label: string; product: ProductId; side: "both" | "center"; measure: boolean; note: string; minus?: string[];
  shape: { kind: "stroke" | "polygon"; points: PointSpec[]; soft?: number; grow?: number };
}
export interface ProductSpec { hide: number; finish: FinishId; note: string }
export interface FinishSpec { roughness: number; specular: number; sparkle: number; tinted?: boolean; note: string }
export interface MakeupAtlas {
  units: Record<string, string>; anchors: Record<string, PointSpec>; film: string;
  products: Record<ProductId, ProductSpec>; finishes: Record<FinishId, FinishSpec>; zones: ZoneSpec[];
}

/** The shared atlas: anchors, products (film opacity, finish), finishes (roughness, specular, sparkle) and zones. */
export const MAKEUP_ATLAS = atlasJson as unknown as MakeupAtlas;
export const MAKEUP_ZONES: readonly ZoneSpec[] = MAKEUP_ATLAS.zones;
const BY_ID = new Map(MAKEUP_ZONES.map(z => [z.id, z]));
export function findZone(id: string): ZoneSpec {
  const z = BY_ID.get(id);
  if (!z) throw new Error(`MAKEUP1: unknown zone "${id}"`);
  return z;
}

/** Changes a look or a face-shape rule makes to a zone (rotation and scale about the zone's first point). */
export interface ZoneAdjust {
  /** Move, eye widths [x (outward on each side is negative x on the right), y up]. */
  shift?: [number, number];
  rotate?: number; scale?: number; radius?: number; soft?: number; grow?: number;
}
export interface ZonePart { kind: "stroke" | "polygon"; pts: Vec3[]; r: number[]; soft: number; grow: number; lo: Vec3; hi: Vec3 }

/** Mean width of the two eyes (exocanthion to endocanthion), mm: the unit zones are sized in. */
export function eyeWidth(V: readonly Vec3[]): number {
  const d = (a: number, b: number) => Math.hypot(V[a][0] - V[b][0], V[a][1] - V[b][1], V[a][2] - V[b][2]);
  return (d(33, 133) + d(263, 362)) / 2;
}

/** A point spec on a face. The mirrored side uses each vertex's partner and flips x offsets. */
export function resolvePoint(spec: PointSpec, V: readonly Vec3[], ew: number, mirrored: boolean): Vec3 {
  const mm = mirrorMap(V), at = (i: number) => V[mirrored ? mm[i] : i];
  let p: Vec3;
  if (spec.v !== undefined) p = [...at(spec.v)] as Vec3;
  else if (spec.mix) {
    const t = spec.mix.reduce((s, [, w]) => s + w, 0);
    p = spec.mix.reduce<Vec3>((acc, [i, w]) => { const q = at(i); return [acc[0] + q[0] * w / t, acc[1] + q[1] * w / t, acc[2] + q[2] * w / t]; }, [0, 0, 0]);
  } else if (spec.lerp) {
    const a = resolvePoint(spec.lerp[0], V, ew, mirrored), b = resolvePoint(spec.lerp[1], V, ew, mirrored), t = spec.lerp[2];
    p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  } else if (spec.a) p = resolvePoint(MAKEUP_ATLAS.anchors[spec.a], V, ew, mirrored);
  else throw new Error(`MAKEUP1: bad point ${JSON.stringify(spec)}`);
  if (spec.off) p = [p[0] + (mirrored ? -spec.off[0] : spec.off[0]) * ew, p[1] + spec.off[1] * ew, p[2] + spec.off[2] * ew];
  return p;
}

/** A zone's parts on a face: one per side, or one for a centre zone. */
export function resolveZone(id: string, V: readonly Vec3[], adjust: ZoneAdjust = {}): ZonePart[] {
  const z = findZone(id), ew = eyeWidth(V), sh = z.shape;
  const parts: ZonePart[] = [];
  for (const mirrored of z.side === "both" ? [false, true] : [false]) {
    let pts = sh.points.map(p => resolvePoint(p, V, ew, mirrored));
    const sx = mirrored ? -1 : 1;
    if (adjust.scale !== undefined || adjust.rotate !== undefined) {
      const piv = pts[0], k = adjust.scale ?? 1, a = ((adjust.rotate ?? 0) * Math.PI / 180) * sx, c = Math.cos(a), s = Math.sin(a);
      pts = pts.map(p => { const dx = p[0] - piv[0], dy = p[1] - piv[1], dz = p[2] - piv[2]; return [piv[0] + (dx * c - dy * s) * k, piv[1] + (dx * s + dy * c) * k, piv[2] + dz * k] as Vec3; });
    }
    if (adjust.shift) pts = pts.map(p => [p[0] + adjust.shift![0] * sx * ew, p[1] + adjust.shift![1] * ew, p[2]] as Vec3);
    const r = sh.points.map(p => (p.r ?? 0) * ew * (adjust.radius ?? 1));
    const soft = (sh.soft ?? 0.3) * ew * (adjust.soft ?? 1), grow = ((sh.grow ?? 0) + (adjust.grow ?? 0)) * ew;
    const m = Math.max(...r, 0) + soft + Math.max(0, grow);
    const lo: Vec3 = [Math.min(...pts.map(p => p[0])) - m, Math.min(...pts.map(p => p[1])) - m, Math.min(...pts.map(p => p[2])) - m];
    const hi: Vec3 = [Math.max(...pts.map(p => p[0])) + m, Math.max(...pts.map(p => p[1])) + m, Math.max(...pts.map(p => p[2])) + m];
    parts.push({ kind: sh.kind, pts, r, soft, grow, lo, hi });
  }
  return parts;
}

const smoothstep = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Weight of one part at a rest-frame point. */
function partWeight(part: ZonePart, p: Vec3): number {
  const polygon = part.kind === "polygon";
  if (p[0] < part.lo[0] || p[0] > part.hi[0] || p[1] < part.lo[1] || p[1] > part.hi[1] || (!polygon && (p[2] < part.lo[2] || p[2] > part.hi[2]))) return 0;
  let d: number;
  if (!polygon) {
    const Q = part.pts, R = part.r;
    d = Infinity;
    if (Q.length === 1) d = Math.hypot(p[0] - Q[0][0], p[1] - Q[0][1], p[2] - Q[0][2]) - R[0];
    for (let k = 1; k < Q.length; k++) {
      const a = Q[k - 1], b = Q[k], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const t = L2 > 1e-12 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2)) : 0;
      const dist = Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t) - (R[k - 1] + (R[k] - R[k - 1]) * t);
      if (dist < d) d = dist;
    }
  } else {
    let inside = false, dist = Infinity;
    const Q = part.pts;
    for (let k = 0, j = Q.length - 1; k < Q.length; j = k++) {
      const [ax, ay] = Q[j], [bx, by] = Q[k];
      if ((ay > p[1]) !== (by > p[1]) && p[0] < (bx - ax) * (p[1] - ay) / (by - ay) + ax) inside = !inside;
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy, t = L2 > 0 ? Math.min(1, Math.max(0, ((p[0] - ax) * vx + (p[1] - ay) * vy) / L2)) : 0;
      dist = Math.min(dist, Math.hypot(p[0] - ax - vx * t, p[1] - ay - vy * t));
    }
    d = (inside ? -dist : dist) - part.grow;
  }
  const h = Math.max(1e-6, part.soft / 2);
  return 1 - smoothstep(-h, h, d);
}

/** A zone's weight as a function of rest-frame position, resolved once for the face (minus-zones applied). */
export function zoneField(id: string, V: readonly Vec3[], adjust?: ZoneAdjust): (p: Vec3) => number {
  const parts = resolveZone(id, V, adjust);
  const minus = (findZone(id).minus ?? []).map(m => zoneField(m, V));
  return p => {
    let w = 0;
    for (const part of parts) { w = Math.max(w, partWeight(part, p)); if (w >= 1) break; }
    for (const f of minus) if (w > 0) w *= 1 - f(p);
    return w;
  };
}

/**
 * Outlines of a zone at a weight level (0.5: the edge of its blend), seen from the front: closed polylines in the rest
 * frame's (x, y), mm. Marching squares on a grid of `step` mm over the zone, on the face's front surface, so painters
 * can draw a face chart in any style.
 */
export function zoneOutline(id: string, V: readonly Vec3[], o: { level?: number; step?: number; adjust?: ZoneAdjust } = {}): [number, number][][] {
  const level = o.level ?? 0.5, step = o.step ?? 1, f = zoneField(id, V, o.adjust), parts = resolveZone(id, V, o.adjust);
  const x0 = Math.min(...parts.map(p => p.lo[0])), x1 = Math.max(...parts.map(p => p.hi[0])), y0 = Math.min(...parts.map(p => p.lo[1])), y1 = Math.max(...parts.map(p => p.hi[1]));
  const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1, g = new Float32Array(nx * ny);
  // The depth under each grid point is interpolated in the mesh's front triangle: a vertex's own depth jumps on the
  // steep sides of the face and nose, and 3D stroke zones then fray. Off the mesh nothing is painted, so the weight is 0.
  const sx = new Float32Array(468), sy = new Float32Array(468), sz = new Float32Array(468);
  for (let k = 0; k < 468; k++) { sx[k] = (V[k][0] - x0) / step + 0.5; sy[k] = (V[k][1] - y0) / step + 0.5; sz[k] = V[k][2]; }
  const front = rasterizeTriangles(nx, ny, sx, sy, sz, MESH_TRIS);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; g[k] = front.tri[k] < 0 ? 0 : f([x0 + i * step, y0 + j * step, front.depth[k]]); }
  return marchingSquares(g, nx, ny, level).map(line => line.map(([i, j]) => [x0 + i * step, y0 + j * step] as [number, number]));
}

/** Iso-lines of a scalar grid as joined polylines in grid coordinates (marching squares, linear interpolation). */
function marchingSquares(g: Float32Array, nx: number, ny: number, level: number): [number, number][][] {
  const segs: [number, number, number, number][] = [];
  const v = (i: number, j: number) => g[j * nx + i] - level;
  const lerp = (a: number, b: number) => a / (a - b);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
    const e: [number, number][] = [];
    if ((a > 0) !== (b > 0)) e.push([i + lerp(a, b), j]);
    if ((b > 0) !== (c > 0)) e.push([i + 1, j + lerp(b, c)]);
    if ((c > 0) !== (d > 0)) e.push([i + 1 - lerp(c, d), j + 1]);
    if ((d > 0) !== (a > 0)) e.push([i, j + 1 - lerp(d, a)]);
    if (e.length === 2) segs.push([e[0][0], e[0][1], e[1][0], e[1][1]]);
    else if (e.length === 4) { segs.push([e[0][0], e[0][1], e[1][0], e[1][1]]); segs.push([e[2][0], e[2][1], e[3][0], e[3][1]]); }
  }
  // join segments end to end
  const key = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, k) => { for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) { const kk = key(x, y); (ends.get(kk) ?? ends.set(kk, []).get(kk)!).push(k); } });
  const used = new Uint8Array(segs.length), lines: [number, number][][] = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const line: [number, number][] = [[segs[k][0], segs[k][1]], [segs[k][2], segs[k][3]]];
    for (let grow = true; grow;) {
      grow = false;
      const [lx, ly] = line[line.length - 1];
      for (const n of ends.get(key(lx, ly)) ?? []) {
        if (used[n]) continue;
        used[n] = 1; grow = true;
        const s = segs[n], fwd = key(s[0], s[1]) === key(lx, ly);
        line.push(fwd ? [s[2], s[3]] : [s[0], s[1]]);
        break;
      }
    }
    if (line.length > 2) lines.push(line);
  }
  return lines;
}
