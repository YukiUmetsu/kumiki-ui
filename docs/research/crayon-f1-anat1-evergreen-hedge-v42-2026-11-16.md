# Crayon ArtCraft F1 V42 — photographed evergreen hedge as physical wax volume

**Status:** experimental `!dev`, ART HOLD. Source date 2026-11-16. V42 is not a finished or artist-approved realistic portrait. **Do not merge PR #461** on the strength of unit checks or browser screenshot differences alone.

## Licensed photograph and primary medium

**Identity and rights:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), October 2015, CC0 1.0. Benchmark is *the independently captured 608×1082 browser crop*, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, available in [archived source screenshot artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169). Do not represent this as the original full-res camera JPEG.

**Physical medium:** [Rudolf, Mould and Neufeld, *A Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), describes wax/paper contact, pressure, deposition and tooth. [Philadelphia Museum of Art, *Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), distinguishes pigment rubs, layers, surface texture and broken/raised contacts. These are principles, **not** evidence that synthetic wax is indistinguishable from physical hand-coloring. No downloaded artwork is embedded.

## Actual photographic deconstruction

Before coding, examined the byte-verified 608×1082 PNG and unmodified V41 native Chromium full-frame PNG. The source woman's face extends from near x108,y282 to x500,y862, flanked by dark brown hair and neck, with diffuse **green-black foliage/bokeh** visible in the large paper-only regions above her crown and to either side of the two curtains. In V41 these exposed spaces are light beige paper, a source-specific structural mismatch.

Seven **measured source raster regions** (simple actual RGB median / mean on the source PNG, **not** painted uniform color targets):

| Region (x0,y0,x1,y1) | Source median RGB | Source mean RGB | Character |
| --- | --- | --- | --- |
| Upper total (0,0,608,163) | (19,33,10) | (25,39,14) | deep green-black canopy, uneven warm reflected patches |
| Upper left (0,0,225,160) | (24,39,11) | (30,44,17) | dark fern shapes with staggered olive bokeh |
| Upper right (385,0,608,170) | (21,36,11) | (25,39,14) | darker recesses and intermittent bright leaves |
| Far side above (520,180,608,355) | (37,61,17) | (45,65,25) | higher-lit green wedge behind far hair curtain |
| Far side middle (550,345,608,625) | (13,21,9) | (20,28,13) | almost black deep hedge, blurred foliage |
| Far side lower (580,625,608,900) | (49,45,29) | (53,59,34) | foliage partly occluded by warm brown locks |
| Near upper left (0,150,80,290) | (51,75,28) | (58,74,34) | strongest broken warm-green leaves |

All coordinates refer to the actual 608×1082 CC0 screenshot, not a hallucinated tree image or flattened collage.

## Reconstructed five-axis material

1. **Topology:** One contiguous dark-green wax undercoat extends beneath the **existing** original CC0 portrait. Local canopy shadow, far/right opening, near/left opening, 19 individually located distant botanical bunches, then delicate leaf laminae share a single 608×1082 native paper. Each bunch has **three nonidentical cupped leaves** with connected four-part Bézier outlines, asymmetric tip, vein and taper. This intentionally does not assert botanically classified species from a blurry photograph.
2. **Vector flow:** A fixed set of spatially authored photographed light/dark locations, not a global tiled forest pattern. x14..178 seeds near-side fronds; x235..405 represent upper canopy; x468..603 seeds far-side branches and sparse lower pockets. Each 3-leaf bunch varies axial angle, length, width, bend and leaf divergence. Source backplane remains dense and blurred, so each distant botanical grouping uses physically bounded color and softened wax contact rather than razor-cut leaf stickers.
3. **Wax edge/texture:** CRAYON1 solid tooth-laden stroke-built dark pigment `coverage:opaque`, `deposition:stroke-built`, dry nib, controlled pressure and `underpaintGradient`, localized muted colored reflectance in olive/fern/moss, native `featherContacts` and `blendRadius` up to 13 for out-of-focus distant leaves. Separate 0.43px, lower-opacity source-direction laminae are **physically clipped to the exact corresponding wax leaf group's shape**, not arbitrary SVG circles. No image paste or external filter asset; CRAYON1’s native feather-contact paths use an internal Gaussian SVG contact filter, not a photo-processing effect. No uniform flattened green fill is claimed as finished background.
4. **Temporal/depth layering:** Background drawing stages 0–93; original source portrait retains the same authored 300 frames. New *generic* `CrayonBase.renderLayer:"backdrop"` field renders only explicitly tagged source environment first, independent of insertion order, while preserving the **original authored wax index and seed**. V42 appends all new elements after the original face and does **not** mutate, reorder, or reseed the 18 fine rooted hair groups, any eyelid, mouth, ear, tone, crown, or neck. Screen-space artwork and legacy scenes default to unchanged `normal`.
5. **Interactivity:** Opt-in `midfaceForm:"source-anat1-hedge-v42"` in existing `Video Production / Film Looks / Crayon / ArtCraft Adult Face Lab`. Same source/deterministic camera, adjustable detail (0.2..1), synchronized movie frame and normal playback. Three standalone !dev Storybook states: exact full 608×1082, near upper foliage macro and far-side foliage macro. V41 stays a source-matched negative control.

## Verification, rejection and release criteria

