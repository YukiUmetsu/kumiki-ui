# CP-F1 Stage 1 — private, resumable original-photo / native-head annotation
**2026-11-16 · Human #01 · unapproved study.** Follow [CP-F1](colour-pencil-foundation-2026-11-14.md), the [head-only source gate](colour-pencil-head-photo-fidelity-contract-2026-11-15.md), and [ArtCraft v7](colour-pencil-portrait-artcraft-v7-rebuild-gate.md).

## Observational ArtCraft diagnosis (before authoring)
The current head is *not* a finished portrait and must remain isolated in the existing Coloured-pencil Storybook group. Authentic colour-pencil faces are not built by adding uniform diagonal hatch on a generic oval.

| Axis | Real artist/material observation | Drawing implication | Stage-1 head limitation |
| --- | --- | --- | --- |
| Topology | Elena Pancorbo's portrait planes wrap orbital brow, near cheek, temporal junction and mandible as continuous masses. | Correct near/far cranial contour, zygion and chin in photo space **before** eyes or skin texture. | ANAT1-derived vault still lacks independently matched photographic 3/4 contour. |
| Flow | Jesse Lane builds light marks in overlapping local scribbles, then more controlled detail in focal regions. | Form tangent and five-value shading precede directional microfibres. | Fine pencil marks cannot fix head-width/apex errors. |
| Weight | Janie Gildow shows pressure, pencil point sharpness, paper tooth and selective burnish all affect apparent weight. | Feather light passes without filling unobserved facial planes; reserve true light. | Paper grain may look mottled rather than optically layered until real source/value proof. |
| Rhythm | Near-side temple-to-malar transition differs from the far-side outline at a real three-quarter angle. | Preserve 18 independently selected near/far contour turn points. | Do not transpose ANAT1 synthetic coordinates as photo landmarks. |
| Texture | Paper tooth plus staggered optical layers creates fine chromatic variation; no single flat gradient. | Inspect 1× and 3× output beside reference **after** silhouette approval. | No art approval yet. |

Technique-only links (do not copy art pixels): [Pancorbo](https://www.elenapancorbo.com/), [Jesse Lane](https://www.artistsnetwork.com/art-mediums/colored-pencil/photorealism-decoded-oceans-of-layers/), [Gildow](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf). Photo rights and full-head geometry are a *separate* source-selection requirement. Search thumbnails, uncredited stock photographs, cropped heads or historical upscales are not accepted proof.

## New continuation workflow (one Storybook location only)
The merged #472 atlas supports local source/output file selection and independent 18 cranial points + five tone boxes, then exports a CLI-ready coordinate manifest. Manually annotating all 46 points/boxes can take multiple sittings; browser refresh lost every position. This change adds a **saveable private partial checkpoint** without changing image rendering, artwork geometry, film animation, or exported final evidence.

1. Load two **unchanged** local JPEG/PNG originals in the existing *ArtCraft · source/native head contour + five-tone annotation* story.
2. Place some or all 18 contour points and five tone ROIs in each image. Keep source and real output separate.
3. Select *Save local checkpoint*. Only image names, true browser SHA-256 hashes, native dimensions, optional photographer/source/license fields and normalized native-pixel annotations are saved as local JSON. No photo pixels, texture data, sampled RGB, biological identity, source-image URL fetch, approval status or local persistence.
4. After browser refresh, reload the same two files from disk (renaming a file is safe if the bytes remain identical) and select *Restore checkpoint JSON*. Each side's original image **must** match its saved SHA-256 and native dimensions. Rebuild every annotation with the original bounds/semantic/non-overlap validators. Wrong, stale, altered, swapped, duplicated or injected data fails closed; neither image's current marks change on a rejected import.
5. Complete independent annotations and export the preexisting coordinates-only manifest. The existing [exact-byte native capture CLI](colour-pencil-head-native-proof-capture-2026-11-16.md) measures actual source/render pixels, checks separate byte hashes and passes data to the separate fail-closed head gate. A checkpoint is *not* equivalent to proof.

**No new Storybook folder**; no figure/personal identity data, outside reference pixels or old discarded portrait reinstated. No paid dependencies. Non-image checkpoint imports are capped at 256 KiB; source JPEG/PNG files stay local. Quick repeated file replacement rejects stale asynchronous decode/hash responses rather than resetting the current image's points.

## Acceptance / release boundaries
- Pure unit guards: partial roundtrip, independence, file-renaming tolerance, source/render byte mismatches, altered dimensions, bad versions/URL/license, injected pixels, duplicate/unknown semantic IDs, outside-image points and overlapping five-tone boxes.
- Native Playwright: two separate local uploads, 18 points + five boxes per side, export enabled, checkpoint download, image replacement clearing only one side, restoring both from a byte-matched checkpoint, no image nodes inside the actual pencil SVG.
- Typecheck, focused CP-F1 regression CI and real Chromium capture are required before merge. Technical pass does **not** approve head realism.
- **Next art milestone:** obtain and independently inspect ONE rights-verified high-resolution full 3/4 head photograph; annotate *that actual photo* and a real 1× native head screenshot; reject redraws until geometry and five values match. Only after independent 1×/3× visual inspection start one next feature. Do not restart the former woman.
