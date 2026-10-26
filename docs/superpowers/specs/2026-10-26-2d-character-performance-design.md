# Reusable 2D/2.5D Character Performance — Implementation Brief

**Status:** proposed; no implementation or quality gate is implied. **Priority:** 2D sprites and layered 2.5D puppets; 3D remains an optional adapter. **Scope:** reusable, renderer-neutral character *playback*, not a character-generation model or general-purpose animation editor.

## Intent and boundaries

Build character primitives that work in explainers, interactive lessons, storybooks, games, advertising, onboarding, avatars, livestream overlays, and applications—not any particular channel, species, age group, narrative style, or video platform. One approved character asset can perform many scenes, use different themes/outfits/voices, appear in multiple aspect ratios, and be instantiated more than once without sharing playback state.

**Success:** high-quality, low-marginal-cost talking/acting characters; inspectable customization; deterministic frame seeking; identical semantic performance in live preview and video export; minimal optional dependencies.

**Non-goals:** built-in TTS/STT, automatic illustration-to-rig inference, a Photoshop/Live2D replacement, full inverse kinematics/physics engine, generative video, a video editor, user profiles/payments, bundled licensed characters, or a required 3D/WebGL/WASM runtime. Consumers may supply these through explicit adapters.

## Reuse first — no duplicate systems

Read and preserve the canonical ownership before writing code:

| Existing source | Reuse / extension rule |
|---|---|
| [`docs/10-character-audio.md`](../../10-character-audio.md) | **Canonical character/audio semantics.** Implement its `sprite` path first, then a layered 2.5D adapter. Do not copy its contract into another competing spec. |
| [`docs/11-rendering-quality.md`](../../11-rendering-quality.md) | **Only serialized scene, frame clock, asset, adapter and QA contract.** Extend the existing `character` layer/capabilities; do not invent a parallel scene schema. |
| [`docs/07-media-foundation.md`](../../07-media-foundation.md), [`docs/08-motion-graphics.md`](../../08-motion-graphics.md) | Reuse artboard/layers and MG1 motion scheduling, interpolation, easing, cues, serialization, and frame evaluation. No second timeline, clock, or camera engine. |
| `registry/motion/`, `registry/media/`, `registry/visual/` | Reuse the current pure evaluators, masks, transforms, layout/safe-area and preview patterns. |
| `registry/craft/part-rig.ts`, `registry/craft/auto-rig.ts`, `registry/domains/people-model.ts` | **Already 3D-specific**; leave intact. Do not repurpose their Three.js objects as 2D character schema or recreate their behavior. |
| [`docs/13-content-creation-integrations.md`](../../13-content-creation-integrations.md) | **Sole library/license decision register.** Optional Rive/PixiJS/VRM/Rhubarb decisions belong there, not in this file. |

**Current gap (2026-10-26 inspection):** the proposed sprite/2.5D `character-presenter` and independent performance channels have no complete registry implementation. Verify again on the target branch before coding; skip any item subsequently implemented.

## Chosen approach and tradeoffs

1. **Default P0: layered sprite presenter.** Transparent raster/vector layers, named poses and visemes, independently transformed body regions. Universal and cheap; complex perspective turns need alternate artwork.
2. **P1: 2.5D puppet.** Same semantic interface, plus nested pivots, depth/parallax, controlled warps or an optional mesh-deformation adapter, and front/three-quarter/side view sets. More lifelike, but requires author-prepared hidden artwork and explicit occlusion handling.
3. **Optional P3: 3D or third-party 2D runtime.** Separate capability-gated adapter for GLB/VRM/Rive/Live2D-style assets. Greater action range but extra authoring/license/export complexity. Never a core requirement.

Start with two **generic, original, rights-cleared** test characters (not hard-coded owl/squirrel assets); use one layered animal/nonhuman shape to prove that the API is anatomy-agnostic.

## Deliverable boundaries

