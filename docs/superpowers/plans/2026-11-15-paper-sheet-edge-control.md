# Paper Sheet Edge Control Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and complete each checked step before release.

**Goal:** Allow authors to tune the existing cut-edge treatment per opaque sheet without affecting neighboring sheets or the scene-wide default.

**Architecture:** Add an optional bounded `edgeIntensity` multiplier to `PaperCutLayer`; omission preserves the exact existing rendering. PAPER1 validates the field before rendering; its base cut line and highlight both scale by the multiplier while geometry, fill, holes, shadows and fibre remain unchanged. The existing garden Storybook applies the control to one identified sheet to make the difference inspectable. This is artistic direction for a rendered edge, not physical thickness or evidence of approved faces.

**Tech Stack:** TypeScript, React SVG, Vitest, Playwright, Storybook.

- [x] Add a regression test that verifies independent sheet edges, omission compatibility, invalid values and real SVG output; confirm it fails for the missing capability.
- [x] Implement the optional multiplier in the PAPER1 layer type, input validation and renderer; retain existing default markup and behavior.
- [x] Add an interactive control to the existing Garden page and document the public contract and limits.
- [x] Run focused tests, typecheck, registry validation and clean-install smoke, capture and inspect Storybook at both end values; record results before integrating.

Verification (local): the focused PAPER1 and royal suites passed 28 tests; the new Garden browser interaction passed, and device-scale-3 stills were independently reviewed. `npm run typecheck`, `registry:validate`, `registry:smoke` and `registry:fixture -- --item=paper-craft` passed. The fixture reported no built-in consumer template, so a separate consumer importing `PaperCraftStage` and assigning `edgeIntensity` was compiled successfully in the kept clean fixture. `npm test` reported 8 failures in 6 coloured-pencil/crayon files; running those same six files against the untouched base commit `1a00234a` reproduced the same 8 failures. These results do not approve the royal face or establish full-suite green.
