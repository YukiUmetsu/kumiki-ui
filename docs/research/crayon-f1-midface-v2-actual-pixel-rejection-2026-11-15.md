# ArtCraft 9.1 — F1 mouth/nose V2 actual-pixel rejection, release quarantine

**2026-11-15 — verdict: REJECT.** This source-measured hand-authored CRAYON1 experiment is **not** artistically faithful and must not be merged or enabled as a default replacement. A negative-control baseline is preserved, and the failed source-volume variant stays explicitly selectable only inside the existing Crayon `!dev` Storybook workbench. No image filters or photographic overlays were used.

## Direct primary reference and rights

- Christopher Campbell CC0 1.0 [portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), direct 608×1082 screenshot; source SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. NOT the full camera JPEG. Real source crops x345..478 y575..675 (nose) and x336..505 y685..792 (mouth) were visually inspected alongside actual matching native Chromium raster captures.
- Material reference: [Philadelphia Museum of Art wax-crayon binder contact](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), p.44; native dry-wax pressure/paper height and rebinding mechanisms documented in the main ArtCraft notes. No copied reference pixels in the produced shapes.
- Source/renderer/rig provenance and baseline construction: `crayon-f1-source-ocular-midface-reconstruction-2026-11-15.md`. Examined CRAYON1 full 608×1082 and 2.65× local two-setting PNGs from actual [GitHub Chromium run 43757479419](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43757479419) (V1) and [run 43758327081](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43758327081) (V2). The latter had no native render errors.

## Actual photo-aligned quality comparison

All crops are **pixel-identical rectangles** in the source and rendered 608×1082 images, with no post-registration or resizing. Grayscale SSIM and Canny edge symmetric difference / source edge count. Since the goal is crayon material **and** identity, photo-vs-wax values alone cannot certify craft; however a worsening boundary residual is a clear regression signal.

| Source crop | Previous midface baseline SSIM / edge | V1 source-volume SSIM / edge | V2 source-volume SSIM / edge | Result |
| --- | --- | --- | --- | --- |
| Nose [345,575,478,675] | **.5617 / 1.425** | .5389 / 2.157 | .5408 / 2.167 | V2 rejects, dark holes too isolated and alar undercuts lack continuous nose cartilage |
| Mouth [336,685,505,792] | .4809 / **2.038** | .4843 / 2.371 | .4820 / 2.375 | V1 gray dental lozenge corrected to three individual muted upper incisors, but lip aperture remains an oblique straight-edged wedge |
| Full face [100,285,505,870] | **.5834 / 2.581** | .5814 / 2.692 | .5813 / 2.693 | New detail does not repair head/face volume or source-contour likeness |

**ArtCraft v9.1 `scripts/portrait_fidelity_gate.py` actually executed** using the exact full source 608×1082 and final V2 source-volume native raster, without weakening thresholds: `status: fail`, full-frame SSIM **0.3726 vs 0.8500 minimum**; edge mismatch ratio **2.8792 vs 0.2000 maximum**, edge mismatch 28,950 vs 6,000 limit, histogram correlation −0.2096 vs +0.9200 minimum. This metric is stricter than many intentionally stylized materials, but no claim of source identity or artistic acceptance is possible. Candidate original PNG was retained for diagnostic evidence only, **not** promoted.

## Independent 1× and native macro critique

- **Nose:** photographed near nostril is a hooked recess *under* the lateral alar cartilaginous volume; both candidate openings still look like independent free-floating solid tear-shaped dark stickers on flat rose-pink wax. The far opening is overly isolated. More pigment mass is not a substitute for correct 3D projected surface continuity.
- **Mouth:** the verified source has a soft salmon lower lip, nuanced bow and slanted shadowed tooth contacts. V1 inserted a huge fused gray slab; V2 darkened the underlying connecting dental root and produced three separately visible low-value enamel contacts, but they still look like three pieces pasted into a black strip. Lip-to-cheek and philtrum soft anatomy are wrong and visible at final scale. This is a geometric/occlusion problem before it is a paper-tooth problem.
- **Whole portrait:** huge flat unformed forehead/cheek planes, near eye outlined like a symbol, uniform toothy scratch noise, abrupt jaw edge and unusually squared neck; camera/framing/morphology are still not convincing compared with Campbell's source. Eye/mouth crop-focused tests and successful Storybook UI **cannot** certify full-frame quality.
- **Wax:** material uses editable CRAYON1 stroke-built pigment, paper height/pressure and local feather contact, but native surface still reads algorithmic pencil screen rather than genuinely layered hand-applied wax. Do not add unbounded random grain in response.

## Code/behavior decisions

1. The V2 source geometry remains modular, named and editable in `crayon-artcraft-f1-midface-geometry.ts` as an **experimental** sample of failed form, so future corrective study can test against it. It is neither merged to main nor promoted to an approved actor.
2. **Quality regression containment:** `crayonCc0FaceStudy().midfaceForm` now defaults to `"baseline"`. Storybook likewise starts with `baseline` and has an explicit `"source-volume"` dropdown; the source-paint candidate never silently replaces earlier nose/lip geometry. `eyeContact` retains independent settings. `!dev` stays set.
3. The midface A/B unit tests explicitly select `source-volume` and compare unchanged original elements, source-parent clipping, nasal sidewalls, dental-root draw order and rendered DOM; Playwright records both native 2.65× screenshots. They test **technical structure**, not beauty.
4. Other unrelated failing tests in changed-contracts CI, if still present, must be separated from Crayon release scope (e.g. Risograph RISO23/RISO26 source-contract mismatches) rather than silently marked green. Do not change Risograph art to satisfy a Crayon change.

## Next highest-value ArtCraft priorities

1. Hand-annotate nasal tip/alar parent volume in source and actual render as **three coupled surface contours** including the septal root; reshape deep air pockets *under* those surfaces, not as floating solid patches. Source-specific spot color and wax edge continuity should be observable at 1×, not only an enlarged crop.
2. Reconstruct upper/lower vermilion surfaces and photo-consistent incisor overlaps with **different** physical wax pressures and smoothed contact shadows. Upper incisors must terminate into the dark gum/lip occlusion without separate gray rectangles.
3. Rebuild the gross jaw/chin/neck color and contour connection, then eyebrow and lash-root dense attached wax and final-scale skin value hierarchy; test release with the real ArtCraft portrait and human-anatomy gate.
4. Review native frames 120/210/299, portrait+landscape and speed-accurate animation. Keep draft PR #281 unmerged until independent review approves realistic anatomy **and** authentic crayon medium.

**Result:** technical prototypes created and tested; strictly **REJECT as finished art**. No visual success claimed from CI.
