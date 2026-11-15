# Risograph animated-film expansion: production-reference study

**Reviewed:** 2026-11-14. **Scope:** video-specific capabilities, not an image filter. This document supersedes the abandoned Chinese-ink character exploration; no unrelated ink character source is part of this change.

## Video references and process evidence

| Reference | Published process and motion evidence | Requirement for Kumiki |
| --- | --- | --- |
| [Yiqin Ma, *SPOTS* (2026)](https://vimeo.com/1234898709) | 115-frame looping, four-color Risograph animation. Printed frames arranged over three sheets, cut and reassembled; skin/nature patterns morph while grain, registration and surface shifts contribute to motion. | Multi-ink film, authored pose/morph clips, printed-frame cadence; distinguish subject change from press-caused paper movement. |
| [Valerie Baudrier, *RISO animations*](https://vimeo.com/833258814) | Digital frames printed, scanned, then animated again; unintended print variance and scanning become part of movement. | Separate stable digital plate master from optional per-print physical capture/registration variation. |
| [Philip Bell, Riso Animation workshop at Riso Pop (2026)](https://www.risopop.com/workshops/riso-animation) | Frame sequence → plate separation (one/two inks) → physical print → scan/recompile → digital GIF or flipbook. | Explicit hold-frame cadence and process stages, not permanently jittering all static print textures. |
| [Hiromu Oka, Riso motion graphics process (2022)](https://www.itsnicethat.com/articles/hiromu-oka-hodo-station-process-animation-051222) | Motion graphics planning followed by separate print, scanning and color testing; six paper types, 1000+ print sheets in the described project. | Author timing first; optional print sheet manufacturing look, calibration profiles and source-asset/printed-frame matching. |
| [Moniker Press, *Inside the Riso*](https://vimeo.com/141237371) | Master-making, printing press drum, paper feed, finishing, binding and trimming. | RISO production transitions should reflect real physical actions and ordering. |
| [VCU Creative Print Bureau tutorial](https://www.youtube.com/watch?v=oUOufjBJGWI) | Two stage master/ink process, dots, density settings and drying between colors. | Variable halftone densities, independent master/plate workflow, paper and feed artifacts. |
| [Lemo-Opuscar, *Sunday Ride*](https://lemomo-ai.github.io/lemo-opuscar/styles/risograph/) | 40s city ride: bakery, park and riverside, with ink passes added to scenes. | Reusable scene grammar for walking/riding/talking/props and location changes, rather than one poster. |
| [Riso Maker](https://www.mettevirala.com/demos/riso-maker/) | Stepped 6/8/12 FPS cadence, fixed master grain, rerolled per-print paper/registration, tire marks and ghosting. | Distinguish physically fixed master texture from printed-frame sampling and optional sheet wear. |

**Evidence limits:** Public pages, descriptions, instructions and accessible visual material were studied. No local decoded frame-by-frame measurements of these copyrighted online videos were available; no source footage, images, characters or soundtrack is bundled or copied. All demonstration artwork is original.

## Major missing animation primitives

1. **Reusable animated actor rig:** ink-separated anatomy with hierarchical pivots; authored layer poses, expression swaps, speaking/mouth states, blink, walking/riding/reaching/turning and held-frame cadence.
2. **Persistent ink identity under movement:** primary plate artwork deforms coherently, while independent registration remains consistent with the printed sheet; do not apply screen-space jitter to every bone.
3. **Editable stage composition:** multiple actors, props, narrative scene interactions, camera pans/zoom, captions, depth order and atmospheric elements; any authored scene rather than fixed poster.
4. **Multi-ink and process controls:** 2–4 plate experiments; per-print vs master seeded imperfections, halftone shapes/angles, density/line work and print wear separate from actor pose.
5. **Advanced behavior:** constraints/IK, foot planting, reusable action clips and blending, mouth-to-audio sync, secondary fabric/hair dynamics, foreground/environment occlusion, authored timing and FX.
6. **Quality and export:** 16:9 and 9:16 film, real motion export, normal-speed playback, cross-seek tests, source-plate separation review, text readability and 1080p/4K scalability.

## First implementation slice

**RISO2 rig:** JSON-safe parent-linked joints, independent vector art per plate, deterministic held-frame interpolation and expression paths. Two unique character rigs share one evaluator; storyboarded movement and a FilmStage clip demonstrate compositing, interaction and RISO print material.

**Gates:** validator rejects cycles, unsafe SVG path data, missing plates and invalid keyframe ordering; tests cover exact seek/hold, expressions and parent transforms; browser Storybook controls and actual encoded MP4 in both aspects; senior code review and fresh green CI. The initial rig is **not yet a full skeletal/IK, scanned-print or audio-lipsync engine**—track those honestly as next work, instead of claiming the entire animation system is complete.
