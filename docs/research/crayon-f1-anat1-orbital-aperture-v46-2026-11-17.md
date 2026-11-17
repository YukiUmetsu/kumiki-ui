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
