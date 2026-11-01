# Natural PBR Materials — local tileable surface factory

**Install:** `craft-natural-materials`. **Source:** `registry/craft/natural-materials.ts`. **Status:** CPU checks and Storybook implementation; GPU/human visual approval pending. Native Three.js only, no downloaded textures or new npm dependencies.

## Use it when

- A UV-mapped terrain, stone, bark prop, foliage prop or background object needs **albedo, normal and roughness** variation without sourcing each individual texture.
- Many objects share one material: call the factory once, reuse its `material`, then call `dispose()` only after all users are gone.
- Seeded appearance and exact rerenders matter. The maps are generated on scene assembly and never depend on elapsed time.

**Do not use for:** measured hero bark/stone, historically specific materials, ground that has no usable UVs, displaced rock silhouettes, or transparent water/glass. These are supporting/background material recipes. Use a licensed scanned material with correct maps when close-up authenticity matters.

## Recipe

```ts
import { createCraftNaturalMaterial } from "./components/craft/natural-materials";

const soil = createCraftNaturalMaterial({
  schemaVersion: 1, id: "forest-floor", seed: 41,
  kind: "forest-soil", repeat: [5, 5], wetness: .2,
});
terrain.material = soil.material;
// After the mesh releases this material: soil.dispose();
```

| `kind` | Palette/finish intent | Good for |
|---|---|---|
| `forest-soil` | Brown earth, granular roughness | Forest floor, dirt patches |
| `moss` | Green clumps, soft surface detail | Damp ground, stone-cover props |
| `weathered-stone` | Gray mineral flecks, raised grain | Rocks, pavement, walls with UVs |
| `dry-sand` | Warm mineral grains, muted micro-relief | Dunes and arid ground |
| `bark` | Directional brown grain | UV-mapped wood props, not the UV-less TreeGenerator |
| `leaf` | Green waxy surface response | UV-mapped foliage props |

## Contract and limits

- Each instance owns three 128×128 RGBA `DataTexture`s (`map`, `roughnessMap`, `normalMap`) and one `MeshStandardMaterial`. `map` uses sRGB; the others remain linear. Roughness is stored in the G channel as required by Three.js, and tangent-space normals are calculated from the same periodic height field. Linear/mipmapped filtering and 4× anisotropy reduce shimmer during oblique video camera moves.
- All octaves wrap at texture boundaries. `repeat: [u,v]` controls UV tiling (default `[1,1]`, each 0–64); `wetness` 0–1 darkens the albedo and lowers roughness. `tint` accepts an RGB integer multiplied over the generated palette. `seed` must be a safe integer.
- No renderer, timing, network, license or file-system dependency. The CPU texture generation happens **once per material creation**, not per animation frame. Consumers own material sharing and disposal.
- Tiling may be visible over large uniform areas. 128px maps cannot support tight hero macro photography, true height displacement or anisotropic scans. Inspect grazing-light and distant moving shots for repetitive grain and aliasing.

## Visual review

Open **3D asset toolkit → Natural Environments → Natural Materials**. Change **Ground material**, **Wetness**, **Seed** and **Output aspect** while orbiting 0–120 frames. Compare dry versus wet at the same pose and resolution; inspect light response, seams, UV stretching, false metallic highlights and texture repetition. CPU tests verify repeat configuration and deterministic bytes; they cannot approve visual realism. For full capture, use `npm run craft:review -- --scenes=natural-materials` when Storybook and Playwright Chromium are available.
