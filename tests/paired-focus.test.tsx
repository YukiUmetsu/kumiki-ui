import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compilePairedFocus, evaluatePairedFocus, validatePairedFocus } from "../registry/motion/paired-focus";
import type { PairedFocusMode, PairedFocusPlan, PairedFocusSpec } from "../registry/motion/paired-focus";
import { PairedFocusSvg } from "../registry/motion/paired-focus-react";

function source(mode: PairedFocusMode = "converge-then-diverge", portrait = false): PairedFocusSpec {
  return {
    schemaVersion: 1, id: "pair-one", mode,
    stage: { width: portrait ? 720 : 1280, height: portrait ? 1080 : 720 },
    subjectA: { id: "amber", radiusPx: portrait ? 77 : 102 },
    subjectB: { id: "jade", radiusPx: portrait ? 77 : 102 },
    outerA: { x: portrait ? 140 : 272, y: portrait ? 553 : 386 },
    outerB: { x: portrait ? 580 : 1008, y: portrait ? 553 : 386 },
    focus: { x: portrait ? 360 : 640, y: portrait ? 553 : 386 },
    focusSeparationPx: portrait ? 206 : 302,
    startFrame: 0, durationFrames: 160,
    focusHoldFrames: mode === "converge-then-diverge" ? 28 : 0,
    staggerFrames: 4, curvePx: portrait ? 52 : 64,
    anticipationPx: 7, overshootPx: 5,
    clearancePx: 20, safeMarginPx: 28,
  };
}
function compile(input: PairedFocusSpec): PairedFocusPlan {
  const result = compilePairedFocus(input);
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  return result.plan;
}
describe("paired focus original cinematic choreography", () => {
  it("samples all 160 frames with scaled-asset clearance and preserved viewport bounds", () => {
    for (const portrait of [false, true]) {
      const plan = compile(source("converge-then-diverge", portrait));
      expect(plan.checkedFrameCount).toBe(160);
      expect(plan.minSampledClearancePx).toBeGreaterThanOrEqual(20 - 1e-5);
      for (let frame = 0; frame < 160; frame++) {
        const state = evaluatePairedFocus(plan, frame);
        expect(state.circleClearancePx).toBeGreaterThanOrEqual(20 - 1e-5);
        expect(state.focusStrength).toBeGreaterThanOrEqual(0);
        expect(state.focusStrength).toBeLessThanOrEqual(1);
        expect(state.a.id).toBe("amber");
        expect(state.b.id).toBe("jade");
        for (const subject of [state.a, state.b]) {
          const radius = (subject.id === "amber"
            ? plan.spec.subjectA.radiusPx : plan.spec.subjectB.radiusPx) * subject.scale;
          expect(subject.x - radius).toBeGreaterThanOrEqual(28 - 1e-5);
          expect(subject.y - radius).toBeGreaterThanOrEqual(28 - 1e-5);
          expect(subject.x + radius).toBeLessThanOrEqual(plan.spec.stage.width - 28 + 1e-5);
          expect(subject.y + radius).toBeLessThanOrEqual(plan.spec.stage.height - 28 + 1e-5);
        }
      }
    }
  });

  it("converges from two source-independent outer anchors toward a declared shared focus", () => {
    const plan = compile(source("converge"));
    const first = evaluatePairedFocus(plan, 0);
    expect([first.a.x, first.b.x, first.focusStrength]).toEqual([272, 1008, 0]);
    const middle = evaluatePairedFocus(plan, 80);
    expect(middle.a.x).toBeGreaterThan(272);
    expect(middle.b.x).toBeLessThan(1008);
    expect(middle.a.y).toBeLessThan(386);
    expect(middle.b.y).toBeGreaterThan(386);
    expect(middle.focusStrength).toBeGreaterThan(0);
    const last = evaluatePairedFocus(plan, 159);
    expect([last.a.x, last.b.x, last.focusStrength]).toEqual([489, 791, 1]);
    expect(last.a.phase).toBe("hold");
    expect(last.b.phase).toBe("hold");
    expect(evaluatePairedFocus(plan, 10000)).toEqual({ ...last, frame: 10000 });
  });

  it("diverges from shared focal anchors to distinct outside regions", () => {
    const plan = compile(source("diverge"));
    const first = evaluatePairedFocus(plan, 0);
    expect([first.a.x, first.b.x, first.focusStrength]).toEqual([489, 791, 1]);
    const moving = evaluatePairedFocus(plan, 78);
    expect(moving.a.x).toBeLessThan(489);
    expect(moving.b.x).toBeGreaterThan(791);
    expect(moving.focusStrength).toBeGreaterThan(0);
    expect(moving.focusStrength).toBeLessThan(1);
    const final = evaluatePairedFocus(plan, 159);
    expect([final.a.x, final.b.x, final.focusStrength]).toEqual([272, 1008, 0]);
  });

  it("holds both assets together at focus, then separates them with an explicit second leg", () => {
    const plan = compile(source());
    const approach = evaluatePairedFocus(plan, 32);
    expect(approach.a.phase).toBe("travel");
    expect(approach.b.phase).toBe("travel");
    const hold = evaluatePairedFocus(plan, 76);
    expect([hold.a.x, hold.b.x, hold.focusStrength]).toEqual([489, 791, 1]);
    expect(hold.a.phase).toBe("focus-hold");
    expect(hold.b.phase).toBe("focus-hold");
    const release = evaluatePairedFocus(plan, 124);
    expect(release.a.x).toBeLessThan(489);
    expect(release.b.x).toBeGreaterThan(791);
    const final = evaluatePairedFocus(plan, 159);
    expect([final.a.x, final.b.x, final.focusStrength]).toEqual([272, 1008, 0]);
    expect(final.a.phase).toBe("hold");
    expect(final.b.phase).toBe("hold");
  });

  it("allows separately authored exit anchors, without silently mutating the input", () => {
    const input = source();
    input.exitA = { x: 220, y: 385 };
    input.exitB = { x: 1060, y: 385 };
    const original = JSON.parse(JSON.stringify(input));
    const plan = compile(input);
    const final = evaluatePairedFocus(plan, 159);
    expect([final.a.x, final.a.y, final.b.x, final.b.y]).toEqual([220, 385, 1060, 385]);
    expect(input).toEqual(original);
    input.exitA.x = 999;
    input.subjectA.radiusPx = 1;
    expect(evaluatePairedFocus(plan, 159).a.x).toBe(220);
    expect(plan.spec.subjectA.radiusPx).toBe(102);
  });

  it("requires finite input geometry and rejects collisions or overrun on ANY integer frame", () => {
    const invalid = [
      { ...source(), focusSeparationPx: 180 },
      { ...source(), curvePx: 375 },
      { ...source(), anticipationPx: 180 },
      { ...source(), overshootPx: 150 },
      { ...source(), subjectA: { id: "amber", radiusPx: 290 } },
    ];
    for (const spec of invalid) {
      const result = compilePairedFocus(spec);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.diagnostics.some(d=>
        d.code === "paired-focus-bounds" ||
        d.code === "paired-focus-collision" ||
        d.code === "paired-focus-focus-spacing")).toBe(true);
    }
  });

  it("rejects invalid counts, stagger, missing or unordered positions and untrusted numeric values", () => {
    const invalid: PairedFocusSpec[] = [
      { ...source(), focusSeparationPx: Number.NaN },
      { ...source(), curvePx: Infinity },
      { ...source(), focus: { x: -Infinity, y: 0 } },
      { ...source(), outerB: { x: 2, y: 400 } },
      { ...source(), subjectA: { id: "jade", radiusPx: 102 } },
      { ...source(), mode: "unspecified" as PairedFocusMode },
      { ...source(), durationFrames: 24 },
      { ...source(), focusHoldFrames: 151 },
      { ...source(), staggerFrames: 60 },
      { ...source(), startFrame: 2.5 },
      { ...source("converge"), focusHoldFrames: 4 },
      { ...source("diverge"), exitA: { x: 100, y: 200 } },
      { ...source(), exitA: { x: 100, y: 400 } },
    ];
    for (const value of invalid) {
      expect(validatePairedFocus(value).length).toBeGreaterThan(0);
      expect(compilePairedFocus(value).ok).toBe(false);
    }
  });

  it("supports true seek-order-independent evaluation and reduced motion", () => {
    const plan = compile(source());
    const out = [124, 44, 0, 76, 159, 44].map(frame => evaluatePairedFocus(plan, frame));
    expect(out[1]).toEqual(out[5]);
    for (const frame of [0, 30, 76, 128, 159, 200]) {
      const reduced = evaluatePairedFocus(plan, frame, true);
      expect([reduced.a.x, reduced.b.x, reduced.focusStrength]).toEqual([272, 1008, 0]);
      expect(reduced.a.phase).toBe("reduced-motion-final");
      expect(reduced.b.phase).toBe("reduced-motion-final");
    }
    expect(() => evaluatePairedFocus(plan, 2.5)).toThrow(/integer frame/);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });

  it("renders an accessible original-art SVG with variable authored focus cue", () => {
    const plan = compile(source("converge"));
    const render = (frame: number, reduced = false) => renderToStaticMarkup(
      createElement(PairedFocusSvg, {
        plan, frame, reducedMotion: reduced,
        subjectA: createElement("circle", { r: 55, fill: "gold" }),
        subjectB: createElement("rect", { x: -35, y: -30, width: 70, height: 60 }),
        focusCue: createElement("circle", { r: 25 }),
        background: createElement("rect", { width: 1280, height: 720 }),
        overlay: createElement("text", { x: 60, y: 45 }, "Original layout"),
        ariaLabel: "Two original assets converge for a relationship reveal",
      }),
    );
    const initial = render(0);
    expect(initial).toContain('viewBox="0 0 1280 720"');
    expect(initial).toContain('role="img"');
    expect(initial).toContain("Original layout");
    expect(initial).toContain('data-km-paired-focus-subject="amber"');
    expect(initial).toContain('data-km-paired-focus-subject="jade"');
    expect(initial).toContain('data-focus-strength="0"');
    expect(initial).not.toContain("data:image/png");
    const last = render(159);
    expect(last).toContain('data-focus-strength="1"');
    expect(last).toContain('translate(489 386)');
    expect(last).toContain('translate(791 386)');
    const reduced = render(30, true);
    expect(reduced).toContain('data-reduced-motion="true"');
    expect(reduced).toContain('data-phase="reduced-motion-final"');
  });

  it("does not confuse geometry cues with physical interaction or semantic identity", () => {
    const plan = compile(source());
    expect(plan.spec.subjectA.id).toBe("amber");
    expect(plan.spec.subjectB.id).toBe("jade");
    expect(Object.keys(evaluatePairedFocus(plan, 50))).toEqual([
      "frame", "a", "b", "focusStrength", "circleClearancePx",
    ]);
  });
});
