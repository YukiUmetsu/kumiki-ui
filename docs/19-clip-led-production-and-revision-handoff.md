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

## 7. Delivery sequence and stop rules

| Slice | Smallest implementable change | Exit gate |
| --- | --- | --- |
| **0 — Catalog/API inventory** | Audit current public `FrameAccurateClip`, CutDirector, safe-frame, caption, cue, serialization and export interfaces | Evidence table of what already works and the *specific* remaining integration seams; zero new code |
| **1 — One consumer-facing reference recipe** | A clip + semantic overlay + caption + cut composition, with externally selected asset and stable IDs | Actual 9:16/16:9/1:1 frames, seek parity, source and rights diagnostics; no provider code |
| **2 — Optional prepared-shot adapter** | Only if Slice 1 reveals a real duplication seam, an adapter between consumer shot sidecar and existing declared components | Versioned small contract, round-trip fixture, unknown-field/capability rejection; **no second scene schema** |
| **3 — Proof/dependency receipt** | Non-secret, fingerprintable dependencies and visual QA record consumable by a job orchestrator | One-media and BGM-only edits cause the expected differential re-proof, with proof of invalidation |
| **4 — Producer integration example** | Example in a consuming app using immutable assets, external audio and retryable render jobs | Cancel/retry/resume demonstration and preservation of last good output; this **does not run in Kumiki core** |

**Do not import** MoneyPrinterTurbo's provider roster, stock downloader, prompt-to-footage routing, Python job orchestration, caption transcription, voice generation, UI, publishing integrations, FFmpeg storage code or default music. Their dependencies, costs, copyright and security choices are consumer concerns. Do not copy upstream source into the registry; this document extracts *engineering patterns*, not code. Its opt-in local renderer does not provide a reason to add an NLE exporter until a caller demonstrates a real round-trip requirement.

**Next action:** Run Slice 0 against the exact installed catalog, then implement Pilot A as a **composed reference production**. Only design a new public adapter if source-confirmed contracts cannot express the necessary handoff. Coordinate its style and proof records with [18](18-film-style-grammar-and-direction.md) rather than creating parallel directing rules.
