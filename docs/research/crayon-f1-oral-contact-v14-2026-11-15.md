# ArtCraft F1 / V14 — source-observed oral-volume and native wax-contact study

**State: isolated, reversible research; artistic RELEASE REJECT pending actual-pixel review.** The PR stays draft. This is not a photo filter, pasted screenshot, or generic symmetrical lip primitive.

## Source and rights (immutable)

- **Anatomy:** [Christopher Campbell's *Brunette woman portrait (Unsplash)*, CC0 1.0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The repo's checked browser-source viewport is 608 × 1082. Mouth x351–485, y687–771; keep all geometry in that coordinate system. The original photographer's full camera JPEG and this browser projection are not necessarily pixel-aligned, so no silent landmark transplant.
- **Authentic wax material:** [Stockmar, *Painting with wax crayons*](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf): pressure-built layered colors, paper roughness/tooth and characteristic broad wax-side strokes. [Stockmar wax color mixing tips](https://www.stockmar.de/es/servicio/folletos/?cid=1316&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_techniques-and-tips_work-material_EN.pdf): blend colors with changing stroke direction and pressure. This is **wax crayon**, not oil pastel paint, vector blur or photographic noise. The prior material study's native CRAYON1 pressure/burnish and tooth are retained.
- Prior Chromium-native F1 `source-volume` and `source-alar` 608×1082 source-mouth crops were actually examined: the upper lip reads as a uniform magenta triangle; the internal opening is an unnaturally straight claret wedge; three teeth look like detached gray polygons; lower lip reads as an airbrushed capsule. This is a topology/light-value failure **before** microtexture.

## Photographed structure decomposed before reconstruction

**Topological connectivity:** upper lip and philtrum form one sloping vermilion volume; thin dark airspace begins at near commissure (~351,746), curves through under-overlap at (~418,724), and terminates behind far hair at (~482,719). Three small tooth contacts appear **inside** the aperture, partly hidden by upper vermilion and shadow. Lower lip is rooted at same opening yet bulges down toward y767–775 and turns softly into chin; it must not be another straight dark stripe.

**Flow:** independent three-quarter projection, not a mirrored smile. Near lip rises obliquely toward viewer-right cupid tubercles, upper bow flattens into the far lip hidden by hair. Lower lip contour follows an unequal C-curve and its ten tiny wax contact ribs follow tissue direction instead of uniform vertical hatch.

**Edges:** hard opaque cut edge only where dental contacts and true dark mouth interior overlap. Open pressure-deposited wax feathers gradually into cheek; upper/lower solid body wax keep true opacity so the lip remains a filled volume even when the surface fibers skip paper.

**Width/rhythm:** upper vermilion covers approx y688–745 while opening occupies a much thinner x351–484/y716–754 wedge. Tooth segment widths 26/32/29 px; none forms a single artificially white straight bar. Lower lip body width 143 px and rounded y714–779. Each wax-part bound is registered to this *single* source crop.

**Microtexture:** multi-pigment wax undercoat with tooth and source-plausible paper color, built in existing CRAYON1 renderer; visibly hand-applied dry wax nib contacts on ten irregular lower-lip ribs. No generic overlay, removed gradients, copied texture image, blank flattened surfaces or opaque digital linework.

## Code, A/B and failure containment

- `src/video/crayon-artcraft-f1-oral-fidelity.ts`: updates **17 preexisting source-registered wax nodes + one preexisting wax-fiber contour** (18 total); no new semantic-element budget, no direct source pixels. Modifies only local original vector paths/material values, not camera, hair, eyebrows, ears, jaw, face outline, seed or timing. Complete 2D actor remains editable for storytelling/animation.
- `Cc0MidfaceForm="source-oral"` adds this opt-in **after** the existing `source-volume` and `source-alar` transforms; `baseline` and `source-volume` and `source-alar` continue to function as unchanged independent A/B controls. Existing Crayon Adult Face Lab Storybook dropdown includes the new unapproved candidate, no extra component directories.
- `tests/crayon-artcraft-f1-oral-fidelity.test.tsx`: verifies full unchanged control, identical non-mouth elements, explicit lips-cavity-dental paint order, bounds/negative space and real wax, failure on missing and duplicate anatomy, mode default and exact timeline. New Chromium test captures **native** source-crop magnification (2.65×) at frames 210 and 299 for source-alar vs source-oral; captures a whole-face 299 image. The screenshots (not tests) are the reference for artistic review.

**Pending evidence and acceptance gate:** download actual **current-head** Chromium screenshots, view paired crops against exact CC0 source pixels, run calibrated source-relative 18-landmark/anatomy gate (with occlusions), assess dental continuity and tonal hierarchy. Check upper lip no longer a triangle, the opening not a straight gray stripe, teeth embedded and lower lip naturally round. Retain screenshots as evidence; reject if any of these remain obvious. Then inspect frame 120 and playback of 300-frame film, and revisit failed nose and large planar forehead/cheek. Do not merge or call the art professional until quality is *visually* confirmed.
