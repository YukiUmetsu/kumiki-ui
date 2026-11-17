# Material textures and rendered swatches (MATL1) — research, 2026-11-16

The owner asked for much more detail in material textures, all of them but especially organic ones. Until now MATL1
had each material's colour, roughness and ageing, drawn as gradient balls.

This round adds:
- a texture for every material, built from its structure at real size;
- a CPU renderer that shows each texture on a ball in a studio and on a tile under raking light.

Grades:
- **reported:** quoted from the source;
- **measured:** from images in the repository or CC0 maps;
- **estimated:** chosen within what the sources support.

## Sizes and rates

| What | Value | Grade | Source |
| --- | --- | --- | --- |
| Softwood weathering erosion | Earlywood 58–101 µm a year, latewood 33–34 µm a year; about 6 mm a century on average | reported | Williams, Knaebe & Feist, *Erosion rates of wood during natural weathering* I–II (USDA FPL); Browne 1960 |
| Earlywood erodes faster than latewood | Most in the first years, until the latewood is isolated | reported | Same, part II |
| Ring widths | 1.5–3 mm (hinoki), 3–6 mm (plantation sugi) | estimated | Sugi's latewood share is small and falls as rings widen; hinoki's rings are more uniform (reported, *Journal of Wood Science*; Hokkaido University) |
| Tatami face | 95 cm wide with 134 warp threads (single core) or 268 (two core) | reported | JAS 1017:2024, table 1 |
| Tatami wale (目) | About 1.5 cm | reported | JAANUS, *tatami-me* |
| Igusa rush | About 1.4 mm; ten rush lines per wale | measured, cross-checked against reported | Ten lines measured in a public-domain tatami photograph (Commons, *Tatami.jpg*); about 1.4 mm from a Fukuoka variety table |
| Thatch stalks (Miscanthus) | 3–7 mm across, 60–200 cm long | reported | GrassBase, Kew |
| Bamboo vascular bundles | About 8 per mm² in the outer culm | reported | bioRxiv preprint 2021 (Phyllostachys); 5.8–7.9 per mm² in small bamboos |
| Kozo fibres | 6–20 mm (average 10) long, 25–35 µm wide | reported | University of Melbourne fibre database |
| Corrugated C flute | 128 ± 10 per metre, about 7.8 mm pitch | reported | Corrugated fiberboard flute table |
| Common brick | 210 × 100 × 60 mm | reported | JIS R 1250, via Japanese building references; joint estimated |
| Medium sand | 0.25–0.5 mm | reported | Wentworth 1922 |
| Granite minerals | 25 / 35 / 27 / 13% (dark to light) | measured | ambientCG Granite001A colour map (CC0) |

**A note on tatami.** JAS counts 134 warp threads across 95 cm, a thread every 7.1 mm. JAANUS gives a wale of about
1.5 cm. The two agree if two warp threads share each groove (14.2 mm). The ten rush lines per wale in the photograph
give about 1.4 mm a rush, which matches the measured stem width. The texture uses those numbers.

## Calibration against CC0 maps

Sixteen ambientCG maps (CC0) were measured for:
- luminance at the 10th, 50th and 90th percentile over the mean;
- structure-tensor coherence (how strongly the grain runs one way);
- a four-colour palette with shares;
- the roughness map's percentiles.

`textureStats` measures a generated texture the same way, each cell averaged over its area as a photograph's pixel
is. At 72 cells, every tone spread is within 0.14 and most are within 0.05.

| Material | Measured p10 / p90 | Generated |
| --- | --- | --- |
| Granite | 0.50 / 1.58 | 0.54 / 1.59 |
| Rust | 0.68 / 1.37 | 0.72 / 1.34 |
| Tatami | 0.85 / 1.16 | 0.86 / 1.11 |
| Leather | 0.98 / 1.01 | 0.98 / 1.01 |
| Weathered wood | 0.68 / 1.37 | 0.76 / 1.30 |

The thatch texture is a trimmed, cut-end roof (Japanese kayabuki is trimmed), compared with a public-domain photo
of a reed roof. The map is a long-straw roof, so the two grain directions are not compared.

## What changed in review

| First render | Fixed by |
| --- | --- |
| Wood rings as thin wavy vector lines | A log model: rings around a pith, the board cutting tapered rings, so arches appear where they should. Lognormal ring widths with memory, a latewood share that varies by year, irregular wobble |
| Knots as dark pills | Branches from the pith through the face; the stem's rings bulge round them, closing into eyes; dead knots ringed with bark (after a CC0 plywood photo) |
| Thatch as wavy hair, then as scales | Cut stalk ends at the bottom of each stalk, sinking up-slope; reed ends hollow (after a public-domain reed roof) |
| Tatami as a blind | Wales and grooves from JAS and JAANUS; rushes pressed flatter; at small sizes rushes fade to their average instead of aliasing (moiré) |
| Marble blotches | Veins as zero-crossings of warped 3D noise, with a cloudy body and subsurface light |
| Granite as a Voronoi mosaic | Warped crystal boundaries, large feldspars among smaller quartz, mica flakes that glint |
| Sand and salt as noise, then as rice | Rounded grains over shadowed gaps; salt as cubes; snow and salt with light under them |
| Asphalt as crackle glaze | Stones of three sizes in black binder |
| Metals reflecting a hard horizon | A studio with a softbox, strip and cyclorama, pre-filtered for roughness; tiles under a soft overhead diffuser |
| Muted colours | ACES tone map; a texture's mean colour now renders close to its albedo |
| Tiles dim and oddly lit | The raking-light shadow test was inverted; fixed |

## References inspected

- **Photographs:** *16 wood samples* (CC0), *Wood texture, light* (CC0), *Pressed pine wood grain* (CC0),
  *Bamboo culms and nodes* (CC0), *Reed roof* (public domain), *Tatami* (public domain), all on Wikimedia Commons.
- **ambientCG maps (CC0):** Bamboo001A–C, Granite001A, Leather037, Metal013, Paper001, Paper006, Plaster002,
  RoofingTiles015A, Tatami001, Tatami002, ThatchedRoof001A, Wood017, Wood022, WoodSiding011.

## Limits

- Textures are constructions, not scans. Wood ring widths, leather sizes and the metal finishes are estimated.
- On balls, relief gets shading and occlusion but casts no shadows. Tiles have soft shadows.
- Only the agent has reviewed the renders; no human visual review yet.
