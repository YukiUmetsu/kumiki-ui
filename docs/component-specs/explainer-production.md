# Explainer Production (ES1)

**Optional registry item:** `explainer-production` (depends on `semantic-composition` and `semantic-motion-direction`). This is one authoring/preview bridge, not a second animation engine, GPU renderer, speech synthesizer or video encoder.

| API | Responsibility |
| --- | --- |
| `compileExplainerSequence(spec, targets)` | Camera/MD1 compilation, narration/action cues, closing summary, and **automatic XP1 geometry QA when `preflight` is authored** |
| `evaluateExplainerFrame(sequence, frame)` | Stateless random seek: shot, CC1 pose, MD1 evaluation, cues |
| `<ExplainerPlayer>` | Single preview playhead, frame-accurate scrubbing, protected-caption stage |
| `<ExplainerFrameCapture ref>` | Output-sized DOM, seek and await font/image/layout/render readiness |

Shots are sequential end-exclusive intervals. The final shot must set `role: "summary"`. Each shot separately declares essential on-screen explanation and optional spoken narration; avoid transcript-length captions. Each action has a local frame and optional lead/tail visibility windows, all inside the shot. Both camera and MD1 use the same rational FPS and compiled duration.

## Authoring example

```tsx
import { compileExplainerSequence } from "./registry/visual/explainer-sequence";
import { ExplainerPlayer } from "./registry/visual/explainer-player";
import { CameraViewport3D } from "./registry/motion/camera-viewport-3d";

const result = compileExplainerSequence({
  schemaVersion: 1, id: "unit-tour", title: "Inspect the unit",
  fps: { num: 30, den: 1 }, output: { width: 1600, height: 900 },
  cameraProfile: "technical",
  subjects: [
    { id: "unit", protectText: true },
    { id: "power-button", protectText: false },
  ],
  shots: [
    { id: "overview", durationFrames: 60,
      camera: { type: "inspect", target: "unit", framing: "wide", movement: "hold" },
      explanation: "This enclosure connects devices through physical ports.",
      narration: { text: "Here are its physical connections.", language: "en" } },
    { id: "activation", durationFrames: 60,
      camera: { type: "inspect", target: "power-button", framing: "medium", movement: "hold" },
      explanation: "The power control is accessible at the front.",
      actions: [{ id: "press", subjectId: "power-button",
        atFrame: 30, leadFrames: 5, tailFrames: 5 }] },
    { id: "takeaway", role: "summary", durationFrames: 60,
      camera: { type: "inspect", target: "unit", framing: "wide", movement: "hold" },
      explanation: "Key takeaway: clearly labeled ports and accessible controls." },
  ],
}, targets); // targets is the existing CC1 CameraTargetRegistry.
if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("; "));
const sequence = result.sequence;

<ExplainerPlayer sequence={sequence} renderVisual={state =>
  <CameraViewport3D timeline={sequence.director.timeline}
    frame={state.frame} evaluation={state.motion.evaluation}
    cameraMode="pose" reducedMotion={false}
    width={sequence.spec.output.width} height={sequence.spec.output.height}
    createScene={createScene} />
} />;
```

The caller owns the 2D/3D scene, fonts, narration/audio and asset lifecycle. `createScene` must be stable (memoized) and evaluate object transforms from the absolute frame. The camera is derived from the *same* CC1 timeline. Compilation returns diagnostics for invalid timing, missing subjects, MD1 cues, and camera constraints. Optionally inspect critical frames with `sequence.composition.inspect({ strideFrames: 1 })`; no screenshot recognition is required.

## Opt-in screenshot-free preflight

Keep the old two-argument compile call. Adding `spec.preflight` activates SD1/XP1 **during compilation**, not as a separate manual QA step. The compiled result includes `sequence.preflight` with sparse-frame coverage; preflight errors prevent production and warnings are returned as regular diagnostics.

```ts
const spec = {
  // ... the same ExplainerSequenceSpec and shots ...
  shots: [
    { id: "overview", durationFrames: 60,
      camera: { type: "inspect", target: "unit", movement: "hold" },
      explanation: "The unit receives the request.",
      intent: { focusId: "unit", visualChange: "Reveal the receiving unit" } },
    { id: "summary", durationFrames: 60, role: "summary",
      camera: { type: "inspect", target: "unit", movement: "hold" },
      explanation: "The unit processed the request.",
      intent: { focusId: "unit", visualChange: "Show the processed result" } },
  ],
  preflight: {
    elements: [
      { id: "unit", semanticId: "unit-1", role: "subject",
        bounds: { x: 120, y: 150, width: 350, height: 250 } },
      { id: "caption", semanticId: "caption", role: "label",
        text: "Request processed", bounds: measuredCaptionBounds },
    ],
    // Add real measured/layout-projected moving bounds when available:
    samples: [{ frame: 30, bounds: { caption: measuredBoundsAt(30) } }],
    options: { minLabelGap: 12, maxConcurrentLabels: 4 },
  },
} satisfies ExplainerSequenceSpec;
const compiled = compileExplainerSequence(spec, targets);
if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
console.log(compiled.sequence.preflight?.inspectedFrames);
```

The compiler derives each semantic beat's **claim** from the shot's `explanation`, its **frame range** from the compiled shot, and its focus/change from the shot's `intent`. Authors do **not** supply separate XP1 scene dimensions, duration, or beat timings; retiming shots does not leave stale semantic ranges. When enabled, every shot needs `intent.focusId` (an element ID) and a falsifiable `intent.visualChange`.

The compiler checks the standard event boundaries even when extra geometry samples are passed. Override the exact boundary frames when the scene genuinely changes there; base rectangles apply to unsampled frames. This **checks declared data only**, not undeclared SVG glyphs or occlusion; do not claim screenshot-quality verification. For camera hold/focus diagnostics, provide explicit camera-intent metadata and measured `samples[].cameraPose` / `cameraFocus`. An unspecified camera intent is not treated as automatically stable.

No Playwright, OCR, LLM calls, image analysis, second animation clock, or new runtime dependencies are introduced.

## Frame capture

```tsx
const captureRef = useRef<ExplainerFrameCaptureHandle>(null);
<ExplainerFrameCapture ref={captureRef} sequence={sequence}
  renderVisual={state => <CameraViewport3D timeline={sequence.director.timeline}
    frame={state.frame} evaluation={state.motion.evaluation}
    cameraMode="pose" reducedMotion={false}
    createScene={createScene} width={1600} height={900} />} />;
// Once mounted:
const element = await captureRef.current!.seek(90);
```

`seek(frame)` waits for loaded fonts, decoded images, the *current frame's* safe caption layout, and 3D canvas readiness. Optional `prepareFrame(frame)` synchronizes host-owned GPU/asset work. The host takes a browser screenshot of `element` and encodes/mixes audio/video externally. A capture-ready DOM is not an MP4 encoder or a guarantee of visual artistry.

## Run Playwright manually (not in CI)

```bash
cd kumiki-ui
npm ci
npx playwright install chromium
npx playwright test -c playwright.storybook.config.ts
```

Storybook Playwright starts its own preview server and covers DOM typography/subject protection. To run a single file, append its test path after the config flag. To run the separate default Vite-browser suite, use `npx playwright test` (or `npm run test:e2e`). CI retains TypeScript, unit/integration, registry and clean-install checks; it does not install Chromium.

**Review visually:** multiple shots, camera cuts/transitions, action framing, text legibility, and a readable summary on a directly sought final frame. Full GPU pixel checks remain manual.
