# ArtCraft: remade Crayon child character (Blue Coat)

Status: working code and structural tests; **visual acceptance pending**.
Reference: the generated crayon character design sheet requested by the user
in this conversation (not copied into the library, to keep CRAYON1 portable).

## Reference-to-construction map

This pass deliberately **replaces** the earlier rabbit-like performer in
visible Acting, Walk and Draw-In stories. The existing exported source film
factories are retained; consumers of those films are not silently broken.

| Critical feature observed in reference | Geometry / material in new fixture | Proof to review |
| --- | --- | --- |
| Expressive child, not a spherical mask | Asymmetric face, separate jaw, ears, paired orbital openings, inner irises/pupils, nose bridge, cheek glaze and brow gestures | Face macro at frames 98, 112, 176, 239 |
| Multiple natural expressions | Individually cued brow and mouth source paths; eye-blocking skin wax for held blinks | Face screenshots for smile, concern and wonder; timing review |
| Tactile flowing brown hair | Back hair under face; two broad fringe locks; temple curls; clipped directional wax hatching and flyaways | Frontal hair roots and boundary closeup |
| Coherent child proportions | Continuous coat torso with attached head, independently drawn shins/boots, separate articulated arms | Full frame 16:9 and 9:16 at normal viewing size |
| Tailored blue wool coat | Three opaque pigment value planes, independent lapels, placket, pockets, cuffs, hem stitching, buttons; local wool fiber orientation | Costume macro at final frame |
| Red woven scarf, real volume | Opaque scarf fold, tail and overlap, clipped warp/weft plaid and angled short texture hatches | Coat/scarf macro, check that plaid cannot escape cloth |
| Cream ruffled dress | Layered underdress, pleated skirt, shaped lace hem, hand-drawn embroidery marks | Bottom garment crop in 16:9 and 9:16 |
| Leather shoes and satchel | Two original boot silhouettes, lace ties and soles; independently shaded satchel flap/clasp and attached strap; cuff glove/hand | 1x and 3x lower body crops, gait extrema |
| Continuous opaque characters | Wax underpainting for every material mass; *open* rub only for atmospheric hills/clouds and translucent cheek color | Foreground against dark and light backgrounds |
| Frame-true choreography | 270-frame expression and walking studies; 450-frame layered draw-in; native editable CRAYON1 data | Scrub/rewind and 30-fps playback |

### Proportional source contract

The heroine is a stylized child approximately 3.4 head lengths tall.
Canonical local page landmarks, relative to the coat root:

- hair crown: y=-240 to -215; face: x=-95..98, y=-207..-53
- eye centers roughly (-31,-137), (43,-133); iris lower than brow
- nose bridge ends near (8,-101); mouth at y=-86
- shoulders: y=-75; tailored coat hem: y=95..113
- lower dress/ruffle: y=120..167; shoe soles: y=224..232
- base placement: landscape (674,303) at 0.965 scale; portrait
  (277,547) at 1.14 scale

Do not mirror eyes blindly or repeat exactly the same curve for both brows:
expressions must remain asymmetric. Every contour with
\`clipToParent:true\` has a semantic wax parent and follows the same
CRAYON1 head, arm or garment rig.

### Film integration

New editable film factory:
\`src/video/crayon-character-atelier-fixtures.ts\`,
\`crayonIllustratedChildScene(aspect,{mode,expression,detail,rig,stride,stepLift,order,outlineFraction,glaze})\`.

Storybook: **Video production / Film Looks / Crayon / Characters / The Blue Coat**.
Acting, walking and draw-in each have the same identifiable source character.
The other Crayon scenes, including wildlife and dragon, remain discoverable
under the single Crayon top-level section.

All the critical layering, palette, drawing marks and acting poses come
from code; no generated PNG is inserted into the render tree.

## Artistic audit / open defects

Structural verification and an SVG component tree do **not** prove that this
reconstruction has the polished anatomy or layered mark quality of the
reference sheet. Review actual browser-exported frames in both aspect ratios,
then compare semantic crops of:

1. eye-lid closure (ensure true eyelid opacity and no leaked pupils);
2. hair fringe/root continuity and cheek edge rhythm;
3. sleeve attachment, garment volume, plaid wrap/clipping, and ruffle;
4. seated/standing proportions and foot contacts during walk;
5. pressure grain, accent-to-base color balance and frame-to-frame jitter.

Do a before/after photo review for every change. Preserve current editable
geometry; use the ArtCraft v6 reference/structure/material/fidelity axes when
actual aligned image crops have been captured. **No numerical fidelity
scores or successful browser clips are asserted here.**

## Source and rights

- Highest-priority visual direction: the original AI-generated child/adult/fox
  reference board created at the user's request in this conversation. The
  board is **not redistributed** or traced into a raster sprite.
- <https://sagalino.com/en/styles/wax-crayon> — technique reference on wax
  binder, visible stroke grain and tooth; not copied artwork.
- <https://www.oncebooks.com/styles/crayon-storybook> — general crayon
  picture-book craft, warm paper and silhouettes; not copied artwork.
- <https://www.directoryofillustration.com/ArtistWebpage.aspx?AID=18413>
  — independent professional illustration reference for character design,
  not for tracing a third-party character.

Semantic geometry, textures, poses, clothing pattern and palette are original
Kumiki code. As a design direction, retain the user's detailed crayon board
as a target for **craft quality**, not an obligation to duplicate its exact
characters or composition.
