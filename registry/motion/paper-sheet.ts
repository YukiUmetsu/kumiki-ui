/**
 * Physical paper — sheets (registry item `paper-sheet`).
 *
 * A sheet is a flat outline of a real paper stock. Bends (folds, soft bends, peels, rolls) and tears change it
 * over time. Every frame resolves to facets: planar pieces of the sheet, each with an exact affine map from the
 * flat sheet (material space, the artwork's own coordinates) into 3D. Because each facet is affine, any renderer
 * can draw the original artwork on it with one matrix, so print, photos and type fold with the paper.
 *
 * - **Folds** are scored creases with a small radius; **bends** spread the turn over a length; **peels** lift a
 *   stuck sheet from a moving front whose radius follows the stock's stiffness and the adhesion; **rolls** spiral
 *   from a line, tightening by the thickness each turn. All keep lengths on the paper (developable surfaces).
 * - Flaps sag under their own weight by the stock's elastogravity length; floors stop them passing through the
 *   sheet or the surface below.
 * - **Tears** run from an edge along a wandering path. The two sides separate behind the tear tip, the torn edges
 *   carry a fibre bevel on one face and loose fibres, and a bend can follow the tip to lift one side.
 * - Bends nest: a bend with `parent` is carried on the rigid end of its parent's flap.
 *
 * Space: x right, y down (SVG), z toward the viewer. Material space is the flat sheet at z = 0.
 */

import { flattenSvgPath, nestRings, parseSvgPath, pointInRing } from "./advanced-morph-geometry";
import type { Ring } from "./advanced-morph-geometry";
import { evaluateEasing, isEasingSpec } from "./easing";
import type { EasingSpec } from "./types";
import { profileBands, solveProfile } from "./paper-sheet-profile";
import type { CurvatureSpan, PaperProfile } from "./paper-sheet-profile";
import { inspectStock, paperGravityLength, paperPeelRadius, paperTransmittance, resolveStock } from "./paper-sheet-stock";
import type { PaperStock, PaperStockInput } from "./paper-sheet-stock";

export type PaperPoint = readonly [number, number];
export type PaperVec3 = readonly [number, number, number];

export type PaperBendKind = "fold" | "bend" | "peel" | "roll";

/** Values a key can change on a bend. Each eases in from the previous key (or the bend's own value at frame 0). */
export interface PaperBendKey {
  frame: number;
  angle?: number;
  radius?: number;
  length?: number;
  offset?: number;
  /** @default "ease-in-out" */
  easing?: EasingSpec;
}

export interface PaperBend {
  id: string;
  kind: PaperBendKind;
  /** Two points on the crease (fold, bend), the peel front, or the line where a roll leaves the surface. */
  line?: readonly [PaperPoint, PaperPoint];
  /** Any point on the side of the line that moves (it may lie off the paper, e.g. past the edge a peel starts from). */
  flap?: PaperPoint;
  /** Degrees; positive turns toward the viewer. fold, bend, peel: the turn reached. roll: the most the roll turns. */
  angle: number;
  /** px. fold: crease radius (default from the stock). peel: front radius (default from stiffness and adhesion). roll: outer radius. */
  radius?: number;
  /** px. bend: the length over which the turn is spread. @default half the flap */
  length?: number;
  /** px. Moves the line into the fixed side: a peel front advancing, a crease travelling, a roll unrolling. */
  offset?: number;
  /** Peel adhesion energy, J/m². @default 25 */
  adhesion?: number;
  /** Multiplier on sag under the sheet's weight; 0 keeps the authored shape. @default 1 */
  gravity?: number;
  /** A bend carried on the rigid end of another bend's flap. */
  parent?: string;
  /** Only the side of a tear that holds the point `at` moves. */
  piece?: { tear: string; at: PaperPoint };
  /**
   * Put the line through a tear's tip, across the tear; the paper behind the tip moves. Replaces `line`. Unless
   * `piece` says otherwise, the side on the right looking along the tear lifts (a right hand pulls toward you).
   */
  follow?: string;
  keys?: readonly PaperBendKey[];
}

export interface PaperTearKey {
  frame: number;
  progress: number;
  /** @default "ease-in-out" */
  easing?: EasingSpec;
}

export interface PaperTear {
  id: string;
  /** Where the tear starts: on or just outside the edge. */
  from: PaperPoint;
  /** Where it heads. Outside the sheet, the tear can run right through; inside, it stops there. */
  to: PaperPoint;
  /** How far the tear has run, 0–1 of its length through the sheet. @default 0 */
  progress?: number;
  /** px. Wander of the tear across its direction. @default 3 mm */
  wander?: number;
  seed?: number;
  /**
   * A point on the side whose face shows the white core along the tear. Default: the side that does not lift with
   * a following bend; with none, the left side looking along the tear.
   */
  core?: PaperPoint;
  keys?: readonly PaperTearKey[];
}

export interface PaperSheetSpec {
  /** Outline in material space, px: SVG path data, or rings of points. */
  outline: string | readonly (readonly PaperPoint[])[];
  /** @default "evenodd" */
  fillRule?: "nonzero" | "evenodd";
  /** @default "copy" */
  stock?: PaperStockInput;
  /** Grain (machine direction), degrees from +x. @default 90 */
  grain?: number;
  /** Real size of the artwork. @default 4 */
  pxPerMm?: number;
  /** Visual thickness multiplier (1 = true caliper). @default 1 */
  thickness?: number;
  /** World gravity direction. @default [0, 0, -1] (lying on a table, seen from above) */
  gravity?: PaperVec3;
  /** Height of the sheet above the surface under it, px; null for no surface. @default 0 */
  support?: number | null;
  bends?: readonly PaperBend[];
  tears?: readonly PaperTear[];
  seed?: number;
}

/**
 * The physical part of a sheet that a host attaches to its own artwork (a PaperCraft layer, a collage cutout): the
 * host supplies the outline, size, gravity and height.
 */
export interface PaperSheetMotion {
  stock?: PaperStockInput;
  /** Grain direction, degrees from +x. @default 90 */
  grain?: number;
  /** Visual thickness multiplier (1 = true caliper). @default 1 */
  thickness?: number;
  bends?: readonly PaperBend[];
  tears?: readonly PaperTear[];
  seed?: number;
  /** Colour of the back (#rrggbb). @default the stock's back, else the face colour */
  back?: string;
}

