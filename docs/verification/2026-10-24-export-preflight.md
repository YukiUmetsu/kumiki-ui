# Export preflight — fail before the first frame (2026-10-24)

**Scope:** the last open K4 item in [19 — Clip-Led Production](../19-clip-led-production-and-revision-handoff.md): fail early on missing assets, fonts, codecs and rights, before any frame is rendered.
**Code:** `scripts/export-video.mjs` (the `preflight` step, run after the manifest is read and before the first frame) and the optional `assets` field on `VideoExportManifest` in `registry/video/video-export-stage.tsx`.

## What the preflight checks

| Check | How | Refuses when |
| --- | --- | --- |
| Fonts | `document.fonts.ready`, then any face with status `error` | a font failed to load |
| Rights | each declared asset must carry a `licenseRef` | the reference is missing or blank |
| Reachable | a ranged GET (first byte) for each declared asset | HTTP error or network failure |
| Decodable (video) | the browser loads the first frame of the video, 15 s timeout | the codec is unsupported or the file is corrupt |

Stories declare their footage in the manifest (`assets`): the real-source fixtures, the K2/K3 explanation, and the hybrid short. Manifests without `assets` are not checked for those; font checks always run.

## Results

| Case | Browser | Result | Frames captured | Output written |
| --- | --- | --- | --- | --- |
| `cfr-h264` (control) | bundled Chromium | Preflight passed; exported | 90 | yes |
| K2 explanation, 9:16 (5 frames) | installed Chrome | Preflight passed | 5 | yes |
| hybrid short (5 frames) | installed Chrome | Preflight passed | 5 | yes |
| asset without a `licenseRef` | bundled Chromium | refused: "has no rights reference" | 0 | no |
| asset whose file is missing | bundled Chromium | refused: "HTTP 404" | 0 | no |
| `hevc-10bit` (HEVC, bundled Chromium) | bundled Chromium | refused: "no supported streams" (cannot decode) | 0 | no |

In each refusal, the export stopped before any frame was rendered, so no partial output exists.

## Not covered

- **Font failure:** no story has a font that fails to load, so the font check runs but has never refused an export.
- **Codec timing on long files:** the decode check loads only the first frame, not the whole file. A file that starts decodable and fails later is still caught at the first frame that fails, as before.
- **Rights content:** the preflight checks that a reference is present, not that the licence is valid.
- **Automated test:** the refusals are browser runs, so they are not part of CI. The commands below reproduce them.

## Reproduce

```sh
npx storybook build -c .storybook -o <sb-dir>
# copy the fixtures into <sb-dir>/k1 (npm run video:fixtures -- <dir>), serve with range support:
npm run video:serve-static -- <sb-dir> 6007
npm run video:export -- --browser=chromium --url="http://127.0.0.1:6007/iframe.html?id=video-real-source-clip--default&viewMode=story&kmExport=1&km_clip=hevc-10bit" --output=<file.mp4>
```
