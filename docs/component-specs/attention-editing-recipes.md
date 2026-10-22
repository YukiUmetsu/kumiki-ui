# Attention Editing Recipes

**Status:** Initial implementation slice. These recipe compilers emit deterministic, frame-addressable editorial plans; they do not render scenes or claim to measure virality.

## Architecture

The registry item `attention-editing-recipes` builds on the existing MotionDirector, CutDirector, CaptionPerformer, AudioVisualCue, ShortSafeFrame, and FrameAccurateClip contracts. It introduces no renderer, clock, audio mixer, or independent animation engine. Consumers translate the plan's semantic beats into existing director nodes and renderer-specific treatments.

## Recipes currently implemented

- `compileHookVariant`: action-first, unexpected reveal, impact statistic, transformation, and evidence-question openings; validates claim, subject and payoff anchors.
- `compileImpactTypography`: semantic entrance/read beats and style selection (`snap`, `overshoot`, `wipe`, `word-highlight`, `count-up`) with target and safe-zone requirements.
- `compileBeatMontage`: converts supplied beat markers to shot intervals and warns when shots are shorter than the configured minimum. It does not infer beats from audio.
- `compileSpeedRamp` / `resolveSpeedRampFrame`: maps output frames to source frames with deterministic linear or easing-based interpolation. The actual clip renderer remains FrameAccurateClip.
- `compileSplitScreen`: establishes two distinct subjects and a shared comparison dimension.
- `compileValueCascade`: requires units, contributors and a source reference; it never invents numbers.
- `compileEvidenceSpotlight`: links evidence, a focused region, a source and a claim.
- `compileVisualContradiction`: familiar state → contrasting state → question, linked to a later payoff.
- `compileLoopBridge`: models opening/body/bridge beats and warns when supplied endpoint signatures differ.

## Shared contract

Every plan uses integer frames, rational FPS, stable beat IDs, explicit subject IDs, half-open intervals `[startFrame, endFrame)`, metadata, and structured diagnostics. Evaluators are pure: the same inputs and frame resolve the same output independent of playback history. Recipes are descriptive; they do not assert that the semantic claim is true or that the hook will perform well.

## Example

```ts
const plan = compileHookVariant({
  id: "opening", fps: { num: 30, den: 1 }, durationFrames: 90,
  strategy: "unexpected-reveal", claimId: "claim-hidden-cost",
  payoffId: "cost-breakdown", subjectIds: ["house"], surprise: "hidden ownership costs",
});
if (plan.diagnostics.some(d => d.severity === "error")) throw new Error("Invalid hook plan");
```

## Verification

Run `npx vitest run tests/attention-editing-recipes.test.ts` and `npm run registry:validate`. This is the first recipe slice, not completion of every treatment in the broader design: camera dive, match transformation, search evidence, 3D parallax, and visual/audio export review remain follow-up work.
