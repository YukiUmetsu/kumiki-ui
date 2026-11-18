# Crayon ArtCraft F1 — V63 connected facial value study

**Status:** experimental `!dev`; ART HOLD; not approved for release.

## Scope

V63 applies source-sampled color and pressure corrections to seven existing native wax planes over the V57 scene. It does not change face geometry, hair geometry, paper, camera, animation timing, or the source photograph. The variant is available in Storybook and the V60 native-PNG review workbench so it can be compared without replacing the baseline.

Patched elements:

- `lower-lid-near`
- `cheek-malar-cast`
- `cheek-malar-bounce`
- `nose-root`
- `nose-dorsum`
- `nose-sidewall-form`
- `jaw-underside`

The six calibration witnesses are 7×7 medians from the frozen 608×1082 CC0 browser screenshot and the exact V57 native render. They are source-space measurements, not sampled pixels inserted into the output.

## Native evidence

- Workflow: [Crayon ArtCraft source-native browser proof, run 44206798514](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44206798514)
- Artifact: `14385125580` (`crayon-artcraft-source-native-inspection`)
- Source SHA-256: `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`
- V57 native SHA-256: `59bf9923d0bdc83d00d13c4a5b362eaf2d1a4aaaafed8a5ffc9de3958d8e72bd`
- V63 native SHA-256: `fb9756ca416f3e46cb55087dcd70fb33f52e396cc7fa13a09b47cefc159360c0`
- V60 sidecar: `v60-native-candidate-V63-299.json`
- Exact camera/frame: 608×1082, frame 299, detail 1.

The source is a browser screenshot of the public-domain CC0 photograph, not the original camera JPEG. The source image is never composited into the illustration.

## Measured result

| Region | Source RGB median | V57 RGB median | V63 RGB median | V57 error | V63 error |
| --- | --- | --- | --- | ---: | ---: |
| Infraorbital cast (255,583) | 141,94,80 | 179,148,135 | 179,149,135 | 49.00 | 49.33 |
| Lateral undercheek (133,702) | 123,85,67 | 173,141,126 | 170,138,124 | 55.00 | 52.33 |
| Nasal root (333,533) | 124,95,90 | 180,151,139 | 175,146,136 | 53.67 | 49.33 |
| Malar light return (175,615) | 237,206,186 | 224,189,170 | 224,192,174 | 15.33 | 13.00 |
| Nasal ridge return (367,595) | 226,192,174 | 203,168,152 | 201,165,150 | 23.00 | 25.33 |
| Mandibular roll (261,830) | 177,133,108 | 191,158,142 | 189,157,140 | 24.33 | 22.67 |

Four of six witnesses move closer to the source. Two regress slightly. The V63 edit changes 33.67% of pixels in the face ROI; the hair-crown and foliage control regions remain unchanged. At 1×, V57 and V63 remain visually very similar. This is a modest color-plane calibration, not a demonstrated overall likeness improvement.

## ArtCraft v7 geometry-and-tone screen

The source points remain the frozen 18 source observations. Candidate points were newly observed on the actual V63 native PNG. They were not copied from the source points or from the older PR #281 render.

Candidate pixel observations:

| Landmark | x | y | Landmark | x | y |
| --- | ---: | ---: | --- | ---: | ---: |
| face_top | 281 | 288 | face_left | 80 | 680 |
| face_right | 506 | 700 | chin | 399 | 859 |
| eye_far_inner | 414 | 522 | eye_far_outer | 478 | 514 |
| eye_near_inner | 319 | 545 | eye_near_outer | 216 | 557 |
| brow_near_peak | 299 | 484 | nose_root | 373 | 535 |
| nose_tip | 419 | 631 | nostril_near | 403 | 643 |
| mouth_left | 355 | 745 | mouth_right | 498 | 720 |
| upper_lip | 430 | 721 | lower_lip | 430 | 762 |
| cheek_near | 210 | 665 | hairline_center | 281 | 289 |

The v7 script returned **geometry_and_tone_pass** with face-aspect error 0.00873 and maximum normalized landmark error 0.04370 (fixed limit 0.085). Value-region contrast p90–p10:

| Region | Source | V63 | Fraction of source |
| --- | ---: | ---: | ---: |
| Eye socket | 127 | 71 | 0.56 |
| Nose planes | 107 | 44 | 0.41 |
| Cheek planes | 91 | 59 | 0.65 |
| Lips | 109 | 60 | 0.55 |
| Hair | 82 | 46 | 0.56 |

This is a builder-observed negative gate, not independent artist approval. The gate's `artistic_approval` remains false.

## Visual critique and next work

The source/candidate comparison still shows a noticeable difference in organic facial volume and material behavior. The eye, nose and mouth are recognizable and their measured anchor positions fit the source, but the skin planes remain stylized and relatively uniform; the nose-side transitions and teeth/lip construction need a more convincing, connected wax treatment. V63's 1× change is too subtle to call a major quality improvement.

Next work should prioritize independent 1×/3× visual review and actual 300-frame playback before further pigment tuning. Any subsequent edits must protect the measured geometry and retain the V57 negative control.

**No release approval. No merge approval.**
