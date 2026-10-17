# 06 — Incremental Roadmap and Acceptance Criteria

**Do not implement the entire catalog in one autonomous agent run.** Each phase produces a usable, installable slice; fix issues before expanding. [02](02-component-catalog.md) is the canonical **general UI** component catalog; [07](07-media-foundation.md) owns the **optional media** component inventory. This roadmap owns sequence, dependencies, evidence and status—not duplicate component contracts. Media implementation details are authoritative in [07](07-media-foundation.md), [08](08-motion-graphics.md), [09](09-explainer-components.md), [10](10-character-audio.md), [11](11-rendering-quality.md), [12](12-infographic-system.md) and [13](13-content-creation-integrations.md).

## General UI track

| Phase | Deliverable | Exit gate |
|---|---|---|
| **0 — Foundation** | pnpm/React/TS/Tailwind/Storybook scaffold; DTCG token parsing and resolved CSS; **Button, Field/Input, Dialog** | Light/dark + 2 anonymous themes, keyboard, CJK, story screenshots, registry install into clean fixture |
| **1 — v0.1 core** | Remaining **12** initial components from catalog, sequentially | Every component passes spec/QA; no unexpected heavy deps; showcase and registry up to date |
| **2 — v0.2 workflow** | Add highest-value form/navigation/data additions after usage evidence | Two independent fixture apps demonstrate customization and compatibility; keyboard and performance budgets met |
| **3 — application patterns** | Search, settings, async progress, resource explorer as justified | End-to-end task coverage and responsive/error/accessibility states |
| **4 — release tooling** | Pinned GitHub release, changelog, migration instructions, token diffs, optional automated update PR proposals | Existing consumers never overwritten silently; fresh install and upgrade smoke tests pass |
| **5 — specialized** | Tree, advanced tables, virtualizers, richer motion as driven by demand | ADR for new deps + accessible composite tests + no regression to core |

These UI phases remain valid and independent. Do not reopen completed UI work merely because the media track gains new renderers.

## Media track ([07](07-media-foundation.md))

A separate, optional track. Media primitives never become dependencies of the ordinary UI components above, and the 15 v0.1 components are not revised by it. **Status statements below are evidence reported by the coding agent, not new verification by this roadmap edit.** The agent must not convert pending checks to passed without running them.

### Delivered and in-progress slices — preserve recorded evidence

| Slice | Deliverable | Exit gate / recorded evidence |
|---|---|---|
| **M0-A** | `artboard`, `editable-text`, `media-frame`, plus the shared `media-document` schema/validator/exporters they build on | Editable 16:9 and 9:16 visuals; font and asset pinning; pixel-clean raster preview; registry install into a clean fixture. **Implemented and reported installable in isolation.** |
| **M0-B** | `layer-stack`, `alignment-guides`, `export-preview` | Save/reload round-trip; guides never reach export; crop/overlap diagnostics; measured preview/export parity. **Implemented and reported installable in isolation.** |
| **M1-A / MG1 — typed 2D motion** | `motion-track` evaluator (typed keyframes, easing, springs, stagger, sequence/parallel nesting), `motion-path`, path-trim/vector-draw, `mask-reveal`, `shape-morph`, `shared-element` transitions, versioned `motion-preset`, kinetic typography (`animated-text`), `scene-storyboard`, `motion-react`, and renderer-neutral golden fixtures under [`examples/motion/`](../examples/motion/) | **MG1 implemented and re-verified.** All nine original items reported in `registry.json` (56 items total), passing `registry:validate` (56 valid), `registry:smoke` (56 items, 280 files) and `npm run registry:fixture` (56 items, 87 files compiled in a temporary fixture). `npx vitest run`: 118 files / 1,378 tests passed; focused `tests/motion-core.test.ts`: 82, `tests/motion-geometry.test.ts`: 34; `npm run typecheck` exit 0; `npm run lint` exit 0 (0 errors, 1 pre-existing warning). `npx playwright test tests/e2e/motion-gallery.spec.ts` → 8 passed, including the axe light+dark test, the "never scrolls horizontally, from 320px up" test and the re-verified light/dark/narrow visual baselines. Three additive MG1 refinements: `applyInterruption` preserves per-frame **`velocityValue`** for `vec2`/`transform` and can seed a nested **`track` node** by `event.nodeId` (reports `localFrame`; `motion-interruption-node-missing` / `-node-unsupported` errors and `-local-out-of-range` warning); `mask-reveal` samples resolve transformed **`polygon`/`bounds`** with clamped `feather`/`softness`/`order`, drawn by `MaskRevealView` (SVG feather, paint order, `data-mask-feather-applied`); `GraphicComposition` is a reusable SVG renderer in `motion-react` with a `graphic-composition` gallery section, reviewed at 1440 light, 1440 dark and 375 light; that review found and fixed two defects (a fixed-height 4:1 stage card that letterboxed the scene, now `aspect-video`; a detail panel whose `mask` shared its `translate(1240, 720)` transform, now on an untransformed wrapper `<g>`), and the re-captured screenshots were re-verified green. **Still open:** no Storybook story for `GraphicComposition` (`src/motion/motion.stories.tsx` is unmodified) and it is not listed in `MOTION_COMPONENT_NAMES`. |

