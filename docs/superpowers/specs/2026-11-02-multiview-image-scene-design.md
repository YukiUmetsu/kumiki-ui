# Multi-view photographs → photographic video scene

**Status:** proposed design; documentation only. Implementation requires approval.
**Companion:** [step-by-step implementation plan](../plans/2026-11-02-multiview-image-scene.md).

## Intent and agreed requirements

Build a reusable, one-call preparation API for premium video production from **multiple real photographs of the same subject**. The user requires photographic detail, background removal, reconstructed meshes and faithful appearance from different camera angles. A displaced photograph or normal procedural approximation alone is insufficient.

The original “Automatic Image → 2.5D” brief now includes actual multi-view subject reconstruction. Use reconstructed textured geometry for the subject and optional depth-composite imagery for the environment. Preserve existing Three.js, camera, lighting capability, scene and video export contracts.

Required capabilities: local processing without mandatory paid APIs; manual masks, depth and calibration overrides; refined silhouettes; hidden-area handling; cached intermediate assets; versioned manifests; deterministic frame evaluation; push-in, orbit and oblique presets; real-image Storybook demonstrations; registry integration; automated and visual verification; a reviewable PR.

## Selected direction and alternatives

1. **Multi-view calibrated reconstruction → textured mesh → existing renderer. Recommended architecture.** Recover geometry and appearance from observations; retain explicit visibility/coverage data. Best fit for meshes, occlusion and existing Three.js consumers. Backend selection remains an implementation decision subject to the benchmark below.
2. **Neural view synthesis / splats as the primary representation.** Potentially useful as a research comparator, but not the initial runtime: it introduces a separate rendering/representation boundary and does not itself satisfy the requested mesh output.
3. **Single-image depth relief or generated alternate views.** Existing relief remains useful for environments; it does not meet subject reconstruction fidelity. Generated views are not substitutes for the required real photographs.

## Architecture

`capture set → input validation/normalization → camera alignment → per-view segmentation/refinement → multi-view depth/fusion → mesh → visibility-aware photographic texturing → optional environment cleanup/depth → versioned scene bundle → existing camera/export`

Camera alignment may use unmasked images for a stationary scene, but reconstruction/fusion must respect subject masks. A turntable capture requires explicit handling: a static background cannot be treated as rotating with the subject. Preserve distinct alignment and reconstruction masks. Reject ambiguous or inconsistent capture modes rather than silently combining them.

Separate preparation from playback. An optional local toolchain performs expensive work once; browser runtime receives only approved prepared assets, metadata and camera tracks. Keep decision functions pure, I/O at adapters, and workflow orchestration visible.

## Fidelity contract

- “Photo-perfect” is the user's visual target, not an automatic certification or a guarantee for arbitrary photographs. Acceptance requires source comparisons at actual output resolution and recorded human review.
- Use real overlapping views of a static, rigid subject under consistent lighting. Support camera-around-subject captures first; turntable support is a separate tested capability, never implicit.
- Preserve holes, cavities, thin edges and observed surface detail. Do not close all mesh holes indiscriminately or use smoothing to conceal reconstruction failures.
- Source unseen surfaces from additional photographs. Default to rejecting camera paths exposing unsupported surfaces. Optional inpainting fills bounded background disocclusions; label inferred pixels and retain their masks. No generated subject completion in the default fidelity mode.
- Keep foreground subject pixels out of cleaned backgrounds. Background reconstruction is separate: arbitrary source backgrounds cannot be combined into a credible environment automatically.
- Preserve photographic lighting in baked textures. Enable camera/exposure controls; disable physical relighting and newly synthesized physical shadows unless separately supported by verified albedo/material capture.
- Record limits for reflective/transparent surfaces, moving subjects, hair, foliage, textureless areas, changing exposure and insufficient coverage.

## Proposed public contracts

All names below are **new proposals**, not existing exports.

`prepareImageScene(request: MultiViewSceneRequest, options?: PreparationOptions): Promise<PreparedImageScene>` is the one-call local preparation API. It accepts capture-set references, rights declarations, a preset, rational fps, duration in frames, output dimensions, optional overrides and a cache location. It returns a serializable scene manifest URL, camera timeline and diagnostic report. A CLI uses the same orchestrator.

`loadPreparedImageScene(manifestUrl: string, options?: PreparedSceneLoadOptions): Promise<PreparedSceneHandle>` loads the prepared bundle in the browser. Its handle exposes a stable `createScene: () => CameraScene3D`, the existing `MotionTimeline`, authoritative bounds, diagnostics and `release()`. A convenience React stage hides loading/viewport/export wiring. Allocation and release follow the existing GLTF factory ownership contract.

Manifest schema 1 references capture hashes, transforms/intrinsics, calibration and relative-scale convention, exact tool/model/checkpoint revisions and licenses, stage parameters and seeds, stage dependency hashes, meshes/textures/masks/depth, source-view coverage, inferred regions, camera constraints, baked-light capability, asset rights and QA evidence. Use relative contained artifact paths and verified content hashes. Keep DOM/GPU objects and large pixel arrays out of JSON. Unsupported schema versions fail explicitly.

Do not repurpose PR #55's `kumiki-blender` manifest for a non-Blender producer. Reuse its public consumer interfaces if merged and applicable; otherwise use existing `loadGltfHero` without copying its loader. Recheck PR status at execution time.

## Milestones and delivery

1. **Fidelity feasibility:** reconstruct one licensed capture set, compare held-out real views and render a short moving preview before generalizing the API.
2. **Reusable preparation:** capture contract, local adapters, masks, depth/fusion, mesh/texturing, stage cache and bundle validation.
3. **Scene integration:** existing Three.js loaders, safe presets, optional environment composite, convenience stage and export.
4. **Evidence and distribution:** real-image stories, comparison videos, defect iterations, documentation, registry smoke and PR.

Start with a 1920×1080, 30 fps, 6-second shot per preset; inspect independently framed 1080×1920 output as well. These are proposed benchmark defaults, not restrictions on the public API. Human approval remains open until actually recorded. No new renderer, Blender exporter, app-specific workflow, physical material recovery or full ContentGen backend integration is included.
