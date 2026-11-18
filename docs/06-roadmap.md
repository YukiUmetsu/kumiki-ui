# 06 — Incremental Roadmap and Acceptance Criteria

**Do not implement the entire catalog in one autonomous agent run.** Each phase produces a usable, installable slice; fix issues before expanding. [02](02-component-catalog.md) is the inventory of **general UI** components, grouped by purpose; [07](07-media-foundation.md) owns the **optional media** component inventory. This roadmap owns sequence, dependencies, evidence and status—not duplicate component contracts. Media implementation details are authoritative in [07](07-media-foundation.md), [08](08-motion-graphics.md), [09](09-explainer-components.md), [10](10-character-audio.md), [11](11-rendering-quality.md), [12](12-infographic-system.md) and [13](13-content-creation-integrations.md).

## General UI track

| Phase | Deliverable | Exit gate |
|---|---|---|
| **0 — Foundation** | pnpm/React/TS/Tailwind/Storybook scaffold; DTCG token parsing and resolved CSS; **Button, Field/Input, Dialog** | Light/dark + 2 anonymous themes, keyboard, CJK, story screenshots, registry install into clean fixture |
| **1 — v0.1 core** | Remaining **12** initial components from catalog, sequentially | Every component passes spec/QA; no unexpected heavy deps; showcase and registry up to date |
| **2 — v0.2 workflow** | Add highest-value form/navigation/data additions after usage evidence | Two independent fixture apps demonstrate customization and compatibility; keyboard and performance budgets met |
| **3 — application patterns** | Search, settings, async progress, resource explorer as justified | End-to-end task coverage and responsive/error/accessibility states |
| **4 — release tooling** | Pinned GitHub release, changelog, migration instructions, token diffs, optional automated update PR proposals | Existing consumers never overwritten silently; fresh install and upgrade smoke tests pass |
| **5 — specialized** | Tree, advanced tables, virtualizers, richer motion as driven by demand | ADR for new deps + accessible composite tests + no regression to core |

These UI phases remain valid and independent. Do not reopen completed UI work merely because the media track gains new renderers.

## Media track ([07](07-media-foundation.md))

A separate, optional track. Media primitives never become dependencies of the ordinary UI components above, and the 15 v0.1 components are not revised by it. **Status statements below are evidence reported by the coding agent, not new verification by this roadmap edit.** The agent must not convert pending checks to passed without running them.

### Delivered and in-progress slices — preserve recorded evidence

| Slice | Deliverable | Exit gate / recorded evidence |
|---|---|---|
| **M0-A** | `artboard`, `editable-text`, `media-frame`, plus the shared `media-document` schema/validator/exporters they build on | Editable 16:9 and 9:16 visuals; font and asset pinning; pixel-clean raster preview; registry install into a clean fixture. **Implemented and reported installable in isolation.** |
| **M0-B** | `layer-stack`, `alignment-guides`, `export-preview` | Save/reload round-trip; guides never reach export; crop/overlap diagnostics; measured preview/export parity. **Implemented and reported installable in isolation.** |
| **M1-A / MG1 — typed 2D motion** | `motion-track` evaluator (typed keyframes, easing, springs, stagger, sequence/parallel nesting), `motion-path`, path-trim/vector-draw, `mask-reveal`, `shape-morph`, `shared-element` transitions, versioned `motion-preset`, kinetic typography (`animated-text`), `scene-storyboard`, `motion-react`, and renderer-neutral golden fixtures under [`examples/motion/`](../examples/motion/) | **MG1 implemented; final refinements still require verification.** All nine original items reported in `registry.json` (56 items total), passing `registry:validate` (56 valid) and `registry:smoke` (56 items, 280 files). Earlier per-item compile fixtures passed (`--item=motion-track`, `--item=motion-react`, `--item=scene-storyboard`) but were **not re-run** after refinements. Earlier `npx vitest run`: 118 files / 1,378 tests; focused `tests/motion-core.test.ts`: 82, `tests/motion-geometry.test.ts`: 34. Three additive MG1 refinements: `applyInterruption` preserves per-frame **`velocityValue`** for `vec2`/`transform` and can seed a nested **`track` node** by `event.nodeId` (reports `localFrame`; `motion-interruption-node-missing` / `-node-unsupported` errors and `-local-out-of-range` warning); `mask-reveal` samples resolve transformed **`polygon`/`bounds`** with clamped `feather`/`softness`/`order`, drawn by `MaskRevealView` (SVG feather, paint order, `data-mask-feather-applied`); `GraphicComposition` is a reusable SVG renderer in `motion-react` with a `graphic-composition` gallery section. Earlier Playwright gallery: 8 tests, **not re-run** for those changes. |

**Recorded status:** M0-A and M0-B items are implemented and installable in isolation; see the M0 row and `media-*` specs in [component-specs](component-specs/) for evidence and known limitations. M1-A motion items are likewise reported implemented and installable (registry-validated and smoke-staged at 56 items / 280 files); see the `motion-*` / `scene-storyboard` specs. The additive M1-A refinements landed in the agent's run, but their **visual screenshot review, Playwright re-run, axe re-run and per-item install fixture remain pending**; these are unchecked, not passed. **M1-B, M2 and 3D were reported not started; infographic work was not status-verified in the supplied report.** Reinspect the repository before changing any status.

