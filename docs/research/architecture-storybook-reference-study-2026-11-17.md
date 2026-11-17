# ARCH1 storybook study: what the references taught (2026-11-17)

**Pack:** `architecture` (ARCH1). **Spec:** [architecture](../component-specs/architecture.md).
**Storybook:** Video production → Art Foundations → Architecture → **Storybook library**, **Storybook style guide**.
**Status:** agent study and agent review of renders. **Human visual review is not recorded.**

## Why

The brief asked for storybook architectural illustration far above flat cartoon backdrops: 100 distinct structures,
real materials and weathering, painterly light, disciplined perspective and organic imperfection, all renderable by
code. The earlier ARCH1 work drew measured front elevations as flat SVG parts. This study collects what painters and
builders do, and turns each finding into a rule in the code.

## Method

1. **Painters.** Public-domain architectural watercolours and miniatures on Wikimedia Commons were downloaded at
   900 px and studied side by side: macro (composition, eye level, value plan), meso (how a wall, a roof, an opening
   is described) and micro (edges, line, granulation). No image is copied, traced or committed.
2. **Builders.** Web sources were searched for each tradition and each material. Every fact used is graded:
   **reported** (quoted from a cited source) or **estimated** (common practice, or a figure the sources do not fix).
   Where sources disagree, the disagreement is noted.
3. **Translate.** Each finding became a construction rule (`arch-kit.ts`, `arch-kit-civic.ts`), a surface rule
   (`arch-surface.ts`), a light rule or a paint rule (`arch-paint.ts`).
4. **Check.** All 100 entries were rendered as a contact sheet, reviewed by eye for silhouette, framing, scale, light
   and texture, fixed and rendered again (four rounds). The faults found and fixed are listed below.

## Painting references

