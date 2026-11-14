# Colour-pencil wildlife craft — layered songbird milestone

Date: 2026-11-14. Based on the user's twelve supplied coloured-pencil illustrations, especially the fine-feathered perched bird, partially completed bird, and fantasy creature. This is an independently designed bird, not a tracing or a redistribution of those images.

## Implemented

- CP1 optional `opaqueSupport`: deposits a paper-coloured, fully occluding anatomical support once first pencil marks arrive; completes after 16 frames. Pigment still displays paper-tooth holes. Existing scenes are unchanged by default.
- Original copper and cobalt songbird composed from 20 source-authored regions: two tails, back wing, torso, flank, copper breast, throat, near wing, coverts, head, face mask, cheek, eye ring, eye, catchlight, two beak sections, and two separately planted feet.
- Original branch, twig and leaf clusters with bark fibre, vein detail, distinct colour gradients and more than a dozen authored graphite and feather-line groupings.
- Parent hierarchy and time-addressed motion: tail and wing react; head turns subtly; eye and catchlight blink; lower beak opens slightly; feet retain contact with bark.
- Original 420-frame / 30fps production shot list with 16:9 and 9:16 layouts, and two interactive Storybook pages under Video Production / Film Looks / Colour-pencil / Wildlife.
- Focused unit and browser contract tests for anatomy, occlusion, deterministic seek, aspect layouts and export schema.

## Quality review protocol

Inspect frames 0, 80, 180, 225, 255, 291, 350 and 419 in both layouts. At full-size image resolution, check feather grouping, chest/cheek colour transitions, eye-ring alignment, beak hinge, pupil catchlight, grounded toes, tree-bark microtexture, caption safety and pigment paper tooth. Seek 350 to 55 to 350; compare geometry without imposing byte-for-byte PNG identity on browser antialiasing.

The bird must remain opaque at full colour completion: scenery strokes must never show through its chest or face. Body, wing, tail and head materials should be visually different. Validate that fine feather strands retain legibility when downsampled to video resolution and the frame is not overloaded with repeated parallel patterns.

## ArtCraft v6 structural-reference iteration (follow-up)

Reference mode: **style-guided original illustration**, not source-pixel matching.
I inspected publicly viewable examples and technique material; these are study links only,
not redistributed source art or inferred permission to reproduce it.

