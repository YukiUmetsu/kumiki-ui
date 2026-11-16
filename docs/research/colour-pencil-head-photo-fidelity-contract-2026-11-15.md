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
- **Eighteen independently annotated 2D semantic landmarks** in source AND
  render, on the actual pixels: cranial apex, near/far cranium, near/far
  temple, near/far zygion, near/far gonion, menton, glabella, sellion,
  pronasale, subnasale, near/far orbit, near/far mouth corner.
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
4. Compare normalized native RGB luminance across all five semantic regions.
   Report whether measurements meet preliminary numeric tolerances,
   **never** infer that a face is lifelike.
5. The evaluator checks digest format, **not** actual source file bytes;
   the capture/annotation workflow must verify those bytes separately.
   A copied or fabricated string is not evidence. Human judgment remains
   mandatory even when `measurement-ready` passes.

## Source candidates (reference scouting, NOT approved image inputs)

| Source | Rights at source | Verification needed |
| --- | --- | --- |
| [Baldness.jpg (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Baldness.jpg) | CC0 1.0, self-published photo | Independently inspect whether the face, entire scalp and chin are simultaneously visible and 3/4. Do not claim matched geometry without inspecting pixels. |
| [Bald head.jpg (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Bald_head.jpg) | CC BY-SA 3.0, Smobserver | Low-resolution 640×480 may be unsuitable for 18-point alignment; preserve author attribution and license obligations. |
| [Three-quarter face portrait of man with beard, LOC](https://commons.wikimedia.org/wiki/File:Three-quarter_face_portrait_of_man_with_beard_LCCN2006688331.jpg) | US public domain / LOC tintype, circa 1860 | Historical lighting and head contours may be hard to measure; not the original intended modern face. |
| [Alexandre-debieve-an-older-bald-man.jpg](https://commons.wikimedia.org/wiki/File:Alexandre-debieve-an-older-bald-man.jpg) | CC0 1.0 | Rejected in prior #444 art review: cropped scalp and lower chin; must not use for complete head gates. |

These candidates were not copied, cropped, traced, redistributed or silently
used to generate the current editable SVG head. Confirm **one** suitable
reference photograph before supplying evidence.

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
landmarks, distorted proportions, missing/corrupted swatches, duplicate
source/render signatures and isotropic-scale invariance.
`tests/e2e-storybook/colored-pencil-foundation.spec.ts` checks the fail-closed
photo-proof UI in both aspects and confirms fox content remains unchanged.