| Piece | Owns | Does **not** own |
|---|---|---|
| **Character definition + validator** (core registry item) | Stable ID/version, visual mode, parts/anchors, available channels, poses/visemes/actions, semantic customization, asset references and provenance | Storage, image generation, speech provider, arbitrary scripts |
| **Character performance evaluator** (core) | Evaluate `definition + instance + timed cues + absolute frame` into a pure pose; compose/validate independent channels | Wall-clock playback, DOM, WebGL, network, audio inference |
| **Sprite/layer presenter** (first renderer) | Draw transparent named parts in z-order with pivots, masks, transforms, opacity and frame-specific expression/mouth sprites | Video encoding, rig authoring, external hosting |
| **Optional adapters** | Extra 2.5D mesh deformation, imported runtimes, 3D rig playback, speech-to-viseme preprocessing | Changes to portable meaning or mandatory core dependencies |
| **Consumer application** | Character catalog/upload, registration, editing UI, voice and alignment generation, scene scripting, asset storage, jobs, payment/personalization, export orchestration | Forking Kumiki's animation clock/schema |

**Suggested code layout:** `registry/character/{definition,validate,evaluate,presets}.ts`, `registry/character/character-presenter-react.tsx`, optional adapters in separate files, tests in `tests/character-*.test.ts[x]`, representative Storybook fixtures under `src/characters/`, public items in `registry.json`. Fit repository conventions on implementation; don't create duplicate wrappers around existing layers.

## Portable character contract (fields, not a second wire format)

The existing scene document owns serialization. Implement an explicit, versioned character payload with the following validated data:

| Concept | Required / configurable fields |
|---|---|
| **Definition** | `characterId`, immutable `revision`, `mode` (`sprite-2d` or `puppet-2.5d`), design-space dimensions, reference pose, supported capabilities, default parameter values |
| **Assets** | Local/resolved `assetRef` + content hash, MIME, pixel dimensions, alpha/color metadata, license/provenance; optional sprite atlas, alternate view and skin/outfit refs |
| **Parts** | Stable part ID, optional parent, local rest transform, normalized pivot/anchor, z-order/depth, mask/clip, drawable ref, optional deformation metadata; **no fixed human/animal anatomy** |
| **Semantic anchors** | Arbitrary named points/regions (`gaze`, `mouth`, `hand`, `foot`, `held-object`, etc.); discoverable capability list, not mandatory hard-coded limb names |
| **Appearance** | Named palettes, skins, wardrobe/accessory swaps, eye/mouth sets, expression presets, scale, silhouette-safe bounds; whitelist what consumers may override |
| **Motion library** | Named pose/gesture/action clips with timed curves, channel masks, blend/interrupt policy, optional locomotion stride, required anchors and capability fallbacks |
| **Speech capabilities** | Neutral and supported mouth/viseme IDs, language-specific mapping references, transition durations, mouth-closure-on-silence; optional voice *reference*, not API credentials |
| **Instance** | Unique `instanceId`, pinned definition revision, stage/group transform, selected skin/view, state/seed, per-instance overrides, current expression/action cues |
| **Performance cues** | Stable cue ID, start/end frame (or preconverted source timestamp), `instanceId`, semantic action/expression/viseme/gaze/prop target, magnitude, priority, interpolation and interruption |

Customization must be **data-driven and bounded**: allow user-defined part/anchor/action/expression names, palettes, timing/easing/amplitude, body proportions within declared safe ranges, custom skins, external voices, props, themes, and callbacks through the host application. Namespaced extension data require a registered schema/capability. Never evaluate user expressions, arbitrary JavaScript, remote URLs, or shader code from character JSON. Reject unsupported required features with a precise diagnostic; never silently drop them.

## Runtime behavior and production rules

1. **One deterministic clock:** derive all visual state from `{frame, fps, definitionVersion, instanceCues, seed}`. Random seeks, reverse scrubbing and isolated frame rendering must match linear playback. Live interactive events become versioned cues in a recorded session; they must not alter the export evaluator's clock.
2. **Channel composition:** base pose → locomotion/root transform → gesture/prop attachment → facial expression/eye gaze/blink → mouth/viseme → safety constraints. Independent channels coexist; same-property conflicts require explicit priority, additive/masked blending or an error.
3. **Pose/action authoring:** action clips describe `prepare → act → hold → recover`, blend-in/out, duration/retiming bounds, interruption (`finish`, `blend-out`, `cut`), target anchors and region masks. Support loops, idle micro-motion, walking paths, jumping, looking/pointing, reacting, holding objects, and custom actions without shipping channel-specific characters.
4. **2.5D discipline:** layered depth/parallax and subtle head/body angle changes must preserve the authored silhouette. A full turn, hidden body geometry, complex cloth/fur or unsupported joint requires alternate authored views/pose sprites or an explicit adapter—not fabricated backside geometry.
5. **Lip-sync boundary:** audio, transcript and precomputed optional phoneme/viseme timings enter from the consumer. Align source timing once to the canonical frame clock; exact visemes, phoneme maps, approximate word timing and audio-energy fallback are explicitly labeled by precision. Close mouth at silence; no fake phoneme accuracy. Validate English/Japanese/Chinese independently when supported.
6. **Motion and accessibility:** blink/gaze limits, low-amplitude idle, user-overridable expressiveness, reduced-motion/static fallback, captions and semantic descriptions. Keep gestures subordinate to the educational focal point or UI interaction.
7. **Portability:** renderer-neutral pose data; optional DOM/SVG/canvas/Pixi/Rive/3D presenters advertise capabilities. Content/rig revisions and font/asset hashes are pinned for re-rendering, not silently replaced.
8. **Interactive use:** the same presenter can be driven by an app, branching video, game or live UI; instances must independently handle pause, answer-result reactions and named dialogue cues. Personal data and text-to-speech remain in the consumer, never in the reusable registry fixture.

