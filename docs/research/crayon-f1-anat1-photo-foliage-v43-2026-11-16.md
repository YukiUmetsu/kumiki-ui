# Crayon ArtCraft F1 V43 — photographed nonrepeating, asymmetrical foliage wax

**2026-11-16 · PR #461 · experimental `!dev` / ART HOLD / NOT MERGEABLE.**

## Primary source, medium, and why V42 is not sufficient

- **Art identity & license:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), 2015, CC0 1.0. Source benchmark is precisely 608×1082 browser capture SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, from [archived source artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169), **not** the original 5184×3456 camera file.
- **Native V42 negative control:** [Source-verified V42 608×1082, 2.4× actual browser PNGs](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44012310835/artifacts/14297925627) and [11 ROI photometric review](crayon-f1-anat1-evergreen-hedge-v42-2026-11-16.md). V42 did improve whole-image RGB SSIM to 0.489747 but its bright colored foreground consists of repeated **three-leaf wax symbols** that are not present as recognizable identical groups in the CC0 photograph. It reads like a cartoon garden against a dark block.
- **Physical wax technique:** the original [Rudolf/Mould/Neufeld deposition model](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), and [Philadelphia Museum of Art terminology for art on paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). This trial preserves native nonuniform pigment, tooth, pressure and feathered contact. No photo/stock image or rendered pixel asset enters the runtime; native CRAYON1 is retained.

## True source extraction (performed offline)

All following operations are on the exact licensed **608×1082 CC0 photographed RGB screenshot**; they are construction **provenance**, not runtime image-processing or imported pixels. The visual result must still undergo subjective ArtCraft review.

1. Gaussian RGB smoothing with sigma **5 source pixels** to suppress photographed compression/vein noise, not to erase the native wax texture.
2. Convert to OpenCV 8-bit HSV. Retain source-green candidate `25<H<98`, `S>55`, `G>40` with photographic green-excess `G−0.9R−0.25B >18`.
3. Morphological closing: elliptical 9×9 source kernel to connect photographic out-of-focus leaf blobs without tile/ellipse stamps.
4. Retrieve connected external **source silhouettes**, sorted by area, retain 13 main source regions of area ≥120 px², with polygon simplification epsilon **2.3–3 photographed pixels**. Crucially, keep each returned turning point and asymmetry, rather than reducing each to an oval or the V42 synthetic leaf triplet.
5. A second, higher-light green-excess threshold `>28` yields six independently source-observed lighter patches within the major bunches. Total **19 independently distinct source-scanned organic polygons**. This is two-tier local foliage volume/light, not 19 invented identical leaf shapes.
6. Record region RGB medians (including actual far-canopy medians such as **(41,73,14)**, near-left **(39,64,18)**, and high-lit upper leaf **(67,89,23)**) and construct source-conditioned volumetric *wax* color triads. Source contours are represented as bounded point data, converted to 19 distinct cubic closed paths by a fixed Catmull–Rom tension **0.115**. This rounds 2–3px segmentation aliasing only; no geometry is flattened to primitive circles or approximate global curves.

The largest source contour occupies x412–607 / y127–348, an asymmetrically parted far-side foliage pocket; another large irregular source mass spans x0–214 / y45–260. Smaller true photographic forms include x399–509/y44–119, x540–607/y59–100, and x540–607/y321–390. They form the original tree/hedge's spatial flow. The brown hair occludes parts of the background because the wax foundation is painted **behind** the original unchanged face.

## Topology/flow/edge/material/depth/animation deconstruction

1. **Topological continuity:** All original V42 19 source `cc0-hedge-leaf-*` wax IDs and 19 clipped `cc0-hedge-lamina-*` microcontact contour IDs survive. They become 19 true photographed connected organic source shapes with 19 local internal dry-wax contact groups. All four background undercoat/pocket wax masses, full V41 source face and **all 18 fine V41 hair-root groups**, jaw, nose, mouth, ears and eye detail are **byte-identical** to V42. Exactly the same node count and authored index: source source-wax seeds do not move.
2. **Vector flow:** Real connected photographic green silhouettes meander in nonuniform directions. Each path conserves all retained source turning points and uses smooth local cubic tangents. A few independent, short, offset dry-wax marks remain parent-clipped inside each shadow group to depict hand-deposited pigment breakup, replacing the false symmetrical central vein.
3. **Edge characteristics:** Source-derived jagged/curving edges are paired with native paper tooth, `edgeRoughness:.39`, wax pressure, variable undercoat, local warm-green/chromatic dispersion and physically feathered contacts. All remote blur/photo filters and bitmaps are absent; CRAYON1's own native contact-feather SVG filter remains because it represents the dry wax edge, not a photographic overlay.
4. **Light and optical depth:** 13 dark/mid green source forms plus six brighter source-measured patches are layered over the same darker continuous base wax, with photographic source-region color medians. Large region extents now match the CC0 photo's *actual* foliage bright shapes rather than icon placements. At close view test that wax still has local pigment granularity, no hard unphysically cut stickers or symmetric glyphs.
5. **Temporal reversibility:** Opt-in `midfaceForm:"source-anat1-photo-foliage-v43"` alone changes those 38 foliage elements over V42. The entire original 300-frame film, original source camera 608×1082, deterministic seeds, previously accepted crayon shader, V41 photographed face and V42 comparison remain untouched. No new global state or data from outside runtime.

## Verification and high bar for approval

