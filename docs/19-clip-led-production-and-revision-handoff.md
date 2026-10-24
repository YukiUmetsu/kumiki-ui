# 19 — Clip-Led Production & Revision-Aware Handoff

**Status:** Engineering plan and verification criteria; **not a shipped prepared-shot API or proof of production readiness**. Updated 2026-10-24.  
**Scope:** Local media handoff, reliable composition/export and visual dependency receipts. [18 — Film Style Grammar](18-film-style-grammar-and-direction.md) covers film-wide direction; [11 — Rendering Quality](11-rendering-quality.md) owns canonical scene/timebase/export contracts.

## 1. What exists, what remains unverified

Kumiki **already renders and edits footage**; do not build another clip engine, editor, frame clock or canonical scene format.

| Existing implementation | Proven or remaining gap |
| --- | --- |
| [FrameAccurateClip](component-specs/frame-accurate-clip.md): frame mapping, trim, rate/reverse, freeze/remap, focus/reframe; video, image-sequence and procedural adapters | Deterministic decoded **synthetic VP9** tested; production H.264/HEVC, real VFR, rotation and wider platform matrix **not yet qualified** |
| [CutDirector](component-specs/cut-director.md), [FreezeFrameFocus](component-specs/freeze-frame-focus.md), [EvidenceStage](component-specs/evidence-stage.md), SemanticCalloutLayer, MD1/CC1 | Build one consumer-editable, truthful footage → annotated subject → explanatory 2D/3D handoff |
| [CaptionPerformer](component-specs/caption-performer.md), [AudioVisualCue](component-specs/audio-visual-cue.md), [ShortSafeFrame](component-specs/short-safe-frame.md) | Qualify supplied caption/audio cues over *moving footage* in separate 16:9, 9:16 and 1:1 layouts |
| `VideoExportStage`, [`scripts/export-video.mjs`](../scripts/export-video.mjs) | A 13-second hybrid MP4 exported; current optional exporter stages **one PNG per frame until encoding**—not yet bounded/qualified for long-form |
| [13-second hybrid verification](verification/2026-10-22-phase2-hybrid-short.md) | 390 frames of generated VP9 conveyor footage + SVG + 3D + supplied audio were encoded and seek-checked; **not** real camera/stock footage or full-speed human sign-off |
| MG1/MD1/VT1/CC1 and [11](11-rendering-quality.md) | Existing serialization and one canonical rational FPS; only minimal external references and proof metadata may be needed |

**Actual gaps:** production-source decoder qualification, reusable explanatory compositions, independently authored formats, bounded export, dependency receipts and human visual review—not elementary playback. Always inspect the catalog before exposing a new API: `npm run catalog:find -- --query="..." --format=json` and `npm run catalog:api -- --id=ID --format=json`.

### Ownership boundary

- **Consuming studio (ContentGen, etc.):** searches/selects/downloads footage; checks licensing, creator/attribution and truthfulness; owns local media/transcoding, story, script, evidence, TTS/audio, durable jobs/retries/cache, approvals, final artifact promotion and publishing.
- **Kumiki:** consumes *prepared, authorized local references* with visual intent, performs frame-accurate composition/cues/caption safety, and exposes deterministic readiness, diagnostics and visual proof.
- **Optional exporter:** captures/encodes frames and validates output. It may use FFmpeg; no stock API/provider credentials or database in the registry.

A provider name, URL or `licenseRef` alone is **not** proof of reuse or redistribution rights. Commercial video use may differ from bundling media inside Kumiki. Follow [ASSET_SOURCING](ASSET_SOURCING.md) and [13 — Integrations](13-content-creation-integrations.md).

## 2. Minimal prepared-shot handoff (consumer-side proposal)

Do **not** introduce a parallel `Composition` schema. A consumer may store a small sidecar that references existing serialized Kumiki fragments:

| Required group | Content / invariant |
| --- | --- |
| Identity & purpose | Stable `sceneId`/`shotId`/`semanticId`, project revision, `establish`/`demonstrate`/`compare`/`inspect-evidence`/`payoff`; replacing/reordering a clip must not rename unrelated shots |
| Source & rights | Local asset ref, checked SHA-256, width/height, rational FPS or presentation timestamps, codec/orientation, creator/source/rights record; missing/unauthorized source fails before render |
| Direction | Trim/remap/freeze, authored subject box/focal point, protected regions, referenced native composition/recipe IDs, cause → action → payoff |
| Timing | Supplied caption/word alignment, named visual/audio cue IDs, transition intent; use Kumiki's one rational-frame clock |
| Profiles | Independently authored 16:9, 9:16 and 1:1 framing/layout; no center crop that hides critical content |
| Proof/revisions | Referenced authored fragment/grammar versions, fonts/decoder/capabilities, input hashes and diagnostics, output artifact hash, distinct structural and human-review states |

