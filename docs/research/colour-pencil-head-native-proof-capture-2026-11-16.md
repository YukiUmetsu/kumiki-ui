# Coloured-pencil Stage 1 — exact-byte photographic evidence capture

**Implementation PR #465, follows merged head-only #444 and measured-proof gate #459.**

## Problem fixed

The earlier fidelity gate only validated whether `sha256` looked like a
64-character hexadecimal digest and whether submitted RGB numbers seemed
plausible. A typed string was not evidence the photographer's actual file
or a native 960×540 / 540×960 render had been used. The new tool
`scripts/pencil-head-native-proof-capture.mjs` reads **both original LOCAL
files**, calculates each real SHA-256, decodes JPEG/PNG with Chromium, and
calculates five mean pixel colors from the supplied real-image sample
rectangles. It returns only measurements/provenance JSON, **not pixels**.

This does not grant photographic or artist approval. Landmarks are still
**human-annotated independently on both images**, and checking source
license, attribution and complete skull visibility still requires human
review.

## Actual usage (Mac or CI)

1. Select one legal, unclipped adult head photograph from a source whose
   license permits the intended technical study. Download its unchanged
   original JPEG/PNG **to a local folder outside the repository**.
2. Capture the current Storybook export at native resolution (16:9 or 9:16),
   with **no construction/QA overlay**, after all drawing frames finish.
3. Annotate **the 18 Stage-1 head-contour points** separately on the photo
   and the native screenshot. Never copy the ANAT1 model anchor coordinates
   into either independent-photo set. Also choose five actual nonoverlapping
   rectangles inside the relevant head tonal surfaces of **each** image.
4. Build an annotation JSON object with exactly these top-level fields:

   | Property | Meaning |
   | --- | --- |
   | `source` | `{url, license, credit}` from the verified photographer and exact source URL |
   | `sourceLandmarks` | 18 `{id,x,y}` points in the original photo's own pixels |
   | `outputLandmarks` | 18 `{id,x,y}` points in the **real native output** pixels |
   | `sourceTones` | Five `{id,rect:{x,y,width,height}}` rectangles in original photo pixels |
   | `outputTones` | Same five roles in native exported screenshot pixels |

   **Tone IDs:** `highlight`, `light`, `halftone`, `core-shadow`,
   `reflected-light`. Landmark IDs are those exported by
   `HEAD_FIDELITY_LANDMARK_IDS` in
   `src/video/colored-pencil-head-fidelity.ts`. Rectangles must have
   integer pixel bounds, each side at least three pixels. Do not supply
   mean RGB or sha256: the capture computes both from the actual files.

5. Run:

   ```bash
   node scripts/pencil-head-native-proof-capture.mjs \
     --source /path/to/rights-cleared-source.jpg \
     --render /path/to/native-finished-film.png \
     --annotations /path/to/independent-head-annotations.json \
     > /path/to/head-photo-vs-native-evidence.json
   ```

6. Pass the resulting JSON to `evaluatePencilHeadFidelity`. A status
   of `measurement-ready` means **only that measurements passed the
   preliminary technical tolerances**; real-source provenance, visual
   silhouette construction, true tonal continuity, textured pencil strokes
   and independent artist review must still pass before approval.

## Capture design and negative controls

- Native original photo and render are never embedded in a drawable SVG,
  CSS, app bundle, or repository-generated artifact.
- No remote photo fetch, photo transformation, OCR, browser CORS
  bypass, or image-generation/AI reconstruction.
- File signatures are checked (PNG or JPEG); Chromium decodes the same
  bytes that were SHA-256 hashed. Canvas samples are composited on
  white paper when an image is transparent, so alpha cannot impersonate
  dark pigment.
- Capture rejects unsupported/truncated file types, missing metadata,
  bad rect sizes, overlapping ROIs, out-of-bounds ROIs, identical
  source/render hashes, files over 32 MiB and decodes over 60 million pixels.
- A local developer may use headless Chromium without network access;
  the tool merely decodes the already downloaded files.
- Targeted `node --test tests/pencil-head-native-proof-capture.test.mjs`
  verifies actual **native decoded pixels**, exact file SHA-256 and
  invalid-image/ROI failure paths. The lightweight changed-contracts
  workflow skips browser-only cases if Chromium is not installed;
  the focused foundation-proof workflow installs Chromium and executes
  all the tests. The tool does not expand the full repository CI matrix.

## Evidence still missing

At writing, **no license-reviewed reference photo has been accepted as
complete, uncropped, sufficiently detailed and properly 3/4 lit**.
The prior candidate audit in
`docs/research/colour-pencil-head-photo-fidelity-contract-2026-11-15.md`
rejects misleading helmet, top-down scalp, digitally enlarged tintype
and rights-warning scan sources. Capture can verify **file bytes and
measured pixels**, but it cannot independently verify that every
coordinate was annotated correctly, that license information is true,
or that the head looks realistic.

**Release rule:** Preserve the original pencil head in Storybook as
`head-outline-unapproved`; do not add eyes, hair, nose, mouth, ears or
other body parts until the Stage-1 reference comparison and artist review
are complete.
