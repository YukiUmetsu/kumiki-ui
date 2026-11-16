# CP-F1 Stage 1 — independent source-photo and native-render fidelity gate

**Status: BLOCKED / experimental; not artist-approved.** This follows the merged
[head-only restart #444](https://github.com/YukiUmetsu/kumiki-ui/pull/444).
The earlier 468-point ANAT1 face normals, 11 manually constructed cranial anchors
and five synthetic light categories are **drawing inputs, not evidence that the
portrait matches an actual human photograph**. Do not add the first eye, copy the
retired woman, or present the head as professional art until source verification.

## Purpose of new infrastructure

`src/video/colored-pencil-head-fidelity.ts` exports
`evaluatePencilHeadFidelity(evidence)`: a fail-closed structural comparison.
No photo or render is currently claimed as independently annotated. Calling it
without evidence returns `blocked / SOURCE_AND_RENDER_REQUIRED`. The original
CP-F1 film artwork and existing pencil drawing geometry are **untouched**.
Storybook's Coloured-pencil Drawing Foundation exposes the missing-evidence
checklist under the **new human #01** study only.

Required paired inputs:

- **One original licensed reference photograph** with a complete skull,
  temporal sides, zygions and chin, distinct three-quarter camera and useful
  five-value lighting; URL, source-author credit, reviewed license, true pixel
  dimensions, and **SHA-256 calculated from its exact raw image bytes**.
- **One unmodified final-native screenshot** of the actual Storybook/film SVG
  geometry, its pixel dimensions and its separate file-byte SHA-256.
- **Eighteen independently annotated 2D head-contour landmarks** in
  source AND render, on actual pixels: cranial apex; near/far parietal,
  frontal, upper temple, lower temple, zygion, malar, gonion and
  mandibular turns; menton. Every point is a feature of the **one head
  silhouette** being drawn at Stage 1. Do not require eyes, nose or lips
  that do not yet exist in the render. A later face-feature ArtCraft gate
  still separately requires its own independently measured landmarks.
- **Five actual sampled sRGB patches** in both images: highlight, light,
  halftone, core shadow, reflected light. Record each real ROI rectangle and
  measured mean RGB. Never infer the photographic values from ANAT1 lights.
- ArtCraft's **independent** source-vs-render 1× and 3× visual critique
  after numeric quality checks. `artistApproved` is always `false` by
  construction in the evaluator, including a green `measurement-ready`.

## Important numerical checks

1. Reject missing, duplicated, unknown or out-of-bounds points/tonal boxes;
   reject invalid or equal source/render digests and unverified license labels.
2. Normalize projected point locations by independently measured zygion span
   and cranial-apex-to-menton height. Report RMS discrepancy separately
   from absolute artboard placement — moving or uniformly scaling the
   reference crop must not count as a facial deformation.
3. Also compare **physical head width/height ratios**. Otherwise separate
   x/y normalization mathematically hides severe anamorphic stretching,
   allowing a squashed cranium to appear geometrically exact.
4. Validate native source and output value roles **independently**:
   highlight brighter than light, light brighter than halftone, halftone
   brighter than core shadow, with reflected light brighter than the
   core. Reject insufficient overall light-to-dark range. Five identical
   grey swatches must never pass because they numerically match each other.
   Reject overlapping source/output patches and crossed near/far skull
   topology before trusting computed similarity.
5. Compare normalized native RGB luminance across the five nonoverlapping
   semantic regions and report matching error independently from value
   quality; **never** infer that a head is lifelike.
6. The evaluator checks digest format, **not** actual source file bytes;
   the capture/annotation workflow must verify those bytes separately.
   A copied or fabricated string is not evidence. Human judgment remains
   mandatory even when `measurement-ready` passes.

## Source-image audit — inspected originals, not thumbnail guesses

**No image has passed full-head Stage 1 reference approval.** During an
independent media-file review of Commons originals (2026-11-16), we rejected
three misleading candidate files and recorded the exact reason. License status
is never a substitute for checking the subject, camera and source resolution.

| Source and author | Verified status | Actual contents / problem |
| --- | --- | --- |
| [Baldness.jpg](https://commons.wikimedia.org/wiki/File:Baldness.jpg), Bạch Linh Phong, CC0 1.0 | **REJECT** | The original is a motorcycle-traffic street scene: only the **rear of a helmeted rider** is visible. No bare skull, facial plane, jaw, or 18 head points. Its Commons filename is misleading. |
| [Bald head.jpg](https://commons.wikimedia.org/wiki/File:Bald_head.jpg), Smobserver / David Lewis, CC BY-SA 3.0 | **REJECT** | The 640×480 original shows a person's **top-down bowed scalp**, without a usable face or jawline. Cannot annotate a three-quarter full-head silhouette. |
| [Three-quarter face portrait of man with beard, LOC LCCN2006688331](https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg), Library of Congress / circa 1860, public domain | **REJECT for high-fidelity skin microtexture** | The advertised 5153×6408 JPEG was explicitly digitally upscaled from **823×1024**, as documented on its Commons version history. Do not mistake interpolated pixels for fine anatomical/skin reference. It may remain a historical photographic composition reference only. |
| [Alexandre-debieve-an-older-bald-man.jpg](https://commons.wikimedia.org/wiki/File:Alexandre-debieve-an-older-bald-man.jpg), CC0 1.0 | **REJECT (prior review)** | The photo lacks complete scalp and lower chin in the chosen crop; not a valid complete-head source. |
| [CLEMENCEAU, Georges, Nadar, GALLICA (cropped).jpg](https://commons.wikimedia.org/wiki/File:CLEMENCEAU,_Georges,_Nadar,_GALLICA_(cropped).jpg), photograph Paul Nadar | **REJECT / rights unresolved** | The Commons source page prominently warns the BnF-derived historical original **may not be public domain** even though the uploader applied a CC0 tag to the edited scan. Do not assume the uploader can license the underlying work. |

**Required next selection:** a photograph whose original pixel data (not an
AI image, print scan, or enlargement) visibly contains the **entire unclipped
3/4 cranium, temples, zygions, jaw and chin**, with credible side lighting,
well-resolved surfaces, and explicit rights at the photographer/source.
Record the file's actual byte SHA-256, author, license, source URL and
resolution **after** direct photo inspection. No pixels from any of the
above images were included in the programmatic head.

## Safe handoff

- Hash the actual unchanged files, e.g. on macOS:
  `shasum -a 256 /path/to/source.jpg /path/to/native-final.png`.
- Use independent source and actual-render annotation, not generated mesh
  anchor dumps in either field.
- Import `evaluatePencilHeadFidelity` from
  `src/video/colored-pencil-head-fidelity.ts` and pass the typed
  `PencilHeadFidelityEvidence` with paired coordinates and measured pixels.
- Inspect failed error codes, geometry RMS and tonal mismatch. Repeat
  photographed-source construction and pencil rendering before facial
  details. Do not "pass" the gate by moving outputs or reducing thresholds.
- Keep the original art experimental in Storybook until independently
  approved; the gate is not an automatic art-certification system.

## Regression test strategy

`tests/colored-pencil-head-fidelity.test.ts` uses synthetic numeric
**negative controls only**, never pretending to be an annotated photograph.
It asserts source absence, invalid rights and hashes, missing/out-of-bounds
landmarks, distorted/crossed near/far contours, swapped-value and
flattened-gray five-tone negatives, overlapping or invalid sampling ROIs,
duplicate source/render signatures and isotropic-scale invariance.
`tests/e2e-storybook/colored-pencil-foundation.spec.ts` checks the fail-closed
photo-proof UI in both aspects and confirms fox content remains unchanged.
