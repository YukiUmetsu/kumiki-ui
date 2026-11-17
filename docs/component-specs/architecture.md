# ARCH1 — architecture for any art style

**Registry pack:** `architecture` (depends on `art-foundations`)
**Files:**

- `registry/anatomy/arch-data.ts`: human scale, stairs, roof pitches, orders, Japanese modules, building types.
- `arch-construct.ts`: measured elevations (`buildingElevation`) and `checkStair`.
- `arch-react.tsx`: `BuildingElevation`, `StreetElevation`, `ArchSheet`.

**Storybook:** Video production → Art Foundations → Architecture → **Sheet**, **Streets**, **Measured elevation**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

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

- Kyoto machiya;
- Japanese temple hall (irimoya, bracket sets, deep curved eaves);
- minka and gasshō farmhouses;
- castle keep;
- Georgian town house (the piano nobile, sash windows twice as tall as wide, a parapet);
- half-timbered house (jetties, braces, a steep gable);
- Greek Doric temple (crepidoma, entasis, entablature, pediment);
- modern apartment block;
- adobe house.

Town roofs are straight. Only temples and castle keeps curve.

## Elevations (`buildingElevation`, `BuildingElevation`, `StreetElevation`)

`buildingElevation(type, { seed, storeys, bays })` returns parts in metres, with y up and the ground at 0. Each part
has a role:

- wall, plaster, shade;
- roof, roof-line;
- window, glass, frame;
- door, cloth;
- timber, lattice, beam, bracket;
- column, step, base.

Any style can paint these roles. The result also carries dimension lines. Dimensions come from the type and the human
scale, varied a little by the seed.

`BuildingElevation` paints an SVG with a person 1.75 m tall for scale (`dims` adds the measured storeys).
`StreetElevation` sets buildings on one ground line at one scale, spaced by their party walls.

## Limits

- Front elevations only: no perspective views or plans.
- Ornament is simplified: no capitals' carving, no onigawara.
- No interiors (see `home-interiors`).
