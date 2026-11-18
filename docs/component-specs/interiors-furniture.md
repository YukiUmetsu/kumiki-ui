# INTERIOR1 — interiors and furniture for any art style

**Registry pack:** `interiors-furniture` (depends on `art-foundations` and `architecture`)
**Files:**

- `registry/anatomy/furn-data.ts`: `ERGONOMICS`, `CLEARANCES`, `BED_SIZES`, `FURNITURE_TYPES`, `INTERIOR_STYLES`,
  `checkFurniture`, `seatTableGap`.
- `furn-construct.ts`: `buildFurniture(b, id)` for every type, and the joiner's parts `turned` and `cabriole`.
- `furn-construct-more.ts`: church furnishings, Japanese pieces and contemporary pieces; `churchChairNodes`, `chairRows`
  (rows of chairs as one repeated node), `octPrism`.
- `arch-kit-japan.ts`: `tatami` and `TATAMI_LAYOUTS`, `hashira`, `shoji`, `fusuma`, `ranma`, `kakejiku`, `chabana`,
  `stoneLantern`, and three rooms: `washitsu` (shoin), `chashitsu` (tea room), `minkaIrori` (farmhouse hearth room).
- In ARCH1's `arch-kit-civic.ts`: `gothicNave`, `ribVaultWebs`, `ribVaultRibs`, `compoundPier`, `archRise`, and room
  trim (`RoomSpec.trim`); in `arch-kit-chinese.ts`: `moonWindow`.
- `furn-library.ts`: `pieceScene(id)` (a piece on the parchment studio cove), `ROOMS` and `roomScene(id)`.
- `furn-paint-jobs.ts`, `furn-paint-pool.ts`, `furn-paint-worker.ts`: renders in workers.
- `furn-react.tsx`: `FurniturePlate`, `RoomPlate`, `FurnitureSheet`, `FurnitureShowcase`, `RoomLibrary`.

**Storybook:** Video production → Art Foundations → Interiors and Furniture → **Sheet**, **Furniture (53 pieces)**,
**Painted rooms (16)**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.
**Reference study:** [interiors and furniture](../research/interiors-furniture-reference-study-2026-11-17.md).

## What it is for

Rooms and furniture that read as real at the right size in any style. Furniture is built round the body:

- seats about 45 cm high (42–48), tables about 75 cm (72–76), 25–30 cm between seat and table;
- counters about 90 cm, armrests about 65 cm, sofa seats lower (about 43 cm), coffee tables at sofa-seat height;
- book shelves about 30 cm apart and 28 cm deep; wardrobes about 60 cm deep (a coat hanger is about 45 cm wide);
- floor-seated cultures set everything lower: cushions about 10 cm, low tables about 33 cm.

Draw a person in the chair before anything else; check with `checkFurniture`.

## Furniture (`FURNITURE_TYPES`, `buildFurniture`)

53 types, each with its region, period, overall size, seat height, materials, and construction notes:

