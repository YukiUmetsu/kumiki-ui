# CausalSystemStage — signed causal models with evidence, interventions and loops

**Status:** Qualified for release review. Automated checks and agent render review are recorded below. **Human review is pending.**
**Catalog phase:** Phase 4 explainer components, [doc 20 P1.3](../20-explainer-video-build-plan.md). Storybook: **Visual / Causal System Stage**.
**Scope:** Signed links with evidence classes, `do(X = state)` interventions with qualitative propagation, counterfactual panels, feedback loops and measured layout. A stage shows the **stated model**. It does not certify that a real-world causal model is true.

## Public API
- `CausalSystemSpec`: `id`, `title`, `eyebrow`, `modelNote` (the honesty badge), `notes`, `fps`, `nodes`, `links`, `beats`.
- `CausalLink`: `from`, `to`, `sign` (omit when unestablished; unsigned links cannot close a loop), `evidence` (`mechanism | experiment | observational | assumed`), `source`, `presentation` (`arrow` is refused for observational links).
- `CausalBeat`: `establish`, `reveal`, `causal`, `loops`, `intervene`, `counterfactual`, each with `caption`, optional `headline`, and `durationFrames`.
- `validateCausalSystem`, `layoutCausalStage`, `evaluateCausalSystem(spec, frame)` (pure, seek-safe), `causalSystemDuration`, `findFeedbackLoops`, `propagateIntervention`, `checkCausalGeometry`.
- `CausalSystemStageView` (`registry/visual/causal-system-stage-react.tsx`): a `forwardRef` div around an SVG. It takes `spec`, `frame`, `width`, `height`, optional `family` and `onDiagnostics`. It owns no clock.

## Rules enforced
- Observational evidence is drawn as a **dashed association** with a verb chip ("moves with" / "moves against"). It is refused as an arrow.
- A causal claim over observational or assumed evidence is refused (`causal-claim-unsupported`).
- Intervention on an unknown node, or on a node with no incoming links, is refused.
- A feedback loop with an unsigned link is refused (`loop-unsigned-link`).
- Conflicting paths are reported as ambiguous, not as a direction.
- Direction is shown in words on verb chips (`raises`, `reduces`), not `+`/`−` symbols.
- Layout is automatic: no authored positions. Boxes that overlap, links through nodes, and crowded or overflowing text are reported as errors, never drawn silently.

## Changes in this pass (P1.3 repair)
1. The React view was out of step with the core: it read `edge.sign`, `layout.captions` and `layout.statuses`, none of which exist, and it skipped the header, readout card and footer. It now renders the current contract: eyebrow, title, honesty badge, readout (label, statement, detail), counterfactual titles, do() tags, loop badges, notes and legend, with verb chips in place of sign circles.
2. The verb-chip search covers every segment of a link and several offsets from it. Before, it sampled only near the target and could place a chip over a node.
3. Node labels wrap to the tallest line count any label needs, each at the narrowest width that keeps that count. Nodes hug their text and the gaps between layers stay open. Before, a single long unwrapped label set every column width.
4. Portrait layer gap: `0.058 → 0.045` of the short side. The verb chip still fits the band between rows.
5. Stories: broken-model refusals gained the `eyebrow` field the spec requires, which removes the crash in Refusals. Model labels and captions were shortened where the readout card or a column could not hold them. The cooling model was reduced to two layers, so its counterfactual fits in portrait. The honest refusal still fires for crowded specs.
6. `tests/tmp-causal-system-stage.test.ts` was renamed to `tests/causal-system-stage.test.ts`.
7. An unused helper and an unused parameter were removed, so the causal files type-check.

## Acceptance evidence
| Check | Command | Result |
| --- | --- | --- |
| Layout, validation, loops, interventions, refusals, seek parity | `npx vitest run tests/causal-system-stage.test.ts` | 10 of 10 passed |
| Storybook Walkthrough and Refusals (Chromium) | `npx vitest run src/visual/causal-system-stage.stories.tsx` | 2 of 2 passed |
| Story diagnostics, all three domains, both outputs | Playwright read of the walkthrough diagnostics list | No diagnostics for Climate, Economics or Engineering |
| Rendered status at sampled frames | Playwright capture of `data-causal-status` at 4 beats per domain, both outputs | `ready` in every sample; no console errors |
| Registry manifest, clean install | `npm run registry:validate`, `npm run registry:smoke` | 155 items valid; 2059 files staged |
| Catalog parity | `npm run catalog:check`, `npm run catalog:api:check` | OK, 325 entries; tests pass |
| Type check and lint of changed files | `npx tsc --noEmit`, `npx eslint <changed files>` | No causal-file errors; lint clean |

Screenshots reviewed by the agent (not a human): landscape Climate causal beat and Engineering counterfactual. Chips are legible, sit on or beside their links, and the readout reads in order. Human review at normal size is still required, as is the portrait review.

## Known limits
- Text is measured with the injected measurer. The Node tests use a pessimistic fixed-width measurer; the browser uses the real face.
- Two stacked counterfactual panels in portrait leave little height. A model with three layers and a counterfactual will be refused in portrait.
- No numeric magnitudes are shown. Directions follow signs only.
