# RISO37 — original hand engraving, projected joint anatomy, spot-ink weight

Status: **reference-led source revision, technical qualification pending actual native Chromium print review**. This changes **live character source parts** used in both 240-frame figures and their 16:9/9:16 film; not a photograph, post-filter, new palette or rewritten material renderer.

## ArtCraft v9 input and provenance

- **Technique reference, no copying**: [David Vanadia — *Liens Tissés*, genuine Risograph hands](https://www.creativeboom.com/inspiration/david-vanadias-bold-and-minimalist-illustrations-that-fuse-graphic-design-with-art/). The published close-up exposes intentional narrow *paper-white spaces* between prominent fingers and strategically limited marked fingernail beds. The thin cobalt marks describe **creases and attachment**, not equal-weight dark bars across every phalanx. We must preserve negative-space tunnels.
- **Anatomical grip-study reference, no copying**: [Miyuli — *Hand Grip Drawing Tips*](https://hivemill.com/products/miyulis-art-tips-2019). The observed diagrams show curved, staggered MCP knuckles, varying degree of PIP/DIP flexion, and partial hiding of digits when a thin book/page is gripped; fingers do not align like four identical tines. This is a **drawing study**, not a claim of clinical reference coordinates or permission to trace.
- **Hand-gesture color plate process reference, no copying**: [Victory Dance Creative hand-pulled silkscreen print](https://www.victorydancecreative.com/store/hands). A *silkscreen*, explicitly **not** a Risograph or film source: useful only for intentionally sampled halftone color pressure and distinguishing pressure mass from small ink linework.
- **Observed projected anatomy reference**: [Kumiki ANAT1 registry](../../registry/anatomy/anatomy-pose.ts), with RISO31 PIP/DIP 3-bone original source transforms, RISO32 thumb IP and RISO36 cross-ink silhouette inspector. ANSUR is population guidance, not a measurement of these original stylized characters.

## Actual pre-edit Chromium critique

Native f160 RISO36 workbench screenshot inspected at full scale and 3× detail:

| Region | Existing defect | RISO37 source drawing objective |
| --- | --- | --- |
| Courier index–little finger PIP/DIP | Repeated equal-width parallel **black stripes**, unlike smooth asymmetrical bone surface creases | Replace two heavy marks with **three varied curved C/Q incisions**, individually anchored to the existing PIP or DIP animated bone |
| Both actor fingernails | Single large dark wedge spanned almost the entire colored distal phalanx | Two curved, small nail-bed and lunula-like micro contours; *screened* cobalt to avoid flat black blocks |
| Dorsal MCP arch | One broad connected dark scallop masked metacarpal fan and made the hand read as a jagged red claw | Four staggered distinctly shaped blue crest ribbons with paper between crests, anchored on the original `palm-surface` joint |
| Wrist/tendon | Thick blue full-width wrist mark fought the repaired RISO36 paper knockout | Two short **screened** irregular source creases, preserve existing wrist paper clearance and source thin cuff |
| Lateral finger form | Moving red digits still looked like smooth, undifferentiated sausages at contact | Add short **two-contour screened cobalt** proximal tendon plane on each independent digit, avoiding dark silhouette clutter and preserving source red shapes |

## Five-axis ArtCraft construction

1. **Topology continuity/isolation**: preserve **all 12 red physically overlapping PIP/DIP sections** and separately moving red thumb IP per hand. Add 4 named cobalt tendon plates per hand; all attached to actual source digit joints, independent from viewport overlays. Four short MCP crests are intentionally independent *engraving marks*, not disconnected finger geometry.
2. **Vector flow**: C/Q cubics follow the MCP arch's raised middle knuckle, change bend at PIP/DIP, and taper around the thumbnail. Maintain per-digit lengths (middle longest, little shortest), asymmetric bends and existing physical source work.
3. **Material weight**: keep full opacity/deposited pigment of the red silhouette; replace overly dense cobalt solid fills with narrower blue shapes and intentional `screenTone=mid` for thin nails/wrist/thenar, `screenTone=light` for tendon planes and distal creases. **Not a global opacity fade**.
4. **Rhythm**: same original 0–239 frame film; no new simulated keys or interpolated screen transforms. Nail and tendon ink stay on their actual existing moving bones. Preserve f156–166 pinch, f178–186 release and f198 hold.
5. **Microtexture**: maintain two physical `RisoPrint` masters, dot gain, paper grain, misregistration and original inks. Individual microengraving remains an editable source path with distinct red/blue deposition.

## Reproducible implementation and gates

- `src/video/riso37-anatomical-engraving.ts` is the independent original-drawing source.
- `src/video/riso-hand-artcraft.ts` integrates source paths into **both original actors and both hands** without deleting or replacing red original contours. `src/video/riso31-finger-phalanges.ts`, `riso32-thumb-ip.ts` and RISO36 red silhouette source remain unchanged.
- Source QA: `tests/riso37-anatomical-engraving.test.ts` checks physically attached joint-local printed details, independent closed Bézier contours, red path identity and original source-motion readability.
- Browser QA: same *existing* `HumanHandAnatomyPrint` Storybook checks four MCP strokes/five moving nail beds and native rendered two-plate f160/166, f0/186/198, red and blue isolated masters.
- Production QA: existing 16:9 and 9:16 original handoff browser film still renders with the same audio/scene clock, physical paper letter and correct grip masks.

## Unresolved release conditions

This is a **detailed original 2D editorial illustration**, not a skin-shaded 3D hand or photographed anatomically correct portrait. True three-quarter thumb opposition and individual facial landmark fidelity remain unproved without comparable independently annotated anatomical/figure references. **Passing tests alone is not an ArtCraft artist approval**. Next review must inspect full-scale print and 6× glove crops for too faint or too dark cobalt, the negative-space fan at peak, sleeve seam and physical paper occlusion. Rework any actual visual failures.

## Chromium visual iteration 1 — actual render, not test-only acceptance

The first RISO37 native Chromium f160 print has now been visually inspected alongside the prior RISO36 f160 capture. Observed real improvement: the four dorsal finger channels remain paper-white, the formerly full-width black MCP scallop is four thin crests, and black PIP stripes no longer dominate the distal pads. **Newly visible remaining defect:** two triangular near-black strokes on the wrist-side red palm and a heavy thumb-web wedge still read as dark painted holes, not tendon folds. These were inherited as `glove-detail` and `glove-thumb-fold` source ink in `src/video/riso-character-demo.tsx`, not fixed by the initial MCP source rewrite.

**Iteration 2 source correction:** preserve original source IDs and attachment to the original `left/right-hand` joint; redraw `glove-detail` as 4 short original C/Q source incisions and `glove-thumb-fold` as two short asymmetric C/Q web-crease shapes, print in `blue screenTone=mid` instead of broad blue solid blocks. Source tests independently reject the old unrefined triangular geometry. Re-render both real actors, real ink masters and film in Chromium; do not merge if the new source introduces pose detachment, blank color plates or unreadable details.
