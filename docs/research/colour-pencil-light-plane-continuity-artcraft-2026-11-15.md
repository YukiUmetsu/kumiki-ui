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

### Native ArtCraft visual verdict for the pigment-only control

Reviewed the real 960×540 Chromium PNGs from [CP-F1 foundation run 43753184068](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43753184068), head `fdd1c628b5969d719a56fd32237ae25db9fec0a4`. The control *works*, but the drawing **fails the medium-fidelity release gate**; it must remain draft.

- **Fox:** removing tonal support exposes a recognisable fur-stroke map, but each stroke is a long, hard crosshatch, not the short, locally rooted coat accumulation of a high-quality dry-pencil wildlife drawing. Ears still read as uniform pointed cones, chest has chunky disconnected color islands, legs as straight dark posts, and the near eye as a mechanically outlined almond. The macro fox has no convincing nose/muzzle/brow bone transitions.
- **Human:** pigment-only material leaves face skin almost entirely blank while hair and clothing remain hatched. The likeness depends on underlying broad color fills, the eyes read like vertical schematic pupils, and the cheek/nose contour is stylized rather than anatomically modelled. This is a material/form **failure**, not a request for extra photographic grain.
- **Measured baseline contrast (audit ROI):** fox local 260×260 region x540–800/y145–405: default vs pigment-only average absolute RGB difference **33.4/255**, **55.2%** of pixels differ on at least one channel by >18. Human x600–820/y100–390: average RGB difference **73.9/255**, **95.2%** differ >18. These ROIs include background/adjacent structures and are *diagnostic* only, not a perceptual realism score.

**Next craft work:** use measured fox skull-to-muzzle/ear base and leg attachment from the CC0 anatomy reference, construct individual fur growth fields across shaded planes, then re-run the same on/off comparison; for the human, prioritize volumetric orbital rim/eyelid, nose-ala and malar/mandibular topology first, then low-pressure multi-layer skin pigment. Capture 1× and 3× native crops, and run independent anatomical/portrait gates before approval. Do not cure the blank regions solely by raising gradient opacity. No finished third-party artwork used as output assets.


## Continuing ArtCraft anatomical and dry pigment correction — November 15

