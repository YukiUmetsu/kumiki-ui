# ArtCraft CP-F1 — photo-free fox orbit construction and raster provenance audit

Date: 2026-11-15
Status: **research / unapproved artistic quality**
Scope: existing `Video Production/Film Looks/Colour-pencil`, original CP-F1 `PencilFoundationStudio` and the separate CC0 dry-head research canvas. No new Storybook folders.

## Why this is NOT a photo filter

`PencilDrawing` receives authored paths/landmarks, a 3-pass per-region CP-F1 pencil specification, deterministic `hatchPencilRegion` pigment marks, pressure-dependent fine `pencilMicroDeposit` paths, occlusion support, paper-tooth masks and (for solids) SVG vector tonal-gradient support. It **does not load, trace, composite or pixel-sample a photograph at render time**. A vector gradient or solid paper matte is not a photograph, but it is also not equivalent to a real wax-pencil mark: the finished source-free fox remains visually stylized and below the linked handmade pencil references.

`ReferencePencilAtelier` has **two different products** which the UI now labels accurately:
1. The **ordinary photo-to-pencil output** places photographed pixels under linework when `wash>0`. It is a legitimate stylization mode but must never be presented as purely hand-drawn pencil.
2. The opt-in **CC0 photo-measured dry-head plate** starts from ivory paper and calls quadratic `moveTo/quadraticCurveTo/stroke` drawing primitives; source bytes only guide form/value/color and are placed in a *separate* reference canvas. It is code-drawn, but **not independently authored original anatomy**.

Both CP-F1 and dry-head modes expose distinct `data-km-pencil-render-method` provenance. A native Chromium test instruments `CanvasRenderingContext2D.drawImage` and `putImageData` before React mount and rejects those operations on the dry-plate canvas. Original CP-F1 browser proof rejects `<image>`, `<foreignObject>` and `<feImage>` and requires the actual vector pigment and graphite marks in 16:9 and 9:16. Provenance is a falsifiable engineering check, **not a visual-quality certificate**.

## Real references — observation and rights

