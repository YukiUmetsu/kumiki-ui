# Documentation Index

Keep this index short. **Use one authoritative document per topic**; do not duplicate standards across files.

| Document | Read when |
|---|---|
| [01 — Design Foundations](01-design-foundations.md) | Defining premium quality, design tokens, typography, theming, motion and customization |
| [02 — Component Catalog](02-component-catalog.md) | Choosing what to build; **explicit v0.1 inventory**, dependencies, priorities and exclusions |
| [03 — Component Standards](03-component-standards.md) | Designing a component API, interaction behavior, edge cases and complete states |
| [04 — Quality & Testing](04-quality-and-testing.md) | Proving accessibility, rendering, performance and visual quality before release |
| [05 — Development & Registry](05-development-and-registry.md) | Choosing libraries, arranging code, running locally, distribution and licensing |
| [06 — Roadmap](06-roadmap.md) | Implementing phased deliverables with testable exit criteria |
| [07 — Media Foundation](07-media-foundation.md) | Defining reusable, code-first media components (diagrams, slides, explainers, thumbnails, video scenes) |
| [08 — Motion Graphics & Art Direction](08-motion-graphics.md) | Describing renderer-neutral, code-authored motion for premium scenes |
| [09 — Explainer Components & Visual Storytelling](09-explainer-components.md) | Composing technical ideas into reusable, visually coherent scenes |
| [10 — Character Animation, Narration & Sound](10-character-audio.md) | Building character-led education with synchronized voice, gesture, captions and sound |
| [11 — Scene Contract, Renderer Adapters & Production QA](11-rendering-quality.md) | Owning the canonical serialization/export boundary, timing, adapters and quality gates |
| [12 — Infographics, Carousels & Data-Driven Motion](12-infographic-system.md) | Building code-first infographic layouts, data visualizations, carousels and templates from one semantic source |
| [13 — Content Creation Engines, Licensing & Adapter Decisions](13-content-creation-integrations.md) | Choosing content-creation engines and adapters, and tracking library, dependency and license decisions |
| [14 — 3D Visual Fidelity & Asset Craftsmanship](14-3d-visual-fidelity.md) | Mandatory geometry, PBR material, texture, lighting, LOD and close-up review standard for optional 3D work |
| [15 — Explainer Lessons](15-explainer-lessons.md) | Avoiding repeated storyboard, camera, caption, readability and Storybook mistakes from actual video iterations |
| [16 — House Math](16-house-math.md) | Reusable 2D/3D visual components and recipes for home, building-system and long-term-cost explainers (roadmap V01–R02) |

Deterministic, low-token animation safeguards: [Visual Production Contract](visual-production-contract.md) — semantic object/port contracts, CC1 framing, measured text placement, MD1 event linking and narrative gates (implemented, optional).

Reusable visual route recipe: [ProcessJourney (PJ1)](component-specs/process-journey.md) — stage traversal, handoffs, arrival states and optional MG1 follow-camera. No audio or video orchestration.

Additional resources: [agent instructions](../AGENTS.md), [OpenCode skill](../skills/kumiki-ui/SKILL.md), [component spec template](../templates/component-spec.md), [sample tokens](../examples/neutral.tokens.json), [registry manifest example](../examples/registry.example.json).

Implemented component specs (one per delivered component, written from the template, in [`component-specs/`](component-specs)): [Button](component-specs/button-spec.md) · [Field/Input](component-specs/field-spec.md) · [Dialog](component-specs/dialog-spec.md) · [Separator](component-specs/separator-spec.md) · [Skeleton](component-specs/skeleton-spec.md) · [Badge](component-specs/badge-spec.md) · [Alert](component-specs/alert-spec.md) · [Accordion](component-specs/accordion-spec.md) · [Radio Group](component-specs/radio-group-spec.md) · [Slider](component-specs/slider-spec.md) · [Breadcrumbs](component-specs/breadcrumbs-spec.md) · [Listbox](component-specs/listbox-spec.md) · [Table](component-specs/table-spec.md) · [Form Summary](component-specs/form-summary-spec.md) · [Sidebar](component-specs/sidebar-spec.md) · [Combobox](component-specs/combobox-spec.md) · [Command Palette](component-specs/command-palette-spec.md) · [Searchable Results](component-specs/searchable-results-spec.md) · [Split Pane](component-specs/split-pane-spec.md) · [Search and Results](component-specs/search-and-results-spec.md) · [Settings Section](component-specs/settings-section-spec.md) · [Process Monitor](component-specs/process-monitor-spec.md) · [Resource Explorer](component-specs/resource-explorer-spec.md) · [Data Details Workspace](component-specs/data-details-workspace-spec.md) · [Guided Form](component-specs/guided-form-spec.md) · [Media Document](component-specs/media-document.md) · [Artboard](component-specs/media-artboard.md) · [Editable Text](component-specs/media-editable-text.md) · [Media Frame](component-specs/media-media-frame.md) · [Layer Stack](component-specs/media-layer-stack.md) · [Alignment Guides](component-specs/media-alignment-guides.md) · [Export Preview](component-specs/media-export-preview.md) · [Infographic System](component-specs/infographic-system.md) · [Infographic Templates](component-specs/infographic-templates.md) · [Infographic View](component-specs/infographic-view.md) · [Motion Track](component-specs/motion-track.md) · [Motion Geometry](component-specs/motion-geometry.md) · [Motion Preset](component-specs/motion-preset.md) · [Scene Storyboard](component-specs/scene-storyboard.md) · [Motion React](component-specs/motion-react.md) · [Graphic Composition](component-specs/graphic-composition.md).

