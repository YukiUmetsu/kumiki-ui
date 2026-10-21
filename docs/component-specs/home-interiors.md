# Home Interiors — customizable floor plans, furniture, devices, yards and exploration

**Scope:** The interior layer of the [Home Kit](home-kit.md). One renderer-neutral `InteriorPlan` drives the 3D build, the 2D floor plan, the 2D cross-section, walk collision and tours. It holds rooms, walls and doors, furniture and fixtures, electrical devices and yard items. Everything is data you can author or override; the defaults are only a generator.

## Install and inspect

- Registry items: `domain-home-model` (plan model, recipes, walk map, tours), `domain-home-3d` (interior builder and materials), `domain-home-floor-plan-2d` (SVG plan) and `craft-walk-camera` (first-person hook).
- Storybook:
  - **House Math → Interior Plans**: auto, authored, edited and overridden plans in 2D and 3D side by side.
  - **House Math → Home Kit 3D**: Orbit, Walk or Tour cameras; dollhouse and plan views; interior actions; furniture arranging.
  - **House Math → Home Kit 2D**: the section shows partitions and furniture.

## Authoring

~~~ts
createHouse3D({ ...HOUSE_PRESETS.cottage, interior: {
  // 1) an authored plan (meters or fractions of the footprint; extra rects make L-shaped rooms)
  plan: { units: "fraction", rooms: [
    { id: "great-room", kind: "living", rects: [{ x0: 0, z0: .42, x1: .62, z1: 1 }] },
    { id: "kitchen", kind: "kitchen", rects: [{ x0: .62, z0: .42, x1: 1, z1: 1 }] },
    { id: "suite", kind: "bedroom", rects: [{ x0: 0, z0: 0, x1: .52, z1: .42 }] },
    { id: "bath", kind: "bath", rects: [{ x0: .52, z0: 0, x1: 1, z1: .42 }] },
  ], connections: [
    { between: ["great-room", "kitchen"], kind: "open" },  // no wall
    { between: ["great-room", "suite"], at: .85 },          // door, swings into "suite"
    { between: ["kitchen", "bath"] },
  ] },
  // 2) …or edit the generated plan:   plan: (auto, ctx) => ({ ...auto, rooms: … })
  auto: { backDepth: 3.4, bathWidth: 2.4, closets: true },
  recipes: { bedroom: ctx => [...] },            // replace a room kind's furnishing recipe
  rooms: { living: { omit: ["tv"], items: [{ kind: "armchair", at: [.16, .82], yaw: 45 }] },
           "bedroom-2": { replace: true, label: "Study", items: [...] } },
  electrical: { outletSpacing: 3 },              // or false
  yard: [...],                                   // explicit items, or false
} });
~~~

## Contracts

- **Floor plans.** Rooms tile the storey's interior box edge to edge.
  - Walls are derived from shared edges, and collinear segments merge into partitions.
  - Rooms are inset by half a wall only where a wall exists, so open plans stay continuous.
  - Unknown rooms, overlaps, out-of-bounds or tiny rectangles, and bad storeys throw.
  - Non-adjacent connections and walls too short for their door are reported in `interior.diagnostics`, not silently dropped.
  - `interior.floorPlan` returns the resolved plan in meters, so you can edit it and pass it back.
- **Doors.** `door` (swing leaf with hinge and swing side), `bifold`, `opening` (cased, no leaf) or `open` (no wall). A closet connected by a door records its `parentRoomId`.
- **Furniture.** `ROOM_RECIPES` per room kind receive a `RoomContext` describing walls, doors, windows, free spans and the best wall. Placements therefore adapt to any plan: the galley fits essentials first, beds go on the freest wall, the tub prefers an exterior wall, the TV goes above the mantel when the chimney is in the room. Per-room `items` use fractions of the room's main rectangle. `omit` takes item names or kinds.
- **Separately animatable parts.**
  - Every room (`room.<id>`), partition, door (`door.<room>.leaf`), furnishing (`furnish.<room>.<name>`) and device (`electrical.*`) is its own group.
  - Moving sub-parts are listed in `FURNISHING_MOVING_PARTS`: fridge doors and freezer, oven and dishwasher doors, washer and dryer doors, drawers, toilet lid, chair seat, cabinet and vanity doors, car doors.
  - Each pivot declares `userData.motion` (rotate or slide, axis, amount), so `applyMotion` and the built-in actions open them.
  - Actions: `interior-doors`, `kitchen-open`, `drawers-open`; `lights-on` also lights every interior fixture.
- **Systems follow the plan.**
  - The water heater and an indoor air handler move into the utility room or garage.
  - Hot water feeds the kitchen sink and the bath vanity down the wall cavity directly behind each fixture.
  - The chimney sits in the front zone, and the living-room recipe turns it into a fireplace.
- **Electrical.** A ceiling light in every room (two in the garage), plus pendants over islands and tables. A switch on the latch side of the first doorway, outlets along free wall spans (counter height in kitchens, GFCI height in baths), smoke detectors in bedrooms, halls and the living room, a vanity light and exhaust fan in baths, and a panel in the utility room or garage.
- **Yards.** Trees, foundation shrubs, a garden bed, mailbox and path lights in front; a patio with table, chairs and umbrella, a grill, a tree, a garden bed and a perimeter fence behind. Items are seeded and deterministic.
- **Exploration.**
  - `houseWalkMap(layout)` provides wall collision with doorway gaps, floor height (storey versus lawn), the room at a point, a clear viewpoint per room and the front-yard entry.
  - `useWalkCamera` turns keys and drag into a pose for `HeroAssetViewer`'s new `camera` prop.
  - `planHouseTour(plan)` is a deterministic doorway-to-doorway walkthrough (hold, pan, walk through the door, cut between storeys) for video.
- **2D.** `HouseFloorPlan2D` draws any storey with walls, glazing, door swings, bifolds, finishes, labels with areas, furniture symbols and optional devices. The section (`createHouseSection`) cuts partitions and draws furniture silhouettes beyond the plane.

## Limitations

- Plans are rectangle tilings; diagonal and curved walls are not supported. Upper storeys reach the stair landing by its cased opening, and walking does not climb the stair (switch floors instead).
- Furniture is illustrative mid-detail geometry (procedural PBR materials, no scanned assets). The car is a simple background-tier silhouette.
- Interior lighting is image-based plus emissive fixtures and a ceiling bounce term, with no light transport. Night scenes are stylized.
- Placement is plausible, not certified: no clearance or code checks beyond the recipes' free-span tests. Visual quality still needs human review.
