# Ground Vegetation — one instanced draw per plant family

**Install:** `craft-ground-vegetation` (automatically installs `craft-scatter-placement`). **Source:** `registry/craft/ground-vegetation.ts`. **Status:** deterministic geometry checks; GPU and human visual review pending. No Blender, model download, texture service or new clock.

## When to use

Use for medium/background forest floors, pathways, wetland edges and meadows where trees and rock scatter leave the ground looking empty. This pack creates three deliberately different botanical silhouettes and batches every repeated specimen of one kind as **one `InstancedMesh`**. It accepts the existing surface/path/volume placements; it does not make placement decisions itself.

| `kind` | Construction | Relative intended scale |
|---|---|---|
| `meadow-grass` | 17 cupped blades with tip-weighted bending and two nodding, curved panicles with pendant grain-bearing side branches (6 blades in background mode) | ~0.4–1.0 world units |
| `woodland-fern` | 6 upward-then-outward arching rachises, each with 7 pairs of leaflets *attached to the curved centerline* (3/4 pairs in background) | ~0.6–0.9 world units |
| `wildflower` | 3 non-linear, weight-bearing flower stalks with stalk-attached leaves, cupped petals, calyx and raised stamens/anthers (1 in background) | ~0.5–0.7 world units |

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
- Geometry has vertex color gradients, central raised leaf ridges, notched margins where relevant, tapered multi-sided stems, visible seed heads and flower interiors. A sampled cubic growth path keeps stalk and flower-head endpoints exact; tubular ring frames follow the local stem tangent. Fern pinnae and grass spikelets sample **the same path** as their parent rachis/culm rather than a straight interpolation that can cause floating attachments. Free blade tips bend laterally and downward with increasing load. The material remains one double-sided, non-metallic PBR material; instance colors add seeded tonal diversity. This is not alpha-card foliage or an external atlas.
- Stems, leaves, normals, palette and instance matrices are deterministic. **No time-based motion is supplied.** Use the existing camera and frame evaluator for camera movement, not a second render loop. Narrow ground-cover cast shadows are disabled because thousands of small, high-frequency shadow edges can shimmer; receive shadows remain enabled.
- One kind renders in one draw call regardless of instance count; using all three kinds costs three foliage draws. More detailed geometry still costs vertices and GPU processing, especially in the supporting tier. A **2.5-million instance-expanded vertex cap** rejects oversized requests with instructions to lower counts or select background detail. `dispose()` removes the mesh and frees only the generated geometry/material/instance data; the caller owns placements and terrain.
- These plants are *stylized categories*, not accurate identified cultivars. A hero close-up needs reviewed bespoke botanical models or macro photography.

## Quality review

Open **3D asset toolkit → Natural Environments → Botanical Closeup**. A guaranteed centered specimen is framed at near-camera scale, with separate **Camera distance** (overview/close-up), **Camera height up or down** (world units), **Camera look up or down angle** (degrees, positive aims upward), and full orbital scrub. Check below, at eye level and above the plant; use negative angles to examine leaf joints and positive angles for undersides. Check fern serrations, grass seed attachment, flower anthers, surface shading and silhouette under both aspects. The screenshot matrix supports `--scenes=natural-closeups` for all three close-up species and `--scenes=natural-plants` for landscape context; automated capture uses default camera sliders. Reject floating bases, rigid straight silhouettes, stems detached from rachises, inverted normals, petal/pinna junctions, implausible scale, holes, highlight popping or overly dense ground cover. Compare against a bare/low-density scene in ContentGen. Tests and Storybook builds do not substitute for real GPU review or prove the work matches a photography reference.

### Botanical photo/field-guide references (inspiration, not bundled assets)

| Reference | Observed structure incorporated | Source and rights |
|---|---|---|
| [North Carolina Extension — lady fern](https://plants.ces.ncsu.edu/plants/athyrium-filix-femina/) | Fronds flare from the base and arch under their own length; pinnae track the rachis | Public plant guide with separately credited photographs; **view only**, do not redistribute its photographs |
| [North Carolina Extension — Braun's wood fern](https://plants.ces.ncsu.edu/plants/polystichum-braunii/) | Vase-shaped crowns with many pinnate fronds rather than evenly upright rods | Public plant guide; photo licenses vary, **inspiration only** |
| [Illinois Extension — grass identification](https://extension.illinois.edu/sites/default/files/grass_id_basics_handout.pdf) | Main panicles curve with visibly drooping spikelets and lateral branches | Diagram for anatomy study; no image copied into Kumiki |
| [Massachusetts Natural Heritage — drooping speargrass](https://www.mass.gov/info-details/drooping-speargrass) | Flowering heads can nod while lower stems stay more erect | Species reference; not an exact grass model |

This is illustrative structural reference, **not** a physics simulation or a claim to match those particular botanical species. Change `seed` and inspect three or more specimens; avoid measuring quality from a single favorable angle.
