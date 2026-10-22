# FreezeFrameFocus — pause, push in, explain, release

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** §6 short-form recipe, Phase 2 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#6-short-form-editing-treatments-make-these-recipes-not-engines).
**Scope:** A recipe, not an engine. It pauses footage or a procedural animation on an exact frame, pushes in on an annotated detail with a spotlight, explains the detail with measured callouts, then releases and resumes playback where it stopped. It composes FrameAccurateClip (freeze plus an animated crop) with SemanticCallouts (labels on an InspectableAsset built from source-pixel annotations).

## Reuse
- **FrameAccurateClip:**
  - `ClipTiming.freezes` holds the exact source frame.
  - The push-in is an animated `ClipFraming.crop`, so every output draws from source pixels.
  - Any adapter works: image sequence, procedural, browser video or your own.
- **SemanticCallouts:** `layoutCallouts` places measured labels and `SemanticCalloutOverlay` draws them. Annotations become a 2D `InspectableAsset` whose parts and anchors are sampled at the source frame each output frame shows.
- **Pure functions** compute every value per frame, so seeks are exact.

## Install and inspect
- Registry item: `freeze-frame-focus` (`freeze-frame-focus.ts`, `freeze-frame-focus-react.tsx`). It depends on `frame-accurate-clip`, `semantic-callouts`, `inspectable-asset` and `media-document`.
- Storybook: **Video → Freeze Frame Focus**, rendered at 16:9 and 9:16 side by side.
  - **Conveyor:** a procedural animation rendered at 1920×1080. Its annotations come from the generator's geometry on every frame. The freeze lands as the target parcel's label crosses the scan line.
  - **Video:** the in-house synthetic WebM through the browser-video adapter, frozen on frame 60 to examine its frame-index barcode.
  - **Break tracking:** a toggle that removes annotation keys so the recipe refuses to guess.

## Minimal usage
~~~tsx
const spec: FreezeFrameFocusSpec = {
  id: "label-check", clip: { id: "belt", source, startFrame: 0, durationFrames: 240 },
  freeze: { atFrame: 90, durationFrames: 75 },               // optional sourceFrame: freeze on another exact frame
  annotations: [{ id: "label", keys: trackerOutput }],        // [{ sourceFrame, rect (source px) }]
  focus: { annotationId: "label", padding: 1.3 },
  callouts: [{ id: "what", annotationId: "label", title: "Route 7, stop 3", detail: "Printed on the label" }],
};
const problems = validateFreezeFocus(spec, fps, [{ width: 1080, height: 1920, framing }]);
<FreezeFrameFocus spec={spec} frame={frame} fps={fps} adapter={adapter} width={1080} height={1920} framing={framing} description="…" />;
~~~

## Contract
- **Annotations:** `{ id, label?, keys: [{ sourceFrame, rect }] }`, in source pixels and keyed to source frames (for example, from a tracker or a generator).
  - Regions are linear between keys.
  - **Outside the keyed range a region is untracked.** It is never extrapolated: no callout is placed, and validation reports `annotation-untracked` when the frozen frame is untracked.
- **Freeze:** `{ atFrame (clip-local output frame), durationFrames, sourceFrame? }`. The freeze is added to the clip's existing timing (`freezeFocusClip`), and playback resumes where it paused.
- **Focus:** `{ annotationId, padding (0.35), pushInFrames (min 18, ¼ of the freeze), releaseFrames (min 14, ⅕), easing, dim (0.55) }`.
  - The push-in reaches a crop around the detail at the output's aspect ratio, kept inside the source. Zoom is interpolated geometrically, so magnification appears constant-speed.
  - Phases are `before`, `push-in`, `hold`, `release` and `after`.
- **Callouts:** `{ annotationId, delayFrames?, …CalloutSpec }`. They appear after the push-in (plus `delayFrames`) and disappear at the release. They never cover the detail (it is a protected region) or each other.
- **Functions:**
  - `evaluateFreezeFocus(spec, frame, fps, box, framing?)` returns `{ phase, amount, framing, draw, focusRect, dim }` for one output box.
  - `footageInspectable(spec, fps)` builds the annotation asset, and `freezeFocusCallouts(spec)` gives the windowed callout specs.
  - `annotationRect` and `frozenSourceFrame` are helpers.
- **`validateFreezeFocus(spec, fps, boxes)`:**
  - Runs the clip's own validation.
  - Errors: `freeze-outside-clip`, `freeze-too-short` (no hold remains), `focus-unknown`, `annotation-invalid`, `annotation-untracked`, `callout-annotation-unknown`.
  - Warnings per output box: `clip-upscaled` at full push-in (supply a higher-resolution source) and `focus-region-cropped` (the detail cannot fit that output).
- **Component:** `FreezeFrameFocus` owns no clock. Its props are `spec`, `frame`, `fps`, `adapter`, `width` / `height`, `framing`, `description`, `typography` (callout fonts as a concrete stack, because canvas measurement cannot resolve CSS variables), `calloutTheme`, `requireExact` and `onStatus`.
  - The root reports `data-freeze-phase`.
  - The spotlight is an SVG mask with a rounded outline (`--km-freeze-dim`, `--km-freeze-outline`).
- **Limits:**
  - Rectangular annotations only, with straight leaders (SemanticCallouts limits).
  - Tracking data must come from you, a tracker or a generator; the recipe does no tracking.
  - During the freeze the outgoing audio lane is not paused, because audio is a separate lane. Use AudioVisualCue or your mix to duck or pause it.

## Verification (2026-10-22)
- `npx vitest run tests/finance-objects-platforms.test.tsx`: four cases.
  - **Freeze and resume:** the freeze is added, the exact frame is held (including an explicit `sourceFrame`), and playback resumes (output 210 shows source 125). Annotation interpolation stops at the end of the keyed range.
  - **Framing:** phases and amounts are correct, the detail stays inside the box at full push-in with upscaling ≤ ×1.5, and the release returns to the original framing. Seek parity holds.
  - **Validation:** every error above is produced, and `focus-region-cropped` is reported for a wide detail in 9:16.
  - **Callouts:** they are inactive outside the hold, anchored on the tracked detail's centre, and never cover it.
- Rendered in Storybook and reviewed by the agent.
  - **Conveyor:** before (source 60), push-in and hold (frozen on 90, sharp label, callouts clear of the detail), release, and resume (source 125), in both outputs, with no warnings.
  - **Video:** frozen on 60 and verified through the browser-video adapter; it honestly reports `clip-upscaled` and `focus-region-cropped` for the barcode in 9:16.
  - **Break tracking:** refused with `annotation-untracked`.
  - No console errors.
- Fixed after review:
  - The `.ts` and `.tsx` files shared a name and shadowed each other, so the component moved to `freeze-frame-focus-react.tsx`.
  - Callback side effects during render were removed.
  - The default callout font used a CSS variable that canvas can't measure.
  - The conveyor push-in enlarged a 960-wide source ×4.85; it is now rendered at 1920 with more padding.
  - The new `focus-region-cropped` warning catches details cut off in an output.
- **Human visual review:** pending.
