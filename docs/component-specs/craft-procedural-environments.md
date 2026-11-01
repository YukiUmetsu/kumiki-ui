# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native bay, frame, pier, cornice, shopfront and window geometry; WebGL PBR materials, running-bond mortar/brick finish, either dark backing (default) or optional 3D room pockets | **Background/supporting**; real parallax in opt-in rooms, not full architectural interiors |
| Textured masonry without authoring UVs or new geometry | [`applyCraftMasonryFinish`](craft-masonry-finish.md) | World-unit brick course sizing, seeded per-unit variation, antialiased mortared running bond and slight shading-only recess | **Background/supporting**; not sourced historic or hero close-up masonry |
| A street that needs credible physical edges and road furniture | [`createCraftStreetscape`](craft-streetscape.md) | Extruded curb profiles, asphalt, raised sidewalks, seeded paint, pavement seams and framed drainage bars | **Background/supporting**; not a surveyed or hero drain model |
| A populated streetscape with recognizable streetlighting | [`createCraftStreetLamps`](craft-street-lamps.md) or `createCraftStreetscape({ lampsPerSide: 2 })` | Tapered cast-metal poles, swept brackets, lamp shades, recessed glass and fasteners, three instanced draws | **Background/supporting**, emissive lens only: no actual lighting or real-world fixture accuracy |
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
  masonry: { brickLength: .6, brickHeight: .3, jointWidth: .024 }, // optional; false disables
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
- The exterior wall material has a WebGL **object-space masonry finish by default**, with half-course running bond, stable muted color variation, narrow anti-aliased mortar and a small shading-only joint recess; trims, glass and roof planes do not inherit the repeating pattern. Use `masonry: false` to opt out, or `masonry: { ... }` to adjust dimensions/colors. The native building's `.6 × .3` brick module is the default. [Finish API and limitations](craft-masonry-finish.md). No new materials, textures, geometry or draw groups are introduced by the hook.
- Optional `interiors: { depth: 1.8, litFraction: .35 }` reads native `roomCenter` / `roomSize` / `normal` attributes on actual panes. Adjacent panes referencing one native room share **one** pocket. The adapter suppresses the native opaque backing draw group, creates open-front 3D boxes for rear walls, side walls, floors, ceilings, shelves and cabinetry, plus selectively emissive ceiling fixtures. The rooms are child meshes of the façade, so moving the façade preserves alignment and local parallax. `depth` ranges **0.7–3 world units**, `litFraction` **0–1**; **1,500 distinct rooms maximum** (oversized requests fail clearly). The room walls and furniture are one instanced mesh, fixtures another: normally **two extra draw calls**, bounded CPU geometry, no model downloads. The light panels are emissive surfaces **without bounced illumination or physically modeled room lighting**. Rooms are plausible stylized depth cues, not functional floor plans, navigable interiors or realistic furniture libraries. Caller receives `facade.interiors` metadata and owned geometries; dispose with `facade.dispose()`.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki now has three explicit stylized tree profiles: **oak** (spreading side branches and wider lobed leaves), **birch** (more upright branching, narrower serrated leaves and pale default bark), and **pine** (lower whorls, shortening outer branches and geometric needle sprays with 24 angled needles per instance). They each have different branch angles, length falloff, gravity, crown density and default bark/foliage colors. `generic` remains compatible with earlier `crown: "broad" | "slender"` scenes. `species` supersedes `crown` if both are supplied. None of these are measured ecological species models.
- A per-vertex crown-density attribute distributes 0–900 foliage/needle-spray instances on actual upper branch surfaces; all vegetation remains one instanced foliage mesh plus one trunk/branch mesh per tree variant. **Limits:** trunk length 1–12, radius up to .8, maximum 130,000 branch vertices. `leafCount: 0` yields leafless branches. Pine's needle sprays represent clusters of needles (not 900 individual needles); instances are bounded by scene size and projected screen importance.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with mixed oak/birch street trees, checkboxes for room pockets, **Crafted streetscape (road, sidewalk, lamps)** and **Running-bond masonry**. `/ Masonry Detail` is a close-up camera orbit with adjustable mortar width, brick variation and aspect ratio. `/ Hillside` combines pine and birch over rolling terrain with seeded ground placements. Each planted tree gets deterministic yaw and size variation, preserving placement across seek/reverse renders. The stories also apply Kumiki's existing UV-independent `surface-detail` shading to masonry, bark, asphalt and terrain, and use [`craft-camera-detail-lod`](craft-detail-lod.md) to select three seeded foliage budgets from each absolute camera frame. **No new clock, texture service, or renderer.** These are **API/workflow samples**, not approved production assets.

Automated tests cover seeded generation across six façade profiles, distinct material zones including physical glass and backing, optional deterministic room geometry across multiple building seeds, disabled/all-lit room fixture modes, room disposal, distinct seeded geometry/instance colors for three named tree species, explicit bounds and idempotent disposal. Browser captures at close/medium distance (including 16:9 and 9:16), room parallax/transparency sorting, glazing sorting, leaf silhouettes and overlap, needle-spray appearance, texture/detail quality, measured draw calls/GPU time and human approval remain open. A previous browser acquisition attempt produced an invalid archive; the connected browser was unavailable in the subsequent environment. No GPU frame has yet been visually accepted.

**Visual acceptance instructions:** Run Storybook **3D asset toolkit / Procedural Environments / Street Corner** (`craft-procedural-environments--street-corner`). Compare **Recessed room geometry** enabled/disabled at frames **0, 58, 120**, changing seeds **1, 41, 99**. Inspect window borders at oblique angles and confirm that walls/cabinets stay behind glass, no opaque native backing clips them, and moving-camera parallax reads without excessive glowing rectangles. Repeat for **9:16** crop and measure draw calls, transparency sorting and GPU frame time against the dark-backing baseline. For background-only scenes, prefer the default with no `interiors` until measurements justify extra geometry.

**Repeatable capture procedure:** Start `npm run storybook`, inspect the intended 16:9 or 9:16 aspect in the story (portrait follows one featured façade), then run `npm run craft:review -- --plan` and `npm run craft:review` on a machine with Playwright Chromium. This plans **54 real WebGL canvas PNGs** for default seed 21: five street variants, hillside, masonry bonded/flat close-ups and a streetlamp construction close-up; each at frames 0/58/120 and both aspects. The output is a timestamped `dist/craft-environment-review/*/index.html` contact sheet plus a manifest with hashes and reverse-seek checks. **Human art approval and GPU performance measurement still remain open.** Full review and custom capture flags: [visual-review runbook](../verification/craft-environment-visual-review.md).

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
