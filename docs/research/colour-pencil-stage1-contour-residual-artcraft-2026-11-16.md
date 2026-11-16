# CP-F1 ArtCraft — full-head reference-contour residual review
**2026-11-16 · Human #01, first drawing only · ART HOLD (not photo-approved).**

This continues [the independent local annotation atlas](colour-pencil-head-annotation-atlas-2026-11-16.md) and [resumable checksum checkpoint](colour-pencil-head-resumable-annotation-2026-11-16.md). The previous human portrait was discarded in #444: **do not reinstate that woman** or draw an eye before the new skull contour/values pass independent review. ANAT1 and CP-F1 are required but not evidence of reference likeness.

## Genuine image reference recheck (candidate selection, no pixels shipped)

| Candidate with directly identified original | Rights evidence | Geometry/tonal finding | Stage-1 decision |
| --- | --- | --- | --- |
| [Jakobandrewnz original Christopher Luxon portrait](https://commons.wikimedia.org/wiki/File:Chris.luxon.portrait.jpg) | Photographer-owned CC BY-SA 4.0, full 3,072×2,048 file, 2016 | Uncropped source is available, but the readily inspected [cropped face](https://commons.wikimedia.org/wiki/File:Chris_Luxon_portrait_(cropped).jpg) is effectively **frontal** rather than 3/4. Derivative crops should not be silently treated as original 3/4 evidence. | **Reject for target yaw**; useful as skin/lighting discussion only. |
| [LOC three-quarter beard portrait (circa 1860)](https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg) | US public domain; original reported as 5,153×6,408 | Wikimedia file history acknowledges **823×1,024 source enlarged** by interpolation. Dense hair/beard hide key jaw anatomy and do not create real microscopic texture when upscaled. | **Reject** for high-resolution five-tone skin study. |
| [Sherman Otis Houghton, three-quarter left](https://commons.wikimedia.org/wiki/File:Sherman_Otis_Houghton_Crop.jpg) | Historic photograph, USC/California Historical Society public-domain statement | Real 3/4 orientation but scalp perimeter is partly clothed in side hair and full beard obscures menton/mandible turns. The existing 923×1,159 crop is not adequate for fine pigment-to-skin comparison. | **Reject** for complete 18-point photograph. |
| [Kymbriel, Abstract Planet 01](https://commons.wikimedia.org/wiki/File:Abstract_Planet_01.jpg) | CC BY-SA 4.0 self-portrait | Image description explicitly records Photo Booth filtering plus Pixelmator edits. Image processing makes natural local shading/tonal calibration unreliable. | **Reject** for five-value photographic source. |

The reviewed set is **not a validated Stage-1 full-head 3/4 photo**. Do not introduce invented original pixel SHAs, author-colour swatches, fabricated 18-point landmarks or an identity-based fixture. A full bare scalp, uncut chin, useful zygion/temple shape and natural value range are still needed. Image licenses are per-photo, not a blanket right to redistribute an artist's work; no reference photos are bundled in Storybook.

## Five-axis ArtCraft reading and concrete geometry consequence

| Axis | Observed source/medium rule | Head-only implementation acceptance |
| --- | --- | --- |
| **Topological continuity** | A credible adult head is **one continuous cranial vault → temporal recession → zygomatic projection → gonial turn → menton**, not a media-pipe face-mask stretched up or a series of disconnected oval stickers. | Compare *18 paired contour turns*, including seven independently named near/far pairs. No crossed contour order; show each actual source-vs-render displacement. |
| **Vector flow** | Actual coloured-pencil marks follow the changing frontal, malar and mandibular surface tangent; hair, pores and cheek have different directional fields. | No generic diagonal hatching can excuse a wide cranium or misplaced jaw. Repair skeletal projection before material fibres. |
| **Pressure / weight** | Early transparent optical strokes reserve substrate highlights, while medium-pressure glaze and local opaque supporting layers build continuous light-to-dark mass (Janie Gildow/Justin Maas processes). | Measure *five real native-pixel tonal ROIs* separately through existing CLI. Do not derive RGB from the ANAT1 mesh or register photo values by painting them into the film. |
| **Rhythm** | Real 3/4 heads exhibit a different near/far temporal span, nonmirrored malar arcs, varied turn curvature, and local cast-shadow hierarchy. | Show actual residual lengths at all 18 places. Prevent x/y independent scaling from erasing too-wide cheeks or asymmetric cranial vault. |
| **Microtexture** | Multiple coloured pencil passes create paper-tooth breaks, local warm/cool overlaid chroma, fibre-direction changes, and precise versus soft edges. Elena Pancorbo and Jesse Lane are technique-only benchmarks. | Review 1× native frame and 3× crops *after* macro shape/value gate. Adding more stipple never resolves a deficient head silhouette. |

Artist/process references, technique-only:
- [Elena Pancorbo portfolio](https://www.elenapancorbo.com/) — layered skin chroma and volumetric eye/cheek construction.
- [Jesse Lane gallery](https://www.jesselaneart.com/gallery) — deep value mass, rich local fibre detail and focal sharpness.
- [Janie Gildow paper/pressure instruction](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf) — controlled pencil pressure, paper tooth and burnish.

## Concrete Storybook addition

Add **Macro ArtCraft · Original-source versus native-head contour**, directly inside the existing **Video Production / Film Looks / Colour-pencil** local-only annotation story. No new story folder or image asset. Works only from the independently clicked 18+18 **real image-pixel** contour coordinates already in the atlas.

For comparability when photo and render were saved at different pixel sizes and artboard positions, align by a single scale = (native output cranial-apex-to-menton height) / (source cranial-apex-to-menton height), then translate the reference apex onto the output apex. **Never** apply separate x/y normalization, shape warp, rotation or nonrigid point movement. The exact residual vector from each projected source contour anchor to its corresponding native output anchor exposes actual geometric differences. Show native pixel lengths, RMS as a fraction of output head height, max difference, and log difference of cheek-span/head-height ratio. The project's existing preliminary `0.105` log-aspect and `0.045` normalized RMS limits are diagnostic-only warnings, never passes.

Native overlay features:
- Blue source-projected ring, red native-output dot, dashed anatomical discrepancy line. Numbered IDs, ranked five worst landmarks, controls for 5/all/hidden; all 18 available for deep review.
- Original local output screenshot is shown **without filters, cropping, resampling to false proof or exported overlay geometry**. An SVG overlay belongs only to the browser review and never to the actual pencil film.
- All partial, duplicate, flipped, out-of-bounds, incomplete, anatomically crossed, and degenerate inputs fail closed; no false alignment.
- Numerical closeness never sets `artistApproved`; all states retain explicit "unapproved" and ART HOLD.
- Focused unit fixtures use **synthetic coordinates only**, not alleged human reference annotations. Native Playwright checks actual browser file uploads, independently placed synthetic points, vector count/scope and replacement reset; these tests prove UI/mathematics, not ArtCraft beauty.

## Next highest priority: actual art
1. Independently inspect **one** natural, legally sourced, sharp, complete 3/4 *photograph* with a clearly visible cranium, both temples, zygions, mandibular turns and chin. Verify file-page license and unchanged original resolution/bytes first.
2. Independently annotate all 18 points on the true photo and a **real 1×** finished Storybook-generated head screenshot; record five non-overlapping actual skin-shadow samples on *each* image.
3. Use the new residual arrows to find **which original cranial parietal/temporal/zygomatic/gonial Bezier/control points must be repaired**. Redraw those source geometry curves in `colored-pencil-first-character.ts`; do not simply scale the whole head until the metrics pass.
4. Re-render the same original scene in 16:9 and 9:16 at final native output, review matched contours, value/texture at 1×/3×, animations at multiple frames, and only then begin **one** eye in a separate PR.

**Release status:** measurement overlay and testable geometry diagnostics can merge when CI is green. The *artistically completed head* cannot be claimed or promoted until real-photo evidence and independent art critique pass.
