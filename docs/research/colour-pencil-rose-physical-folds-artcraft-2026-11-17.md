# CP-F1 / FLORA1 — five physically shaped rose petal underturns

2026-11-17 · Original vector source art · **Experimental / off by default** · ArtCraft acceptance: **PENDING**

## Authentic morphology and art references

- International Union for the Protection of New Varieties of Plants (UPOV), [TG/11/8 Rev.2, Rose characteristics](https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf): illustrated sequential reflexing of outer petals, overlapping outer/inner corolla, side-view petal curvature, differences in petal margins and petal attitude.
- UPOV, [TWO/35/18: flower attitude of outer petals](https://www.upov.int/edocs/mdocs/upov/en/two/35/two_35_18.pdf): concave / flat / flattened-convex / convex petal profiles are **structurally different**, not merely a change of saturation.
- Karen Elaine Evans, [Pink Rose original coloured-pencil painting](https://www.artfinder.com/product/pink-rose-6a554/): micro-violet undersides in overfolded margins, luminous reflected rose across warm outward curves, separate thin ivory rim with dark occlusion between outer and inner petals.
- [Ann Swan, botanical coloured-pencil craft](https://annswan.co.uk/biography/) and [Botanical Art & Artists colour-pencil techniques](https://www.botanicalartandartists.com/tips-and-techniques.html): deliberately built organic geometry before applying multiple dry pencil tonal families, fine fibre contacts and local paper light. Overuniform lines and flat underpainting will not reproduce the medium.
- [National Diet Library historical Rosa indica botanical plate](https://upload.wikimedia.org/wikipedia/commons/5/50/NDL1014448_%E7%BE%A4%E8%8A%B3%E5%9B%B3%E8%AD%9C_%E7%AC%AC1%E8%BC%AF_%E7%AC%AC3%E7%B7%A8.pdf): petal forms, flower profile, underside and face of compound rose. Used for generalized morphology, not traced content.

**Rights and authorship:** source observations only. No third-party contour, image pixel, composited photo, scanned plate, art reference photograph or externally licensed asset is present in the delivered package. All SVG d commands and pencil details are original.

## Deconstruction before editing

| Property | Observation | Source implementation |
|---|---|---|
| Surface topology | A reflexed petal exposes its differently lit underside *outside* its front-facing lamina. A cuticle-colored outline alone has zero area and fails to describe the return surface. | Replace five opt-in front-face contours with asymmetrically curved outlines. Paint a second nonzero-area petal region behind each matching face, with a shared curved hinge, optical contacts and independent pigments. |
| Continuity and z-order | The underturn is visibly contiguous at its hinge. Petal sources overlap in flowering order; their own edges, seams and pigment layers have distinct occlusion. | Each underside is inserted immediately **before** its corresponding reprofiled face. Back-cup and outer petals remain behind near petals; heart and inner-fold stay in their original order. |
| Curvature / silhouette | Upper cup, lower outside side petals and near petals turn differently. Lateral outside margins may flare, twist and partially reflex. | Five independently authored multi-cubic regions: outer-left, outer-right, back-cup, petal-front-left, petal-front-right; each has a separate hinge and bounds rather than a radial transform of one shape. |
| Material and light | Abaxial folds receive cooler core shadow, slightly muted rose return light and a narrow dry ivory upper lip. Veins follow each local contour. | Per-region three CP-F1 pigment families, 4 independent overlaid details per fold: hinge shadow (frame 169), shadow vein, ivory cuticle, reflected short fibres. No bitmaps, masking tricks or smooth linear-only underturn. |
| Source preservation | Unaffected petals, fibres, old lip detail, foliage, five separate calyx sepals and stem must be the same before and after enabling one study. | Opt-in **rosePhysicalFolds=false** by default. The original five source IDs remain stable. Other regions are byte-equal across opt-in. Seeds for all original subjects and all source petals are pinned to their original offsets. |
| Animation | Future animation needs region count, material and source to be deterministic under seek and stage scrubbing; not incrementally mutated DOM. | All fold surfaces are pure authored code paths, inserted into the drawing at frame construction. Timeline uses absolute frames and matches current CP-F1 optical schedule. |

## Explicit optical vs physical distinction

**Earlier PR #539** added 21 fine pencil lip **traces** along existing planar petal source contours. Traces are zero-area; some were clipped to those original supports. **This PR** adds five separately bounded *materially shaded* nonzero-area underside regions, and changes the owning five source silhouettes **only when the experimental flag is enabled**. These two levels of representation can be combined without dropping existing original optical contacts or original face/stem/fibre components.

## Required quality gate

1. Unit tests: all five closed face/underside contours, nonzero bounds, 4 native optical traces, 16 regions versus 11 legacy, unchanged non-target source regions in both landscape and portrait, layer seed continuity on the five reprofiled front petals, combined 35-region foliage/calyx/lip/lamina/physical scene, maximum allowed seed and invalid input rejection.
2. Actual Storybook Chromium: 16:9 and 9:16 screenshots at 1x, inspected 2.15x macros for left, right and back-cup underturns, original A/B parity after resetting the flag, stage 3 fully undrawn material trace check, no rasterized images.
3. **Physical visibility**: actual SVG support fill, sampled on a 31×31 grid over each underside's bbox, has substantial visible points *outside its paired reprofiled face*. This fails if an artist accidentally creates an area entirely occluded by its own parent or replaces it with a stroke-only pseudo-fold.
4. Morphology review: compared physically meaningful petal overlaps against the UPOV rose development images and Karen Elaine Evans colour study. Reject mechanical uniform rings, detached underside fragments, irregular source clipping, noisy contours, artificial neon edges, flattened camera perspective, or a change to existing legacy output. A unit or pixel-diff pass alone does not establish anatomical correctness.

## Unfinished priorities

- Artist needs to review the real exported native screenshots: far-back cups and two inner petal rims are still simplified, while five new underturn regions remain a 2D source approximation, not a full thickness/normal model.
- Tune true layering occlusion, slight inner corolla spiral curvature, independent local radial vein variation and visual paper contact at 1×. This is **not** a photo-matched cultivar or a completed world-class rose.
- Add seekable physically rooted breeze/wind movement to the registered structural joints only after the per-surface morphology passes actual 1× visual approval. Avoid independent per-region translations that disconnect physical hinges.

**Release decision:** keep the physical-fold mode off by default and do not claim artist certification until native A/B and macro frames are independently examined and the results are documented.