**Recorded status:** M0-A and M0-B items are implemented and installable in isolation; see the M0 row and `media-*` specs in [component-specs](component-specs/) for evidence and known limitations. M1-A motion items are likewise reported implemented and installable (registry-validated, smoke-staged and fixture-compiled at 56 items / 280 staged / 87 compiled); see the `motion-*` / `scene-storyboard` specs. The additive M1-A refinements and the new `GraphicComposition` gallery section have since been re-checked: `npx vitest run` (118 files / 1,378 tests passed), `npx playwright test tests/e2e/motion-gallery.spec.ts` (**8 passed**, including the axe light+dark test and the "never scrolls horizontally, from 320px up" test), `registry:validate` / `registry:smoke` / `registry:fixture` all pass, and the `graphic-composition` section was visually reviewed (1440 light, 1440 dark, 375 light), which found two rendering defects that were fixed and re-verified. What genuinely remains open: no Storybook story for `GraphicComposition` and no `MOTION_COMPONENT_NAMES` entry for it. **M1-B, M2 and 3D were reported not started; infographic work was not status-verified in the supplied report.** Reinspect the repository before changing any status.

### Immediate gate — finish MG1, do not rebuild it

| Slice | Task | Exit gate |
|---|---|---|
| **V1 — MG1 closure** | Re-run focused/unit suites, Playwright motion gallery, axe, changed-item compile/registry installation; review `GraphicComposition`, nested interruption and mask-feather screenshots across themes/aspects. Record limitations in specs. | **New run logs**, screenshots and per-item fixtures exist; no regressions, including CJK/RTL clipping, random-access frame seeks and mask bounds. If failures arise, fix before starting new media components. |

### Future slices — dependency-aware work queue

**One row = one agent session or a smaller verified increment.** Phase labels follow [07](07-media-foundation.md), [08](08-motion-graphics.md) (**MG**), [11](11-rendering-quality.md) (**R**), [12](12-infographic-system.md) (**I**), and [13](13-content-creation-integrations.md) (**E**). These are cross-references to the same work, **not parallel mandates to implement duplicate systems**.

