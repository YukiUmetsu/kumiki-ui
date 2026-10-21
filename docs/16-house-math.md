# Kumiki UI — Reusable Visual Components Roadmap

**Status:** Proposed specification; not an implementation claim  
**Scope:** General-purpose, high-craft **2D/3D visual components and recipes** for educational explainers  
**Initial validation topics:** Homeownership economics, building systems, energy, repairs and long-term costs  
**Separate ownership:** Home/building meshes, illustrations, materials and condition variants are authored by another agent. Scriptwriting, narration, editing, final video rendering and publishing belong to the content-creation repository.

## 1. Design objective and constraints

Make complex visual explanations quick to assemble from reliable primitives **without** hardcoding house/HVAC/roof-specific components in the generic Kumiki visual layer. For example, the same cutaway or lifecycle chart should work for a house, vehicle, factory or machine.

**Do not rebuild existing Kumiki infrastructure.** Reuse/extend the existing registry/catalog (`catalog:find`, `catalog:api`), MG1 absolute-frame motion, `DiagramStage`, `ProcessJourney`, `MotionDirector`, `VisualTransformation`, `CameraStage`, `CinematicCameraDirector`, `ExplodedView3D`, infographic chart/layout/annotation engine, `HeroAsset`, `SemanticAsset`, and deterministic visual preflight. The proposals below are **new adapters, visual grammars, or composition recipes**, not new timelines, scene runtimes, rendering engines, audio systems, or QA engines.

**Core invariants:**
- Deterministic output as a function of authored inputs and absolute integer frame; random seek = sequential evaluation.
- Renderer-neutral plans where practical; optional 2D SVG and 3D Three.js adapters (never force Three.js on 2D consumers).
- Stable semantic IDs; camera, overlays and visual transitions reference semantic objects rather than guessed positions.
- Responsive **16:9 and 9:16** framing and measured readable typography; use the existing preflight for measurable conditions.
- Asset-independent behaviors; existing domain assets provide detailed geometry, materials and state variants.
- Fail or report `unsupported`/`unknown` honestly; visual beauty, physical accuracy and truth of financial inputs require external evidence/review.
- Avoid bespoke animated scenes named after particular video titles.

## 2. Build inventory and priorities

There are **13 proposed names**, not 12: six interoperability/visual-infrastructure components, five economic visualization components, and two composition recipes. Several should be thin extensions of existing capabilities rather than wholly new registry entries.

| Priority | Component | Contract and purpose | Existing Kumiki basis | Expected deliverable |
|---|---|---|---|---|
| P0 | **InspectableAsset** | Uniform adapter for semantic parts, anchors, bounds, states and capabilities across 2D/3D assets | `HeroAsset`, `SemanticAsset`, camera target registry | Small adapter/types + validation, **not** competing asset schema |
| P0 | **SectionReveal** | Isolate, ghost and clip arbitrary assemblies to expose internal construction | Mask/clip primitives, `ExplodedView3D`, Three.js viewport | Renderer-neutral plan + 2D/3D adapters |
| P0 | **SemanticCalloutLayer** | Camera-aware labels, leaders and highlights attached to moving semantic parts | Infographic annotations, 3D assembly annotation, projected camera targets, protected text | Anchor resolver + placement adapter + diagnostics |
| P0 | **FlowPath** | Directional motion on 2D/3D paths; configurable visual style and scalar encoding | `motion-path`, `DiagramStage`, `ProcessJourney`, MG1 | Shared path sampling + 2D/3D presentation adapters |
| P0 | **CostWaterfall** | Explain how signed cost contributions build subtotals and a final total | Infographic chart engine | Typed chart recipe + timed reveal adapter |
| P0 | **LifecycleCostTimeline** | Show recurring and one-off cost categories, replacement events, cumulative totals | Infographic line/area/bar + timeline visualizer | Typed data-to-chart composition |
| P0 | **BreakEvenComparison** | Compare cumulative options and label genuine crossover/payback behavior | Infographic line chart + annotations | Comparison recipe with crossover diagnostics |
| P1 | **ComparisonStage** | Fair, matched visual comparisons of two or more objects/options in 2D or 3D | Camera/layout, visual transformation, infographic comparisons | Comparison layout/camera composition recipe |
| P1 | **AssetStateSequence** | Coordinate supplied asset states while retaining semantic identity | `VisualTransformation`, `HeroAsset` action/state concept, MG1 | State-to-frame adapter with explicit fallback |
| P1 | **ScalarFieldOverlay** | Render *supplied* spatial heat/pressure/moisture fields as bands, contours or gradients | Infographic heatmap, overlays, 3D surface APIs | Data renderer; **no physics simulation** |
| P1 | **ScenarioBand** | Distinguish assumptions, low/base/high cases and uncertain ranges | Charts, measured labels and callouts | Uncertainty/assumption overlay recipe |
| P1 | **InspectThenQuantify** | Object overview → camera focus/cutaway → part highlight → linked chart | Camera, callouts, SectionReveal, existing chart system | MotionDirector composition recipe |
| P2 | **FailureCascade** | Visualize linked defects, state changes and escalating consequences/costs | Semantic graph, `AssetStateSequence`, `ProcessJourney`, MD1 | Causal dependency-graph composition recipe |

