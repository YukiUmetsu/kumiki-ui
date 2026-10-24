# K1 — real-source footage verification (2026-10-24)

**Scope:** [19 — Clip-Led Production](../19-clip-led-production-and-revision-handoff.md) §3 K1. Shows, in Chrome, that probed H.264/HEVC footage — constant and variable frame rate, rotated — is drawn through `FrameAccurateClip` on the frame the output timeline asks for, and that unsupported or corrupt input fails explicitly. It also measures the export path on the same footage.
**Environment:** macOS 26.6.2 (arm64); Google Chrome 156.0.8078.47 (installed; Playwright `channel: "chrome"`); Playwright's bundled Chromium 156.0.8078.4; FFmpeg/ffprobe 9.0.2; Node v24.15.0; Storybook 10.6.3 static build.
**Status:** automated checks only. Human review of the footage is not part of this report.

## 1. Method

- **Fixtures** are generated locally by `npm run video:fixtures` from our own code; nothing is committed. Each frame is painted with its source index as a 24-bit black-and-white barcode, so the verifier reads back **which frame was drawn** from the canvas pixels — it does not trust metadata.
- **Ground truth** (`*.expected.json`) is written by the generator: each kept frame's source index and ideal presentation time. The probed metadata (`*.clip.json`, read by ffprobe in `scripts/probe-clip-source.mjs`) is the thing under test.
- **Verifier** (`npm run video:verify-source`) opens the story in Chrome through the export seek protocol, seeks every output frame in a **seeded shuffled order**, and for each frame checks:
  - the status the component reports (`ready`, `inexact`, `error`);
  - the barcode decoded from the drawn canvas against the expected source frame, using the floor policy from doc 19 (last frame at or before the output time);
  - the component's own `data-source-frame` label against that same expectation.
- **Safety property:** no frame may be reported `ready` or `inexact` while showing a wrong source frame. A clip that is expected to be exact must be exact.

## 2. Fixtures

| Fixture | Content | Probed as |
| --- | --- | --- |
| `cfr-h264` | H.264, 640×360, 30 fps, 90 frames, CRF 18, no B-frames | constant rate, 30/1 |
| `cfr-hevc` | HEVC (`hvc1`), same geometry | constant rate, 30/1 |
| `vfr-h264` | H.264; 17 of 120 frames removed, original timestamps kept | variable rate, 103 timestamps |
| `rotated-h264` | H.264 coded 640×360 with display rotation 90 | displayed 360×640, rotation 90 |
| `truncated-h264` | first 35% of `cfr-h264`, with the **complete** file's metadata still claimed | 90 frames claimed |
| `garbage.mp4` | 4 KB of random bytes | refused by the probe |

## 3. Results — Google Chrome 156 (installed)

| Fixture | Frames | Status of every output frame | Wrong frames shown as ready/inexact | Verdict |
| --- | --- | --- | --- | --- |
| `cfr-h264` | 90 | ready 90 | 0 | exact |
| `cfr-hevc` | 90 | ready 90 | 0 | exact |
| `vfr-h264` | 120 | ready 120 | 0 | exact; timestamps used |
| `rotated-h264` | 90 | ready 90 | 0 | exact; displayed upright |
| `truncated-h264` | 90 | ready 5 (frames 0–4), error 85 | 0 | refused after the truncation point |
| `garbage.mp4` | — | probe refuses: `moov atom not found` | — | refused before drawing |

Every ready frame matched its barcode, and every component label matched the floor-policy expectation. Frame order was shuffled on every run (seed 1).

## 4. Results — Playwright's bundled Chromium 156

| Fixture | Result |
| --- | --- |
| `cfr-h264` | exact, 90/90 |
| `rotated-h264` | exact, 90/90 |
| `cfr-hevc` | **all 90 frames error** (`Footage frame failed at output frame 0`). No frame was shown wrongly. |

This corrects the 2026-10-22 hybrid report, which stated that Playwright's Chromium cannot decode H.264. On this machine the bundled Chromium decodes H.264 exactly; it does not decode HEVC. The failure is explicit, so the platform gap fails clearly rather than silently.