/** Check a host's sheet motion (the outline comes from the host, so a stand-in is used). */
export function inspectPaperSheetMotion(motion: PaperSheetMotion, prefix = ""): PaperSheetIssue[] {
  if (!motion || typeof motion !== "object") return [{ path: prefix + "sheet", message: "sheet object required" }];
  const issues = inspectPaperSheet({ ...motion, outline: "M0 0H1V1H0Z" }, prefix);
  if (motion.back !== undefined && !/^#[0-9a-f]{6}$/i.test(motion.back)) issues.push({ path: prefix + "back", message: "back must be #rrggbb" });
  return issues;
}

export type PaperPieceSide = "left" | "right" | "ahead";

/** A planar piece of the sheet on one frame. */
export interface PaperFacet {
  /** Polygon in material space (interleaved x, y), even-odd. */
  rings: Float64Array[];
  /** Per ring, the kind of each edge i → i+1: -1 inside the sheet, 0 the outline, 1 + 2·tear + (right ? 1 : 0) a torn edge. */
  tags: Int32Array[];
  /** Material-flat (u, v, h) → world, column-major 3×4: [u axis, v axis, h axis (front normal), origin]. */
  frame: Float64Array;
  /** Shading runs from `shadeFrom` to `shadeTo` (material space), between these front normals (world). */
  shadeFrom: PaperPoint;
  shadeTo: PaperPoint;
  normalFrom: PaperVec3;
  normalTo: PaperVec3;
  /** Which side of each tear this facet is on. */
  pieces: Readonly<Record<string, PaperPieceSide>>;
  /** Not moved by any bend (lies in the sheet's rest plane). */
  rest: boolean;
  bend: string | null;
  band: number;
  /** The band without the outline: loose fibres along torn edges are clipped to it. */
  envelope: Float64Array;
}

/** The fibre bevel and loose fibres along one side of a tear. */
export interface PaperFringe {
  tear: string;
  side: "left" | "right";
  face: "front" | "back";
  /** Solid core band along the torn edge, material space (empty when this face shows none). */
  bevel: Float64Array;
  /** Wider ragged band of fibres around the core band, drawn semi-transparent. */
  feather: Float64Array;
  /** Loose fibres as polylines in material space. */
  hairs: Float64Array[];
}

export interface PaperSheetIssue {
  path: string;
  message: string;
}

export interface PaperSheetFrame {
  frame: number;
  facets: PaperFacet[];
  fringes: PaperFringe[];
  stock: PaperStock;
  /** Diffuse transmittance of one sheet (Kubelka–Munk from opacity). */
  transmittance: number;
  /** Visual thickness, px. */
  thickness: number;
  pxPerMm: number;
  /** The flat outline as SVG path data. */
  outlinePath: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Height of the sheet above the surface under it, px; null for none. */
  support: number | null;
  /** Warnings about this frame (a tear that could not separate, a bend with no paper). */
  warnings: string[];
}

export const PAPER_SHEET_LIMITS = { bends: 32, tears: 8, keys: 64, outlinePoints: 20000 } as const;

const DEG = Math.PI / 180;
const DEFAULT_EASING: EasingSpec = "ease-in-out";

/* ------------------------------------------------------------------ *
 * Tagged rings and clipping
 * ------------------------------------------------------------------ */

interface TaggedRing {
  pts: Float64Array;
  tags: Int32Array;
}

const INSIDE = -1;
const OUTLINE = 0;
const tearTag = (tear: number, side: "left" | "right") => 1 + tear * 2 + (side === "right" ? 1 : 0);

/** Keep the part of a ring where nx·x + ny·y ≥ c (Sutherland–Hodgman); new edges along the line are `tag`. */
function clipRing(ring: TaggedRing, nx: number, ny: number, c: number, tag = INSIDE): TaggedRing | null {
  const p = ring.pts;
  const n = p.length >> 1;
  if (n < 3) return null;
  const xs: number[] = [];
  const arriving: number[] = [];
  let sx = p[2 * (n - 1)];
  let sy = p[2 * (n - 1) + 1];
  let sd = nx * sx + ny * sy - c;
  for (let i = 0; i < n; i += 1) {
    const ex = p[2 * i];
    const ey = p[2 * i + 1];
    const ed = nx * ex + ny * ey - c;
    const edgeTag = ring.tags[(i - 1 + n) % n];
    if (sd >= 0 && ed >= 0) {
      xs.push(ex, ey);
      arriving.push(edgeTag);
    } else if (sd >= 0 && ed < 0) {
      const t = sd / (sd - ed);
      xs.push(sx + (ex - sx) * t, sy + (ey - sy) * t);
      arriving.push(edgeTag);
    } else if (sd < 0 && ed >= 0) {
      const t = sd / (sd - ed);
      xs.push(sx + (ex - sx) * t, sy + (ey - sy) * t);
      arriving.push(tag);
      xs.push(ex, ey);
      arriving.push(edgeTag);
    }
    sx = ex;
    sy = ey;
    sd = ed;
  }
  const m = xs.length >> 1;
  if (m < 3) return null;
  const tags = new Int32Array(m);
  for (let k = 0; k < m; k += 1) tags[k] = arriving[(k + 1) % m];
  const pts = Float64Array.from(xs);
  return Math.abs(areaOf(pts)) < 1e-6 ? null : { pts, tags };
}

function areaOf(pts: ArrayLike<number>): number {
  const n = pts.length >> 1;
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) a += pts[2 * j] * pts[2 * i + 1] - pts[2 * i] * pts[2 * j + 1];
  return a / 2;
}

/** A polygon (outer ring and holes) with the kind of every edge. */
interface Shape {
  outer: TaggedRing;
  holes: TaggedRing[];
}

function clipShape(shape: Shape, nx: number, ny: number, c: number): Shape | null {
  const outer = clipRing(shape.outer, nx, ny, c);
  if (!outer) return null;
  const holes: TaggedRing[] = [];
  for (const hole of shape.holes) {
    const clipped = clipRing(hole, nx, ny, c);
    if (clipped) holes.push(clipped);
  }
  return { outer, holes };
}

interface Crossing {
  along: number;
  edge: number;
  edgeT: number;
  x: number;
  y: number;
}

function crossings(ring: Float64Array, path: Float64Array): Crossing[] {
  const n = ring.length >> 1;
  const m = path.length >> 1;
  const out: Crossing[] = [];
  for (let k = 0; k + 1 < m; k += 1) {
    const ax = path[2 * k];
    const ay = path[2 * k + 1];
    const bx = path[2 * k + 2];
    const by = path[2 * k + 3];
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const cx = ring[2 * i];
      const cy = ring[2 * i + 1];
      const dx = ring[2 * j];
      const dy = ring[2 * j + 1];
      if (Math.max(cx, dx) < minX || Math.min(cx, dx) > maxX || Math.max(cy, dy) < minY || Math.min(cy, dy) > maxY) continue;
      const rx = bx - ax;
      const ry = by - ay;
      const sx = dx - cx;
      const sy = dy - cy;
      const denom = rx * sy - ry * sx;
      if (Math.abs(denom) < 1e-12) continue;
      const qx = cx - ax;
      const qy = cy - ay;
      const t = (qx * sy - qy * sx) / denom;
      const u = (qx * ry - qy * rx) / denom;
      if (t >= 0 && t < 1 && u >= 0 && u < 1) out.push({ along: k + t, edge: i, edgeT: u, x: ax + rx * t, y: ay + ry * t });
    }
  }
  return out.sort((a, b) => a.along - b.along);
}

/** Ring vertices walking forward from a crossing to another, exclusive. */
function walkRing(ring: TaggedRing, from: Crossing, to: Crossing, xs: number[], tags: number[]): void {
  const n = ring.pts.length >> 1;
  if (from.edge === to.edge && to.edgeT > from.edgeT) return;
  let count = (to.edge - from.edge + n) % n;
  if (count === 0) count = n;
  for (let k = 1; k <= count; k += 1) {
    const v = (from.edge + k) % n;
    xs.push(ring.pts[2 * v], ring.pts[2 * v + 1]);
    tags.push(ring.tags[v]);
  }
}

/** Split a ring along a path that enters and leaves it; the path's edges take `leftTag` / `rightTag`. */
function splitRing(ring: TaggedRing, path: Float64Array, leftTag: number, rightTag: number): { left: TaggedRing; right: TaggedRing } | null {
  const hits = crossings(ring.pts, path);
  if (hits.length < 2) return null;
  const a = hits[0];
  const b = hits[1];
  const first = Math.floor(a.along) + 1;
  const last = Math.floor(b.along);
  const inner: number[] = [];
  for (let k = first; k <= last; k += 1) inner.push(path[2 * k], path[2 * k + 1]);
  const build = (forward: boolean, pathTag: number): TaggedRing => {
    const xs: number[] = [];
    const tags: number[] = [];
    const start = forward ? a : b;
    const end = forward ? b : a;
    xs.push(start.x, start.y);
    tags.push(pathTag);
    const count = inner.length >> 1;
    for (let k = 0; k < count; k += 1) {
      const i = forward ? k : count - 1 - k;
      xs.push(inner[2 * i], inner[2 * i + 1]);
      tags.push(pathTag);
    }
    xs.push(end.x, end.y);
    tags.push(ring.tags[end.edge]);
    walkRing(ring, end, start, xs, tags);
    return { pts: Float64Array.from(xs), tags: Int32Array.from(tags) };
  };
  // Which side is left: probe just left of the path's first inside segment.
  const nextX = inner.length ? inner[0] : b.x;
  const nextY = inner.length ? inner[1] : b.y;
  const dx = nextX - a.x;
  const dy = nextY - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const probeX = (a.x + nextX) / 2 + (dy / len) * 1e-3;
  const probeY = (a.y + nextY) / 2 - (dx / len) * 1e-3;
  const forwardRing = build(true, 0);
  const forwardIsLeft = pointInRing(probeX, probeY, forwardRing.pts);
  const left = build(forwardIsLeft, leftTag);
  const right = build(!forwardIsLeft, rightTag);
  if (Math.abs(areaOf(left.pts)) < 1e-6 || Math.abs(areaOf(right.pts)) < 1e-6) return null;
  return { left, right };
}

