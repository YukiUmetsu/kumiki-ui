import { describe, expect, it } from "vitest";
import { validateVisualProduction } from "../registry/visual/production-contract";
import {
  exclusionZonesFromInset, inspectComponentReuse, inspectExplainerPrinciples, inspectSeekParity, readableCaptionFrames,
  type ExplainerPrinciplesManifest, type PrincipledShot, type PrincipleOutputProfile,
} from "../registry/visual/explainer-principles";
import { NETWORK_JOURNEY_CONTRACT } from "../src/network-journey/journey-contract";

describe("low-cost semantic visual production contract", () => {
  it("accepts a complete story with concrete learning outcomes and an ending", () => {
    const result = validateVisualProduction(NETWORK_JOURNEY_CONTRACT);
    expect(result).toEqual({ ok: true, issues: [] });
  });
  it("rejects missing actions, broken timeline, and an ungrounded recap", () => {
    const result = validateVisualProduction({
      ...NETWORK_JOURNEY_CONTRACT,
      shots: NETWORK_JOURNEY_CONTRACT.shots.map((shot, index) =>
        index === 0 ? { ...shot, actions: [], endFrame: shot.endFrame - 5 } :
        index === 7 ? { ...shot, outcomeIds: ["missing"] } : shot),
      closingOutcomeIds: ["dns"],
    });
    expect(result.ok).toBe(false);
    const codes = result.issues.map(issue => issue.code);
    expect(codes).toContain("missing-action");
    expect(codes).toContain("timeline-gap");
    expect(codes).toContain("missing-outcome");
    expect(codes).toContain("missing-closing-summary");
  });
});

