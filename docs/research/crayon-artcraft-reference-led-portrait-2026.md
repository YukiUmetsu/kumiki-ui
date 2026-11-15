# Crayon ArtCraft — facial construction and chromatic wax study

**2026-11-14. Status:** original code constructed; rendered aesthetic signoff **pending**. The existing first-generation person was rejected. The adult-bust fixture remains hidden in Storybook under `Video production/Film Looks/Crayon/Characters` with `!dev`; none of the old characters are promoted.

## Reference observations

These are local, user-provided style references (not licensed as redistributable repo images). The three cropped files were examined locally but are **not copied into this repository**.

| Source crop | Concrete visual evidence | Geometry/medium response | Remaining validation |
| --- | --- | --- | --- |
| `crayon_reference_study/face.png` (476×276; main face x17–308/y4–256) | Forehead wisps originate in thick overlapping curly hair; eye lid, lash and iris are independent; cherry-red cheeks and bridge/tip carry irregular wax grains | `forelock-loose-curl` is connected to root; wax scumble `cheek-malar-crayon-red`; `upper-lashes-rooted-near/far`; alar/bridge contours; source-locked 3/4 face cheek/chin | Need 1x/3x matched eye, nose and cheek crops, not a generic DOM assertion |
| `crayon_reference_study/adults.png` (616×625) | Adult face is not a circle: near and receding cheek differ, jaw is softly rounded, expression develops through mouth corners; hair has separate overlapping dark locks; cloth has shoulder and collar construction | Rounded C/Q continuous face contour; far cheek narrower; warm/neutral mouth paths; individual hair lock contours; retained solid garment silhouette | Face/costume still below reference; front and profile unbuilt |
| `crayon_reference_study/fabric.png` (476×299) | Coat material is heavy and woolen; adjacent scarf checks have crossing weave; linen has embroidery, gathered edge, shadows under overlaps | Already-present scarf warp/weft, button holes, embroidered blouse, source-clipped coat seams; this pass does **not** replace silhouette with decorative noise | Garment fold geometry, hands and lower body still missing |
| `crayon_reference_study/expression.png` (430×273) | Eye and cheek changes happen together; smile deforms both mouth corners, not simply tinting lips | Two distinct authored expression geometries and brow/lid/cheek source layers | More expression types, animation visemes and real performance review pending |

Source role: **style-guided craftsmanship**, not a traced or pixel-matched identity. Pixel SSIM thresholds are therefore not claimed. A professional ArtCraft 6 release would require its five-axis source manifest and independently reviewed, aligned crop statistics. Both remain blocked.

## Part topology (fixed coordinate system)

The adult-bust source uses an original local drawing plane with head landmarks centered near x=0, brow y=-190, aperture y=-160, nasal alar y=-25, lip y=40–65, chin y=100, neck y=55–145, and sewn collar/coat y=110–350. World placement is aspect-specific; all semantic features share the same coordinate system. Near eye width ~70 source units, receding eye ~51; perspective asymmetry is intentional and guarded by tests. The head is **not** a verified full 3/4 identity reconstruction; far-eye obliqueness and nose projection still need reference-aligned side evidence.

- **Topology:** opaque adult-face → cheek/tear/nose tonal wax (clipped) → separately defined sclera/iris/lid/alar/lips (solid or local glazes) → fine attached lashes and malar contours. Opaque hair masses and tailored coat are separate shapes with independent local wax contact.
- **Pigment logic:** a continuous, shaded skin underpainting must remain opaque; saturated coral wax blush sits *on top*, with both directional scratch marks and softened edges clipped to the actual parent face. The red pigment's local 6-unit nib spacing is distinct from the broad skin base.
- **Hair logic:** crown, back and temple masses remain thick; `forelock-loose-curl`, underside glaze and 139 seeded tangent-following fibers construct one attached lock. No pasted raster hair.
- **Expression:** retain separate warm/neutral lips/commissures. Exposing warm/neutral in the hidden Storybook lab is for engineering comparisons, not visual acceptance.

## Critical ArtCraft axes (pre-release)