- **Unit:** validate all scene shapes in CRAYON1, exact same V42 ordered IDs/count/seed/300 frames, all 38 botanical source nodes changed, *every other node deep equal*, both coarse and high detail, no missing source masks/parent clip or invalid source coordinates, deterministic source geometry, three !dev Storybook states.
- **Real Chromium screenshots:** V42 native negative control and V43 actual rendering at identical source-camera 1× and top/left foliage 2.4×, absolute frame 299. Confirm source background behind original hair/face, 42 background element nodes, 18 untouched rooted fine hair groups, no dynamic raster/filter asset.
- **Independent photograph metrics:** same hash-verified source PNG vs native V42/V43 RGB `skimage.metrics.structural_similarity(..., data_range=255, channel_axis=2)`, whole photo plus upper-left/upper-right/top 0–163/far-upper/far-mid/far-lower/full-face/near-eye/nose-mouth ROIs. Compare to actual V42 screenshot, not a prior branch's different face.
- **Rejection:** If new source contours still read as a smooth silhouette patch instead of optical-depth foliage, if the color medians wash out, if the full portrait or any important source ROI materially regresses, or if the native grain disappears, leave V43 `!dev` and do not promote. A larger global SSIM is only diagnostic; it does **not** prove authentic art.

**Art HOLD.** Whole-photo release target **≥0.85**, independent full-image 18 landmark and five source facial value-plane checks, real-time entire 300-frame animation inspection, physical pencil/crayon finish at 1× and independent artist signoff are all unresolved. Keep PR #461 unmerged.

## Exact-head native pixel evidence and forensic screenshot rejection

**Source:** original 608×1082 CC0 capture SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. Pixel-generation head `7b3364b1d2a2b70e71f9cae5a8bf46a466551988` uses identical authored camera, source, seed, frame 299 and portrait for both variants. [Same-head native Chromium PNGs, full 1× / canopy 2.4× artifact **14298484504**](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205791/artifacts/14298484504). Independent `skimage.metrics.structural_similarity` on actual decoded RGB, `data_range=255,channel_axis=2`, no alignment/contrast retouching:

| 608×1082 original CC0 source ROI | V42 negative control | V43 traced wax | Δ |
| --- | ---: | ---: | ---: |
| Whole 0,0,608,1082 | 0.489747 | **0.496979** | **+0.007231** |
| Upper 0,0,608,163 | 0.487647 | **0.534956** | **+0.047309** |
| Upper-left 0,0,225,160 | 0.449769 | **0.459777** | +0.010008 |
| Upper-right 385,0,608,170 | 0.494337 | **0.540193** | **+0.045857** |
| Far-upper 520,180,608,355 | 0.374066 | **0.382692** | +0.008626 |
| Far-middle 550,345,608,625 | 0.371129 | **0.398210** | +0.027081 |
| Far-lower 580,625,608,900 | 0.359641 | **0.426712** | +0.067071 |
| Near-upper-left 0,150,80,290 | 0.287692 | **0.313519** | +0.025827 |
| Full face 108,282,502,862 | **0.622878** | 0.622734 | **−0.000144** |
| Near eye 174,430,346,609 | 0.563332 | 0.563332 | 0 |
| Nose / mouth 323,500,498,770 | 0.532488 | 0.532488 | 0 |

**Critical first-run failure and its fix.** The original V43 naive `svg.screenshot` generated an **incomplete Chromium SVG tile raster**: portions of the actual face and environment became featureless paper, despite intact DOM nodes, identical facial data and green tests. This screenshot was deliberately **rejected** as false renderability proof. After limiting 19 source-blob native wax feather filters from **18 to 7 source px** and implementing a **decoded-PNG, identical original-face eye/lid/cheek pixel gate**, the persisted screenshot is independently verified: all 11,500 central source-face pixels in x220..335,y490..590 have **0 maximum RGB difference** from the exact V42 native same-head control. The Playwright test decodes the **exact PNG bytes ultimately written to the artifact** using browser image decode/canvas and retries genuinely incomplete GPU paint tiles, rather than testing an unrelated later crop. Do not remove this gate or use earlier unguarded V43 artifacts for art critique.

**Localized source-conditioned polish:** Initial traced far-upper foliage made x520..608,y180..355 too bright (native mean RGB **72,93,49**, source **45,65,26**, V42 **57,80,39**) despite positive top SSIM. The largest real CC0 polygon x412..607,y127..348 now carries **deep shadow wax** beneath the six separately source-traced high-light islands, without deleting any of its 44 authored source contour vertices or finer contact. Final native far-upper mean **55,75,37**, and far-upper SSIM rises from the rejected 0.301664 to **0.382692**, above the V42 0.374066 control. This is still visibly too bright and too symbol-like compared with out-of-focus real leaf bokeh.

**CI:** [native drawing grammar PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205799), [strict source typecheck and changed unit suites PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205832), [actual browser image proof PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44016205791), all at pixel-generation head `7b3364b`.

## Independent ArtCraft decision and next work

**NOT APPROVED / KEEP DRAFT AND !dev.** At 1×, irregular green clumps now correspond to the photographed source silhouette better than V42's evenly repeated leaf triplets, with measured whole/upper-region improvements; however they still read as discrete oversized manufactured cutouts at 2.4×, not far-depth, optically blurred hand-rendered crayon. The woman's face and hair remain stylized and much less volumetric/beautiful than the CC0 photographic reference, and the portrait remains far below required **≥0.85** whole-source SSIM. The minor full-face SSIM regression (−0.000144) is documented, not hidden.

**Next priority:** rework photographic depth and edge break-up of the 19 real-source foliage shapes (not substitute 3D leaves or flat textures), then prioritize the more serious source-registered facial anatomy, orbital form and hair volume. Add robust **frame-export capture stability** beyond this research-only screenshot gate before production; inspect 18 final native-render facial landmarks, five measured facial value planes and all 300 normal-speed frames. No merge or production promotion before an independent artist approves.
