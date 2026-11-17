# CP-F1 / ArtCraft: a 3/4 braincase-to-jaw reconstruction experiment

**16 November 2026 · Human #01 · unapproved artistic silhouette study.**
**No eyes, hair, prior woman, bitmap source masks, invented SHA-256, or
automatic photograph approval.**

## Independent source examination

Original 3/4 skull photograph: [*Human Skull portrait.jpg*,
Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Human_Skull_portrait.jpg).
The photographer is credited as **Circa24 / Marijo Readey**; dated **9
February 2013**; original **2592×3888**; license **CC BY-SA 3.0**.
The file page identifies this as a photographed physical skull with
major *muscle attachment* indicators. Observed from the genuine
500-pixel preview; no photo was copied into the source tree. The
physical object has no natural skin or flesh value regions.

The existing [OpenStax 7.2 skull anatomy
reference](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull)
supplies the cranium/facial-bone definitions. A photographed skull
is the correct *bone-topology* source, **not** an approval source for
Human #01's skin, likeness or five skin-tone regions.

### Five-axis visual deconstruction

| Source axis | Direct observation | Defect in existing native 960×540 screenshot | Drawing decision |
| --- | --- | --- | --- |
| Outer topology | The posterior parietal region projects as a substantial round mass behind the face, not a matching front-side arc; forehead turns inward above the orbit. | Human #01 had a symmetric tall potato-shaped upper vault. | New posterior occipital wing, flatter broad high-parietal arc, distinct shorter frontal drop. |
| Tangent/flow | A continuous occipital→parietal→frontal arc meets the temporal fascia before the malar wedge. The image has distinct jaw angle and smaller lower-face volume. | The top was pointed, temporal transition blunt, lower cheek read as a broad straight fall. | Four more independent upper control anchors (11→15, **+4**), controlled temporal recession and a bounded gonial turn. |
| Edge hierarchy | Braincase outside edge is continuous and convex except the anatomical temple/cheek transition. Internal muscle-mark paint is NOT a soft contour. | Uniform outline blended into large flat cheek, creating a sticker-like egg. | Keep the existing complete dry graphite outline and ANAT1 lower-face vertices; never trace muscle-marker paint as new face edges. |
| Volume/light | Broad cranium visually holds more volume than facial mask; hard bone/paint reflectance is not warm skin. | Light/saturation improvement from #497 does not repair shape. | Reproject all lower-face mesh vertices, landmark guides and area-weighted ANAT1 value normals using the *same oblique camera*; preserve all real pigment traces. |
| Time/material | The still photo is a structural anatomy reference, not an animation. | Independent drawing marks and 350-frame build are already elaborate. | Do not modify any frame timing, draw speed, pigment pressure, tone family or original 77+15 detail IDs. |

## Anatomical construction map

**Existing accepted-for-experiment model (A):** ANAT1 full indexed
facial oval + 11 individually authored vault points, projected at
17 degrees of yaw. Baseline is preserved *byte-for-byte* when the new
switch is off, including original 92 dry pencil groups
(54 pigment planes, 15 ANAT1 value fields, 3 guide fans, 5 original
construction guides, 15 independent cranial crosshatch families).
The actual underlying head art is still rejected.

**New 3/4 experiment (B):** original ANAT1 mesh sampled at **24°**
instead of 17°, **15** separately authored vault coordinates,
posterior x-extension up to `0.060×` the face width at the posterior side after two native visual corrections, reduced upper
vault height (`0.265×` rather than `0.325×` forehead width), a
narrow near-side temporal hollow and separately curved cheek and
mandibular gonial transition. These are **authored relative
construction choices after looking at the original skull photo**,
not correspondences measured from either source or output pixels.
The original ANAT1 face vertex order, all 3D points, original
material layers and 350-frame reveal remain unchanged.
The 15-point upper vault is attached to the ANAT1 cheek/jaw chain by
one C1-smoothed path. Lower-face guide points and ANAT1 normal-based
value maps use the same yaw as the outline. No disjoint rotated face,
posterior clipping, cross-media rasterization or ellipsoid replacement.