## Authoring and integration UX (consumer-owned)

Minimal flow: **Import layered assets → map parts and anchors → define poses/expressions/visemes → preview actions and speaking → approve immutable revision → select performer in a scene → attach dialogue/actions → preview/export**.

- Expose a part hierarchy, pivot/anchor handles, transparent checkerboard, bounds/depth overlay, expression/viseme audition, action scrubber, and side-by-side reference comparison. Save preset edits without altering the approved revision until publishing a new one.
- Support one-click reuse of an approved definition in multiple scenes, configurable instance size/position, group movement, eye/look-at targets, props and safe-area zones. Place characters at stage edges or bottom-of-screen without obscuring text/captions.
- An *optional future* image segmentation/auto-rig assistant may propose layers and anchors, but requires explicit visual approval and manual repair. Never promise clean rigging from one flattened image.

## Build order and verifiable acceptance

| Stage | Deliverable | Blocking acceptance |
|---|---|---|
| **P0 — portable sprite slice** | Definition validation, sprites/pose/face/mouth presenter, two independent instances, frame-driven idle/blink/gesture and imported viseme cues | Storybook + source JSON; direct-seek frame equality; simultaneous speaking/blinking/gesture; missing asset/anchor/conflict diagnostics; no 3D or vendor runtime installed |
| **P1 — layered 2.5D** | Hierarchical pivots, masks/occlusion, depth/parallax, view and skin swaps, multi-action blending, named anchors and prop parenting | 30–45-second original two-character performance with speech, expressive gesture, walk/point and object focus; preview/export comparison at keyed and randomly selected frames |
| **P2 — consumer integrations** | Generic scene/document binding, content-addressed revision catalog hooks, external alignment import, action authoring/demo, 16:9/9:16/1:1 layout fixtures, interactive cue capture | Clean independent consumer installs only required registry items; captions/face don't collide; re-export after a single audio change updates only affected scenes; correct instance isolation |
| **P3 — optional advanced adapters** | Mesh deformation, external Rive/Live2D-style rig import, 3D character bridge where demanded; no in-core editor | Capability-gated, licensed and reproducible output; existing P0 consumer still builds without adapters; unsupported behavior reports errors rather than silent substitutes |

**Mandatory tests for every stage:** schema round-trip/migration, hash/version resolution, randomized seek order, deterministic seeded idle, channel conflicts, masks/alpha bounds, zero or malformed cues, audio start/mid/end alignment, pause/resume, lifecycle/disposal, unsupported rig capabilities, reduced motion, keyboard/accessible authoring, and screenshot checks in dark/light backgrounds. Include frame-indexed diagnostics and a reproducible export manifest. Run tests locally; do not treat green CI as sufficient visual sign-off.

**Performance/quality gate:** measure and document render time, peak memory, atlas/texture count, output frame stability and preview/export parity for desktop and mobile fixtures. Set budgets from measured baseline and publish regressions; do not claim a universal FPS target without device evidence. Manually inspect natural-speed playback for chatter, sliding feet, disembodied layers, popping pivots, awkward blinks, clipped tails, lip mismatch and incorrect prop contact.

**Exit condition:** a non-channel-specific sample demonstrates a fully reusable character definition, two actors interacting with each other and a prop, editable cues, synchronized voices/captions, pause/reaction/resume, and consistent exported 16:9/9:16 videos—without a mandatory commercial engine or paid generated-video service.
