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
