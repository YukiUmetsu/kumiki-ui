# ArtCraft CP-F1 — independent source and native-render annotation atlas

**PR #472** · Human #01 · Stage 1 head-only · artist quality still **unapproved**.

## Why this now exists

Merged PRs [#444](https://github.com/YukiUmetsu/kumiki-ui/pull/444),
[#459](https://github.com/YukiUmetsu/kumiki-ui/pull/459),
and [#465](https://github.com/YukiUmetsu/kumiki-ui/pull/465) created
the head's ANAT1 material primitives, the strict `18 contour + 5 tone`
fidelity evaluator, and a CLI which hashes/reads real local image bytes.
The missing practical step was **how a reviewer independently places
semantic points and swatch boxes on BOTH the actual photograph and the
native exported vector screenshot**. It was too easy to pass model-generated
anchors into both sides and make the output appear accurate without ever
measuring a photograph.

## Annotation workflow

In Storybook's **Video Production / Film Looks / Colour-pencil** group,
open **ArtCraft · Source/native head contour + five-tone annotation**.

1. **Source panel:** select an unchanged *local* JPEG or PNG of a full
   uncropped 3/4 head, whose author, source URL and rights have been
   reviewed externally. Image bytes remain in the browser as a
   revocable `blob:` URL; no fetch, upload, tracing or face-recognition.
2. **Output panel:** select the *actual finished native* 960×540 or 540×960
   screenshot of **Human #01's Stage-1 head** from Storybook, with
   diagnostic overlays hidden. Do not use a synthetic second reference
   or recolored copy of the original source image.
3. In each panel, use **18 cranial contour points** mode. One click places
   the selected point in that image's own intrinsic-pixel coordinate
   system, and advances to the next named point. Revisit a name through
   the dropdown if it needs correction. The source and output placements
   remain separate; no source-to-output cloning.
4. Switch to **five tonal rectangles**. Choose the semantic role and
   drag a nonoverlapping rectangle over that *actual* head value plane.
   Capture highlight, light, halftone, core shadow, and reflected light
   independently in both images. Invalid overlaps/out-of-bounds/too-small
   boxes are rejected with visible error; the prior state remains intact.
5. Enter the **actual original source page**, reviewed license, and
   photographer attribution. The license must be explicitly selected;
   there is no default rights claim.
6. Export the annotation JSON. It contains only 18+18 image-pixel
   coordinates, 5+5 bounding boxes and provenance. It cannot contain
   source/render bytes, synthetic RGB, a fabricated SHA, biometric
   recognition, copied code-generated landmarks or artistic approval.
7. Run the exact-byte proof capture from #465:
   ```bash
   node scripts/pencil-head-native-proof-capture.mjs \
     --source /originals/rights-verified-photo.jpg \
     --render /evidence/native-final-screenshot.png \
     --annotations /evidence/pencil-head-independent-annotations.json \
     > /evidence/pencil-head-measured-evidence.json
   ```
8. Evaluate the resulting real pixel/byte data via
   `evaluatePencilHeadFidelity`. Geometric and tonal thresholds are
   **preliminary technical quality filters**, not aesthetic approval.
   If the real head is still pale, hatching is stubbly, or the shape
   differs from the source, reject and redraw the **head itself** before
   moving to one eye, nose or any other facial feature.

## Technical constraints

- Exactly **one new human head**. The retired woman was removed in #444;
  her identity, geometry and photo must never be reintroduced.
- Source file and render file are read by the browser using user-selected
  local files, `URL.createObjectURL` and native `HTMLImageElement`.
  Blob URLs are revoked on replacement/unmount.
- Overlay `<svg viewBox="0 0 intrinsicWidth intrinsicHeight">` shares
  the untransformed image pixel coordinate grid and is rendered precisely
  atop that image, not a scaled thumbnail with ambiguous CSS object-fit.
- Core math is in
  `src/video/colored-pencil-head-annotation.ts`, deliberately testable
  without DOM, image recognition, or Storybook. The separate atlas UI is
  `src/video/colored-pencil-head-annotation-atlas.tsx`.
- **No photograph** is embedded in the exported SVG, texture shaders,
  output frame, Git repo, source documentation or bundled Storybook build.
  A user-selected image exists only in that browser tab. The JSON file
  contains coordinates and license/author information, not raw pixels.
- Large / corrupt / invalid files fail closed; file replacement clears
  only that image's annotations, never the other side.
- Native pointer/event mapping and two-sided independent state, bounds,
  tone overlap, exact 18+5 export completeness, license requirements
  and irreversible image contamination are covered in
  `tests/colored-pencil-head-annotation.test.ts` and focused Playwright.
  This is one narrowly scoped ArtCraft story under the existing
  Colour-pencil sidebar.
- A selected photograph is an **art technique/anatomy reference**. Do not
  infer that the new head depicts or identifies the photographed real person.
  Do not claim a specific source license based only on a filename or
  automatically approve art through numerical proximity.

## Research and photo-source restrictions

The earlier source audit in
`docs/research/colour-pencil-head-photo-fidelity-contract-2026-11-15.md`
rejected images with helmets or obscured skulls, top-down-only scalp,
upscaled old scans, misleading metadata and unclear rights. New candidates
must be inspected as real photographs, not image-search thumbnails.
A self-uploaded Commons reference can be CC BY/CC BY-SA/CC0, but the
specific uploaded image must have *both full head and credible 3/4 angle*,
not simply a 'portrait' filename.

**Pending:** independently inspect and select a rights-verified full-head
3/4 source with sufficient natural tonal range, capture its exact unmodified
bytes, then annotate it and the actual film-output head. This PR adds
no pretend annotations, no finished human, and no unconditional merge of
unapproved artwork.

## Stage 2 — pixel-precise close inspection, without inventing evidence

The Stage-1 head contour is **still not approved**. Source and film
still need an independently selected, rights-reviewed 3/4 photograph and
real source/output pixel measurements. A screen-fit photograph makes an
individual 1–2px mandibular boundary or atlas point impossible to place
reliably. The interactive atlas therefore now supports **Fit / 2× / 4× /
8× inspection** separately on each original image, with a horizontally
and vertically scrollable crop. The `<img>` and `<svg>` are scaled
together, and the original-pixel `viewBox` is unchanged. No pixels are
resampled or substituted in the output JSON.

Selecting a placed landmark or tonal ROI and using the Left/Up/Down/Right
buttons translates it by exactly **one native image pixel**. Focus the
image and use arrows for the same correction; Shift + arrow moves ten
original pixels. Errors reject moves outside the original dimensions or
overlapping another real tone rectangle. Moving a tone does **not**
change its size or independent mean-RGB sampling area. Annotations for
the other image remain byte-identical. The original local-only image
handling, file replacement rules and license gate are unchanged.

**Source-led drawing comparison (technique references only):**

| Axis | First-party observation | What to inspect in our Stage-1 head |
| --- | --- | --- |
| Topology | [Elena Pancorbo, original portrait art](https://www.elenapancorbo.com/originalesoriginals/bajacalidad-23): cranium, brow/temple, malar wedge and chin read as connected planes, not separate patches. | Near/far zygion and mandibular turns must continue into the crown and menton without sudden width jumps. |
| Flow | [Janie Gildow, pencil pressure and layering](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): multiple low-pressure passes follow the actual curvature. | Study tangent continuity along temporal and cheek turns at 2× and 4×; do not substitute parallel screen-space hatch. |
| Edge | [Elena Pancorbo, original portraits](https://www.elenapancorbo.com/): sharply controlled mouth/eye/lash edges sit beside soft cheek volume; this head has none of those features *yet*. | Check only the paper-to-cranium outside boundary and deliberately soft interior value-plane changes. No false feature lines. |
| Material | [Caran d'Ache, coloured-pencil layering](https://www.carandache.com/gb/en/blending-colours-with-coloured-pencils): transparent pigmented layers make value/chroma depth without flat bitmap fill. | Inspect the six source-authored head pigment planes and actual ANAT1-surface strokes for tooth and shape at original/native scale. |
| Source credibility | [Commons original photo example](https://commons.wikimedia.org/wiki/File:Portrait-Person-Old-Man-Man-Head-1615262.jpg), credited to rottonara, CC0. Original 4912×3264; the photo is nearly frontal with the skull covered by a head scarf. | **REJECT for this gate:** copyright permission and high resolution do not establish unobscured three-quarter cranial contour. Do not annotate or mark as an approved source. |

No other artist's artwork is copied into shipped characters or
Storybook. The precision controls are testable *measurement tools*; no
unmeasured anatomical or stylistic improvement is claimed. A final
ArtCraft release requires a real source photograph, native 1×/3×
comparison, verified contour/tonal evidence, and an independent artist
decision **before drawing the first eye**.

### Stage-2 verification

- `tests/colored-pencil-head-annotation.test.ts`: pure pixel translation,
  immutable other-side coordinates, ROI area preservation, overlap/bounds
  fail-closed and zero-change identity.
- `tests/e2e-storybook/colored-pencil-head-annotation.spec.ts`: native
  Chromium on **both original local images**, actual 2× pointer placement
  at 24×24 intrinsic pixels, one-pixel button correction, ten-pixel
  keyboard correction, unchanged 18+5 export rules and working fit view.
- CI in `colored-pencil-foundation-proof.yml` exercises both tests with
  the existing physical-pencil nonregression suite. CI and screenshot
  evidence do not count as artistic realism approval.
