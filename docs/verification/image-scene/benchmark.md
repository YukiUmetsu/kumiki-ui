# Multi-view scene benchmark — 2026-11-02

**Status: running; no photographic-fidelity acceptance yet.**

## Real source and fixed split

[Original MNHNL source dataset](https://data.public.lu/en/datasets/3d-reconstruction-of-a-fossil-vre-gpr21-via-photogrammetry/), published by Musée national d’histoire naturelle Luxembourg, explicitly licenses the original photographs and derived files under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Raw source data is not MIT-licensed. Preserve attribution in redistributed derivatives.

- Downloaded original JPEG archive: 930,385,482 bytes.
- SHA-256: `0b683f51ab97b4503fc7b8d781f9979e352ff5b63e3f9141e7a19cf9f9a0ae33`.
- 226 image files; exclude `VRE-GPr21-001.JPG` after inspection because it depicts a color chart.
- Fixed 202 training / 23 held-out photos. Held-out photographs were not supplied to either reconstruction frontend.
- Source photographs are 6960×4640. Preserve the encoded originals; benchmark downsampling inside a backend is recorded separately.
- The subject changes orientation, includes side/back views and sits against dark backgrounds. Some views include rulers and supports. This is a demanding object-isolation benchmark, not a claim that arbitrary capture modes already work.
- Exact per-photo hashes, excluded files and split are in `src/craft/fixtures/image-scene/sources.json`; reproduce using `benchmark_capture.py`.

## Machine and actual tools

Apple M4, 10 CPU cores, 24 GiB RAM, macOS 26.6.2 (25G83), arm64; approximately 49 GiB free disk at start. Swift 6.4, Blender 5.2.3 LTS, FFmpeg available. RealityKit `PhotogrammetrySession.isSupported` returned true.

| Candidate | Actual execution | Current outcome |
| --- | --- | --- |
| Apple RealityKit Object Capture | Real 202-photo reconstruction, medium detail, automatic object masking requested | In progress; output not visually assessed |
| COLMAP 4.2.1 + OpenMVS 2.4.0 | Official macOS arm64 executables launched; CPU feature extraction (1600 px maximum), sequential matching (overlap 8), sparse mapping | In progress; dense mesh/texturing not yet run |

The OpenMVS release lacks the `CreateStructure` frontend described by the newer upstream wiki. The comparator therefore uses COLMAP for sparse alignment. Dense COLMAP CUDA stereo is not available on this machine. OpenMVS remains an external AGPL tool and is not copied into the MIT runtime.

## Acceptance card — fixed before optimization

Inspect front, side, three-quarter, back and macro views, including the orange/white fossil surface divisions, thin perimeter, cavities and chipped outer rim. Match original cameras where calibration supports it. Unregistered comparisons are qualitative; do not label them pixel-accurate evaluations.

The first moving benchmark must preserve recognizable surface detail and silhouette at 1920×1080, avoid detached rulers/supports, missing surfaces, doubled contours, obvious seams, stretched texture or texture swimming during the tested motion. Review an unlit/baked rendering so new physical lighting does not conceal defects. Run push-in, restrained orbit and oblique paths; limit camera motion to supported surfaces. Repeat with independently framed portrait output.

Do not adopt a backend because its mesh exported or unit tests passed. Record numerical tolerances after measuring the baseline and before parameter optimization, with source-registration uncertainty. Record human acceptance separately from measurements and author inspection.

## Execution evidence and revisions

- Preliminary automatic reconstruction included the color chart. It was terminated and restarted with that non-subject observation excluded. It is not a final benchmark artifact.
- Source contact sheet inspected before backend selection; rulers/supports and subject rotations identified for later mask/geometry verification.
- Capture preparation tests: 6 passed after observed missing-module failure. Tested deterministic split, preserved source hashes, rejected unsafe paths/duplicate names/content, incorrect archive digest, unknown exclusions, and existing-output protection.
- Native Swift boundary tests: 3 passed after observed missing-source compilation failure. Tests compile the real adapter, query supported hardware, and reject invalid arguments/missing inputs/output overwrite. These tests do not reconstruct or certify a mesh.
- Existing relief/composite baseline: 13 tests passed.

## Remaining evidence

- [ ] First textured reconstructed mesh and neutral shape inspection.
- [ ] Original / held-out source comparisons with documented camera registration.
- [ ] Rendered push-in/orbit/oblique clips in actual Three.js.
- [ ] Mask and background-isolation review, including rulers/supports.
- [ ] Defect → correction → same-frame comparison log.
- [ ] Backend decision, time/memory measurements and final quality limits.
- [ ] Human photographic-fidelity review.

No public scene API, registry availability or completed pipeline is claimed by this benchmark record.
