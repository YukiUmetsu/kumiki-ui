# 20 — Explainer Video Production: Implementation Plan

**Status:** Proposed work, ordered by impact and dependency. **Implement the changes below; do not create components just because a name appears here.**  
**Goal:** Help a consuming studio produce distinctive, technically accurate, polished long-form and short-form educational videos with reusable 2D/3D scenes and deterministic code-only rendering. No model is required at rendering time.

This file is a **build queue**, not an inventory, research report or verification log. For canonical contracts consult [18 — Film Style Grammar](18-film-style-grammar-and-direction.md), [19 — Clip-Led Production](19-clip-led-production-and-revision-handoff.md), [17 — Explainer Visual Components](17-explainer-visual-components.md) and [11 — Rendering Quality](11-rendering-quality.md). If a task overlaps an implementation or those specifications, **extend its owner** and do not create another public API.

## Priority and execution order

| Order | Deliverable | Type | Result | Depends on |
| --- | --- | --- | --- | --- |
| **P0.1** | Film-wide style grammar and native recipe resolver | **Build one thin data policy; extend directors** | Coherent, distinctive film language across shots and aspect ratios | Installed catalog and doc 18 |
| **P0.2** | Purpose-aware selection of camera, motion, reveal and editing treatments | **Modify grammar/director integration** | Meaningful motion and variety without arbitrary effects | P0.1 |
| **P0.3** | Narration-aware timing and readable holds | **Modify audio cue/schedule integration** | Objects, captions and evidence move in time with speech | P0.1–2 |
| **P0.4** | Cross-shot semantic/style preflight | **Modify existing deterministic validators** | Catch repetitive treatment and conflicting visual focus cheaply | P0.1–3 |
| **P0.5** | Complete mixed-media reference film | **Build proof scene, not library runtime** | One real, human-watchable production-quality result | P0.1–4 |
| **P1.1** | `EquationStage` | **New component after prototype** | Teach equations through semantic term-preserving transformations | MG1/VT1/shared-element |
| **P1.2** | Code edits, diffs and terminal-output beats | **Modify `CodeStage`** | Legible programming explanations with actual before/after | Existing CodeStage |
| **P1.3** | `CausalSystemStage` public release | **Qualify and register, not rewrite** | Consumable causal/feedback diagrams with source-aware constraints | Existing implementation |
| **Conditional** | Footage -> 3D -> chart identity handoff | **Small adapter only after a failing film** | Keep the same tracked subject and provenance across mediums | P0.5 |
| **Conditional** | Mixed-media finish/look consistency | **Modify style/export metadata, not compositor** | Footage, SVG and Three.js visually belong in one film | P0.5 |
| **Conditional** | Hand-drawn/cut-paper visual treatments | **Modify art-direction and SVG drawing presets** | More deliberate 2D looks without another scene engine | P0.5 |

Start with **P0.1–P0.5**. Do not begin new visual-style APIs until a full-speed export shows precisely which part is lacking.

## P0.1 — FilmStyleGrammar: implement film-wide art direction

### Purpose

Today, individually valid scenes can still feel like unrelated slides: generic card transitions, repeated composition, inconsistent captions, meaningless camera orbits and weak reveals. Give a film one coherent **visual language** while preserving shot-specific meaning.

### Build and modify

- Implement the **data-only, versioned grammar** proposed by [doc 18](18-film-style-grammar-and-direction.md) as one small module (candidate: `registry/visual/film-style-grammar.ts`, subject to catalog search). Register only one public grammar item if consumers actually need to install it.
- Reuse `registry/motion/semantic-direction.ts`, MD1/CC1/ES1, `attention-editing-*`, existing DTCG/infographic art direction and 3D material/camera owners. Grammar values should reference **native operation IDs**, not duplicate source code or copy whole asset/material palettes.
- Add grammar identity/version, output-profile compatibility, inherited overrides, allowed and forbidden effects, composition density, evidence/caption rules, camera moves, native treatment references, pace/silence intent and reduced-motion behavior.
- Compile **prepared** storyboard shot roles (`establish`, `investigate`, `cause`, `compare`, `payoff`) into validated native references. Source facts, assets, scripts, narration generation and publishing remain consumer-owned.

