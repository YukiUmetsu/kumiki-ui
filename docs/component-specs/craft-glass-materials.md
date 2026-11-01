# Physical Glass Surface Finishes

**Install:** `craft-glass-materials`. **Source:** `registry/craft/glass-materials.ts`. **Storybook:** **3D asset toolkit → Material Laboratory → Glass Finishes**. GPU/human visual review pending.

| `kind` | Material behavior | Use |
|---|---|---|
| `clear` | Low roughness, no generated noise, no absorption tint | Clear vessels and glazing |
| `smoked` | Blue-gray optical attenuation | Dark-tinted glass |
| `amber` | Warm volumetric optical attenuation | Colored glassware |
| `frosted` | Fine seeded surface relief and higher roughness | Privacy or satin glass |
| `ribbed` | Vertical rounded ribs with secondary grain | Fluted glassware |
| `rain-streaked` | Static streak/droplet relief | Illustrative wet panes |

```ts
import { createCraftGlassMaterial } from "./components/craft/glass-materials";
const finish = createCraftGlassMaterial({
  schemaVersion: 1, id: "fluted-glass", seed: 17,
  kind: "ribbed", resolution: 512, repeat: [1, 1], thickness: .35,
});
vessel.material = finish.material;
// When last user unmounts: finish.dispose();
```

- Uses native Three.js `MeshPhysicalMaterial`: transmission 1, IOR 1.52 by default, non-metallic, with absorption color/distance for tinted variants. No fake alpha blend. `thickness` is an optical parameter, **not actual mesh geometry**. Use closed, physically thick shapes for the intended refraction.
- Only frosted/ribbed/rain-streaked allocate seeded tileable linear normal and roughness maps. Map resolution 128/256(default)/512; at 512, two RGBA maps occupy ~2 MiB before mipmaps.
- `repeat` components 0–32, thickness 0.01–10, IOR 1–2.5, optional `attenuationDistance` within (0,1000], tint an RGB integer. Validation rejects nonfinite numbers. Call `dispose()` once after material sharing ends; it releases only owned material and optional maps.
- Optical appearance depends on objects **behind** the glass and a convincing lighting/reflection environment. This factory does not add reflection cards, caustics or ray tracing. Rain shading is static; for animated raindrops/dust use V09 EnvironmentalEffects with exact-frame evaluation.

**QA:** Orbit and inspect **Material Laboratory → Glass Finishes**, changing 16:9/9:16, 0/58/120 and 128/256/512 resolutions. Look for transmitted colored bars, correct rib direction, grazing-light surface detail, glass opacity, refraction, repetitive maps and moiré. Storybook code and GPU screenshot existence alone never authorize a hero glass object.