| Reference and visible characteristic | Failure mode in earlier bird | Code construction |
| --- | --- | --- |
| [Catrin Membery, wildlife goldfinch](https://www.catrinmemberyart.com/wildlife): discrete primary/secondary feather masses, a small bright eye with surrounding tonal shifts, and defined toe-branch contact | Flat wing ribbons, uniformly spaced generic hatches and a bead-like eye | Hand-authored rachis axes, opposing attached barb series, contrasted root grooves and a layered upper eyelid |
| [Claire Milligan, coloured-pencil kingfisher](https://www.pinterest.com/pin/446419381805336706/): blue-copper colour contrast, shaft-aligned wing strokes and different throat/wing mark density | Local feather flow disappeared under global stroke fans | Separate covert, main-wing and primary-feather tracts; each layer retains its own authored pigment |
| [International Artist, Structure and Definition](https://www.internationalartist.com/issues/169/Structure-and-Definition): fine eye and head layering, sharp-pencil highlights, dark areas made from blues and other chromatic notes | Wing/eye lacked enough microstructure to sustain a close crop | Distinct cool highlight barbs and dark blue root grooves, plus a second eye-lid contour |

### Semantic shape-and-attachment graph

- **Wing main**: five separate authored feather shafts, each with five paired barb levels connected at the shaft, moving with the existing near-wing hinge.
- **Primaries**: four independently positioned tapered line networks, rooted in the primary region and following the wing-main parent/secondary motion.
- **Coverts**: three shorter line networks with warmer/lighter accents and a dark overlap boundary.
- **Eye**: three tonal paths (under-eye, dark upper lash and cool lower reflected light); a small separate catchlight remains slaved to the blink rig.
- **Negative control**: free-floating randomized dashes, a uniform comb of equal-length straight lines, disconnected sticker highlights, or an opaque circular eye would not satisfy this structure.

This introduces **12 authored shaft-and-barb networks / 120 directly connected barb marks**.
All are deterministic and time-addressed, and are below the 80-detail-per-region guard. 
Both aspect ratios use the same artwork but independent placement. The Storybook
Wildlife stories now expose **Wing microstructure / Eye and eyelid** inspection
without creating a new sidebar folder or altering exported film.

**Verification scope:** structural-unit checks and two-aspect macro screenshots were
added. No reference-relative five-axis numeric assessment, independent image-crop
match, or normal-speed artistic approval has been recorded in this change. The
ArtCraft release gate remains **pending** until real exported footage is reviewed.

## Known limitations and next craftsmanship work

- This is an original detailed stylized illustration, not yet a natural-history anatomical reconstruction or a copy of any reference image.
- Each part is individually authored but each individual feather barbule is not separately rigged. Wing detail needs higher fidelity and controlled transition at the shoulder joint.
- Flesh-to-plumage pigment transitions, fine erasing/burnishing, form-aware fibre tangent fields, and self-shadow beneath feather groups require better material algorithms.
- Foot contact is authored and frame-checked; formal inverse-kinematics contact constraints and per-toe actuation remain to be built.
- The baseline uses pale underpaint plus paper support. If render inspection reveals white seams between feather parts, refine the opaque mattes and layer edges.
- Visual quality is pending actual Chromium still inspection and normal-speed MP4 review. Passing tests alone never earns an art-quality label.

## Local-first verification

- npm run typecheck
- npx vitest run --project unit tests/colored-pencil-wildlife.test.tsx tests/colored-pencil-science.test.tsx tests/colored-pencil-actor.test.tsx
- npm run film:check -- examples/film/colored-pencil-wildlife.film.json
- npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/colored-pencil-wildlife.spec.ts
- npm run film:frame -- examples/film/colored-pencil-wildlife.film.json --frame=350 --only=landscape
- npm run film:render -- examples/film/colored-pencil-wildlife.film.json --frames=180 --only=landscape

Rights: user-provided reference images are not published as project assets or incorporated into this artwork. The demo contains original authoring geometry only.

## ArtCraft contour-plumage pass — CP wildlife follow-up 2 (2026-11-14)

**Sources inspected as craft references, not copied:** [Janine Sommer's coloured-pencil robin detail](https://shop.janinesommer.de/product/rotkehlchen-fine-art-print-giclee-print-poster-kunstdruck-vogel-zeichnung-3639) shows irregular directional plumage and a bright eye surrounded by darker cut-in values; [Janine Sommer's great tit](https://shop.janinesommer.de/product/kohlmeise-fine-art-print-giclee-print-poster-kunstdruck-vogel-zeichnung-11799) distinguishes solid dark wing edges from fine separate feather threads; [John Muir Laws, *Fast Wing Details*](https://johnmuirlaws.com/fast-wing-details/) explains restrained pale pencil edging after broad feather masses, and deeper underside contrast. Reference image ownership remains with its artists; do not incorporate images, crops or tracing data into the repository.

**ArtCraft defect diagnosis:** previous wing shafts were connected, but chest and cheek largely remained broad geometric copper fills. A universal hatch fan cannot convey the natural change in fibre direction between forehead, throat, breast, mantle, lower flank and wing. Pigment paths also needed to stop precisely at each anatomical silhouette so close-up accents do not escape the body or form stray stickers.

**Semantic construction matrix:**

| Plane | Guide network | Mark grammar | Motion/occlusion |
| --- | --- | --- | --- |
| Copper breast | Three individually authored curved flow guides; 32 shadow/light fibre pairs with irregular row intervals | Mid-value shaft with matching pale pigment on its trailing portion, never a detached bright fleck | Inherits torso parent; region clips fine details, but keeps contour intact |
| Cream throat | One shorter guide with eight fibre pairs | Compact warm shadow and bright neck tip | Follows torso motion and preserves head/neck layering |
| Mantle and flank | Three distinct blue-gray guides, 26 pairs | Cooler optical depth and soft down | Remain under front wing/coverts and share parent transform |
| Crown | Two guides, 18 pairs, with two different sweep directions | Back-flowing crown texture and curled cheek transition | Follows head pose and eye alignment |
| Copper cheek | Ten short feather pairs | Fine dark root and warm highlight tip | Head-anchored; eye ring and pupil remain clear |

**Implementation:** \`plumageTracts\` uses fixed authored start/end flow guides, a stable seed, bounded jitter and a curved quadratic shadow shaft; its light-colored partial segment starts at the same curve's De Casteljau subdivision, so each visible highlight remains attached. Each anatomical part chooses its own shadow/highlight palette and stroke density. The 20+ existing anatomical parts and all three film shots remain unchanged. CP1 adds opt-in \`clipDetails\` for fine marks only; outer graphite contours remain un-clipped and original fields default to their existing behavior. Storybook's existing Wildlife control now includes **Breast plumage and paper tooth** 3.1× inspection in both aspect ratios.

**Structural QA acceptance:** the attached highlight and base share a single curved path and must stay attached under child/parent transforms; no regular V-stamp tiling; details must respect silhouette and remain opaque; low-detail mode must reduce the mark load. These are code- and SVG-structure checks until actual browser captures are examined. Neither reference-pixel fidelity nor real-life species accuracy is claimed.

**Remaining:** direct source/render side-by-side crops and five-axis source-relative metrics; natural-history body/wing silhouette corrections; eyelid occlusion review; planted toe microanatomy; normal-speed 16:9 + 9:16 playback; frame-time/4K profiling and independent aesthetic acceptance.

## Perching-foot ArtCraft pass — four slender digits (2026-11-14)

**Reference:** the perched small-bird coloured-pencil work credited to [Claire Milligan](https://www.pinterest.com/pin/awesome-works-by-claire-milligan-pet-portrait-wildlife-artist-instagramcomclairemilliganartist-with-valen--446419381813888299/) offers a visible toe/branch contact problem to study: narrow scaled tarsi, distinct front digits and rear gripping mass, dark nail accents and contact shadows. This was used for anatomical observation, **not pixel matching, tracing or redistribution**.

**Prototype iteration and rejection:** a locally rendered SVG sketch with one wide palmate foot and four bulging finger shapes visibly resembled a mitten. It failed the ArtCraft shape/topology gate despite having more curves. A second local source-only proof changed the construction to narrow tarsi and four distinctly separated curved digit silhouettes per foot, with thin keratin tips and scale highlights. These local SVG proofs are **not final rendered FilmStage evidence**, and a source-to-finished-frame comparison remains missing.

| Old problem | Revised construction | Remaining uncertainty |
| --- | --- | --- |
| Two broad Y-like toes per foot | Five enclosed component silhouettes per foot: tarsus + four overlapping, slim toes | True three-forward/one-back perspective and occlusion not verified against a natural-history specimen |
| Smooth cylinder-like leg | Short offset ankle/tarsus highlight rings, multiple pigment values | Scales and interphalangeal joints remain simplified |
| Straight toe tips and weak grip | Curved digits with opposing left/rear grip and dark pointed tips; toes extend to the branch's far edge | No modeled force/contact IK; clips and cast shadows unverified in the exported still |
| Reused identical near/far feet | Far/near authored geometry, widths, tint and ankle transforms differ | Some perspective foreshortening still missing |

**Implementation:** original local foot curves on the existing 20-part actor, not added region count. Each foot's five subpaths provide separate negative spaces and a fully occluding paper support. They share a local coordinate system attached at different authored ankle placements (\`translate(147 275)\` far, \`translate(190 274)\` near), keep stable torso-parent transforms, and add four clipped detail traces each. Existing Storybook **Wildlife** control adds **Foot and perch contact** at 4.2× in both aspect ratios; no new folder, no change to 420-frame film schema.

**Gate:** focused unit tests require bounded toe geometry, opaque support, separate closed paths, no toe drift at active poses, two-aspect inspector validity and deterministic frame seeking. The local isolated foot sketch is a development critique only: no actual Chromium or normal-speed movie acceptance. Further improvement requires visual inspection of real scene contact at full resolution (skin/branch intersections, grip direction, scales and talon sharpness) and a natural-history bird reference calibrated for this original design.