### Implementation algorithm

1. Resolve grammar and version; validate override keys and aspect profile.
2. Resolve every referenced operation against the **installed component catalog**. Reject missing IDs, missing capability and mismatched semantic roles; never silently substitute decorative shapes/cards.
3. Bind stable `shotId`, `subjectId`, source/evidence IDs and output profile to the selected operation. Keep a trace: *why this move was chosen, what it exposes, what it must not hide*.
4. Compile through current storyboard/ES1 and MD1/CC1/MG1. **Do not create a second scene document, animation scheduler, renderer or frame clock.**
5. Run current CPU-only semantic/layout preflight, return `shotId`/`subjectId`/`frame` diagnostics and render via the normal export path.

### First style grammars to implement, in order

| Style recipe (not new components) | Specific visual behavior | Negative rules | Demonstration topic |
| --- | --- | --- | --- |
| **Technical Drafting** | Whole object -> measured cutaway -> active part -> restored mechanism; sparse precise annotation | No fake dimensions, hidden labels or decorative CAD HUD | HVAC airflow or packet routing |
| **Evidence Investigation** | Claimed result -> real source clip/document -> frozen annotated fact -> honest chart -> qualified verdict | No unsourced statistic, altered chart scales or unrelated footage presented as evidence | Insurance premium or server outage |
| **Connected Process World** | Follow one persistent actor/packet through handoffs and state transformations; camera arrives with the actor | No arbitrary particles, teleporting subjects or late follow camera | Payment routing or RAG retrieval |

After those pass, **extend the same grammar contract** with optional `data-newsroom`, `kinetic-editorial`, `cinematic-product`, `sketchboard` and `tactile-cutout` presets. These must differ in **composition and explanatory motion**, not just color, glow, texture or sound. Do not register one component per aesthetic.

### Acceptance

- Each of the first three styles renders on **two unrelated domains**, with independently composed 16:9 and 9:16 versions and clear opening/action/payoff states.
- A color/grain-only change is rejected as a new style. The actual object movement, camera grammar and visual hierarchy must visibly differ.
- Unsupported operations fail with actionable diagnostics; all output can be sought to an arbitrary frame, including the first.
- No new browser animation clock, source-of-truth registry, chart renderer or video renderer.

## P0.2 — Purpose-aware visual treatment selection

### Purpose

Prevent a generated video from repeating the same slide, split screen, progress bar or text animation regardless of what narration is explaining. Select motion based on **semantic purpose**, with deterministic variation across adjacent shots.

### Modify

- Implement selection as a **small internal resolver in FilmStyleGrammar**, calling existing `registry/motion/attention-editing-recipes.ts`, `attention-editing-treatments.ts`, `attention-editing-compositions.ts`, `registry/motion/semantic-direction.ts`, `registry/visual/short-hook-director.ts`, MD1 and CC1. **Do not introduce a standalone `VisualTreatmentDirector` API.**
- Inputs: shot role, authored learning objective, known subjects, evidence requirements, camera/geometry capabilities, target aspect, installed recipe IDs, grammar limits and recent treatment history.
- Return: native treatment ID + parameters, preserved subject IDs, declared shot-purpose match and a compact choice/rejection trace. No visual generation, LLM selection or timing loop.

### Deterministic selection steps

1. Filter treatments that cannot show the **required information** (e.g. a quantitative comparison needs fair scales and both alternatives visible).
2. Filter unavailable targets, unreadable/occluded compositions, disallowed intensity and unsupported aspects.
3. Rank the remaining treatments by **semantic fit**, grammar preference, prior use within a short film window, then stable recipe ID to break ties. Avoid random roulette and hardcoded topic names.
4. Bind an explicit entry/action/exit and the identity-preserving handoff. If none fits, return a blocking diagnostic or a deliberately plain and **truthful** fall-back shot, never fake substance with effects.