/** Which side of a polyline a point is on, by its nearest segment. */
function sideOfPath(path: Float64Array, x: number, y: number): "left" | "right" {
  const m = path.length >> 1;
  let best = Infinity;
  let side: "left" | "right" = "left";
  for (let k = 0; k + 1 < m; k += 1) {
    const ax = path[2 * k];
    const ay = path[2 * k + 1];
    const dx = path[2 * k + 2] - ax;
    const dy = path[2 * k + 3] - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / Math.max(dx * dx + dy * dy, 1e-12)));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) {
      best = d;
      // Left of a direction (dx, dy) on a y-down screen is (dy, −dx).
      side = (x - ax) * dy - (y - ay) * dx > 0 ? "left" : "right";
    }
  }
  return side;
}

function splitShape(shape: Shape, path: Float64Array, tear: number): { left: Shape; right: Shape } | null {
  const split = splitRing(shape.outer, path, tearTag(tear, "left"), tearTag(tear, "right"));
  if (!split) return null;
  const left: Shape = { outer: split.left, holes: [] };
  const right: Shape = { outer: split.right, holes: [] };
  for (const hole of shape.holes) (pointInRing(hole.pts[0], hole.pts[1], split.left.pts) ? left : right).holes.push(hole);
  return { left, right };
}

/* ------------------------------------------------------------------ *
 * Affine frames (material-flat → world)
 * ------------------------------------------------------------------ */

const IDENTITY_FRAME = Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);

function compose(p: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(12);
  for (let col = 0; col < 4; col += 1) {
    const x = b[3 * col];
    const y = b[3 * col + 1];
    const z = b[3 * col + 2];
    out[3 * col] = p[0] * x + p[3] * y + p[6] * z;
    out[3 * col + 1] = p[1] * x + p[4] * y + p[7] * z;
    out[3 * col + 2] = p[2] * x + p[5] * y + p[8] * z;
  }
  out[9] += p[9];
  out[10] += p[10];
  out[11] += p[11];
  return out;
}

function rotateVector(frame: Float64Array, x: number, y: number, z: number): [number, number, number] {
  return [frame[0] * x + frame[3] * y + frame[6] * z, frame[1] * x + frame[4] * y + frame[7] * z, frame[2] * x + frame[5] * y + frame[8] * z];
}

/** World position of material point (u, v) at height h above the front face. */
export function paperFramePoint(frame: Float64Array, u: number, v: number, h = 0): [number, number, number] {
  return [
    frame[0] * u + frame[3] * v + frame[6] * h + frame[9],
    frame[1] * u + frame[4] * v + frame[7] * h + frame[10],
    frame[2] * u + frame[5] * v + frame[8] * h + frame[11],
  ];
}

/**
 * Map of a band of a bend, in the flat sheet: points on the band's start line go to (xa, za) of the profile, the
 * band runs along the chord (cx, cz) per unit arc length, and h lifts along the chord's normal.
 */
function bandFrame(ox: number, oy: number, nx: number, ny: number, sa: number, xa: number, za: number, cx: number, cz: number): Float64Array {
  const len = Math.hypot(cx, cz) || 1;
  const f = new Float64Array(12);
  // ∂/∂u and ∂/∂v: identity plus ((cx − 1)n̂ + cz ĥ) n̂ᵀ.
  f[0] = 1 + (cx - 1) * nx * nx;
  f[1] = (cx - 1) * ny * nx;
  f[2] = cz * nx;
  f[3] = (cx - 1) * nx * ny;
  f[4] = 1 + (cx - 1) * ny * ny;
  f[5] = cz * ny;
  // Front normal of the band: the chord direction turned a quarter toward ĥ.
  f[6] = (-cz / len) * nx;
  f[7] = (-cz / len) * ny;
  f[8] = cx / len;
  // Image of the material origin: s₀ = −n̂·O.
  const s0 = -(nx * ox + ny * oy);
  const along = xa + (s0 - sa) * cx - s0;
  f[9] = along * nx;
  f[10] = along * ny;
  f[11] = za + (s0 - sa) * cz;
  return f;
}

/* ------------------------------------------------------------------ *
 * Noise
 * ------------------------------------------------------------------ */

function hash01(seed: number, i: number): number {
  let h = Math.imul(seed | 0, 374761393) ^ Math.imul(i | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash01(seed, i) * 2 - 1) * (1 - u) + (hash01(seed, i + 1) * 2 - 1) * u;
}

