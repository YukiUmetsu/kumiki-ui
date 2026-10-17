import { describe, expect, it } from "vitest";
import type {
  AffineMatrix,
  AnimationTrack,
  ColorValue,
  EasingSpec,
  MotionNode,
  MotionTimeline,
  MotionValue,
} from "../registry/motion/types";
import {
  DEFAULT_FPS,
  MOTION_SCHEMA_VERSION,
  ceilFrame,
  clampFrame,
  floorFrame,
  framesToSeconds,
  fpsRatio,
  isFrameInRange,
  normalizeFps,
  roundFrameToNearest,
  secondsToFrames,
} from "../registry/motion/constants";
import {
  countBySeverity,
  createDiagnostic,
  hasBlockingDiagnostics,
  sortDiagnostics,
} from "../registry/motion/diagnostics";
import {
  IDENTITY,
  applyMatrixToPoint,
  applyMatrixToVector,
  composeMatrix,
  decomposeMatrix,
  interpolateMatrix,
  invertMatrix,
  lerpNumber,
  multiplyMatrix,
  normalizeAngle,
  resolveWorldTransforms,
  rotationMatrix,
  scaleMatrix,
  shortestAngleDelta,
  translationMatrix,
} from "../registry/motion/matrix";
import { EASING_NAMES, cubicBezier, evaluateEasing, isEasingSpec } from "../registry/motion/easing";
import {
  SPRING_PRESETS,
  resolveSpringPreset,
  springIsSettled,
  springSettleFrames,
  springValue,
} from "../registry/motion/springs";
import {
  formatColor,
  interpolateColor,
  interpolateValue,
  isDiscreteValueType,
  parseColor,
  sampleTrack,
  validateValue,
} from "../registry/motion/interpolate";
import {
  type EvalContext,
  applyInterruption,
  evaluateTimeline,
  nodeDuration,
  offsetFrames,
  outputKey,
  resolveCueFrames,
} from "../registry/motion/timeline";
import { staggerOrder, staggerStartFrames } from "../registry/motion/stagger";
import { validateTimeline } from "../registry/motion/validate";

type NumberKey = { frame: number; value: number; easing?: EasingSpec };

function numberTrack(
  id: string,
  targetId: string,
  property: string,
  keyframes: NumberKey[],
): AnimationTrack {
  return { id, targetId, property, valueType: "number", keyframes };
}

function emptyCtx(): EvalContext {
  return { fps: DEFAULT_FPS, cueFrames: {}, diagnostics: [] };
}

function timelineWith(nodes: MotionNode[], extra: Partial<MotionTimeline> = {}): MotionTimeline {
  return {
    schemaVersion: 1,
    id: "tl",
    fps: { num: 30, den: 1 },
    durationFrames: 100,
    nodes,
    ...extra,
  };
}

/* ------------------------------------------------------------------ *
 * constants
 * ------------------------------------------------------------------ */

describe("motion constants", () => {
  it("exposes the schema version and default fps", () => {
    expect(MOTION_SCHEMA_VERSION).toBe(1);
    expect(DEFAULT_FPS).toEqual({ num: 30, den: 1 });
  });

  it("converts frames <-> seconds exactly", () => {
    expect(framesToSeconds(30, { num: 30, den: 1 })).toBe(1);
    expect(framesToSeconds(15, { num: 30, den: 1 })).toBe(0.5);
    expect(secondsToFrames(1.5, { num: 24, den: 1 })).toBe(36);
    expect(secondsToFrames(2, { num: 60, den: 2 })).toBe(60);
    expect(secondsToFrames(1, { num: 30000, den: 1001 })).toBeCloseTo(29.97002997, 6);
  });

  it("rounds frames to nearest / floor / ceil", () => {
    expect(roundFrameToNearest(0.5, { num: 30, den: 1 })).toBe(15);
    expect(roundFrameToNearest(1 / 30 + 0.004, { num: 30, den: 1 })).toBe(1);
    expect(floorFrame((1 / 30) * 1.9, { num: 30, den: 1 })).toBe(1);
    expect(ceilFrame((1 / 30) * 1.1, { num: 30, den: 1 })).toBe(2);
  });

  it("clamps frames into the valid range", () => {
    expect(clampFrame(-5, 100)).toBe(0);
    expect(clampFrame(150, 100)).toBe(99);
    expect(clampFrame(42, 100)).toBe(42);
    expect(clampFrame(5, 0)).toBe(0);
  });

  it("treats ranges as end-exclusive", () => {
    expect(isFrameInRange(0, { startFrame: 0, endFrame: 10 })).toBe(true);
    expect(isFrameInRange(9, { startFrame: 0, endFrame: 10 })).toBe(true);
    expect(isFrameInRange(10, { startFrame: 0, endFrame: 10 })).toBe(false);
    expect(isFrameInRange(-1, { startFrame: 0, endFrame: 10 })).toBe(false);
  });

  it("normalizes fps by gcd and rejects non-positive input", () => {
    expect(normalizeFps({ num: 60, den: 120 })).toEqual({ num: 1, den: 2 });
    expect(normalizeFps({ num: 2, den: 4 })).toEqual({ num: 1, den: 2 });
    expect(normalizeFps({ num: 30, den: 1 })).toEqual(DEFAULT_FPS);
    expect(normalizeFps({ num: 0, den: 1 })).toEqual(DEFAULT_FPS);
    expect(normalizeFps({ num: 30, den: 0 })).toEqual(DEFAULT_FPS);
    expect(normalizeFps({ num: -30, den: 1 })).toEqual(DEFAULT_FPS);
    expect(normalizeFps({ num: 0, den: 1 })).not.toBe(DEFAULT_FPS);
    expect(fpsRatio({ num: 30000, den: 1001 })).toBeCloseTo(29.97003, 4);
  });
});

/* ------------------------------------------------------------------ *
 * diagnostics
 * ------------------------------------------------------------------ */

