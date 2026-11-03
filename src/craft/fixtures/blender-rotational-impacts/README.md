# Real Blender rotational contact QA fixture

First-party hinged swinging rod, passive collision peg and fixed pivot produced
by `kumiki-blender/scripts/blender_physics_rotational_contacts_smoke.py`
using actual Blender 4.5.15 Bullet simulation.

- `model.glb`: three semantic meshes and native swinging-rod animation.
- `baked-actions.json`: PM2 transform track with two measured collision cues
  (`wood-on-stone`, frames 10 and 17). Center-motion-only detection finds
  frame 10; the off-axis surface-witness detector also finds frame 17.
- `physics-plan.json`, `manifest.json`: exact producer plan and export audit.

The original editable `original.blend`, and generated `source.blend`, are not
shipped to the browser. They can be regenerated using the Blender smoke script.
The geometry is simple **pipeline QA**, not a cinematic asset; cues are
conservative relative-speed estimates, not Bullet impulse measurements. No
licensed WAV file is bundled; the sound path is an integration placeholder.
