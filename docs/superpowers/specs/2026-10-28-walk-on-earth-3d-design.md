# Walk on Earth — true 3D miniature-world redesign

**Status:** approved direction for implementation; artistic acceptance pending visual review.

## Reference contract

The reference's defining trick is a small traveler apparently walking in place on the crest of a large, circular world. Trees, cactus, rocks, houses, billboards and landscape travel beneath the same nearly fixed foot position as the world rotates. The rider's gait is independent of world translation. Visual quality is judged over *time*, not a single hero still.

## Design

- Use a Three.js perspective stage, physical sphere geometry with textured material, modeled trees/cacti/rocks/buildings and lights/shadows. The world is one parent transform; every prop follows its rotation.
- Maintain separate non-translating pedestrian parent at the sphere's top. Drive the existing rigged Rocketbox `walk` clip from the requested absolute frame. No CSS position interpolation; seeking frame 240 then 40 must produce the exact same pose as frame 40 directly.
- Place desert, forest and suburban environments around the sphere. Vary surface palette and scene props by geography. Keep world center below the screen and horizon/character in the upper-middle, similar to the uploaded video.
- Use small CC0 Kenney kit models for coherent stylized miniatures, CC0 Poly Haven ground texture, and the existing MIT Rocketbox character. No frames or audio from the uploaded references.
- Deliver through the existing Storybook play/pause/timeline, export readiness protocol, and `VideoExportStage` unchanged. Public props expose all model/texture URLs so assets can be replaced.

## Acceptance

1. At frame 0, 120, 240, 359: visible 3D globe and attached props have changed orientation, traveler is on the same screen-space crest.
2. Rigged feet/arms demonstrably move (no translational drift); worlds' props transition from desert toward wooded and city content.
3. Exact-frame seeking, reduced-motion freeze, no visual asset licensing ambiguity, no 3D loading failure.
4. Run Storybook build, targeted behavior tests, capture inspection and playable video export. Keep quality marked WIP until the user watches and accepts it.
