# Physically Grounded Motion (PM1)

**Registry:** `physical-motion` (pure math) · `physical-motion-three` (Three.js adapter) · `blender-asset-bridge` (one-call import)

**Storybook:** **3D asset toolkit → Blender Asset Bridge → Physically Grounded Motion**

PM1 makes *physically motivated* motion easy to author without a custom simulation loop for every 3D object. It is an analytic kinematic layer, **not a rigid-body or fluid solver**. Every pose depends on an absolute frame; out-of-order seeks, preview, rendered video and glTF action baking produce the same transform without time integration. Motion is local to an asset instance; GLB hierarchy and independent instances remain intact. For authored contact stacks and complex mechanical constraints, use [PM2 Offline Physics Bake Timeline](baked-physical-motion.md) to replay pre-solved Blender transforms.

## One-call Blender import

```ts
const factory = await loadBlenderRevisionFromUrl(manifestUrl, {
  license: "Original model; verified provenance",
  physicalActions: [
    { schemaVersion: 1, id: "arm-sway", durationFrames: 120, motions: [
      { kind: "pendulum", target: ["upper-arm", "enameled-shade"],
        pivot: "joint-cover", axis: [0, 0, 1], angleDeg: 18,
        lengthMeters: .65, dampingRatio: .14 },
    ] },
    { schemaVersion: 1, id: "screw-drop", durationFrames: 120, motions: [
      { kind: "drop", target: "kumiki:base-fasteners:1", height: .45,
        gravity: 9.81, restitution: .45 },
    ] },
  ],
});

const hero = factory();
hero.pose?.({ id: "arm-sway", frame: 18, fps: 30 });
const inspector = factory.createInspectable(hero, { actionId: "arm-sway" });
console.log(inspector.getBounds("kumiki:enameled-shade:1", 18));
console.log(factory.physicalEvents("screw-drop")); // fractional frames, seconds, impact speed for SFX
hero.dispose();
factory.release();
```

Use `HeroAssetViewer action="arm-sway" actionFrame={frame}` to preview or export, or `bakeHeroActionClip(hero, "arm-sway")` to bake transforms into glTF. Physical action IDs appear alongside imported GLB clips in `factory.actions`. `sourceActionId` on a physical action plays a specific imported glTF clip first, then adds the physical displacement for each frame; source clip names are validated, and duplicate action IDs are rejected.

`target` accepts a semantic role (`"base-fasteners"` for all matching nodes), one canonical instance (`"kumiki:base-fasteners:1"`), or an array of roles/IDs. A hinge `pivot` can be a **unique** semantic role/instance (resolved to its geometry center after the authored clip) or a numeric world-space `[x,y,z]` point. Sibling nodes can swing together around one joint without glTF reparenting. A missing role or ambiguous pivot is an error, never silently skipped.

## Physical behaviors and units

| Kind | Parameters | Model |
| --- | --- | --- |
| `drop` | `height` m, `gravity` m/s² (9.81 default), `restitution` 0–0.95, optional `settleSpeed` m/s | Exact constant-gravity ballistic arcs between contacts with an authored rest-level plane; impact times and speeds exposed for SFX. |
| `spring` | World `offset` m, `mass` kg, `stiffness` N/m, `damping` N·s/m | Existing analytic Kumiki spring solver, including under/critical/over-damped regimes. |
| `pendulum` | Local/world `axis`, `angleDeg` ≤30°, `lengthMeters`, `gravity`, `dampingRatio`, optional `pivot` | Small-angle gravitational pendulum with viscous damping and zero initial angular velocity. |
| `spin` | `axis`, `angularVelocityDegPerSec`, `drag` s⁻¹, optional `pivot` | Exact integration of exponential angular velocity loss from viscous drag. |

All actions have `schemaVersion:1`, `durationFrames` (30-fps reference), and optional `startFrame` delays per track. Actions are non-looping; requests beyond their duration hold the final sampled state. Physical offsets never mutate keyframes, and `pose({id:null})` restores the authored rest. A context-free `validatePhysicalActionSpecs`, `samplePhysicalMotion`, and `impactEventsForPhysicalAction` can be used in a non-Three.js renderer; the Three adapter is optional.

## Limits and required visual QA

- `drop` collides with the **authored rest plane**, not arbitrary scene geometry. It does not solve mesh-mesh collisions, sliding friction, stack stability or cloth. PM2 can replay previously simulated rigid bodies and constraints from Blender; it does not calculate contact forces or vertex deformation in the viewer.
- Pendulum uses a small-angle approximation, intentionally limited to ±30°; hinge anchors should be near the actual mechanical joint. Nonuniformly scaled imported parent hierarchies need a visual pass for apparent deformation.
- Rotation without a pivot uses the node's local origin/axis. With a pivot, the axis is world-space and the node is rotated around the anchor. Translations are always world-space Y-up; export uses meters.
- Mass controls the spring response, not ballistic gravitational acceleration. Restitution controls bounce speed and energy loss; drag controls angular decay. These parameters are not a substitute for measured material properties.
- Check first contact timing, penetration, joint alignment, silhouette continuity, material lighting, and source-clip overlays in real WebGL and exported frame sequences. The shipped desk lamp is an interchange/kinematics proof, not a cinema-quality material benchmark.
