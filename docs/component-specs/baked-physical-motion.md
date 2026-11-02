# Offline Physics Bake Timeline (PM2)

**Registry:** `baked-physical-motion` (portable JSON and interpolation), `baked-physical-motion-three` (HeroAsset adapter), `blender-asset-bridge` (one-call Blender import).

**Storybook:** **3D asset toolkit → Blender Asset Bridge → Baked Collision Playback** (authored API fixture), **Blender Simulated Fastener Drop** (actual Blender Bullet bake, 12 fasteners and 6 ground contact candidates), and **Blender Native Mechanical Joints** (real hinge, slider and fixed constraints). Each story reuses the camera/lighting inspector.

PM1's analytic gravity/spring/pendulum system remains the lightweight choice for simple motion. PM2 handles **offline-simulated rigid-body collisions, object stacks and mechanical constraints** by playing baked transforms from Blender or another solver. Kumiki does not simulate physics in the browser: each pose depends only on its action and absolute frame, so scrubbing backward, Storybook preview, headless video export and `bakeHeroActionClip` stay deterministic.

## One-call consumer API

```ts
import { loadBlenderRevision } from "./components/craft/blender-asset-bridge";

const bakedActions = [{
  schemaVersion: 1, id: "drop-and-hit", label: "Simulated metal contact", durationFrames: 90,
  tracks: [{
    // Canonical index avoids ambiguity when several screws share a role.
    target: "kumiki:base-fasteners:1",
    keys: [
      { frame: 0, position: [.12, .5, 0], rotation: [0, 0, 0, 1] },
      { frame: 18, position: [.12, .045, 0], rotation: [0, 0, .7071068, .7071068] },
      { frame: 90, position: [.15, .045, 0], rotation: [0, 0, 0, 1] },
    ],
  }],
  contacts: [{ frame: 18.3, target: "kumiki:base-fasteners:1", speedMps: 3.1, material: "metal" }],
}];

const factory = await loadBlenderRevision({ manifest, model: glbArrayBuffer }, {
  license: "Original Blender asset", bakedActions,
});
const hero = factory();
hero.pose?.({ id: "drop-and-hit", frame: 36, fps: 60 }); // 18th reference frame
const contacts = factory.bakedContactEvents("drop-and-hit", 60); // 36.6f cue, same .61s
const inspectable = factory.createInspectable(hero, { actionId: "drop-and-hit", fps: 60 });
hero.dispose();
factory.release();
```

Both `physicalActions` (PM1) and `bakedActions` (PM2) can be supplied to the same factory, with unique action IDs. Baked actions also appear in `factory.actions`, work in `HeroAssetViewer` and export via `bakeHeroActionClip`. Optional `sourceActionId` plays an existing glTF/physical action first; tracked nodes' **absolute local transforms** then override the source motion. Non-tracked nodes retain their source motion.

### One-call impact sound mapping (optional)

```ts
import { bakedContactsToSoundEvents, createAudioMixManifest } from "./components/video/audio-visual-cue";

const sounds = bakedContactsToSoundEvents(factory.bakedContactEvents("fastener-drop"), {
  fps: { num: 30, den: 1 }, durationFrames: 120,
  profiles: { "metal-on-floor": { assetRef: "licensed/metal-impact.wav", gainDb: -12 } },
});
const audio = createAudioMixManifest({ id: "scene", fps: { num: 30, den: 1 }, durationFrames: 120,
  lanes: [{ id: "sfx", kind: "sfx", startFrame: 0 }], sounds });
// audioMixFfmpegArgs(audio, "mix.wav") produces the render command arguments.
```

No audio is bundled or automatically downloaded: the producer supplies licensed sound files for each semantic material. Unmapped contacts are **silent** by default. Tiny impacts and duplicate near-simultaneous hits on the same body are suppressed; gain scales with sampled impact speed for editorial mixing, **not** a claimed physically measured impulse. Sound timestamps retain fractional-frame precision in the FFmpeg mix (millisecond output precision); visual/director cues remain on film frames. Storybook lists the real Blender contacts and the resulting sound timing/gain without falsely claiming to play a recording.

## Bake interchange contract

- **Space:** glTF node-local coordinates, **Y-up, meters**, quaternion `[x,y,z,w]`. Blender itself is Z-up: an exporter must convert evaluated Blender transforms to the **same local node basis as its GLB export**, not simply serialize raw Blender XYZ values. Do not change GLB node hierarchy or part tags after baking.
- **Frames:** `frame` is an absolute **30-fps reference frame** in `[0, durationFrames]`; fractional frames are supported. Each track starts at frame `0`, continues with strictly increasing keys, and holds its last key. Position/scale interpolate linearly; rotation uses shortest-path quaternion SLERP. `interpolation: "step"` allows deliberate discontinuities.
- **Targets:** one canonical `kumiki:role:N` node or a role mapping to exactly one node per track. Roles mapping to multiple nodes are rejected rather than broadcasting one transform to an entire stack. Colliding source action names, duplicate targets and missing references are errors.
- **Contacts:** optional `{ frame, target, speedMps, material }` entries, sorted and converted to output fps. Material is a semantic sound key, not an audio URL. Kumiki exposes the exact timestamp and maps it to audio **only** when the production explicitly supplies a sound profile.
- **Budgets:** maximum 32 actions, 128 tracks/action, 3,601 keys/track, 120,000 keys across a plan, 4,096 contacts/action, 3,600 reference frames/action. All numbers, quaternions, identifiers and ordering are validated **before** binding any nodes.

### Producing the files in Blender

1. Create a reproducible simulation with named parts and correct dimensions, material friction/restitution, constraints and cache. Scrub its Blender viewport to verify contacts.
2. Bake the simulation, e.g. Blender exposes `bpy.ops.rigidbody.bake_to_keyframes(...)`, or sample evaluated object transforms using `scene.frame_set` and the evaluated dependency graph. Keep the original rig/constraint data in the `.blend` file for revision history.
3. Convert frame samples to glTF-compatible **local** transforms that correspond to the exported tagged nodes. Emit a compact `baked-actions.json` with 30-fps reference frame coordinates; include impact cues from reliable contact analysis, not guessed mesh intersections.
4. Export a GLB and existing audited `kumiki-blender` revision manifest; verify on imported instance with `createInspectable`, Storybook scrub, and a baked `AnimationClip` in glTF/MP4. An agent only needs to supply the data object to the existing API.

For simple Blender rigid bodies, another route is to bake transforms to keyframes and export an ordinary glTF animation clip. The original bridge already supports those clips. PM2 is useful when a separate portable timeline, explicit contact cues, and consistent interpolation are desired.

## What remains

- **Not a solver:** this implementation does not compute new mesh-mesh contacts, friction or cloth in Three.js; those must be authored/baked upstream. Rigid-body transforms do not reproduce cloth/soft-body vertex caches. Articulated constraints are preserved only to the extent that the simulated node transforms capture their poses.
- First-party `kumiki-blender` rigid-body export, Blender-native joints, conservative measured **ground** contact cues and optional material-to-SFX scheduling are implemented. Native Bullet manifold/impulse capture, reliable body-to-body contact extraction and physically deforming cloth/soft-body vertex caches still require additional work.
- Browser pixel-diff and rendered-video comparison against original Blender reference frames still need visual signoff. Numeric GLB-vs-PM2 pose parity is covered by focused tests; that does not certify photographic parity.

Blender source documentation: [Rigid Body Bake to Keyframes](https://docs.blender.org/api/4.5/bpy.ops.rigidbody.html) · [Evaluated Dependency Graph](https://docs.blender.org/api/5.0/bpy.types.Depsgraph.html).
