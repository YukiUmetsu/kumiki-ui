# FrameAccurateClip — deterministic footage with pluggable decoding

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, Phase 2 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Shows real footage (a video, an image sequence or code-drawn frames) so that output frame N always shows the same source frame, whatever the playback history. It covers trim, rate, reverse, freezes, full time remaps, variable-frame-rate sources and independent reframing per output. Decoding is delegated to an adapter that declares what it can guarantee. Audio is a separate lane: a source may reference a track, but the clip never plays it.

## Reuse and the gap it fills
- **Reused:** `evaluateEasing` for time-remap curves. `VideoExportStage` now waits for pending clip frames, refuses clip errors, and refuses any frame whose drawn source frame differs from the expected one. The tests use `inspectSeekParity`.
- **The gap:** `media-frame` places static media and `video-export-stage` captures frames, but nothing mapped output time to exact source frames or reported when a decoder showed the wrong frame.

## Install and inspect
- Registry item: `frame-accurate-clip` (`frame-clip.ts`, `frame-clip-adapters.ts`, `frame-accurate-clip.tsx`). It depends on `motion-track`.
- Storybook: **Video → Frame Accurate Clip**.
  - The same synthetic footage runs through each adapter (procedural, image sequence or browser video) with seven timing presets: play, 0.5×, 2×, reverse, a freeze on frame 45, a speed ramp and a trim that hides afterwards.
  - It renders a 16:9 full-frame box and an independently reframed 9:16 box, with `requireExact` available.
  - The panel decodes a 10-bit barcode in the footage **from the canvas pixels** and compares it with the expected source frame.
- **Test footage** is generated in-house, with no third-party media: `src/video/assets/synthetic-frame-counter.webm` (480×270, 30 fps, 120 frames, VP9, 211 KB). The FFmpeg command is in the story header. The top 24 px strip encodes the frame index in 10 blocks of 48 px, most significant bit first.

## Minimal usage
~~~tsx
const source: ClipSource = { id: "interview", width: 1920, height: 1080, frameCount: 900, fps: { num: 30000, den: 1001 }, licenseRef: "…", sha256: "…" };
const placement: ClipPlacement = { id: "a-roll", source, startFrame: 120, durationFrames: 240,
  timing: { trimIn: 300, freezes: [{ atFrame: 90, durationFrames: 45, sourceFrame: 392 }] } };
const adapter = useMemo(() => createImageSequenceAdapter({ url: (s, i) => `/frames/${s.id}/${String(i).padStart(5, "0")}.png` }), []);

<FrameAccurateClip placement={placement} frame={frame} fps={{ num: 30, den: 1 }} adapter={adapter}
  width={1080} height={1920} framing={{ fit: "cover", focus: { x: 0.62, y: 0.4 } }} requireExact={exporting}
  description="Interviewee explaining the wiring diagram" />
~~~

## Contract
- **Source:** `{ id, width, height, frameCount, fps? | timestamps?, alpha?, sha256?, licenseRef?, audio? }`. Rational `fps` handles constant rates such as 30000/1001. Per-frame `timestamps` (seconds, strictly ascending) handle variable frame rate and take precedence.
- **Placement:** `{ id, source, startFrame, durationFrames, timing? }`. All `timing` fields are optional:
  - `trimIn` / `trimOut`: source frame range.
  - `rate`: a number or rational; negative plays backwards from `trimOut - 1`.
  - `freezes: [{ atFrame, durationFrames, sourceFrame? }]`: pause, then resume where playback stopped. `sourceFrame` freezes on a specific frame to examine.
  - `remap: [{ frame, sourceFrame, easing? }]`: a full time remap that overrides rate and freezes (speed ramps, holds, rewinds).
  - `sampling`: `floor`, the frame on screen at that time (default), or `nearest`.
  - `end`: `hold` the last frame (default) or `hide` once the trimmed source runs out.
- **Pure functions** (no DOM):
  - `resolveClipFrame(placement, outputFrame, fps)` returns `{ visible, phase (before | playing | frozen | held | exhausted | after), localFrame, sourceFrame, sourceTime }`. It depends only on its inputs, so random seeks equal forward play.
  - `clipFrameTime` and `clipFrameAt` convert between frames and seconds, constant or variable rate.
  - `validateClip` reports errors for invalid clips, sources, timestamps, trims, rates, freezes and remaps. It warns `clip-source-exhausted` and `clip-remap-overrides`.
  - `resolveClipDraw(source, box, { crop?, fit: cover | contain, focus? })` maps source to box. `inspectClipFraming` reports invalid crops and upscaling beyond ×1.5 (configurable).
  - `checkClipCapabilities(placement, adapter, { requireExact })` reports errors for inexact decoders, dropped alpha, unsupported variable frame rate and oversized sources, and warns on a missing licence.