function fbm(seed: number, x: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += noise1(seed + o * 101, x * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ *
 * Outline
 * ------------------------------------------------------------------ */

const outlineCache = new Map<string, { shapes: Shape[]; path: string }>();

function outlineKey(spec: PaperSheetSpec): string {
  return (spec.fillRule ?? "evenodd") + "|" + (typeof spec.outline === "string" ? spec.outline : JSON.stringify(spec.outline));
}

function ringsToPath(rings: readonly ArrayLike<number>[]): string {
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  return rings
    .map((r) => {
      let d = "";
      for (let i = 0; i < r.length; i += 2) d += (i ? "L" : "M") + f(r[i]) + " " + f(r[i + 1]);
      return d + "Z";
    })
    .join("");
}

function loadOutline(spec: PaperSheetSpec): { shapes: Shape[]; path: string } {
  const key = outlineKey(spec);
  const cached = outlineCache.get(key);
  if (cached) return cached;
  let rings: Ring[];
  if (typeof spec.outline === "string") {
    const parsed = parseSvgPath(spec.outline);
    if (parsed.error) throw new Error(`Paper sheet outline: ${parsed.error}`);
    rings = flattenSvgPath(parsed.segments, 0.25);
  } else {
    rings = spec.outline.map((points) => Float64Array.from(points.flatMap((p) => [p[0], p[1]])));
  }
  const nested = nestRings(rings.filter((r) => r.length >= 6), spec.fillRule ?? "evenodd");
  const tagged = (ring: Ring): TaggedRing => ({ pts: ring, tags: new Int32Array(ring.length >> 1).fill(OUTLINE) });
  const shapes = nested.map((polygon) => ({ outer: tagged(polygon.outer), holes: polygon.holes.map(tagged) }));
  const result = { shapes, path: ringsToPath(nested.flatMap((p) => [p.outer, ...p.holes])) };
  if (outlineCache.size >= 64) outlineCache.delete(outlineCache.keys().next().value as string);
  outlineCache.set(key, result);
  return result;
}

/* ------------------------------------------------------------------ *
 * Keys
 * ------------------------------------------------------------------ */

/** A value at `frame`: `base` at frame 0, then easing into each key that sets it. */
function keyed<K extends { frame: number; easing?: EasingSpec }>(keys: readonly K[] | undefined, frame: number, pick: (key: K) => number | undefined, base: number): number {
  if (!keys || keys.length === 0) return base;
  let prevFrame = 0;
  let prevValue = base;
  for (const key of keys) {
    const value = pick(key);
    if (value === undefined) continue;
    if (frame < key.frame) {
      const span = key.frame - prevFrame;
      if (span <= 0) return value;
      const t = evaluateEasing(key.easing ?? DEFAULT_EASING, (frame - prevFrame) / span);
      return prevValue + (value - prevValue) * t;
    }
    prevFrame = key.frame;
    prevValue = value;
  }
  return prevValue;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPoint = (p: unknown): p is PaperPoint => Array.isArray(p) && p.length === 2 && finite(p[0]) && finite(p[1]) && Math.abs(p[0]) <= 1e5 && Math.abs(p[1]) <= 1e5;

function inspectKeys(keys: unknown, path: string, fields: readonly string[], bad: (path: string, message: string) => void): void {
  if (keys === undefined) return;
  if (!Array.isArray(keys) || keys.length > PAPER_SHEET_LIMITS.keys) {
    bad(path, `keys must be an array of up to ${PAPER_SHEET_LIMITS.keys}`);
    return;
  }
  let previous = -1;
  keys.forEach((key: Record<string, unknown> | null, i) => {
    const at = `${path}[${i}]`;
    if (!key || typeof key !== "object") {
      bad(at, "key object required");
      return;
    }
    if (!Number.isInteger(key.frame) || (key.frame as number) < 0) bad(at + ".frame", "frame must be a nonnegative integer");
    else if ((key.frame as number) <= previous) bad(at + ".frame", "key frames must increase");
    else previous = key.frame as number;
    for (const field of fields) if (key[field] !== undefined && !finite(key[field])) bad(`${at}.${field}`, `${field} must be finite`);
    if (key.easing !== undefined && !isEasingSpec(key.easing)) bad(at + ".easing", "unknown easing");
  });
}

/** Problems with a sheet spec, with paths (empty when valid). */
export function inspectPaperSheet(spec: PaperSheetSpec, prefix = ""): PaperSheetIssue[] {
  const issues: PaperSheetIssue[] = [];
  const bad = (path: string, message: string) => issues.push({ path: prefix + path, message });
  if (!spec || typeof spec !== "object") {
    bad("sheet", "sheet object required");
    return issues;
  }
  if (typeof spec.outline === "string") {
    const parsed = parseSvgPath(spec.outline);
    if (parsed.error || parsed.segments.length === 0) bad("outline", parsed.error ?? "outline path is empty");
  } else if (!Array.isArray(spec.outline) || spec.outline.length === 0 || spec.outline.some((r) => !Array.isArray(r) || r.length < 3 || r.length > PAPER_SHEET_LIMITS.outlinePoints || !r.every(isPoint))) {
    bad("outline", "outline must be path data or rings of at least three finite points");
  }
  if (spec.fillRule !== undefined && spec.fillRule !== "nonzero" && spec.fillRule !== "evenodd") bad("fillRule", 'fillRule must be "nonzero" or "evenodd"');
  if (spec.stock !== undefined) {
    if (typeof spec.stock === "string" && !(spec.stock in { copy: 1, newsprint: 1, tissue: 1, tracing: 1, kami: 1, washi: 1, kraft: 1, construction: 1, cardstock: 1, glossy: 1, chipboard: 1 })) bad("stock", `unknown stock "${spec.stock}"`);
    else for (const message of inspectStock(resolveStock(spec.stock))) bad("stock", message);
  }
  if (spec.grain !== undefined && !finite(spec.grain)) bad("grain", "grain must be finite degrees");
  if (spec.pxPerMm !== undefined && (!finite(spec.pxPerMm) || spec.pxPerMm < 0.05 || spec.pxPerMm > 200)) bad("pxPerMm", "pxPerMm must be 0.05–200");
  if (spec.thickness !== undefined && (!finite(spec.thickness) || spec.thickness < 0 || spec.thickness > 40)) bad("thickness", "thickness must be 0–40");
  if (spec.gravity !== undefined && !(Array.isArray(spec.gravity) && spec.gravity.length === 3 && spec.gravity.every(finite))) bad("gravity", "gravity must be three finite numbers");
  if (spec.support !== undefined && spec.support !== null && (!finite(spec.support) || spec.support < 0)) bad("support", "support must be a nonnegative height or null");
  if (spec.seed !== undefined && !Number.isInteger(spec.seed)) bad("seed", "seed must be an integer");
  const tears = spec.tears ?? [];
  const bends = spec.bends ?? [];
  if (!Array.isArray(tears) || tears.length > PAPER_SHEET_LIMITS.tears) bad("tears", `up to ${PAPER_SHEET_LIMITS.tears} tears`);
  if (!Array.isArray(bends) || bends.length > PAPER_SHEET_LIMITS.bends) bad("bends", `up to ${PAPER_SHEET_LIMITS.bends} bends`);
  const ids = new Set<string>();
  const tearIds = new Set<string>();
  const id = (value: unknown, path: string) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) bad(path, "id must be 1–64 letters, digits, - or _");
    else if (ids.has(value)) bad(path, `duplicate id "${value}"`);
    else ids.add(value);
  };
  (Array.isArray(tears) ? tears : []).forEach((tear, i) => {
    const at = `tears[${i}]`;
    if (!tear || typeof tear !== "object") return bad(at, "tear object required");
    id(tear.id, at + ".id");
    if (typeof tear.id === "string") tearIds.add(tear.id);
    if (!isPoint(tear.from)) bad(at + ".from", "finite point required");
    if (!isPoint(tear.to)) bad(at + ".to", "finite point required");
    if (isPoint(tear.from) && isPoint(tear.to) && Math.hypot(tear.to[0] - tear.from[0], tear.to[1] - tear.from[1]) < 1) bad(at + ".to", "a tear needs a direction");
    if (tear.progress !== undefined && (!finite(tear.progress) || tear.progress < 0 || tear.progress > 1)) bad(at + ".progress", "progress must be 0–1");
    if (tear.wander !== undefined && (!finite(tear.wander) || tear.wander < 0 || tear.wander > 400)) bad(at + ".wander", "wander must be 0–400 px");
    if (tear.seed !== undefined && !Number.isInteger(tear.seed)) bad(at + ".seed", "seed must be an integer");
    if (tear.core !== undefined && !isPoint(tear.core)) bad(at + ".core", "core must be a finite point");
    inspectKeys(tear.keys, at + ".keys", ["progress"], bad);
    for (const [k, key] of (Array.isArray(tear.keys) ? tear.keys : []).entries()) if (key && finite(key.progress) && (key.progress < 0 || key.progress > 1)) bad(`${at}.keys[${k}].progress`, "progress must be 0–1");
  });
  const bendIds = new Map<string, PaperBend>();
  (Array.isArray(bends) ? bends : []).forEach((bend, i) => {
    const at = `bends[${i}]`;
    if (!bend || typeof bend !== "object") return bad(at, "bend object required");
    id(bend.id, at + ".id");
    if (typeof bend.id === "string") bendIds.set(bend.id, bend);
    if (!["fold", "bend", "peel", "roll"].includes(bend.kind)) bad(at + ".kind", 'kind must be "fold", "bend", "peel" or "roll"');
    if (bend.follow === undefined) {
      if (!Array.isArray(bend.line) || bend.line.length !== 2 || !bend.line.every(isPoint)) bad(at + ".line", "two finite points required (or follow a tear)");
      else if (Math.hypot(bend.line[1][0] - bend.line[0][0], bend.line[1][1] - bend.line[0][1]) < 1e-3) bad(at + ".line", "the two points must differ");
      if (!isPoint(bend.flap)) bad(at + ".flap", "a point on the moving side is required");
      else if (Array.isArray(bend.line) && bend.line.every(isPoint)) {
        const [[ax, ay], [bx, by]] = bend.line;
        if (Math.abs((bx - ax) * (bend.flap[1] - ay) - (by - ay) * (bend.flap[0] - ax)) < 1e-6) bad(at + ".flap", "the flap point must not lie on the line");
      }
    } else if (!tearIds.has(bend.follow)) bad(at + ".follow", `no tear "${bend.follow}"`);
    const maxAngle = bend.kind === "roll" ? 1440 : 180;
    if (!finite(bend.angle) || Math.abs(bend.angle) > maxAngle) bad(at + ".angle", `angle must be within ±${maxAngle}°`);
    if (bend.radius !== undefined && (!finite(bend.radius) || bend.radius <= 0 || bend.radius > 1e4)) bad(at + ".radius", "radius must be positive px");
    if (bend.length !== undefined && (!finite(bend.length) || bend.length <= 0 || bend.length > 1e5)) bad(at + ".length", "length must be positive px");
    if (bend.offset !== undefined && !finite(bend.offset)) bad(at + ".offset", "offset must be finite px");
    if (bend.adhesion !== undefined && (!finite(bend.adhesion) || bend.adhesion <= 0 || bend.adhesion > 5000)) bad(at + ".adhesion", "adhesion must be 0–5000 J/m²");
    if (bend.gravity !== undefined && (!finite(bend.gravity) || bend.gravity < 0 || bend.gravity > 10)) bad(at + ".gravity", "gravity must be 0–10");
    if (bend.piece !== undefined) {
      if (!bend.piece || typeof bend.piece !== "object" || !tearIds.has(bend.piece.tear)) bad(at + ".piece.tear", "piece must name a tear");
      if (!bend.piece || !isPoint(bend.piece.at)) bad(at + ".piece.at", "piece needs a point on the side that moves");
    }
    inspectKeys(bend.keys, at + ".keys", ["angle", "radius", "length", "offset"], bad);
    for (const [k, key] of (Array.isArray(bend.keys) ? bend.keys : []).entries()) {
      if (!key) continue;
      if (finite(key.angle) && Math.abs(key.angle) > maxAngle) bad(`${at}.keys[${k}].angle`, `angle must be within ±${maxAngle}°`);
      if (key.radius !== undefined && finite(key.radius) && key.radius <= 0) bad(`${at}.keys[${k}].radius`, "radius must be positive");
      if (key.length !== undefined && finite(key.length) && key.length <= 0) bad(`${at}.keys[${k}].length`, "length must be positive");
    }
  });
  (Array.isArray(bends) ? bends : []).forEach((bend, i) => {
    if (!bend || bend.parent === undefined) return;
    if (!bendIds.has(bend.parent)) return bad(`bends[${i}].parent`, `no bend "${bend.parent}"`);
    const seen = new Set<string>([bend.id]);
    let cursor: string | undefined = bend.parent;
    while (cursor !== undefined) {
      if (seen.has(cursor)) return bad(`bends[${i}].parent`, "bends cannot be carried in a cycle");
      seen.add(cursor);
      cursor = bendIds.get(cursor)?.parent;
    }
  });
  return issues;
}

/* ------------------------------------------------------------------ *
 * Tears
 * ------------------------------------------------------------------ */

interface TearState {
  index: number;
  tear: PaperTear;
  /** Full path, extended outside the start, x/y interleaved. */
  path: Float64Array;
  /** Distance along the tear direction of each path point (strictly increasing). */
  along: Float64Array;
  ux: number;
  uy: number;
  enter: number;
  exit: number;
  exits: boolean;
  tip: number;
  tipX: number;
  tipY: number;
  complete: boolean;
  coreSide: "left" | "right";
}

function tearPath(tear: PaperTear, stock: PaperStock, pxPerMm: number, seed: number): { path: Float64Array; along: Float64Array; ux: number; uy: number } {
  const dx = tear.to[0] - tear.from[0];
  const dy = tear.to[1] - tear.from[1];
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  // Left normal on a y-down screen.
  const lx = uy;
  const ly = -ux;
  const wander = tear.wander ?? 3 * pxPerMm;
  const bite = Math.max(0.3, stock.fibre * 0.18 * pxPerMm);
  const s = (tear.seed ?? 0) * 7919 + seed * 31 + 17;
  const lead = 12;
  const step = 1.5;
  const count = Math.ceil((length + lead) / step) + 1;
  const path = new Float64Array(count * 2);
  const along = new Float64Array(count);
  for (let k = 0; k < count; k += 1) {
    const a = Math.min(length, -lead + k * step);
    const low = fbm(s, a / (28 * pxPerMm), 3) * wander;
    const mid = fbm(s + 53, a / (Math.max(stock.fibre, 0.5) * 3 * pxPerMm), 3) * bite;
    const offset = a <= 0 ? low * 0.2 : low + mid;
    path[2 * k] = tear.from[0] + ux * a + lx * offset;
    path[2 * k + 1] = tear.from[1] + uy * a + ly * offset;
    along[k] = a;
  }
  return { path, along, ux, uy };
}

function pointOnPath(state: { path: Float64Array; along: Float64Array }, a: number): [number, number, number] {
  const { path, along } = state;
  const n = along.length;
  if (a <= along[0]) return [path[0], path[1], 0];
  if (a >= along[n - 1]) return [path[2 * n - 2], path[2 * n - 1], n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (along[mid] <= a) lo = mid;
    else hi = mid;
  }
  const t = (a - along[lo]) / Math.max(along[hi] - along[lo], 1e-12);
  return [path[2 * lo] + (path[2 * hi] - path[2 * lo]) * t, path[2 * lo + 1] + (path[2 * hi + 1] - path[2 * lo + 1]) * t, lo + t];
}

function resolveTear(tear: PaperTear, index: number, shapes: readonly Shape[], stock: PaperStock, pxPerMm: number, seed: number, frame: number, lifted: "left" | "right" | undefined): TearState {
  const geometry = tearPath(tear, stock, pxPerMm, seed);
  const hits: number[] = [];
  for (const shape of shapes) for (const hit of crossings(shape.outer.pts, geometry.path)) hits.push(hit.along);
  hits.sort((a, b) => a - b);
  const alongAt = (pos: number) => {
    const k = Math.floor(pos);
    const t = pos - k;
    const a = geometry.along;
    return k + 1 < a.length ? a[k] + (a[k + 1] - a[k]) * t : a[a.length - 1];
  };
  const enter = hits.length ? alongAt(hits[0]) : 0;
  const exits = hits.length >= 2;
  const exit = exits ? alongAt(hits[1]) : geometry.along[geometry.along.length - 1];
  const progress = Math.min(1, Math.max(0, keyed(tear.keys, frame, (k) => k.progress, tear.progress ?? 0)));
  const tip = enter + (exit - enter) * progress;
  const [tipX, tipY] = pointOnPath(geometry, tip);
  const coreSide = tear.core ? sideOfPath(geometry.path, tear.core[0], tear.core[1]) : lifted === "left" ? "right" : "left";
  return { index, tear, ...geometry, enter, exit, exits, tip, tipX, tipY, complete: exits && progress >= 1 - 1e-6, coreSide };
}

/** The tear path up to its tip, then straight on a little so it crosses the line through the tip. */
function tearPrefix(state: TearState): Float64Array {
  const xs: number[] = [];
  const n = state.along.length;
  for (let k = 0; k < n && state.along[k] < state.tip; k += 1) xs.push(state.path[2 * k], state.path[2 * k + 1]);
  xs.push(state.tipX, state.tipY, state.tipX + state.ux * 2, state.tipY + state.uy * 2);
  return Float64Array.from(xs);
}

function tearFringes(state: TearState, stock: PaperStock, pxPerMm: number, seed: number): PaperFringe[] {
  const fromA = Math.max(state.enter, state.along[0]);
  const toA = state.complete ? state.exit : state.tip;
  if (toA - fromA < 0.5) return [];
  const pts: number[] = [];
  const step = 1;
  for (let a = fromA; a <= toA; a += step) {
    const [x, y] = pointOnPath(state, a);
    pts.push(x, y);
  }
  const [ex, ey] = pointOnPath(state, toA);
  pts.push(ex, ey);
  const m = pts.length >> 1;
  const width = Math.max(0.35, stock.fringe * pxPerMm);
  const fibre = stock.fibre * pxPerMm;
  const coreSide = state.coreSide;
  const s0 = (state.tear.seed ?? 0) * 104729 + seed * 13 + 5;
  const make = (side: "left" | "right", face: "front" | "back", hairDensity: number, bevel: boolean): PaperFringe => {
    const sign = side === "left" ? 1 : -1;
    const salt = side === "left" ? 3 : 9;
    const outer: number[] = [];
    const core: number[] = [];
    const feather: number[] = [];
    const hairs: Float64Array[] = [];
    for (let k = 0; k < m; k += 1) {
      const a = Math.max(0, k - 1);
      const b = Math.min(m - 1, k + 1);
      const tx = pts[2 * b] - pts[2 * a];
      const ty = pts[2 * b + 1] - pts[2 * a + 1];
      const tl = Math.hypot(tx, ty) || 1;
      // Normal pointing into this side's piece.
      const nx = (sign * ty) / tl;
      const ny = (-sign * tx) / tl;
      // The top layer tears back unevenly: a solid core band, then a ragged feather of fibres at fibre scale.
      const slow = 0.5 + 0.5 * fbm(s0 + salt, k / Math.max(fibre * 1.6, 3), 3);
      const fast = 0.5 + 0.5 * fbm(s0 + salt + 50, k / Math.max(fibre * 0.22, 0.8), 2);
      const spike = hash01(s0 + salt + 70, k) > 0.86 ? hash01(s0 + salt + 71, k) * 0.5 : 0;
      const wCore = bevel ? width * (0.3 + 0.35 * slow) : 0;
      const wFeather = bevel ? width * (0.65 + 0.55 * slow + 0.35 * fast + spike) : 0;
      outer.push(pts[2 * k] - nx * 0.6, pts[2 * k + 1] - ny * 0.6);
      core.push(pts[2 * k] + nx * wCore, pts[2 * k + 1] + ny * wCore);
      feather.push(pts[2 * k] + nx * wFeather, pts[2 * k + 1] + ny * wFeather);
      // Loose fibres: most stick out of the edge, some lie on the bevel at any angle.
      const count = hairDensity >= 1 ? Math.floor(hairDensity) + (hash01(s0 + salt + 11, k) < hairDensity % 1 ? 1 : 0) : hash01(s0 + salt + 11, k) < hairDensity ? 1 : 0;
      for (let h = 0; h < count; h += 1) {
        const id = k * 7 + h;
        const r = hash01(s0 + 31, id);
        const len = fibre * (0.1 + 0.8 * r * r * r);
        const lying = hash01(s0 + 47, id) < 0.3;
        const turn = (hash01(s0 + 37, id) - 0.5) * (lying ? 3.4 : 1.7);
        const bendBy = (hash01(s0 + 41, id) - 0.5) * 1.1;
        const startIn = hash01(s0 + 43, id) * Math.max(wFeather, 0.5) * (lying ? 1 : 0.7);
        const c = Math.cos(turn);
        const sn = Math.sin(turn);
        const ox = -(nx * c - ny * sn);
        const oy = -(nx * sn + ny * c);
        const hx = pts[2 * k] + nx * startIn;
        const hy = pts[2 * k + 1] + ny * startIn;
        const mx = hx + ox * len * 0.5 - oy * len * bendBy * 0.25;
        const my = hy + oy * len * 0.5 + ox * len * bendBy * 0.25;
        const fx = hx + ox * len - oy * len * bendBy * 0.6;
        const fy = hy + oy * len + ox * len * bendBy * 0.6;
        hairs.push(Float64Array.from([hx, hy, mx, my, fx, fy]));
      }
    }
    const band = (inner: number[]) => {
      const ring: number[] = [...outer];
      for (let k = m - 1; k >= 0; k -= 1) ring.push(inner[2 * k], inner[2 * k + 1]);
      return Float64Array.from(ring);
    };
    return { tear: state.tear.id, side, face, bevel: bevel ? band(core) : new Float64Array(0), feather: bevel ? band(feather) : new Float64Array(0), hairs };
  };
  const other = coreSide === "left" ? "right" : "left";
  // Loose fibres per px of tear: long-fibred washi sheds many, short-fibred stock few.
  const density = Math.min(3, (0.08 + stock.fibre * 0.09) / Math.max(pxPerMm, 0.1) * 4);
  return [
    make(coreSide, "front", density, true),
    make(coreSide, "back", density, true),
    make(other, "back", density * 0.4, true),
    make(other, "front", density * 0.25, false),
  ];
}

/* ------------------------------------------------------------------ *
 * Regions and bends
 * ------------------------------------------------------------------ */

interface Region {
  shape: Shape;
  pieces: Record<string, PaperPieceSide>;
  frame: Float64Array;
  owner: number;
  ownerId: string | null;
  final: boolean;
  band: number;
  envelope: TaggedRing;
  shadeFrom: PaperPoint;
  shadeTo: PaperPoint;
  normalFrom: PaperVec3;
  normalTo: PaperVec3;
}

function rectRing(minX: number, minY: number, maxX: number, maxY: number): TaggedRing {
  return { pts: Float64Array.from([minX, minY, maxX, minY, maxX, maxY, minX, maxY]), tags: new Int32Array(4).fill(INSIDE) };
}

/** Width of a set of polygons along the line (p − O)·n̂ = s, even-odd. */
function widthAlong(shapes: readonly Shape[], ox: number, oy: number, nx: number, ny: number, s: number): number {
  const dx = -ny;
  const dy = nx;
  let total = 0;
  for (const shape of shapes) {
    const at: number[] = [];
    for (const ring of [shape.outer, ...shape.holes]) {
      const p = ring.pts;
      const n = p.length >> 1;
      for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
        const si = (p[2 * i] - ox) * nx + (p[2 * i + 1] - oy) * ny - s;
        const sj = (p[2 * j] - ox) * nx + (p[2 * j + 1] - oy) * ny - s;
        if ((si > 0) !== (sj > 0)) {
          const t = si / (si - sj);
          const x = p[2 * i] + (p[2 * j] - p[2 * i]) * t;
          const y = p[2 * i + 1] + (p[2 * j + 1] - p[2 * i + 1]) * t;
          at.push((x - ox) * dx + (y - oy) * dy);
        }
      }
    }
    at.sort((a, b) => a - b);
    for (let k = 0; k + 1 < at.length; k += 2) total += at[k + 1] - at[k];
  }
  return total;
}

