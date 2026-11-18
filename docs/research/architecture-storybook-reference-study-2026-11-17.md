# ARCH1 storybook study: what the references taught (2026-11-17)

**Pack:** `architecture` (ARCH1). **Spec:** [architecture](../component-specs/architecture.md).
**Storybook:** Video production → Art Foundations → Architecture → **Illustrated library (100 structures)**, **Illustration style guide**.
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

## Module showcase (added 2026-11-17)

A second brief asked for isolated modules on a parchment studio backdrop, across classical, Gothic, Renaissance and
Baroque, Chinese, European vernacular, Art Deco, Modernist and Brutalist or Deconstructivist work.

| Subject | Fact used | Grade | Source |
| --- | --- | --- | --- |
| Classical orders | column heights in lower diameters (Doric about 5½ at the Parthenon, Ionic about 9, Corinthian about 10); Doric has no base and 20 flutes, Ionic and Corinthian 24 | reported | ARCH1 `CLASSICAL_ORDERS` (Vitruvius); [Wikipedia: Classical order](https://en.wikipedia.org/wiki/Classical_order) |
| Pantheon | five rings of 28 coffers stepping back toward the oculus | reported | [Wikipedia: Pantheon, Rome](https://en.wikipedia.org/wiki/Pantheon,_Rome) |
| Dougong | a cap block (ludou) on the column, arms (gong) and cantilevers (ang); described in the Yingzao Fashi (1103) | reported | [Wikipedia: Dougong](https://en.wikipedia.org/wiki/Dougong), [BioResources study of the Taihe Hall brackets](https://bioresources.cnr.ncsu.edu/resources/mechanical-behavior-of-dou-gong-brackets-in-chinese-traditional-timber-structures-an-experimental-study/) |
| Ridge beasts | the more important the hall, the more figures; a heavenly rider leads a dragon, a phoenix, a lion; in odd numbers | reported | [SCMP: the architecture of the Forbidden City](https://multimedia.scmp.com/culture/article/forbidden-city/architecture/chapter_02.html) |
| Villa Savoye | Le Corbusier's points: pilotis, roof terrace, free plan, ribbon windows, free facade; slender white concrete pilotis | reported | [99% Invisible](https://99percentinvisible.org/article/machines-living-le-cobusiers-pivotal-five-points-architecture/), [Sonneveld House](https://www.sonneveldhouse.com/node/115) |
| Chrysler crown | terraced arches with triangular windows in seven setbacks, clad in Nirosta (18-8 chromium-nickel) stainless steel | reported | [Wikipedia: Chrysler Building](https://en.wikipedia.org/wiki/Chrysler_Building), [MasterClass](https://www.masterclass.com/articles/chrysler-building-architecture-guide) |
| Béton brut, titanium, diagrid | board grain printed in raw concrete; thin titanium shingles; diagonal steel grids on the face | estimated (common descriptions; not separately sourced here) | — |

**Second round, after the owner's review.** The owner judged the round hall and the gargoyle too crude and asked for
more reusable Chinese parts. Reference photographs were studied again:
[Hall of Prayer for Good Harvests](https://commons.wikimedia.org/wiki/File:Hall_of_Prayer_for_Good_Harvest.JPG) (public
domain) and [Temple of Heaven](https://commons.wikimedia.org/wiki/File:20200110_Temple_of_Heaven-1.jpg) (CC0), measured;
[Notre-Dame gargoyles](https://commons.wikimedia.org/wiki/File:Notre-Dame_Rzygacze.JPG) (CC BY-SA 4.0), observation only.

- Round hall, measured from the public-domain photograph: eave widths about 1.0, 0.76 and 0.63 of the lowest; the top
  roof rises at about 34°; each roof is concave, its eave edge a thick dark band over a band of painted brackets; the
  drums between the roofs are turquoise and gold lattice; the lowest wall is a red ring of lattice doors behind red
  columns; a gilded ball finial; three marble terraces ringed by balusters, with stairs on the axis.
- Gargoyles: lean beasts thrown far out from the buttress, with long arched necks, laid-back ears, wings folded along
  the flanks, and open jaws that end the gutter. They are now sculpted from blended round cones (`sculpt`), not stacked
  primitives.
- The Chinese parts became a kit (`arch-kit-chinese.ts`) of roofs, halls, brackets, terraces, pavilions, pagodas,
  archways, garden walls, Huizhou gables and bridges, shown as eight more modules.

**Rules taken from the brief and the references.** A neutral parchment cove so the module's own colours read; a key
light from the front left and a rim light from behind right that is not shadowed, so silhouettes separate from the
backdrop; a longer lens (34°) and an eye at mid-height of the module, as product and model photographers frame a
single object; contact shadow from ambient occlusion where the module meets the floor; the paint pass at half strength
so the modules stay crisp enough to study.

## Weak spots, third pass (2026-11-18)

The owner: "continue working on weak spots." A review of all 100 plates found:

- **Ghost sheets in far scenery.** Pieces of a far mountain floated in the sky as torn grey sheets. Two bugs, both in
  `arch-sdf.ts`. A square pyramid's bounding box ended at r·1.09, so its corners (at r·√2) were cut off. A union of two
  nodes also returned the distance to the nearer child's *box* whenever that exceeded 0.25 m. The march counts a hit
  when the distance falls below 0.0005 + 0.0006·t, which is 0.3 m at 500 m, so boxes far away were taken for surfaces.
  The union now answers with the box distance only above 1 m, and a test checks both. The same fix removed specks on
  the hill village's horizon, smudges beside the Rhine castle and streaks on the Cycladic hill. Renders take about 9%
  longer.
- **Mountains.** Snow-capped peaks are built with `peaks()` in `arch-kit.ts`: three square pyramids turned against each
  other per massif, for faces, ridges and gullies, with snow above a broken snowline. Keep them within about 600 m.
- **Moroccan riad.** Rebuilt as a two-storey court:
  - horseshoe arches on zellige-clad piers;
  - a carved plaster frieze of small blind arches;
  - a turned cedar balustrade on the gallery, and a cedar eave on corbels;
  - green glazed tiles;
  - an octagonal fountain;
  - four raised beds with orange trees, and bougainvillea.
- **Damascene courtyard.** Rebuilt:
  - real ablaq coursing (the new `ashlar` pattern `ablaq`: basalt and limestone by turns, every third pale course ochre);
  - an iwan with a roll-moulded pointed arch, banquettes, a carpet and a lamp niche;
  - side ranges with grilled windows below and cantilevered mashrabiya above;
  - a cornice on corbels;
  - an octagonal pool, citrus trees, jasmine and pots.
- **Market square belfry (Bruges).** The stone octagon floated on the brick tower and ran straight to a flat cap. It
  now has a pierced parapet, corner turrets, buttress shafts with pinnacles, an open belfry stage, a lead lantern and
  a gilt ball.
- **Packhorse bridge.** The beck ran along the bridge, not under it. It now crosses beneath the arch between boulders,
  and the view looks up the beck.
- **Alpine summer hut.** It was shown in winter mood against a garbled backdrop. It now sits under summer light below
  snow-capped peaks, with a log trough, a split-rail fence, a bench and a cowbell.
- **Bookshop on a rainy night.** It stood alone in an empty square. It now stands in a street of neighbours with lit
  windows and a second lamp.
- **Cycladic cliffside.** The houses floated in front of a rock ellipsoid that never met them. Now:
  - the cliff is stepped terraces, and each row of houses is cut into the slope behind the retaining wall above it,
    so one roof is the next house's yard, as the plate's story says;
  - houses vary in width and height, with domed chapels;
  - a whitewashed stair zigzags down the east side;
  - below the lowest row, one continuous rock face, broken by ribs and gullies, falls to the sea.

## Buildings on rock (2026-11-18)

The owner: "if building is on top of rocks or something, it seems very weird, not realistic now."

The rock under every perched building was one noisy ellipsoid (`clump`), which reads as a potato. The buildings were
set at a fixed height on it, so their bases floated over its curve or sank into it, and no masonry met the rock.
Real crags (observation only; common geology and castle-building knowledge, not measured here):

- the rock lies in beds of uneven thickness, broken by vertical joints into faces and buttresses, and each harder bed
  forms a ledge where plants root;
- the faces lean back a little, and a spur that joins its hill has a gentler back slope;
- scree gathers at the foot, except where the sea washes it;
- builders level the top, and set walls at the edge on battered footings that run down into the rock, so masonry
  grows out of it;
- houses on a slope stand at the height of their uphill side over a stone undercroft.

The kit now has three primitives:

- `crag`: an irregular polygon plan whose corners shift from bed to bed, beds of uneven thickness, ledges that vary
  corner by corner, a few overhangs, vertical ribs and fissures, an optional back slope, scree, bushes on the ledges
  and a grass cap set back from the edge.
- `plinth`: a battered masonry footing.
- `hillField`: a turf hill whose height can be queried.

The rock surface has bedding partings, water streaks and lichen, and its plants come in patches rather than stripes.

Plates rebuilt:

- **Rhine castle:** a tall jointed slate spur off a vine-terraced valley side; the walls are inset from its edge on
  footings, and it is seen across the river.
- **Hill village:** each house stands on a stone undercroft run down to the turf, and a continuous rampart follows
  the slope.
- **Lighthouse:** a bedded islet with ledges awash and boulders, the keeper's cottage on its top (it was buried in the
  rock on main), and steps down to a landing.
- **Cycladic cliffside:** crags for the caldera wall and the flanks.

Renderer fixes found on the way:

- Water ripples were not band-limited (four octaves down to 6 cm), so distant water was salt-and-pepper speckle.
  Each band now fades at its own wavelength.
- Every surface's pixel footprint now grows with the viewing angle (up to 7×), so ground seen at a grazing angle no
  longer aliases. Water now reflects the bridges and towers clearly.
- The crag is costly near its face, so it uses a cheap outer bound away from the rock and computes its rib noise only
  near the face. The Cycladic plate went from 15.7 s to 8 s at 560 px.

A test checks the crag's flat top, its wider foot, and the safe-step property: no point inside the rock lies within
the distance the field reports. The test catches a crag made to overstep.

## Buildings in their country (2026-11-18)

The owner: "continue working on the weak points." The weakest exteriors were rural buildings standing alone on a flat
lawn: nothing said how they were used or reached. Farm buildings are read by what surrounds them (observation; common
knowledge of English and Dutch farmland, not measured here):

- a track worn to the door, with two ruts and a grass middle;
- hedged fields of pasture, ploughland and corn;
- a mill standing in the wheat it grinds;
- a barn with haycocks and a cart;
- a polder mill among straight drainage ditches, reeds and pollard willows;
- nettles and long grass where a wall meets the ground.

The kit now has `track`, `hedgerow`, `patchwork` and `wallFoot`, and `curve` to smooth control points. The `furrows`
surface draws ploughland, wheat and crops in rows. New props: `cart`, `haystack`, `fence`, `trough`, `appleBasket`.

Plates set in their country:

- **Tithe barn:** a track to the porch, haycocks, a hay cart, a trough and hedged fields.
- **Stone windmill:** wheat fields, a track, a cart of sacks.
- **Dutch windmill:** a polder of ditches with reeds, pollard willows, a plank bridge and the miller's cottage, seen from
  higher.
- **Stone dovecote:** a walled farmyard with a gate, a cart, a trough and an orchard.
- **Cider barn:** rows of apple trees, baskets of apples, a ladder.
- **Alpine hay barn:** hay drying on racks, a fence, a path.
- **Dry-stone bothy:** heather, rushes, boulders, a peat stack and a sheep path.

The Rhine spur gained lower buttresses and fallen blocks at its foot, so its face breaks into masses, and the main mass
has more faces. A track's grass middle once read as "two lines" in a review. Pixel checks showed it renders correctly,
so its middle strip was only narrowed. The full set takes 56 s at 256 px, against 46 s before (hedgerows and fields).

## Street life and carving (2026-11-18)

The owner: "work on what's still weak." Three items were left from the last review.

- **Tithe barn framing.** From a high, distant camera the track read as two thin lines and the foreground was empty
  lawn. The plate is now seen low from the track itself, through an open field gate between fence runs, with the
  haycocks and cart nearer the barn.
- **Town plates on bare paving.**
  - The Haussmann block stood with its front on the kerb line. It now stands behind its pavement, with plane trees in
    iron grilles, a café terrace under the awning, an advertising column, a bench, a handcart, lamps and neighbouring
    blocks.
  - The Georgian crescent read as seven separate houses with hipped mansards. Georgian terraces read as one palace
    front (observation, common knowledge of Bath and London terraces), so each house now carries a balustraded parapet
    over its cornice, with chimney stacks on the party walls. The crescent has area railings and lamps, faces a railed
    lawn with trees at its sides, and is seen at an angle so its curve shows.
  - New street props: `railings`, `streetTree`, `cafeTerrace`, `advertColumn`, `handcart`, `streetBench`.
- **Carving.**
  - Crocket capitals now have a stalk that turns out into a curled leaf of three lobes, each with a midrib.
  - The reredos saints were robed blobs. They are now Gothic standing figures, seven heads tall:
    - a slight sway;
    - a robe falling in vertical folds;
    - a mantle drawn across the body;
    - a book held at the chest and a hand raised in blessing;
    - a veiled head with a brow and a nose;
    - a halo with a raised rim.
    The figures stand deeper in their niches, so no robe pokes through a gable.
  - The eagle lectern has:
    - a full breast with rows of carved feather scallops;
    - eye sockets under a heavy brow, and a hooked beak with a gape;
    - feathered thighs, and talons curled over the globe;
    - rows of coverts on each wing;
    - a broad wing blade with a scalloped trailing edge;
    - lion's paws with toes under its column.

## Limits

- Ornament is simplified: no carved capitals, tracery inside windows, statues or Lüftlmalerei figures.
- The Gothic west front, the Kizhi church and the alpine peaks are the weakest entries.
- Glass is clear only in glasshouses; other windows reflect and glow but do not show rooms behind.
- Trees are clumps of leaf masses, not FLORA1 species.
- Plates take about 1 s at 384 × 216 and 5–15 s at 960 × 540 in a worker; they are cached.
- Human visual review is not recorded.
