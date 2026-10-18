# Explainer Stage — Phase 2

A reusable protected visual with measured plain-text explanation. Import from
`registry/visual/explainer-stage`; the pure planner is `planExplainerLayout`.
Install the `explainer-stage` registry item for a standalone source copy.

```tsx
const subjects = [{ id: "primary", region: { x: .08, y: .16, width: .42, height: .65 },
  portraitRegion: { x: .1, y: .08, width: .8, height: .48 } }];

<ExplainerStage subjects={subjects} protect={["primary"]} aspect="auto">
  <ExplainerVisual>
    {({ subjects, orientation }) => <MyVisual subjects={subjects} orientation={orientation} />}
  </ExplainerVisual>
  <ExplainerText lang="en" maxLines={6} style={{ fontSize: 24, lineHeight: 1.4 }}>
    The explanation occupies measured space beside or below the protected subject.
  </ExplainerText>
</ExplainerStage>
```

Declare actual normalized output-space subject/action bounds, including movement
for the displayed frame. The render slot receives resolved portrait/landscape
regions so visual placement and protection share the same data. Static children
are also accepted. Exactly one direct visual and one direct text slot are required;
fragments, nested slots and rich text are intentionally outside this first API.
All slots forward refs, className, style and native DOM attributes. Typography is
customizable; stage-owned positioning, margins, white-space, padding and borders
are reserved. Do not apply transforms, generated content or text-overflow rules to
the explanation. Its CSS font, shaping and letter spacing are measured in a hidden
DOM paragraph with no duplicate IDs. No global stylesheet is required.

`aspect`: `16:9`, `9:16`, or `auto` (portrait below 600 actual CSS pixels).
`safeMargin`: normalized inset, default .06, range [0,.3).
`gapPx`: separation, default 20 CSS pixels. `maxLines` is a positive integer.
`subjects` contains named `region` and optional `portraitRegion`; `protect` names
those that must not be covered. Unknown or duplicate subject IDs are diagnostics.
Multiple protected rectangles are conservatively combined for placement candidates;
the planner does not try to squeeze text into arbitrary holes between subjects.

Layout uses actual rendered width, loaded font metrics and language segmentation;
it never shrinks typography or drops essential words to pass. Resize, typography,
content and font loading cause remeasurement. `onLayout(result)` receives changed pure planner success/error results.
Identical results are deduplicated, so storing them in parent state is supported.
`data-layout-status` is `pending`, `ready`, or `error`; `aria-busy` represents pending.
Before hydration/measurement the visual is present and the explanation is pending.
On failure, the entire original explanation appears below the scene, alongside an
actionable `role="alert"`. This fallback can exceed the fixed scene aspect and must
be resolved before video export. Watch for `ready` before capturing a frame.

## Camera and choreography

```ts
const contract = {
  criticalSubjects: [{ id: "action-visible", targetIds: ["action"],
    startFrame: 0, endFrame: 90 }], // every integer frame by default
  tracking: [{ shotId: "follow", movingId: "pulse", fromId: "start", toId: "end",
    searchStart: 0, searchEnd: 90, proximity: .3, leadFrames: 6, tailFrames: 3 }],
};
const result = compileCinematicCamera(sequence, targets, contract);
if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n"));
// Optional precompiled-plan preview guard; memoize immutable inputs.
<CinematicCameraDirector plan={result.plan} targetRegistry={targets}
  contract={contract} frame={frame} createScene={createScene} />
```

The third argument is additive; existing two-argument compilation is unchanged.
The compiler checks existing CC1 poses with `inspectCriticalCameraFrames`, and
uses `deriveSemanticTrackingWindow` to require a named follow shot to cover the
actual arrival/lead/tail window. Failed contracts return normal compilation
errors. Preview guards run once per plan/registry/contract identity, before GPU
mounting. Change registry revision and recompile when geometry changes. To derive
shot timing from MD1, use the existing `deriveEventWindow` and
`cameraShotBetweenEvents`; recompilation makes choreography changes authoritative.

For a camera-backed visual, project the current frame's target bounds with the
existing `evaluateCameraPose3D` and `projectCameraBounds`, then pass those rectangles
as stage subjects. Use the same output aspect for camera compilation and stage.
The stage does not discover arbitrary semantic subjects from opaque child scenes.

## Guarantees and limits

Checks use DOM font geometry, declared rectangles and frame-domain camera geometry.
They make no LLM requests, classify no images, and add no animation clock. Geometric
framing is not a guarantee about occlusion, materials, teaching quality or aesthetics.
Sparse explicit `strideFrames` skips unsampled frames; the new contract defaults to 1.
The stage does not infer subject motion or automatically retime camera shots.

Storybook: **Explainers / Explainer Stage** — responsive, landscape, portrait CJK,
impossible-layout and typography-change examples. Tests cover pure planning,
public React composition, compiler/preview integration and browser-rendered bounds.
