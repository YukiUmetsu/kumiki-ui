# Materials framework (MATL1) — research, 2026-11-16

What a drawing or render of a material needs, where each value comes from, and how the values were checked. The
grades are: **reported**, **measured**, **estimated**.

## Sources and rights

| Source | What it gives | Rights |
| --- | --- | --- |
| Physically Based database, A. Palmqvist et al., `deploy/v2/materials.json` at commit `bed520ab9800de4fc9800304f6557f85ce788e69` | Linear albedo or F0, metalness, roughness, IOR and density for 122 materials. Each cites its measurement (for example a spectrophotometer measurement in the repository) or a reference (refractiveindex.info, Lagarde, Jakubiec and others). | CC0 1.0 (repository licence checked) |
| ambientCG colour maps (Tatami001–003, Bamboo001A–C, Plaster002, RoofingTiles015A, ThatchedRoof001A, Paper001 and Paper006, Wood022 and Wood017, WoodSiding011, Leather037, Granite001A, RoofingTiles003, Metal013, Metal048A) | Each map's mean, converted to linear light, and its 10th/90th-percentile luminance | CC0 1.0 |
| Round Negoro lacquer tray, The Met (DP704100) | Red lacquer `#cd5121`; black undercoat `#341b11` (darkest third of a worn streak) | CC0 (Met Open Access) |
| Face of the Statue of Liberty replica (Commons) | Young copper: `#ba8361` lit, `#81562a` tarnished | public domain |
| Verdigris (Commons, Flickr) | Green patina run-off `#5c817f` | CC0 |
| Wikipedia, Copper in architecture | Copper's stages: oxide films within six months, sulfide browns within a few years, slate grey or black, then green. Final stage in 7–9 years in marine air, 15–25 industrial and 10–30 rural; arid air may stop at dark brown. | reported |
| Feist (1983), USDA Forest Products Laboratory | Wood browns, then rain leaves a silver-grey fibrous layer; uniformly grey after one year | reported |
| Lekner & Dorf (1988), Applied Optics 27, after Ångström (1925) | Wet darkening by trapped light; sand 0.182 dry and 0.091 wet, black mould 0.141 and 0.084 | reported |
| CIE 1976 L* | Lightness from luminance | reported |

## Checks

- **Gold.** ambientCG's gold map (Metal048A) averages (0.99, 0.77, 0.33) in linear light. The database's gold F0 is
  (1.0, 0.77, 0.31). Sampling scanned maps this way agrees with the database.
- **Wet darkening.** The model gives 0.098 for Ångström's sand (measured 0.091) and 0.074 for black mould (measured
  0.084), within about 10%.
- **Value.** Snow (L* 94) and white paper (96) are lightest; charcoal (16) and black lacquer (13) darkest. The
  lacquer black was sampled where the red has worn through, and reads warm brown-black, as thin urushi does.

## What the comparison changed

- **The material ball.** At first a metal reflected a white sky: copper looked pale pink and gold washed out. The
  reflection now has a two-bounce band near the horizon (F²), which gives the deeper colour metals show among their
  own surroundings.
- **Labels.** A metal's L* means nothing (its value depends on what it reflects), so metals show "metal". Value-ladder
  names no longer cut to their first word.
- **Copper's stages.** First mixed absolute years with fractions. They now run on one 20-year clock to green,
  rescaled by the environment.

## Open

- Measured (not stand-in) washi, silk, cotton, linen, wool and hemp; hinoki and sugi by species; kawara variants;
  urushi finishes (roiro, tame-nuri); gold leaf.
- Translucency (shōji paper, marble, skin through ANAT1) and anisotropy (brushed metal, silk sheen).
- Moss and lichen on stone, soot, stains and dust as layered weathering.
