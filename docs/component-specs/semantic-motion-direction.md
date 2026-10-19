# Semantic Motion Direction — SD1 + XP1

**Purpose:** encode *why* a scene moves, not just *how*. General across lessons, product videos, architectural explainers, algorithms, charts and document workflows. **No screenshot recognition, OCR, LLM reviewing, extra animation clock or new runtime dependencies.**

**Install:** registry item `semantic-motion-direction` (requires `motion-track`). Source:
`registry/motion/semantic-direction.ts`, `semantic-transfer-svg.tsx`,
`registry/visual/semantic-labels.ts`, `explainer-preflight.ts`.

## One declarative contract

```ts
import type { SemanticDirectionScene } from "./components/motion/semantic-direction";
const plan: SemanticDirectionScene = {
  id: "request-flow", width: 1280, height: 720, durationFrames: 180,
  elements: [
    { id: "request", semanticId: "input-42", role: "subject",
      bounds: { x: 80, y: 180, width: 240, height: 130 } },
    { id: "processor", semanticId: "processor", role: "subject",
      bounds: { x: 670, y: 180, width: 290, height: 130 } },
    { id: "caption", semanticId: "caption", role: "label",
      bounds: { x: 450, y: 490, width: 370, height: 46 },
      text: "A request becomes a response" },
  ],
  beats: [{
    id: "explain", range: { startFrame: 0, endFrame: 180 },
    claim: "The processor responds to the request",
    visualChange: "A named input travels into the processor",
    focusId: "request", mode: "demonstrate",
  }],
  transfers: [{
    id: "payload", semanticId: "input-42", intent: "transport",
    fromId: "request", toId: "processor",
    range: { startFrame: 42, endFrame: 108 }, fadeFrames: 8,
  }],
  camera: [{
    id: "fixed", kind: "hold", targetId: "processor",
    reason: "The entire data transformation is already visible",
    range: { startFrame: 0, endFrame: 180 },
  }],
};
```

All ranges are **absolute, integer, end-exclusive frames**. Object IDs are unique *instances*; `semanticId` is durable identity for a payload across representations. A transfer requires source and destination object IDs, an explicitly named semantic payload, an intent (`transport`, `transform`, `highlight`) and a real active window. Static establishing beats set `mode: "establish"`; do not invent motion just to fill time.

### Reuse the existing storyboard (recommended)

`scene-storyboard` remains the **editorial source of truth**. Instead of repeating claims in another document, map it into the geometry contract:

```ts
import { directionFromStoryboard } from "./components/motion/semantic-direction";
const plan = directionFromStoryboard(existingStoryboard, {
  width: 1280, height: 720, elements: semanticObjects,
  transfers: namedTransfers, camera: explicitCameraPurposes,
});
```

The storyboard already defines each shot's `claim`, `visualObjective`, and `focusTarget`. The adapter binds them to real geometry without adding a second timeline.

**Interactive Storybook demonstration:** `Motion → Semantic Direction → Causal Transfer`. Scrub frame 0–119: no connector before frame 30, one named data packet during the transfer, no connector after frame 92. The example validates *its rendered badge placements* using this preflight before the story loads.

## Render only meaningful movement

```tsx
import { SemanticTransferSvg } from "./components/motion/semantic-transfer-svg";
// Inside your existing authored <svg> and absolute-frame player:
<SemanticTransferSvg frame={frame} transfer={plan.transfers![0]}
  fromBounds={requestBoundsAt(frame)} toBounds={processorBoundsAt(frame)}
  color="#7be7d3">
  <rect x={-34} y={-14} width={68} height={28} rx={8}/>
</SemanticTransferSvg>
```

The renderer returns **null** before departure and after arrival, reveals a causal connector only during transit, and positions the **same payload** deterministically. Bounds may be taken from SVG layout or Three.js projections; no independently ticking `requestAnimationFrame`.

## Place text using real measurements

