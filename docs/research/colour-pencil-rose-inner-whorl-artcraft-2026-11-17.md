# CP-F1 / FLORA1 — original nested rose inner-whorl ArtCraft study

**Date:** 2026-11-17. **Release:** experimental, OFF by default. **Independent artist review:** pending. Related prior rose physical-fold milestone: PR #548.

## Reference observations, permissions and limits

These are viewed as **technique and biological morphology references**, not source art for tracing or redistribution. No reference image, crop, scan, photo texture, third-party contour or color-sampled pixel is committed.

1. **UPOV TG/11/8 Rev.2** — https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf. The rose guideline distinguishes petal count, outer-petal reflex, flower profile, arrangement and inner-side color. A fully double-flowered cultivar has nested inner surfaces rather than the one shallow interior band in the legacy Kumiki rose.
2. **USDA APHIS Rosa research** — https://www.aphis.usda.gov/sites/default/files/08_31501p.pdf. Double-flowered commercial roses show rounded full flowers with many overlapping petals arranged in a spiral; this study is **not** a cultivar-specific reconstruction and is not a botanically measured phyllotactic model.
3. **Karen Elaine Evans, original *Pink Rose*** — https://www.artfinder.com/product/pink-rose-6a554/. At available web resolution, the artist's central curled lamina have independent dark crevices and pale broken lips; warm facing planes and cooler interior value are distinct. No artist outlines are copied.
4. **Heather Rooney, colored-pencil pink rose artwork** — https://www.heather-rooney.com/colored-pencil. The middle of the real pencil drawing shows progressively smaller, separately occluding petals and pressure-built transitions; the visible reference supports topology and edge treatment, not exact pigment-grain measurement.
5. **Ann Swan, botanical pencil materials** — https://annswan.co.uk/biography/. Observation is layered pigment with specific local material direction and intentionally retained botanical details, not a generic radial fan or a screen-space blur.

## Original-source deconstruction and implementation

| Scale | Source problem | Original geometry / pigment response |
|---|---|---|
| Macro topology | The current 11-region rose draws an open-form central `inner-fold` and `heart`; after #548 the outer five lamina have real underside areas but the flower center is still a nearly single value-band. | **Four new separate bounded, opaque petal surfaces**, inserted at explicit native z positions while preserving both old source organs. Four named IDs, no shared transformed template. |
| Meso continuity | Inside a real double flower, a dark back cavity is successively occluded by short left and right rolled walls. A small scroll sits foremost. Their edges turn in **different directions** and do not form concentric uniform circles. | `rose-whorl-recess` → `rose-whorl-left` → `rose-whorl-right` after `inner-fold`; original `heart` is retained, followed by `rose-whorl-scroll`. The output is an **original 2D petal projection**, not measured 3D thickness. |
| Vector flow | Left interior wraps clockwise toward viewer, the right lip tucks beneath, and a front scroll makes a separate local counterturn. | Individually authored multi-cubic silhouettes with distinct flow, directional cross-layer deposits and four nonidentical source-bounded marks each. |
| Edges and optical values | Highlight should be narrow, broken, low-opacity dry pencil; the recess must be genuinely dark rather than filled with paper-white matte or a decorative solid swirl. | Every lamina uses CP-F1 opaque support, three or more hue-separated deposits, local shadow line, reflected near rim, cross-venation and staggered tiny high lights (frame 170–266). No blur, bitmap overlay or foreign CSS filter. |
| Film | New material must be deterministic under arbitrary frame seek. Original petals, calyx, leaflets, layers, optical fibre studies and physical folds must not disappear. | `roseInnerWhorlStudy` is opt-in and immutable. New source seeds have stable ID slots 31–34; old seed slot, detail trace, path, bounds and opacity are preserved byte-for-byte. Combined studies have 39 material regions, below the 48-region cap. |

## Storybook and acceptance tests

- **Location:** existing **Video Production → Film Looks → Colour-pencil → Drawing Foundation**. No new Storybook folder. Enable `Foundation rose nested inner whorl`; inspect source-native 16:9 / 9:16 A/B, native macro center/recess, six CP-F1 stage buttons, frame scrub, paper tooth, pressure, burnish and seed.
- **Unit:** `tests/colored-pencil-rose-inner-whorl.test.ts` tests typed independent sources, four separate pigment contact passes, exact legacy source parity, four new opaque supports, combined 39-region CP-F1 viability, deterministic extreme seeds, subject isolation and invalid option rejection.
- **Native browser:** `tests/e2e-storybook/colored-pencil-rose-inner-whorl.spec.ts` captures full A/B for both aspect ratios, 2.15× true source-attached center and recess, combined botanical anatomy, restored identical old SVG image, no raster elements, bounded nonzero SVG fill, and a pre-detail timeline negative control.
- **Art HOLD:** Passing CI proves source integrity, not expertly constructed botanical realism. Inspect exact-head 1× frames and 2.15× macros versus authorized reference observations. Reject hard outlined tubes, hollow pockets, pasted-on circles, tiny illegible central facets, bright neon lips or impossible overlap direction. The five outer physical folds still lack true 3D thickness/normals and arbitrary wind movement; do **not** promote the combined flower as photorealistic on technical results alone.

## Native screenshot critique and correction (2026-11-17)

- **Real Chromium evidence (first version)**: [run 44111336614 / rose artifact 14341181863](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44111336614/artifacts/14341181863). Actual full-frame native 960×540 and 540×960, plus 2.15× scroll/recess screenshot, were inspected. Every targeted browser test passed, but **the new center visually failed ArtCraft**. Its nested pale arcs resembled concentric pasted-on ribbons, and the frontal spiral read as a mechanical screw, worse than the simpler original dark cup at 1×. Detailed material coverage and correct SVG fill area did not rescue bad local anatomy. No artist release is claimed.
- **Correction in the same PR:** muted all three front whorl palettes to the root cup's cooler carmine/umber value range; interrupted large bright liner arcs into independent short petal-edge contacts; reduced warm-light opacity; replaced the round scroll with a skewed C-shaped overlapping lamina. This preserves all four semantic supports and all older artwork and retains the experimental flag OFF. Its **revised exact-head screenshot must be inspected**; never cite the first green workflow as proof of the corrected pixels.
- **Unresolved:** the original petals still resemble broad graphic wedges, and a dry pencil recipe does not synthesize the physical inward turning thickness of a real rose. Even if the revised whorl improves, whole-flower photo-matched botany remains on ART HOLD.

## Next priorities

1. Inspect and revise the native center and full-frame at 1× against real colored-pencil references; focus on occlusion sequencing, value compression and whether the whorl actually reads as **petals**.
2. Rebuild remaining far-back and uncorrected original petal lamina only after geometry/visibility review, keeping the additive options reversible.
3. Author restrained joint-rooted, seekable breeze deformation only once the unchanged-still frame morphology is accepted. Avoid independently moving inner whorl pieces.