interface ResolvedBend {
  index: number;
  bend: PaperBend;
  ox: number;
  oy: number;
  nx: number;
  ny: number;
  angle: number;
  radius?: number;
  length?: number;
  hasChildren: boolean;
}

function resolveBendLine(bend: PaperBend, index: number, frame: number, tears: ReadonlyMap<string, TearState>, hasChildren: boolean): ResolvedBend | null {
  let ox: number;
  let oy: number;
  let nx: number;
  let ny: number;
  if (bend.follow !== undefined) {
    const tear = tears.get(bend.follow);
    if (!tear) return null;
    ox = tear.tipX;
    oy = tear.tipY;
    // The side behind the tip (toward where the tear started) moves.
    nx = -tear.ux;
    ny = -tear.uy;
  } else {
    if (!bend.line || !bend.flap) return null;
    const [[ax, ay], [bx, by]] = bend.line;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const dx = (bx - ax) / len;
    const dy = (by - ay) / len;
    // The normal of the line that points to the flap.
    const sign = (bend.flap[0] - ax) * dy - (bend.flap[1] - ay) * dx > 0 ? 1 : -1;
    nx = sign * dy;
    ny = -sign * dx;
    ox = ax;
    oy = ay;
  }
  const offset = keyed(bend.keys, frame, (k) => k.offset, bend.offset ?? 0);
  ox -= nx * offset;
  oy -= ny * offset;
  const angle = keyed(bend.keys, frame, (k) => k.angle, bend.angle) * DEG;
  const radius = bend.radius === undefined && !bend.keys?.some((k) => k.radius !== undefined) ? undefined : keyed(bend.keys, frame, (k) => k.radius, bend.radius ?? 1);
  const length = bend.length === undefined && !bend.keys?.some((k) => k.length !== undefined) ? undefined : keyed(bend.keys, frame, (k) => k.length, bend.length ?? 1);
  return { index, bend, ox, oy, nx, ny, angle, radius, length, hasChildren };
}

