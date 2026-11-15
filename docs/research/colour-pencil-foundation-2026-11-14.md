# CP-F1 — Coloured-pencil drawing foundation and art-reference atlas

**Date:** 2026-11-14. **Owner:** `registry/video/colored-pencil-foundation.ts`. **Status:** functional authoring contract, independently judged visual mastery **not** certified.

## Why this exists

Rebuilding human and fox faces proved that many procedurally added hatches do not fix wrong skull, eyelid or muzzle geometry. Elsewhere, scenes used a pencil material only when a caller remembered `craft:true`, and image-conditioned faces had a separate implementation. **All new coloured-pencil drawings must now pass through CP-F1**, a strict foundation connecting art observation, detailed form construction, material assignments, optical layering and quality checks. Legacy CP1/CP2 fixtures still load for backwards compatibility; they are **not** CP-F1 qualified until migrated.

Do not write new production art by using bare `createPencilRegion` or `PencilDrawingSpec` without `createPencilFoundationDrawing`. Photo-conditioned output uses `createPencilPhotoStudy` with the same CP-F1 version and mark sequence. Renderers explicitly expose `data-km-pencil-foundation="CP-F1"` when a draw is qualified. A validator checks all region/material mappings, not visual beauty.

## Reference artwork board — original artists, not render assets

Artist-owned paintings below are **technique-only study references**. Each image link remains on its credited owner/institution site; no art pixels, vector contours or source crops are embedded in the library. The actual pages/visual examples were inspected at available web resolution; low-resolution images do **not** support precise micrometer paper/tooth measurements.

