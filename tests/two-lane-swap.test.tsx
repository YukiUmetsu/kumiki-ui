import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  compileTwoLaneSwap, evaluateTwoLaneSwap, validateTwoLaneSwap,
} from "../registry/motion/two-lane-swap";
import type {
  TwoLaneSwapPlan, TwoLaneSwapSpec,
} from "../registry/motion/two-lane-swap";
import { TwoLaneSwapSvg } from "../registry/motion/two-lane-swap-react";

const source: TwoLaneSwapSpec = {
  schemaVersion: 1, id: "original-exchange",
  stage: { width: 1200, height: 680 },
  subjectA: { id: "amber", radiusPx: 116 },
  subjectB: { id: "cyan", radiusPx: 116 },
  left: { x: 292, y: 382 }, right: { x: 908, y: 382 },
  startFrame: 0, durationFrames: 120,
  staggerFrames: 6, arcHeightPx: 140, anticipationPx: 10,
  overshootPx: 8, depthScaleDip: .04, maxTiltDeg: 5,
  clearancePx: 22, safeMarginPx: 30, layerOrder: "a-front",
};

function compile(spec: TwoLaneSwapSpec = source): TwoLaneSwapPlan {
  const result = compileTwoLaneSwap(spec);
  if (!result.ok)
    throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
}