interface SheetContext {
  stock: PaperStock;
  pxPerMm: number;
  thickness: number;
  grain: number;
  gravity: [number, number, number];
  support: number | null;
}

function restSpans(b: ResolvedBend, ctx: SheetContext, flapLength: number): CurvatureSpan[] {
  const turn = b.angle;
  const sign = Math.sign(turn) || 1;
  const angleToGrain = Math.atan2(b.ny, b.nx) / DEG - ctx.grain;
  switch (b.bend.kind) {
    case "fold": {
      const r = Math.max(b.radius ?? (ctx.stock.creaseRadius / 1000) * ctx.pxPerMm, ctx.thickness * 1.2, 0.35);
      return turn === 0 ? [] : [{ start: 0, end: r * Math.abs(turn), curvature: sign / r }];
    }
    case "bend": {
      const len = Math.max(1, b.length ?? flapLength / 2);
      return turn === 0 ? [] : [{ start: 0, end: len, curvature: turn / len }];
    }
    case "peel": {
      const metres = paperPeelRadius(ctx.stock, b.bend.adhesion ?? 25, angleToGrain);
      const r = Math.max(b.radius ?? metres * 1000 * ctx.pxPerMm, ctx.thickness, 0.35);
      return turn === 0 ? [] : [{ start: 0, end: r * Math.abs(turn), curvature: sign / r }];
    }
    case "roll": {
      // An Archimedean spiral: each turn sits one thickness inside the last.
      const outer = Math.max(b.radius ?? 12 * ctx.pxPerMm, 0.5);
      const pitch = Math.max(ctx.thickness, 0.05);
      const maxTurn = Math.abs(turn);
      const spans: CurvatureSpan[] = [];
      const step = 4 * DEG;
      let s = 0;
      for (let phi = 0; phi < maxTurn - 1e-9 && s < flapLength; phi += step) {
        const d = Math.min(step, maxTurn - phi);
        const r = Math.max(outer - (pitch * phi) / (2 * Math.PI), pitch, 0.35);
        spans.push({ start: s, end: s + r * d, curvature: sign / r });
        s += r * d;
      }
      return spans;
    }
  }
}

