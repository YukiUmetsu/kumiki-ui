# INTERIOR1 — interiors and furniture for any art style

**Registry pack:** `interiors-furniture` (depends on `art-foundations` and `architecture`)
**Files:**

- `registry/anatomy/furn-data.ts`: `ERGONOMICS`, `CLEARANCES`, `BED_SIZES`, `FURNITURE_TYPES`, `INTERIOR_STYLES`,
  `checkFurniture`, `seatTableGap`.
- `furn-construct.ts`: `buildFurniture(b, id)` for every type, and the joiner's parts `turned` and `cabriole`.
- `furn-library.ts`: `pieceScene(id)` (a piece on the parchment studio cove), `ROOMS` and `roomScene(id)`.
- `furn-paint-jobs.ts`, `furn-paint-pool.ts`, `furn-paint-worker.ts`: renders in workers.
- `furn-react.tsx`: `FurniturePlate`, `RoomPlate`, `FurnitureSheet`, `FurnitureShowcase`, `RoomLibrary`.

**Storybook:** Video production → Art Foundations → Interiors and Furniture → **Sheet**, **Furniture (31 pieces)**,
**Painted rooms (10)**.
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

32 types, each with its region, period, overall size, seat height, materials, and construction notes:

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

Each is built from the ARCH1 kit at its measured size (front toward +z, on the floor). Place it with
`buildFurniture(b, id); b.place({ x, z, yaw })`. `turned` makes turned legs (vase, bobbin, taper, bulb); `cabriole`
makes cabriole legs with pad or ball-and-claw feet, sculpted with `sculpt`.

## Rooms (`ROOMS`, `roomScene`)

Ten period rooms furnished from the same pieces: Tudor hall, Georgian drawing room, Victorian parlour, Shaker room,
Alpine Stube, Art Deco lounge, mid-century living room, Japanese washitsu, Chinese scholar's studio, Moroccan salon.
`INTERIOR_STYLES` lists what each period's walls, floors, ceilings and light are made of.

Rooms are `interior` scenes: sky light enters only through their windows and falls off with distance (each window's
area, seen at an angle, over the square of the distance), so corners away from the light stay dark; fires, candles and
lamps light the rest. New surfaces: cane, leather (with deep buttons), velvet, a knotted rug, tatami mats, figured
veneer.

## Limits

- No carving below a few centimetres (no acanthus on the Chippendale knees, no carved crest).
- Upholstery is smooth shapes with a surface pattern, not sewn panels; curtains hang in regular folds.
- Rooms are boxes with windows: no mouldings, dados or cornices in geometry (only in surfaces).
- For modern house explainers with plans, electrical and yards, use `domain-home-model` and `domain-home-3d`.
