# ArtCraft failure analysis and new coloured-pencil medium path

Date: 2026-11-14. **Status: implementation prototype, not aesthetic acceptance.**

## User-facing problem — the earlier previews are not acceptable

The actual displayed fox and kingfisher proofs from the preceding PR were smooth, flat vector cartoons with sparse decorative lines. Even after a local isolated 900×506 material proof introduced gradient-like hatching and paper grain, the animals still looked cartoonish: oversized, oversimplified silhouettes did not encode the eye, skull, feather, fur or limb forms found in good colour-pencil drawings. This is a **geometry/shape fidelity failure** and a **pigment medium failure**, not solved by layering more random marks on the same geometry. The prior proof is not a final artistic demonstration.

**Quality principle:** for an editable hand-authored scene, improve anatomy and local topology first; for any photograph-driven realistic illustration, preserve the input's actual anatomy/contours as a source-conditioned tone and mark field instead of trying to reconstruct a full realistic face from eight rectangles. The latter needs permission to use the input photographs. Neither branch claims arbitrary realistic scene synthesis from a text prompt.

## Research

- [Janie Gildow, coloured pencil layering](https://janiegildow.com/): Light pressure in layers, paper tooth, value transitions and selective burnishing matter more than outlines. Avoid solid flood fills with thin decoration.
- [Faber-Castell Polychromos](https://www.faber-castell.com/): multiple translucent layers, dry pencil marks and tooth make luminous colour; opaque underpainting should be used sparingly.
- [Claire Milligan, original wildlife artworks](https://www.clairemilliganart.com/originalsforsale): observational fur/feather form, coherent eye/nose geometry, complex local hair orientation, and paper-grain contrast. Her artworks are **not** available for redistribution and were not copied.
- [Matsui et al. (2004), coloured-pencil strokes directed by region boundaries](https://www.jstage.jst.go.jp/article/aiieej/32vc/0/32vc_0_43/_article/-char/en): supports direction-consistent marking at boundaries.
- [Lu et al. (2012), synthesis of tonal pencil drawings](https://www.cse.cuhk.edu.hk/leojia/projects/pencilsketch/npar12_pencil.pdf): tone and structural contours are distinct stylization problems.
- [Wang et al. (2023), feature-preserving colour-pencil drawings](https://link.springer.com/article/10.1007/s41095-022-0320-6): source-feature preservation, lifted luminosity, reduced saturation. The implementation below is a **new limited heuristic**, not a paper reproduction or the authors' source code.
- [Li et al., Im2Pencil (CVPR 2019)](https://mlanthology.org/cvpr/2019/li2019cvpr-im2pencil/): an illustration-conditioned transformation requires a substantially stronger learned style model for high artistic fidelity; the prototype is not equivalent to such a system.

## Implementation route A — opt-in material-native vector rendering

Files: `registry/video/colored-pencil-craft.ts`, `registry/video/colored-pencil.ts`, `registry/video/colored-pencil-react.tsx`, `registry/video/colored-pencil-materials.ts`.

Adds an optional per-region `craft` profile (medium family, burnish, light, tooth) to CP1. Only opted-in solids receive translucent highlight/midtone/shadow colour gradient; the paper-backed occlusion base remains. A separate 64-unit repeating grain tile uses 850 deterministic pores. Additional seeded grain-stabilized short quadratic micro marks are arranged in three color families, capped to 2100 marks per region for SSR/export control. Opaque transparency behavior of glass/shadows remains unchanged. Heavy graphite contours and broad CAD hatch are attenuated only in craft mode. Previous callers with no `craft` retain their existing rendering.

Enabled in source code for original fox/kingfisher, portrait/landscape and rose/fabric/architecture materials, but **still limited** by those authored silhouettes. Storybook Living Subjects adds an explicit **Layered pencil (new) / Flat vector (old)** A/B selector and burnish slider; both use the identical input geometry so morphology deficiencies remain visible.

## Implementation route B — reference-image-conditioned anatomy-first rendering

Files: `src/video/colored-pencil-photo.ts` and `src/video/colored-pencil-reference-atelier.tsx`.

A second source-conditioned pipeline uses an actual photograph (via user upload or confirmed public-domain test images), producing an RGBA paper-lifted pigment buffer, local Sobel image-gradient vectors, tangent-oriented short colour-pencil strokes, three deterministic mark passes and an absolute frame-to-mark-count timeline. Its options include paper lift, hue/saturation, contour strength, tooth and mark density. **This preserves human/wildlife anatomy already present in the input**, instead of calling a flat oval a fox's skull.

The new **ArtCraft · Reference-guided real anatomy (experimental)** Storybook story lives in the original `Video Production/Film Looks/Colour-pencil` root, no new folder. The browser offers landscape/portrait, two license-checked example wildlife photographs, local PNG/JPEG/WebP upload, drawing playback, frame seek and client-only PNG export. No source image is sent to a project backend.

Public domain sources and attribution:
- **Red fox photograph**: Sarvis John, U.S. Fish and Wildlife Service (public-domain US government work), [Wikimedia Commons file and license](https://commons.wikimedia.org/wiki/File:Red_fox_detailed_photo.jpg). Example image only loaded by direct URL at runtime; bytes are not committed.
- **Kingfisher photograph**: Vincent van Zalinge, prior Unsplash CC0 release (2015), [Wikimedia Commons file and license history](https://commons.wikimedia.org/wiki/File:Perched_blue_and_orange_bird_(Unsplash).jpg). Public-domain/CC0 status belongs to the original upload; do not assume all modern Unsplash images carry the same rights.

An externally hosted reference image can deny cross-origin canvas reads. In this case the atelier reports an error and supports local uploading instead of silently exporting blank pixels. Local File object URLs are revoked after replacement and unmount; 16 MB limit and MIME type allowlist apply. Users should only upload imagery they own or have permission to transform.

## Tests and honesty boundaries

`tests/colored-pencil-craft.test.tsx` guards opt-in backward compatibility, high-density mark bounds, tooth reproducibility, multi-color gradient and all original material studies. `tests/colored-pencil-photo.test.ts` uses a generated synthetic source with orange and blue regions plus a dark eye-shaped feature to validate colour separation, feature-conditioned stroke directions, seed/frame determinism and input bounds. Optional `tests/e2e-storybook/colored-pencil-photo.spec.ts` creates its input image in-browser (no external CORS or test-image download), reads finished canvas pixels and captures both aspects at middle and complete frames. Existing manual-only proof workflow includes the new browser and unit tests; routine pull requests remain on the smaller CI contract.

**Open gates before calling it actual coloured-pencil artwork:** browser screenshots of real USFWS fox and CC0 kingfisher (not just synthetic fixture), 2–4× hair and feather crops, measuring grain/gaps and dark eye legibility, full-speed animated video and source/target five-axis ArtCraft comparison. The heuristic conditioned mode may still look like a filtered photograph with decorative strokes. A true realistic-pencil art engine may require artist-authored detailed anatomy, a licensed reference-driven training dataset, or a local image-to-image model. That is an unresolved visual challenge, not fixed by green unit tests.

## Next craft iteration after this code foundation

1. Use one licensed reference wildlife photograph and manually inspect **the same image** before/after at 1× and 4× for pigment density, stroke alignment, paper exposure and eye clarity.
2. Separate background/foreground segmentation for paper void, material-specific hatching (muzzle fine whiskers vs long fur), accurate local form direction using tensor field rather than only Sobel tangent, true multi-stage deposit order and a temporal stroke construction sequence.
3. Compare source-conditioned output against human-created coloured-pencil artwork by macro-scale semantics, local topology, curvature, stroke widths, micro texture and values (only when rights permit).
4. Review actual 16:9/9:16 exports for frames per second and memory; cap worst-case Canvas reprocessing, and avoid expensive full-frame rerender when only a transport advances one frame.

## Structural-tensor and browser-proof follow-up (same date)

**Source/art evidence at three scales.** Realistic fox coloured-pencil drawings, including Claire Milligan's side-view wildlife portrait and close-up fox-eye examples, establish an opaque furry body broken by hair-direction changes around the brow, bridge, cheek, throat and shoulder; each tuft has a root and a tapered tip. Gary Tymon's kingfisher and Cocomaru's artwork show dark/navy narrow contour accents on a saturated blue crown, individually grouped feather coverts, fine parallel tail fibers and precise eye/bill separation. Artist-owned paintings remain remote technique references only, with no pixel tracing or copied source geometry. Relevant references: https://www.clairemilliganart.com/originalsforsale , https://www.etsy.com/listing/737858800/kingfisher-color-pencil-drawing-print , https://www.lemon8-app.com/@cocomaru_art/7481105821024305669?region=jp .

**Verified, reusable photo inputs.** The actual files on Wikimedia Commons opened and the licensing page was checked: Sarvis John/USFWS red fox (public domain), https://commons.wikimedia.org/wiki/File:Red_fox_detailed_photo.jpg ; Vincent van Zalinge's 2015 kingfisher (CC0 before the 2017 Unsplash relicensing), https://commons.wikimedia.org/wiki/File:Perched_blue_and_orange_bird_(Unsplash).jpg . Do not infer similar rights for new Unsplash photos.

**Technical fault corrected.** The prototype used a signed local 3x3 Sobel gradient for each individual stroke. Isolated noise or high-contrast pixels led to abrupt direction flips and visually random scratches on fur and feathers. A 3x3 averaged 2x2 structure tensor now estimates local edge **orientation without sign**, directional coherence and gradient strength at full source-pixel resolution. Strong coherent regions receive tangent-following strokes; directionless zones use lightly crossed hatch angles. Bright paper is spared and darker tonal regions receive more pigment. Fixed fine/coarse grain remains independent of playback frame.

**Actual construction pipeline:** licensed photo pixels -> source luminance -> smoothed structure tensor -> coherent local tangent and contrast -> paper-aware colour/chroma/base wash -> ordered structural, shadow and finishing strokes -> Canvas progressive deposit and arbitrary seek reconstruction. The newly added story comparator displays the original source image beside the code drawing. Source wash is adjustable; it defaults below full photographic opacity. The marker remains the *illustration engine*, not a claim to have modeled a whole articulated fox in vectors.

**Visual gates:** browser job named ArtCraft Colour-Pencil Photo Proof captures real animal 16:9 and 9:16 output, original image and hero crop and prints pixel variance/coverage. Tests must not promote average pixel coverage to an aesthetic pass. Reference-matched jaw/eye/feather folds, realistic pencil paper grain, stroke-width distribution, attachment continuity and close-up artist judgement remain pending until screenshots are inspected by a reviewer. Avoid a claim of final fidelity without that review.