describe("explainer principles preflight", () => {
  const shot = (id: string, startFrame: number, endFrame: number, purpose: PrincipledShot["purpose"],
    criticalSubjects: string[], extra: Partial<PrincipledShot> = {}): PrincipledShot => ({
    id, startFrame, endFrame, purpose, criticalSubjects, visualObjective: `${id} objective`,
    actions: [`${id}-action`], ...extra,
  });
  const box = (x: number, y: number, width = 200, height = 120) => ({ x, y, width, height });
  const output = (id: string, width: number, height: number, captionY: number): PrincipleOutputProfile => ({
    id, width, height, composition: "authored",
    exclusionZones: exclusionZonesFromInset(width, height, { left: 0.08, right: 0.12, top: 0.09, bottom: 0.19 }),
    samples: [
      { frame: 0, subjects: { meter: box(width * 0.3, height * 0.3) } },
      { frame: 120, subjects: { meter: box(width * 0.2, height * 0.3), bill: box(width * 0.5, height * 0.3) },
        text: { "caption-cost": box(width * 0.15, captionY, width * 0.6, 80) } },
      { frame: 300, subjects: { bill: box(width * 0.4, height * 0.4) } },
    ],
  });
  const manifest = (): ExplainerPrinciplesManifest => ({
    schemaVersion: 1,
    fps: { num: 30, den: 1 },
    production: {
      id: "usage-to-cost", totalFrames: 450, closingShotId: "payoff", closingOutcomeIds: ["cost"],
      outcomes: [{ id: "cost", concept: "metered cost", claim: "Usage multiplied by rate gives the bill." }],
      shots: [
        shot("hook", 0, 90, "attract-attention", ["meter"]),
        shot("mechanism", 90, 270, "explain-causality", ["meter", "bill"], { releasedSubjectIds: ["meter"] }),
        shot("payoff", 270, 450, "deliver-payoff", ["bill"], { outcomeIds: ["cost"] }),
      ],
    },
    opening: { visibleSubjectIds: ["meter"] },
    hook: { shotId: "hook", claimId: "usage-claim", payoffShotId: "payoff" },
    criticalHolds: [{ id: "bill-total", startFrame: 300, endFrame: 420, minFrames: 60 }],
    captions: [{ id: "caption-cost", text: "Usage × rate = the bill", startFrame: 100, endFrame: 190 }],
    outputs: [output("portrait", 1080, 1920, 1200), output("landscape", 1920, 1080, 700)],
    accessibility: { reducedMotion: "static-equivalent", textSummary: "A meter's usage times its rate produces the bill." },
    cues: [{ id: "rate-applied", frame: 180, kind: "narration" }],
    seededEffects: [{ id: "paper-grain", seed: 7 }],
    requirements: [{ capability: "font:geist", kind: "font" }],
    assets: [{ id: "paper", uri: "assets/paper.webp", sha256: "a".repeat(64), licenseRef: "CC0-1.0 ambientCG" }],
    facts: [{ id: "rate", value: 0.15, unit: "currency/kWh", illustrative: true }],
    visualReview: { reviewer: "reviewer-a", date: "2026-10-21", outputIds: ["portrait", "landscape"] },
  });

  it("accepts a production that satisfies every machine-checkable principle", () => {
    const result = inspectExplainerPrinciples(manifest(), { availableCapabilities: ["font:geist"] });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.coverage)).toHaveLength(9);
  });

  it("reports principle violations as typed, actionable diagnostics", () => {
    const base = manifest();
    const bad: ExplainerPrinciplesManifest = {
      ...base,
      production: { ...base.production, shots: base.production.shots.map(s =>
        s.id === "mechanism" ? { ...s, releasedSubjectIds: [] } : s) },
      outputs: [{ ...base.outputs[0], composition: "derived-crop", samples: base.outputs[0].samples.map(s =>
        s.frame === 120 ? { ...s, text: { "caption-cost": box(100, 1700, 600, 80) } } : s) }],
      accessibility: { reducedMotion: "none", textSummary: "" },
      assets: [{ id: "clip", uri: "footage.mp4" }],
      facts: [{ id: "growth", value: 42, unit: "" }],
      requirements: [{ capability: "decoder:h264", kind: "decoder" }],
      visualReview: undefined,
    };
    const result = inspectExplainerPrinciples(bad, { availableCapabilities: [] });
    expect(result.ok).toBe(false);
    const codes = result.diagnostics.map(d => `${d.principle}:${d.code}`);
    for (const code of ["5:identity-lost", "7:blind-crop", "7:text-in-exclusion-zone", "7:aspect-missing",
      "7:reduced-motion-missing", "7:text-summary-missing", "3:asset-hash-missing", "8:asset-license-missing",
      "8:fact-unsourced", "8:fact-unit-missing", "8:capability-missing", "9:visual-review-pending"])
      expect(codes).toContain(code);
  });

  it("checks openings, hook payoffs, holds and caption reading time", () => {
    const base = manifest();
    const result = inspectExplainerPrinciples({
      ...base,
      hook: { shotId: "payoff", claimId: "usage-claim", payoffShotId: "hook" },
      opening: { visibleSubjectIds: ["bill"] },
      criticalHolds: [{ id: "bill-total", startFrame: 300, endFrame: 320, minFrames: 60 }],
      captions: [{ id: "caption-cost", text: "使用量に単価を掛けると請求額になります", startFrame: 100, endFrame: 130 }],
    }, { availableCapabilities: ["font:geist"] });
    const codes = result.diagnostics.map(d => d.code);
    expect(codes).toEqual(expect.arrayContaining(
      ["hook-payoff-missing", "first-frame-subject-missing", "hold-too-short", "caption-hold-short"]));
    expect(readableCaptionFrames("使用量に単価を掛けると請求額になります", { num: 30, den: 1 })).toBe(95);
  });

  it("flags fixed cut cadence and under-demonstrated reuse", () => {
    const base = manifest();
    const shots = [0, 1, 2, 3].map(i => shot(`s${i}`, i * 30, i * 30 + 30, "direct-focus", ["meter"],
      i === 3 ? { outcomeIds: ["cost"] } : {}));
    const result = inspectExplainerPrinciples({ ...base, hook: undefined,
      production: { ...base.production, totalFrames: 120, shots, closingShotId: "s3" } });
    expect(result.diagnostics.map(d => d.code)).toContain("uniform-cut-cadence");
    expect(inspectComponentReuse({ id: "chart-story", demonstrations: [
      { subjectArea: "Finance", exampleRef: "story:a" }, { subjectArea: "finance", exampleRef: "story:b" },
      { subjectArea: "Science", exampleRef: "story:c" }] }).ok).toBe(false);
    expect(inspectComponentReuse({ id: "chart-story", demonstrations: [
      { subjectArea: "finance", exampleRef: "a" }, { subjectArea: "science", exampleRef: "b" },
      { subjectArea: "history", exampleRef: "c" }] }).ok).toBe(true);
  });

  it("detects playback-history state with seeded random seeks", () => {
    const pure = inspectSeekParity(() => (frame: number) => ({ x: frame * 0.5, label: frame > 10 ? "b" : "a" }),
      { durationFrames: 120, sampleCount: 16, seed: 3 });
    expect(pure.ok).toBe(true);
    const accumulating = inspectSeekParity(() => { let x = 0; return () => ({ x: (x += 1) }); },
      { durationFrames: 120, sampleCount: 16, seed: 3 });
    expect(accumulating.ok).toBe(false);
    expect(accumulating.diagnostics[0]).toMatchObject({ principle: 3, code: "seek-parity-mismatch", path: "state.x" });
  });
});
