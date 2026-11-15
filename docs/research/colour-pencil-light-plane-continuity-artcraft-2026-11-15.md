# ArtCraft · CP-F1 optical light-plane pencil continuity

Date: 2026-11-15  
Status: **experimental / human artistic approval withheld**  
Scope: existing `Video Production / Film Looks / Colour-pencil` Storybook and source-conditioned CC0 research renderer only.

## Source and material observation (before geometry)

**Licensed source for anatomical form and photo-derived pigment:** [Christopher Campbell, *Brunette woman portrait* (2015, CC0)](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The original 25 registered landmarks, anatomical cutouts, and a deterministic head-crop geometry remain authoritative. No artist-owned finished drawing is traced, sampled, bundled, or reproduced.

**Technique-only coloured-pencil references (not artistic assets):**

1. [Janie Gildow, *How to Color with Colored Pencils*](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): quiet overlapping loops and several low/medium-pressure layers create continuous optical colour without erasing every paper fibre; a sharpened point accesses the valleys of paper tooth.
2. [Claudia Nice / Crayola, *Colored Pencils Tips & Techniques*](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): additive coloured-pencil layers, controlled pressure and retained edges; full burnishing is a separate, sometimes inappropriate final action.
3. [Elena Pancorbo, original portrait gallery](https://www.elenapancorbo.com/): use **only** to study location and hierarchy of sharp orbital/eyelash accents versus subtly modulated cheek and nose planes. No painting shape, bitmap or pigment is copied.

**Actual release-relevant prior defects** are recorded in [soft skin fibre research](colour-pencil-soft-skin-fibre-artcraft-2026-11-15.md) and [needlepoint skin audit](colour-pencil-needlepoint-skin-artcraft-2026-11-15.md). The original CC0 facial light areas are warmer/darker than unpainted paper; earlier dry result exposed a white malar tile and exaggerated high-frequency dry grain. Earlier improvements also could not pass a realistic-art judgment.

## ArtCraft five-axis deconstruction

| Axis | Required visual/physical topology | Current construction and rejection condition |
| --- | --- | --- |
| **Continuity** | A cheek fibre stays inside the photographed face; its **entire curved contact** must not overrun a brow, iris socket, lip seam, nostril or true paper reserve. | Sample each quadratic at 20/40/60/80%, not only start/end; reject the whole nib if it crosses facial polygon, anatomical exclusion zone or photographic high-contrast edge. |
| **Directional flow** | Fine fibres curve from cheek across nose to mandibular plane, rotating gradually rather than forming uniform screen-wide diagonals. | Retain the existing continuous cheek→jaw tangent and complementary interleaved crossing pass, with independently varied curvature. |
| **Weight** | Mid-light skin has touching quiet pigment; photographed actual highlights and eye glints stay unpigmented; hair roots and pupil stay sharply dark. | Source luminance supports a narrowly bounded additional pressure/fibre probability in the .67–.918 range; never fill >= .918 genuine paper highlights. |
| **Rhythm** | Several small unequal, overlapping scumbles should feel dry and layered rather than rendered as evenly repeating rows. | Seeded two-pass staggered jitter; each pigment arc varies in length, angle, bend, alpha and width; no raster wash or Gaussian blur. |
| **Texture** | Paper tooth is still readable after layering, but lit malar/nasal planes must not appear as a separate white polygon. | Small extra source-conditioned fibres only in observed light-colour range. Preserve independent needlepoint/paper-tooth passes and source-colour samples. |

## Implementation / where to look

- `src/video/colored-pencil-skin-weave.ts`: source-conditioned light-plane support, whole-curve contact rejection and inspectable counts `opticalLightFibres` / `protectedSpans`.
- `src/video/colored-pencil-full-head.ts`: propagates both counts without changing the cap, original source, colour regions, eye marks or normal film output.
- `src/video/colored-pencil-reference-atelier.tsx`: **existing** Storybook atelier exposes counts as DOM inspection attributes and alongside existing 0–100% optical-weave controls.
- `tests/colored-pencil-skin-weave.test.ts`: shape/colour/seed/paper reserve and full-quadratic topology negative tests; 0% remains a blank optional layer.
- `tests/e2e-storybook/colored-pencil-live-references.spec.ts`: native Chromium 16:9 and 9:16 real-photo proof includes 0%/100% light-fibre and crossing counters and existing source/dry screenshots.

**No flattening, smoothing, new Storybook folder, imported third-party painted pixels, photographic underpaint, or model-generated portrait replacement.** This is one regional material refinement to a source-measured but artistically unapproved face. Existing production CP-F1 composition, video export, hair/iris/lip contours and deterministic animation time are intentionally unchanged.

## Release conditions (must pass, not assumed)

1. Final-head TypeScript/type safety and focused pure tests; browser-native full-head proof in 16:9 and 9:16 at 0% and 100% from real rights-verified CC0 pixels, plus 1×/3× captures and output exports at multiple motion frames.
2. Quantify the actual light-plane residual vs the matched CC0 photo at fixed (114/285, 148/318) and (176/285, 142/318), plus skin highpass grain and protected eye/lip contrast. **Do not infer improvement from larger stroke counts.** Compare to the pre-change actual browser screenshot, not only theoretical expectations.
3. Run full ArtCraft source-aligned 18-landmark/5-tone and v9.1 anatomical gate with source hash and matched output; retain all failed scores. Human visual review must approve form, edge craft, surface quality and motion independently.
4. Re-check ordinary photo-to-pencil 16:9/9:16 export and absolute seek invariance; don't merge as high-fidelity portrait if the human likeness/material remains below reference.

**Current approval: NOT GRANTED.** This change establishes contact topology and instrumentation; screenshot artifact availability, live pixel critique and final independent visual judgment remain separate gates.


## CP17 continuation — image-registered dry tooth gap bridging

**Reference update:** [Alyona Nickelsen, *Ask Me Anything*, Colored Pencil Magazine (2017)](https://coloredpencilmag.com/amaalyona/) explains the high-frequency grain problem: dark lines sitting visibly on paler layers create a prominent grain; tight, sharp, low-pressure strokes within paper tooth provide optical merging. [Janie Gildow's instructor demonstration](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf) likewise specifies progressive light/medium tonal passes and overlapping loops, not a Gaussian blur. These are **materials/process references only**; the anatomical input remains the original CC0 photographed sitter.

**Independent image diagnosis before implementation:** Existing CC0/browser 285×318 snapshots documented a local face 5×5 high-pass RMS of 10.96 in 16:9 and 9.23 in 9:16 after CP17's predecessor, compared with 3.42/3.71 in the photograph. The dark iris and mouth are already distinct: adding random skin noise or modifying eye paths is not a defensible fix.

**New candidate** `createPhotoSkinToothBridge` inspects the actual already-painted **paper** against softly sampled local source values. It creates one original source-coloured, finite-width **quadratic dry-pencil nib** only where output paper is measurably too pale; it never places a pixel/image stamp, base wash or flat polygon. Two staggered source-local anatomy-flow passes and three-point/five-point span guarding maintain source-to-fibre topology and protect real glints, eye sockets, lip seam, nostrils and hard photographed value edges. No dark/light pixel is overwritten, erased or softened. The new control defaults to **0%** (no changes) and is visible in the **existing** Colour-pencil Storybook. It only runs after a complete photographed full-head plate (plus 4th chronological stage), not in ordinary photo-to-pencil video exports.

**Rejection/negative checks:** (1) source+draw buffers byte-identical after computation; (2) actual quadratic pigment samples stay strictly within the independently measured CC0 facial polygon; (3) photographed true-white source adds zero nibs; (4) already dark/filled skin adds zero nibs; (5) 0% canvas remains identical to the prior PR head; (6) integer positions, deterministic seed, 16:9 and 9:16 and exact 0→100→0 restores via native Chromium; (7) do not approve any change until exact output screenshot grain, glint, skin-gradient and portrait landmark gates are inspected, not merely test logs. See `tests/colored-pencil-tooth-bridge.test.ts` and `tests/e2e-storybook/colored-pencil-live-references.spec.ts`.

**Art status remains unapproved.** This material experiment does not rebuild the underlying historical sketch-derived human or fox geometry; those structural defects are a separate high-priority task.

## CP-F1 pigment-only visual negative control — 2026-11-15

**Reference diagnosis:** Real dry colored-pencil shading uses many low-pressure
contacts and overlapping hatches, not a single contiguous tinted surface.
[Faber-Castell's artist materials guide](https://www.faber-castell.co.id/cfind/source/files/art-graphic.pdf)
contrasts shallow-angle shading (visible paper structure), pressure-dependent
blocks of color, and directional cross-hatching. [Janie Gildow's studio handout](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf)
shows how a sharp nib reaches the paper tooth, whereas a blunt point leaves
larger bare valleys. Technique-only sources; no artwork pixels copied.

**Five-axis check:**

| Axis | Required evidence from the same authored fox/portrait |
| --- | --- |
| Topology | Switching off tonal gradients must not move cranial silhouettes, facial parts, fur roots, or other semantic regions. |
| Vector flow | Multi-pass hatches, individual micro-deposits and rooted curves stay live and directionally varied without a gradient color field. |
| Weight | Upper eyelid/pupil accents and chin shadow remain distinct from quiet cheek/forehead pressure; no uniform single-value wash should masquerade as pigment. |
| Rhythm | Region-specific fiber/stipple/hatch passes preserve their original seeded irregularity and absolute animation-frame schedule. |
| Texture | Bare paper-tooth valleys and short colored pencil contacts remain readable at 1× and at the existing 2.15× inspect control. |

**Production integration:** `PencilDrawing.showTonalSupport` defaults to true and
is backward compatible. The *existing* Foundation Storybook has a clearly
labelled **pigment-only audit** checkbox; disabling tonal support hides only
`data-km-pencil-craft-base` gradient silhouettes while retaining paper
support for occluding parts, all colored-pencil stroke passes, contours,
micro-deposits, named anatomy, 16:9/9:16 layouts and deterministic animation.
The live stage carries `data-km-pencil-tonal-support=on|off` for automated
inspection. It is an **explicit diagnostic/negative control**, not a silent
change to delivered animation aesthetics. It does not paste, manipulate or
stylize any photo.

**Proof contract:** Vitest verifies default and explicit-on render identically
and off retains all named region/stroke passes for both fox and human. Chromium
records native 960×540 fox and portrait with the gradient support removed and
proves a 0→100→0 toggle restores the original default screenshot byte-for-byte.
Review both modes before deciding whether tonal gradients are doing too much
of the rendering work. The reference gates can **fail** despite green tests:
the authored fox/portrait anatomy remains artistically unapproved. Do not
merge PR #409 solely from the existence of this inspection option.