describe("motion diagnostics", () => {
  it("creates diagnostics with optional extras", () => {
    expect(createDiagnostic("x", "error", "boom", { frame: 3, sceneId: "s" })).toEqual({
      code: "x",
      severity: "error",
      message: "boom",
      frame: 3,
      sceneId: "s",
    });
  });

  it("counts severities and detects blockers", () => {
    const diags = [
      createDiagnostic("a", "warning", "1"),
      createDiagnostic("b", "error", "2"),
      createDiagnostic("c", "warning", "3"),
    ];
    expect(countBySeverity(diags)).toEqual({ error: 1, warning: 2 });
    expect(hasBlockingDiagnostics(diags)).toBe(true);
    expect(hasBlockingDiagnostics([diags[0], diags[2]])).toBe(false);
  });

  it("sorts stably by frame (missing last), severity, code, message", () => {
    const diags = [
      createDiagnostic("z", "warning", "m", { frame: 2 }),
      createDiagnostic("a", "error", "m", { frame: 2 }),
      createDiagnostic("a", "error", "m"),
      createDiagnostic("a", "warning", "m", { frame: 1 }),
    ];
    const sorted = sortDiagnostics(diags);
    expect(sorted.map((d) => `${d.frame ?? "-"}:${d.severity}:${d.code}`)).toEqual([
      "1:warning:a",
      "2:error:a",
      "2:warning:z",
      "-:error:a",
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * matrix
 * ------------------------------------------------------------------ */

describe("motion matrix", () => {
  it("applies and composes transforms", () => {
    expect(applyMatrixToPoint(translationMatrix(3, 4), { x: 1, y: 1 })).toEqual({ x: 4, y: 5 });
    expect(applyMatrixToVector(translationMatrix(3, 4), { x: 1, y: 1 })).toEqual({ x: 1, y: 1 });
    const applied = multiplyMatrix(translationMatrix(10, 0), scaleMatrix(2, 2));
    expect(applyMatrixToPoint(applied, { x: 1, y: 0 })).toEqual({ x: 22, y: 0 });
    const flipped = multiplyMatrix(scaleMatrix(2, 2), translationMatrix(10, 0));
    expect(applyMatrixToPoint(flipped, { x: 1, y: 0 })).toEqual({ x: 12, y: 0 });
    expect(applyMatrixToPoint(IDENTITY, { x: 3, y: -7 })).toEqual({ x: 3, y: -7 });
    const rotated = applyMatrixToPoint(rotationMatrix(Math.PI / 2), { x: 1, y: 0 });
    expect(rotated.x).toBeCloseTo(0, 9);
    expect(rotated.y).toBeCloseTo(1, 9);
  });

  it("inverts matrices and rejects singular ones", () => {
    const m = composeMatrix({ translate: { x: 5, y: -2 }, rotate: 0.7, scale: { x: 2, y: 3 } });
    const inv = invertMatrix(m);
    expect(inv).not.toBeNull();
    const round = multiplyMatrix(m, inv!);
    expect(round.a).toBeCloseTo(1, 9);
    expect(round.b).toBeCloseTo(0, 9);
    expect(round.c).toBeCloseTo(0, 9);
    expect(round.d).toBeCloseTo(1, 9);
    expect(round.e).toBeCloseTo(0, 9);
    expect(round.f).toBeCloseTo(0, 9);
    expect(invertMatrix(scaleMatrix(0, 1))).toBeNull();
  });

  it("round-trips compose <-> decompose", () => {
    const m = composeMatrix({
      translate: { x: 12, y: -4 },
      rotate: 0.5,
      scale: { x: 2, y: 3 },
      skew: { x: 0.1, y: 0 },
    });
    const d = decomposeMatrix(m);
    expect(d.translate.x).toBeCloseTo(12, 9);
    expect(d.translate.y).toBeCloseTo(-4, 9);
    expect(d.rotate).toBeCloseTo(0.5, 9);
    expect(d.scale.x).toBeCloseTo(2, 9);
    expect(d.scale.y).toBeCloseTo(3, 9);
    expect(d.skew).toBeCloseTo(0.1, 9);

    const rebuilt = composeMatrix({
      translate: d.translate,
      rotate: d.rotate,
      scale: d.scale,
      skew: { x: d.skew, y: 0 },
    });
    expect(rebuilt.a).toBeCloseTo(m.a, 9);
    expect(rebuilt.b).toBeCloseTo(m.b, 9);
    expect(rebuilt.c).toBeCloseTo(m.c, 9);
    expect(rebuilt.d).toBeCloseTo(m.d, 9);
    expect(rebuilt.e).toBeCloseTo(m.e, 9);
    expect(rebuilt.f).toBeCloseTo(m.f, 9);
  });

  it("applies a pivot origin", () => {
    const m = composeMatrix({ rotate: Math.PI / 2, origin: { x: 10, y: 0 } });
    const pivot = applyMatrixToPoint(m, { x: 10, y: 0 });
    expect(pivot.x).toBeCloseTo(10, 9);
    expect(pivot.y).toBeCloseTo(0, 9);
    const spun = applyMatrixToPoint(m, { x: 11, y: 0 });
    expect(spun.x).toBeCloseTo(10, 9);
    expect(spun.y).toBeCloseTo(1, 9);
  });

  it("interpolates endpoints exactly and midpoints predictably", () => {
    const a = composeMatrix({ translate: { x: 0, y: 0 }, rotate: 0.2, scale: { x: 1, y: 1 } });
    const b = composeMatrix({ translate: { x: 100, y: 50 }, rotate: 0.6, scale: { x: 4, y: 2 } });
    const at0 = interpolateMatrix(a, b, 0);
    expect(at0.a).toBeCloseTo(a.a, 9);
    expect(at0.e).toBeCloseTo(a.e, 9);
    const at1 = interpolateMatrix(a, b, 1);
    expect(at1.a).toBeCloseTo(b.a, 9);
    expect(at1.e).toBeCloseTo(b.e, 9);
    const mid = decomposeMatrix(interpolateMatrix(a, b, 0.5));
    expect(mid.translate.x).toBeCloseTo(50, 9);
    expect(mid.translate.y).toBeCloseTo(25, 9);
    expect(mid.scale.x).toBeCloseTo(2.5, 9);
    expect(mid.scale.y).toBeCloseTo(1.5, 9);
    expect(mid.rotate).toBeCloseTo(0.4, 9);
  });

  it("interpolates rotation on the shortest arc", () => {
    const a = rotationMatrix(3.0);
    const b = rotationMatrix(-3.0);
    const expected = 3.0 + shortestAngleDelta(3.0, -3.0) * 0.5;
    expect(expected).toBeCloseTo(Math.PI, 6);
    expect(decomposeMatrix(interpolateMatrix(a, b, 0.5)).rotate).toBeCloseTo(expected, 6);
  });

  it("normalizes angles and computes shortest deltas", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeAngle(1.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI, 12);
    expect(shortestAngleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 12);
    expect(shortestAngleDelta(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2, 12);
    expect(lerpNumber(2, 6, 0.25)).toBe(3);
  });

  it("resolves world transforms parent-before-child", () => {
    const { transforms, diagnostics } = resolveWorldTransforms([
      { id: "root", local: translationMatrix(10, 20) },
      { id: "child", parentId: "root", local: translationMatrix(5, 0) },
      { id: "grandchild", parentId: "child", local: scaleMatrix(2, 2) },
    ]);
    expect(diagnostics).toHaveLength(0);
    expect(applyMatrixToPoint(transforms.child, { x: 0, y: 0 })).toEqual({ x: 15, y: 20 });
    expect(applyMatrixToPoint(transforms.grandchild, { x: 1, y: 1 })).toEqual({ x: 17, y: 22 });
  });

  it("falls back to identity for missing and cyclic parents", () => {
    const missing = resolveWorldTransforms([
      { id: "orphan", parentId: "nope", local: translationMatrix(1, 2) },
    ]);
    expect(missing.diagnostics.map((d) => d.code)).toContain("transform-parent-missing");
    expect(applyMatrixToPoint(missing.transforms.orphan, { x: 0, y: 0 })).toEqual({ x: 1, y: 2 });

    const cyclic = resolveWorldTransforms([
      { id: "a", parentId: "b", local: translationMatrix(1, 0) },
      { id: "b", parentId: "a", local: translationMatrix(0, 1) },
    ]);
    expect(cyclic.diagnostics.filter((d) => d.code === "transform-parent-cycle")).toHaveLength(2);
    expect(applyMatrixToPoint(cyclic.transforms.a, { x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(applyMatrixToPoint(cyclic.transforms.b, { x: 0, y: 0 })).toEqual({ x: 0, y: 1 });
  });

  it("warns on duplicate transform ids and keeps the first", () => {
    const { transforms, diagnostics } = resolveWorldTransforms([
      { id: "n", local: translationMatrix(1, 0) },
      { id: "n", local: translationMatrix(9, 9) },
    ]);
    expect(diagnostics.some((d) => d.code === "transform-duplicate-id")).toBe(true);
    expect(applyMatrixToPoint(transforms.n, { x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
  });
});

/* ------------------------------------------------------------------ *
 * easing
 * ------------------------------------------------------------------ */

describe("motion easing", () => {
  it("enumerates every easing name and validates specs", () => {
    expect(EASING_NAMES).toContain("linear");
    expect(EASING_NAMES).toContain("ease-in-out-back");
    expect(EASING_NAMES).toContain("step-end");
    expect(new Set(EASING_NAMES).size).toBe(EASING_NAMES.length);
    expect(isEasingSpec("linear")).toBe(true);
    expect(isEasingSpec("nope")).toBe(false);
    expect(isEasingSpec({ cubicBezier: [0, 0, 1, 1] })).toBe(true);
    expect(isEasingSpec({ cubicBezier: [0, 0, 1] })).toBe(false);
    expect(isEasingSpec({ steps: 3 })).toBe(true);
    expect(isEasingSpec({ steps: 3, mode: "both" })).toBe(true);
    expect(isEasingSpec({ steps: 3, mode: "sideways" })).toBe(false);
    expect(isEasingSpec(null)).toBe(false);
  });

  it("is exact and clamped at the endpoints", () => {
    for (const name of EASING_NAMES) {
      expect(evaluateEasing(name, 0)).toBeCloseTo(0, 6);
      expect(evaluateEasing(name, 1)).toBeCloseTo(1, 6);
    }
    expect(evaluateEasing(undefined, 0.25)).toBe(0.25);
    expect(evaluateEasing("linear", -1)).toBe(0);
    expect(evaluateEasing("linear", 2)).toBe(1);
  });

  it("solves cubic beziers robustly", () => {
    const f = cubicBezier(0.42, 0, 0.58, 1);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(f(0.5)).toBeCloseTo(0.5, 6);
    let last = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const v = f(i / 100);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
    const clamped = cubicBezier(-5, 0, 5, 1);
    expect(clamped(-5)).toBe(0);
    expect(clamped(1.5)).toBe(1);
    expect(Number.isFinite(clamped(0.3))).toBe(true);
  });

  it("evaluates named power and CSS curves", () => {
    expect(evaluateEasing("ease-in-quad", 0.5)).toBeCloseTo(0.25, 9);
    expect(evaluateEasing("ease-out-quad", 0.5)).toBeCloseTo(0.75, 9);
    expect(evaluateEasing("ease-in-out-quad", 0.5)).toBeCloseTo(0.5, 9);
    expect(evaluateEasing("ease-in-cubic", 0.5)).toBeCloseTo(0.125, 9);
    expect(evaluateEasing("ease-out-cubic", 0.5)).toBeCloseTo(0.875, 9);
    expect(evaluateEasing("ease-in-out-cubic", 0.25)).toBeCloseTo(0.0625, 9);
    expect(evaluateEasing("ease-in-quart", 0.5)).toBeCloseTo(0.0625, 9);
    expect(evaluateEasing("ease-out-quart", 0.5)).toBeCloseTo(0.9375, 9);
    expect(evaluateEasing("ease-in", 0.5)).toBeGreaterThan(0);
    expect(evaluateEasing("ease-out", 0.5)).toBeLessThan(1);
    expect(evaluateEasing("ease-in-back", 0.5)).toBeLessThan(0.5);
    expect(evaluateEasing("ease-out-back", 0.5)).toBeGreaterThan(0.5);
  });

  it("is monotonic for monotonic curves", () => {
    const names: (typeof EASING_NAMES)[number][] = [
      "linear",
      "ease-in",
      "ease-out",
      "ease-in-out",
      "ease-in-quad",
      "ease-out-quad",
      "ease-in-out-quad",
      "ease-in-cubic",
      "ease-out-cubic",
      "ease-in-out-cubic",
      "ease-in-quart",
      "ease-out-quart",
      "ease-in-expo",
      "ease-out-expo",
    ];
    for (const name of names) {
      let last = -Infinity;
      for (let i = 0; i <= 50; i += 1) {
        const v = evaluateEasing(name, i / 50);
        expect(v).toBeGreaterThanOrEqual(last - 1e-9);
        last = v;
      }
    }
  });

  it("evaluates steps with start / end / both modes", () => {
    expect(evaluateEasing({ steps: 4, mode: "end" }, 0.24)).toBeCloseTo(0, 9);
    expect(evaluateEasing({ steps: 4, mode: "end" }, 0.25)).toBeCloseTo(0.25, 9);
    expect(evaluateEasing({ steps: 4, mode: "end" }, 0.99)).toBeCloseTo(0.75, 9);
    expect(evaluateEasing({ steps: 4, mode: "start" }, 0)).toBe(0);
    expect(evaluateEasing({ steps: 4, mode: "start" }, 0.01)).toBeCloseTo(0.25, 9);
    expect(evaluateEasing({ steps: 4, mode: "both" }, 0)).toBeCloseTo(0.2, 9);
    expect(evaluateEasing({ steps: 4, mode: "both" }, 1)).toBeCloseTo(1, 9);
    expect(evaluateEasing("step-start", 0)).toBe(0);
    expect(evaluateEasing("step-start", 0.5)).toBe(1);
    expect(evaluateEasing("step-end", 0.5)).toBe(0);
    expect(evaluateEasing("step-end", 1)).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * springs
 * ------------------------------------------------------------------ */

describe("motion springs", () => {
  const under = { mass: 1, stiffness: 100, damping: 5 };
  const critical = { mass: 1, stiffness: 100, damping: 20 };
  const over = { mass: 1, stiffness: 100, damping: 40 };

  it("starts at exactly zero and stays finite", () => {
    for (const params of [under, critical, over]) {
      expect(springValue(0, params)).toBe(0);
      for (let i = 0; i <= 500; i += 1) {
        expect(Number.isFinite(springValue(i / 50, params))).toBe(true);
      }
      expect(springValue(50, params)).toBeCloseTo(1, 6);
    }
  });

  it("approaches 1 in every regime", () => {
    expect(springValue(20, under)).toBeCloseTo(1, 3);
    expect(springValue(20, critical)).toBeCloseTo(1, 6);
    expect(springValue(20, over)).toBeCloseTo(1, 6);
  });

  it("is monotonic for critical and overdamped regimes", () => {
    for (const params of [critical, over]) {
      let last = -Infinity;
      for (let i = 0; i <= 200; i += 1) {
        const v = springValue(i / 20, params);
        expect(v).toBeGreaterThanOrEqual(last - 1e-9);
        last = v;
      }
    }
  });

  it("honours initial velocity without breaking the t=0 value", () => {
    expect(springValue(0, { ...under, velocity: 5 })).toBe(0);
    expect(springValue(0.1, { ...under, velocity: 5 })).not.toBe(springValue(0.1, under));
  });

  it("is finite even for degenerate params", () => {
    expect(springValue(1, { mass: 1, stiffness: 0, damping: 10 })).toBe(1);
    expect(springValue(1, { mass: 0, stiffness: 100, damping: 10 })).toBeCloseTo(
      springValue(1, { mass: 1, stiffness: 100, damping: 10 }),
      9,
    );
    expect(Number.isFinite(springValue(1, { mass: 1, stiffness: 100, damping: -5 }))).toBe(true);
    expect(springValue(-1, under)).toBe(0);
  });

  it("reports settled times within the cap", () => {
    const params = resolveSpringPreset("settle");
    const frames = springSettleFrames(params, { num: 60, den: 1 });
    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThanOrEqual(600);
    expect(springIsSettled(frames / 60, params)).toBe(true);
  });

  it("resolves presets and rejects unknown names", () => {
    expect(Object.keys(SPRING_PRESETS).sort()).toEqual([
      "bouncy",
      "gentle",
      "heavy",
      "settle",
      "snappy",
    ]);
    for (const name of Object.keys(SPRING_PRESETS)) {
      expect(SPRING_PRESETS[name].version).toBe(1);
    }
    expect(resolveSpringPreset("gentle", { damping: 9 }).damping).toBe(9);
    expect(resolveSpringPreset("gentle")).toEqual(SPRING_PRESETS.gentle.params);
    expect(() => resolveSpringPreset("nope")).toThrowError(/Available presets/);
  });
});

/* ------------------------------------------------------------------ *
 * interpolation
 * ------------------------------------------------------------------ */

describe("motion interpolation", () => {
  it("classifies discrete value types", () => {
    expect(isDiscreteValueType("discrete")).toBe(true);
    expect(isDiscreteValueType("boolean")).toBe(true);
    expect(isDiscreteValueType("path")).toBe(true);
    expect(isDiscreteValueType("number")).toBe(false);
    expect(isDiscreteValueType("color")).toBe(false);
  });

  it("parses and formats colours", () => {
    expect(parseColor("#f00")).toEqual({ space: "srgb", r: 255, g: 0, b: 0, alpha: 1 });
    expect(parseColor("#00ff00")).toEqual({ space: "srgb", r: 0, g: 255, b: 0, alpha: 1 });
    expect(parseColor("#010203")).toEqual({ space: "srgb", r: 1, g: 2, b: 3, alpha: 1 });
    expect(parseColor("#0000ff80").alpha).toBeCloseTo(128 / 255, 9);
    expect(parseColor("rgb(10, 20, 30)")).toEqual({ space: "srgb", r: 10, g: 20, b: 30, alpha: 1 });
    expect(parseColor("rgba(10,20,30,0.5)")).toEqual({
      space: "srgb",
      r: 10,
      g: 20,
      b: 30,
      alpha: 0.5,
    });
    const passthrough: ColorValue = { space: "linear-rgb", r: 1, g: 1, b: 1, alpha: 1 };
    expect(parseColor(passthrough)).toEqual(passthrough);
    expect(() => parseColor("nope")).toThrowError(/Invalid color/);
    expect(() => parseColor("#12")).toThrowError(/Invalid color/);
    expect(formatColor({ space: "srgb", r: 255.4, g: 0, b: 10.6, alpha: 0.5 })).toBe(
      "rgba(255, 0, 11, 0.5)",
    );
  });

  it("interpolates colours and values per type", () => {
    const a: ColorValue = { space: "srgb", r: 0, g: 0, b: 0, alpha: 1 };
    const b: ColorValue = { space: "srgb", r: 100, g: 200, b: 50, alpha: 0.5 };
    expect(interpolateColor(a, b, 0.5)).toEqual({ space: "srgb", r: 50, g: 100, b: 25, alpha: 0.75 });

    expect(interpolateValue("number", 0, 100, 0.25)).toBe(25);
    expect(interpolateValue("opacity", 1, 0, 0.5)).toBe(0.5);
    expect(interpolateValue("length", 0, 10, 0.5)).toBe(5);
    expect(interpolateValue("vec2", { x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({
      x: 5,
      y: 10,
    });
    expect(interpolateValue("angle", 3.0, -3.0, 0.5)).toBeCloseTo(Math.PI, 6);
    expect(interpolateValue("angle", 3.0, -3.0, 0.5, { angleMode: "full-turn" })).toBeCloseTo(0, 9);
    const matrix = interpolateValue(
      "transform",
      composeMatrix({ translate: { x: 0, y: 0 } }),
      composeMatrix({ translate: { x: 10, y: 0 } }),
      0.5,
    ) as AffineMatrix;
    expect(matrix.e).toBeCloseTo(5, 9);
    expect(interpolateValue("color", a, b, 0.5)).toEqual({
      space: "srgb",
      r: 50,
      g: 100,
      b: 25,
      alpha: 0.75,
    });
  });

  it("steps discrete value types at the end of a segment", () => {
    expect(interpolateValue("boolean", false, true, 0.99)).toBe(false);
    expect(interpolateValue("boolean", false, true, 1)).toBe(true);
    expect(interpolateValue("discrete", "a", "b", 0.5)).toBe("a");
    expect(interpolateValue("discrete", "a", "b", 1)).toBe("b");
    expect(interpolateValue("path", "M0 0", "M1 1", 0.5)).toBe("M0 0");
  });

  it("validates values against their declared type", () => {
    expect(validateValue("number", 1)).toBeNull();
    expect(validateValue("number", "x" as unknown as MotionValue)?.code).toBe(
      "motion-value-type-mismatch",
    );
    expect(validateValue("vec2", { x: 1, y: 2 })).toBeNull();
    expect(validateValue("vec2", 3)?.code).toBe("motion-value-type-mismatch");
    expect(validateValue("transform", IDENTITY)).toBeNull();
    expect(validateValue("color", { space: "srgb", r: 0, g: 0, b: 0, alpha: 1 })).toBeNull();
    expect(validateValue("boolean", true)).toBeNull();
    expect(validateValue("path", "M0 0")).toBeNull();
    expect(validateValue("discrete", { anything: true } as unknown as MotionValue)).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * sampleTrack
 * ------------------------------------------------------------------ */

describe("sampleTrack", () => {
  it("returns first / last values outside the keyframe range", () => {
    const track = numberTrack("a", "t", "p", [
      { frame: 10, value: 100 },
      { frame: 20, value: 200 },
    ]);
    expect(sampleTrack(track, 0).value).toBe(100);
    expect(sampleTrack(track, 15).value).toBe(150);
    expect(sampleTrack(track, 20).value).toBe(200);
    expect(sampleTrack(track, 99).value).toBe(200);
  });

  it("applies segment easing", () => {
    const track = numberTrack("a", "t", "p", [
      { frame: 0, value: 0 },
      { frame: 10, value: 100, easing: "ease-in-quad" },
    ]);
    expect(sampleTrack(track, 5).value).toBeCloseTo(25, 9);
  });

  it("flags unsorted input but still samples", () => {
    const track = numberTrack("a", "t", "p", [
      { frame: 10, value: 100 },
      { frame: 0, value: 0 },
    ]);
    const result = sampleTrack(track, 5);
    expect(result.diagnostics.some((d) => d.code === "motion-keyframe-unordered")).toBe(true);
    expect(result.value).toBe(50);
  });

  it("cuts discretely on duplicate frames (last wins)", () => {
    const track = numberTrack("a", "t", "p", [
      { frame: 0, value: 0 },
      { frame: 5, value: 1 },
      { frame: 5, value: 2 },
      { frame: 10, value: 3 },
    ]);
    const result = sampleTrack(track, 5);
    expect(result.diagnostics.some((d) => d.code === "motion-keyframe-duplicate-frame")).toBe(true);
    expect(result.value).toBe(2);
    expect(sampleTrack(track, 4).value).toBeCloseTo(1.6, 9);
  });

  it("reports empty tracks", () => {
    const result = sampleTrack(numberTrack("a", "t", "p", []), 0);
    expect(result.value).toBeNull();
    expect(result.diagnostics.some((d) => d.code === "motion-keyframe-empty")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * stagger
 * ------------------------------------------------------------------ */

describe("motion stagger", () => {
  it("orders forward and reverse", () => {
    expect(staggerOrder(4, "forward")).toEqual([0, 1, 2, 3]);
    expect(staggerOrder(4, "reverse")).toEqual([3, 2, 1, 0]);
  });

  it("orders from the center, ties by lower index", () => {
    expect(staggerOrder(5, "from-center")).toEqual([3, 1, 0, 2, 4]);
    expect(staggerOrder(4, "from-center")).toEqual([2, 0, 1, 3]);
  });

  it("orders from the edges", () => {
    expect(staggerOrder(5, "from-edges")).toEqual([0, 2, 4, 3, 1]);
  });

  it("computes start frames with groups", () => {
    expect(staggerStartFrames([{}, {}, {}], 5, "forward")).toEqual([0, 5, 10]);
    expect(
      staggerStartFrames([{ group: 0 }, { group: 0 }, { group: 1 }], 5, "forward", 2),
    ).toEqual([0, 5, 7]);
    expect(
      staggerStartFrames([{}, { group: 1 }, {}], 5, "forward", 2),
    ).toEqual([0, 7, 5]);
    expect(
      staggerStartFrames([{ group: 2 }, { group: 0 }, { group: 0 }], 4, "reverse"),
    ).toEqual([4, 4, 0]);
  });

  it("returns an empty array for no items", () => {
    expect(staggerStartFrames([], 5, "forward")).toEqual([]);
    expect(staggerOrder(0, "from-center")).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * timeline: cues / offsets
 * ------------------------------------------------------------------ */

describe("motion timeline cues and offsets", () => {
  it("resolves cues once, first occurrence wins", () => {
    const result = resolveCueFrames([
      { id: "a", frame: 10 },
      { id: "a", frame: 20 },
      { id: "b", frame: 5 },
    ]);
    expect(result.frames).toEqual({ a: 10, b: 5 });
    expect(result.diagnostics.some((d) => d.code === "motion-cue-duplicate")).toBe(true);
  });

  it("rejects invalid cue frames", () => {
    const result = resolveCueFrames([
      { id: "bad", frame: -1 },
      { id: "frac", frame: 1.5 },
    ]);
    expect(result.frames).toEqual({});
    expect(result.diagnostics.filter((d) => d.code === "motion-cue-invalid")).toHaveLength(2);
  });

  it("resolves offsets and reports missing cues once", () => {
    const ctx = emptyCtx();
    ctx.cueFrames = { hit: 12 };
    expect(offsetFrames(undefined, ctx)).toBe(0);
    expect(offsetFrames(7, ctx)).toBe(7);
    expect(offsetFrames({ cue: "hit" }, ctx)).toBe(12);
    expect(offsetFrames({ cue: "gone" }, ctx)).toBe(0);
    expect(ctx.diagnostics.filter((d) => d.code === "motion-cue-missing")).toHaveLength(1);
    offsetFrames({ cue: "gone" }, ctx);
    expect(ctx.diagnostics.filter((d) => d.code === "motion-cue-missing")).toHaveLength(1);
  });

  it("keys output by target id and property", () => {
    expect(outputKey("box", "x")).toBe("box.x");
  });
});

/* ------------------------------------------------------------------ *
 * timeline: duration
 * ------------------------------------------------------------------ */

describe("nodeDuration", () => {
  const a: MotionNode = {
    kind: "track",
    id: "a",
    track: numberTrack("a", "a", "x", [
      { frame: 0, value: 0 },
      { frame: 10, value: 1 },
    ]),
  };
  const b: MotionNode = {
    kind: "track",
    id: "b",
    track: numberTrack("b", "b", "x", [
      { frame: 0, value: 0 },
      { frame: 4, value: 1 },
    ]),
  };
  const long: MotionNode = {
    kind: "track",
    id: "long",
    track: numberTrack("long", "long", "x", [
      { frame: 0, value: 0 },
      { frame: 20, value: 1 },
    ]),
  };

  it("measures a track span and ignores single keyframes", () => {
    expect(nodeDuration(a, emptyCtx())).toBe(10);
    expect(
      nodeDuration(
        { kind: "track", id: "solo", track: numberTrack("solo", "a", "x", [{ frame: 5, value: 0 }]) },
        emptyCtx(),
      ),
    ).toBe(0);
  });

  it("measures sequence / parallel / hold / repeat", () => {
    expect(nodeDuration({ kind: "sequence", id: "s", children: [a, b] }, emptyCtx())).toBe(14);
    expect(
      nodeDuration({ kind: "parallel", id: "p", children: [a, { ...long, offset: 5 }] }, emptyCtx()),
    ).toBe(25);
    expect(nodeDuration({ kind: "hold", id: "h", durationFrames: 8, child: a }, emptyCtx())).toBe(8);
    expect(nodeDuration({ kind: "repeat", id: "r", count: 3, child: a }, emptyCtx())).toBe(30);
    expect(nodeDuration({ kind: "repeat", id: "r", count: 0, child: a }, emptyCtx())).toBe(10);
  });

  it("warns when a hold is shorter than its child", () => {
    const ctx = emptyCtx();
    expect(nodeDuration({ kind: "hold", id: "h", durationFrames: 5, child: long }, ctx)).toBe(5);
    expect(ctx.diagnostics.some((d) => d.code === "motion-hold-child-overflow")).toBe(true);
  });

  it("measures stagger as the last item end", () => {
    const item = (id: string) => ({
      id,
      node: {
        kind: "track" as const,
        id,
        track: numberTrack(id, id, "x", [
          { frame: 0, value: 0 },
          { frame: 10, value: 1 },
        ]),
      },
    });
    const stagger: MotionNode = {
      kind: "stagger",
      id: "st",
      intervalFrames: 5,
      direction: "forward",
      items: [item("a"), item("b"), item("c")],
    };
    expect(nodeDuration(stagger, emptyCtx())).toBe(20);
  });
});

/* ------------------------------------------------------------------ *
 * timeline: evaluation
 * ------------------------------------------------------------------ */

describe("timeline evaluation", () => {
  it("evaluates a sequence with no hidden delays", () => {
    const a: MotionNode = {
      kind: "track",
      id: "a",
      track: numberTrack("a", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const b: MotionNode = {
      kind: "track",
      id: "b",
      track: numberTrack("b", "box", "y", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const tl = timelineWith([{ kind: "sequence", id: "s", children: [a, b] }]);
    expect(evaluateTimeline(tl, 5).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 5).samples["box.y"].value).toBe(0);
    expect(evaluateTimeline(tl, 15).samples["box.x"].value).toBe(100);
    expect(evaluateTimeline(tl, 15).samples["box.y"].value).toBe(50);
  });

  it("applies child offsets inside sequences", () => {
    const a: MotionNode = {
      kind: "track",
      id: "a",
      offset: 5,
      track: numberTrack("a", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const b: MotionNode = {
      kind: "track",
      id: "b",
      track: numberTrack("b", "box", "y", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const tl = timelineWith([{ kind: "sequence", id: "s", children: [a, b] }]);
    expect(evaluateTimeline(tl, 10).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 15).samples["box.y"].value).toBe(0);
    expect(evaluateTimeline(tl, 20).samples["box.y"].value).toBe(50);
  });

  it("evaluates parallel children from their offsets", () => {
    const a: MotionNode = {
      kind: "track",
      id: "a",
      track: numberTrack("a", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const b: MotionNode = {
      kind: "track",
      id: "b",
      offset: 5,
      track: numberTrack("b", "box", "y", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const tl = timelineWith([{ kind: "parallel", id: "p", children: [a, b] }]);
    expect(evaluateTimeline(tl, 5).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 5).samples["box.y"].value).toBe(0);
    expect(evaluateTimeline(tl, 12).samples["box.y"].value).toBeCloseTo(70, 9);
  });

  it("loops repeats with modulo", () => {
    const child: MotionNode = {
      kind: "track",
      id: "c",
      track: numberTrack("c", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const tl = timelineWith([{ kind: "repeat", id: "r", count: 3, child }]);
    expect(evaluateTimeline(tl, 5).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 10).samples["box.x"].value).toBe(0);
    expect(evaluateTimeline(tl, 15).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 29).samples["box.x"].value).toBeCloseTo(90, 9);
    expect(evaluateTimeline(tl, 30).samples["box.x"]).toBeUndefined();
  });

  it("nests repeats inside sequences", () => {
    const child: MotionNode = {
      kind: "track",
      id: "c",
      track: numberTrack("c", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const repeat: MotionNode = { kind: "repeat", id: "r", count: 2, child };
    const tail: MotionNode = {
      kind: "track",
      id: "t",
      track: numberTrack("t", "box", "y", [
        { frame: 0, value: 0 },
        { frame: 5, value: 50 },
      ]),
    };
    const tl = timelineWith([{ kind: "sequence", id: "s", children: [repeat, tail] }]);
    expect(nodeDuration(tl.nodes[0], emptyCtx())).toBe(25);
    expect(evaluateTimeline(tl, 15).samples["box.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 22).samples["box.y"].value).toBe(20);
  });

  it("gates holds to their window", () => {
    const child: MotionNode = {
      kind: "track",
      id: "c",
      track: numberTrack("c", "box", "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    };
    const tl = timelineWith([{ kind: "hold", id: "h", durationFrames: 10, offset: 3, child }]);
    expect(evaluateTimeline(tl, 2).samples["box.x"]).toBeUndefined();
    expect(evaluateTimeline(tl, 7).samples["box.x"].value).toBe(40);
    expect(evaluateTimeline(tl, 13).samples["box.x"]).toBeUndefined();
  });

  it("staggers child start frames", () => {
    const make = (id: string): MotionNode => ({
      kind: "track",
      id,
      track: numberTrack(id, `t${id}`, "x", [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ]),
    });
    const tl = timelineWith([
      {
        kind: "stagger",
        id: "st",
        intervalFrames: 5,
        direction: "forward",
        items: [
          { id: "a", node: make("a") },
          { id: "b", node: make("b") },
        ],
      },
    ]);
    expect(evaluateTimeline(tl, 5).samples["ta.x"].value).toBe(50);
    expect(evaluateTimeline(tl, 5).samples["tb.x"].value).toBe(0);
    expect(evaluateTimeline(tl, 10).samples["tb.x"].value).toBe(50);
  });

  it("reports duplicate writers and keeps the first", () => {
    const tl = timelineWith([
      {
        kind: "track",
        id: "a",
        track: numberTrack("a", "box", "x", [
          { frame: 0, value: 0 },
          { frame: 10, value: 1 },
        ]),
      },
      {
        kind: "track",
        id: "b",
        track: numberTrack("b", "box", "x", [
          { frame: 0, value: 0 },
          { frame: 10, value: 2 },
        ]),
      },
    ]);
    const result = evaluateTimeline(tl, 5);
    expect(result.diagnostics.some((d) => d.code === "motion-duplicate-writer")).toBe(true);
    expect(result.samples["box.x"].value).toBeCloseTo(0.5, 9);
    expect(result.samples["box.x"].sourceId).toBe("a");
  });

  it("blends additive writers", () => {
    const tl = timelineWith([
      {
        kind: "track",
        id: "a",
        track: {
          ...numberTrack("a", "box", "x", [
            { frame: 0, value: 0 },
            { frame: 10, value: 10 },
          ]),
          conflict: "additive",
        },
      },
      {
        kind: "track",
        id: "b",
        track: {
          ...numberTrack("b", "box", "x", [
            { frame: 0, value: 0 },
            { frame: 10, value: 20 },
          ]),
          conflict: "additive",
        },
      },
    ]);
    const result = evaluateTimeline(tl, 5);
    expect(result.diagnostics.some((d) => d.code === "motion-duplicate-writer")).toBe(false);
    expect(result.samples["box.x"].value).toBeCloseTo(15, 9);
  });

  it("resolves priority conflicts and warns on ties", () => {
    const base = numberTrack("b", "box", "x", [
      { frame: 0, value: 0 },
      { frame: 10, value: 10 },
    ]);
    const tl = timelineWith([
      { kind: "track", id: "lo", track: { ...base, id: "lo", conflict: "priority", priority: 1 } },
      {
        kind: "track",
        id: "hi",
        track: {
          ...base,
          id: "hi",
          conflict: "priority",
          priority: 5,
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 10, value: 100 },
          ],
        },
      },
    ]);
    const result = evaluateTimeline(tl, 5);
    expect(result.samples["box.x"].value).toBe(50);
    expect(result.samples["box.x"].sourceId).toBe("hi");

    const tieTl = timelineWith([
      { kind: "track", id: "p", track: { ...base, id: "p", conflict: "priority", priority: 2 } },
      {
        kind: "track",
        id: "q",
        track: {
          ...base,
          id: "q",
          conflict: "priority",
          priority: 2,
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 10, value: 100 },
          ],
        },
      },
    ]);
    const tieResult = evaluateTimeline(tieTl, 5);
    expect(tieResult.diagnostics.some((d) => d.code === "motion-priority-tie")).toBe(true);
    expect(tieResult.samples["box.x"].value).toBe(5);
    expect(tieResult.samples["box.x"].sourceId).toBe("p");
  });

  it("applies pinned overrides with a warning", () => {
    const tl = timelineWith([
      {
        kind: "track",
        id: "a",
        track: numberTrack("a", "box", "x", [
          { frame: 0, value: 0 },
          { frame: 10, value: 10 },
        ]),
      },
    ]);
    const result = evaluateTimeline(tl, 5, { "box.x": 999 });
    expect(result.samples["box.x"].value).toBe(999);
    expect(result.samples["box.x"].sourceId).toBe("pinned");
    expect(result.diagnostics.some((d) => d.code === "motion-pinned-override")).toBe(true);

    const added = evaluateTimeline(tl, 5, { "other.y": 3 });
    expect(added.samples["other.y"].value).toBe(3);
    expect(added.samples["other.y"].valueType).toBe("number");
    expect(added.diagnostics.some((d) => d.code === "motion-pinned-override")).toBe(false);
  });

  it("warns on out-of-range frames and clamps", () => {
    const tl = timelineWith(
      [
        {
          kind: "track",
          id: "a",
          track: numberTrack("a", "box", "x", [
            { frame: 0, value: 0 },
            { frame: 10, value: 10 },
          ]),
        },
      ],
      { durationFrames: 10 },
    );
    const result = evaluateTimeline(tl, 50);
    expect(result.frame).toBe(9);
    expect(result.samples["box.x"].value).toBe(9);
    expect(result.diagnostics.some((d) => d.code === "motion-frame-out-of-range")).toBe(true);
  });

  it("reports invalid fps and duration", () => {
    const tl = timelineWith([], { fps: { num: 0, den: 1 }, durationFrames: -5 });
    const result = evaluateTimeline(tl, 0);
    expect(result.diagnostics.some((d) => d.code === "motion-fps-invalid")).toBe(true);
    expect(result.diagnostics.some((d) => d.code === "motion-duration-invalid")).toBe(true);
  });

  it("resolves world transforms alongside samples", () => {
    const tl = timelineWith([], {
      transforms: [
        { id: "root", local: translationMatrix(10, 10) },
        { id: "child", parentId: "root", local: scaleMatrix(2, 2) },
      ],
    });
    const result = evaluateTimeline(tl, 0);
    expect(applyMatrixToPoint(result.transforms.child, { x: 1, y: 1 })).toEqual({ x: 12, y: 12 });
  });
});

/* ------------------------------------------------------------------ *
 * timeline: constraints
 * ------------------------------------------------------------------ */

describe("motion constraints", () => {
  it("look-at writes an angle toward a point", () => {
    const tl = timelineWith(
      [
        {
          kind: "track",
          id: "pos",
          track: {
            id: "pos",
            targetId: "box",
            property: "position",
            valueType: "vec2",
            keyframes: [{ frame: 0, value: { x: 10, y: 10 } }],
          },
        },
      ],
      {
        constraints: [
          { kind: "look-at", id: "c", targetId: "box", property: "angle", towards: { x: 10, y: 20 } },
        ],
      },
    );
    const result = evaluateTimeline(tl, 0);
    expect(result.samples["box.angle"].value).toBeCloseTo(Math.PI / 2, 9);
    expect(result.samples["box.angle"].valueType).toBe("angle");
  });

  it("follow copies a source vec2 plus an offset", () => {
    const tl = timelineWith(
      [
        {
          kind: "track",
          id: "src",
          track: {
            id: "src",
            targetId: "leader",
            property: "position",
            valueType: "vec2",
            keyframes: [{ frame: 0, value: { x: 5, y: 5 } }],
          },
        },
      ],
      {
        constraints: [
          {
            kind: "follow",
            id: "c",
            targetId: "follower",
            sourceId: "leader",
            property: "position",
            offset: { x: 1, y: 2 },
          },
        ],
      },
    );
    expect(evaluateTimeline(tl, 0).samples["follower.position"].value).toEqual({ x: 6, y: 7 });
  });

  it("distance-anchor places a point at a polar offset", () => {
    const tl = timelineWith([], {
      constraints: [
        {
          kind: "distance-anchor",
          id: "c",
          targetId: "sat",
          property: "position",
          anchor: { x: 2, y: 3 },
          distance: 5,
          angle: 0,
        },
      ],
    });
    expect(evaluateTimeline(tl, 0).samples["sat.position"].value).toEqual({ x: 7, y: 3 });
  });

  it("bounds clamps or rejects", () => {
    const nodes: MotionNode[] = [
      {
        kind: "track",
        id: "pos",
        track: {
          id: "pos",
          targetId: "box",
          property: "position",
          valueType: "vec2",
          keyframes: [{ frame: 0, value: { x: -5, y: 200 } }],
        },
      },
    ];
    const clampTl = timelineWith(nodes, {
      constraints: [
        {
          kind: "bounds",
          id: "c",
          targetId: "box",
          property: "position",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          mode: "clamp",
        },
      ],
    });
    const clamped = evaluateTimeline(clampTl, 0);
    expect(clamped.samples["box.position"].value).toEqual({ x: 0, y: 100 });
    expect(clamped.diagnostics.some((d) => d.code === "motion-constraint-clamped")).toBe(true);

    const rejectTl = timelineWith(nodes, {
      constraints: [
        {
          kind: "bounds",
          id: "c",
          targetId: "box",
          property: "position",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          mode: "reject",
        },
      ],
    });
    const rejected = evaluateTimeline(rejectTl, 0);
    expect(rejected.samples["box.position"].value).toEqual({ x: -5, y: 200 });
    expect(rejected.diagnostics.some((d) => d.code === "motion-constraint-violated")).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * timeline: determinism
 * ------------------------------------------------------------------ */

function complexTimeline(): MotionTimeline {
  const opacityTrack: AnimationTrack = {
    id: "op",
    targetId: "box",
    property: "opacity",
    valueType: "opacity",
    keyframes: [
      { frame: 0, value: 1 },
      { frame: 5, value: 0 },
    ],
  };
  return {
    schemaVersion: 1,
    id: "complex",
    fps: { num: 30, den: 1 },
    durationFrames: 80,
    cues: [
      { id: "go", frame: 4 },
      { id: "go", frame: 40 },
    ],
    transforms: [
      { id: "root", local: translationMatrix(10, 10) },
      { id: "child", parentId: "root", local: scaleMatrix(2, 2) },
    ],
    constraints: [
      { kind: "look-at", id: "c1", targetId: "arrow", property: "angle", towards: { x: 0, y: 0 } },
    ],
    nodes: [
      {
        kind: "sequence",
        id: "seq",
        children: [
          {
            kind: "track",
            id: "x",
            track: numberTrack("x", "box", "x", [
              { frame: 0, value: 0 },
              { frame: 10, value: 100 },
            ]),
          },
          {
            kind: "parallel",
            id: "par",
            children: [
              {
                kind: "track",
                id: "y",
                track: numberTrack("y", "box", "y", [
                  { frame: 0, value: 0 },
                  { frame: 10, value: 50 },
                ]),
              },
              { kind: "repeat", id: "rep", count: 2, child: { kind: "track", id: "op", track: opacityTrack } },
            ],
          },
        ],
      },
      {
        kind: "track",
        id: "pos",
        track: {
          id: "pos",
          targetId: "arrow",
          property: "position",
          valueType: "vec2",
          keyframes: [
            { frame: 0, value: { x: 3, y: 4 } },
            { frame: 20, value: { x: 10, y: 20 } },
          ],
        },
      },
      {
        kind: "hold",
        id: "hold",
        durationFrames: 10,
        offset: { cue: "go" },
        child: {
          kind: "track",
          id: "hx",
          track: numberTrack("hx", "gate", "x", [
            { frame: 0, value: 0 },
            { frame: 10, value: 1 },
          ]),
        },
      },
    ],
  };
}

describe("timeline determinism", () => {
  it("evaluates the same frame twice identically", () => {
    const tl = complexTimeline();
    expect(evaluateTimeline(tl, 17, { "box.x": 7 })).toEqual(evaluateTimeline(tl, 17, { "box.x": 7 }));
  });

  it("is order independent across many frames and orderings", () => {
    const tl = complexTimeline();
    const pinned = { "box.x": 7 };
    const frames = Array.from({ length: 40 }, (_, i) => i * 2);
    const baseline = new Map(frames.map((f) => [f, evaluateTimeline(tl, f, pinned)]));

    for (const f of [...frames].reverse()) {
      const result = evaluateTimeline(tl, f, pinned);
      expect(result.samples).toEqual(baseline.get(f)!.samples);
      expect(result).toEqual(baseline.get(f));
    }

    // A deterministic permutation (index stepping by 7) still matches.
    for (let i = 0; i < frames.length; i += 1) {
      const f = frames[(i * 7) % frames.length];
      expect(evaluateTimeline(tl, f, pinned).samples).toEqual(baseline.get(f)!.samples);
    }
  });
});

/* ------------------------------------------------------------------ *
 * timeline: interruption
 * ------------------------------------------------------------------ */

describe("applyInterruption", () => {
  it("carries the current value into a new seeded track without mutating input", () => {
    const original = timelineWith([
      {
        kind: "track",
        id: "old",
        track: {
          ...numberTrack("old", "box", "x", [
            { frame: 0, value: 0 },
            { frame: 100, value: 100 },
          ]),
          conflict: "priority",
          priority: 0,
        },
      },
    ]);
    const incoming: AnimationTrack = {
      ...numberTrack("new", "box", "x", [
        { frame: 80, value: 200 },
        { frame: 100, value: 300 },
      ]),
      conflict: "priority",
      priority: 10,
    };
    const snapshot = JSON.stringify(original);

    const result = applyInterruption(original, {
      frame: 50,
      targetId: "box",
      property: "x",
      track: incoming,
    });

    expect(result.startValue).toBe(50);
    expect(result.velocity).toBe(1);
    expect(result.diagnostics.some((d) => d.code === "motion-interrupted")).toBe(true);

    // input is untouched
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(original.nodes).toHaveLength(1);
    expect(incoming.keyframes).toHaveLength(2);

    // the new node is prepended with the carried value
    const seeded = result.timeline.nodes[result.timeline.nodes.length - 1];
    expect(seeded.kind).toBe("track");
    if (seeded.kind === "track") {
      expect(seeded.track.keyframes[0]).toEqual({ frame: 50, value: 50 });
      expect(seeded.track.keyframes).toHaveLength(3);
      expect(sampleTrack(seeded.track, 50).value).toBe(50);
    }

    // continuity: the resolved value at the interruption frame is unchanged
    const after = evaluateTimeline(result.timeline, 50);
    expect(after.samples["box.x"].value).toBe(50);
    expect(after.samples["box.x"].sourceId).toBe("new-interrupt-50");
  });

  it("reports a zero velocity when the prior value is not numeric", () => {
    const original = timelineWith([
      {
        kind: "track",
        id: "pos",
        track: {
          id: "pos",
          targetId: "box",
          property: "position",
          valueType: "vec2",
          keyframes: [{ frame: 0, value: { x: 0, y: 0 } }],
        },
      },
    ]);
    const incoming = numberTrack("new", "box", "position", [
      { frame: 40, value: 0 },
      { frame: 60, value: 1 },
    ]);
    const result = applyInterruption(original, {
      frame: 40,
      targetId: "box",
      property: "position",
      track: incoming,
    });
    expect(result.velocity).toBe(0);
    expect(result.startValue).toEqual({ x: 0, y: 0 });
  });

  it("preserves vec2 velocity component-wise across a finite difference", () => {
    const original = timelineWith([
      {
        kind: "track",
        id: "pos",
        track: {
          id: "pos",
          targetId: "box",
          property: "position",
          valueType: "vec2",
          keyframes: [
            { frame: 0, value: { x: 0, y: 0 } },
            { frame: 10, value: { x: 10, y: 20 } },
          ],
        },
      },
    ]);
    const incoming: AnimationTrack = {
      id: "new",
      targetId: "box",
      property: "position",
      valueType: "vec2",
      keyframes: [{ frame: 20, value: { x: 0, y: 0 } }],
    };

    const result = applyInterruption(original, {
      frame: 5,
      targetId: "box",
      property: "position",
      track: incoming,
    });

    expect(result.startValue).toEqual({ x: 5, y: 10 });
    // the scalar field stays 0 for non-scalar values (unchanged API)
    expect(result.velocity).toBe(0);
    expect(result.velocityValue).toEqual({ x: 1, y: 2 });
    expect(result.localFrame).toBe(5);
  });

  it("preserves transform velocity component-wise across a finite difference", () => {
    const original = timelineWith([
      {
        kind: "track",
        id: "t",
        track: {
          id: "t",
          targetId: "node",
          property: "transform",
          valueType: "transform",
          keyframes: [
            { frame: 0, value: translationMatrix(0, 0) },
            { frame: 10, value: translationMatrix(10, 20) },
          ],
        },
      },
    ]);
    const incoming: AnimationTrack = {
      id: "new",
      targetId: "node",
      property: "transform",
      valueType: "transform",
      keyframes: [{ frame: 20, value: translationMatrix(0, 0) }],
    };

    const result = applyInterruption(original, {
      frame: 5,
      targetId: "node",
      property: "transform",
      track: incoming,
    });

    expect(result.velocity).toBe(0);
    const velocity = result.velocityValue as AffineMatrix;
    expect(velocity).toBeDefined();
    expect(velocity.e).toBeCloseTo(1, 9);
    expect(velocity.f).toBeCloseTo(2, 9);
    expect(velocity.a).toBeCloseTo(0, 9);
    expect(velocity.d).toBeCloseTo(0, 9);
  });

  it("seeds a nested track at its local time without mutating the input", () => {
    const innerTrack = numberTrack("inner", "box", "y", [
      { frame: 0, value: 0 },
      { frame: 10, value: 100 },
    ]);
    const original = timelineWith([
      {
        kind: "sequence",
        id: "seq",
        children: [
          {
            kind: "track",
            id: "first",
            track: numberTrack("first", "box", "x", [
              { frame: 0, value: 0 },
              { frame: 10, value: 10 },
            ]),
          },
          { kind: "track", id: "inner", track: innerTrack },
        ],
      },
    ]);
    const snapshot = JSON.stringify(original);
    const incoming: AnimationTrack = {
      ...numberTrack("new", "box", "y", [{ frame: 20, value: 5 }]),
      conflict: "priority",
      priority: 10,
    };

    const result = applyInterruption(original, {
      frame: 15,
      targetId: "box",
      property: "y",
      track: incoming,
      nodeId: "inner",
    });

    // inner starts after the first child (10 frames), so local time = 15 - 10.
    expect(result.localFrame).toBe(5);
    expect(result.startValue).toBe(50);
    expect(result.diagnostics.some((d) => d.code === "motion-interrupted")).toBe(true);

    // input is untouched, including the nested track's own keyframe array
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(original.nodes).toHaveLength(1);
    expect(innerTrack.keyframes).toHaveLength(2);

    // the nested node is replaced in place, still inside the sequence
    const sequence = result.timeline.nodes[0];
    expect(sequence.kind).toBe("sequence");
    if (sequence.kind !== "sequence") throw new Error("expected sequence");
    const seeded = sequence.children[1];
    expect(seeded.id).toBe("new-interrupt-15");
    if (seeded.kind !== "track") throw new Error("expected track");
    expect(seeded.track.keyframes.map((kf) => kf.frame)).toEqual([5, 20]);
    expect(seeded.track.keyframes[0].value).toBe(50);

    // continuity: the nested scope samples the seed at the global frame
    const after = evaluateTimeline(result.timeline, 15);
    expect(after.samples["box.y"].value).toBe(50);
    expect(after.samples["box.y"].sourceId).toBe("new-interrupt-15");

    // the result is a valid timeline
    const errors = validateTimeline(result.timeline).filter((d) => d.severity === "error");
    expect(errors).toEqual([]);
  });

  it("falls back to a top-level append when the nested node is missing", () => {
    const original = timelineWith([
      {
        kind: "track",
        id: "pos",
        track: numberTrack("pos", "box", "x", [
          { frame: 0, value: 0 },
          { frame: 10, value: 10 },
        ]),
      },
    ]);
    const result = applyInterruption(original, {
      frame: 5,
      targetId: "box",
      property: "x",
      track: numberTrack("new", "box", "x", [{ frame: 20, value: 0 }]),
      nodeId: "ghost",
    });

    expect(result.diagnostics.some((d) => d.code === "motion-interruption-node-missing")).toBe(
      true,
    );
    expect(result.localFrame).toBe(5);
    expect(result.timeline.nodes).toHaveLength(2);
    expect(result.timeline.nodes[1].id).toBe("new-interrupt-5");
  });

  it("falls back to a top-level append when the named node is not a track", () => {
    const original = timelineWith([
      {
        kind: "parallel",
        id: "par",
        children: [
          {
            kind: "track",
            id: "pos",
            track: numberTrack("pos", "box", "x", [
              { frame: 0, value: 0 },
              { frame: 10, value: 10 },
            ]),
          },
        ],
      },
    ]);
    const result = applyInterruption(original, {
      frame: 5,
      targetId: "box",
      property: "x",
      track: numberTrack("new", "box", "x", [{ frame: 20, value: 0 }]),
      nodeId: "par",
    });

    expect(result.diagnostics.some((d) => d.code === "motion-interruption-node-unsupported")).toBe(
      true,
    );
    expect(result.timeline.nodes).toHaveLength(2);
    expect(result.timeline.nodes[1].id).toBe("new-interrupt-5");
  });
});
