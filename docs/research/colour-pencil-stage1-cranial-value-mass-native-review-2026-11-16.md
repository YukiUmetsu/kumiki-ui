# ArtCraft — New human #01, cranial light-mass pass (2026-11-16)

**Source of this iteration:** the real native 960×540 and 540×960 Storybook screenshots captured by ArtCraft CI run [43870953460](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43870953460) and the source files already merged in #488. The still is a **blockout, unapproved**, not an independently photo-matched realistic portrait. No old woman character, eyes, nose, lips, ears, hair, or rigging is added.

## Native defects observed in the actual render

The native landscape frame `pencil-foundation-portrait-landscape.png` depicts a narrow approximately 230px-wide, 340px-tall head around the right-center of the paper. It reads as a potato-shaped outline, with high forehead, a slight temporal double pinch and barely visible cheek/cranial values. The macro `pencil-portrait-landscape-head-silhouette-01-macro.png` reveals many isolated short hatches without a smooth underlying warm/cool tonal envelope. The isolated ANAT1 core-shadow screenshot has fewer than a few localized ink patches, leaving most facial and vault planes as blank ivory paper. The user previously rejected this visual failure; it is not solved by passing CP-F1 tests.

Measured sample pixels from the actual 960×540 PNG, **before changes**, chosen inside the visible head: cranial left-upper (610,120) RGB (228,220,212); cranial right-upper (670,120) RGB (238,232,222); paper outside (480,320) RGB (248,244,234); middle cheek (630,320) RGB (242,237,226); right mandible (710,320) RGB (196,185,181). These are sample observations, **not** source-photo tonal ROIs, and are insufficient for claiming reference match. Especially, the cheeks and half the cranium remain nearly indistinguishable from blank paper.

## Authentic reference deconstruction

| Reference | Rights / provenance | Specific medium/anatomy observations | Limits |
| --- | --- | --- | --- |
| [Danni König, 3/4 sideline portrait](https://commons.wikimedia.org/wiki/File:CINvCHI_2017-06-28_-_Danni_K%C3%B6nig_(39388567090)_(cropped).jpg) | Photograph by Hayden Schiff, original from Flickr; CC BY 2.0; 4008×3538 Commons crop from a real 6000×4000 camera image. | Asymmetrical temple/zygomatic turn, strong far facial occlusion, clearly directional cool shadow beneath the near cheek, front-facing brow ridge, chin interior rounding. Real image demonstrates why a symmetric 2D oval and a uniform diagonal hatch fail. | Hair hides anatomical scalp crown; not admissible for an **independent complete bare-skull 18-point / five-value source proof**. Also CC BY 2.0 is not in the current proof tool's allowlist; don't misdeclare it. |
| [Mark Pulisic, 3/4 sideline portrait](https://commons.wikimedia.org/wiki/File:CINvPGH_2018-04-21_-_Mark_Pulisic_(41819192402)_(cropped).jpg) | Commons photograph taken in 2018, cropped from Flickr; check original license on Commons before using any bytes. | Very short hair permits strong macro cranial shape comparison. Top crown is rounded, temple plane gradually recedes, mandibular hinge has a distinct angle. Five values transition continuously across frontal/malar planes rather than being five separated stickers. | Atmospheric background, non-neutral illumination, small visible head within photo; technique/anatomy inspiration only, not source-matched approval. |
| [Elena Pancorbo](https://www.elenapancorbo.com/) | Artist portfolio; technique-only | Skin builds from broad warm/cool underlayers into local hatch; highlights reserve paper tooth; boundaries flow gradually along form. | Never trace/ship copyrighted portrait pixels. |
| [Jesse Lane](https://www.jesselaneart.com/gallery) | Artist portfolio; technique-only | Deep core shadows, visible pressure/weight rhythm and fine optical interleaving; microtexture depends on intact large light mass. | Technique benchmark, not consent for reuse. |

### Five independent ArtCraft axes

1. **Topology:** ANAT1 projects 468 face points; it has no rear/upper cranial vault. The new head contour remains the same authored cap + lower measured ring. No fabricated source-photo points. Reject any geometry change that crosses near/far temple/mandible chains.
2. **Flow:** Original micro-marks must bend with the cranium's changing surface: oblique cap strokes, vertical-to-diagonal at temporal turns, and varied tangent on malar planes. Crossed high pressure passes are directional, not a uniform global hatch.
3. **Weight:** Build a layered value mass using broad, short, low-pressure pigments first; medium-pressure halftone second; fine cooler interleaving later; retain separate core-shadow and reflected rim. Each trace is still an individual pencil-stroke subpath, not an opaque gradient or raster.
4. **Rhythm:** Sample stroke density and width deterministically with gradients of contact pressure and a softly feathered ellipsoidal boundary. Avoid repeating exact rectangular/ellipse shapes across the head.
5. **Microtexture:** Maintain all existing ANAT1 face normals, local anatomical guides, paper tooth and coloured dry-pigment forms; add substantial warm/cool material beneath them. Don't flatten all 5 values to one beige sheet to make the drawing look filled.

## Implementation and review

- `newHeadCranialTonalVolume(bounds,seed)` emits **15 independent value/pass traces** (5 tonal roles × 3 directional/pressure passes), with reproducible short curved 3-point pencil marks, ellipsoid-normal lighting, extra far-side temporal shadow, locally conditioned reflected light, optical hue variation, feathered boundaries and natural paper reserves.
- Existing native head silhouette, ANAT1 facial values and contours remain unchanged. `newCharacterHeadStageOne(seed,false)` recovers the prior weak-mass version exactly.
- The existing Colour-pencil Foundation Storybook story gains a **native live A/B checkbox** `Foundation head cranial optical volume`; comparison works at both film aspect ratios. The five ANAT1 isolation controls remain available.
- The exact head-only shape and selected camera are preserved. Photo pixels are never embedded or rendered into the output; every new color is an authored pencil contact path, clipped by the real head contour.
- Automated unit and native screenshot tests prove deterministic paths and contrast differences only. Whether the revised head *looks beautiful* requires a human or independent reviewer and an aligned licensed photograph.

## Remaining stop gate

A verified 3/4 photo with **complete scalp, both temples, zygions, jaw and chin** still needs to be sourced, hashed, annotated independently from a native output and scored through ArtCraft v7. No photograph has been falsely approved. The new optical mass is an artist-facing **candidate**, not final accepted human anatomy or portrait realism.


## Mainline integration after #494

This PR integrates the independent five-value / three-crosspass cranial weave with
the previously merged **34-anchor, curvature-following perimeter-contact material**
implemented in #494. The dense head already has 77 editable native traces:
54 pigment planes, 15 ANAT1 value traces, 3 guide fans, and 5 construction guides.
**None are removed, merged, flattened, trimmed, or recoloured.**

The high-density optional tonal experiment adds 15 independent named full-colour
traces. The CP-F1 per-region trace budget is extended from 80 to **96** (the
12,000-character per-trace safety limit remains). An explicit 97-trace
negative-control test prevents effectively unbounded SVG payloads.
The library's normal new-head construction defaults to the unchanged
77-trace baseline; the existing Storybook studio enables the five-value
experiment for comparative inspection and retains the independent
contour-contact A/B switch.

Inspect the actual native SVG at 960×540 and 540×960 before declaring this
material better. The original 3/4 photographic silhouette and real five
tonal regions **are not independently verified**; even a perfect shader,
fibre, or photo-like eye could not fix an overly tall cranial silhouette.
This character remains ART HOLD. No eye, hair, or previous woman artwork
is authorized by this merge.