| Feature | Geometry / topology | Flow | Width | Pattern rhythm | Texture | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Near lashes | Rooted strokes on upper lid rim; no floating tips | Outward tangent | Narrower than upper lid contour | Irregular rooted groups | Matte ink-like wax | Constructed; unverified |
| Blush and nose | Parent-masked wax with continuous underpaint | Parallel to cheek curvature | 6–8 unit rub nib | Seeded nonuniform strokes | Pigment/scumble | Constructed; unverified |
| Forelock | Must connect crown and forehead, leave cheek gap | Root-to-tip curved guides | Heavy mass + thin filament | Asymmetric strands | Dry wax | Constructed; unverified |
| Coat | Layered wool, seam and scarf folds joined to torso | Directional seam and tuck | Broad coat rub + tiny seams | Plaid diagonal lines cross weft | Dense textile | Structural review failed; not accepted |

## Technical checks vs quality

New checks must validate `inspectCrayonScene`, unique IDs, full opacity of adult face/hair/coat, attached hair/eyelash composition, clear parent clippings, warm and neutral artwork, 16:9 and 9:16 native Chromium renders, and source seeds. **Green CI is not artistic acceptance**. Review the actual exported head/eye/nose/blush and garment crops against the local references; log every deficiency and keep the lab hidden until independently approved.

## Render critique: 2026-11-14 first pass rejected, second pass staged

[Browser run 43665018219](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43665018219) rendered the actual source:
- **Fail (nose):** added septum and older nostril paths intersected, creating a conspicuous cartoon-heart shape. Fixed by separating the pigment contacts; neither curve may form a joined glyph.
- **Fail (cheek):** concentrated saturated wash formed a smooth red disk, not broken hand-deposited crayon. Fixed with a lower-chroma diffuse underlayer, a *smaller* saturated focal patch and independently directed red wax marks.
- **Fail (forelock):** a bright, ruler-like golden hair band remained. Reduced filament count, lowered contrast and retained distinct clipped flow lines.
- **Fail (eyes):** long eyelashes became evenly spaced spokes. Reduced length, density and darkness at the true eyelid root.
- **Fail (chin):** face pointed excessively at the center. Flattened lower-jaw curve into a cheek-to-chin transition.

Each repair is geometry/material-level code, not visual QA text. The revised browser evidence and ArtCraft acceptance are still pending. No user-supplied artwork was committed.

### Second browser critique and anatomical nose rework

[Source-native render 43665228712](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43665228712) improved cheeks and shortened the eyelashes, **but failed the nose crop again**. Front-facing, paired curved nostril glyphs and a pale circular highlight still resembled an animal snout rather than a human ala/columella. Third-stage changes narrow the alar mass to less than 45 local drawing units, lower nose-tip contrast, shorten the dorsal edge, and replace two bold mirrored nostril arcs with a single small near-nostril depression and much smaller far-side shadow. Strict tests guard these geometry constraints. The finished result remains an **unapproved style study**; no character galleries are unlocked.

## Eye and brow ArtCraft reconstruction

Source crop: user-supplied `face.png`, especially primary face x125–251/y88–166, and adult closeups from `adults.png`.
Observed: light does **not** strike a white oval equally; upper eyelids shade the sclera and the iris is pigmented radially under a defined limbal ring. The brow is a bundle of short differently oriented marks with a thin base rather than a perfect single vector arc. Receding eye occupies less width.

Source-authoring changes (independent of paper/noise shader):
- New `eye-cast-shadow-near/far` are **local glaze masses clipped to opaque sclera**, leaving the iris and skin silhouette solid.
- Real `crayonIrisFlecks` generates source-clipped irregular near/far radial pigment striations; each iris also has a separate curved limbal ring. Two seeded fields differ in extent and count to avoid identical eye stamps.
- `crayonFurFlow` builds brow hairs along reference-anatomical cubic guides. Base brows are thinned rather than simply adding thicker black ink over the old arcs.
- Iris uses local dark underpaint at the outer/rim plane with warm focus light; no screenshot references are copied into the shipped runtime.

Verification scope: semantic path/clip/hue hierarchy, original serializable wax contract and source-native Chromium 16:9/9:16 eye crops. The eye's **anatomy/appeal and reference-level mark density remain artistically unapproved**. Full body, hands, profile and rigging remain out of scope for this pass.
