# RISO49 — donor-side physical 3/4 hand support (ArtCraft candidate)

**Source:** continuation from merged RISO46–48 PR #460. This pass targets the Courier **right** hand, which remained an elongated three-tine support at the f160 original 960×540 full film despite the receiver's prior improvements. No newly licensed image asset is distributed.

## References and deconstruction

- [CMU Hand Holding Papers photograph](https://www.cs.cmu.edu/~jialiu1/database.html), specifically the hand grasping a paper stack in the image database. Authentic photo side/near-quarter view: thumb forms a transverse paper-contact surface, index wraps the upper edge, and the other digits turn underneath rather than extending as parallel rods. Use the **topology, occlusion and projection logic only**; do not trace photography or copy any pixels.
- [Proko, Details for Realistic Hands](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/): phalanx pads, nail caps and knuckle crests are unequal; a projected bent finger is shortened along its axis but retains its real three bone lengths. Compression acts on camera projection, not anatomical bone measurements.
- [Proko, Hand Muscle Anatomy](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/): thumb/opposition is a distinct radial plane, while little/ring/middle turn into the ulnar palmar cup. Source architecture must keep thumb/index actual printing in front of/behind the opaque letter, rather than draw a generic palm overlay.
- [MICA Risograph file preparation](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/) and [RISOTTO print FAQ](https://risottostudio.com/pages/printing-faq): physical ink drum separation and translucent halftones; preserve source-aligned red silhouette, cobalt micro-incisions, nonflattened stencil masks and paper texture. No postprocess blur, third paint or flattened gradient.

## Independent source geometry

Original source includes a single main connected red palm, four individually three-bone red articulated fingers per hand, a red two-bone thumb IP, 23 named cobalt/red ArtCraft hand engravings and two physically separate RisoPrint inks. The Courier's index already physically touches the moving sheet and prints *over* it. A simple stronger MCP/PIP curve previously failed exact white-space >3-unit full 240-frame checks; do not repeat it.

**RISO49** changes only the Courier donor's three support finger joint PIP/DIP **projected 2D Y stations** within the original named bone hierarchy:
- middle: -1.80/-1.70 source units
- ring: -1.95/-1.55
- little: -1.65/-1.35

The return contract is one independent source joint object for each affected digit: all original keyframe times, pivot rotations, real red shapes, blue nail/detail marks, two-color print density and index/thumb paper geometry are preserved. The projected shortening begins as the sheet approaches f160, holds through the donor grip f178, then gradually relaxes on release to normal f205 and f239. The renderer continues interpolating actual authored source keys at 24fps. Only Courier gets this new projection. **PAPER_ARTIST** still derives its joints from `COURIER_BASE_JOINTS` (canonical pre-donor skeleton), then independently applies its original RISO48 left-hand projection. This prevents accidentally altering the receiver's non-gripping right hand.

**Medium:** Every red source remains a physically stamped solid path; all genuine light/mid cobalt screened pressure contours and paper knockout masks remain. No screenshots or anatomy photos are imported into the library, and no image or shape is raster-pasted onto the film.

## Hard QA and release

1. Both actors × both hands × every 2 source frames: no support-finger axis intersections, and every gap strictly **greater than 3 source units**. Real red contour count 12 per hand remains; do not weaken failures by adjusting thresholds.
2. At donor f160, original middle/ring/little 3-bone printed part station distances must be visibly shorter (>1 original source unit), not shorter in real clinical anatomy. Their visible root/intermediate bone proportions remain >56% of original, and original index is not shortened.
3. Paper ownership: f160/f166, landscape and portrait, physical source donor and receiver red index intersect actual curved sheet, print above sheet; thumb and other 3 remain **below**. Preserve native ~240-frame 24fps handoff, full paper-feed, background character acting and source redraw effects.
4. Original Storybook artcraft workbench retains live pose/ink/separation controls and all prior RISO46 frame closeups, no new folder. Scope CI includes TypeScript, source unit and native Chromium both actors, true 2 spot inks, 960×540/540×960 f160/166 film.
5. **Artist acceptance separate:** independent real 1× film and 6.2×/7.4× source screenshot comparison to CMU grip reference for knuckle topology, thumb saddle and genuine foreshortening. The body/palm remains a stylized editorial 2D construction: a successful source QA is not evidence of photographic fidelity.

This is **a candidate ArtCraft improvement**. If actual image comparison still reads as claw/rake, leave PR draft and continue source macro-geometry, not additional ink dots.
