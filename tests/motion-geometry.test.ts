/**
 * Geometry lane — deterministic coverage for `motion-path`, `path-trim`,
 * `shape-morph`, `mask-reveal` and `shared-element` (docs/08 §3).
 *
 * These tests pin behaviour, not implementation detail: even arc-length
 * spacing, tangent normalization, vector trim windows, morph validation and
 * fallbacks, mask ordering/capabilities and shared-element handoff continuity.
 */

import { describe, expect, it } from "vitest";

import { evaluateEasing } from "../registry/motion/easing";
import {
  angleOnPath,
  createMotionPath,
  pathBounds,
  pathToSvgD,
  pathTransformPoint,
  pointOnPath,
  samplePath,
  tangentOnPath,
} from "../registry/motion/paths";
import type { Vec2 } from "../registry/motion/types";
import type { MotionPath } from "../registry/motion/paths";
import { normalizeTrimWindow, pathLength, trimPath, trimRevealProgress } from "../registry/motion/trim";
import {
  contourArea,
  contourIsClosed,
  contourWinding,
  morphShapes,
  resampleContour,
  validateMorph,
} from "../registry/motion/morph";
import type { ContourShape, PathContour } from "../registry/motion/morph";
import {
  MASK_KINDS,
  evaluateMask,
  maskCapability,
  resolveMaskOrder,
} from "../registry/motion/masks";
import type { MaskSample, MaskSpec, MaskSpecLocal } from "../registry/motion/masks";
import {
  createSharedElement,
  evaluateSharedElement,
  sharedElementContacts,
  validateSharedElement,
} from "../registry/motion/shared-element";
import { scaleMatrix, translationMatrix } from "../registry/motion/matrix";

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** A "long then short" path so arc-length spacing and index spacing differ. */
function unevenPath(): MotionPath {
  return createMotionPath({
    id: "uneven",
    anchors: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 100, y: 0 },
    ],
  });
}

function square(size = 10, ox = 0, oy = 0, counterClockwise = false): PathContour {
  const points: Vec2[] = [
    { x: ox, y: oy },
    { x: ox + size, y: oy },
    { x: ox + size, y: oy + size },
    { x: ox, y: oy + size },
  ];
  return { points: counterClockwise ? points.slice().reverse() : points, closed: true };
}

function shape(contour: PathContour): ContourShape {
  return { contours: [contour] };
}

