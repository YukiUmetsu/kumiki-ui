# Multi-view image scene — implementation handoff

User approved implementation and requested a commit and handoff before the token
limit. Continue implementation, including the reviewable PR, without asking for
approval again. Do not merge. This is an implementation checkpoint, not a
finished or photo-perfect pipeline.

## Checkout and approved scope

- Existing Orca worktree: `/Users/yukiumetsu/orca/workspaces/kumiki-ui/multiview-image-scene`
- Branch: `feat/multiview-image-scene`; base `1aed63c` (PR #56 merged).
- Previous checkpoint: `56f0d49`; this handoff is committed with the next increment.
- Parent checkout has original uncommitted planning docs; do not edit/stage those.
- Read `AGENTS.md`, `docs/INDEX.md`, the approved [design](../specs/2026-11-02-multiview-image-scene-design.md),
  [plan](../plans/2026-11-02-multiview-image-scene.md), and [benchmark](../../verification/image-scene/benchmark.md).
- Gitignored task ledger: `.superpowers/sdd/2026-11-02-multiview-image-scene/progress.md`.
- PR #55 is the Blender revision bridge; #56 is shared camera/lighting QA. Recheck
  current interfaces/status before extending them. No feature PR or push yet.

The user expects multiple real photos of one subject, background removal,
reconstructed textured mesh geometry, true photographic detail and clean
occlusion. A displaced single photo, generated alternate views or procedural
substitute does not satisfy this. One-call preparation must eventually produce a
cached/versioned bundle for existing Three.js, camera and video rendering.
Local preparation, manual overrides, deterministic absolute-frame rendering,
real Storybook demos, registry installation, push-in/orbit/oblique visual QA and
honest limitations are required. Baked imagery supports camera/exposure changes;
do not simulate physical relighting or claim human visual approval.

## Completed work and evidence

- Real MNHNL fossil VRE-GPr21 capture, CC BY 4.0 with explicit raw/derived sharing
  rights. Sources/hashes/notices in `src/craft/fixtures/image-scene/`. 202 training
  photographs; 23 held-out, excluded from reconstruction/texturing. Chart 001
  excluded. Preview references are actual held-out photos.
- Native medium and full real reconstructions completed; full has 100k triangles,
  8k photographic color map, 202 poses, elapsed 1056.13 s, no sample warnings.
  Cleared medium/full GLBs committed. Current conversion is an emissive benchmark;
  production baked/unlit conversion still required.
- CPU COLMAP 4.2.1 / OpenMVS 2.4.0 comparator completed (it was NOT terminated).
  Geometry has detached fragments/noise and fails the visual gate. Do not advertise
  it as supported. OpenMVS is external AGPL software, not an MIT source dependency.
- Existing `loadGltfHero`, `CameraViewport3D`, `compileCameraPoses`, `VideoExportStage`
  rendered the real mesh and exported a 6-second 1080p30 orbit. Technical video QA
  passed; human and final photographic acceptance remain pending.
- Task 2 manifest/capture contract is implemented, eight tests. Inspect
  `registry/craft/image-scene-manifest.ts` before adding any second contract.
- Task 3 partial: `prepare_photo.swift` handles local Vision/manual masks,
  canonical orientation and source metadata. `capture_samples.swift` now lazily
  loads these into native photogrammetry, preserving photo sample metadata.
  Native masks require `L008`, measured depth requires `fdep`. Numeric red-channel
  EXR camera-Z meters are preserved (including 2.5 m, above normalized range).
  Wrong grids/empty masks/integer depth/calibration overrides reject explicitly.
- Prepared source IDs survive pose export. Invalid/skipped/incompletely aligned
  prepared sets cannot publish a success report. Missing view IDs go into
  `.failure.json`. A partial USDZ on disk is not a ready scene.
- Shared viewport optional `toneMapping="linear"` preserves photographic sRGB at
  exposure 1, retaining exposure adjustments and default ACES for existing users.
  Paused changes redraw without rebuilding the scene. Actual GPU color probe and
  same-camera ACES/linear captures are committed under verification evidence.

## Current failure and next work

Task 3 is not complete. A masked preview with 21 widely spaced training photos
aligned 15/21; 30 consecutive training photos aligned 28/30, repeated with explicit
diagnostics. Missing `VRE-GPr21-033` and `034`. Native masks are accepted now; the
remaining issue is coverage/alignment, not pixel format. Keep the strict guard.
Investigate those source/mask pairs and end views, overlap, automatic masking
configuration, capture policy and actual reprojections. Run a deliberately
curated overlap set or the full prepared training set after inspection, using a
new revision/checkpoint. Never feed held-out photos to reconstruction. Do not
force success by hiding missing observations or marking the partial artifact ready.

Calibration override is unsupported by the native SDK boundary and rejected.
Strong disconnected/mismatched-subject detection, all-view segmentation edge QA,
refinement and a successful complete prepared set remain open. Native depth
loading is buffer-validated, not a measured-depth fossil reconstruction claim.
Document the exact unsupported scope rather than silently approximating it.

Task 1 feasibility supports native development, but quantitative silhouette/
color residuals, macro limits, tolerance card and human fidelity acceptance remain
open. Task 4–10 are largely unimplemented: core reconstruction/conversion workflow,
coverage/background completion, one-call content-addressed cache/orchestration,
prepared loader, camera presets/stage, real Storybook/registry/demo integration,
final exports and reviewable PR. Follow the approved plan and keep core workflow
visible. Do not invent API availability or finish with only benchmark tooling.
Reuse existing GLTF lifecycle, camera recipes, camera/lighting capability controls
and export readiness protocol. Search catalog and inspect exact APIs first.

## Cached work — do not delete or restart successful expensive stages

All local cache roots below are outside Git:

- `/tmp/kumiki-image-scene/benchmark-v1/train`: exact 202-view split.
- `/tmp/kumiki-image-scene/fossil`: native full/medium USDZ, poses/reports,
  native checkpoints, CPU sparse/dense/textured comparator, logs/timings.
- `/tmp/kumiki-image-scene/convert-benchmark.py`: prototype Blender conversion.
- `/tmp/kumiki-image-scene/align-benchmark.py`: native/CPU similarity calibration.
- `/tmp/kumiki-image-scene/prepared-preview-r01`: initial invalid float mask run.
- `prepared-preview-r02`: corrected L008 masks, 15/21 aligned.
- `prepared-preview-r03`: `views.json`, prepared masks, 28/30 aligned.
- `prepared-preview-r04`: same views, new native diagnostics. `run.json` pins inputs;
  `reconstruction.log` and `subject.usdz.failure.json` confirm 28/30. No ready report.
- `/tmp/kumiki-image-scene/object-capture-integrated`: latest compiled native tool.
- `/tmp/kumiki-image-scene/color-probe-report.json`: actual Chrome color results.
- Python Pillow environment: `/tmp/kumiki-image-scene/venv/bin/python`.
- Blender `/Applications/Blender.app/Contents/MacOS/Blender` (5.2.3), ffmpeg,
  Apple M4 / 24GB, macOS26.6.2, Swift6.4. Swift target macOS15 compiles.

Scratch preview `.superpowers/sdd/2026-11-02-multiview-image-scene/preview.html`
and `preview.tsx` reuse the real existing APIs. Vite was running port5188; verify
rather than assuming still live. Native held-out camera mapping uses separate
COLMAP evaluation registration and `docs/verification/image-scene/native-to-colmap.json`.
Never use that evaluation reconstruction for mesh/texturing.

Example calibrated preview:
`http://127.0.0.1:5188/.superpowers/sdd/2026-11-02-multiview-image-scene/preview.html?asset=/src/craft/fixtures/image-scene/benchmark-full.glb&native_calibration=1&width=1920&height=1280&view=VRE-GPr21-006.JPG&tone=linear`

## Actual verification for this increment

- `python3 -m unittest discover -s scripts/image-scene/backend -p 'test_*.py'`:
  17 passed; actual Swift compile and local framework boundaries, no mocking of SDK.
- `npx vitest run --project unit`: 176 files, 2339 passed.
- `npm run typecheck`: passed.
- Scoped ESLint on viewport/viewer integration test: passed.
- `npm run registry:fixture -- --item=camera-viewport-3d`: 19 items / 44 files
  compiled; warning: no consumer usage template for this existing item.
- Actual repeated prepared native run deliberately failed incomplete alignment;
  failure diagnostics verified. Do not report it as a reconstruction acceptance pass.
- Real Three/Chrome grayscale probe: linear1 =64/128/192 unchanged;
  linear0.5 =44/92/140; ACES1 =51/141/200. Human review remains pending.
- No image-scene registry, Storybook, production build, hero quality acceptance,
  clean new-pipeline install or final preset export is claimed yet.

Logs: `/tmp/kumiki-image-scene/backend-resume-final.log`, `unit-resume-final.log`,
`typecheck-resume.log`, `lint-resume.log`, `fixture-resume.log`.
