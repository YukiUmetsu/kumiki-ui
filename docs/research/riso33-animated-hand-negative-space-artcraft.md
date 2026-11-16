# RISO33 — ArtCraft negative space, opposed thumb and underprinted wrist

**Scope:** follow-up to [RISO32](riso32-opposed-thumb-artcraft.md), in the **same original two-color print masters** and existing Storybook story/240-frame film. This pass repairs the visible RISO32 Chromium rejection (f160/f166 crossing fingers, hook thumb, broad nearly black cuff). Original tiny etched nails, PIP/DIP curls, texture grain, spot ink, character face/costume, 16:9/9:16 cameras and handoff remain present.

## Actual craft references, not copied artwork

| Source | Observation used for original drawing |
| --- | --- |
| [David Vanadia, *Liens Tissés*, photographed finished Risograph](https://www.creativeboom.com/inspiration/david-vanadias-bold-and-minimalist-illustrations-that-fuse-graphic-design-with-art/) | Solid finger silhouettes remain legible through continuous white valleys, interwoven ink is deliberate, no accidental self-crossing MCP fingers. Study **topology and paper-white rhythm** rather than trace the print. |
| [Kat Schneider, *Pride & Prejudice Hands*, original mini Riso](https://www.katschneider.com/store/prideandprejudice-hands) | Fine knuckle and nail engraving lives **inside** clean finger masses, cuff is attached without a giant opaque overlap rectangle; the poster uses separated editorial color masters. |
| [Evan M. Cohen, *Bloom* Risograph](https://evanmcohen.bigcartel.com/product/bloom) | Deliberate changing hand gesture and inward-outward curved fingertips; asymmetry and selective contour strokes communicate motion and depth without flattening hand shapes. |
| [Hand MCP anatomical coordination, NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK538343/) | Four metacarpal/phalangeal digits fan rather than converge at the same point; thumb CMC/MCP/IP opposition must be coordinated and not mistaken for a fifth parallel finger. |
| [Kumiki ANAT1 pose source](../../registry/anatomy/anatomy-pose.ts) | Clinical ranges and skeleton attachment authority. They do not supply observed camera-specific printed hand contours. |

References establish **style/shape principles only** and are not embedded as copied path geometry.

## Source image rejection — baseline RISO32 native Chromium

The f160 RISO32 source screenshot was actually inspected at 1× and 3×. Main defects:
1. The Courier's **right-index MCP rotates 25° inward**, crossing the middle; adjacent index/middle centerline minimum about 0.12 source units. Middle/ring crowding and pinky inward turn produce a fused red triangle despite every finger having the correct PIP/DIP joints.
2. Paper Artist's four fingers curl parallel into a horizontal *rake*; little finger spacing is insufficient, and the left-thumb extended red pad is pushed outward/downward instead of turning inward across the first web.
3. Existing blue sleeve/red glove overlay and full-width blue wrist seam create black bars and round dark lumps that visually flatten the wrist-to-palm connection.

No exact-source pixel reference is claimed: these are original, stylized illustrations influenced by *technique* sources, not reproductions.

## Five ArtCraft axes — precise source changes

1. **Continuity and isolation:** replace pose-key MCP angles with a source-specific radial fan. Right contact fingers index/middle/ring/pinky `[-7,0,6,9]` degrees; mirrored left `[7,0,-6,-9]`. Preserve original 3-bone real red finger segments, nail and engraved blue curves, all IK roots and hand anchors. Fingers should remain separated at **all actual contact frames**, not simulated after render.
2. **Flow:** rotate real thumb CMC to +-37 degrees at physical contact, projecting distal thumb **toward** the index web. Red distal pad redrawn from an outward spur into a curved, tapered **down-axis** finger segment that turns inward as its real IP joint rotates. Attached blue nail relocated to the new distal contour.
3. **Weight and touch:** build an **irregular wrist-local paper underprint trap** in front of the sleeve and behind the red glove, retaining a thin purposeful cobalt/vermilion cuff seam rather than a broad nearly black cylinder. This is a true `knockoutOnly` authored source SVG path consumed by the existing physical ink renderer, not alpha reduction or a photo filter.
4. **Rhythm:** the donor's right and receiver's left MCP key sequences stay inside the source 240-frame timeline. Anticipation 90/92 → handoff 156/160/166 → release 180/186 → hold 198/239 are preserved; cross-actor contact schedule and physical letter remain unmodified.
5. **Detail and medium:** retain all 14 moving red finger/phalange masses per hand in paper occlusion, individual fine cobalt PIP/DIP print marks, thumb IP mark, source nail rims and tactile physical paper grain. Different original thumb-pad source C/Q contours remain left/right; no mirrored screenshot or third ink.

## QA and proof contract

- `src/video/riso33-hand-negative-space.ts` reads **the evaluated source joint matrices**, computes segment-to-segment distance across 4 fingers × 3 bones (including crossing tests) and exposes 3 named neighboring-pair clearances for inspectable source-time behavior. These are **projected axis** gap measurements, not the red shape's actual white-edge distance, and cannot replace image review.
- `tests/riso32-thumb-ip-artcraft.test.tsx` rejects source-axis crossings/negative centerline gaps during actual source/receiver contact and checks the wrist stamp as a paper knockout, not transparent ink.
- `tests/e2e-storybook/riso32-thumb-ip-artcraft.spec.ts` checks projected axis gaps in native Chromium and captures real original f0/160/166/186/198 RisoPrint output plus both separated ink masters and opposite hands.
- Existing RISO17 actual physical letter-occlusion contract and RISO29 head/neck/figure, RISO31 phalanges must remain valid. Production example still requires both 16:9 and 9:16 physically encoded frame QA.

**Important:** A nonintersecting centerline cannot certify the *ink silhouettes* are anatomically sound. Visual acceptance must check the silhouette at 1×, zoomed joints at 3×, printable grain, paper-white web spaces and whole-film handoff. The native Chromium release screenshots must be reviewed; PR may remain open if still not world-class. Human ArtCraft 9.1 full landmark/segmented-mask fidelity gate is still unavailable without paired annotated comparable source/anatomy reference views; no artist/likeness approval may be asserted.

**Next priority:** if f160/f166 still read as mittens or a rake, refine the actual PIP/DIP silhouette geometry and web shape per affected digit; then add a calibrated red-ink silhouette distance proof and independently review true 16:9/9:16 encoded handoff video before merging.
