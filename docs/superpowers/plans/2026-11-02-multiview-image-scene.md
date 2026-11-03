# Multi-view Image → Photographic Scene Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document authorizes no implementation by itself; obtain the user's requested plan approval first.

**Approval:** user approved implementation on 2026-11-02.

**Goal:** Prepare multiple real photographs into a reusable, camera-ready scene that preserves photographic detail, with one-call preparation and minimal consumer code.

**Architecture:** Local capture processing reconstructs a textured subject mesh with per-view masks and explicit observed-surface coverage. A versioned cached bundle feeds existing Three.js asset, camera, optional depth-composite and video export interfaces. Preparation and browser playback are separate boundaries; no inference runs during frame capture.

**Tech Stack:** TypeScript orchestration/contracts, optional isolated local reconstruction/model tools, Three.js, React/Storybook, existing MG1 camera tracks, Vitest, Playwright and FFmpeg. Select and pin reconstruction tools only after license/hardware inspection and real-data benchmarking.

**Spec:** [Multi-view photographic scene design](../specs/2026-11-02-multiview-image-scene-design.md).

## Global constraints

- Input is multiple real photographs of the same subject. No generated alternate views in default fidelity mode.
- Reconstructed textured subject geometry is required; a single displaced photograph is not an acceptable substitute.
- Camera/exposure controls are supported for baked imagery. Physical relighting is disabled by default.
- Optional local toolchain, no mandatory paid APIs, no heavy browser inference dependency.
- Cache intermediate assets, record exact revisions and provenance, and render by absolute frame.
- Do not claim photographic fidelity, visual approval, completed tests or available exports without evidence.
- Build and evaluate one end-to-end subject before expanding to more demonstrations.
- Check boxes only after executing their action. Documentation-only review does not mark implementation steps complete.

## Review focus

1. Mixed subjects, poor overlap or changing lighting must produce capture-specific diagnostics, not a plausible but incorrect reconstruction (Tasks 1–3).
2. Turntable backgrounds must not corrupt alignment; unsupported capture modes must reject explicitly (Tasks 2–3).
3. Thin edges, cavities and reflective/transparent regions must not be concealed by smoothing or indiscriminate hole filling (Tasks 4–5).
4. Unobserved surfaces and background disocclusions must not become silent invented detail (Tasks 5, 7–8).
5. Changed overrides, tool revisions, interrupted writes and repeated scene mounting must not yield stale assets or leaked GPU resources (Tasks 6–7).

## Existing foundations inspected

| Existing source | Reuse / boundary |
| --- | --- |
| `registry/craft/image-relief.ts` | `ImageReliefSpec`, `ReliefDepthPixels`, `createImageRelief`; background relief only when appropriate. Current decoded depth boundary is 8-bit RGBA. |
| `registry/craft/depth-composite.ts` | `DepthCompositeSpec`, `DepthCompositeAssets`, `createDepthComposite`; optional environment layers, strict non-overlapping layer depth intervals. Not a general reconstructed-mesh container. |
| `registry/craft/hero-gltf.ts` | `loadGltfHero`, `GltfHeroFactory`; existing GLB import and resource lifecycle. |
| `registry/motion/camera-viewport-3d.tsx` | `CameraScene3D`, `CameraViewport3D`; stable factory, absolute-frame updates and disposal. |
| `registry/motion/camera-shot-recipes.ts` | Existing `CameraShotRecipe` / `CameraSequence` rather than a second camera evaluator. |
| `registry/motion/camera-lighting-preset.ts`, `registry/craft/camera-lighting-three.ts` | Portable presets and scoped scene controls; use truthful physical-light capability. |
| `registry/video/scene-templates.ts`, `scene-templates-react.tsx` | Existing serializable recipe validation/asset discovery and custom asset rendering boundaries. Add a recipe only where necessary for discoverability; do not clone the template system. |
| `registry/video/video-export-stage.tsx`, `scripts/export-video.mjs` | Existing seek/prepare readiness protocol, frame capture and verified MP4 encoding. |