**P0 is the order of implementation priority, not a requirement to ship seven components in one PR.** Only extract a standalone public component when three distinct demonstrations show recurring value over existing primitives.

## 3. Component specifications

### V01 — `InspectableAsset` [P0 · interoperability]

**What:** A *small, stable adapter contract* exposing the capabilities of existing 2D/3D objects: semantic part IDs, parent relationships, bounds, points/ports, available state IDs, scale and inspection affordances. Prefer adapters around current `HeroAsset` and `SemanticAsset` rather than a third asset model.

**Minimum interface:** `getPart(id)`, `getBounds(partId, frame)`, `getAnchor(anchorId, frame)`, `listStates()`, `capabilities` (e.g. `sectionable`, `explodable`, `canGhost`, `flowPorts`, `stateful`); `metersPerUnit` for physically scaled 3D assets. 2D assets should not need invented Z information. Define ownership/disposal separately from metadata.

**Reject:** Duplicate IDs, nonexistent parent/anchor references, invalid bounds/units, capability declarations without required data. **Done when:** three unrelated fixtures (e.g. a motor, pump and home assembly) can be inspected using one interface; existing `HeroAsset` implementations remain compatible.

### V02 — `SectionReveal` [P0 · 2D/3D]

**What:** A reusable, frame-addressed way to show internals of complex assemblies.

**Modes:** `isolate` (selected parts only), `ghost` (transparent shell), `section` (authored clipping plane), then optionally `capped-section` (visible cut surfaces). Support multiple named semantic targets, reveal amount, direction/plane, camera-safe framing and material fallback. Preserve the underlying asset; no destructive geometry mutations.

**Important distinction:** `ExplodedView3D` *moves parts apart*; `SectionReveal` *looks into the intact assembly*. Reuse current masks/Three.js clipping, not a new renderer. Generic geometry clipping cannot guarantee plausible caps or internal details. Report `unsupported` where topology/assets lack cut-ready geometry.

**Examples:** Roof layer exposure; furnace internal heat exchanger; generic gearbox. **Done when:** 2D and 3D examples demonstrate isolate/ghost, 3D sectioning works on a genuinely layered asset, random seeking is deterministic, and there are explicit tests for unsupported/empty internal geometry. Human-review appearance of cut surfaces.

### V03 — `SemanticCalloutLayer` [P0 · annotations]

**What:** A universal semantic-label layer for moving 2D, isometric and 3D objects. Labels should follow physical parts, not screen pixel constants.

**Inputs:** Target semantic part/anchor IDs; text/measurement; optional emphasis/priority; positioning policy; output viewport/safe regions; externally measured fonts; camera projection sampler; absolute frame. **Outputs:** measured label/leader geometry, status (`visible`, `occluded`, `outside`, `unplaceable`) and actionable diagnostics.

**Behavior:** Reproject per frame, avoid protected regions, reserve readable text areas, group repeated labels, and use deliberate staged entrances. Do not assert full occlusion correctness when depth data is unavailable. **Examples:** Roof shingle/underlayment callouts, motor internal parts, plumbing valve labels. **Done when:** labels survive camera movement and portrait reflow without covering declared critical subjects; unknown semantic IDs fail preflight; an intentionally impossible layout reports unplaceable instead of silently clipping.

### V04 — `FlowPath` [P0 · 2D/3D]

**What:** One renderer-neutral grammar for *illustrative* motion along authored paths, with visual encodings for air, heat, water, electricity, gas, money or mechanical motion. Reuse MG1 absolute frames and the current path arc-length sampler; use the existing `DiagramStage`/`ProcessJourney` where the flow is a graph of packets.