function solveBend(b: ResolvedBend, flaps: readonly Region[], ctx: SheetContext): PaperProfile | null {
  let flapLength = 0;
  for (const region of flaps) {
    for (const ring of [region.shape.outer]) {
      const p = ring.pts;
      for (let i = 0; i < p.length; i += 2) flapLength = Math.max(flapLength, (p[i] - b.ox) * b.nx + (p[i + 1] - b.oy) * b.ny);
    }
  }
  if (flapLength <= 1e-6) return null;
  const rest = restSpans(b, ctx, flapLength);
  const restEnd = rest.reduce((m, span) => Math.max(m, span.end), 0);
  const gravityScale = b.hasChildren ? 0 : b.bend.gravity ?? 1;
  const loaded = gravityScale > 0 && Math.hypot(...ctx.gravity) > 0;
  // A bend that carries others ends in a rigid flap; a loaded flap is solved to its free edge.
  const length = loaded ? flapLength : Math.min(flapLength, Math.max(restEnd, 1e-3));
  const parentFrame = flaps[0].frame;
  const [gxw, gyw, gzw] = ctx.gravity;
  const glen = Math.hypot(gxw, gyw, gzw) || 1;
  const axisX = rotateVector(parentFrame, b.nx, b.ny, 0);
  const axisZ = rotateVector(parentFrame, 0, 0, 1);
  const angleToGrain = Math.atan2(b.ny, b.nx) / DEG - ctx.grain;
  const ellPx = paperGravityLength(ctx.stock, angleToGrain) * 1000 * ctx.pxPerMm;
  const shapes = flaps.map((r) => r.shape);
  const topLevel = b.bend.parent === undefined;
  return solveProfile({
    length,
    rest,
    load: loaded
      ? {
          x: (axisX[0] * gxw + axisX[1] * gyw + axisX[2] * gzw) / glen,
          z: (axisZ[0] * gxw + axisZ[1] * gyw + axisZ[2] * gzw) / glen,
          strength: gravityScale / (ellPx * ellPx * ellPx),
          width: (s) => widthAlong(shapes, b.ox, b.oy, b.nx, b.ny, s),
        }
      : undefined,
    floor: topLevel ? { root: Math.max(ctx.thickness, 0.2), beyond: ctx.support === null ? -Infinity : -ctx.support } : undefined,
    maxStep: Math.max(1, length / 40),
  });
}

function applyBend(regions: Region[], b: ResolvedBend, ctx: SheetContext, warnings: string[], tears: ReadonlyMap<string, TearState>): Region[] {
  const pieceTear = b.bend.piece ? tears.get(b.bend.piece.tear) : undefined;
  const pieceMatch = b.bend.piece && pieceTear ? [b.bend.piece.tear, sideOfPath(pieceTear.path, b.bend.piece.at[0], b.bend.piece.at[1])] : null;
  const parentIndex = b.bend.parent;
  const kept: Region[] = [];
  const flaps: Region[] = [];
  const moved: Region[] = [];
  const c0 = b.nx * b.ox + b.ny * b.oy;
  for (const region of regions) {
    const ownerOk = parentIndex === undefined ? region.owner === -1 : region.owner >= 0 && region.final && region.ownerId === parentIndex;
    const pieceOk = !pieceMatch || region.pieces[pieceMatch[0]] === pieceMatch[1];
    if (!ownerOk || !pieceOk) {
      kept.push(region);
      continue;
    }
    const flap = clipShape(region.shape, b.nx, b.ny, c0);
    const rest = clipShape(region.shape, -b.nx, -b.ny, -c0);
    if (rest) kept.push({ ...region, shape: rest, envelope: clipRing(region.envelope, -b.nx, -b.ny, -c0) ?? region.envelope });
    if (flap) flaps.push({ ...region, shape: flap, envelope: clipRing(region.envelope, b.nx, b.ny, c0) ?? region.envelope });
  }
  if (flaps.length === 0) {
    warnings.push(`bend "${b.bend.id}" has no paper on its moving side`);
    return kept;
  }
  // Flaps of one bend share one profile; nested bends sit on one parent band, so frames agree.
  const profile = solveBend(b, flaps, ctx);
  if (!profile) return [...kept, ...flaps];
  const marks = profileBands(profile);
  const last = profile.count - 1;
  const bands: { a: number; b: number | null }[] = [];
  for (let k = 0; k + 1 < marks.length; k += 1) bands.push({ a: marks[k], b: marks[k + 1] });
  bands.push({ a: last, b: null });
  for (const region of flaps) {
    bands.forEach((band, bandIndex) => {
      const sa = profile.s[band.a];
      let shape: Shape | null = clipShape(region.shape, b.nx, b.ny, c0 + sa);
      let envelope: TaggedRing | null = clipRing(region.envelope, b.nx, b.ny, c0 + sa);
      let cx: number;
      let cz: number;
      let sb: number;
      if (band.b !== null) {
        sb = profile.s[band.b];
        if (shape) shape = clipShape(shape, -b.nx, -b.ny, -(c0 + sb));
        if (envelope) envelope = clipRing(envelope, -b.nx, -b.ny, -(c0 + sb));
        const ds = Math.max(sb - sa, 1e-12);
        cx = (profile.x[band.b] - profile.x[band.a]) / ds;
        cz = (profile.z[band.b] - profile.z[band.a]) / ds;
      } else {
        sb = sa + 1;
        cx = Math.cos(profile.phi[last]);
        cz = Math.sin(profile.phi[last]);
      }
      if (!shape) return;
      const local = bandFrame(b.ox, b.oy, b.nx, b.ny, sa, profile.x[band.a], profile.z[band.a], cx, cz);
      const frame = compose(region.frame, local);
      const phiA = profile.phi[band.a];
      const phiB = band.b === null ? phiA : profile.phi[band.b];
      const normal = (phi: number): PaperVec3 => rotateVector(region.frame, -Math.sin(phi) * b.nx, -Math.sin(phi) * b.ny, Math.cos(phi));
      moved.push({
        shape,
        pieces: region.pieces,
        frame,
        owner: b.index,
        ownerId: b.bend.id,
        final: band.b === null,
        band: bandIndex,
        envelope: envelope ?? region.envelope,
        shadeFrom: [b.ox + b.nx * sa, b.oy + b.ny * sa],
        shadeTo: [b.ox + b.nx * sb, b.oy + b.ny * sb],
        normalFrom: normal(phiA),
        normalTo: normal(phiB),
      });
    });
  }
  return [...kept, ...moved];
}

