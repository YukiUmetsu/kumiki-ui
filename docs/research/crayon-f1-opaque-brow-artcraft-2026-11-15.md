# ArtCraft F1 — source-rooted eyebrow wax anatomy and lip-tissue review

**2026-11-15 · experimental, ART REJECT, draft PR #281.**

## Locked references and actual inspection

- Identity / geometry (CC0): Christopher Campbell, [*Brunette woman portrait*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The actual manually inspected local source is a **608×1082 browser image**, full SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, *not* the original 5184×3456 camera file. All following x/y are the original 608×1082 screenshot, not a hypothetical generalized face.
- Real medium: [Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper* (2014)](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), sections on wax crayon and discrete marks. [Ellis & Yeh (1998), *The history, use and characteristics of wax-based drawing media*](https://doi.org/10.1080/03094227.1998.9638608): wax crayon and oil/soft pastel differ in binder/tool behavior; **do not** copy pastel blending and call it wax crayons. All new elements use the existing editable `CRAYON1` pressure + page-tooth + cohesive dry wax fiber engine; they are hand-authored geometry, not a filtered photograph or imported vector trace.

### Source-first deconstruction

The **actual original image and prior native 1× image were inspected at 4×**: `/mnt/data/f1-brow-source-vs-native.png` (research working file; not bundled to the npm package). The previous native brow appears nearly invisible as only a transparent stippled smear. The photographic brow is a **continuous dark root mass**: tapering toward the image-left x195–225 at y505–491, dense x240–310 around y471–487, separate individual hairs near the image-right x310–332/y480–493. It is not two smoothly repeated ellipses.

Independent 5-pixel-wide darkest-luminance profile across the actual source: x210→y498; x230→y491; x250→y482; x270→y481; x290→y479; x310→y484; x320→y486. This directly informed the Bézier, **not** generic canons. Far brow is only partly visible through right hair x397..476/y434..464, and is neither mirrored nor stretched to near-eye dimensions.

| Source-native ROI | Original photograph median RGB | Previous wax render median RGB | Diagnosis |
| --- | --- | --- | --- |
| Brow center x235..308,y466..499 | (116,79,70) | (187,156,147) | severe missing dark eyebrow mass |
| Left tapered tail x194..240,y486..512 | (169,138,125) | (190,158,149) | old tail too uniform/bright |
| Near nose-side root x291..326,y474..495 | (112,72,61) | (194,163,152) | dark root simply not deposited |

RGB observations here diagnose the **missing mass**; photo-to-crayon histogram agreement alone is not a craftsmanship pass.

### Five-axis source-to-construction

1. **Topological continuity:** two opaque, source-shaped native wax eyebrow roots are attached to `face-outline`, drawn just before existing soft `brow-superciliary-*` regions. `source-brow-fibers-*` are independently clipped to the same face; no floating digital brow lines or detached rounded rectangles.
2. **Vector flow:** near arch uses six source-specific cubics, far uses four. Extra **20 uneven near** and **9 unequal far** short, rooted cubic hair contacts follow outward/diagonal growth. Do not mirror or repeat at a uniform interval.
3. **Edge quality:** preserve original open high-frequency wax feather glaze *above* compact opaque eyebrow mass; contour remains irregular due to separated actual crayon pressure fibers, not a thick smooth vector outline.
4. **Pressure/rhythm:** core pressure .84–.88 and `spacing:4.7–4.9`, fibrous wax contact .53–.58, unequal density between eyes. These are handcrafted experimental tuning values; monitor at native resolution, not just geometry assertions.
5. **Microtexture:** one continuous hard wax binder body built through pressure/deposition/paper relief + discrete limited-width genuinely drawn fibers. No blurry transparency, repeated dot stamp, or photographic compositing. **Wax medium** references are separate from the identity photograph.

## Source-native patch and A/B setup

- `src/video/crayon-artcraft-f1-brow-geometry.ts` contains all geometry/material. `browForm:"baseline"|"source-rooted"` defaults to the **unchanged previous baseline**.
- Full `crayonCc0FaceStudy()` keeps original F1 photo-specific 18 landmark records, 608×1082 native camera, 300 frames, seed 441501, and independent eye/lash/midface/jaw controls. All other wax and contour elements are exact negative-control objects.
- Existing **Crayon / ArtCraft Adult Face Lab** Storybook folder exposes the eyebrow comparison dropdown and original source zooms; no new Storybook folder.
- `tests/crayon-artcraft-f1-brow.test.tsx`: missing/duplicate anatomy, parent root, dry wax contact, 20+9 curved irregular fibers, geometry hierarchy, undeformed original scene, low-detail/anatomy modes and actual SVG generation.
- Chromium source-matched camera (focus x265,y481, zoom 3.05, frame299), **baseline and candidate actual screenshots** via `tests/e2e-artcraft/crayon-adult-face.spec.ts`. Pixel difference establishes a real rendered material change, not photographic or art acceptance.

## Independent lip study — V3 after prior native visual rejection

V3 `source-volume` adds **two tissue-shaped opaque crayon undercoats**, in front of the face and beneath the *existing* open, feathered upper/lower lip glazes. The dental arch remains darkly occluded with three separate small contacts; previous "white tiles" still read too graphic. In the same fixed 2.65× source camera, real browser PNG vs source photo MAE (0–255, lower closer):

| Source ROI | Negative control | V3 candidate | Delta |
| --- | ---: | ---: | ---: |
| Upper lip x352..487,y691..742 | 41.02 | 35.79 | −5.23 |
| Lower lip x357..486,y743..770 | 33.89 | 33.37 | −0.52 |
| Internal opening x354..485,y709..747 | 38.51 | 32.27 | −6.24 |
| Whole nose/upper lip/chin x337..495,y679..791 | 34.67 | 32.42 | −2.25 |
| Nasal wing x373..468,y601..654 | 39.53 | 37.99 | −1.54 |

**Artistic reject:** V3 looks overly uniform and cutout-like despite local color improvement, and nostril anatomy remains detached-looking. Do not replace the negative control or merge based on these measurements.

## Next and non-negotiable release blockers

Actual-brow screenshot and v9 portrait/human-anatomy/structural-fidelity independent source/render masks still required. The existing frozen photo vs prior native full-frame v9 portrait gate **failed**: SSIM **0.3727** vs ≥0.85, edge difference ratio **2.9013** vs ≤0.2, edge XOR **29,173** vs ≤6000, histogram correlation **−0.2085** vs ≥0.92. These are deliberately strict literal-photo scores and cannot alone judge wax style, but they **block claiming literal source fidelity**. Do not lower thresholds to pass. Verify the actual candidate, not a promise of improved code. Inspect eyebrow 1× and 3.05× before any artistic promotion, then fix largest remaining jaw, nostril and dental issues; validate moving animation frames and 9:16/16:9 delivery later.

**Decision:** source-grounded and type-testable but **not artist approved**, keep PR #281 **draft** and unmerged.
