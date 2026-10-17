import { describe, expect, it } from "vitest";

import { morphShapes, validateMorph } from "../registry/motion/morph";
import type { ContourShape, PathContour } from "../registry/motion/morph";

function ring(size = 20, offset = 0): PathContour {
  return {
    closed: true,
    points: [
      { x: offset, y: offset },
      { x: offset + size, y: offset },
      { x: offset + size, y: offset + size },
      { x: offset, y: offset + size },
    ],
  };
}

function nestedShape(): ContourShape {
  return { contours: [{ ...ring(), holes: [{ ...ring(10, 2), holes: [ring(2, 4)] }] }] };
}

function nestedHole(shape: ContourShape): PathContour {
  return shape.contours[0].holes![0].holes![0];
}

describe("morph — recursive compatibility and authored geometry", () => {
  it("rejects topology differences below the first hole level", () => {
    const from = nestedShape();
    const to = nestedShape();
    to.contours[0].holes![0].holes = [];
    expect(validateMorph(from, to).map(({ code }) => code)).toContain("morph-holes-mismatch");
    expect(morphShapes(from, to, 0.5).mode).toBe("dissolve");
  });

  it("rejects opposite winding in a nested hole", () => {
    const to = nestedShape();
    nestedHole(to).points.reverse();
    expect(validateMorph(nestedShape(), to).map(({ code }) => code)).toContain("morph-winding-mismatch");
  });

  it("rejects different closedness in a nested hole", () => {
    const to = nestedShape();
    nestedHole(to).closed = false;
    expect(validateMorph(nestedShape(), to).map(({ code }) => code)).toContain("morph-closed-mismatch");
  });

  it("rejects degenerate nested contours", () => {
    const to = nestedShape();
    nestedHole(to).points = [{ x: 1, y: 1 }];
    expect(validateMorph(nestedShape(), to).map(({ code }) => code)).toContain("morph-degenerate-contour");
  });

  it.each([NaN, Infinity, -Infinity])("rejects a nested nonfinite coordinate (%s)", (coordinate) => {
    const to = nestedShape();
    nestedHole(to).points[0].x = coordinate;
    expect(validateMorph(nestedShape(), to).map(({ code }) => code)).toContain("morph-nonfinite-contour");
    expect(morphShapes(nestedShape(), to, 0.5).mode).toBe("dissolve");
  });

  it("rejects a self-intersection even when signed area is nonzero", () => {
    const crossing: PathContour = {
      closed: true,
      points: [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 3 }, { x: 3, y: 0 }],
    };
    const shape = { contours: [crossing] };
    expect(validateMorph(shape, shape).map(({ code }) => code)).toContain("morph-self-intersection");
    expect(morphShapes(shape, shape, 0.5).mode).toBe("dissolve");
  });

  it("allows adjacent shared endpoints and an explicitly repeated closing vertex", () => {
    const contour = ring();
    contour.points.push({ ...contour.points[0] });
    const shape = { contours: [contour] };
    expect(validateMorph(shape, shape)).toEqual([]);
  });

  it.each([NaN, Infinity, -Infinity, 4097])("rejects an unsafe resample budget (%s) before evaluation", (resampleCount) => {
    // The endpoint assertion fails promptly on the old implementation, so the
    // Infinity regression never enters the old unbounded interior sampling loop.
    const shape = nestedShape();
    expect(() => morphShapes(shape, shape, 0, { resampleCount })).toThrow(RangeError);
    expect(() => morphShapes(shape, shape, 0.5, { resampleCount })).toThrow(/resampleCount/);
  });

  it("returns exact independent authored endpoints, including nested contours", () => {
    const from = nestedShape();
    const to = nestedShape();
    // Irregular vertex spacing must not be replaced by arc-length samples at the handoff.
    to.contours[0].points.splice(1, 0, { x: 2, y: 0 });
    for (const [progress, endpoint] of [[0, from], [1, to]] as const) {
      const result = morphShapes(from, to, progress, { resampleCount: 12 });
      expect(result.mode).toBe("morph");
      expect(result.contours).toEqual(endpoint.contours);
      expect(result.contours[0]).not.toBe(endpoint.contours[0]);
      expect(result.contours[0].holes![0].holes![0].points[0]).not.toBe(nestedHole(endpoint).points[0]);
    }
  });
});
