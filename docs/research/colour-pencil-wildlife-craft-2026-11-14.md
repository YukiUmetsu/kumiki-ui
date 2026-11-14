# Colour-pencil wildlife craft — layered songbird milestone

Date: 2026-11-14. Based on the user's twelve supplied coloured-pencil illustrations, especially the fine-feathered perched bird, partially completed bird, and fantasy creature. This is an independently designed bird, not a tracing or a redistribution of those images.

## Implemented

- CP1 optional `opaqueSupport`: deposits a paper-coloured, fully occluding anatomical support once first pencil marks arrive; completes after 16 frames. Pigment still displays paper-tooth holes. Existing scenes are unchanged by default.
- Original copper and cobalt songbird composed from 19 source-authored regions: two tails, back wing, torso, flank, copper breast, throat, near wing, coverts, head, face mask, cheek, eye ring, eye, catchlight, two beak sections, and two separately planted feet.
- Original branch, twig and leaf clusters with bark fibre, vein detail, distinct colour gradients and more than a dozen authored graphite and feather-line groupings.
- Parent hierarchy and time-addressed motion: tail and wing react; head turns subtly; eye and catchlight blink; lower beak opens slightly; feet retain contact with bark.
- Original 420-frame / 30fps production shot list with 16:9 and 9:16 layouts, and two interactive Storybook pages under Video Production / Film Looks / Colour-pencil / Wildlife.
- Focused unit and browser contract tests for anatomy, occlusion, deterministic seek, aspect layouts and export schema.

## Quality review protocol

Inspect frames 0, 80, 180, 225, 255, 291, 350 and 419 in both layouts. At full-size image resolution, check feather grouping, chest/cheek colour transitions, eye-ring alignment, beak hinge, pupil catchlight, grounded toes, tree-bark microtexture, caption safety and pigment paper tooth. Seek 350 to 55 to 350; compare geometry without imposing byte-for-byte PNG identity on browser antialiasing.

The bird must remain opaque at full colour completion: scenery strokes must never show through its chest or face. Body, wing, tail and head materials should be visually different. Validate that fine feather strands retain legibility when downsampled to video resolution and the frame is not overloaded with repeated parallel patterns.

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