| ID | Work | Artist | Licence | Used for |
| --- | --- | --- | --- | --- |
| prout_rouen | [Rouen Cathedral ruins](https://commons.wikimedia.org/wiki/File:Samuel_Prout_Rouen_Cathedral_Ruins.jpg) | Samuel Prout (1783–1852) | Public domain | line, darks in openings, figures for scale |
| alt_stephan | [Stephansplatz, Vienna, 1838](https://commons.wikimedia.org/wiki/File:Rudolf_von_Alt-Stephansplatz-1838.jpg) | Rudolf von Alt | Public domain | warm light and cool shadow, aerial perspective in a street |
| alt_pantheon | [The Pantheon and Piazza della Rotonda, 1835](https://commons.wikimedia.org/wiki/File:Rudolf_von_Alt_-_Das_Pantheon_und_die_Piazza_della_Rotonda_in_Rom_-_1835.jpeg) | Rudolf von Alt | Public domain | the portico's deep shade, a shadowed foreground, lived-in detail |
| cotman_001 | [Aqueduct study, c. 1804](https://commons.wikimedia.org/wiki/File:John_Sell_Cotman_001.jpg) | John Sell Cotman | Public domain | flat planes of wash, reflections, few textures |
| limbourg_oct | [Très Riches Heures, October](https://commons.wikimedia.org/wiki/File:Les_Tr%C3%A8s_Riches_Heures_du_duc_de_Berry_octobre_detail.jpg) | Limbourg brothers | Public domain | crisp miniature detail, white limestone and blue slate, tiny people |

Texts: John Ruskin, *The Elements of Drawing* (1857) on Prout's gradations and the warning against "Proutizing", that
is, breaking smooth buildings into rough ones by habit ([Heidelberg edition, p. 222](https://digi.ub.uni-heidelberg.de/diglit/ruskin1904bd15a/0266)).

### What the painters do

- **The darkest darks are inside the openings.** In Prout's lithographs nearly all the dark is in windows, arches
  and doorways; the sky is left as paper. → Glass and reveals are shaded by ambient occlusion and stay the deepest
  values; the paint pass keeps them dark while it lifts other shadows.
- **Warm light, cool shadow.** Von Alt lights stone cream and ochre and paints its shadow violet-blue, never black.
  Physically, a surface in shadow outdoors is lit mostly by the blue sky, and simultaneous contrast makes it look
  bluer still. → Sky light is the shadow's light; the paint pass leans shadows toward violet-blue and lights toward
  cream, and lifts shadow values so they stay transparent.
- **The eye at street level.** Von Alt's squares are seen from a person's height: the buildings tower, the people are
  small, verticals stay vertical. → A level camera with a shifted lens (`frameSubject`), not a tilted one.
- **Air even in a street.** Von Alt's far spire is paler and bluer than the near houses. → Aerial perspective on every
  hit, by distance.
- **A shadowed foreground frames the lit subject.** The Pantheon plate puts the near square in cast shadow.
- **Broad washes, few textures.** Cotman's arches are flat planes of wash; texture is suggested, not drawn
  everywhere. → An edge-aware wash softens texture inside each shape but keeps its edges; detail finer than about two
  pixels fades to its average.
- **A thin, broken line.** Prout's pen line wobbles and breaks, and is never a heavy outline. Ruskin warns against
  breaking every edge by habit. → A thin sepia line only on real edges (depth breaks, creases, surface changes),
  broken by noise, stronger on the shadow side, and fading with distance so far ridges have no line.
- **Crisp, bright miniatures.** The Limbourgs paint white limestone, blue slate and gold finials crisp against a
  high horizon. → Bright local colour survives the paint pass (a gentle mid-tone saturation).

## Construction facts used

| Subject | Fact | Grade | Source |
| --- | --- | --- | --- |
| Haussmann blocks | height tied to street width (about 20 m on a 20 m street), about six storeys, continuous balconies on the 2nd and 5th floors, a 45° mansard, cut-stone fronts | reported (secondary sources; the 1859 text not seen) | [My Modern Met](https://mymodernmet.com/haussmann-paris-architecture/), [Paris Property Group](https://parispropertygroup.com/blog/2019/paris-architecture-how-to-spot-a-hausmannian-building) |
| Amsterdam canal houses | lean forward a few centimetres on purpose so hoisted goods clear the facade; piles settling lean them further | reported | [DutchReview](https://dutchreview.com/culture/amsterdam-canal-houses/), [Culture Trip](https://theculturetrip.com/europe/the-netherlands/articles/why-do-houses-and-buildings-in-amsterdam-tilt-forward) |
| Cotswold stone slates | two oolitic limestones; largest slates at the eaves, smaller courses up to the ridge; about 45° minimum for natural stone | reported (30° figures are for reconstituted slate) | [Cotswold District Council guidance](https://www.cotswold.gov.uk/media/hojnam3m/cotswold-stone-slate-roofing-technical-guidance-2000.pdf), [Country Life](https://www.countrylife.co.uk/?p=9503) |
| Borgund stave church | nave about 11 m to the ridge; stacked roofs; pine tar; dragon heads (some replaced 1738) | reported | [Wikipedia: Borgund Stave Church](https://en.wikipedia.org/wiki/Borgund_Stave_Church) |
| Bavarian farmhouse | pitch about 15–25° by local rule; overhang nearly 2 m in the region | reported | [zi-online, Prutting barn](https://www.zi-online.info/en/artikel/zi__133882.html), [Dezeen](https://www.dezeen.com/2014/02/03/s_denk-house-by-soho-architektur-has-a-kinked-facade/) |
| Tuscan roofs | flat embrici under curved coppi, terracotta ridge; the colombaia turret over the farmhouse | reported (pitch not found for Tuscany; 30–35 % from a Marche catalogue) | [Brick and Stone](https://brickandstone.it/en/products/copertura-toscana-di-recupero), [From a Tuscan Hillside](https://fromatuscanhillside.blogspot.it/2017/10/how-to-build-farmhouse-18th-century.html) |
| Amiens Cathedral | vault 42.3 m; bays 14.6 m on centres; flyers strengthened by a second, lower row | reported | [Structurae](https://structurae.net/en/structures/amiens-cathedral), [Wikipedia](https://en.wikipedia.org/wiki/Amiens_Cathedral) |
| Water wheels | an overshot wheel needs a head greater than its diameter | reported | [Wikipedia: Water wheel](https://www.wikipedia.org/wiki/Overshot) |
| Cycladic houses | whitewash of lime, water and sea salt reflects heat; flat roofs gathered rain; a vault's crown is the terrace of the house above; blue or white chapel domes | reported (sources differ on why whitewash began) | [Greeka](https://blog.greeka.com/?p=6447), [ADF](https://www.adfwebmagazine.jp/en/?p=267220) |
| Candle and lamp light | candle flame about 1850 K (1800–1900 K across sources) | reported | [Wikipedia: Color temperature](https://Wikipedia.com/wiki/Color_temperature) |
| Shadow colour | shade outdoors is lit by blue sky; simultaneous contrast adds to it | reported | [Optics Infobase abstract](https://0-doi-org.brum.beds.ac.uk/10.1364%2FAO.33.004719), [Gurney Journey](https://gurneyjourney.blogspot.ch/2014/09/complementary-shadows.html) |
| Riads | four-sided inward court; rammed earth, tadelakt, zellige dados, cedar | reported | [Le Jardin Secret](https://www.lejardinsecretmarrakech.com/en/blog/what-makes-a-riad-historic-focus-on-heritage-architecture/80/) |
| Green oak frames | the all-timber pegged mortise and tenon is the usual historic joint; drawbored pegs pull it tight | reported | [IStructE, Shanks and Walker 2005](https://www.istructe.org/journal/volumes/volume-83-(published-in-2005)/issue-17/experimental-performance-of-mortice-and-tenon-conn/), [Fine Homebuilding](https://www.finehomebuilding.com/2012/06/08/master-carpenter-video-how-to-drill-and-assemble-a-timber-frame-joint) |
| Close studding | studs set close, of equal size; square panels use posts and rails | reported | [Looking at Buildings](https://www.lookingatbuildings.org.uk/styles/medieval/walls-and-windows/timber-walls/close-studding.html) |
| Limewash | adheres well to porous brick; flakes where salts and damp work behind it; renewed every few years | reported | [NCPTT limewash study](https://webarchive.library.unt.edu/eot2008/20090115084324/http://www.ncptt.nps.gov/Limewash/APT/Results-of-the-Study.aspx), [Building Conservation](https://buildingconservation.com/articles/vapour/vapour.htm) |
| Moss and lichen | most on north roofs and shaded walls; mortar's alkalinity and porosity suit different species from the stone | reported | [Building Conservation: biological growth](https://buildingconservation.com/articles/bio/bio.htm) |
| Copper patina | bright, then russet and brown, then green over about 10–30 years; faster in coastal and urban air | reported | [Interlock Roofing](https://www.interlockroofing.com/kb/copper-roof-patina-green/), [Metal Roofing NZ](https://www.metalroofing.org.nz/node/3860) |
| Kew Palm House | 1844–48; iron and glass; curved throughout; about 110 m long, 19–20 m high (sources differ) | reported | [Wikipedia: Palm House, Kew](https://en.wikipedia.org/wiki/Palm_House,_Kew_Gardens), [Grace's Guide](https://gracesguide.co.uk/Palm_House,_Kew_Gardens) |
| Medieval bridges | pointed arches; piers 1/5–1/10 of the span; cutwaters split the flow; refuges over them | reported | [Scotland's oldest bridges](https://scotlandsoldestbridges.co.uk/parts-of-a-bridge-and-glossary-of-old-stone-bridges.html), [Ponte do Arco study](https://repositorium.sdum.uminho.pt/bitstream/1822/67957/1/2020_CIN_Analysis%20of%20the%20%E2%80%9CPonte%20do%20Arco%E2%80%9D%20stone%20masonry%20arch%20bridge.pdf) |
| Unit sizes | brick 215 × 65 mm with 10 mm joints; ashlar courses 0.25–0.45 m; plain tiles at a 100 mm gauge; slates about 0.2 m courses; cobbles about 0.16 m; leaded quarries about 0.1 × 0.15 m | estimated (common UK practice) | — |

## Rules in the code

**Construction (`arch-kit.ts`, `arch-kit-civic.ts`).** Signed-distance parts at real size: walls per storey with
jetties, openings cut through walls (flat, round, segmental, pointed, horseshoe, ogee) with reveals, sashes and
glazing bars, shutters that hang a few degrees askew, flower boxes, doors with strap hinges and worn steps, chimneys
with pots and soot, dormers, cornices, quoins, balconies with railings and filigree. Roofs: gable, hip, half-hip,
mansard, pyramid, step, neck, bell and curved gables, pent roofs, cones, spires, domes, onion domes. Old buildings get
a `lean` (shear by height) and roofs a `sag`. Civic parts: churches with aisles, buttresses, pinnacles and flying
buttresses, apses, west fronts and crossing towers; masonry bridges with voussoir rings, cutwaters, refuges and humped
decks; overshot wheels with leats; windmills; a stave church; a glasshouse; keeps, curtain walls, gatehouses; domes on
drums; kasbah towers; trulli; lighthouses; arcades; rooms with beams, attic rafters, shelves, hearths and candles.

**Surfaces (`arch-surface.ts`).** Each surface builds its structure before its colour: courses, bonds, joints,
pegs, laps and ribs; each unit varied; moss in joints and on what faces up; grime that runs from ledges and rises
from the ground; flaking limewash showing the brick or stone below; verdigris in streaks; ivy patches on walls.
Patterns fade to their average when finer than about two pixels, and their relief fades with them, so distant roofs
and brick do not alias into moiré rings.

**Light (`arch-paint.ts`).** Sun with soft shadows; sky light reaching into corners as far as ambient occlusion lets
it; warm ground bounce; contact shadow where walls meet the ground; dapples under tree canopies; lamps lit only at
dusk and night; candles, fires and ovens by colour temperature with inverse-square falloff; lamp glow in the air;
sun shafts with dust through room windows; wet surfaces that darken and mirror the lamps; snow on what faces up; lit
windows at dusk; aerial perspective. Ten moods: morning, noon, golden, dusk, night, rain, rain at night, overcast,
winter, interior day, candlelight. Candlelit and night scenes are white-balanced part of the way, as a painter keeps
candlelight golden but not orange.

**Paint.** Exposure metered on the picture; an edge-aware wash; warm lights and cool shadows; mid-tone saturation;
wet-in-wet variation across each wash; pigment pooling at wash edges; granulation in the shadows; a thin broken sepia
line; rain strokes; paper fibre and tooth; a soft vignette.

## The library

100 entries in eleven traditions (`ARCH_LIBRARY`): British Isles 9, France 9, German-speaking and Alpine 9, Low
Countries 6, Italy 9, Iberia and the Mediterranean 9, Nordic and Eastern Europe 8, North Africa and the Middle East 5,
historic engineering and monuments 16, rural and agrarian 10, lived-in interiors 10. Each records its region, period,
setting, view, scale, materials, story details and what its references taught (`note`).

## Faults found in review and fixed

- Surfaces inherited glass and emission from the previous pixel: every pixel after the first window glowed.
- Lamps 100 times too bright for dusk; they now burn only at dusk and night, at street-lamp strength.
- Scenery was merged into the next house's group, so it turned with the house and spoilt the framing.
- Three side streets had their houses facing away from the street.
- Water and sunken lanes were hidden under the ground zone above them; later zones now cut holes, with stone banks.
- Stone-slate courses wobbled (rows counted from a noisy normal); they are counted by integrating the gauge up the
  slope, and normals are now sampled more finely.
- Brick, tiles and thatch made moiré rings at a distance; patterns and their relief now fade below two pixels.
- Ink broke into dotted "birds" along far hills; the line now fades with distance.
- Candlelit rooms were flooded orange; partial white balance.
- Soft shadows smeared down leaning facades: the improved penumbra estimate needs exact distances, which cut openings
  and leaning frames do not give; the classic estimate (k·h/t) is used.
- Moss covered whole roofs: its joint weight was inverted; it now gathers in joints and laps and in patches.
- Lone far hits at grazing range made specks along the horizon; a lone hit with sky nearly all round takes the sky's
  colour.

## Limits

- Ornament is simplified: no carved capitals, tracery inside windows, statues or Lüftlmalerei figures.
- The Gothic west front, the Kizhi church and the alpine peaks are the weakest entries.
- Glass is clear only in glasshouses; other windows reflect and glow but do not show rooms behind.
- Trees are clumps of leaf masses, not FLORA1 species.
- Plates take about 1 s at 384 × 216 and 5–15 s at 960 × 540 in a worker; they are cached.
- Human visual review is not recorded.
