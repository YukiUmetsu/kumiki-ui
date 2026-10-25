# 20 — Explainer Video Production: Implementation Plan

**Status:** Proposed work, ordered by impact and dependency. **Implement the changes below; do not create components just because a name appears here.**  
**Goal:** Help a consuming studio produce distinctive, technically accurate, polished long-form and short-form educational videos with reusable 2D/3D scenes and deterministic code-only rendering. No model is required at rendering time.

This file is a **build queue**, not an inventory, research report or verification log. For canonical contracts consult [18 — Film Style Grammar](18-film-style-grammar-and-direction.md), [19 — Clip-Led Production](19-clip-led-production-and-revision-handoff.md), [17 — Explainer Visual Components](17-explainer-visual-components.md) and [11 — Rendering Quality](11-rendering-quality.md). If a task overlaps an implementation or those specifications, **extend its owner** and do not create another public API.

## Priority and execution order

| Order | Deliverable | Type | Result | Depends on |
| --- | --- | --- | --- | --- |
| **P0.1** | Film-wide style grammar **including purpose-aware treatment selection** | **Build one thin data policy and internal resolver; extend directors** | Coherent style and meaningful variation across shots and formats | Installed catalog and doc 18 |
| **P0.2** | Only missing grammar-specific cross-shot checks | **Extend current deterministic preflight** | Detect repeated treatments, competing effects and style violations | P0.1 |
| **P0.3** | Extend the existing K2 reference film to a complete mixed-media film | **Upgrade current fixture; no second proof pipeline** | One real-footage, human-watchable production-quality result | P0.1–2 |
| **P1.1** | `EquationStage` | **New component after prototype** | Teach equations through semantic term-preserving transformations | MG1/VT1/shared-element |
| **P1.2** | Code edits, diffs and terminal-output beats | **Modify `CodeStage`** | Legible programming explanations with actual before/after | Existing CodeStage |
| **P1.3** | `CausalSystemStage` public release | **Qualify and register, not rewrite** | Consumable causal/feedback diagrams with source-aware constraints | Existing implementation |
| **Conditional** | A proven narration/visual coordination gap | **Small existing-API integration only after a failing film** | Preserve evidence holds and cue timing without another scheduler | P0.3 |
| **Conditional** | Footage -> 3D -> chart identity handoff | **Small adapter only after a failing film** | Keep the same tracked subject and provenance across mediums | P0.3 |
| **Conditional** | Mixed-media finish/look consistency | **Modify style/export metadata, not compositor** | Footage, SVG and Three.js visually belong in one film | P0.3 |
| **Conditional** | Hand-drawn/cut-paper visual treatments | **Modify art-direction and SVG drawing presets** | More deliberate 2D looks without another scene engine | P0.3 |

Start with **P0.1–P0.3**, followed by the three P1 tasks. Do not begin a conditional integration or new visual-style API until an actual full-speed export shows precisely which existing capability is insufficient.

## P0.1 — FilmStyleGrammar: implement film-wide art direction

### Purpose

Today, individually valid scenes can still feel like unrelated slides: generic card transitions, repeated composition, inconsistent captions, meaningless camera orbits and weak reveals. Give a film one coherent **visual language** while preserving shot-specific meaning.

### Build and modify

- Implement the **data-only, versioned grammar** proposed by [doc 18](18-film-style-grammar-and-direction.md) as one small module (candidate: `registry/visual/film-style-grammar.ts`, subject to catalog search). Register only one public grammar item if consumers actually need to install it.
- Reuse `registry/motion/semantic-direction.ts`, MD1/CC1/ES1, `attention-editing-*`, existing DTCG/infographic art direction and 3D material/camera owners. Grammar values should reference **native operation IDs**, not duplicate source code or copy whole asset/material palettes.
- Add grammar identity/version, output-profile compatibility, inherited overrides, allowed and forbidden effects, composition density, evidence/caption rules, camera moves, native treatment references, pace/silence intent and reduced-motion behavior.
- Compile **prepared** storyboard shot roles (`establish`, `investigate`, `cause`, `compare`, `payoff`) into validated native references. Source facts, assets, scripts, narration generation and publishing remain consumer-owned.
- Include **purpose-aware treatment selection within this same grammar resolver**, not a separate `VisualTreatmentDirector` or second hook compiler. Select from current `attention-editing-recipes.ts`, `attention-editing-treatments.ts`, `attention-editing-compositions.ts`, `semantic-direction.ts`, `short-hook-director.ts` and MD1/CC1 capabilities.

