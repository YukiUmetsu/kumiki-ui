import { describe, expect, it } from "vitest";
import { compileCutPlan } from "../registry/motion/cut-director";
import { planCostWaterfall, renderCostWaterfall } from "../registry/infographic/cost-waterfall";
import { checkTextLayout } from "../registry/infographic/economic";
import {
  EXPLANATION_CHART, EXPLANATION_FPS, EXPLANATION_FRAMES, EXPLANATION_IDS, EXPLANATION_SIZE, EXPLANATION_TIMING,
} from "../src/video/clip-explanation-data";

describe("K2 clip explanation data", () => {
  it("the sourced chart adds up exactly and is marked illustrative", () => {
    const plan = planCostWaterfall(EXPLANATION_CHART);
    const bar = (id: string) => plan.bars.find(b => b.id === id);
    expect(bar("miss")?.amount ?? bar("miss")?.from).toBeDefined();
    expect(plan.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    expect(EXPLANATION_CHART.provenance?.illustrative).toBe(true);
    // 6 + 1 + 2 + 1 = 10 for the miss, then −2 credit = 8 net.
    expect(plan.bars.find(b => b.id === "net")?.kind).toBe("total");
  });

  it("the chart renders with no error diagnostics, and its text fits at full reveal", () => {
    const chart = renderCostWaterfall(EXPLANATION_CHART, { width: EXPLANATION_SIZE.width, height: EXPLANATION_SIZE.height });
    expect(chart.diagnostics.filter(d => d.severity === "error")).toEqual([]);
    const layout: string[] = [];
    checkTextLayout(chart.primitives, chart.width, chart.height, d => layout.push(d.message));
    expect(layout).toEqual([]);
  });

  it("the reveal completes inside the payoff shot, leaving a readable hold", () => {
    const chart = renderCostWaterfall(EXPLANATION_CHART, { width: EXPLANATION_SIZE.width, height: EXPLANATION_SIZE.height });
    expect(chart.revealEnd).toBeLessThanOrEqual(EXPLANATION_TIMING.payoffFrames - 60);
  });

  it("the cut plan covers the whole timeline with the scan shot first and the payoff second", () => {
    const result = compileCutPlan({
      id: "k2", fps: EXPLANATION_FPS, output: EXPLANATION_SIZE,
      scenes: [{ id: "canvas", subjects: { frame: { x: 0, y: 0, width: EXPLANATION_SIZE.width, height: EXPLANATION_SIZE.height } } }],
      shots: [
        { id: EXPLANATION_IDS.scanShot, sceneId: "canvas", durationFrames: EXPLANATION_TIMING.scanFrames, subjectIds: ["frame"], camera: { start: { center: { x: 540, y: 960 }, zoom: 1 } } },
        { id: EXPLANATION_IDS.payoffShot, sceneId: "canvas", durationFrames: EXPLANATION_TIMING.payoffFrames, subjectIds: ["frame"], camera: { start: { center: { x: 540, y: 960 }, zoom: 1 } } },
      ],
      transitions: [{ kind: "dissolve", durationFrames: EXPLANATION_TIMING.dissolveFrames }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.durationFrames).toBe(EXPLANATION_FRAMES);
    expect(result.plan.shots.map(shot => shot.id)).toEqual([EXPLANATION_IDS.scanShot, EXPLANATION_IDS.payoffShot]);
    expect(result.plan.shots[1].startFrame).toBe(EXPLANATION_TIMING.scanFrames);
  });
});
