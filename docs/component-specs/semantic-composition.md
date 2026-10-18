# Semantic Composition — optional CC1/MD1 bridge

A reusable, source-installable composition API for explainer films. The camera
and motion timeline are still owned by **CC1 and MG1/MD1**; this bridge adds no
renderer, clock or dependency on an image-recognition system.

## Authoring

```tsx
const composition = createSemanticComposition({
  id: "message-submit",
  camera: compiledCameraPlan, targets: cameraTargetRegistry,
  director: compiledMotionDirector,
  subjects: [
    { id: "phone", targetId: "phone", protectText: true, critical: true },
    { id: "send-button", targetId: "send-button", critical: true },
  ],
  actions: [{ id: "tap", event: "tap-send", subjectId: "send-button",
    leadFrames: 8, tailFrames: 10 }],
});
// An MD1 event cue named "tap-send" must exist. IDs and matching cue target
// are checked automatically; action visibility is enforced at its actual frame.
const preflight = composition.inspect({ strideFrames: 1 });
if (!preflight.ok) throw new Error(preflight.issues[0].message);

// Composition supplies frame-specific protected geometry to DOM measurement.
<SemanticCompositionStage composition={composition} frame={frame}
  explanation="The sender submits the message." language="en" maxLines={3}>
  <CameraViewport3D timeline={compiledCameraPlan.timeline} frame={frame}
    cameraMode="pose" createScene={createScene} width={1600} height={900} />
</SemanticCompositionStage>
```

See **Explainers → Semantic Composition → Constructed Device** in Storybook for a complete 3D integration using actual part bounds and an MD1 event cue.

Use the **same absolute frame** for both components. Semantic subjects resolve
their projected positions from the existing CC1 target registry (including
frame-varying Three meshes). Actions resolve against actual MD1 event cues, not
unchecked strings. An event's optional targetId must match the subject's camera
target. Critical subjects and timed actions fail preflight when clipped, outside
the image, or geometrically unavailable; optional ray visibility requires a
registry visibility callback. Projected rectangles reserve actual text space.
Caption placement and font measurement remain the responsibility of
`ExplainerStage`; its impossible-layout fallback is never considered export-ready.

## Limits

This API can reject unfulfilled events, missing camera subjects, invalid output
bounds, and layout collisions; it **cannot** prove that an event cue depicts a
correct physical action, judge artistic quality, or identify unmodeled visual
occlusion. Callers must register meaningful part-level subjects (for example,
the actual send button, not the entire phone). `inspect` samples every frame by
default on critical intervals; use a stride only where deliberately acceptable.
The stage supports authored 16:9/9:16 output and keeps errors visible outside
the film crop. It is not an encoder, DOM object recognizer, or automatic 3D
camera solver. Optional 3D install dependencies stay isolated from base UI.
