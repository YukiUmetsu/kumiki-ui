# 06 — Incremental Roadmap and Acceptance Criteria

**Do not implement the entire catalog in one autonomous agent run.** Each phase produces a usable, installable slice; fix issues before expanding. The [component catalog](02-component-catalog.md) is the canonical scope list.

| Phase | Deliverable | Exit gate |
|---|---|---|
| **0 — Foundation** | pnpm/React/TS/Tailwind/Storybook scaffold; DTCG token parsing and resolved CSS; **Button, Field/Input, Dialog** | Light/dark + 2 anonymous themes, keyboard, CJK, story screenshots, registry install into clean fixture |
| **1 — v0.1 core** | Remaining **12** initial components from catalog, sequentially | Every component passes spec/QA; no unexpected heavy deps; showcase and registry up to date |
| **2 — v0.2 workflow** | Add highest-value form/navigation/data additions after usage evidence | Two independent fixture apps demonstrate customization and compatibility; keyboard and performance budgets met |
| **3 — application patterns** | Search, settings, async progress, resource explorer as justified | End-to-end task coverage and responsive/error/accessibility states |
| **4 — release tooling** | Pinned GitHub release, changelog, migration instructions, token diffs, optional automated update PR proposals | Existing consumers never overwritten silently; fresh install and upgrade smoke tests pass |
| **5 — specialized** | Tree, advanced tables, virtualizers, richer motion as driven by demand | ADR for new deps + accessible composite tests + no regression to core |

## Media track ([docs/07](07-media-foundation.md))

A separate, optional track. Media primitives never become dependencies of the ordinary UI components above, and the 15 v0.1 components are not revised by it.

| Slice | Deliverable | Exit gate |
|---|---|---|
| **M0-A** | `artboard`, `editable-text`, `media-frame`, plus the shared `media-document` schema/validator/exporters they build on | Editable 16:9 and 9:16 visuals; font and asset pinning; pixel-clean raster preview; registry install into a clean fixture |
| **M0-B** | `layer-stack`, `alignment-guides`, `export-preview` | Save/reload round-trip; guides never reach export; crop/overlap diagnostics; measured preview/export parity |
| **M1+** | Typed motion, video adapter, audio/captions, QA harness ([docs/07](07-media-foundation.md), [docs/11](11-rendering-quality.md)) | Not started. Later slices only, and never at the cost of an M0 exit gate. |

Status: M0-A and M0-B items are implemented and installable in isolation; see the M0 row above and the `media-*` specs in [docs/component-specs](component-specs/) for the recorded evidence and the known limitations.

Within **each component slice**:

1. Write the spec from [template](../templates/component-spec.md), including acceptance cases.
2. Reuse tokens/primitives; record any dependency or accessibility tradeoff.
3. Implement behavior first, then typography/spacing/states/motion.
4. Create complete stories and meaningful unit/keyboard tests.
5. Render and inspect screenshots at supported states, themes, densities and widths.
6. Fix clipping/overlap/contrast/interaction defects; inspect WebKit if relevant.
7. Validate registry metadata and install the exact item into a clean fixture.
8. Report commands run, failures/incomplete tests, screenshots and next component. **Stop.**

**Milestone 0 OpenCode prompt:**

> Read AGENTS.md, docs/INDEX.md, docs/01, 02, 03, 04, 05 and 07. Implement only Phase 0. Start by writing a short architecture and dependency plan. Scaffold minimal tooling; implement tokens and Button, then Field/Input and Dialog with full states, tests and screenshots. Validate a real registry install. Do not create later components or claim tests you did not run. At completion provide measured results, screenshots, remaining issues, and actual commands.

## What not to optimize for initially

Component count, glossy landing-page effects, complex theme editors, general drag-and-drop builders, automatic migration of existing applications, runtime npm package publishing, integrations with proprietary branding tools, or AI-generated visual scores. These distract from proving a small set of genuinely exceptional building blocks.

**Release rule:** if a component still has a blocking accessibility, overflow, keyboard, customization or install defect, the release is not done—regardless of how attractive the default screenshot looks.