| ID | Primary art / material source | Specific observation | Rights / usage |
| --- | --- | --- | --- |
| FOX-EYE-A | [Darren Gwatkin, *Fox: Early Morning Gaze*, wildlife artwork](https://www.gwatkinartworks.co.uk/). [Artist fox-eye image at original portfolio image URL](https://static.wixstatic.com/media/8c1f3a_1629b219674c4e28b41ac03c9888cfda~mv2.jpg) | The amber iris is held inside a nearly black, tapered upper-lid/outer-canthus mass; surrounding short russet guard hairs flow away from the orbital rim in changing directions; a small glint interrupts the dark pupil. Close-up image retrieved at web/preview resolution, not calibrated tooth microscopy. | **Technique-only**. Artist retains artwork rights. Do not trace, crop into repo, or import pixels. |
| FOX-EYE-B | [Claire Milligan, *Fox* and *Cat Eye Study* technique demonstrations](https://www.clairemilliganart.com/patreon-video-tutorials) | Wildlife fur builds from root-following colored-pencil strokes; an eye is shaped by darker orbital fur and a specular highlight, not a white cartoon ellipse. Mixed watercolor-pencil tutorials are **not** evidence that our dry-only renderer physically simulates water diffusion. | **Technique-only**. Do not reproduce the paid tutorial, source photo or artist drawings. |
| PENCIL-GRAIN-C | [Alyona Nickelsen, *Ask Me Anything* (2017)](https://coloredpencilmag.com/amaalyona/) | Dark, widely spaced nibs over very pale substrate create conspicuous false grain; carefully layered sharp contacts build tone with color separation instead of random stipples. | Text/process reference; no artist artwork or imagery copied. |

References were **visually reviewed at publicly available resolution**, including fox eye and portrait overview imagery. This is not a verified source-identical fox reference sheet. No 18-landmark identity/fidelity claim is made for the source-free fox.

## Five-axis deconstruction → actual part attachment

| Axis | Anatomical/art evidence | Implemented rule, named part | QA / remaining |
| --- | --- | --- | --- |
| Topological continuity | Upper eyelid attaches along oblique fox brow; tear duct and lower lid remain continuous with cheek | New `periocular-form` is a **single transparent multi-mass orbit/cheek layer**, *beneath* `mask` and `eye-near`/`eye-far`. The near cornea closes to a tapered almond; far eye compressed in 3/4 perspective. | Existing whole-head silhouette is still too round and fox-muzzle proportions need independent source measurement. |
| Vector flow | Eyelash/guard-hair roots rotate around the eye then into malar cheek | 3 distinct `pencilRootedFur` root curves with different tangent directions, root counts, layered pigmentation and separated orbital volumes; eye is not textured by a screen-wide noise field. | Fine hair roots still share a simplified head surface; compare a true 1× and 3× browser macro. |
| Weight | Focal orbital rim dark/sharp, lower tear-trough warm/soft, glint isolated | Tight fine near/far eyelid paths and amber iris, thin black slit pupil; dark upper-lid contact is stronger than lower-lid/cheek pigment. | Browser proof and isolated pupil/glint crop must be inspected before approval. |
| Rhythm | Handmade fur reverses direction gradually and mixes short, long, faint, dark contacts | Deterministic colored-paper fiber seeds on authored curved tracts; no loose point cloud or arbitrary repeated tick spacing. | More form-specific individual guard hairs, not generic crosshatches, still needed. |
| Texture | Wax pencil pigment overlaps with visible but subordinate paper tooth | CP-F1's actual three named layers, pressure-dependent micro-strokes and tooth mask remain. No photo-filters or pixel textures. | Flat vector-tonal support visually dominates. Reconstruct physical multi-scale pigment coverage before any artist-grade claim. |

### Reference → construction matrix

| Critical feature | Source | Measured/observed goal | Code target | Actual render/proof |
| --- | --- | --- | --- | --- |
| Outer orbital roof | FOX-EYE-A | Thick superior edge overlies a shallower inferior edge | `periocular-form` + `mask` + fine eye contours | `pencil-foundation-fox-landscape.png`, existing foundation browser workflow |
| Eye perspective | FOX-EYE-A | Far eye narrower/smaller than near | `eye-far` and `eye-near` distinct non-circular bounds and path curvature | 16:9 / 9:16 screenshot and deterministic unit assertion |
| Under-eye fur connection | FOX-EYE-A, FOX-EYE-B | Attached fine directional hairs, not a detached dark mask | `pencilRootedFur` 3 tracts with alternate pigment pressure and bending | Screenshot macro and 3-axis stroke-path continuity inspection pending |
| Paper tooth | PENCIL-GRAIN-C | Correct multi-scale layered pencil contact, not uniform diagonal scratches | CP-F1 texture + fine deposition + reduced dark edge dominance | Pixel macro still looks grainy: not accepted |

## Actual pre-change ArtCraft critique

The browser-produced foundation fox at `tests/e2e-storybook/colored-pencil-foundation.spec.ts` was inspected. **Visible defects**: broad spherical/oval orange skull, almost symmetrical clock-like eyes, triangular ear interiors, nearly flat malar and bridge planes, geometrically even muzzle and insufficient independent fur-root detail. Compared with primary wildlife artwork, this is a stylized blockout, **not a believable realistic colored-pencil fox**. The present changes prioritize the orbital **macro/meso** planes and canthi before further scratches.

## Acceptance / release hold

- Run typed-unit/Fibre/CP-F1 and browser-native foundation and CC0 photo-provenance workflows; collect exact commit+artifact links.
- Open actual 1× and 3× fox eye/cheek and compare against pre-change screenshot, check both aspect ratios, glints, anatomical continuity and visual craft. If not clearly better, iterate or revert.
- The source-free human portrait must pass the separate independent ArtCraft v9 human anatomy/portrait fidelity gate; it is still **unapproved**.
- Full ArtCraft reference-study/structural-detail source crop manifests remain incomplete because the artist-owned images are only available for technique study; cannot claim a passing source-matched pixel release gate or redistributed reference art.
- Keep PR #409 **draft/unmerged** until actual material and character quality meet the intended references. CI alone is not artistic acceptance.