PR observations from the initial 2026-11-02 investigation: [#55](https://github.com/YukiUmetsu/kumiki-ui/pull/55) open, Blender revision bridge; [#56](https://github.com/YukiUmetsu/kumiki-ui/pull/56) merged and present in the checkout, shared Storybook camera/lighting QA. Recheck both before implementation. Do not merge either on the user's behalf.

## Proposed file ownership

New paths below are planned, not existing implementations. Preserve existing naming conventions if inspection reveals a better owning module; update this map before changing the interfaces.

| Paths | Responsibility |
| --- | --- |
| `registry/craft/image-scene-manifest.ts` | Serializable capture/bundle contracts and pure validators; browser-safe. |
| `scripts/image-scene/prepare.mjs`, `cli.mjs` | One visible local orchestration workflow and CLI. |
| `scripts/image-scene/cache.mjs`, `process.mjs` | Content-addressed stage persistence and bounded subprocess boundary. |
| `scripts/image-scene/backend/` | Pinned isolated local toolchain, backend adapter and automated integration fixtures. |
| `registry/craft/image-scene.ts` | Prepared bundle loading and existing GLTF/composite scene assembly. |
| `registry/motion/image-scene-camera.ts` | Coverage-constrained preset compilation using existing motion contracts. |
| `registry/video/image-scene-stage.tsx` | Reusable loading/viewport/export composition with ordinary DOM customization. |
| `src/craft/image-scene.stories.tsx`, `src/craft/fixtures/image-scene/` | Real prepared demonstrations, source-view comparisons and provenance. |
| `tests/image-scene*.test.*`, `tests/e2e-storybook/image-scene.spec.ts` | Contract, preparation/cache, rendering and seek tests. |
| `docs/component-specs/image-scene.md`, `docs/verification/image-scene/` | Consumer contract, setup, captures, defect history and honest acceptance status. |

## Milestone A — Prove photographic fidelity before generalizing

### Task 1: Real capture dataset and feasibility benchmark

**Files:** Create `docs/verification/image-scene/benchmark.md`, fixture `sources.json`, and `scripts/image-scene/backend/README.md`.
**Consumes:** real photographs and item-specific distribution rights.
**Produces:** pinned benchmark, capture split and selected backend decision; no fabricated model/render evidence.

- [ ] Source one real, rigid, detailed subject photographed with overlapping azimuths/elevations; verify redistribution of the raw photographs and derivatives, not just commercial video use. Record author, item URL, exact license and source hashes. Prefer verified CC0/public domain.
- [ ] Separate held-out real evaluation views before reconstruction; never texture from those views. Record training and held-out file lists and the calibration method used for evaluation views.
- [ ] Inspect available CPU/GPU/RAM/disk and tool installation. Compare two viable local mesh-reconstruction/texturing paths on this exact dataset; inspect upstream code/checkpoint licenses, maintenance, hardware constraints and dependencies. Record versions and commands. Do not install an unreviewed script or select a model solely by its name.
- [ ] Reconstruct and texture the subject, render matched evaluation cameras plus a short orbit in existing Three.js, and compare with the original photographs at 1920×1080 and close-up crops.
- [ ] Record silhouette offsets, missing geometry, photographic detail loss, seams, view-dependent artifacts, runtime and peak resource use. Use metrics as diagnostics; explicitly inspect actual motion and fine edges.
- [ ] Create a fixed benchmark acceptance card: chosen detail crops, allowed camera range, no visible silhouette doubling/holes/seams in those shots, no texture swimming, consistent source appearance, and a human review field. Pin any numerical tolerances after measuring the baseline, before optimizing it; do not invent universal fidelity scores.
- [ ] Select the approach only if evidence supports proceeding. If it fails, record whether more capture coverage, a different backend or a narrower supported subject class is needed. Do not proceed to a placeholder-heavy API to mask a failed fidelity benchmark.
- [ ] Commit only cleared fixtures, reproducible instructions and genuine evidence; keep large model weights in the local cache.

## Milestone B — Reusable local preparation

### Task 2: Capture and artifact contracts

**Files:** Create `registry/craft/image-scene-manifest.ts`, `tests/image-scene-manifest.test.ts`.
**Interfaces:** Define `MultiViewSceneRequest`, `PreparationOptions`, `PreparedImageScene`, `ImageSceneManifest`, `ImageSceneDiagnostic`; expose `validateCaptureSet(input: unknown)` and `parseImageSceneManifest(input: unknown)` with typed returns.

- [ ] Write failing cases for unsupported schema, duplicate view IDs, fewer than two distinct photos, nonfinite intrinsics/transforms, ambiguous capture mode, unsafe artifact paths and contradictory artifact hashes/dimensions. Two photos is a syntactic floor, never a fidelity promise.
- [ ] Run `npx vitest run --project unit tests/image-scene-manifest.test.ts`; confirm failures concern the missing new behavior.
- [ ] Model camera-around-subject and explicit unsupported capture modes as a discriminated union. Define mask/depth/calibration/clean-plate override references and model/tool provenance. Separate relative reconstructed scale from metric scale known through calibration or a scale reference.
- [ ] Define manifest schema 1 with subject mesh/textures, optional environment layers, camera coverage, observed/inferred regions, rights, source hashes and existing timeline/preset references. Bound sizes/counts before allocating resources; make limits configurable within documented hard caps.
- [ ] Run the focused tests and typecheck; commit the contract with its tests.

### Task 3: Input preparation, camera alignment and masks

**Files (updated after native backend selection):** `scripts/image-scene/backend/prepare_photo.swift`, `capture_samples.swift`, `object_capture.swift`, and Python boundary tests. Swift is the isolated system-framework boundary; do not create duplicate Python reconstruction implementations. Future orchestration still belongs in the planned JavaScript modules.
**Interfaces:** Backend JSON requests use manifest stage IDs. `prepare-capture` produces normalized photos plus reversible source transforms; `align` produces calibrated views; `segment` produces per-view reconstruction/alignment masks and refinement diagnostics. `adapter.py` is the sole reconstruction-library boundary.

- [ ] Write tests for EXIF rotation, resolution changes, transformed intrinsics, mask/depth framing, empty masks, mismatched subject views, disconnected alignment components and unsupported turntable captures. Assert actionable view-specific errors.
- [ ] Run `python -m unittest discover -s scripts/image-scene/backend -p 'test_*.py'` in the isolated environment and confirm expected failures.
- [ ] Implement normalization without unnecessary image recompression; preserve original files. Implement the chosen calibration path, including a no-segmentation mode for alignment when appropriate. Reject disconnected/mismatched capture groups before fusion.
- [ ] Integrate local segmentation and edge refinement; preserve thin features, anti-aliased boundaries and foreground colors. Apply manual masks/calibration overrides before dependent stages and record their provenance.
- [ ] Run backend unit tests and a real segmentation/alignment pass. Inspect all source/mask pairs and reprojections, particularly grazing views; record defects and corrected results.
- [ ] Document capture guidance: fixed rigid subject, overlapping views/elevations, stable illumination/exposure, sharp focus and complete intended view coverage. Commit this stage and its environment lock.

### Task 4: Multi-view depth, fusion and mesh construction

**Files:** Create backend `reconstruct.py`, `test_reconstruct.py`; extend `adapter.py`.
**Interfaces:** `reconstruct` consumes calibrated views/masks and optional depth overrides, produces high-precision depth/confidence, fused geometry, a mesh and coverage diagnostics.

- [ ] Test coordinate/polarity conversions, depth precision, invalid depth overrides, inconsistent observations, real holes versus missing surfaces, finite geometry and deterministic stage input serialization.
- [ ] Run backend tests to demonstrate failure, then implement the selected reconstruction/fusion path through the adapter. Single-view depth may assist matching but cannot replace multi-view evidence.
- [ ] Mask background from subject reconstruction. Preserve cavities and thin observed geometry; restrict cleanup to documented defects. Record unresolved regions rather than filling every hole or flattening detail.
- [ ] Generate observed-surface coverage and uncertainty; compare against held-out views. Verify units, handedness, camera conventions and normalization against the existing GLTF loader's transformations.
- [ ] Run backend tests and the real benchmark; commit only after the mesh improves or preserves measured and inspected fidelity.

### Task 5: Photographic textures and hidden-area policy

**Files:** Create backend `texture.py`, `environment.py`, `test_texture.py`, `test_environment.py`.
**Interfaces:** `texture` produces an embedded textured GLB, coverage metadata and texture-source attribution; optional `environment` produces aligned clean plates, depth and inferred-pixel masks compatible with `DepthCompositeSpec`.

- [ ] Test source-view visibility/z-buffer selection, excluded held-out photos, UV orientation, color space, atlas seams, mask edge color contamination and unsupported subject regions.
- [ ] Implement visibility-aware source selection, calibrated projection, UV atlases and bounded seam correction. Keep fine detail; do not globally blur textures to hide exposure or registration errors.
- [ ] Test and implement optional background removal/inpainting using a pinned local provider and manual clean-plate overrides. Preserve observed pixels outside the repair region; retain inferred-region masks. Extend cleanup margins for the intended camera envelope.
- [ ] Keep environment preparation separate from object reconstruction. If backgrounds disagree or cannot cover the requested path, return an explicit environment diagnostic or require an approved plate. Do not claim the subject captures reconstruct a complete world.
- [ ] Export baked/unlit photographic materials with no generated material maps or new physical shadows. Re-render source/evaluation views in Three.js; compare detail crops and moving seams. Record tool/checkpoint rights and commit passing backend tests and artifacts.

### Task 6: One-call orchestration, stage cache and CLI

**Files:** Create `scripts/image-scene/prepare.mjs`, `cli.mjs`, `cache.mjs`, `process.mjs`, `tests/image-scene-prepare.test.mjs`.
**Interfaces:** `prepareImageScene(request, options?) → Promise<PreparedImageScene>`; options include abort signal, cache/output paths and progress callback. CLI: `node scripts/image-scene/cli.mjs --request=<capture-request.json> --output=<bundle-dir>`.

- [ ] Write failing Node tests for stage order, a fully cached rerun, override invalidation, changed tool/model version, corrupted artifacts, cancellation, concurrent writes and interrupted stages. Use fake adapters only for orchestration tests; keep real-backend evidence separate.
- [ ] Run `node --test tests/image-scene-prepare.test.mjs`, then implement the visible workflow: validate → normalize/align → segment/refine → reconstruct → texture → optional environment → camera compilation → validate/publish manifest.
- [ ] Hash actual inputs, stage parameters, exact tool/checkpoint versions, overrides, seed and dependencies. Camera-envelope changes invalidate affected background preparation; shot-only changes do not rebuild unrelated subject geometry.
- [ ] Use bounded subprocess calls without shell interpolation, explicit stage errors, cancellation and temporary outputs with atomic publication. Never publish a ready manifest after partial failure or silently substitute a flat scene.
- [ ] Report truthful stage progress and setup guidance. Document CPU/supported accelerator operation and measured hardware requirements; verify at least one actual local backend end-to-end without paid services.
- [ ] Run Node and backend tests, reproduce the benchmark through one call, and commit.

## Milestone C — Scene, camera and video reuse

### Task 7: Prepared bundle loading and lifecycle

**Files:** Create `registry/craft/image-scene.ts`, `tests/image-scene.test.ts`.
**Interfaces:** `loadPreparedImageScene(manifestUrl, options?) → Promise<PreparedSceneHandle>`; handle exposes stable `createScene`, existing `MotionTimeline`, authoritative bounds, diagnostics and `release()`.

- [ ] Write tests for invalid/missing/tampered bundle assets, aligned subject/environment transforms, multiple independent scene instances, aborted loads, partial cleanup, repeated disposal and factory release after all instances are disposed.
- [ ] Run focused Vitest to confirm failures, then wrap existing `loadGltfHero` and, where present, `createDepthComposite`. Keep manifest validation ahead of decoding/allocation and supply bounded fetches. Do not duplicate PR #55's loader or pretend this is a Blender revision.
- [ ] Preserve camera calibration through loader normalization. Use real mesh bounds, baked materials, correctly tagged textures and explicit texture ownership. Each scene disposes its own instances; handle release disposes shared factory assets once.
- [ ] Run tests/typecheck and inspect the same prepared subject through the existing viewer; commit.

### Task 8: Camera presets, coverage checks and reusable stage

**Files:** Create `registry/motion/image-scene-camera.ts`, `registry/video/image-scene-stage.tsx`, `tests/image-scene-camera.test.ts`, `tests/image-scene-stage.test.tsx`.
**Interfaces:** `compileImageSceneCamera(manifest, shot) → { timeline: MotionTimeline, diagnostics }`; `shot` carries preset (`push-in`, `orbit`, `oblique`), rational fps, durationFrames and output size. `ImageSceneStage` takes a prepared handle, absolute frame and ordinary DOM/ref/customization props; it uses existing `CameraViewport3D` and `VideoExportStage`.

- [ ] Test reproducible poses under forward/reverse/random frame order, first/last-frame bounds, invalid durations, clipping, camera/mesh intersection and paths leaving observed geometry/environment coverage. Do not silently clamp unsafe requests.
- [ ] Compile presets into existing motion/camera types. Evaluate constraints across the full frame range; do not assume start/end checks certify the entire trajectory. Combine geometric guards with rendered coverage checks for complex occlusions.
- [ ] Add stable loading/error/cancelled/ready behavior and reduced-motion hold. Wire export readiness to actual asset decoding and WebGL frame completion; never capture a previous frame.
- [ ] Use PR #56 controls with physical lighting disabled for baked materials; preserve exposure. Keep temporary QA overrides out of authored exports unless explicitly supplied.
- [ ] Test stage lifecycle, keyboard-accessible controls, error messages, safe text regions/CJK where controls or comparisons have labels, and both output aspects. Run focused Vitest/typecheck and commit.

## Milestone D — Real demonstrations, evidence and delivery

### Task 9: Real-image Storybook and defect iteration

**Files:** Create `src/craft/image-scene.stories.tsx`, cleared fixtures under `src/craft/fixtures/image-scene/`, `tests/e2e-storybook/image-scene.spec.ts`, `docs/verification/image-scene/review.md`.
**Consumes:** actual prepared bundles, original/held-out photographs and compiled presets.
**Produces:** reproducible source comparisons, moving clips, screenshot matrix and timestamped defect history.

- [ ] Complete the first subject before adding a second independently captured subject. Use a second subject with different geometry/material challenges; record unsupported properties honestly. Raw photographs and all shipped intermediates require distribution clearance.
- [ ] Add a discoverable Storybook group showing original photographs, matched reconstruction/evaluation views, mask/depth inspection, and push-in/orbit/oblique playback. Prepared fixtures must work offline without model installation; no placeholder-only demonstration.
- [ ] Add browser tests for loaded assets, current-frame readiness, seek determinism, aspect changes and reduced motion. Use synthetic fixtures only for focused mathematical/error tests, never as visual fidelity evidence.
- [ ] Export each preset at 1920×1080, 30 fps, 180 frames through `npm run video:export -- --story=<actual-story-id> --output=<actual-output-path>`. Export independently composed portrait coverage. Record actual IDs/paths in the review document after creation.
- [ ] Compare original and held-out photographs against matched rendered cameras and inspect opening/middle/closing plus difficult intermediate frames. Review full-speed video for seams, texture swimming, silhouette doubling, flicker, stretching, halos, unsupported surfaces and background duplication.
- [ ] For every material defect record frame/time, observation, cause, correction and same-frame before/after evidence. Run up to three targeted previews per failed shot, then change method or report the blocker instead of endlessly tuning.
- [ ] Run the motion skill's MP4 QA script on final exports with audio expectation disabled for these silent benchmarks; preserve actual technical results. Record human visual acceptance separately; leave it pending until received.

### Task 10: Public registry, documentation and reviewable PR

**Files:** Modify `registry.json`, relevant existing catalog purpose mapping, `docs/INDEX.md`; create `docs/component-specs/image-scene.md`; update the relevant optional-media roadmap section in `docs/06-roadmap.md` without claiming completed release gates.

- [ ] Register the manifest/loader/camera/stage packs with exact required dependencies. Keep local preparation tools optional and out of browser registry dependencies; publish their setup and CLI entry point separately within the repo.
- [ ] Document the one-call local example, prepared-bundle browser example, input photography guidance, overrides, manifest versions, cache invalidation, resource ownership, model licenses/hardware, capture limitations and explicit baked-light capability.
- [ ] Run `npm run typecheck`, focused ESLint, focused new unit tests, `node --test tests/image-scene-prepare.test.mjs`, backend tests and the relevant existing relief/composite/camera/export regression tests. Run full `npx vitest run --project unit` before PR delivery; report exact unrelated failures if any.
- [ ] Run `npm run build-storybook`, `npm run catalog:check`, `npm run registry:validate`, `npm run registry:smoke`, and `npm run registry:fixture -- --item=<each-new-item-id>`; compile a clean consumer of the public examples.
- [ ] Run the new Storybook browser tests with the existing configuration, `npm run video:export:check`, applicable cheap geometry guards and `npm run hero:quality`. Existing hero approvals do not approve these reconstructed subjects; add only genuinely reviewed evidence under the hero gate's rules.
- [ ] Run `git diff --check`. Audit redistributed fixtures/notices and record all exact commands/results, screenshots, MP4s and pending gates in the verification document.
- [ ] Recheck PR #55/#56 and current base, resolve any actual interface conflicts, and open a feature PR with the final scope, photographic comparisons, measured constraints, reproduction steps and remaining limitations. Do not merge automatically.

## Approval and execution boundary

This plan and its companion design are review material. No implementation, dependency installation or expensive reconstruction has been performed by writing them. After the user approves, implement sequentially with the fidelity benchmark first. A failed benchmark is a real blocker to the requested quality, not permission to replace the deliverable with a depth-map demo.

## Execution checkpoint — prepared samples and photographic color

Task 2 is implemented (eight contract tests). Task 3 remains partial: canonical
photo/mask preparation and actual native mask/depth sample ingestion are connected,
but calibrated alignment, complete mask QA/refinement and successful prepared-set
coverage remain open. The 30-view native diagnostic rejected 28/30 alignment;
missing IDs are recorded, not silently discarded. Tasks 4–10 remain unfinished.
See [handoff](../handoffs/2026-11-02-multiview-image-scene.md) and
[benchmark](../../verification/image-scene/benchmark.md) for evidence and next steps.
