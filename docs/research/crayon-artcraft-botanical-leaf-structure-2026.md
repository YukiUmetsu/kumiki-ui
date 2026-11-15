# Crayon ArtCraft — pear leaf contour and vein architecture (2026-11-14)

**Status:** Experimental source-led botanical iteration. Not approved as masterwork or a reference-faithful reconstruction. Original source-authored SVG shapes, no imported reference pixels. Keep the existing `Video production / Film Looks / Crayon / Drawing System` workbench tagged `!dev`.

## Find → inspect → dissect

Actual pre-change evidence inspected: Chromium frames and close-ups from the **Crayon drawing grammar native proof**, run [43681171537](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43681171537). Both aspects finish as an opaque pear with wax rubbing; the leaf is an over-smoothed lens, with only four pale generic crossings. The stalk junction reads attached, but the blade lacks its observed edge rhythm and structural underplane.

External **technique/morphology** studies (distinct from an identity reference; no literal tracing):
- [The Fruit Grower's Guide, 1891, vintage pear plate](https://www.rawpixel.com/image/50993/free-illustration-image-pear-fruit-vintage). Listed as public domain. The visible asymmetric green leaf folds and bends around a central vein; secondary veins terminate along an uneven margin. We use morphology only and do not embed the image.
- [Historic USDA Pomological Watercolor Collection](https://catalog.data.gov/dataset/u-s-department-of-agriculture-usda-pomological-watercolor-collection) — public-domain U.S. government historical fruit studies. The collection is *watercolor*, **not** dry crayon, so its pigment behavior is not a wax standard.
- [Lena Ru, Pear Still Life](https://www.artmajeur.com/lena-ru/en/artworks/11594435/pear-still-life) — modern **oil pastel**, unlicensed for copying; useful only for observing coarse chromatic patches, abrupt local value changes and pressure-loaded pigment. The new leaf geometry does not reproduce its composition.
- [Elle France, pastel pears](https://www.artandcolor365.com/2025-drawings) — contemporary pastel, genre comparator only. No rights to redistribute source images are assumed.

### Observed vs constructed
| Part | Observed in examples | New source-authored construction | Negative control |
| --- | --- | --- | --- |
| Leaf perimeter | Asymmetrical shoulder, unequal margins and small edge interruptions | Multiple independently controlled upper/lower Bézier turns, shallow notches, preserved root/tip | Perfect ellipse/lens with two mirrored edges |
| Midrib | Flow from petiole to pointed tip | One continuously turning centerline plus adjacent darker side | Straight bright slash |
| Lateral veins | Branches contact the midrib and split to both margins | Eight curved branches, uneven intervals and directional shadow subset | Detached parallel grid or floating strokes |
| Petiole / lamina | Dark root plane enters leaf | Parent-clipped throat and broad tapered midrib ridge | Separate dark circle sticker |
| Color | Opaque blade with selective local dark planes and lighter wax | Wax blend with named transparent *overlays on an opaque parent*, clipped to anatomical leaf | Global noise or transparent blade |

## Render → compare → refine gate

**Technical checks:** `npx vitest run --project unit tests/crayon-drawing-system.test.tsx`, `npm run typecheck`, `npm run build-storybook`, `npm run catalog:check`; Chromium native proof when available. Require 960×540, 540×960 and `stalk-leaf` crops in both aspects. Compare the previous proof run above to new proof artifacts. Inspect the leaf root, tip, serrations, vein termination and negative spaces at 1× and 3×. Check that patches remain clipped to an opaque leaf at first/middle/final frames.

**Unmet ArtCraft strict release evidence:** no high-res source crop or independently traced semantic mask was available to the source renderer in this run; therefore source-relative five-axis values, pixel fidelity scores and final artistic acceptance are **not claimed**. The remaining source/target mask and independent visual gate must be completed before removing `!dev`. The user-requested human face remains separately blocked by ArtCraft v7's *measured authorized-photo portrait gate*; do not polish its invented anatomy.


## Native Chromium comparison — iteration 1 rejected for line dominance

Run [43681980567](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43681980567) passed automated drawing proof; actual 960×540 and 540×960 full frames and `stalk-leaf` macros were opened and compared side by side with earlier evidence [43681171537](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43681171537).

Observed improvement: blade outline is slightly more asymmetrical, petiole throat reads integrated, veins become separate branches. **Still rejected as finished art:** eight near-equidistant bright, straight-looking diagonals dominate the tiny leaf; the lower blade contour shows an almost decorative scallop sequence. These are local art-direction failures which CI does not detect.

Iteration 2 addresses the causes rather than adding noise: compound cubic turns for every lateral vein, lower saturated/white vein contrast, finer stroke width, and an unequal lower blade edge. A new native-browser proof and 1×/3× comparison remain required for any stronger artistic claim.