**Art hold:** The physically observed skull has bone/paint and no
skin. A later rights-reviewed, full 3/4 **living face photograph**
must be independently annotated at 18 native contour points and 5
actual skin values. Original source and actual native SVG image bytes
then need individual SHA256 and verified exact source/native RGB ROIs
in the existing private `head-evidence-review` atlas. An unapproved
image must not be used to retarget an identity/likeness.

## Native critique and gates

The user previously rejected the near-invisible and elongated
portrait. The [merged #497 Chromium 960×540 frame
evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43905652655)
shows a smooth tall forehead, low cheek and narrow dark far-side
slash. We therefore compare before/after at native 960×540 and
540×960 **with the same original authoring seed, all 92 strokes and
frame**. Inspect both 1× and 2.15× macro in Storybook before accepting
the new relative ratios.

`tests/colored-pencil-head-silhouette-study.test.ts` checks the
old/off exact identity, oblique camera and 15-anchor C1 curve,
improved width/height ratio, all 92 material traces preserved with
unchanged IDs/colours/pressures/timing, native aspect support and
isolated fox/valley behavior. The new Chromium Storybook
`tests/e2e-storybook/colored-pencil-head-silhouette-study.spec.ts`
captures A/B PNGs, verifies all 15+15 original ANAT1/cranial value
groups remain, and proves toggling off reproduces **exact** original
pixels. `Artcraft Artistic Approved = NO` regardless of test status.

**Rejection criteria:** unexpected pointed apex, hidden cranial
flat top, ear-sized knot at the temporal joint, pinched peanut
silhouette, orphaned fibres outside the new skin clipping region,
repeated dark slash, larger skull geometry but loss of microdetail,
unstable image at frame 335, and failure to move the cheeks/landmarks
with the same yaw. A green test is only a structural and compatibility
pass, *never* the independent artist's release signature.

## Browser inspection, first experimental shape rejected

The first native Chromium A/B render showed a **peanut/hourglass** at the
near temple: an exaggerated posterior parietal x-extension
(`0.095×faceWidth`) combined with too deep a temporal recession
(`0.061×faceWidth`). This violates the continuous cranium/face join,
even though all compiler, unit and browser checks were green. It was
**visually rejected**, not misrepresented as a quality improvement.
We retained all 15 authored vault anchors, the 24° camera and every
original pigment stroke while easing the rear upper turn to at most
`0.060×faceWidth` and near temporal hollow to `0.015×faceWidth`.
The measured true 960×540 baseline/first-candidate screenshot was
recorded in [PR #498 ArtCraft review](https://github.com/YukiUmetsu/kumiki-ui/pull/498).
Re-run both native A/B screenshots before accepting even this *shape
study* and keep formal portrait approval on HOLD.

### Second source-led shape iteration: preserve curvature without a flat back

The first patch reduced the posterior reach but left a long **flat** upper-left
side and still made a stiff waist at the temporal/malar junction. A second
shape-only patch reduces the ANAT1 study yaw 29°→24°, changes all five
posterior vault samples to form a broad convex parietal sweep and eases
near-side temporal recession `0.027×`→`0.015×`, near-malar lift
`0.026×`→`0.008×`, and gonial bump `0.014×`→`0.006×` face-width.
It retains **15 independently sculpted control points**, all ANAT1 jaw points,
every 92 original dry-pigment trace, 5 true vertex-normal value groups and
three independent existing Storybook material switches. All these numbers
are **relative artist construction parameters**, never fabricated coordinates
or measured photo-fidelity scores. Review actual full-size screenshot again.

### Final crown tangent pass (native 1× review)

The second native 960×540 comparison successfully reduced the visible
hourglass but exposed a short **flat stair** on the upper left parietal
edge near the posterior-to-crown tangent. The final local correction
spreads three preexisting vault control points across the same 15-point
sequence: posterior crown `0.095×`, following rise `0.175×`, and
next parietal arch `0.285×` of the ANAT1 facial width. The other 12
vault points, 23 lower face anchors, all 92 original pigment trace
families, their timing and the exact existing source mesh remain.
This is a deliberate retained-detail spline correction, not polygon
reduction, raster smoothing or invented source image coordinates.