/** A following bend lifts the right side looking along its tear unless it names a piece. */
function withFollowPiece(bend: PaperBend, tears: ReadonlyMap<string, TearState>): PaperBend {
  if (bend.follow === undefined || bend.piece !== undefined) return bend;
  const tear = tears.get(bend.follow);
  if (!tear) return bend;
  // A point just right of the tear's start, looking along it (right of (dx, dy) on a y-down screen is (−dy, dx)).
  const k = Math.min(tear.along.length - 1, Math.max(1, tear.along.findIndex((a) => a >= tear.enter)));
  const x = tear.path[2 * k] - tear.uy * 2;
  const y = tear.path[2 * k + 1] + tear.ux * 2;
  return { ...bend, piece: { tear: bend.follow, at: [x, y] } };
}

/** Parents before children, siblings in spec order. */
function bendOrder(bends: readonly PaperBend[]): number[] {
  const index = new Map(bends.map((b, i) => [b.id, i]));
  const order: number[] = [];
  const placed = new Set<number>();
  const place = (i: number) => {
    if (placed.has(i)) return;
    const parent = bends[i].parent;
    if (parent !== undefined && index.has(parent)) place(index.get(parent)!);
    placed.add(i);
    order.push(i);
  };
  bends.forEach((_, i) => place(i));
  return order;
}

function shapeBounds(shapes: readonly Shape[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    const p = shape.outer.pts;
    for (let i = 0; i < p.length; i += 2) {
      minX = Math.min(minX, p[i]);
      maxX = Math.max(maxX, p[i]);
      minY = Math.min(minY, p[i + 1]);
      maxY = Math.max(maxY, p[i + 1]);
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

/**
 * The sheet on one frame: tears separate the pieces behind their tips, then bends lift flaps into bands. Pure and
 * deterministic, so any frame can be evaluated on its own (seeking, rendering out of order).
 */
export function evaluatePaperSheet(spec: PaperSheetSpec, frame: number): PaperSheetFrame {
  const issues = inspectPaperSheet(spec);
  if (issues.length) throw new Error("Invalid paper sheet: " + issues.map((i) => `${i.path}: ${i.message}`).join("; "));
  if (!Number.isFinite(frame) || frame < 0) throw new RangeError("Paper sheet frame must be a nonnegative number");
  const stock = resolveStock(spec.stock);
  const pxPerMm = spec.pxPerMm ?? 4;
  const thickness = (stock.caliper / 1000) * pxPerMm * (spec.thickness ?? 1);
  const gravity = spec.gravity ? ([spec.gravity[0], spec.gravity[1], spec.gravity[2]] as [number, number, number]) : ([0, 0, -1] as [number, number, number]);
  const support = spec.support === undefined ? 0 : spec.support;
  const ctx: SheetContext = { stock, pxPerMm, thickness, grain: spec.grain ?? 90, gravity, support };
  const seed = spec.seed ?? 0;
  const warnings: string[] = [];
  const outline = loadOutline(spec);
  const bounds = shapeBounds(outline.shapes);
  const pad = stock.fibre * pxPerMm + 8;
  const envelope = rectRing(bounds.minX - pad, bounds.minY - pad, bounds.maxX + pad, bounds.maxY + pad);
  let regions: Region[] = outline.shapes.map((shape) => ({
    shape,
    pieces: {},
    frame: IDENTITY_FRAME,
    owner: -1,
    ownerId: null,
    final: false,
    band: 0,
    envelope,
    shadeFrom: [0, 0],
    shadeTo: [0, 1],
    normalFrom: [0, 0, 1],
    normalTo: [0, 0, 1],
  }));
  const tearStates = new Map<string, TearState>();
  const fringes: PaperFringe[] = [];
  (spec.tears ?? []).forEach((tear, index) => {
    const follower = (spec.bends ?? []).find((b) => b.follow === tear.id);
    const geometry = follower?.piece ? tearPath(tear, stock, pxPerMm, seed) : undefined;
    const lifted = follower ? (geometry && follower.piece ? sideOfPath(geometry.path, follower.piece.at[0], follower.piece.at[1]) : "right") : undefined;
    const state = resolveTear(tear, index, outline.shapes, stock, pxPerMm, seed, frame, lifted);
    tearStates.set(tear.id, state);
    const tag = (region: Region, side: PaperPieceSide): Region => ({ ...region, pieces: { ...region.pieces, [tear.id]: side } });
    if (state.tip <= state.enter + 0.25) {
      regions = regions.map((r) => tag(r, "ahead"));
      return;
    }
    const next: Region[] = [];
    if (state.complete) {
      for (const region of regions) {
        const split = splitShape(region.shape, state.path, index);
        if (split) next.push(tag({ ...region, shape: split.left }, "left"), tag({ ...region, shape: split.right }, "right"));
        else next.push(tag(region, sideOfPath(state.path, region.shape.outer.pts[0], region.shape.outer.pts[1])));
      }
    } else {
      // Ahead of the tip the paper is whole; behind it the tear has run right across.
      const c = state.ux * state.tipX + state.uy * state.tipY;
      const prefix = tearPrefix(state);
      for (const region of regions) {
        const ahead = clipShape(region.shape, state.ux, state.uy, c);
        const behind = clipShape(region.shape, -state.ux, -state.uy, -c);
        if (ahead) next.push(tag({ ...region, shape: ahead }, "ahead"));
        if (!behind) continue;
        const split = splitShape(behind, prefix, index);
        if (split) next.push(tag({ ...region, shape: split.left }, "left"), tag({ ...region, shape: split.right }, "right"));
        else {
          if (crossings(behind.outer.pts, prefix).length > 0) warnings.push(`tear "${tear.id}" could not separate part of the sheet`);
          next.push(tag({ ...region, shape: behind }, sideOfPath(prefix, behind.outer.pts[0], behind.outer.pts[1])));
        }
      }
    }
    regions = next;
    fringes.push(...tearFringes(state, stock, pxPerMm, seed));
  });
  const bends = spec.bends ?? [];
  const parents = new Set(bends.map((b) => b.parent).filter((p): p is string => p !== undefined));
  for (const i of bendOrder(bends)) {
    const bend = bends[i];
    const resolved = resolveBendLine(withFollowPiece(bend, tearStates), i, frame, tearStates, parents.has(bend.id));
    if (!resolved) {
      warnings.push(`bend "${bend.id}" has no line`);
      continue;
    }
    regions = applyBend(regions, resolved, ctx, warnings, tearStates);
  }
  const facets: PaperFacet[] = regions.map((region) => {
    const rings = [region.shape.outer, ...region.shape.holes];
    return {
      rings: rings.map((r) => r.pts),
      tags: rings.map((r) => r.tags),
      frame: region.frame,
      shadeFrom: region.shadeFrom,
      shadeTo: region.shadeTo,
      normalFrom: region.normalFrom,
      normalTo: region.normalTo,
      pieces: region.pieces,
      rest: region.owner === -1,
      bend: region.ownerId,
      band: region.band,
      envelope: region.envelope.pts,
    };
  });
  return {
    frame,
    facets,
    fringes,
    stock,
    transmittance: paperTransmittance(stock),
    thickness,
    pxPerMm,
    outlinePath: outline.path,
    bounds,
    support,
    warnings,
  };
}

/** A bend's keyed values on a frame (degrees for the angle, px for the rest). */
export function paperBendAt(bend: PaperBend, frame: number): { angle: number; offset: number; radius: number | undefined; length: number | undefined } {
  return {
    angle: keyed(bend.keys, frame, (k) => k.angle, bend.angle),
    offset: keyed(bend.keys, frame, (k) => k.offset, bend.offset ?? 0),
    radius: bend.radius === undefined && !bend.keys?.some((k) => k.radius !== undefined) ? undefined : keyed(bend.keys, frame, (k) => k.radius, bend.radius ?? 1),
    length: bend.length === undefined && !bend.keys?.some((k) => k.length !== undefined) ? undefined : keyed(bend.keys, frame, (k) => k.length, bend.length ?? 1),
  };
}

/** A tear's keyed progress on a frame, 0–1. */
export function paperTearAt(tear: PaperTear, frame: number): number {
  return Math.min(1, Math.max(0, keyed(tear.keys, frame, (k) => k.progress, tear.progress ?? 0)));
}
