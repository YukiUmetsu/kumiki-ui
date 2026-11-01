# Camera Detail LOD — frame-exact, screen-size selection

**Registry item:** `craft-camera-detail-lod`. **Source:** `registry/craft/detail-lod.ts`. **Uses:** stock Three.js `Group`/`Mesh`/`Object3D`, no new package, renderer or clock. **Status:** deterministic unit checks pass; browser GPU visual review pending.

## When to use

- **Use for:** trees, vegetation, props, facades, crowd groups or repeating background objects that become small as the camera moves away. Assign a handcrafted hero, supporting and background geometry variant with compatible silhouettes. At any video frame, select the appropriate variant from projected screen size, independent of the previous frame.
- **Do not use:** when all variants are identical, for an unreviewed primitive hero replacement, or where culling requires occlusion/scene-BVH tests. This adapter switches assets; it does not generate those assets or improve poorly made geometry.
- **Do not call a per-frame clock:** calculate the camera's absolute pose from Kumiki MG1 / `evaluateCameraPose3D(frame)` and call `updateCamera` before rendering each frame. It works in reverse/random frame seeking.

## Small recipe

```ts
import { createCraftDetailLOD } from "./components/craft/detail-lod";

const tree = createCraftDetailLOD({
  schemaVersion: 1, id: "tree-03", radius: 2.8,
  heroMinPixels: 290, supportingMinPixels: 95,
  transitionPixels: 26, // optional: screen-door blend across 26 projected pixels
}, {
  hero: detailedTreeGroup,
  supporting: simplifiedTreeGroup,
  background: silhouetteTreeGroup,
});
scene.add(tree.group);

// Called before each absolute video frame, after the camera pose is evaluated:
tree.updateCamera({ cameraPosition: cameraPose.position, viewportHeight: 1080,
  projection: { kind: "perspective", fov: cameraPose.projection.fov } });

// Teardown: tree.dispose(); caller owns the three geometries and materials.
```

`heroMinPixels`/`supportingMinPixels` represent a conservative **projected bounding-sphere diameter in pixels**. View checks validate a perspective vertical FOV or an orthographic vertical span. Variant positioning is local to the controller group; the controller accounts for the group's world transform and maximum scale. In the `Procedural Environments` Storybook scene, one seed produces 330/158/33-leaf tree variants at three budget levels, and the frame-exact Kumiki camera chooses among them.

### Optional alpha-hashed transitions

Use `transitionPixels` when moving cameras cross a detail threshold and the variants have similar silhouettes. The value is the **full blend width** in projected pixels, centered at each threshold: with `heroMinPixels: 290` and `transitionPixels: 26`, the supporting-to-hero blend occupies projected diameters **277–303px**. At its midpoint, both tiers are visible with complementary 50% alpha-hashed coverage. `updateCamera()` returns an optional `transition: { from, to, progress }`; `level` and `currentLevel` remain the threshold-selected tier. Outside these bands only one tier is visible. Because coverage is calculated from the current camera pose and Three.js's position-derived hash, the same frame does not depend on how frames were visited. Hash patterns on different geometry need not be perfectly complementary: occasional overlapping/empty pixels are possible. No temporal random seed, hysteresis or time delta is used.

The transition adapter supports **opaque Three.js `MeshStandardMaterial`/`MeshPhysicalMaterial`** on `Mesh`/`InstancedMesh` descendants. It rejects transparent/alpha-tested materials, lines, points and sprites rather than silently drawing broken fades. It clones materials per tier and controller, preserves `onBeforeCompile` surface-detail hooks and program-cache signatures, and disposes **only these clones** on teardown, restoring the caller's material references. Geometry, textures, and source materials remain caller-owned. Full-strength alpha hashing can produce visible stipple/moire at small pixel sizes, especially without antialiasing; inspect on a moving camera, not just still images. In a blend band, both tiers draw, increasing draw calls temporarily. This is a *geometry replacement smoothing* technique, not geometry morphing or guaranteed visual quality.

### Behavior and limits

| Contract | Behavior |
|---|---|
| Determinism | Given the same pose, projection, viewport and group transform, the same tier is always selected. No stateful hysteresis or delta-time clock |
| Memory | All three caller-owned variants stay allocated; normally one is visible. With transitions, extra per-controller material clones are also allocated; **not a resource-memory optimization** |
| Draw calls | Outside a transition band one variant renders; within the band two render. Performance depends on actual geometry, materials and coverage |
| Transition | Default is a hard threshold; opt in to deterministic alpha-hashed crossfade with `transitionPixels`. Keep silhouette/color/shadow continuity and thresholds outside hero cuts |
| Bounds | Caller supplies a truthful world-scale radius; incorrect bounds produce wrong tier decisions. No automatic scene geometry introspection |
| Ownership | Rejects already-parented or duplicate variants; `dispose()` detaches, never destroys their geometries/materials |

The current `CameraViewport3D` is frame-driven and `updateFrame` runs before the renderer draws, so an author can compute the same MG1 camera pose and call the selector there. Its `afterRender` callbacks are **too late** to choose that frame's visible geometry.

To approve for final film output, compare transition on/off while scrubbing the `Procedural Environments` Storybook camera in both 16:9 and 9:16. Check noise at the 277–303px and 82–108px boundaries, shader-surface consistency, overlapping shadows, real geometry triangle counts and GPU timing. Also seek frames in reverse order to verify identical coverage. CPU tests or successful Storybook builds do **not** constitute human visual approval. This is a quality/performance *control*, not evidence that a low-detail model looks premium.
