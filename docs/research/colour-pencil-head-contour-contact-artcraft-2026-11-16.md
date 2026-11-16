# CP-F1 / ArtCraft — cranial-rim pigment contact, one new human head

**2026-11-16 · Human #01 · anatomical blockout only · UNAPPROVED.**

## Reference & deconstruction, before geometry/pigment work

This stage begins with the only valid anatomical base already in the renderer:
ANAT1's 23 distinct visible lower-face contour points, plus 11 separately
sculpted cranial-vault points. Previous Storybook proof found that a flat
ANAT1 face mask (which ends at the hairline) is not a full adult skull.
The user had rejected the earlier woman, the overly cylindrical vault and
flat waxy/ellipse pigment. The new head remains an experimental blank
head, not a real photographed person's portrait.

- **Physical 3/4 skull source, no art pixels copied:** [Circa24 / Marijo
  Readey, *Human Skull portrait*, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Human_Skull_portrait.jpg).
  Original explicitly recorded as **2592×3888**, original own-work
  photograph from **9 February 2013**. Commons lists the creator's
  license on its file page. Its 3/4 view exposes the parietal→frontal
  curvature, temporal inset, malar wing and mandibular corner, but it
  contains **muscle-attachment marks**, no skin, and therefore cannot
  supply a five-tone adult flesh photograph or exact Human #01 likeness.
  It is a **bone-structure technique reference**, not an approved
  production face source.
- **Anatomy:** [OpenStax Anatomy & Physiology 2e §7.2:
  Skull](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull).
  The rounded brain case and lower facial bones are distinct but
  continuous volumes; the malar/temporal plane turns into the mandible.
- **Pigment/line technique:** [National Portrait Gallery — Drawing
  techniques and materials](https://www.npg.org.uk/schools-hub/drawing-techniques-and-materials)
  shows how Sargent used opposing graphite hatches and local fine line
  pressure in the face rather than a single uniform parallel hatch mask.
  [Elena Pancorbo's portrait portfolio](https://www.elenapancorbo.com/)
  and [Jesse Lane's original artwork](https://www.jesselaneart.com/gallery)
  are **medium-only** references, never legal source masks to copy.

No licensed reference photo has yet been independently annotated
against the actual native film output with all 18 head-contour landmarks
and five flesh values. That release hold remains **unchanged**. In
particular, do not invent a photo SHA, landmark coordinates or source
RGB patches from generated 3D normals. A normal-field band remains a
drawing input, not observational evidence.

## Why add an inward contour-contact pass

The original 6 area pigments were *ellipses expressed as fixed percentages
of a bounding box*, plus 5 ANAT1-light surface passes. The macro scene
could read like sparse, floating scratches or isolated salmon patches.
Adding more uniform area hatch without geometric attachment would not
fix this. A small, real pencil pressure field is now derived from the
**unchanged dense stage-1 outer contour** itself:

| ArtCraft axis | Original problem | New authored response |
| --- | --- | --- |
| Topological continuity | Near/far temple and jaw fibres appeared unconnected to the actual boundary. | Sample the same 23 jaw + 11 vault vertices used by the native film; do not substitute a second oval, ellipse or template face. |
| Vector flow | A fixed 64° or local ellipse angle cannot describe the entire skull. | Derive the local Catmull-Rom tangent at each physical contour segment and orient every fibre to that tangent. |
| Edge characteristics | Uniform dark rings become cut-out outlines rather than soft material. | Use three inner offset bands: 1.5px cool turn, 4.3px warm scumble, 7.1px lighter paper-tooth return; local jitter and skipped marks preserve nonuniform contact. |
| Tactile depth | A simple filled blush hides the tooth and makes hairless heads look plastic. | Distribute **six full physical subpasses** (three palette values × two separate contact groups) across the original 54 editable anatomically laid pigment traces. Preserve all 77 original head traces, every original SVG path as a byte-identical prefix, hue/pressure, five ANAT1 bands, all three 114-mark colour fans, and fine marks. Capacity-aware distribution honors the 80-trace-per-region and 12k-path limits without discarding a single contact. |
| Animation/time | Static filter/glow can hide draw-in flaws; editing may reorder existing traces. | Preserve original outline and 350-frame shot; new subpass contacts inherit the original value-matched pigment plane timings (three separate transparency/pressure layers) and preserve the three original 114-mark construction fans, with one region and no image/foreignObject/filters. |

These authored subpass paths are **inside the region's original clipping path**.
The local right/left normal uses the actual polygon winding, so no
separate template identity, incorrect mirror image or off-surface
stylization is introduced. The parent still has a single complete
sculpted head outline, original stage frames, five ANAT1 shadow bands,
all previous six pigment planes and unchanged seed semantics. This is
not a smoothing/flattening simplification.

## Interactive native art review

In **Video Production → Film Looks → Colour-pencil → Drawing Foundation**:
choose **Human portrait / unapproved**, select the head-macro inspection
focus, then toggle **Anatomy-connected contour pigment · A/B**. The
unchecked state displays exactly the same original 23+11 silhouette and
all previous pigment layers; checked adds only the new physically rooted
contacts. Inspect both 960×540 / 540×960 and frame 169, 194, 231, 254,
335 at native 1× and 2.15× macro. The scene marks
`data-km-contour-craft=on|off|not-applicable`. This option does nothing
to the fox/valley.

Rejection conditions: a dark sticker-outline, broken cheek/jaw
transition, black outer ridge, floating strokes outside the contour,
loss of physical paper tooth, clipping at the jaw or any render drift
between toggle off→on→off. The result remains **art rejected** until
the actual full, uncut 3/4 photograph and native screenshot are manually
annotated and reviewed. A green screenshot comparison cannot confer
ArtCraft approval.

## Verified automated contracts

- `tests/colored-pencil-first-character-craft.test.ts` checks that
  the exact original head path, dimensions, 77 existing trace IDs and
  original path prefixes are untouched by the optional pass; six new
  spatial contact subpasses are distributed into the 54 existing
  source-authored pigment fields, while the three 114-mark value fans
  remain byte-identical,
  with abundant finite short strokes, deterministic seeds, valid pressure, and
  independence from fox/valley are enforced.
- `tests/e2e-storybook/colored-pencil-foundation.spec.ts` renders two
  native aspect ratios, takes source head A/B screenshots, checks
  pixel difference only when the material pass is on, exact screenshot
  reversion, unchanged single-head geometry/no raster image and
  not-applicable fox behavior.
- Scoped `colored-pencil-foundation-proof.yml` also fixes an old
  malformed joined `paths` entry so independent measured-evidence QA
  test modifications trigger the actual CI job.
- Existing original-source/native-render **independent 18+5 measurement
  gates**, SHA256, contour residuals and private checkpoints continue to
  block any artistic promotion.
