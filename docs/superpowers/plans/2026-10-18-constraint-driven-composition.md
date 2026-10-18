# Constraint-Driven Composition Implementation Plan

**Goal:** Deliver the requested public stage and opt-in camera safeguards on a new branch from main.
**Architecture:** Pure planning over registry/visual; DOM measurement at the React boundary; CC1 compiler integration.
**Tech stack:** Existing React, TypeScript, Vitest, Playwright, Storybook and Three.js.
**Spec:** ../specs/2026-10-18-constraint-driven-composition.md

## Global constraints

No new dependencies, animation engine, LLM calls or image recognition. Backward-compatible two-argument camera compilation. Named, normalized protected bounds; actual loaded typography; impossible layouts diagnostic.

## Review focus

- Invalid/nonfinite measurements and coordinates fail explicitly.
- Font changes and narrow output cannot certify stale measurements.
- All declared subjects are protected, not only the first region.
- Moving-target guards use actual frame geometry and named shot coverage.
- Registry installs contain all relative imports.

## Tasks

1. [ ] Add planner tests, observe failure, implement `planExplainerLayout` in `registry/visual/explainer-layout.ts` over `placeProtectedText`; verify.
2. [ ] Add React integration tests, observe failure, implement `ExplainerStage`, `ExplainerVisual`, `ExplainerText` and isolated DOM measurement in `registry/visual/`; verify pending, valid and error states and forwarding.
3. [ ] Add camera contract tests, observe failure, integrate optional constraints into CC1 compiler and controlled director with existing guards; verify unchanged old behavior and tracking failures.
4. [ ] Add stories, deterministic browser geometry tests, manifest entries, docs and CI main/PR coverage. Run typecheck, full tests, browser checks, registry validation/smoke and lint. Record actual results and review the branch before pushing.
