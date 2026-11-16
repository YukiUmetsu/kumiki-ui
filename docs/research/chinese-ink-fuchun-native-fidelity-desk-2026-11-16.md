# Chinese ink · Fuchun native source-fidelity desk

**Release status: ART HOLD.** This is a review instrument, not evidence that the current painting visually matches Huang Gongwang or that PR #466 is merge-ready.

## Authenticated reference and visual deconstruction

- **Original:** Huang Gongwang (黃公望), *Dwelling in the Fuchun Mountains* (富春山居圖), ca. 1350, ink on paper; National Palace Museum's [original collection essay](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975) and [collection record](https://digitalarchive.npm.gov.tw/Collection/Detail?dep=P&id=1194).
- **Original technique detail:** [Smarthistory's museum-detail study](https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/), particularly [its unannotated mountain/woodland crop](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg) and [annotated hemp/alum-head detail](https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg). These images are external research references; **no museum pixels, cropped images, or traced shapes** enter the repository or film output.

### Five ArtCraft axes, with observable failure cases

| Axis | Original-medium observation | Native reproduction criterion | Reject when |
| --- | --- | --- | --- |
| Topology | Multiple rounded positive rock backs interlock; small shelves emerge as parts of the larger rock mass, not independent slabs. | All current 6 hillbacks, 3 stone cheeks and 12 cross-shelves must remain rooted and visibly connected at 960×540. | The dominant mountain reads as a smooth beige triangle or an array of floating caplets. |
| Vector flow | Hemp-fibre strokes follow turning hill shoulders and vary direction with rock geography. | The existing 78 original short/medium/long fibres follow their parent source curves without detached overlays. | Stroke groups look like uniformly repeated hooks, straight rain or sharp hairpin lightning. |
| Edge behaviour | Contours mix pressure-loaded edges, feathered dry-brush lifts and selectively interrupted paper channels. | In actual 3.35× SVG crop, tapered pressure and true negative-space slits visibly interrupt ink while leaving the existing source paths intact. | Continuous vector-width ribbons or paper-colored patches stand in for depletion. |
| Ink depth and rhythm | Loaded dark nuclei and dilute washes gather in local clusters; paper remains exposed between gestures. | At 1×, near rock masses remain legible without a solid flat wash, and the receding band remains lighter. | Evenly spaced cables, monotone dark fields, or a mostly untouched pale wedge. |
| Pine anatomy and motion | Distinct old-pine trunk and crown masses integrate with the ground and branches; fine needles do not erase branch architecture. | Preserve the original 20 living boughs, 40 canopy fans, 60 pads and 310 needle marks, with visible planted roots and directional negative spaces. | Trunks float above stone or crowns become regular stacked/isolated stamps. |

These are **qualitative source observations and technical acceptance questions**, not measurements of the museum's original pigment or proven image fidelity.

## Storybook: actual production stages, not thumbnails

Navigate to **Video production → Film Looks → Chinese Ink → Shanshui Film Gallery → Fuchun · 2-seed native source-fidelity review (ART HOLD)**.

1. Inspect both default independent seeds **71 and 87** at absolute frame **145**, in **Full scene · actual 960×540**. The Storybook layout stacks full native stages so the scene is not unintentionally downscaled into a 510px card. Reject bad mass silhouette *before* zooming in.
2. Repeat **84 → 145 → 215** with the preset buttons. The absolute frame drives the same original `InkShanshuiStage` and code-authored environment. There is no alternate frame clock.
3. With both seeds still visible, select **Positive rock anatomy** (same original masses, pressure fields and hero/trees visually isolated by scoped CSS); then **Original 78 hemp strokes**; then **Rooted old-pine anatomy**. Every source path remains in the DOM and film renderer.
4. Use **Rock shoulders · 2.4×**, **Dry-brush edge · 3.35×** and **Pine root/crown · 2.8×**. These are browser cameras over the *same native SVG*, not resampled museum imagery.
5. Return to **All original paint** and **Full scene** for the final visual decision. Use **Reset native source-fidelity review** for deterministic comparison.

The two studies remain independently seeded, with all other controls synchronized (same `frame`, `detail`, `mist`, `ink`). The browser test checks real SVG scene identities, 78 child strokes per seed, 15 structural strata per seed, six hillbacks per seed, independent crest geometry, native 960×540 size, camera transforms, layer-visibility isolation, timeline seeking and exact reset. Screenshots from the test are inspection evidence only. Green CI is **necessary, not sufficient** for visual signoff.

## Remaining source-appearance defects and release gate

The current PR records repeated native visual rejections: a pale geometric mountain face, mechanically arranged dark fibre hooks, and disconnected-looking old-pine mass. This new desk does **not** correct those shapes. Next production work must change their original *positive geometry* and lived-in pressure rhythm without discarding the micro-element inventory or changing the other three historical brush schools.

Before converting draft PR #466 to ready for review or merging: independently inspect the exact-head screenshots at **native 1×**, the three crop cameras, **both seeds** and **all three frames**; inspect the full 96-frame (or production-length) exported film and the other schools; fix visible defects; run the changed test suite, typecheck, complete Chromium Storybook test and film export; and record explicit human art review. Without that evidence, maintain **ART HOLD**.


## Alum-head positive rock experiment — 16 November (unapproved)

**Visual trigger:** We inspected the *actual native four-master browser artifact* from [run 43959354099](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43959354099/artifacts/14273373295). The Fuchun 420×308 stone-only crop and the full master card show a pale broad wedge with sparse dark hook fields, repeating arcs and insufficient fine surface rock volume, despite positive hillside and connected strokes. This is a **rejected art result**, not a claim that the recent green unit tests are visually sufficient.

**Primary references:**

- [National Palace Museum primary record](https://digitalarchive.npm.gov.tw/Collection/Detail/1194?dep=P): paint was initially described in light ink and then worked with darker/drier strokes and dots. A painted hill is not a single opaque mass with decorative marks added after.
- [Smarthistory original close-up](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg) and [articulated brush anatomy](https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg): small alum-head outcrops interrupt larger curved hemp-fibre courses, creating irregular interlocking stone grammar. Long fibres, surface shoulders and tiny loaded deposits have distinct scales.

**Code-localized experiment:** Added **nine individual positive, 6-cubic native alum-head outlines** (three per already existing stone cheek) attached to stations of the original 15 live cubic stone supports. Each has its own six-turn crown/undercut anatomy, independent 4-stop ink wash, a source-aligned loaded brush rim and **three small brush deposits attached to exact cubic source points**, for 27 micro-gestures. Both the boulder bodies and micro ink live under the original per-cheek positive clip. The feature is **Fuchun-only**, deterministic per seed, and leaves all 6 older hillbacks, 9 turning bands, 12 transverse courses, 78 original hemp, pine 20/40/60/310 anatomy, source-path stationing, original film timing and the other three masters untouched.

**New Storybook A/B:** In **Four masters · brushwork source comparisons**, use **Before attached alum-head crowns** against **All Fuchun hemp** with identical frame, seed, composition and camera. This hides only the new real SVG group via CSS, preserving the underlying paths and their semantic attributes. Chromium and Vitest now assert both the exact counts and the unchanged original hillback/stroke inventory, the actual 960×540 renderer, stable roots, A/B visibility, path identity after reset and real before/after screenshots.

**Not yet accepted:** Nine new cap shapes may still resemble scattered independently rounded overlays if their optical mass does not visually join the main mountain in a true native frame. Merely adding local texture cannot correct the larger ridge's width and overlapping rock planes. A real **1× and 2.4×/3.35×** rendered comparison is required, with seed 71 and 87 at 84/145/215. Reject if the silhouette is still triangular, the new brush caps stamp regularly, the pine crowns remain disconnected, or any original school is changed. The branch remains **draft / ART HOLD**.

**Implementation clarification:** The production landscape stage intentionally carries one inline SVG \`foreignObject\` as its *HTML character compositing slot*. The stage does not contain a bitmap mountain \`<image>\`. A previous new test incorrectly rejected **all** \`foreignObject\` nodes; the test now checks for exactly one 960×540 production slot and zero raster image nodes. Its absence would instead break the reusable actor layer.


## Lower mountain broad-shoulder topology study (unapproved, opt-in)

**Native evidence:** On the exact browser render from the [successful Chinese Ink suite, run 43964568179](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43964568179/artifacts/14276232076), the still-candidate art has two conspicuous geometric defects that survive adding the nine alum heads: (1) an almost blank, pale middle foreground with a **single triangular x530/y235 near-ridge apex** and two straight-looking diagonal slopes, (2) very large beige areas between thin dark strokes. This is visible at both seed 71 and 87 at real 960×540 and does **not** resemble the irregular, layered, rounded stone in [Huang Gongwang's original](https://digitalarchive.npm.gov.tw/Collection/Detail?dep=P&id=1194).

**Macro before micro:** More dabs will not repair the wedge's silhouette. The optional \`fuchunNearShoulderStudy\` flag now swaps the *actual third mountain band's source control nodes* for a 19-point, independently authored broadened rock back at x427–586, with additional small concavities and an asymmetric outer saddle. The existing source ridge had 11 author nodes and 91 sampled points; the candidate has **19 author nodes, 163 sampled points and 164 explicit line segments** (including closure). It does **not** polygon-cover the old mountain: the original ridge geometry itself changes. The same dense ridge interpolation, pressure-deposited ink, rock shoulder roots, cunfa and moss child sources sample this new positive profile. The other two bands and original Fuchun hero mountain remain the same.

**Preservation:** This is a reversible, **default-OFF** experimental construction; neither production exports nor the three other historical schools nor the two other scenes change by default. The original 78 live middle-mountain hemp, nine new alum heads, six positive hillbacks, 12 shelves, five pines, 20 living branches, 40 ink canopies and all existing dry-texture material remain.

**Storybook visual A/B:**
1. In **Fuchun · 2-seed native source-fidelity review (ART HOLD)** switch **Near mountain · original vs rounded anatomy (EXPERIMENT)**. The two real \`InkShanshuiStage\` canvases then render **the same seed 71 and frame 145**, left original unchanged, right candidate.
2. Inspect native **960×540** first; switch **Lower stone shoulder · 2.3×** to inspect each real camera crop. Then seek frames 84 and 215, change the seed, check contours without passing one frame's still off as a finished film.
3. Use **Independent seed comparison** or **Reset native source-fidelity review** to restore ordinary baseline samples 71/87; film remains untouched throughout.
4. Tests assert exact source path and seed isolation, richer station counts, root re-anchoring, 1× and 2.3× native screenshots, frame-seek identity, reset and intact 78 hemp / nine alum-head counts.

**Five-axis review:** macro hilltop breadth, skyline-to-cheek attachment, irregular up/down vector flow, graded ink and untouched paper windows, and dry-brush edge morphology all still require actual human-side visual comparison to the source. The near contour alone is **not a production approval**, nor does it repair the pale negative-space problem until the positive face wash and supporting stone geometry are independently reviewed. Keep PR #466 DRAFT.


## Native lower-bank pigment relief follow-up — 16 November, ART HOLD

**Visual audit of real browser evidence** from the successful [head run 43971709719](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43971709719/artifacts/14279152346): side-by-side native original/experimental seed 71, frame 145 and 2.3× crops. The optional 19-station near-rock reconstruction is directionally better than the *single triangular apex*: its 488–586 px crown becomes a wider irregular shoulder. However, **both** still have a nearly uniform pale ochre face with a handful of dark hanging hooks instead of credible stone volume. The new candidate also exposes repeated micro-jagged outline marks at high magnification. **Artist approval remains explicitly denied.**

**Source benchmark:** [National Palace Museum original Fuchun Mountains](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975) and the [Smarthistory source crop](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg) show turned stone cheeks carrying different wet/dry values, attached fine pima fibres and breaks between strokes. The distinction is **positive 3D folded bank anatomy**, not a larger count of thin algorithmic hooks. The repository's original historical-study document remains the authoritative ArtCraft source and no museum pixels are embedded or copied.

**Next construction implemented as opt-in experiment:** The same \`fuchunNearShoulderStudy\` flag now adds \`FuchunNearBankRelief\`: **four** real positive, curved 4-edge mountain courses from pairs of exact underlying 19-station ridge samples, with individual four-stop transparent ink gradients, two interrupted loaded edge phrases per course (**eight rim phrases**), **28** locally tangent-aware pressure-loaded fibre strokes and **12** connected small deposits. Each fold's child ink is clipped to that fold, then all folds are clipped to the same source near-mountain silhouette. Stroke roots and curved axes remain available as semantic SVG attributes for independent inspection. Seed, detail and mist affect marks and wash; they are deterministic at every film frame. This is **not** a paper-colored mask or an opaque screen-space relief pasted above the slope, and the original ridge/cunfa/rock planes remain intact. Production default remains **off**; all other schools and scenes remain unchanged.

**Test/Storybook gate:** The existing two-renderer source-fidelity desk has a same-seed A/B with full-size 960×540 and 2.3× near shoulder. Unit/Chromium tests require four parent positive volumes, eight interrupted rim phrases, 28 source-rooted dry strokes, 12 smaller deposits, changed seeded contours, untouched legacy SVG and standard original stroke inventory. The actual new screenshot in CI must be visually inspected again: reject any stamped rows, short wire legs, high-contrast computer outline, detached folds, lost pine details, or no meaningful improvement to the original's tonal depth. Do **not** merge #466 for CI green without this artistic proof.

**Remaining priority:** the film still needs organic pine crown values, less regular outer skyline fracture, more integrated washes, and purposeful large/small spatial rhythm. Additional fine texture alone is insufficient.


## Successful exact-head full-film visual QA — and independent rejection

At **commit \`865c22fe\`**, [full Chinese Ink film QA run 43977539180](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43977539180) and [changed-contracts run 43977539026](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43977539026) were both **green**. The 960×540 and 2.3× native PNGs were downloaded from [run 43977539180 browser artifacts](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43977539180/artifacts/14282061481) and inspected as *real production Storybook SVG*. The candidate's four source-rooted relief washes soften the formerly bare tan cliff and create spatial variation across the top third. **Still not artist-accepted:** the image now reveals a regular sawtooth pattern in the 2.3× skyline, pale empty lower face and a few near-vertical dangling marks that fail Huang Gongwang's nested stone/tonal density standard.

**Follow-up refinement:** The opt-in 19-point source ridge now uses *spatially coherent* seeded capillary edge disturbances instead of nine independently noisy offsets per author segment. It retains every author station, all nine sub-stations per span, detailed dry fracturing, original coarse Catmull–Rom hills and the exact same source for all dependent rock, foliage and brush positions. The new disturbance is multiplied by a \`sin²(πt)\` envelope so each segment approaches both original source nodes with a continuous tangent; two harmonics plus smaller seeded per-station dry vibration avoid uniform vector smoothness. This applies **only** to \`fuchunNearShoulderStudy=true\` in the \`mountain-trail\` near band. The original film, other masters, and far/middle bands remain unchanged.

**Quality gate remains ART HOLD:** verify the new 2.3× contour in a post-change native screenshot before considering any promotion, and continue sculpting the lower bank's positive form rather than merely increasing decorative hanging strokes.


## Fuchun pine crown fibre fringe · source-rooted brush microtopology

**Reference:** Huang Gongwang's *Dwelling in the Fuchun Mountains*, particularly the National Palace Museum [tree-and-fisherman shoreline detail](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-3.jpeg), and the [museum's technical record](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975). The original handscroll juxtaposes flat but serrated dark pine crowns, open paper, twisted trunk branches and tiny unequal brush deposits. No image is traced, embedded or sampled.

### Deconstruction and integration
- **Continuity:** Every fine plume must emerge from an *existing source-authored upper fan lobe*. A drawn path begins exactly at that lobe's world-space coordinate; no detached procedural dots or generic leaf sprite.
- **Flow:** Six distinct fine-nib inclinations mix near-horizontal, oblique-upward and occasional falling strokes; seeded parent variation avoids a ruler-straight comb.
- **Edge:** Slightly unequal 0.21–0.62 pressure loads are painted as the project's existing 14-knot, two-edge ink-loaded ribbon, with wet, middle and dry pigment classes. The existing 6–8-lobe positive canopy, two white reserves and connected branch-bridge **remain untouched**.
- **Layering:** Retain all 40 fan islands, 20 connected bridges, 60 loaded pads, 119 wet deposits and 310 original branch needles; add exactly one finer hairline per fan lobe, drawn above the dark edge. Only the Fuchun grove receives this technique. Other masters do not change.
- **Study controls:** In the established Four Masters source-ink Storybook, *Pine crowns · source anatomy* shows the new fibres, *Pine dual-load crown silhouettes* hides superficial bristles so the original two-load connected positive masses remain independently inspectable, and reset restores full pigment detail.
- **Registry packaging:** The standalone `ink-shanshui-landscape` pack now includes `ink-shanshui-pine-fringe.ts` alongside the renderer and core, preserving installable relative imports.
- **Tests:** Pure deterministic seed and source-tip validation, SVG attachment and original inventories, negative controls for other schools / low-detail, Chromium mode visibility and captured native source zoom.

**Art sign-off pending:** Inspect generated 960×540 + 2.8× crop. The new fine fringes must soften previous dark clumps without becoming sunburst spikes, hatching rollers, or a repeated cloud decoration. Visual success cannot be inferred from path counts.


## Native near-bank three-register pima flow — further ArtCraft review, 16 November

**New historical cross-check:** The [National Palace Museum Master Wuyong original](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000975), [Smarthistory's labeled brushstroke study](https://smarthistory.org/wp-content/uploads/2023/10/National_Palace_brushstroke_labeled-copy.jpg), and [unaltered high-resolution painting detail](https://smarthistory.org/wp-content/uploads/2023/06/National-Palace_lrg-det-6.jpeg) show **long hemp-fibre brushwork descending from upper rock to lower face** with irregular wet/dry lift, alongside *shorter alum-head textural touches*. A pure horizontal scratch on the skyline would be as inauthentic as the prior 67px computer-drip. The medium needs local bank topology plus gravitational pima flow, not simply smaller primitives.

**Defect isolated:** The broad 19-node near candidate originally left the **17 existing source-grounded \`RockInkPlanes\` marks** as identical-looking elongated gray droplets beginning from its now nearly flat crown. Adding four positive bank layers did not fix their independent visual grammar; the hanging groups visually disconnected from their supporting bank.

**Correction implemented in the opt-in path only:**
- Existing **17** rocky plane marks, their 17 double-phrase dry witness lines, source-rooted rock shelves and existing micro-moss are retained intact as independent editable SVG primitives; no path group is removed.
- Each mark roots at the sampled positive ridge crest, then follows a **cubic centerline with three independently sampled stations** and a pressure-loaded source-aware ink ribbon. Individual runs inherit the local ridge rise/fall; the duplicate-prone long line is split into genuine paper-lift phrases.
- A deliberate mixed meter of **6 descending long hemp**, **2 short alum-head crown touches**, and **9 rolling cheek creases** maintains long/medium/short optical hierarchy, without ten same-length horizontal stripes or vertical rain wires. Root loading, broken mid-pressure, and feathered lifts are separate geometry roles. Each source is inspectable through \`data-km-rock-plane-bank-register\`, \`-bank-axis\`, \`-bank-end\`, and original \`-root\` attributes.
- Source-strata and pima remain deterministic across frame seeking and seeded variation. Ordinary production at \`fuchunNearShoulderStudy=false\`, both other scene compositions and the other three rock schools keep their original original paint and original stroke shape.

**Test gate:** Unit and native Chromium checks assert all 17 bank-following marks, original 19 other far/middle contacts, source endpoints, exact per-register budgets and non-deletion of the 78 hero hemp strokes / six hillback / nine alum heads. The output is **still experimentally held** pending independent 960×540 and 2.3× image review after a full exact-head green film QA. Do not turn it on by default on the basis of counts alone.

**Remaining optical criticism:** Current frame evidence still has overly uniform beige area under the lower bank; the rocky left grove and central pine have mechanically thin needle arcs; color separations are warmer and more linear than the original ink's muted gray-black pressure accents. Progress on source-connected topology is not art approval.
