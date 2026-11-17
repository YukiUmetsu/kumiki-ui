# ArtCraft CP-F1 — front rose lamina S-seam and folded petal continuity

**Date:** 2026-11-17. **Status:** opt-in `rosePhysicalFolds` reconstruction; NOT source-photo-approved artwork. Prior sources: merged #548 five physical folds; #581 inner four petals; #587 intermediate three laminae.

## Observed references (artist/biological morphology only)

- Karen Elaine Evans, original coloured-pencil *Pink Rose*: https://www.artfinder.com/product/pink-rose-6a554/ . In the painting, the front upper lip bends back with a **separate thin, selectively pale ridge**; the inner dark seam is curvilinear, not a line bisecting two flat pink wedge stickers. Her pigment is softly modulated through broad front surfaces and sharply contrasted only at fold contact.
- Heather Rooney, original coloured-pencil rose: https://www.heather-rooney.com/colored-pencil . The foreground wraps around a deep central funnel, with thin concave edge creases, uneven shoulders, and interrupted highlights; the lower frontal margins are neither tangent-matched triangles nor regular polygons.
- UPOV rose morphology TG/11/8 Rev.2: https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf . A real double rose differentiates petal reflex, profiles, overlap direction and outer vs inner attitude; this is not a particular cultivar blueprint.
- Ann Swan botanical coloured-pencil techniques: https://annswan.co.uk/biography/ . High-density local dry-pigment marks follow real form and layered optical values, not a raster filter or generic random hatch used to hide incorrect silhouettes.

**Rights and limitations:** references are morphology/technique observations only, no source image, traced silhouette, derivative path or sampled photo texture ships. The coded cubic paths and local crease marks are original authored source. Exact petal topology and pigments are **not** measured against a licensed real specimen, so they are experiments.

## Source native deconstruction and continuity

| Scale | Problem found in real native screenshots | Change, behind existing opt-in |
|---|---|---|
| Macro | The two wide front source petals in 16:9 and 9:16 appear as a straight vertical pink split with two tapered triangular bottom corners. Their seam visually bisects the bowl, unlike a rolled petal overlapping its neighbor. | Reprofile **only** `petal-front-left` and `petal-front-right` when `rosePhysicalFolds=true`: two independently designed multi-cubic contours. The right inner edge curves **in, out, then back** to make an S-shaped concave contact. The left lower part narrows then folds back around its shared root. |
| Meso | A ribbon-styled highlight on the old face obscures the actual edge turn. The underside and upper face seam cannot move independently without creating a detached hinge. | Rewrite the two actual filled **abaxial** surfaces in the same source coordinate system, with a matching `hinge` that is an exact prefix of each front-facing edge. Preserve 5-fold region ordering and author 2 original additional internal crease/return contacts **inside** each corrected face. |
| Micro | The white cuticle edge and pink undersurface must remain deposited pencil marks rather than a uniform bright outline or gradient wipe. | Retain all original petal details, all optical lamina passes, rolled lip study, 3-layer CP-F1 palette/opaque support and seeded paper tooth. Add restrained cool-carmine medial contact (f204–256) then warm reflected pencil fibre (f257–303). Nothing is flattened, erased or rasterized. |
| Film & reproducibility | A procedural stroke collection can accidentally reseed or move the original drawing, or show later details in an earlier drawing stage. | Keep original region IDs/material seeds, unchanged default `rosePhysicalFolds=false` output, existing absolute frame clock and seek-safe masks. Tests prove new details are absent at f106, drawn by f335, and survive both 16:9 and 9:16 plus combined 42-region botanical option stack. |

## Acceptance and open quality blockers

- Unit: five complete physical fold regions, stable old source and details-prefix identity, exact shared hinge prefix for two frontal surfaces, two extra front detail traces each; no extra details added to unrelated petals, deterministic seeds and other-subject isolation.
- Actual browser: original A/B, 16:9 / 9:16 native film drawing, **both** source-attached frontal 2.15× macros, full prior botanical composition, absence of third-party raster, plus seek test for added four optical crease paths.
- **Independent visual gate:** inspect actual exported pixels at 1× and macros against the original rose images. Reject if folds still appear as graphic petals, opaque planes are detached, middle whorl sits on top of front lip, highlights read like glossy plastic tubing, or local edge creases float away from the signed support. A passing path/seed/unit test is NOT proof of world-class painting.

## Remaining priorities

1. Color and pressure balance: original front petal broad surfaces still need local area-based value planes (not uniform linear gradients), true complementary shadow families and carefully moderated cuticle edge.
2. Original artist-level rose needs a specimen/right-verified reference with morphology measurements and 1×/3× native comparison. Current stylized botanical geometry remains an **ART HOLD**, including added S seams.
3. Wind/motion must be rooted at anatomical hinges; do not animate individual free-floating SVG portions until still morphology and natural occlusion are approved.