**Inputs:** Path/ports, direction, frame range, progress/easing, style (`arrows`, `streaks`, `particles`, `ribbon`, `pulse`), optional magnitude/unit metadata, density cap, and seed only when deterministic jitter is explicitly necessary. Provide SVG and optional Three.js adapters. 3D particle instancing is an implementation optimization, not a separate component.

**Must distinguish:** Illustrated direction vs quantitative flow. No inferred velocity, pressure, energy transfer or physical conservation. **Examples:** HVAC airflow, domestic water circuit, solar energy, generic factory conveyor. **Done when:** both renderers share frame/path semantics; reversible direction and moving anchors work; randomized-frame evaluation is identical; bounded particle budgets prevent memory growth.

### V05 — `ScalarFieldOverlay` [P1 · technical visualization]

**What:** Render a supplied 2D scalar grid or 3D section/surface field (temperature, moisture, relative pressure or concentration) as a calibrated color overlay, contours or threshold bands.

**Inputs:** Field samples/grid, spatial transform, explicit values and units, color scale/domain, missing-data mask, legend, interpolation mode, frame. **Never calculate the underlying physics** or fabricate heat-loss intensity from house geometry.

**Examples:** Thermal bridge across wall studs, moisture behind a roof, load concentrations on a machine. **Done when:** units/scale are visible, missing values differ from zero, fixed vs dynamic color domains are explicit, clipped ranges are disclosed, and sampling remains deterministic at two aspect ratios.

### V06 — `AssetStateSequence` [P1 · state animation]

**What:** Reuse state variants delivered by the domain-asset agent (e.g. `intact`, `aged`, `leaking`, `repaired`) and synchronize visual transitions by stable semantic part IDs.

**Inputs:** Asset and state IDs, ordered frame ranges, optional named part focus, transition policy (`interpolate`, `crossfade`, `cut`, `hold`) with supported-capability checks. Reuse `VisualTransformation`, `HeroAsset` actions and MD1; don't invent mesh-deformation algorithms.

**Examples:** Roof aging, appliance failure and replacement, industrial component corrosion. **Done when:** missing states fail clearly; real meshes can transition using supported methods; crossfade/cut is selected rather than attempting impossible morphs; arbitrary-frame seeking returns the same state.

### E01 — `CostWaterfall` [P0 · economic charts]

**What:** A signed contribution chart for *why a total costs what it does*, including subtotals, rebates/credits and reductions.

**Inputs:** Starting amount, ordered signed contributions, labels, currency/unit, authored data provenance, optional subtotal steps, time reveal. **Outputs:** derived totals/positioned chart geometry and diagnostics. Integrate with Kumiki's infographic chart grammar, measurement and annotation system.

**Examples:** HVAC installation quote (equipment + labor + permit), roof replacement estimate, insurance premium changes. **Done when:** totals reconcile exactly (using defined rounding policy), positive/negative/zero cases render correctly, currency and bases are labeled, and portrait layouts preserve readable step labels. No internal homeowner-pricing formulas.

### E02 — `LifecycleCostTimeline` [P0 · economic charts]

**What:** Communicate lifetime costs with recurring series, irregular one-time events and accumulated totals over a user-supplied horizon.

**Inputs:** Explicit time axis (months/years), categorized precomputed values, one-off replacement events, currency basis (`nominal`, `real`, `present-value`), optional source/baseline metadata. **Views:** annual stack, cumulative line, scheduled event markers and synchronized category focus.

**Examples:** 30-year ownership, pool maintenance, recurring HOA fees, industrial equipment TCO. **Done when:** no silent mixing of monthly/yearly values or real/nominal dollars; event and cost markers align with the supplied dates; zero/negative/missing values are distinct. **No NPV, amortization, tax or inflation calculations inside Kumiki.**

### E03 — `BreakEvenComparison` [P0 · economic charts]

**What:** Compare precomputed cumulative-cost or cumulative-savings series and explicitly identify crossover points (or absence of crossover).

**Inputs:** Two or more aligned series, cumulative semantics, currency/units, source assumptions, interpolation policy and payback-definition label. **Views:** crossing lines, initial-cost annotations, difference plot and optional uncertainty ranges.

**Examples:** Solar, heat pump vs furnace, windows/insulation payback, software migration. **Done when:** multiple crossovers, no crossover, discontinuities, replacement events, missing samples and near-equal values are handled truthfully. The first intersection is **not** automatically labeled permanent payback.

### E04 — `ComparisonStage` [P1 · comparable visual objects]

**What:** A fair 2D/3D side-by-side or A/B comparison where objects keep declared real-world scale or use explicit normalized scale. Reuse camera, scene layout, responsive typography and existing infographic comparisons.

