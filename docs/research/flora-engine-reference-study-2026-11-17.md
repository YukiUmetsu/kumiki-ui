# FLORA2 reference study and botanical parameter blueprint (2026-11-17)

This study is Phase 1 (reference retrieval) and Phase 2 (morphological deconstruction) for the
[FLORA2 flora engine](../component-specs/flora-engine.md). The numbers live in `registry/anatomy/flora-profiles.ts`,
each with its grade and source id. This document records how they were found and how the renders were corrected.

## Method

1. **Retrieval.** Text sources came from web search (floras, papers, extension notes). Photos came from Wikimedia
   Commons, downloaded at 1920 px into a scratch folder for study. They are not in the repository. Each profile links
   to them with their licence.
2. **Silhouette ratios.** A sky mask (blue-dominant or near-white pixels) gave the plant's width row by row. The crown
   width, fork height, rim height and trunk width were read in plant heights.
3. **Colours.** For a region of plant pixels, we sorted by luma and averaged a ±2.5% window at the 10th, 25th, 50th,
   75th and 90th percentiles (sRGB). Leaf albedo stops use the 50th–75th percentile of sunlit pixels. Bark stops were
   lowered toward an albedo by judgement, because the photos include sunlight.
4. **Grades.** A number quoted from a source is `reported`. A number we read from the photos is `measured`. Any other
   number is `estimated`.

## Sources

