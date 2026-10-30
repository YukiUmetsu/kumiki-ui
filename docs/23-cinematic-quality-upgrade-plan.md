# 23 — Cinematic Quality Upgrade: Implementation Plan

> **Status:** Living implementation plan; not a claim of completed work.  
> **Baseline reviewed:** 2026-10-30, `main` plus draft [PR #45](https://github.com/YukiUmetsu/kumiki-ui/pull/45) (`feat/scene-recipes-catalog-and-follow-subject`).  
> **Scope:** Kumiki-UI's reusable video scene templates, art direction, animation authoring, optional 3D/AI asset preparation, sound, deterministic export and audiovisual QA.  
> **Primary owner:** Future coding agents implementing this plan in coherent increments.  
> **Rule:** Reinspect the repository and current PR state before relying on the baseline below.

## 0. How future agents should use this plan

1. Read `AGENTS.md` (if present), this file, and the existing authoritative contracts below **before** coding. Inspect current source, branches, PRs, package versions and actual available tools.
2. Select the smallest unfinished **milestone** that yields a verifiable end-to-end improvement. Check for existing equivalents before adding a module or recipe.
3. Record the task ID, source commit, plan decision, changed files, test/render commands, output artifact paths, and observed results in the [execution log](#14-execution-log-and-handoff-template). Do not mark a task done based on code inspection alone.
4. Implement, render an actual short video when the task changes visual/audio output, review it at normal speed, fix specific defects, rerender, and preserve evidence. A passing typecheck or `ffprobe` is **not** artistic signoff.
5. Keep this document a **plan**: update statuses and evidence links as work lands; keep detailed design docs in their existing authoritative locations. Do not create a competing timeline, scene schema, renderer or approval workflow.
6. For unavailable local services (Blender, ComfyUI), implement portable contracts and fixtures, then mark live-integration QA **blocked** until actually tested on the user's Mac. Never claim a simulated backend is a real generation.
7. Reuse the current appropriate branch/PR after verifying it; do not merge or mark a draft ready without the owner's instruction. Preserve unrelated work.

### Required companion documents

| Document | Owns |
| --- | --- |
| [`08-motion-graphics.md`](08-motion-graphics.md) | MG1 frame-keyed motion semantics and recipes |
| [`11-rendering-quality.md`](11-rendering-quality.md) | Canonical document/frame domain, adapters, export and QA |
| [`component-specs/motion-director.md`](component-specs/motion-director.md) | MD1 choreography compiled to MG1 |
| [`component-specs/cinematic-camera-director.md`](component-specs/cinematic-camera-director.md) | CC1 camera authoring and baked frame channels |
| [`component-specs/scene-templates.md`](component-specs/scene-templates.md) | ST1 and optional renderer slots |
| [`21-video-scene-templates.md`](21-video-scene-templates.md) | Existing 26 recipe intents and inventory (PR #45) |
| [`22-premium-scene-animation-review.md`](22-premium-scene-animation-review.md) | Source findings, unfinished physical/visual gates (PR #45) |
| [`10-character-audio.md`](10-character-audio.md) | Character performance and audio contract |
| [`13-content-creation-integrations.md`](13-content-creation-integrations.md) | Central dependency/licensing decision register |
| [`14-3d-visual-fidelity.md`](14-3d-visual-fidelity.md) | 3D hero/supporting-asset quality tiers |
| [`visual-production-contract.md`](visual-production-contract.md) | Objective visual-production constraints |
| [`ASSET_SOURCING.md`](ASSET_SOURCING.md) | Actual rights, provenance and asset policy |

If documents disagree, reconcile with verified implementation and update the **owning** contract; this file is not an excuse to fork specifications.

## 1. Goal, non-goals and definition of success

**Goal:** Create editable, reusable and customizable cinematic scene templates whose **real exported footage** is materially better than today's schematic, flat or generic demonstration clips. Support educational explainers, historical documentaries, product reveals, exploration, physical transformations, and character-led storytelling.

**The target result:** A user selects a scene recipe, supplies content/assets, optionally generates missing artwork/3D, edits camera and motion, previews with real audio, and exports an accurately synchronized, visually reviewed MP4. This can be orchestrated by ContentGen later without requiring a second scene system.

**Non-goals:**

- Rebuild After Effects, Blender, ComfyUI, Remotion or a full DAW inside Kumiki-UI.
- Replace MG1/MD1/CC1/VT1/ST1 with a new incompatible format.
- Force Remotion, Blender, AI models, FFmpeg, or a GPU on ordinary registry/UI consumers.
- Guarantee photorealism from primitives or invent accurate landmarks/physical objects.
- Treat arbitrary AI-video generation as deterministic geometry or reliable character animation.
- Introduce user-facing approvals for every internal preparation/render step.
- Claim every one of the 26 templates is equally cinematic simply because it can render.

**Success requires all of:**

1. Existing source-distributed registry consumers still install and compile cleanly.
2. A selected ST1/MD1 composition has one canonical saved scene/timeline representation and pure integer-frame sampling.
3. Remotion preview/export and Theatre-authored motion reproduce the same requested state in random seek and repeated-render tests.
4. Blender and ComfyUI assets, when available, are pinned, reproducible **where the generator allows**, recoverable, licensed and bound to real recipes.
5. Narration, dialogue, SFX, ambience and music remain separate editable tracks with event-aligned audible transients.
6. At least one **complete** hero template passes genuine scene → assets → authoring → audio → MP4 → human audiovisual review before the system is replicated broadly.
7. High-risk templates (book, cave, globe, follow-subject, historical documentary, product reveal) each have their own visual/physical acceptance evidence and limitations.

## 2. Verified baseline and gaps to recheck

| Capability | Observed baseline on 2026-10-30 | Next gate |
| --- | --- | --- |
| Core motion | MG1 typed keyframes, MD1 choreography and CC1 baked cameras documented; host owns frame evaluation | Adapt; **do not replace** |
| Scene templates | Draft PR #45 defines 26 semantic recipes, typed ST1 foundation and optional renderer slots | Confirm PR head, clean builds, live Storybook and real footage review |
| Advanced 3D | PR #45 describes opt-in Three.js cutaway, glass and bending-page examples; globe geography/projection is more mature than visuals | Verify GPU captures and upgrade actual art/physical behavior; no inferred photorealism |
| Export | Existing `scripts/export-video.mjs`, `video:export` and video fixture commands; browser/FFmpeg path | Reuse for baseline; compare with optional Remotion adapter rather than assuming replacement |
| Audio | MD1 cues and character/audio contracts exist; full mixed production unverified | Editable cue-to-sample mapping, stems, mix, audible sync, final-file QA |
| Assets | Registry/source-sourcing conventions and host-provided advanced assets | Generator adapters, provenance, content hashes, caching and reproducible bindings |
| Artistic QA | `docs/24-premium-scene-animation.md` and PR #45 state real full-speed visual/audio signoff missing | Actual MP4s, contact sheets, listening and timestamped human notes |

**Baseline is provisional.** Future agents must update this table against current commits before modifying code. Neither a GitHub PR description nor existing documentation proves the latest render passed.

## 3. System architecture: single canonical timebase

```text
Kumiki semantic scene / ST1 + motion data (MG1/MD1/CC1/VT1)
          |
          +-- Optional Theatre Studio authoring -- validated project state
          |                                  |
          |                                  +-- bake/convert to MG1 where lossless
          |                                  +-- otherwise explicit frame-evaluation adapter
          |
          +-- Frame-addressable scene evaluator (one rational FPS domain)
          |        |
          |        +-- DOM/SVG/Canvas and optional Three.js/R3F renderers
          |        +-- Remotion composition/export adapter
          |        +-- host Storybook / ContentGen preview adapter
          |
          +-- Versioned asset registry
          |        +-- approved/source assets
          |        +-- Blender generated models, layers, footage
          |        +-- ComfyUI generated images, textures, optional footage
          |
          +-- Timecoded sound events and stems
                   |
                   +-- final video compositor and A/V QA evidence
```

### Non-negotiable invariants

- **One data model:** The existing Kumiki composition/recipe/MD1 objects remain the source of truth. No second private representation of the same film is allowed to diverge.
- **One clock:** Existing rational `{ num, den }` FPS, integer frame indices and end-exclusive ranges are authoritative. In Remotion, map `useCurrentFrame()` into that domain. For Theatre, derive sequence position from `frame * fps.den / fps.num`; do not start an independent wall-clock loop.
- **Random seek parity:** Frames requested in order `[80, 4, 80, 160, 4]` match standalone renders of each corresponding frame. Includes camera, particles, shaders, text, lighting, visibility and rig poses.
- **Immutable inputs:** Asset hashes, character rig revision, model/workflow version, seed, stage resolution and relevant renderer settings are pinned to a render revision. Full-file cache keys must include all effective inputs.
- **No silent loss of fidelity:** Missing rig, media, fonts, textures, shader support or scene material should produce a capability diagnostic. Fallback must be explicit and visually labeled in developer QA, not quietly passed off as full 3D.
- **Optional dependencies:** Registry items only install the modules they use. Keep editor/generator/server dependencies outside lightweight core items.
- **One final export path per output:** A Blender shot can be a pinned rendered layer inside the canonical composition; it must not become a disconnected film with mismatched timing.
- **Production assets ≠ source code:** Treat source license, model license, weight license, pretrained workflow, third-party textures and generated media provenance separately.

### Proposed technical interfaces (illustrative; adapt to existing contracts)

```ts
interface OptionalRenderAdapter {
  id: string;
  supportedCapabilities: string[];
  preflight(scene: unknown, assets: unknown): Promise<CapabilityDiagnostic[]>;
  renderFrame(frame: number, context: unknown): Promise<FrameEvidence>;
}

interface GenerationRequest {
  requestId: string;
  generator: 'blender' | 'comfyui';
  recipeId: string;
  inputs: Record<string, unknown>; // validated and non-executable at render time
  seed?: number;
  outputSpec: { kind: 'glb' | 'image' | 'image-sequence' | 'video'; width?: number; height?: number; fps?: { num: number; den: number } };
}

interface AudioEvent {
  id: string;
  shotId: string;
  role: 'voice' | 'foley' | 'designed-sfx' | 'ambience' | 'music';
  anchorFrame: number;
  sourceAssetId: string;
  audibleAttackOffsetSamples?: number;
  gainDb?: number;
  speakerId?: string;
}
```

These are intent sketches, **not new committed schemas**. Put finalized types next to their existing canonical owner and add migrations/round-trip validators.

## 4. Ordered implementation milestones

**Do not install every dependency first.** Land a demonstrable vertical slice, then scale. Every milestone has an evidence gate and a handoff note for the next agent.

| ID | Milestone and concrete scope | Prerequisites | Completion evidence |
| --- | --- | --- | --- |
| **M0** | Audit main/PR #45; existing 26 recipes, MG1/MD1/CC1, export and A/V paths; compare existing vs desired | None | File/path inventory, actual commit, baseline commands/results, risk list |
| **M1** | Canonical frame adapter + integration tests. Define time mapping, property ownership, renderer fences, errors | M0 | Random/reverse/duplicate seek tests; serialized parity tests; no core dependency creep |
| **M2** | Remotion optional composition/export adapter; React/Three layer, footage/asset loading, aspect ratio, audio track inclusion | M1 | One existing semantic recipe rendered in Storybook **and** Remotion MP4; representative frame comparison |
| **M3** | Theatre.js optional authoring adapter: camera/object/material channels, editor save/export, round-trip, deterministic playback | M1–M2 | Keyframed 3D shot replayed in random order and MP4 without drift; Studio excluded from runtime consumer output |
| **M4** | Audio direction and mix: stems/buses, visual-event cue anchors, speech/character linkage, ducking, fades, loudness/peaks | M2 | Same shot with VO/music/foley/ambience in actual MP4; source-timestamp vs perceptual-hit evidence |
| **M5** | Versioned asset registry + Blender CLI adapter and reproducible 3D/footage example | M0, M2 | Actual GLB/frame sequence created on Mac and imported; provenance, logs, timeouts, cache, failure test |
| **M6** | ComfyUI HTTP/WebSocket adapter, pinned workflow JSON, queue/progress, outputs and hardware guardrails | M5 registry | Local workflow completed on Mac or explicitly blocked; generated image bound to scene, not just sample API response |
| **M7** | One fully integrated premium showcase (prefer book or cave) from asset creation to verified A/V MP4 | M2–M6 relevant pieces | 8–15 s 1080p30 MP4; visual-motion and sound review; timestamped issues and corrected revision |
| **M8** | Physical/visual upgrade of high-priority scenes; incrementally fill recipe gaps; browser/editor polish | M7 | Individual evidence cards + real 16:9 and 9:16 samples for each upgraded recipe |
| **M9** | End-to-end regression, ContentGen adapter proof, docs, clean-consumer test, performance and publishing handoff | M7–M8 | Clean install, tests, final quality reel, provenance, known limitations, PR summary |

M2–M6 may be developed in parallel by separate agents **only if** ownership of schema, package lockfile, and shared files is coordinated. Merge vertical slices sequentially against the common integration contract.

### M0 audit checklist

- [ ] Confirm PR #45 and branch state, changed files, failures and newer work.
- [ ] Inventory actual `registry/` source and `src/**` showcase alias paths; avoid editing alias instead of owner.
- [ ] Run or record pre-existing commands: `npm run typecheck`, `npm test`, `npm run registry:validate`, `npm run registry:fixture`, `npm run build-storybook`, relevant video and browser scripts.
- [ ] Inspect existing `scripts/export-video.mjs` FFmpeg usage and 3D GPU seek protocol before adding Remotion.
- [ ] Enumerate render capabilities of each existing scene (native 2D, 2.5D, actual 3D, prerecorded footage, external asset requirement).
- [ ] Verify React/Three/R3F/Remotion/Theatre peer dependency and bundler compatibility before selecting pinned versions. Existing baseline used React 18 and Three 0.186.x; **recheck**.
- [ ] Record realistic 3D/AI workflow time and memory budgets on the user's Apple M4, 24 GB unified-memory Mac.

### M1–M3 detailed integration decisions

1. **Authoring vs playback:** Prefer Theatre Studio only for edit/dev use. Where curves and targets map faithfully, compile its serialized state to existing MG1 tracks. Where conversion loses behavior, use a documented frame-addressed Theatre evaluator with explicit property ownership and proof that WebGL finished drawing before frame capture.
2. **No independent time engines:** Disable/pause Theatre's own playback when Remotion or MG1 host requests a particular frame. No `Date.now()`, unseeded random numbers, hidden `requestAnimationFrame` mutations or nondeterministic shader time.
3. **R3F:** Use optional `@react-three/fiber`, `@react-three/drei` and `@remotion/three` where needed; remember Remotion's ThreeCanvas requires frame-derived declarative animation. Preserve current direct Three.js host slots if R3F would increase complexity or break source-distribution.
4. **GPU frame fences:** Capture only after requested frame, textures, fonts, media and WebGL draw have settled. Test both Playwright capture and real export; a changing DOM attribute is not proof canvas pixels changed.
5. **Output parity:** Compare a defined selection of saved scene frames (start, buildup, action, hold, ending) between Storybook and exported video at the same aspect, resolution, fonts and assets. Account explicitly for unavoidable codec/antialias differences; do not demand exact pixel identity across different renderers.
6. **Two-path risk gate:** Run a small A/B export against the existing FFmpeg pipeline. Adopt Remotion for composition/3D only where it solves meaningful limitations. Existing exports must remain working until parity is demonstrated.

## 5. Asset generation: Blender, ComfyUI and source media

### Shared generation policies

- Discover and configure **local** capabilities; never hardcode the user's Mac home directory or assume tools are present in a remote Codex container.
- Structured inputs only; sanitize paths and arguments, limit process concurrency, capture logs, support cancellation, and never execute arbitrary prompt text as shell/Python code.
- Create previews first. Cache by validated input hash, generator/workflow version, model hash, seed, settings, output profile and asset dependencies.
- Persist raw generated assets and sidecars (`.blend`, `.glb`, source images, workflow JSON, seed, metadata) outside Git when large; repository stores lightweight recipes, manifests and fixture assets. Document where large artifacts live and how to reproduce them.
- Keep item-specific license, original source URL, author, attribution restrictions, model/weight rights and commercial-use status. **Free download is not automatic commercial clearance.**
- No silent quality degradation when an expected 3D or accurate landmark is missing. Provide a diagnostic and opt-in fallback/different art direction.

### Blender adapter — BA1

Use Blender headless Python/background runs through a configurable executable path. Detect version/engines before selecting flags. Generate objects with correct units, pivots, named subassemblies, UVs, texture bindings, camera/light metadata and deterministic seeds.

**Initial reusable scripts:** physically modeled book with hinged cover and deforming pages; irregular cave volume with constrained camera path; product studio lighting rig; optional landmarks/terrain only from accurate source geometry. Export GLB/glTF for realtime rendering or color-managed image sequences/alpha layers for difficult offline effects. Validate imports and output frames, not just subprocess exit code.

Guardrails: on the user's M4/24 GB, bound texture sizes, samples, subdivisions and parallel jobs; use low-cost Eevee/material preview before Cycles. Preserve source `.blend` and generated metadata. Do not infer that Blender scene rendering and Three.js use identical colors or alpha conventions.

### ComfyUI adapter — CA1

Use the documented local `/prompt`, `/ws`, `/history/{prompt_id}` and capability endpoints. Detect actual installed checkpoints, models and custom nodes. Pin workflow JSON, model IDs, generation seed, input references, resolution and output files. Track queue, progress, failures, cancellation, timeout and retrieval.

**Initial uses:** background plates, texture/roughness concepts, atmosphere, editorial illustration layers, 2.5D source art; only use AI video workflows when installed and realistically runnable. **Do not assume any video model is installed.** Never download large weights or alter system-wide models without owner approval. Keep one memory-heavy generator running at a time; try smaller tested workflows first.

AI-derived footage must be visually checked for identity drift, impossible topology, flicker and inaccurate historical/geographic facts. Prefer deterministic 3D for recognizable objects and physically controlled motion.

### Asset-routing matrix

| Visual requirement | Preferred generation/source path | Fallback boundary |
| --- | --- | --- |
| Text, charts, symbols, interfaces | Existing MG1/SVG/DOM; procedural vector | Avoid AI images of precise text/data |
| Reusable deforming physical object | Three.js/R3F geometry or Blender model | Image plate only if physically plausible in required shot |
| High-detail cave/landscape | Blender geometry + licensed PBR/HDRI + optional Comfy atmosphere | Flat background zoom is **not** cave travel |
| Recognizable named landmark | Accurate licensed geometry/footage with sourced geography | Generic blocks are not photorealistic landmarks |
| Documentary | Rights-cleared source photos/footage, limited parallax, consistent grade | Do not invent off-camera depth from one photo |
| Stylized environment | Procedural geometry plus original AI illustration/texture | Pin prompt/workflow/model; check temporal stability |
| Custom character | Selected saved rig and synced real dialogue | Never silently replace with built-in Pip/Quill or one static sprite |

## 6. Audio direction and synchronization — AD1

Use the actual shot/voice timing from the canonical composition. A sound cue is a **meaningful visual event**, not an arbitrary SFX triggered on every movement.

**Editable stem roles:** `voice/dialogue`, `foley`, `designed-effects`, `ambience`, `music`. Keep source provenance, bus gain, pan, filters, fades, ducking and cue positions editable. Preview and final mix must use the same committed cue definitions.

**Cue timing:** Store the visual anchor as an integer frame, keep sample/timestamp precision for audio, and distinguish source-file start from the **audible transient** to align. For rational fps, time = `frame * fps.den / fps.num`; compute sample offsets once (e.g. at 48 kHz), not via accumulating float durations. Test trims, loops, slow motion, J/L-cuts and 29.97/30/60fps drift.

**Speech:** Handle multiple speakers plus narration in one scene, true clip durations, word/phoneme timing when available, exact rig/voice revisions and speaker-specific visemes. Amplitude-only mouth opening is a documented fallback, never called full lip-sync.

**Mixing:** Prioritize intelligible VO; automate music/ambience ducking and SFX under important words. Match material/scale and room response: page rustle for paper, layered low mechanical resonance for heavy objects, cave reverb/air for depth, grounded footsteps for actual contact. Preserve intentional silence. Measure loudness and true peak for the output destination; do **not** hardcode a claimed universal YouTube LUFS requirement.

**QA:** Listen with and without picture at normal speed; test headphone, speaker and mono translation; inspect seams, silence, clipping, onset, tails, voice masking, actual export codec delay. Link audio evidence to the shot's revision and rendered MP4.

## 7. Premium scene priorities and acceptance contracts

The existing 26 recipes are **semantic intents**, not 26 new engines. Before implementing one of the suggestions below, map it to an existing recipe or justify a genuinely distinct intent. Preserve recipe-specific customization and source-distributed installation.

| Priority | Existing/target recipe | Required physical or cinematic behavior | Reject as insufficient |
| --- | --- | --- | --- |
| **P0** | `page-turn-story` / epic book | Curved deforming multiple page surfaces, thickness/binding, self-occlusion/contact shadows, page-specific texture, art-directed camera, synced paper/cover foley | Rigid rectangle/flat cards rotating; generic whoosh |
| **P0** | `environment-reveal` / cave descent | Irregular near/mid/far **3D** volume, camera translation through space, passing foreground occlusion, physically motivated light/fog, evolving acoustics | Concentric dark rings or one enlarged backdrop |
| **P0** | `orbit-world` / walking Earth | Rotating credibly textured sphere, correct geospatial coordinates, identifiable sourced landmarks, gait matched to ground travel/foot contact, camera and atmosphere continuity | Stationary sphere, decorative landmarks or idle foot skating |
| **P0** | `follow-subject-through-sections` | Stable subject identity, cinematic track/camera, believable parallax, background scene handoffs that preserve visual continuity, environmental audio transitions | Changing flat backdrops while camera/subject have no spatial relation |
| **P0** | Historical documentary / `timeline-journey`, `evidence-reveal` | Licensed archival imagery, source/context clarity, controlled multilayer parallax, period-sensitive grade/type, restrained camera and voice-first sound | Repeated template cards or aggressive ungrounded parallax |
| **P0** | Product/physical object reveal (reuse `hidden-detail`/`layered-cutaway` where suitable) | Credible hero geometry, PBR macro surfaces, functional detail, motivated key/fill/rim, close-up camera, readable hero hold | Boxes representing a product, gratuitous glow/particle explosion |
| **P1** | `glass-data-reveal` | Coherent transmission/refraction and environment interaction where 3D required; legible overlay and no lighting/alpha halos | Frosted CSS rectangle marketed as physical glass |
| **P1** | `layered-cutaway` | Spatially registered solid layers, true depth and known interior geometry where factual; camera/perspective and callout anchoring | Exploded 2D stack marketed as accurate 3D anatomy |
| **P1** | `character-discovery` / conversation | Saved rig revision, correct pivots, natural idle/blink/gait/gestures, per-speaker audio and visemes, narration interleaving | Static fallback, wrong speaker mouth, default rig substitution |
| **P1** | `data-story`, `time-evolution`, `cause-effect` | Stable entity/value identities, comprehensible motion, meaningful concept/VO timing and holds, mobile readability | Misleading morph or repetitive text fly-ins |

**Potential distinct additions after catalog audit** (not an automatic backlog of 15 duplicate components): cinematic kinetic-typography story; multi-voice conversation shot; footage/archival evidence montage; nested scale journey; procedural growth; material transformation; photo mosaic; comic-panel narrative; map-to-field footage; machine-internals walkthrough; architectural section reveal; cinematic match-cut bridge. Implement only when a clear semantic/render capability is absent.

### Scene evidence card (required for each P0/P1 upgrade)

- Recipe/scene and exact source commit; semantic purpose and expected viewer takeaway.
- 2–3 motion references with **inspiration-only vs production asset** rights explicitly distinguished; a temporal breakdown (entrance, action, hold, transition, sound tail).
- Intended visual DNA: palette, materials/texture, light/grade, lens/camera, typography, focal path, sonic identity.
- Artifacts: one near-final look frame per distinct environment, cheap motion-and-sound animatic, short actual MP4, representative in-between frame sequence, 16:9 and 9:16 when supported.
- Measurable physical checks appropriate to the shot (binding and deforming page mesh; cave camera translation/parallax; landmark coordinates; foot-plant frames; rig IDs; chart data identity).
- Observed human review with sound, muted, audio-only and small-screen views; timecoded defects → revisions → final verdict. No unsupported beauty-score thresholds.

## 8. Visual system and editing UX

- Define a reusable **visual-DNA profile** beyond palette: composition grid, type hierarchy, material families, texture scale, lighting, lens language, motion signatures, transition grammar and restrained sonic motifs. Support per-series variation (finance, documentary, Japanese folklore, character-led) without forcing all thumbnails/scenes to look identical.
- Expose high-value parameters: subject/media, camera path, timing, palette, materials, text, event cues, keyframes, aspect. Prefer authored presets plus small sensible overrides to a panel of hundreds of knobs.
- Storybook/playback: responsive play/pause/replay/scrub, seek by frame, optional audio, timecoded issue markers, direct render/download link, 16:9 and 9:16 preview and a visual A/B revision comparison. No frame-step button farm or verbose banners.
- First run of a draft should automatically resolve assets and render when configuration is available; subsequent overwriting renders should remain recoverable. Show real progress, failed job and concise reason; **no silent no-op**.
- Theatre Studio is a development/authoring tool; do not unintentionally bundle its AGPL editor into distributed consumer output. Keep preview visual state and headless exported state derived from the same saved keyframes.

## 9. Test, render and QA gates

### Mandatory automated checks

- Source and dependency checks: TS, lint, Vitest, registry metadata, clean-consumer installation, Storybook build; use actual existing scripts and update them when necessary.
- Serialization/migration: parse/reject invalid input, round-trip stable IDs and frames, clone/save/load equality, locale/text edge cases, deterministic seeds.
- Timing: arbitrary seek order, repeated seeks, frame boundaries, transition overlaps, fractional rates, missing audio, narration/dialogue overlap, changed scene duration and neighboring audio prelaps.
- Renderer: requested GPU frame actually drawn, changed pixels on moving frames, no stale canvas capture, font/media readiness, no browser-only vs MP4 material disappearances.
- Asset generation: missing Blender executable/model/workflow, disconnected ComfyUI, malformed output, timeout/cancel, retries, cache correctness, path safety, resource caps.
- Visual/layout: 16:9 and 9:16, realistic strings, CJK, long captions, many timeline points, safe areas, actual fonts, reduced motion, focus and controls.
- Audio: expected tracks present, correct duration/channel/fps, transient timing near anchor, clip/true-peak and silence flags, edit seams, mono suitability.
- Existing code/producers: do not regress direct Three.js hero capture, core MG1/MD1, clean Storybook starts, existing `video:export` and consumers.

### Real MP4 evidence gate

For each upgraded P0 scene render a representative **8–15 s, 1920×1080, 30 fps** MP4 with actual intended assets and mixed audio (unless truly intentionally silent). Also sample a vertical version. Use `ffprobe` and full decode; generate a contact sheet covering opening, anticipation, decisive action, intermediate motion, hold and exit. Record exact input hash/revision.

If the user's **Craft Premium Motion Graphics** skill is available to the agent, run its `scripts/video_qa.py` against the **final actual MP4** and retain `report.json`, `report.md`, `contact-sheet.jpg`, `review.html`. If the skill is absent, use equivalent FFmpeg checks rather than hardcoding a nonportable skill path. Automated pass is **technical** only.

**Human review is mandatory** before the words *premium verified*, *photorealistic verified* or *production ready* appear. Watch normal-speed footage with sound and muted, listen audio-only, and check phone-scale readability. Report separately: visual composition, physical motion/depth, subject/semantic continuity, audio, technical delivery and asset rights. Use `pass` / `needs-revision` / `blocked`, and cite the actual frame/timestamp observation. If nobody could watch, mark `pending human playback`.

### Closed-loop repair

1. Capture a specific timecoded defect with its visible/audible symptom.
2. Identify one likely cause (geometry, camera, lighting, sync, asset fidelity, typography, exporter).
3. Apply a targeted fix, render only affected shot where supported, compare matching times against the previous best.
4. Check adjacent scene transitions, audio tails, shared light and A/V sync after changes.
5. Normally allow **up to three bounded preview attempts** per problem before changing strategy or reporting a real dependency blocker. Do not endlessly regenerate and replace a better version with a worse one.

## 10. Reusable jobs and local Mac constraints

- Long-running Blender and ComfyUI work must expose queued/running/succeeded/failed/cancelled, logs, artifact paths and retry diagnostics. If Kumiki has no existing durable jobs system, provide a minimal reusable adapter contract; **do not build a second ContentGen jobs UI**. ContentGen should orchestrate the same jobs/manifest in its own existing job framework later.
- On Apple M4 with 24 GB shared memory: sequential GPU-heavy operations by default, memory-aware texture/model/sample budgets, preview-first and small deterministic test workload. Measure rather than assume Metal/Blender/ComfyUI performance.
- Avoid nondeterministic service installs or multi-GB model downloads. Verify executable/version, local endpoint and available models; respect network and file permissions.
- Remote agent without access to user Mac: finish portable code/fixture tests, publish exact local verification commands and mark live generator/media evidence as blocked, not passed.
- Preserve a recoverable output revision for each successful run; do not overwrite previous best renders or generated assets without a versioned record.

## 11. Integration and licensing decisions

| Tool | Intended role | Boundary / risk |
| --- | --- | --- |
| [Remotion](https://www.remotion.dev/docs/three) | Optional React/Three composition, frame-addressed preview, audio and MP4 | Free individual/small-team eligibility applies under current terms; recheck license for other owners/distribution and compare with existing export |
| [Theatre.js](https://www.theatrejs.com/docs/latest/getting-started/with-react-three-fiber) | Visual animation and cinematic camera authoring | Core Apache 2.0; Studio AGPL 3.0. Keep Studio in design/dev boundary; recheck modified/distributed/networked deployment obligations |
| [React Three Fiber / Drei](https://github.com/pmndrs/react-three-fiber) | Optional Three.js React layer and reusable helpers | Align versions with React/Three, package only in advanced scene item dependencies |
| [Postprocessing](https://github.com/pmndrs/postprocessing) | Optional cinematic bloom/DOF/AA/grade passes | Color pipeline, alpha and GPU performance evidence required |
| [Blender](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html) | Optional high-fidelity geometry and offline clips | Headless external CLI; pin `.blend`/output/license/version, preserve local safety |
| [ComfyUI](https://github.com/Comfy-Org/docs/blob/main/development/comfyui-server/comms_routes.mdx) | Optional image/texture/footage workflows | Installed models/nodes/weights have separate restrictions; local only and memory-aware |
| [Tone.js](https://github.com/Tonejs/Tone.js), [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | Optional audio scheduling and waveform editor | Audio track definition stays canonical; export samples must align with frame domain |
| [glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | Offline model optimization | Preserve rig joints, materials, named hierarchy and frame appearance |

Consult and update **`13-content-creation-integrations.md`** for final adopted dependency decisions, licenses, version pins and feature-flag status. Do not treat this table as a replacement for that register.

## 12. Prioritized implementation backlog

| ID | Priority | Work item | Done when |
| --- | --- | --- | --- |
| CQ-01 | P0 | Scene/renderer inventory and evidence baseline | Actual main+PR branch audited; missing/duplicate features mapped |
| CQ-02 | P0 | Frame-addressed Remotion adapter | One existing scene renders and seeks deterministically; MP4 verified |
| CQ-03 | P0 | Theatre editor→MG1/frame bridge | Camera/object curves persist/reload; same frames in editor and export |
| CQ-04 | P0 | GPU/media readiness and export parity | No stale WebGL screenshot or missing textures; tests cover 2D/3D |
| CQ-05 | P0 | Structured audio cue/stem mix | Real mixed scene with foley transient/speech/music and editable data |
| CQ-06 | P0 | Asset revision/provenance/cache | Every generated/source asset has validated hash and lineage |
| CQ-07 | P0 | Blender headless adapter + hero geometry | Actual physical asset on Mac used in real scene export |
| CQ-08 | P1 | ComfyUI workflow adapter + production asset | Installed local workflow output bound to a recipe and verified |
| CQ-09 | P0 | End-to-end hero video + closed-loop review | Source→assets→camera→audio→MP4→QA with one corrected iteration |
| CQ-10 | P0 | Book, cave, globe physical upgrades | Each meets its own motion/depth/material/rights gate or marked blocked |
| CQ-11 | P1 | Follow-subject, documentary, product direction | Individual story/lighting/motion/audio gates passed with examples |
| CQ-12 | P1 | Storybook playable preview/review surface | Seek, audition, revision A/B, failures and exports discoverable in one surface |
| CQ-13 | P1 | New semantic recipes after deduplication | Only missing valuable intents added with real demonstration and clean install |
| CQ-14 | P0 | Regression/ContentGen integration proof | Edited scene exports from authoritative inputs; no silent fallbacks |

**Priority rule:** If CQ-09 has not passed on an actual local render, do not proliferate more templates or claim the architecture is production-quality.

## 13. Hand-off artifact and completion definitions

Every completed milestone should leave:

1. Source commit/branch/PR and concise design decisions.
2. Changed registry item IDs and clean-consumer dependency manifest.
3. Exact reproducible commands, environment/version fingerprint and observed test outcomes.
4. Preview/final real MP4 links or paths (when applicable), source asset/workflow pointers and hashes.
5. QA evidence (technical checks, sampled frames, sound review, reviewer verdict, timestamped defect/revision record).
6. Licensing/provenance manifest and credited/restricted assets.
7. Explicit known limitations, missing local-tool gates and the **next smallest action** for a new agent.

Do not conflate **implemented**, **tests passing**, **MP4 rendered**, **technical QA passing**, **human visual/audio reviewed** or **premium approved**. Record each separately. An agent may complete code while output quality remains honestly unresolved.

## 14. Execution log and handoff template

Append a dated entry below for each milestone or substantial scene revision. Do not precheck hypothetical progress.

```md
### YYYY-MM-DD — CQ-XX / Mx — concise result
- **Branch / commit / PR:** ...
- **Scope completed:** ...
- **Source paths and registry items:** ...
- **Decisions and compatibility:** ...
- **Commands actually run + results:** ...
- **Rendered artifacts:** ... (real / fixture / none)
- **Technical QA:** pass / needs-revision / blocked; evidence path
- **Human visual/audio review:** pass / needs-revision / pending; reviewer, timestamps
- **Asset/license provenance:** ...
- **Remaining defects / blocker:** ...
- **Next smallest task:** ...
```

### 2026-10-30 — Plan authored (no implementation claim)

- **Baseline sources:** `main` repo README/package and the open draft PR #45 description and scene specification documents.
- **Observed architecture:** Source-distributed registry with MG1/MD1/CC1/VT1/ST1 boundaries, existing video script and optional 3D captures. Current premium audio/footage completion is **unverified**.
- **Scope completed:** This implementation plan only; no Remotion/Theatre/Blender/ComfyUI integration or real video render performed in this planning step.
- **Next smallest task:** CQ-01 baseline audit followed by CQ-02/CQ-03 proof-of-parity on one representative scene.

---

**Working principle:** The quality upgrade is successful only when actual clips are meaningfully better to watch and hear—not when the dependency list becomes longer.
