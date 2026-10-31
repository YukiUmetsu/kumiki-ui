# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native detailed bay, frame, pier, cornice, shopfront and window geometry; zoned masonry/metal/glass PBR materials and separate dark room backing | **Background/supporting**; physically transmissive glass, but no modeled interior rooms |
| A branching tree with leaf silhouettes | `createCraftTree` | Native pipe-model branches; seeded folded leaves bound to upper branch surfaces; two independently inspectable parts | **Background/supporting**; not a textured hero species model |
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
  crown: "broad", trunkLength: 4, trunkRadius: .16, leafCount: 320,
  colors: { bark: 0x514439, leafDark: 0x274d31, leafLight: 0x64834a },
});
scene.add(tree.group);

// Teardown: remove both from scene, then tower.dispose(); tree.dispose().
```

### What the adapters actually create

- The native `SkyscraperGenerator` builds thousands of real geometric façade parts into a baked `BufferGeometry`. A `partId` buffer gives material zones. Kumiki creates grouped PBR materials (rough mineral masonry, trim, physically transmissive `MeshPhysicalMaterial` glass, metallic equipment and storefront). The final window-back-wall zone is shaded as a darker interior backing; a runtime guard verifies the expected output ordering for pinned Three.js 0.186.1. These are **real separate surfaces, not a decal**, but the backing is **not a detailed room or raytraced interior mapping**. Expect around twelve draw groups per façade instead of one. `glass.opacity`, `glass.roughness` and `glass.transmission` are bounded settings. **Limits:** height 12–120, footprint 8–60 each, floor height 2.4–5, bay width 1.8–4, max 240,000 output vertices. No TSL/WebGPU renderer is used.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki creates folded-leaf geometry and instances 0–900 leaves around the actual branches using its own surface sampler and a crown-density attribute. **Limits:** trunk length 1–12, radius up to .8. `leafCount: 0` yields a leafless tree.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with trees placed along a path. `/ Hillside` demonstrates rolling terrain and seeded world-surface placements. The stories also apply Kumiki's existing UV-independent `surface-detail` shading to masonry, bark, asphalt and terrain, and use [`craft-camera-detail-lod`](craft-detail-lod.md) to select three seeded foliage budgets from each absolute camera frame. **No new clock, texture service, or renderer.** These are **API/workflow samples**, not approved production assets.

Automated tests cover seeded generation across six façade profiles, distinct material zones including physical glass and backing, branch/leaf geometry, explicit bounds and idempotent disposal. `npm run typecheck`, focused ESLint, registry/catalog validation (**208 items / 378 catalog entries / 795 stories**), registry smoke, isolated environment fixture and Storybook production build passed. The visual-toolkit regression suite passed **44 tests across eight files**. Browser captures at close/medium distance (including 16:9 and 9:16), material sorting/transparency, silhouette, texture/detail quality, draw calls, GPU time and human approval remain open. Headless browser acquisition was attempted in this environment but the downloaded archive was invalid; no rendered-frame inspection was performed for the enhanced materials.

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
