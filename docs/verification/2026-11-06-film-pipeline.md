# Film pipeline verification

Date: 2026-11-06. Branch: `feat/content-pipeline`. Scope: `film-document`, `scene-template-examples`, `rendered-text-audit`, `scripts/film.mjs`, catalog discovery fixes and the generated status file.

## Result

One hand-written file, [`examples/film/billing-gap.film.json`](../../examples/film/billing-gap.film.json), went from JSON to verified MP4 with three scene types, two transitions and two outputs.

| Check | Result |
|---|---|
| `film:check` | Passed in about 0.4 s. A broken file reported all problems in one run, each with a path and a hint |
| `film:review` | 16 frames for each output. 0 text errors, 8 warnings. All 8 are the docked question in the landscape letterbox bar, which is deliberate |
| `film:render` | `landscape.mp4` and `portrait.mp4`: 630 decoded frames each, 1920×1080 and 1080×1920, 21.000 s. Exporter verification passed. About 4 frames a second |
| Audio | A one-lane film rendered with a muxed audio stream of the expected length (60-frame test) |
| Browser-only failure | A caption that only real fonts can reject passed `film:check`, then stopped `film:review` with exit 1 and a path |
| File server | A literal `..` traversal returned 403, a missing file 404, and a Range request 206 |
| Catalog | `catalog:api` ran on all 226 packs that existed at the time, with no failures |
| Storybook | `build-storybook` passed. `video-film-stage--example-film` loaded in both outputs in Chromium, with no page errors |
| Clean install | `registry-fixture --item=film-document` compiled a consumer that calls the API |

Contact sheets at 3840 px: [landscape](film-pipeline/billing-gap-landscape.png), [portrait](film-pipeline/billing-gap-portrait.png). Twelve frames at output size are in [`film-pipeline/stills`](film-pipeline/stills).

## Quality pass

The first evidence was compressed thumbnails, and it showed a weak film. The second pass changed shared code, so the changes apply to every film.

| Area | Change |
|---|---|
| `cause-effect` | One statement at a time in large type, above a solid progress rail. Each text is on screen once, and the frame fills |
| Base type | Labels meet the 2.3% floor. Portrait has its own type scale |
| `safeInsets` | Vertical insets were computed against width. They now use the aspect ratio |
| Film output | A preset now applies its safe area to card recipes |
| `question-reveal` | Stronger scrims, a portrait scrim for the docked question, copy clear of platform UI, and no clipped word shadows |
| `object-story` | Portrait stage centred in the safe area, tighter gaps, and value badges that scale with their object |
| Film art | Domain art draws past its gallery margins, so objects fill their boxes |
| Example | New `receipt-desk.svg`: paper grain, contact shadows and directional light |
| Review | Settled frames, larger sheets, full-size frames, and fewer false alarms |

A sweep of the 25 portable recipes compared this code with `origin/main`, in both outputs. The 21 recipes with no text errors still have none. Warnings fell from 1,306 to 328, under a stricter size floor. The 4 remaining errors are `text-clipped` reports in `timeline-journey`, which this work did not touch: "Middle" on the reveal frame and the narrative line on the resolve frame, in both outputs. The cause was not investigated.

The sweep images were checked for the first recipes only, not for all 25. The numbers cover the rest.

`tests/scene-template-recipes.test.tsx` pinned the old inset value, so its expected value changed to match the correct inset.

## Defects that the contact sheets found

- **Illegible text.** The first sheets showed dark text on dark images and dark cards on a light canvas. The capture page had no appearance set, so recipes drawn for dark used light tokens. Films now default to `appearance: "dark"`. The Storybook toolbar default is `light`, so the older capture stories can have the same defect. They were not changed.
- **Warning noise.** Each animated word reported its own warning. The audit now groups by text block.
- **A dropped scene.** The compile without a browser dropped an object story that failed its fit test, and reported 2 scenes for a 3-scene film. It now keeps the scene and leaves the fit to the browser compile.

## Open items

- **Human review is pending.** The agent looked at both contact sheets. That is not approval.
- **Portrait object stories** leave the lower frame empty. That area is under the platform UI on Shorts, but a row of three objects is still modest in size.
- **The scene-template browser spec** runs against a static Storybook build only, because `!dev` hides its stories from the dev server. On the dev server it fails with "element not found". The `cause-effect` cases passed against the static build. The other recipes were not rerun.
- **Seek parity.** Six shuffled seeks gave one difference, at about 52 dB, along edges only and only on the first paint. Layers with `will-change: transform` are the likely cause. This is not proved. Exports run in order.
- **`npm run lint`** reports 25 errors in files that this work did not touch. It is not part of CI.
