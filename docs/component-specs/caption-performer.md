# CaptionPerformer — supplied timed captions at an absolute frame

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0 slice 2 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0)
**Scope:** Renders captions you supply (cue text, cue timings and optionally aligned word timings) at a given frame. It covers word highlighting, emphasis, speaker labels, wrapping and placement in a safe lane. It never transcribes audio, aligns words or estimates word timings. Without supplied words, a cue is shown as one phrase. `CaptionStage` is the static mode: whole phrases with no motion.

## Reuse and the gap it fills
- **Reused:**
  - `segmentText` (media text layout) for locale-aware breaks.
  - `measureDOMTypography` for loaded-font widths.
  - `readableCaptionFrames` from `explainer-principles` for hold checks.
  - `ShortSafeFrame` context for the lane and reserved regions.
  - `inspectSeekParity` in tests.
  - `VideoExportStage` waits while captions measure and refuses to export with caption errors.
- **Not reused:** `animated-text` (`buildKineticTextTimeline`) staggers a preset across tokens on its own schedule. Captions must follow *supplied* word times, so the performer evaluates states directly from the frame and adds no second animation clock.
- **The gap:** before this item, the registry had no caption model, timing validation, word-level highlighting or caption placement that respected reserved UI.

## Install and inspect
- Registry item: `caption-performer` (`caption-track.ts`, `caption-performer.tsx`). It depends on `media-document`, `motion-track`, `explainer-stage`, `explainer-principles` and `short-safe-frame`.
- Storybook: **Visual → Caption Performer**.
  - **Performance:** a two-speaker router explainer in English, Japanese and RTL Arabic, at 9:16 (custom action column and description) or 16:9 (preset insets). Controls cover word/phrase highlighting, static mode, guides, reduced motion, play and seek. The example timings are hand-authored and labelled `manual`; they are not aligned to a recording.
  - **Timing problems:** a late cue, a same-speaker overlap, displayed text that differs from the words, a low-confidence word and an unreadably short cue, each reported. The performer status becomes `error`.

## Minimal usage
~~~tsx
const track: CaptionTrack = {
  id: "ep-12", fps: { num: 30, den: 1 }, timing: { source: "forced-alignment", reference: "aligner output v3" },
  speakers: { a: { label: "Speaker A" } },
  cues: [{ id: "c1", startFrame: 0, endFrame: 78, speakerId: "a", text: "A router reads each packet's destination.", lang: "en",
    words: [{ text: "A", startFrame: 4, endFrame: 8 }, /* … one entry per displayed word … */] }],
};

<ShortSafeFrame profile={profile}>
  <Scene frame={frame} />
  <CaptionPerformer track={track} frame={frame} avoidRegions={[subjectBounds]} onDiagnostics={report} />
</ShortSafeFrame>
~~~

## Contract
- **Track:** `{ id, fps, cues, timing: { source, reference? }, speakers? }`.
  - `source` is `forced-alignment`, `asr`, `manual` or `script-estimate`. A `script-estimate` track may not carry word timings; any it carries are reported and ignored.
  - Each cue is `{ id, startFrame, endFrame (exclusive), text, speakerId?, words?, lang?, dir? }`. Each word is `{ text, startFrame, endFrame, confidence?, emphasis? }`, where `text` must be a verbatim, in-order substring of the cue text. Only spaces and punctuation may sit between words.
- **`validateCaptionTrack(track, { durationFrames?, minConfidence?, reading? })`:**
  - Errors:
    - invalid FPS or cue;
    - `caption-out-of-range`;
    - `caption-speaker-unknown`;
    - `caption-word-timing-unsupported`;
    - `caption-words-mismatch-text`;
    - `caption-word-invalid`;
    - `caption-word-outside-cue` (the cue is late or early for its audio);
    - `caption-word-order`;
    - `caption-cue-overlap` for the same speaker.
  - Warnings:
    - `caption-cue-overlap` across speakers (both cues are stacked);
    - `caption-low-confidence` (default below 0.6);
    - `caption-hold-short` (reading time; Latin and CJK rates).
