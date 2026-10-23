# Kumiki-UI — Reusable Visual Components for Explainer and Short-Form Videos

**Status:** Proposal and implementation guide; **not** a declaration that proposed APIs exist.  
**Repository baseline:** [`YukiUmetsu/kumiki-ui`](https://github.com/YukiUmetsu/kumiki-ui), `main` at `fd0615d2da32` (reviewed 2026-10-21, America/Chicago).  
**Audience:** Kumiki-UI contributors and coding agents building general-purpose, reusable visual components.  
**Objective:** Make high-quality explanatory videos faster to produce across technology, science, finance, history, business, engineering, documentary, and other subjects—especially 9:16 short-form videos—without duplicating rendering or animation engines.

## 1. Non-negotiable product principles

1. **Communicate before decorating.** Every movement should serve an objective: attract attention, reveal evidence, direct focus, explain causality, illustrate scale, compare alternatives, or deliver a payoff. No arbitrary motion or forced cut cadence.
2. **Compose existing tools first.** Search `registry.json` and the catalog (`npm run catalog:find -- --query="..." --format=json`; `npm run catalog:api -- --id=... --format=json`). Prefer a recipe or adapter over a new standalone primitive when existing contracts can do the job.
3. **Deterministic, frame-addressable.** Given the same inputs and frame, produce the same state regardless of playback history. Declare FPS, cue timing, seeded effects, asset hashes, and renderer requirements. No wall-clock-only animation.
4. **A reusable component must work in at least three distinct subject areas.** Do not embed particular channels, brands, scripts, topics, or app-specific business logic into the library API.
5. **Semantic identity survives edits.** Objects, phrases, charts, and evidence retain stable IDs through transformations, cuts, reframing, and aspect-ratio changes. Unexpected identity loss is a diagnostic.
6. **Make short-form native without sacrificing comprehension.** Show meaningful content immediately where appropriate, preserve readable holds, and treat the hook's promise and the video's payoff as related. “More cuts” is not a proxy for quality.
7. **Respect output constraints.** Support independently authored 16:9 and 9:16 framing, configurable platform UI exclusion zones, CJK/RTL/long text, captions, and accessibility/reduced motion.
8. **Be honest about capabilities and rights.** Declare missing footage decoders, codecs, alignment data, rigs, geography datasets, and licenses; never fake measured data or silently substitute unlicensed assets. Follow [`docs/ASSET_SOURCING.md`](ASSET_SOURCING.md) when installed in the repo.
9. **Use inexpensive deterministic QA first.** Validate geometry, timelines, subject visibility, caption bounds, shot continuity, output capability, and provenance before optional human visual approval. No mandatory LLM screenshot grading.

**Implemented enforcement (opt-in):** `inspectExplainerPrinciples()`, `inspectSeekParity()` and `inspectComponentReuse()` in [`registry/visual/explainer-principles.ts`](../registry/visual/explainer-principles.ts) (registry item `explainer-principles`). They check *declared* data only; usage and limits are in the [visual production contract](visual-production-contract.md#explainer-principles-preflight). Each diagnostic carries its principle number.

| # | Automated check | Still an authoring obligation |
| --- | --- | --- |
| 1 | Every shot declares a `purpose`, subjects and actions; uniform cut cadence warns | Whether the motion really serves that purpose |
| 2 | — | `catalog:find` / `catalog:api` before adding a primitive |
| 3 | Rational FPS, cue frames, effect seeds, asset SHA-256; seeded random seeks equal forward play | Run seek parity on the real evaluator |
| 4 | ≥3 distinct demonstrated subject areas per reusable component | No consumer-specific names or logic in the API |
| 5 | Continuous shots keep or explicitly release subjects; every output frames critical subjects | Same semantic IDs across motion, camera and layout |
| 6 | Frame-0 subjects, hook → later payoff shot, critical holds, caption reading time (Latin/CJK) | Whether the payoff answers the hook |
| 7 | Authored (not cropped) outputs, missing aspect, text vs exclusion zones, captions measured per output, reduced motion, text summary | Measure with real fonts in every supported language |
| 8 | Requirements vs adapter capabilities, asset licences, sourced facts with units | That a licence permits this distribution |
| 9 | Pure CPU checks; human review reported as pending until recorded | Actual human review of exported frames |

## 2. What already exists — do not rebuild

The reviewed repo has **130 registry items**. Reuse the following foundations rather than introducing a parallel stack:

| Existing area | Relevant registered components / code | Build on it for |
| --- | --- | --- |
| Core motion | `motion-track`, `motion-path`, `motion-preset`, `mask-reveal`, `shape-morph`, `shared-element`, `animated-text`, `motion-director`, `motion-director-react`, `visual-transformation` | Every new reveal, transition, text animation, and hook recipe |
| Composition & camera | `explainer-stage`, `semantic-composition`, `scene-storyboard`, `camera-stage`, `camera-rig-3d`, `cinematic-camera-director` | Framing, shot planning, continuity, subject tracking |
| Diagrams & process | `diagram-stage`, `process-journey`, `flow-path`, `section-reveal`, `mechanism-sequence`, `asset-state-sequence`, `failure-cascade` | Causal, system, and mechanical explanation |
| Evidence and annotations | `media-frame`, `document-page-2d`, `redaction-reveal`, `semantic-callouts`, `inspectable-asset`, `inspect-then-quantify` | Source-backed documentary treatment |
| Data & comparison | `infographic-system`, `infographic-view`, `infographic-economic-charts`, `animated-metric`, `comparison-stage`, `dimension-overlay`, `measure-units` | Data storytelling, numeric and dimensional comparison |
| 3D subjects | `crafted-3d-hero`, `people-3d`, device/technology models, home models, finance models | Character, product, mechanical and environmental scenes |
| Production | `video-export-stage`, `video-platform-presets`, `audio-timeline-2d` | Absolute-frame capture, social output recipes, waveform/timeline visuals |

**Important limitations:** `video-export-stage` is a capture/export handshake, not a general-purpose video decoder/editor. `people-3d` provides basic shared clips but not complete facial acting or speech lip sync. Existing charts are functional visualizers but do not by themselves provide a complete semantic data-story choreography API. Roadmap/spec documents include proposed capabilities that are **not** necessarily implemented. Inspect registered source and tests rather than assuming plans are shipped.

## 3. Highest-priority component contracts (P0)

These are the most useful **new capabilities or integrations**. An item marked **recipe** should initially be implemented on existing registry primitives, not as a new renderer.

| Component / suggested registry ID | Type | Responsibility and minimum usable contract | Reuse / dependencies | Definition of done |
| --- | --- | --- | --- | --- |
| **ShortHookDirector** (`short-hook-director`) | **Recipe/compiler** | Compile `strategy`, `claimId`, `subjectIds`, `surprise`, `payoffId`, `durationFrames`, cue refs, and output format into an opening shot plan. Support action-first, unexpected reveal, impact statistic, transformation, and evidence-question strategies. | MotionDirector, VisualTransformation, Storyboard, Camera, ExplainerStage | Five data-driven hooks; same API works with finance, technology and physical-object topics; frame-0 subject visible when specified; payoff anchor validated |
| **CaptionPerformer** (`caption-performer`) | **Reusable visual layer** | Render supplied timed words/phrases with optional emphasis, speaker ID, multiple lines, wrap, style tokens, safe-zone anchoring, audio alignment confidence and precise seek. CaptionStage is its static/nonanimated mode. | AnimatedText, protected-text, video presets | Pixel-safe 9:16/16:9 captions; punctuation/CJK/RTL; late/overlapping cues diagnosed; no fabricated transcription or word timings |
| **CutDirector** (`cut-director`) | **Shot-plan compiler** | Sequence cuts, punch-ins, match cuts, whip moves, masked/foreground wipes and hold frames. Expose source/target shot IDs, matched subject IDs, transition interval, camera paths, reduced-motion fallback. | CameraStage, CinematicCameraDirector, shared-element, mask-reveal | No discontinuity in semantic identity without an explicit cut; random seek equals sequential evaluation; transitions can be disabled cleanly |
| **FrameAccurateClip** (`frame-accurate-clip`) | **Optional media adapter** | Display a real video/image sequence as deterministic source frames; support trim, crop/reframe, pause/freeze, playback-rate mapping, source frame selection and alpha/mask metadata. Decoding delegated to a capability-advertised adapter. | MediaFrame, VideoExportStage, asset manifest | Frame N resolves reproducibly; decoder unavailable yields explicit error; VFR/codec and timestamp behavior documented; audio remains a separate lane |
| **ShortSafeFrame** (`short-safe-frame`) | **Layout/validation utility** | Configurable output profile, visible and reserved regions, captions/graphics collision checks, subject/framing guards; 9:16 must be independently composed, not blindly cropped. | Existing video-platform presets, protected text, explainer layout and camera constraints | Key subjects/labels pass 9:16 and 16:9; simulated app UI overlays can be changed by profile without hard-coded platform geometry |
| **EvidenceStage** (`evidence-stage`) | **Semantic scene** | Present authorized source photographs, documents, screenshots, data excerpts or quotes; highlight exact regions, reveal provenance, annotate and transform evidence into a connected visual conclusion. | DocumentPage2D, MediaFrame, RedactionReveal, SemanticCallouts, camera | Three source types, readable provenance and exact excerpt anchors; zoom/crop preserves the cited target and visible context |
| **ChartStory** (`chart-story`) | **Semantic choreography** | Story beats for existing charts: reveal named series, establish constant axes, focus a data point, compare intervals, change scenarios, conclude with one supported claim. Do **not** create a second chart renderer. | Infographic charts, AnimatedMetric, MotionDirector | No scale/denominator deception; named data IDs survive transitions; correct values at first/last frame; chart is understandable at 9:16 |
| **ScreenSurface** (`screen-surface`) | **3D integration adapter** | Bind a browser/app screenshot, SVG/React-rendered texture, video frame or other approved media to an existing 3D device's display mesh with correct aspect/perspective and camera-aware readability. `ScreenContent3D` is a consumer-facing recipe. | Existing smartphone/laptop models, GLB/Three.js, FrameAccurateClip | Screen does not stretch beyond display bounds, textures update deterministically, perspective and screen-space callouts track the display |
| **AudioVisualCue** (`audio-visual-cue`) | **Timing bridge** | Join absolute-frame visual events to external narration/word alignments and sound-effect/beat cues. Library describes events; content-generation/export pipeline resolves audio assets and mixes tracks. | MotionDirector cue scheduling, scene storyboard, external audio pipeline | Stable event times; missing/late audio metadata diagnosed; visual-only mode works; no requirement for a DAW in Kumiki |

**Implemented (Phase 1):** [`ShortSafeFrame`](component-specs/short-safe-frame.md) (`short-safe-frame`), [`CaptionPerformer`](component-specs/caption-performer.md) (`caption-performer`) and [`ShortHookDirector`](component-specs/short-hook-director.md) (`short-hook-director`, with all five §6 hook strategies). **Phase 2 (exit condition met; human review pending — [verification](verification/2026-10-22-phase2-hybrid-short.md)):** [`CutDirector`](component-specs/cut-director.md) (`cut-director`), [`FrameAccurateClip`](component-specs/frame-accurate-clip.md) (`frame-accurate-clip`), [`AudioVisualCue`](component-specs/audio-visual-cue.md) (`audio-visual-cue`), and the [`FreezeFrameFocus`](component-specs/freeze-frame-focus.md) recipe (`freeze-frame-focus`). **Phase 3 (components built; combined exit scene pending):** [`EvidenceStage`](component-specs/evidence-stage.md) (`evidence-stage`), [`ChartStory`](component-specs/chart-story.md) (`chart-story`) and [`ScreenSurface`](component-specs/screen-surface.md) (`screen-surface`, with the `ScreenContent3D` recipe). **Phase 4 (in progress):** [`CodeStage`](component-specs/code-stage.md) (`code-stage`, first slice: listings, reveal, focus and token rings; typed edits, diffs and terminal output not yet). Still proposed: every other row.

**P0 implementation guidance:** Start with `ShortSafeFrame` + `CaptionPerformer` + `ShortHookDirector`; then build `CutDirector`, `FrameAccurateClip` and `AudioVisualCue`; then `EvidenceStage`, `ChartStory` and `ScreenSurface`. Ship **vertical slices** and do not start all components simultaneously.

## 4. High-value expansion components (P1)

| Component | What it makes reusable | Existing foundation / boundary | Representative subjects |
| --- | --- | --- | --- |
| **MapStage** | Geographical projections, regions, borders, travel/migration routes, animated location focus, legends and source attribution. Consume licensed external map geometry; do not build a geo database. | LocationPin2D, FlowPath, camera, D3/geo adapter | History, geopolitics, supply chains, population |
| **CharacterPerformance** | Layered gaze, blink, head turn, pointing, gesture timing, expression, speech visemes and contact/prop anchors over a compatible rig. Declare absent facial morphs or IK. | People3D, GLB rig actions, MotionDirector | Character-led education, interviews, human scale demos |
| **CodeStage** | Measured syntax-highlighted code, typed cursor edits, line/range focus, before/after diffs, terminal output as **displayed events only**. Do not run the displayed commands. | EditableText, DiagramStage, optional Shiki | Programming, AI, cybersecurity |
| **EquationStage** | LaTeX/AST terms with stable IDs, exact layout, step-by-step substitutions and term correspondence. Use a mature math renderer. | VisualTransformation, typography, optional KaTeX | Mathematics, physics, statistics |
| **ScaleComparisonStage** | Compare real size, distance, time or quantity with a shared labeled scale and unit conversions. | DimensionOverlay, MeasureUnits, ComparisonStage | Astronomy, architecture, economics |
| **DistributionStage** | Distributions, histograms, sampling, uncertainty intervals and probability areas with correct axes and labels. | InfographicChart, ScalarField, ChartStory | ML, healthcare education, finance, statistics |
| **GraphTopologyStage** | Networks with typed nodes/edges, hierarchy or force-layout adapter, weights, traversal, clustering, and identity-preserving topology transitions. | DiagramStage, FlowPath, ProcessJourney | Neural networks, logistics, social networks |
| **CausalSystemStage** | Causes, effects, feedback loops, interventions and counterfactual branches with explicit semantics; avoid presenting correlation as causation. | DiagramStage, FailureCascade, MechanismSequence | Climate, economics, engineering |

Treat `MapStage`, `CodeStage` and `EquationStage` as particularly strong breadth-expanding investments because the current registry has no complete equivalents. `CharacterPerformance` is an enhancement to `people-3d`, not a new character asset pack.

## 5. Specialized components (P2 — demand-driven)

Build only after a real production proves the gap; first investigate whether a recipe/adapter suffices.

| Capability | Suggested approach |
| --- | --- |
| **ScientificPlotStage** | Coordinate axes, vectors, function curves, geometric constructions, dimension-aware labels; share existing chart math where feasible |
| **ParticleFlowStage** | Seeded particles, trajectories and scalar-field-driven motion; deterministic CPU/evaluation model with optional GPU renderer; avoid fake simulation claims |
| **AnatomyStage** | Approved biological/mechanical models + section views, internal layers and anchored labels; compose `SectionReveal` and `InspectableAsset` |
| **SimulationPlayback** | Consume precomputed state snapshots for physical models, algorithms and population simulations; seek and interpolate, never silently simulate from wall time |
| **TimelineStoryStage** | Historical/chronological narrative with dated events, variable intervals, scene evidence and period comparisons; compose existing timeline and storyboards |
| **TitleSequence** | Attractive open/chapter/close systems with semantic titles, typographic tokens and camera presets; usually a recipe, not a primitive |

## 6. Short-form editing treatments: make these **recipes**, not engines

| Recipe | Narrative purpose | Implementation building blocks |
| --- | --- | --- |
| `VisualContradictionHook` | Reveal something unexpected yet accurate in a familiar subject | VisualTransformation + 3D subject + mask/camera |
| `ImpactStatisticHook` | Put a surprising **verified** number in context, not just giant text | AnimatedMetric + kinetic text + ChartStory |
| `ActionFirstHook` | Begin with an observable process already underway | MechanismSequence + camera + close-up |
| `TransformationHook` | Show a before/after contrast before explaining why | ComparisonStage + shared-element + match cut |
| `EvidenceMysteryHook` | Establish a specific question and relevant evidence; later resolve it | EvidenceStage + semantic callouts |
| `FreezeFrameFocus` | Pause real footage or animation to examine an exact detail | FrameAccurateClip + SemanticCallouts |
| `ImpactTypography` | Large headline/number -> labeled physical/chart object | AnimatedText + VisualTransformation |
| `AttentionTransition` | Context-dependent wipe, snap, occlusion, rack focus or whip | CutDirector + camera/mask presets |
| `SplitScreenStory` | Keep alternatives genuinely comparable | ComparisonStage + synced camera/frame mapping |
| `LoopBridge` | Optional end-to-start visual/audio continuity with no false payoff | Shot boundary validator + AudioVisualCue |
| `HookVariantComposer` | Parameterized A/B/C versions of the same factual claim | ShortHookDirector presets; analytics lives in the production app |

**Never encode a rule such as “cut every 1.5 seconds.”** Prefer a validated event or information change: new evidence, new state, movement of the focal subject, a comparison, or an intentional reset. The shortest acceptable shot is the one that remains interpretable.

## 7. Reusable explainer **story recipes** (layer above components)

| Recipe | Visual grammar | Cross-domain examples |
| --- | --- | --- |
| `ClaimEvidenceReveal` | Claim -> source -> focused evidence -> consequence | Policies, research reports, historical records |
| `MechanismExplainer` | Whole object -> cutaway -> moving parts -> outcome | HVAC, engines, cells, computing hardware |
| `CostBreakdown` | Total -> contributors -> scenarios -> takeaways | Housing, energy, subscriptions, manufacturing |
| `BeforeAfterAnalysis` | Shared baseline -> change -> comparable result -> trade-offs | Product reviews, interventions, renovation |
| `JourneyExplainer` | Origin -> pathway -> transformation/handoff -> arrival | Internet traffic, logistics, biology |
| `ScaleIntuition` | Familiar reference -> enlarged/converted measure -> verified comparison | Astronomy, budgets, dimensions |
| `ProblemSolution` | Observable failure -> mechanism -> correction -> result | Technology, engineering, systems |
| `VisualProof` | Question -> diagram/equation/evidence -> transformation -> justified answer | Math, statistics, science |

These are **parameterized compositions** with stable semantic slots, not topic-specific React components. A recipe must also define where a clear conclusion/payoff becomes visible.

## 8. Technical contract shared by every new animated component

Keep the source/model distinct from its rendering adapter:

```ts
// Illustrative design sketch — NOT a shipped Kumiki API.
interface VisualComponentSpec {
  schemaVersion: 1;
  id: string;
  durationFrames: number;
  fps: { num: number; den: number };
  semanticSubjects: readonly string[];
  cues?: readonly { id: string; frame: number; kind: string }[];
  assets?: readonly { id: string; uri: string; sha256?: string; licenseRef?: string }[];
  output?: { width: number; height: number; safeRegionProfile?: string };
}

interface FrameEvaluation<T> {
  evaluate(spec: VisualComponentSpec, frame: number): {
    state: T;
    diagnostics: readonly { code: string; severity: "info" | "warning" | "error"; targetId?: string }[];
  };
}
```

**Design requirements:**

- One canonical absolute-frame time source; no `setTimeout` or mutable animation accumulator needed to evaluate frame N.
- Geometry, animations, responsive composition and visual styles are separate concerns. Reuse existing motion, camera and layout contracts; do not redefine an incompatible scene format.
- Inputs explicitly contain the **fact**, its **units** and evidence/source ID where applicable; visual code must not invent data.
- Export/preview adapters advertise supported codecs, GLB, clip decoding, transparency, post-processing, and typography. Unsupported modes produce actionable errors or explicitly accepted fallbacks.
- Optional dependencies (geography, math, syntax highlighting, rig/IK, video decoding) stay outside the minimal UI installation path.
- Assets comply with commercial-use and redistribution requirements; log exact authors, original URLs, notices and license versions in the correct manifest.
- Provide both a reduced-motion or static equivalent and a truthful textual summary where the information would otherwise exist only in animation.

## 9. Deterministic quality gates

Required for the respective capabilities; do not substitute subjective “viral scores” for correctness:

| Check | Deterministic assertion |
| --- | --- |
| `FirstFrameVisibility` | Required subject/focal region visible in frame 0 or explicitly justified otherwise |
| `HookPayoffContract` | The visual question/claim points to an existing future payoff ID; cannot prove audience satisfaction |
| `FocusCompetition` | Concurrent *declared* focal subjects stay within authored limits; cannot infer visual salience perfectly |
| `CaptionSafeZone` | Text bounds, duration, contrast, reserved overlays and wrap policy validated for each output profile |
| `NarrationSync` | Timed word/caption/gesture events align to supplied timing data with stated tolerance |
| `CutContinuity` | Match-cut anchors, attachment ports, semantic IDs and camera states resolve at cut boundaries |
| `CriticalReadableHold` | Critical labels, numbers and evidence remain visible for author-declared minimum frames |
| `AspectFrameValidation` | 9:16 and 16:9 subject bounds checked separately; no blind center-crop assumption |
| `DataIntegrity` | Numbers, intervals, units, scale policy and chart source match the supplied semantic source |
| `SeekParity` | Frames sampled in arbitrary order equal their forward-play counterparts within renderer tolerance |
| `CapabilityAndRights` | Decoder/font/rig/asset capabilities and redistribution notices present; missing requirements fail visibly |
| `VisualReview` | Human approval recorded for actual exports; automated passes alone do not certify premium quality |

Performance tracking (**outside Kumiki-UI**): compare hook variants using platform-specific retention, viewed-vs-swiped, average watch time, completion, replay and sharing data when available. An editing technique alone is not a guarantee of virality; platform recommendations and perception studies are starting hypotheses, not causal proof that every zoom/cut/caption improves retention.

## 10. Delivery sequence — small, installable slices

| Phase | Deliverable | Real-world demonstration and exit condition |
| --- | --- | --- |
| **0 — Baseline** | Verify current catalog/registry, production contracts, and 9:16 capture. Avoid duplicate primitives. | Record applicable tests and missing capabilities for one existing short scene. |
| **1 — Hooks and captions** | `ShortSafeFrame`, `CaptionPerformer`, `ShortHookDirector` + three hook recipes. | 15–30s vertical explainer with 3 interchangeable factual openings; correct captions, subjects, frame-seek parity, one meaningful payoff. |
| **2 — Editing and footage** | `FrameAccurateClip`, `CutDirector`, `AudioVisualCue`, `FreezeFrameFocus` recipe. | Hybrid sequence including real clip, 2D graphic, 3D scene and externally supplied audio; deterministic export with transparent failure reporting. |
| **3 — High-leverage semantic visuals** | `EvidenceStage`, `ChartStory`, `ScreenSurface`. | Same components reused to explain a document, a dataset and a physical/digital product; no bespoke renderer for each. |
| **4 — Subject breadth** | `MapStage`, `CodeStage`, `EquationStage`, `CharacterPerformance`; then `ScaleComparisonStage`, `DistributionStage`, `GraphTopologyStage`, `CausalSystemStage`. | Three unrelated domains per major component, with demonstrated reuse, reference capture and quality evidence. |
| **5 — Demand-based polish** | More motion treatments, simulation/anatomy/science tools, A/B hook variants and templates. | Only add when actual productions reveal gaps and existing components cannot compose the result cleanly. |

**Per-slice completion:** spec + minimal typed API + realistic sample scene + documented capabilities/fallbacks + registry install + unit tests + arbitrary-frame test + bounds/safe-zone validation + actual rendered review + source/license records when applicable. Do not claim a polished preview equals a proven production export.

## 11. Agent execution instruction

> Before coding, read `AGENTS.md`, `docs/INDEX.md`, relevant existing specs, `registry.json`, and the catalog. Select **one** proposed component/recipe from this document. Show which existing registered components you will reuse, which exact capability remains missing, why a new item is justified, and its public API. Build a complete vertical slice; don't introduce a duplicate animation clock, renderer, generic charting engine, or video encoder. Validate deterministic arbitrary-frame evaluation, 16:9/9:16 framing, source/data integrity and source licenses. Provide a real demo across multiple subject areas where reasonable. Run applicable registry, typecheck and tests; record exact failures and visual-review status. Stop after the selected slice and report what is implemented versus still proposed.

### Optional adoption note

When integrating this file into the repo, place it at `docs/17-explainer-visual-components.md` (or another single authoritative path), add one entry to `docs/INDEX.md`, and link it from the relevant section of `AGENTS.md`. **Do not replace** existing `docs/07–16` or duplicate their already-authoritative low-level contracts. Treat this document as a *gap and composition roadmap*, then migrate individual specifications into `docs/component-specs/` only when implementation begins.