This is **metadata guidance, not a published type, working API, NLE exchange format or new timeline**. Resolve exact registry IDs/props before implementation. Never run arbitrary instructions or download URLs supplied by an untrusted shot file.

Footage roles must remain truthful:

- **Demonstrative:** visibly shows the mechanism/process, with subject-aware focus and annotations.
- **Contextual:** illustrative B-roll, not evidence of a particular asserted event.
- **Claim-bearing:** factual data, documents and event footage require verified source/claim links; keyword-matched stock is insufficient.

If suitable footage is absent, prefer a true diagram, chart, inspectable 3D object or deliberately static explanation. Never fill a gap with unrelated clips, meaningless arrows or fabricated visuals.

## 3. K0–K6 implementation and exit gates

### K0 — Audit actual capabilities and baseline

- Inspect installed catalog/registry, specs and public props for `FrameAccurateClip`, `CutDirector`, `FreezeFrameFocus`, `EvidenceStage`, `CaptionPerformer`, `AudioVisualCue`, `ShortSafeFrame`, `VideoExportStage` and existing adapters.
- Re-run the [hybrid fixture](verification/2026-10-22-phase2-hybrid-short.md); record commit, browser/codec, FFmpeg, FPS, seek parity, runtime, peak disk/RAM and output hash. Prior report results are **not** a new run.
- Use only a few rights-cleared, redistributable test fixtures. Add APIs only after an actual fixture demonstrates an unexpressible need.

**Gate:** reproducible current sample; implemented/unverified/unsupported matrix; no duplicate clock/clip/scene abstraction.

### K1 — Real-world footage compatibility and verification

This is **hardening existing footage decoding**, not creating footage support or a downloader. Exercise the pluggable adapter and `requireExact` readiness with:

| Source case | Required result |
| --- | --- |
| H.264 constant-FPS MP4 | Out-of-order seeks across cuts/freezes map to correct source frame; actual browser support reported |
| HEVC/H.265 | Capability check and explicit unsupported-codec diagnostics where decoding is unavailable |
| Real variable-FPS footage | Source PTS/timestamps → rational output frames with documented sample/drop/duplicate policy and no accumulating drift |
| Rotation and non-square pixels | Correct displayed orientation, dimensions, crop and focal mapping in preview and export |
| Landscape↔portrait framing | Authored `cover`/`contain`, protected subject and labels, no silent critical crop |
| Reverse, freeze, speed ramp, replacement | Never report old/incorrect frame as `ready`; deterministic repeated seeks |
| Corrupt/missing media | Stable shot/profile error; no unapproved substitute |

Consumer-side FFmpeg transcode to a compatible local intermediate is acceptable; it stays outside Kumiki registry. Preserve source identity, source→output mapping and color/rotation assumptions in the receipt.

**Gate:** at least one **real-source** fixture passes shuffled seeks and decoded export, or unsupported platforms fail clearly and deterministically. Do not claim universal codec support.

### K2 — Meaningful clip-to-explanation composition

Create **one** editable Storybook reference, not a `HybridScene` mega-component:

1. Establish an authorized clip with identified critical subject.
2. Freeze at an exact frame; focus an authored subject box.
3. Add source-grounded callouts/evidence and a readable hold.
4. Hand that same semantic subject to an existing editable 2D/3D mechanism, chart or diagram via CutDirector/MD1/CC1.
5. Show the consequence/payoff; resume footage only if useful.

An illustrative roof-process clip → annotated part → 3D section → sourced cost chart is a suitable fixture. Mark invented demo values illustrative. No component should invent claims, choose stock keywords or interpret unknown footage semantically.

**Gate:** stable IDs and editable prepared asset refs; actual exported first/change/payoff frames show a real explanation with no clipping, false evidence or generic filler.

### K3 — Three authored output formats

Create independent `16:9`, `9:16` and `1:1` shot arrangements with existing camera/safe-frame/caption APIs. Reflow text *after fonts load*, reserve platform UI/captions, preserve critical subjects and chart scales. Inspect entrance, peak camera travel, reveal, transition midpoint, maximal caption and exit; reject impossible framing.

