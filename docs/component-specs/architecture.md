# ARCH1 — architecture for any art style

**Registry pack:** `architecture` (depends on `art-foundations`)
**Files:**

- `registry/anatomy/arch-data.ts`: human scale, stairs, roof pitches, orders, Japanese modules, building types.
- `arch-construct.ts`: measured elevations (`buildingElevation`) and `checkStair`.
- `arch-react.tsx`: `BuildingElevation`, `StreetElevation`, `ArchSheet`.

**Storybook:** Video production → Art Foundations → Architecture → **Sheet**, **Streets**, **Measured elevation**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.
**Reference study:** [elevations measured from photographs and drawings](../research/architecture-reference-study-2026-11-17.md)
(Himeji, Morisada's machiya, Tōshōdai-ji, the Parthenon; observation of Bedford Square, Stein am Rhein and others).

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

## Limits

- Front elevations only: no perspective views or plans.
- Ornament is simplified: no carving, no pediment sculpture, generic acroteria; the keep's windows are evenly spaced.
- No interiors (see `home-interiors`).