### Acceptance

- Fixtures for **inspect a mechanism**, **compare two costs** and **investigate one claim** select different meaningful staging; the same inputs choose exactly the same recipes on every run.
- A subject introduced in an earlier continuous shot is maintained or explicitly released; framing remains valid at transitions and camera extrema.
- No duplicate hook compiler, speed ramp, transition, parallax, shared-element or editing recipe is created.

## P0.3 — Narration-aware timing and visual breathing room

### Purpose

Ensure a critical diagram appears **before** the narration explains it, evidence stays on screen long enough to examine and words/sound hits match the exact visual action. Avoid frantic motion and dead/static holds.

### Modify

- Extend `registry/video/audio-visual-cue.ts` and small MD1 scheduling helpers in `registry/motion/director-schedule.ts` rather than inventing a narration/audio scheduler.
- Accept **supplied** word/segment alignments, cue anchors and intended shot phases: `introduce`, `demonstrate`, `read`, `emphasize`, `resolve` (phase labels can remain private). The editor or producer may author intentional anticipation and silence.
- Convert source time into rational output frames through existing utilities once, preserve fixed cue anchors and calculate legal start/end/hold windows. Use existing `criticalHolds` and caption rules in XP1.
- Report clashes such as simultaneous competing emphasis, named subject appearing after its word, key result exiting before narration ends, or a camera move stealing the minimum evidence-reading hold. Explain conflicts to the consuming studio; **do not silently stretch audio, shorten evidence, or shift sourced clips**.

### Acceptance

- Exact seek parity at multiple frame orders and 24/30 fps, including the same clip with and without supplied audio.
- Tests for missed anchors, captions crossing cuts, multiple cue collisions and minimum holds; diagnostics identify cue/shot IDs and exact frames.
- No voice-cloning/TTS generation, soundtrack mixer, music beat detector or second clock in Kumiki.

## P0.4 — Cross-shot style and attention preflight

### Purpose

Detect film-level structural defects before expensive visual review, without image recognition or a model: repetitive treatments, forbidden combinations and multiple simultaneous visual targets.

### Modify

- Extend `registry/visual/explainer-principles.ts` and `registry/visual/explainer-preflight.ts` **only for rules absent there**, consulting current tests first.
- Add optional grammar-linked diagnostics for (a) forbidden/overused recipe over a configurable sequence of shots, (b) two incompatible high-attention effects or `emphasize` targets at the same frame, (c) broken film-wide type/material/caption policy, (d) declared semantic purpose not supported by the selected operation.
- Feed resolved IDs and intervals from P0.1–3 into existing diagnostics; reuse its reason codes, severity and frame/subject fields. Maintain a deterministic, inexpensive pure-data pass.
- Do not reimplement checks for the existing opening/payoff, caption reading hold, subject continuity, safe bounds, rights or factual-source contract.

### Acceptance

- Each new diagnostic has a **failing fixture**, a valid negative control (justified repetition must remain allowed), and one suggested repair.
- Checks are fast without browser screenshots; normal-speed human visual/audio review is a **separate** required step.
- No independent film validator, aesthetic LLM scorer or new QA document type.

## P0.5 — Produce one complete 60–90-second reference film

### Purpose

Prove that composable pieces produce a professionally understandable video at playback speed, not merely good standalone Storybook frames.

### Build / verify

- Create a compact narrative with a real question, sourced finding, visible mechanism and satisfying closing answer. Use a commercially cleared **real footage clip** (not only procedural/synthetic footage), semantic annotations, at least one meaningful 3D explanation where applicable, a faithful 2D data scene, supplied narration with word alignment and licensed SFX.
- Compile exclusively through existing production/export machinery. Use actual browser -> FFmpeg MP4, not a static mockup; doc [19](19-clip-led-production-and-revision-handoff.md) owns source qualification, streaming/resumability and selective revision gates.
- Independently author **16:9 and 9:16** compositions; short-form may alter shot timing/order rather than blindly crop the long version.
- Add a minimal review ledger to the fixture itself: referenced asset rights, claim IDs, grammar version, output profiles, critical action frames, human normal-speed review status and actionable defects. Do **not** create another repository verification-report document.

