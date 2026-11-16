# ArtCraft v7: CC0 same-person full face, registered source pixel study

**State: experimental, unapproved.** Source research November 15, 2026. Do not merge as finished characters.

## Real source, rights and immutable measurements

- F1: [Christopher Campbell, brunette portrait, 2015](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), **CC0 1.0**. Actual reference screenshot **608x1082** from [browser Actions run 43682633614](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614), SHA-256 **f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2**. This is a web screenshot, not verified original full-resolution JPEG.
- Source full-frame screenshot and a 2x enlarged face crop, source x65..515/y266..895, were actually inspected before drawing. Existing immutable 18 source landmarks are in crayon-artcraft-portrait-audit.ts; these must not be replaced by author-estimated candidate marks.
- Technique-only wax references from real artists / photography: Tiona Marco authentic crayon paintings; Philadelphia Museum of Art wax descriptions p.44; Stockmar photographed strokes; ShyAndroid CC0 wax-crayon handstroke. No source art traced or packaged.

## Geometry and flow observations (608x1082 source pixels)

| Critical region | Observed source | New native CRAYON1 construction | Rejected shortcut |
| --- | --- | --- | --- |
| Hair and face silhouette | Crown y180..292, forehead x145..440/y280..450, near cheek x106/y604, chin (398,858), far cheek hair occlusion | Connected back/left/right hair masses, 17 rooted flow paths, oblique jaw, attached neck | Symmetrical wig and smooth oval mask |
| Near eye and brow | Brow peak (274,480), iris around (260,550), near corners (222,544)/(303,543) | Separate brow follicles, socket, occluded iris, pupil, upper and lower lids | White almond eye / detached eyelashes |
| Far eye | Inner (405,514), outer (463,513), iris (441,518); right hair curtain occludes its rim | Narrower far aperture and shadowed sclera, lid/iris occlusion | Mirrored equally wide eye |
| Nose | Root (363,522), tip (411,631), nostril (399,643), far nostril around (455,616) | Distinct dorsum, root, tip, unequal alae, dark contact | Line triangle on flat skin |
| Lips | Corners (348,741)/(489,710), upper (418,708), lower (420,761) | Perspective-sloped upper/lower flesh, mouth shadow, small interrupted tooth view, philtrum | Cartoon U smile or lip ellipse |
| Cheek/neck | Malar (211,658), lower jaw near y860, neck down to y1082 | Clip-bound warm/cool cheek plane, underside jaw shadow and connected neck | Floating chin or rectangular neck |

### Actual photograph sampled color evidence

Mean RGB from small local **source** rectangles: forehead light **#d1b7af**, central forehead **#bfadab**, near cheek **#d3a18b**, cheek light **#e5c2ac**, nose lit plane **#edc5b1**, nostril-side shadow **#8d5f50**, brow **#633c32**, iris **#1c100d**, oral crease **#4e2120**, lower lip **#ab787d**, neck **#826051**. These are local value-hierarchy observations, not a photorealism acceptance criterion for different media.

## Construction and diagnostics

- New src/video/crayon-artcraft-cc0-face.ts: all anatomy expressed in 608x1082 absolute source-image coordinates; editable opaque CRAYON1 pigment planes, parent-clipped eye and nose semantics, separate asymmetric lip volumes, meaningful temporal ordering and hair fibers.
- In the existing Video production/Film Looks/Crayon/ArtCraft Adult Face Lab !dev Storybook, view the CC0 source and native wax side by side. Toggle the source geometry graph, zoom and play frames. The 18 frozen source landmarks are added to a diagnostic overlay without altering the paint construction.
- Unit tests verify semantics, 18 immutable source marks, opacity, deterministic code, distinct physical face regions and separate F1 and B1 identities. Playwright captures actual 608x1082 full face at wax frames 120/210/299 and frozen source graph at 299.

## HARD STOP — do not mark finished

First visually review actual native screenshot at 1x/3x; then use ArtCraft v7 portrait_fidelity_gate.py with **independently annotated actual candidate pixels and source bytes**, intact SHA-256 and region-level value measurements. Metrics can reject but never certify artistic quality. Critical areas: eye sclera/lid occlusion, nasal cartilage, lip contact, chin shape, roots and medium. The old unrelated synthetic bust still fails 17/18 landmark and 4/5 tonal checks. The B1 standing figure represents a different person. None of these experimental assets may enter the gallery until independently accepted.
