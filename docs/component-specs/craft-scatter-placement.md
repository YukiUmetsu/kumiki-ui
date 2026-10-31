# Seeded 3D Scatter Placement — surface, path, volume

**Registry item:** `craft-scatter-placement`. **Source:** `registry/craft/scatter-placement.ts`. **Backend:** Three.js `MeshSurfaceSampler` (already installed in `three@0.186.1`), with an explicit seeded PRNG. **Status:** implementation verified structurally; visual/browser approval pending.

## When to use

- **Use for:** trees and plants over a terrain, rocks, flowers, windowside objects, lampposts along a street, furniture along an aisle, stars in a region, props distributed over a character or building surface. Each placement is a stable semantic ID, matrix, position, normal, rotation and scale. You can animate the *consumer* objects with existing MG1 after placement.
- **Use `createCraftScatterInstances` when:** hundreds of copies share one geometry and one material; they then render in one instanced draw call instead of hundreds of ordinary meshes. Geometry and material remain caller-owned.
- **Use separate meshes when:** every object has different geometry/materials, animation bones, unique part controls, individual shadows or interaction; use the placement results but not `InstancedMesh`.
- **Do not use for:** arbitrary collision-free spatial optimization, final vegetation hero modeling, physics simulation or per-frame random repacking. Precompute placement once at asset-assembly time.

## Short recipes

```ts
import { createCraftScatter, createCraftScatterInstances } from "./components/craft/scatter-placement";

// The terrain is an existing, authored Three.js Mesh with triangles.
const placed = createCraftScatter({
  schemaVersion: 1, id: "undergrowth", seed: 37,
  mode: "surface", count: 350, minDistance: .24,
  weightAttribute: "vegetationDensity", minUpDot: .7,
  surfaceNormal: true, normalOffset: .02, randomYaw: true,
  scale: [.7, 1.3],
}, terrain);

const items = createCraftScatterInstances(placed, approvedLeafGeometry, approvedLeafMaterial);
scene.add(items.mesh);
// Teardown: items.dispose(); caller retains approvedLeafGeometry and approvedLeafMaterial.
```

For an evenly paced path, change `mode` to `"path"`, supply `points: [[0,0,0],[0,0,10]]`, set `count: 6` and optionally `tangentFacing: true`. For a 3D volume, use `mode: "volume"`, `min: [-5,0,-5]` and `max: [5,4,5]`. All modes reuse `seed`, `count`, `minDistance`, `scale`, and `randomYaw`.

### Contracts

| Topic | Bound or guarantee |
|---|---|
| Count/seed | 1–2500, safe integer seed, fixed PRNG; identical inputs/mesh → identical matrices, independent of animation frame |
| Surface | Triangle geometry, max 1.5M source vertices, positive sampled area; world matrix applied; normals transformed correctly; optional nonnegative per-vertex weight attribute |
| Spatial safety | Minimum origin-to-origin distance enforced by spatial hashing; 48 attempts per requested placement (path attempts once) |
| Unmet density | **Throws** with placed/requested counts instead of silently rendering too few items |
| Path | 2–1000 points, stable distance-based interpolation, optional subspacing jitter and tangent-facing alignment |
| Volume | Finite, increasing world-space bounds; spatial density constraints apply in 3D |
| Output | An array of semantic IDs, `Vector3` positions/normals, quaternions, scales and `Matrix4` transforms; optional `InstancedMesh` wrapper |
| Performance | Placement is CPU work, not a per-frame component; no new renderer/network dependency. Geometry/material are never owned by the instancing wrapper |

Weighted surface sampling is area-based in **source geometry space**. Strongly nonuniform world scaling distorts true world-space area probabilities; bake the scale into the geometry when exact area density matters. `minDistance` measures origins, **not** complex mesh intersections. For LOD, use Kumiki's existing view/camera contracts and create separate instance sets; this component does not invent a new LOD manager.

## Quality and acceptance

- Automated checks passed: seed invariance, real separation, transformed surface normals, weights, path progress, explicit impossible-density errors and disposal ownership. The broader visual-toolkit regression suite passed **39/39 tests in seven files**.
- `npm run typecheck`, focused ESLint, registry validation (**207 items**), catalog check (**377 indexed entries / 795 stories**), registry smoke, isolated `registry:fixture -- --item=craft-scatter-placement` and `build-storybook` passed. The Storybook scene demonstrates path/surface recipes in the existing `CameraViewport3D`.
- Pending GPU/human inspection: density gradients, terrain clipping, instance orientation, aliasing under camera motion and target frame-time with real asset geometry. Instancing does not guarantee a budget without measuring visible triangles and GPU costs.
