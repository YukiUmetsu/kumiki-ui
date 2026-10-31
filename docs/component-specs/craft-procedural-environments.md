# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native detailed bay, frame, pier, cornice, shopfront and window geometry; zoned masonry/metal/glass PBR materials, either dark backing (default) or optional 3D room pockets | **Background/supporting**; real parallax in opt-in rooms, not full architectural interiors |
| A street, park or forest with distinct tree silhouettes | `createCraftTree` | Native pipe-model branches; `species: "oak"` lobed leaves, `"birch"` serrated narrow leaves or `"pine"` radial 24-needle twig sprays; `"generic"` retains the former broad/slender shapes | **Background/supporting**; stylized, not botanically measured hero species |
| Many trees/props along road or on landscape | `createCraftScatter` | Seeded world-space placements; clone trees or use instances when their geometry/material is shared | **Distribution**; does not increase source asset detail |

Use existing approved `crafted-3d`, `craft-detail-kit`, `craft-solid-cutouts` and GLB models for camera-close hero structures. An architectural subject requiring accurate furnished rooms, detailed glazing and material joins needs separately authored systems; this builder is not a CAD tool. For distinctive local species, sites or historic buildings, start with an approved model/reference and preserve its provenance; do not assume a generic procedural shape is factual.

**When to turn on rooms:** for urban medium-distance shots with a moving camera where dark flat windows would look lifeless. Leave `interiors` absent for skylines, distant buildings, dense city backgrounds and daytime glass whose inside is not legible. These pockets do not substitute for source-accurate or furnished rooms in camera-close walkthroughs.

## Minimal recipe

```ts
import { createCraftFacade, createCraftTree } from "./components/craft/environment-generator";

const tower = createCraftFacade({
  schemaVersion: 1, id: "background-building", seed: 41,
  height: 27, footprint: { width: 12, depth: 11 },
  colors: { masonry: 0xad9d83, trim: 0xe2cfaf, glass: 0x263d4b },
  interiors: { depth: 1.8, litFraction: .35 }, // omit for cheaper dark backing
});
scene.add(tower.mesh);

const tree = createCraftTree({
  schemaVersion: 1, id: "background-tree", seed: 81,
  species: "oak", trunkLength: 4, trunkRadius: .16, leafCount: 320,
  colors: { bark: 0x514439, leafDark: 0x274d31, leafLight: 0x64834a },
});
scene.add(tree.group);

// Swap species without writing geometry. `crown` only affects `generic`.
const conifer = createCraftTree({ schemaVersion: 1, id: "forest-tree",
  seed: 82, species: "pine", trunkLength: 5, trunkRadius: .16, leafCount: 390 });
scene.add(conifer.group);

// Teardown: remove from scene, then tower.dispose(); tree.dispose(); conifer.dispose().
```

### What the adapters actually create

- The native `SkyscraperGenerator` builds thousands of real geometric façade parts into a baked `BufferGeometry`. A `partId` buffer gives material zones. Kumiki creates grouped PBR materials (rough mineral masonry, trim, physically transmissive `MeshPhysicalMaterial` glass, metallic equipment and storefront). By default, the native final window-back-wall zone is shaded as dark room backing; a runtime guard checks its location for pinned Three.js 0.186.1. These are **real separate surfaces, not a decal**. Expect around twelve draw groups per façade. `glass.opacity`, `glass.roughness` and `glass.transmission` are bounded settings. **Limits:** height 12–120, footprint 8–60 each, floor height 2.4–5, bay width 1.8–4, max 240,000 output vertices. No TSL/WebGPU renderer is used.
- Optional `interiors: { depth: 1.8, litFraction: .35 }` reads native `roomCenter` / `roomSize` / `normal` attributes on actual panes. Adjacent panes referencing one native room share **one** pocket. The adapter suppresses the native opaque backing draw group, creates open-front 3D boxes for rear walls, side walls, floors, ceilings, shelves and cabinetry, plus selectively emissive ceiling fixtures. The rooms are child meshes of the façade, so moving the façade preserves alignment and local parallax. `depth` ranges **0.7–3 world units**, `litFraction` **0–1**; **1,500 distinct rooms maximum** (oversized requests fail clearly). The room walls and furniture are one instanced mesh, fixtures another: normally **two extra draw calls**, bounded CPU geometry, no model downloads. The light panels are emissive surfaces **without bounced illumination or physically modeled room lighting**. Rooms are plausible stylized depth cues, not functional floor plans, navigable interiors or realistic furniture libraries. Caller receives `facade.interiors` metadata and owned geometries; dispose with `facade.dispose()`.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki now has three explicit stylized tree profiles: **oak** (spreading side branches and wider lobed leaves), **birch** (more upright branching, narrower serrated leaves and pale default bark), and **pine** (lower whorls, shortening outer branches and geometric needle sprays with 24 angled needles per instance). They each have different branch angles, length falloff, gravity, crown density and default bark/foliage colors. `generic` remains compatible with earlier `crown: "broad" | "slender"` scenes. `species` supersedes `crown` if both are supplied. None of these are measured ecological species models.
- A per-vertex crown-density attribute distributes 0–900 foliage/needle-spray instances on actual upper branch surfaces; all vegetation remains one instanced foliage mesh plus one trunk/branch mesh per tree variant. **Limits:** trunk length 1–12, radius up to .8, maximum 130,000 branch vertices. `leafCount: 0` yields leafless branches. Pine's needle sprays represent clusters of needles (not 900 individual needles); instances are bounded by scene size and projected screen importance.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with mixed oak/birch street trees and a checkbox comparing recessed room pockets against flat dark backing. `/ Hillside` combines pine and birch over rolling terrain with seeded ground placements. Each planted tree gets deterministic yaw and size variation, preserving its placement across seek/reverse renders. The stories also apply Kumiki's existing UV-independent `surface-detail` shading to masonry, bark, asphalt and terrain, and use [`craft-camera-detail-lod`](craft-detail-lod.md) to select three seeded foliage budgets from each absolute camera frame. **No new clock, texture service, or renderer.** These are **API/workflow samples**, not approved production assets.

Automated tests cover seeded generation across six façade profiles, distinct material zones including physical glass and backing, optional deterministic room geometry across multiple building seeds, disabled/all-lit room fixture modes, room disposal, distinct seeded geometry/instance colors for three named tree species, explicit bounds and idempotent disposal. Browser captures at close/medium distance (including 16:9 and 9:16), room parallax/transparency sorting, glazing sorting, leaf silhouettes and overlap, needle-spray appearance, texture/detail quality, measured draw calls/GPU time and human approval remain open. A previous browser acquisition attempt produced an invalid archive; the connected browser was unavailable in the subsequent environment. No GPU frame has yet been visually accepted.

**Visual acceptance instructions:** Run Storybook **3D asset toolkit / Procedural Environments / Street Corner** (`craft-procedural-environments--street-corner`). Compare **Recessed room geometry** enabled/disabled at frames **0, 58, 120**, changing seeds **1, 41, 99**. Inspect window borders at oblique angles and confirm that walls/cabinets stay behind glass, no opaque native backing clips them, and moving-camera parallax reads without excessive glowing rectangles. Repeat for **9:16** crop and measure draw calls, transparency sorting and GPU frame time against the dark-backing baseline. For background-only scenes, prefer the default with no `interiors` until measurements justify extra geometry.

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
