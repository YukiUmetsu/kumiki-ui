/**
 * `shape-morph` — contour correspondence, topology validation and an explicit,
 * documented fallback when two shapes are incompatible (docs/08 §3
 * `shape-morph`: "Validate compatible topology, winding, holes; explicit
 * fallback").
 *
 * The module never mutates its inputs. Incompatible pairs are never morphed:
 * `morphShapes` returns the source or target contours verbatim (as copies) and
 * reports a warning diagnostic, leaving any cross-fade to the caller (docs/08
 * "honest states" — a bad morph is a visible artifact, a documented dissolve is
 * an intentional one).
 *
 * ## Winding convention
 * Screen space has a top-left origin with **y pointing down**, so the shoelace
 * sum is sign-flipped relative to a y-up maths frame: a positive
 * {@link contourArea} corresponds to a **clockwise** visual winding ("cw"), a
 * negative one to counter-clockwise ("ccw").
 */

import { createDiagnostic } from "./diagnostics";
import { lerpNumber } from "./matrix";
import type { Diagnostic, Vec2 } from "./types";

/** A single contour: an ordered ring of points, optionally with holes. */
export interface PathContour {
  points: Vec2[];
  closed: boolean;
  holes?: PathContour[];
}

/** A shape is one or more contours (outer rings plus their holes). */
export interface ContourShape {
  contours: PathContour[];
}

export type MorphMode = "morph" | "dissolve" | "cut";

export interface MorphResult {
  contours: PathContour[];
  mode: MorphMode;
  diagnostics: Diagnostic[];
}

/** Minimum resample density; below this a morph visibly loses shape. */
const MIN_RESAMPLE_COUNT = 8;
/** Area magnitude below which a contour is treated as degenerate (px²). */
const DEGENERATE_AREA_EPSILON = 1e-9;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function copyPoint(p: Vec2): Vec2 {
  return { x: p.x, y: p.y };
}

function copyContour(c: PathContour): PathContour {
  const out: PathContour = { points: c.points.map(copyPoint), closed: c.closed };
  if (c.holes) out.holes = c.holes.map(copyContour);
  return out;
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerpNumber(a.x, b.x, t), y: lerpNumber(a.y, b.y, t) };
}

/** Signed area (shoelace). Positive is clockwise in a top-left origin frame. */
export function contourArea(points: Vec2[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % n];
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

/** Visual winding of a contour under the top-left-origin convention above. */
export function contourWinding(points: Vec2[]): "cw" | "ccw" | "degenerate" {
  if (points.length < 3) return "degenerate";
  const area = contourArea(points);
  if (Math.abs(area) <= DEGENERATE_AREA_EPSILON) return "degenerate";
  return area > 0 ? "cw" : "ccw";
}

/**
 * Whether a contour is a closed ring — either flagged `closed`, or its first and
 * last points coincide within a small epsilon.
 */
export function contourIsClosed(contour: PathContour): boolean {
  if (contour.closed) return true;
  const p = contour.points;
  if (p.length <= 2) return false;
  const first = p[0];
  const last = p[p.length - 1];
  return Math.hypot(last.x - first.x, last.y - first.y) <= 1e-6;
}

function pointAtDistance(points: Vec2[], cum: number[], d: number): Vec2 {
  const last = points.length - 1;
  if (d <= 0) return copyPoint(points[0]);
  if (d >= cum[last]) return copyPoint(points[last]);
  let i = 0;
  while (i < last - 1 && cum[i + 1] < d) i += 1;
  const segLen = cum[i + 1] - cum[i];
  const f = segLen > 0 ? (d - cum[i]) / segLen : 0;
  return lerpPoint(points[i], points[i + 1], f);
}

/**
 * Even arc-length resample of an open polyline into exactly `count` points
 * (endpoints included). Deterministic and input-preserving; degenerate inputs
 * (0 points, or zero total length) collapse predictably to repeated copies of
 * the first point rather than returning `NaN`.
 */
export function resampleContour(points: Vec2[], count: number): Vec2[] {
  if (count <= 0) return [];
  if (points.length === 0) return [];
  if (points.length === 1 || count === 1) {
    return Array.from({ length: count }, () => copyPoint(points[0]));
  }

  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    cum.push(total);
  }
  if (total <= 0) {
    return Array.from({ length: count }, () => copyPoint(points[0]));
  }

  const out: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(pointAtDistance(points, cum, (i / (count - 1)) * total));
  }
  return out;
}

/** Resample a closed ring around the loop so the seam stays even. */
function resampleLoop(points: Vec2[], count: number): Vec2[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: count }, () => copyPoint(points[0]));
  const loop = points.map(copyPoint);
  loop.push(copyPoint(points[0]));
  const resampled = resampleContour(loop, count + 1);
  resampled.pop();
  return resampled;
}

function resampleContourLike(contour: PathContour, count: number): Vec2[] {
  return contourIsClosed(contour)
    ? resampleLoop(contour.points, count)
    : resampleContour(contour.points, count);
}

function pointCountOf(contour: PathContour): number {
  let n = contour.points.length;
  for (const hole of contour.holes ?? []) n = Math.max(n, hole.points.length);
  return n;
}

function shapePointCount(shape: ContourShape): number {
  let n = 0;
  for (const c of shape.contours) n = Math.max(n, pointCountOf(c));
  return n;
}