**Default reading path for a new component:** 02 → 03 → 01 → 04 → 05. For a release: 04 → 05 → 07.

Latest motion verification: [2026-10-17 V1 report](verification/2026-10-17-motion-v1.md)
— current automated results, mask-rendering changes, remaining visual review and continuation notes.

New development component: [Camera Stage](component-specs/camera-stage.md) — reusable 2D camera
choreography and multi-aspect framing; expanded QA deferred by user request.

[3D Camera Rig and Viewport](component-specs/camera-rig-3d.md) — optional Three.js camera preview
[Cinematic Camera Director](component-specs/cinematic-camera-director.md) — semantic shots, world targets, constrained MG1 poses and 30-second reference
and dedicated storyboard camera page; development implementation with expanded QA deferred.

[Progressive Reveal](component-specs/progressive-reveal.md) and
[Storyboard Shots](component-specs/storyboard-shots.md) — staged DOM/SVG explanation and shared
shot navigation; development implementations with expanded QA deferred.

[Diagram Stage](component-specs/diagram-stage.md) — animated semantic graphs with attached
connectors and data packets; first slice of the advanced-component sequence in the roadmap.

[Exploded View 3D](component-specs/exploded-view.md) — reversible hierarchical assembly animation
with projected labels and explicit geometric occlusion; development implementation, expanded QA deferred.

[Visual Transformation](component-specs/visual-transformation.md) — MG1-compiled semantic
2D transformations, seven recipes, explicit fallback and immutable retargeting.
See its [verification report](verification/2026-10-17-visual-transformation.md).

[MotionDirector](component-specs/motion-director.md) — declarative choreography
compiler, nested animation groups, shots, effects, parameterized recipes and
scene presets over MG1/VT1. Storybook: **Motion / Motion Director / Reference
Production**, with a 54-second 36-subject study, portrait framing and optional 3D.
Broad new unit tests and full MD1 release gates deferred at the user's request.

[Domain Illustration Toolkit (2D)](component-specs/domain-illustration-2d.md) — shared SVG illustration system and the finance (61), business (17) and technology (18) object packs, with measured `FitText` labels.

[Explainer Stage](component-specs/explainer-stage.md) — Phase 2 protected semantic subjects, measured responsive typography, impossible-layout diagnostics and opt-in CC1 visibility/tracking contracts.

[Network Journey Phase 2 integration](verification/2026-10-18-network-journey-composition.md) — measured world captions, trajectory-bound camera tracking, critical subject contracts and full-film verification.

[Finance Hero 3D Assets + Crafted 3D Hero Toolkit](component-specs/finance-hero-3d.md) — sculpted bull/bear
(bronze or natural), cash, coins, gold, money bag, cards and neoclassical bank behind the existing
`FinanceObject3D` API; reusable SDF sculpting, surface detail, finishes, eye anatomy and product studio.
[Verification](verification/2026-10-19-finance-hero-3d.md).

[Home Interiors](component-specs/home-interiors.md) — customizable floor plans, furniture recipes, electrical, yards, walk camera and tours. [Home Kit](component-specs/home-kit.md) — layered 3D houses from a renderer-neutral `HouseSpec`; every semantic part a separately animatable group, plus the generic `createPartRig`. [InspectableAsset](component-specs/inspectable-asset.md) — V01 adapter for parts, bounds, anchors, states and capabilities across 2D/3D. [SectionReveal](component-specs/section-reveal.md) — V02 isolate/ghost/section/capped views of intact assemblies. [SemanticCalloutLayer](component-specs/semantic-callouts.md) — V03 measured labels on moving parts. [FlowPath](component-specs/flow-path.md) — V04 illustrative flow in 2D/3D. [Economic Charts](component-specs/economic-charts.md) — E01–E03 CostWaterfall, LifecycleCostTimeline and BreakEvenComparison with exact totals, declared bases and truthful crossovers, plus E05 ScenarioBand. [ComparisonStage](component-specs/comparison-stage.md) — E04 fair side-by-side 2D/3D comparisons at declared scale. [AssetStateSequence](component-specs/asset-state-sequence.md) — V06 supplied-state transitions (interpolate, crossfade, wipe, cut) with explicit fallbacks. Storybook: **House Math**.
