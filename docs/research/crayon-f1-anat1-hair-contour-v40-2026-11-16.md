# Crayon ArtCraft F1 V40 — asymmetric hair silhouette, dry-wax hair contact

**2026-11-16 · experimental `!dev` · PR #461 DRAFT / ART HOLD. No production promotion or artist approval.**

## Sources and critique

- **Actual visual source:** Christopher Campbell, [*Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), Australia, October 2015, CC0 1.0. Original 5184×3456 landscape photograph. In the photograph, the part/crown direction is **not centered into a symmetric arch**, there are different far/near-side fall widths, individual locks flatten and flare as they drop, and the fine edge has no perfect uniform arc. The repository's prior 608×1082 browser screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` is **not** the original source file; its crop transform has not been reproduced from original full-resolution JPEG.
- **Actual prior native V39:** [exact browser capture (V39 / V38 control, full and 2.15×)](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43992227574/artifacts/14287898622), 608×1082 CC0-space. Not good enough: four dark masses form a hard inverted-U crown over a blank pale background, with near-vertical uniform curtain edges and conspicuous pale rectangular chips from thick dry-wax fiber contacts at 2.15×. Adding V39 root grooves improved local detail, **not** portrait identity or true hair volume.
- **Wax-crayon reference:** [College Art Association / Philadelphia Museum of Art, *Drawings: Identification and Characterization of Materials and Techniques*](https://www.collegeart.org/pdf/RAAMP/2014_DescriptiveTerminologyforArtonPaper-2.pdf), wax-crayon entry, describes raised irregular wax deposits and terminal pick-up/clumping as distinct from uniform ink strokes. Historical [Jerome A. Barhydt, *Crayon Portraiture*](https://www.gutenberg.org/files/30248/30248-h/30248-h.htm) recommends source-directed hair shadows and careful feathering into skin without a hard forehead line. These references do **not** establish that V40 is photorealistic or that all source masses were traced accurately.

## Five-axis deconstruction and the V40 construction

1. **Topological continuity.** Four original wax masses remain separate: rear hair, crown surface, left near curtain and right far curtain. Their curved boundaries now differ in asymmetrical crown height and temple transitions; the two falling curtains bulge/taper differently instead of following a constant-width vertical ribbon. All 18 native source fiber groups remain, **all of their exact V39 Bézier source cubic geometry, inherited clipping and parent IDs unchanged**. All face/eyelid/brow/ear/neck/jaw/skin geometry and paper remain identical to V39.
2. **Vector flow.** The top sweep has an offset part/root hinge and a more differentiated front arc at the forehead; crown roots turn into opposed vertical gravity fall. Retain V39's short source-aligned cubic root continuations and all preexisting source rails. Geometry adjustment is limited to the four existing hair mass outlines, not a generic shader or new cartoon wig. The new shapes are **artist-authored hypotheses using existing source-space landmarks**, not registered evidence of photo-pixel outline accuracy.
3. **Edge characteristics.** Smooth but non-identical cubic/bent curves at hairline, temples, left drop, right flare. No uniform graphic stroke defining the face/hair border: the dark underpaint retains original paper tooth, variable physical wax pressure and native seeded broken contact. Existing wax `underpaintGradient`, pressure/spacing, `opaqueBurnish`, pigmentation, colors and edge roughness are untouched.
4. **Microcontacts.** Existing 18 native colored contour groups retain every source hair cubic and distinct band hue; lower source-specific widths (0.19–0.34 authored px) and contact pressures (0.51–0.56) reduce the oversized vertical **rectangular deposits** created by wide wax nib geometry at 2.15×. This candidate makes all three crown/left/right roots genuine narrow *dry-wax* contact, not a smooth vector line or invented hair screen; preserve the built-in paper height/dropout. Test that highlight microstructure remains physically visible, not erased, and no new flat gradients or blur filters appear.
5. **Temporal sequence and reversibility.** Opt-in only via `midfaceForm:"source-anat1-hair-contour-v40"` on top of V39→V38→V37; original options and production default still untouched. No new elements, frame clocks, animation interpolation, external image in final scene or SVG filters. Same deterministic seed, source camera 608×1082, 300 original exposure frames, and unchanged nonhair marks.

## Independent QA requirements

- Unit verification at detail 0.2 and 1: exact same ordered IDs/count as V39, exact same all nonhair objects, exactly four source wax paths changed, **all prior 18 fine root paths byte-identical**, no missing gradients/opacity/timing, width shrink and real wax pressure, malformed/disconnected source rejects.
- Browser proof: V39 negative control vs V40 at native 608×1082 frame 299; matched full 1×, crown 2.85×, right curtain 2.15×, exact seed and camera. Storybook !dev has full, crown, left and right inspection as well as source comparison.
- Inspect actual PNG at full view for skull asymmetry, jaw/forehead clipping, background interaction and hair identity; inspect macro for wax block size, natural hair bend, pigment quality, light direction, and no mechanical comb. Compare also with the **actual source photographic crop**, when independently available.
- Prior V38 whole-photo SSIM **0.405919** vs ArtCraft release threshold **≥0.85**. **V40 photographic SSIM is unmeasured.** A positive screenshot difference or native pixel quality does not imply better source resemblance.
- 18 source vs *V40 final native-render* anatomical landmarks and five matched tonal regions have not been audited. Full 300-frame artist view, CC0 silhouette source registration and artist approval are outstanding. **Do not merge PR #461 or remove !dev** regardless of CI green.

## Exact-head native Chromium / original-source actual-pixel review

**Evidence:** [GitHub Actions run 43995910093](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43995910093), [native V39/V40 1×, 2.85× crown, 2.15× right PNGs — artifact 14290426118](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43995910093/artifacts/14290426118), commit `d58e36237274aa0116a1039237f6c6ce166ecb0a`. [Changed typecheck + unit suite](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43995910737) PASS, [native drawing grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43995910098) PASS, and real Chromium browser screenshot proof PASS.

**Verified source:** The source image `artcraft-portrait-woman-portrait-source.png`, obtained from [archived CC0 browser proof artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169), is **exactly 608×1082** and SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. This matches the independently recorded original source screenshot and all seven V38 photographed hair medians. It is still a cropped browser capture, **not** the photographer's original 5184×3456 camera JPEG.

Using identical-head V39 and V40 native RGB PNGs and the same unmodified CC0-source PNG, computed `skimage.metrics.structural_similarity(src,render,data_range=255,channel_axis=2)` for the following source-space ROIs. Pixel differences represent **physical rendered changes**, not source tracing guarantees:

| Exact source-space region (x1,y1,x2,y2) | V39 SSIM | V40 SSIM | Δ |
| --- | ---: | ---: | ---: |
| Whole 0,0,608,1082 | 0.403171 | **0.412048** | **+0.008877** |
| Crown 110,170,450,390 | 0.415008 | **0.429035** | **+0.014027** |
| Near left hair 0,310,115,1080 | 0.278877 | **0.315807** | **+0.036929** |
| Right curtain 475,320,607,1080 | 0.328165 | **0.341890** | **+0.013725** |
| Whole face 108,282,502,862 | 0.614954 | **0.615095** | +0.000142 |
| Near eye 174,430,346,609 | 0.563332 | 0.563332 | 0.000000 |
| Nose and mouth 323,500,498,770 | **0.533475** | 0.532602 | **−0.000872** |

**Independent rendering critique:** At 2.15× right-curtain macro, V40 replaces broad pale rectangular hair-contact blocks with much narrower, interrupted deposited streaks and keeps the full original underlying fine-source cubic geometry. At 1×, its crown/temple outline is more asymmetric but the hair still reads partly like a too-solid helmet; the natural source shoulder locks, green hedge background, and photographic three-dimensional facial likeness are still absent. Near-eye pixels are byte-identical, which is expected because no ocular source geometry was changed. Slight nose/mouth SSIM regression indicates the newly shaped occluding edge needs further source alignment, not silent promotion.

## Visual decision

**Positive measurable partial improvement, still ART HOLD.** Whole-frame SSIM increased from 0.403171 to 0.412048; none of these source-referenced scores approaches the **≥0.85** release requirement. The new candidate is not realistic or source-identical. Keep `!dev` and PR #461 **DRAFT, UNMERGED**. The next artistic tasks are source-aligned face/hair occlusion, cohesive physical hair masses, environmental background and facial anatomy rather than another layer of microfibers. Final 18 output-render landmarks, five tonal planes, full real-time 300-frame review and independent artist signoff remain missing.
