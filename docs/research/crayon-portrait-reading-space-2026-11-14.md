# Crayon classic storybook — safe editorial in 9:16

**Scope:** typography/composition bug fix; not artistic acceptance of the legacy fox or garden illustrations.

## Proven root cause

The classic `CrayonStorybook` rendered `StoryTitle` and a bottom caption *inside the SVG* for portrait. The text uses absolute coordinates independent of subject, scene motion, language length or the luminous disc at x≈421, y≈325. The long tagline can enter that region in a 540×960 frame. This is an unmeasured collision risk, not a font styling issue. Adding margin/padding or shrinking text without reference measurements does not solve it.

## Deterministic mitigation

- The renderer now defaults to **no embedded editorial** for 9:16. Landscape retains the authored title and all original wax geometry.
- An explicit `showEditorial` switch preserves opt-in compatibility for controlled artistic studies. Storybook exposes `editorial=auto|show|hide` on the existing Lantern & Garden page; auto follows the aspect.
- Keep accessible title and explanatory text in Storybook HTML, outside the SVG. No new Storybook folders, changed story IDs or external packages.
- Unit tests cover both aspects, explicit opt-in/opt-out and all four original scenes. Chromium E2E verifies no `<text>` nodes for portrait and the titled 16:9 output.

## ArtCraft v7 gate / remaining

The ArtCraft v7 sequence is **find → inspect → dissect → specify → construct → render → compare → refine**. This change is a safe-area guard, not an art redraw. Re-enabling embedded portrait typography requires actual native Chromium 540×960 evidence at every title phase, measured bounding boxes for *all* foreground elements and text in supported languages, plus visual review of static frames and motion. Human and animal character demos remain `!dev` until their distinct reference-fidelity gates pass. No portrait image fidelity scores or artistic approval are inferred from this test.

Verification commands: `npx vitest run --project unit tests/crayon-storybook.test.tsx`, `npm run typecheck`, `npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/crayon-storybook.spec.ts` and an actual screenshot review when available.