describe("two-lane-swap deterministic original animation", () => {
  it("compiles all actual integer frames with certified circle clearance and safe bounds", () => {
    const plan = compile();
    expect(plan.checkedFrameCount).toBe(120);
    expect(plan.minSampledClearancePx).toBeGreaterThanOrEqual(22);
    expect(plan.spec.schemaVersion).toBe(1);
    const margin = plan.spec.safeMarginPx!;
    const { width, height } = plan.spec.stage;
    for (let frame = 0; frame < plan.spec.durationFrames; frame++) {
      const sample = evaluateTwoLaneSwap(plan, frame);
      expect(sample.clearancePx).toBeGreaterThanOrEqual(22 - 0.00001);
      for (const subject of [sample.a, sample.b]) {
        const radius = subject.id === "amber"
          ? plan.spec.subjectA.radiusPx : plan.spec.subjectB.radiusPx;
        expect(subject.x - radius).toBeGreaterThanOrEqual(margin - 0.00001);
        expect(subject.y - radius).toBeGreaterThanOrEqual(margin - 0.00001);
        expect(subject.x + radius).toBeLessThanOrEqual(width - margin + 0.00001);
        expect(subject.y + radius).toBeLessThanOrEqual(height - margin + 0.00001);
        expect(subject.scale).toBeGreaterThan(.84);
        expect(subject.scale).toBeLessThanOrEqual(1);
        expect(Math.abs(subject.rotationDeg)).toBeLessThanOrEqual(5.00001);
      }
    }
  });

  it("has original left/right starting positions, clear curved crossing and exact opposite finishes", () => {
    const plan = compile();
    const first = evaluateTwoLaneSwap(plan, 0);
    expect([first.a.x, first.a.y, first.b.x, first.b.y]).toEqual(
      [292, 382, 908, 382]);
    const crossing = evaluateTwoLaneSwap(plan, 60);
    expect(crossing.a.y).toBeLessThan(382);
    expect(crossing.b.y).toBeGreaterThan(382);
    expect(crossing.a.phase).toBe("travel");
    expect(crossing.b.phase).toBe("travel");
    expect(crossing.a.rotationDeg).toBeGreaterThan(0);
    expect(crossing.b.rotationDeg).toBeLessThan(0);
    const final = evaluateTwoLaneSwap(plan, 119);
    expect([final.a.x, final.a.y, final.b.x, final.b.y]).toEqual(
      [908, 382, 292, 382]);
    expect(final.a.phase).toBe("hold");
    expect(final.b.phase).toBe("hold");
    const later = evaluateTwoLaneSwap(plan, 5000);
    expect(later).toEqual({ ...final, frame: 5000 });
  });

  it("includes non-teleporting anticipation and smooth settling with B stagger", () => {
    const plan = compile();
    const early = evaluateTwoLaneSwap(plan, 4);
    expect(early.a.phase).toBe("anticipate");
    expect(early.a.x).toBeLessThan(292);
    expect(evaluateTwoLaneSwap(plan, 4).b.phase).toBe("before");
    expect(evaluateTwoLaneSwap(plan, 12).b.phase).toBe("anticipate");
    const nearEnd = evaluateTwoLaneSwap(plan, 114);
    expect(nearEnd.a.phase).toBe("hold");
    expect(nearEnd.b.phase).toBe("settle");
    let step = 0;
    let previous = evaluateTwoLaneSwap(plan, 0);
    for (let frame = 1; frame < 120; frame++) {
      const now = evaluateTwoLaneSwap(plan, frame);
      step = Math.max(step,
        Math.hypot(now.a.x - previous.a.x, now.a.y - previous.a.y),
        Math.hypot(now.b.x - previous.b.x, now.b.y - previous.b.y));
      previous = now;
    }
    expect(step).toBeLessThan(55);
  });

  it("is independent of seek order and never mutates input after compile", () => {
    const original = JSON.parse(JSON.stringify(source));
    const plan = compile(source);
    const frames = [30, 118, 0, 60, 13, 119, 60].map(f =>
      evaluateTwoLaneSwap(plan, f));
    expect(frames[3]).toEqual(frames[6]);
    expect(source).toEqual(original);
    const src = JSON.parse(JSON.stringify(source)) as TwoLaneSwapSpec;
    const compiled = compile(src);
    src.left.x = 999;
    src.subjectA.radiusPx = 999;
    expect(evaluateTwoLaneSwap(compiled, 0).a.x).toBe(292);
    expect(compiled.spec.subjectA.radiusPx).toBe(116);
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled);
    expect(() => evaluateTwoLaneSwap(compiled, .5)).toThrow(/integer frame/);
  });

  it("reduced motion returns the final readable composition at every frame", () => {
    const plan = compile();
    for (const frame of [0, 20, 60, 119, 500]) {
      const state = evaluateTwoLaneSwap(plan, frame, true);
      expect([state.a.x, state.a.y, state.b.x, state.b.y]).toEqual(
        [908, 382, 292, 382]);
      expect(state.a.phase).toBe("reduced-motion-final");
      expect(state.b.phase).toBe("reduced-motion-final");
      expect(state.a.rotationDeg).toBe(0);
      expect(state.b.rotationDeg).toBe(0);
    }
  });

  it("handles portrait framing with independent compact authored artwork", () => {
    const portrait: TwoLaneSwapSpec = {
      ...source,
      id: "portrait-exchange",
      stage: { width: 720, height: 1080 },
      subjectA: { id: "amber", radiusPx: 92 },
      subjectB: { id: "cyan", radiusPx: 92 },
      left: { x: 182, y: 555 }, right: { x: 538, y: 555 },
      arcHeightPx: 146,
    };
    const plan = compile(portrait);
    expect(plan.minSampledClearancePx).toBeGreaterThan(22);
    expect(evaluateTwoLaneSwap(plan, 119).a.x).toBe(538);
  });

  it("fails closed on collisions instead of silently painting overlapping objects", () => {
    const collision: TwoLaneSwapSpec = {
      ...source, arcHeightPx: 4,
      subjectA: { id: "amber", radiusPx: 116 },
      subjectB: { id: "cyan", radiusPx: 116 },
    };
    const compiled = compileTwoLaneSwap(collision);
    expect(compiled.ok).toBe(false);
    if (!compiled.ok)
      expect(compiled.diagnostics[0].code).toBe("two-lane-swap-collision");
  });

  it("rejects margin, arc, overshoot and large radius frame overflow", () => {
    const failures: TwoLaneSwapSpec[] = [
      { ...source, arcHeightPx: 240 },
      { ...source, overshootPx: 360 },
      { ...source, anticipationPx: 280 },
      { ...source, subjectA: { id: "amber", radiusPx: 180 } },
    ];
    for (const bad of failures) {
      const result = compileTwoLaneSwap(bad);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.diagnostics.some(d =>
          d.code === "two-lane-swap-bounds" ||
          d.code === "two-lane-swap-collision")).toBe(true);
    }
  });

  it("rejects nonfinite parameters, invalid IDs, impossible frames and unsupported layer order", () => {
    const cases: TwoLaneSwapSpec[] = [
      { ...source, arcHeightPx: NaN },
      { ...source, clearancePx: Infinity },
      { ...source, left: { x: NaN, y: 0 } },
      { ...source, subjectB: { id: "amber", radiusPx: 55 } },
      { ...source, stage: { width: 0, height: 0 } },
      { ...source, right: { x: 291, y: 382 } },
      { ...source, startFrame: -1 },
      { ...source, durationFrames: 5 },
      { ...source, staggerFrames: 55 },
      { ...source, layerOrder: "unknown" as "a-front" },
    ];
    for (const bad of cases) {
      expect(validateTwoLaneSwap(bad).length).toBeGreaterThan(0);
      expect(compileTwoLaneSwap(bad).ok).toBe(false);
    }
  });

  it("renders a source-independent accessible SVG with exact authored positions", () => {
    const plan = compile();
    const markup = renderToStaticMarkup(createElement(TwoLaneSwapSvg, {
      plan, frame: 119,
      subjectA: createElement("circle", { r: 12, fill: "gold" }),
      subjectB: createElement("path", { d: "M0 0L10 10", stroke: "cyan" }),
      background: createElement("rect", { width: 1200, height: 680 }),
      overlay: createElement("text", { x: 60, y: 45 }, "Independent original art"),
      ariaLabel: "Gold and cyan ideas switch sides",
    }));
    expect(markup).toContain('viewBox="0 0 1200 680"');
    expect(markup).toContain('aria-label="Gold and cyan ideas switch sides"');
    expect(markup).toContain('data-km-lane-swap-subject="amber"');
    expect(markup).toContain('data-km-lane-swap-subject="cyan"');
    expect(markup).toContain('translate(908 382)');
    expect(markup).toContain('translate(292 382)');
    expect(markup).toContain("Independent original art");
    expect(markup).not.toContain("data:image/png");
  });

  it("supports authored reversed paint order and reduced-motion SVG override", () => {
    const plan = compile({ ...source, layerOrder: "b-front" });
    expect(evaluateTwoLaneSwap(plan, 40).b.layer).toBe(2);
    const markup = renderToStaticMarkup(createElement(TwoLaneSwapSvg, {
      plan, frame: 35, subjectA: createElement("circle", { r: 4 }),
      subjectB: createElement("rect", { width: 8, height: 8 }),
      reducedMotion: true,
    }));
    expect(markup).toContain('data-reduced-motion="true"');
    expect(markup).toContain('data-phase="reduced-motion-final"');
    expect(markup.indexOf('data-km-lane-swap-subject="amber"')).toBeLessThan(
      markup.indexOf('data-km-lane-swap-subject="cyan"'));
  });
});
