# ArtCraft F1 / V16 — human-mouth topology, wax occlusion and actual native screenshot review

**Status:** ARTISTIC FAIL / EXPERIMENT ONLY. PR [#281](https://github.com/YukiUmetsu/kumiki-ui/pull/281) remains draft and must not merge. No default behavior changed. The new candidate is not a finished human portrait.

## Actual source and visual-media evidence

- Identity and geometry: [Christopher Campbell, *Brunette woman portrait* (CC0 1.0)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), frozen source image 608×1082 SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Oral review rectangle **x330–504, y673–793**. The source in the browser's target projection is NOT interchangeable with another resized/cropped JPEG.
- Actual source-relative V15 and V16 Chromium screenshots: [exact-head GitHub run 43790044512, `fbde4d02`](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43790044512) → artifact `crayon-artcraft-native-portrait` ([archive](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43790044512/artifacts/14192067580)). Independently inspected V15 and V16 at the **same camera**, at source 1× and mouth 2.65× (focusX417/y739). V16 control re-renders V15 unmodified.
- Authentic material: [Philadelphia Museum of Art, *Descriptive Terminology for Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), wax binder clumps and lifts at ends, rather than equally smooth plastic vector solids; [Stockmar, *Painting with wax crayons*](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf), multi-layer wax colors and variable deposition on paper. The source and material examples were **studied**, not copied into pixels or used as a raster filter. This mode is genuine built SVG CRAYON1 geometry.
- External craft comparison only (not identity): [Daniel Aros, *Retrato Rihanna*, crayon-on-cardboard portrait](https://www.saatchiart.com/art/Drawing-retrato-Rihanna/2297055/10894467/view). The visibly layered red-orange lip form and tooth shadow demonstrate the importance of wax edge direction and selective dark contact, not a license to replicate copyrighted portrait pixels.

## Reference → feature-to-construction / five-axis review

| Axis | Observed 608×1082 source x330–504,y673–793 | Incorrect V15 | V16 construction | Actual V16 result |
| --- | --- | --- | --- | --- |
| Continuity | Three upper incisors root **under** the upper vermilion; only partial enamel shows through a single narrow negative space | Three bright detached pale lozenges inside an oblique wedge | 3 non-mirrored registered tooth-path corrections and one explicit upper-vermilion occluding wax pass **after** enamel, clipped to native mouth cavity | **STILL FAIL**: teeth read as gray lozenges, overhang too subtle to create natural tooth occlusion |
| Flow | Upper lip has two asymmetric curvilinear domes; lower lip rounds into cheek/chin, not a straight wedge | Sharp triangular red upper slab and pink graphic lower stripe | Curved source-space upper bow and lower body C-curves, with opacity nested in feathered layers | **STILL FAIL**: upper lip reads as flat wedge, lower lip is planar and overly pale |
| Edge | Dark claret contact is sharp at the actual lip split; other outer margins break softly into skin | Hard maroon slash, border around teeth and lower lip | Separate dark cavity and open feathered natural outer contacts; overhang open wax, not contour outline | **STILL FAIL**: dark edge is too continuously straight and thick |
| Width/rhythm | Unequal upper vs lower volume, small irregular tooth relief, folds not uniform | Nearly uniform tooth oval intervals and pink wedge | Independently authored 3 tooth curves/widths and rounded inner lower core, preserve 10 wax ribs | **STILL FAIL**: individual tooth spacing remains too even and boundaries are too geometric |
| Microtexture | Directional opaque/transparent wax with clumped pigment and tooth pickup | Systematic noise hatching reads algorithmic | Retains every preexisting pressure/burnish/paper-tooth/ten lower lip wax ribs; adds mouth-specific pressure relief | **STILL FAIL**: procedural scratch noise is not authentic observed binder buildup |

This remains **reference-matched SOURCE GEOMETRY**, not a generic symmetric mouth. The geometry is more layered, but the actual picture still falls below world-class professional hand-drawn wax quality.

## Structural and code contract

- Added `src/video/crayon-artcraft-f1-oral-sculpt.ts`: patches only 9 named wax regions and inserts one `upper-vermilion-incisor-overhang` child of `mouth-aperture-depth` **after** the 3 dental-surface nodes and **before** the lower lip, with original photographic coordinate-space curves. All previous states `baseline`, `source-volume`, `source-alar`, `source-oral` remain exact negative controls; the newly added `source-oral-sculpt` is **opt-in** in the existing Crayon ArtCraft Face Lab and a dedicated 2.65× Storybook mouth preset.
- Camera, foreground rig, seed, shared paper tooth, timing, hair, eyes, body and all non-mouth elements stay byte-for-byte unchanged. Surface is still native wax with no photo texture, image elements or generic blur replacing construction.
- Four targeted `tests/crayon-artcraft-f1-oral-sculpt.test.tsx` **PASS**: unchanged controls, no unrelated element changes, source teeth and mouth layered paint order, small opaque core nested in broad open-wax outer boundary, no duplicate/absent anatomy, renderer and no raster shortcut.
- [TypeScript and Storybook source checks](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43790044538) **PASS**; **619/630** unit tests PASS. All **11** failing assertions are concurrent unrelated RISO23/26/30/31 art data assertions; do not modify unrelated art or weaken tests to obtain a green label. [Native drawing/grammar proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43790044541) **PASS**. Exact-head [native Chromium V16 art crop and frame proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43790044512) **PASS** (artifact exists). A green browser job confirms actual rendering, **not artistic acceptance**.

## Quantitative fidelity — unmodified ArtCraft 9.1 thresholds

Independently executed real `artcraft/skills/artcraft/scripts/portrait_fidelity_gate.py` against source 608×1082 and **source-space 1× native full-frame renders** (not a zoomed crop wrongly treated as a full-frame image). Results:

| Metric | V15 | V16 | Required |
| --- | ---: | ---: | ---: |
| Full 608×1082 RGB SSIM | 0.374609 | 0.374609 | ≥0.85 |
| Full edge diff ratio | 2.819592 | 2.802089 | ≤0.20 |
| Full edge pixel mismatch | 28,351 | 28,175 | ≤6,000 |
| Full histogram correlation | −0.207691 | −0.207097 | ≥0.92 |
| Fixed mouth x335–500,y685–782 SSIM | 0.52912 | 0.53534 | not a standalone release gate |
| Fixed mouth Canny XOR/reference edge ratio | 1.94059 | **2.1075** (worse) | no arbitrary post-hoc threshold |

The edge mismatch **regressed** in the mouth despite slight global and local score changes. These values should not be overinterpreted as art quality by themselves; they support, but do not replace, the source-aligned visual rejection. The material is deliberately stylized and the photo background not replicated, but both **artcraft portrait-fidelity and human reference fidelity remain unapproved**.

## Remaining priorities / next action

1. **MACRO before micro:** reconstruct the upper vermilion’s **true rounded underside** and the lower lip’s **real lip-to-cheek value turn**, not more pressure-grain over the present triangular silhouette. The actual source holds visibly irregular edge/teeth arcs. V16 is not an acceptable new default.
2. Integrate the source-specific lip structure with philtrum/alar root and cheek folds; correct the isolated nose-airspace and front-facing flat eye form before any more procedural texture. Compare exact human source landmarks and mask continuity, run `art-human-anatomy/scripts/human_anatomy_fidelity_gate.py` with **independently observed** landmarks and source-render part masks, not fabricated self-reported coordinates.
3. Check V16 frames 120/210/260/299 at actual 24fps/300-frame sequence, continuity of wax exposure and 1× visual readability. Normal render proof and an SVG count test cannot certify motion.
4. Fix broader face/forehead/jaw/neck and hair mass vs photo projection; preserve pressure-built crayon microtexture but remove generic full-face repetitive scratch wallpaper only after structural geometry and shading are correct.
5. **Keep PR #281 draft, do not merge.** Run strict research, anatomy, structural-detail, render-fidelity and independent artist gates before promotion. Do not chase global SSIM by inserting photo pixels or replacing authentic wax with smooth photo filters.
