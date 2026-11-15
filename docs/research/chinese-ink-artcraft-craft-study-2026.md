# Shanshui — ArtCraft reference-to-code craftsmanship study
Date: 2026-11-14
Status: **style-guided reference study, implementation in PR #194, visual release review pending**

## Method and sources

Follow the user's ArtCraft material/reference/structural-review guidelines:
study real art at motif scale, map structure before adding texture, build
source-inspired original code geometry, render native 960×540 and enlarged
crops, inspect temporal continuity, and reject primitive approximations.
This task uses **original new compositions**, so reference and output
are not pixel-aligned. It would be misleading to report whole-frame
SSIM, color histograms, structural equality, or a similarity score. No
source image is bundled or painted as a raster background in the engine.

Reference sources, chosen for distinguishable craft rather than copying
one exact painting:

1. [Wen Zhengming, *Old Pine Tree*, Cleveland Museum of Art](https://www.clevelandart.org/art/1964.43).
   Inspect the branch forks, dramatic unsupported-looking but contiguous
   limbs, needle rosettes and alternate dense/empty negative space.
2. [Xia Gui, *Pure and Remote View of Streams and Mountains*, historical
   detail](https://www.jiguzuo.com/guohua/xia-gui-xi-shan-qing-yuan-tu-juan.html).
   Study asymmetrical old-pine branches against broad rocky forms, not
   uniformly horizontal shrub shelves.
3. [Huang Gongwang, *Dwelling in the Fuchun Mountains* brushstroke
   close-up, Smarthistory](https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/).
   Contrast filament-like hemp fibre, grouped moss/alum-head marks, ink
   washes, and untouched paper.
4. [Dong Bangda, *Stone Houses and Wind in the Pines*,
   National Palace Museum collection](https://digitalarchive.npm.gov.tw/Collection/Detail/6292?dep=P).
   Study coherent brush flow around convex mountain ridges and tiny,
   scale-sensitive tree groups.
5. [Asian Art Museum, development of Chinese landscape
   brush techniques](https://education.asianart.org/resources/the-development-of-landscape-painting-in-china-through-the-tang-dynasty-618-906/):
   fine silk-thread, iron-wire line, hemp-fibre and axe-cut are distinct
   gestures, not interchangeable uniform line decals.
6. [CUHK Art Museum: 16 texture-stroke techniques
   demonstrated](https://www.youtube.com/watch?v=DHwFv5QcOSM).
   Use the technical demonstrations to distinguish short and long hemp
   strokes, axe cuts, grouped raindots, bent ribbon and other brush families.

## Observed gaps in Kumiki's previous native film render

Before this iteration, the landscape contact sheet showed:

- Pine foliage merged into long, flat, evenly weighted horizontal shelves;
  many shallow branch roots were offset from the trunk instead of appearing
  as one branching tree.
- Distant rock faces resembled long, parallel rainfall grooves with similar
  stroke directions. Color variation alone did not give topographic relief.
- Moss dots were dispersed across the ridges rather than organized into
  meaningful areas of darker vegetation.
- The figure and foreground still carry the majority of visual contrast
  while distant depth and rock strokes remain over-regular.

## Structural translation into original code

| ArtCraft axis | Reference observation | Implementation | Evidence gate |
| --- | --- | --- | --- |
| 1. Topological continuity | Old pine: trunk to bough to twig to needle cluster | One curved trunk-map function drives bark and branch roots; sampled cubic bough points attach three branchlets per spray | Render markers `data-km-pine-bough-root`, `data-km-pine-twig-root`, unique seeded sprays; check for floating strokes at 3× |
| 2. Directional curve flow | Needle bundles fan, droop and taper; some rock fibres wander while others strike at an oblique angle | Curved boughs and varied needle directions; sinuous long hemp, interrupted short hemp and polygonal side axe cuts | Inspect actual geometry and rock strokes at film resolution |
| 3. Pressure / load | Different brush strokes vary base load and tip release | Each pine needle is a closed tapered blade, not a fixed-width line; diluted gray/brown and deep black needles interleave; dry scrape marks lift rock pigment | Examine same-crop stroke ends; reject comb-shaped line bundles |
| 4. Optical spacing | Paper reserve isolates silhouette and makes darker detail legible | Rock and moss depositions now occupy independently seeded pockets, leaving gaps; pine rosettes separated into overlapping but identifiable clusters | 100-px geographic bin check is a weak diagnostic, not an artistic score; visual negative-space audit required |
| 5. Microtexture | Wet wash mass, thinner dry flicks, variable bark fissures | Original branch-rooted bark streaks, pressure tapered needles, light-brush lifts on rock grooves; existing paper-grain filter retained | Verify character/pine/rock crop by crop and in encoded motion; avoid faux detail made of random noise |

**No numeric ArtCraft source-relative scores are claimed.** The code's
tests validate only explicit topology, range, seeded determinism and
presence of motif families. The geometry cannot prove it is equivalent
to the reference painting, and the supplied skill specifically warns
against equating successful tests with artistic fidelity.

## Storybook visual review standard

The existing `Video production / Film Looks / Chinese Ink / Shanshui /
Film Gallery` includes **Brushwork close-ups · ArtCraft inspection**
(without adding a new Storybook folder). It samples the actual renderer
for old pine, rock face, willow and bamboo at 2.15× under shared seed,
detail, ink, mist, wind and frame controls.

Review four material crops and a whole-film frame at 125 and 210.
Use the same scene, seed, crop, output size and film frame to judge a
subsequent code revision. Specifically inspect:

- Pine: every branch joins trunk; each rosette originates on a twig;
  no horizontal shelf silhouettes or disconnected needles; several
  widths, tones, and negatively spaced needles.
- Rock: long vs broken hemp fibre, short axe cuts and dry light gaps
  follow actual fractured ridge shape; moss grows in coherent pockets.
- Willow: weighted branches, downward frond direction and attached leaves.
- Bamboo: taper, node, branching leaf stems and directional pressure.
- Figures: opaque cloth, readable eyes/hand interaction and planted feet
  still need independent art review; the pine/rock pass does not fix them.

Next steps after technical checks: inspect the newly generated browser
screenshots and 96-frame film, reject weak motifs, iterate at least
another pass on the most obvious problem, then update this record with
specific observed differences rather than invented fidelity scores.

## Rights

Museum and research images are **visual technique references only**. No
source pixel data, hosted image URL, direct traced contours, or third
party artwork are shipped in the film renderer or registry.


## Render-led iteration — old-pine compression and willow branch taper

The original 2.15× Storybook browser proof (CI `43658375042`) showed an
unambiguous issue even though the branch-connectivity tests passed:

- The new pine was still a row of oversized starburst needles on broad,
  nearly horizontal, uniformly weighted limbs. The silhouette looked
  diagrammatic rather than painterly, and the branch-to-twig ratios were
  too thick.
- The willow's main branches were heavy parallel stripes across the crop,
  obscuring the subtler hanging fronds. The comparison crop for geological
  texture was mistakenly centered on a mostly unpainted patch.

### Further inspected references

- [Wen Zhengming, *Old Pine Tree*, Cleveland Museum of Art](https://www.clevelandart.org/art/1964.43):
  its high-resolution close-up separates a gnarled, soft-edged bark mass from
  many **thin, crowded needle tufts**; dark and dilute ink overlap without
  making the primary limbs evenly thick black sticks.
- [Zhao Yuan, *Listening to the Rustling of Pines*, National Palace Museum](https://digitalarchive.npm.gov.tw/Collection/Detail/5786?dep=P):
  radial needle masses surround complex joints, with deep and light ink
  edges rather than broad empty angular bough rows.
- [Mei Qing, *Landscapes after Ancient Masters*, Metropolitan Museum](https://www.metmuseum.org/art/collection/search/61825):
  hanging willow arcs release to fine ends and the supple drooping groups
  have more visual importance than the dark supporting branches.
- [Attributed to Muqi, *Willow and Magpie*, Cleveland Museum](https://www.clevelandart.org/art/1982.53):
  uses wet/dry ink handling to evoke willow and mist; strong trunk and
  branch lines do not need uniformly heavy horizontal outlines.

### Original code refinements

1. Every pine bough is now a closed, individually tapered deposited-ink
   silhouette: broad at its trunk joint, reducing continuously to near-zero
   at its tip. Short highlight edges follow the SAME cubic centerline.
2. Three needle groups per attached twig now use shorter, finer, denser
   pressure-tapered needle shapes (17–26 per rosette). Each has dilute
   underwash and selectively lifted dry strokes; the underwash must never
   replace the individual pointed leaves.
3. Willow arch branches are pressure-filled ink ribbons with explicit
   asymmetric normal offsets and a loaded-to-hairline release. Every
   original branch curve still parents the hanging fronds; leaves become
   small pointed brush shapes, not uniform triangles.
4. Geological close-up target now centers on the actual mountain face,
   not a blank area. Existing depth/wind/ink sliders still affect the
   same deterministic original film renderer.

As required by ArtCraft, these are **new hypotheses pending direct visual
comparison**, not an assertion of equivalent workmanship. The next
browser contact sheet must show meaningful improvements in the branch
silhouette and negative space at both 960×540 and enlarged crops.


## ArtCraft node-rooted bamboo pass — National Palace Museum 墨竹譜

**Source inspected:** [墨竹譜, National Palace Museum](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04009183).
This historical brush-ink bamboo sheet uses narrow, living culm lines with
strongly directional sword-like leaves, compressed fan clusters and irregular
paper reserves. A loose fan reads as one gesture despite a mixture of sharp
dark loaded blades and lighter, airy flicks. Reference is used for technique,
not traced or embedded.

**Prior code defect:** seven evenly repeated branch tiers and five strongly
alternating, similar triangular leaves gave the small foreground bamboo the
appearance of ornamental clip art. Branch nodes were spaced independently
from the inked collars, even though those features represent the same physical
joints. Changing random microtexture alone would not correct that structure.

**Implemented in PR #194:**

1. The quadratic bamboo culm is now sampled **once** into seven joints per
   stalk. Rings and branch roots share exactly those same point coordinates;
   topological continuity is asserted in deterministic renderer tests.
2. The rooted branch is rendered as an original narrowing filled ink ribbon.
   Branch handedness, rise, reach and leaf lengths are seeded but deliberately
   irregular; each blade starts on the actual painted branch curve.
3. Each leaf has unequal closed cubic edges that describe a loaded base and
   tapered pointed release. Selected leaves reveal restrained internal
   paper-tone dry lifts at high detail, without a uniform vein on every blade.
4. The existing **Brushwork close-ups · ArtCraft inspection** Storybook leaf
   stays inside the **single flat Chinese Ink folder**. Its existing detail,
   ink, wind, frame and seed controls expose the updated living bamboo.

**Structural checks** validate 21 matching joint/branch roots, distinct
original blade curves, deterministic complexity and absence of non-finite SVG
numbers in all three scenes. These are technical gates, not evidence of
museum-level art parity. Before artistic acceptance, inspect the native
misty-hermit bamboo at 960×540 and the Storybook 2.15× crop, comparing leaf
fan negative space and brush loading to the museum image. Also inspect the
exported motion after the CI run; this pass intentionally does not mark the PR
ready to merge without rendered proof.