| Species | Source | Kind | Licence | Used for |
|---|---|---|---|---|
| Monstera deliciosa | [Ávalos et al. 2025, Rev. Biol. Trop. 73](https://revistas.ucr.ac.cr/index.php/rrbt/article/view/410/528) | paper | cited | Leaf 52.70 × 50.39 cm, petiole 50.28 cm (sun); holes 4.74% (sun), 1.88% (shade) of the effective area; 6–12 lobes |
| | [Wikipedia](https://en.wikipedia.org/wiki/Monstera_deliciosa) | flora | cited | 2–3 m indoors; juveniles entire |
| | [Longwood Gardens photo](https://commons.wikimedia.org/wiki/File:Monstera_deliciosa2.jpg) | photo | CC BY-SA 3.0 | Blade posture, splits per side, leaf ladder |
| | [Close-up, Nova](https://commons.wikimedia.org/wiki/File:Monstera_deliciosa_Monstera_dziurawa_2023-10-31_01.jpg) | photo | CC BY-SA 4.0 | Splits between laterals, hole rows, pale veins, gloss; p50 #4f7234, p75 #749758 |
| | [Coir pole photo](https://commons.wikimedia.org/wiki/File:Monstera_growing_into_coir_pole.jpg) | photo | CC BY-SA 4.0 | Aerial root #948b6d, stem #6e8b45, node rings |
| Adansonia digitata | [Wikipedia](https://en.wikipedia.org/wiki/Adansonia_digitata) | flora | cited | 5–25 m; trunk to 10–14 m; 5–7 leaflets; grey bark |
| | [Mzuzu University survey](https://repository.mzuni.ac.mw/bitstreams/40163307-62e4-4994-a2a1-603fdbb2dded/download) | paper | cited | Trunk forms 56/21/17/7% (from a search summary; full text not read) |
| | [Baobab and elephant](https://commons.wikimedia.org/wiki/File:Baobab_and_elephant,_Tanzania.jpg) | photo | CC BY-SA 2.0 | Fork 0.41 H, trunk 0.31–0.34 H, crown 1.43 H; trunk p75 #7c6b59 |
| | [Leafless baobabs](https://commons.wikimedia.org/wiki/File:Adansonia_digitata_-_baobabs.JPG) | photo | CC BY-SA 3.0 | Cone trunk 0.22 H; 3–5 limbs at 0.4–0.5 H |
| | [Bark, Selous](https://commons.wikimedia.org/wiki/File:Adansonia_digitata_Bark_Selous_Game_Reserve.jpg) | photo | CC0 | Wrinkle bands, folds, limb collars; p50 #6a6667 |
| Dracaena cinnabari | [Wikipedia](https://en.wikipedia.org/wiki/Dracaena_cinnabari) | flora | cited | 9 m, crown 12 m, DBH 1.5 m; leaves 60 × 3 cm in tip rosettes; dichotomous |
| | [Adolt et al. 2012, Trees 26](https://link.springer.com/doi/10.1007/s00468-012-0704-9) | paper | cited | Crown age from branching orders |
| | [Socotra photo, Alex38](https://commons.wikimedia.org/wiki/File:Dragonblood_tree_in_Socotra_2.jpg) | photo | CC BY 4.0 | Crown 1.69 H, fork 0.43 H, rim 0.48 H, trunk 0.15–0.19 H; leaf, branch and trunk ladders |
| | [Socotra group, Rod Waddington](https://commons.wikimedia.org/wiki/File:Dragon's_Blood_Trees,_Socotra_Island_(12455632274)_(cropped).jpg) | photo | CC BY-SA 2.0 | Young domes, 2–3-way forks |
| Salix babylonica | [Oregon State](https://landscapeplants.oregonstate.edu/plants/salix-babylonica), [VicFlora](https://vicflora.rbg.vic.gov.au/flora/taxon/1142574f-4f29-4f7b-9021-cbd4d1ed6009) | database, flora | cited | Leaves 5–18 × 1–2.5 cm; pendulous branchlets; hybrid caveat |
| | [Braga photo](https://commons.wikimedia.org/wiki/File:Salix_babylonica_in_Braga.jpg) | photo | CC BY-SA 4.0 | Curtain ends 0.02–0.12 H above ground; strand ladder |
| | [Inside the willow](https://commons.wikimedia.org/wiki/File:Inside_the_weeping_willow_tree.jpg) | photo | CC BY-SA 4.0 | Fork 0.2 H, 3–5 limbs, fissured bark p75 #51412c |
| Helianthus annuus | [Wikipedia](https://en.wikipedia.org/wiki/Common_sunflower), [Swinton & Ochu 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4892450), [ABOP ch. 4](https://www.algorithmicbotany.org/papers/abop/abop-ch4.pdf) | flora, papers | cited | 3 m; 137.5°; 34/55 spirals; r = c√n |
| | [Head close-up, Kolforn](https://commons.wikimedia.org/wiki/File:-2020-09-09_Close-up_of_a_sunflower_head,_(Helianthus_annuus),_Trimingham.JPG) | photo | CC BY-SA 4.0 | Disc ladder by radius, rays |
| Zea mays | [Wikipedia](https://en.wikipedia.org/wiki/Maize), [Grain SA 2018](https://www.grainsa.co.za/sagrain/2018/april/files/assets/basic-html/page-23.html), [Farm Trader](https://www.farmtrader.co.nz/planting-rates-key-to-higher-maize-yields/) | flora, trade | cited | 1.2–4 m; two-ranked leaves; 76 cm rows at 79 000–93 000 plants per ha |
| | [Field rows, Derek Ramsey](https://commons.wikimedia.org/wiki/File:Corn_Zea_mays_Field_Rows_2000px.jpg) | photo | GFDL 1.2 | Row pattern, seedling and soil ladders |
| Echeveria | [Wikipedia: E. elegans](https://en.wikipedia.org/wiki/Echeveria_elegans), [rosette photo, Anne Jea.](https://commons.wikimedia.org/wiki/File:Echeveria_rosette_detail_01.jpg) | flora, photo | cited, CC BY-SA 4.0 | 5–10 cm; offsets; 5/8 parastichies, mucronate tip, pale rim; ladders |
| Polytrichum commune | [Wikipedia](https://en.wikipedia.org/wiki/Polytrichum_commune) | flora | cited | Stems 5–10 cm; leaves 6–8 mm; star-like when moist |

Commons limited our requests (HTTP 429). We could not download a moss photo, so the moss colours are estimated from
the description.

## Blueprint

### 1. Phyllotaxy and symmetry

- **Golden angle (137.5°)** for spiral leaves (willow, sunflower leaves, Echeveria, moss, dragon-tree rosettes) and for
  disc florets. Disc florets use Vogel's r = c√n, so 34 and 55 parastichies appear by themselves.
- **Two-ranked (180°)** for maize. About 155° for the Monstera column (estimated).
- **Bilateral blades** are symmetric about the midrib, but fenestration is drawn per side (Monstera splits and holes
  differ left and right).
- **Monstera fenestration rules:**
  - splits sit between primary laterals, from the margin to 16–34% of the half-width;
  - holes are elongated along the laterals, larger near the midrib, in up to three rows;
  - the total hole area is the measured fraction for the light;
  - juvenile leaves are entire, and holes come before splits.

### 2. Skeleton and branching

- **Droop.** We use the heavy elastica θ″ = G((1 − s) + tipLoad)·cos θ with θ′(1) = 0. Monstera petiole: G 0.9 with tip
  load 1.2. Baobab limbs: 0.8. Willow limbs: 2.2, branches 4, strands 400. Maize blades: 9.
- **Dracaena forks.** We build top-down to a dome (centre 0.52 H, radius 0.82 H, depth 0.4 H). Eight orders, 2-way 62%,
  3-way 33%, 4-way 5%. Leonardo Δ = 2.1.
- **Baobab trunk.** Trunk forms are drawn by frequency: cone 56, cylinder 21, concave 17, bell 7 (survey) and an
  estimated bottle 10. Seven buttress lobes, limb collars that swell 45%.
- **Aerial roots.** Monstera roots leave at 80° and hang (G 14), 2.2 per metre.

### 3. Surface and colour

| Surface | Stops (sRGB) | Response |
|---|---|---|
| Monstera leaf | #40602f → #4f7234 → #557a3c; underside #8fa47a | roughness 0.36, clear coat 0.55 (waxy cuticle), vein map from the blade's layout |
| Baobab bark | #6d6257 → #766a5e → #5d554d | roughness 0.82; vertical folds and broken wrinkle rings from solid noise (geometry and normal map) |
| Dragon-tree bark and leaves | #665a4e → #5a3e2e; leaves #606724 (p75) | ringed bark; parallel veins, clear coat 0.2 |
| Willow bark, twigs, leaves | #51412c-based fissured bark; twigs #7a6a3c → #9a8a4a; leaves #6f8a33, glaucous underside #b4c48c | ridged-noise fissures (relief 0.09) |
| Sunflower disc and rays | disc #2a1c0c → #56360a → #a65b0d → #d49f21 by radius; rays #e68702 → #fcd80c | per-floret colour by radius; rays with sheen |
| Echeveria | #6f9a42 → #86a85c → #9cb070, pale rim | farina map, sheen 0.3 |

### 4. Spatial layout

| Plant | Layout |
|---|---|
| Maize | Rows 76 cm apart, plants 15.5 cm apart (reported population norms), optional stagger, jitter and gaps |
| Sunflower | Rows 76 cm apart, plants 45 cm apart (estimated) |
| Baobab | Groves 18 m apart, clumps of 14 m |
| Dragon tree | 9 m apart, clumps of 10 m |
| Willow | 12 m apart, clumps of 8 m |
| Echeveria | Clumps of 12 cm, 40 per m² |
| Moss | Cushions 3 per m² |

## Feature, evidence and check

| Feature | Evidence | Construction | Check |
|---|---|---|---|
| Monstera holes | Ávalos 2025 fractions | holes scaled to the fraction | test: sun 3.5–6%, shade 1–2.5%; close-up story |
| Heteroblasty | Wikipedia (juveniles entire) | maturity per organ; onset 0.32 | test: juvenile blade has no cuts; adolescent close-up |
| Dragon-tree umbrella | Socotra sky mask 1.69 × H | dome-filling forks | test: crown width 1.3–2.1 × H |
| Willow curtain | Braga gap 0.05 H | strand length = 0.9 × drop | render review |
| Sunflower spirals | Vogel, Swinton | r = c√n, θ = 137.5° | head close-up shows 34/55 spirals |
| Maize rows | 76 cm, 79–93 k/ha | rows layout defaults | test: pitch and stagger |

## Render review log

Each round was rendered in Storybook (default headless Chromium, full page) and compared with the photos above.

1. **Round 1.**
   - Hero leaves of tens of thousands of instances cost 535 M triangles. We added a strip mesh for uncut blades and a
     triangle budget per plant.
   - The organ cap cut whole rosettes. We now thin evenly.
   - Branches bent up: the elastica load had the wrong sign. We corrected it, and we replaced forward shooting with
     backward shooting for hanging strands.
2. **Round 2.**
   - Monstera blades hung vertical like paddles. We stiffened the petioles and set the blade bend to 40°, so blades sit
     15–50° below horizontal as in the photos.
   - Holes were many small dots. We made them fewer, larger and elongated.
   - The baobab crown was narrow and its bark pale. We made the limbs longer and the bark darker.
   - The willow was an umbrella of bare limbs. We changed its structure.
   - The Echeveria rosette was missing: side offsets made the stem non-terminal. Now only a child near the tip ends an
     axis.
3. **Round 3.**
   - Rosette leaves came from one point. We gave them an 11 mm core and a mucro.
   - Echeveria floated above the floor. The studio floor is now y = 0.
   - The moss read as brown soil. We packed the shoots 4.2 mm apart and gave the mound a shaded green top.
   - The willow got twiglets and 1.3× strand leaves.
4. **Round 4.**
   - Willow limbs broke Leonardo's rule (5 × 0.55²). The ratio is now 0.42.
   - Baobab bark showed a regular grid. The wrinkle rings are now broken by noise.
   - Organ close-ups were cut by the floor. Organs are now lifted onto it.
5. **Round 5.**
   - Adult Monstera splits were too narrow. We raised the gap to half a panel and the splits to 5–9 per side, with
     gentler pleats.
   - A cached juvenile template made mature dragon trees cost 5 M triangles. Template keys now hold the detail level.
   - Scene stats counted unused specimens. They are now excluded.

## Round two: popular plants

The owner asked for more popular plants and more detail. Ten profiles were added in `flora-profiles-popular.ts`. Sizes
come from the Wikipedia species pages (cited, graded `reported`). Commons rate limits allowed five photos, so the other
plants have estimated colours, and their profiles say so.

| Plant | Photo studied | Licence | Observed |
|---|---|---|---|
| Coconut palm | [Sea view, Himsori](https://commons.wikimedia.org/wiki/File:Sea_View_from_himsori_bangladesh_(cropped).jpg), [frond](https://commons.wikimedia.org/wiki/File:Coconut_tree_leave.jpeg) | CC BY-SA 4.0, 3.0 | Leaning, curving trunks about 1/40 H across; pinnae hang in a V from a yellow rachis; pinnae p50 #85962a |
| English oak | [Baginton oak](https://commons.wikimedia.org/wiki/File:Baginton_oak_tree_july06.JPG), [leaves and acorns](https://commons.wikimedia.org/wiki/File:Quercus_robur.jpg) | CC BY-SA 3.0 | Low massive limbs under a billowy crown of leaf clumps; leaves crowded at shoot tips; crown p50 #637649, leaf p50 #505e25, trunk p75 #544a32 |
| Snake plant | ['Laurentii'](https://commons.wikimedia.org/wiki/File:Snake_Plant_(Sansevieria_trifasciata_%27Laurentii%27).jpg) | CC BY-SA 3.0 | Zigzag cross-bands; yellow margin about a tenth of the width; dark p50 #29451e, margin #b1b65e |

New engine features, each general and data-driven:

- **Pinnae** on both sides of a rachis (`sides`, `lift`): coconut palm, Boston fern.
- **Outlines:** rounded lobes (oak), a waist (fiddle-leaf fig), a coloured rim (snake plant, aloe).
- **Maps:** banded and spotted leaf maps, and a cactus skin map.
- **Flowers:** a `corolla` organ (tulip) with incurved tepals (negative droop).
- **Stems:** `ribs` on axes, with spines placed on the crests (`phase`, `offset`), and `lean` for root axes (palms).
- **Fruit:** stalked buds for hanging fruit (baobab pods, acorns, coconuts).
- **Light:** crown self-shading and tone variation, and matte, paler undersides from a luminance ratio.

Render review log, round two:

1. **Round 6.**
   - The coconut trunk wiggled, and the crown was a small starburst. A smooth `lean`, longer fronds and hanging pinnae
     made it read as a palm.
   - The oak and the maple looked bare in winter. The cause was leaves strung along metre-long shoots. Oak leaves now
     crowd on short shoots at the twig ends, drawn 2.2× life size.
   - Fern fronds lay flat. They are now longer, more numerous and arching.
2. **Round 7.**
   - Leaf undersides were pale specks. The shader replaced half the colour with an absolute underside colour, which
     dropped the crown shading. It is now a softened luminance ratio, a little greyer, matte and without the clear coat.
   - The softbox studio washed foliage out, so golden hour stays.
3. **Round 8.**
   - The maple leaf read as cannabis. Its lobes are now broader and joined at the base.
   - The tulip close-up was a crumpled polyhedron. Organ close-ups pointed the flower axis at the camera, and the cup was
     too shallow. Corollas now stand upright, and the tepals are deep spoons.
4. **Round 9.**
   - The parkland at `preview` looked leafless, and at `high_def` it ran at 44 fps. `preview` now keeps 65% of small
     organs at about 12 triangles each: 9.5 M triangles at 60 fps.

## What not to copy

The photos are for measurement only. No pixels, textures or compositions from them are in the engine. Every texture is
procedural.
