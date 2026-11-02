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

Requires macOS 14+, an installed Swift SDK and supported photogrammetry hardware.
This optional boundary uses the system RealityKit framework; no Apple framework
code or model weights are shipped in Kumiki. Other platforms need a separate
local backend. The machine's actual OS build identifies the framework revision.

```bash
swiftc -parse-as-library scripts/image-scene/backend/object_capture.swift \
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

Actual real-photo and EXIF round-trip tests pass. Manual-mask framing validation
exists; a dedicated wrong-size override regression test remains to be added.
This tool is not yet connected to the one-call orchestrator/native reconstruction.
The reconstruction benchmark above used the framework's automatic masking.
