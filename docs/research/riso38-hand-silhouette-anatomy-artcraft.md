# RISO38 — ArtCraft v9 source-red hand silhouette rebuild

**Subject:** original handoff in `Video/RisoArtcraftStudies/HumanHandAnatomyPrint`, both physically printed characters and both original 240-frame 16:9/9:16 films.

**Status:** structural study and authored original SVG source / pending native Chromium visual approval. This is NOT a source-faithful recreation or a three-quarter photographic hand. The reference material is for observed *drawing logic*; third-party source images are **not** used as textures, screenshot masks, traced paths or runtime assets.

## Original visual analysis and external reference board

| Source / rights | Exact visible construction observation | Rejected shortcut / source intervention |
| --- | --- | --- |
| [Proko, *How to Draw HANDS – Details for Realistic Hands!*](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/), process study, copyrighted educational notes | Three bone phalanges are visually different: proximal most padded, intermediate firmer/flatter, distal upswept fingertip wedge. Dorsal tendon side is flatter, palmar compressed pads convex. | Prior RISO31 shared near-identical bulging tube silhouette for all three segments; replace actual source contour for each bone with semantically different C/Q Bézier bulges, angular transitions and taper. |
| [Proko, *How to Draw Hands from Imagination*](https://www.proko.com/course-lesson/how-to-draw-hands-from-imagination-step-by-step/), copyrighted educational | Finger knuckles sit on a staggered arc and long middle digit vs short pinky have distinct motion. Thumb CMC/metacarpal is independent, not a fifth parallel phalanx. | Preserve real ANAT1 joint tree and four asymmetric source digits. Do not rotate/mirror a photo or stamp same four rectangles. |
| [Mitch Leeuwe, illustrated hand bone study](https://pbs.twimg.com/media/GibmKyOXoAAe-gc.jpg), publicly displayed reference, artist retains rights | Original diagram depicts metacarpal fan rooted toward carpus, unequal phalange lengths and separate proximal/index MCP, along with S-shaped thumb attachment. | Keep distinct source `left/right-hand` roots and separate `pip,dip,thumb-ip` joints, not free-floating curved lines. |
| [Stan Prokopenko, hand anatomy palm musculature](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/), process study, copyright retained | Thenar and hypothenar transition into wrist, thumb-index web changes from stretched to loose curve as the pinch tightens. | Avoid simplistic red mitten shape at wrist/thenar. Next stage must address projection and true thumb-index tip contact. |
| [Lale Westvind, *Grip vol. 1*, actual Riso ink](https://www.perfectly-acceptable.com/item/grip/), copyrighted genuine printed art | Original hand-drawn dense red/blue interleaving shows offset screen ink but recognizably intentional muscle and finger interlocks, with crisp thumb boundaries. | No global opacity feathering, digital Gaussian blur or synthetic 3rd ink. Preserve native RisoPrint screen/registration and ink-separation order. |

## Actual original frame critique (RISO37, genuine native screenshot)

Artifact: `riso37-verified-final-chromium-proof.zip`, `riso32-two-original-hands-160.png`. Inspected source contact f160 and full-film landscape/portrait f160.

- Courier right hand (downward in native workbench): 4 mostly **linear, parallel red capsule-like strips**; proximal, intermediate and distal share similar bulge profile, making source joints readable mainly through blue bars. Curvature doesn't communicate palmar fat versus dorsal planar bone.
- Paper Artist left hand (horizontal in native workbench): similar repeated red sausage cross-sections; palm grossly rounded, ink reads like a glove stamp; thumb protrudes as a hook on the underside instead of opposing index contact.
- Physical red stencil has no cross-digit area collision and nonzero fingertip edge gap according to real RISO36 inspector. Passing that gate proves red contour *isolation only*. It does **not** prove believable grip.
- Wrist cobalt paper-clearance from merged RISO36 and distinct cobalt source nail/tendon from merged RISO37 must remain unmodified.

## Five-axis structural anatomy plan

1. **Topology/continuity:** retain all 12 physically overlapping phalanx regions per hand. Per-bone source path includes explicit closed Bézier hidden cap extending beyond PIP/DIP pivot: 2.3-source-unit inboard overlap. No missing finger/white hole or disconnected distal ink.
2. **Vector flow:** redesign 3 **different** stage paths: proximal pad bulges subtly palmar before narrowing to PIP; intermediate segment follows a less convex, firmer nearly planar side with localized caps; distal tip sweeps asymmetrically into the nail bed. Each of index/middle/ring/little has its own `drift` and ANAT1 bone-length identity.
3. **Ink weight:** retain red `plate=red,paint=solid`, blue joint-local moving RISO37 engraved detail, and the original physically screened cobalt/red region. Never turn red into translucent overlays.
4. **Temporal rhythm:** leave original frame keys, handoff animation 0–239, source hand pivots, paper ownership and two aspect ratios intact while the **same source SVG paths** travel through existing PIP/DIP transform matrices. Structural redraw is isolated from pose retiming; thumb/index contact dynamics are a separate next-stage gate.
5. **Microtexture:** emit multiple irregular C/Q inflections with 0.001-source-unit precision, not fewer vertices; preserve actual printer dot frequency, misregistration and paper tooth for existing `RisoPrint` renderer and ink parts.

## Implementation and QA

- Existing source builder `src/video/riso31-finger-phalanges.ts`: `pathFor(kind,...)` now produces visibly unequal proximal/intermediate/distal authored red Bézier silhouettes. Existing API/side/matrix/part IDs untouched. `RISO38_SOURCE_SHAPE` documents explicit design stage and overlap assumptions.
- Regression `tests/riso38-hand-silhouettes.test.ts`: source parts must remain closed, 4+ C-curve controls, positive physical area, hand-specific lengths and plate identities, exact real emitted source on both actors and all sides throughout hold/anticipation/contact/release.
- RISO36 source-red ink edge-gap inspector remains live in the original Storybook, which gets RISO38 drawing label. Native screenshots and both output ratios checked by the existing scoped playwright suite. The **actual print at f160/f166** is the visual gate.

## Remaining to release

New figure curves cannot by themselves solve the RISO37 inaccurate **thumb-index pinch**, dorsal/hypothenar mass and sheet-contact foreshortening. Check isolated blue/red and combined f160/f166 native screenshots, then inspect exact thumb joint source coordinates and adjust anatomy if safe and supported by real observed reference poses. An independent paired human-anatomy fidelity source/mask is not available; no world-class photorealistic hand claim.
