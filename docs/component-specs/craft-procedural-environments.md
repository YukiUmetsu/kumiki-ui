# Procedural Background Environments — native trees and architectural facades

**Registry item:** `craft-procedural-environments`. **Source:** `registry/craft/environment-generator.ts`. **Backend:** installed Three.js `TreeGenerator` and `city/SkyscraperGenerator`; uses [`craft-scatter-placement`](craft-scatter-placement.md) for native-branch leaf distribution. **No new npm dependencies or Blender.** **Status:** structurally verified; actual GPU/human visual acceptance pending.

## Which asset factory to use

| Video need | Function | Output | Fidelity |
|---|---|---|---|
| Urban building in establishing/medium shot | `createCraftFacade` | Native bay, frame, pier, cornice, shopfront and window geometry; WebGL PBR materials, running-bond mortar/brick finish, either dark backing (default) or optional 3D room pockets with behind-glass shades and curtains | **Background/supporting**; real parallax in opt-in rooms, not full architectural interiors |
| Textured masonry without authoring UVs or new geometry | [`applyCraftMasonryFinish`](craft-masonry-finish.md) | World-unit brick course sizing, seeded per-unit variation, antialiased mortared running bond and slight shading-only recess | **Background/supporting**; not sourced historic or hero close-up masonry |
| A street that needs credible physical edges and road furniture | [`createCraftStreetscape`](craft-streetscape.md) | Extruded curb profiles, asphalt, raised sidewalks, seeded paint, pavement seams and framed drainage bars | **Background/supporting**; not a surveyed or hero drain model |
| A populated streetscape with recognizable streetlighting | [`createCraftStreetLamps`](craft-street-lamps.md) or `createCraftStreetscape({ lampsPerSide: 2 })` | Tapered cast-metal poles, swept brackets, lamp shades, recessed glass and fasteners, three instanced draws | **Background/supporting**, emissive lens only: no actual lighting or real-world fixture accuracy |
| A street, park or forest with distinct tree silhouettes | `createCraftTree` | Native pipe-model branches with species-tinted vertex bark; `"oak"` 3-leaf lobed twig clusters, `"birch"` 4-leaf serrated clusters, `"pine"` radial 24-needle sprays; `"generic"` 2-leaf clusters | **Background/supporting**; stylized, not botanically measured hero species |
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
  interiors: { depth: 1.8, litFraction: .35,
    windowTreatments: { coverage: .6, style: "mixed" } }, // false disables dressings
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
- Optional `interiors: { depth: 1.8, litFraction: .35 }` reads native `roomCenter` / `roomSize` / `normal` attributes on actual panes. Adjacent panes referencing one native room share **one** pocket. The adapter suppresses the native opaque backing draw group, creates open-front 3D boxes for rear walls, side walls, floors, ceilings, shelves and cabinetry, plus selectively emissive ceiling fixtures. The rooms are child meshes of the façade, so moving the façade preserves alignment and local parallax. `depth` ranges **0.7–3 world units**, `litFraction` **0–1**; **1,500 distinct rooms maximum** (oversized requests fail clearly). The room walls and furniture are one instanced mesh, fixtures another: normally **two extra draw calls**, bounded CPU geometry, no model downloads. The light panels are emissive surfaces **without bounced illumination or physically modeled room lighting**.
- `interiors.windowTreatments` adds optional seeded physical window dressings **behind** the native glazing (`z` depth approximately 0.17–0.25 inside the window). When omitted, a default 58% of distinct rooms receive either a partially lowered roller shade (fabric + header) or pleated side curtains (six staggered strips + rail). Declare `{ coverage: 0–1, style: "mixed" | "roller" | "curtains" }` for controlled variation; `false` or `{ coverage: 0 }` disables all dressing geometry. Colors are deterministic muted fabric tones, not an external texture. Dressings share **one additional instanced draw call**, at most seven box instances per treated room, and the returned `facade.interiors` exposes `treatmentParts`, `treatmentRoomCount` and `treatmentPieceCount`. Geometry and material are owned and disposed with the facade. These are small-scale stylized silhouette cues, not hero curtains or accurate rendered textiles.
- The native `TreeGenerator` grows a deterministic tapered branching skeleton as triangles, from one small specification. It does **not** generate leaves. Kumiki now has three explicit stylized tree profiles: **oak** (spreading side branches and wider lobed leaves), **birch** (more upright branching, narrower serrated leaves and pale default bark), and **pine** (lower whorls, shortening outer branches and geometric needle sprays with 24 angled needles per instance). They each have different branch angles, length falloff, gravity, crown density and default bark/foliage colors. `generic` remains compatible with earlier `crown: "broad" | "slender"` scenes. `species` supersedes `crown` if both are supplied. None of these are measured ecological species models.
- A per-vertex crown-density attribute distributes 0–900 foliage/needle-spray instances on actual upper branch surfaces; all vegetation remains one instanced foliage mesh plus one trunk/branch mesh per tree variant. **Broadleaf detail:** each instance now contains a tapered central stem and 2, 3 or 4 alternate, cupped, vein-ridged leaflets, depending on species. This increases geometry rendered per instance while preserving two draw calls (wood + foliage). Birch serration frequency stays below mesh sampling rate to reduce contour aliasing. **Wood detail:** species-tinted, UV-free vertex coloring adds restrained longitudinal grain and mottling over the native tapered branch geometry. It is *color*, not physical bark relief or high-resolution bark texture. **Limits:** trunk length 1–12, radius up to .8, maximum 130,000 branch vertices. `leafCount: 0` yields leafless branches. Pine's needle sprays still represent clusters of needles (not 900 individual needles); instances are bounded by scene size and projected screen importance.
- Foliage is authored procedural geometry, not sampled from any external stock library; no third-party raw textures/models are bundled. Materials and geometries are owned by the returned adapter and released with `dispose()`; the renderer, animation and camera remain caller-owned.