### Acceptance / stop rule

- A human can identify what changes, why it changes and the final answer while watching once, with normal sound and speed.
- No meaningful object, button, label, chart value or caption leaves safe frame; 2D/3D/footage looks intentional; effects complement explanation.
- Speech/captions/SFX synchronize at the actual exported frames and the final payoff is fully readable.
- If the video fails, patch **the smallest current implementation that caused the defect** before adding any new stage/component.

## P1.1 — Build EquationStage (new component)

### Purpose

Teach algebra, finance formulas, dimensional analysis and ML training equations with **stable term identity** across steps. For example, reveal a mortgage-payment formula, highlight principal/rate, substitute sourced values, simplify and retain the matching symbols spatially.

### API and construction

- Prototype as `registry/visual/equation-stage.ts` plus a clock-free React view; register only after feasibility and output tests. Keep notation authoring separate from actual algebra/equivalence proof.
- Input model: `EquationStep { id, expression, durationFrames, terms: [{ id, spanOrSlot, role, sourceId? }] }` and authored `TermMapping { fromStep, fromTermId, toStep, toTermId, action }`. Steps also declare explanation text, unit labels and optional illustrative/source status.
- **First prove typesetting feasibility** in the actual headless export browser: test MathJax SVG against KaTeX/HTML and an explicit per-term layout. Do not assume math-renderer SVG groups correspond to semantically movable terms. If stable term bounds are not extractable, use authored term slots and measured baselines instead.
- Build measured term/layout output with collision, line-height, fraction/superscript and portrait fit diagnostics. Match stable IDs through `shared-element`, `shape-morph`, `VisualTransformation` and MG1, with native enter/exit fades for unmatched terms; never add another math morph animator or clock.
- The visual engine **must not claim algebraic equivalence** just because a term moves. Consumer supplies validated transformations and source-backed numerical values.

### Acceptance

- Three examples: home financing, ML gradient update and elementary physical units; each legible in authored 16:9 and 9:16 layouts.
- Exact-frame seeks, no baseline jitter or clipped expressions, explicit unmatched terms, static/reduced-motion variant, invalid mapping diagnostics.
- Registered package installs independently with pinned/licensed optional math dependency; code/tests/Storybook/spec are complete.

## P1.2 — Extend CodeStage for edits and terminal narratives

### Purpose

Show “old code -> precise change -> effect/result” instead of repeatedly displaying whole code screenshots in programming and cloud tutorials.

### Modify

- Evolve the existing `CodeStageBeat` in `registry/visual/code-stage.ts` and `code-stage-react.tsx` with bounded `edit`, `diff` and `output` beats; preserve existing `establish`, `reveal`, `focus`, `token` inputs unchanged.
- Author immutable source revisions with stable line and token IDs. Compute line/token correspondences and layout **before** the animation; choose the edited lines' minimal visual transition, not a full-screen jump/reflow.
- For terminal output, accept **caller-supplied transcript lines** and optional fixed timestamps/frames. Clearly distinguish command text, stdout, stderr, exit status and explanatory labels. Never execute shell commands, code or network requests from the component.
- Reuse measured text, explicit reading/scroll policy, existing focus/VT1 and MD1; do not install a code editor, language server or terminal emulator.

### Acceptance

- Fixtures: insert, delete, replace, move; multiple languages with supplied syntax tokens; successful and failed command outputs; wide and portrait.
- No clipped or truncated source lines, layout shifts while typing, missing diff identities or unintended command execution; deterministic seek parity.
- Existing CodeStage stories/tests remain valid without migration.

## P1.3 — Qualify and register CausalSystemStage

### Purpose

Make causal diagrams, intervention walkthroughs and feedback loops available to consumers as a **single installable package**.

### Modify (not a rewrite)

