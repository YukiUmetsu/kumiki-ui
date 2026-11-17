# Crayon ArtCraft F1 V45 — observed three-dimensional near-eye tarsal/medial contact

**2026-11-17 · ART HOLD · `!dev` only · PR #461 remains DRAFT / unmerged.**

## Reference-first deconstruction

**Licensed portrait identity:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0 1.0, October 2015. Benchmark is the archived **608×1082 browser screenshot**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, [source screenshot artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169), **not** the original full-resolution camera image. All source points below refer to this exact pixel reference.

**Art medium:** Physical wax-crayon contact with paper tooth, tapered mark endpoints and rough pigment, not flat vectors. CRAYON1's existing dry nib, pressure-dependent wax layers and parent clipping are retained; no PNG photographs, raster-image screens or CSS filters enter runtime. See [Rudolf/Mould/Neufeld wax deposition study](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) and [Philadelphia Museum of Art terminology for works on paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). These principles are not proof that generated wax looks indistinguishable from handmade art.

**Actual negative-control Chromium source:** [V43 final native screenshots, CC0 608×1082 source](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205791/artifacts/14298484504) with V44 comparison from [fully corrected V44 f299 Chromium](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44027519138/artifacts/14303522522). V44 stronger five-plane color pressure **regressed photographic SSIM**, so V45 branches **directly from V43** and does **not** stack V44 onto the eye.

### Pixel readback of the original CC0 eye (7×7 RGB median)

| Original-photo point | x,y | CC0 RGB | V43 native RGB | Interpretation |
| --- | ---: | --- | --- | --- |
| Medial inner canthus | 312,546 | 74,30,28 | 152,127,120 | render lacks overhanging dark upper-lid skin |
| Neutral inner visible sclera | 293,547 | 131,132,132 | 139,123,119 | need neutral cool wax, not white sclera sticker |
| Near lower tarsal lip | 260,572 | 108,63,58 | 182,148,136 | lower tarsal skin too thin/light and lacks roll |
| Under-eye infraorbital field | 255,585 | 162,118,105 | 193,159,146 | overly light; geometry already registered in V35 |
| Supraorbital sulcus | 254,514 | 121,89,87 | 170,136,132 | upper eye crease barely has measured depth |
| Near iris/pupil | 255,545 | 21,14,11 | 34,23,27 | photographic iris dark; preserve original existing iris |
| Right sclera behind iris | 287,548 | 128,125,123 | 137,122,116 | neutral slightly brightened only |
| Medial sclera limit | 304,551 | 104,83,82 | 138,121,114 | skin/eyelid occlusion needed, not a giant white patch |
| Lower margin near outer | 239,550 | 43,28,27 | 74,55,61 | dark lashes already exist; preserve |

The source exposed near eye is **not a symmetrical circle**. The outer canthus is at approximately x216,y558 and the inner at x318,y545. V36's exact original near-eye **nine connected native wax elements** and ANAT1 468-point source-oriented camera already honor these canthi. V45 does not distort them or replace the iris with an arbitrary beauty template.

## Anatomical continuity / vector flow / contact / depth / temporal construction

1. **Native topology:** Preserve full V43 ordered element IDs, path geometry, fixed frame seed, crown/far hair, 19 CC0-photo foliage patches, full face/ear/nose/lip/jaw and all ANAT1 source landmarks. Only existing `sclera-inner-contact-near`, `lash-root-near`, `lower-lid-near`, `lower-lid-margin-near` and `upper-lid-crease-near` wax materials are calibrated (original cubic paths unchanged); modify **only** `lash-contact-near.d` to append 23 actual *micro-fiber contacts* to 33 original source-drawn eyelash curves.
2. **Vector flow:** Rooted lash microfibers follow source horizontal lacrimal-to-temporal rim x230..309, with a true asymmetric y-knotted photographed upper-lid envelope: (220,558),(235,544),(249,538),(266,535),(282,536),(299,539),(317,545). Interpolate with continuity, add bounded deterministic root jitter and variable slants/length 2.4–7.8 source pixels. Draw *free tip toward natural dark root* so wax deposition stacks on physical skin, never detached lipstick-like black line segments.
3. **Pigment edge:** Existing source skin-fold `coverage:"open"` and native dry-wax pressure/feather/underpaint grading create soft contact. The dark near lash root remains a connected existing physical wax mass with a **more muted dark maroon pigment gradient**, rather than a new cartoon boundary. Neutral sclera uses open feathered wax and original parent clipping to `sclera-near`, NEVER globally whitening the entire almond.
4. **Anatomical depth:** Original lower lid and margin are separately connected ANAT1 surfaces; darkening their original soft tarsal wax emphasizes the small lid roll into the original infraorbital cheek rather than adding a hard disconnected dark ellipse. Upper sulcus receives muted skin pigment while retaining every original face plane, eyebrow hair, iris and source near-eye reflection. Keep both near/far eye asymmetry.
5. **Time and validation:** New `midfaceForm:"source-anat1-eye-tarsus-v45"` option and three `!dev` Storybook inspection states: full 1×, eye 2.8×, face 1.6×. Same 608×1082 camera, original 300 frames, seed/paper and film timeline. V43 original remains entirely intact. Unit tests require exact unchanged source geometry/ID, exactly five wax material updates, 33 existing plus 23 new lash fine source-root strokes **within one original contour ID** (no authored index/seed shift), invalid-source rejection and native wax. Browser captures matched V43/V45 frame 299, 1×/2.8×, with decoded **same-PNG untouched source-background/nose pixel check** to catch missing GPU tiles.
6. **Art release gate:** Original CC0 vs native pixel SSIM is required **by ROI** (whole, near-eye, upper sulcus, lower lid, medial canthus and not-touched face/hedge). The V43 whole SSIM ~0.497 is far below target **≥0.85**. Improvements to local RGB do **not** override structural likeness or macro artistic quality. The 18 independently measured *final-render* landmarks, all five continuous source skin tonal planes, full actual 300-frame animation inspection, and separate human artist approval remain mandatory.

**Art status:** V45 is an unapproved experimental near-eye morphology/contact study; do not merge until real browser screenshot review demonstrates genuine geometry, texture and photograph fidelity improvement.
