# ArtCraft CP-F1 — original rose lamina pigment and flow study

**Date:** 2026-11-16. **Status:** opt-in experimental; reference-led mark direction, **not yet a botanical realism approval**.

## Authentic technique references and rights

- [Susan Rubin, *Climbing Rose*, original coloured-pencil work](https://www.susanrubinstudio.com/living-color-2021.html): tiered red rose petals show changing curved fibre direction, local dark crease occlusion, cool red-violet shadows and fine bright rolled cuticle edges. **Technique observation only**, not a silhouette to trace; artist pixels do not ship.
- [Karen Elaine Evans, *Pink Rose*](https://www.artfinder.com/product/pink-rose-6a554/): exposed pale petal edges, continuous curl recession and fine veins redirecting toward each local fold. **Technique-only** reference; image not imported.
- [Ann Swan, colour layering, shade colour and burnish sequence](https://annswan.co.uk/basic-coloured-pencil-1/): establish smooth colour depth by ordered light deposits; preserve local paper tooth; burnish late, not a blanket blur.
- [Janie Gildow, coloured-pencil pressure, stroke and point](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): small sharp marks retain paper tooth, gradual pressure produces tonal transition; bright local highlights should not be buried in uniform crosshatch.

No source image, photo crop, traced vectors or private subject is distributed. The rose is the project's **existing, original 11-region authored blossom**, not the source artists' roses.

## Five-axis deconstruction before coding

| Axis | Observation | Implemented decision | Remaining art risk |
|---|---|---|---|
| Topology / continuity | Seven visible named petals overlap at root, bend outward, and roll into individual tips. | Per-petal root→belly→rim independent quadratic axis; retain **all 11 original region paths** and z-order. | Current original simplified petal silhouettes are not botanically measured. |
| Stroke flow | Fibres follow petal lamina, not global diagonal print scratches. | Every contact derives a tangent and normal from its petal axis; nonparallel individual fan half-width; rare branches. | Artist still must inspect local veining versus flower stage/variety. |
| Edge hierarchy | Rolled lip receives lighter thin fibres; creases receive darker deposits. | Four separately timed optical fibres: cool shadow, carmine, rose veil, cuticle light. Preserve all original named folds and edge strokes. | Cuticle is stylized; does not establish physical translucency. |
| Material depth / tooth | Paper tooth, deep shadow and pigment optical mixing coexist; burnish comes last. | Real short, pressure-bounded SVG marks with independent colors and widths. Keep existing CP-F1 three material layers, paper support and clip-to-lamina behavior. | Existing flat underpaint still dominates at 1×. |
| Time / composition | Pigment builds after structure/undertone, with stable random seed on every seek. | Addressable onset at frames 169/203/234/260, same production frame clock, both 960×540 and 540×960. | No native real pencil force simulation or hand-held tool. |

## Fidelity contract and review

Opt-in roseLaminaStudy in pencilObjectStudyDrawing; false preserves existing export. The existing Video Production / Film Looks / Colour-pencil Drawing Foundation Storybook has a dedicated A/B switch, 1×/2.15× macro, seed, pressure, tooth, burnish, 16:9/9:16 and arbitrary frame scrub. **Four individually editable native traces per each of seven petals** are added without replacing any existing petal, leaf or sepal path, stroke, palette, CP-F1 layer, timeline or underpaint.

A geometric unit test checks the named per-petal flow, deterministic seeds, trace/path safety, 28 extra separate strokes, exact default/baseline equivalence and non-botanical isolation. Browser proof captures both native A/B aspects and 2.15× crops, ensures screenshot restoration after switching, and disallows bitmap embedding. Focused CI runs those tests.

**Reject if** the microscopic marks appear as uniform parallel hairlines, a single radial spoke fan, an artificial sprayed fuzz, paper-breaking streaks across overlapping petals, noisy loss of red shade gradients, missing details at 1×, or broken non-rose output. Mechanical proof does not confer artistic acceptance. A future source-led petal geometry reconstruction (folded edges, calyx and leaflet insertion) is higher priority than another microtexture pass.