**Inputs:** Asset IDs or render slots, aspect/layout, comparison dimension, synchronized frame, normalization policy and named focus parts. Provide shared framing/lighting policy when physically valid. **Examples:** Furnace vs heat pump, tank vs tankless heater, old vs new roof, generic engine options. **Done when:** equal-scale vs fitted-to-slot is declared, cameras do not silently exaggerate size, and labels remain visible in portrait and landscape.

### E05 — `ScenarioBand` [P1 · uncertainty]

**What:** A visual grammar for supplied low/base/high scenarios and bounded sensitivity analysis, ideally implemented as chart annotation/area recipes.

**Inputs:** Scenario IDs/labels, aligned values, assumptions, uncertainty band or explicitly *nonprobabilistic* range, units and source notes. **Examples:** Electricity price changes, insurance renewal scenarios, variable maintenance exposure. **Done when:** band meaning is labeled (range ≠ statistical confidence interval), actual/modeled values are distinguishable, and missing projections do not become zeros.

### R01 — `InspectThenQuantify` [P1 · composition recipe]

**What:** Reusable sequence: establish a complete object → camera-focus an internal part → optionally section/explode and annotate → transition into a corresponding cost/data view.

**Inputs:** Asset and semantic target, camera/hold constraints, optional reveal mode, attached annotation, chart reference, frame windows. **Output:** composed existing MG1/MD1 camera/visual stages and deterministic preflight, not a video or audio timeline.

**Examples:** Roof replacement layers → cost waterfall; heat pump compressor → replacement economics; vehicle battery → lifecycle cost. **Done when:** three domains, two aspects, focus-target visibility, labeled-hold time and explicit final visual state are verified.

### R02 — `FailureCascade` [P2 · cause-and-consequence recipe]

**What:** Highlight a *user-authored causal graph* of defects and effects, with supported asset-state transitions and linked quantitative consequences. **Never infer that a causality claim is true.**

**Inputs:** Directed dependency graph with evidence/source IDs, stable subject IDs, stage-specific condition state references, visual cue/transition windows and optional measured cost impacts. **Outputs:** deterministic graph emphasis, state switches and explanation anchors, compiled into existing MG1/MD1/diagram primitives.

**Examples:** Missing flashing → leak → decking damage; neglected bearing → friction → failure; drainage issues → foundation settlement. **Done when:** authored edge order is respected, cycles and missing state IDs are diagnosed, no fabricated downstream costs appear, and every critical consequence has a visible anchor.

## 4. Contract for the separate home/building asset agent

**Do not have the other agent build the generic visualization components above.** It should produce source assets and states that can be consumed by those components.

For each 2D/3D asset request:
1. **Geometry and craft:** Distinct internal parts where sectioning matters; meaningful physical structure, coherent materials, authored real-world dimensions for 3D, and deliberate details. Exterior shells alone are insufficient for cutaway teaching.
2. **Stable semantic IDs:** Persistent IDs for roof layers, motors, compressors, piping, valves, windows, etc. across variants (or explicit mapping if the physical part is replaced).
3. **Named anchors/ports:** Local positions/normals and media/flow semantics where applicable; no hardcoded screen coordinates. Fit the existing `HeroAsset`/`SemanticAsset` contracts where possible.
4. **Varied states:** Rest/aged/damaged/repair variants where supported, with explicit transition support: morphable, poseable, crossfade-only or discrete replacement. Do not imply automatic mesh morphing.
5. **Section capability:** Declare which parts are safe to hide, ghost, clip and/or present preauthored cut meshes. Interior surfaces must actually exist when sectioning is required.
6. **Camera/QA metadata:** Authored bounds and semantic focus targets; lifecycle/disposal of Three.js resources; realistic fidelity claims require human visual review.
7. **Artifact interchange:** Prefer existing Kumiki asset factories/registry patterns; glTF is a reasonable export interchange for complex 3D models when warranted. Avoid source imports from private `src/`.

### Illustrative adaptation shape — not a new mandated schema

~~~ts
interface InspectionCapabilities {
  partIds: readonly string[];
  anchors: readonly { id: string; partId?: string; localPosition: readonly number[] }[];
  stateIds: readonly string[];
  sectioning: "none" | "isolate-ghost" | "clip" | "preauthored-caps";
  supportsExplode: boolean;
  supportsFlowPorts: boolean;
}
~~~

