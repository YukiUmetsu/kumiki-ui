# Paper Sheet Fibre Control Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and complete the verification steps before release.

**Goal:** Preserve tactile paper marks at an appropriate scale and contrast on independently authored sheets.

**Architecture:** Add optional `fibreScale` (0.25–2) and `fibreIntensity` (0–1) to `PaperCutLayer`; omission preserves the existing pattern and opacity. Reuse the seeded, sheet-anchored pattern via deduplicated SVG pattern references for authored scales. Apply the controls to the existing royal face and neck sheets without replacing contour geometry; expose a focused wing comparison in the existing Garden story. These controls do not claim real fiber physics or source-qualified material fidelity.

**Tech Stack:** TypeScript, React SVG, Vitest, Playwright, Storybook.

- [x] Add tests for default compatibility, invalid values, per-sheet pattern/opacity, stable references and frame seeking; observe the expected failure.
- [x] Implement bounded controls and apply the reviewed tentative face treatment; retain existing behavior for omitted fields and all non-target sheets.
- [x] Expose a Garden comparison, document bounds and limitations, and capture actual 1×/3× outputs in both aspects.
- [x] Run focused tests, typecheck, Storybook browser checks, registry fixture and independent visual review. Keep facial art and motion gates open unless independently met.

Local verification: focused PAPER1/royal suites, typecheck, targeted Storybook checks, registry validation and a clean fixture compile with a consumer of both fields passed. FilmStage rendered both 610 frames and passed landscape random seeking; the independent review is a narrow material assessment, not portrait or motion acceptance.

The complete `npm test` run finished with 3,990 passing and the same eight failures in six coloured-pencil/crayon files previously reproduced on untouched base `1a00234a`; it is not a green full suite. The eight-second act-two export decoded 240 frames at 30 fps, but has not received normal-speed visual acceptance.
