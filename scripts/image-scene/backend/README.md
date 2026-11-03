# Multi-view scene preparation — benchmark tools

Status: fidelity benchmark in progress. These commands are preparation tools;
the public one-call scene pipeline is not implemented yet. See the approved
[plan](../../../docs/superpowers/plans/2026-11-02-multiview-image-scene.md).

## Reproduce the real capture split

Python 3.10+ standard library; no model, paid API or image generation required.
Read `src/craft/fixtures/image-scene/sources.json` for the archive URL, hash,
CC BY 4.0 attribution, per-photo hashes, exclusions and training/evaluation split.
Download the archive into a local cache, outside the git checkout, then run:

```bash
python3 scripts/image-scene/backend/benchmark_capture.py \
  --archive=/absolute/cache/vre-gpr21-images.zip \
  --output=/absolute/cache/vre-gpr21-r01 \
  --sha256=0b683f51ab97b4503fc7b8d781f9979e352ff5b63e3f9141e7a19cf9f9a0ae33 \
  --exclude=VRE-GPr21-001.JPG
```

This retains original JPEG bytes, rejects traversal/duplicate names or content,
checks the archive digest, and writes separate `train/` and `held-out/` folders.
The excluded image is a color chart, not a subject observation. Use a new output
directory for every revision. Held-out images must never enter reconstruction or
texturing. A split does not validate the photographs' geometric suitability.

## Native macOS candidate

Requires macOS 15+, an installed Swift SDK and supported photogrammetry hardware.
This optional boundary uses the system RealityKit framework; no Apple framework
code or model weights are shipped in Kumiki. Other platforms need a separate
local backend. The machine's actual OS build identifies the framework revision.

```bash
swiftc -O -parse-as-library scripts/image-scene/backend/object_capture.swift \
  scripts/image-scene/backend/capture_samples.swift \
  -o /absolute/cache/kumiki-object-capture
/absolute/cache/kumiki-object-capture --probe
/absolute/cache/kumiki-object-capture \
  --input /absolute/cache/vre-gpr21-r01/train \
  --output /absolute/cache/vre-gpr21-r01/subject.usdz \
  --detail medium \
  --checkpoint /absolute/cache/vre-gpr21-r01/checkpoints
```

JSON-lines progress is diagnostic, not a promise of an accurate ETA. On success,
USDZ, camera-pose JSON and a backend report are produced. Poses do not include
calibrated intrinsics; they alone cannot certify matched evaluation cameras.
Automatic masking is requested, but RealityKit may fall back to whole-image
reconstruction if it cannot derive masks. The report explicitly leaves mask
quality and human visual acceptance unverified. Medium/preview outputs are
benchmarks, not proof of final delivery detail. Photos' baked illumination must
be preserved when converting the USDZ for Kumiki; generated roughness/normal/AO
maps are not proof of measured physical material properties.

Checkpoint reuse must be restricted to the exact same capture, configuration,
backend version and output policy. The benchmark CLI does not validate a cache
key; the future preparation cache must do so. Never share checkpoint directories
between changed photo sets.

## CPU reconstruction comparator

The initial comparator uses COLMAP 4.2.1 for sparse alignment and OpenMVS 2.4.0
for dense geometry/texturing. Both official macOS arm64 binaries were launched
on the benchmark machine. COLMAP's build has no GPU support; its CUDA-dependent
dense stereo is not used. OpenMVS's **release 2.4.0** does not include the native
`CreateStructure` frontend described by the newer upstream wiki.

OpenMVS is an external AGPL-3.0 tool, not an MIT library dependency; do not copy,
link or redistribute its implementation/binaries as Kumiki source. Preserve its
license if a future distribution includes it. Benchmark comparison is not a
backend selection or license certification of a deployed service.

Run boundary tests:

```bash
python3 -m unittest discover -s scripts/image-scene/backend -p 'test_*.py'
```

The Swift tests compile and probe the real system boundary on macOS, and skip
on other platforms. They do not reconstruct a subject or certify visual fidelity.

## Per-photo preparation (implementation checkpoint)

`prepare_photo.swift` uses local Vision foreground segmentation or a supplied
same-grid grayscale mask. It preserves the original encoded photo for EXIF
orientation 1, and writes a lossless canonical PNG only when rotation is needed.
It retains lens metadata, records the orientation transform, rejects empty masks,
and never marks mask quality visually approved. Compile with `swiftc`; invoke
`--image <photo> --mask <new-mask.png> --metadata <new-report.json>` and optionally
`--normalized <new-oriented.png>` or `--override <aligned-grayscale-mask.png>`.

