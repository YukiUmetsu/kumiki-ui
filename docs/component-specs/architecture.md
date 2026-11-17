# ARCH1 — architecture for any art style

**Registry pack:** `architecture` (depends on `art-foundations`)
**Files:**

- `registry/anatomy/arch-data.ts`: human scale, stairs, roof pitches, orders, Japanese modules, building types.
- `arch-construct.ts`: measured elevations (`buildingElevation`) and `checkStair`.
- `arch-react.tsx`: `BuildingElevation`, `StreetElevation`, `ArchSheet`.
- Storybook plates: `arch-sdf.ts` (signed-distance parts), `arch-surface.ts` (materials at real size),
  `arch-kit.ts` and `arch-kit-civic.ts` (modular building parts), `arch-library.ts` (100 entries), `arch-paint.ts`
  (light and the watercolour pass), `arch-paint-jobs.ts`, `arch-paint-pool.ts`, `arch-paint-worker.ts` (worker
  renders) and `arch-plate-react.tsx` (`StorybookPlate`, `ArchLibraryGallery`, `ArchStyleGuide`).

**Storybook:** Video production → Art Foundations → Architecture → **Sheet**, **Streets**, **Measured elevation**,
**Storybook library**, **Storybook style guide**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.
**Reference studies:** [elevations measured from photographs and drawings](../research/architecture-reference-study-2026-11-17.md)
(Himeji, Morisada's machiya, Tōshōdai-ji, the Parthenon; observation of Bedford Square, Stein am Rhein and others);
[storybook plates: what the painters and builders taught](../research/architecture-storybook-reference-study-2026-11-17.md)
(Prout, Rudolf von Alt, Cotman, the Limbourg brothers; Haussmann, canal houses, stone slates, stave churches, Gothic
thrust, limewash, patina, candlelight).

## What it is for

Buildings that read as real at the right size in any style. Every building is built round people:

- doors about 2.0–2.1 m tall and 0.85 m wide;
- ceilings 2.4–2.7 m;
- floor to floor about 3 m (up to 4 m in shops);
- stair risers 15–19 cm and treads 25–32 cm, with two risers plus a tread about 63 cm (Blondel, 1675).

Draw a person at the door before anything else.

## Tables

- `HUMAN_SCALE`, `blondel`, `BLONDEL_STRIDE`.
- `ROOF_PITCHES`, by covering:
  - thatch 45–60°;
  - slate 20–45°;
  - clay tile 17–35°;
  - kawara about 20–30°;
  - shingles;
  - metal 3–45°;
  - flat roofs about 1–2° of fall behind a parapet.
- `CLASSICAL_ORDERS`: column height in lower diameters (Tuscan 7, Doric 4–8, Ionic 9, Corinthian 10), and
  `INTERCOLUMNIATION` of 1.5–4 diameters.
- `JAPANESE_MODULES`: a shaku of 0.303 m, a ken of 1.82 m (6 shaku), tatami kyō-ma 1.91 × 0.955 and edo-ma
  1.76 × 0.88.

## Building types (`BUILDING_TYPES`)

Each type lists its region and period, storeys and storey height, bays and bay width, roof kind and pitch, whether the
roof curves, the eaves overhang, colours, and drawing notes with sources:

- **Kyoto machiya:**
  - a low upper storey with rounded mushiko windows of plastered slats;
  - a tiled pent roof;
  - a lattice over a solid board, with a bamboo inuyarai;
  - udatsu fire walls at the party walls.
- **Japanese temple hall:**
  - an irimoya roof as tall as the walls: a concave hipped skirt with lifted corners, a gabled upper roof, a ridge
    with onigawara;
  - bracket sets on each column under a white wall band;
  - rafter ends in two rows at the eave;
  - a platform with steps.
- **Minka:**
  - low framed walls on foundation stones;
  - shoji behind an engawa, and the doma's board door;
  - a thick hipped thatch with its cut edge and straw texture;
  - a ridge held by saddle bundles.
- **Castle keep, measured from Himeji:**
  - about as tall above its base as it is wide; storeys 1, 0.95, 0.86, 0.66 and 0.5 of the first;
  - thick roof tiers with plastered soffits, hip ridges and corner onigawara;
  - a kara-hafu over a lattice bay, a pair of chidori-hafu, and one larger gable (gables stand in front of the storey
    above);
  - paired barred windows;
  - an ishigaki of rough stones with sangi-zumi corners and a fan slope;
  - shachihoko.
- **Georgian town house:**
  - dark stock brick with red rubbed-brick flat arches;
  - six-over-six sashes (six over nine on the piano nobile);
  - a stucco band;
  - a panelled door with a radial fanlight and engaged columns, up steps;
  - area railings, a cornice and parapet, chimney stacks with pots.
- **Half-timbered house:**
  - a stone ground floor with an arched door;
  - framed storeys jettied on joist ends, with ribbon windows over St Andrew's crosses and diamonds, corner braces and
    a 'Mann';
  - an oriel on a corbel;
  - a gable framed in two floors.
- **Greek Doric temple:**
  - crepidoma;
  - columns with entasis, flutes, echinus and abacus;
  - the porch in shadow behind the colonnade;
  - triglyphs, metopes and guttae;
  - a geison and raking cornice that shade the frieze and tympanum;
  - acroteria.
- **Modern apartment block:**
  - a glazed ground floor with a canopy;
  - balconies on alternate bays with railings and deep shadows;
  - a stair lit half a storey up;
  - a plant room on the roof.
- **Adobe house:**
  - battered, rounded walls with a stepped parapet;
  - vigas, canales with rain streaks;
  - deep-set windows under timber lintels;
  - a portal on zapatas;
  - a rounded chimney.

Town roofs are straight. Only temples and castle keeps curve.

## Elevations (`buildingElevation`, `BuildingElevation`, `StreetElevation`)

`buildingElevation(type, { seed, storeys, bays })` returns parts in metres, with y up and the ground at 0. Each part
has a role:

- wall, plaster, shade;
- roof, roof-line, tile-end, straw;
- window, glass, frame;
- door, cloth;
- timber, lattice, beam, bracket;
- column, step, base, stone (with its own `tone`), brick-arch, iron, ornament;
- cast: shadows, drawn as in architectural sciagraphy. The light comes from the upper left. A part that projects
  throws a shadow 0.75 of its projection down and 0.55 of it across, and a recessed opening shades its head and left
  jamb.

Any style can paint these roles, and a flat style can drop the `cast` parts. The result also carries dimension lines. Dimensions come from the type and the human
scale, varied a little by the seed.

`BuildingElevation` paints an SVG with a person 1.75 m tall for scale (`dims` adds the measured storeys).
`StreetElevation` sets buildings on one ground line at one scale, spaced by their party walls.

## Storybook plates

Painted scenes of 100 structures and environments, for films, covers and backgrounds in a storybook style.

- **The library** (`ARCH_LIBRARY`, `findLibraryEntry`): each entry has a region, period, setting, view (exterior or
  interior), scale (humble, domestic, civic, monumental), materials, story details, what its references taught, a
  default light and `build(seed)`, which returns an `ArchScene`. Eleven traditions (`LIBRARY_GROUPS`).
- **Build your own** with `SceneBuilder` and the parts: `house` (walls per storey, jetties, every roof form, windows,
  doors, chimneys, dormers, balconies, shop fronts, ivy), `tower`, `church`, `bridge`, `waterWheel`, `windmill`,
  `staveChurch`, `glasshouse`, `keep`, `curtainWall`, `gatehouse`, `domeChurch`, `kasbahTower`, `trullo`,
  `lighthouse`, `arcade`, `room` with `shelves`, `table`, `hearth`, `candle`; scenery with `ground`, `street`,
  `water`, `tree`, `cypress`, `hills`, `gardenWall`, `firewood`, `barrel`, `bench`, `lamppost`. Place each group
  with `b.place({ x, z, yaw, leanX, leanZ })`; give old roofs a `sag`. Frame with `frameSubject` (a level camera at
  eye height with a shifted lens, so verticals stay vertical).
- **Surfaces** (`SurfaceSpec`): ashlar, rustication, marble, rubble, coursed rubble, flint, brick (English or Flemish
  bond), limewash and plaster that flake to what is `under`, timber frames (close studding, square panels, crosses,
  colombage, Fachwerk) with pegs, logs, boards, mud brick, zellige and glazed tiles; slate, stone slate, plain tile,
  shingle, coppi, thatch, copper, zinc, lead, turf; oak, painted wood, iron, gold, brass; glass, leaded, stained and
  greenhouse glass; cobbles, setts, flags, gravel, grass, dirt, sand, rock, snow, water; foliage, firewood, books,
  jars, drawers, bread, fabric, hay, fire. `age`, `moss`, `flake` and `soot` weather them.
- **Light** (`MOODS`): morning, noon, golden, dusk, night, rain, rain at night, overcast, winter, interior day,
  candlelight. Lamps (`lamp: true`) burn only at dusk and night.
- **Paint** (`paintArchScene(scene, { paint, ink })`): `paint` 0 gives a plain render, 1 the full watercolour.
- **React:** `StorybookPlate` renders an entry in a worker (cached, with a preview); `ArchLibraryGallery` and
  `ArchStyleGuide` are the Storybook pages.

## Limits

- Front elevations only: no perspective views or plans.
- Ornament is simplified: no carving, no pediment sculpture, generic acroteria; the keep's windows are evenly spaced.
- The elevations have no interiors (see `home-interiors`); the storybook plates have ten rooms.
- Plates: ornament is simplified (no carved capitals, tracery or painted figures); trees are leaf masses, not FLORA1
  species; only glasshouse glass is clear; the Gothic west front, the Kizhi church and the alpine peaks are the
  weakest entries.
