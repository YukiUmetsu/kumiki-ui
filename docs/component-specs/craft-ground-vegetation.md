# Ground Vegetation — one instanced draw per plant family

**Install:** `craft-ground-vegetation` (automatically installs `craft-scatter-placement`). **Source:** `registry/craft/ground-vegetation.ts`. **Status:** deterministic geometry checks; GPU and human visual review pending. No Blender, model download, texture service or new clock.

## When to use

Use for medium/background forest floors, pathways, wetland edges and meadows where trees and rock scatter leave the ground looking empty. This pack creates three deliberately different botanical silhouettes and batches every repeated specimen of one kind as **one `InstancedMesh`**. It accepts the existing surface/path/volume placements; it does not make placement decisions itself.

| `kind` | Construction | Relative intended scale |
|---|---|---|
| `meadow-grass` | 17 cupped/tapered blades and two seeded panicles with actual awns and grain geometry (6 plain blades in background mode) | ~0.4–1.0 world units |
| `woodland-fern` | 6 tapered tubular rachises, each with 7 pairs of attached, notched leaflets (3/4 pairs in background) | ~0.6–0.9 world units |
| `wildflower` | 3 volumetric curved stalks, toothed leaves, rounded cupped petals, lower calyx and raised stamens/anthers (1 simplified stalk in background) | ~0.5–0.7 world units |

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
- Geometry has vertex color gradients, central raised leaf ridges, notched margins where relevant, tapered multi-sided stems, visible seed heads and flower interiors. All secondary pieces are physically connected to parent stems or petal centers. The material remains one double-sided, non-metallic PBR material; instance colors add seeded tonal diversity. This is not alpha-card foliage or an external atlas.
- Stems, leaves, normals, palette and instance matrices are deterministic. **No time-based motion is supplied.** Use the existing camera and frame evaluator for camera movement, not a second render loop. Narrow ground-cover cast shadows are disabled because thousands of small, high-frequency shadow edges can shimmer; receive shadows remain enabled.
- One kind renders in one draw call regardless of instance count; using all three kinds costs three foliage draws. More detailed geometry still costs vertices and GPU processing, especially in the supporting tier. A **2.5-million instance-expanded vertex cap** rejects oversized requests with instructions to lower counts or select background detail. `dispose()` removes the mesh and frees only the generated geometry/material/instance data; the caller owns placements and terrain.
- These plants are *stylized categories*, not accurate identified cultivars. A hero close-up needs reviewed bespoke botanical models or macro photography.

## Quality review

Open **3D asset toolkit → Natural Environments → Botanical Closeup**. A guaranteed centered specimen is framed at near-camera scale, with separate **Camera distance** (overview/close-up) and full orbital scrub. Check small joints, fern serrations, grass seed attachment, flower anthers, surface shading and silhouette under both aspects. The screenshot matrix supports `--scenes=natural-closeups` for all three close-up species and `--scenes=natural-plants` for landscape context. Reject floating bases, repeated leaf stamps, inverted normals, petal/pinna junctions, implausible scale, holes, highlight popping or overly dense ground cover. Compare against a bare/low-density scene in ContentGen. Tests and Storybook builds do not substitute for real GPU review or prove the work matches a photography reference.