## Review and further work

Storybook `3D asset toolkit / Procedural Environments / Street Corner` demonstrates two building seeds with mixed oak/birch street trees, checkboxes for room pockets, **Window treatments**, **Crafted streetscape (road, sidewalk, lamps)** and **Running-bond masonry**. `/ Window Detail` is a close-up camera orbit comparing **Rooms + treatments**, **Rooms only** and **Dark backing only**, with frame/seed/aspect/illumination controls. `/ Masonry Detail` independently studies mortar width/brick color; `/ Hillside` combines pine and birch over rolling terrain with seeded ground placements. `/ Foliage Detail` is a deliberate close-range oak/birch/pine comparison, with seed, frame, output aspect and bare-branch toggles to inspect twig attachments, canopy gaps and bark. Each planted tree gets deterministic yaw and size variation, preserving placement across seek/reverse renders. Stories also apply Kumiki's UV-independent `surface-detail` shading to masonry, bark, asphalt and terrain, and use [`craft-camera-detail-lod`](craft-detail-lod.md) to select three foliage budgets with optional alpha-hash transitions at each absolute camera frame. **No new clock, texture service, or renderer.** These are **API/workflow samples**, not approved production assets.

Automated tests cover seeded generation across façade profiles, distinct PBR zones, optional deterministic room geometry, curtains/roller style counts, per-instance transformations/colors, treatment opt-out, disabled/all-lit fixtures, disposal and three tree species. Browser captures at close/medium distance (including 16:9 and 9:16), room parallax/transparency sorting, glass/dressing clipping, leaf silhouettes and overlap, needle-spray appearance, texture/detail quality, measured draw calls/GPU time and human approval remain open. A previous browser acquisition attempt produced an invalid archive; the connected browser was unavailable in the subsequent environment. No GPU frame has yet been visually accepted.

**Visual acceptance instructions:** Open Storybook **Window Detail** (`craft-procedural-environments--window-detail`), compare all three `Window interiors` modes at frames **0, 58, 120**, seeds **1, 41, 99** and both aspects. Inspect whether shades and folds remain **behind** glass, any plane intersects mullions, close-up panels look too flat, and moving-camera parallax differs from dark backing. Then use **Street Corner** (`craft-procedural-environments--street-corner`) to compare **Recessed room geometry** and **Window treatments** toggles at full street scale. Check room illumination without overblown glowing rectangles, glazing sorting, and actual GPU draw calls/frame time against the dark-backing baseline. For background-only scenes, prefer no `interiors` until measurements justify extra geometry.

**Repeatable capture procedure:** Start `npm run storybook`, inspect the intended 16:9 or 9:16 aspect in the story (portrait follows one featured façade), then run `npm run craft:review -- --plan` and `npm run craft:review` on a machine with Playwright Chromium. This plans **108 real WebGL canvas PNGs** for default seed 21: seven street variants, two hillside variants, masonry bonded/flat, streetlamp construction, three window configurations and three species-specific foliage close-ups; each at frames 0/58/120 and both aspects. The output is a timestamped `dist/craft-environment-review/*/index.html` contact sheet plus a manifest with hashes and reverse-seek checks. **Human art approval and GPU performance measurement still remain open.** Full review and custom capture flags: [visual-review runbook](../verification/craft-environment-visual-review.md).

Upstream code is provided by pinned [`three@0.186.1`](https://github.com/mrdoob/three.js), MIT; this adapter only calls installed generator APIs. Native `ForestGenerator`/`CityGenerator` use TSL/WebGPU materials and are **not** adopted by this WebGL component.
