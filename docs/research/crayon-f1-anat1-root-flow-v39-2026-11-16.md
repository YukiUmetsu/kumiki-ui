# ArtCraft F1 V39 — original root-to-shaft wax gesture trial (!dev)

**Status:** DRAFT / NOT ART-APPROVED / DO NOT MERGE until independently rendered and reviewed. 2026-11-16.

## Authentic sources and allowed use

- Original portrait: [Christopher Campbell, *Brunette woman portrait*, 2015](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), public-domain dedication CC0 1.0. The Wikimedia original is a **landscape** photograph (5184×3456) of a subject posed near a hedge; the repository's previously annotated **608×1082** reference is a *portrait source crop* (SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`), not a claim to own or checksum the camera JPEG. Reproduction of the crop from the original source is not yet independently certified. We do not redistribute an original JPEG in code.
- Medium: [Rudolf, Mould, Neufeld, *A Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), contact-force/height-field wax and pressure-driven deposition; [Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), wax clumping and lifted terminal contact. These are construction principles, **not** licensing of their illustrations or proof that the native renderer matches physical press/paper.
- Artist direction: restrained, source-aligned root curvature and dry broken-pigment contact. No stock shader, imported SVG, photo sampling in runtime, texture paste or cartoon-wig replacement.

## Five-axis source and medium deconstruction

1. **Topological continuity:** The four *existing* native V38 hair wax masses and all 18 grouped directional micro-contours remain attached to their original parent clipping. Root-to-shaft is an **addition within each surviving original grouped contour path**, never a replacement of original cubic subcurves. Body, ears, face, clothes, paper, mouth and eyes remain byte-identical to V38.
2. **Vector direction:** Five previously authored crown reference gestures sweep asymmetrically from x≈257–351, y≈202–237 towards the two sides; five left curtain rails root at x≈35–87, y≈292–366; six right curtain rails root at x≈452–507, y≈315–467. These are reconstructed from the **existing code-authored CC0 source study rails**, not freshly measured on high-resolution camera pixels. Within each rail, the new root-to-middle path inherits the cubic derivative and its offset normal: no straight parallel screen-space ticks.
3. **Edge/mark shape:** Small nonuniform ±0.7px offset, differing longitudinal start/end stations and smooth derivative continuity. Existing V38 dry-wax `waxContact`, original fiber paths, widths, clipping, alpha, colored pigments and start/end frames are unchanged. The new geometry inherits the already verified native wax line renderer; no CSS filter or detached gloss.
4. **Volume/layering:** Original dark `hair-back` → `hair-crown-surface` → left/right curtain hierarchy and independent surface hue remain unchanged. Added root curves must visually merge into the dark underpaint at source-scale 1×; reject artificial comb-stripe, hard sticker or uniform copper highlights at 3×.
5. **Temporal/reversibility:** Opt-in `midfaceForm:"source-anat1-rooted-hair-v39"` after the V38 pigment study. V38 default and all earlier / separately rejected V33/V34 experiments remain untouched. Same 608×1082 CRAYON1 camera, deterministic seed and 300 absolute frames; no new timeline or animation interpolation.

## Verification and rejection gates

- Structural tests: exact same V38 scene IDs, count, order and geometry for **all non-hair elements**; all original grouped hair cubic data remains an exact string prefix; append root-to-shaft curves in source coordinates; same native parent and materials, high/low detail, error rejection, deterministic data.
- Storybook: existing `Video production / Film Looks / Crayon / ArtCraft Adult Face Lab`; new `Cc0Anat1RootFlowV39` full 1× and `Cc0Anat1RootFlowDetailV39` right curtain 2.15×. Both explicitly !dev.
- Native Chromium: real 608×1082 before/after 1× and 2.15× right curtain screenshots at f299. The comparison must show actual changed pigment deposition, but difference by itself proves neither quality nor reference likeness. Inspect both (i) at publication scale and (ii) macro for detached roots, repeated bands, clipping issues, overbright hair or procedural comb lines.
- Independent photo/render review: source screenshot and native render full image plus region-level hair comparisons must be checked by another reviewer. Existing V38 whole-image SSIM **0.405919**, well under required **0.85**. No V39 SSIM or 18 final-render landmark values have been independently measured; do not invent or inherit those from older candidates.
- Complete normal-speed 300-frame artistic scrutiny and human signoff still missing. The 2500 native stroke budget, non-finite geometry, paper contact and frame-to-frame source fidelity may veto promotion even if tests are green.

**Decision:** remain experimental. Make next changes only after inspecting actual V39 PNGs against both V38 negative control and original licensed photographic crop; remove or revise root-gesture additions if they form mechanical/overbright streaks.
