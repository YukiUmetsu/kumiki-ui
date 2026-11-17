# ArtCraft CP-F1 — source-native rose rolled lips

**Status:** opt-in experimental, NOT botanically or artistically approved. This is the increment following the merged lamina-fibre study (#531).

## Technique and contour references

- Susan Rubin, original coloured-pencil rose compositions: https://www.susanrubinstudio.com/living-color-2021.html
- Karen Elaine Evans, *Pink Rose*: https://www.artfinder.com/product/pink-rose-6a554/
- Ann Swan, botanical coloured-pencil pigment layering and reserved white: https://annswan.co.uk/basic-coloured-pencil-1/

These are technique observations only; no reference raster, contours, or artwork are copied. The project's existing original seven petals are the sole geometry basis.

## Deconstruction before rendering

1. **Topology:** each visible petal has its own boundary and overlap; do not join unrelated lips into a single flower spiral. Existing eleven original rose regions, all detail strokes, paper tooth and three material deposition passes remain unchanged.
2. **Vector flow:** each occlusion curve follows a specific visible existing rolled-edge trajectory. Independent warm return-light curves sit slightly inward; bright broken dry contacts are sparse and do not become uniform neon outlines.
3. **Edge characteristics:** cool dark under-turn before mid-tone reflected return before sharp cream pencil lip. No opaque closed patch, screen-space texture filter, flattened gradient or background cover-up.
4. **Temporal material layering:** begin occlusion frame 178, half-tone frame 224 and restrained dry-edge frame 267. Seek and replay remain deterministic.
5. **Art hold:** the original simplified botanical silhouettes are not reconstructed. Judge against a real rose's anatomy, 1× 960×540 and 540×960 exports and 2.15× source macro. Reject if highlights read like continuous graphic tubing or curve locations diverge from silhouette.

The new `roseLipStudy` option defaults to false, and interactive Storybook explicitly labels the study experimental. Source-native data are separate from the existing lamina optical fibres. Unit tests assert baseline parity, intact geometry/region/layers and zero unrelated subject changes. CI and independently inspected actual browser images remain the release gate; programmatic checks do not establish visual realism.

**Next:** independently measured folded petal silhouette and sepal attachment study with source-verified morphology, then native comparative film-frame review; do not paint over anatomy with texture.
