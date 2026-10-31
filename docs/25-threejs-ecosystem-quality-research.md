# Three.js-compatible visual-detail libraries — implementation shortlist

**Research date:** 2026-10-31. **Scope:** Kumiki's current **Three.js 0.186.1 + WebGLRenderer** stack; exclusively non-Blender work. GitHub activity/licenses were checked on the research date; reverify package versions, licenses and APIs before install. This is an **integration decision log**: BVH-CSG and Troika are now included as feature-branch adapters below, while the other candidates remain unintegrated.

## 1. What Kumiki already provides

Preserve approved existing `crafted-3d`, `crafted-3d-hero`, `material-kit`, `surface-detail`, `studio-kit`, `hero-render`, `environment-parallax`, `scene-templates`, `camera-viewport-3d`, MG1 frame evaluation and asset packs. New libraries must solve an actual missing capability, not create a second rendering/animation system. Existing `craft-detail-kit`, `image-relief-2-5d` and `depth-composite-2-5d` are in the current feature branch and still require visual review.

## 2. Preferred candidates, by visible craftsmanship gain

| Priority | GitHub library | What AI can declare in a short spec | When to use | Adoption caveat |
|---|---|---|---|---|
| **P0** | [Three.js built-in procedural generators](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/generators) | Tree shape, skyscraper facades, city blocks, terrain | Street, skyline, forest, nature background and midground scenes | Already installed; *individual* generators may work in WebGL while complete forest/city generators use TSL node materials; test render/material compatibility before use |
| **P0** | [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) (MIT) | Cut a window, wall opening, duct, vent, screw recess or panel seam from real mesh geometry | Close-up architecture and enclosures where layered facades are insufficient | Boolean performance, non-manifold geometry and downstream normals/UVs need prototype QA; don't replace the lightweight detail-kit path for background objects |
| **P0** | [troika-three-text](https://github.com/protectwise/troika/tree/main/packages/troika-three-text) (MIT) | Exact wording, typography, alignment, size, color and world anchor | Signs, control labels, engraved legends, schematic annotations and labels on actual products | Async font/SDF atlas readiness, glyph availability, export-frame determinism, and CJK licensing/fallback need tests; do not put critical copy into AI photos |
| **P1** | [EZ-Tree](https://github.com/dgreenheck/ez-tree) (MIT) | Species, branching, age/height, leaf density, random seed | Hero/midground vegetation with authentic articulated shapes | Verify geometry cost, wind and material support, licensing of examples, WebGL performance at final output |
| **P1** | [InstancedMesh2](https://github.com/agargaro/instanced-mesh) (MIT) | Seeded thousand-object placement, culling and LOD | Huge vegetation/prop fields only when plain `InstancedMesh` profiling is inadequate | WebGL only; a dependency is justified by measured culling/LOD benefit, not a tiny scene |
| **P1** | [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (MIT) | Spatial queries, surface collision/overlap avoidance | Dense object placement or heavy surface raycasting | Add only if built-in raycasting is measurably too slow; compatible BVH geometry lifecycle must be owned |
| **P1** | [three-roads](https://github.com/vibe-stack/three-roads) (MIT) | Road network, junction, lane-marking and roadside plans | Urban streets, road crossings, city background | Small/young project; test road joins, texture scaling, road markings and fallback before adopting |
| **P2** | [pmndrs/math](https://github.com/pmndrs/math) (MIT) | Reusable seed, noise, polygon and distribution math | Deterministic vegetation/object placement at scale | Inspect overlap with Kumiki helpers and preserve existing MG1 timing |
| **P2** | [THREE-CustomShaderMaterial](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) (MIT) | Scratch/wear ripple procedural material overrides | Physical surfaces that need effects existing Kumiki material kit cannot express | Shader complexity, version drift and color/shadow compatibility need targeted proof |

## 3. Native functionality requiring **zero new packages**

Kumiki's installed `three@0.186.1` already includes:

- `three/addons/generators/TreeGenerator.js`, `ForestGenerator.js`, `TerrainGenerator.js`;
- `three/addons/generators/CityGenerator.js`, `SkyscraperGenerator.js`;
- `three/addons/generators/city/` tools for street trees, streetlights, traffic lights, sidewalks, benches, bins, hydrants, cars and people;
- `three/addons/math/MeshSurfaceSampler.js` for seeded distributions on mesh surfaces;
- `three/addons/objects/Sky.js`, `Water.js`, `Water2.js`, `environments/RoomEnvironment.js`, `geometries/DecalGeometry.js`.

Prefer a small tested adapter around native generators over asking the AI to write hand-crafted geometry for every tree, skyline, or lamppost. **Important:** `ForestGenerator` and complete `CityGenerator` use TSL node-material paths, so verify compatibility with the current WebGL renderer before exposing them as an installed recipe. Start with native `SkyscraperGenerator`, `TreeGenerator` and `MeshSurfaceSampler`; their geometry-producing APIs are narrower.

## 4. Experimental/deferred, not direct runtime dependencies

| Library | Use later for | Why defer |
|---|---|---|
| [PTL procedural textures](https://github.com/danielsobrado/drusniel-procedural-textures) (Apache-2.0) | Bake complex brick, tile, fabric, stone, wood and wear recipes into portable PBR maps | Published runtime peer constraint `three >=0.185 <0.186` conflicts with current `0.186.1`; validate/fix compatibility first |
| [tsl-textures](https://github.com/boytchev/tsl-textures) (MIT) | Node-based procedural material textures | TSL/WebGPU pipeline differs from current WebGL adapter |
| [pmndrs/sky](https://github.com/pmndrs/sky) (MIT) | Physical sky and atmosphere | Current implementation is WebGPU-only |
| [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) (MIT) | Photorealistic hero stills / offline previews | Current path is WebGPU-only; requires a deliberate renderer strategy |
| [three-stylized](https://github.com/Steve245270533/three-stylized) (MIT) | Stylized grass, flowers and terrain reference | Match only when the art direction is clearly stylized; evaluate adapter instead of importing whole sample app |
| [SeedThree](https://github.com/SkyeShark/SeedThree) (MIT) | Experimental world/nature recipes | WebGPU-based experiment, not drop-in WebGL |
| [postprocessing](https://github.com/pmndrs/postprocessing) (Zlib) | Additional screen-space effects | Kumiki already owns GTAO/DoF/bloom in `hero-render`; do not duplicate its composer without a proved missing effect |

No new runtime dependencies should be added merely because a repository is popular. The review target is **actual visible detail at the film camera**, with stable frames and cost measured in a browser.

## 5. Next non-Blender vertical slices

1. **[Implemented in feature branch] Exact lettering/marking:** `craft-text-label` uses Troika `0.52.5` with an explicit approved TTF/OTF/WOFF URL, text bounds, semantic part ID and an async `ready` contract. Non-ASCII requires configured fallback metadata; verify glyph coverage/no unexpected network use and WebGL output before production approval. [Component spec](component-specs/craft-text-label.md).
2. **[Implemented in feature branch] Real architectural apertures:** `craft-solid-cutouts` uses `three-bvh-csg@0.0.18` and `three-mesh-bvh@0.9.7`, producing host-volume through and blind cuts in box solids with a 16-cut/180k-vertex budget; retain `craft-detail-kit` for lightweight overlays. [Component spec](component-specs/craft-solid-cutouts.md).
3. **Procedural placement factory:** reusable `onSurface`, `alongPath`, `insideVolume`, `avoidOverlap`, `alignToNormal`, `seed`, `variation`, `densityMask`, `cameraDistanceLOD`; start with native `MeshSurfaceSampler` and Three InstancedMesh, not custom per-prop scripts. Keep transform results absolute/deterministic.
4. **Architecture/background presets:** prototype `SkyscraperGenerator` with WebGL PBR, then native street items and roads. Demo a camera close-up on one street corner, not a distant skyline that conceals missing detail.
5. **Nature presets:** test `TreeGenerator` geometry, then EZ-Tree leaves/branches and instanced supporting vegetation. Check wind motions against the deterministic frame driver and silhouette over time.
6. **Material recipes:** evaluate PTL's version constraint in isolation; prefer saved high-quality portable albedo/normal/roughness maps for the video renderer over generating thousands of textures at playback.

## 6. Proof gate for adopting any candidate

For every proposed adapter: run a **minimal standalone scene**, document pinned library/Three versions and license/provenance, verify WebGL2 + Storybook + clean registry fixture, measure triangles/draw calls/GPU frame cost, test forward/reverse deterministic frame evaluation and disposal, and manually inspect at least **near/medium hero camera shots** under neutral and cinematic lights. If the native library cannot pass the same test, do not register it as approved. Do not change or overwrite existing Kumiki components to force adoption.

**Preferred next order:** GPU and human visual QA for depth-composite, Troika text and BVH-CSG examples → seeded native placement (`MeshSurfaceSampler`) → native architectural generators → nature detail. Blender-specific modelling remains in `kumiki-blender`.