## 5. Export — decoded output checked frame by frame

The exporter (`npm run video:export`) was run on each fixture, and the exported MP4 was decoded with FFmpeg. Each output frame's barcode was compared with the expected source frame.

| Export | Browser | Output | Decoded frames | Wrong or unreadable |
| --- | --- | --- | --- | --- |
| `vfr-h264` | installed Chrome | 640×360, 4.000 s | 120 / 120 | 0 |
| `rotated-h264` | installed Chrome | 360×640, 3.000 s | 90 / 90 | 0 |
| `cfr-hevc` | installed Chrome | 640×360, 3.000 s | 90 / 90 | 0 |
| `vfr-h264` | bundled Chromium | 640×360, 4.000 s | 120 / 120 | 0 |
| `truncated-h264` | installed Chrome | **refused** at output frame 5 | — | no MP4 written |

The exports are re-encoded (CRF 19), and the barcode still reads exactly on every frame.

## 6. Negative control — the check can fail

`vfr-h264` was run with its timestamps removed, so it was described as a constant 30 fps clip.

- **Pixels:** 0 frames were reported `ready` or `inexact` while showing a wrong source frame. The presentation-time check stopped the other 15 frames as errors.
- **Labels:** 85 frames reported a `data-source-frame` that disagreed with the expected source frame. The verifier fails this clip on the label check, so the negative control exits 1.

This is a real limitation. The adapter verifies **presentation time**, not the source index. When a consumer's metadata is wrong, the image can be time-correct while the source label is wrong. The mitigation is to use the probed timestamps, which the probe provides; the verifier catches the mistake when it happens.

## 7. Defects found and fixed in this work

1. **Export could not use a codec-capable browser.** The exporter always launched Playwright's bundled Chromium. It now takes `--browser=chrome`. Here that was the path that decodes HEVC (the bundled build fails on it).
2. **The story did not refuse unverified frames in export mode.** Before this change, the truncated clip's frames 5–89 were drawn as `inexact` with the previous frame's pixels, and nothing stopped an export. The story now sets `requireExact` when `kmExport=1`, the same way the hybrid story does, and the export stops at output frame 5.
3. **The first verifier trusted the consumer metadata to define correct frames.** The expected timeline now comes from the generator's ground truth, so the metadata is the thing being tested.

## 8. Limits and what is not claimed

- **Synthetic footage only.** The barcodes are generated, so there is no camera noise, motion blur, or real scene. No real-camera or licensed footage was tested.
- **Codecs:** H.264 and HEVC (8-bit, 4:2:0). Not tested: 10-bit, HDR, AV1, or non-square pixels.
- **Rotation:** only 90°. 180° and 270° are not tested.
- **Platform:** one macOS arm64 machine. HEVC here uses the platform's hardware decoder; other platforms are unverified.
- **Time mapping:** only the 30 → 30 fps floor policy. Speed ramps, reverse play and frame-rate conversion are covered by the existing unit tests for the mapping, not by this footage run.
- **Labels:** see §6. A stale or wrong clip description can produce correct pixels with wrong source labels.
- **Human review:** not performed. Automated checks do not certify the footage's visual quality.

## 9. Reproduce

```sh
npm run video:fixtures -- <dir>                       # generate fixtures and ground truth
npx storybook build -o <sb-dir>                       # static build containing the story
mkdir -p <sb-dir>/k1 && cp <dir>/*.mp4 <dir>/*.clip.json <sb-dir>/k1/
npm run video:serve-static -- <sb-dir> 6007           # range-capable server (required)
npm run video:verify-source -- --base=http://127.0.0.1:6007 --fixtures=<dir>
npm run video:verify-source -- --base=... --fixtures=<dir> --clips=vfr-h264 --exported=<file.mp4>
npm run video:export -- --browser=chrome --url="http://127.0.0.1:6007/iframe.html?id=video-real-source-clip--default&viewMode=story&kmExport=1&km_clip=vfr-h264" --output=<file.mp4>
npm run video:export:check                            # node unit tests for the rules above
```