### Immediate gate — finish MG1, do not rebuild it

**Reinspection note (2026-10-17):** the sentence above recording “M1-B, M2 and 3D … not started” and “infographic work … not status-verified” is now stale about *what is implemented*. Reading the tree shows registry items `camera-stage`, `camera-rig-3d`, `camera-viewport-3d`, `exploded-view`, `diagram-stage`, `progressive-reveal`, `storyboard-shots` and `visual-transformation`, plus `infographic-system` and `infographic-view`, and `registry.json` lists **64** items (not the 56 recorded in the row above). These remain development slices: expanded QA and visual acceptance are **deferred, not passed**, and **no exit gate is advanced or marked passed by this note**. Re-run the gates before changing any status.

**2026-10-17 update:** [V1 execution report](verification/2026-10-17-motion-v1.md) records fresh
automated evidence: **119 files / 1,387 tests**, **9 motion browser checks** (including axe,
painted feather-edge pixels, random seeks and live reduced motion), Storybook build and clean
per-item consumers for `motion-react`, `motion-track` and `scene-storyboard`. The composition now
uses the same transformed/feathered SVG mask adapter as standalone reveals. **Visual acceptance is
still pending user review**; do not treat this as V1 release closure or repeat completed work.

| Slice | Task | Exit gate |
|---|---|---|
| **V1 — MG1 closure** | Re-run focused/unit suites, Playwright motion gallery, axe, changed-item compile/registry installation; review `GraphicComposition`, nested interruption and mask-feather screenshots across themes/aspects. Record limitations in specs. | **New run logs**, screenshots and per-item fixtures exist; no regressions, including CJK/RTL clipping, random-access frame seeks and mask bounds. If failures arise, fix before starting new media components. |

### Future slices — dependency-aware work queue

**Implementation priority, 2026-10-17:** the user requested component building over further test
refinement. Expanded QA/release gates remain deferred, without being marked passed. A first
`camera-stage` implementation now supplies reusable 2D framing, pan/zoom/roll/cuts and fixed overlays
using existing MG1 tracks, with a multi-aspect gallery example. See its
[API and current limits](component-specs/camera-stage.md). No new engine or video-export claim.

**Camera follow-up:** the user approved the 2D camera visually and requested 3D movement plus a
dedicated storyboard page. `camera-rig-3d` and optional `camera-viewport-3d` now implement numeric
MG1 camera channels and a Three.js preview. `/#/storyboard/camera` includes six planned 3D shot beats
and the 2D demo. This is a camera-only development slice; full MG2/v2 scene validation, models,
video export and deferred QA remain open. See [the component contract](component-specs/camera-rig-3d.md)
and [dependency decision](13-content-creation-integrations.md).

**Next implementation increment:** 2D camera beats now have timed explanations and selection,
using `storyboard-shots` shared with the 3D camera and reveal demos. `progressive-reveal` supplies
cue/frame-addressable entrances, holds and subdued emphasis through existing presets/tracks,
with DOM/SVG slots. `/#/storyboard/reveal` demonstrates the slice. Expanded QA remains deferred
under the user's instruction; no M1-B production/exit-gate claim is made.

### Advanced component sequence — implementation priority

**MotionDirector implementation exception (2026-10-17):** the user explicitly
requested the choreography compiler and a 45–60-second Storybook production now,
with implementation prioritized over a new unit-test suite and no video exporter.
`motion-director` and `motion-director-react` deliver this development slice over
MG1/VT1, including an optional existing 3D adapter example. See the
[contract](component-specs/motion-director.md) and
[execution report](verification/2026-10-17-motion-director.md). This does not
advance the full MD1 hybrid-video/audio acceptance gate or prior deferred gates.

The user requested three technically demanding, reusable components, built sequentially. This is
an engineering selection based on integration difficulty and production usefulness, not a claim
about comparative model benchmark performance. Existing dependencies and the single frame clock
remain mandatory; expanded QA remains deferred as requested.

1. **DiagramStage + data flow — first development implementation present.** Preserve semantic
   graph IDs across animated layout changes, keep ports/routes attached, and sample forward/reverse
   packets on the changing route. Separate data/evaluation from SVG rendering and expose node,
   packet, palette and typography slots. [Contract](component-specs/diagram-stage.md),
   `/#/storyboard/diagram`. Compilation/build evidence only; no M1-B exit claim.
2. **ExplodedView3D — development implementation present.** Reversible part separation with stable assembly hierarchy, local/world
   transforms, shared camera clock and projected annotations. Customize part geometry/materials,
   offset directions, staging, lights and labels. Reuse the optional Three.js viewport; preserve
   assembled transforms rather than accumulating offsets while playing. Qualify depth/occlusion
   behavior explicitly instead of drawing labels as if depth were solved.
   [Current contract](component-specs/exploded-view.md), `/#/storyboard/exploded`: seven-part nested
   assembly, reverse reassembly, camera-linked packed labels, geometry-raycast hide/show-through
   policy, spacing control and multiple aspects/themes. Compilation/build only; no MG2/MG3 exit claim.
3. **CharacterPresenter — after the assembly slice.** Independent gaze/blink, expression, gesture
   and viseme channels evaluated at absolute frames, with source-timed captions and configurable
   visual/rig slots. Begin with a bounded 2D mode and consumer-provided cues; do not invent TTS,
   audio timing, asset rights or a new rigging engine. Full character/audio milestones retain the
   requirements in documents 10–11.