| Order / slice | Prerequisite | Deliverable | Exit gate |
|---|---|---|---|
| **1 — I0: infographic layouts** | M0-B | `infographic-canvas`, `editorial-grid`, `bento-grid`, `section-stack`, `split-composition`; semantic document bindings | 16:9 + 2:3 static fixtures; deterministic fit and explicit overflow diagnostics; clean registry install. |
| **2 — I1: information blocks** | I0 | `hero-statistic`, `metric-card`, `insight-callout`, `numbered-step`, `annotation`, `comparison-column` | Multilingual layouts, accurate values and source references, readable small previews; no cropped essential copy. |
| **3 — I2: structured diagrams** | I0–I1 | `process-flow`, `timeline-layout`, `hierarchy-layout`, `connector-path`; use existing node IDs and suitable geometry/layout libraries | 12-node branching fixture; connector attachment and stable identity after portrait reflow. |
| **4 — I3: data + staged visuals** | I2, MG1 | `chart-stage`, `data-reveal`, `diagram-build`, `focus-transition`; D3 geometry and optional chart adapters | Bar/line/scatter values and axes validated; random-seek transitions match sequential playback; missing values explicit. |
| **5 — I4: infographic templates** | I0–I3 | Five parameterized P0 templates, variants for static infographic, vertical poster, carousel and animated story | Same source generates static infographic, vertical poster, carousel and **animated scene preview** without fact/ID drift; 16:9, 2:3, 4:5, 9:16 reflow correctly. Encoded video is gated on R3. |
| **6 — M1-B / E0–E1: explainers** | MG1 closed, I2–I3 | `diagram-stage`, `progressive-reveal`, `animated-code`, `math-expression`, `data-flow`; Shiki/KaTeX, optional Paper.js/Motion Canvas adapter; preserve existing shared-element engine | 30–60s RAG explainer previews with code/data flow, cue anchors, 16:9 and 9:16 authored framing; coherent identity and deterministic frames. No invented engine parity. |
| **7 — R3 / E3: video export foundation** | M1-B + [11](11-rendering-quality.md) contracts | `video-composition` + one **optional** video renderer/encoder adapter; shot timing, compositing, audio/caption metadata passthrough, export manifest | Actual reproducible video file and still frames; frame/codec preflight, random seek, failure diagnostics and clean 2D-only registry install. Prototype WebCodecs/Mediabunny; external FFmpeg or licensed Remotion only when justified. |
| **8 — MG2 / R3D / E2: 3D foundation** | R3 baseline + v2 schema validation | Optional `scene-3d`, `viewport-3d`, `object-3d`, `model-3d`, `material-3d`, `lighting-rig`, `camera-rig-3d`; Three.js/R3F/Drei + glTF-Transform | GLB product turntable with PBR materials, lights and camera; frame-reproducible preview/render; 2D consumers have **no 3D dependencies**. |
| **9 — MG3: hybrid 2D/3D** | MG2 | `world-annotation`, `product-stage`, `exploded-view`; projection, alpha/color compositing, camera choreography, stable object IDs | Hybrid animation retains anchored labels in 16:9/9:16; correct depth/occlusion and no clipping; complete source and exported frames. |
| **10 — M2-A / E5 / R4: characters, captions, audio** | R3, MG1; MG2 for VRM mode | `caption-overlay`, `audio-cue-track`, `character-presenter`; 2D sprite/Rive and optional VRM playback, independent animation channels, viseme cues, tone/audio adapters | Spoken character explainer with blink/gesture/lip-cue overlap, multilingual captions, source timing, audio mix metadata and actual synchronization checks; rights recorded. |
| **11 — M2-B / MG5 / R5: production export + QA** | R3–R4, I4 | `thumbnail-canvas`, `thumbnail-variants`, `subject-cutout`, `timeline-inspector` where justified; renderer capability reporting, regression/manifest pipeline, reusable production templates | Reproducible video, SVG/PNG, thumbnails, carousel and 3D/hybrid reference renders; visual/a11y/rights/codec/performance QA; clean registry installs and upgrade smoke tests. |
| **12 — MG4 / E4: advanced effects (conditional)** | MG2–MG3; evidence of quality need | Optional PixiJS/Paper.js procedural 2D, seeded particles, postprocessing, depth effects, Tone.js offline cues; no custom engine | A/B reference render shows meaningful visual improvement within measured frame/memory budgets. **Skip** when existing primitives suffice. |

**Sequence exception:** Three.js/hybrid work may start after the 3D schema/adapter preflight even if the full video export adapter is incomplete; it must still produce inspectable, deterministic frames. Don't claim a complete production video until R3 passes. Library approval, licenses and integration boundaries belong to [13](13-content-creation-integrations.md); wire format and codecs belong to [11](11-rendering-quality.md). **Verify actual project status before scheduling each row.**