- Strict unit: the entire original V41 `elements` array remains a **deep-equal prefix**, same `seed`, paper, camera and 300 frames; all appended hedge elements exclusively `renderLayer:"backdrop"`. All leaves/stems native `wax` / parent-clipped `contour`, deterministic detail 0.2 and 1, no duplicate IDs; invalid detail and missing originals throw. New generic CRAYON1 `renderLayer` validation rejects all unknown values.
- Actual browser proof: **same-head V41/V42** native PNGs at frame 299, identical source camera and deterministic seed. Capture 1×, upper-source 2.4× and far-side 2.4× and confirm background is behind face by checking actual DOM painter order. Native screenshots demonstrate that environmental pixels changed, **not** artistic likeness or human approval.
- Independent ArtCraft photo comparison: compute source vs same-head V41/V42 per RGB source ROI (whole, top, top-left, top-right, far-side, face, near eye) using `skimage.metrics.structural_similarity(...,channel_axis=2,data_range=255)`. Reject improvements achieved by degrading the face or introducing foliage on skin. Inspect photo ↔ native at 1× and 2.4× for too smooth green undercoat, symmetrical 3-leaf icon repeats, harsh spikes, excessive cartoon saturation, bland fake bokeh or matte edge contamination.
- The whole original CC0-photo SSIM target remains **≥0.85**. V41 ~0.414. 18 *final-render* independently measured landmarks, five matched facial tonal planes, frame-by-frame natural-speed 300-frame artist review and independent professional approval are still required.

## Actual native Chromium / source-pixel review

Exact source PNG: 608×1082 verified SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Independent decoded RGB source and V41/V42 negative-control PNGs share an exact camera, seed, frame 299 and full native 608×1082 size. V42 latest code `2f753c2e815009d23dd49a26518c800530209732`.

- [Latest matched native 1× + upper 2.4× + right 2.4× Chromium output, artifact **14297925627**](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44012310835/artifacts/14297925627).
- [Latest Chromium proof run — PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44012310835), [source/build TypeScript + changed unit tests — PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44012310702), [native CRAYON1 drawing grammar — PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44012310700).
- Independently measured `skimage.metrics.structural_similarity(source, rendered, channel_axis=2, data_range=255)` on same exact photographic screenshot. A score increase is not independently verified artistic quality.

| Source ROI (x0,y0,x1,y1) | Native V41 | First V42 | Refined V42 | V41→V42 refined |
| --- | ---: | ---: | ---: | ---: |
| Whole portrait (0,0,608,1082) | 0.414256 | 0.476770 | **0.489747** | **+0.075492** |
| Top (0,0,608,163) | 0.152693 | 0.435120 | **0.487647** | **+0.334954** |
| Top left (0,0,225,160) | 0.171602 | 0.437678 | **0.449769** | +0.278167 |
| Top right (385,0,608,170) | 0.160251 | 0.410932 | **0.494337** | +0.334086 |
| Far upper (520,180,608,355) | 0.216907 | 0.279795 | **0.374066** | +0.157160 |
| Far middle (550,345,608,625) | 0.109273 | 0.290316 | **0.371129** | +0.261857 |
| Far lower (580,625,608,900) | 0.217119 | **0.384509** | 0.359641 | +0.142522 |
| Near upper left (0,150,80,290) | 0.256542 | 0.274046 | **0.287692** | +0.031150 |
| Full face (108,282,502,862) | 0.621656 | 0.622811 | **0.622878** | +0.001222 |
| Near eye (174,430,346,609) | 0.563332 | 0.563332 | 0.563332 | 0 |
| Nose/mouth (323,500,498,770) | 0.532488 | 0.532488 | 0.532488 | 0 |

The top photographic region’s mean RGB is **(25,39,14)**; refined native V42’s top mean is **(31,47,22)**, considerably closer than the first V42 (40,58,28). The source cropped upper right mean is (25,39,14) versus refined (35,55,25). New background covers the original beige paper without re-seeding any portrait hair or face; only ~0.28% of the face ROI pixels change at its occlusion boundaries.

**Visual critique:** The first V42 produced very large, pale, mechanically repeated three-leaf wax symbols and bright vertical far-side patches despite a positive global SSIM. The refined version darkens measured canopy, narrows/dropouts leaf contacts and directs wax grain along each leaf axis. Macro still exposes repeated leaf-cluster silhouettes and large stylized wax contacts; the native face is still much flatter than the reference and far-side hair still looks like a solid curtain. This demonstrates a more source-consistent stage, **not** a finished or indistinguishable real crayon portrait.

## Final decision / priorities

**ART HOLD / DRAFT / DO NOT MERGE.** Whole-photo SSIM **0.489747**, still far below the required **≥0.85**. V42 adds a meaningful spatially registered environment improvement while preserving native face, but the artistic output still fails independent realistic-likeness expectations. The next source-led priorities are (1) reduce repeated leaf-icon shapes using true photographed foliage patch geometry and optical depth, (2) reconstruct facial three-dimensional tonal planes and realistic ocular aperture, (3) refine crayon hair-to-forehead contact without helmet-like outline, (4) independently verify 18 output-render anatomical landmarks and five source-relative tone planes, and (5) review all 300 naturally playing frames and obtain separate artist signoff.