Actual real-photo, EXIF round-trip and wrong-size manual-mask tests pass. These
outputs now feed the native reconstruction boundary below. The original 202-view
benchmark used framework automatic masks; the public one-call orchestrator is
still unfinished.

## Prepared masks and optional measured depth

Pass `--views /absolute/cache/views.json` instead of `--input`. The JSON document
contains local paths (relative to the document or absolute), never remote URLs:

```json
{
  "schemaVersion": 1,
  "mode": "object-rotation",
  "views": [
    {"id": "view-001", "image": "canonical/001.jpg", "mask": "masks/001.png"},
    {"id": "view-002", "image": "canonical/002.jpg", "mask": "masks/002.png"},
    {"id": "view-003", "image": "canonical/003.jpg", "mask": "masks/003.png",
     "depth": {"path": "depth/003.exr", "encoding": "camera-z-meters-f32"}}
  ]
}
```

Three distinct photos is only a syntax floor. `camera-orbit` and masked
`object-rotation` identify the capture policy; neither guarantees coverage.
Images must have canonical EXIF orientation 1; masks/depth must share their exact
pixel grid. Masks use grayscale coverage (black background, white subject).
Depth uses numeric red-channel floating-point camera-Z meters, zero for unknown,
finite/nonnegative values up to 10,000 m. Integer/relative-depth maps are rejected;
no depth estimator or automatic metric conversion is implied. Calibration
intrinsics/pose overrides are rejected explicitly because this SDK boundary
cannot apply them. Use a calibrated backend when they are required.

`--validate-views /absolute/cache/views.json` decodes the actual buffers without
reconstruction. The same lazy loader preserves native photo metadata and attaches
an `L008` object mask and optional `fdep` DepthFloat32 map. Numeric depth is not
color-graded or clipped to [0,1]; tests preserve 2.5 m exactly. Validation bounds
metadata (32 MiB), individual files (256 MiB), view count (4096), and each pixel
grid (16384 px / 128 MP). It does not certify segmentation or view consistency.

Prepared reconstruction fails on invalid/skipped samples or incomplete pose
coverage. Incomplete alignment writes `<output>.failure.json` naming missing
view IDs, with `modelIsReady: false`; it never writes the success `.report.json`.
A partial USDZ may exist and must not be published. Use a new output/checkpoint
revision after correcting the capture. All other failures likewise require a
successful report before any downstream publication. Do not infer readiness from
a model file's existence.

The actual 30-view masked fossil diagnostic aligned 28 views; `VRE-GPr21-033`
and `034` did not align. The guard rejected this revision. Full mask-edge review,
calibration, disconnected/mismatched-subject detection, mask refinement, portable
backend support, and a successful end-to-end prepared capture remain open.
See [benchmark evidence](../../../docs/verification/image-scene/benchmark.md).