### Implementation algorithm

1. Resolve grammar and version; validate override keys and aspect profile.
2. Resolve every referenced operation against the **installed component catalog**. Reject missing IDs, missing capability and mismatched semantic roles; never silently substitute decorative shapes/cards.
3. Filter candidates that cannot express the **authored learning objective**, evidence requirement, available subjects or geometry, supported aspect, safe framing, allowed intensity and grammar limitations; prefer a truthful static treatment over a decorative fallback.
4. Rank eligible native treatments by **semantic fit**, grammar preference and recently used treatments in the film; break ties with stable IDs, never random choice. Resolve `shotId`, `subjectId`, source/evidence IDs and output profile and return a compact selection/rejection trace: *why this move, what does it expose, what must it not hide?*
5. Bind explicit entrance/action/exit and identity-preserving handoffs; compile through current storyboard/ES1 and MD1/CC1/MG1. **Do not create a second scene document, animation scheduler, renderer or frame clock.**
6. Run current CPU-only semantic/layout preflight, return `shotId`/`subjectId`/`frame` diagnostics and render via the normal export path.

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
- Fixtures for **inspect a mechanism**, **compare two costs** and **investigate one claim** select meaningfully different existing treatments, avoid unjustified adjacent repetition, and return the same selections on repeated runs.
- The selected treatment keeps or explicitly releases continuous semantic subject identities; framing remains valid at transitions and camera extremes. No new speed ramp, transition, parallax or shared-element implementation.
- Unsupported operations fail with actionable diagnostics; all output can be sought to an arbitrary frame, including the first.
- No new browser animation clock, source-of-truth registry, chart renderer or video renderer.

## P0.2 — Add only missing film-wide style/attention checks

### Purpose

Detect **grammar-specific** defects that current checks do not represent: repetitive treatment choices, forbidden combinations, incompatible simultaneous emphasis and film-wide style inconsistency. Do not recheck basic narration alignment, reading holds, cut cadence, scene attention budget, collisions or subject continuity.

### Modify

- Before adding each rule, inspect existing tests for `registry/visual/explainer-principles.ts`, `registry/visual/explainer-preflight.ts`, `registry/motion/attention-editing-compositions.ts` and `registry/visual/semantic-composition.ts`; **skip anything these already diagnose**.
- Extend the owning preflight module(s) with an optional grammar-linked pass only for (a) a forbidden or unjustifiably overused recipe across neighboring shots, (b) incompatible high-attention effects targeting different elements at the same frame, (c) contradictions with film-wide typography/material/caption policy, (d) a treatment that cannot perform its declared learning purpose.
- Consume the resolved recipe IDs, declared purposes, attention intervals and style-policy references from **P0.1**; return diagnostics through the existing result contract with shot/subject/frame and suggested repair. Keep it inexpensive and pure-data.
- **Do not add another film validator** or repeat checks for opening/payoff, supplied word/audio anchors, minimum holds, captions, subject continuity, bounds, rights or sourced facts.

### Acceptance

- Each new diagnostic has a **failing fixture**, a valid negative control (justified repetition must remain allowed), and one suggested repair.
- Checks are fast without browser screenshots; normal-speed human visual/audio review is a **separate** required step.
- No independent film validator, aesthetic LLM scorer or new QA document type.

## P0.3 — Upgrade the existing reference film to 60–90 seconds

### Purpose

Prove that composable pieces produce a professionally understandable video at playback speed, while **preserving a single reference-film implementation**.

### Build / verify

