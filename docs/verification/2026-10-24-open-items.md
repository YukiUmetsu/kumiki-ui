# Open items closed (2026-10-24)

This round worked through the open items left after K0–K5. Each item lists what was checked and what is still open. Reports for each area are linked.

## 1. Hybrid short soundtrack — rebuilt
Narration, a 120 BPM beat bed, a ding and a whoosh, mixed from the cue sheet. Replaces the test tone. Still needs a listening review. See [hybrid soundtrack](2026-10-24-hybrid-soundtrack.md).

## 2. K1 codec and display matrix — extended
Added: 10-bit HEVC, AV1, 270° rotation, a non-square-pixel file (3:2 sample aspect ratio, displayed 960×360), and 10-bit H.264.

| Fixture | Installed Chrome 156 | Bundled Chromium 156 |
| --- | --- | --- |
| `hevc-10bit` | exact, 90/90 | **error on every frame**, no wrong frame shown |
| `av1-8bit` | exact, 90/90 | exact, 90/90 |
| `h264-10bit` | exact, 90/90 | exact, 90/90 |
| `rotated-270-h264` | exact, 90/90 | exact, 90/90 |
| `sar-3x2-h264` | exact, 90/90 (960×360) | exact, 90/90 |

Earlier results still hold: CFR H.264, CFR HEVC, VFR H.264, 90° rotation, the truncated and garbage cases.

Exports via `--browser=chrome` decode frame-exact for `sar-3x2-h264` (960×360), `rotated-270-h264` (360×640) and `hevc-10bit`.

**Found and fixed:** the probe ignored the sample aspect ratio, so a non-square file was described at its coded width. It now reports the displayed size.

**Still not covered:** camera footage, HDR, non-H.264/HEVC/AV1 codecs, 180°, other platforms.

## 3. K4 long-form export — segment joins and crash recovery
- **Joins across transitions:** the hybrid short, exported in 2-second segments (7 segments, so joins fall on the wipe and the dissolve), against a single-pass export. 357 frames differ; the lowest PSNR is 50.7 dB, and none is below 40 dB. The other 33 frames are identical. Frame order holds through every join.
- **Crash recovery (bug found and fixed):** killing the exporter's own Chromium renderer mid-export made the segment retry detect the crash, but the retry reloaded the same crashed page, which can't recover. The export then failed. The retry now opens a fresh page (same viewport and listeners), and the export completes. The recovered output's SHA-256 matches an uninterrupted segmented export exactly.
- **Still open:** fail-early checks for fonts, codecs and rights before the first frame. Fonts and footage errors are still caught at the first frame, not before it.

## 4. K3 profiles — chart text and subject check
- **Chart text size:** the smallest text was 16 px in all three profiles (the unit line, the legend and the footnotes). The chart's type ramp is now scaled ×1.5 per profile, so the smallest text is 24 px. A test now requires at least 2.2% of the frame's shorter edge, which is 23.8 px on 1080 px. The chart still fits at the larger size (text-layout and diagnostics tests pass). **These three videos need re-review; the look has changed.**
- **Subject-in-crop check moved into the registry:** `validateFreezeFocus` now reports `subject-leaves-crop` as an error when the focus or a callout subject is cut off by the crop at the held frame. A test covers the negative case on the registry validator. Previously this check lived only in the K3 layout module.
- **Still open:** caption safety (the composition has no captions), a late-font-load case, and the open space in the 9:16 and 1:1 frames (see the K3 report).

## 5. K5 visual receipt — exporter source
The receipt's renderer node now includes a SHA-256 of the exporter's source files, so editing the exporter re-proves everything it rendered. The example receipt has been regenerated from the new export, with review set to **not-reviewed**. Against the reviewed export, the footage shot's proofs (frames 0 and 90) are unchanged, and the chart shot's proofs (frames 260 and 359) changed, as expected.

**Still open:** caption and voice-timing invalidation (no captions in the composition).

## Not done — needs a decision or data
- **Roof-footage example (K2):** needs licensed roof footage or your go-ahead to keep the synthetic version.
- **3D section (K2), captions and narration (K2/K3/K5):** not part of the current composition.
- **Human reviews:** the new soundtrack, the K1 matrix (automated only), and the re-exported K3 profiles.

## Checks run
| Check | Result |
| --- | --- |
| `npm run registry:validate`, `npm run registry:smoke` | pass (153 items; 2045 files staged) |
| `npm run catalog:check` | pass (323 entries, 648 verified stories) |
| `npm run video:export:check` (node tests) | 18 pass |
| Vitest: visual receipt, clip explanation, freeze and component suites | 113 pass |
| Typecheck | 15 errors, all in causal-system and map-stage files, as on `main` |
| eslint on every changed file | clean |