- **Adapters (`ClipFrameAdapter`):** `{ id, capabilities: { exactFrames: true | "verified" | false, alpha, vfr, maxDimension? }, load(source, index, signal) → { image, width, height, exact, presentedTime? }, dispose? }`. Adapters must reject rather than substitute another frame.
  - `createImageSequenceAdapter({ url, cacheSize?, crossOrigin?, alpha? })`: exact. Works with PNG, JPEG or WebP files, data URLs or a frame server; it has an LRU cache.
  - `createProceduralAdapter({ draw, alpha? })`: exact. Frames are drawn by code (synthetic plates, data-driven footage, tests).
  - `createVideoElementAdapter({ url, toleranceFrames?, timeoutMs?, verifyTimeoutMs?, cacheSize?, crossOrigin? })`: **verified per frame**.
    - It seeks a hidden `<video>` to the middle of the frame's display interval.
    - It registers `requestVideoFrameCallback` before seeking and accepts the frame only if the presented media time is within half a frame of the requested frame. Otherwise it returns `exact: false`.
    - A load or seek that never completes (for example, an unsupported codec) fails after `timeoutMs` instead of hanging.
  - **Custom adapters:** WebCodecs plus a demuxer, a server-side frame API or a native bridge implement the same interface. Nothing else changes.
- **Component props:**
  - `placement`, `frame` and `fps`: the clip owns no clock.
  - `adapter`; `width` / `height` (the box in output px); `framing`; `requireExact`.
  - `description` (the canvas's accessible name), `onStatus`, plus forwarded `div` props and ref.
- **Component status:**
  - `data-clip-status` is `pending`, `ready`, `inexact`, `hidden` or `error`.
  - `data-expected-source-frame` and `data-source-frame` give the requested and drawn frames; `data-clip-phase` gives the phase.
  - Only the latest request may draw; superseded loads are aborted.
  - Status is derived during render: the clip reads `pending` until the drawn source frame, framing and box match the current request. Right after a seek, or during a framing-only push-in, capture tools never see a stale `ready`. Errors count only for the request that failed.
  - Errors are shown in an alert inside the box. Unverified frames are `inexact` in preview and `error` with `requireExact`.
- **Limits:**
  - Codec support for the video adapter is the browser's. Playwright's Chromium cannot decode H.264, which is why the test footage is VP9.
  - No container demuxing or WebCodecs adapter ships, to keep dependencies minimal; it plugs in through the interface.
  - No alpha video adapter ships.
  - Framing uses rectangles only; masks come from the surrounding composition.
  - Large image sequences need a consumer-side preload or frame-server strategy beyond the LRU cache.

## Verification (2026-10-22)
- `npx vitest run tests/finance-objects-platforms.test.tsx`: five clip cases.
  - **Timing:** rate, rational slow motion, reverse, freeze and resume, freeze on a chosen frame, speed-ramp remap, trim with hold and hide.
  - **Variable frame rate:** floor and nearest sampling, plus seek parity.
  - **Validation:** every validation error.
  - **Framing and capabilities:** contain and cover with focus, upscaling and crop errors; capability gaps, including that a `"verified"` adapter is accepted under `requireExact` while `false` is not.
  - **Component:** a stale request never overwrites the latest frame, and an unverified frame under `requireExact` becomes a visible error.
- Rendered in Storybook (Playwright Chromium, headless) and reviewed by the agent:
  - **Browser video:** frames 0, 1, 60, 119, reverse (89, 29), freeze (45), speed ramp (35) and 0.5× (20) were all `ready`.
  - **Readback:** the barcode decoded from the canvas pixels matched the expected source frame every time. With `requireExact`, the video adapter stayed `ready` because every frame verified.
  - **Exact adapters:** the procedural and image-sequence adapters matched on every preset, and the trim preset hid the clip after its range.
  - No console errors.
- Fixed after review:
  - **H.264 footage:** the browser never loaded it and the clip stayed `pending` indefinitely. The footage is now VP9, and a load timeout surfaces such failures as errors.
  - **Frame verification:** the callback was registered after `seeked`, so nothing was ever verified. It is now registered before seeking.
  - **Capability states:** verified adapters were refused under `requireExact`, so `exactFrames` gained a `"verified"` state.
  - **Story wording:** timing presets with special characters didn't survive the Storybook URL, and one caption overstated what the reframe showed.
- **Human visual review:** pending. Real camera footage (H.264/HEVC in Chrome or Safari, true variable frame rate, alpha) has not been exercised.
