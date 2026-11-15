# WM1 paint-edge continuity: watercolor brush pigment front

**Observation:** the current WC19 eye proof visibly shows zigzag, saw-toothed wide watercolor washes, even though WM1 genuinely draws pressure-derived brush ribbons. This does **not** match source examples such as the [Art Prof watercolor-eye tutorial](https://artprof.org/learn/tutorials-media/painting/painting-an-eye-in-watercolor/) or the original physically informed [Curtis et al. watercolor synthesis](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf). The defect is in the actual brush geometry, not missing SVG noise.

## Root cause

`buildBrushRibbon` previously applied a **new independent pseudorandom radius to every 2–4px stroke sample**. Broad wash paths therefore had a visibly ragged polygonal boundary, not the coherent wet meniscus of a continuous load of watercolor. Adding more grain obscured rather than fixed it.

## Implemented

- Compute cumulative **arc length of the full authored brush gesture**.
- Generate independent, smooth noise streams on each brush flank using seeded interpolation with a brush-width-based wavelength.
- Use stronger contour variation for directional dry brushes and lower for high-water broad washes.
- Keep paper-scale pigment flecks, bristle breakup, edge displacement and drying **inside the WM1 renderer**, not on the high-level geometric silhouette.
- Preserve deterministic absolute-frame / mid-stroke seeking by using the full centerline and never resampling based on visible prefix.

## Automated regression

`tests/watercolour-brush-edge-continuity.test.ts` tests a real 96-pixel-wide brush pass and checks interior step continuity (max per-sample edge movement under 1.8px, average under .48px), deterministic seeded variation, unchanged prefix under half-painted seek, and distinct wet/dry profiles.

**Important:** This is a painterly-medium improvement, not an approved human face. A native-browser art inspection remains required for the WC19 watercolor eye and subsequent face; the standalone brush geometry passing tests does not settle any artistic claim.
