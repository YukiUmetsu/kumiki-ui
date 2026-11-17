# MATL1 — materials framework for any art style

**Registry item:** `materials` (needs `art-foundations`) · **Files:** `registry/materials/materials-*.ts(x)`,
`registry/materials/food-textures.ts` ·
**Storybook:** Video production → Art Foundations → Materials (Sheet, Material lab, Texture calibration) · **Skill:**
[kumiki-materials](../../skills/kumiki-materials/SKILL.md) · **Research:**
[materials framework, 2026-11-16](../research/materials-framework-2026-11-16.md),
[textures and rendered swatches, 2026-11-16](../research/materials-texture-2026-11-16.md)

MATL1 holds what stays true about a material in every art style:

- its colour in linear light (diffuse albedo, or a metal's reflectance);
- whether it is a metal;
- how rough it is;
- how much it varies across a real surface;
- how it looks wet;
- how it ages.

A painter reads the value (L*), the highlight and the weathering. A renderer reads standard PBR parameters.

It also builds each material's texture from its structure at real size (`materials-texture.ts`) and renders it as
a ball in a studio or a tile under raking light (`materials-render.ts`). The older texture generators
(`craft-natural-materials`, `craft-glass-materials`) make stylised craft textures; MATL1's textures are physical.

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

## Textures (registry/materials/materials-texture.ts)

`materialTexture(id, seed?, record?)` returns `{ sample(x, y, fw?), solid?(x, y, z), extentMm, ballMm, optics, note, facts }`.
`sample` gives the surface of a flat piece in millimetres: linear albedo, height (mm), roughness, and where it applies
metalness, a crystal facet's tilt, a nacre film thickness or a scattering density. `solid` gives a point inside a
block, so a ball turned from wood or cut from stone shows what a real one would. `fw` is a pixel's footprint: fine
regular detail (tatami rushes) fades to its average below a pixel instead of aliasing.

| Recipe | Structure | Sizes and rates (grade) |
| --- | --- | --- |
| Wood | A log: rings round a wandering pith, widths lognormal with year-to-year memory and wide juvenile rings; earlywood to latewood by a density profile; flat-sawn arches from the board cutting tapered rings; knots are branches from the pith (dead ones ringed with bark), the stem's rings bulging round them; weathered wood greys and erodes earlywood faster than latewood, with checks | erosion 58–101 µm a year earlywood, 33–34 latewood (reported, USDA FPL); ring widths (estimated) |
| Bamboo | Culm skin over vascular bundles, node ridge and sheath scar, a sulcus above the branch, wax bloom under the node; smoke-stained culms with lighter rope bands | bundles about 0.35 mm apart (reported, preprint) |
| Tatami | Igusa rushes in wales between warp grooves, the warp passing over and under alternate rushes; wear browns and frays | wale about 1.5 cm, 134 warps per 95 cm (reported, JAANUS, JAS 1017:2024); rush about 1.4 mm (measured) |
| Thatch | Cut stalk ends stepping out of a trimmed roof, stalks sinking up-slope, hollow reed ends | culms 3–7 mm (reported, Kew) |
| Paper | Formation flocs, fibres and bundles, chiri flecks (washi), kraft flecks, corrugation flutes | kozo 6–20 mm (reported); C flute 7.8 mm (reported) |
| Leather, grass, bone, charcoal, pearl | Pebble cells, creases and pores; blades in depth over soil; lamellae and pores; char cells along the grain; nacre bands | leather sizes estimated |
| Stone, ceramic, earth | Granite crystals in measured mineral shares with mica; marble veins as zero-crossings of warped noise; slate cleavage; grains (sand, salt cubes, snow); concrete skin and air voids; asphalt aggregate; terracotta grog; clay drying cracks; brick in stretcher bond | brick 210 × 100 × 60 mm (reported, JIS R 1250); sand 0.25–0.5 mm (reported) |
| Metals and coatings | Polished swirl marks, brushed streaks, sand-cast skin, galvanised spangle, mill scale; rust scale and blooms; cuprite and green patina; lacquer film | estimated |
| Food (`food-textures.ts`, family `food`) | Beef: fascicles end-on, the perimysium seam network that marbling follows (streaks and flecks, lace in wagyu), a ribeye's eye, cap seam and kernel, knife drag. Seared crust: fused protein beads, char on the peaks. Salmon: W-shaped myomeres between white septa, flakes when cooked; tuna; poultry skin (follicles in tracts, blisters when roasted); fish scales; bread crust and crumb; cooked rice; aged cheese crystals; gratin; tomato, pepper, potato, citrus and mushroom skins | fascicles about 1.4 mm, septa about 8 mm apart, rice grains about 5.5 × 3 mm (estimated) |

**Food.** The 19 `food-*` materials are the same recipes that FOOD1's still lifes use (`food-surfaces.ts` samples
them with each dish's own settings: marbling, doneness, browning). `crustColour` (Maillard browning) lives here too.

**Calibration.** `TEXTURE_CALIBRATION` holds statistics measured from 16 CC0 ambientCG colour maps (luminance
p10/p50/p90 over the mean, structure-tensor coherence, a four-colour palette with shares, roughness). Palettes set the
hues, scaled to each record's albedo. `textureStats(id)` measures a texture the same way, each cell averaged over its
area as a photograph's pixel is; the tone spreads match the maps within 0.14 (most within 0.05).

## Rendered swatches (registry/materials/materials-render.ts)

`renderMaterialSwatch(id, { view: "ball" | "tile", size, supersample, extentMm, wet, record, lightAzimuth,
lightElevation, seed })` renders on the CPU and returns 8-bit sRGBA.

- **Ball:** a sphere in a studio. Light comes from a softbox up and to the left and a strip light behind on the right,
  inside a grey cyclorama. Reflections are pre-filtered for roughness and scaled by the split-sum fit (Karis 2014).
  Relief comes from surface-gradient bump mapping (Mikkelsen 2010).
- **Tile:** a flat piece under a raking key light (24° by default), with soft shadows from a horizon march and
  multi-scale cavity occlusion. A soft overhead diffuser makes metals and gloss read.
- **Optics:**
  - subsurface scattering for marble, snow, washi and pearl;
  - refraction, Fresnel and absorption through clear balls (glass, ice, water, quartz), with cloudy ice;
  - clear tiles over a checker card;
  - thin-film colour for nacre;
  - glinting crystal facets;
  - anisotropic highlights on brushed metal.
- **Wet:** porous materials darken by the record's soaked albedo; every surface gains a water film; on a tile water
  stands in the hollows.
- **Speed:** about 0.1–0.4 s for a 128 px swatch at 2× supersampling; slower for thatch and grass. The tone map is
  the ACES fit, so a texture's mean colour renders close to its albedo.

## React (registry/materials/materials-react.tsx)

- **`MaterialSwatch`** renders a material into a canvas after the page paints. Swatches share one queue with other
  heavy renders (`foundation-queue.ts`) and are cached by their options. It takes a `ref`, a `className` and canvas props.
- **`MaterialStudy`** shows a ball and a tile with a `ScaleBar`, the texture's note and its graded facts.
- **`MaterialsSheet({ look })`** draws rendered balls and an up-close tile section by default; `look: "flat"` uses
  the light SVG balls.

- **`MaterialBall`** is a sphere under a key light and a soft sky:
  - dielectrics show their albedo with a white highlight sized by roughness;
  - metals reflect a sky over ground tinted by F0, with a two-bounce band near the horizon, blurred by roughness.
- **`WeatheringStrip`** shows a track over time.
- **`MaterialsSheet`** collects the families, an up-close section, a Japanese house palette, the value ladder,
  weathering and wet-and-dry tiles.

## Known limits

- **`MaterialBall` (the flat look) uses gradients.** The rendered swatches are the faithful view.
- **The textures are physical constructions, not scans.** Most sizes are reported or measured; wood ring widths,
  leather grain sizes and all metal finishes are estimated. Thatch is a trimmed cut-end roof; the calibration map is a
  long-straw roof, so their grain directions differ.
- **Relief on balls has no cast shadows**, only shading and cavity occlusion; tiles have soft cast shadows.
- **No human visual review yet.**
- **The food textures are estimated from photographs.** None are calibrated to a measured map.
- **The database's metal colours are reflectance of a clean polished surface.** Roughness in use is estimated.
  Its "cast iron" is a seasoned (black) surface.
- **The ambientCG maps are one sample per material.** White paper stands in for washi.
- **The exact wet-darkening form and the timings for bamboo, tatami, paper, iron and lacquer are estimated.**
