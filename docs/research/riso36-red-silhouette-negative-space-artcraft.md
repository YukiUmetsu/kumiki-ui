# RISO36 — ArtCraft actual red-stencil negative-space measurement

**Continuation:** RISO35 already merged via #429. This pass addresses its remaining gap: prior RISO33 measured three-joint **centerline spacing**, not the red printed **edge geometry** that artists see. This source-inspection tool does not redraw, simplify, trace or blur any animation silhouette. It supplies a reproducible failure locator for the next anatomy/source redraw.

## Reference and five-axis deconstruction

| Reference image / observed feature | Original-design implication |
| --- | --- |
| [David Vanadia, Liens Tissés; original finished cobalt Risograph](https://www.creativeboom.com/inspiration/david-vanadias-bold-and-minimalist-illustrations-that-fuse-graphic-design-with-art/) | The authentic negative-space tunnels are **bounded by actual printed curves**, not by medial digit bones. Distinct close crossings are intentionally drawn; accidental blob merges are not corrected by shifting registration. |
| [Jennifer Colquhoun, Fingers Crossed Anatomy Risoprint](https://harp-cowbell-wcet.squarespace.com/shop/p/fingers-crossed) | Real anatomical curls and tendons remain legible through multi-color overprint; joint-local nail/shadow engravings must stay registered to a moving, closed digit. |
| [Jennifer Colquhoun, Thumbs Up Anatomy Risoprint](https://harp-cowbell-wcet.squarespace.com/shop/p/thumbs-up) | Thumb web and thenar mass bend independently; curled four-finger silhouettes should retain asymmetrical valleys and stable nail-beds. |
| [Joe Maccarone, real Risograph press interview](https://inkygoodness.com/features/risograph-tips-illustrator-joe-maccarone/) | Real print misregistration can reveal accidental paper-white halos. The source geometry must be inspected **before** registration/dot gain, and final render after. The original ink master need not be blurred/flattened to force apparent continuity. |

- **Topology:** measure three paired *closed red* Bézier shapes for each neighboring finger; count actual edge touches/intersections separately from legitimate same-finger phalanx cap overlap.
- **Flow:** transform every original source contour by its evaluated **source-frame FK/IK matrix** before comparing shapes. A stiff axis cannot represent an asymmetrical tapered curved PIP/DIP.
- **Weight and volume:** report proximal/metacarpal, middle, and distal stage-space ink clearances separately, including where a wide red pad intersects a neighboring thin tip. No guessed geometric rectangles or image effects.
- **Temporal rhythm:** expose deterministic measurements at rest/contact/release/end in the existing Storybook and run tests throughout every other film frame during actual handoff.
- **Physical medium:** measure the **red stencil source** prior to blue/red registration, real material screening and paper spread. This is a geometry QA gate, not a screenshot pixel-alignment or model-anatomy-fidelity verdict.

## Implementation

`src/video/riso36-red-silhouette-gate.ts` introduces a bounded, deterministic `inspectRiso36RedFingerSilhouettes` (actual source path parsing, adaptive curved silhouette flattening, matrix projection, segment intersections and proper point-in-polygon containment). `riso36ContourClearance` distinguishes **positive paper-white distance** from **touching/overlapping ink (0)**, and deliberately does **not** claim a penetration depth or signed negative gap. Each adjacent index/middle, middle/ring, ring/pinky pair reports per-phalanx gap plus the count of all 3×3 section collisions. This is a diagnostic, not a silent post-processing mask.

The **same existing** `HumanHandAnatomyPrint` Storybook now displays actual minimum moving distal stencil gap and cross-digit contacts next to previous bone-axis values. Native Chromium checks the attributes while capturing red-only, blue-only and full two-spot screenshots in the existing film-looks folder. Source tests include edge touch, full containment, rotated affine transforms, actor/side poses, deterministic frame evaluation and frame-by-frame contact sampling. Scoped CI retains earlier RISO17/21/29/32 and two-aspect handoff checks.

## Remaining artist-release gates

1. Compare **recorded** f160/f166 source-red silhouette and f178/f186 release screenshots with separate cobalt-only and combined ink, reviewing adjacent white valleys and distinct nail/knuckle hierarchy at 1× and 6×.
2. Derive a **reference-observed** per-digit source-red minimum gap target (do not hardcode a population number or confuse skeleton spacing with ink clearance). Where cross-digit overprint is intentional, annotate which sections cross and print order; where accidental, revise actual source curves and preserve fine material details.
3. Check real encoded 16:9 and 9:16 film for f159/160,165/166,177/178,185/186,201/202 and full handoff. Green unit tests/Chromium do not establish a world-class art quality signoff.
4. Future: source-observed three-quarter/profile head/hand turnaround and 18-point anatomical face landmark fidelity, which require lawful reference images and semantic annotations. **Not validated by this geometry gate.**

## Actual Chromium visual inspection and workbench correction

The first RISO36 native `riso32-two-original-hands-160.png` was inspected at real screen scale after both CI workflows passed. Distal silhouettes were **distinct** (source gaps roughly 0.8–0.9 original units and no cross-digit contacts), confirming that RISO33's repaired MCP fan is working. However both wrists still showed heavy almost-black cobalt+vermilion bands. Root cause: the hand-only workbench selected the blue source forearm and red glove but *omitted the original actor's authored `wrist-underprint-clearance` part* from `onlyPartIds`; the full film already included it. This was **an inaccurate isolated-workbench print**, not a reason to blur real blue/vermillion source artwork. The fix selects the existing source paper clearance in the original workbench, so `RisoCharacterInk` subtracts earlier source ink via the same native mask. The browser test now requires both the source knockout and its physical paper-clearance mask. Re-review both native plates and the full 16:9/9:16 film after this specific correction.

**Release status:** visual improvement is subject to direct inspection of the re-rendered screenshots. Even correct 2D ink contours and consistent press masks cannot alone approve a premium character's hands, face or proportions.