describe("paths — parameterization", () => {
  it("spaces samples evenly by distance when arc-length is enabled (default)", () => {
    const path = unevenPath();
    const samples = samplePath(path);
    expect(samples.totalLength).toBeCloseTo(100, 9);
    expect(samples.cumulativeLengths[0]).toBe(0);
    expect(samples.cumulativeLengths).toHaveLength(samples.points.length);

    const step = samples.totalLength / 10;
    let prev = pointOnPath(path, 0, { samples });
    for (let i = 1; i <= 10; i += 1) {
      const next = pointOnPath(path, i / 10, { samples });
      expect(dist(prev, next)).toBeCloseTo(step, 6);
      prev = next;
    }
  });

  it("falls back to index spacing when arc-length is disabled", () => {
    const path = unevenPath();
    const mid = pointOnPath(path, 0.5, { arcLength: false });
    // Index space lands exactly on the middle vertex (10, 0), not the midpoint.
    expect(mid.x).toBeCloseTo(10, 9);
    expect(mid.y).toBeCloseTo(0, 9);

    const distances: number[] = [];
    let prev = pointOnPath(path, 0, { arcLength: false });
    for (let i = 1; i <= 10; i += 1) {
      const next = pointOnPath(path, i / 10, { arcLength: false });
      distances.push(dist(prev, next));
      prev = next;
    }
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    expect(max - min).toBeGreaterThan(1);
  });

  it("clamps t outside [0, 1]", () => {
    const path = unevenPath();
    expect(pointOnPath(path, -3)).toEqual(pointOnPath(path, 0));
    expect(pointOnPath(path, 4)).toEqual(pointOnPath(path, 1));
  });

  it("returns a normalized tangent and a matching angle", () => {
    const diagonal = createMotionPath({
      id: "diag",
      anchors: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    });
    const tan = tangentOnPath(diagonal, 0.5);
    expect(Math.hypot(tan.x, tan.y)).toBeCloseTo(1, 9);
    expect(tan.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(tan.y).toBeCloseTo(Math.SQRT1_2, 9);
    expect(angleOnPath(diagonal, 0.5)).toBeCloseTo(Math.PI / 4, 9);

    const horizontal = unevenPath();
    const ht = tangentOnPath(horizontal, 0.5);
    expect(ht.x).toBeCloseTo(1, 9);
    expect(ht.y).toBeCloseTo(0, 9);
  });

  it("orients a degenerate segment to +x instead of NaN", () => {
    const point = createMotionPath({ id: "pt", anchors: [{ x: 5, y: 5 }] });
    const tan = tangentOnPath(point, 0.5);
    expect(tan).toEqual({ x: 1, y: 0 });
    expect(Number.isNaN(angleOnPath(point, 0.5))).toBe(false);
  });

  it("serializes linear and cubic paths to SVG d", () => {
    const linear = unevenPath();
    expect(pathToSvgD(linear)).toBe("M 0 0 L 10 0 L 100 0");

    const closed = createMotionPath({
      id: "closed",
      anchors: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      closed: true,
    });
    expect(pathToSvgD(closed)).toBe("M 0 0 L 10 0 L 10 10 L 0 0 Z");

    const cubic = createMotionPath({
      id: "cubic",
      kind: "cubic",
      anchors: [
        { x: 0, y: 0, out: { x: 0, y: 10 } },
        { x: 100, y: 0, in: { x: 100, y: -10 } },
      ],
    });
    expect(pathToSvgD(cubic)).toBe("M 0 0 C 0 10 100 -10 100 0");
    expect(pathToSvgD(createMotionPath({ id: "empty", anchors: [] }))).toBe("");
  });

  it("computes bounds over sampled points and converts local points to world", () => {
    const path = unevenPath();
    expect(pathBounds(path)).toEqual({ x: 0, y: 0, width: 100, height: 0 });

    const world = pathTransformPoint(path, 0, translationMatrix(5, 7));
    expect(world).toEqual({ x: 5, y: 7 });
    const worldMid = pathTransformPoint(path, 0.5, translationMatrix(5, 7));
    expect(worldMid.x).toBeCloseTo(55, 6);
    expect(worldMid.y).toBeCloseTo(7, 9);
  });
});

describe("trim — vector stroke reveal", () => {
  it("slices an exact normalized window and leaves the source untouched", () => {
    const path = createMotionPath({
      id: "line",
      anchors: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const spec = { start: 0.25, end: 0.75 };
    const result = trimPath(path, spec);

    expect(result.pathId).toBe("line");
    expect(result.startT).toBeCloseTo(0.25, 9);
    expect(result.endT).toBeCloseTo(0.75, 9);
    expect(result.points).toHaveLength(2);
    expect(result.points[0].x).toBeCloseTo(25, 6);
    expect(result.points[1].x).toBeCloseTo(75, 6);
    expect(result.svg).toBe("M 25 0 L 75 0");

    // Immutability: source anchors and the spec are unchanged, output is fresh.
    expect(path.anchors).toHaveLength(2);
    expect(path.anchors[1]).toEqual({ x: 100, y: 0 });
    expect(spec).toEqual({ start: 0.25, end: 0.75 });
    expect(result.points[0]).not.toBe(path.anchors[0]);
  });

  it("reverses emitted order for direction: reverse without moving the window", () => {
    const path = createMotionPath({
      id: "line",
      anchors: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const forward = trimPath(path, { start: 0.25, end: 0.75 });
    const reversed = trimPath(path, { start: 0.25, end: 0.75, direction: "reverse" });

    expect(reversed.startT).toBeCloseTo(forward.startT, 9);
    expect(reversed.endT).toBeCloseTo(forward.endT, 9);
    expect(reversed.points[0].x).toBeCloseTo(75, 6);
    expect(reversed.points[reversed.points.length - 1].x).toBeCloseTo(25, 6);
    // The source is still untouched by the reverse pass.
    expect(path.anchors[1]).toEqual({ x: 100, y: 0 });
  });

  it("clamps out-of-range windows and orders start <= end", () => {
    expect(normalizeTrimWindow({ start: -0.5, end: 2 })).toEqual({ startT: 0, endT: 1 });
    expect(normalizeTrimWindow({ start: 0.75, end: 0.25 })).toEqual({ startT: 0.25, endT: 0.75 });
    expect(normalizeTrimWindow({ start: 0.25, end: 0.75, offset: 0.2 })).toEqual({ startT: 0.45, endT: 0.95 });

    const path = createMotionPath({
      id: "line",
      anchors: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const full = trimPath(path, { start: -1, end: 5 });
    expect(full.startT).toBe(0);
    expect(full.endT).toBe(1);
    expect(full.points.map((p) => p.x)).toEqual([0, 100]);
  });

  it("reports arc length and a deterministic reveal progress", () => {
    const path = unevenPath();
    expect(pathLength(path)).toBeCloseTo(100, 9);

    const range = { startFrame: 0, endFrame: 20 };
    expect(trimRevealProgress(-5, range)).toBe(0);
    expect(trimRevealProgress(0, range)).toBe(0);
    expect(trimRevealProgress(10, range)).toBeCloseTo(0.5, 9);
    expect(trimRevealProgress(20, range)).toBe(1);
    expect(trimRevealProgress(40, range)).toBe(1);

    let prev = -1;
    for (let frame = 0; frame <= 20; frame += 1) {
      const value = trimRevealProgress(frame, range, "ease-out");
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBeGreaterThanOrEqual(prev);
      prev = value;
    }

    const instant = trimRevealProgress(5, { startFrame: 5, endFrame: 5 });
    expect(instant).toBe(1);
    expect(trimRevealProgress(4, { startFrame: 5, endFrame: 5 })).toBe(0);
  });
});

describe("morph — contours and fallbacks", () => {
  it("computes signed area and visual winding under a top-left origin", () => {
    const cw = square();
    const ccw = square(10, 0, 0, true);
    expect(contourArea(cw.points)).toBeCloseTo(100, 9);
    expect(contourArea(ccw.points)).toBeCloseTo(-100, 9);
    expect(contourWinding(cw.points)).toBe("cw");
    expect(contourWinding(ccw.points)).toBe("ccw");
    expect(contourWinding([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe("degenerate");
    expect(contourWinding([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }])).toBe("degenerate");
    expect(contourArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });

  it("detects closedness by flag and by coincident endpoints", () => {
    expect(contourIsClosed(square())).toBe(true);
    expect(contourIsClosed({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], closed: false })).toBe(false);
    expect(
      contourIsClosed({
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }],
        closed: false,
      }),
    ).toBe(true);
  });

  it("resamples to an even arc-length distribution", () => {
    // Straight run: equal arc spacing is also equal chord spacing.
    const line: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const even = resampleContour(line, 5);
    expect(even).toHaveLength(5);
    expect(even[0]).toEqual({ x: 0, y: 0 });
    expect(even[4]).toEqual({ x: 10, y: 0 });
    for (let i = 1; i < even.length; i += 1) {
      expect(dist(even[i - 1], even[i])).toBeCloseTo(2.5, 6);
    }

    // Corner case: spacing is even *along the polyline* (20 / 3 per hop), so the
    // vertex positions are exact even though chord lengths differ at the corner.
    const corner: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const out = resampleContour(corner, 4);
    expect(out).toHaveLength(4);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[1].x).toBeCloseTo(20 / 3, 6);
    expect(out[1].y).toBeCloseTo(0, 9);
    expect(out[2].x).toBeCloseTo(10, 9);
    expect(out[2].y).toBeCloseTo(10 / 3, 6);
    expect(out[3]).toEqual({ x: 10, y: 10 });
    expect(resampleContour(corner, 0)).toEqual([]);
    expect(resampleContour([{ x: 3, y: 4 }], 3)).toEqual([
      { x: 3, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it("flags every topology mismatch it can see", () => {
    const codes = (shapeFrom: ContourShape, shapeTo: ContourShape) =>
      validateMorph(shapeFrom, shapeTo).map((d) => d.code);

    expect(codes(shape(square()), { contours: [square(), square()] })).toContain(
      "morph-contour-count-mismatch",
    );
    expect(codes(shape(square(10, 0, 0, true)), shape(square()))).toContain("morph-winding-mismatch");
    expect(
      codes(
        shape({ points: square().points, closed: true, holes: [square(2, 2, 2, true)] }),
        shape(square()),
      ),
    ).toContain("morph-holes-mismatch");
    expect(
      codes(shape({ points: square().points, closed: false }), shape(square())),
    ).toContain("morph-closed-mismatch");
    expect(
      codes(shape({ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], closed: true }), shape(square())),
    ).toContain("morph-degenerate-contour");

    expect(validateMorph(shape(square()), shape(square(10, 20, 20)))).toEqual([]);
  });

  it("refuses to morph incompatible shapes and dissolves or cuts instead", () => {
    const from = shape(square());
    // Opposite winding -> validateMorph reports an error -> no point-wise morph.
    const to = shape(square(10, 0, 0, true));
    expect(validateMorph(from, to).some((d) => d.severity === "error")).toBe(true);

    const dissolve = morphShapes(from, to, 0.5);
    expect(dissolve.mode).toBe("dissolve");
    expect(dissolve.contours).toHaveLength(1);
    expect(dissolve.contours[0].points).toEqual(from.contours[0].points);
    expect(dissolve.diagnostics.some((d) => d.severity === "warning")).toBe(true);
    expect(dissolve.diagnostics.map((d) => d.code)).toContain("morph-fallback-dissolve");
    // Returned contours are copies, not aliases of the caller's data.
    expect(dissolve.contours[0]).not.toBe(from.contours[0]);
    expect(dissolve.contours[0].points[0]).not.toBe(from.contours[0].points[0]);

    const atEnd = morphShapes(from, to, 1);
    expect(atEnd.contours[0].points).toEqual(to.contours[0].points);

    const cut = morphShapes(from, to, 0.4, { fallback: "cut" });
    expect(cut.mode).toBe("cut");
    expect(cut.contours[0].points).toEqual(from.contours[0].points);
    expect(cut.diagnostics.map((d) => d.code)).toContain("morph-fallback-cut");
  });

  it("morphs compatible shapes to a point-wise average at t = 0.5", () => {
    const from = shape(square());
    const to = shape(square(10, 10, 0));

    const start = morphShapes(from, to, 0);
    const end = morphShapes(from, to, 1);
    const mid = morphShapes(from, to, 0.5);

    expect(mid.mode).toBe("morph");
    expect(mid.diagnostics).toEqual([]);
    expect(start.mode).toBe("morph");
    expect(end.mode).toBe("morph");

    expect(start.contours).toEqual(from.contours);
    expect(end.contours).toEqual(to.contours);
    const sampleRing = (contour: PathContour) =>
      resampleContour([...contour.points, contour.points[0]], 9).slice(0, -1);
    const startPoints = sampleRing(start.contours[0]);
    const endPoints = sampleRing(end.contours[0]);
    const midPoints = mid.contours[0].points;

    expect(midPoints.length).toBeGreaterThanOrEqual(8);
    expect(midPoints).toHaveLength(startPoints.length);
    expect(midPoints).toHaveLength(endPoints.length);

    for (let i = 0; i < midPoints.length; i += 1) {
      expect(midPoints[i].x).toBeCloseTo((startPoints[i].x + endPoints[i].x) / 2, 6);
      expect(midPoints[i].y).toBeCloseTo((startPoints[i].y + endPoints[i].y) / 2, 6);
    }

    // t is clamped, so t = 2 lands on the target shape.
    expect(morphShapes(from, to, 2).contours).toEqual(to.contours);
    expect(mid.contours[0].closed).toBe(true);
  });

  it("preserves holes through a compatible morph", () => {
    const from: ContourShape = {
      contours: [{ points: square(20).points, closed: true, holes: [square(4, 4, 4, true)] }],
    };
    const to: ContourShape = {
      contours: [{ points: square(20, 5, 5).points, closed: true, holes: [square(4, 9, 9, true)] }],
    };
    const result = morphShapes(from, to, 0.5);
    expect(result.mode).toBe("morph");
    expect(result.contours[0].holes).toHaveLength(1);
  });
});

describe("masks — reveal, order and capability", () => {
  const rect = { x: 10, y: 20, width: 100, height: 40 };

  it("sweeps the geometry along the resolved axis", () => {
    const base: MaskSpec = { kind: "alpha", rect };
    expect(evaluateMask(base, 0.5).rect).toEqual({ x: 10, y: 20, width: 50, height: 40 });

    const rightToLeft: MaskSpecLocal = { kind: "alpha", rect, axis: "right-to-left" };
    expect(evaluateMask(rightToLeft, 0.5).rect).toEqual({ x: 60, y: 20, width: 50, height: 40 });

    const topToBottom: MaskSpecLocal = { kind: "alpha", rect, axis: "top-to-bottom" };
    expect(evaluateMask(topToBottom, 0.5).rect).toEqual({ x: 10, y: 20, width: 100, height: 20 });

    const bottomToTop: MaskSpecLocal = { kind: "alpha", rect, axis: "bottom-to-top" };
    expect(evaluateMask(bottomToTop, 0.5).rect).toEqual({ x: 10, y: 40, width: 100, height: 20 });

    const radial: MaskSpecLocal = { kind: "alpha", rect, axis: "radial" };
    expect(evaluateMask(radial, 0.5).rect).toEqual({ x: 35, y: 30, width: 50, height: 20 });
    expect(evaluateMask(radial, 0).rect).toEqual({ x: 60, y: 40, width: 0, height: 0 });
  });

  it("advances monotonically and clamps progress", () => {
    const spec: MaskSpecLocal = { kind: "luma", rect, axis: "left-to-right" };
    let prevWidth = -1;
    let prevOpacity = -1;
    for (let i = 0; i <= 20; i += 1) {
      const sample = evaluateMask(spec, i / 20);
      expect(sample.rect.width).toBeGreaterThanOrEqual(prevWidth);
      expect(sample.opacity).toBeGreaterThanOrEqual(prevOpacity);
      prevWidth = sample.rect.width;
      prevOpacity = sample.opacity;
    }
    expect(evaluateMask(spec, -1).opacity).toBe(0);
    expect(evaluateMask(spec, 9).opacity).toBe(1);
    expect(evaluateMask(spec, 9).rect.width).toBe(100);
  });

  it("only alpha and luma mattes fade; clip stays fully opaque", () => {
    for (const kind of MASK_KINDS) {
      const sample = evaluateMask({ kind, rect }, 0.25);
      expect(sample.opacity).toBe(kind === "clip" ? 1 : 0.25);
    }
    expect(evaluateMask({ kind: "alpha", rect }, 0).opacity).toBe(0);
    // feather/order defaults are resolved, never left undefined.
    const bare = evaluateMask({ kind: "clip", rect }, 1);
    expect(bare.feather).toBe(0);
    expect(bare.order).toBe(0);
    expect(bare.axis).toBe("left-to-right");
  });

  it("does not mutate the spec and copies its transform", () => {
    const transform = { a: 1, b: 0, c: 0, d: 1, e: 3, f: 4 };
    const spec: MaskSpec = { kind: "alpha", rect, feather: 2, order: 1, transform };
    const sample = evaluateMask(spec, 0.5);
    expect(spec.rect).toEqual(rect);
    expect(sample.transform).toEqual(transform);
    expect(sample.transform).not.toBe(transform);
    expect(sample.feather).toBe(2);
    expect(sample.order).toBe(1);

    // Resolved geometry is fresh per sample: mutating it cannot alias the spec.
    sample.polygon[0].x = -999;
    expect(spec.transform).toEqual(transform);
    expect(evaluateMask(spec, 0.5).polygon[0].x).toBeCloseTo(13, 9);
  });

  it("clamps feather to a finite non-negative width and normalizes softness", () => {
    const base: MaskSpec = { kind: "alpha", rect };
    expect(evaluateMask(base, 1).feather).toBe(0);
    expect(evaluateMask(base, 1).softness).toBe(0);

    expect(evaluateMask({ ...base, feather: -4 }, 1).feather).toBe(0);
    expect(evaluateMask({ ...base, feather: Number.NaN }, 1).feather).toBe(0);
    expect(evaluateMask({ ...base, feather: Number.POSITIVE_INFINITY }, 1).feather).toBe(0);
    expect(evaluateMask({ ...base, feather: Number.NEGATIVE_INFINITY }, 1).softness).toBe(0);

    // 10 px on a 100 x 40 rect -> 10 / 40 = 0.25 of the shortest side.
    const soft = evaluateMask({ ...base, feather: 10 }, 1);
    expect(soft.feather).toBe(10);
    expect(soft.softness).toBeCloseTo(0.25, 9);

    // A collapsed mask reports full softness rather than NaN/Infinity.
    const collapsedSpec: MaskSpecLocal = { kind: "alpha", rect, axis: "radial", feather: 4 };
    const collapsed = evaluateMask(collapsedSpec, 0);
    expect(collapsed.rect).toEqual({ x: 60, y: 40, width: 0, height: 0 });
    expect(collapsed.softness).toBe(1);
  });

  it("applies the transform to the resolved polygon and bounds", () => {
    const base: MaskSpec = { kind: "alpha", rect };

    // Identity: polygon is the swept rect's four corners, clockwise from TL.
    const identity = evaluateMask(base, 1);
    expect(identity.polygon).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 60 },
      { x: 10, y: 60 },
    ]);
    expect(identity.bounds).toEqual(rect);
    expect(identity.transform).toBeUndefined();

    // Translation moves the resolved geometry without changing the swept rect.
    const translated = evaluateMask(
      { ...base, transform: translationMatrix(5, 7) },
      1,
    );
    expect(translated.rect).toEqual(rect);
    expect(translated.polygon).toEqual([
      { x: 15, y: 27 },
      { x: 115, y: 27 },
      { x: 115, y: 67 },
      { x: 15, y: 67 },
    ]);
    expect(translated.bounds).toEqual({ x: 15, y: 27, width: 100, height: 40 });

    // Scale is applied per point (and the sweep happens before the transform).
    const scaled = evaluateMask({ ...base, transform: scaleMatrix(2, 3) }, 1);
    expect(scaled.bounds).toEqual({ x: 20, y: 60, width: 200, height: 120 });

    const swept = evaluateMask(
      { ...base, transform: translationMatrix(5, 7) },
      0.5,
    );
    expect(swept.rect).toEqual({ x: 10, y: 20, width: 50, height: 40 });
    expect(swept.polygon[0]).toEqual({ x: 15, y: 27 });
    expect(swept.polygon[2]).toEqual({ x: 65, y: 67 });

    // A rotation resolves to a polygon (not an axis-aligned rect) with its own bounds.
    const rotated = evaluateMask(
      { ...base, transform: { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 } },
      1,
    );
    expect(rotated.polygon[0]).toEqual({ x: -20, y: 10 });
    expect(rotated.bounds).toEqual({ x: -60, y: 10, width: 40, height: 100 });

    // A non-finite transform is ignored rather than poisoning the geometry.
    const poisoned = evaluateMask(
      { ...base, transform: { a: Number.NaN, b: 0, c: 0, d: 1, e: 0, f: 0 } },
      1,
    );
    expect(poisoned.transform).toBeUndefined();
    expect(poisoned.polygon).toEqual(identity.polygon);
    expect(poisoned.bounds).toEqual(rect);
    expect(poisoned.polygon.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("sorts compositing order stably by order then declaration", () => {
    const samples: MaskSample[] = [
      evaluateMask({ kind: "clip", rect, id: "a", order: 1 }, 1),
      evaluateMask({ kind: "clip", rect, id: "b", order: 0 }, 1),
      evaluateMask({ kind: "clip", rect, id: "c", order: 1 }, 1),
    ];
    expect(resolveMaskOrder(samples).map((m) => m.id)).toEqual(["b", "a", "c"]);
    expect(resolveMaskOrder(samples)).toHaveLength(3);
  });

  it("keeps order stable for ties, negatives and non-finite values", () => {
    const samples: MaskSample[] = [
      evaluateMask({ kind: "clip", rect, id: "d", order: 2 }, 1),
      evaluateMask({ kind: "clip", rect, id: "a" }, 1), // default 0
      evaluateMask({ kind: "clip", rect, id: "c", order: -1 }, 1),
      evaluateMask({ kind: "clip", rect, id: "b", order: 2 }, 1),
      evaluateMask({ kind: "clip", rect, id: "e", order: Number.NaN }, 1),
      evaluateMask({ kind: "clip", rect, id: "f", order: Number.POSITIVE_INFINITY }, 1),
    ];

    const sorted = resolveMaskOrder(samples);
    // -1 first; the 0 ties (a, e, f) and the 2 ties (d, b) keep declaration order.
    expect(sorted.map((m) => m.id)).toEqual(["c", "a", "e", "f", "d", "b"]);
    expect(sorted).not.toBe(samples);
    expect(sorted).toHaveLength(samples.length);

    // Sorting is repeatable and never mutates or reorders the input array.
    expect(resolveMaskOrder(samples).map((m) => m.id)).toEqual(sorted.map((m) => m.id));
    expect(samples.map((m) => m.id)).toEqual(["d", "a", "c", "b", "e", "f"]);
    expect(resolveMaskOrder([])).toEqual([]);
  });

  it("declares a capability with a graceful fallback", () => {
    expect(maskCapability({ kind: "luma", rect })).toEqual({
      capability: "mask-luma",
      fallback: "alpha",
    });
    expect(maskCapability({ kind: "alpha", rect })).toEqual({
      capability: "mask-alpha",
      fallback: "clip",
    });
    expect(maskCapability({ kind: "clip", rect })).toEqual({
      capability: "mask-clip",
      fallback: "none",
    });
    expect(MASK_KINDS).toEqual(["clip", "alpha", "luma"]);
  });
});

describe("shared-element — handoff continuity", () => {
  const fromEndpoint = { transform: translationMatrix(10, 0), opacity: 0.2, range: { startFrame: 0, endFrame: 10 } };
  const toEndpoint = { transform: translationMatrix(60, 0), opacity: 1, range: { startFrame: 20, endFrame: 30 } };
  const handoff = { startFrame: 10, endFrame: 20 };

  function spec(collision?: "cross-fade" | "cut" | "hold-old") {
    return createSharedElement({ semanticId: "card", from: fromEndpoint, to: toEndpoint, handoff, collision });
  }

  it("resolves each phase deterministically", () => {
    const s = spec();
    const before = evaluateSharedElement(s, 5);
    expect(before.phase).toBe("before");
    expect(before.owner).toBe("from");
    expect(before.transform.e).toBe(10);
    expect(before.opacity).toBe(0.2);

    const after = evaluateSharedElement(s, 20);
    expect(after.phase).toBe("after");
    expect(after.owner).toBe("to");
    expect(after.transform.e).toBe(60);
    expect(after.opacity).toBe(1);

    const during = evaluateSharedElement(s, 15);
    expect(during.phase).toBe("handoff");
    expect(during.owner).toBe("handoff");
    expect(during.transform.e).toBeGreaterThan(10);
    expect(during.transform.e).toBeLessThan(60);
    expect(during.frame).toBe(15);
  });

  it("is continuous across the handoff boundaries", () => {
    const s = spec();
    const atStart = evaluateSharedElement(s, handoff.startFrame);
    expect(atStart.phase).toBe("handoff");
    expect(atStart.transform.e).toBeCloseTo(10, 6);
    expect(atStart.opacity).toBeCloseTo(0.2, 6);

    const atEnd = evaluateSharedElement(s, handoff.endFrame);
    expect(atEnd.phase).toBe("after");
    expect(atEnd.transform.e).toBeCloseTo(60, 6);

    // Approaching the end from inside stays close to the target.
    const last = evaluateSharedElement(s, handoff.endFrame - 1);
    expect(last.transform.e).toBeGreaterThan(55);
  });

  it("cross-fades opacity by default and eases the transform", () => {
    const s = spec();
    const sample = evaluateSharedElement(s, 15);
    const expected = evaluateEasing("ease-in-out", 0.5);
    expect(sample.opacity).toBeCloseTo(0.2 + (1 - 0.2) * expected, 9);
    expect(sample.transform.e).toBeCloseTo(10 + (60 - 10) * expected, 9);
  });

  it("cuts at the handoff midpoint and holds old opacity when asked", () => {
    const cut = spec("cut");
    expect(evaluateSharedElement(cut, 14).owner).toBe("from");
    expect(evaluateSharedElement(cut, 14).transform.e).toBe(10);
    expect(evaluateSharedElement(cut, 15).owner).toBe("to");
    expect(evaluateSharedElement(cut, 15).transform.e).toBe(60);

    const hold = spec("hold-old");
    const held = evaluateSharedElement(hold, 15);
    expect(held.phase).toBe("handoff");
    expect(held.opacity).toBe(0.2);
    expect(held.transform.e).toBeGreaterThan(10);
    expect(held.transform.e).toBeLessThan(60);
  });

  it("lists only elements in handoff at a frame, sorted by semanticId", () => {
    const a = createSharedElement({
      semanticId: "alpha",
      from: fromEndpoint,
      to: toEndpoint,
      handoff,
    });
    const b = createSharedElement({
      semanticId: "beta",
      from: fromEndpoint,
      to: toEndpoint,
      handoff: { startFrame: 12, endFrame: 22 },
    });
    const c = createSharedElement({
      semanticId: "gamma",
      from: fromEndpoint,
      to: toEndpoint,
      handoff: { startFrame: 40, endFrame: 50 },
    });

    expect(sharedElementContacts(15, [b, a, c]).map((s) => s.semanticId)).toEqual(["alpha", "beta"]);
    expect(sharedElementContacts(5, [b, a, c])).toEqual([]);
    expect(sharedElementContacts(20, [a, b, c]).map((s) => s.semanticId)).toEqual(["beta"]);
  });

  it("validates identity, ranges, overlap and empty handoffs", () => {
    const bad = createSharedElement({
      semanticId: "   ",
      from: fromEndpoint,
      to: toEndpoint,
      handoff,
    });
    expect(validateSharedElement(bad).map((d) => d.code)).toContain("shared-element-id-missing");

    const invalidRange = createSharedElement({
      semanticId: "ok",
      from: { transform: translationMatrix(0, 0), range: { startFrame: 5, endFrame: 5 } },
      to: toEndpoint,
      handoff,
    });
    expect(validateSharedElement(invalidRange).map((d) => d.code)).toContain(
      "shared-element-range-invalid",
    );

    const overlapping = createSharedElement({
      semanticId: "ok",
      from: { transform: translationMatrix(0, 0), range: { startFrame: 0, endFrame: 25 } },
      to: { transform: translationMatrix(60, 0), range: { startFrame: 5, endFrame: 30 } },
      handoff: { startFrame: 28, endFrame: 30 },
    });
    expect(validateSharedElement(overlapping).map((d) => d.code)).toContain(
      "shared-element-range-overlap",
    );

    const emptyHandoff = createSharedElement({
      semanticId: "ok",
      from: fromEndpoint,
      to: toEndpoint,
      handoff: { startFrame: 10, endFrame: 10 },
    });
    const emptyCodes = validateSharedElement(emptyHandoff).map((d) => d.code);
    expect(emptyCodes).toContain("shared-element-handoff-empty");
    expect(emptyHandoff.handoff).toEqual({ startFrame: 10, endFrame: 10 });

    expect(validateSharedElement(spec())).toEqual([]);
  });

  it("copies inputs and outputs so nothing aliases caller state", () => {
    const sourceFrom = { transform: translationMatrix(10, 0), range: { startFrame: 0, endFrame: 10 } };
    const s = createSharedElement({
      semanticId: "copy",
      from: sourceFrom,
      to: toEndpoint,
      handoff,
    });
    expect(s.from.transform).not.toBe(sourceFrom.transform);

    const sample = evaluateSharedElement(s, 5);
    sample.transform.e = 999;
    expect(s.from.transform.e).toBe(10);
  });
});
