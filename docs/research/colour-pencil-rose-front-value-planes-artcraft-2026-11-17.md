# CP-F1 · FLORA1 — rose front petal local value construction (ArtCraft)

**Date:** 2026-11-17. **Status:** experiment; `roseFrontValueStudy=false` by default. **Artistic approval:** HOLD. Continues the curved front-petal S-seam merged through #591. Existing old silhouette, microstrokes, seeds and folded surfaces are unmodified.

## Authentic source deconstruction and usage rights

1. [Karen Elaine Evans, original *Pink Rose*, coloured pencil / mixed-media detail](https://www.artfinder.com/product/pink-rose-6a554/) — artist-owned source, **technique-only**. At available resolution, the near petal has a large warm broad facing plane and a red/violet *contact shadow* adjacent to its inward turn. Bright accents do not form a uniform white border. The original uses some ink/white acrylic; do **not** describe its every edge as pencil-only, and do not copy pixels/contours.
2. [Heather Rooney, original coloured-pencil art portfolio](https://www.heather-rooney.com/colored-pencil) — artist-owned source, **technique-only**. The center opens into multiple unequal overlapping value planes; local shifts are not a single radial gradient.
3. [Ann Swan, Basic Coloured Pencil 1: colour layering, flower petals and highlights](https://annswan.co.uk/basic-coloured-pencil-1/) — artist's process workshop, **technique-only**. Layers should build translucent colour; petal front/back and highlights are observed as separate material directions, never paper-white cutouts.
4. [UPOV TG/11/8 Rev.2](https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf) — rose-morphology guideline, **shape only**. Separate petal reflex and arrangement; no exact cultivar-specific geometry derived from this document.

**Rights:** No reference image, extracted image data, traced vector, colour sample, raster texture or outside code is shipped. Pigments and source paths are independently authored.

## Source topology and optical treatment

| Scale | Observed problem and desired continuous form | Implementation |
|---|---|---|
| Macro | Two large front physical petals now overlap but their broad pink value is relatively uniform; a bloom needs lit surface, shadow at a curved contact and a thin indirect warm bounce. | Four **actual bounded filled SVG surfaces**, two per frontal parent, not extra contours or unbounded CSS gradients. Parent is the existing geometric S-seam face. |
| Meso | Left dark core should sweep down the medial return, right dark core reverses direction; warm reflections each grow from a different shoulder. | Individually authored cubic envelopes `rose-front-{left,right}-{cool-core,warm-bounce}` with separate bounds/flow/direction; four different geometries, all behind the rest of the original central whorl. |
| Micro | Core marks must be dusty/dark rather than grey cartoon outlines; lit faces must not paste ivory paper rectangles over the previous pigments. | Existing CP-F1 `cast-shadow` and `glaze` recipes (three hue-separated pigment passes), **non-opaque** support, no `craft` base, zero overlay contour, original two authored short form-directed dry-pencil traces per plane. Seeds occupy stable slots 38–41. |
| Animation | Paper tooth and pigment deposition must remain attached to the source surface under arbitrary frame seek. | Existing absolute CP-F1 frame clock and source transform, no independent random animation. New marks start only at frames 216–278. |
| Compatibility | All existing 11 original organs, five physical undersides, four inner petals, three middle petals, foliage and calyx must remain unchanged when combined. | Opt-in requires `rosePhysicalFolds`; existing branches never change. 16→20 regions on the minimal folded rose; 42→46 in complete combination, within CP-F1's 48-region cap. |

## Native Storybook and verification

- Use the existing **Video Production / Film Looks / Colour-pencil → Drawing Foundation**.
- Enable **Foundation rose physical folds**; then enable **Foundation rose front value planes**. Both must remain opt-in. Inspect 16:9 and 9:16, source-attached left/right 2.15× macros, frame scrub, paper tooth, pressure and burnish. Do not add a separate Storybook folder.
- Source inspector: four unique closed bounded curved value envelopes, per-parent transparent cool/warm pair, original fine contacts and valid timelines. Unit: typed CP-F1 surface mapping, exact old region parity, fail-closed flag, deterministic high seed, non-rose subject isolation, 46-region full botanical combination. Real Chromium: before/enabled/restored pixel identity, actual parent/overlay non-zero area, ≥86% local containment, 1×/macro screenshots, seek-safe pre-detail negative control, zero raster.
- **ART HOLD:** The four tonal areas are an *optical experiment*, not a measured natural reflected-light model. Dense pencil layering here does not prove full rose realism, nor a physical 3D lamina. Reject if their edges appear sticker-like, tonal flow escapes its parent, optical pressure is too faint/strong, or the center still looks graphic at 1×. Review the exact-head native screenshots against authorized botanical sources before release. Keep the flag OFF until independently judged.

## Remaining work

1. Reassess native 1× and 2.15× screenshots to identify real light direction and patch any hard vector boundary / cross-petal pigment leakage; avoid increasing procedural speckle.
2. Obtain owned/licensed source specimen for measured central-cup geometry, local normals and petal reflex before claiming realistic botanical anatomy. Current morphology is reference-inspired, not reference-matched.
3. Only after still acceptance: root-linked, deterministic wind/gesture deformation of complete corolla and its attached tone/detail fields, with occlusion and non-tearing frame checks.
