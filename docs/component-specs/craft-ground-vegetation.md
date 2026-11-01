# Ground Vegetation — one instanced draw per plant family

**Install:** `craft-ground-vegetation` (automatically installs `craft-scatter-placement`). **Source:** `registry/craft/ground-vegetation.ts`. **Status:** deterministic geometry checks; GPU and human visual review pending. No Blender, model download, texture service or new clock.

## When to use

Use for medium/background forest floors, pathways, wetland edges and meadows where trees and rock scatter leave the ground looking empty. This pack creates three deliberately different botanical silhouettes and batches every repeated specimen of one kind as **one `InstancedMesh`**. It accepts the existing surface/path/volume placements; it does not make placement decisions itself.

| `kind` | Construction | Relative intended scale |
|---|---|---|
| `meadow-grass` | 13 curved/cupped tapering blades per tuft (6 in background mode) | ~0.4–0.8 world units |
| `woodland-fern` | 6 radial rachises with 7 paired, attached pinnate leaflets (3/4 in background mode) | ~0.6–0.9 world units |
| `wildflower` | 3 stalks with attached foliage, radial folded petals and a pollen disk (1 simplified stalk in background) | ~0.5–0.7 world units |

## Recipe

```ts
import { createCraftScatter } from "./components/craft/scatter-placement";
import { createCraftGroundVegetation } from "./components/craft/ground-vegetation";

const placements = createCraftScatter({
  schemaVersion: 1, id: "fern-locations", seed: 42, mode: "surface",
  count: 180, minDistance: .35, minUpDot: .8,
  surfaceNormal: true, randomYaw: true, scale: [.7, 1.25],
}, terrainMesh);
const ferns = createCraftGroundVegetation({
  schemaVersion: 1, id: "ferns", seed: 43, kind: "woodland-fern",
  detail: "supporting", heightScale: 1,
  colors: { foliage: 0x64864e },
}, placements);
scene.add(ferns.mesh);
// Tear down after use: ferns.dispose();
```

## Runtime contract

- `seed` is a safe integer. `detail` is `supporting` (default) or `background`; `heightScale` must be 0.1–10; foliage/bloom overrides are RGB integers. Placement count must be 1–2500 with distinct IDs and finite transform matrices.
- Geometry has a vertex color gradient, central raised ribbon ridge and physical leaf/stem intersections. The material is a single double-sided, non-metallic PBR material; instance colors add seeded tonal diversity. This is not alpha-card foliage or an external atlas.
- Stems, leaves, normals, palette and instance matrices are deterministic. **No time-based motion is supplied.** Use the existing camera and frame evaluator for camera movement, not a second render loop. Narrow ground-cover cast shadows are disabled because thousands of small, high-frequency shadow edges can shimmer; receive shadows remain enabled.
- One kind renders in one draw call regardless of instance count; using all three kinds costs three foliage draws. More detailed geometry still costs vertices and GPU processing, especially in the supporting tier. A **2.5-million instance-expanded vertex cap** rejects oversized requests with instructions to lower counts or select background detail. `dispose()` removes the mesh and frees only the generated geometry/material/instance data; the caller owns placements and terrain.
- These plants are *stylized categories*, not accurate identified cultivars. A hero close-up needs reviewed bespoke botanical models or macro photography.

## Quality review

Open **3D asset toolkit → Natural Environments → Ground Vegetation**. Scrub the orbital camera, change plant families, supporting/background budgets, seed, ground material and 16:9/9:16 aspect. Reject floating bases, repeated leaf stamps, inverted normals, stems not meeting petals/pinnae, implausible sizes, holes, highlight popping and over-dense coverage. Compare a bare/low-density scene in ContentGen before using a full meadow. The screenshot matrix supports `--scenes=natural-plants` for three plant families. Tests and Storybook builds do not substitute for actual GPU review.
