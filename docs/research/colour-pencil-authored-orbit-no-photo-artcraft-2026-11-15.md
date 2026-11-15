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


## ArtCraft v9.1 continuation — structural reconstruction, not an image filter

**Active skill:** locally mounted `artcraft-v9.1` (main ArtCraft plus `art-reference-research`, `art-reference-structural-study`, `art-2d-character-craft`, `art-material-study`, `art-fidelity-review`). Real renders and the stage gates above control acceptance; passing CI does not establish artistic fidelity.

### Reference evidence, rights, and visual observations

- [CC0 2025 *Wild Red Fox* by T.Voekler on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wild_Red_Fox.jpg): directly inspected the 960×1020 preview and original-size web rendering. A photographed fox at rest has an *elongated* cranial-to-muzzle taper, dark brow touching the eye, one dominant profile eye, ears attached **behind the head**, long neck merging with a thinner thorax, non-cylindrical long forelegs, and a brush-like tail whose pale tip really occurs at its end. This source is **anatomy/process evidence**, not a pixel image pasted into the rendered output. Its fox looks right; our original fox looks left and has different composition. Pixel-identity and exact ratios are deliberately **not claimed**.
- [Darren Gwatkin, *Fox — Early Morning Gaze*](https://www.gwatkinartworks.co.uk/wildlife-art): directly inspected public close-ups. A very dark thin, occluding orbital upper rim, small amber iris and asymmetric specular glint sit among tens/hundreds of form-directed, colored-pencil hairs; cool gray cheek hairs turn outward and downward from the socket. **Artist technique only; do not trace artwork or ship its pixels.**
- [Claire Milligan, wildlife tutorials / *Fox*](https://www.clairemilliganart.com/patreon-video-tutorials): colored-pencil fur is organized in anatomical growth sections with distinct jaw, ear, throat and tail gradients. Some tutorials mix watercolor pencil with dry pencil, so they are **not** evidence for the physics of our exclusively dry-pigment implementation. **Artist technique only.**
- [Bonny Snowdon, *Drawing textured fur on drafting film*](https://bonnysnowdonacademy.com/drawing-tips/how-to-draw-textured-fur-on-drafting-film/): establish structural fur-growth angle in early pencil layers, build deep/different darks and use subtle subtractive light picks. The current code uses layered additive paths and a white-reserve mask; a true eraser/indent simulation is still absent. **Technique only.**

### Shape graph and v9 five-axis targets

| Semantic component | Attachment/topological constraint | Line/flow and material constraint | Rejected shortcut |
| --- | --- | --- | --- |
| `ear-far`, `ear-near`, inner cartilage → `head-main` | Both outer ear silhouettes **intersect** the actual cranial envelope, and are painted first so the skull hides the root; inner cartilage follows the parent rather than floating | Inner ear hairs grow towards pinna base, with varied dark sepia and lighter buff/cream pencil strokes | Independent outlined gray triangles on top of a round head; this is a real regression observed in the first silhouette reconstruction |
| `head-main` → `muzzle` → `rostrum-bridge` → `nose` | Nose-to-bridge must form a visible tapered profile in the *left-facing* authored geometry | Convex forehead/core/cheek surfaces have distinct curved fur flows, and form-directed russet/umber/cream coats | A disconnected flat beige horizontal snout sticker or uniform diagonal crosshatched orange ball |
| `periocular-form` → `mask` → `eye-near` | One dominant near amber eye; the far orbital region is partially **occluded**, not a second equal glossy eye; lid/wet glint remain independent | Dark sharp upper-lid and softer lower tear trough; rooted fur turns around rim and into cheek | Cartoon pair of big eye ellipses or two stylized clock irises |
| `cheek-ruff` + `neck-ruff` → `chest` → `body` | Surface planes overlap while root tufts remain attached, head sits on neck/shoulder | Root-tracked short medium/long undercoat and reflected cool gray, not one isolated floating white bib | Jagged sticker trapezoid, uniform paper speckles and excessive plain white facets |
| `tail-back` → `tail-tip` | Tail-tip white region must touch **actual tail end**, not appear in the middle of an orange tube | Warm russet/sepia undercoat and long fine gold hair; tip cream, chest and cheek have separate pencils | Gray elephant tail, paper-white oval applied in middle, sparse evenly spaced long slashes |
| `foreleg-left` + `foreleg-right` → floor | Narrow attached legs with uneven ankle/paw contours and toe crease contact | Brown/black guard hair flows downward; darkest accents at paw joints and toes | Straight-sided dark charcoal boot blocks |

**Measured local topology on authored geometry (not photographic fidelity):** independently rasterized the candidate Path2D Béziers to verify meaningful positive-area overlap before adding the browser assertion: far ear-to-skull overlap approx **860 local subpixels** and near ear-to-skull approx **1184** when sampled at 1px on 340×280 SVG-local canvas. The production e2e uses a separate Chromium `Path2D` and `isPointInPath` measurement on actual Storybook SVG data in **16:9 and 9:16**, requiring both overlaps >12 samples and confirming the ears are drawn **behind** the head.

### ArtCraft iteration ledger

1. **Baseline output:** actual v2 foundation screenshot. Large spherical red head, rabbit-like equal ears, straight cream muzzle, nearly bilaterally symmetrical wide eyes, charcoal legs/gray blob tail. Artwork demonstrably below the reference.
2. **Macro rebuild:** revised 15 original SVG semantic paths and authored first differentiated rust brush-tail palette, head, narrow muzzle/bridge, shorter ear geometry, shoulder, chest, hindquarters and slender forelegs. Original CP-F1 3-pass material renderer retained. **v3 visible review: still crude.**
3. **Meso correction:** far eye converted to partially hidden shadow seam; near amber pupil remains dominant; left-facing rostrum and forelegs further tapered. **v4 screenshot revealed a *regression*: the ear roots literally floated in front of the shortened skull.** This is why a passing snapshot-only test is not enough.
4. **Attachment repair:** moved both ear masses *behind* the skull, extended cartilage into actual cranium and added a geometric ear-root/cranial-overlap browser gate. Preserve source-free `PencilDrawing` output.
5. **Material-detail rebuild:** separate warm russet/brown paper-point fibers rooted around head and orbit, inside each ear, along shoulder, neck and breast and down both forelegs; cream tail-tip moved to actual outer brush end. Microfur is generated from named deterministic Bézier root guides, never sampled photographic pixels.

### Art hold and limits

The illustration is an original programmatic **CP-F1 colored-pencil** drawing, not a photo edit. Yet the CP-F1 SVG renderer still relies on a relatively opaque vector tonal-gradient understructure and large contiguous silhouette masses. Real pencil colour stacking, variable-point pressure, layered optical mixing, individual hairs, anatomy source-match and 1×/3× visual craft are not yet source-faithful. An exact artist-owned pencil painting is not the reference-identity target, and no such painting may be traced. No complete local high-resolution source-art crop/semantic mask or paired five-axis quantitative study was available in this session, so the strict ArtCraft visual fidelity gate remains **BLOCKED**. Work next on narrower skull/neck, face and chest light planes, ear tufts, more convincing brush fur and true pencil stroke contact; perform independent visual approval before any PR merge.