Native depth and loading references: [Apple depthDataMap documentation](https://developer.apple.com/documentation/realitykit/photogrammetrysample/depthdatamap),
[WWDC24 photogrammetry data loading](https://developer.apple.com/videos/play/wwdc2024/10107/).

## Content-addressed local capture preparation

Node **24+** can execute `scripts/image-scene/prepare-capture.mjs` directly
(including the shared TypeScript contract through native type stripping):

```js
import { prepareCapture } from './scripts/image-scene/prepare-capture.mjs';
const capture = await prepareCapture(request, {
  cacheDirectory: '/absolute/local/cache',
  baseDirectory: '/absolute/photo-directory',
  signal: controller.signal,
  onProgress: event => console.log(event),
});
// capture.viewsPath feeds the native --views boundary.
// This is a prepared capture, NOT a ready reconstructed scene.
```

`request` uses the existing `MultiViewSceneRequest` schema. Relative input paths
resolve against `baseDirectory`; URLs reject. All input bytes are hashed before
work begins, and identical photograph bytes reject even under different names.
The cache snapshots source bytes and overrides before decoding, preserving the
originals. Automatic/manual masks, normalization, numeric depth validation and
source identity use the same real Swift boundaries as reconstruction. `none`
segmentation and calibration overrides reject at the native adapter, rather than
silently ignoring unsupported policy. Manual masks/depth must already match the
canonical oriented grid; depth is measured camera-Z meters, never brightness.

Tools are compiled once per Swift source/compiler, OS build and architecture.
Photo keys include actual source/mask/depth bytes and tool revision. Capture
metadata records rights independently of geometry inputs: changed credits refresh
metadata without recomputing masks; changed shots leave photo preparation cached.
Receipts verify every declared artifact's size and SHA-256 on reuse. Concurrent
writers reject with an actionable lock path. Failed/cancelled stages publish no
receipt. Hard crashes may leave `.partial-*` directories and `.lock` directories;
verify the owning process has stopped before removing the lock. Never infer
readiness from their presence or reuse a checkpoint with different inputs.
Corrupt entries reject explicitly; use a new cache root/revision after preserving
any needed diagnostic evidence. These are stage cache foundations, not the full
one-call scene/cache/publication API yet.

Capture guidance: photograph a rigid, stationary subject with stable lighting,
focus and exposure; orbit in small overlapping steps at several elevations, and
include overlapping transition views between passes. Photograph cavities and
thin edges from several angles. A rotating object requires foreground masks;
rulers and static supports must be excluded. A minimum count is only a syntax
check. Automatic segmentation chooses the largest foreground instance and can
select an incorrect object: inspect every source/mask pair, especially thin
edges, grazing views and elevation transitions. This backend cannot independently
apply separate alignment/reconstruction masks or calibrated pose overrides, nor
certify disconnected/mixed subjects before reconstruction. Reflective/transparent,
moving, textureless and poorly covered subjects remain unsupported quality risks.

Additional verification:

```bash
node --test tests/image-scene-prepare.test.mjs
node --test tests/image-scene-native-prepare.test.mjs
```

The second command compiles actual Swift tools and prepares three cleared real
reference photographs, without reconstruction/texturing. It tests relocation,
real mask decoding, cache reuse and rights-only metadata refresh. It is not
photographic-fidelity evidence and skips outside macOS.

`reconstructCapture(capture, { cacheDirectory, detail, signal, onProgress })` in
`../reconstruct.mjs` wraps the selected native depth/fusion/texture boundary.
It hashes prepared image/mask/depth bytes and exact executable/configuration,
requires every expected source pose plus a matching success report, and caches
only validated native outputs. It rechecks inputs before publication. Failed
attempts retain `failure.json`, partial model and isolated checkpoints under
`attempts/`; they never receive a success receipt. These are reconstruction-stage
outputs, not a final clean/visually accepted scene. The current native backend
exposes no per-triangle visibility/confidence map; observed-surface uncertainty
and camera-envelope validation remain required before scene publication.

## Photographic GLB conversion

`convertReconstructedMesh(modelPath, { cacheDirectory, blenderPath, signal,
onProgress })` in `scripts/image-scene/convert.mjs` converts a native USDZ through
a separate headless Blender process. Supply the absolute installed executable
path (tested Blender 5.2.3). It preserves the reconstructed mesh and source atlas
resolution; it performs no smoothing, hole filling, geometry repair or texture
painting. It rejects missing UVs, missing photographic textures, unsupported
color graphs and nonfinite/flat geometry rather than approximating them.

```js
import { convertReconstructedMesh } from './scripts/image-scene/convert.mjs';
const converted = await convertReconstructedMesh(reconstruction.modelPath, {
  cacheDirectory: '/absolute/cache',
  blenderPath: '/Applications/Blender.app/Contents/MacOS/Blender',
});
```

The GLB embeds its photographic textures with `KHR_materials_unlit`. Generated
normal/AO/roughness/displacement maps are omitted; baked illumination stays in the
color image. The audit records source/output SHA-256, triangle count, source atlas
dimensions, glTF Y-up bounds, and the translation the shared `loadGltfHero` applies
to center X/Z and rest Y at zero. It does not independently establish metric scale
or observed-surface coverage. Keep `toneMapping="linear"` and physical lighting
disabled in photographic playback.

Cache keys include source bytes, conversion script, executable and Blender version.
Only hash-verified GLB/audit/log outputs receive a reusable stage receipt. The
standalone Blender script may leave a partial GLB on interruption; consumers must
use the cache receipt, not mere file existence, as the completion boundary.
A converted artifact still has visual approval pending and is not a ready scene
bundle. Run `python3 -m unittest discover -s scripts/image-scene/backend -p 'test_*.py'` and
`node --test tests/image-scene-convert.test.mjs tests/image-scene-prepare.test.mjs`.

Format references: [Khronos unlit specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_unlit/README.md),
[Blender glTF export documentation](https://docs.staging.blender.org/manual/en/latest/addons/scene_gltf2.html).
