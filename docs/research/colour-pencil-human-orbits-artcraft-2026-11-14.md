# CP-F1 ArtCraft portrait: orbital, skin and nasal plane reconstruction

**Date:** 2026-11-14. **Scope:** one original stylized, code-generated female three-quarter portrait. **Status:** geometry + material iteration awaiting browser review; no claim of artistic portrait mastery.

## Reference board and observed craft

| Source | Direct viewable art | Observations; independently authored rules |
| --- | --- | --- |
| Elena Pancorbo, original colour pencil portraits | [Portfolio](https://www.elenapancorbo.com/) · [*Stop Crying, the sun is coming up*](https://www.elenapancorbo.com/originalesoriginals/bajacalidad-23) | The pupil and green iris sit **inside a thin soft scleral aperture**; upper-lid shading partially covers the globe. The nose is **connected to cheek volume**, not one flat pale triangle; brows consist of many hair-direction marks. Our solution reduces exposed eye white, reduces pupil width, separates lid and warm lower-socket contours, and switches the nasal mass to translucent optical glaze. |
| Jesse Lane, coloured-pencil portrait painting | [Artist gallery](https://www.jesselaneart.com/gallery) | Strong light/shadow forms are layered; eyes and nose receive focal detail while skin holds gradual values and soft edge hierarchy. Avoid an equal black outline around every eyelid and nostril. |
| Markus Klein, portrait drawing methods | [COLORED PENCIL Magazine, October 2012, *Natascha* tutorial PDF](https://coloredpencilmag.com/wp-content/uploads/2017/02/COLORED_PENCIL_Magazine_10_October_2012.pdf) | Start from measured outer face and eye/nose/mouth landmarks; build whites/pale zones then shadow planes with layered cross-coloured strokes. Our current source-conditioned route is different, but a new vector portrait should honour the same macro/meso hierarchy. |
| Veronica Winters, coloured-pencil portrait | [Realistic portrait guide](https://veronicasart.com/realistic-colored-pencil-portrait-drawing-guide/) | Fine skin texture derives from optical colour mixes and varied pressure, not long uniform construction hatches. This motivates a low-pressure discrete stipple grain for skin, separate fine fibres for hair, and soft nose/lip glazes. |

The artist-owned images are technique-only references. No contours, compositions, or original artwork images were copied into the public repo. Observations at web-preview resolution do not justify precise source-matched millimetric measurements.

## Negative control from actual CP-F1 Chromium 3× macro

Our [PR #318 browser macro](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43677987074) was inspected. It showed:
- Large flat near-white triangular eyes with dark oversized circular pupils and black geometric eyebrow slabs.
- A physically impossible narrow **bright nose spear** painted over the face due to an independently opaque white `skin` nose region.
- Body-wide long hard hatch lines over smooth facial skin rather than a convincing skin-tone gradient.
- Hair with uniform mechanical striping; thin hair strands had no differentiated material density.
- Existing jaw, cheeks, hair volume and clothing still far from reference-level realism.

The failure mechanism is **material and layer topology**, not simply low point count. Adding extra freckle pixels would not correct it.

## Revision v2: explicit part contract

| Part | Macro relationship | Rendering treatment | Remaining doubt |
| --- | --- | --- | --- |
| Far / near sclera | Warm narrower almond cut; iris is never more vertically exposed than the eye white, near eye wider than far | Realistic soft off-white pigment, upper-lid overlap and finer dark edge | Not yet source-matched 3/4 perspective |
| Iris / pupil | Small separate ocular layers; pupil width smaller than iris; highlights remain small | `glass` transparent iris over paper-backed sclera; solid `ocular` pupil, fine specular line | Real iris depth, eyelashes and eye gaze still simplified |
| Eyebrow | Separate asymmetrical arcs with individually rooted hair strokes, no filled near-black sticker | Same `hair` CP-F1 type, lighter base and material-aligned short fibres | Individual strand spacing is a procedural approximation |
| Nose | Broad attached cartilage plane, nostril ridge and alar shadows instead of a detached pale sword | `glaze` CP-F1, **not opaque**, with local nostril/contact traces | Actual nasal bridge light and nostril contour need source-level human review |
| Lips | Reduced saturation/contrast, preserve Cupid/centerline asymmetry | Three skin pigment passes, one dark contact line, understated light | Mouth geometry still too diagrammatic |
| Skin / hair | Skin smooth with non-grid pores; hair aligned with locks | All `skin` deposits use stipple; `hair` deposits short fiber; full material grain remains deterministic | True 2D animated deformable realism absent |

## Tests and open defects

Run targeted `tests/colored-pencil-living-studies.test.tsx` and CP-F1 tests. The new contract denies an opaque nose sticker, large eye exposure, oversize pupil, dark slab brows and long ruler-like skin hatches. Actual Chromium screenshots at frame 330 and normal-speed shots must still be reviewed before saying *portrait accepted*. A flat stylized design is not realistic simply because it passes these tests.

Future work: source-aligned measured facial feature ratios and hairline, independent eye action/visemes, character expression variants, specular corneal layering, value-map reconstruction and reliable animation; independent full-frame/3× ArtCraft five-axis measurement. This revision does not promise those.
