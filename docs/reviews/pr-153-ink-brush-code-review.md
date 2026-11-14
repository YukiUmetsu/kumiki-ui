# PR #153 — senior code and material review

**Review scope:** `YukiUmetsu/kumiki-ui`, Phase 3 INK1 brush geometry + native pigment-paper implementation. Source, registry descriptor, FilmStage slots, Storybook controls, FD1 fixture, test suites, CI workflow and documentation inspected. Final technical review: 2026-11-14.

## Verified findings and disposition

| Severity | Trigger and evidence | Correction / regression |
| --- | --- | --- |
| P1 — resolved | Globally normalizing pigment across the entire raster caused a previously dried, spatially independent stroke to change after a new stroke was deposited. **Observed failing** `never modifies an already dry region` in [CI run 43572032821](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43572032821). | Normalize each dab before blending it into the paper, avoiding later cross-stroke rescaling. `tests/ink-wet-paper.test.ts` now protects dry-region pixel identity. |
| P1 — resolved | `registry/video/ink-brush-react.tsx` imported `./ink-wet-paper` but the independent `ink-brush` registry item did not ship the dependency. A clean consumer installation could not compile. | Added `registry/video/ink-wet-paper.ts` to `registry.json` and passed `node scripts/registry-fixture.js --item=ink-brush` in [browser/production QA run 43573634266](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43573634266). |
| P2 — resolved | The first raster mark was too transparent and read as an airbrush. A new test exposed **max 162/255** alpha in the loaded contact ([failing run 43572805257](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43572805257)). | Replaced the broad Gaussian-like deposit with a more concentrated pressure-shaped nib contact, retained a narrow delayed wet fringe, and passed the loaded-contact regression. |
| P2 — resolved | Video and 2× macro captures exposed sinusoidal moire, then quantized checkerboard gaps in dry marks. | Removed periodic modulation and integer-grid dropout; the dry-brush gaps now use continuous anisotropic, seeded fibre variation sampled in stroke-space. Inspected actual Chromium close-ups and encoded FilmStage video. |

## Verification

- **Passed:** [deterministic PR run 43573349321](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43573349321): TypeScript, focused geometry/paper tests, real film contracts, registry and catalog checks.
- **Passed:** [browser and production run 43573634266](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43573634266): focused tests, clean isolated `ink-brush` registry install, Chromium Storybook captures in both aspects, cross-seek pixel stability, SVG-vs-paper A/B mode, Film Document validation, 6-second 16:9 encoded MP4 and 9:16 production frame.
- **Human-assisted visual inspection:** actual captured 2× brush microscope, 9:16 botanical and 16:9 delta frames, and sampled normal-speed 6-second MP4. The saturated contact, pale wash and directional dry split now read as materially different marks; no hidden artificial full-screen ink-wipe filter is used.
- **Not run:** complete 20-second normal-speed film in both aspects, real-time Storybook FPS benchmark at maximum raster resolution, calibration to measured physical-paper properties, and actual decoding of the external lesson videos. No test result is offered as proof of those properties.

## Residual risks and next roadmap gates

1. The new `sampleWetInk` computes analytic paper-space ageing, **not a laboratory-validated fluid solver**. Multi-tone nib loading and per-point brush tilt remain the clearest artistic realism gaps.
2. Browser/render output uses a synchronous PNG data URI per frame. The 2.2M-cell cap bounds raster memory, but sustained interactive 4K/30-FPS latency was not benchmarked. Avoid a high-FPS production guarantee without profiling and a pre-baked frame cache or worker strategy.
3. Current films represent two original stylized subjects; independent normal-speed reference-vs-render comparison should continue. No external artwork or video is bundled.

**Review decision:** Technically ready as a **reusable, bounded INK1 brush/paper engine milestone**. Merge does **not** certify that all physical brush styles, paper types, multi-tone loading, or full style-recipe artistic approval are complete. Track those quality improvements as the next Phase 3 follow-up rather than mislabeling this revision as photorealistic.
