# 35 — Material-native film styles: step-by-step implementation roadmap

**Prepared:** 2026-11-13  
**Status:** Active implementation roadmap. Functional implementation, automated validation, exported-proof evidence and explicit human visual acceptance are tracked separately below.  
**Target:** `YukiUmetsu/kumiki-ui`, with a separate ContentGen integration after native Kumiki proof.  
**Inspiration and comparison:** [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar), particularly its [style index](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/README.md), [film technique guide](https://github.com/lemomo-ai/lemo-opuscar/blob/main/TECHNIQUE.md), and medium-specific demos. **Use these as research references, not code or documentation to republish.**  
**Repository baseline inspected:** `main` at `b57b3f91008c9ba35ca0b4179b13afbe7ece44b2`. Re-audit before implementation if main changes.

**Visual source board:** [35A — Material-native style reference gallery](35a-material-native-style-reference-gallery.md) (verified playable films, stills, shot checkpoints, independent craft references and visual-QA rubric). Every style requires a reference-evidence packet before its implementation PR is approved.

## Progress ledger (2026-11-14)

This ledger records **code availability**, not automatic artistic approval. Keep future entries pinned to actual PRs and observed CI artifacts.

| Roadmap work | Code / evidence as of 2026-11-14 | Visual acceptance / remaining gate |
| --- | --- | --- |
| Phase 0 baseline & Phase 1 Risograph vertical slice | [Merged PR #151](https://github.com/YukiUmetsu/kumiki-ui/pull/151): independent SVG spot plates, validated printing spec, 3-shot FilmStage, portable production film, two aspect ratios, browser evidence and rendered proof | Completed implementation; no signed-off normal-speed **human** review for either aspect |
| Phase 2 print compositor & sheet-feed | [Merged PR #151](https://github.com/YukiUmetsu/kumiki-ui/pull/151): multiply-style spot overprint, fixed registration, screened plates, paper pores, deterministic ink passes and physical-sheet bridge | Further density, authored registration-kick and multi-subject visual qualification remain |
| Phase 2 spot-ink native overprint transition | [Merged PR #152](https://github.com/YukiUmetsu/kumiki-ui/pull/152): authored ink-only impression, separate no-text ink contact, native contour paper replacement, five-shot FilmStage, 16:9/9:16 browser frames and exact-seek tests. [Successful deterministic CI](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43566575452) and [browser/production QA](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43566575486) | Browser-visible text overlap and alpha-ghosting corrected; normal-speed **full-transition** video review and independent art acceptance still pending; production audit flags small decorative text and low-contrast footer |
| Phase 3 ink stroke geometry & paper deposition | [PR #153](https://github.com/YukiUmetsu/kumiki-ui/pull/153): pressure/pace geometry, five tones, irregular SVG nib/bristle material, **new paper-native transparent raster ink** with per-dab pigment conservation, moisture-dependent capillary footprint, fibre absorption, fixed-time dry-down, 16:9/9:16 FD1 film, live Storybook A/B comparison with the earlier SVG. [Reference study](research/ink-brush-reference-movement-study.md) records brush technique sources and that direct external video frame decoding was blocked. | Code and deterministic model implemented; new raster production video and real-time browser QA **not yet visually approved**. More faithful brush-angle/multi-tone nib loading and normal-speed reference comparison remain; do not merge on code-only checks. |
| Phases 4–10 and ContentGen | Not started as part of this roadmap | Dependency-gated; do not claim all media/styles shipped |

Prioritize the implementation gates in Sections 4, 6 and 10 over the proposed PR numbering. Historical "next task" wording later in this file describes the original starting plan and is superseded by this ledger.

## 1. Executive decision

Build **five reusable, production-qualifiable film-style families** in dependency order:

1. **Printmaking / Risograph** — first vertical slice: bounded, testable plate compositor and a print-native reveal.
2. **Ink wash / Watercolor** — real stroke deposition and spreading pigment; not a full-frame blur or existing matte relabeled.
3. **Stylized character performance** — rigs whose motion, outlines, and secondary motion match the chosen medium.
4. **Paper craft and puppet theatre** — articulated cutouts, transmission/backlight, pivot motion, folds, shadows.
5. **Scientific observation** — truthful sensor-style reveal and split-view (thermal, LiDAR and X-ray as separate capabilities).

Then assemble **complete style recipes** from these families with Kumiki's existing film/document/audio/grammar infrastructure. **Do not port all 99 Lemo styles, create a second renderer, or add more generic cuts/wipes just for parity.** The first shippable milestone is **one complete Risograph scene/style with a real rendered proof film**; subsequent work is gated on quality.

### Outcomes

- A caller selects a versioned style plus semantic shot intent; Kumiki resolves compatible native operations, material passes, transitions, camera, sound *intent*, and accessibility policy.
- A film can switch media while retaining stable subject/character identity and correctly remapping materials; this is a later milestone, not a Phase 1 promise.
- Styles render from a pinned **absolute frame and seed** without mutable timers, unbounded randomness, or animation drift during seeking.
- The library ships **neutral reusable APIs and scenes**, not Pip/Quill-branded code. ContentGen owns the characters, script, research, media rights, narration generation, publishing and user workflow.
- Every public style has *runtime support, a reproducible film fixture, tests, 16:9 + 9:16 proof, and an explicit human review state*.

## 2. Existing code to reuse, gaps to fill

| Existing capability (verified in current tree) | Reuse / avoid duplicating | Actual missing layer |
| --- | --- | --- |
| `registry/visual/film-style-grammar.ts` (FSG1) | Stable shot roles, native operation catalog, capability resolution | Reusable **medium-specific style metadata** and compiler bindings to actual material/native moves |
| `registry/video/film-look.ts` + `film-look-react.tsx` | Grade, texture, cadence, camera/light mood, typography/sound mood | A **material/process style** (ink, paper, printing) is not a photographic look filter |
| `registry/video/film-document.ts` + `film-document.schema.json` | Single film timeline, shots, sound, transitions, native preflight | A way to attach a resolved style package to supported film scenes without a parallel timeline |
| `registry/video/film-matte.ts` | Seeded organic `ink`/`brush`/`smoke` mattes, dither | **Pigment deposition/wet diffusion and true media properties**; an ink matte alone is not ink wash |
| `registry/video/shader-fx.ts` | Six frame-addressable shader FX; halftone dots, water, grain | Multi-plate overprint, ink/paper interactions, material-native rendering |
| `registry/motion/masks.ts`, `cut-director.ts` | Masks, morphs, cuts and transition composition | Style-specific native transitions using those existing surfaces |
| `registry/video/stages/page-turn-book.ts` and `page-curl.ts` | Real page curvature and book-to-world composition | General **fold/cut/unfold** + puppet joints, not another generic book flip |
| `registry/craft/part-rig.ts`, `auto-rig.ts`, `docs/10-character-audio.md` | Part hierarchy, performance channels, revision identity | Style-specific deformations, line behavior, acting constraints, pose libraries, verified natural locomotion |
| `registry/video/sound-design.ts`, `sound-mastering.ts` and `audio-visual-cue.ts` | Foley, beds, sound recipes, audio cue alignment, mastering | Style-specific **cue selection and performance synchronization**, not another sound mixer |
| `docs/34-promo-motion-and-sound-gaps.md` | **31 promo moves built** as of 2026-11-12 | Do not rebuild flash, shape wipe, organic matte, dither, typography, stutter, sonic logo, etc. |
| `docs/component-status.md` | Registered-pack inventory | **Visual approvals:** 0 approved at inspected baseline; functional presence does not imply artistic qualification |

**Not the gap:** conventional cuts, dissolves, swipes, cinematic camera moves, film grain, generic halftone, existing 3D page turns, or a default animation loop.

**Quality distinction:** rendering a textured image is not the same as simulating the *artistic material*. The new visual effect must have scene semantics and an observable action (depositing pigment, lifting a sheet, stamping a plate, moving a rod).

## 3. Architecture and implementation rules

### 3.1 Ownership boundaries

- **FSG1:** chooses operations for `establish`, `investigate`, `cause`, `compare`, `payoff`. Extend its operation *references* or resolver only where an existing operation cannot express the style.
- **Film Look:** grades the final composition. Do not implement wet pigment, paper relief or print plates here.
- **Proposed `FilmArtStyle` layer:** names a medium, authored constraints and material capability IDs. It is **metadata**, not executable shader code, a renderer or a clock. Extend existing FSG1 contracts where possible; add the smallest separate type only if a failing fixture proves it necessary.
- **Material adapters:** Canvas 2D / SVG / optional WebGL/Three.js renderer modules attached to existing film-stage and shader render paths. Loaded only when used, never a hard dependency of base UI.
- **Existing film document:** composes scene, look, audio, style reference and transitions. It owns output frames; all effects receive `frame` and rational FPS.
- **ContentGen:** selects styles, supplies data and assets/rights, records creative treatment, builds audio, queues renders, and publishes. No duplicate selection/timing algorithm inside Kumiki.

### 3.2 Proposed minimum data shape (illustrative, not a shipped API)

```json
{
  "id": "riso-editorial-v1",
  "version": 1,
  "family": "printmaking",
  "baseLook": "studio-clean",
  "grammarId": "evidence-data-investigation",
  "capabilities": ["print-plates", "overprint", "print-reveal"],
  "rules": {
    "palette": ["ink-a", "ink-b", "paper"],
    "motionCadence": "on-twos-actors",
    "camera": ["locked", "lateral-track"],
    "nativeTransitions": ["plate-print"],
    "excludedTransitions": ["unmotivated-flash"]
  },
  "accessibility": { "reducedMotion": "static-end-state" }
}
```

This is intentionally *not* an instruction string or remote arbitrary code. Map semantic palette roles to supplied theme tokens and external assets. Avoid inventing user-specific rig names or story copy in library manifests.

### 3.3 Non-negotiable invariants

1. Pure, deterministic `evaluate(frame, pinnedInputs)`; seeded noise or pre-baked effects for fluid/cloth/pendulum dynamics; deterministic CPU logic as the source of truth where practical.
2. Preserve semantic identity (`characterId`, `assetId`, `subjectId`) across frame, shot, material switch and export; never rebuild character identity from random generated pictures.
3. Physical/artistic rules have meaningful parameters: plate order, ink transparency, paper tooth, brush pressure, lamp intensity, pivot position, joint drag and sensor scale.
4. Material/scene data is JSON-safe, validated, versioned, independently installable, with optional rendering dependencies and explicit fallback or error.
5. No copyrighted benchmark scenes, prompts/docs or trademarked mascots in fixtures. Asset and font licenses must be known before bundling.
6. Captions remain readable over textured backgrounds; support English, Japanese/CJK, long lines, 16:9 and 9:16, and reduced motion.
7. Evaluate actual exported frames, not mockups; no test can mark a style visually approved without a recorded human review.

### 3.4 Mandatory reference review gate

Before implementing **each** style (including every future new art-style preset), use the [reference gallery](35a-material-native-style-reference-gallery.md): open a representative video and stills; record owner/source/rights, inspected timestamps, material microstructure, composition, character cadence, camera movement, transition and soundtrack timing. Add at least one independent authentic-material/process reference where relevant. The style may not be marked visually approved until a human compares our original encoded 16:9 and 9:16 film against the documented reference principles at normal playback speed. We do **not** reproduce reference stories, characters, frames, branded designs or unlicensed audio.

## 4. Implementation phases, in exact order

### Phase 0 — Audit and reproducible baseline (PR 0)

**Goal:** prove what's already available before adding anything. **Size:** small.

1. Checkout latest `main`; record commit SHA and run `npm ci`, `npm run typecheck`, `npm run catalog:check`, `npm run registry:validate` and relevant unit tests.
2. Query `npm run catalog:find -- --query="film look" --format=json`, `--query="matte"`, `--query="halftone"`, `--query="character"` and matching `npm run catalog:api -- --id=... --format=json`. Use *actual IDs* returned; do not assume a spec filename is a registry ID.
3. Render a small existing film with `npm run film:review -- examples/film/texture-moves.film.json --only=draft` or a working equivalent determined from the CLI help. Capture 16:9 baseline frames, the current review state and any environment limitations.
4. Map where a material pass could bind to the already compiled film stage; add one small failing test for the missing capability before editing public APIs.
5. Produce a short audit table: reusable API, missing renderer hook, compatibility risk, baseline proof files and their hashes.
6. Review the corresponding [visual-reference board](35a-material-native-style-reference-gallery.md); verify film playback, inspect the listed timecoded stills and identify at least one independent process reference. Log what was actually observed vs. only read from a source description.

**Files to inspect:** `registry/video/film-document.ts`, `film-stage.tsx`, `film-look.ts`, `film-matte.ts`, `shader-fx.ts`, `registry/visual/film-style-grammar.ts`, `registry/motion/`, `src/video/`.

**Exit gate:** working baseline; no duplicate capability proposed; fixture/review artifacts and limitations recorded.

### Phase 1 — First art-style recipe on existing infrastructure (PR 1)

**Goal:** ship a **complete Risograph editorial style** before building a general style marketplace.

1. Implement one data-only style descriptor or extend FSG1 with an explicit medium reference; prefer the narrower change.
2. Register one style **only after** connecting it to real film-stage rendering. Add a resolver that verifies palette roles, required capabilities, aspect support, font requirements, and permitted native transitions.
3. Compile a 3-shot, 12–20 s neutral educational proof: evidence arrives as first ink plate → comparison arrives as second plate → resolved overprint shows the conclusion. No claims requiring invented numbers.
4. Provide a 16:9 and 9:16 scene with fixed `frame` input; include an end-state fallback.
5. Surface errors for missing plate source, unknown material, incompatible transition, missing rights or unsupported output instead of silently showing generic cards.
6. Add Storybook **Film Art Styles / Risograph** with controls for ink separation, registration offset, plate reveal progress, seed, and aspect.

**Proposed file locations (confirm existing patterns first):** `registry/video/film-art-style.ts`, `registry/video/materials/print-plates.ts`, `registry/video/materials/print-plates-react.tsx`, `src/video/film-art-styles.stories.tsx`, `tests/film-art-style.test.ts`.

**Exit gate:** full film fixture renders with genuine plate behavior; style can be installed independently; no extra clock or hard core dependency.

### Phase 2 — Printmaking compositor and print-native transitions (PRs 2–3)

**Goal:** meaningful media behavior rather than an overlay.

1. Separate a scene into **2–3 spot-ink density plates** and paper background; colors come from theme/film data, not hardcoded brand palettes.
2. Composite transparent spot inks using multiply-like overprint: overlapping coverage changes the color; do not simply alpha-blend an RGB photo.
3. Add deterministic registration offsets, fixed per shot; avoid frame-by-frame random jitter. A finite **registration kick/recovery** can be an authored cue.
4. Implement per-plate halftone angle, printable dot density, paper fiber, pinholes, feed-direction variation and anti-aliasing. Cache static layers.
5. Add **plate print** transition: visible plate travels/stamps/reveals in order with editable pressure/offset/easing, then the next frame inherits the completed color state.
6. Add **overprint transition**: a shape from the incoming scene expands as one ink and reveals the new scene through correct ink mixing.
7. Render a frame suite at 0%, 25%, 50%, 75%, 100% progress, plus nonsequential seek order (last → middle → first).
8. Add thin-content tests: no plate, fully opaque plate, two equal plates, out-of-register extremes, small labels, portrait crop and high DPI.

**Tests:** deterministic plate samples, overprint numeric comparisons to a declared reference, no shimmer for static plates, start/end transition continuity, mixed text/media preservation.

**Exit gate:** two unrelated neutral subjects look like printed media at final resolution; neither looks like a generic halftone filter. Runtime/memory budgets measured and recorded, not guessed.

### Phase 3 — Ink wash / brush engine (PRs 4–5)

**Goal:** authentic authored brush movement and pigment behavior, using the existing `ink` matte only for final scene handoff when appropriate.

1. Build **stroke geometry** with control points, pressure, direction, speed and brush load; render dark edge, bristle gaps, dry-brush split and tapered tips.
2. Separate **deposition**, **wet spread**, **absorption into rice paper**, **evaporation**, and **dry stroke**; do not implement ink wash as a single blur.
3. Use texture anchored in **world/paper space**, not screen space, to avoid crawling when the camera pans.
4. Choose deterministic operation: analytic diffusion from authored strokes if practical; otherwise pre-bake simulation at a fixed step and sample by absolute frame.
5. Expose a native move: a stroke **forms an object**, then spreads into the scene. When zooming out, control high-frequency fiber shimmer.
6. Support at least five ink density tones and optional sparse accent color without mandating a culturally specific visual vocabulary for every film.
7. Render stillness → brush onset → deposition → spread → readable hold; verify no premature consequence animation.

**Tests:** fixed-seed replay, seek equality, static-paint stability, stroke bounds, missing-brush fallback, overdraw conservation and final PNG alpha.

**Exit gate:** two independent subjects read as brush-painted forms, not outlined vectors with texture overlays. Record normal-speed review and visual defects.

### Phase 4 — Watercolor and painted-surface extension (PRs 6–7)

**Goal:** colored wash with meaningful fluid/paper behavior.

1. Extend the Phase 3 deposition surface with per-pigment water load, granulation, pigment edge accumulation, paper absorption, wet-on-wet and wet-on-dry behavior.
2. Use a stable **underpainting** and fixed seed; static finished regions must remain static after drying.
3. Add light wash-to-image and image-to-wash transition variants, both resolving visibly into the semantic subject.
4. Include a **low-motion** version with held illustrated frames and a modest camera drift.
5. Keep true watercolor separate from photographic `water` shader FX. Existing shader may be a background accent, not the mechanism.
6. Verify long-running scenes do not accumulate drift or memory and that canvas export and browser preview match within documented tolerance.

**Exit gate:** close-ups show paper-pigment interaction; at playback speed the viewer can follow the painted event; CJK captions are stable.

### Phase 5 — Style-aware character performance (PRs 8–10)

**Goal:** make existing character revisions perform in a chosen medium without rebuilding their identity.

1. Audit available part/sprite/3D rig adapters and existing performance channels. Identify gaps for region masks, gaze, speech, locomotion, gesture and secondary motion.
2. Implement a data-only **performance-style adapter** that maps the same semantic action (`walk`, `point`, `ponder`, `blink`, `speak`) to pose spacing, easing/cadence, contour style and secondary motion **without replacing the rig data**.
3. Add **cel-animation**: characters sampled on twos or other declared cadence while camera moves smoothly; stable line work, fixed shadow bands and expressive held poses.
4. Add **rubber-hose-inspired** movement as an **optional rig-compatible mode**: bounded spline limbs, squash/stretch, foot contacts, anticipation and follow-through. Do not apply human cartoon gloves to anatomical nonhuman characters by default.
5. Support **material switching** while preserving eye/mouth anchors, costume/prop attachments, body scale, silhouette and camera continuity.
6. Add ground-contact and collision/clipping checks: rooted foot during stance, plausible stride travel, no shoulder pop, arms at natural rest, restrained mouth/jaw.
7. Prove speaking + blinking + gesturing concurrently, with predictable channel priorities and audio cue alignment. Use existing `audio-visual-cue` and sound system.
8. Demonstrate with **neutral character fixtures**, not copyrighted or consumer-owned character assets inside the public library.

**Tests:** same identity across style switch, no limb discontinuities at transition boundary, pose/viseme/gaze seek equality, contacts, visibility, avatar-size readability and motion accessibility.

**Exit gate:** two character designs and two performance styles work on the same rendering timeline with normal-speed review. No automatic claims of feature-film rig quality.

### Phase 6 — Paper engineering and shadow-puppet theatre (PRs 11–12)

**Goal:** tactile paper actions and projected puppet performance.

1. Reuse `page-curl.ts` for appropriate bending primitives but create distinct **fold/cut/unfold** geometry with crease, layer thickness and persistent cutout holes.
2. Add hinged paper articulation (head, limbs, tail, jaw) with explicit pivots and occlusion order; cut parts remain separate assets.
3. Add paper-stack shadows, lighting and parallax; avoid z-fighting, texture flashes and geometry intersection.
4. Create optional **translucent puppet** material with transmitted lamp light, holes, overlap darkening and visible control rods; it is not the same renderer as opaque front-lit paper.
5. Pre-bake deterministic damped pendulum motion for dangling elements; on-demand frame seeking must not depend on previously simulated frames.
6. Build native moves: cut pattern → unfold; puppet moves toward light → grows/softens → next scene; reveal puppeteer rods on an evidence beat.
7. Validate silhouette and material distinction against the style's declared semantics, not Lemo artwork.

**Exit gate:** an opaque-paper film and a backlit-puppet film render visibly different media with correct geometry, shadow and physical timing.

### Phase 7 — Scientific observation / evidence styles (PRs 13–14)

**Goal:** support technical/educational mysteries without fake measurements.

1. Add **sensor-field** interface: explicit source values, units, calibration range, sampling resolution, masking and provenance; prohibit decorative fake readings.
2. First deliver **thermal split/scan**: visible plate + temperature field, one fixed palette/range across the compare, spot markers bound to values, scan boundary and stable text zones.
3. Next add **LiDAR/point-cloud reveal** from provided registered geometry, with camera/reference provenance; do not synthesize survey measurements.
4. Then add **X-ray-style layer reveal** only when the source supplies actual interior geometry or a clearly labeled illustrative reconstruction.
5. Reuse `EvidenceStage`, `FreezeFrameFocus`, `ComparisonStage`, scene/camera infrastructure and existing map/asset capabilities.
6. Implement automatic preflight for unsupported sensor data, unit mismatch, scale changes and ungrounded claim labels.

**Exit gate:** the rendered numerical overlays are derivable from supplied fields; static and moving comparison frames tell the same factual story.

### Phase 8 — Curated complete style recipes (PRs 15–16)

**Goal:** coordinate the medium, camera, type, cue intent and narrative purpose into one installable recipe.

1. Assemble five curated style recipes: `riso-editorial`, `ink-evidence`, `watercolor-storybook`, `cel-character-case`, and `scientific-investigation`. Add `paper-theatre` after Phase 6 passes.
2. Each recipe declares **essence, exclusions, palette roles, type hierarchy, camera vocabulary, motion cadence, native transition IDs, material capabilities, sound intent and reduced-motion policy**.
3. Resolve shot roles through FSG1: establish / investigate / cause / compare / payoff. A recipe must make a native material move contribute to meaning; reject decorative-only substitutions.
4. Include **two different domain fixtures per recipe**, with independently authored openings, transformations and conclusions. Do not reuse the Lemo demo's storyline.
5. Expose safe overrides: palette roles, pace, intensity, camera preference, texture grain, actor cadence and sound cues. Validate bounded ranges.
6. Add Storybook comparison grid: same neutral film → different artistic media; show start, mid action, payoff and 16:9/9:16.
7. Define a **capability-based fallback policy**: static final illustration where motion is reduced; an actionable error when a required sensor, mesh, font or plate is missing.

**Exit gate:** a consumer selects a preset/override and gets a complete distinctive video, not a style name attached to default cards.

### Phase 9 — ContentGen consumption (separate ContentGen PR)

**Goal:** prove the library improves end-to-end generation without duplicating responsibilities.

1. Pin a reviewed Kumiki commit or release in `ai-content-generation`. Use the project's current character ZIP/asset resolution, timeline, soundtrack jobs and revision storage.
2. Add a **style selection** field at the project/scene planning level, carrying `styleId`, version, explicit overrides and provenance.
3. Map Director's semantic shot intention to installed FSG1/style capabilities; compile with explicit diagnostics for unavailable material or native moves.
4. Prepare Pip/Quill rigs **in ContentGen**, choose actions and cue points from script/audio, pass them to Kumiki's existing performance adapters.
5. Render one 30–60 s original quiz/mystery proof using the chosen material style; create a clean 16:9 main and a separately composed 9:16 excerpt.
6. Cache material passes by source content hash + style version + render settings; invalidate only the affected scenes on character revision.
7. Record license/provenance, style version, output frames, render metrics and visual-review state in existing production jobs.

**Exit gate:** ContentGen completes a video with no per-shot manual component wiring and with no new renderer, job scheduler or audio engine.

### Phase 10 — Qualification, docs and release (per PR and consolidated)

For **every** style and native transition:

1. **Code checks:** `npm run typecheck`, `npm run catalog:check`, `npm run registry:validate`, targeted `vitest`/Node tests.
2. **Render checks:** same absolute frames in forward/reverse/shuffled seek order; seeded determinism; no memory growth/leaks across repeated capture; stable visible font and asset readiness.
3. **Visual checks:** 16:9 and 9:16; important frames before/on/after material action, edges, peaks and scene boundary; small objects, CJK, long text, light/dark palettes, reduced motion.
4. **Art checks:** correct material behavior and recognizability at small thumbnail scale; no crawling static texture, broken joints, plate jitter, unreadable captions, inaccurate printed registration or geometry clipping.
5. **Motion checks:** watch the **full exported video at normal speed**; review cadence, continuity, camera intent, contact/secondary motion and sound alignment. Do not equate screenshots with playback qualification.
6. **Evidence artifacts:** fixture source, pinned asset hashes, frame contact sheets, short MP4, performance observations, exact reviewer/date/status, failures, and fix references.
7. **Distribution checks:** isolated registry installation, optional dependency boundary, commercial license manifest, published usage example and documented fallback/limitations.

**Approval states:** `not-reviewed` → `needs-revision` or `accepted`. Unit tests passing are **not** artistic acceptance.

## 5. Suggested PR sequence and dependencies

| PR | Deliverable | Depends on | Review focus | Relative size |
| --- | --- | --- | --- | --- |
| 0 | Catalog/renderer audit + failing fixture | Current main | No duplication | S |
| 1 | One complete Risograph style vertical slice | 0 | Native film rendering | M |
| 2 | Print density / plate compositor | 1 | Overprint correctness | M |
| 3 | Plate / overprint transitions | 2 | Seamless scene boundaries | M |
| 4 | Ink stroke geometry / paper surface | 1 | Stroke identity | M |
| 5 | Deterministic wet ink / dry brush | 4 | Fluid fidelity and seek equality | L |
| 6 | Watercolor pigment / paper behavior | 5 | Material realism | L |
| 7 | Watercolor native transitions | 6 | Artistic rather than generic motion | M |
| 8 | Character style/cadence adapter | 1 | Reuse existing rigs | M |
| 9 | Cel character acting | 8 | Pose and speaking continuity | M |
| 10 | Optional rubber-hose movement | 8 | Ground contact and anatomy | L |
| 11 | Cut/fold/unfold paper system | 1 | Physical layers and shadow | L |
| 12 | Shadow-puppet lighting/rig | 11 | Transmission and joint behavior | L |
| 13 | Thermal evidence scene | 1 | Truthful sensor values | M |
| 14 | LiDAR / X-ray evidence adapters | 13 | Provenance, no fake sensing | L |
| 15 | Five curated style recipes + two subjects each | 2–9, 13 | Complete directing grammar | M |
| 16 | Cross-style transitions / proof gallery / release | 15 | Identity and visual gate | M |
| C1 | ContentGen style consumption and finished quiz | Reviewed Kumiki style | End-to-end UX | M |

Sizes are **relative complexity**, not a promised schedule. Split an L task further when the first testable slice is large; never hold several large incomplete systems in one PR.

### Parallelism

- Print materials (2–3), character adaptation (8–10), and scientific adapter (13–14) can proceed independently **after** the first style/film contract passes.
- Ink (4–5) precedes watercolor (6–7).
- Paper fold system (11) precedes puppet-theatre lighting (12).
- Style recipe curation (15) depends on implemented native materials, not speculative registry IDs.
- ContentGen integration starts when **one** style is reviewed; it does not have to wait for all five.

## 6. Definition of done, measurable targets

**Required functional gates (hard):**
- Fixed asset/seed/frame produces stable semantic state regardless of seek order; no animation state accidentally advances via wall-clock time.
- All public inputs validated with path-specific errors; no silent substitution that changes meaning.
- Baseline films and unrelated UI packages remain installable; no mandatory WebGL/Three.js dependency for core UI.
- Start/end boundaries of transitions are continuous or intentionally cut, with no frames of missing content.
- Captions preserve reading zones and contrast; reduced-motion presentation retains the explanation.
- Every bundled asset has a license record; every sensor number is sourced; no copied demo scene or mascot.

**Suggested performance budgets (measure, then adjust, not guaranteed claims):**
- First proof: 1920×1080, 24 or 30 fps as specified, 30–60 s, plus 1080×1920 variant where meaningful.
- Render repeatability: identical on pinned browser/GPU stack, or documented bounded tolerance for GPU pixels; exact CPU material samples.
- At least 3 critical frames per native action, plus boundary and cadence samples; no need to run expensive full browser/video suites for every minor PR.
- Memory and render speed measured against baseline; report throughput and peak memory rather than presuming a universal number.

**Visual acceptance:** reviewers explicitly confirm the intended medium's distinct texture, native move, believable motion, clear narrative emphasis and legible text. Track reviews for each aspect ratio independently.

## 7. Testing and CI cost control

- **PR CI:** typecheck, registry/catalog validity, style compiler unit tests, deterministic render-function tests and 2–4 small frame fixtures. Keep this quick and CPU-friendly.
- **Manual / on-demand quality runs:** actual Storybook Chromium captures, contact sheets, 30–60 s film export, audio normal-speed review, 16:9 and 9:16 visual passes. Trigger on tagged PRs / release candidates rather than every push.
- **Regression fixtures:** two creative domains per style, stable seeds, optional pixel-golden threshold with environment pinning and approval. Do not inflate CI by downloading large optional 3D/models on every PR.
- **No deletion of tests** to reduce CI cost. Only change when/where expensive suites run.

## 8. Risk register and explicit exclusions

| Risk | Mitigation |
| --- | --- |
| Style looks like a filter, not a medium | Require material-specific geometry/behavior and native action in each proof |
| Fluid sim breaks deterministic seeking | Fixed-step bake/cache or analytic evaluation; test nonsequential frames |
| Texture flickers during camera motion | Anchor noise to paper/world space and cache source layers |
| Character quality differs from approved sheets | Versioned rig/pose, silhouette/anchor QA, no automatic recreation |
| Heavy renderer in core UI | Registry-isolated optional packages and lazy loading |
| User sees "implemented" but film looks poor | Separate feature availability from human video acceptance state |
| Reference/asset licensing | Independent implementation; audit file-level license and third-party source |
| Scientific visualization invents data | Require supplied sensor/geometry fields, provenance, units and scale |
| Full 99-style parity delays shipping | Ship one finished style, then expand on evidence of reuse |

**Do not implement now:** standalone second film engine; duplicate film/audio timeline; generic transition clones; automated procedural 3D character generation; proprietary style/doc redistribution; 99 one-off bespoke demos; unsourced historical or sensor claims.

## 9. Source references and licensing notes

### Kumiki-UI internal authorities

- [Agent rules](../AGENTS.md), [docs index](INDEX.md), [motion graphics architecture](08-motion-graphics.md), [character/audio contract](10-character-audio.md), [film style grammar](18-film-style-grammar-and-direction.md).
- [Film look plan](33-film-looks-and-style-anchors.md) and [shipped Film Look spec](component-specs/film-look.md).
- [Promo gap status](34-promo-motion-and-sound-gaps.md) — 31 moves marked built; do not reopen as absent.
- [Shader FX spec](component-specs/shader-fx.md), [Sound design spec](component-specs/sound-design.md), [page-turn story](component-specs/page-turn-story.md), [component status](component-status.md).

### Lemo references — technique research only

- [Style index](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/README.md)
- [Risograph](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/risograph/STYLE.md)
- [Ink wash](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ink-wash/STYLE.md)
- [Shadow puppet](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/shadow-puppet/STYLE.md)
- [Papercut](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/papercut-red/STYLE.md)
- [Rubber hose](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/rubber-hose/STYLE.md)
- [Scientific thermal](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/thermal-camera/STYLE.md)
- [Project license](https://github.com/lemomo-ai/lemo-opuscar/blob/main/LICENSE): project-authored **code MIT**; **Markdown documentation CC BY-NC 4.0**, with additional limited commercial-film-making permission but not general commercial republication in a component library; demos and third-party assets have their own terms. Verify current file-level `REUSE.toml` before reusing anything.

**Use a clean-room implementation approach for Kumiki's commercial reusable library.** Public-domain art techniques are ideas and can be independently implemented; do not paste copyrighted Markdown text, demos, artwork, voice tracks, or trademarks into Kumiki.

## 10. Immediate first work item

**Next PR to implement:** PR 0 plus the smallest executable Risograph film slice of PR 1, if the audit is clean.

1. Query the catalog and prove no equivalent installable material pass exists.
2. Add one failing **plate overprint** fixture and one **film style attachment** fixture.
3. Implement the smallest data-only style resolver against FSG1 + Film Document.
4. Implement two plate materials and a real film-stage compositor; draw a neutral 3-shot sequence.
5. Add Storybook film and deterministic tests.
6. Capture three critical frames and a short 16:9 video; log quality defects rather than marking visually approved prematurely.
7. Open a focused PR with source, tests, scene fixture, stills/review, and an explicit remaining-work list.

**Next after that:** multi-plate print transitions → brush/ink engine → watercolor → character-performance styles → paper theatre/scientific visualizations → curated cross-style library → ContentGen integration and normal-speed QA.
