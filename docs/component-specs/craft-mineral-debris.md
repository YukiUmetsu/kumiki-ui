# Instanced Mineral Debris — ground grit geometry

**Install:** `craft-mineral-debris` (installs `craft-scatter-placement`). **Storybook:** **3D asset toolkit → Material Laboratory → Ground Particles**. No Blender or downloaded stock models. GPU/human review pending.

Use 3D debris when grazing camera movement needs real silhouettes and parallax beyond an albedo/roughness/normal map.

| `kind` | Shape | Intended role |
|---|---|---|
| `sand-grains` | Small flattened faceted quartz-like grains | Macro foreground sand |
| `rock-chips` | Larger angular fractured pieces | Ground gravel and scree |

```ts
import { createCraftScatter } from "./components/craft/scatter-placement";
import { createCraftMineralDebris } from "./components/craft/mineral-debris";

const positions = createCraftScatter({
  schemaVersion: 1, id: "grit", seed: 23, mode: "surface", count: 900,
  minDistance: .04, surfaceNormal: true, randomYaw: true,
  normalOffset: .009, scale: [.6, 1.4],
}, groundMesh);
const grit = createCraftMineralDebris({ schemaVersion: 1,
  id: "ground-grains", seed: 24, kind: "sand-grains", radius: .012,
  detail: "supporting",
}, positions);
scene.add(grit.mesh);
// At teardown: grit.dispose();
```

- `radius` 0.001–2 world units; `detail` `supporting` or `background`; optional RGB `color`. Placement count 1–2500, unique IDs and finite matrices. Caller owns terrain and placement decisions.
- One Three.js `InstancedMesh` per grain kind, regardless of instance count. The supporting variant has more facets; deterministic instance colors vary the mineral tint. No per-frame particles/physics. Small cast shadows are disabled to reduce video shimmer, but receive shadows remain enabled.
- High grain counts may waste GPU time if each piece occupies subpixel screen area. At medium distance prefer the matching `craft-natural-materials` normal map alone.
- **For airborne dust/snow/rain, use existing V09 EnvironmentalEffects.** This pack is static near-ground grit, not a duplicate animation clock.

**QA:** In **Material Laboratory → Ground Particles**, scrub orbital frames 0/58/120 and both video aspects. Inspect scale against the floor, grounded contact, facet repetition, collisions and disappearing grains. Measure real GPU frame time and compare with the uninstanced textured-only baseline before shipping a close-up.