Before merging the asset and visual branches, validate that semantic IDs, units, anchors, state IDs and sectioning claims agree with **actual** delivered geometry. Implement the integration as an adapter into existing Kumiki models; don't duplicate `HeroAsset` as a second competing public source of truth.

## 5. Coverage of the initial 20 video topics

The titles are **content-development examples only**, not names of Kumiki components.

| Reusable scene family | Initial titles | High-leverage visual components |
|---|---|---|
| Installation/replacement breakdown | HVAC system, roof, foundation | `SectionReveal`, `SemanticCalloutLayer`, `CostWaterfall` |
| Equipment operating-cost comparison | Heat pump vs furnace, tankless vs tank, gas vs electric | `ComparisonStage`, `FlowPath`, `BreakEvenComparison`, `LifecycleCostTimeline` |
| Payback and efficiency | Solar, windows, insulation, renovations | `BreakEvenComparison`, `ScenarioBand`, `ScalarFieldOverlay` |
| Long-term carrying cost | 30-year house cost, rent vs buy, pool, HOA, maintenance | `LifecycleCostTimeline`, `CostWaterfall` |
| Risk and rising expenses | Home insurance, property tax, hidden cheap-house costs | `CostWaterfall`, `LifecycleCostTimeline`, `ScenarioBand` |
| Defects, construction quality and mistakes | Cheap house, older vs newer builds, foundation repairs, first-time buyer errors | `AssetStateSequence`, `InspectThenQuantify`, `FailureCascade` |

**Default reusable explanatory arc:** object overview → interior/flow explanation → semantic annotation → cost composition → time-horizon comparison. The content-creation repository chooses which of these to use and supplies the narrative, data, facts and source references.

## 6. Implement in small, evidence-driven PRs

| Phase | Work | Core acceptance / stop condition |
|---|---|---|
| 0 | Interface alignment with asset agent + three fixtures | Existing `HeroAsset`/`SemanticAsset` APIs adapted; stable IDs/units/anchors; no second asset schema |
| 1 | `InspectableAsset`, `SemanticCalloutLayer` | Camera projection and safe-area checks across 2D/3D and both aspects; existing preflight reused |
| 2 | `SectionReveal`, `FlowPath` | Cutaway and 2D/3D path examples; deterministic random seeking; no duplicated timeline/renderer |
| 3 | `CostWaterfall`, `LifecycleCostTimeline`, `BreakEvenComparison` | Numeric/currency correctness, missing-data honesty, normal/negative scenarios, accessible labels |
| 4 | `ComparisonStage`, `AssetStateSequence`, `ScenarioBand` | Proven reuse in three subjects each; fallback strategies explicit |
| 5 | `ScalarFieldOverlay`, `InspectThenQuantify`, `FailureCascade` | Implement only once real videos demonstrate repeated demand |

**Per-component Definition of Done:**
- Registry item/dependencies are correct and clean consumer installation compiles; `catalog:find` discovers the item and `catalog:api` reflects true public types.
- Compact usage contract + one minimal, typechecked example + three genuinely distinct domain demonstrations (not three renamed copies).
- Absolute-frame evaluation is deterministic (including out-of-order seeks), bounded in time/memory, and does not introduce playback, audio or encoding logic.
- Landscape/portrait fixtures; existing structural preflight checks for semantic IDs, safe areas, important subjects and text collisions as applicable.
- Explain unsupported cases and provenance/accuracy limitations in code diagnostics, not only docs. Human visual review for appearance, especially 3D cut surfaces and materials.
- Prefer extensions to existing registries and modules; no new dependency unless justified by a demonstrated blocker and measured cost.

## 7. Explicit non-goals

**Not Kumiki:** scripting, scene-specific economic assertions, price research, amortization/NPV engines, financial projections, simulations of heat flow or fluid physics, narration, TTS, music, subtitles, final video encoding, channel/thumbnail strategy or publishing. Those belong to content/data applications (or scientific/financial computation libraries).

**Do not build yet:** a new 3D engine, complete CAD/BIM/Boolean modeling framework, house-only visualization components, a parallel design-token system, another QA system, a new graph/animation runtime, or a broad material library already assigned to the asset agent.

**Main success metric:** number of repeated visual tasks agents can assemble from existing components with fewer source inspections, custom paths, wrong props, invisible targets and manual visual-fix rounds—not number of newly named components.

---

*Repository context audited against Kumiki UI `main` on 2026-10-20 (commit `6036425`). Treat public API names under `V*`, `E*`, `R*` as proposed until implemented and verified through `catalog:api`.*
