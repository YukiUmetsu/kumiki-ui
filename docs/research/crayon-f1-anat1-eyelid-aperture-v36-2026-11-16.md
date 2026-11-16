# ArtCraft F1 V36 — source-registered 3D near eyelid, sclera, iris, and tarsal light

**Status:** !dev only / ART HOLD / PR #461 DRAFT. **Not an approved realistic portrait.**

## Original reference and 5-axis visual deconstruction

Original 608×1082 **browser screenshot** of [Christopher Campbell, *Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), public-domain CC0 1.0 (2015), SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. This is not certified original camera-resolution JPEG. Do not use cropped pixels or licensed photos as an embedded rendering asset.

V35's independently captured Chromium 1× and 3× actual PNGs are in [exact-head artifact 14267345061](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43947480218/artifacts/14267345061). It improved near-eye *region* SSIM 0.5310→0.5402 against V32 but the **eye still looks like a flat animated decal**. Side-by-side visual comparison shows a large bright full almond around a circular iris; the real photo eye is much more angular, has lid contact concealing the upper iris, and contains dark lateral upper/lower occlusion plus differentiated moist sclera only near the medial corner. A polished, handsome and anatomically believable source rendering cannot be achieved by changing iris colour alone.

Matching 7×7 median RGB from actual original CC0 source and V35 native Chromium at exact source pixels:

| Native component | Pixel coordinate | Source RGB | V35 RGB | Key deficit |
| --- | --- | --- | --- | --- |
| Left exposed sclera at lateral canthus | (239,550) | (43,28,27) | (119,102,101) | too bright by 70+; should hide behind overlapping skin/iris |
| Medial sclera by inner canthus | (299,551) | (114,99,100) | (170,153,147) | too bright/simplified, no corneal wrap |
| Upper near iris | (254,547) | (19,12,10) | (41,33,36) | brown iris too light |
| Pupil | (262,545) | (14,9,8) | (37,31,33) | dark core too light |
| Upper tarsal contact | (264,531) | (131,112,113) | (171,138,132) | no native upper-lid tissue shadow |
| Lower infraorbital rim | (259,571) | (108,64,60) | (181,155,146) | lower eyelid misses reddish occlusion |
| Crease above lid | (261,515) | (121,93,91) | (168,134,130) | supraorbital core shadow too flat |
| Near skin below eyelid | (252,582) | (137,87,73) | (201,164,152) | lid-to-malar continuous value turn missing |

No attribution to a photograph's *identity* is inferred from generic ANAT1. Use **existing repo human anatomy** [ANAT1 skill](../../skills/kumiki-human-anatomy/SKILL.md), [ANAT1 API](../component-specs/human-anatomy.md), actual 468-vertex `createFace({calibrate:false})` MediaPipe mesh and `crayonF1RegisterAnat1Face()` camera fit. Source-observed lateral/medial canthi ~ (216,558) and (318,545); 3D yaw-based projected `exocanthion.R` / `endocanthion.R` shift cubic points at most ±2.5 px (90+% reference source authority). Population mesh is not subject-specific face reconstruction.

### Specific physical drawing strategy

1. **Topological continuity:** Rebuild the **same eight original named** deeply parent-clipped near-eye wax surfaces, not a new SVG eye on the face: `sclera-near`, `iris-near`, `pupil-near`, `upper-lid-near`, `lash-root-near`, `lower-lid-near`, `lower-lid-margin-near`, `upper-lid-crease-near`. Parent cornea attachment and painter order unchanged, every other V35 native element unchanged. Far eye remains an asymmetric smaller, hair-occluded independent negative control.
2. **Anatomical vector:** Four cubic near sclera and four near iris segments are not generic circles/primitive ellipses; they trace photographic lateral→medial source pupil/limbus/upper-lid/lower-tarsal boundaries, consistently tilted under fitted ANAT1 yaw/pitch. Pupil uses three joined original-wax Bézier segments. Source landmarks always dominate.
3. **Edge physics:** Sharp cornea/lid contours remain *inside* opaque corneal wax, and the skin upper and lower lids are native `coverage:"open"`, physically `stroke-built` dry wax with 6.5–8.4 px tooth-feather blending. No image cutout, Gaussian blur or flat painted sticker; original adult face grain and lash micro-fibres are retained.
4. **Five-value hierarchy:** Tarsal dark core (nearly-black red/brown eyelid), iris occlusion, sclera reflected/lighter halftone at the **inside** corner, reddish lower-lid reflected rim, eye socket cast and upper fold; original source RGB samples above constrain value. Avoid painting enormous white sclera highlights or featureless black circular dots.
5. **Fine microstructure and animation:** Every lash fibre, corneal highlight, all hair strands and attachments, undisturbed far iris, large V35 cheekbone improvements, other nose root/alar geometry, skin pores/paper tooth, scene seed and original 300-frame animation preserved exactly (same element identity & time). No new dependencies or Storybook folder.

## ArtCraft v7 acceptance, independent evidence and failure plan

The only opt-in route is `midfaceForm:"source-anat1-near-eye"` on top of V35, in the original Adult Face Lab with original V35 and V32 negative controls. Unit tests enforce source-derived ANAT1 bounds, parent graph, fail-closed duplicates, full 300-frame scene, strict unchanged hair/nose/cheek. Native Playwright draws exact source-camera V35 vs V36 **1× and 3× at f299** and f0/f149/f299 film snapshots. These are necessary *engineering* tests, not artistic approval.

**MANDATORY:** review exact-head real pixels with original photo at full canvas, near/far eye and orbit ROIs, cheek/noise/noise blur; calculate reproducible source-original RGB SSIM in each matching crop before promoting. An improvement in one ROI while total facial structure declines means the experimental study remains ArtCraft-rejected. ANAT1's fitted 13 **source** anchors do not replace the required 18 independently annotated actual-output human landmarks, five matched facial value planes, full natural-speed 300-frame review, artist approval and ArtCraft ≥0.85 overall source target. Keep PR #461 draft/unmerged until those gates actually pass.
