# 20 — Reuse-First Build Priorities for Premium Explainer Films

**Status:** Prioritized implementation decisions, **not** a verification report or a claim that the proposed work ships. Audited against `main` at `e2632e6dc99b4946f7a9950978657d86af8ffc75` on 2026-10-24 (153 `registry.json` items). **Re-audit the branch immediately before implementation.**

**Objective:** Make Kumiki-UI capable of producing distinctive, comprehensible, code-authored 2D/3D explainer films without inventing duplicate animation, chart, audio, clip, or rendering engines. ContentGen and other consumers own research, factual approval, scripts, asset retrieval/rights, narration generation, mixing, UX, and publishing; Kumiki owns visual building blocks, deterministic direction/inspection, and reproducible render interfaces.

This is the **implementation queue and non-duplication map**. [18 — Film Style Grammar](18-film-style-grammar-and-direction.md) remains authoritative for the film-wide directing contract, [19 — Clip-Led Production](19-clip-led-production-and-revision-handoff.md) for footage/export handoff, [17 — Explainer Visual Components](17-explainer-visual-components.md) for product principles, [11 — Rendering Quality](11-rendering-quality.md) for clocks/adapters, and [04 — Quality](04-quality-and-testing.md) for release gates. **Do not copy their specifications into new systems.**

## 1. Decision in one page

| Rank | Decision | Implementation target | Exact additional capability / outcome |
| --- | --- | --- | --- |
| P0.1 | **BUILD one small policy layer**, already specified in doc 18 | `FilmStyleGrammar` (provisional public ID, only if catalog still lacks it) | One validated, data-only film-wide selection of native visual moves, rhythm, looks and forbidden treatments. No renderer/clock/editor. |
| P0.2 | **EXTEND**, do not add `VisualTreatmentDirector` | `registry/motion/attention-editing-*`, `registry/motion/semantic-direction.ts`, existing ES1/MD1 adapters | Deterministic `shot purpose + subjects + evidence + aspect + grammar -> compatible registered recipe`, with explicit diagnostics and visual variety rules. |
| P0.3 | **EXTEND**, do not add `NarrationPacingEngine` | `registry/video/audio-visual-cue.ts`, existing MD1 scheduling/XP1 gates | Calculate and validate shot/read/anticipation holds around **supplied** word alignment and cue frames; no TTS, audio clock or audio mixer. |
| P0.4 | **EXTEND**, not a new QA framework | `registry/visual/explainer-principles.ts`, `explainer-preflight.ts` | Only truly missing *cross-shot* style/semantic coherence diagnostics; retain existing hook/payoff, holds, safe-frame, fact/rights checks. |
| P0.5 | **PROVE with real output** | Doc 18 pilots + doc 19 K6 example/qualification path | One full-speed 60–90s film with licensed real footage, meaningful 2D/3D handoff, word-timed speech, SFX, true 16:9 and 9:16 compositions. |
| P1.1 | **BUILD** a genuinely missing semantic primitive | `EquationStage` | Authored equation steps; stable term identity; meaning-preserving term-to-term transitions; frame-accurate, readable SVG/math typesetting. |
| P1.2 | **EXTEND** `CodeStage` | `registry/visual/code-stage.ts` and React view | Deterministic typed edits, line/token diff, and simulated terminal output; do not execute user code. |
| P1.3 | **QUALIFY/PACKAGE**, do not reimplement | `CausalSystemStage` existing TS + view | Verify API/tests/stories and decide whether to register the current implementation. |
| P1.4 | **CONDITIONAL EXTENSION** only after a failing reference film | `shared-element`, `semantic-composition`, `inspect-then-quantify` | If semantic identity cannot cross a specific footage -> 3D -> chart handoff, add the smallest adapter to the existing contracts. |
| P2 | **DEFER / DO NOT BUILD** | Standalone `TimelineStoryStage`, another chart/map/graph engine, GSAP-like runtime, video renderer, 3D post-processing engine, caption editor, lip-sync rig | Already covered, currently low priority, or outside Kumiki's ownership. |

**Interpretation:** `BUILD` means a new semantic API may be warranted. `EXTEND` means edit an existing exported contract. `QUALIFY` means existing code does not yet imply installable/release-ready. `PROVE` is an artifact and acceptance gate, not a component. `DEFER` is an explicit rejection of duplicate work.

