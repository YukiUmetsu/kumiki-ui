# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native detailed bay, frame, pier, cornice, shopfront and window geometry; per-zone vertex colors; WebGL-compatible MeshStandardMaterial | **Background/supporting** only; the glass color is not physically transparent |
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

- The native `SkyscraperGenerator` builds thousands of real geometric façade parts into a baked `BufferGeometry`. A `partId` buffer gives material zones. Kumiki adds a three-channel vertex color for masonry, trim, glazing, metal and storefront with a stock WebGL `MeshStandardMaterial`; no TSL/WebGPU renderer or shader is required. **Limits:** height 12–120, footprint 8–60 each, floor height 2.4–5, bay width 1.8–4, max 240,000 output vertices.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki creates folded-leaf geometry and instances 0–900 leaves around the actual branches using its own surface sampler and a crown-density attribute. **Limits:** trunk length 1–12, radius up to .8. `leafCount: 0` yields a leafless tree.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with trees placed along a path. `/ Hillside` demonstrates a rolling terrain and seeded world-surface placements. They are **API/workflow samples**, not approved production assets.

Automated tests passed for seeded generation, façade zones and PBR colors, branch and folded-leaf geometry, explicit bounds and idempotent disposal (part of **39/39 passing tests in seven relevant files**). `npm run typecheck`, focused ESLint, registry validation (**207 items**), catalog check (**377 indexed entries / 795 stories**), registry smoke, isolated `registry:fixture -- --item=craft-procedural-environments` (including its placement dependency) and `build-storybook` passed. Browser captures at close/medium distance (including 16:9 and 9:16), façade glass transparency limitations, silhouette, texture/detail quality, draw calls, GPU time and human approval remain open.

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
