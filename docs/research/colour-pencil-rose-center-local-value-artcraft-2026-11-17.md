# FLORA1 × CP-F1 | Rose central petal local diffuse-value study

**Date:** 2026-11-17  
**Release:** ART HOLD — optional `roseCenterValueStudy=false`; never presented as a finished, photographically verified botanical rose.  
**Parent work:** #595 source-shaded front faces, #601 true upper cuticle surfaces, #602 rear cup, #604 rounded frontal lamina, #605 compact six-surface center with real underturn.

## Authentic observations / provenance

| Original technique and physical source | Morphology / optical lesson | Implementation |
| --- | --- | --- |
| [CPSA ArtTopics: Anne Maklowski, gold-leaf and coloured-pencil rose](https://cpsa.org/wp-content/uploads/ARTopics01_Maklowski_GoldLeaf.pdf) | Maintain sharp physical boundaries **between** petals; soften value changes **across a single surface**. The inner rose's hue moves through warm dark red, rose midtone and light without spraying a uniform blur. | Distinguish material-level CP-F1 pigment and existing sharp physical lamina edges from **twelve smaller, source-local** dry-pencil value fields that never leave the parent petal. |
| [Karen Elaine Evans, artist-original *Pink Rose*](https://www.artfinder.com/product/pink-rose-6a554/) | A dark centre fold has variable chromatic violet/burgundy contact, a warmer red convex belly and short diffuse reflected rose-pink. Individual source edges are not the only things expressing volume. | Two independently authored curved value axes for each of the six central source petals: one dark root/contact, one diffuse local reflected return; 3 pigments per axis, separately timed. |
| [Susan Rubin, artist-original *Climbing Rose*](https://www.susanrubinstudio.com/living-color-2021.html) | Midtone and tiny fibre direction follow the petal's bent lamina, changing around folds and local convexity. Long dark continuous circular outlines alone make an artificial central cup. | Deliberately irregular, short tangent-following pencil scumbles (1.1–3.45 source units), local tangent variation up to ±0.43 rad, fine grain and broken nonrepeating contact lengths, without extra thick outline paths. |
| [Review: optical principles of flower coloration](https://pmc.ncbi.nlm.nih.gov/articles/PMC4874715/) and [Rosa chinensis petal epidermis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6747050/) | Petal reflected light includes surface and diffuse internal scattering; differing adaxial/abaxial epidermises affect reflectance. Neither source authorizes numeric reflectivity for this unmeasured rose cultivar. | Capture an **artistic** cooler shadow ↔ warmer reflected brightness over curved local pigments. No claims of measured skin-cell PBR, transmitted subsurface light, spectral color or biological morphology from a specific specimen. |

**Rights:** External artist images and photographs are observed at their original URLs. No third-party pixels, textured image assets, sampled values, copied vector paths, shapes, downloaded files or trained/imitation artwork added to the repo. This is an independent stylized source-space study; the reference is technique, not a proven same-cultivar reproduction.

## Deconstruction / shape continuity

[PR #605's original native 45-organ storyboard](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44138379384/artifacts/14352734016) exhibits six independent physically shaped centre petals yet overemphasizes outlines and narrow high-contrast arcs. **Making more strongly outlined curls would make it worse.** The intended next level is mid-frequency form shading **inside** existing shapes while retaining their layered pen and coloured-pencil microfeatures.

Each source path has exact preexisting support, contour, bounded layers, source reference metadata, and real abaxial underturn. We only add `interiorDetails` to the keyed regions; unlike an additive opaque shading polygon, `interiorDetails` paints fine strokes **under the existing graphite edge and old details, inside the owning source clip and normal paper-tooth pigment mask**.

The 12 source-authored value fields:

| Petal ID | Occlusion shadow source axis | Diffuse warm return source axis |
| --- | --- | --- |
| `inner-fold` | Broad asymmetrical curved collar from (214,158) to (293,160), width 6.4 | Offset lobed return (223,166)→(287,167), width 6 |
| `rose-whorl-recess` | Lower dark pocket (225,158)→(285,155), width 5 | Concave return (229,163)→(279,163), width 5.8 |
| `rose-whorl-left` | An oblique, descending left root (226,150)→(240,179), width 3.9 | Short lifted face (231,147)→(236,162), width 3.7 |
| `rose-whorl-right` | Opposing, raised root (254,147)→(289,158), width 4.3 | Curved right belly (257,154)→(285,161), width 4.7 |
| `heart` | Small pinched source core (242,156)→(260,166), width 3 | Interior reflected face (241,163)→(259,172), width 3.2 |
| `rose-whorl-scroll` | Steeper inward curl (236,169)→(262,160), width 4.1 | Sloping folded return (242,176)→(268,170), width 4.5 |

Every field uses **three separate** contact stages: shadow f173–233, soft-mid f216–279 and warm-light f257–307. Individual bands have different pigments, nib width .24–.48, pass opacity ≤.35 and 42–76 short contacts each, intentionally **not** hundreds of dense straight strokes over tiny petals. Their paths are deterministic, seed-stable (0..2,147,483,000), bounded <12 KB, time-addressed, and independent of output aspect. No Gaussian blur, SVG filters, CSS gradients, image textures, screen-space lighting tricks or separate black stripe overlays.

## API, Storybook and regression

- Opt-in `roseCenterValueStudy` is **only valid** for a rose with `roseCenterKnotStudy=true`. The parent's prior dependency on `roseInnerWhorlStudy` remains. The default and all independent subject studies remain byte-identical.
- Existing **45 region count** is unchanged. All six original source paths, contour, 3+ CP-F1 dry-pigment layers, original graphite markings, physical underturn, lamina bounds, pressure, seed hash and paper mask are unchanged. Previously merged front-petal `interiorDetails` remain unchanged.
- Storybook is the **existing** `Video Production/Film Looks/Colour-pencil` studio. A separate checkbox for centre diffuse values is disabled until the physical central knot is ON; turning off the knot or whorl unchecks it. Existing "rose-whorl-center" and "rose-whorl-recess" 2.15× macro projections read the actual source transformed bounds.
- Vitest checks all 12 source axes, 36 trace groups on six petals, seed and non-rose isolation, all original source/material identities, full 45 regions, source inspector. Chromium proof checks same native stage A/B/restoration at **960×540** and **540×960**, the full 45-organ film, clipping on all six original supports, no raster, actual 2.15× macros, and stage f3↔f6 reversible clock.

## Honest visual gate / subsequent work

**Actual screenshot inspection required; passing the test code does not approve the art.** Compare original and opt-in full-frame 1× and 2.15× under identical aspect/seed. Reject if smooth silhouettes become scratchy dark wool, the cool-root field looks like repeated vertical beard stripes, the petal centers become excessively bright pink ribbons, or an added mark crosses into the adjacent material. Correct source density and axes; do not hide by switching to blur.

Even with better local value the six-petal construction remains an imagined stylized reference: **still not measured or validated against a rights-cleared real cultivar**. Further priorities are independently verified specimen source and landmark audit, stronger form/occlusion realism of inner scroll, and only then physically connected deformation and animation. The new field stays OFF by default; no approval of wind animation, stylized movie production or photo realism.