Build one complete development slice before starting the next; don't implement broad placeholder
APIs for all three. Current test/install/visual release gates are deferred, not passed.

**One row = one agent session or a smaller verified increment.** Phase labels follow [07](07-media-foundation.md), [08](08-motion-graphics.md) (**MG**), [11](11-rendering-quality.md) (**R**), [12](12-infographic-system.md) (**I**), and [13](13-content-creation-integrations.md) (**E**). These are cross-references to the same work, **not parallel mandates to implement duplicate systems**.

| Order / slice | Prerequisite | Deliverable | Exit gate |
|---|---|---|---|
| **1 — I0: infographic layouts** | M0-B | `infographic-canvas`, `editorial-grid`, `bento-grid`, `section-stack`, `split-composition`; semantic document bindings | 16:9 + 2:3 static fixtures; deterministic fit and explicit overflow diagnostics; clean registry install. |
| **2 — I1: information blocks** | I0 | `hero-statistic`, `metric-card`, `insight-callout`, `numbered-step`, `annotation`, `comparison-column` | Multilingual layouts, accurate values and source references, readable small previews; no cropped essential copy. |
| **3 — I2: structured diagrams** | I0–I1 | `process-flow`, `timeline-layout`, `hierarchy-layout`, `connector-path`; use existing node IDs and suitable geometry/layout libraries | 12-node branching fixture; connector attachment and stable identity after portrait reflow. |
| **4 — I3: data + staged visuals** | I2, MG1 | `chart-stage`, `data-reveal`, `diagram-build`, `focus-transition`; D3 geometry and optional chart adapters | Bar/line/scatter values and axes validated; random-seek transitions match sequential playback; missing values explicit. |
| **5 — I4: infographic templates** | I0–I3 | Five parameterized P0 templates, variants for static infographic, vertical poster, carousel and animated story | Same source generates static infographic, vertical poster, carousel and **animated scene preview** without fact/ID drift; 16:9, 2:3, 4:5, 9:16 reflow correctly. Encoded video is gated on R3. |
| **6 — M1-B / E0–E1: explainers** | MG1 closed, I2–I3 | `diagram-stage`, `progressive-reveal`, `animated-code`, `math-expression`, `data-flow`; Shiki/KaTeX, optional Paper.js/Motion Canvas adapter; preserve existing shared-element engine | 30–60s RAG explainer previews with code/data flow, cue anchors, 16:9 and 9:16 authored framing; coherent identity and deterministic frames. No invented engine parity. |
| **7 — R3 / E3: video export foundation** | M1-B + [11](11-rendering-quality.md) contracts | `video-composition` + one **optional** video renderer/encoder adapter; shot timing, compositing, audio/caption metadata passthrough, export manifest | Actual reproducible video file and still frames; frame/codec preflight, random seek, failure diagnostics and clean 2D-only registry install. Prototype WebCodecs/Mediabunny; external FFmpeg or licensed Remotion only when justified. |
| **8 — MG2 / R3D / E2: 3D foundation** | R3 baseline + v2 schema validation | Optional `scene-3d`, `viewport-3d`, `object-3d`, `model-3d`, `material-3d`, `lighting-rig`, `camera-rig-3d`; Three.js/R3F/Drei + glTF-Transform | GLB product turntable with PBR materials, lights and camera; frame-reproducible preview/render; 2D consumers have **no 3D dependencies**. |
| **9 — MG3: hybrid 2D/3D** | MG2 | `world-annotation`, `product-stage`, `exploded-view`; projection, alpha/color compositing, camera choreography, stable object IDs | Hybrid animation retains anchored labels in 16:9/9:16; correct depth/occlusion and no clipping; complete source and exported frames. |
| **10 — M2-A / E5 / R4: characters, captions, audio** | R3, MG1; MG2 for VRM mode | `caption-overlay`, `audio-cue-track`, `character-presenter`; 2D sprite/Rive and optional VRM playback, independent animation channels, viseme cues, tone/audio adapters | Spoken character explainer with blink/gesture/lip-cue overlap, multilingual captions, source timing, audio mix metadata and actual synchronization checks; rights recorded. |
| **11 — MD1: cinematic composition & motion direction** | MG1 verified, MG3 hybrid, R3 video, R4 audio cues | `motion-director`, `cinematic-shot`, `camera-sequence`, `animation-group`, `visual-transformation`, `motion-recipe`, `scene-preset`; compile reusable, parameterized shot choreography into **existing** tracks/scenes and 2D/3D renderer adapters, not a second timeline or engine. Add the approved registry items to [07](07-media-foundation.md) before publishing. | **60 s at 1920×1080/60 fps**, ≥30 independently animated elements, ≥5 motivated camera shots, coordinated 2D+3D motion, ≥2 identity-preserving shot handoffs and frame-aligned narration/SFX cues. Submit reusable source recipe, editable scene, asset manifest, encoded video, golden frames, and measured render/quality report. Arbitrary-frame seek matches forward evaluation within documented renderer tolerances; camera framing, occlusion and safe regions pass 16:9/9:16 reviews. No passing claim without inspecting the film. |
| **12 — M2-B / MG5 / R5: production export + QA** | R3–R4, I4, MD1 | `thumbnail-canvas`, `thumbnail-variants`, `subject-cutout`, `timeline-inspector` where justified; renderer capability reporting, regression/manifest pipeline, reusable production templates | Reproducible video, SVG/PNG, thumbnails, carousel and 3D/hybrid reference renders; visual/a11y/rights/codec/performance QA; clean registry installs and upgrade smoke tests. |
| **13 — MG4 / E4: advanced effects (conditional)** | MG2–MG3; evidence of quality need | Optional PixiJS/Paper.js procedural 2D, seeded particles, postprocessing, depth effects, Tone.js offline cues; no custom engine | A/B reference render shows meaningful visual improvement within measured frame/memory budgets. **Skip** when existing primitives suffice. |

