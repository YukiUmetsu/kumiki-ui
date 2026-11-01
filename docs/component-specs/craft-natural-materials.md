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
| `forest-soil` | Layered clods, sparse pebble inclusions and fine granular relief | Forest floor, dirt patches |
| `moss` | Cellular cushion mounds with fine surface fuzz | Damp ground, stone-cover props |
| `weathered-stone` | Mineral domains, irregular cracks and flecked microtexture | Rocks, pavement, walls with UVs |
| `dry-sand` | Directional low ripples with finer independent sand grain | Dunes and arid ground |
| `bark` | Axial grooves and broken fissures; UV `v` follows trunk length | UV-mapped wood props, not the UV-less TreeGenerator |
| `leaf` | Raised midrib/branch-vein network with waxy roughness contrast | UV-mapped foliage props |

## Contract and limits

- Each instance owns three RGBA `DataTexture`s (`map`, `roughnessMap`, `normalMap`) and one `MeshStandardMaterial`. Resolution is **256×256 by default**, with `resolution: 128` for distant assets or `resolution: 512` for an inspected close-up. At 512, the three uncompressed RGBA maps require about **3 MiB before mipmaps**; mipmaps add roughly a third. `map` uses sRGB; the others remain linear. Roughness is stored in the G channel as required by Three.js, and tangent-space normals are calculated from the same periodic material-specific relief. Linear/mipmapped filtering and 4× anisotropy reduce shimmer during oblique video camera moves.
- All octaves wrap at texture boundaries. `repeat: [u,v]` controls UV tiling (default `[1,1]`, each 0–64); `wetness` 0–1 darkens the albedo and lowers roughness. `tint` accepts an RGB integer multiplied over the generated palette. `seed` must be a safe integer.
- No renderer, timing, network, license or file-system dependency. The CPU texture generation happens **once per material creation**, not per animation frame. Consumers own material sharing and disposal.
- These patterns are tileable, independently seeded and deliberately different, but **not photographed surfaces**. Increasing `resolution` changes texture detail density, not geometry or realism; repeated tiles, physically wrong UV direction and close-up pixelation can still occur. Use `repeat` to match world scale, and align bark's UV `v` with the grain. No actual height displacement. Inspect grazing-light and moving shots for repetition and aliasing.

## Visual review

Open **3D asset toolkit → Natural Environments → Natural Materials** or **Material Closeup**. Change **Ground material**, **Wetness**, **Seed**, **Camera distance** and **Output aspect** while orbiting 0–120 frames. Compare dry versus wet at the same pose and resolution; inspect light response, seams, UV stretching, false metallic highlights and texture repetition. CPU tests verify repeat configuration and deterministic bytes; they cannot approve visual realism. For full capture, use `npm run craft:review -- --scenes=natural-materials` when Storybook and Playwright Chromium are available.
