# Crayon ArtCraft F1 V46 — source-observed eyelid aperture topology

**2026-11-17 · CC0 photo source · ANAT1 anatomical construction · native CRAYON1 wax · experimental !dev / ART HOLD.**

## Reference, drawing medium, and why V45 cannot be promoted

- **Exact licensed sitter**: Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), public-domain CC0 1.0. Match **the original archived 608×1082 photographed browser crop**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2` ([source evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169)). No original camera JPEG, 3D human model raster or photographic filter appears in runtime.
- **Physical medium**: uneven wax deposition on visible paper tooth, small cohesive wax edges and varied nib contact. [Philadelphia Museum of Art, art-on-paper terminology, p. 44](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf). The native CRAYON1 pressure/spacing/grain/feather materials and all 18 existing rooted hair groups remain. Do not substitute a smooth solid polygon claiming to be crayon, or layer a raster photo in the face.
- **Anatomical structure**: Upper/lower eyelids are layered tarsal + orbital skin volumes, with the upper eyelid partly covering the eyeball. The palpebral fissure is widest near the pupil, tapering into both canthi; the inner wet sclera is NOT an identical flat mirrored white wedge. [Orbital Anatomy for the Surgeon, PMC3566239](https://pmc.ncbi.nlm.nih.gov/articles/PMC3566239/) and [EyeWiki eyelid anatomy](https://eyewiki.aao.org/Eyelid_Reconstruction). No copyrighted reference drawing is copied.
- **Observed previous failure**: In [matched V43/V45 exact Chromium and source photos](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44043379899/artifacts/14311140863), V45 small extra lashes plus dark wax decreased whole-image RGB SSIM **0.496979→0.496762**, near-eye **0.574376→0.569736**, and lower lid **0.518274→0.478621**. The face still has a graphic hard triangle for the bright sclera and a round icon-like iris. Therefore **V46 branches directly from V43, not the rejected V44/V45 pigment variants**.

## Exact photo eye study: topology, vector flow, edges, depth

The original CC0 608×1082 source close-up has an **outer canthus x216,y558**, **inner canthus x318,y545**. The upper palpebral **crease crosses x270,y518**; the attached lash rim crosses x266,y536; the lower eyelid rolls through x269,y566. The near iris is at x260,y546. The upper lid's crest moves diagonally up-right through the photographed medial half; a precise second narrow skin fold follows its arc about 15–20px above. Source near-right sclera x~290,y545 is warm-grey, not cartoon white.

The existing V36 ANAT1 registered 468-vertex MediaPipe canonical facial mesh, yaw/pitch/roll camera, projected **exocanthion.R**, **endocanthion.R**, **palpebrale-superius.R** and **palpebrale-inferius.R** supplies *direction and topology*, not the person's identity. Conserve **≥90% source-observed 2D coordinates** with only 9% canthal reprojection and ≤2.5px bounded pose shifts; 3D eyelid depth contributes ≤1.1px of bounded bend, centered on the true photographed tarsal crest. The original photo governs all individual contour landmarks. Population-average mesh cannot overwrite the source identity.

### Nine connected native wax surfaces rebuilt without dropping detail

| Actual existing node | Original source-derived geometry and anatomical intent |
| --- | --- |
| `sclera-near` | 4 continuous asymmetrical cubic sides, source canthi exactly shared with original lid, tapered opening whose centre projects over the actual iris |
| `sclera-inner-contact-near` | Narrow, parent-clipped neutral wet scleral patch behind medial tarsal edge; separate curved lower edge; no pure-white triangular sticker |
| `iris-near` | Original measured native brown iris, partial upper concealment by the lid; no arbitrary oversize circular disc |
| `pupil-near` | Smaller optically occluded inner globe, still parent-clipped to original iris with all source-timed corneal reflexes unchanged |
| `upper-lid-near` | Tapered 3D tarsal skin crescent from lateral to medial photo canthi, no sharp flat upper polygon |
| `lash-root-near` | Separate dark wet upper margin connected along true canthal rise, all native 16/33 photographed lash lines untouched |
| `lower-lid-near` | Slightly raised 3D tarsal tissue curve leading continuously toward infraorbital flesh/cheek rather than a discrete almond outline |
| `lower-lid-margin-near` | Narrow inferior contact following the lower palpebral sulcus, not a second generic eye-shaped vector sticker |
| `upper-lid-crease-near` | Actual photographed x270,y518 superior sulcus separated from lower lash tarsus; a coherent continuous anatomical fold |

All **nine** existing paths use **four cubic Bézier segments each** with photographed anatomical control points. Bounds are recomputed over *all original control vertices* and use the full native wax contact and texture system; original existing colors, pressure, opacity, wax layering, timing and source draw IDs are **deep-identical**. No new eye ID, lashes, hair, seed, frame rate or paper element. Existing 300-frame film, 19 photographed green canopy contours and all remaining facial/ocular/malar/mandibular elements unchanged.

## Test and visual rejection protocol

1. **Units + TS**: Source hash and reg.rmse; all nine source geometry and canthi/crease ordering; fail closed on absent original source face/eye/hair, duplicate IDs or repeated V46 application; all original colors/wax pressure + timing and 300-frame exposure unchanged. Compare both original 16-lash `sparse` and optional 33-lash `rooted-flow`. Two detail states.
2. **Exact-head Chromium**: Re-render same-source original V43 and new V46 on the *same commit*, both at **608×1082 1×** and **2.8× actual eye zoom**, absolute f299, camera/paper/seed identical. Protected original CC0 green-canopy top-left and original nasal source pixels must match byte decoded RGB between source-negative control and candidate; check no missing GPU-compositor face tiles. Artifact PNGs are not independent artistic approval.
3. **Independent original-photo SSIM & region color / negative controls**: Compare source vs V43/V46 whole, face, near-eye, upper-lid, underlid, medial canthus, iris, upper photographed brow and three negative controls. Report both directional color and structural likeness; do not declare improvement unless actual native pixels prove it. Compare native at 1× and 2.8× and reject any new hard vector/polyline, iris that floats outside actual sclera, material plasticization or loss of source micro-elements.
4. **Art hold**: Source whole-image **≥0.85 SSIM** required by existing PR; all 18 final native-render ANAT1 anatomical landmarks, five full source human value planes, complete actual 300-frame video inspection, and independent artist approval remain missing. Do not merge or promote by merely passing renderer tests.

**Initial verdict: experimental, unapproved, PR #461 DRAFT.** The goal is to test real source-fitted ocular geometry instead of repeating pigment-only V44 and extra-lash-only V45 studies.

## Exact-source V43→V46 independent native Chromium review

**Authentic pixels, not synthetic contour assertions.** Pixel head `6a4e73602dde4b14eb5f850b13b62f54e8cc9e68`, same protected licensed CC0 608×1082 RGB photograph, original `seed=441501`, source `focusX=304,focusY=541,zoom=1`, absolute frame 299. V43 and V46 are two independent renderer invocations from **the same commit**, not screenshots from disparate branches. No visual contrast alignment, retouch or RGB transforms applied. 2.8× zoom screenshot used only for artistic texture review, not source SSIM computation.

- [GitHub Actions native 1× portrait and 2.8× near-eye evidence, artifact **14310999761**](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44045846628/artifacts/14310999761)
- [Actual Chromium test PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44045846628), [strict TypeScript and 70 changed test suites PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44045846761), [native CRAYON1 four-pass drawing grammar PASS](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44045846743).
- Independently decoded the artifact's original V43 and candidate V46 **actual** source-camera RGB frames; calculated `skimage.metrics.structural_similarity(photo,candidate,channel_axis=2,data_range=255)`, and mean absolute RGB error (**MAE**) on exact matching source pixels.

| ROI (x0,y0,x1,y1; CC0 608×1082) | V43 source SSIM | V46 source SSIM | Δ |
| --- | ---: | ---: | ---: |
| Whole original source (0,0,608,1082) | 0.496979 | **0.497072** | **+0.000093** |
| Full face (108,282,502,862) | 0.622734 | **0.623006** | +0.000271 |
| Full near eye (175,450,360,625) | 0.574376 | **0.576375** | +0.001999 |
| Upper + lower eye anatomy (216,513,325,593) | 0.394864 | **0.414968** | **+0.020104** |
| Iris (239,531,292,570) | 0.457611 | **0.512308** | **+0.054697** |
| Medial canthus (285,530,320,565) | 0.326379 | **0.340666** | +0.014287 |
| Lower tarsal roll (215,558,322,595) | 0.518274 | **0.535934** | +0.017660 |
| Upper sulcus (202,493,326,540) | 0.418637 | **0.420936** | +0.002299 |
| Far eye (395,450,477,555) | 0.390650 | 0.390650 | 0 |
| Forehead (105,285,455,440) | 0.695480 | 0.695480 | 0 |
| Source tree canopy (0,0,608,163) | 0.534956 | 0.534956 | 0 |
| Nasal control (355,600,420,665) | 0.510049 | 0.510049 | 0 |

**Caution:** The absolute mean RGB error *worsens* slightly: full original 27.72→27.79, full face 27.41→27.60, near-eye 32.48→33.84, iris 26.95→28.87, lower lid 42.41→51.09. The photographed geometry's **structural** SSIM improvement does not translate into better RGB values. The initial V43 → V46 near-eye 2.8× qualitative comparison shows a rounder aperture, more natural upper lid taper and a less triangular inner white; but the iris is still a simple circular wax disc, the pale skin lacks a believable corneal/zygomatic volume roll, the eyebrow remains sparse/low definition and the hair/face read as stiff, flat cutouts against large stylized foliage.

V46 makes a *small verified source-geometry improvement*, especially the photographed iris and connected lower tarsus, unlike failed V44/V45 contact-only changes. The whole-image gain is extremely small. **It is not an artist-approved or production-ready human face.** Do not equate positive source SSIM at this resolution with realistic physical hand-drawn art.

### Updated priorities and CI resource policy

1. **Highest:** Reconstruct **continuous 3D human facial material field**, not five extra standalone shadow patches: project ANAT1 mesh normals into source camera and build source-observed photo-tonal underpainting along forehead→brow root→infraorbital→malar crest→nasolabial fold→jaw with native dry-wax strokes and all original fine detail retained. Do not substitute flat color planes or a PNG source photo.
2. Rework **iris and tearfilm realism**: source eye still too icon-like at 2.8×. Need physically rim-clipped corneal highlights, limbal shadow and better wet sclera curvature, with original source measured landmarks and no new generic clip-art. Preserve individual lash roots and source expression.
3. Resolve **large helmet-like hair masses and repeated greenery** by increased photographed spatial frequency and paper-pigment granularity without raster textures or simplified shapes. Background style remains stylized even where SSIM increased.
4. Independently audit all **18 actual final-render** anatomical landmarks and **five fully connected source-relative skin value planes**, all **300 complete frames at actual playback speed**, and separate professional artist signoff. Current tests cannot substitute.
5. **CI efficiency:** Keep historical native V43, V44 and V45 e2e scenarios in source for opt-in/manual regression. In the PR's fast native browser workflow run only the **latest V46 with its same-head V43 comparison** plus the baseline reference audit, avoiding duplicated heavyweight historical screenshot exports on every subsequent documentation/implementation commit. Source/contract/unit and native drawing workflows remain enabled. Restore broader matrix for final release review when genuine art approval is achievable.

**Final decision for V46: continue experimental !dev, ART HOLD, leave #461 DRAFT / DO NOT MERGE.** Current whole-photograph SSIM **0.497072 << required 0.85**. Geometry moved in the right source-observed direction, but neither the drawing nor full video meets the professional realism criteria.