**Sequence exception:** Three.js/hybrid work may start after the 3D schema/adapter preflight even if the full video export adapter is incomplete; it must still produce inspectable, deterministic frames. Don't claim a complete production video until R3 passes. **MD1 adds choreography, not a new renderer;** reuse MG1 tracks, MG3 camera/scene primitives, R3 export and R4 audio cues. MG4 effects are optional and may be prototyped before MD1 only when its reference film requires a proven capability. Library approval, licenses and integration boundaries belong to [13](13-content-creation-integrations.md); wire format and codecs belong to [11](11-rendering-quality.md). **Verify actual project status before scheduling each row.**

### Media reference productions — milestones, not marketing mockups

| Reference | First required by | Passing evidence |
|---|---|---|
| **Editorial infographic set** | I4 | One semantic source → infographic still, 2:3 poster, five-panel carousel and animated sequence; valid quantities, citations, typography and editability. |
| **2D technical explainer** | M1-B → R3 | ~45–60s coherent RAG explanation with code/diagram animation, 16:9/9:16 framing; source JSON, golden frames, actual exported video after R3. |
| **Cinematic 3D product film** | MG2 → MG3 | ~20s model/camera/light animation plus accurate 2D callouts; GLB/source manifest, exported frames/video, no environment-dependent surprises. |
| **Character narration** | M2-A | Character speaks while eyes, expression, gestures and visemes animate independently; captions/audio synchronized and asset licenses documented. |
| **Cinematic motion direction** | MD1 | ~60 s, ≥30 independently animated 2D/3D elements, ≥5 camera shots, deliberate action/hold/handoff rhythm, matched SFX/narration cues, two stable-identity transitions; share a versioned recipe, scene JSON, 1080p60 render, 16:9/9:16 framing examples and QA evidence. |

All references must include **editable source, pinned assets/fonts, actual artifacts, measured render/performance data, visual review screenshots and machine-readable diagnostics**. Hard failures are not converted to silent fallbacks. Engine-only demos without a complete composition do not satisfy an exit gate.

### Ukiyo-e handscroll (UKIYO1) — owner queue, 2026-11-14

The owner asked for these additions to the [`ukiyoe-handscroll`](component-specs/ukiyoe-handscroll.md) pack. Build them one slice at a time, in this order, and stop after each slice for review. Each slice:

- passes the ArtCraft reference gate first: public-domain prints (Utamaro, Eisen, Kunisada, Hiroshige, Hokusai) and photographs of surviving costume, swords and buildings, with sources recorded in the [reference study](research/ukiyoe-handscroll-reference-study.md);
- draws every view the rig supports: profile, three-quarter, front and back;
- tracks each special animation frame by frame (contact, weight, cause and effect) before calling it done;
- adds a Storybook example (Cast lab, Bestiary or Motifs) and only the related tests.

