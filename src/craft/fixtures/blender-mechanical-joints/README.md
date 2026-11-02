# Blender native mechanical joint QA fixture

First-party Blender 4.5.15, 60-frame simulation with three independent active rigid bodies: a hinge arm swings under gravity, a slider weight drops 0.4 m to its limit, and a fixed joint retains its pose. The generated constraint helpers are absent from the GLB, while all six mesh parts retain stable `kumiki_part` IDs. This intentionally primitive fixture verifies real Bullet constraints and frame-exact Kumiki playback, not cinematic material design.

Source: `kumiki-blender` PR #25, `examples/mechanical-constraints-physics-shot.json` and `scripts/blender_physics_constraints_smoke.py`. The editable Blender source is in the CI artifact. Rebuild by running the smoke script inside Blender, then copy `model.glb`, `manifest.json`, `physics-plan.json`, and `baked-actions.json` from the new `physics-r01` directory. Compact the action JSON via `jq -c` and update its `output_bytes` manifest field. Compare Storybook frames 0, 15, 30 and 60 to Blender's evaluated joint motion.

The bridge unit test verifies that the PM2 replay matches the **native Blender-exported glTF animation** within 2 mm translation / 0.005 rad rotation at frames 0, 15, 30 and 59. The original native glTF clips loop at the last frame; PM2 holds its frame-60 resting pose. A separate Storybook browser test captures start/end pixels and shared camera controls.

Pinned SHA-256:

- `model.glb`: `4cf19ae5afdcc933b37fac63838d56cce4f511462d8440f04cc8751f73646031`
- `baked-actions.json`: `309ebfdfe01040d5015f6bce31063ffad7ae7665a14dacd744d498f261f4b081`
