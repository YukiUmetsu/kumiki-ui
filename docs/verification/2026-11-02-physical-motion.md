# PM1 Blender physical-motion verification · 2026-11-02

Scope: a consumer-only, physically grounded animation layer on the existing
Blender revision bridge. The `kumiki-blender` export format and GLB artifact
are unchanged. The real source fixture remains a Blender 4.5.4-exported
desk lamp with 17 semantic nodes; the existing producer audit is documented
in [Blender bridge verification](2026-11-02-blender-bridge.md).

## Structural and motion checks

- `tests/physical-motion.test.ts` checks exact gravity/restitution impact
  times/velocities and mid-bounce height, mass/stiffness/damping spring
  response, gravitational pendulum settling, angular drag, exact dry-friction
  stop distance, no-slip rolling, world rotations under non-aligned GLB parents,
  backward scrub restoration, invalid units and non-integer frame counts.
- `tests/blender-asset-bridge.test.ts` checks actual Blender shade/upper-arm
  motion about the original joint-cover hinge without reparenting, rest
  recovery, random-seek repeatability, independent imported glTF clip/spring
  composition, action holds, frame-aware V01 inspection, glTF action baking,
  and accurate SFX contact events.
- Invalid roles, ambiguous hinge references and collisions with imported
  action IDs fail during revision loading, before a usable factory is returned.
- The `blender-asset-bridge` registry consumer fixture compiles the PM1 API and
  its transitive plain-TypeScript and Three.js dependencies in isolation.

## Manual visual gate

Storybook: **3D asset toolkit → Blender Asset Bridge → Physically Grounded
Motion**. Play/seek **Damped arm sway** and **Gravity + impact**. Verify the
shade and arm move together, the pivot does not drift, each return to frame 0
matches the original pose, and the fastener does not visibly penetrate the
authored rest plane. Use the adjacent portable camera/lighting inspector for
side and high-angle views.

Additional stories: **3D asset toolkit → Physically Grounded Motion → Coulomb
Slide / No Slip Roll**. Verify speed and friction sliders alter stopping
distances, the blue ball's contrasting patch visibly rotates with travel,
and playback is identical after seeking backward. Camera and lighting use
the same portable inspector and can be reset independently. These are
deterministic analytic models, not Blender physics solver replays.

The procedural desk lamp is an interoperability fixture, not a photo-faithful
hero asset. Browser WebGL visual parity and final exported-video/SFX review
are still human release gates. PM1 supports simplified flat-surface sliding
and rolling resistance but does **not** solve arbitrary mesh collisions,
multi-body friction/contact stacks, slip transitions, cloth, or large-angle
nonlinear pendulums; those shots require externally baked dynamics or a
separate deterministic solver.
