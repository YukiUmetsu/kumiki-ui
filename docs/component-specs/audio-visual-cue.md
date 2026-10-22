# AudioVisualCue — visual events timed to narration, music and sound effects

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, Phase 2 of [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Takes the timing data your audio pipeline already produces (word alignments, subtitles, TTS timings, beat grids, sound-effect placements) and joins it to absolute-frame visual events.
- It reports links that are late, early or missing, and gives the frame each event should move to.
- It produces a caption track, MotionDirector cue nodes and a mix manifest.
- Kumiki **describes** audio; it never transcribes, aligns, stretches or mixes it, and needs no DAW. Without audio data the same sheet runs in visual-only mode.

## Reuse and the gap it fills
- **Reused:**
  - **Captions:** `CaptionTrack` for word-highlighted captions (`alignmentToCaptionTrack`).
  - **Choreography:** MotionDirector cue payloads (`narration`, `speech-marker`, `sound-effect`, `music-beat`) through `audioCuesToDirectorNodes`. A compiled director's schedule and cues can serve as the visual event source.
  - **Export:** `npm run video:export -- --audio`, fed by the mix built from `audioMixFfmpegArgs`.
- **The gap:** MotionDirector could carry narration and beat cues, but nothing read real alignment output, converted audio time to film frames, or checked visual events against audio anchors.

## Install and inspect
- Registry item: `audio-visual-cue` (`alignment-formats.ts`, `audio-visual-cue.ts`). It depends on `motion-track`, `motion-director` and `caption-performer`.
- Storybook: **Video → Audio Visual Cue**.
  - One authored timing table is emitted in six real payload shapes (WhisperX, OpenAI verbose_json, Gentle, MFA TextGrid, TTS character timings, SRT) and parsed back. This is example data, not output from a recording.
  - A scene's visual events are linked to the words "destination" and "forwards", a sound effect and a music downbeat.
  - A lane timeline shows words (dimmed when low-confidence), segments, beats, sound effects and link status.
  - Captions come from the alignment. Controls cover format, mode and shifting the departure to make links late or early.
  - The mix manifest and FFmpeg command are shown with placeholder asset paths; the story has no audio files.

## Minimal usage
~~~ts
const { alignment, diagnostics } = parseAlignment(whisperxJson, ALIGNMENT_PARSERS.whisperx, { id: "voice-take-3", language: "en" });
const sheet: AudioCueSheet = {
  id: "ep-12", fps: { num: 30, den: 1 }, durationFrames: 900,
  lanes: [{ id: "voice", kind: "narration", startFrame: 15, alignmentId: "voice-take-3", assetRef: "voice.wav", required: true },
          { id: "music", kind: "music", startFrame: 0, assetRef: "bed.wav", gainDb: -14, beatGrid: { bpm: 100, count: 120 } }],
  sounds: [{ id: "ding", laneId: "sfx", frame: 126, assetRef: "ding.wav" }],
  links: [{ id: "depart", visualEventId: "packet-depart", anchor: { kind: "word", laneId: "voice", text: "forwards" }, offsetFrames: -2 }],
};
const cues = resolveAudioCues(sheet, { alignments: [alignment], visualEvents: compiledDirector }); // or [{ id, frame }]
// cues.links[i].suggestedFrame → retime the choreography; cues.diagnostics → late/early/missing
const captions = alignmentToCaptionTrack(alignment, { fps: sheet.fps, laneStartFrame: 15 });
const mix = audioMixFfmpegArgs(createAudioMixManifest(sheet), "mix.wav"); // run ffmpeg, then video:export --audio mix.wav
~~~

## Contract
- **`AudioAlignment`** (neutral, in seconds from the start of the track): `{ id, source (forced-alignment | asr | tts | manual | subtitle), reference?, language?, words: [{ text, start, end, confidence?, speaker? }], segments: [{ text, start, end, speaker? }], unaligned: [{ text, reason, afterWord }] }`. Words a tool could not time stay in `unaligned` at their position; they are never given estimated times.
- **Parsers:** `parseAlignment(input, parser, options)` runs any parser and validates the result: `alignment-time-invalid`, `alignment-out-of-order` and `alignment-empty` are errors, `alignment-unaligned` is a warning. A parser is any `(input, { id, language?, reference? }) => AudioAlignment`. `ALIGNMENT_PARSERS` provides:
  - `neutral`: JSON with `timebase.unit` set to `s`, `ms`, `frames` (with `fps`) or `samples` (with `sampleRate`).
  - `whisper`: OpenAI or openai-whisper `verbose_json`, using top-level `words` or `segments[].words`.
  - `whisperx`: `segments[].words` with `score` and `speaker`; untimed tokens are reported.
  - `gentle`: words whose `case` isn't `success` are reported as unaligned.
  - `aeneas`: sync-map fragments, segment level.
  - `textgrid`: Praat long format as written by MFA. `textGridParser(tier)` picks another tier.
  - `srt` and `webvtt`: segments only.
  - `characterTimings`: TTS character arrays such as ElevenLabs `alignment` / `normalized_alignment`, grouped into words on whitespace.
- **`AudioCueSheet`:** `{ id, fps, durationFrames, lanes, sounds?, links? }`.
  - **Lanes:** `{ id, kind (narration | music | sfx | ambience), startFrame (film frame of audio time 0), assetRef?, gainDb?, alignmentId?, beatGrid?: { bpm, beatsPerBar?, firstBeatSeconds?, count }, required? }`.
  - **Sounds:** `{ id, laneId, frame, assetRef?, gainDb?, durationFrames? }`.
  - **Links:** `{ id, visualEventId, anchor, offsetFrames?, toleranceFrames? (default 1), strict? }`. An anchor is one of:
    - a word, matched by `text` (case- and punctuation-insensitive, with `occurrence`) or by `index`, with `edge` start or end;
    - a segment, by `index` and `edge`;
    - a `beat`;
    - a `sound`.
- **Time to frames:** audio time maps to the film frame containing it: `startFrame + floor(seconds × fps)`. `quantizeWords` keeps each lane's words non-overlapping. Each word lasts at least one frame, and a frame two words share goes to the later word (at most a one-frame shift).
- **`resolveAudioCues(sheet, { alignments?, visualEvents?, mode?, minConfidence? })`:**
  - Returns frame-based `words`, `segments`, `beats`, `sounds` and `links`. Each link has its visual, audio and suggested frames, the delta, and a status (aligned, early, late, missing or visual-only).
  - `visualEvents` is a list of `{ id, frame }` or a compiled MotionDirector (its schedule and cues).
  - `mode` defaults to `audio` when any lane has alignment or beat data. `visual-only` ignores audio data and reports links without judging them.
  - Diagnostics:
    - `audio-alignment-missing`: an error for a required lane in audio mode, otherwise a warning.
    - `audio-word-unaligned`, `audio-anchor-ambiguous`, `audio-anchor-low-confidence`.
    - `audio-anchor-missing` and `audio-visual-event-missing`: errors.
    - `audio-link-late` / `audio-link-early`: warnings, or errors when `strict`.
    - `audio-past-film-end`, `audio-asset-missing`, `audio-lane-*`, `audio-sound-invalid`, `audio-beat-grid-invalid`.
- **Captions:** `alignmentToCaptionTrack(alignment, { fps, laneStartFrame?, maxWords (7), maxChars (42), maxDurationFrames?, breakOnPunctuation (true), breakOnClause (true), pauseFrames (12), speakers? })`. When a length limit forces a break, `breakOnClause` breaks after the last `, ; : — –` inside the group instead of mid-clause.
  - Groups words into cues, starting a new one at a speaker change, a pause, a length limit or sentence punctuation.
  - Words are kept verbatim for highlighting. Japanese, Chinese, Thai, Lao, Khmer and Burmese join without spaces.
  - A cue containing untimed text keeps that text and has no word timings.
  - Segment-only alignments become phrase cues.
- **MotionDirector:** `audioCuesToDirectorNodes(resolved, sheet, { language?, markers? })` creates cue nodes at absolute frames: narration per segment, speech markers per word inside their segment, sound effects and music beats.
- **Mix:**
  - `createAudioMixManifest(sheet)` lists lanes and sounds with assets, start seconds and gain.
  - `audioMixFfmpegArgs(manifest, output, { sampleRate? })` builds FFmpeg arguments: each input is delayed (`adelay`) and has its gain applied, then all inputs are summed (`amix`, without normalisation) and padded to the film's length.
- **Limits:**
  - No transcription, alignment, time-stretching or loudness normalisation. Re-run your aligner after an edit or pacing change.
  - Beat grids are constant tempo. For tempo maps, supply beat frames as sound events or your own parser output.
  - `amix` sums inputs without limiting, so set gains to avoid clipping.
  - Word-text matching ignores case and punctuation, but not inflection.

## Verification (2026-10-22)
- `npx vitest run tests/finance-objects-platforms.test.tsx`: four AudioVisualCue cases.
  - **Parsers:** every built-in format (including millisecond and sample timebases) yields the same words; Gentle's untimed word keeps its position; SRT yields segments; bad times are rejected.
  - **Quantisation and captions:** frame quantisation never overlaps. Caption tracks from alignments pass `validateCaptionTrack`, untimed text stays in the caption, and Japanese joins without spaces.
  - **Links:** word, index, beat, sound and segment anchors resolve, with tolerance, strict errors, missing anchors, low confidence, visual-only and required-lane behaviour, and seek parity.
  - **Bridges:** the MotionDirector nodes compile into a film and a compiled director works as the visual event source; the mix manifest and FFmpeg filter graph are exact.
- **FFmpeg run:** I ran the generated arguments with synthetic sine tones. The output was exactly 3.000 s for a 90-frame, 30 fps film, the 1-frame-45 sound started at 1.500 s, and the padded tail was silent.
- Rendered in Storybook and reviewed by the agent:
  - All six formats produced the same link results; SRT correctly reported its word links as missing.
  - Captions were `ready`, Gentle's "it" was kept, and the low-confidence word was flagged.
  - Shifting the departure produced late warnings plus a strict error. Visual-only mode worked. No console errors.
- Fixed after review:
  - Rounding word ends up made adjacent words overlap by a frame, which CaptionPerformer rejected.
  - Untimed words were dropped from caption text.
  - The mix ended at the last sound instead of the film's length.
  - The story didn't show caption diagnostics.
  - CaptionPerformer gained a `validation` prop for reading rates and confidence.
- **Human review:** pending. Real recordings and real aligner runs have not been exercised.