- **Seating:** oak settle; Windsor chair (saddled seat, splayed turned legs, spindles, steam-bent bow); Shaker
  ladder-back (no arms, woven tape); Queen Anne (cabriole legs on pad feet, vase splat); Chippendale (ball-and-claw
  feet, pierced splat, cupid's-bow crest); Thonet No. 14 (six bent parts, ten screws, cane); Ming horseshoe armchair
  and official's hat armchair (joined without nails, S-curved splat, footrest stretcher); tubular steel club chair;
  moulded plywood lounge chair; buttoned Chesterfield; floor cushions.
- **Tables:** refectory, gateleg, everted-end altar table, chabudai, pedestal desk.
- **Storage:** sideboard on tapered legs, Welsh dresser with plates, bookcase, staircase tansu with iron fittings,
  round-corner cabinet, iron-bound chest.
- **Beds:** four-poster with tester and curtains; futon on tatami.
- **Lights and fixtures:** brass candle chandelier, leaded-glass lamp, longcase clock, Georgian fireplace with a fire,
  tiled stove with its bench, folding screen.
- **Church:** rush-seated church chair (the rush wound from the corners, four triangles meeting on the diagonals; a book
  ledge behind); carved oak pew (poppyhead bench ends with blind tracery, book ledge, kneeler, hassocks); octagonal
  pulpit with a stair and a sounding board; high altar on three steps with a velvet frontal, gold orphreys, linen,
  six candles and a cross, before a gilded reredos of niches with painted saints, crocketed gables and pinnacles;
  octagonal font with quatrefoils and a spired oak cover; brass eagle lectern (spread wings, fanned primaries, the
  Bible on its back); corona with gate towers and 24 candles; votive stand.
- **Japan:** andon (washi lit from within); hibachi with copper liner, glowing charcoal and a hailstone-cast tetsubin;
  kotatsu (a quilt falling in folds, a basket of mikan); zataku with tea; six-panel gold byōbu, one painting (pine,
  malachite hills, an azurite stream, raised gold clouds) carried across every fold.
- **Contemporary and trend rooms:** Japandi platform sofa, oak drum table, paper globe pendant, olive tree; leather
  wing chair, banker's lamp, library globe; enamelled range cooker, Belfast sink.

Each is built from the ARCH1 kit at its measured size (front toward +z, on the floor). Place it with
`buildFurniture(b, id); b.place({ x, z, yaw })`. `turned` makes turned legs (vase, bobbin, taper, bulb); `cabriole`
makes cabriole legs with pad or ball-and-claw feet, sculpted with `sculpt`.

## Rooms (`ROOMS`, `roomScene`)

Sixteen rooms furnished from the same pieces:

- **Period rooms:** Tudor hall, Georgian drawing room, Victorian parlour, Shaker room, Alpine Stube, Art Deco lounge,
  mid-century living room, Chinese scholar's studio, Moroccan salon. They have joinery now (`RoomSpec.trim`): skirting,
  a cove cornice, a dado rail over framed panelling, a picture rail, window boards and architraves, glazing bars,
  curtains on poles, a six-panel door, framed oil paintings, a chimney breast with the grate in it. Each also has the
  objects that make it lived in: a peg rail with a broom and oval boxes (Shaker); a corner bench, a Herrgottswinkel and
  a pendant (Stube); a moon window of ice-ray lattice, a scroll, a scholar's rock and a potted pine (scholar's studio);
  a carved plaster frieze, banquettes, a pierced brass lantern and mint tea (Moroccan salon).
- **Japan:** a shoin room (8 Kyōma mats laid so no four corners meet; tokonoma with natural post, scroll and flower;
  chigaidana; fusuma under a shippō ranma; shoji slid open onto an engawa and a garden with a stone lantern); a tea
  room (4½ mats round the sunken ro with its kettle, earth walls with a paper wainscot, shitaji-mado windows, a sloping
  ceiling on bamboo, the nijiriguchi); a minka hearth room (irori, jizai-kagi with a carp lock, smoke shelf, curved log
  beams under soot-dark thatch, kamidana, a shaft of sun through a barred window).
- **Church:** a Gothic nave after Chartres (`gothicNave`) with rows of chairs, a pulpit on a pier, the eagle lectern,
  coronas and the altar in the apse.
- **Trend rooms** (recreated as original designs from what Pinterest's 2026 trend reports and boards show, not copied
  from any one image): Japandi living room, dark academia library, Cotswold cottage kitchen.

`INTERIOR_STYLES` lists what each period's walls, floors, ceilings and light are made of.

## The Gothic nave (`gothicNave`)

Three storeys after Chartres: compound piers (a round core with four colonnettes, moulded bases, foliage capitals)
carry a pointed arcade cut in two stepped orders; above it a string course and a triforium passage of small arches;
above that, from the vault's springing, a clerestory in plate tracery (two lancets under a rose) in each lunette. The
quadripartite vault is exact: each bay is two pointed tunnels crossing, and the cross tunnel is the main profile
stretched to the bay, so the groins fall on the diagonals where the ribs run (`ribVaultWebs`, distance = radius minus
hypotenuse). Ribs (`ribVaultRibs`) are analytic arcs: transverse, diagonal, wall ribs (formerets), bosses. The apse is
five faces of a decagon under a half-dome cut by one cell per face, so each tall lancet has its lunette and the groins
become the radial ribs. Aisles have their own rib vaults and windows.

Stained glass (`stained` with pattern `medallion` or `rose`) is drawn in each panel's own coordinates: medallions
(circles and quatrefoils, a pearl fillet and a ruby band round a robed, haloed figure) on a blue mosaic with a ruby
trellis, a jewelled border, lead cames and iron saddle bars; roses have twelve petals with roundels.

## Realism pass (materials, piers, views)

- **Wood** has a flat-sawn figure: growth rings cut by the face at a slight angle arch along each board; latewood is
  darker; oak shows its pores and ray flecks; each board has its own pith, depth, growth rate and tone. Floorboards cup a
  little, are face-nailed at their ends and lose their finish along paths. Paint shows its brush strokes along the grain.