- Review `registry/visual/causal-system-stage.ts`, its React view, Storybook fixture and tests for capability, install-time dependencies, accessible labels, evidence semantics and portrait readability.
- Run/repair its current tests, remove temporary test naming where applicable, add public component spec and one registry manifest entry only if the existing implementation meets normal release standards.
- Preserve signed causal links, evidence classes, `do(X=state)` intervention semantics, feedback loops and measured rendering. Never create a parallel `CausalGraphStage`.

### Acceptance

- Installable bundle, deterministic frames, invalid observational-as-causal claims rejected, feedback/counterfactual fixtures tested, three distinct topic demonstrations.
- Visual semantics describe the authored model; the component does not certify that a real-world causal model is true.

## Conditional — Film-specific gap fixes (not automatic new components)

### A. Subject identity across footage, 3D and chart

- **When:** P0.5 demonstrates that an annotated source subject cannot keep its stable ID/source reference through a *specific* footage -> inspection/3D -> quantity scene.
- **How:** Add only an adapter to `FreezeFrameFocus`, `shared-element`, `semantic-composition` or `inspect-then-quantify` that passes existing IDs, measured coordinates and provenance. If a subject silhouette matte is needed, consume a licensed, externally prepared frame-addressed alpha asset through existing clip/mask APIs. Do not add a tracker or compositor.
- **Done:** A seekable, annotated before/after with the same subject and truthful label at all handoffs. Otherwise **do not implement**.

### B. Film-wide color/finishing consistency

- **When:** A real mixed footage/SVG/Three output demonstrably jumps in color, contrast, exposure or shadow style and cannot be corrected with existing knobs.
- **How:** Extend FilmStyleGrammar/output metadata with `sourceColorSpace`, `outputColorSpace`, existing 2D/3D look profile refs and whether a transform was already applied. Let current Three/FFmpeg/consumer finishing apply supported transforms with explicit capability checks; keep charts and semantic colors accurate. No `FilmRenderer`, external browser OpenColorIO runtime or second post-processing graph.
- **Done:** Matching footage/2D/3D shots at fixed frames, no double-transform, readable content and human-reviewed full-speed result.

### C. Hand-drawn and tactile 2D material presets

- **When:** A paper-cutout or sketchboard pilot has a specific visual-quality failure that existing `registry/infographic/art-direction.ts`, `registry/domains/illustration-2d.tsx`, VectorDraw/masks/shape morph cannot achieve.
- **How:** Extend their **existing tokens and SVG drawing primitives** with bounded seeded stroke irregularity, paper fill, cut edge, contact shadow and controlled reveal; reuse the shared absolute-frame clock. No new Pixi/Canvas renderer, free-running particle system or style-per-video component.
- **Done:** Three unrelated domain scenes, clear annotations, 16:9 and 9:16, deterministic frames, reduced-motion output; omit this work entirely if art-direction changes suffice.

## Implementation safeguards

For **every** task above, record in its implementation PR description (not a new repository verification doc):

1. **Failure/desired result:** Which real shot, output profile and frame proves the gap?
2. **Owner search:** Run `npm run catalog:find -- --query="concept" --format=json`, `npm run catalog:api -- --id=existing-id --format=json` and `rg -n 'concept|synonym' registry src tests docs`. Search by **function**, not just proposed component name.
3. **One owner:** Prefer extension of current timebase, scene/shot contract, media clip, chart, 3D pipeline, style tokens and preflight. A genuinely new registry ID needs distinct semantics demonstrated by at least three domains.
4. **Proof:** Native export at arbitrary frames, two authored aspects, source/unit/rights integrity, deterministic geometry/readability tests, accessible static variant and normal-speed human visual review when sound/motion matters. No LLM screenshot QA.
5. **Dependency boundary:** Declare exact APIs/versions/licenses only when necessary. Consumer owns asset search, model/TTS generation, source preparation and optimization, mixing, content optimization and publishing. Kumiki consumes prepared, licensed assets; it is not another video editor.

**Next action:** Implement **P0.1** against doc 18, then progress in the table's order. If the reference film is still visually weak after P0.1–P0.4, repair it before increasing the component count.
