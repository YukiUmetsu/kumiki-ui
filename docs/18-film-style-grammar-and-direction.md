# 18 — Film Style Grammar & Directed Visual Proof

**Status:** Research-backed design proposal; **not an implemented Kumiki API or release claim**.  
**Repository review:** 2026-10-24, `YukiUmetsu/kumiki-ui` default branch.  
**Inspiration:** [`lemomo-ai/lemo-opuscar`](https://github.com/lemomo-ai/lemo-opuscar), especially its [`DIRECTOR.md`](https://github.com/lemomo-ai/lemo-opuscar/blob/main/DIRECTOR.md), [`TECHNIQUE.md`](https://github.com/lemomo-ai/lemo-opuscar/blob/main/TECHNIQUE.md), [example `STYLE.md`](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/blueprint/STYLE.md), and [`MY-STYLES.md`](https://github.com/lemomo-ai/lemo-opuscar/blob/main/MY-STYLES.md).  
**Audience:** Kumiki contributors, video-creation integrators, and agents authoring reusable motion and visual compositions.

**Companion:** [19 — Clip-Led Production & Revision-Aware Handoff](19-clip-led-production-and-revision-handoff.md) adapts MoneyPrinterTurbo's editable-shot, asset-provenance and selective re-render lessons. This document owns **film-style direction**; 19 owns the proposed **prepared-media-to-visual handoff**. Neither proposes a new canonical scene schema or renderer.

## 1. Decision and boundaries

**Recommendation:** Add a small, composable **film-style grammar layer** above existing Kumiki recipes and below a consumer's creative treatment. It describes *how a family of films behaves*—staging, composition, type, camera, motion, material treatment, audio cue intent, native transitions, and prohibitions—without prescribing a film's story, facts, brand, or assets. Prove each grammar with real rendered style frames and short, source-backed reference productions before expanding its catalog.

This is **not** a request for another renderer, animation clock, scene wire format, media editor, storyboard engine, TTS provider, or large style-template collection. The value is **coordinating existing components with a repeatable directing language**, then demonstrating that the result teaches or communicates something at final output size.

Ownership must stay explicit:

| Owner | Responsibilities | Does not own |
| --- | --- | --- |
| Content-producing consumer | Research, evidence review, topic, audience, narrative alternatives, treatment, shot objectives, script, voice/music/SFX generation and mixing, approval, delivery | Kumiki's motion internals, renderer-neutral visual primitives |
| Kumiki-UI | Reusable style grammar, typed recipe/shot capability mapping, semantic composition, camera/motion/cue declarations, deterministic preflight, actual visual examples | Fact discovery, inference from untrusted documents, voice synthesis, audio mastering, publishing, viral-score prediction |
| Export adapter | Fonts/assets readiness, frame capture, codecs, optional 3D/footage capabilities, output artifacts | Creative decisions, a second timebase, fabricated assets or facts |

**Architectural owners remain authoritative:** [08 Motion Graphics](08-motion-graphics.md) for art direction and motion vocabulary; [09 Explainers](09-explainer-components.md) for teaching objectives; [11 Rendering Quality](11-rendering-quality.md) for serialization/export/QA; [13 Integrations](13-content-creation-integrations.md) for dependencies/licenses; [17 Explainer Visual Components](17-explainer-visual-components.md) for component roadmap. This document specifies the *missing coordination and visual-proof layer* and does not duplicate those contracts.

## 2. What Kumiki already has — reuse before adding anything

These are source-confirmed development capabilities, **not an assertion that every visual review or production release gate passed**. Inspect `registry.json`, registered files, component specs, and exact catalog APIs before implementing.

| Existing capability | Relevant source / specification | How style grammars reuse it |
| --- | --- | --- |
| Frame-addressable motion (MG1), presets, reveal/morph, identity-preserving transformations (VT1) | `registry/motion/`; [Motion Track](component-specs/motion-track.md), [Visual Transformation](component-specs/visual-transformation.md) | Implements native moves, pacing, holds and transitions with one existing clock |
| MotionDirector (MD1) shots/groups/recipes and cue schedule | `registry/motion/motion-director.ts`, `director-types.ts`; [MD1](component-specs/motion-director.md) | The compilation target for style-aware choreography, not a new motion executor |
| Cinematic Camera Director (CC1), camera stages, CutDirector | `registry/motion/cinematic-camera-director.ts`, `camera-stage.tsx`, `cut-director.ts`; [CC1](component-specs/cinematic-camera-director.md) | Purposeful shot selection, semantic targets, cross-shot continuity and format-specific framing |
| Scene Storyboard, semantic motion direction, Explainer Production | `registry/motion/storyboard.ts`, `semantic-direction.ts`; `registry/visual/explainer-sequence.ts`; [ES1](component-specs/explainer-production.md) | Carries editorial intent and maps shots into existing visual/timing declarations |
| Semantic, physical and data visual operations | `process-journey`, `diagram-stage`, `mechanism-sequence`, `section-reveal`, `exploded-view`, `inspect-then-quantify`, `flow-path`, `chart-story`, `evidence-stage`, `comparison-stage` | Provides the meaningful visual action; a style must not replace it with ornamental movement |
| Infographic art directions, tokens and semantic layouts | `registry/infographic/art-direction.ts`, `templates.ts`; [Infographic Templates](component-specs/infographic-templates.md) | Existing *still-image* visual policies; extend their concepts, do not duplicate their color/type resolver for film |
| Hooks, edits, captions and aligned cues | `short-hook-director`, `attention-editing-recipes`, `cut-director`, `caption-performer`, `audio-visual-cue`, `frame-accurate-clip` | Uses existing beat-to-frame, caption and cut logic; audio remains declarative |
| Deterministic production constraints | `registry/visual/production-contract.ts`, `explainer-principles.ts`, `explainer-preflight.ts`; [Visual Production Contract](visual-production-contract.md) | Rejects missing semantic targets, unsafe captions, broken timing/identity or unsupported capabilities |
| Frame preview/export | `registry/visual/explainer-frame-capture.tsx`, `registry/video/video-export-stage.tsx`; [Phase 2 hybrid verification](verification/2026-10-22-phase2-hybrid-short.md) | Renders proof frames through the real scene code, then delegates capture/encoding to existing adapters |

**Genuine gap:** none of these currently constitutes an installable, film-wide directing grammar that binds **style essence + shot grammar + native moves + negatives + audio character + proven examples** into one curated, reusable policy. MD1 `DirectorProfile` controls pacing/personality/intensity; infographic `ART_DIRECTIONS` controls still-art presentation. Neither by itself tells an agent *which* sequence of camera, visual operation, information reveal and sound is appropriate for a particular kind of film.

**Release caveat:** multiple relevant specs still mark human visual review or broader production qualification as pending. Do not turn “source exists” or “Storybook story exists” into “premium film production validated.”

## 3. Lessons to adapt from lemo-opuscar

| Observation | Kumiki adaptation | Avoid copying |
| --- | --- | --- |
| Each style describes its **essence and exclusions**, materials, color, type, camera, motion, sound, signature moves, pitfalls and variation space | Versioned `FilmStyleGrammar` (name provisional) with invariant and negative rules, existing component IDs, capability requirements and example compositions | The 59-style inventory, demo plots, fixed timings, characters, marks, sound recordings or copyrighted visual references |
| A film receives a *treatment* before animation: story alternatives, shot reasons, beat/cue map and a unique visual payoff | A consumer-authored, structured **treatment-to-Kumiki handoff**; Kumiki validates that its targets/cues/recipes resolve | A second script/research/storyboard engine inside Kumiki |
| The visual look is proven by frames generated with the real code | Three representative render frames plus a short signature-action strip, then optional human approval before expensive production | AI-generated mockups accepted as proof that renderer output looks the same |
| Pictures, sound and captions follow one timeline | Reuse MG1/MD1 and AudioVisualCue at integer frames; let consumer/audio tools supply measured timing | A separate beat clock or integrated DAW/TTS inside Kumiki |
| Final QA includes contact sheets, action strips, reading-time checks and viewing the film with sound | Extend *use* of existing geometry/readability guards, sample critical intervals and log an actual visual review | LLM screenshot scoring, CI screenshots of every frame, or claiming visual beauty from a green structural test |
| Users can derive private custom styles from a library base | Consumer-owned variation/profile overrides, pinned base grammar and provenance, diff and preview before acceptance | Mutating a source-distributed registry automatically or overwriting consumer edits |

The strongest idea is **a style is a system of decisions, not a skin**. But the reference repository's custom demo code and high-cost agent workflow are not an appropriate drop-in architecture for a small, installable React registry.

## 4. Proposed grammar contract (conceptual, not shipped)

Start with metadata and recipe binding; do not finalize a new public type until one film is built with existing MD1/CC1/VT1/ES1 APIs. A grammar records *invariants and choices* rather than its own evaluated tracks.

| Section | Required information | Validation / output |
| --- | --- | --- |
| Identity | Stable ID, version, purpose, compatible output profiles, base grammar (optional) | Version pin and explicit inherited overrides |
| Essence | What experience it creates, what it must **not** resemble | Negative rules, not brand-specific presets |
| Visual language | Tokenized type, hierarchy, layout density, material categories, palette roles, subtitle policy | Compose existing DTCG/infographic roles; measured text |
| Shot grammar | Allowed framing/camera intents by narrative purpose: establish, investigate, show cause, compare, payoff | Maps to CC1/MD1; every move carries a justification |
| Native moves | Reusable operations such as draw-on, isolate, section reveal, evidence focus, aligned chart comparison | Resolves real registered recipes + semantic subject IDs |
| Rhythm | Anticipation/action/hold/handoff policies, reading holds, permissible cuts and pauses | Frame-based MD1/AudioVisualCue scheduling; no constant-effect rule |
| Sound character | Semantic material/SFX category, silence and beat intent, ducking *request* | Emits cue references only; consumer owns audio files and mix |
| Capability/rights | Required catalog IDs, optional adapters, asset rights, fonts, reduced-motion/static fallback | Missing dependencies or unsupported effects produce diagnostics |
| Proof | Three source-backed style frames, one signature motion, 16:9 and 9:16 layouts, known limitations | Storybook fixture, visual-review record and reproducible frame recipe |
| Variation | Safe overrides, changes that alter essence, prohibited changes | Deliberate versioned variants rather than arbitrary style blending |

Illustrative authoring data—not a registered schema, actual API, or promise of a new file layout:

```json
{
  "schemaVersion": 1,
  "id": "mechanical-drafting-study",
  "version": 1,
  "essence": "A constructed object's relationships become visible through measured lines and reversible part operations.",
  "prohibitions": ["unmotivated camera orbit", "unmeasured dimensions", "labels obscuring the subject"],
  "shotGrammar": [
    {
      "purpose": "explain-causality",
      "role": "reveal-interior",
      "cameraIntent": "hold-then-track-subject",
      "nativeMove": "section-reveal",
      "requiresSemanticRoles": ["whole", "hidden-part", "consequence"]
    }
  ],
  "componentRefs": ["motion-director", "cinematic-camera-director", "section-reveal", "semantic-callouts"],
  "audioIntent": [{ "event": "reveal-complete", "category": "material-mechanical" }],
  "proof": ["opening", "causal-change", "payoff"]
}
```

In an implementation, replace free-form `nativeMove`, `cameraIntent`, cue categories and component references with **actual catalog-resolved, typed identifiers**; publish a capability diagnostic for unresolved values. Never execute runtime JavaScript or user-supplied agent instructions from style data. Keep consumers free to omit optional SFX or choose a static treatment.

### Compilation direction, not another pipeline

1. Consumer supplies a validated scene/storyboard with `claim`, `visualObjective`, stable subject IDs, source evidence IDs, cue references and output profile. The consumer chooses a grammar/variant; **the grammar never invents facts or measurements**.
2. Resolve the grammar's exact installed registry items and supported capabilities. Use `catalog:find` for discovery and `catalog:api` for exact public props; never infer APIs from a style name.
3. Match each storyboard shot purpose to a *compatible* native move with required subject roles, physical/data constraints and shot alternatives. The director can recommend alternatives, but no silent generic-box substitution.
4. Compile the selection into existing Storyboard/ES1 + MD1/CC1/MG1/VT1 declarations, including static fallback, caption safe zones, semantic identity and AudioVisualCue links.
5. Apply `inspectExplainerPrinciples`, semantic composition guards and actual layout-measured constraints. Return diagnostic `{shotId, subjectId?, frameRange?, rule, suggestedAction}` when intent cannot be rendered truthfully.
6. Produce a proof bundle using the same render path as eventual export. The consumer decides whether to approve, revise or choose a different visual treatment.

**Failure rule:** if the requested demonstration lacks geometry, real data, an authorized image or a registered capability, report `unsupported-visual-intent` with concrete alternatives. Do **not** turn it into arbitrary arrows, floating dots, repeated title cards or placeholder text while reporting success. Explicitly approved low-motion/static explanation is valid.

## 5. First three curated grammar studies

Begin with three *styles of explanation*, not 59 catalog entries. Use anonymous sample objects/data and at least two different source domains per grammar to prove reuse.

| Pilot | Existing components to compose | Native storytelling moves | Anti-patterns to test |
| --- | --- | --- | --- |
| **Technical Drafting** | `mechanism-sequence`, `section-reveal`, `exploded-view`, `dimension-overlay`, `semantic-callouts`, CC1 | Drafting-order draw-on; follow one physical dependency; section/isolate/restore; end on a legible working whole | Fake measurements, ornamental HUDs, arbitrary orbit, clipped callouts |
| **Evidence & Data Investigation** | `evidence-stage`, `chart-story`, `freeze-frame-focus`, `animated-metric`, `cut-director`, AudioVisualCue | Claim → authorized source → data-addressed focus → aligned comparison → qualified finding | Unsourced values, unreadable source labels, invented footage, axes changed unnoticed |
| **Connected Process World** | `process-journey`, `diagram-stage`, `flow-path`, `asset-state-sequence`, `comparison-stage`, CameraStage/MD1 | Establish orientation; persistent subject moves through actual stages; show transformation at each handoff; reveal result in context | Meaningless traveling particles, scene-to-scene identity loss, camera chasing tiny objects |

**Optional later:** a kinetic-editorial/short-form style built from `short-hook-director`, `attention-editing-recipes`, `caption-performer` and `cut-director`. Avoid creating it before the first three meet visual-proof acceptance.

No grammar may bake in an industry, client, brand palette, topic text, proprietary typeface, footage, particular house/device, or sales copy. Its demo assets must be separately rights-cleared for **redistribution of source**, not merely commercial video display.

## 6. Directed visual-proof loop

The lemo-opuscar lesson is to **prove the look before rendering the full film**. Kumiki should expose a lightweight recipe and output contract that a consumer or its Studio UI can drive:

1. **Authored intent:** one observable learning/communication change, named critical subjects, what changes on screen, why this framing/transition helps.
2. **Choice:** two candidate *visual operations* when ambiguity is genuine (e.g. isolate a part vs. compare two states). Choose based on declared subject/data capabilities, not an ungrounded aesthetic score.
3. **Three real frames:** opening/establish; visible transformation; payoff/finished state. Render with real fonts/assets/components through `ExplainerFrameCapture`/`VideoExportStage`, never AI mockups.
4. **One action strip:** sample the signature transition at critical boundaries and short intervals (e.g. 0.2 s) to catch camera lag, jump cuts, occlusion and unreadable intermediate states; do not capture every video frame for routine QA.
5. **One-line review:** `accepted`, `needs-revision`, or `not-reviewed`, with reviewer, output profile, source revision, known limitations and actual artifact identifiers. No claim of full-speed audio/visual approval if it was only stills.
6. **Selective revision:** retain immutable scene/style/asset hashes so changing one shot or grammar override invalidates its proof and dependent handoffs, not unrelated scenes.

This is a **proposed production workflow**. It is not a new render service or UI requirement in core Kumiki. The consuming studio should own the approve/regenerate job UX and expensive provider orchestration.

## 7. QA: what can be proven, what needs eyes

Use existing deterministic checks and extend coverage only where a **real failing fixture** reveals a gap. Respect [15 Explainer Lessons](15-explainer-lessons.md): sparse captions, stable intentional camera, no random dots, one causal input → transformation → output, and no heavy screenshot recognition/Playwright in CI.

| Quality dimension | Automated guard or evidence | Limitation / review |
| --- | --- | --- |
| Semantic clarity | Shot purpose, concrete before/action/after, required subject/operation IDs, real start/end states and payoff link | Still need a person to judge whether the visual really explains the concept |
| Visual geometry | CC1 critical framing, `placeProtectedText`, bounds/collisions, CJK/RTL font metrics, safe-zone profiles | Renderer-specific lighting/contrast over moving footage needs an actual preview |
| Rhythm/reading | Frame-based cue alignment and critical readable holds; stage one significant change at a time | Cannot automatically infer how hard a concept is to understand |
| Continuity | Stable identities, attachment ports, boundary frames, camera intent and seek parity in shuffled order | Cinematic appropriateness remains subjective |
| Truth/provenance | Exact claim/data/asset refs, units/scales/rights requirements and explicit illustrative values | Kumiki does not verify a source's factual interpretation |
| Production fidelity | Real 16:9 and 9:16 proof frames, opening/action/payoff samples, optional decoded short, source hash/version manifest | Human watch/listen of a finished reference remains a separate gate |

**Implementation evidence:** for each pilot save reproducible Storybook stories and fixture IDs, the actual inspected output profiles, structural test commands/results, selected-frame artifacts (not necessarily committed large binaries), and an explicit human-review status. 3D subjects additionally follow [14 3D Fidelity](14-3d-visual-fidelity.md) and its existing `hero:quality` gate. A screenshot's existence is **not** visual sign-off.

## 8. Delivery plan and strict acceptance

| Slice | Work | Exit gate |
| --- | --- | --- |
| **0 — Catalog audit** | Run `npm run catalog:find -- --query="..." --format=json`, `catalog:api` for selected exact IDs, `catalog:check`; inspect installed versions, specs, source/tests and missing capabilities | Written inventory of which style moves already compile and which remain pending visual review; no new code |
| **1 — One grammar specification** | Define the smallest **data-only** style metadata, version/override semantics and compile diagnostics on top of MD1/CC1/ES1; create an anonymous pilot fixture | Can map one complete storyboard to existing components without new clock/renderer or a generic visual fallback |
| **2 — Three proofs** | Technical Drafting, Evidence & Data Investigation, Connected Process World; each with a short authored reference and source-backed key frames; use two unrelated subject/data fixtures per grammar | Real rendered first/change/payoff states show different mechanisms, 16:9 + 9:16 proof, seek parity and reusable style identity |
| **3 — Visual qualification** | Cheap deterministic guards, critical-action strips, recorded human review of full-speed reference playback where audio exists | No blocking geometry/identity/rights/cue errors; failures point to shot and corrective action; visual review documented, not presumed |
| **4 — Consumer variation** | Base-version pinning, safe token/pace/camera overrides, side-by-side real proof and persistence outside source registry | Consumer edits survive registry upgrades; no overwrite or false claims of backward-compatible visual identity |

**Accept a pilot only if all apply:**

- The authored operation teaches or demonstrates a real change even with narration muted; no generic “main idea” placeholders or meaningless diagram particles.
- Style-specific visual differences are noticeable beyond fonts/colors (camera grammar, native transitions, staging and rhythm), yet the same source facts survive every variant.
- Composition uses existing installed primitives and preserves semantics, exact values, source IDs, causal identity, cue timing and stable output sizing.
- Key information fits and is readable in both separately authored landscape/portrait compositions. A blind center-crop does not count.
- Unavailable geometry/media/assets/capabilities fail clearly; no invisible or silently degraded hero content.
- No new mandatory runtime dependency, animation clock, full-scene document or NLE. Any optional adapter is capability-checked and licensed.
- Unit/structural tests plus actual real-rendered proof and a recorded normal-speed human visual review are all present **before** claiming production quality.

**Stop condition:** If a film cannot be improved through existing compositions without building several new primitives, log the concrete shot/capability gap and revisit the scope. Do not inflate a style library to conceal weak production results.

## 9. What not to import from lemo-opuscar

- **Not the 59 individual demo films, stories or code trees.** A style demo is evidence of a technique, not a universal component API. Reusing its plot or swapping labels into the original film fails originality and generality.
- **Not a Claude/agent runtime dependency.** Higher-cost online models may help a consumer choose a treatment, but Kumiki must run deterministically and without model inference.
- **Not its audio/FFmpeg stack.** Retain Kumiki's visual export handshake, existing cues and consumer-managed audio production; benchmark renderer techniques only if measured performance reveals a gap.
- **Not its hard-coded cinematic rules as universal laws.** Some lemo-opuscar films benefit from frequent camera movement or music-locked cuts; technical explainers often need a locked camera, fewer moves and longer readable holds. Purpose governs style.
- **Not its sample assets without rights review.** The source repository may have an MIT license, but third-party fonts, recordings, video, music, models and historical imagery require their own redistribution checks. Follow [ASSET_SOURCING](ASSET_SOURCING.md) and [13](13-content-creation-integrations.md).

## 10. Questions left to an implementer

1. Can one grammar remain descriptive metadata over `MotionDirection`/`Storyboard`/`Infographic` policies, or does a single pilot demonstrate an unavoidable missing typed authoring field? Prefer metadata until evidence demands migration.
2. Which current catalog items already expose the chosen native moves as parameterizable public APIs, and which are only development stories? Do not infer from source file names or documentation prose.
3. How should the optional consumer persist a derived style and pin its base version without making the registry mutable? The consumer owns that persistence policy.
4. What exact output artifacts and reviewer metadata are necessary for a minimal reproducible proof without introducing expensive frame caches or browser tests into CI?

**Next action:** Perform Slice 0, then implement *one* end-to-end grammar pilot with real visual proof. Defer a broad catalog until multiple unrelated films show it genuinely reduces custom scene coding and review iterations.
