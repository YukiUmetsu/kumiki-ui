# RISO59 — review-only view-conditioned continuous three-quarter hand envelope

**Art status: EXPERIMENTAL / MUST NOT PROMOTE TO FILM.** New physical-print source and an interactive native ArtCraft A/B. This deliberately continues the unsolved original RISO49–58 human-hand quality issue after structurally green #471 was merged at the user's request. No anatomy fidelity or world-class visual approval is claimed.

## Authentic reference and contour deconstruction

1. [Proko, How to Draw Hands — Muscle Anatomy of the Hand](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/). The thenar mass extends toward the wrist; when thumb and index oppose, the first-web skin bunches instead of disconnecting. The far three digits are bent into the palmar side, not three free-standing frontal claws.
2. [CMU real hand holding paper (reference photograph)](https://www.cs.cmu.edu/~jialiu1/dbimg/fig45.jpg). Observe pinch opposition, overlap order and far-finger recession. **Reference only:** no traced pixels or copyrighted photo asset redistributed.
3. [Kat Schneider, Pride & Prejudice Hands, physical two-colour RISO print](https://www.katschneider.com/store/prideandprejudice-hands). Differentiated finger contours, tactile edges, selective ink density and clear paper-white shape hierarchy.
4. [RISOTTO Studio, Advanced Print Setup](https://risottostudio.com/pages/advanced-print-setup). Each colour is a separate physical stencil; adjacent elements require deliberate trapping and avoid fragile misregistration.
5. [Illinois Risograph print guide, Registration/Trapping](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf). Gaps/knockouts, overprint and trap are separate *print operations*, not painter opacity.
6. [ANAT1 source](../../skills/kumiki-human-anatomy/SKILL.md) and [RISO58 model](../../src/video/riso58-anat1-volume-skin.ts). Camera-invisible signed depth is reconstructed from the true clinical finger-bone lengths but its sign remains an explicitly **authored interpretation**, not measured photogrammetry.

**Topo/flow:** A continuous radial wrist → thenar → first-web → index MCP → three successively receding supporting MCP/PIP soft-tissue crests → hypothenar → ulnar wrist cycle, with 16 C1 tangent-matched cubic spans in *one existing* original vermilion-positive source contour. Cobalt anatomical ridges flow with their corresponding moving red crests. Two real paper-white web reserves remain open between the ulnar digits, cut from both original spot plates.

**Edges and tactile print:** The same source-level Bézier interpolation passes through original RISO dot screening, misregistration and physical paper. No new CSS filters, raster masks, alpha overlay or third pigment. Keep nail/crease micro-elements, original actor-specific contours, index-over-paper/thumb-under-paper, 24fps/2-cel source holds and full-figure/closeup cameras.

## Implemented RISO59 scope

- Pure `riso59PreviewContact(spec,actor)` preserves **all original source-part IDs** and both physical inks. The three support PIP 3D stations inform independent max-3.6-unit crest adjustments. Different moving real MCP/PIP/DIP chains and authored ring/little weights prevent a cloned three-finger stamp.
- The two source-white four-C web reserves move with the relocated red contours; the existing four-C blue knuckle planes are re-registered from the exact same updated landmark set. Existing 12 separate red finger phalanges and all nail engraving are retained (untouched).
- The source starts with the exact same original unmodified f0 ink and maintains original [0,146,160,180,205,239] RISO2 Bézier source keys and 24fps timing. The editing surface is not a duplicate painted layer.
- **Baseline production actors are unchanged.** The existing RISO30/RISO59 ArtCraft Storybook workbench gains a reversible, explicitly labeled experimental A/B checkbox for both original actors, red, cobalt or both true stencil passes, film frame, true full source zoom and dot density. The default is the merged baseline.

## Required independent ArtCraft gate before promoting

- Verify latest exact GitHub PR-head TypeScript and all existing structural and native full-film tests. The additional RISO59 test protects source-part isolation, true bone-driven crest moves, closed C1 16-cubic positive red contour, unchanged f0 and original red/blue/master/cadence constraints. A green result does **not** prove likeness.
- Compare original vs experimental at matching 1× 960×540 and 540×960 frames f144/154/156/160/166, and original 6.2× and 7.4× native red/blue master crops. Reject any isolated red blobs, enlarged mitten, unnatural thumb/index bridge, cobalt floating over paper, lost tiny nails, broad solid red mass or former paper-white reserve becoming a gouge.
- **Current limitation:** no rights-reviewed real 3/4 paper-grip landmark match has yet been measured against the actual new candidate render. No recorded physical press proof. Depth is still an ANAT1 geometry reconstruction and the new shape is explicitly *not* a full continuous deforming 3D flesh mesh. Keep new PR as draft until the reference-vs-native visual gate is passed.
