# ArtCraft V37 — photographed ANAT1 eyebrow bone, follicle density and dry-wax roots

**Status: source-referenced !dev study; draft PR #461 ART HOLD; NOT an approved human portrait.**
**License and exact source:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), **CC0 1.0**, reviewed original-browser screenshot **608×1082**, verified SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` (the high-resolution original camera JPEG is **not** certified). No photo pixels, cutouts or image masks are shipped as runtime geometry.

## Visual deconstruction and why the old brow fails

The actual photo shows a *naturally rooted human eyebrow*, not a flat brown oval, a clean geometric arch or regularly spaced ticks: the lateral tail rises from source x201..222/y500 with almost no pigment, thickens into a deep brown/burgundy band through x240..307/y470..494, then its dense right-hand follicular fringe tapers upward to x330/y488. Hair directions evolve from rising diagonals into a near-vertical center and a splayed tail. Fine glints and a soft brow-ridge shadow persist beneath the filament roots. The eye below remains in the ANAT1 upper-orbital bone and lip-of-lid mass from V35–V36.

Independent **median 7×7 original photo RGB** against verified V36 f299 **native Chromium 608×1082**, same pixels ([V36 native source A/B](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43953207140/artifacts/14269067302)):

| Source eyebrow pixel | Original photo | V36 browser wax | Issue |
| --- | --- | --- | --- |
| (214,497), eyebrow tail | (158,116,101) | (191,162,149) | weak lateral root |
| (225,493), rising arch | (135,94,80) | (192,164,150) | root lacks tissue shadow |
| (241,486), brow lower edge | (108,70,61) | (172,141,131) | little real pigment |
| (265,474), central body | (106,64,52) | (188,159,147) | eyebrow nearly invisible |
| (280,472), upper dense ridge | (111,69,61) | (183,153,142) | curved hairs absent |
| (306,476), medial dense root | (110,72,63) | (189,157,145) | strong original form missing |

**Authentic dry-wax technique references:** [Jerome A. Barhydt, *Crayon Portraiture* (1892), Project Gutenberg](https://www.gutenberg.org/ebooks/30248) teaches direction-dependent curved marks and dark/light contrast without smearing the paper into a muddy flat surface. [The Postman's Knock, Crayola wax crayon portrait](https://thepostmansknock.com/how-to-create-a-crayola-crayon-portrait/) demonstrates layering darker forms at moderate pressure and a brighter skin tone afterward. This study retains discrete dry-wax deposits and original CRAYON1 paper tooth instead of painting a photographic raster or opaque feature sticker.

## Reuse ANAT1 and the **existing** native source-rooted brow pack

- Existing [ANAT1 face framework](../component-specs/human-anatomy.md) uses MediaPipe's 468 canonical 3D vertices and source-fitted camera. `crayonF1RegisterAnat1Face()` supplies the source-projected `brow-mid.R` tangent and yaw/pitch/roll, **not** invented ancestry- or individual identity geometry. The canonical mesh is a population reference and does not contain complete scalp, ears, or neck. Original photo point `brow_near_peak=[274,480]` remains the authority; the ANAT1 3D suggestion is clipped to **±2 source pixels** rather than warping the sitter into a generic face.
- Existing `crayonF1ReconstructBrows` already produces **8** source-rooted near/far native wax/fibre elements from the photo, with an original **20 hand-authored near-brow crayon-fibre curves** and a separate, smaller far brow. V37 **does not replace, delete, flatten or resample** the original 20. It opts into that existing pack, then updates only `source-brow-feather-near`, `source-brow-wax-near` and `source-brow-vein-near` pigment/tactile contact.
- Two additional named, material-native CRAYON1 contour components append **128 asymmetric dark rooted cubic follicles and 37 warm fine reflected/flyaway cubic hairs**. The 20 original remain, resulting in 185 named stroke instances for the near brow. Every stroke's ink pickup is oriented **tip→root** so the naturally heavier terminal deposition happens *at the underlying skin follicle*, not as a black bead at the free tip. Roots are not uniformly spaced or parallel: source-measured upper/lower edge envelopes are piecewise interpolated with deterministic subpixel staggering, depth-weighted lengths and variable lean.

## ArtCraft five-axis source→component mapping

| Axis | Authentic photographic feature | How native original-wax works |
| --- | --- | --- |
| Topological continuity | shadow follows continuous superciliary ridge and underlying socket | preserve V36 near iris/lid/orbital/cheek/nose 3D geometry; existing V9 broad *open* eyebrow halo connects to tissue; narrow saturated core follows the same original superciliary hair-root envelope |
| Vector flow | tail rises diagonally, center densely vertical/radial, medial edge splays unevenly | 128 original non-repeating tip→skin cubic dark fibres + 37 fine warm flyaways. ANAT1 controls tiny perspective offset only; actual source envelope has priority |
| Tactile edge physics | naturally feathered periphery, paper tooth, nonuniform deep roots | existing CRAYON1 `deposition:"stroke-built"`, `nibStyle:"dry"`, `waxContact:"dry-wax"`; open 5–10.2px feathered haloes, thinner opaque underlying core with physical burnish/tooth and 4.2px feather; no blurred raster or big solid brow pasted on |
| Value and color | shadow near photo (106,64,52) against surrounding skin (190–204,165–175,150–160) | dark umber/burgundy core, intermediate warm root, sparse higher-value flyaways, untouched skin/malar underpainting; original RGB numbers are targets, not copied pixels |
| Microstructure + film | hair strands differ length, root density, choppiness, curvature, tone | preserve *every* previous CC0 face/hair/eye/nose/mouth/chin node and timing. Add only 2 native contour elements, change only 3 existing eyebrow pigment materials. Existing 300-frame deterministic scene, exact paper grain, camera and seed remain unchanged |

## Independent QA before claiming any improvement

- Opt-in only: `midfaceForm:"source-anat1-brow-follicles"` runs V36 exactly, enables existing source-rooted brow once (even if its Storybook browForm control also requests source-rooted), then applies V37; prior V36/35 and rejected V33/34 remain immutable comparators. Two states inside the **existing** Adult Face Lab: original source full portrait and native 3× near-brow close-up.
- Unit tests check the licensed SHA, ANAT1 no-art-approval invariant, deterministic 128+37 uneven cubic curves, preservation of original 20 source hairs, unchanged every unrelated named native element/near iris/far eyebrow/hair, native pressure/timing, fail-closed missing/duplicate/foreign parent and rendering without `<image>`.
- Native Chromium Playwright captures source-registered real `608×1082` 1× and `3×` negative-control V36/V37 PNGs at frame 299, plus three 300-frame animation spots. Full original 300-frame natural-speed review remains **uncompleted**.
- **Visual hold:** compare original vs V37 eyebrow crop x196–338/y458–515, the near eye x174–346/y430–609, nasal root, cheeks and whole image, at **actual source-matching pixels**, not V37 vs V36 alone. 1×/3× wax fibers and 18 independent candidate-render facial landmarks and five matched source tonal planes require human review. The ArtCraft ≥0.85 whole-original SSIM threshold has not been met anywhere in this branch. An apparent darker brow can still be a cut-paper false eyebrow; in that case **reject** this new candidate and keep PR **DRAFT/UNMERGED**.

## Exact-head first 1×/3× review (revision rejected, lesson recorded)

The **first** actual Chromium V37 screenshot, head `cca415b3`, was produced by [browser CI #43960002532](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43960002532) with its [actual 1×/3× PNG evidence artifact 14274591289](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43960002532/artifacts/14274591289). All 50/50 changed test files and native wax grammar passed. Photo-original source SSIM **whole 0.365142→0.365375**, **near-brow core 0.384070→0.444503**, **brow whole 0.523709→0.547047**, and **lower edge 0.418060→0.483260**; the photographic median at (265,474) changed from V36 (188,159,147) toward source (106,64,52), becoming V37 (110,84,81). Those local pixel scores do **not** certify art quality.

**Crucial actual 3× artist rejection:** the 128 initial dark wax follicles were visibly **large, separated, horizontal rectangular pigment chips** under the eyebrow instead of thin rooted hairs. Their straight/root pickup silhouettes made the eyebrow resemble intentionally pixelated decals, worse at actual 1× full portrait despite meaningful local RGB/SSIM improvements. Therefore this first revision is **REJECTED** by the medium's tactile/shape standards. The next iteration keeps all 128+37 distinct curves and the original 20 hand-authored V9 hairs but lengthens their curved flow and reduces native pigment width from **0.39→0.22 px dark**, **0.22→0.13 px reflected**; opacity **0.83→0.53 dark** and wax pressure **0.72→0.38**, without removing the original small wax root cores. This correctly places strong color in the broad source-rooted underpaint, leaving fine hairs to supply direction and irregular individual texture rather than spiky digital blocks. 

This revision is **not yet approved**; independently compare its exact-head 1× and 3× screenshots, full-brow/coronal eye/malar photo crops and natural 300-frame moving evidence before any promotion. Preserve V36 as negative control and keep draft PR #461 open.


## V37 revised exact-head native 1×/3× audit

**Verified head c039eb29**, exact original CC0 source screenshot SHA256 \`f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2\`.
[Chromium native 1×/3× artifact #14274427728](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43961677823/artifacts/14274427728) and [native CRAYON1 grammar PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43961677786).
Each value is actual full-resolution RGB \`skimage.metrics.structural_similarity(..., channel_axis=2,data_range=255)\` against the **original photograph**, never against another rendering.

| Exact original-source region | V36 | Revised V37 | Difference |
|---|---:|---:|---:|
| Whole 608×1082 | 0.365142 | **0.365753** | +0.000611 |
| Near brow x185–345,y444–515 | 0.523709 | **0.571503** | +0.047794 |
| Dense brow core x220–320,y462–499 | 0.384070 | **0.508600** | +0.124530 |
| Brow upper crest x238–311,y463–490 | 0.346252 | **0.459777** | +0.113525 |
| Lower brow edge x215–326,y479–512 | 0.418060 | **0.507087** | +0.089027 |
| Near eye x174–346,y430–609 | 0.549397 | **0.563332** | +0.013935 |
| Near eyelid x208–327,y503–596 | **0.435410** | 0.424891 | **−0.010519** |
| Nasal root x322–405,y482–575 | **0.633889** | 0.633282 | −0.000606 |

Source 7×7 median at (265,474) is (106,64,52), V36 (188,159,147), and revised V37 (146,117,110): it is still roughly 40–58 RGB units too bright, but its brow **geometry/source shape** scores improve. At actual **3×** the revised 0.22px/0.13px follicles no longer read as giant isolated square wax chips, unlike **initial V37 (head cca415b3)**. However they remain too sparse, separated, short/tick-like; the original photographed brow has higher density and finer curved root flow. The broad root volume is still not organically modeled. The photo is not reproduced faithfully. **Neither version is artist-approved.** V36 near-lid SSIM still regresses and is not hidden.

**Engineering regression note:** Head c039 exact-code [changed unit run #43961677816](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43961677816) was re-run twice; both runs passed **49/50 test files and 410/411 tests**, with only an unrelated UKIYO1 **210 full frame + 7,200 wave sample** test at a hard 20-second timeout under shared runner contention. No UKIYO runtime code changed. Keep all frames/assertions/samples; increase only this test's timeout to 60 seconds and rerun exact-head verification. Do not skip, suppress or delete the test.

**ART HOLD:** The full original-source image SSIM remains ~0.366, far below ArtCraft ≥0.85. Further work still requires an artistically credible photo-shaped eyebrow, natural hair volume, connected eye/root geometry, 18 independent rendered landmark comparisons, five source tonal planes, and real-time review of the entire 300-frame film. Preserve PR #461 as DRAFT and unmerged.
