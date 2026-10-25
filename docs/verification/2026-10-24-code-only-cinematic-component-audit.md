# Code-only cinematic component gap audit

**Audit date:** 2026-10-24 (America/Chicago)  
**Repository:** `YukiUmetsu/kumiki-ui`, default branch `main`  
**Inspected commit:** [`e2632e6dc99b4946f7a9950978657d86af8ffc75`](https://github.com/YukiUmetsu/kumiki-ui/commit/e2632e6dc99b4946f7a9950978657d86af8ffc75)  
**Status:** Read-only source/catalog/documentation audit; **not** a claim of running tests, reviewing video playback, or certifying visual quality.

> **Correction to the earlier recommendation:** The lack of a component *named* `VisualTreatmentDirector`, `NarrationPacingDirector`, or `AttentionContinuityInspector` does **not** mean that the underlying capability is absent. Kumiki already implements substantial portions. New public components must be justified by a concrete composition that cannot be expressed cleanly through current registry APIs.

## Purpose and boundaries

This document answers: **What capabilities are already implemented, what is merely planned, and what small code-only additions would most improve educational-video quality?**

- **This is a dated evidence snapshot**, not an alternative roadmap, public API specification, or implementation mandate.
- [18 — Film Style Grammar](../18-film-style-grammar-and-direction.md) remains authoritative for film-wide directing policy and visual-treatment matching. [19 — Clip-Led Production](../19-clip-led-production-and-revision-handoff.md) owns prepared footage, format variants and export qualification. [17 — Visual Components](../17-explainer-visual-components.md), [08 — Motion](../08-motion-graphics.md), [09 — Explainers](../09-explainer-components.md) and [11 — Rendering](../11-rendering-quality.md) retain their existing ownership.
- **No mandatory AI**: Consumers supply structured claims, sources, subjects, declared visual purposes, asset references and timing data. Kumiki compiles deterministic recipes and validates what can actually be checked. Natural-language interpretation, factual research, footage recognition, speech generation, commercial asset acquisition and editorial sign-off are consumer responsibilities.
- Never create a second frame clock, media decoder, scene document, renderer or audio engine. Reuse the installed catalog and canonical MG1/MD1/CC1/ES1 timebase.

## Evidence inventory: existing capabilities not to rebuild

| Capability | Existing implementation | What it already does |
| --- | --- | --- |
| Motion choreography | [`motion-director`](../../registry/motion/motion-director.ts), [`director-recipes`](../../registry/motion/director-recipes.ts) | Scheduled animation, cues, dependent actions and seven parameterized recipes. |
| Semantic cinematic camera | [`cinematic-camera-director`](../../registry/motion/cinematic-camera-director.ts), [`camera-shot-recipes`](../../registry/motion/camera-shot-recipes.ts) | Target-aware framing, profiles, multiple motivated moves and constraints. |
| Cutting and editorial effects | [`cut-director`](../../registry/motion/cut-director.ts), [attention editing recipes](../../registry/motion/attention-editing-recipes.ts), [compositions](../../registry/motion/attention-editing-compositions.ts), [treatments](../../registry/motion/attention-editing-treatments.ts) | Match cuts, wipes, holds, speed curves, beat montage, typography, evidence and impact treatments. |
| Spoken-word/audio timing | [`audio-visual-cue`](../../registry/video/audio-visual-cue.ts), [`caption-performer`](../../registry/visual/caption-performer.tsx) | Supplied word/segment/beat timing, cue resolution, caption layout and FFmpeg mix manifest. |
| Semantic scene and subject checks | [`semantic-composition`](../../registry/visual/semantic-composition.ts), [`explainer-preflight`](../../registry/visual/explainer-preflight.ts), [`explainer-principles`](../../registry/visual/explainer-principles.ts) | Named subject visibility, camera/action framing, protected text, label collisions, simultaneous-label budget, readable-caption duration. |
| Existing teaching compositions | [`inspect-then-quantify`](../../registry/visual/inspect-then-quantify.ts), [`failure-cascade`](../../registry/visual/failure-cascade.ts), [`mechanism-sequence`](../../registry/visual/mechanism-sequence.ts), [`evidence-stage`](../../registry/visual/evidence-stage.ts) | Several before/action/after, inspection, explanation, evidence and quantitative handoffs already exist. |
| Visual identity and craft | [DTCG tokens](../01-design-foundations.md), [infographic art directions](../../src/infographic/art-direction.ts), [camera profiles](../../registry/motion/camera-shot-recipes.ts), [3D lighting](../../registry/craft/studio-kit.ts), [hero rendering](../../registry/craft/hero-render.ts) | Local look controls, type/color policy, lighting moods, physically based surfaces and optional DOF/bloom/AO. |
| Footage and export | [`frame-accurate-clip`](../../registry/video/frame-accurate-clip.tsx), [`video-export-stage`](../../registry/video/video-export-stage.tsx), [export script](../../scripts/export-video.mjs) | Frame-addressed clips, readiness, streaming FFmpeg export, resumable verified segments and fail-early preflight. |

**Registry snapshot:** 153 installable entries. Presence in repository source or Storybook alone is **not** proof of a public, installable registry item.

## Proposed additions: corrected status and recommendation

Legend: **Implemented** = current capability already covers the core need; **Partial** = significant tools exist, but a useful integration seam is unproven; **Planned** = design guidance only; **Not found** = no dedicated public registry entry identified at this commit. These labels are scoped to the described behavior, not aesthetic quality.

| Earlier proposed name | Corrected status | Verified overlap | Narrow gap, if demonstrated | Recommendation |
| --- | --- | --- | --- | --- |
| `VisualTreatmentDirector` | **Partial / already planned in doc 18** | `ShortHookDirector`, `attention-editing-recipes`, `InspectThenQuantify`, semantic composition, multiple explanatory scenes | Consistent **cross-domain treatment selection** from a *structured* fact/visual-intent type to installed, capability-checked recipes | **Do not create a new engine or public component now.** Prototype a small catalog-matching resolver as part of doc 18's first film-grammar pilot. |
| `FilmStyleGrammar` | **Planned, not a shipped public API** | Motion/camera profiles, art directions, 3D lighting and rendering controls | Pinned film-wide policy for pacing, shot grammar, visual language, exclusions, fallback, proof | **Highest-priority authored integration**; implement and verify doc 18's minimal data-only grammar before expanding. |
| `NarrationPacingDirector` | **Partial** | `AudioVisualCue`, `alignBeatMontage`, `readableCaptionFrames`, timed captions, protected intervals | Shot- and visual-complexity-aware holds, optional cue-relative reveal placement, speech/caption/action conflict diagnostics | Extend existing audio/editorial timing utilities **only for a failing narrated fixture**. Do not add a separate timeline. |
| `AttentionContinuityInspector` | **Partial** | XP1 label budget and collision checks, CC1 subject framing, scene continuity and loop diagnostics | Cross-shot focal-target handoff, on-beat visibility, premature answer/reveal declaration, repetitive composition/shot patterns | Add opt-in **metadata/geometry checks** to existing preflight, not an aesthetic grader. |
| `SemanticWorldBridge` | **Partial** | Semantic IDs, `InspectableAsset`, `VisualTransformation`, `ChartStory`, `InspectThenQuantify` | General **typed subject/data correspondence** when a physical subject becomes a diagram/chart and then reappears in later shots | First prove a second, unrelated cross-medium example. If existing handoff suffices, add a recipe, not a new bridge. |
| `CinematicLookProfile` | **Partial** | Studio/technical/cinematic 3D lights; camera profiles; infographic art direction; final 3D effects | One *optional* film-wide visual policy spanning real footage, 2D/SVG and 3D, with explicit color-space/output assumptions | Treat as a film-grammar extension. Add rendering operations only after a before/after real-export comparison. |
| `EquationStage` | **Not found as installable component; proposed in docs** | MG1 morphing/typing and text measurement, but no math-term/identity contract | Formula layout, semantic term IDs, legal equivalent-step transformations and substitution animations | Strong **conditional** standalone component for math, statistics and AI teaching. |
| `TimelineStoryStage` | **Not found as installable component; proposed in docs** | Scene storyboard and charts have timelines, but they are not a sourced, dated-event visual narrative | Real chronology/date intervals, event evidence/uncertainty and long-duration comparisons | Strong **conditional** standalone component for finance, policy and history videos. |
| `SimulationPlayback` | **Partial / no general registered component** | `ScalarField`, `MechanismSequence`, `AssetStateSequence` already evaluate authored state per absolute frame | Adapter for *supplied* versioned simulation snapshots, interpolation policies and truthful units/state labels | Defer until a scientific/engineering fixture outgrows existing per-frame state models. |
| `CharacterPerformance` | **Partial** | `people-3d` actions, `craft-part-rig`, internal auto-rig, cue alignment | Coherent speech-linked visemes, gaze, pointing, IK/contact and emotion across compatible rigs | Later: low value for the current faceless documentary format unless a character-led pilot requires it. |

### One useful registration gap, not a missing implementation

[`CausalSystemStage`](../../registry/visual/causal-system-stage.ts) has substantial implementation, a [React view](../../registry/visual/causal-system-stage-react.tsx), [Storybook examples](../../src/visual/causal-system-stage.stories.tsx) and an existing [test file](../../tests/tmp-causal-system-stage.test.ts). However, this audit did **not** find an installable `causal-system-stage` entry in [`registry.json`](../../registry.json). This is a **packaging/qualification task**, not a request to rebuild causality diagrams. Inspect the test file's temporary naming and release gates before registering it.

## What would actually improve videos? Three code-only experiments

### A. Film-grammar treatment matching (P0): reuse doc 18

**Input:** a consumer-authored, verified `cost-breakdown`, `mechanism`, `comparison`, `causal-system`, `evidence` or `trend` objective; stable subject/data IDs; available authorized assets; output profile.

**Process:** look up an allowed existing registry recipe, validate required subjects/data/source and renderer capabilities, compile using the current MD1/CC1/MG1/ES1 contracts, then return actionable diagnostics for unsupported choices.

**Example:** equipment inspection → observed installation operation → sourced cost waterfall. A vague title like “expensive HVAC” is **not** enough input; neither the registry nor a rules engine should invent data, a physical mechanism or a stock scene.

**Acceptance:** one grammar produces visibly different, informative treatments in **two unrelated domains** with unchanged core rules; users can override the choice; unsupported inputs fail instead of rendering generic cards, particles, fake arrows or numbers.

### B. Narration-aware readable holds (P1): extend existing audio contracts

**Input:** supplied audio words/segments/cues, meaningful action/reveal markers, estimated content reading requirements, independently authored output profile.

**Process:** calculate minimum display opportunities for key charts/labels, place or validate an existing MD1 hold relative to supplied speech markers, warn when visual payoff arrives before its spoken setup or a camera cut hides a critical action.

**Acceptance:** an intentionally too-fast caption or chart fixture yields a targeted `shotId`/frame diagnostic; normal and shuffled seeking agree; no change to any audio decoding, TTS or mixing engine. Note that existing `AudioVisualCue`, `alignBeatMontage` and `readableCaptionFrames` may already handle much of this: confirm the residual gap before editing.

### C. Cross-shot attention continuity (P1): extend current preflight

**Input:** authored shot transitions, principal subject IDs, camera/scene projected geometry, anticipated reveal frames and action timing.

**Process:** inspect strategic boundary/action frames for focal-subject loss, late follow-camera arrival, unsupported identity swaps, unreadable overlap and optional declared “answer not visible before reveal” rules.

**Acceptance:** deliberately broken examples trigger bounded CPU-only diagnostics; a real film pilot passes without requiring screenshots, OCR, perceptual ML, video-semantic analysis or aesthetic scoring. Do not claim to detect whether a scene feels boring.

## Prioritization and stop rules

| Order | Work | Why now | Do **not** do |
| --- | --- | --- | --- |
| **0** | Make one **finished 60–90 second reference** combining licensed real footage, meaningful 2D/3D, supported data, supplied narration/captions/SFX, and both 16:9/9:16 layouts | Exposes true production failures instead of hypothetical missing APIs | Mark screenshots or automated tests as artistic sign-off |
| **1** | FilmStyleGrammar pilot + bounded, code-only treatment matching inside **doc 18's scope** | Highest leverage for purposeful variety and consistent direction | Publish a parallel `VisualTreatmentDirector` runtime |
| **2** | Narration/hold and cross-shot attention checks, **only where pilot fails** | Reduces repeated review and camera/readability defects | New clock, generalized AI evaluation or expensive full-frame analysis |
| **3** | Qualify and register already-written useful features (e.g. `CausalSystemStage`) | High reuse for low incremental implementation effort | Rewrite working source for naming consistency |
| **4** | Add `EquationStage` or `TimelineStoryStage` when selected content requires them | Expands explanatory domains rather than effect count | Build every specialty stage speculatively |
| **5** | Optional cross-media look harmonization, generalized simulation or character acting | Depends on concrete aesthetic/functional demand | New shader/3D engine without before/after proof |

### Reference-film acceptance must be honest

- Record source SHA, rights, browser/codec and output profiles.
- Run existing geometric, timing, clip-readiness and export checks locally as applicable.
- Inspect actual exported video **at normal speed, with real audio**, separately for each output profile.
- Record `accepted`, `needs-revision` or `not-reviewed` explicitly; a rendered MP4 or green test suite is not a cinematic-quality guarantee.
- Prior K2/K3 work uses synthetic conveyor footage; [K3](2026-10-24-k3-profiles.md) records a scoped owner acceptance for its three layouts. That does **not** establish a complete live-footage + explanatory 3D + narration reference. The [hero approval list](hero-approvals.json) is empty at the audited commit.

## Decisions and implementation guardrail

1. **No AI inference inside Kumiki's rendering path.** Accept structured and source-backed inputs; optionally let ContentGen produce those inputs with local/remote AI or manual editing.
2. **Use the catalog before new code:** `npm run catalog:find -- --query="..." --format=json`; then `npm run catalog:api -- --id=ID --format=json` for actual props/exports. Name search alone is insufficient.
3. **Prefer extending existing registered behavior** over adding public names. Create a component only after an annotated, reproducible failing fixture shows that it is truly distinct.
4. **Keep single ownership:** doc 18 for styles/treatments; doc 19 for footage/receipts; visual and motion modules for framing, semantic behavior and timing; ContentGen for research, editorial choices, licensed asset search, TTS, mixing and publishing.
5. **Preserve determinism:** absolute-frame evaluation, no speculative data synthesis, no silent visual fallback, no required AI, and no LLM screenshot review.
6. **Respect credit limits:** local validation suffices for this planning stage; do not treat GitHub Actions status as a release-quality verdict while the account's credits are exhausted.

**Bottom line:** Most proposed high-impact names are **not blank-slate missing components**. The strongest next investment is a thin, verified composition/directing layer over existing capabilities, plus two conditional domain-specific components (`EquationStage` and `TimelineStoryStage`). Prove the need in a finished film before expanding the registry.
