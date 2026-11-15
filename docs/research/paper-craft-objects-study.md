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

## Pass 16: observation → physical paper cues

Additional reference inspection (14 November 2026):

- [Diana Beltrán Herrera's hand-cut bird construction, Smithsonian](https://www.smithsonianmag.com/science-nature/diana-beltran-herreras-flock-of-paper-birds-9713658/): birds have a structural paper foundation with carefully selected sizes and feather positions; feathers are individually scored. This motivated distributing selective *local curvature shading* to independently cut stock without blurring whole-body geometry.
- [Paper birds by Herrera, designboom](https://www.designboom.com/art/diana-beltran-herrera-paper-birds-02-18-2016/): shaped and fringed oblong feathers are built atop a sturdy interwoven paper form. Motivated rendering a subtle lit ridge and shaded distal edge per separate paper feather, rather than using semi-transparent color fields.
- [Beltrán Herrera's floral/fauna paper textures, Colossal](https://www.thisiscolossal.com/2021/08/diana-beltran-herrera-paper-sculpture/): material depth relies on many individual veins, creases and overlapping colored strips. Motivated synchronizing sculpted wing *membranes and individual veins* under a single anatomical hinge instead of independently rotating paper parts.

**Implementation comparison:** Curvature is authored on individual SVG contours, with five opaque pigment colors as a per-path gradient, explicitly clipped to its real cut shape. The same stock still owns its physical shadow and may have cut-out windows. The renderer also exposes `data-km-paper-stock` for QA so a gradient does not conceal an accidentally translucent base. Four dragonfly rigs and one kingfisher wing rig use shared pivot and waveform, and the test suite asserts mathematical frame purity, component synchrony, motion-off behavior and reduced-motion stillness.

**Unresolved fidelity gap:** actual out-of-plane paper bending, rolling, thickness, self-shadowing, physical crease spring dynamics, microscopic cut-fiber geometry and fully biophysical flapping motions. This 2.5D step improves legibility and material cues without claiming to reproduce reference sculpture shapes or 3D camera viewpoints. No numerical ArtCraft image-comparison scores are fabricated.

## Pass 18: species-specific common kingfisher anatomical audit

Three distinct reference classes were compared, without copying source geometry or pixels:

1. **Actual kingfisher anatomy**: [BirdLife DataZone species photograph](https://datazone.birdlife.org/species/factsheet/common-kingfisher-alcedo-atthis) shows a very short tail, compact torpedo body, large but skull-shaped head, long narrow chisel bill (not twin whiskers), rich chestnut belly, small white throat, and short orange feet curled around perch. [Animal Diversity Web](https://animaldiversity.org/accounts/Alcedo_atthis/) verifies blue upperparts, chestnut underside, white throat and small red feet. [Feather identification](https://bris.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=112424) confirms finely barred crown and cyan/cobalt wing colors.
2. **Real handmade paper bird sculpture**: [Diana Beltrán Herrera bird collection](https://www.dianabeltranherrera.com/projects/birds) shows an integrated body scaffold, joined wing coverts, individual shaped blue primaries, eye and beak anatomy and articulated toes. The original contours in Kumiki are not tracings.
3. **Fine manually layered wing-feather construction**: [ESMA detailed kingfisher sculpture](https://www.esma-artistique.com/projet-etudiant/oiseaux-papier/) demonstrates dozens of nested cobalt/azure paper vane contours, warm orange chest plumage, teal-to-deep-blue shingled feathers and tiny directional crown flecks; the prior flat turquoise wing disc with lemon-yellow comb strokes did not meet this bar.

### Previous vs upgraded structure

- Circular ball head → compact asymmetric skull, layered brow, chiseled long black bill and ear patch.
- Oversized pale belly → deep chestnut body plus localized pale vent and small white throat.
- Nine oversized wire-tail strands → seven short stacked rectrices.
- Two stick-like vertical human legs → two red sloping tarsi with gripping toes on the actual continuous perch.
- Flat solid-blue head and single wing plate → 3 layered back-shingle tracts, 3 wing covert spots, 3 chestnut breast tracts, 3 head crown bars and multiple staggered primary feather tiers.
- Existing 18 hinged feather tips retained but rebuilt with wide oblong asymmetric bases and 3×6 overlapping placement.

**Remaining visual quality gates:** inspect actual Chromium screenshots at fully assembled frames, compare crown/bill/body/wing to reference photos, then inspect 9:16 framing and render native video. Still 2.5D; no claim of faithful photogrammetry or quantitative similarity scoring.

### Iteration 18b: optical review of actual browser images

The first code render improved the head/body silhouette but **failed a higher artistic bar**: the orange/white face geometry still read as a cartoon smile, the crown stipples looked jewel-like, chestnut feather patterns read as polka dots, and the bird was too small inside its presentation mat.

Changed the actual generator again: the auricular patch is located **behind** the eye, the white side-neck and throat are independent natural regions, the bill is all-dark adult male rather than an orange smiling stripe, the eye is smaller and recessed, and teal/cobalt head flecks become **directional fine engraved paper vanes**. The wing covert and breast tracts are narrower, close-toned paper cuts instead of big contrasting spots. The subject uses a uniform 1.18× sculptural composition scale (while keeping the mat/frame unchanged), in both 16:9 and 9:16.

This iteration is based on inspecting real Chromium capture artifacts, not guessing from code alone. One further visual gate must inspect this corrected render and avoid claiming photo identity with the paper sculptures.
