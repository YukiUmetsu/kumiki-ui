# RISO11 — Feather engraving and tailored figure craft

## Purpose and observable weaknesses

Follow-up to the RISO9 ArtCraft close-ups and RISO10 Storybook consolidation. At the 3× hero crop, the Courier's gloves read as rounded mittens, coat folds are under-articulated, and the Paper Bird uses large nearly black, parallel wing bars. The existing animation rig, opaque paper isolation and single Storybook folder must be preserved.

## Qualitative reference study (source art is NOT bundled)

| Source | Observed transferable construction | Avoid copying |
| --- | --- | --- |
| [Vicki Johnson, *Autumn Owl* — Printer Johnson](https://www.printerjohnson.com/products/printer-johnson-vicki-johnson-autumn-owl-risograph-print-a3) | Layered feather-group hierarchy: body mass → overlapping covert groups → short directional barbs; alternating dark and paper-negative shapes | Owl silhouette, exact marks and composition |
| [*Garden Birds* risograph illustration](https://www.risopop.com/pop-shop/garden-birds) | Strong bird silhouette and expressive printed wing/feather motifs; restrained spot-ink pair and organic negative-space gaps | Specific bird illustrations and florals |
| [Elena Maria Knittelfelder, checkered coat study](https://www.behance.net/gallery/243846539/felt-Benito-might-delete-later) | Clothing folds and sleeve directions should reinforce garment construction and character gesture, not float as independent stripes | Specific coat/subject styling |
| [MCAD Risograph printing guide](https://intranet.mcad.edu/kb/risograph-printing) | Distinct greyscale/stencil preparation per ink and controlled halftone densities; semi-transparent overprint is material, not blanket alpha transparency | Unverified promises of calibrated physical output |

These are qualitative studies of medium and shape grammar, not pixel-traced images or a measured claim of aesthetic similarity.

## ArtCraft topology and five-axis decision

1. **Topology — required.** Every quill, covert row, barb, breast feather, glove crease and cloth fold is attached to a declared parent joint and mapped to a source-contour construction region. Test generated ink matrices at walking and flapping checkpoints. No independent free-floating decorative stickers.
2. **Flow — required.** The wing quill centerlines follow primary feather directions and taper toward the tips; gloves turn around opposable thumbs; coat pleats radiate from shoulder and hem stress points. Relative to straight, constant-width bars, the new paths use curved, asymmetric feather ribs.
3. **Stroke pressure — required.** The new red solid quill silhouettes use a narrowed taper. Use authored closed paths instead of nonphysical translucent strokes or a random uniform hatch.
4. **Optical rhythm — required.** Feathers group into unequal primary/secondary marks and alternating covert rows. The breast keeps visible paper gaps rather than placing dots everywhere.
5. **Microtexture — unchanged, requires comparative study.** Existing seeded independent spot screens and paper grain remain. Do not add noise to disguise coarse geometry.

**Evidence limitation:** Source/candidate semantic masks and measured reference-relative ArtCraft five-axis thresholds are not yet available here. Tests can establish source mapping, topology intent, animation stability and bounded ink coverage; they cannot certify visual parity with reference art.

## Implemented source-geometry pass

- Courier: narrower speaking viseme, expression-specific mouth-corner creases; asymmetric garment tension/hem contours and articulated glove/thumb-fold contours tied to existing FK/IK joints.
- Bird: smaller tapered quill and division ink shapes, separate short barbs and covert rhythms on each wing, layered breast folds and tail barbs. All new paths follow the existing root/wing/tail joints and print at 100% source opacity; red *screen* paths use existing patterned spot ink rather than alpha.
- Independent structure sheets map all new parts. The ArtCraft panel exposes authored timeline checkpoints and breast/tail study regions without a new Storybook folder or story ID migration.

## Verification and remaining artistic gate

- Run `npm run typecheck`, the RISO11 and existing RISO9 tests, rendering contract tests, and `npm run build-storybook`.
- Capture at least 0/46/78/84/160/198/239 as applicable; compare both actor closeups and their actual film-scale silhouettes.
- Verify full-speed encoded 8-second production film, 16:9 and 9:16, for rhythm and aliasing. Existence of an MP4 is not evidence it was visually approved at normal speed.
- Remaining: anatomical turnarounds from independent references, subtle secondary finger movement, individual feather overlap under wing articulation, screen density calibration, measured five-axis reference masks and independent human artistic review.

No new package dependency or third-party source art.
