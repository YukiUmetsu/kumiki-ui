import { describe, expect, it } from "vitest";
import { validateVisualProduction } from "../registry/visual/production-contract";
import {
  exclusionZonesFromInset, inspectComponentReuse, inspectExplainerPrinciples, inspectSeekParity, readableCaptionFrames,
  type ExplainerPrinciplesManifest, type PrincipledShot, type PrincipleOutputProfile,
} from "../registry/visual/explainer-principles";
import { compileShortHook, SHORT_HOOK_STRATEGIES, type HookRoles, type ShortHookSpec } from "../registry/visual/short-hook-director";
import { compileMotionDirector, evaluateMotionDirector } from "../registry/motion/motion-director";
import type { PrincipledProduction } from "../registry/visual/explainer-principles";
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

describe("short hook director", () => {
  const fps = { num: 30, den: 1 };
  const production = (claimId: string, payoff: Partial<PrincipledShot> = {}): PrincipledProduction => ({
    id: "short", totalFrames: 450, closingShotId: "payoff", closingOutcomeIds: [claimId],
    outcomes: [{ id: claimId, concept: claimId, claim: `${claimId} claim` }],
    shots: [
      { id: "hook", startFrame: 0, endFrame: 90, purpose: "attract-attention", visualObjective: "hook", criticalSubjects: ["a"], actions: ["hook"] },
      { id: "body", startFrame: 90, endFrame: 300, purpose: "explain-causality", visualObjective: "body", criticalSubjects: ["a"], actions: ["body"] },
      { id: "payoff", startFrame: 300, endFrame: 450, purpose: "deliver-payoff", visualObjective: "payoff", criticalSubjects: ["a"], actions: ["answer"], outcomeIds: [claimId], ...payoff },
    ] });
  // The same API across unrelated subjects: only IDs and facts change.
  const TOPICS = {
    finance: { a: "balance", b: "interest-chart", fact: { id: "double", value: 12, unit: "years at 6%", sourceId: "rule of 72" } },
    technology: { a: "packet", b: "server", fact: { id: "hops", value: 15, unit: "hops", illustrative: true } },
    "physical-object": { a: "pump", b: "radiator", fact: { id: "flow", value: 12, unit: "litres per minute", illustrative: true } },
  };
  const roles = (strategy: (typeof SHORT_HOOK_STRATEGIES)[number], a: string, b: string, fact: { id: string; value: number; unit: string }): HookRoles => {
    switch (strategy) {
      case "action-first": return { strategy, actor: a, focus: b };
      case "unexpected-reveal": return { strategy, familiar: a, reveal: b };
      case "impact-statistic": return { strategy, metric: a, context: b, fact };
      case "transformation": return { strategy, before: a, after: b };
      case "evidence-question": return { strategy, evidence: a, focus: b };
    }
  };
  const spec = (topic: keyof typeof TOPICS, strategy: (typeof SHORT_HOOK_STRATEGIES)[number], extra: Partial<ShortHookSpec> = {}): ShortHookSpec => {
    const t = TOPICS[topic];
    return { id: "hook", fps, durationFrames: 90, claimId: topic, payoffId: "payoff", surprise: "an accurate surprise",
      subjectIds: [t.a, t.b, "question"], questionId: "question", roles: roles(strategy, t.a, t.b, t.fact), ...extra };
  };

  it("compiles all five strategies for finance, technology and physical-object topics", () => {
    for (const topic of Object.keys(TOPICS) as (keyof typeof TOPICS)[]) for (const strategy of SHORT_HOOK_STRATEGIES) {
      const result = compileShortHook(spec(topic, strategy), { production: production(topic) });
      expect(result.diagnostics.filter(d => d.severity === "error"), `${topic}/${strategy}`).toEqual([]);
      const opening = result.plan.principles.opening.visibleSubjectIds;
      expect(opening).toEqual([TOPICS[topic].a]);
      expect(evaluateMotionDirector(result.compiled!, 0).evaluation.samples[`${opening[0]}.opacity`].value).toBe(1);
      expect(result.plan.beats[0]).toMatchObject({ role: "open", startFrame: 0 });
      expect(result.node.recipe).toMatchObject({ id: "short-hook", parameters: { strategy, claimId: topic } });
      const parity = inspectSeekParity(() => frame => evaluateMotionDirector(result.compiled!, frame).evaluation.samples, { durationFrames: 90, sampleCount: 24 });
      expect(parity.ok).toBe(true);
    }
  });

  it("validates the payoff anchor against the production contract", () => {
    const codes = (p: PrincipledProduction, extra: Partial<ShortHookSpec> = {}) =>
      compileShortHook(spec("technology", "action-first", extra), { production: p }).diagnostics.map(d => d.code);
    expect(codes(production("technology", { outcomeIds: [] }))).toContain("hook-payoff-unrelated");
    expect(codes(production("technology"), { payoffId: "nowhere" })).toContain("hook-payoff-missing");
    expect(codes(production("technology"), { claimId: "unknown" })).toContain("hook-claim-unknown");
    expect(codes(production("technology"), { payoffId: "hook" })).toContain("hook-payoff-before-hook");
    expect(compileShortHook(spec("technology", "action-first")).diagnostics.map(d => d.code)).toEqual(["hook-payoff-unverified"]);
  });

  it("rejects unsupported claims and structurally empty hooks", () => {
    const codes = (s: ShortHookSpec) => compileShortHook(s, { production: production(s.claimId) }).diagnostics.map(d => d.code);
    expect(codes(spec("technology", "impact-statistic", { roles: { strategy: "impact-statistic", metric: "packet", context: "server", fact: { id: "x", value: 3, unit: "hops" } } })))
      .toContain("hook-fact-unsourced");
    expect(codes(spec("technology", "impact-statistic", { roles: { strategy: "impact-statistic", metric: "packet", context: "packet", fact: { id: "x", value: 3, unit: "hops", illustrative: true } } })))
      .toContain("hook-statistic-without-context");
    expect(codes(spec("technology", "unexpected-reveal", { surprise: "" }))).toContain("hook-surprise-missing");
    expect(codes(spec("technology", "action-first", { subjectIds: ["packet"] }))).toContain("hook-role-not-subject");
    expect(codes(spec("technology", "action-first", { align: { focus: 2 } }))).toContain("hook-align-invalid");
    const aligned = compileShortHook(spec("technology", "action-first", { align: { focus: 40, question: 66 } }), { production: production("technology") });
    expect(aligned.plan.beats.map(b => b.startFrame)).toEqual([0, 40, 66]);
    expect(aligned.compiled!.cues.map(c => [c.id, c.frame])).toEqual([["hook/beat/open", 0], ["hook/beat/focus", 40], ["hook/beat/question", 66]]);
  });

  it("checks frame-0 framing per output and lets following choreography continue from endState", () => {
    const profile = { id: "portrait", width: 1080, height: 1920, reserved: [{ id: "bottom", edge: "bottom" as const, rect: { x: 0, y: 0.8, width: 1, height: 0.2 } }] };
    const framed = compileShortHook(spec("technology", "action-first"), { production: production("technology"),
      outputs: [{ profile, layout: { packet: { x: 0.2, y: 0.85, width: 0.2, height: 0.1 } } }] });
    expect(framed.diagnostics.map(d => d.code)).toContain("hook-opening-unframed");
    const hook = compileShortHook(spec("technology", "action-first"), { production: production("technology") });
    const from = hook.plan.endState["server.emphasis"] as number;
    const body = (start: number) => ({ kind: "animation" as const, id: "body/emphasis", at: 90,
      track: { id: "body/emphasis", targetId: "server", property: "emphasis", valueType: "number" as const, keyframes: [{ frame: 0, value: start }, { frame: 30, value: 0 }] } });
    const film = (start: number) => compileMotionDirector({ schemaVersion: 1, id: "film", title: "film", fps, durationFrames: 450,
      targets: ["packet", "server", "question"], children: [hook.node, body(start)] });
    expect(film(from).ok).toBe(true);
    expect(film(from === 0 ? 1 : 0).diagnostics.map(d => d.code)).toContain("director-discontinuous-channel");
  });
});
