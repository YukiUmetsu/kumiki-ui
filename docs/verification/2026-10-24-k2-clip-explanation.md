# K2 — clip-to-explanation reference (2026-10-24)

**Scope:** [19 — Clip-Led Production](../19-clip-led-production-and-revision-handoff.md) §3 K2: one editable Storybook reference that takes a clip, freezes and focuses a subject, adds addressed callouts, hands the same subject to a 2D explanation, and shows the payoff.
**Storybook:** **Video / Clip Explanation (K2)** (`video-clip-explanation-k2--default`).
**Data:** [`src/video/clip-explanation-data.ts`](../../src/video/clip-explanation-data.ts) — IDs, timing and the cost spec. Edit here, not in the story.
**Status:** automated checks and one exported run. **Human review of the exported video is not done.**

## 1. What the reference does (12.0 s, 9:16, 360 frames)

| Output frames | Shot | What is on screen |
| --- | --- | --- |
| 0–149 | `shot-scan-freeze` | The in-house conveyor clip (the same decoded WebM as the hybrid short). The clip freezes at source frame 45 for 60 frames, pushes in on the parcel label, and shows two callouts: "Parcel 7-3 · route 7, stop 3" and "Scanner reads the label". |
| 150–359 | `shot-payoff-chart` | A sourced cost waterfall, "One missed scan, what it adds", with subtitle "Parcel 7-3 · illustrative per-parcel cost". Each step reveals in turn. The net cost settles at 8 with a 2 s hold. |

- The dissolve (14 frames) is a `CutDirector` plan with two shots.
- The subject keeps one identity across the cut: the annotation `parcel-7-3-label`, the callout, and the chart's subtitle all refer to parcel 7-3.
- The chart comes from `renderCostWaterfall`, whose values add up exactly: 6 + 1 + 2 + 1 = 10, then −2 credit = 8.
- The chart's provenance is `illustrative: true`, and its footer says so.

## 2. Checks run

| Check | Result |
| --- | --- |
| `npx vitest run --project unit tests/clip-explanation.test.ts` | 4 pass: exact sums and illustrative flag; no error diagnostics; text fits at full reveal (`checkTextLayout` empty); reveal ends inside the payoff shot with at least 60 frames of hold; the cut plan covers 360 frames with the scan shot first |
| Export (`video:export`, kmExport=1, 1080×1920) | 360 frames verified by ffprobe (decoded count, codec, size, rate), 12.000 s. The export ran with `requireExact` and completed, so no footage frame was reported inexact or errored. 153 MB peak RSS; 51 s wall time |
| Contact sheet (eight frames: 0, 45, 80, 140, 160, 200, 260, 340) | Labels and callouts sit on the parcel; the dissolve starts at 160; the chart reveals in order and holds to the end. Read as a sanity check only |
| Full-resolution crop of the chart (frame 340) | Title, subtitle, legend and bar labels are legible; no clipped text |
| Typecheck | 15 errors, the same as `main`; none in K2 files |
| eslint on the new files | Clean |
| `npm run catalog:check` | OK (the story adds one verified Storybook entry) |

## 3. Limits and what is not claimed

- **Footage is synthetic.** It is the in-house conveyor render, not a roof or any real process. The doc's roof example (roof process → annotated part → 3D section → sourced cost chart) is not built.
- **Claims are illustrative.** The callout text and the cost values are authored for layout. The chart says they are illustrative. Nothing here is a measured fact.
- **No 3D section and no resumed footage.** The payoff is a 2D chart. The doc allows a chart or diagram for the handoff.
- **No narration, captions or audio.** This is a visual reference only.
- **Chart text is not checked against a minimum size.** At full resolution it is legible. The chart's label size is set by the economic chart renderer, and the verifier doesn't enforce a minimum.
- **Human visual review is pending.** The contact sheet and the crop are my own check, not a review.

## 4. Reproduce

```sh
npx vitest run --project unit tests/clip-explanation.test.ts
npx storybook build -c .storybook -o <sb-dir>
npm run video:serve-static -- <sb-dir> 6007
npm run video:export -- --url="http://127.0.0.1:6007/iframe.html?id=video-clip-explanation-k2--default&viewMode=story&kmExport=1" --output=<file.mp4>
```