Reference observation (technique-only / no source pixels in SVG):
- [Missouri Department of Conservation, red fox field guide](https://mdc.mo.gov/discover-nature/field-guide/red-fox): dark distal feet, tawny iris, tapered muzzle, erect ears, long fur and pale lower jaw/chest. **Source is anatomy guidance, not output texture.**
- [Wikimedia, Fox nose close-up](https://commons.wikimedia.org/wiki/File:Fox_nose!.jpg): the brow/eye appears embedded behind fur, the relatively narrow snout is continuous with forehead, whiskers fan out of the muzzle rather than the nose tip. The photograph is not imported.
- Colour-pencil studio technique references earlier in this document: study short low-pressure dry contacts, separate pigment colors and retained paper tooth rather than one smooth digital fill.

Five-axis changes now committed on the existing CP-F1 fox/portrait authoring stack:
1. **Topology:** both fox forepaw distal contours acquire four independent toe creases, small nail tips and four metacarpal tendon curves. The newly traced furrows are bounded by the actual paw silhouette, not floating in space.
2. **Vector flow:** four-toe creases follow the standing fox leg toward the ground; the human face gains five convex cheek, forehead, chin and lateral-temple root guides with over 260 short Bézier contacts per pigment pass.
3. **Weight:** eye/nose and paw claws carry dark focal accents; dermal marks are less than 0.55px wide and use restrained alpha, so high-value skin planes can still remain unburnished.
4. **Rhythm:** seeded, deliberately nonuniform positions and lengths vary along quadratic parent arcs, with three independent palette and timing groups. Each study remains deterministic under frame seeking.
5. **Texture:** the new human `dermis-0..2` paths are **actual authored pencil marks** and continue to render with `showTonalSupport={false}`, unlike the earlier empty facial gradient-only output. This is not a photographic conversion, blur, or baked canvas.

Unit QA includes the explicit four toe/wrist/nail contracts and independently layered human face pigment contacts. Both native landscape and portrait Storybook frames remain the required evidence; no new folder is introduced.

**Artistic release hold remains.** Testable presence of proper digits and physical pencil contacts does **not** demonstrate reference-equivalent anatomy or painterly realism. Verify the four furrows visually at 1× and 3×; in the portrait inspect for repetitive fibrous freckles, angular cheek masks, inaccurate eye/nose anatomy and poor optical skin integration. Reject these deficiencies rather than increasing background gradients or calling the output finished.


## CP-F1 continuation — fox caudal volume and irregular distal guard-hair seam

**Sources inspected:** [Missouri Department of Conservation, red fox field guide](https://mdc.mo.gov/discover-nature/field-guide/red-fox) (bushy circular-cross-section tail, black mixed with red, often white tip); [Lisa Wellwood, *Bashful* original coloured-pencil red fox](https://lisawellwoodartist.com/products/bashful-fox-original-drawing) (directionally layered, local pencil fibre contact); [Red Fox Original Drawing, Etsy](https://www.etsy.com/listing/1407671354/red-fox-original-drawing) (technique and morphology observed only). These are external **technique/anatomy references**; no finished art assets were copied, sampled or packaged. Previously captured 960×540 local Storybook fox still shows a nearly cylindrical tapered tail, a round white cap and uninterrupted diagonal hatch.

**Five-axis source-to-construction specification:**

| Axis | Observation and implementation | Negative control |
| --- | --- | --- |
| Topology | Tail emerges behind sitting rump; irregular contour stays a single closed mass, with the distal white coat independently attached atop the orange tail | Detached pompom, floating white decal |
| Flow | Eight authored caudal root tracts and five tip tracts turn with dorsal/ventral fur growth, with separate light/dark/amber pressure families | Uniform screen-space crosshatch |
| Weight | Shallow white-cream guard hairs have low-width separated contacts; deeper cool russet underfur remains visible | Opaque flat white wedge |
| Rhythm | Top and bottom boundary have unequal tufts; upper/underside fans have non-repeating seeded lengths and stagger | Mirrored rows, sawtooth spikes |
| Texture | Existing paper tooth, original two-scale fur, three pigment families, and native time-based reveal remain. Three small dry-pencil seam arcs soften the tip interface | Blur, raster overlay, gradient smearing |

**Changed** `src/video/colored-pencil-living-studies.ts`: caudal envelope now has bounded irregular roots/tufts while retaining hip insertion and overall tail width; undercoat grew from five to eight 3-pigment families; white tip has an independently irregular boundary, five interleaving families and a fine seam study. Original nose, 4-toe paws, head, eyes, chest, 16:9/9:16 format, frame timing and material controls stay intact.

**Code-only gate** `tests/colored-pencil-living-studies.test.tsx`: tests both camera formats, deterministic output, one continuous caudal volume, 24 tail and 15 tip pigment-path families, short low-pressure marks and no invalid coordinates. These tests do not prove the tail looks natural.

**Release decision: HOLD until current commit browser screenshot/video review.** Re-run real Storybook fox at 960×540 and 540×960, inspect 1×/3× caudal and facial/neck crops, compare with the source above, run art-axis material/structure gate and full animation on final head. Do not promote merely on matching trace counts. The human portrait still has obvious schematic eyelids, scalp/hair mass and neck–collar gaps; the fox still needs better muzzle bone planes, ear cartilage, limb articulation and non-uniform coat direction. The creative release standard remains unmet.


## CP-F1 continuation — human nape, occipital hair and collar root

**Diagnosis from an actual earlier 960×540 Storybook portrait render:** two conspicuous unpainted vertical columns remained between the lower left hair mass, lower mandible and the broad fabric collar. This is a topology error, **not** a pigment-tooth problem: adding hatch/grain would only decorate the discontinuity. The current portrait uses Kumiki ANAT1 for its *facial* landmarks, but the surrounding nape and cloth are authored curves and require independent anatomy/occlusion study.

**Anatomical construction:** the posterior cranial hair no longer ends in an abrupt straight inner vertical line. An inward-curving occipital hair return remains attached to the original scalp and lays behind the neck. The submandibular nape now extends as a positive, continuous skin volume beneath the jaw to the hidden trapezius/collar contacts. Three independently drawable dry-pencil neck-tendon and sternocleidomastoid/collarbone turning marks describe the volume; existing eyes, iris, mouth, forehead, all 468-face ANAT1 metrics, hair fibre bundles and clothing remain unchanged.

**Negative control:** a hand-painted background-coloured rectangle over the white gaps, longer cartoon cylinder for the neck, or a Gaussian blur would each fail structure/medium gates. The underlap must be proven by the actual path hierarchy, native screenshot at final camera and garment contact when animated. Mechanical tests assert the structural update in both aspects and repeatable output, not its aesthetics.

**ART RELEASE HOLD:** the archived prior still demonstrates the defect; the new geometry still requires same-head native screenshot, portrait 1×/3× crops, explicit source/candidate 18-landmark and ANAT1 body/neck mask gate, paper-to-pigment continuity review and 300-frame playback. No evidence that the corrected neck is already visually successful. Remaining: ocular plane depth, human brow-root density, ear-to-cranium attachment, genuine colour-pencil skin layering and realistic fox skull/forelimb plane complexity.


## CP-F1 validation continuation — anatomical nape and labial paper contact

**Exact-head native screenshot review (previous stage):** Storybook at 960×540 still clearly shows two discontinuities in the photographed-neutral ivory paper behind the neck, an implausibly pale oval lip sticker and almost uniform long parallel coats in the fox body and tail. Changes to the fox caudal silhouette and original nape reduced only **0.43%** of pixels beyond 8/255 (fox) and **0.50%** (human) relative to the preceding 960×540 render; this is **not** proof of convincing shape or pencil realism. Genuine ArtCraft visual quality remains below reference.

**Material continuity repair:** Both ANAT1-projected labial volumes remain distinct closed form planes with all existing 3 dry-pigment family passes, separate 3D labial feature curves, upper seam and 2D lighting. But neither is allowed to erase its parent facial skin with an opaque ivory rectangle/polygon first. This removes the visible pale digital sticker failure while retaining their source-derived topology and editability. Unit assertions now require no opaque support for both lips; only the two specific human lip material regions change, not global skin/face or fox semantics.

**Interactive Storybook proof:** The *existing* Colour-pencil Foundation Studio gets one anatomy-aware inspection target (reference emphasis, fox brush/tail, portrait nape/collar). Its 2.15× crop focus is projected from actual named region bounds through that region's source drawing transform for **both** 16:9 and 9:16 films, not guessed separate artwork. Changing subject resets the focus to prevent stale crops. Browser proof captures all four close-up conditions, checks original native vector authoring and verifies exact image restoration on exiting inspection.

**Release gate:** review the *new final head* 960×540/540×960 lip, under-chin, tail and coat screenshot evidence at 1× and 2.15×. A new close-up is diagnostic, not a new artwork or certification. Confirm no new white lower-lip gaps, bogus lipstick-like edge, lost original dry-point mouth seam or significant reduction in portrait likeness. Recheck Storybook Chrom(i)um, typed tests, 0%/100% pigment-only negative and animation seek. Leave draft if shape/material still schematic. Exclude unrelated Risograph failure in `tests/riso26-tonal-press-artcraft.test.tsx` from this PR's regression claims; the changed-suite job reported five Riso tonal assertions, while the pencil tests it executed passed.


## Critical renderer-root-cause correction — fox tail fringe invisibility

The 3× Chromium tail crop revealed an obvious **hard, continuous sausage silhouette** despite dozens of authored `pencilContourFringe` hairs. Root cause was not insufficient hairs: the generic `fur` recipe set `clipDetails=true` on tail-back and tail-tip. Consequently the renderer's source-silhouette clip discarded *every part of a true outward-pointing guard hair* before compositing. Adding more internal hairs or recolouring the same tail would not fix the edge rhythm.

**Correction:** keep *pigment underpaint and the three-pass material fill clipped to the original caudal volume*, while letting **only authored graphite/detail guard hair** from these two specifically rooted parts cross the perimeter. The head, body and other opaque shapes remain covered by their original support masks; whisker extraction and normal nose/cheek details remain unchanged. Both tail units now assert `clipDetails=false` and existence of real `fringe-` families. This avoids fake blobs, fuzzy CSS filters and texture-only fixes. Re-review the final head at 1× and 3×; the tail should now show a softly interrupted directional contour **without** detached hairs floating in empty paper. An unverified edge is not artistically approved.


## ArtCraft ocular–maxillary continuation — fox focal anatomy, CP-F1

**Reference evidence read before changing source:**

- Wildlife structure: [*Wild Red Fox*, T. Voekler (Wikimedia Commons)](https://commons.wikimedia.org/wiki/File:Wild_Red_Fox.jpg), the previously catalogued resting profile observation: small recessed eye, tapering nasal bridge and compact leathery nose. The supplied photograph is **not** an identity-matched pose/camera for this authored three-quarter fox, and no original pixels were imported. Verify the file-specific rights and obtain a matched crop before source-relative pixel-fidelity assertions.
- [Darren Gwatkin, *Fox — Early Morning Gaze*](https://www.gwatkinartworks.co.uk/wildlife-art), technique-only original coloured-pencil work: dark upper tarsal contact; amber iris partly tucked under superior lid; densely changing directions in fine brow/cheek hair; grey lower rostral hair interleaving russet dorsal pigment. **No paths, images or pixels were copied from the artist.**
- [Gayle Mason, *Drawing Fur with Coloured Pencils*](https://bristle.studio/tutorials/how-to-draw-fur-with-coloured-pencils/): short low-pressure pencil contacts follow fur growth, not uniform digital hatching; longer strokes used where fur is long.
- [Sarah Renae Clark, *How to Draw Fur with Colored Pencils*](https://sarahrenaeclark.com/fur-colored-pencil-tutorial/): short sharp-pencil flicks and layer separation make darker and brighter coat colour while retaining direction-specific hair flow.

**Observed baseline defect:** actual Storybook 960×540 final fox eye was a sketchy open oval over a uniformly rust triangular head; the muzzle was a pale cylindrical strip with no visible bony maxillary/mandibular turn. The original PR's native 3× crop made this more obvious, so merely increasing general paper tooth, random fibre counts or gradients would be a false cure.

**Five-axis construction change / negative controls:**

| Axis | Semantic contact and new native drawing | Fail when |
| --- | --- | --- |
| Topology | Near eyelid stays within a 20×13 local tarsal aperture inside the original 195-unit head width; higher dark brow line plus separately traced lower lid, amber iris, vertical pupil and isolated glint; eye retains inherited nonopaque glass recipe | Large sclera, complete mechanical concentric circle, disconnected eyebrow sticker |
| Vector flow | Three additional named short cheek/muzzle hair tracts root in the nasal wedge and turn toward maxillary cheek; near eye gets three independently curved small hairs bundles tied to brow and lateral canthus | Uniform diagonal/plaid hatching or detached eye microfibres |
| Weight | Superior dark tarsus remains stronger than inferior lid; iris warm amber, pupil deep neutral, protected sharp glint; lower muzzle contour has delicate .30–.35-width optical pressure | Heavy cartoon black ring, full bright oval with black dot |
| Rhythm | Each new fur tract uses seeded nonuniform root jitter and three dry-pencil pressure families; irregular shorter/longer overlap preserves separate strands | Identical repeated bars, random particles outside authored anatomy |
| Texture | No raster/photo underpaint and no smoothing. Actual dry light/dark/amber individual Béziers complement existing undercoat and paper tooth | Blur, flat white muzzle patch or unconnected noisy grain |

**Implementation:** `src/video/colored-pencil-living-studies.ts` specifically changes original `eye-near` and `muzzle` physical tracings only; no face photo or new generic model is used. Seven named ocular marks and three new named maxillary/mandibular/rostral marks allow precise reference and frame inspection; source geometry, seed, original facial layering order, nose/whiskers, ear, entire fox body, ANAT1 human, and other film styles remain intact. The rendered near-eye width is still less than 13% of the original head width; this is a topology constraint, **not** an automatic aesthetic pass.

**Test evidence:** `tests/colored-pencil-living-studies.test.tsx` checks both film aspects, original anatomical coordinate bounds, 7 named ocular tracings, 9 rooted ocular fibre families and 21 independent muzzle fibre families, finite editable traces, negative controls and deterministic frame construction. The existing Storybook Foundation component adds a source-projected *Fox orbital rim/cheek* macro focus, not a second static image; the Chromium test checks actual eye/pupil/head/muzzle geometry and 0→macro→0 restoration at both 16:9 and 9:16. Frame-specific visual proof remains separately necessary.

**Release status: ART HOLD.** This is one anatomy-first draft refinement, not a claim that the full fox/portrait is world-class. Reinspect browser-native 1× and 2.15× in both aspect ratios and compare against the *actual* sources. Primary remaining structural issues: flattened fox cheek volume, oversized far canthus in some views, auricular cartilage insertion, paw/web/tendon articulation; human orbital and nose plane depth; dynamic fur deformation. A final source-matched ArtCraft v9 anatomy/pixel review is still required.


## Exact native ocular QA and next structural refinement — 2026-11-15

**Real Chromium proof:** `ArtCraft Coloured-Pencil Foundation Proof` workflow run [43778361984](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43778361984) captured an authored fox at native 960×540 as well as the actual `fox-eye` anatomical macro in both film aspects. The 1×/2.15× artist inspection rejects a full-face approval: the dark superior tarsus is more legible and the maxillary boundary has added quiet fibers, but the eye is still schematic and the cream muzzle still reads as a long pale strip, not an entirely convincing canine rostrum. Relative to the earlier native baseline, the face crop x=577..784/y=162..317 had mean absolute RGB difference 0.678/255 and 2.26% of pixels differing by more than 12 in at least one channel. These are **change-detection** diagnostics, not source fidelity or art-quality scores. No matched external wildlife source with the same camera/pose exists, so ArtCraft source-pixel PASS cannot be asserted.

**Additional macro failure:** white cervical chest resolved into a narrow spear at the sternum, with charcoal forelegs reading as straight posts. The proper fix is morphological, not adding global grain. The next physically authored sternum candidate therefore replaces the single sharp white tip with four softly interlocking Bézier turns, two new caudally flowing low-pressure tuft fans, one named ventral optical form guide and a denser fringe rooted on the actual revised lower silhouette. `src/video/colored-pencil-living-studies.ts` retains all three dark/mid/light pigment families, the anterior chest mass, the neck ruff, and exact absolute frame timing. Both 16:9 and 9:16 unit tests assert the connected non-spear shape, 24 fur-family passes and 3 fringe-family paths; the **existing** Foundation Storybook adds a direct fox sternum macro target for actual native still critique.

**ART HOLD:** these are geometry/material experiments until the **latest** post-sternum workflow exports and source/review crop verify whether the overpointed triangular chest silhouette really improved. Prior grey leg posts, head silhouette, poor upper muzzle optical gradient, far canthus and human facial realism remain outside approval. Never approve only from path counts, passed tests or a local pixel-change percentage.


## Native-frame fox lower-limb continuity — paw/hock ArtCraft refinement

**Observed before change at the actual 960×540 Storybook export (1× and 4× crop):** the two forelegs appeared as dark, nearly uniform-height columns ending in a flat horizontal boot rim, while the rear leg rose as a third large upright charcoal wedge. Small linear toe marks did not resolve the underlying limb topology. This is primarily a *pose and contour* error; adding paper grain alone would amplify the wrong geometry.

**Photographic anatomy references inspected before modifying the authored vectors:**

- <https://permuted.org.uk/fox/fox_october2007/album/slides/fox_cub_foot_1210072121.html> — a close frontal photograph of fox cub legs: narrow furry wrists, four distinctly adjacent compact toes, tiny nail contact and warm brown toe fur. **Caveat:** juvenile standing pose, so no adult-seated proportions copied.
- <https://www.wildlifeonline.me.uk/animals/article/red-fox-appearance> — close view of fur-covered red fox forepaw and claw/pad relation: toes wrapped in individually curving fine fur; central pad is not visibly pasted as a front-facing oval.
- <https://mdc.mo.gov/discover-nature/field-guide/red-fox> — adult red fox leg/foot coat blackish, with modestly long legs and separate tail/haunch geometry. Field-guide observation, not a canonical matched pose.
- <https://www.oreilly.com/library/view/drawing-animals-in/9781600581373/xhtml/ch11.html> — Debra Kauffman Yaun's *Red Fox*, a three-quarter-anatomy drawing study whose perspective warns against assuming both sides or all feet are equally visible. Educational technique reference; no source artwork reused.

The illustrations are **authored original editable vector + physical CP-F1 pencil paths**. The reference photos and book samples are not imported, traced, rasterized or redistributed. The full sources' exact pixel crops are not aligned to this specific authored camera or animal and source-matched release metrics remain blocked.

| ArtCraft axis | Real observed failure | Candidate construction and concrete negative control |
| --- | --- | --- |
| **Connectivity** | Rear leg reads as third independent vertical cylinder; wrist-to-toe edge flat. | Rear hock upper root now emerges *inside rump* then curls into low lateral ground contact; foreleg boundaries curve through arm → carpus → four toe pad fronts. **Reject** if rear region is taller than wide or disconnected from body. |
| **Flow** | Same diagonal streak repeated across all black regions. | Forearms add separate curved, short, direction-specific pressure families, dark-to-warm optical planes; hock pigment turns downward/forward along flexion. **Reject** generic global hatch. |
| **Weight** | Solid charcoal boot with tiny invisible toe lines. | Shoulder cap, tendon/wrist and metacarpal marks have distinct pressures; nail slits stay darker than brown toe hairs. **Reject** thick black toe outlines or white fluorescent leg stripes. |
| **Rhythm** | Flat repeating toe hem, identical front and back boot. | Adjacent nonuniform digit ridges, irregular knuckle extents, unequal foot-width to lower-leg ratios, low horizontal hind paw. **Reject** evenly spaced parallel four-stroke foot decal. |
| **Texture** | Uniform synthetic diagonal pencil scratches obscure geometry. | Three retained original pigment families plus low-pressure local short hair tracts. Existing tooth, seed, dry clip/support and render-time reveal remain unchanged. **Reject** photographic texture or blur. |

**Mechanical gates:** tests enforce original two narrow weight-bearing forelimbs, 4 front paw furrows/claws per foot, shape bends, width and hock height/width ratio, 12 individually authorable hind fibres, source-relative limb/body overlap and exact 16:9 / 9:16 macro screenshot restoration. Existing Storybook adds *Fox carpus/weight-bearing paw* and *Fox folded hind hock/grounded digits* focus in the same folder. The original rendered native images, not static alternate art, are the objects under review.

**ART HOLD — independent aesthetic review pending:** the latest code restores anatomical hierarchy but its exact-head full-frame and macro screenshots must still be inspected for whether the splayed toes truly read at native pixel scale. The three-quarter head, ear insertions, portrait eyelids/nose and full-media texture remain known fidelity failures; do not approve or merge from code assertions alone.


**First visual-failure follow-up (native CP-F1 proof run [43780950148](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43780950148)):** comparing the before/after 960×540 hero crop showed the first 80×74-unit “folded” hock was **still recognizably a third standing dark furry mound**, merely shorter. The local lower-body crop changed by mean absolute RGB 3.331/255 and 10.94% of pixels exceeded 12-channel difference; these quantify edits, not realism. The visual judgement therefore rejected that candidate and narrowed the **independently authored rear tarsal pad to 59×46 units**, attaching its hidden upper root beneath the orange rump. Only low dark toe arcs and fur remain visible at the ground, with the upper thigh's rust coat exposed. A local 450×450 CairoSVG structural mask rasterization found 48 overlapping pixels between authored rump/hind path geometry, verifying nonempty internal root attachment without claiming a source-matched human/animal photography fidelity pass. The E2E overlap test now checks an actual interior root coordinate (321,375) in the two independently rendered SVG paths. **The second candidate is unapproved until its exact-head 1×/2.15× browser frames are inspected.**


## Post-merge ArtCraft fox cheek-to-sternum reconstruction (2026-11-15, new PR)

**Prior release baseline:** PR #409 merged as `a661da3fc61f2c5ca4166143daa0986ab92b66a7` on the explicit maintainer request, without a source-pixel artistic fidelity PASS. Follow-on work is an independent PR from `main`, not an unrecorded modification of that merge.

**Reference evidence:** inspected actual CP-F1 960×540 1× fox/3× face crop from merged workflow, then the publicly visible seated lateral fox photographed on the [Artsdatabanken red fox page](https://artsdatabanken.no/arter/takson/31173); technique sources remain [Darren Gwatkin](https://www.gwatkinartworks.co.uk/wildlife-art) and [Bonny Snowdon](https://bonnysnowdonacademy.com/fox-draw-resources/). The source image and authored three-quarter fox are *not pose-aligned*; source image bytes, photographic crops, paths and copyrighted paintings were not committed, and relative SSIM/pixel fidelity is **not claimed**.

**Specific failure from native render:** the intermediate cheek feature descended almost a full 97 local units as a pale-gray stiff ribbon over the chest from the jaw, separating into an unnatural drooping flap. Real fox cheeks have white/grey under-malar hair that *flows into* the light cervical collar, with only narrow darker roots immediately below the jaw.

**Topological fix, not surface decoration:** the original `cheek-ruff` remains an editable CP-F1 fur region with 3 surface pigment passes but has a 44×61-unit diagonally inclined cubic boundary instead of the former 38×97 hanging strip; it intersects the existing maxillary cream muzzle at (253,235) and the inner white sternum at (240,265). Four direction-changing anatomically rooted fan guides, two individually named low-pressure jaw/cervical value turns, and three bounded guard-fringe bands build continuous long-to-short fur. Hue moves toward cream with sparse grey undercoat; 16:9 and 9:16 maintain identical geometry/seed/animation staging.

**Five axes (qualitative reference to numeric contracts):**

| Axis | Target | Regression/negative control |
| --- | --- | --- |
| Topology | Real jaw/cheek and cheek/sternum SVG path intersections | Disconnected patch or extended floating tube; cheek height >72 |
| Flow | Short warm-grey muzzle contacts rotate into long cream throat hairs | Same-direction long slashes across all cheek pixels |
| Weight | Only low-opacity sepia under-jaw and shadowed hair roots; pale cream fronts | Dark gray opaque stripe or sticker-like white patch |
| Rhythm | Four independent irregular rooted fans with three pressure passes | Uniformly repeated identical triangular tufts |
| Texture | Original editable dry-pencil pigment plus 3 outer guard-fringe families | Imported photo, blur or generic noise substituting for anatomy |

**Studio/browser QA:** new `fox-cheek` macro is added *inside the existing Storybook pencil foundation*, not a new art folder, alternative screenshot or filtered photo. The same actual SVG is captured at 2.15× for both aspect ratios; head-to-muzzle and cheek-to-sternum intersections are checked as native geometric Path2D fills. Unit tests ensure individual light/dark family IDs, bounds, deterministic strokes and retained continuity.

**Status:** draft until exact browser screenshots are inspected against the native merged baseline at both 1×/2.15× and artistic reviewer can see improvement. This change alone cannot certify the fox, ears, hind paw, human 468-landmark face or medium realism. Do not weaken the ArtCraft anatomy/source gates to make code green.


### Independent browser rejection and replacement — ArtCraft 2nd candidate

The initial `32×67` compressed cheek (workflow [43782816414](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43782816414)) passed typed/Chromium geometry but **failed actual 960×540 image inspection**: a pale ivory, vertically hanging flap remained clearly separated from the white sternum. Smaller polygons alone could not resolve an incorrect lateral topology or compositing/undercoat mismatch. The revision shifts the malar support diagonally *leftward/inward* into the already pale neck ruff, uses the **exact same `pale` material palette as the adjoining chest** while retaining all independent fur-trace pressure families, and changes the lower attachment test to the real measured interior intersection at `(240,265)`. The jaw root stays optically hidden within the muzzle at `(253,235)`.

The next native render from [foundation proof run 43783298529](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43783298529) **passes the Storybook+geometry proof** and shows a visibly smaller, connected cream cheek/neck transition at both normal size and 2.15× anatomical crop; the first candidate's independent ivory tassel is eliminated. This is a local shape improvement, not a photorealism pass: the new cheek is still too stylized and the fox's head, muzzle, eyes, ears and forepaws remain insufficiently lifelike. The first-vs-second 3× crop is an independently saved snapshot from the exact two GitHub Chromium proof exports. No pose-matched source-image pixels have been scored, so ArtCraft source-fidelity remains **BLOCKED** and any follow-on artistic claim must remain qualified.
