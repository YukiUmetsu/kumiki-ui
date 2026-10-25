import { describe, expect, it } from "vitest";
import { checkTextLayout, textInkBounds } from "../registry/infographic/economic";
import type { InfographicPrimitive, TextPrimitive } from "../registry/infographic/types";
import { validateFreezeFocus } from "../registry/video/freeze-frame-focus";
import { videoPlatformPreset } from "../registry/video/platform-presets";
import { EXPLANATION_FPS, EXPLANATION_FRAMES } from "../src/video/clip-explanation-data";
import {
  EXPLANATION_FOCUS, EXPLANATION_MIN_TEXT_FRACTION, EXPLANATION_PROFILES, explanationChart, explanationChartBox, explanationCropProblems, explanationFreezeSourceFrame, explanationPlan,
} from "../src/video/clip-explanation-layout";
import type { ExplanationProfile } from "../src/video/clip-explanation-layout";

const profiles = Object.values(EXPLANATION_PROFILES);
const errorsOf = (diagnostics: { severity: string }[]) => diagnostics.filter(d => d.severity === "error");
const fullReveal = (profile: ExplanationProfile) => explanationChart(profile, 100000);
/** One string per text label: wrapped lines are rejoined, so a label that wraps differently still counts as the same label. */
const labelsOf = (primitives: InfographicPrimitive[]) => primitives.filter((p): p is TextPrimitive => p.kind === "text")
  .map(p => p.lines.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);

describe("K3 profiles follow their platform recipes", () => {
  it.each(profiles)("$id matches its preset size and safe area", profile => {
    const preset = videoPlatformPreset(profile.preset);
    expect({ width: profile.width, height: profile.height }).toEqual({ width: preset.width, height: preset.height });
    expect(profile.safe).toEqual(preset.safeInset);
  });

  it.each(profiles)("$id's chart box sits inside the safe area", profile => {
    const box = explanationChartBox(profile);
    expect(box.x).toBeGreaterThanOrEqual(Math.round(profile.width * profile.safe.left));
    expect(box.y).toBeGreaterThanOrEqual(Math.round(profile.height * profile.safe.top));
    expect(box.x + box.width).toBeLessThanOrEqual(Math.round(profile.width * (1 - profile.safe.right)) + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(Math.round(profile.height * (1 - profile.safe.bottom)) + 1);
  });

  it.each(profiles)("$id keeps the parcel label and scan line in view after the crop", profile => {
    expect(explanationCropProblems(profile)).toEqual([]);
  });

  it.each(profiles)("$id has no framing errors in the freeze validator", profile => {
    const problems = validateFreezeFocus(EXPLANATION_FOCUS, EXPLANATION_FPS, [{ width: profile.width, height: profile.height, framing: profile.framing }]);
    expect(errorsOf(problems)).toEqual([]);
  });

  it.each(profiles)("$id compiles the same two-shot timeline", profile => {
    const plan = explanationPlan(profile);
    expect(plan.durationFrames).toBe(EXPLANATION_FRAMES);
    expect(plan.shots[1].startFrame).toBe(150);
  });
});

describe("K3 chart layout per profile", () => {
  it.each(profiles)("$id renders without errors and its text fits", profile => {
    const chart = fullReveal(profile);
    expect(errorsOf(chart.diagnostics)).toEqual([]);
    const layout: string[] = [];
    checkTextLayout(chart.primitives, chart.width, chart.height, d => layout.push(d.message));
    expect(layout).toEqual([]);
  });

  it.each(profiles)("$id keeps all text inside its chart canvas with a visible margin", profile => {
    const chart = fullReveal(profile);
    for (const p of chart.primitives) {
      if (p.kind !== "text" || !p.lines.some(line => line.trim())) continue;
      const box = textInkBounds(p);
      expect(box.x, p.id + " left").toBeGreaterThanOrEqual(0);
      expect(box.y, p.id + " top").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, p.id + " right").toBeLessThanOrEqual(chart.width);
      expect(box.y + box.height, p.id + " bottom").toBeLessThanOrEqual(chart.height);
    }
  });

  it.each(profiles)("$id's smallest chart text is at least the minimum fraction of the frame", profile => {
    const chart = fullReveal(profile);
    const floor = Math.min(profile.width, profile.height) * EXPLANATION_MIN_TEXT_FRACTION;
    const sizes = chart.primitives.filter((p): p is TextPrimitive => p.kind === "text" && p.lines.some(line => line.trim())).map(p => p.fontSize);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(floor);
  });

  it("every profile shows the same labels: wrapping may differ, nothing is dropped", () => {
    const labels = profiles.map(profile => [...new Set(labelsOf(fullReveal(profile).primitives))].sort().join("\n"));
    expect(new Set(labels).size).toBe(1);
  });
});

describe("K3 rejects impossible framing (negative control)", () => {
  it("a square crop that cuts the parcel label is reported, not silently accepted", () => {
    const square = EXPLANATION_PROFILES["social-square"];
    const problems = explanationCropProblems({ ...square, framing: { fit: "cover", focus: { x: 0, y: 0.5 } } });
    expect(problems.map(p => p.split(" leaves")[0])).toEqual(["parcel label", "scan line"]);
  });

  it("the registry validator rejects the same cut-off crop as an error", () => {
    const square = EXPLANATION_PROFILES["social-square"];
    const problems = validateFreezeFocus(EXPLANATION_FOCUS, EXPLANATION_FPS,
      [{ width: square.width, height: square.height, framing: { fit: "cover", focus: { x: 0, y: 0.5 } } }]);
    expect(problems.filter(d => d.code === "subject-leaves-crop").length).toBeGreaterThan(0);
    expect(errorsOf(problems).length).toBeGreaterThan(0);
  });

  it("the freeze shows the source frame that the label geometry was measured at", () => {
    expect(explanationFreezeSourceFrame()).toBe(90);
  });
});
