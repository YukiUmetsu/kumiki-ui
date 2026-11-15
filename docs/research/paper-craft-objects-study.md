# Paper object library — reference-led craftsmanship

Date: November 14, 2026. The following source art was studied for **construction techniques**, not traced or imported. No copyrighted reference picture is included in this library.

| Reference studied | Structural observations | Code translation |
| --- | --- | --- |
| [Diana Beltrán Herrera: paper birds](https://www.dianabeltranherrera.com/projects/birds) | Anatomical feather growth direction, individual overlapping colored paper vanes, natural head/neck/body, long sharpened beak, perched toes | Original kingfisher: orange and cream underbelly, royal-blue/turquoise head/back, 9 tapered tails, separate coverts, 11–18 feather blades, anatomical eyes, beak and toes gripping a branch |
| [Diana Beltrán Herrera: insects and butterflies](https://www.dianabeltranherrera.com/projects/birds) | Independently sculpted wings with cutout spaces, delicate structural venation, bead-like segmented exoskeleton, multiple compound-eye forms | Original dragonfly: 4 separate wings with 7 physically empty windows each, individually cut paper veins, 12 abdomen segments, eye insets, legs and flower-anchored reeds |
| [Helen Musselwhite: Little Houses](https://helenmusselwhite.com/projects/little-houses/) | Unique facade silhouettes rather than stamped generic squares; separately folded roofs, readable cut windows and doors, contiguous canal street | Original pastel canal village: 3 joined buildings, layered pitch roofs and oculus, real transparent window apertures with dark interior and inset crossbars, doors, ornamental street light, fencing and canal |
| [Jennifer Collier: paper camera](https://www.jennifercollier.co.uk/) and [artist interview](https://designnation.co.uk/blog/an-interview-with-designer-maker-jennifer-collier/) | Rolled lens barrel and ring contours, mechanical dials, segmented housing panels, cardboard tabs and straps | Original paper SLR-inspired camera: 7 concentric die-cut lens rings, aperture, 3 rotary dials with individual marks, punched strap, plate joinery and separate viewfinder |
| [Jennifer Collier: paper teacup](https://www.jennifercollier.co.uk/) | Hollow ergonomic handle, rounded tapered paper body, raised lip, independent saucer and delicately embroidered/printed decorations | Original teacup still life: curved body contour, hollow handle and rim, 3-level saucer, embossed flower, citrus slice with independent segments, folded napkin and spoon |

## ArtCraft-oriented implementation rules

- **Silhouette and anatomy first:** each item can be identified without typography, shading, icons, texture sprites or raster assets.
- **Topology:** branch/feet, wing/thorax, door/foundation, lens/housing and handle/body have physically legible attachments; pierced shapes are SVG even-odd true voids and never alpha tricks.
- **Individual cardstock layers:** multiple separated opaque six-digit hex stocks, cut-paper rim highlights, deterministic shadows from the shared PAPER1 renderer.
- **Consistent orientation:** a uniform virtual 720-unit paper model is scaled around the output center for landscape and portrait; side or top/bottom framing flourishes fill negative space without stretching subjects.
- **Reproducibility:** fixed integer seed; user-controlled 0–1 detail influences actual feather/wing/architectural geometry, not global color saturation. All motion derives from absolute frame.
- **Budget:** each piece is separately keyed; 1–128 fully closed cuts. All five films use the same native `paper-craft-study` slot, not fake still-image videos.
- **Visual QA:** actual Chromium screenshots for all five objects, two-aspect FilmStage renders and encoded MP4. A screenshot is required for artistic critique; passing React/Vitest alone does not constitute completion.

## Known limitations and follow-up

This is production-ready **as a prototype film illustration engine**, not a cutter-safe manufactured sculpture model. More work is required for curled cardstock, actual paper bend/crease dynamics, joint-constrained multi-layer object rigs, perspective thickness, fabrication/kerf constraints, multicharacter choreography and stable scene composition APIs. No quantitative five-axis ArtCraft reference-image fidelity score has been measured for these original compositions.
