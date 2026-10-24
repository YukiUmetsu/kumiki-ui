# 18 — Film Style Grammar & Directed Visual Proof

**Status:** Design and acceptance plan; **not a shipped `FilmStyleGrammar` API or production-quality claim**. Updated 2026-10-24.  
**Scope:** Film-wide artistic direction and visual proof. [19 — Clip-Led Production](19-clip-led-production-and-revision-handoff.md) owns prepared-footage handoff and export qualification.

## 1. Purpose and ownership

A **film-style grammar** describes a repeatable way to communicate: composition, typography, materials, camera intentions, native transitions, motion rhythm, sound *intent*, and prohibitions. It must **not** decide story facts, hardcode a topic/brand, or create another scene/timeline engine.

| Owner | Responsibility |
| --- | --- |
| Consuming studio (e.g. ContentGen) | Research, claims/evidence, script, storyboard, footage/rights, creative treatment, narration/music generation and mixing, approvals/publishing |
| Kumiki-UI | Reusable style metadata, catalog/recipe matching, semantic visual composition, deterministic preflight, reproducible real-rendered examples |
| Optional export adapter | Asset/font readiness, visual frame capture, codec capability checks, artifacts; no creative decisions |

Authoritative systems remain [08 Motion Graphics](08-motion-graphics.md), [09 Explainers](09-explainer-components.md), [11 Rendering Quality](11-rendering-quality.md), [13 Integrations](13-content-creation-integrations.md), and [17 Visual Components](17-explainer-visual-components.md). Do not duplicate their schemas.

## 2. Existing capabilities versus actual gap

| Already in development | Reuse for |
| --- | --- |
| MG1/VT1, MotionDirector (MD1), Cinematic Camera Director (CC1), CutDirector | One rational-frame timeline, purposeful choreography, transitions and camera framing |
| Storyboard, semantic direction, Explainer Production (ES1) | Shot intent, subject identity and source-aware composition |
| MechanismSequence, SectionReveal, FlowPath, EvidenceStage, ChartStory, ComparisonStage and other semantic primitives | Actual explanation instead of decorative movement |
| DTCG/infographic art directions | Type, color/material roles and measured layout |
| FrameAccurateClip, FreezeFrameFocus, CaptionPerformer, AudioVisualCue, ShortSafeFrame | Footage, cut/cue alignment, captions and safe viewing regions |
| Explainer production contract/preflight, VideoExportStage, frame capture | Deterministic geometry/timing checks and real output proof |

**Missing:** one *curated film-wide directing policy* that coordinates the existing choices, explicit negative rules, native operation requirements, and proof examples. An existing component or Storybook story is not evidence that full-speed artistic review passed. [The 13-second hybrid report](verification/2026-10-22-phase2-hybrid-short.md) demonstrates a decoded **synthetic VP9** clip with 2D, 3D and supplied audio—not qualified real-camera footage.

Before adding types, query installed components using `npm run catalog:find -- --query="..." --format=json` and `npm run catalog:api -- --id=ID --format=json`. A missing public extension point requires a failing concrete fixture; do not infer from spec names.

## 3. Small, data-only grammar contract (proposed)

A grammar should declare:

- **Identity:** stable ID, version, compatible aspect profiles, optional pinned base grammar and safe overrides.
- **Essence and exclusions:** intended experience, semantic purpose, style invariants, prohibited camera/effect/typography habits.
- **Visual language:** DTCG type/color/material roles, layout density, caption policy, reduced-motion/static alternative.
- **Shot/native-move map:** narrative purpose (`establish`, `investigate`, `cause`, `compare`, `payoff`) → actual catalog-resolved MD1/CC1/ES1 operation IDs, required semantic roles and capabilities.
- **Pacing and sound intent:** anticipation/action/reading holds/handoffs, cue category and silence/beat requests; no bundled audio or second clock.
- **Proof:** source-backed opening/change/payoff frames, one action strip, 16:9 and 9:16 treatments, reviewer state, versions and known limitations.

Start with metadata over existing serialized authoring fragments. `FilmStyleGrammar` is a provisional name, **not an existing API**. Style data cannot execute JavaScript, agent instructions, or arbitrary remote assets.

**Compilation path:**

