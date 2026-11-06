# Film pipeline verification

Date: 2026-11-06. Branch: `feat/content-pipeline`. Scope: `film-document`, `scene-template-examples`, `rendered-text-audit`, `scripts/film.mjs`, catalog discovery fixes and the generated status file.

## Result

One hand-written file, [`examples/film/billing-gap.film.json`](../../examples/film/billing-gap.film.json), went from JSON to verified MP4 with three scene types, two transitions and two outputs.

| Check | Result |
|---|---|
| `film:check` | Passed in about 0.4 s. A broken file reported all problems in one run, each with a path and a hint |
| `film:review` | 14 frames for each output in 6.6 s. 0 text errors, 95 warnings |
| `film:render` | `landscape.mp4` and `portrait.mp4`: 630 decoded frames each, 1920×1080 and 1080×1920, 21.000 s. Exporter verification passed. About 4 frames a second |
| Audio | A one-lane film rendered with a muxed audio stream of the expected length (60-frame test) |
| Browser-only failure | A caption that only real fonts can reject passed `film:check`, then stopped `film:review` with exit 1 and a path |
| File server | A literal `..` traversal returned 403, a missing file 404, and a Range request 206 |
| Catalog | `catalog:api` ran on all 226 packs that existed at the time, with no failures |
| Storybook | `build-storybook` passed. `video-film-stage--example-film` loaded in both outputs in Chromium, with no page errors |
| Clean install | `registry-fixture --item=film-document` compiled a consumer that calls the API |

Contact sheets: [landscape](film-pipeline/billing-gap-landscape.jpg), [portrait](film-pipeline/billing-gap-portrait.jpg).

## Defects that the contact sheets found

- **Illegible text.** The first sheets showed dark text on dark images and dark cards on a light canvas. The capture page had no appearance set, so recipes drawn for dark used light tokens. Films now default to `appearance: "dark"`. The Storybook toolbar default is `light`, so the older capture stories can have the same defect. They were not changed.
- **Warning noise.** Each animated word reported its own warning. The audit now groups by text block.
- **A dropped scene.** The compile without a browser dropped an object story that failed its fit test, and reported 2 scenes for a 3-scene film. It now keeps the scene and leaves the fit to the browser compile.

## Open items

- **Human review is pending.** The agent looked at both contact sheets. That is not approval.
- **`cause-effect` is weak at these sizes.** Its text is small, and most of the frame is empty. The tool reports this and does not fix it. Recipe quality was not in this scope.
- **Object stories in portrait** keep their objects small in the middle of a tall frame.
- **95 warnings remain** in the example: 59 `text-outside-safe-area` and 36 `text-too-small`. Recipes do not read platform safe areas.
- **Seek parity.** Six shuffled seeks gave one difference, at about 52 dB, along edges only and only on the first paint. Layers with `will-change: transform` are the likely cause. This is not proved. Exports run in order.
- **`npm run lint`** reports 25 errors in files that this work did not touch. It is not part of CI.