- **Stone** blocks differ in brightness and warmth; they carry bedding layers, shell fragments and voids, the mason's
  tooling and chipped arrises. Plaster has hairline cracks and patches made good, in proportion to its wear (`flake`).
- **Gothic piers** (`compoundPier`): an octagonal socle and a square plinth with leaf spurs at its corners, attic bases
  (torus, scotia, torus) round core and colonnettes, round and octagonal cores by turns, crocket capitals
  (`crocketCapital`: a bell with stiff leaves, crockets curling out under a moulded octagonal abacus). Vaulting shafts
  rise in bundles of three with shaft rings. Arches carry roll mouldings on each order's arris, a keel roll down the
  soffit and a hood mould (`archRoll`); the triforium has colonnettes with their own bases and capitals.
- **Rugs** are knotted designs: a lattice field of small rosettes, an eight-lobed medallion with palmettes and
  pendants, corner spandrels, a border of rosettes on a vine between guard stripes, abrash bands, knots and wear.
- **Windows with a view** (`RoomSpec.view: "garden"`): clear and leaded panes show a lawn, a clipped hedge, trees and
  far hills, lit as outdoors; rooms are exposed for the interior (`Mood.burn` 2.4 by day), so the view may burn out.
- **Ceiling roses** (`trim.rose`) in the Georgian and Victorian rooms; geometric star glass (`stained`, pattern
  `star`) in the Moroccan salon.
- **Room plates** paint with a lighter wash and ink (paint 0.55, ink 0.5), so the textures stay readable.

## Weak spots fixed (third pass)

- `room()` cut its side-wall windows 10 cm short of the inner face, so every left and right window was a blank wall
  (light still entered, because portals are analytic). Side windows now open, and with `view: "garden"` show the
  garden.
- ARCH1's working interiors (bakery, apothecary, old library, attic workshop, forge, tavern, scriptorium, cottage
  kitchen, clockmaker) are furnished from `arch-kit-props.ts` and lit as daylight interiors with lighter haze.
- The attic room's back gable is closed; the hearth fire is a bed of embers with flames, not a glowing mass.
- Gothic vault webs are coursed stone. The Shaker room has its built-in wall of drawers, a braided rug and a rocker;
  the mid-century room a teak sofa, a coffee table with records, an arc lamp, a rubber plant and a record player.

## Light indoors

- Sun indoors arrives only through a window: the renderer finds the window the sun ray passes through and shadows the
  way to it. Through stained glass it lands as soft pools of blue, violet, ruby and some gold, about a third as bright;
  through paper (shoji, andon) it does not pass as a beam. Stained glass lets in about a sixth of the sky light, paper
  about half.
- Sun shafts are tested against piers and walls, capped to the haze a big space holds, and smoothed in their own
  buffer so they do not read as grain.
- `interiorBox` limits the interior rules to the room, so a garden seen through open shoji is lit as outdoors.
- `Mood.key` meters a dim church low so its glass glows; `Mood.burn` lets a sunlit garden burn out so the room reads.

Rooms are `interior` scenes: sky light enters only through their windows and falls off with distance (each window's
area, seen at an angle, over the square of the distance), so corners away from the light stay dark; fires, candles and
lamps light the rest. Surfaces: cane, leather (with deep buttons), velvet, a knotted rug, tatami mats (one mat's face
with its wales, or a laid floor), figured veneer, woven fabric (stripes, plain or check), rush, gold leaf (with a painted
byōbu), washi (with an ink-wash fusuma landscape), straw-flecked earth walls, enamel, an oil landscape on canvas, an
antique globe, jute.

## Limits

- No carving below a few centimetres (no acanthus on the Chippendale knees, no carved crest). The reredos saints are
  carved standing figures (sway, drapery folds, mantle, book, blessing hand, veil, haloes) and the eagle has a breast of
  carved feathers, a hooked beak, talons and broad wings, but neither has portrait faces or feather-by-feather detail.
- Upholstery is smooth shapes with a surface pattern, not sewn panels; curtains hang in regular folds.
- Room trim runs along whole walls: it does not wrap round a chimney breast or stop at furniture.
- Vault webs are plastered, without stone coursing; crockets and spurs are simplified leaves, not carved foliage.
- The nave has no ambulatory, crossing or transepts; the apse's ground storey is blind arcading.
- Fusuma, byōbu and scroll paintings are generated landscapes, not copies of known works.
- For modern house explainers with plans, electrical and yards, use `domain-home-model` and `domain-home-3d`.
