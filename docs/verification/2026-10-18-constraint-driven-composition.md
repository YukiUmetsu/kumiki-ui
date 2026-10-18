# Phase 2 composition verification — 2026-10-18

Follow-up: the Network Journey baseline failure recorded below is fixed in the [complete integration](2026-10-18-network-journey-composition.md). This document preserves the initial Phase 2 results.

Branch: `feat/constraint-driven-composition`, forked from main `e0c265615a547eae7cbbfaeae124cadd5aed5202`.
PR: https://github.com/YukiUmetsu/kumiki-ui/pull/2

## Delivered

- Public source-installable `ExplainerStage`, `ExplainerVisual`, `ExplainerText` with DOM-measured fonts, semantic protected output regions, responsive landscape/portrait, line budgets and complete readable error fallback.
- Pure `planExplainerLayout` delegates to merged protected-text constraints. Hard breaks count as lines and candidate slots respect safe insets near output edges.
- Additive CC1 compilation and controlled-preview contracts use existing critical camera projection and semantic tracking-window APIs. Arrival is included in the exclusive tracking interval. Existing two-argument compiler behavior remains unchanged.
- Five Storybook examples and browser tests for actual bounds, CJK, typography changes and impossible-layout fallback. No new runtime dependencies, animation clocks, image recognition or LLM calls in checks.
- Main/PR visual-contract CI, registry item, consumer fixture and API documentation.

## Local results

| Command | Actual result |
|---|---|
| `npm run typecheck` | Passed |
| `npx vitest run --project unit tests/explainer-layout.test.ts tests/explainer-stage.test.tsx tests/camera-composition-contract.test.ts tests/cinematic-camera-contract-react.test.tsx tests/visual-constraints.test.ts tests/visual-production.test.ts tests/cinematic-camera.test.ts tests/network-journey-hardware.test.ts` | 8 files, 60 tests passed |
| `npm test -- --project unit` | 92 files passed; 1 file failed. 1348 tests passed; 1 failed. See baseline below. |
| `npm run lint` | 0 errors; 1 existing unused-disable warning in `tests/e2e/probe-overflow.spec.ts` |
| `npm run registry:validate` | 69 items valid |
| `npm run registry:smoke` | 69 items, 687 staged files |
| `node scripts/registry-fixture.js --item=explainer-stage` | 3 items, 21 files compiled in isolated consumer |
| `node scripts/registry-fixture.js --item=cinematic-camera-director` | 17 items, 52 files compiled in isolated consumer |
| `npm run build-storybook` | Passed |
| Local Playwright browser suite | Could not start Chromium: macOS `MachPortRendezvousServer` sandbox permission denial. No local browser pass claimed. |

Consumer installs used a temporary writable npm cache to avoid the sandbox's read-only user cache. No package versions or dependencies changed.

## Existing full-suite failure

`tests/network-journey.test.ts` — “compiles the 90-second benchmark in both aspects with real MG1/VT1 fragments” fails because the existing authored `approach-service` camera shot leaves its safe region at frame 1448 and `recipient-connection` at frame 2360.

Confirmed independently using `git archive` of untouched main `e0c2656`, its original camera compiler and original test. The failure is identical. The visual-contract workflow remains scoped to relevant component and contract suites; it does not claim the full repository unit suite is green. The authored demonstration's camera shots were left unchanged to keep this phase focused.

## Independent review

Review findings fixed with regression coverage: newline budgets, edge-safe placement, deduplicated layout callbacks after parent rerenders, forwarded typography attributes/same canvas ancestry, exclusive tracking endpoints and stable measurement-element identity through pending/ready transitions.

## Browser CI

Initial implementation run: https://github.com/YukiUmetsu/kumiki-ui/actions/runs/39150113945
Initial result: typecheck, 60 unit/integration tests, registry checks and both clean installs passed. Browser checks for landscape-to-portrait reflow, CJK and changed typography passed. The impossible-layout check verified the alert and full readable fallback, then failed because its final selector counted the deliberately hidden measurement paragraph. The selector now explicitly excludes aria-hidden text. See PR checks for the subsequent browser rerun and its screenshot artifact.

## Limits

Protection is only as accurate as authored/projected bounds. Sparse explicitly requested camera sampling does not cover skipped frames. Geometry checks do not certify aesthetics, material quality or unmodeled occlusion. Text typography supports ordinary CSS classes, styles and data attributes; scene-owned positioning is reserved. Impossible layouts require content/composition changes before video export. Composition presets and a crafted asset library are outside this phase.
