# CP-F1 × FLORA1 — source-native rear rose cup with asymmetrical physical relief

**Date:** 2026-11-17 · **Status:** ART HOLD, `roseBackCupReliefStudy=false` by default. **Previous:** merged front-petal physical S seam (#589/#591), six local dry-pencil value fields (#595).

## Authentic reference and anatomical deconstruction

1. **Karen Elaine Evans, *Pink Rose***: https://www.artfinder.com/product/pink-rose-6a554/ — original artist-owned rose illustration (technique-only). Upper rear crest is an *uneven high/low scallop* and the inner roll has a dark cast-contact just under a selectively pale irregular edge, not a complete digital white circular line. Adjacent front planes overlap the rear fold.
2. **Draw Botanical, *How to Draw a Rose***: https://drawbotanical.com/how-to-draw-a-rose/ — illustrated classroom work and petal form studies (technique-only). Distinct rose petal surfaces show convex lamina and reflex; their edges are paired physical sides, not a single stroke around a CAD cup. Observed lit and shaded individual petals with differing curvatures.
3. **UPOV TG/11/8 (Rosa L.)**: https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf — petal reflex, shape and folding are separately characterized morphology. This cannot supply exact dimensions for an unidentified photograph or cultivar.
4. **Ann Swan botanical coloured-pencil medium**: https://annswan.co.uk/ — dry optical pigment follows local curvature; deep creases are established by adjacent surfaces while uninterrupted white outline/flat pink regions are misleading.

**Rights:** Original cubic geometry, independent color choices and dry-pencil contacts are newly authored. No reference image, cropped source, traced outline, encoded pixel, remote fetch or unlicensed asset is included in the library. These sources are qualitative; *do not* claim measured source fidelity or actual 3D photogrammetric normals.

## Problem and real change

The 1× screenshot of the complete pink rose after #595 still shows a smooth, nearly U-shaped rear cup behind the heart. It reads as a regular stadium/helmet rim. Larger source problems at the front remain; this milestone only attacks the upper corolla silhouette before attempting wind or further texture.

| Scale | Problem | Independently authored geometry / dry material |
|---|---|---|
| Macro | Top rear cup is a symmetric shallow broad arch that doesn't interrupt or lift at real petal shoulders. | One asymmetrical closed, source-native **front face** with staggered left and right raised apexes and a differential right-side drop. Curved rim uses individually authored cubic arcs with uneven inflection and separate left/right shoulders; no rotating or copying petals. |
| Meso | A bright rim on a flat face cannot communicate thickness, and an underside highlight floats if its path is not attached to the physical seam. | One actual **nonzero-area** rear *abaxial* lamina. Its inner edge reverses the front face's original authored hinge in physical painting order. Source `face`, `underside`, `faceBounds`, `undersideBounds` all change together; no extra opaque sticker. |
| Micro | Original dark contact is too uniform and edge needs interrupted toothy dry pencil. | Five underside and five front independently timed, limited pressure contacts: deep cool contact, warm multi-segment cuticle, soft back-fibres, spot reflection and broken glancing highlights; previous full-face 3 pigment layers, paper tooth, optical fibres and detail marks preserved. |
| Video | New geometry should never animate loose on its own or reseed the flower. | Same base `back-cup` and `rose-turn-back-cup` IDs/seed slots and absolute CP-F1 drawing clock, no new independent per-petal transform. No extra regions; the original 16/42-region configurations stay unchanged, and the independently authored two cuticle sidewalls merge cleanly at 18/44 regions. |
| Integration | Experimental shape should be independently revertible without changing completed artwork. | Separate `roseBackCupReliefStudy` boolean, **requires** `rosePhysicalFolds`. Existing Storybook gets one optional control and a real `back-cup` attached macro, plus the existing physical underside macro; no new story folder. |

## Test contract and artistic gate

- Source inspector rejects detached/invalid hinge, clipped bounds, bad short pencil traces, missing independently authored contacts.
- Unit checks (16:9/9:16, seeds 0 / 371 / 2147483000, invalid flags, non-rose isolation) require **all non-rear organs byte-identical** and both rear surfaces still CP-F1 solid with canonical 3+ pigment layers; full 42-region botanical composition remains under cap.
- Playwright story captures fold-only before, revised full-native, both source-attached 2.15× macros, all botanical options, and byte-identical **restored** pixels in both 960×540 and 540×960. It samples the filled physical underside area exposed beyond the face, no raster image.
- **Artistic HOLD:** inspect actual 1× and macro pixels; reject if scallops look repetitive, rear lip is excessively bright/flat, support shadows leak, or front/inner petal occlusion hides the physical turn. The whole flower still does not match a rights-cleared specimen or photo-real botanical master. Passing tests never constitutes an art approval.
- Next priority: revise foreground silhouette and negative space using **owned/licensed measured rose photos**, then root-connected deformation of all petals and their interior dry marks, avoiding disjointed independent motion.