/**
 * Validate a morph pair. All returned diagnostics are errors when the shapes
 * cannot be morphed point-wise; callers are expected to react with an explicit
 * fallback rather than guessing.
 */
export function validateMorph(from: ContourShape, to: ContourShape): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (from.contours.length !== to.contours.length) {
    diagnostics.push(
      createDiagnostic(
        "morph-contour-count-mismatch",
        "error",
        `Cannot morph ${from.contours.length} contour(s) into ${to.contours.length}: contour counts differ.`,
      ),
    );
  }

  const sides: Array<[string, ContourShape]> = [
    ["from", from],
    ["to", to],
  ];
  for (const [side, shape] of sides) {
    shape.contours.forEach((contour, index) => {
      if (contourWinding(contour.points) === "degenerate") {
        diagnostics.push(
          createDiagnostic(
            "morph-degenerate-contour",
            "error",
            `${side} contour ${index} is degenerate (fewer than 3 points or zero area).`,
          ),
        );
      }
      (contour.holes ?? []).forEach((hole, holeIndex) => {
        if (contourWinding(hole.points) === "degenerate") {
          diagnostics.push(
            createDiagnostic(
              "morph-degenerate-contour",
              "error",
              `${side} contour ${index} hole ${holeIndex} is degenerate.`,
            ),
          );
        }
      });
    });
  }

  const pairs = Math.min(from.contours.length, to.contours.length);
  for (let i = 0; i < pairs; i += 1) {
    const a = from.contours[i];
    const b = to.contours[i];
    if ((a.holes?.length ?? 0) !== (b.holes?.length ?? 0)) {
      diagnostics.push(
        createDiagnostic(
          "morph-holes-mismatch",
          "error",
          `Contour ${i} hole counts differ (${a.holes?.length ?? 0} vs ${b.holes?.length ?? 0}).`,
        ),
      );
    }
    if (contourIsClosed(a) !== contourIsClosed(b)) {
      diagnostics.push(
        createDiagnostic(
          "morph-closed-mismatch",
          "error",
          `Contour ${i} closedness differs (open vs closed).`,
        ),
      );
    }
    const wa = contourWinding(a.points);
    const wb = contourWinding(b.points);
    if (wa !== wb && wa !== "degenerate" && wb !== "degenerate") {
      diagnostics.push(
        createDiagnostic(
          "morph-winding-mismatch",
          "error",
          `Contour ${i} winding differs (${wa} vs ${wb}); point-wise morphing would self-intersect.`,
        ),
      );
    }
  }

  return diagnostics;
}

function morphContour(from: PathContour, to: PathContour, t: number, count: number): PathContour {
  const a = resampleContourLike(from, count);
  const b = resampleContourLike(to, count);
  const n = Math.min(a.length, b.length);
  const points: Vec2[] = [];
  for (let i = 0; i < n; i += 1) points.push(lerpPoint(a[i], b[i], t));

  const result: PathContour = { points, closed: contourIsClosed(from) };
  const fromHoles = from.holes ?? [];
  const toHoles = to.holes ?? [];
  if (fromHoles.length > 0 || toHoles.length > 0) {
    const holes: PathContour[] = [];
    for (let i = 0; i < fromHoles.length; i += 1) {
      const holeCount = Math.max(
        MIN_RESAMPLE_COUNT,
        fromHoles[i].points.length,
        toHoles[i]?.points.length ?? 0,
      );
      holes.push(morphContour(fromHoles[i], toHoles[i] ?? fromHoles[i], t, holeCount));
    }
    result.holes = holes;
  }
  return result;
}

/**
 * Morph `from` into `to` at normalized `t` (clamped to `[0, 1]`).
 *
 * When {@link validateMorph} reports any error the shapes are *not* morphed.
 * Instead the documented fallback runs:
 * - `"dissolve"` (default) — source contours for `t < 1`, target contours at
 *   `t >= 1`; the caller owns the cross-fade opacity.
 * - `"cut"` — identical contour hand-off, reported as a hard cut.
 *
 * Both emit a warning so the fallback is visible in diagnostics, never silent.
 */
export function morphShapes(
  from: ContourShape,
  to: ContourShape,
  t: number,
  opts: { fallback?: "dissolve" | "cut"; resampleCount?: number } = {},
): MorphResult {
  const tt = clamp01(t);
  const diagnostics = validateMorph(from, to);
  const errors = diagnostics.filter((d) => d.severity === "error");

  if (errors.length > 0) {
    const mode: MorphMode = opts.fallback ?? "dissolve";
    const code = mode === "cut" ? "morph-fallback-cut" : "morph-fallback-dissolve";
    const used = tt >= 1 ? to : from;
    diagnostics.push(
      createDiagnostic(
        code,
        "warning",
        `Shapes are not morph-compatible; falling back to ${mode} (${used === to ? "target" : "source"} contours).`,
      ),
    );
    return { contours: used.contours.map(copyContour), mode, diagnostics };
  }

  const requested = opts.resampleCount;
  const count =
    requested !== undefined && requested > 0
      ? Math.max(2, Math.floor(requested))
      : Math.max(MIN_RESAMPLE_COUNT, shapePointCount(from), shapePointCount(to));

  const contours = from.contours.map((contour, i) => morphContour(contour, to.contours[i], tt, count));
  return { contours, mode: "morph", diagnostics };
}
