# CRAYON1 F1 V50 — source-observed hair photometry on original rooted wax fibers

**Status 2026-11-17: isolated, opt-in, experimental / !dev / ART HOLD.**

Original source: [Christopher Campbell CC0 portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Evidence is the previously verified 608×1082 *browser crop*, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; do not claim access to the full original JPEG. Source 7×7 median witnesses are compared to *actual native V48 Chromium* f299 pixels, no color normalization or altered source raster.

Physically, wax behaves as directionally pressure-deposited pigment on relief paper: [Rudolf et al., *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), [Mould, *Simulating Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon.pdf). Original rooted fibers, varied pressure, micro-flecks, paper height and 18 source-rooted contour groups remain unchanged above deposited wax color.

Five-axis deconstruction: (1) **topology** 3 real hair masses and inner 267+ root paths; no disconnected sticker; (2) **vector flow** inherited V39 roots and V40/V41 asymmetric crown/curtains, unaltered; (3) **edge** feathered pigment contact with zero-alpha at its own ellipsoid boundary clipped to the original animated hair silhouette; (4) **depth** separately source-observed dark center crown, left reflected strands, low left-black and far curtain, never flatten existing three-pigment gradients; (5) **motion** no element ID, source path, seed, clip or timing changes across the original 300-frame film.

| Original source XY | Photo RGB | Native V48 RGB | Target |
| --- | --- | --- | --- |
| (278,215) | (45,34,29) | (73,51,44) | dark crown roots |
| (330,220) | (45,33,29) | (97,68,56) | rich crown value |
| (145,245) | (47,36,33) | (100,73,60) | asymmetric native hair root |
| (70,265) | (106,84,71) | (78,55,47) | near left reflected light |
| (40,364) | (92,64,50) | (46,34,29) | local auburn shine |
| (35,555) | (58,33,25) | (73,51,43) | near root value |
| (50,640) | (19,10,8) | (58,39,34) | under-occluded shadow |
| (80,830) | (2,1,0) | (71,53,45) | darkest hanging strands |
| (450,354) | (61,43,36) | (86,63,51) | far curtain root |
| (485,520) | (67,38,28) | (101,74,60) | far veil |
| (550,860) | (52,33,27) | (69,50,43) | source tail |

**Implementation:** reusable native CRAYON1 opt-in material underpaint fields (4 crown, 4 left, 3 right) mapped into the exact original V40 element bounds. Exactly the existing three wax materials change; preserve V48 face, V46 eye, original 267+ hair strands, photographic leaf backdrop and all 300 frames. Source witnesses and author-selected physical pigment mixtures are distinguished; pigment is a trial, not a proven result. Tests enforce all original artwork's deep equality, three modified materials, native pixel grain, original CC0 SHA, and fail-closed source integrity.

**Next QA:** integrate as independent named !dev Storybook option on PR #461 *after* currently active V49 (oblique facial-value) work to prevent source variant collisions; capture same-head actual Chromium full/2.3× crown V48/V50 at f299, decode real PNGs, calculate source-photo SSIM/MAE for crown and curtains and protected near eye/foliage. Preserve if objective hair fidelity improves with no face regression; otherwise keep negative experiment. No PR merge while whole-source SSIM <0.85 and full 300-frame ArtCraft review/artist signoff incomplete.
