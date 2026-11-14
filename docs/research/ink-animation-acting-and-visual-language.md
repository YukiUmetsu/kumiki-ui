# Chinese ink animation: acting, brushcraft and production reference expansion

**Research date:** 2026-11-14  
**Scope:** roadmap 35 / Chinese ink wash PR #156  
**Evidence:** source descriptions, published stills, written production studies and accessible video pages. Streaming films were **not frame-decoded or watched end-to-end** in this environment; timings below are **review targets**, not measured movement data. No source footage, designs, audio or frames are redistributed.

## Video references (method, not imitation)

| Work / primary watch link | What to inspect at normal speed in the next production review | Library takeaway |
| --- | --- | --- |
| [Feeling from Mountain and Water (山水情, 1988), 19-minute film](https://www.youtube.com/watch?v=nbZgG_vEz3c) | Exchanges between master and student, guqin performance, tiny figures in very large empty space, long scenic holds and dramatic transitions from bodily movement to stillness | Sparse acting, exact held poses, meaningful hand/prop contacts, controlled head/gaze and camera cadence, not constant shader noise |
| [Little Tadpoles Look for Mama (小蝌蚪找妈妈, 1960), 15-minute film](https://www.youtube.com/watch?v=InaOKrub0rA) | Multiple interacting animals, readable silhouettes, groups changing direction and overlaps in shallow pond depth | Separate actors and their stable IDs; parent/child attachment, schooling/group motion, variation in ink density by subject |
| [The Cowboy's Flute / The Herd Boy's Flute (牧笛, 1963)](https://www.materialsinmotion.nl/exhibition/annecy-2017-focus-china/) | Child and buffalo, long landscape pans, changing speed while objects stay painterly, visual rhythm tied to flute and water | Character/material identity during locomotion; painted layer movement separate from actor cadence; event-synced camera |
| [Travelling Through Brush and Ink (筆墨行旅), National Palace Museum (2017)](https://www.youtube.com/watch?v=uUwWmwEhYoQ) and [making-of film](https://vimeo.com/224334164) | One protagonist transforming across several painted art worlds, frame-by-frame craft and lighting; period-specific brush languages | Explicit style-switch contracts and asset continuity; new story cannot pretend generic grading is a painted transformation |
| [The Promise (2019): ink-and-watercolor animation](https://www.youtube.com/watch?v=QKCWBrZUVdQ) | Shape birth from visible wet ink, graceful metamorphoses, brush edge behavior, animated forms returning to paper | Native paint-object formation, coherent morph geometry, direction and timing of water spread |
| [Physical ink loading and landscape process references](../36-chinese-ink-wash-craft-and-film-system.md#1-reference-study-and-evidence-limits) | Centre/side brush, flying white, controlled xuan paper absorbency, gou/cun/ran/dian sequence | Brush-tip profile, paper-space capillarity and bounded moisture/darkness rather than a final-film filter |

Further academic reading: [Chen, *CGI Ink-Painting Animation in Contemporary China, 1989–2019*](https://acas.world/cn/2020/07/24/cgi-ink-painting-animation-in-contemporary-china-1989-2019/), [Duan Xiaoxuan cinematography study (2026)](https://doi.org/10.1080/17508061.2026.2749963), [Columbia study of brushwork separation (*bimo fenjie*)](https://journals.library.columbia.edu/index.php/cja/article/download/9275/4850/22666). The Columbia paper describes separating the stroke/value layers of moving characters, rather than drawing every moving frame as a newly diffusing background.

## Findings translated into reusable technical work

1. **Keep a single canonical character rig.** Reuse `registry/character/definition.ts`, `evaluate.ts` and `CharacterPresenter` for actors, cues, face parts and props. INK3 is only a material/stage adapter; do not ship a rival character engine. Any given `characterId`, `revision`, `instanceId` remains fixed while the camera, media or style changes.
2. **Separate wet fabric from dry facial marks.** A monochromatic global blur destroys eyes and speech readability. Optional `CharacterInkMaterial.partFinish` assigns each existing rig part a bounded capillary-fringe strength and crisp contour policy; the approved geometry and canonical acting evaluator remain untouched. A neutral appearance (no `inkMaterial`) remains identical.
3. **Anchor paper and grain to the moving artwork.** Moving character shapes receive local static paper-edge displacement, not a time-varying turbulence seed. Background painting retains sheet-space fibers, while the film camera may move smoothly.
4. **Make the cue channel semantic.** Narration/alignment data drive visemes; blinking, expressions, gaze, head motion and prop contact are independently authored and evaluated at absolute frames. Do not infer lip sync from generic prose or random mouth cycles and claim it is phoneme-accurate.
5. **Protect negative space and text.** A quiet paper hold is intentional. Reserve typography zones; long English and CJK captions must not be accidentally clipped by the ink reveal or moving actor, even in 9:16.
6. **Represent ink physically before adding effects.** Centre brush, side brush, flying-white, pigment pooling, weak edges, suction/absorption and evaporative settle require source geometry and material logic. A gaussian blur and grain filter alone are inadequate proof.
7. **Let composition accept other media without pretending it is painted.** `InkWashScene` composes original painted regions, diagrams, footage, 3D hosts, captions and actors through the existing FD1 slot interface. `renderLayer` returns licensed host content; filters/masks do not create new artwork.
8. **Distinguish character acting from cinematography.** Character poses can be held on twos while the handscroll camera moves continuously; all motion samples derive from one existing film frame.

## Current missing capabilities, ranked

| Priority | Material / acting shortcoming | Design improvement and acceptance proof |
| --- | --- | --- |
| P0 | **No certified normal-speed film** for complete multi-actor interactions; screenshots cannot certify performance | Export two aspect ratios, watch the original encoded 16:9/9:16 MP4 in motion, document exact reviewer and unacceptable defects; do not mark art accepted automatically |
| P0 | **Foot contact and reach are not independently verified.** Existing actor's position track and walk poses can be evaluated individually but no test proves stance foot is locked to world space | Add contact interval authoring, reach target constraints, world-space planted foot and prop-hold audits; reject nonphysical sliding beyond an explicit tolerance |
| P1 | **No true garment dynamics.** Existing idle/sleeve action is deterministic but lacks authored cloth-drag/secondary-motion dynamics | Prebaked damped spring sleeve/hair/hem poses with bounded anticipation and stop; nonsequential seek must match forward render |
| P1 | **No speed-sensitive tip and fluid solver.** The brush uses geometric pressure and simplified optical capillary fringes | Add measured speed/load response, anisotropic xuan fibers, pooled pigment transport, wash boundary granulation and reproducible dry-down |
| P1 | **No multi-character staging/relationships layer.** A single actor rig demonstrates capabilities, not a duet or crowd | Add gaze target IDs, collision/occlusion, hand-to-object/hand-to-hand contacts, speaker priority, story event cues and unique instance IDs |
| P1 | **Lack of content genre fixtures.** Existing independent ink demo, educational diagram and one character do not prove arbitrary subjects | Two complete neutral films per genre: educational, nature, product (rights-verified), historical reconstruction, character narrative and title/logo |
| P2 | **No 3D-to-ink material bridge with stable silhouettes.** Generic 3D can be embedded as media; it is not painted automatically | Optional separate Three.js NPR pass using real geometry normals/curvature, fixed world-space brush projections and non-flickering edge hatching |
| P2 | **No multi-style shape remapping benchmark.** Changing `look` tokens is not the same as preserving silhouette while switching material | Identity and anchor audit across watercolour, ink wash, print, cel and paper-theatre, with asset provenance retained |
| P2 | **Incomplete accessibility and type QA in cinematic contexts.** Ink-stroke masks can intersect captions in complex scenes | Browser text-bounds checks at 960×540, 540×960 and 1080p; CJK 1–3 lines; reduce-motion fallback, color contrast and export parity |

## Honest release gates

- **Code:** `npm run typecheck`, targeted Vitest, registry validation/catalog/installation; malformed actor IDs, invalid per-part finishes and unsupported cue targets fail explicitly.
- **Runtime:** same frames at forward, reverse and shuffled order; eyes, mouth, prop tips and ink paper edges preserve identity; no phase drift.
- **Art:** inspect face at avatar scale and 100% crop, sleeves near body, wet/dry edge distinction, foot contact, clean text, hold continuity.
- **Film:** compare at normal speed; capture 16:9, 9:16, reduced motion and a second actor/art design. Never claim premium animation from a single screenshot or passing CI.
- **Rights:** research films and museum footage are visual principles only; example actor, scenes and audio must have independent redistribution rights.

The work above intentionally does **not** assert accurate rigid body IK, calibrated watercolor simulation, production character design approval, or frame-by-frame review of external films.
