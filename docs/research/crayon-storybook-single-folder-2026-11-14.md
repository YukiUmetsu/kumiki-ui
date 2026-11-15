# Crayon Storybook — one-folder navigation and ArtCraft release gates

**Status:** Storybook navigation refactor, not visual quality approval. All crayon stories live directly in `Video production / Film Looks / Crayon`. Each art director keeps a clearly named page and its existing Storybook `id`, source renderer, animation controls and preset stories. No new sidebar subfolders, visual assets, or production scene changes.

## User-visible behavior

- Scene Engine, Lantern & Garden, The Wild Hare, Dragon Village, Blue Coat — Portrait Atelier, Blue Coat — Walk & Rigging, Blue Coat — Draw-In Construction, Drawing System, Wax & Pigment and ArtCraft Adult Face Lab each occupy exactly one page below the Crayon folder.
- Existing story identifiers and canvas aspect controls are unchanged so embedded links and automated proof IDs remain stable.
- Unapproved characters, wax studies and the adult face retain `!dev`. Their navigation position does **not** confer artistic approval.
- Regression coverage explicitly checks all ten page titles for extra slashes, duplicate IDs and missing experimental flags.

## ArtCraft acceptance before changing `!dev`

Continue the separate reference-led construction in PR #281. For each character or material, collect verified-rights references, record observed head/face/garment/animal landmarks and real shape/overlap/stroke features, construct full opaque semantic shapes, then capture native Chromium 16:9 and 9:16 shots and matched close-ups at 1× and 3×. Inspect contours, anatomical continuity, layer opacity, negative spaces, directional wax tooth and regular-speed movement. Run region-specific fidelity checks with actual reference and rendered masks; never claim numeric fidelity from a code assertion or an image's mere existence. Release only following independent visual acceptance.

## Validation

Run `npx vitest run --project unit tests/crayon-storybook-organization.test.tsx`, `npm run typecheck`, `npm run build-storybook` and native browser visual QA when available. Do not declare these checks complete without execution evidence.