**Gate:** real full-resolution renders of all three profiles; measured bounds, legibility and subject/caption safety; no blind-resize pass.

### K4 — Bounded long-form export

Keep `VideoExportStage`'s seek/readiness protocol. The current `scripts/export-video.mjs` captures all PNG frames before invoking FFmpeg: at 30 fps, 8 minutes is **14,400 PNG files**. Improve only the **optional exporter adapter** if measured need confirms this bottleneck.

- Stream frames to encoder or use bounded/verified segments; handle transition boundaries without missing/duplicated frames.
- Fail early on missing assets, fonts, codecs, non-ready footage or invalid rights references.
- Verify output width, FPS, duration/frame count, sampled decoded frames and hash; mark success only after verification.
- Clean *only owned temporary frames* after verified completion. On cancellation/failure, keep the caller's last approved output untouched.
- Record peak resident memory, scratch bytes, wall time, segment sizes and intermediate-format quality.

**Gate:** manual 30-second, 3-minute and 8+-minute exports within a declared scratch/RAM budget, valid FFprobe metadata, no whole-film PNG retention or falsely completed interrupted export. Application queues, retries, audio mastering and final promotion remain caller-owned.

### K5 — Visual dependency receipt, not a revision database

Return/check a small non-secret receipt containing: stable scene/shot/subject IDs; authoring/style/recipe revisions; input/font/asset hashes and rights refs; rational FPS and profile; source-frame and caption/cue mappings; renderer/decoder versions/capabilities; proof-frame/output hashes; structural results and separately recorded human-review state.

| Change | Expected visual invalidation |
| --- | --- |
| Replace footage/focal point | That shot's frame/crop/callout proof and dependent transitions |
| Change caption/voice timing | Linked captions, cues, readable holds and affected proof |
| Change shot order/style/layout | Affected visual fragments, boundaries, profiles |
| Change only background music | **No visual proof invalidation**; consumer re-mixes/re-encodes |
| Unknown/stale/corrupt dependency | Explicit re-proof; never accept a path as a valid cache hit |

**Gate:** two-version demo yields correct affected/unaffected visual dependencies without adding a persistent job DAG, database or cache manager to Kumiki.

### K6 — Technical and human acceptance

- **Automated:** frame mapping/seek parity; identity; cue boundaries; crop/text collisions; missing source/rights; stale hashes; unsupported decoders; transition continuity; no unverified frame passing `requireExact`.
- **Registry:** use actual package scripts (confirm before running) such as `npm run registry:validate`, `npm run registry:smoke`, `npm run catalog:check` and targeted Vitest suites.
- **Manual export:** real footage + meaningful 2D/3D + supplied captions/audio, full-resolution three-profile frames, FFprobe checks and long-form resource measurements.
- **Human:** watch/listen at normal speed; record reviewer/date, shot/profile, defects and `accepted`/`needs-revision`/`not-reviewed`. Screenshots and green tests **do not** certify cinematic quality.

Do not add heavy whole-film Playwright screenshots or LLM vision review to CI. Sample semantic boundaries deterministically.

**Overall gate:** one genuinely explanatory, editable hybrid video; real-source decode qualified or clearly rejected; three legible aspect treatments; scoped re-proof after clip swap but not BGM-only change; verified bounded long-form export; separate automated and human sign-off.

## 4. Stop rules and next action

- Do **not** add stock search/downloading, model prompts, TTS/transcription, DB/jobs, publishing, a second scene schema/clock, universal media transcoder, mandatory browser/FFmpeg dependency or third-party media bundled without redistribution rights.
- Stop if a design needs several new primitives where existing clip/cut/caption/semantic APIs would suffice. Document the exact missing installed capability and failing fixture first.
- **Next:** K0 on today's catalog; K1 real-source verification and K2 meaningful clip-led composition together; then K3–K6 only at proven integration/performance seams. Separate prior test evidence from newly executed tests.

**Research provenance:** [MoneyPrinterTurbo README](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/README-en.md) and [editable local projects](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/docs/video-projects.md) informed the handoff/dependency ideas. Its opt-in local revision renderer is **not** a generic NLE and does not provide word-aligned subtitles/overlays/transitions; its providers, generator, Python jobs and assets are not Kumiki dependencies.
