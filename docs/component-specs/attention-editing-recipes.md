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


## Completed families (13 recipe contracts)

The table describes **implemented code**, not independently certified final video effects.
All motion is an absolute-frame plan or a native Kumiki adapter, not a new video editor.

| Family | Public API | Output / existing renderer | Key validation |
|---|---|---|---|
| R01 HookVariantComposer | \`composeHookVariants\`, \`compileHookVariant\` | Actual \`compileShortHook\` results + common body entry | Equal claim/payoff/timing, compatible subjects and optional end channel samples |
| R02 ImpactTypography | \`compileImpactTypography\`, \`evaluateCaptionImpact\` | CaptionPerformer/AnimatedText hosts apply scale/reveal using premeasured font bounds | Target/safe zone, entry/hold durations, reduced-motion reading state |
| R03 SpeedRamp / Velocity | \`compileSpeedCurve\`, \`speedCurveToNativeClip\` | Native FrameAccurateClip \`timing.remap\`, same source decoder | Positive speed, trim boundaries, clip duration, exact source remap |
| R04 BeatMontage | \`compileBeatMontage\`, \`alignBeatMontage\` | CutDirector receives explicit edited shot boundaries; AudioVisualCue owns speech/music | Hard protected intervals, required cue anchors, readable minimum holds |
| R05 EvidenceSpotlight | \`compileEvidenceSpotlight\` | Existing EvidenceStage and FreezeFrameFocus | Source/citation and claim identity |
| R06 SplitScreenStory | \`compileSplitScreen\` | Existing ComparisonStage and ShortSafeFrame | Distinct subject IDs, comparison axis |
| R07 ValueCascade | \`compileValueCascade\`, \`compileExactValueCascade\` | AnimatedMetric/ChartStory take exact derived prefix totals | BigInt minor-unit sum, basis/unit matching, total and fact references |
| R08 CameraDive + DepthPhoto | \`compileCameraDive\`, \`evaluateCameraDive\`, \`cameraDiveToNativeTimeline\` | Native CameraStage MG1 timeline; optional explicit parallax layers | Context/target rectangles, zoom cap, source/mask/fill requirements |
| R09 MatchTransformation | \`compileMatchTransformation\`, \`matchTransformationToCutPlan\` | Native CutDirector; VT1 for authored geometry morphs | Same semantic ID, screen anchor alignment, topology availability |
| R10 SearchEvidence | \`compileSearchEvidence\`, \`evaluateSearchEvidence\`, \`segmentGraphemes\` | Existing measured text and evidence display hosts | Real source reference or illustrative label, captured screenshot date, Unicode graphemes |
| R11 ImpactAccent | \`compileImpactAccent\`, \`evaluateImpactAccent\` | Original procedural scale/offset/outline/flash samples; host effect adapter | Finite return-to-rest impulse, one restrained flash, reduced motion |
| R12 LoopBridge | \`compileLoopBridge\`, \`inspectLoopContinuity\` | Host MG1/clip evaluation feeds start/end and adjacent samples | Identity, camera/subject C0, approximate C1, visible payoff |
| R13 VisualContradiction | \`compileVisualContradiction\` | ComparisonStage, VT1 or CutDirector according to scene type | Authored contrast, claim + later payoff ID |

### Native adapter examples

Compile a positive-speed curve directly into the existing FrameAccurateClip format:

\`\`\`ts
const velocity = speedCurveToNativeClip(
  placement, { num: 30, den: 1 },
  {
    id: "subject-velocity", outputFrames: placement.durationFrames,
    sourceIn: 35, sourceOut: 110,
    keys: [{ at: 0, speed: 2 }, { at: 0.5, speed: 0.3 }, { at: 1, speed: 1.5 }],
  },
);
if (velocity.diagnostics.some(d => d.severity === "error")) throw new Error("Invalid velocity clip");
<FrameAccurateClip placement={velocity.clip} frame={frame} fps={fps} adapter={adapter} width={width} height={height} />;
\`\`\`

For a real CutDirector match cut, supply the two semantic representations,
anchor bounds and independently authored output geometry:

\`\`\`ts
const result = matchTransformationToCutPlan({
  id: "handoff", fps, durationFrames: 80, semanticId: "same-object",
  mode: "match-cut",
  from: { sceneId: "outside", subjectId: "outside-shape", rect: fromRect },
  to: { sceneId: "inside", subjectId: "inside-shape", rect: toRect },
}, { width: 1080, height: 1920 });
if (!result.native) throw new Error("Match cut must be reframed or given an explicit fallback");
<CutStage plan={result.native} frame={frame} renderScene={renderScene} />;
\`\`\`

For a camera move, compile a native MG1 timeline via
\`cameraDiveToNativeTimeline\` and consume it in \`CameraStage\`.
Alternatively \`evaluateCameraDive(compiled, frame)\` gives an absolute-frame
\`{scale,x,y}\` 2D affine transform. 2.5D layers require actual image, mask and
disocclusion fill assets. Do not invent a depth map. The 3D mode explicitly
requires an authored \`CinematicCameraDirector\` rig and is **not** a 3D camera
autopilot.

### Hard boundaries / safety and fidelity

- No hooks claim to predict virality. Platform analytics and experimentation belong to the publishing application.
- No transcribing, aligning, decoding, pitch-shifting, time-stretching or music analysis is hidden in these compilers.
- A frame may request only a recorded/supplied media frame. Optical-flow interpolation is not implied by velocity remapping.
- A match cut uses geometric anchor checks; a true topology morph needs authored VT1 scenes and mapping.
- A loop rated \`motion-candidate\` is **not** certified pixel- or audio-seamless. Inspect actual rendered pixels and mixed-audio head/tail.
- Source-backed numbers always originate with caller data. Exact value cascades use integer minor units and BigInt for aggregation.
- A source screenshot requires provenance and rights. Test-fixture values in Storybook are explicitly illustrative.
- Readable caption layout/collisions must be measured by CaptionPerformer/ShortSafeFrame in each output; animation plans alone cannot certify text visibility.
- Glitch/RGB offsets must not distort factual source text or trigger repeating high-brightness flashes.
- Reduced motion retains meaning and presents a static or simplified composition without rapid shake/flash.

### Testing and review

\`\`\`bash
npm run typecheck
npx vitest run tests/attention-editing-recipes.test.ts tests/attention-editing-treatments.test.ts --project unit
npm run registry:validate
npm run registry:smoke
npm run catalog:check
npm run build-storybook
\`\`\`

Storybook **Motion → Attention Editing Recipes → Studio** provides a scrubber,
13 recipe selectors, a portrait/landscape switch, reduced-motion toggle,
and three unrelated illustrative subjects. It does not assert human signoff.

Automated gates should be cheap: assert pure samples, source indices, intent,
frame boundaries, semantic IDs and scene-layout bounds. Visual release requires
normal-speed playback and real video export inspection. No mandatory FFmpeg
installation or per-frame Playwright capture should be added to CI.
