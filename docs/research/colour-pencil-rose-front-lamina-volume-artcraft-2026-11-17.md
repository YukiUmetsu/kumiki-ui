# CP-F1 × FLORA1 — asymmetric front lamina volume reconstruction (ART HOLD)

**Date:** 2026-11-17. **State:** original source-geometry experiment; `roseFrontLaminaVolumeStudy=false` unless explicitly enabled after `rosePhysicalFolds`. Full photographic botanical approval **not** implied. Previous contiguous work: merged rear-cup relief #602, physical frontal rims #601, frontal value axes #595 and medial S-seam #591.

## Real references and what we can / cannot infer

1. **Karen Elaine Evans, original *Pink Rose*** — https://www.artfinder.com/product/pink-rose-6a554/ — technique-only. The near front-facing petal is a broad, *convex* body with an arcing outer lower rim, not two triangular tapered-card pieces reaching the stem. Its dark inner contact is unequally shaded; light glints are intermittent at the side turned cuticle. This artwork is mixed media; do not attribute all highlights to colored pencil. No image or contour copied into code.
2. **Ann Swan, botanical colored-pencil originals** — https://annswan.co.uk/ — technique-only. Source observation and negative-space geometry precede dense pigment. Real petal faces vary in lobed shape, shading, and border loss; uniform mirrored wedges need source rebuild rather than extra randomly seeded grain.
3. **Rosa hybrida petal opening (Plant Cell 33:1229, 2021)** — https://academic.oup.com/plcell/article/33/4/1229/6126472 — scientific morphology-only. Lateral motion at the petal base and spatially unequal adaxial/abaxial growth generate varying curvature toward petal tips. This research does not specify the morphology of a particular photographed cultivar.
4. **Rosa chinensis *Old Blush* dorsiventral epidermal microscopy (Frontiers Plant Science, 2019)** — https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2019.01098/full — shape/material-only. Adaxial upper vs abaxial lower cell anatomy differs, so the broad facing plane, physical cuticle and reflexed underside should remain distinct materials with independent geometry. Microscale sizes must not be confused with these scene units.

No downloaded reference image, extracted raster pixel, traced source outline, arbitrary CSS gradient, erased detail or redistributed third-party art is included in the library.

## Native source inspection and topology

Previous 960×540 fully enabled source screenshot from #602 was cropped at true 3× native subject scale for manual inspection. The two large front petals were solid-looking pink triangular wedges tapering into the exact same bottom center, with too-straight medial highlights. The posterior crown was already independently improved, but the front still seemed a graphic icon rather than a soft convex rose cup.

| Structure | Original / intended change |
|---|---|
| **Two adaxial front petals** | Two *new, nonmirrored, closed* cubic face contours, independently authored in scene coordinates. Left grows out and down across a fuller convex belly; right has a longer outer shoulder, uneven distal overhang and inward axial return. The sharply pointed base is replaced with differential, slightly rounded margins. These are **actual full-surface source silhouettes** on the existing opaque CP-F1 support, not faux shadow overlays. |
| **Exact physical attachment** | The upper two cubic-segment hinge prefixes are **byte-identical** to the old `ROSE_PHYSICAL_FOLDS` and to the two independent `ROSE_PETAL_RIM_SIDEWALLS`. Existing abaxial turned surfaces and 2–6-unit cuticle sidewall regions are not altered or re-seeded. Any petal contour change is below the shared hinge. |
| **Directional medium marks** | Four authored dry-pencil details per facing lamina: form-aligned cool crescent contact, narrower pink reflected axial return, one asymmetric branching subvein, and a few interrupted cuticle highlights. All original shaded material, CP-F1 3 pigment layers, paper tooth, shape-specific fibre texture, existing S-seam shadow, six separate #595 dry optical bands and four-contact physical rims are retained. |
| **Rendering order** | Keep `[underturn,face,rim]` and original back cup / inner whorl order. No extra region or detached overlay; legacy 11-region rose unchanged, physical-fold 16-region composition and complete 44-region botanical composition remain unchanged. |
| **Animation** | No independent movement. Colors, detail, and source pigment are still frame-addressed. Deferred physically coherent joint-rooted deformation must move all three surfaces together, with a validated face/underside/rim hinge at every frame. |

### Feature, Storybook and rejection conditions

- Opt-in `roseFrontLaminaVolumeStudy` requires `rosePhysicalFolds`; the Storybook **Foundation rose frontal lamina volume** toggle disables/clears when physical folds are switched off.
- Use the existing **Video Production → Film Looks → Colour-pencil → Drawing Foundation**, not a new Storybook folder. Compare 16:9 and 9:16 before/after/restored at 1× and both 2.15× front-left/front-right **source-attached** macros; inspect complete botanical option stack (44).
- Source and browser checks reject loss of upper hinge continuity, stray raster, point-only fake fill, excess details, invalid seeds, or a return of the previously corrected white pinhole near (252,203)..(256,211). Unchanged subjects/regions retain identical paths/material seed families.
- **ART HOLD**: the new silhouettes are artist-authored but not measured from a licensed specimen. Visual review should reject front petals that still resemble giant leaves, overly symmetric teardrops, torn medial seams, exposed paper between adjoining laminated surfaces, or cuticle ribbons too light/outlined. *A pass in type/DOM/pixel checks cannot certify visual mastery*.
- Next: fix central/outer depth hierarchy with actual rights-cleared floral source photography and verify physically paired petal surfaces from more than one viewing angle. Don't prematurely animate.