- **Extend** `src/video/clip-explanation.stories.tsx`, `clip-explanation-data.ts`, `clip-explanation-layout.ts` and their existing tests/review fixtures. The current K2 sample is a 360-frame synthetic clip -> annotation -> chart explanation; keep its stable subject/shot identity, verified per-profile composition, export path and proof ownership. **Do not create a second hybrid-film schema, pipeline or parallel fixture family.**
- Expand the reference into a compact 60–90-second narrative with a real question, sourced finding, visible mechanism and satisfying closing answer. Use a commercially cleared **real-camera/stock footage clip** (not only procedural/synthetic footage), semantic annotations, a meaningful 3D explanation, a faithful 2D data scene, supplied narration with word alignment and licensed SFX. If the real clip depicts a different subject, consciously reauthor the **same fixture** with new honest IDs; never mislabel unrelated footage as evidence.
- Compile exclusively through existing production/export machinery. Use actual browser -> FFmpeg MP4, not a static mockup; doc [19](19-clip-led-production-and-revision-handoff.md) owns source qualification, streaming/resumability and selective revision gates.
- Independently author **16:9 and 9:16** compositions; short-form may alter shot timing/order rather than blindly crop the long version.
- Reuse `AudioVisualCue` (`resolveAudioCues`, `audioCuesToDirectorNodes`), `alignBeatMontage`, current caption tracking and `criticalHolds` preflight for narration synchronization and reading windows. Treat unresolved mismatches as fixture/authoring bugs first; an API change is **conditional** on a documented unexpressible case.
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

- Review `registry/visual/causal-system-stage.ts`, its existing React view, `src/visual/causal-system-stage.stories.tsx` and `tests/tmp-causal-system-stage.test.ts` for capability, install-time dependencies, accessible labels, evidence semantics and portrait readability.
- Run/repair the existing suite, rename the temporary test file if appropriate, add its missing public component spec and **one** registry manifest entry only if the implementation meets normal release standards. Reuse the three existing Storybook subject domains; do not create another causal diagram implementation or replacement demo suite.
- Preserve signed causal links, evidence classes, `do(X=state)` intervention semantics, feedback loops and measured rendering. Never create a parallel `CausalGraphStage`.

### Acceptance

- Installable bundle, deterministic frames, invalid observational-as-causal claims rejected, feedback/counterfactual fixtures tested, three distinct topic demonstrations.
- Visual semantics describe the authored model; the component does not certify that a real-world causal model is true.

## Conditional — Film-specific gap fixes (not automatic new components)

### A. Narration-to-visual coordination not expressible by existing APIs

- **When:** The extended K2 film has a reproducible frame-specific cue/readability error that **cannot** be authored using `resolveAudioCues`, `audioCuesToDirectorNodes`, `alignBeatMontage`, MD1 scheduling, caption tracking or `criticalHolds`. Existing late/early anchor and protected-interval diagnostics are **not** a new feature gap.
- **How:** First fix the fixture's supplied alignment, cue offsets, protected intervals or authored schedule. Only if those inputs cannot express a valid result, implement a **single small bridge in the current owner** mapping resolved cue anchors to MD1 placement or reporting an unrepresentable collision. Preserve exact audio/source frames; do not create a new narration scheduler, alignment parser, timebase, music detector or audio mixer.
- **Done:** One failing reference-film fixture turns valid after the minimal adapter, with stable seek parity and evidence/caption holds. Otherwise **skip this task entirely**.

### B. Subject identity across footage, 3D and chart

- **When:** P0.3 demonstrates that an annotated source subject cannot keep its stable ID/source reference through a *specific* footage -> inspection/3D -> quantity scene, despite existing K2 identity handoffs.
- **How:** Add only an adapter to `FreezeFrameFocus`, `shared-element`, `semantic-composition` or `inspect-then-quantify` that passes existing IDs, measured coordinates and provenance. If a subject silhouette matte is needed, consume a licensed, externally prepared frame-addressed alpha asset through existing clip/mask APIs. Do not add a tracker or compositor.
- **Done:** A seekable, annotated before/after with the same subject and truthful label at all handoffs. Otherwise **do not implement**.

### C. Film-wide color/finishing consistency

- **When:** A real mixed footage/SVG/Three output demonstrably jumps in color, contrast, exposure or shadow style and cannot be corrected with existing knobs.
- **How:** Extend FilmStyleGrammar/output metadata with `sourceColorSpace`, `outputColorSpace`, existing 2D/3D look profile refs and whether a transform was already applied. Let current Three/FFmpeg/consumer finishing apply supported transforms with explicit capability checks; keep charts and semantic colors accurate. No `FilmRenderer`, external browser OpenColorIO runtime or second post-processing graph.
- **Done:** Matching footage/2D/3D shots at fixed frames, no double-transform, readable content and human-reviewed full-speed result.

### D. Hand-drawn and tactile 2D material presets

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

**Next action:** Implement **P0.1** against doc 18, then progress in the table's order. If the extended K2 film is visually weak after P0.1–P0.3, repair the smallest responsible owner before increasing the component count. Do not promote a conditional task without a concrete failed shot.