### Media reference productions — milestones, not marketing mockups

| Reference | First required by | Passing evidence |
|---|---|---|
| **Editorial infographic set** | I4 | One semantic source → infographic still, 2:3 poster, five-panel carousel and animated sequence; valid quantities, citations, typography and editability. |
| **2D technical explainer** | M1-B → R3 | ~45–60s coherent RAG explanation with code/diagram animation, 16:9/9:16 framing; source JSON, golden frames, actual exported video after R3. |
| **Cinematic 3D product film** | MG2 → MG3 | ~20s model/camera/light animation plus accurate 2D callouts; GLB/source manifest, exported frames/video, no environment-dependent surprises. |
| **Character narration** | M2-A | Character speaks while eyes, expression, gestures and visemes animate independently; captions/audio synchronized and asset licenses documented. |

All references must include **editable source, pinned assets/fonts, actual artifacts, measured render/performance data, visual review screenshots and machine-readable diagnostics**. Hard failures are not converted to silent fallbacks. Engine-only demos without a complete composition do not satisfy an exit gate.

## Within each component slice

1. Write the spec from [template](../templates/component-spec.md), including acceptance cases; check whether existing component/spec already covers it.
2. Reuse tokens/primitives; record dependency, commercial-use/redistribution, performance and accessibility tradeoffs.
3. Implement behavior first, then typography/spacing/states/motion; use isolated adapters for PixiJS, Motion Canvas, Three/R3F, audio and export.
4. Create complete stories and meaningful unit/keyboard tests, plus frame/geometry tests for motion.
5. Render and **inspect** screenshots at supported states, themes, densities, widths and relevant frames; inspect rendered clips for timing, lighting and compositing.
6. Fix clipping/overlap/contrast/interaction defects; inspect WebKit if relevant; test reduced motion and CJK/RTL.
7. Validate registry metadata and install the **exact** item into a clean fixture; ensure ordinary UI and static media have no renderer/codec dependency leakage.
8. Report actual commands run, results, screenshots/artifacts, failures, unrun checks and next component. **Stop.**

**Change gate:** a new engine or dependency requires a decision record describing the exact capability missing from current components, license/SPDX and redistribution constraints, runtime weight, adapter boundary, reproducible test fixture, fallback and measured quality/performance benefit. Prefer using existing libraries over rebuilding rendering engines. [13](13-content-creation-integrations.md) is authoritative.

## Historical prompt (Phase 0; not the next work item)

> Read AGENTS.md, docs/INDEX.md, docs/01, 02, 03, 04, 05 and 07. Implement only Phase 0. Start by writing a short architecture and dependency plan. Scaffold minimal tooling; implement tokens and Button, then Field/Input and Dialog with full states, tests and screenshots. Validate a real registry install. Do not create later components or claim tests you did not run. At completion provide measured results, screenshots, remaining issues, and actual commands.

**Next agent instruction:** Read `AGENTS.md`, `docs/INDEX.md`, this roadmap, [07–13](07-media-foundation.md), relevant component specs and the actual implementation. **First close the remaining V1 items** (the MG1 unit/Playwright/axe/registry re-runs and the `graphic-composition` screenshot review are done; the nested-interruption and mask-feather screenshot review, CJK/RTL clipping and random-access frame seeks are not yet evidenced). Then execute the first uncompleted queue slice only. Do not repeat completed work, broaden scope, install unused engines or mark an exit gate complete without actual evidence.

## What not to optimize for initially

Component count, glossy landing-page effects, complex theme editors, general drag-and-drop builders, automatic migration of existing applications, runtime npm package publishing, integrations with proprietary branding tools, or AI-generated visual scores. These distract from proving a small set of genuinely exceptional building blocks. For media, also defer full NLEs, rig editors, unrestricted shaders, custom 3D engines, AI image/video generation, universal codec claims and premature WebGPU-only features.

**Release rule:** if a component still has a blocking accessibility, overflow, keyboard, customization, install, renderer-correctness, deterministic-render, asset-rights or export defect, the release is not done—regardless of how attractive the default screenshot looks.
