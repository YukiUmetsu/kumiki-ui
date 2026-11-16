# ArtCraft F1 ocular value-calibration experiment — native, source-matched and UNAPPROVED

**Date 2026-11-15 · Draft PR #281 · status: experimental A/B / independent visual review required.** These are CRAYON1 wax paths, pigment palettes, pressure and tooth; no photo overlays, raster shading or digital recolor. The previous native source-eye implementation is preserved exactly under `eyeContact:"source-shade"`, while `"baseline"` is the untouched original scene.

## Reference / licensing

Portrait: [Christopher Campbell (2015), *Brunette woman portrait*, CC0 1.0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The only correct geometric baseline is the pinned **608×1082** source-browser screenshot (GitHub Actions [43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`). Do not substitute a full-camera JPEG with a different crop/orientation. F1 source geometry is original source-space x/y annotations; its comparison wax is created entirely by code.

Wax craft: [Philadelphia Museum of Art, wax-crayon material microstructure](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p44; hand-rubbed contact and uneven binder pickup matter more than uniform digital outlines. Historical crayon *portraiture* alone does not define modern binder/pressure behavior.

## Actual-pixel audit that prompted this pass

The prior CRAYON1 face was **rendered in Chromium at 608×1082 at f299** and inspected against the identical source with no auto-resize, nonrigid warp, or image filtering. These are unaligned per-channel RGB means for named fixed source rectangles; the source is a **photograph**, not a finished crayon illustration, so matching the literal photo colors is a *directional tonal target*, not a pass threshold for crayon artistic quality.

| Region (x1,y1,x2,y2) | Photo RGB | Native source-shade RGB | Mean channel absolute error, 0–255 | Observed defect |
|---|---|---|---:|---|
| Near iris (240,533,284,567) | 62,46,44 | 98,79,75 | 38.7 | weak dark/pupil mass; round doll reading |
| Near exposed eye (285,539,322,562) | 113,89,87 | 172,150,143 | 59.3 | too-large luminous pale almond |
| Near orbital socket (196,488,326,596) | 130,98,91 | 172,141,134 | 44.6 | too pale and flat below the brow |
| Far eye (397,490,475,538) | 70,53,50 | 129,104,101 | 53.8 | far iris / lid under-occlusion too pale |
| Near brow (205,462,330,511) | 140,106,96 | 188,157,147 | 52.5 | wispy light brow with insufficient rooted weight |

These frozen source frames are independent evidence. The value-reconstruction is a **new experiment**; do not present its source-relative change as an improvement without re-rendering and comparing.

## Deconstruction against ArtCraft five axes

1. **Topology:** canthi remain attached to the same 3/4 skull; iris and pupil stay children of sclera/iris and are partly covered by lid. Only the **four-cubic near scleral aperture** is shortened to source-observed inferior exposure; no new generic full eye/face is substituted.
2. **Vector flow:** near and far lash roots follow source upper-lid tangents; all cubic root fibers and iris topology from the previous source-space pass are preserved. Never replace with horizontally mirrored or regularly spaced lashes.
3. **Edges:** opaque wax eyes, soft pressure-shaped lid/crease and gently feathered brow, not polygon stickers. Preserve sharp natural paper pickup at the actual pigment contact. No global Gaussian/airbrush over the entire eye.
4. **Width/optical rhythm:** differentiated near/far eye/iris geometry, smaller limbus exposure, darkened upper lash root and pigment density. Anatomical bounds, 18 landmark annotations, source camera and animation length unchanged.
5. **Microtexture:** retune exact native CRAYON1 pigmentation, pressure, native gradients and paper contact without image editing or reducing tooth/grain variation. A source photo has photographic skin texture; this must not be manufactured by noise or a flat overlay.

## Implementation and test plan

- `eyeContact:"baseline"|"source-shade"|"source-value"` is fully independent from other source midface, jaw/neck, lash-root toggles. **Only** the 14 named ocular wax regions are adjusted in the value-only option; all other native elements remain structurally and temporally equal. Two source-eye predecessors are exact negative controls.
- Real-time Storybook dropdown in existing **Crayon / ArtCraft Adult Face Lab**, 608×1082 side-by-side real photo, 1× full frame and 2.95× near / 3× far-eye closeups.
- Vitest asserts source geometry, crop, IDs, unchanged nonocular elements, source-specific darkening, paper-tooth, unchanged timing, 20%-detail validity and no scene errors.
- Playwright captures native **three-way** A/B at 2.95× source eye and f299, checks masks, differentiated pixel output and no page errors. This is not aesthetic success.
- After native screenshots, measure **all five** fixed source rectangles again, at exact camera, full RGBA color and edge difference; inspect eyelid root, brow shape, iris occlusion and wax microcontact by eye. A photo-to-crayon SSIM alone cannot certify beauty. Inspect extremes, normal-speed face film, far eye under source hair, 16:9 and 9:16 production crops where supported.
- **Reject** any candidate with a dark eye-value "sticker," gray iris, disconnected lash roots or fake wax gradients. Preserve documented prior mode for reversal. Do **not** merge PR #281 until independently approved human anatomy / five-axis crayon material and full animated QA.