| Slice | Deliverable | Exit gate |
|---|---|---|
| **U1 — Oiran** (delivered 2026-11-14; see the [reference study](research/ukiyoe-handscroll-reference-study.md#oiran-roadmap-u1-owner-request-2026-11-14)) | A highly detailed courtesan figure. Layered uchikake over-robe with a heavy patterned hem, the mae-obi tied in front, the date-hyōgo hairstyle with many kanzashi, kōgai and tortoiseshell combs, tall three-toothed koma-geta. Special animation: the oiran dōchū procession walk (the slow figure-eight hachimonji step), with optional attendants (kamuro, shinzō) and a manservant holding the long-handled umbrella. | All four views read at Cast-lab and close-up sizes; the hachimonji step keeps the planted foot fixed and the hem swings with it; screenshot review. |
| **U2 — Maiko** (delivered 2026-11-14; see the [reference study](research/ukiyoe-handscroll-reference-study.md#maiko-roadmap-u2-owner-request-2026-11-14)) | A highly detailed apprentice-dancer figure. The darari obi hanging to the ankles (the back view is the hero), the wareshinobu hairstyle with hana-kanzashi, okobo clogs, the trailing hikizuri hem, the red collar. Special animations: a kyōmai dance with a folding fan, sleeve gestures, a formal bow, the short okobo step. | As U1. The darari obi and sleeves follow the motion with lag and stay attached at the waist and shoulder. |
| **U3a — Samurai and katana** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#samurai-and-katana-roadmap-u3a-owner-request-2026-11-15)) | A katana prop drawn in detail: the curved blade with its hamon, the tsuka's diamond wrap, tsuba, saya and sageo, worn as a daishō pair at the hip. A samurai look in kamishimo and hakama. Solo animations: the draw (nukitsuke), stances (chūdan, jōdan, hassō), cuts, and sheathing (nōtō). | The blade stays in the hands through every pose and view; the sword leaves and enters the saya cleanly; a swing has a readable anticipation, cut and follow-through. |
| **U3b — Duels** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#duels-roadmap-u3b-owner-request-2026-11-15)) | Paired fighting between two figures: timed attack and parry with blade contact and sparks, hit reactions, a fall. The contact frames are shared between the two figures so they never drift apart. | Blades meet on the contact frame and never pass through bodies; random seeking matches sequential playback. |
| **U4 — Oni weapons and fighting** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#oni-weapons-and-fighting-roadmap-u4-owner-request-2026-11-15)) | A detailed studded iron kanabō (and other oni weapons from the prints). Oni fighting: an overhead smash with dust and a ground crack on impact, a sideways swing, a stagger, and a fight against a samurai (and Momotarō) using the U3b contact system. | Impacts land on the frame the weapon reaches the ground or the target; the oni's weight reads in the windup and recovery. |
| **U5 — Castle** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#castle-roadmap-u5-owner-request-2026-11-15)) | A castle motif: a multi-tier tenshu keep with chidori and karahafu gables and shachihoko on the ridge, white plaster and black boarding, on a curved ishigaki stone base, with yagura turrets, gates, a moat and bridges. | It reads at a distance and in close-up; parameters (tiers, size, snow, night lights) work in the Motifs gallery. |
| **U6 — Castle town** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#castle-town-roadmap-u6-owner-request-2026-11-15)) | A jōkamachi castle town composed from the castle, townhouses, samurai residences, a merchant street, a fire-watch tower, a canal and bridges, with crowds, as a scene recipe for a handscroll pan from the keep down through the town. | One scene JSON pans from the castle into the streets without text or depth collisions; the crowds walk on the streets. |

Depict the oiran and maiko with dignity, as costume and performance; no sexualised framing. Maiko are often minors.

### Ukiyo-e handscroll (UKIYO1) — folktale library queue, 2026-11-15

The owner wants animated ukiyo-e YouTube films of 100 Japanese folktales. The [folktale coverage map](research/ukiyoe-folktale-coverage.md) lists the art each story needs and what the pack already has. Five stories can be made today. The slices below add the missing art, ordered by how many stories each one unlocks. The owner has asked for this queue to run without a stop for review between slices. Each slice keeps the U-queue rules above: the reference gate first, every view the rig supports, frame-by-frame motion checks, a Storybook example and only the related tests.

| Slice | Deliverable | Stories | Exit gate |
|---|---|---|---|
| **F1 — Interiors** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#interiors-folktale-queue-f1-2026-11-15)) | Room scenes for the many stories set indoors: a tatami room with shoji and fusuma (sliding panels that open, close and tear), a tokonoma alcove, an irori hearth with a hanging kettle and smoke, futon bedding, an andon lamp, a loom with a weaver (the crane wife), a farmhouse earthen floor and kitchen, a bathhouse. Figures kneel (seiza), sit and lie on the floor. | 18 | A figure kneels, sits, sleeps and walks in a room without passing through walls or floor; lamplight and night read; the panels slide on their tracks. |
| **F3 — Women ghosts and hags** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#women-ghosts-and-hags-folktale-queue-f3-2026-11-15); the sea women go with F12) | Women yūrei and yōkai built on the female figure: Okiku at the well, Oiwa's drooping eye, the peony-lantern ghost, the faceless woman, the two-mouthed woman, the slit-mouthed woman, the ubume with her baby, the icicle and rain women, the hone-onna skeleton, the mountain hag (yamanba) and Onibaba, the jealous bridge maiden, nure-onna's serpent body, funayūrei with ladles. | 17 | Each reads at film size and in close-up; transformations (face falling away, neck or mouth revealed) are timed and continuous. |
| **F15 — Folk actions and props** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#folk-work-and-props-folktale-queue-f15-2026-11-15)) | Everyday actions and props: chopping and carrying firewood, washing at the river, farming with a hoe, pounding mochi, weaving, carrying an old woman on the back, rowing, sewing, the bowl worn on the head, the mallet of luck, the needle-sword, rice balls, straw sandals, baskets and buckets. | 16 | Hands meet the props on every frame; weight and contact read (the axe bites, the pestle lands). |
| **F14 — Effects and magic** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#effects-and-magic-folktale-queue-f14-2026-11-15)) | Shape-shifting (smoke burst and the swap of one figure for another), fire and burning (the tanuki's brushwood back, burning fields), flowers blossoming on dead trees, a glow and halo, lightning, an earthquake shake with falling objects, a magical growth, ash scattered on the wind. | 14 | Each effect is tied to a cause in the scene and seeks deterministically. |
| **F9 — Kami and heavenly beings** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#kami-and-heavenly-beings-folktale-queue-f9-2026-11-15)) | Shintō gods and celestial beings: Amaterasu with her mirror, Susanoo, Izanagi and Izanami with the jewelled spear, the tennyo with the feather robe flying, the Seven Lucky Gods, Konohanasakuya-hime, a shrine-maiden kagura dance, clouds to stand on. | 13 | Flying robes and scarves trail with lag and stay attached; the divine figures are drawn with dignity. |
| **F5 — Warriors II** (delivered 2026-11-15; archery prints still to study; see the [reference study](research/ukiyoe-handscroll-reference-study.md#warriors-ii-folktale-queue-f5-2026-11-15)) | Heian and Genpei warriors: ō-yoroi armour with the kabuto helmet, the bow and arrows (shooting the nue), the naginata (Benkei), the young Ushiwakamaru on a bridge rail, ninja-style toad magic for Jiraiya, mounted warriors, the ghostly Heike army. | 13 | Armour plates follow the body; the bow draws and the arrow flies to its target on the release frame. |
| **F4 — Animals II** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#animals-ii-folktale-queue-f4-2026-11-15)) | Animals the pack lacks: bear, crab, turtle and sea turtle, mouse, wild boar, deer, ox, wolf, mandarin ducks, carp, fish of the sea palace, snake, frog and toad, hawk, octopus, centipede (as a small animal; the giant is in F12). | 12 | Each has its own gait or swim cycle tracked frame by frame. |
| **F8 — Temples, shrines, graves, wells** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#temples-shrines-and-graves-folktale-queue-f8-2026-11-15)) | Sacred and haunted places: a temple hall with a bell (Dōjō-ji), a well with a pulley, a graveyard with sotoba and stone lanterns, the Rashōmon gate, a mountain shrine, a hermit's hut, a stone wall on a lonely road. | 12 | Each reads by day and by night with lanterns; the bell swings and the well rope runs. |
| **F6 — Animal yōkai** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#animal-yōkai-folktale-queue-f6-2026-11-15)) | Shape-shifting and supernatural animals: the bakeneko and the two-tailed nekomata, the inugami, the okuri-inu wolf, the baku, the three kamaitachi in a whirlwind, the mountain-spirit apes (satori, yamabiko), the messenger fox, the fox's human disguise. | 12 | Each transformation into or out of human form is continuous; the whirlwind carries the kamaitachi. |
| **F13 — Trees and forest spirits** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#trees-and-forest-spirits-folktale-queue-f13-2026-11-15)) | Trees and plants as characters: a bamboo grove with a shining stalk, a persimmon tree, cherry trees in bloom and bare, kodama in an old forest, the vampire tree jubokko, the human-faced tree jinmenju, a sacred tree with a shimenawa rope. | 11 | Trees move in wind; blossoms open over time; faces in trees read without looking pasted on. |
| **F2 — Heian court** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#heian-court-folktale-queue-f2-2026-11-15)) | The Heian imperial court: jūnihitoe robes for court ladies, sokutai and kariginu for nobles, a palace hall with bamboo blinds and a curtain screen, an ox-cart, court hairstyles, a lady in an ox-cart procession. | 10 | The layered robes read in every view; blinds and screens frame the figures without hiding them. |
| **F7 — Folk yōkai** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#folk-yōkai-folktale-queue-f7-2026-11-15)) | Household and road yōkai: zashiki-warashi, amanojaku, the bean-washer azukiarai, akaname, konaki-jiji, sunakake-baba, nurarihyon, the snow child, dodomeki's arm of eyes. | 10 | Each has a short signature action (washing beans, throwing sand, licking) that loops cleanly. |
| **F12 — Giant monsters** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#giant-monsters-folktale-queue-f12-2026-11-15)) | Monsters far bigger than people: the giant centipede, Yamata no Orochi with eight heads, the daidarabotchi, the earthquake catfish, the umibōzu, the gashadokuro, the giant toad, Kiyohime's serpent coiled round the bell. | 10 | Scale reads against people and buildings; the many heads or legs move without tangling. |
| **F11 — Tsukumogami** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#tsukumogami-folktale-queue-f11-2026-11-15)) | Object spirits: the tanuki teakettle, the flying cotton strip, the hands in the kimono, the shōji eyes, the biwa spirit, the flaming wheel wanyūdō, the hazy ox-cart. | 9 | Each object keeps its shape while it comes alive; the burning wheel rolls without sliding. |
| **F10 — Other realms** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#other-realms-folktale-queue-f10-2026-11-15)) | Places beyond the everyday: the Dragon Palace under the sea, the moon and its palace, the heavenly river (the Milky Way) with the magpie bridge, the underworld Yomi, the rock cave of the sun, Onigashima. | 7 | Each realm is a scene recipe with its own light and a transition into and out of it. |
| **F16 — Processions and parades** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#processions-and-parades-folktale-queue-f16-2026-11-15)) | Night parades built on the crowd system: the Hyakki Yagyō with its mix of yōkai and object spirits, the fox wedding in a sunshower, the mouse wedding. | 3 | A mixed crowd walks in order without overlaps; the sunshower rain falls in sunlight. |
| **F17 — YouTube episode template** (delivered 2026-11-15; see the [reference study](research/ukiyoe-handscroll-reference-study.md#youtube-episode-template-and-kasa-jizō-folktale-queue-f17-2026-11-15)) | One folktale episode as a reusable recipe: a title card, a narrated act structure, scene changes between handscroll stations, subtitles in safe regions, end card, and the export settings. One complete short episode (Kasa Jizō, which is ready today) proves it. | all | `film:check` passes; captions never collide; a low-res draft is reviewed before any full render. |

### Ukiyo-e quality queue (UKIYO1) — owner request 2026-11-15

The owner asked to stop adding episodes and raise the craft instead. Slices are taken in this order, each reference-led
and checked on rendered stills, then on the episodes:

| Slice | Deliverable | State |
|---|---|---|
| **Q1 — Faces** | The bijin face after Utamaro (fine face line, narrow eyes with the iris hanging from the lid, grey brows, rouged mouth, combed hairline, powdered skin); front-view shimada; eight expressions (`emote`); face traits per look (`look.features`). | Delivered 2026-11-15 (PR #414). |
| **Q2 — Clothing variety** | More kimono patterns and dyes (shibori, stripes, plaids, flowers, waves on hems), obi knots, layered collars, a wardrobe generator for women and men by class and season. | Delivered 2026-11-15 (PR #416). |
| **Q3 — Animation** | Secondary motion (sleeves, hems, hair ornaments), weight shifts, anticipation and settle on actions, head turns. | Delivered 2026-11-15 (PR #417): spring follow-through on sleeves and hems, settle-overshoot on gestures, half-lid blinks, idle glances and head drift. |
| **Q4 — Effects** | Rain, snow, smoke, fire, water and light at print quality. | Delivered 2026-11-15 (PR #418): Hiroshige's long two-block rain with veil and splashes, snow in three depths, curling hooked flames with flamelets and darker smoke. |
| **Q5 — Transitions** | Beyond kasumi: scroll wipes, ink bleeds, page turns, shot-matched cuts. | Delivered 2026-11-15: scroll unroll, ink bleed and print-in transitions, chosen per shot in episodes. |
| **Q6 — Sound effects** | Recorded foley and hits chosen and checked with earshot, placed on action frames in the episodes. | Delivered 2026-11-15: 38 CC0 recordings, steps on every foot plant and blows on their contact frames, panned and distanced from the picture, in all four episodes. Owner heard a low drone in Kasa Jizō; rumble beds and thumpy steps were replaced or high-passed the same day; re-listen pending. |

### Ukiyo-e folktale episodes (UKIYO1) — episode queue

With F1–F17 delivered, the queue moves from new art to episodes. Each episode is one `ukiyoeEpisode()` spec in
`src/video/`, with:
- reference-led art for anything the pack still lacks;
- stills of every shot in both aspects;
- `film:check`;
- `film:review` with no errors;
- a checked-in example film and .srt;
- an entry in Storybook **UKIYO1 · Episodes**.

Video renders wait for the owner.

| Episode | Story (CSV #) | State |
|---|---|---|
| **E1 — Kasa Jizō** | 12 | Delivered 2026-11-15 (PR #401). |
| **E2 — Urashima Tarō** | 5 | Delivered 2026-11-15. New: Dragon Palace people and treasures (`ukiyoe-ryugu.ts`). |
| **E3 — Momotarō** | 1 | Delivered 2026-11-15. New: banner, kibi-dango, treasure heap and handcart (`ukiyoe-treasure.ts`). |
| **E4 — Kaguya-hime** | 4 | Delivered 2026-11-15. New: the cut stalk with the girl in it (`takegiri`). |
| **E5 — Tsuru no Ongaeshi** | 6 | Next (Kaguya-hime's end card promises it). Ready: loom (weaving), crane, snowy farmhouse. |
| **E6 — Hanasaka Jiisan** | 8 | Ready: dog, ash particles, cherry. Needs blossoms bursting on bare trees. |
| **E7 — Issun-bōshi** | 3 | Needs a tiny hero in a bowl boat with a needle sword. Ready: oni, uchide-no-kozuchi. |
| **E8 — Bunbuku Chagama** | 11 | Ready: teakettle tanuki, temple. |
| **E9 — Shita-kiri Suzume** | 10 | Ready: sparrow, baskets (tsuzura need building), yōkai. |
| **E10 — Kintarō** | 2 | Ready: bear, axe, mountain. |

Treat the gods, ghosts and religious places with respect: no mockery of living faiths.

### Motion craft queue (MC1) — owner request 2026-11-17

The owner set four slices. Take **one slice at a time** and finish it to a meticulous standard before the next one
starts. Each slice extends the components named in its row; it does not add a parallel engine.

Rules for every slice:

- Code is modular, configurable and general: typed options with documented defaults, no one-off scenes, no
  consumer-specific names. A renderer adapter stays in its own registry item, so a 2D install never pulls a 3D
  renderer.
- Agents must find the work: a spec section with contract, limits and evidence; registry metadata and a catalog
  preview story (`npm run catalog:find`); source-backed exports (`npm run catalog:api`); stories in the existing
  Storybook section of the components that the slice extends, not a new folder.
- Evidence follows "Within each component slice" below: related tests, clean registry install, rendered review in
  light, dark and narrow widths, and owner visual review.

| Slice | Extends | Deliverable | State |
|---|---|---|---|
| **MC1.1 — AdvancedShapeMorph** | `shape-morph` (ShapeMorph), VisualTransformation | High-fidelity morphs across different geometries: complex contours, holes and topology changes. | Delivered 2026-11-17 (PR #623); owner approved. `AdvancedShapeMorph` core, traced text, the `shape-morph-three` 3D adapter ([spec](component-specs/motion-geometry.md#advancedshapemorph-any-two-shapes-text-and-3d)) and the VT1 strategy `topology-morph`, which `auto` selects for closed contours whose topology differs ([spec](component-specs/visual-transformation.md)). |
| **MC1.2 — SculpturalTypography** | KineticText (`animated-text`, `kinetic-text.ts`), TitleSequence | Letters as dimensional, deformable, material-bearing animated objects. | Built 2026-11-17, in review: `sculptural-type` (per-letter solids from distance fields, five relief profiles, Barr deformers with exact normals, six weighted entrances) and `sculptural-type-three` (MATL1 materials baked at real size); TitleSequence `title.sculpt` (cut card, letterpress, embossed foil, chiselled) ([spec](component-specs/sculptural-type.md)). Owner visual review pending. |
| **MC1.3 — PhysicalPaperMotion** | PaperCraft, EditorialCollage | True dimensional folds, paper bending, tearing, peeling, thickness and material-responsive shadows. | Built 2026-11-17, in review: `paper-sheet` (eleven measured stocks; folds, bends, peels, rolls and tears as developable facets with exact affine maps; heavy-elastica sag; fibre bevels; Kubelka–Munk light; penumbra shadows) with `sheet` on PaperCraft layers and collage cutouts; `paper-book` (simulated magazine page turns with leaf-on-leaf contact) with a Three.js renderer; `paper-sound` (cues from paper motion on recorded CC0 paper sounds) ([spec](component-specs/paper-sheet.md)). Owner visual and listening review pending. |
| **MC1.4 — MaterialAwareTransitions** | FilmMatte (`film-matte.ts`), FilmShapeWipe (`film-shape-wipe.ts`) | Transitions driven by the real behaviour of ink, paper, paint, glass and other materials. | Built 2026-11-18, in review: `material-transitions` (ink bleeding into paper, paper burning, paint running down, breath frosting glass, from eikonal fronts through physical speed fields; reeded glass refracting and a pane shattering; a page peeling and tearing; a drop rippling water and wax draining, through precise two-pass warps), as matte textures and as shape wipes opened through a material ([spec](component-specs/material-transitions.md)). Owner visual review pending. |

## Within each component slice

1. Write the spec from [template](../templates/component-spec.md), including acceptance cases; check whether existing component/spec already covers it.
2. Reuse tokens/primitives; record dependency, commercial-use/redistribution, performance and accessibility tradeoffs.
3. Implement behavior first, then typography/spacing/states/motion; use isolated adapters for PixiJS, Motion Canvas, Three/R3F, audio and export.
4. Create complete stories and meaningful unit/keyboard tests, plus frame/geometry tests for motion.
5. Render and **inspect** screenshots at supported states, themes, densities, widths and relevant frames; inspect rendered clips for timing, lighting and compositing.
6. Fix clipping/overlap/contrast/interaction defects; inspect WebKit if relevant; test reduced motion and CJK/RTL.
7. Validate registry metadata and install the **exact** item into a clean fixture; ensure ordinary UI and static media have no renderer/codec dependency leakage.
8. Report actual commands run, results, screenshots/artifacts, failures, unrun checks and next component. **Stop.**

**Change gate:** a new engine or dependency requires a decision record describing the exact capability missing from current components, license/SPDX and redistribution constraints, runtime weight, adapter boundary, reproducible test fixture, fallback and measured quality/performance benefit. Prefer using existing libraries over rebuilding rendering engines. [13](13-content-creation-integrations.md) is authoritative.

## Historical prompt (Phase 0; not the next work item)

> Read AGENTS.md, docs/INDEX.md, docs/01, 02, 03, 04, 05 and 07. Implement only Phase 0. Start by writing a short architecture and dependency plan. Scaffold minimal tooling; implement tokens and Button, then Field/Input and Dialog with full states, tests and screenshots. Validate a real registry install. Do not create later components or claim tests you did not run. At completion provide measured results, screenshots, remaining issues, and actual commands.

**Next agent instruction:** Read `AGENTS.md`, `docs/INDEX.md`, this roadmap, [07–13](07-media-foundation.md), relevant component specs and the actual implementation. **First close V1 visual acceptance**, using the [current automated evidence](verification/2026-10-17-motion-v1.md) and user feedback. Rerun checks when changes justify it. Then verify actual infographic status and execute the first uncompleted queue slice only. Do not repeat completed work, broaden scope, install unused engines or mark an exit gate complete without actual evidence.

## What not to optimize for initially

**Authorized camera increment (2026-10-17):** the user's next requested slice is
`cinematic-camera-director`, following MotionDirector approval. It compiles semantic
camera shots using existing scheduling/MG1 and extends the existing 3D viewport. This
does not advance unrelated roadmap phases or certify the full v2 scene/export gate.
See [contract](component-specs/cinematic-camera-director.md) and
[verification](verification/2026-10-17-cinematic-camera-director.md).

Component count, glossy landing-page effects, complex theme editors, general drag-and-drop builders, automatic migration of existing applications, runtime npm package publishing, integrations with proprietary branding tools, or AI-generated visual scores. These distract from proving a small set of genuinely exceptional building blocks. For media, also defer full NLEs, rig editors, unrestricted shaders, custom 3D engines, AI image/video generation, universal codec claims and premature WebGPU-only features.

**Release rule:** if a component still has a blocking accessibility, overflow, keyboard, customization, install, renderer-correctness, deterministic-render, asset-rights or export defect, the release is not done—regardless of how attractive the default screenshot looks.
