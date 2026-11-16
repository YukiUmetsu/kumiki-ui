# ArtCraft 9.1 / CRAYON1 F1: attached eyelash tip flow (v12)

**16 November 2026 (UTC). Release: ART REJECT, draft PR #281, Storybook `!dev`.** The purpose of this opt-in workbench is a *better source-authored real-wax character study*, not an art approval or a photograph filter.

## Source and rights

- **Reference identity (geometry):** Christopher Campbell's [2015 CC0 brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), Wikimedia Commons confirmed CC0 1.0 (pre-5 June 2017 Unsplash license change). Coordinates refer ONLY to the previously SHA-256-locked exact **608×1082** Chromium source screenshot `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Do not compare the 5184×3456 original JPEG without re-registering crop.
- **Wax medium:** Stockmar's [wax crayons, overlapping pressure and side-rubbing examples](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) and [Rudolf, Mould & Neufeld, wax-crayon deposition model](https://doi.org/10.1111/j.1467-8659.2005.00826.x), used for wax tooth and binder contact behavior only. No photographic pixels or copied artwork are embedded in native CRAYON1 paths.
- **Prior actual SVG Chromium source eye evidence:** v10 on [run 43779294634](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43779294634), v11 on [run 43780360535](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43780360535). The second physically tones down the thick fake black brow/rim but still fails anatomical identity. Both near and far source-framed 608×1082 captures at f299, no CSS/photo filtering.

## Actual visual review and source-level diagnosis

The real v10-v11 closeup comparison was inspected against the earlier licensed near/far photographic eye. **v11 is an incremental correction but remains artistically rejected:** upper lids remain a broad graphic gray/purple wedge, iris is a distinct exposed button in an almost triangular sclera, fake isolated wax eyelashes appear as short, nearly vertical **ticks floating above the dark eyelid**, and far eye is mostly hidden by an unnaturally square hair stripe. Facial skin planes show repeating broad hatches, not the photograph's nuanced orbital/socket volume. This is an anatomy and root-topology *visual* failure despite 0/47 numerically disconnected parent endpoints and green browser proof. Existing nose, mouth, neck and whole face remain unapproved.

**One new isolated experiment:** keep the existing authored 33 near + 14 far source-rooted irregular cubics and their unmodified `rooted` negative control; add `lashFinish:"rooted-flow"`. For each source-authored cubic, apply **exact de Casteljau subdivision** only to shorten the *free end*, preserving its position on the original anatomical tarsal root and tangent, every curvature, the 33/14 asymmetry, parent clip, pigmentation, paper seed, wax-tooth samples, frame timeline, and all unrelated shapes. The native renderer's terminal pickup is still placed toward the anatomical **root**, not the free tip. Optically smaller uneven dry wax fibers are intended to remove graphic peg lashes without erasing follicles. This is **not** generated noise, uniformly scaled symbol lashes or smoothing the whole image.

### ArtCraft five-axis acceptance

| Axis | Source-required property | Change / gate |
| --- | --- | --- |
| Topology | F1 source near/far upper-rim attachment (not free-floating) | Every 47 root coordinates unchanged; same lip→tarsal→lash paint order; independent maximum root-distance audit 5.5 source px. |
| Vector flow | Distinct near curved lash fan and occluded far lashes; no regular comb | De Casteljau preserves all source-authored cubic handles; shortens only free subcurve at varying physically bounded lengths. |
| Edge character | No black dot at a visible isolated free tip, no flat vector eyeliner | Preserve directional native broken dry wax, rootward pickup, and parent clipping; compare against unchanged `rooted`. |
| Optical rhythm | Not 33 parallel equal-length lines | Individually varying source-authored paths and tarsal anchors; near natural root-to-tip max ~5.2 source px, far tighter ~3.9 px, with short tip contact retained. |
| Microtexture | Binder, friction, paper teeth and soft pressure volume | Retain CRAYON1 material renderer; only modestly adjust per-variant width and wax pressure, no blanket blur or imported image texture. |

## Tests, reproducibility and non-promotion

- `src/video/crayon-artcraft-f1-lash-clusters.ts`: new opt-in mode, root-to-tip cubic split; keep original `sparse` and `rooted` exactly. `src/video/crayon-artcraft-cc0-face.ts` validates the new value without defaulting to it.
- `tests/crayon-artcraft-f1-lash-flow.test.tsx`: all 47 roots preserved, lengths shrink without being identical, root-distance remains zero detached, all non-lash elements unchanged, previous controls reproducible, native CRAYON1 SSR no raster layer. Existing source-specific lip/neck and brow controls unaffected.
- `tests/e2e-artcraft/crayon-adult-face.spec.ts`: native Chromium original `rooted` and short `rooted-flow` **A/B** at identical source-space near (2.95×) and far (3×) cameras, f299, 608×1082, plus no page errors. Storybook uses the existing `Video production/Film Looks/Crayon/ArtCraft Adult Face Lab` `!dev` meta; two new source-lash macros, the existing film scrubber and the source screenshot link.
- **Negative controls:** `eyeContact:"baseline"` stays structurally and visually untouched even if `rooted-flow` is requested. `source-value`, `source-shade`, and v11 `rooted` remain available for reversal. No new Storybook folder, no third-party asset redistribution.
- **Important independent art gate:** After exact-head CI, inspect real v12 native PNGs at 1×/3× against the locked photograph and frozen original candidate. Run ArtCraft 18 source landmarks, five facial tone planes, fine-frequency tooth/reference grain and normal-speed f120/210/299 near/far ocular motion, and review full face, nasal/lips and neck. Pixel differences, valid math and green tests do not qualify art; default/release remains unapproved. **Do not merge** until artist approval.


## V12 native screenshot review (exact code head `4007fc92`)

Actual Chromium **SUCCESS** on [run 43781514169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43781514169), [artifact 14187804359](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43781514169/artifacts/14187804359), including near/far screenshot A/B at source-native 608×1082 frame 299 and f120/f210. Visual inspection used actual PNGs at the same registered camera, not mock vectors.

**ArtCraft verdict: REJECT.** Reducing authored free lash tips without losing any of the 47 roots modestly reduces the obvious spike/tick silhouettes, particularly near the center, but the visual effect is small. In fixed local near x100..500/y400..700, `rooted`→`rooted-flow` mean RGB-channel difference was **0.249/255**, with **0.808%** pixels differing >8 in any channel; far x100..520/y410..720 **0.045/255**, **0.134%**. These represent **difference magnitude only**; no improvement in photo-to-render fidelity is established. New variants remain behind explicit opt-in. The large cartoon iris, trapezoidal grey/rose upper lid, bright wedge of sclera, spare upright lash nibs and insufficient eyelid-to-cheek volume are still prominent. The whole face/nostril/lip/cervical geometry remains far below acceptance.

Native CRAYON1 grammar passed and the full Chromium proof passed on this candidate. The changed-tests workflow stopped at a **test-only TypeScript optional waxPressure comparison** (line 68 of new unit test) before unit execution; the assertion now uses an explicit undefined guard and will be re-checked on the following head. These media proof passes are **not** art quality approval. Preserve draft PR #281 and `!dev`; next task is source-registered **palpebral aperture and iris occlusion** reconstruction with connected lash-root mass and natural surface-rich midface. Do not produce yet another cosmetic variation of evenly spaced lash ticks as a stand-in for anatomical reconstruction.
