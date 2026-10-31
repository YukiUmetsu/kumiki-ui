# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native detailed bay, frame, pier, cornice, shopfront and window geometry; zoned masonry/metal/glass PBR materials and separate dark room backing | **Background/supporting**; physically transmissive glass, but no modeled interior rooms |
| A street, park or forest with distinct tree silhouettes | `createCraftTree` | Native pipe-model branches; `species: "oak"` lobed leaves, `"birch"` serrated narrow leaves or `"pine"` radial 24-needle twig sprays; `"generic"` retains the former broad/slender shapes | **Background/supporting**; stylized, not botanically measured hero species |
| Many trees/props along road or on landscape | `createCraftScatter` | Seeded world-space placements; clone trees or use instances when their geometry/material is shared | **Distribution**; does not increase source asset detail |

Use existing approved `crafted-3d`, `craft-detail-kit`, `craft-solid-cutouts` and GLB models for camera-close hero structures. An architectural subject that exposes actual interiors, glazing and material joins needs separately authored systems; this builder is not a CAD tool. For distinctive local species, sites or historic buildings, start with an approved model/reference and preserve its provenance; do not assume a generic procedural shape is factual.

## Minimal recipe

```ts
import { createCraftFacade, createCraftTree } from "./components/craft/environment-generator";

const tower = createCraftFacade({
  schemaVersion: 1, id: "background-building", seed: 41,
  height: 27, footprint: { width: 12, depth: 11 },
  colors: { masonry: 0xad9d83, trim: 0xe2cfaf, glass: 0x263d4b },
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

- The native `SkyscraperGenerator` builds thousands of real geometric façade parts into a baked `BufferGeometry`. A `partId` buffer gives material zones. Kumiki creates grouped PBR materials (rough mineral masonry, trim, physically transmissive `MeshPhysicalMaterial` glass, metallic equipment and storefront). The final window-back-wall zone is shaded as a darker interior backing; a runtime guard verifies the expected output ordering for pinned Three.js 0.186.1. These are **real separate surfaces, not a decal**, but the backing is **not a detailed room or raytraced interior mapping**. Expect around twelve draw groups per façade instead of one. `glass.opacity`, `glass.roughness` and `glass.transmission` are bounded settings. **Limits:** height 12–120, footprint 8–60 each, floor height 2.4–5, bay width 1.8–4, max 240,000 output vertices. No TSL/WebGPU renderer is used.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki now has three explicit stylized tree profiles: **oak** (spreading side branches and wider lobed leaves), **birch** (more upright branching, narrower serrated leaves and pale default bark), and **pine** (lower whorls, shortening outer branches and geometric needle sprays with 24 angled needles per instance). They each have different branch angles, length falloff, gravity, crown density and default bark/foliage colors. `generic` remains compatible with earlier `crown: "broad" | "slender"` scenes. `species` supersedes `crown` if both are supplied. None of these are measured ecological species models.
- A per-vertex crown-density attribute distributes 0–900 foliage/needle-spray instances on actual upper branch surfaces; all vegetation remains one instanced foliage mesh plus one trunk/branch mesh per tree variant. **Limits:** trunk length 1–12, radius up to .8, maximum 130,000 branch vertices. `leafCount: 0` yields leafless branches. Pine's needle sprays represent clusters of needles (not 900 individual needles); instances are bounded by scene size and projected screen importance.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with mixed oak/birch street trees. `/ Hillside` combines pine and birch over rolling terrain with seeded ground placements. Each planted tree gets deterministic yaw and size variation, preserving its placement across seek/reverse renders. The stories also apply Kumiki's existing UV-independent `surface-detail` shading to masonry, bark, asphalt and terrain, and use [`craft-camera-detail-lod`](craft-detail-lod.md) to select three seeded foliage budgets from each absolute camera frame. **No new clock, texture service, or renderer.** These are **API/workflow samples**, not approved production assets.

Automated tests cover seeded generation across six façade profiles, distinct material zones including physical glass and backing, distinct seeded geometry/instance colors for three named tree species, explicit bounds and idempotent disposal. Browser captures at close/medium distance (including 16:9 and 9:16), leaf silhouettes and overlap, glazing sorting, needle-spray appearance, texture/detail quality, draw calls, GPU time and human approval remain open. A previous browser acquisition attempt produced an invalid archive; no new frame has yet been visually accepted.

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