| ID / focus | Primary artist/artwork and viewable image source | Observed craft principle → concrete construction rule |
|---|---|---|
| CPREF-01 / realistic skin | [Elena Pancorbo, portrait portfolio](https://www.elenapancorbo.com/) and [*Stop Crying, the sun is coming up*](https://www.elenapancorbo.com/originalesoriginals/bajacalidad-23) | Warm/cool malar and nasal planes carry form; upper lid overlaps iris; brows/hair are individually directional. Build landmarked skull, asymmetric lids and bridge/ala before skin microdots. |
| CPREF-02 / dramatic eyes | [Jesse Lane, original pencil art gallery](https://www.jesselaneart.com/gallery) and [*Abyss*, illustrated portrait](https://realismtoday.com/abyss-colored-pencil-art-by-jesse-lane/) | Iris detail is fine but surrounding value structure and cast hair shadow create the focal depth; keep catchlights isolated, under-eye a separate softer tonal plane, and correct hair occlusion. |
| CPREF-03 / fox fur | [Claire Milligan, fox drawing and coloured-pencil/watercolour-pencil tutorial](https://www.clairemilliganart.com/patreon-video-tutorials) | Growth directions change abruptly between ear, cheek, ruff, shoulder; distinguish short muzzle hairs from long neck locks; a single dark facial mask is inadequate. Specify five local material/flow zones and roots. |
| CPREF-04 / natural feathers | [Claire Milligan, wildlife originals](https://www.clairemilliganart.com/originalsforsale) | Wing, back, bill and eye require distinct edge resolution; focal anatomy has sharper contours than distant vegetation. Use feather/fur-specific paths, not the same procedural speckle. |
| CPREF-05 / botanical contour | [Ann Swan, botanical portfolio](https://annswan.co.uk/) and [West Dean parrot-tulip image](https://www.westdean.ac.uk/tutors/ann-swan) | The ruffled tulip edge has nested occlusion/negative spaces; colour direction changes with each petal plane; make each folded petal a named overlapped form, not radial polygons. |
| CPREF-06 / flowers close-up | [Claire Milligan, peony tutorial image](https://www.clairemilliganart.com/patreon-video-tutorials) | Thin petal veins curve into the centre; crisp rim lines contrast with blended large petal faces. Author broad folds and transparent colour transitions before 0.5-unit veins. |
| CPREF-07 / mark process | [Janie Gildow, pressure/layer/burnish instruction](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf) | Stroke width/coverage depends on pencil tip and pressure; light initial layers preserve paper tooth; burnishing after stacking compresses/evens pigment. Implement three pressure-bounded passes and selective burnish; **not** blanket blurred fills. |
| CPREF-08 / controlled blending | [Caran d'Ache, colour layering guide](https://www.carandache.com/gb/en/blending-colours-with-coloured-pencils) | Multiple colours optically mix via superposed marks; use hue-differentiated layers, value reserves and pressure rather than one solid fill. |
| CPREF-09 / scientific subject | [Oxford natural-history scientific illustration, techniques](https://oumnh.ox.ac.uk/sites/default/files/oumnh/documents/media/bowstead_-_drawing_techniques.pdf) | Coloured-pencil rendering can use multiple layered stipple/scribble passes; microdetail should be species- or material-specific. Mark semantic texture regions and preserve diagnostic structures. |
| CPREF-10 / landscapes | [Peter Weatherill, coloured-pencil landscape](https://www.pencil-topics.co.uk/landscape-in-colored-pencil.html) | Atmospheric distance is cooler and lighter than near trees; mark scale and contrast rise towards the foreground. Do not stamp one tree/tone across the whole depth. |

See [prior user-supplied coloured-pencil art study](colour-pencil-user-art-reference-study-2026-11-14.md) for previously provided target images. User-owned identity references take precedence over the outside artist technique board.

## Foundation order, geometry hierarchy and materials

```mermaid
flowchart LR
  A[Observe art and permissions] --> B[Author silhouette, parts and overlaps]
  B --> C[Place value and light]
  C --> D[Deposit translucent colour passes]
  D --> E[Draw form-following fibres and fine accents]
  E --> F[Selective burnish and visual review]
  F -->|Failed crop| B
```

| Stage / addressable frame | Must exist before advancing | Automatic guard |
|---|---|---|
| 1. Observe / 0 | Source title, rights, subject and observed feature rule; identify what cannot be copied | 1–12 grounded reference records, observation text and rights enum |
| 2. Outline / 52 | Original subject geometry, named part ID, bounds, hierarchy, silhouette, negative space, contact and light direction | Explicit, complete region/material map; validated SVG path and bounds |
| 3. Undertone / 106 | Value grouping with reserved paper whites, full opacity for solid occluding masses | No paper support on glass, light glaze or cast shadow; opaque support on other materials |
| 4. Layer / 168 | Three or more colour deposits, distinct angles, light-to-medium pressure, stable paper tooth | 3+ valid pigment layers, finite pressure, bounded mark timings and seed |
| 5. Detail / 254 | Rooted material-specific hatch/fibre/stipple, controllable colour and stroke density; local face/fur/vein contour | Every opaque region has a canonical typed `craft.kind` instead of an unshaded generic fill |
| 6. Review / 335 | 16:9 and 9:16 final frames, 2× local crop, visual reference critique and defects ledger | Deterministic arbitrary seeks, non-transparent solid masses and browser screenshot checks |

**Macro → meso → micro:** require silhouette and attachment first (macro), local skull/muzzle/leaf fold geometry second (meso), pencil pores/hairs/fibres last (micro). Hard-coded universal radial fur or cartoon eyelids cannot qualify merely by receiving a material. No numerical code assertion certifies artistic realism.

**Material contract:** `PENCIL_MATERIALS` owns eighteen semantic surfaces. A single `pencilMaterialCraftFinish(surface)` owns their authoritative optical finish. `createPencilFoundationDrawing()` checks a **complete per-region material map** and automatically equips opaque regions with material-specific grain/deposition when the caller forgot `craft:true`. Glass, cast shadow and light glaze retain their intentionally translucent passes. No opaque face or animal may be a ghost/silhouette window onto the background. This is non-destructive: authored `path`, `bounds`, `contour`, `details`, `layers` and frame timing do not change.

**Image-conditioned portraits:** `createPencilPhotoStudy` keeps source geometry, directional flow-field strokes, paper lift and bounded deterministic mark sorting. Its `foundationVersion` and three `foundationPasses` are always emitted; source rights are managed at the atelier input/URL level. A photo transformed into pencil marks is **not** a riggable editable vector face.

**Dry vs water-soluble:** CP-F1 accepts both as a research medium label. The current renderer visualizes broad wash-like tone and dry pencil deposits but does **not** simulate real wet brush activation, diffusion, drying or lift-back. Do not advertise watercolor-pencil physics until explicitly implemented and visually audited.

## Required API for every new authored drawing

```ts
import { createPencilMaterialRegion } from "../../registry/video/colored-pencil-materials";
import { createPencilFoundationDrawing } from "../../registry/video/colored-pencil-foundation";

const head = createPencilMaterialRegion({
  id:"fox-head",surface:"fur",seed:140,
  path:"M12 30 Q45 4 84 32 Q72 88 20 75 Z",bounds:[12,4,72,84],
  palette:["#C88E6C","#74565B","#F2C9A1"],
});

const drawing = createPencilFoundationDrawing({
  version:1,seed:140,width:960,height:540,paper:"#F9F5EA",
  paperTooth:.75,regions:[head],
},{
  subject:"wildlife",medium:"dry",
  references:[{
    title:"Reference study of red fox head",rights:"technique-only",
    observation:"Muzzle tapers from orbit to nose, with separate ear insertion and directional cheek fur.",
  }],
  construction:"Original side-lit skull with attached ear, eye socket, tapered muzzle and directional fur tracts.",
  surfaces:{"fox-head":"fur"},
});
```

Never import another artist's copyrighted original image into shipped code. Use artist-owned artwork as a process observation and only use user-owned, explicitly licensed or public-domain pixels for source-conditioned conversions.

## Storybook / test evidence

All stories remain in **Video Production / Film Looks / Colour-pencil**; no new folder. `DrawingFoundation` adds six original specimen classes (rose, fox, human portrait, architecture, fabric, valley) with editable 16:9/9:16, pressure, paper tooth, burnish, seed, stage selection, frame scrubbing, reduced motion and macro inspection. The existing Living and Object study factories are upgraded to mandatory CP-F1; the photo-conditioned engine is marked CP-F1. Legacy generic science/film fixtures that have not been migrated are still viewable but must not be called qualified.

Tests: `tests/colored-pencil-foundation.test.tsx` tests stage ordering, material map exhaustion, transparent exceptions, non-destructive geometry, invalid reference/medium rejection, two aspect ratios, deterministic render and photo pass order. Browser `tests/e2e-storybook/colored-pencil-foundation.spec.ts` inspects hero frames, stages and controls. Use scoped CI and do not run old full-suite tests on every PR.

## Open quality blockers

- Portrait/fox **illustration-first** final artwork and separate individual eye/lip/fur shape research remain below the user's target craftsmanship. This foundation prevents accidental bypass; it does not manufacture expert anatomy.
- Reference vs output semantic topology / curvature / stroke width / motif spacing / texture spectrum still requires region-matched five-axis ArtCraft v6 manifest and independent human inspection.
- Motion: actual drawing-hand trajectories, erasure, solvent/wet activation, convincing dry-to-wet surface changes and high-resolution animated face rigging are future work.
- Paper texture calibration at true export dpi/zoom is not measured; visual framing, facial proportions and material quality require direct video and screenshot scrutiny.
