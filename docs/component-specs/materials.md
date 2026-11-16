# MATL1 — materials framework for any art style

**Registry item:** `materials` (needs `art-foundations`) · **Files:** `registry/materials/materials-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Materials (Sheet, Material lab) · **Skill:**
[kumiki-materials](../../skills/kumiki-materials/SKILL.md) · **Research:**
[materials framework, 2026-11-16](../research/materials-framework-2026-11-16.md)

MATL1 holds what stays true about a material in every art style:

- its colour in linear light (diffuse albedo, or a metal's reflectance);
- whether it is a metal;
- how rough it is;
- how much it varies across a real surface;
- how it looks wet;
- how it ages.

A painter reads the value (L*), the highlight and the weathering. A renderer reads standard PBR parameters.

It complements the existing texture generators (`craft-natural-materials`, `craft-glass-materials`). Those make
textures; MATL1 says what the material is.

## What it is for

- **Picking a colour and value that are true.** `findMaterial(id)`, `toHex(albedo)` and `lightness(albedo)` give a
  material's sRGB colour and L*. `valueLadder()` orders materials from dark to light.
- **Renderers.** `toStandardMaterial(m)` returns `{ color, metalness, roughness, ior }` for three.js
  MeshStandardMaterial, glTF or Blender's Principled BSDF.
- **Wet scenes.** `wetMaterial(m, wetness)` darkens porous materials by the Ångström–Lekner–Dorf model and makes any
  surface glossier under a film.
- **Age.**
  - `weathered(track, years, environment)` follows the tracks: copper (oxide films, sulfide browns, slate, green;
    marine about 8 years, industrial and rural about 20), iron to rust, wood to grey in about a year outdoors,
    bamboo, tatami and paper.
  - `lacquerWear(exposure, years)` shows black through red lacquer at rims (Negoro).
- **Highlights.** `f0(m)` gives about 4% for most dielectrics and the metal's own colour for metals.
  `highlightSpread(roughness)` gives the highlight's half-width.

## Data (registry/materials/materials-data.ts)

| Source | Materials | Grade |
| --- | --- | --- |
| Physically Based database (CC0 1.0; data at commit `bed520ab`) | 36: metals (gold, silver, copper, brass, iron, cast iron, stainless steel, aluminium, lead, zinc, titanium, chromium, nickel), brick, terracotta, clay, porcelain, marble, concrete, sand, charcoal, paper, cardboard, rust, snow, ice, water, glass, pearl, bone, grass, asphalt, blackboard, rubber, quartz, salt | reported: the database's values, each with the measurement or reference it cites |
| ambientCG colour maps (CC0), the mean in linear light and the 10th/90th-percentile luminance | 18: light and mid wood, weathered wood, green, dried and old bamboo, new, used and old tatami, white lime plaster, grey clay roof tiles, thatch, white and brown paper, leather, granite, slate, eroded bronze | measured |
| Negoro lacquer tray, The Met (CC0), median samples in marked boxes | red and black lacquer | measured: appearance under studio light, so albedo is approximate |
| Roughness of the used surface; painting notes; Japanese names | all | estimated |

**Weathering (`WEATHERING`).**

| Track | Stages | Source |
| --- | --- | --- |
| Copper | colours from photos of young copper (the Statue of Liberty face replica) and verdigris | stages and timings reported: Wikipedia, Copper in architecture |
| Wood | greys in about a year | Feist (1983), USDA Forest Products Laboratory |
| Iron | to rust | colours reported; timing estimated |
| Bamboo, tatami | from ambientCG maps | timing estimated |
| Paper | yellowing | estimated |
| Lacquer | red worn to black | Negoro samples |

**Wet (`WET`).** Ångström's measured dry and wet albedos (sand 0.182 and 0.091; black mould 0.141 and 0.084), via
Lekner & Dorf (1988).

## React (registry/materials/materials-react.tsx)

- **`MaterialBall`** is a sphere under a key light and a soft sky:
  - dielectrics show their albedo with a white highlight sized by roughness;
  - metals reflect a sky over ground tinted by F0, with a two-bounce band near the horizon, blurred by roughness.
- **`WeatheringStrip`** shows a track over time.
- **`MaterialsSheet`** collects the families, a Japanese house palette, the value ladder, weathering and
  wet-and-dry pairs.

## Known limits

- **The balls use gradients, not a renderer.** They show colour, value, metalness and roughness, not
  subsurface scattering or anisotropy.
- **The database's metal colours are reflectance of a clean polished surface.** Roughness in use is estimated.
  Its "cast iron" is a seasoned (black) surface.
- **The ambientCG maps are one sample per material.** White paper stands in for washi.
- **The exact wet-darkening form and the timings for bamboo, tatami, paper, iron and lacquer are estimated.**
