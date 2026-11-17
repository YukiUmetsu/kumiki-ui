# RISO54 — physically reserved-paper interdigital contours

**Status: native source-geometry candidate; artist approval on HOLD.** Builds on RISO49–53 in the existing [Risograph ArtCraft PR #471](https://github.com/YukiUmetsu/kumiki-ui/pull/471). Do not confuse source validity/green CI with realistic anatomy. At original 1× film scale, the hand still reads as a red glove/mitt with dangling support fingers.

## Reference board and contour study

- [**Kilian van de Water — *Tabak*, original Risograph printed by Studio Rosi**](https://studiorosi.de/products/tabak-by-kilian): an authentic printed scene of two interacting hands. Observe **interdigital concave white valleys that open from the exterior**, asymmetric index/thumb outline flow and gently tapering outline accents. Four-color print is technique reference; this work retains its own existing **two** original inks. No illustration pixels, tracing, copyright images or third-party texture copied.
- [**CMU hand-holding-papers photographic reference database**](https://www.cs.cmu.edu/~jialiu1/database.html): real opposed thumb/index surface to paper, ulnar digits folded into the palm with partially hidden pulp and webs. The three fingers form **connected curved masses** rather than separated straight tines. The reference provides qualitative topology, **not** calibrated photograph-to-rig measurements or likeness.
- [**Proko, *Details for Realistic Hands***](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/): the web saddle is negative concave space outside the red silhouette. The thenar/index pinch is an opposed surface, not a paper-white hole punched in the middle of an otherwise full palm. Keep real PIP/DIP positive ink attached to the physical joint.
- [**MICA Risograph File Prep**](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/): spot-color masters print separately; reserved paper must exist in both physical stencil passes. An RGB “paper-colored” object on top of the final image would be inauthentic and break ink/material consistency.

## Root defect found during actual browser/source review

RISO53 reordered nine **fully solid RED** support-finger ink polygons before the **same fully solid RED** palm. Rendering two identical filled positive-ink shapes onto one physical RED stencil is a geometric **union**; DOM painter order by itself **cannot** make the fingers project *behind* the palm or create a new white valley. The previous order-only source assertion was necessary for chronology but **not** evidence of a changed printed silhouette. Any depth claim requires an actual change to source contours or an independently printed paper reserve.

## Five-axis ArtCraft deconstruction

| Axis | Underlying observation | Original-source treatment | Failure gate |
| --- | --- | --- | --- |
| Topology | RISO53's palm/finger union remains a broad mitt without authentic open outer valleys. | Two actor/hand-specific moving **negative paper** source SVG contours at middle–ring and ring–pinky commissures, each with four continuous cubic turns. | Not an internal detached palm “hole,” no cut through entire red distal finger. |
| Vector flow | Three long near-parallel red tines do not form interlocking ulnar support. | Short oblique C-scallops follow the far-side metacarpal cup source projection at real contact. Dissimilar contact stations maintain anatomical digit length hierarchy. | Preserve all original 12 red phalanges, independently moving DIP/PIP joints and cobalt nails. |
| Layer/material | A red-on-red path permutation cannot generate visual depth. | `knockoutOnly` source geometry in existing `RisoCharacterInk` clears **both** cobalt and vermilion physical masters, with authentic paper visible through the real stencil at the external web. | No third color, RGB overlay, raster mask, alpha/fade workaround or hiding texture. |
| Motion/contact | Open hand must not acquire ghostly white holes before receiving paper. | f0–146 source is a zero-area **nonprinting point** outside the metacarpal lip. Native SVG path-key morph opens two small valleys by f160 and persists through actor-specific release/still frames. | f0/f142 original two-aspect full films must remain pixel-identical; f160/166 real index above/thumb below opaque page unchanged. |
| Print/shot | Original hands occupy few pixels in the 960×540 stage; cosmetic changes at 7.4× may not read at 1×. | Preserve both original figures, exact 24fps timing, two native plate master screenshots, staged 16:9/9:16 paper and grain; judge full film **and** 7.4× crop. | Do not claim world-class realistic-human figure or merge without actual full-frame picture judgement. |

## Iteration and independent native review

1. **First candidate rejected after real PNG review.** Its 8.4-unit exterior white incisions cut through too much red positive finger mass, producing long unnatural white slashes at 7.4× in Courier and receiver. It technically passed full native Chromium, TypeScript, unit contracts, and paper contact, **but failed artistic quality**.
2. **Refined source shape:** four Bézier turns retained, but narrowed to a ~1.5-source-unit width and ~4.4-source-unit vertical reach. The f0 zero-area point remains. Added a test-area ceiling and both inside/outside positive palm border tests, protecting against both a floating isolated hole and oversized destructive gouges.
3. **Native exact-head evidence:** [full original Chromium run 43905845031](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43905845031), [native source screenshots](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43905845031/artifacts/14245157779), 1600×1198 hand Storybook at f160/166 + separate red/blue physical masters, and 958×539 / 448×799 films. All original physical-workflow checks in that run passed. This is evidence for the refined **pre-area-guard** source; the additional area-bound test is a separate nonvisual gate.
4. **Matched native comparison** against prior stable [RISO53 run 43899575785](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43899575785) (artifact 14239799751), >6/255 per-pixel max-channel threshold:
   - 1600×1198 workbench f160 changed **0.68468%** of pixels.
   - 958×539 landscape f160 changed **0.03389%**; 448×799 portrait f160 **0.03939%**.
   - Source f0 and f142 are **pixel-identical** to the baseline in the original 16:9 and 9:16 films (0 different pixels).
   - 1× film still shows the same broad mitt-like gesture: the new print-negative topology improves the physical ink logic but is **not sufficient** visual transformation to approve or merge.
5. **Remaining ArtCraft failure:** both hands still need a **positive red silhouette redesign at actual 3/4 paper-contact view**: interleaved index/thumb saddle and asymmetrical ulnar finger overlaps, plus more meaningful shot-scale storytelling at original 1×. This is the next priority—not another micro-engraving/overlay pass. Independent observed photographic geometry and accurate three-quarter landmark alignment remain unverified.

## Code contract and exact test boundaries

- `src/video/riso54-interdigital-paper-reserve.ts`: two **new** 4-C anatomical zero-area-to-contact negative print paths, physically rooted at moving hand joint, projected by existing RISO51 source path interpolation; active hand only. Inert opposite hand kept original.
- Existing `COURIER` and `PAPER_ARTIST` still print all original 12 RED phalanges, five fingers, original full-body actors, 16:9/9:16 page, visible print grain, double master and index-over/thumb-under registration. Both original actor specs unchanged except the two append-only reserved paper source parts.
- Source mesh sheet skips exactly the two **zero-area negative stencil** regions (they are neither drawable positive anatomical contours nor triangulable mesh) while the production print still retains and physically samples them.
- `tests/riso54-interdigital-paper-reserve.test.ts`: true negative source flags, all six original frame keys and all 120 two-frame moving cels, positive source identity, hard >3 unit untouched finger axis-gap, real 2-color ink pressure, f0 zero area, and a **closed, small external lip** at f160. Original sheet and eye/head/body mesh tests are preserved and must stay green.
- Existing Risograph Storybook tests inspect real `data-km-riso-paper-clearance` SVG mask paths for both original actor panels, not just a confidence attribute.

**Release recommendation:** keep #471 DRAFT/UNMERGED until a reference-led major hand-positive-ink silhouette change passes both native zoom and full-film 1× ArtCraft acceptance. Small source correctness improvements alone do not satisfy realistic human-hand quality.