- **`evaluateCaptionTrack(track, frame)`:** returns the visible cues with entrance and exit amounts and per-word `upcoming`/`active`/`spoken` states. It is a pure function of the frame, so random seeks equal forward play.
- **Layout:**
  - **Wrapping:** `layoutCaptionLines` wraps at locale-aware breaks, or only between supplied word units, so aligned CJK phrases such as ルーターへ never split. It keeps character offsets.
  - **Overflow:** it reports `layout-impossible` instead of truncating or shrinking text.
  - **Placement:** `captionWrapSpans` adds narrower wrap widths beside obstacles. `placeCaptionBlocks` places blocks nearest the anchor. It steps past reserved regions and protected subjects and stacks concurrent cues; when nothing fits, it reports `caption-no-room`.
- **Component props:**
  - `track` and `frame`: the performer owns no clock.
  - `highlight` (`word` | `phrase`) and `anchor` (`bottom` | `top`).
  - `lane`: defaults to the ShortSafeFrame content area.
  - `avoidRegions`: the ShortSafeFrame's interior reserved UI is added automatically.
  - `maxLines` (2), `maxWidth` (0.9 of the lane), `showSpeakers` (`change` | `always` | `never`).
  - `enterFrames` (5), `exitFrames` (3), `reducedMotion` (`auto` follows the user setting; no movement, cues cut).
  - `validation` (`reading` rates and `minConfidence`, passed to `validateCaptionTrack`), `onDiagnostics`, plus forwarded `div` props and ref.
  - The root reports `data-caption-status`: `pending` while fonts load and cues are measured, `ready`, or `error`.
- **Measurement:** every cue is measured once with the loaded DOM font, at each wrap width, before paint and again on resize or font load. Seeking never re-measures, so a seek renders at once.
- **Styling:** colour and background only; weight never changes, so highlights cannot move text.
  - Tokens: `--km-caption-font`, `--km-caption-font-size` (default `4.8cqw`, relative to the ShortSafeFrame width), `--km-caption-ink`, `--km-caption-ink-upcoming`, `--km-caption-active-bg`, `--km-caption-strong`, `--km-caption-accent`, `--km-caption-backdrop`, `--km-caption-label`.
- **Semantics:** caption text stays in the DOM in reading order, and each cue carries `lang` and `dir`. Captions duplicate narration; supply transcripts separately for players that need them.
- **Limits:**
  - Highlighting is only as accurate as the supplied timings. The component cannot detect timings that are wrong but internally consistent.
  - A word unit wider than the lane is a layout error. Long URLs or compounds need a narrower type size or a split cue.
  - Overlapping cues from different speakers stack in the same lane. There is no per-speaker position.
  - Only rectangular avoid regions are supported.

## Verification (2026-10-22)
- `npx vitest run tests/visual-constraints.test.ts`: four caption cases.
  - A clean track, plus seek parity through `inspectSeekParity`.
  - Every timing diagnostic above.
  - Unit-boundary CJK wrapping with offsets and no truncation.
  - Narrowed and lifted placement around reserved UI, with stacking.
- Rendered in Storybook at 1100 px and reviewed by the agent: English portrait, Japanese portrait (two frames), Arabic portrait and landscape with guides, and static mode in dark appearance. Each reported `ready` with 0 warnings and no console errors. The timing-problems story reported `error`.
- Fixed after review:
  - Placement failed beside the action column; cues are now measured at narrower spans.
  - The active-word highlight covered trailing spaces.
  - Japanese broke inside ルーター; lines now break at aligned units.
  - The ShortSafeFrame simulated description overflowed thin landscape bands.
- **Human visual review:** pending. The demo timings are authored, not aligned to audio. Real alignment input and audio sync are still unverified.
