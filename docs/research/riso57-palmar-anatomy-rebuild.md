# RISO57 — positive-ink three-quarter palm: radial/thenar to four unequal MCP crests

Status: **candidate / artist acceptance PENDING**. Continue draft [PR #471](https://github.com/YukiUmetsu/kumiki-ui/pull/471), do not merge on test green alone.

## Reference deconstruction

**Real exchange:** An actual photographed hand-to-hand paper transfer (Getty Images, 2023 [hands exchanging paper](https://www.gettyimages.com/), visual-only reference) shows that the active thumb sits obliquely across the sheet while the index pinches the opposite surface. The thenar ridge merges into the radial carpal wrist and opens a visually *concave* first-web inset before the radial MCP. The three unopposed digits are tucked back into the **same** palm rather than growing as three independent, forward-pointing rectangles.

**Medical/anatomical surface study:** [UCI Anatomy of the Hand — Coker, 2018](https://pdfs.semanticscholar.org/ee56/8ef4b84a6e87ad8fd0128e9bc507665a1c55.pdf) identifies first web space, thenar/hypothenar eminences, distal palmar crease, and distinct digital creases. [Treves, Horizontal Section of the Hand, 1922](https://etc.usf.edu/clipart/51300/51389/51389_hand.htm) distinguishes first dorsal interosseous, adductor pollicis, thenar opposition, hypothenar and ulnar tissue. [Proko detailed-hand drawing](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/) reinforces that the actual bony MCP peaks and web valleys must not all share one artificially rounded semicircle. Observations used solely for original topological drawing decisions; no photographs or third-party SVGs redistributed.

**Local clinical rig:** Kumiki ANAT1 `HAND_POSES.grip/.pinch` supplies joint progression, actual four metacarpal-ray lengths and reference angles. Previous RISO31–55 validated independent 3-segment RED finger sources, PIP/DIP joints, under/over-page printing, and ink gap. These do not themselves make a visually credible **palm**.

### Failure observed from native RISO56 close-up

At actual 16:9 f160 close-up, the Courier's red palm was a broad semicircular mitten below its cuff, with three separated reddish fingertip blobs; the Paper Artist's red palm looked like a flat paddle with a V-shaped thumb/index cluster and a broad top edge. Source thumb/index pressure and clinical phalanx axes passed, but **macro positive red tissue was not continuous-looking** or anatomically differentiated. Camera work enlarged that defect; adding another 0.5-unit BLUE hatch would merely make it louder.

## Original source construction

New `src/video/riso57-palm-contact-silhouette.ts` owns 16 named source skin landmarks on the **same positive RED source part** `left|right-glove`:

1. radial carpal wrist
2. flexor carpi radialis
3. thenar bulge
4. first thumb/index web inset
5. index MCP
6. index–middle web
7. middle MCP
8. middle–ring web
9. ring MCP
10. ring–little web
11. fifth MCP
12. hypothenar heel
13. pisiform/ulnar wrist boundary
14. ulnar wrist
15. palmaris wrist axis
16. radial wrist return.

Each anatomical point carries a **specific** radial/longitudinal source coordinate and locally adjusted C1 Bézier handle tension. Source anatomy: first-web concavity is >0.9 source units behind its radial MCP crest; middle MCP visibly rises above ring and little; hypothenar heel indents before the wrist. Unlike the earlier manually disconnected 16-cubic mitten, all incoming/outgoing cubic tangents are built from **shared** per-knot Hermite derivatives and join in C1 flow. Web hollows use lower tension than carpal bulges to preserve real tissue folds. The 16-C RISO50 source richness is retained, but the actual whole RED positive silhouette is reauthored; this is intentionally a *new original positive body*, not a cosmetic addition.

Both actors have original, distinct thenar, web and ulnar variation, mirrored to correct side without inverting the source plane. `riso47PalmContour` remains the prior public, tested source contract, now delegating to the RISO57 original anatomy drawing. **Other physical details do not change**: all RED support/index/thumb articulated bones, moving cobalt blue nail and tendon microengravings, RISO46 thenar-plane layers, RISO54 interdigital paper reserves, RISO55 source curl, real two-color register, physical page under/over index and thumb, and source 240 frames.

At the real f160 paper transfer, existing RISO51 continuous 2D perspective evaluation applies to this **new positive** original palm, not a raster overlay. No new body IDs or extra print plates. Supports both portrait and landscape RISO56 actual moving camera.

## Acceptance and practical limits

- `tests/riso57-palmar-silhouette-artcraft.test.ts` validates **exact 16 named landmarks and cubics**, shape area between 225–360 source units, local first-web inset, unequal MCP heights and wrist limits, **non-self-intersecting** one-closed-contour positive RED shape at .12-unit sampling, and actual incoming/outgoing cubic tangent alignment (<.016 source cross product).
- Each animated actor retains original real RED/BLUE masters, all prior **specific** source part IDs, opposite-hand rest at exact source `d`, and an altered original f160 positive contact contour (true RISO51 animation). Both f160/f166 physical paper-contact stamps still require index RED over and thumb RED behind in 16:9 and 9:16.
- Original strict RISO42 no-crossing **other-finger red ink gap** / RISO33 bone gap / RISO54 web reservations and real pressed paper all remain unchanged. RISO56 native close-up is the mandatory final 1× artist inspection; an exact geometric source pass is **not** evidence of believable human anatomy.
- Storybook now reports `data-km-riso57-source-landmarks=16`, `data-km-riso57-first-web-inset` from *actual source points*, and `data-km-riso57-original-positive-contour=true` from the actual original rig source, not a decorative label. Native RISO46 hand workbench captures both real physical ink masters at f144/154/156/160/166, 6.2× and 7.4×, plus film f160 1× portrait/landscape.
- **Reject if** positive palm still resembles a small slab/mitten, if the anatomical concavity exposes a page-white pinhole, if the thumb/index base reads detached, or if the three RED distal curled pads appear as independent floating round dots; keep draft, do not claim world-class/photographic approval.

Known simplification **not concealed**: ANAT1 skeletal projection is clinical reference, not true view-calibrated 3D hand biomechanics. RISO57 still draws one editorial 2D palm plate and hence does not provide occlusion computed from a full 3D flesh mesh; further geometry could be required.
