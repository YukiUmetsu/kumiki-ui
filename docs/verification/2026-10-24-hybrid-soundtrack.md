# Hybrid short soundtrack — rebuilt from the cue sheet (2026-10-24)

**Replaces:** the placeholder test tone used in the [2026-10-22 hybrid report](2026-10-22-phase2-hybrid-short.md) and in the [K0–K4 report](2026-10-24-clip-led-k0-k4.md). Those exports carried a constant 1000 Hz sine, not narration or music.
**Code:** [`scripts/build-hybrid-audio.mjs`](../../scripts/build-hybrid-audio.mjs). It builds each audio asset from the hybrid's cue sheet and mixes them with the library's `createAudioMixManifest` and `audioMixFfmpegArgs`. No media is committed.
**Status:** automated checks only. The audio has **not been listened to by a reviewer**.

## What is built

| Asset | Source | Notes |
| --- | --- | --- |
| `voice.wav` | macOS `say`, voice Samantha, 190 wpm, one clip per word | Each word is trimmed of silence and placed at its authored start. A word longer than its slot is sped up to fit (`atempo`, never stretched). |
| `music.wav` | `aevalsrc`: 120 BPM click bed, one click every 0.5 s | Matches the cue sheet's beat grid (26 beats over 13 s). |
| `ding.wav` | `aevalsrc`: 1320 Hz decaying tone | Placed at the freeze (frame 45, 1.5 s). |
| `whoosh.wav` | pink noise, band-passed, faded | Placed at the wipe (5.4 s). |
| `mix.wav` | `audioMixFfmpegArgs` on `createAudioMixManifest(HYBRID_SHEET)` | 13.000 s. Gains from the cue sheet (music −18 dB, ding −4 dB, whoosh −10 dB). |

## Measured

- **Narration fit:** 32 words. **21 of 32 are sped up**; the largest speed-up is **2.93×**. This is the limit recorded in 2026-10-22: the authored word slots are tight for speech, so some words sound rushed. The fit report is written next to the audio (`narration-fit.json`).
- **Export:** `video:export --story=video-phase-2-hybrid-short--short --audio=mix.wav` → 390 frames, 1080×1920, 13.000 s, verified by ffprobe.
- **Energy over time** (RMS per 0.5 s): speech windows read 3,300–5,300; pauses sit at about 230, which is the music bed alone. The pure tone is gone: the level varies with the narration.
- **Cue windows:** the ding window (1.5–1.7 s) reads 6,996, against 4,124 just before it. The whoosh window (5.4–5.8 s) reads 3,376, against silence at 4.8–5.0 s.

## Not verified

- Whether the speech is intelligible and natural. The speed-ups make some words sound rushed; this needs a listening review.
- Whether the timing feels right against the picture (the caption cues and sound-effect hits).
- Alignment with a real narration recording; this uses synthesised speech, not a recorded voice.

## Reproduce

```sh
node scripts/build-hybrid-audio.mjs <dir>       # macOS only (say); writes mix.wav and narration-fit.json
npm run video:export -- --story=video-phase-2-hybrid-short--short --audio=<dir>/mix.wav --output=<file.mp4>
```