## 2. Existing implementation inventory: check here before naming anything new

The implementation paths below were inspected, not inferred from a title in an older roadmap. **Missing exact brand-new names does not imply missing functionality.**

| Apparent gap / proposed name | Existing owner and evidence | Decision |
| --- | --- | --- |
| `TimelineStoryStage` | `registry/infographic/visualizers.ts` already exposes `TimelineSection`, `TimelineMilestone`, `timelineBlock`, and `renderTimelineSection`; timed intervals, date-aware axes, horizontal/vertical measured layout. `registry/motion/timeline.ts`, `progressive-reveal`, `motion-track`, and MD1 supply animation. | **Do not build.** If a concrete timeline reveal is hard, compose a recipe over these. Only extend measured timeline output if an actual test fixture proves a missing anchor. |
| `EquationStage` | No equation/math/LaTeX renderer or registered equation-story primitive located in the main tree/153-item manifest; docs 09/17 mention it as a proposal. | **Build** narrowly, after P0. Distinct from generic `EditableText`, `KineticType` or `VisualTransformation`. |
| New `CausalSystemStage` | `registry/visual/causal-system-stage.ts` + `causal-system-stage-react.tsx`, Storybook and a test file exist; causal interventions, evidence labels, signed paths and measured layout are implemented. No corresponding item was found in `registry.json`. | **Do not rewrite.** Audit and qualify, then register if installable and truly stable. |
| New `ChartStory`/infographic engine | `registry/infographic/chart-story.ts` + view, `registry/infographic/chart.ts`, economic charts, `DistributionStage`, `GraphTopologyStage`, `ScaleComparisonStage` and related components. `ChartStory` already enforces constant domains and data-checked claims. | **Do not build.** A new chart style must reuse marks, scales, IDs and validation. |
| New `VisualTreatmentDirector` | `registry/motion/attention-editing-recipes.ts`, `attention-editing-treatments.ts`, `attention-editing-compositions.ts`, `registry/motion/semantic-direction.ts`, MD1 and ES1. Hook, montage, impact type, speed ramp, split-screen, evidence spotlight, visual contradiction, loop bridge, camera dive and match-transformation recipes are real. | **Extend selection policy** through doc 18 grammar. No second directing runtime. |
| New opener/hook strategist | `registry/visual/short-hook-director.ts` already provides five semantic hook strategies, word-alignment hook beat offsets, first-frame guarantees and an ordinary MD1 group; `attention-editing-*` additionally includes hook variants. | **Do not build.** Film policy should choose/parameterize `ShortHookDirector`, not reproduce its strategies or tracks. |
| New `NarrationSync` or audio clock | `registry/video/audio-visual-cue.ts` resolves words/segments/beats/sounds to absolute frames, tests link tolerance, exposes captions and FFmpeg mix arguments. `director-schedule.ts` already plans frame offsets/dependencies. | **Extend hold-policy only**; keep alignment input external and one rational FPS. |
| New captions/short safe frame | `CaptionPerformer`, `CaptionTrack`, `ShortSafeFrame`, existing XP1 readability/portrait/safe-zone checks. | **Do not build.** Consume or tighten existing rules. |
| New `SemanticWorldBridge` | `shared-element.ts`, `semantic-composition.ts` (3D subject projection), `inspect-then-quantify`, `hero-still-bridges` plus documented K2 clip -> annotated data handoff. | **No generic engine**; add a local adapter only if cross-medium identity fails in a real fixture. |
| New 3D cinematic render/effects | `registry/craft/hero-render.ts` already contains depth of field, ambient occlusion, bloom, supersampling, tone/color pipeline and frame-deterministic motion blur. `hero-stage-set.ts` owns scale and staging. | **Do not build.** Grammar look presets may configure this implementation and footage finishing, not fork it. |
| New timeline/shot editor, clip decoder, exporter | MG1 / MD1 / CC1 / `CutDirector` / `FrameAccurateClip` / `VideoExportStage`, streaming/resumable FFmpeg export and K0–K5 checks documented in 19. | **Do not build.** Finish production qualifications and user-visible proof. |
| New quality or AI screenshot judge | `explainer-principles.ts` (XP1) + `explainer-preflight.ts` + visual production contract already report intent, identity, geometry, captions, source/rights, hold and hook/payoff diagnostics. | **Extend specific rules only**; never add LLM screenshot review to routine QA. Human visual approval remains independent. |
| New thumbnail layout/composition framework | Registered thumbnail composer and template/spec material already exist. | **Not on this film-production queue.** Improve only against a failing thumbnail use case. |

