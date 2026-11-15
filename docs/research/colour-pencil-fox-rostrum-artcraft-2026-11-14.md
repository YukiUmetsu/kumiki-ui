# CP-F1 → ArtCraft fox facial reconstruction, iteration 2

**Date:** 2026-11-14. **Scope:** static original 3/4 fox facial geometry in `src/video/colored-pencil-living-studies.ts`. **Art status:** construction candidate, awaiting Chromium screenshots and independent 1×/3× review. This is **not** a copy of any artist's image.

## Source board — verified illustrative references, viewing only

| Source and artwork / image | Observations at visible scale | Implementation / explicit negative control |
| --- | --- | --- |
| [Darren Gwatkin — *Fox Early Morning Gaze*, artwork and image](https://www.gwatkinartworks.co.uk/wildlife-art) | The eye sits in a small angular, dark orbital pocket within a much larger tapered rust/gray skull; near cheek fur follows face direction; snout projects well beyond iris. | One eye is narrower/nearer, head widens behind orbit, nose projects in front of both eyes, cheek fibres curve in 5 local tracts. **Reject:** two equal circular eye stickers on a round cat head. |
| [Bonny Snowdon — fox construction lesson and illustrated process](https://bonnysnowdonacademy.com/fox-draw-resources/) | Artist's explicit method: structure → eye/ear → head/muzzle → white chin/chest → shoulder/neck fur → whiskers last. | Use independent named skull, near/far ear insert, orbits, bridge, nasal leather, lower muzzle, rooted ruff, whiskers with separate start frames. **Reject:** random hairs before skull silhouette. |
| [Claire Milligan — coloured pencil and watercolour-pencil fox tutorial image](https://www.clairemilliganart.com/patreon-video-tutorials) | Strong dark-to-light transition around eye; short muzzle hairs switch to longer neck ruff; ear insert has its own material boundary. | Short bounded hairs along preauthored quadratic tracks, differentiated tone families, and eyes with upper lid/iris occlusion. **Reject:** long equally spaced diagonal stripes. |
| [American Red Fox Portrait — artist gallery image](https://www.artgallery.co.uk/listing/o9rquo84ye-american-red-fox-portrait) | Profile projection: dark nasal plane terminates a long taper; pale grey jaw under rust bridge; slender eye cut in bony brow. | Original 3/4 geometry approximates these general anatomical constraints rather than the source photograph composition. **Reject:** little black round nose centered between symmetric cheeks. |
| [Elena Pancorbo — coloured pencil face](https://www.elenapancorbo.com/) | Human eye, skin and hair are integrated with volume; tiny highlight relative to orbital area; avoid broad face-wide heavy contour bands. | Human face remains a separate priority; do not apply fox fur tracks to skin. **Reject:** one generic dark outline for different materials. |

All external artworks are **technique-only references**, not project assets, source contours, cropped copyrighted pixels, or supplied character identities. Do not claim pixel match or tracing rights.

## Original 3/4 contour/attachment lock

The previous fox read as a small friendly cartoon because its head was a broad frontal oval, its near/far eye apertures nearly matched, and the nose was below them at the facial midline. That macro geometry—not a lack of random texture—caused the failure.

New local head coordinates are intentionally **asymmetrical** and authored independently:

- Solid skull: range approximately x116–311, y99–272. The outline bends from back brow to left cheek, arcs into the crown and tapers beneath the eye into the neck.
- Projected nasal leather: x101–145, y211–250, clearly **left** of the smaller far eye (x158–181) and full near eye (x222–261). The positive distance from nose to near orbit establishes a long, directional rostrum.
- Far eye aperture ~23×17, near eye ~39×26; partial upper-lid shadow and distinct dark near orbital bone. This ratio is an original expressive 3/4 construct, **not a measured match** to Gwatkin's source.
- Bridge: narrow rust form x131–250 from upper snout to underside of near orbit; silver/cream muzzle x96–278 spans the snout but stays one continuous maxillary/chin mass.
- Local cheek ruff: x225–294 near the jaw-to-neck transition, layered over solid head and muzzle; no unattached geometric white blob.
- Six whiskers originate at the muzzle over an opaque root matte and project outside the silhouette, so the detail layer must not be clip-locked.

The palette preserves rust/ochre head, medium warm-grey muzzle, dark brown/amber ocular regions and peach lit fur. White is reserved for very thin hair and eye highlights rather than a flat translucent mask.

## Rooted-fibre drawing grammar

`pencilRootedFur(guides,seed,palette,startFrame)` uses authored *quadratic tract axes* per anatomical zone. At parameter `t` each strand begins at its local cross-normal offset to a tract, then follows its tangent, curling slightly, for a bounded 4–11.5 unit length. This avoids the older 40–70-unit comb-like stripes. Three successive coloured-pencil families deposit hair understructure, small dark-core contours and sparse pale terminal marks with different widths (0.56 / 0.38 / 0.27) and opacities. Seeded irregularity changes spacing and curvature **without moving between frames**.

The generator rejects invalid/rootless guides; each semantic trace carries `fibre-[group]-[layer]` identity. These are pigment strokes, not generated opaque silhouettes; CP-F1 still owns paper tooth, value, pressure and material typing.

## Five-axis evidence / staged critique

| Axis | Design evidence | Verification status |
| --- | --- | --- |
| Topology | 23 named regions; head supports two eyes, nasal leather, muzzle, attached ruff. Whiskers project from solid root. | CP-F1 validates support and typed materials; source-to-render pixel topology **not yet proven**. |
| Flow | Per-tract quadratic tangent for forehead, cheek, rostrum and lower jaw; 12–36 bounded short hairs per family. | Deterministic geometry test; a source-derived curvature-distribution audit is **not yet done**. |
| Stroke pressure | 3 distinct widths and individual transparency levels, material colour families. | Code/path test; no physical pressure measurement from reference. |
| Optical rhythm | Non-grid t spacing, varying arc lengths and normal offsets by seeded noise. | Code test; localized cross-normal line density comparison remains open. |
| Microtexture | Existing CP-F1 3 material layers + paper tooth/burnish, new rooted fibres above, not a blurred photo filter. | Browser crops and human review required; no verified high-frequency reference metric. |

**New acceptance tests** require the nose to precede both eyes in projection, clear near/far orbit asymmetry, smaller socket masses, genuinely short rooted fibres, finite paths, valid opacity, proper whisker clipping and preserved 16:9/9:16. **Do not call it a finished fox merely because those tests pass.**

## Next iteration after rendered review

Compare actual full fox and 3× facial crops with the reference board; reject new defects such as misplaced mouth, too-long jaws, discontinuous fur roots, flat tail/feet, over-transparent eyes and uniform body hatches. Only then consider applying the same tested local fur grammar to the rigged fox; blindly porting 3/4 drawing coordinates into a side-view actor would break animation.
