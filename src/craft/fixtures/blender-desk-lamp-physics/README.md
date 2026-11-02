# Real Blender rigid-body QA fixture

The Storybook story `3D asset toolkit / Blender Asset Bridge / Blender Simulated Fastener Drop` loads this first-party desk-lamp GLB and its **actual Blender 4.5.15 rigid-body bake**, not authored sample keyframes. The Blender generator source is `YukiUmetsu/kumiki-blender` (`examples/desk-lamp-assembly-v2.json` plus `examples/desk-lamp-physics-shot.json`; see PR #23). The original editable `.blend` lives in the Blender CI artifact rather than the web bundle.

Rebuild with `kumiki-blender build-asset`, then run `blender --background <asset>/source.blend --python scripts/blender_entry.py -- build-physics --spec examples/desk-lamp-physics-shot.json --output <fresh-revision>`. Copy `model.glb`, `manifest.json`, `physics-plan.json` and `baked-actions.json` from the revision. For the Storybook copy only, compact the action payload with `jq -c . baked-actions.json` so generated frame keys do not fill the Git diff, then update `manifest.output_bytes["baked-actions.json"]` to the actual compact file length. Do not edit individual curves by hand; regenerate from the source plan and recheck the Storybook render.

Pinned payload SHA-256:

- `model.glb`: `3495434f6aefd2b200533152f4f4c0f89528055749c1ac9fc655007d7d72e7fc`
- `baked-actions.json`: `4294abd560722d24d4b5754ab34f71915288a99d6d10e7975e9cb79d2f91f7ee`

The untagged ground collider stays in Blender simulation, **not** in the exported GLB. Twelve `base-fasteners` semantic parts move independently over exactly 120 frames at 30 fps. Six sound cue candidates come from conservative Blender-sampled ground proximity and downward velocity, not native Bullet contact impulses. Body-to-body contacts are not guessed; Storybook's authored-keyframe story separately demonstrates manual SFX cues.

The bridge test checks PM2 against the GLB's **native Blender animation** for the same fastener at frames 0, 15, 30, 75 and 119, requiring less than 2 mm translation and 0.005 rad orientation mismatch. The native glTF clip loops at its endpoint while PM2 deliberately holds the final pose.
