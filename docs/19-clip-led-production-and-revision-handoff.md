# 19 — Clip-Led Production & Revision-Aware Handoff

**Status:** Source-reviewed architecture and verification proposal; **not an implemented Kumiki API**.  
**Repository review:** 2026-10-24, `YukiUmetsu/kumiki-ui` default branch.  
**Reference:** [`harry0703/MoneyPrinterTurbo`](https://github.com/harry0703/MoneyPrinterTurbo), especially its [English README](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/README-en.md), [editable local video projects](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/docs/video-projects.md), [`video_project.py`](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/video_project.py), and [`material.py`](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/material.py).  
**Audience:** Kumiki contributors, adapter authors, and consuming video studios such as ContentGen.

## 1. Decision: adopt production interoperability, not the generator

MoneyPrinterTurbo makes a pragmatic journey available: script → prepared footage/voice → cut footage → subtitles/music → video, exposed through a WebUI, agent, API and CLI. Its opt-in **editable local video projects** are more instructive for Kumiki than its one-click generation pitch: immutable input revisions, stable scene IDs, a stage dependency graph, content hashes, verified artifact reuse, targeted re-renders and preservation of the last successful export.

**Recommendation:** Kumiki should make its existing composable footage, semantic graphics, camera, editing, captions and cues easy for a consumer to package as **an editable, reproducible film**. Supply compact shot/asset/visual-capability contracts, proofs and fingerprintable outputs; keep project storage, stock search, AI generation, transcription, job retries, orchestration, FFmpeg processes and publishing outside the library.

This document proposes **one narrow integration layer**, not a second composition schema, animation clock, media editor, project database, timeline renderer or generator. Read [11 — Rendering Quality](11-rendering-quality.md) as the authority on canonical scene serialization, timebase and export; [13 — Integrations](13-content-creation-integrations.md) for adapter/license decisions; [17 — Explainer Visual Components](17-explainer-visual-components.md) for visual primitives; and [18 — Film Style Grammar](18-film-style-grammar-and-direction.md) for artistic direction and proof.

## 2. Evidence and boundaries from MoneyPrinterTurbo

| Observed capability | Evidence | Lesson for Kumiki | Ownership boundary |
| --- | --- | --- | --- |
| Multiple entry points and stage control | README: AI Agent, WebUI, API and CLI; user-supplied scripts; variant jobs | Deterministic, serializable **prepared-shot handoff** usable from a UI or automation without mandatory AI | Consumer handles UX, jobs, scripts and providers |
| Local, stock and generated imagery/footage | README footage options; `material.py` normalizes provider material metadata | Accept authorized local asset **references** and semantic shot roles; retain source/creator provenance and per-output framing | Consumer searches, downloads, generates, selects, licenses and stores assets |
| Clip fit, duration, order and portrait/landscape/square | README footage and export options | Prove replacement, trimming and **independently authored reframe per profile**, including 1:1 | Existing `FrameAccurateClip`, `CutDirector`, safe-frame and camera contracts own visuals |
| Voice/audio choice and subtitle styling | README voice, caption and music options | A supplied audio/caption path should work with no TTS or transcription package installed | Consumer owns speech, alignment and mastering; Kumiki maps cues to frames |
| Editable local project | `docs/video-projects.md`: input snapshots, stable scene IDs, revisions, `plan`, `compare`, `render`, `status` | Preserve edit intent and stable IDs, expose what changed and what requires re-proof | Consumer owns revision store and worker DAG |
| Sound incremental rebuild boundary | `video_project.py`: scene audio → timing → render; scenes → assembly → BGM/export | Supply deterministic dependencies so a music change needn't invalidate every visual scene | Consumer performs invalidation, hashing, caching and media operations |
| Artifact verification before reuse | `video_project.py`: content SHA-256 and dependency records | Carry verified source identity and render receipt through QA and preview/export | Adapter or consumer validates stored output bytes; Kumiki reports visual readiness |
| Last successful output survives failures | `docs/video-projects.md`: explicit retry/cancel, atomic records, prior good export | Never mark an unverified or partially rendered film as the new successful proof | Consumer transaction/state policy |

**Important limitation of the reference:** MoneyPrinterTurbo's **opt-in local revision renderer** explicitly **does not** implement word-aligned subtitles, transitions or overlays; these are distinct from features advertised by its main production workflow. It is not a demonstrated generic nonlinear-editor interchange format (CapCut, Premiere, Final Cut, etc.), nor a drop-in Kumiki scene renderer. Do not describe it as either.

The README's “free” stock/provider labels are not an asset-use or redistribution license. A stored `source_page`, creator field or provider name is useful provenance, **not proof of permission**. Source links, license terms, allowed transformations, attribution obligations, and redistribution rights must be checked independently.

## 3. Inventory: reuse what Kumiki already implements

The following items have development source/specs and examples. **Human full-speed visual/audio sign-off remains distinct from passing structural tests**; see the [13-second hybrid export report](verification/2026-10-22-phase2-hybrid-short.md).

| Needed operation | Existing Kumiki implementation | What's still needed for practical consumer use |
| --- | --- | --- |
| Frame-accurate local video/image sequence, trim, speed, freeze, cover/contain | [`FrameAccurateClip`](component-specs/frame-accurate-clip.md), pluggable decoder and `VideoExportStage` readiness guard | A reusable **clip-with-explanation** composition fixture with explicit asset slot and rights metadata |
| Ordered shots, transitions, stable visual identity | [`CutDirector`](component-specs/cut-director.md) + MD1/CC1 | Recipe mapping editorial shot purpose to verified existing transitions; no auto-random transition policy |
| Supplied caption and word timing | [`CaptionPerformer`](component-specs/caption-performer.md) + `ShortSafeFrame` | Round-trip caption cue references and readability proof over **moving footage** for 9:16, 16:9 and 1:1 |
| Voice/music/SFX-linked motion | [`AudioVisualCue`](component-specs/audio-visual-cue.md) + mix manifest/FFmpeg args | Exported manifest that ties cue/asset revision to visual output; keep actual mixing external |
| Footage + 2D teaching graphic + 3D | [Hybrid short verification](verification/2026-10-22-phase2-hybrid-short.md) | A consumer-editable *shot package* example with alternate footage, title/caption positioning and no destructive flattening |
| Renderer-neutral, editable authored motion/scene data | [11](11-rendering-quality.md), MG1/MD1/VT1/CC1 serialization | Stable external references and concise **receipt/dependency metadata**; avoid declaring another authoritative scene JSON |
| Film-wide look, editorial intent and real frame proof | [18](18-film-style-grammar-and-direction.md) | Connect chosen style/operation IDs to each prepared shot and include their versions in revision fingerprints |

**Actual gaps are composition and handoff, not raw media effects.** Reuse `FrameAccurateClip`, `CutDirector`, `CaptionPerformer`, `AudioVisualCue`, `ShortSafeFrame`, `VideoExportStage` and existing serialization. If a pilot exposes a missing public extension point, document the exact installed catalog ID and signature before adding an API.

## 4. Proposed prepared-shot and editability contract

A consumer should be able to hand Kumiki a shot with **visual purpose**, authorized assets and measured audio/caption anchors, and receive a deterministic visual-plan/diagnostic/preview result. Keep the persistent production project outside Kumiki; a consumer may store these fields as a sidecar alongside existing serializable MG1/MD1/VT1/CC1 authoring fragments. Do **not** silently add them to an existing runtime schema.

| Field group | Minimum proposed information | Invariant |
| --- | --- | --- |
| Identity | `projectRevision`, stable `sceneId`/`shotId`, storyboard operation or semantic role | Reordering or replacing media **must not change unrelated shot identities** |
| Visual purpose | `establish`, `demonstrate`, `compare`, `inspect-evidence`, `payoff`, or registered semantic operation | Shot must visibly advance the explanation; generic stock footage is optional context, never fake evidence |
| Prepared asset slot | Local content reference, version/hash, intrinsic size/frame rate/timestamps, authorization/rights reference, creator/source metadata | Missing or unauthorized inputs fail before expensive rendering; no runtime URL fetch or arbitrary scripts |
| Clip direction | Output start/duration frames, trim/remap/freezes, frame fit, subject-relative focal point, required visible subjects | Resolves through existing clip/camera/cut APIs, including optional static fallback |
| Overlays | Real graphic component IDs, subject/data refs, protected text regions and safe-frame profile | Labels and claims must remain legible and substantively correct over busy or cropped media |
| Timing | Supplied narration/caption alignment reference, audio lane/cue IDs, transition intent | Frame conversions use the **one canonical rational FPS**; no per-provider invented beat clock |
| Output variant | 16:9 / 9:16 / 1:1 layout and framing treatment, accepted feature capabilities | Variant may reposition/recompose; a center crop that hides critical content must fail |
| Proof lineage | Authored fragment versions, catalog/grammar versions, asset and source hashes, output profile, adapter versions, render receipt | An output can be reproduced or explicitly reported as no longer reproducible |

Illustrative **consumer-side handoff** (not a registered Kumiki API, validated schema, or NLE export format):

```json
{
  "consumerContractVersion": 1,
  "projectRevision": "revision-004",
  "sceneId": "scene-opening",
  "shotId": "shot-observe",
  "purpose": "inspect-evidence",
  "asset": { "ref": "assets/footage-12", "sha256": "<actual-content-sha256>", "licenseRef": "rights/clip-12" },
  "compositionRef": "visual-fragment-07",
  "captionTrackRef": "captions/voice-take-2",
  "cueSheetRef": "cues/voice-take-2",
  "variants": {
    "landscape": { "width": 1920, "height": 1080, "fit": "cover", "focus": { "x": 0.52, "y": 0.45 } },
    "portrait": { "width": 1080, "height": 1920, "fit": "cover", "focus": { "x": 0.68, "y": 0.46 } },
    "square": { "width": 1080, "height": 1080, "fit": "contain", "focus": { "x": 0.50, "y": 0.50 } }
  }
}
```

This deliberately references existing authored visual data rather than embedding an entire second motion timeline. The shape and enum choices are placeholders; actual implementations must resolve **real catalog APIs** (`npm run catalog:find`, `npm run catalog:api`) and report unsupported values rather than inventing substitutes. `sha256` must be a real checked hash, not the illustrative placeholder. `licenseRef` points to independently reviewed permission data, not an assertion that the footage is licensed.

### Clip-led is not stock-first

For educational/documentary films, separate three footage intents:

1. **Demonstrative:** actual authorized mechanism/process video that proves a visible operation; may be frozen, tracked and annotated.
2. **Contextual:** mood, place or setting B-roll that **does not claim to document the narrated event**; use sparingly and disclose illustrative status where needed.
3. **Claim-bearing:** charts, quotations, measurements or asserted real-world events; require precise evidence/data provenance, not a keyword-matched stock clip.

When no shot-worthy footage exists, prefer Kumiki's *real semantic diagram, data graphic, inspectable object or deliberate static explanation*. Never downgrade to unlabeled generic video, filler particles or unrelated visual metaphors just to avoid a missing-asset error.

## 5. Revision-aware render handoff: reuse proof, not hidden state

MoneyPrinterTurbo's local project computes stage fingerprints from **inputs, settings, upstream stages, renderer version and FFmpeg versions**. Its cached artifact is trusted only when the bytes and dependency records match. For Kumiki, this suggests a small **deterministic dependency manifest** alongside a shot's serialized authoring fragments and preview/export outputs.

| User change | Expected invalidation in a consuming studio | Kumiki responsibility |
| --- | --- | --- |
| Replace shot footage | Affected shot's visual proof/render; downstream assembly/export | Resolve same `shotId` against new source hash; recheck crop, clip frames, semantics and safe text |
| Rewrite narration/replace voice timing | Related alignments, linked cues/captions, affected shot proof and final mix | Re-evaluate cue-to-frame links and readable holds, not transcribe or synthesize |
| Change film-style grammar or a scene visual recipe | Affected visual compositions, their proof and downstream assembly | Versioned IDs, explicit visual fingerprint dependencies and consistent scene intent |
| Move shot order/change transition | Relevant boundary transitions, assembly, export | Stable subject IDs, identity/framing checks on new boundaries |
| Change BGM gain/music asset only | Consumer mix and final encoded export | Existing visual render/proof should remain reusable if visual cues are unchanged |
| Change output profile or focal point | Profile-specific affected shot proof and export | Recalculate fit, text safe zones, critical framing and decoder capability |
| Change source adapter/font/catalog implementation | Only outputs depending on changed capability/input (or explicit broad invalidation if uncertain) | Include renderer/catalog/font capability versions in receipts or force explicit re-qualification |

**Do not implement MoneyPrinterTurbo's cache/DAG inside Kumiki.** Provide stable identity, serialized fragments, typed dependency references and reproducible proof metadata. The caller decides whether to reuse, how to store, when to retry, whether to cancel and which completed export to promote. On unknown dependencies or corrupt output, **fail closed and rebuild**; do not trust an old preview because a path still exists.

Suggested consumer receipt—not a new public Kumiki runtime type:

- Source snapshot and rights reference; exact scene/shot ID and revised content hashes.
- FPS/profile; renderer, decoder, font, component and grammar versions; referenced audio/cue/caption IDs.
- Rendered frame range, selected proof frames, adapter-capability diagnostics, exported artifact hash.
- Explicit `structural-tested`, `human-reviewed`, or `not-reviewed`; reviewer/date and full-speed audio/video status.
- Failure and reuse reason per stage, with no provider keys, raw secret prompts or private filesystem paths in shared logs.

## 6. Three small proofs before expanding scope

| Pilot | Scenario and existing components | What it must demonstrate |
| --- | --- | --- |
| **A — Swap one source** | One authorized clip, `FrameAccurateClip`, `FreezeFrameFocus`, `SemanticCallouts`, `CutDirector` | Replace the clip under the **same shot ID**; revalidate trim, focus, critical subject, provenance and all actual output frames; unrelated shot state remains unchanged |
| **B — Reframe one narrative** | Same shot sequence, supplied captions/AudioVisualCue, `ShortSafeFrame` | Real 16:9, 9:16 **and 1:1** compositions preserve evidence/text; different focus and layout may be required; no blind center-crop success |
| **C — Change audio without redrawing everything** | Hybrid footage + 2D + 3D fixture from [phase 2](verification/2026-10-22-phase2-hybrid-short.md), with supplied BGM and narration | BGM-only edit changes consumer mix/export; narration edit rechecks caption/cue/visual timing; explicit invalidation report; verified old successful output survives failure |

For each pilot:

1. Inspect the exact existing catalog components/specs before adding a new recipe. Use synthesized or separately redistribution-cleared fixture footage, fonts and audio.
2. Produce consumer-authored serialized shot sidecar + Kumiki visual fragments + a small plan/diagnostic receipt. Round-trip all existing authoring fragments without losing stable IDs.
3. Verify deterministic seeks and first/change/payoff frames, fit and subject visibility, per-frame decoder readiness, caption-safe regions and cue placement. Test at actual output resolutions rather than only in Storybook controls.
4. Render a short final encoded video with **externally supplied** audio. Record deterministic and structural results separately from a normal-speed **human watch/listen**, which remains required for a premium-quality claim.
5. Deliberately exercise missing asset/rights ref, stale hash, unsupported codec/decoder, unmeasured caption text, crop losing the subject and corrupt output. Report actionable shot/profile/field diagnostics; do not silently fill with a generic visual.

**Acceptance:** Changing one clip preserves unrelated authored shots and indicates exactly what needs re-proof; a music-only edit does not invalidate visual composition; 9:16, 16:9 and 1:1 have purpose-built readable framing; a human can inspect and approve every shot without first flattening it into one opaque video; seek parity holds on real export; no wrong-frame, unlicensed-asset, ungrounded-claim or missing-capability result is reported as a successful production.

## 7. Kumiki-only implementation plan (ordered, testable slices)

**Scope:** This section is an engineering plan for `Kumiki` source, reference compositions, export adapters and visual proof only. It is **not implemented by this documentation change**. It does not add a content studio, footage search, language model, revision database, cloud pipeline or publisher. A caller supplies local, authorized media, sourced data, word/cue timing and sound files. [11 — Rendering Quality](11-rendering-quality.md) continues to own the canonical scene/timing boundary; [18 — Film Style Grammar](18-film-style-grammar-and-direction.md) owns global direction.

**Prioritize one convincing complete composition over a larger API surface.** Start from the actual [13-second hybrid fixture](verification/2026-10-22-phase2-hybrid-short.md): programmatically generated VP9 footage + SVG + 3D + externally supplied audio was encoded and frame-seek checked, but real camera footage, natural speech alignment and full-speed human visual/listening review were *not* qualified. Do not report those as already solved.

| Order | Work slice | Reused owner/entry points | Deliverable and exit gate |
| --- | --- | --- | --- |
| **K0** | Inventory and baseline | `registry.json`; `catalog:find` / `catalog:api`; `FrameAccurateClip`, `CutDirector`, `VideoExportStage` | Exact API/capability map, baseline hybrid test and a measured export report; no speculative new interfaces |
| **K1** | Real-world footage qualification | `FrameAccurateClip` + decoder adapter + export readiness | Real, redistribution-cleared H.264/HEVC/VFR/oriented-footage fixtures (where platform permits); random seek, frame mapping and explicit unsupported-codec diagnostics |
| **K2** | Clip-led explanatory reference | `FreezeFrameFocus`, `EvidenceStage`, `SemanticCalloutLayer`, `CutDirector`, MD1/CC1 | One editable authored composition that freezes, identifies a real subject, adds source-backed labels, resumes and hands to a 2D or 3D explanation |
| **K3** | Independent multi-aspect composition | `ShortSafeFrame`, `CaptionPerformer`, CC1 and output-profile constraints | Real 16:9, 9:16 and 1:1 renders with measured caption/subject safety; no blind crop claiming success |
| **K4** | Bounded frame export | Existing `VideoExportStage` + `scripts/export-video.mjs` or its existing adapter boundary | A long-form manual fixture exported using bounded frame staging/streaming or verified segments; peak scratch/RAM, cancellation and output integrity recorded |
| **K5** | Visual proof and revision dependencies | Existing serializable MG1/MD1/VT1/CC1 fragments, asset hashes and visual QA | Minimal non-secret visual dependency receipt and two-version demonstration: one clip swap re-proves only dependent visuals; music-only change does not alter frame proof |
| **K6** | Release qualification | Storybook, unit/registry checks, sampled frames, normal-speed human playback | One complete hybrid reference film and an evidence report separating automated correctness from human artistic acceptance |

### K0 — Inspect first and lock the single existing contract

1. Resolve exact source files, registry IDs, dependency closures and supported props for `FrameAccurateClip`, `CutDirector`, `FreezeFrameFocus`, `EvidenceStage`, `CaptionPerformer`, `AudioVisualCue`, `ShortSafeFrame` and `VideoExportStage`. Record implemented, optional, unsupported and unverified capabilities separately.
2. Re-run the existing 13-second hybrid fixture's unit/export checks. Record source commit, browser/decoder, FFmpeg version, FPS, artifact checksum, total/temporary bytes, elapsed time and seek parity. Do not count prior report results as a new test run.
3. Link each proposed operation to an existing recipe first. A new public API is allowed only when an actual fixture demonstrates repetitive glue or an unavailable extension point. Avoid a `HybridScene` mega-component, an independent clock or an alternative `Composition` wire format.
4. Pin a tiny set of source-controlled, redistribution-cleared fixtures; never add unreviewed upstream stock footage, default songs or voice samples to the library.

**K0 gate:** an implementation author can identify the exact installed components and commands and can reproduce the current hybrid sample. Unknown catalog dependencies block expansion.

### K1 — Real footage and deterministic source-frame qualification

The existing synthetic VP9 fixture proves one decoder path, **not** arbitrary stock or camera video. Test and document the following input behaviors through the existing pluggable decoder contract:

| Case | Required demonstration / failure behavior |
| --- | --- |
| Constant-frame-rate H.264 MP4 | Exact mapped source frame after direct seek and shot cut; platform/browser codec availability explicitly reported |
| HEVC/H.265 camera recording | Capability negotiation before capture; unsupported browser decoders reject with actionable preflight instead of silently skipping frames |
| Variable-frame-rate source | Source timestamps/PTS mapped to output rational-FPS integer frames with a declared duplicate/drop policy, no accumulated drift |
| Rotation metadata and non-square pixels | Display orientation, visible-region and focal-point mapping agree in preview and export |
| Portrait video in landscape scene (and reverse) | Explicit `cover`/`contain` policy, preserved critical-subject box, no accidental black bars or offscreen labels |
| Seeking backward, speed ramp, freeze and replacement | Frame readiness identifies the requested source frame, not a stale frame from the previous draw |
| Missing/invalid/corrupt source | Stable `shotId` and per-profile diagnostics; never substitute an unrelated clip without caller approval |

A producer may transcode to a deterministic local intermediate with FFmpeg **outside** Kumiki's component registry. Kumiki consumes a trusted local asset and exposes exact decoder requirements; it must not bundle another transcoding service. Preserve the original source identity, source-to-output frame mapping and color/rotation assumptions in the sidecar/receipt. Select an intermediate codec from measured browser compatibility and visual-quality tests, not by asserting one universally works.

**K1 gate:** a non-synthetic real-source fixture supports repeated out-of-order seeks (including around cuts/freezes), or produces an explicit documented capability rejection. Frame readiness cannot be satisfied by a wrong-frame render.

### K2 — A reusable clip-with-explanation composition, not generic B-roll

Implement **one source-backed reference recipe** by composing already installed parts:

1. Establish: show an authorized real mechanism or location with a clearly identified subject (`FrameAccurateClip` + authored framing).
2. Focus: freeze the exact source frame, push toward an authored subject box and protect visual context (`FreezeFrameFocus`).
3. Explain: reveal measured/source-backed `SemanticCalloutLayer` or `EvidenceStage` annotations, with an authored reading hold and no ornamental bouncing.
4. Transform: hand off the **same semantic subject identity** to a 2D diagram, `SectionReveal`, `MechanismSequence` or 3D scene using MD1/CC1/CutDirector as appropriate.
5. Pay off: show what changed or what consequence follows; optional supplied narration/caption/SFX cues remain anchored to named events.
6. Resume or close: return to footage only if doing so resolves the explanation; no mandatory footage quota.

**Example fixture:** an illustrative roof repair shot pauses on a visible layer, tracks one callout, cuts to an editable roof cross-section, then reveals a source-supplied cost contribution chart. Fixture values must be labeled synthetic until evidence is supplied; stock clip context must not masquerade as evidence of a particular real repair or price.

Use the purpose categories in `4`: demonstrative, contextual and claim-bearing. The component should not invent facts, search keywords, choose stock, transcribe dialogue, interpret an unknown image, or decide that an unrelated clip is semantically correct.

**K2 gate:** one composed Storybook production has stable `shotId`/`semanticId`, editable local asset slots and serializable existing authoring fragments. Exported frame samples demonstrate a visible cause/effect, readable labels, meaningful handoff and no unintended cropping.

### K3 — Three compositions, not three resizes

For the same narrative purpose, author independent `16:9`, `9:16` and `1:1` placements using existing camera, text and safe-frame constraints. A profile can change shot selection or split-screen structure if needed; it must not pretend a center crop preserves all information.

- Recompute text geometry **after fonts resolve**, with real target dimensions, line wrapping and minimum readable holds.
- Protect required subjects, evidence anchors, citations and narration captions from overlays and simulated platform UI reservations.
- Preserve source data units/scales and chart meaning when switching layouts.
- Check critical frames at entrance, reveal, camera maximum, transition midpoint, caption maximum and scene exit.
- Explicitly fail if the required subject cannot remain visible and text legible in a given profile; require a different arrangement or shot.

**K3 gate:** all three actual rendered profiles pass bounds/identity/caption checks and a human can verify legibility at realistic viewing sizes.

### K4 — Production-bounded export without a new job manager

The repository already has a page-level `VideoExportStage` seek/readiness handshake and a Playwright→FFmpeg exporter. Its PNG-per-frame path is useful for short smoke tests but must be **measured and bounded** before claiming 8+-minute production suitability. At 30 fps, eight minutes means 14,400 frames; keeping every full-resolution PNG until the end is an unacceptable default for a local long-form export.

A proposed evolution of the **existing optional export adapter**, not Kumiki core:

1. Resolve/pin fonts, local media, 3D readiness, output profile and rational FPS. Fail early on missing rights references, dependencies, source frames or codecs.
2. Capture a configurable bounded frame window, optionally by existing start-frame/range support. Never treat a loaded `video` element as proof the exact requested frame was drawn.
3. Stream to an encoder or create small independently verified segments. Keep transitions crossing segment boundaries within an owned render range; do not duplicate, omit or double-fade boundary frames.
4. Validate dimensions, FPS, duration/frame count, color metadata and sample decoded frames with FFprobe or equivalent. Only mark an export artifact complete after its bytes and integrity are verified.
5. Remove temporary frame data after verified promotion while preserving input assets and the previous approved output managed by the caller.
6. Record peak scratch space, peak resident memory, wall time, segment sizes and any visual degradation introduced by intermediate codecs. Make cancellation stop capture/encoding and preserve recoverable status for the calling process.

Kumiki should expose reproducible frame/range rendering and export diagnostics. **The consuming application** still owns durable queues, retries, cache eviction, cross-project artifacts, transactionally replacing the final export and audio mastering. Do not embed a Redis/SQLite scheduler, stock service or universal FFmpeg media factory in the source-distributed registry.

**K4 gate:** 30-second, 3-minute and 8+-minute manual fixtures encode within a declared configurable scratch budget, with no retained whole-film uncompressed frame collection. Cancel/failed segment does not get reported as a completed video.

### K5 — Fingerprint visual dependencies, not application state

The consumer's persistent project may use MoneyPrinterTurbo-like immutable revisions. Kumiki only needs to declare **which visual inputs were used** and why the rendering is valid. A proposed non-secret proof receipt should include:

- Stable `sceneId`/`shotId`/`semanticId`, relevant authored fragment/grammar IDs and versions.
- Exact content hashes of local footage/illustrations/fonts and references to separately reviewed rights (a rights reference is **not** a license grant).
- Rational FPS, aspect/layout version, source-frame mapping version, critical subject/caption geometry constraints.
- Referenced supplied caption/cue/audio timing IDs, but not TTS secrets or raw private narration.
- Renderer/decoder/adapter versions, required capability set and explicit missing capabilities.
- Sampled proof frames or references, artifact hash, structural check findings and a distinct human-review status.

Test two versions: replacing one clip under the same stable shot identity requires its framing/readiness/overlay proof to be rechecked, while an unrelated shot remains logically unchanged. Changing BGM only must not change **visual** dependencies; the consumer is responsible for recomputing its muxed output. An unknown/corrupt dependency requires re-proof instead of pretending the cache hit is safe.

**K5 gate:** a deterministic dependency comparison identifies affected visual proofs correctly without a scene database or job DAG added to Kumiki.

### K6 — Defect-focused verification and visual release standard

Automated checks should be fast and deterministic; final premium acceptance additionally requires watching an actual render with its supplied audio.

| Test tier | Required evidence |
| --- | --- |
| Unit/schema | Identity preservation; rational-frame mapping; unknown adapter/capability rejection; transition boundaries; profile-specific crop and source rights preflight |
| Negative fixtures | Missing asset, stale hash, inaccessible decoder, VFR mapping mismatch, wrong-source-frame readiness, unreadable caption, cropped critical subject, missing semantic target |
| Registry/installability | Source-distributed registry validation, dependency closure and clean consumer smoke; no heavyweight FFmpeg/model dependency for unrelated components |
| Browser/manual export | Actual decoded real footage + SVG + 3D + supplied audio at full output size, random out-of-order seek parity, FFprobe validation and bounded-export measurements |
| Human review | Full-speed playback of opening, focus/annotation, 2D/3D handoff, information payoff, scene boundaries and sound/caption synchronization; record reviewer/date and unresolved defects |

Use the existing project commands after confirming their current script definitions: `npm run registry:validate`, `npm run registry:smoke`, `npm run catalog:check`, targeted Vitest suites, Storybook for visual inspection and `npm run video:export` for the optional local integration proof. Do **not** quietly reintroduce whole-film Playwright screenshots in CI. Capture a small deterministic sample around semantic events and scene boundaries instead.

Suggested diagnostic classes (proposal, not existing enum): `source_missing`, `rights_unresolved`, `decoder_unsupported`, `frame_mismatch`, `subject_cropped`, `caption_occluded`, `dependency_stale`, `export_incomplete`. Every finding should identify shot/profile/frame and an actionable remedy without logging provider credentials or private absolute paths.

**Overall acceptance:** One genuinely explanatory authored hybrid production renders in 16:9, 9:16 and 1:1; a licensed real clip can be swapped and relevant visual proofs recomputed; unrelated shots and BGM-only edits do not force visual redraw; deterministic frame readiness survives direct seeking; an 8+-minute manual export uses bounded scratch space; structural checks and actual human visual/audio review are reported separately. No generic filler, unsupported license, wrong frame or incomplete export is promoted as successful.

## 8. Stop rules, scope exclusions and next action

Stop and revisit the design if a new component duplicates `FrameAccurateClip`/`CutDirector`/`VideoExportStage`, invents a second timeline or canonical scene schema, hides a media codec downgrade, downloads an LLM by default, or moves consumer-owned project persistence into the registry. If a capability truly cannot be expressed, document the precise missing catalog API, a failing concrete fixture and why a small adapter cannot solve it before adding a public type.

**Do not import** MoneyPrinterTurbo's provider roster, stock downloader, prompt-to-footage routing, Python jobs, caption transcription, voice generation, WebUI, publishing integrations, persistent artifact store or bundled default music. Do not copy its source into Kumiki. Its revision-aware local renderer does not justify a generalized nonlinear-editor export format without an actual interoperability requirement.

**Next action:** Run **K0** against the current catalog and existing hybrid fixture, then implement **K1 and K2** as a single composed reference production. Use [18 — Film Style Grammar](18-film-style-grammar-and-direction.md) for art direction/proof conventions. Proceed to the optional adapter and long-form exporter changes only when the concrete tests show the exact seam; report code verification and human review independently.