```ts
import { layoutSemanticLabels } from "./components/visual/semantic-labels";
const labels = layoutSemanticLabels({
  viewport: { width: 1280, height: 720 },
  subjects: [{ id: "processor", bounds: processorBounds }],
  labels: [{ id: "processor-name", targetId: "processor",
    width: measuredWidthPx, height: measuredHeightPx,
    priority: 10, preferred: ["above", "right"] }],
});
if (!labels.ok) throw new Error(`Unplaced labels: ${labels.unplaced.join(", ")}`);
```

**Measure the loaded font** with Kumiki's existing `dom-text-measure` or your SVG/Canvas text measurer. Never compute width by multiplying character count. The planner chooses a nearby side based on viewport bounds, registered object bounds, and previously placed labels; it **does not silently clip text**. Replan at semantic geometry keyframes, not necessarily every frame.

## Deterministic composition preflight

```ts
import { validateExplainerComposition } from "./components/visual/explainer-preflight";
import { semanticSampleFrames } from "./components/motion/semantic-direction";
const frames = semanticSampleFrames(plan); // 0, end, relevant event boundaries/midpoints
const result = validateExplainerComposition(plan, {
  minLabelGap: 12, maxConcurrentLabels: 4,
  samples: frames.map(frame => ({
    frame, bounds: measuredBoundsAt(frame),
    cameraPose: sampledCameraPoseAt(frame), // optional: for hold drift
  })),
});
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
```

Pure, sparse geometry checks: invalid identities/windows, missing scene objective or camera reason, invalid named payloads/endpoints, measured **label/subject overlap and clipping**, duplicate visible label text, invalid sample references/numbers, and optional **focus reversal or unintended hold movement**. Diagnostics include stable codes, scene IDs and frame numbers. Treat errors as authoring failures; warnings remain advisory because an intentionally decorative transfer or camera move may be valid.

**Safe baseline:** Calling `validateExplainerComposition(plan)` without samples (or with `samples: []`) still checks the declared base geometry at structural event boundaries, midpoints, visibility starts/ends, and the first/last frame. In particular, it cannot return `ok: true` merely because `inspectedFrames` was zero. Pass **one sample per frame**, with any per-frame element overrides under `bounds`; duplicate frames, unknown IDs, invalid rectangles and nonfinite camera values are errors. For moving layouts, sample the important intermediate keyframes as well: a base-bounds pass **does not prove** motion between keyframes is free of collisions.

`camera` is **intent metadata** sitting above existing Kumiki CC1 camera authoring, not a second camera solver. To check a `focus` move, declare `screenTarget: {x,y}` and pass `samples[].cameraFocus[semanticTargetId]` measured after projection. A `hold` can pass pose arrays. Do not require extra camera motion if no visual objective justifies it.

### Scope and limitations

- **What is automatic:** pure, inexpensive validations over author-supplied structured data/actual measured rectangles; visibility and transfer geometry use the same absolute frame as the video. No screenshot, browser, GPU, network request, external AI service or OCR.
- **What cannot be inferred:** semantic accuracy of narration, the artistic value of a metaphor, undeclared custom-SVG text, handwritten glyph footprints, color contrast, or objects hidden behind 3D surfaces. For these, author semantic metadata and resolve actual projected bounds. Tests cannot replace one normal-speed artistic review.
- **Performance:** O(samples × visible labels × visible objects) collision checks and O(transfers) temporal checks. `semanticSampleFrames` defaults to structural boundaries/midpoints **and element visibility boundaries**; authors may add sparse camera/label keyframes. Avoid a frame-by-frame playback loop or image recognition for preflight. Camera intent is only evaluated when corresponding pose/focus measurements are supplied; an unmeasured camera cannot be certified as stable.
- **Default focus:** scene `claim` + `visualChange` + `focusId`. Prefer one claim and one dominant action. Use `semanticId` handoffs, not generic moving particles. Avoid topic-specific primitives such as `DocumentExtraction`: a general **representation transformation** can map PDF→text, AST→IR, pixels→features or response→chart.

**Future additive improvements:** richer spatial text reflow; mapping camera-intent vocabulary to CC1 shot recipes; optional incremental compilation into Storyboard and ExplainerSequence when needed. Keep this lightweight core renderer-neutral.
