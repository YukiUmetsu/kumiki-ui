# RISO53 — Original Palmar Cup and Supporting-Finger Depth Composition

**Status:** ArtCraft candidate, independent native screenshot review REQUIRED. This is a direct continuation of existing Risograph PR #471.

## Authentic visual references

- [CDC NIOSH, Six Basic Classes of Finger Position, Figure A8, p. 60](https://stacks.cdc.gov/view/cdc/179564/cdc_179564_DS1.pdf). During a lateral paper pinch, the thumb presses the index's radial border; the other three digits **curl inward into the palm**, leaving their bases hidden or partly hidden by the palm volume. Importantly, they do not fan out as equally visible sausages.
- [Clinical Gate: Forearm, Wrist and Hand](https://clinicalgate.com/forearm-wrist-and-hand-2/). The thumb's CMC web is a separate anatomical volume from the middle/ring/little finger metacarpal arch. The MCP base of each far-side digit emerges from the knuckle crest and may disappear behind the thenar/hypothenar pad in 3/4 views.
- [Hand and finger anatomy study, Proko](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand). Bony knuckle and palmar muscle volumes must overlap in a physically coherent near-to-far order. Fine engraving alone cannot correct a contour that is drawn in the wrong depth order.
- [The American Drawing Book, original historical hand engraving, page 11](https://upload.wikimedia.org/wikipedia/commons/7/78/The_American_Drawing_Book-_A_Manual_for_the_Amateur%2C_and_Basis_of_Study_for_..._%28IA_americandrawing01chapgoog%29.pdf). In the 3/4 clenched hand, drawn far-side fingers visibly tuck beneath the broad palm mass. These engraving illustrations are reference only, never rasterized, traced or redistributed.
- Real repo evidence: RISO51 native workbench f160 [GitHub artifact ID 14228975537](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43872099334). Enlarged shots showed a flat red mitten with separate hanging support fingers; the previous drawing painted **every whole support finger on top of the palm** even though the source bone pivots bent.

## Why the previous anatomy still looked wrong

Previous RISO49–52:
- Created real ANAT1 PIP/DIP joints, clinically bounded flexion and source projection.
- Re-authored RISO50 true 16-cubic palm and four asymmetric MCP ridge engravings.
- RISO51 created moving original vector path keys; RISO52 joined original RED shorter pulp and COBALT nail on the same moving DIP in the physical two-ink stencil.
- **But** the red palm remained earlier in painter's draw order than all **nine** red middle/ring/pinky anatomical bone paths. They were completely overprinted at the wristward connection. A finger appears externally attached like a sausage even when the internal bone moves correctly.

RISO53 fixes this causal print error with **physical source-layer ordering**.

## Actual implementation

`src/video/riso53-palmar-depth-composition.ts` has `riso53ReorderPalmarInk`, `riso53OccludedFingerSourceIds`, `riso53InspectSourceDepth` and a named RISO53 anatomical source contract.

At **both** Courier-right donor and independently authored Paper Artist-left receiver, on every original 24fps/cadence-2 cel:

1. The **original** nine RED physical positive source parts (proximal, intermediate, distal for middle/ring/pinky) are drawn first (far/deep flexor plane).
2. The **original** one-piece 16-C red palm cup is printed above their knuckle roots (metacarpal plane). Parts and points remain intact; the palm legitimately *occludes the proximal overlap*.
3. The **original** thumb and independent index source are drawn after the palm (radial pressure). Nail rims, DIP / PIP folds, tendons, CMC web and RISO50 four BLUE MCP facet sources retain exactly the same native original vectors, part names and move with the same anatomical joints.
4. The true opaque moving paper sheet is still printed in front of these complete original actors, with only **six actual index print-source parts** permitted to print on top of the page at original RISO43 source contact. Thumb and support remain behind page. No new paper, fill, opacity or RGB mask.
5. Other unrelated hand and character source part order is untouched. Output remains two separate print masters, real registration and original paper grain.

**This is not a shortcut that removes fingers**. All 12 RED original fully articulated phalange source silhouettes per hand remain fully authored and individually animated. It corrects the painter's physical occlusion order of supporting roots, not their dimensions or clinical structure.

## Hard validation gates

- Original source list is one-to-one preserved (same IDs and part object identities) and idempotent, except stable reordering the nine **active** far-finger RED parts before the carpal cup. Artist identity and unused other hand remain unchanged.
- Source-only test: `tests/riso53-palmar-depth-composition-artcraft.test.tsx` verifies 9 behind-palm moving RED sources, thumb/index preserved above palm and original source object references not rewritten, 2 real plates, true original nail print and actual React SSR path DOM order at contact.
- All original RISO31–52 tests still execute, no single frame lost and no new pixel textures or external images.
- Every 2-frame sample over full 240-source frame timeline: actual source centerline gap >3, no crossed axes or losing one of the 12 RISO31 red anatomical segments. Both original 16:9/9:16 index-over/thumb-under true paper contacts pass at f160 and f166.
- Original Storybook panel exposes `data-km-riso53-original-red-support-behind-palm=9` on active source hands (0 on untouched other hands) and has the original interactive 6.2×/7.4× two-plate source workbench and 16:9/9:16 film.
- Independently open **actual** Chromium f160/166 native captures and compare to RISO52 at 1× AND 6.2×. Check whether fingers read as an attached continuous cupped palmar volume, retaining real cobalt crease and visible red pulp, and no harsh red silhouette cut-offs at the palm edge.

**Quality status must remain draft** if the full-motion native render still looks like a fist with three rakes. 3/3 CI green alone is not ArtCraft approval. Do not merge PR #471 without external-anatomy-aware visual judgment.