1. Consumer supplies factual/rights-checked storyboard, observable visual objective, stable subject/data IDs, supplied cue alignment and output profile.
2. Resolve grammar entries against installed catalog APIs; reject unavailable operations.
3. Choose a meaningful native move for the shot role, preserving identity, evidence, measurements and an authored payoff.
4. Compile into existing Storyboard/ES1 + MD1/CC1/MG1/VT1, with accessible captions, static fallback and one frame timebase.
5. Run existing semantic/framing/readability preflight; return actionable `shotId`/`subjectId`/`frame` diagnostics.
6. Render real proof frames through the same code path as export; approval/revision UX belongs to the consumer.

**Fail visibly:** unsupported geometry, absent source data, unlicensed assets or missing capabilities must not silently become generic cards, arrows, dots or fake explanatory graphics.

## 4. Three reusable pilot grammars

| Pilot | Existing primitives | Required visual behavior | Reject |
| --- | --- | --- | --- |
| **Technical Drafting** | SectionReveal, ExplodedView, DimensionOverlay, MechanismSequence, CC1 | Draw measured structure, reveal internal cause, isolate/restore, finish with readable whole | Fake dimensions, ornamental HUD/orbit, occluded labels |
| **Evidence & Data Investigation** | EvidenceStage, ChartStory, FreezeFrameFocus, CutDirector | Claim → actual evidence → addressed focus → fair comparison → qualified finding | Unsourced numbers, altered scales, footage presented as evidence of an unrelated event |
| **Connected Process World** | ProcessJourney, DiagramStage, FlowPath, AssetStateSequence, MD1 | Persistent actor crosses real stages; each handoff shows a transformation and consequence | Decorative particles, lost identity, late camera tracking |

Prove each with **two unrelated subject domains** before growing the style library. Use neutral fixture copy/assets and check redistribution rights under [ASSET_SOURCING](ASSET_SOURCING.md). An optional kinetic-editorial grammar comes later, after these pass.

## 5. Visual-proof and QA contract

For every pilot, record:

1. **Teaching intent:** one observable before → action → after; identify critical subjects and why each camera move helps.
2. **Actual renders:** opening, visible transformation and payoff at full target resolution. No generated mockup substitutes for renderer output.
3. **Action strip:** sparse samples at camera extrema, scene boundaries, freeze/release and key cues, to detect delayed tracking, clipping, jump cuts and unreadable intermediate states. Do not screenshot every frame in CI.
4. **Deterministic checks:** semantic roles/causality; bounds, protected text and captions; source IDs, units and identities; frame/cue timing; output profile and decoder capabilities; reduced-motion behavior.
5. **Human review:** watch/listen at normal speed where sound exists. Record reviewer/date, profile, input revision, actual artifact IDs and `accepted`/`needs-revision`/`not-reviewed` separately from structural test outcomes.

Automated tests can establish geometry, timing and input validity—not aesthetic quality or factual interpretation. For 3D follow [14 — Fidelity](14-3d-visual-fidelity.md) and `npm run hero:quality`. Favor deterministic checks before expensive visual review; no LLM screenshot scoring.

## 6. Delivery order and exit gates

| Step | Deliverable | Exit condition |
| --- | --- | --- |
| **0. Audit** | Existing catalog API/capability inventory and current proof baseline | No duplicate primitive or speculative public interface |
| **1. First grammar** | Small metadata/override contract + one complete sample on MD1/CC1/ES1 | Native registered recipes resolve; invalid intent reports an actionable error |
| **2. Three pilots** | Source-backed Storybook reference films in two unrelated domains per style | Distinct staging/motion beyond recoloring, visible payoff, true 16:9 + 9:16 layouts |
| **3. Qualification** | Critical-frame/action proof, tests, full-speed review log | No blocking geometry, rights, cue or identity defects; review status explicit |
| **4. Consumer overrides** | Pinned base version, safe variants, comparison proofs | Consumer edits are not overwritten by registry changes |

**Stop if:** multiple new primitives, a new renderer/clock/schema, mandatory AI dependency, copied demo scenes, or unlicensed bundled media become necessary. Record the concrete missing catalog capability instead. Keep TTS, media acquisition, audio mastering, publication and project storage outside Kumiki.

**Next:** Audit the current catalog, build **one** end-to-end grammar pilot, and expand only after it demonstrably reduces bespoke scene work and review iterations.

**Research provenance:** [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) informed the direction/proof concept; its style inventory, films, copyrighted references, agent runtime and audio stack are **not** dependencies or reusable library content.
