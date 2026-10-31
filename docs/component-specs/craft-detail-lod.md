# Camera Detail LOD — frame-exact, screen-size selection

**Registry item:** `craft-camera-detail-lod`. **Source:** `registry/craft/detail-lod.ts`. **Uses:** stock Three.js `Group`/`Object3D`, no new package, renderer or clock. **Status:** deterministic unit checks pass; browser GPU visual review pending.

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

### Behavior and limits

| Contract | Behavior |
|---|---|
| Determinism | Given the same pose, projection, viewport and group transform, the same tier is always selected. No stateful hysteresis or delta-time clock |
| Memory | All three caller-owned variants stay allocated; one is visible. This reduces visible geometry, draw calls and fill, **not total resource memory** |
| Draw calls | Invisible variants are skipped by normal Three.js rendering. Performance benefit depends on actual geometry and material complexity |
| Transition | Hard threshold selection; possible visible popping at tier boundaries. Keep silhouette/color/shadow continuity and place thresholds outside hero cuts |
| Bounds | Caller supplies a truthful world-scale radius; incorrect bounds produce wrong tier decisions. No automatic scene geometry introspection |
| Ownership | Rejects already-parented or duplicate variants; `dispose()` detaches, never destroys their geometries/materials |

The current `CameraViewport3D` is frame-driven and `updateFrame` runs before the renderer draws, so an author can compute the same MG1 camera pose and call the selector there. Its `afterRender` callbacks are **too late** to choose that frame's visible geometry.

Unit checks passed for exact repeatable selection, perspective/orthographic projection, group transforms, disposal ownership and invalid inputs. `npm run typecheck`, focused ESLint, registry/catalog validation (**208 items / 378 catalog entries / 795 stories**), registry smoke, isolated registry fixture and Storybook production build passed. The broader toolkit suite passed **44 tests across eight files**. To approve for final film output, inspect transitions at threshold frames in 16:9 and 9:16, with actual geometry triangle counts and GPU timing. This is a quality/performance *control*, not evidence that a low-detail model looks premium.