Catalog/source ownership must win over stale prose: docs 17 and older component specs contain planned items that have since been implemented. Check *code + manifest + stories/tests*, not just status labels.

## 3. Comparative library research — useful ideas, not new dependencies by default

Only official projects/documentation were used. Each row describes a **pattern to learn**, the **current native owner** and the **incremental gap**. None is blanket approval to embed the upstream runtime or accept its license unreviewed.

| Reference library / official source | Concrete design insight | Kumiki mapping; action |
| --- | --- | --- |
| [Manim `TransformMatchingTex`](https://docs.manim.community/en/stable/reference/manim.animation.transform_matching_parts.TransformMatchingTex.html) / [`MathTex`](https://docs.manim.community/en/stable/reference/manim.mobject.text.tex_mobject.MathTex.html) | Identify matching meaningful terms between mathematical expressions; animate kept/moved/replaced terms, not just crossfade entire formula images. | **P1 EquationStage.** Use explicit author term IDs and mappings. Do not port Manim or assume automatic symbolic correctness. |
| [Motion Canvas flow](https://motioncanvas.io/docs/flow/) / [CodeBlock](https://motioncanvas.io/docs/code-block) | Author teaching sequences, syntax-aware code edits, readable holds and focus transitions with controllable timing. | MD1/MG1 provide timing; existing `CodeStage` provides basic reveal/focus. **P0 pacing extension, P1 typed diffs.** Do not add generator-based clock. |
| [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/) / [MotionPath](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/) | Preserve perceived object identity across layout changes; follow meaningful trajectories. | Existing `shared-element` and `motion-path` already cover the primitive. **Reuse**; no GSAP runtime requirement. |
| [Remotion transitions](https://www.remotion.dev/docs/transitioning) / [captions](https://www.remotion.dev/docs/captions/displaying) / [license](https://www.remotion.dev/docs/license/pricing) | Multi-shot transitions, caption treatments and reproducible compositions belong to one controlled timeline; integration/licensing matters. | Already `CutDirector`, captions, cue clock, export. **No new renderer.** Remotion is reference only, not an approved dependency. |
| [Theatre.js Sheets](https://www.theatrejs.com/docs/latest/manual/sheets) | Coordinate animated properties for different objects/cameras within a coherent shot. | Already MD1 + CC1 + typed camera targets. **Reuse**, not an additional timeline. |
| [Apache ECharts universal transition](https://echarts.apache.org/handbook/en/basics/release-note/5-2-0/) | Match data identities across changing visualization forms, then animate shape/position changes rather than inventing unrelated charts. | `ChartStory` already uses semantic IDs and a fixed data domain. **Test existing behavior**, extend only for a proven unsupported mark handoff. |
| [Observable Plot scales](https://observablehq.com/plot/features/scales) | Scales and marks express quantitative truth, separate from styling and motion. | Existing infographic/chart renderer and claims/units checks are owner. **No second chart API.** |
| [MathJax SVG output](https://docs.mathjax.org/en/latest/output/svg.html) / [KaTeX](https://katex.org/) | Typeset mathematical notation reproducibly into a measured visual; SVG may support stable export; KaTeX provides a fast HTML/MathML option. | **Prototype for EquationStage**. Verify bounding/term ID preservation, fonts, license, optional bundle size, offline headless output before choosing one. MathJax advertises [Apache-2.0](https://docs.mathjax.org/en/stable/misc/faq.html); KaTeX declares MIT. |
| [Three.js color](https://threejs.org/docs/pages/Color.html) / [React postprocessing](https://react-postprocessing.docs.pmnd.rs/effect-composer) | Maintain coherent color, exposure and depth treatment across physically lit scenes. | `hero-render` already implements effects; **P0 grammar look presets only**, test real 2D/3D/footage match. No replacement composer. |
| [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html) | Ducking, fades and loudness correction are production/mix concerns. | Existing `AudioVisualCue` manifests and ContentGen/export owner. **Do not build audio mastering or sound synthesis in Kumiki.** |
| [Rive state machines](https://rive.app/agents) | State-driven motion is effective for reactive UI and characters. | Kumiki's target is frame-addressed explainers; no demonstrated gap calling for Rive runtime or new state-machine owner. **Defer.** |

**Research conclusion:** The missing differentiator is **art-directed use of existing primitives to teach one thing at a time**. Higher component counts, random effects and another timeline will not solve repetitive/boring output. The exception is specialized mathematical term identity, which is not covered by generic shape/text morphs.

## 4. Ordered work packages (implementation contracts)

### P0.1 — FilmStyleGrammar: implement the existing doc 18 proposal, once

- **Purpose:** A project/film looks and behaves coherently beyond per-shot templates: opening suspense, subject continuity, camera language, reveal rhythm, evidence clarity, sound *intent*, negative rules and payoff.
- **Build vs reuse:** New **data-only** grammar record/resolver allowed; its native operations must point to registered recipes and run through existing ES1/MD1/CC1/MG1/VT1. Doc 18 owns the detailed schema and three pilot art directions. Do not create parallel types named `CreativeDirector`, `VisualTreatmentDirector` or `FilmMotionRuntime`.
- **Suggested sequence:** (1) inventory installed operation IDs/capabilities, (2) define immutable grammar IDs/version + safe overrides + output-profile restrictions, (3) compile a `shot role + semantic purpose` lookup into installed operation references, (4) reject missing IDs, missing source/rights/capabilities and forbidden operations, (5) hand result to current director without owning a clock or drawing any content.
- **Files to touch:** proposed narrow `registry/visual/film-style-grammar.ts` (only if absent), registry export/manifest **once**, small adapter(s) to `registry/motion/semantic-direction.ts`/ES1; specs/tests/stories follow current component standards. No separate `film-renderer.ts`.
- **Proof / done:** Technical Drafting, Evidence & Data Investigation, Connected Process World on at least **two unrelated domains each**; results visibly change composition/action beyond color swap; deterministic same-frame evaluation; errors point to `shotId`, role, ID and capability; no new library clock. Implement only the acceptance plan in [18](18-film-style-grammar-and-direction.md), not a competing prose spec.

### P0.2 — Semantic treatment selector: extend attention-editing and existing semantic director

- **Purpose:** Avoid boring cycles of slide/card, badge, progress bar, and generic particles while preserving storytelling clarity. A `compare` shot should not receive the same transition as `investigate`; meaningful subjects remain visible through their handoffs.
- **Implementation:** Pure `selectNativeTreatment({ purpose, shotRole, semanticSubjects, evidenceRoles, grammarId, availableCapabilities, aspect, recentTreatmentIds })` returning **registered recipe ID(s) with parameter bindings**, rejection reasons and an explainable choice trace. The signature is an illustration; use existing contract types rather than inventing new public parallel shot types. Implement this as an **internal FilmStyleGrammar resolver**, not another installable `selectNativeTreatment` component, unless the catalog shows a real independent use case. Resolve policy from P0.1; compile into existing `attention-editing-*`, `semantic-direction`, `ShortHookDirector` (for openers), MD1/CC1/ES1. Choose from only compatible candidates, apply deterministic ranking/variety penalties (not random choice), use an explicit fallback that preserves comprehension.
- **Do not create:** A second set of `ShortHookDirector`, `HookVariant`, `EvidenceSpotlight`, `BeatMontage`, `VisualContradiction`, `SpeedRamp`, `SharedElement` or `MatchTransformation` implementations: these already exist.
- **Done:** 3 film fixtures (mechanism, numerical comparison, evidence investigation), at least 2 aspects; treatment decisions are frame/order reproducible and non-identical when semantic requirements differ; unsupported recipe is an actionable diagnostic **not** a generic blank visual.

### P0.3 — Narration-aware reading/anticipation budgets: extend cue and schedule validation

- **Purpose:** Your narration, movement, title and key result need room to breathe without dead air, rushed diagrams or sound hits late relative to visual events.
- **Implementation:** **Supplied** speech word/segment alignment -> absolute rational frames using `AudioVisualCue`, existing cues and existing MD1 schedule. Compute allowed windows for `introduce`, `demonstrate`, `read`, `emphasize`, `resolve` phases from authored reading holds/target word ranges. Add opt-in constraints and diagnostics (e.g., move starts after subject was named, key result vanishes before its narrated explanation, overlapping emphasis and unreadable text). Do not silently time-stretch TTS or move fixed evidence timestamps; surface constraint conflict to consumer. Hook into existing `criticalHolds` and caption timing checks in XP1, which **already exist**.
- **Files:** `registry/video/audio-visual-cue.ts`, `registry/motion/director-schedule.ts` or their small non-breaking helpers, `registry/visual/explainer-principles.ts` for precise cross-cut warnings. Put one source of truth for frame conversion in existing routines.
- **Done:** With word timing, exact seek and 24/30fps reproducibility; same film with no audio returns explicit visual-only behavior; failing overlaps yield shot/cue IDs/frames; no new TTS, beat detector, soundtrack mixer or browser clock.

### P0.4 — Cross-shot coherence checks: extend XP1, never fork preflight

- **Purpose:** Catch structural patterns responsible for weak explainer output before human review: repeated decorative treatment despite declared different purposes, high-priority subject unexpectedly disappearing, unrelated camera motion, and inadequate eye-rest between competing attention targets.
- **Scope after audit:** XP1 **already checks** purpose declarations, uniform cut cadence, subject identity, first frame, hook/payoff, minimum critical holds, caption reading, safe zones, clip/source/rights, facts/units, accessible alternatives and review status. **Do not add these rules again.** Only add *new* optional declarative diagnostics for film grammar policy: forbidden/repeated treatment IDs over a configurable window, concurrent competing `emphasis` events and style continuity violations. Use IDs/timing/capabilities, not subjective pixel aesthetics. Distinguish error, warning and human-review note.
- **Done:** Golden positive/negative manifests demonstrate no false duplicate warnings for justified repeats; 16:9 and 9:16 preflight; test determinism and reasonable CPU runtime; never claim automated aesthetic review has passed.

### P0.5 — One finished reference film (doc 19 K6): validation before more primitives

- **Purpose:** Stop judging production quality from isolated Storybook cards. Prove all pieces cooperate in a film someone could actually watch.
- **Assets/flow:** Use a cleared/licensed **real** clip (not synthetic video), a specific observed/illustrative subject and source labels, one annotated inspection, one rendered 3D explanation when relevant, and one numerically faithful chart/payoff. Prepare narration through the consuming pipeline (Fish Audio or other licensed user choice), feed actual word alignment into `AudioVisualCue`, use real SFX assets with rights recorded. Author **independent** 16:9 and 9:16 layouts; do not blindly crop.
- **Proof:** Export actual MP4 with current browser/FFmpeg path, include first frame, action/transition extrema, labeled payoff, normal-speed watch/listen review by a human and a revision log for issues. Check pacing, clipping, 2D/3D lighting cohesion, visual focus, caption readability, evidence integrity, camera tracking and audio sync.
- **Do not build:** Another renderer, batch job orchestrator, footage crawler, rights database, TTS provider, or auto-approval model. [19](19-clip-led-production-and-revision-handoff.md) owns export/handoff details and already records K0–K5 results. If the film fails, fix the **smallest current component or adapter** demonstrated by that failure.

### P1.1 — EquationStage: the genuinely new reusable component

- **Purpose:** Teach algebra, finance formulas, engineering calculations, ML loss/gradient updates and dimensional analysis with semantic continuity. Example: `payment = principal × factor` -> highlight a term -> substitute a source-backed numeric value -> simplify while keeping matching terms in place.
- **Boundaries:** `EquationStage` is **not** a CAS, proof checker or general math animation runtime. It may reject ambiguous mappings and cannot assert algebraic equivalence. Source/calculation correctness is the consumer's responsibility (or an independent validated calculator); labelled illustrative numbers must remain labelled illustrative.
- **Candidate input:** `steps: [{id, expression, terms:[{termId, authoredSpanOrSlot, role, optionalSourceId}], durationFrames, explanation?}]`, authored `termMappings: [{fromStep, fromTermId, toStep, toTermId, action: preserve|move|replace|introduce|remove}]`, typography, output bounds and target profile. This sketch **must be reconciled with MG1/VT1 contracts**; no new internal clock. A renderer-agnostic layout result exposes term bounds and warnings, and a React view consumes the resolved layout at an absolute frame.
- **Prototype first:** Render 3 genuine examples using **MathJax SVG output** versus **KaTeX HTML/MathML** in the actual headless export environment. Verify whether authored term IDs survive rendering and yield stable bounding boxes; otherwise wrap **explicit per-term segments** in layout slots instead of brittle SVG node-count matching. Verify mathematical spacing/fonts, fractions, roots, superscripts, baseline, 16:9/9:16, dark/light, CJK adjacent prose, and font licensing. Pin chosen optional dependency, assess bytes/maintenance. Do **not** import Manim itself.
- **Motion:** Match authored `termId`; translate/scalably morph using existing `shared-element`, `shape-morph`, VT1/MG1; enter/exit with native masks/fade, maintain baseline stability. Reject missing/duplicate IDs and moves beyond safe bounds. Provide static/reduced-motion alternative.
- **Done:** Solve/derive, numeric substitution with correct units, and symbolically matched ML expression, each in two aspects; seek parity at keyframes; unlinked terms handled deliberately; no clipped math, oscillating baseline or hallucinated equivalence. Add registered item, tests, Storybook and component spec only **after** prototype is proven.

### P1.2 — CodeStage editing narrative: extend existing CodeStage

- **Purpose:** Show a bug -> edit -> test result sequence in coding/cloud/AI tutorials, without unreadable screenshots or a simulated execution engine.
- **Modify:** `registry/visual/code-stage.ts` and `code-stage-react.tsx`. Existing `CodeStageBeat` supports `establish`, `reveal`, `focus`, `token` only; source code explicitly says typed edits/diffs/terminal output are **not** in the current slice. Add authored source revisions and stable line/token IDs, `edit`/`diff`/`output` beats as a bounded extension or adjacent typed layer consumed by the same view. Focus moves may use existing shared-element/VT1; all text remains measured and stable across edits. No shell execution, language server or terminal emulator.
- **Done:** Three-language fixtures, added/removed/moved lines, syntax highlighting from supplied tokens, narrow portrait focus, long-line diagnostics, and deterministic seek/scrub. Do not break old `CodeStageSpec` data.

### P1.3 — CausalSystemStage: qualification/registration, not development from scratch

- **Evidence:** Existing core already offers signed causal links, explicit observational-vs-causal evidence, feedback loops, `do(X=state)` interventions, qualitative propagation, counterfactual panels, measured layout and React view; its code and Storybook exist.
- **Work:** Confirm tests, naming/export surface, package dependency closure, installer smoke test, registry item and doc spec. If implementation is private/intentionally excluded or failing a documented gate, say why; fix narrowly. Do not make another `CausalGraphStage`.
- **Done:** One installable export with 3 different scenarios (business cost, network incident, public-health illustrative model) and invalid-causality/error fixtures; tested responsive bounds. The component does **not** certify causal truth.

### P1.4 — Cross-medium identity adapter only if P0.5 proves it necessary

- **Trigger:** A reproducible scene where a marked *real footage subject* cannot be carried as the same `semanticId` and measured focus through existing `FreezeFrameFocus` -> `semantic-composition` / `shared-element` -> `inspect-then-quantify` -> `ChartStory` without losing source provenance.
- **Implementation if triggered:** One small typed binding adapter translating existing subject IDs, projection/anchor geometry and source/rights metadata. Never create a second world graph, camera or transition engine.
- **Done:** Before/after screenshots plus absolute-frame fixtures show the same subject, truthful evidence label and correct focus from clip to 3D section to chart. **Otherwise mark this item `NOT NEEDED`.**

## 5. Hard gates against accidental duplication

Before opening **each** implementation PR, fill out the short engineering checklist in its PR description, *not* a standalone repository verification report:

1. **State a precise visual failure.** Attach a reproducible scene / frame range / output aspect. “Make videos more cinematic” is insufficient.
2. **Search installed catalog:** `npm run catalog:find -- --query="<concept>" --format=json` and `npm run catalog:api -- --id=<candidate> --format=json`. Also search `registry/`, `src/`, `tests/`, `docs/component-specs/` with `rg -n 'name|synonym|API'`. Look for semantic equivalents, not only exact names.
3. **Classify `REUSE / EXTEND / BUILD / QUALIFY / DEFER`.** Write the existing owner and the missing input/output or invariant. If two APIs do the same thing, consolidate/adapt before adding another public item.
4. **No duplicate owner:** The renderer, frame/timebase, chart scale/mark generator, caption/audio alignment, camera director, visual validator, catalog and licensing all have existing owners. A new component must consume those APIs, not contain local replicas.
5. **Prototype one concrete differentiator** on at least two unrelated domains before adding registry names. Generic reusable primitives should demonstrate **three** distinct domains before promotion where practical. A bespoke mortgage/house-only effect belongs in a domain asset pack, not core.
6. **Require deterministic evidence:** Pure frame evaluation, seek parity, 16:9/9:16 authored layouts, safe bounds/readability, truthful measured values, rights/source labels, static alternative, and CPU-only preflight. No LLM screenshot judging in CI.
7. **Respect scope and third-party dependencies:** Declare licenses, security, browser/headless support and install footprint. Study external libraries; add a runtime only after demonstrating why existing internals cannot implement the behavior. Do not import GSAP, Remotion, Theatre, ECharts, Rive or Manim simply because they inspired a technique.
8. **Keep one authoritative spec:** Extend existing doc 18/19/17 and component specs as appropriate; this doc tracks order/duplication decisions only. The implementation PR updates its owning spec, manifest, tests and stories and explicitly notes whether earlier plans were superseded.

### Suggested work split for sequential PRs

| PR | Work | Merge gate |
| --- | --- | --- |
| 1 | P0.1 grammar metadata + one technical-drafting pilot, no visual runtime | Catalog-resolved operations, explicit failure modes, seek parity |
| 2 | P0.2 treatment selection + P0.3 cue pacing + P0.4 diagnostics (one cohesive API extension PR) | No duplicate clock/validator; 3 narrative fixtures, exact-frame checks |
| 3 | P0.5 60–90s complete film and targeted corrections | Actual export and normal-speed human review, evidence and audio/captions, both aspects |
| 4 | P1.1 EquationStage prototype then registered component if feasible | 3 distinct mathematical lessons and reliable term mapping |
| 5 | P1.2 CodeStage extension + P1.3 causal qualification (can split if unrelated) | Backward-compatible code beats, installable causal API |
| conditional | P1.4 only for documented handoff failure | Existing semantic IDs remain consistent; no new rendering system |

**Stop rule:** If PR 1–3 do not materially improve the complete reference film, fix that film or revise the style grammar **before expanding the primitive catalog**. Useful production proof matters more than the number of exported components.

## 6. Open research/design risks to resolve by tiny spikes, not speculative systems

- **Term-aware math rendering:** MathJax SVG and KaTeX output are not guaranteed to preserve semantic term grouping as independently movable elements. Prove authored term anchors in a small headless prototype **before** choosing a dependency or promising formula morphs.
- **Timeline narrative animation:** Existing infographic timeline's primitives may not expose every desirable marker anchor. First try `timelineBlock`'s geometry and MD1/`progressive-reveal` to make a three-event story. Add an anchor field only if the proof fixture fails; do not name a parallel TimelineStoryStage.
- **Film-wide art direction vs consumer decisions:** A grammar chooses only among supplied, registered native treatments and enforces negative rules. Consumer owns title, factual claims, creative approval, asset choice and publishing. Without this boundary it becomes an untestable AI story director.
- **Real footage vs synthetic proof:** Existing K0–K5 tests and synthetic K2 hybrid are substantial; they do not prove the intended licensed stock/camera footage plus 3D and spoken narration feels professional at playback speed. Keep that gate explicit.
- **Visual quality isn't a lint result:** XP1 handles declared geometric/semantic violations, not taste. Human normal-speed sign-off is required and must not be forged by static frame sampling or LLM scoring.

## 7. Quick implementation command reference

```bash
npm run catalog:find -- --query="equation" --format=json
npm run catalog:find -- --query="timeline" --format=json
npm run catalog:find -- --query="film" --format=json
npm run catalog:api -- --id=code-stage --format=json
rg -n 'EquationStage|TimelineStoryStage|CausalSystemStage|FilmStyleGrammar|CodeStage' registry src tests docs
```

Treat these as **starting points**, not proof of absence: inspect synonyms, code exports, relevant source, registered public API and installed package dependency graph. Consult [INDEX](INDEX.md) for authoritative standards. This plan is complete when its items are implemented or intentionally rejected with concrete proofs; it does not authorize duplicate component creation.
