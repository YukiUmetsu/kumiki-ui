# Home Kit — layered houses with separately animatable parts

**Scope:** Reusable home/real-estate *source assets* for explainers, built from one renderer-neutral model. The generic visualization components in [16 — House Math](../16-house-math.md) (SectionReveal, callouts, FlowPath, cost charts) consume these assets through `InspectableAsset`. They stay house-agnostic. The kit itself has no renderer, clock, camera or playback logic.

## Install and inspect

- Registry items: `domain-home-model` (data only, no Three.js), `domain-home-3d` (Three.js build) and `craft-part-rig` (posing any named hierarchy).
- Discover: `npm run catalog:find -- --query="house cutaway"`
- API: `npm run catalog:api -- --id=domain-home-3d --export=createHouse3D --format=json`
- Storybook: **House Math → Home Kit 3D** (explorer: presets, condition, palette, views, actions, per-part show/ghost/hide/focus) and **House Math → Lab** (URL-driven capture harness).

## Minimal usage

~~~ts
import { HOUSE_PRESETS, resolveHouseLayout } from "./components/domains/home-model";
import { createHouse3D, inspectHouse3D } from "./components/domains/home-3d";
import { createPartRig } from "./components/craft/part-rig";

const house = createHouse3D({ ...HOUSE_PRESETS.cottage, condition: "aged", palette: "meadow" });
scene.add(house.group);                     // or <HeroAssetViewer createAsset={…} />

// Separately animatable parts, deterministic for any absolute frame:
const rig = createPartRig(house.parts);
function renderFrame(frame: number) {
  const t = Math.min(1, frame / 60);
  rig.apply({
    "roof.shingles": { translate: [0, 2.2 * t, 0] },
    "wall.front": { opacity: 1 - .8 * t },
    "hvac.condenser.fan": { rotate: [0, -frame * 12, 0] },
  }, () => house.pose?.({ id: "door-open", frame }));   // built-in action underneath
}

// Uniform inspection for cameras/callouts (measured bounds, anchors follow parts):
const inspect = inspectHouse3D(house);
inspect.getBounds("hvac.condenser", 0);
inspect.getAnchor("roof.ridge", 0).position;
~~~

## Contracts

- **One model, many renderers.** `resolveHouseLayout(spec)` validates the spec and returns plain numbers in meters: facade frames, openings, wall build-up, roof plane, part tree with rest bounds, anchors/ports and orthogonal service routes. The 3D build reads only this layout, so semantic IDs, bounds, anchors and flow paths agree with future 2D adapters. `inspectHouseLayout` exposes the layout through `InspectableAsset` without Three.js.
- **Frame:** ground at y = 0, +Y up, front facade faces +Z, ridge along X, 1 unit = 1 m.
- **Validation fails honestly.** Out-of-range dimensions, openings that crowd corners or each other or leave no room for a header, doors above the ground floor, garage doors off an eave wall or a slab, condensers without an air handler, solar arrays that do not fit, and meters with no clear wall all throw actionable errors. No silent clamping.
- **Stable semantic IDs** (examples): `wall.front.{siding,sheathing,framing,insulation,drywall}`, `opening.front-door.leaf`, `opening.front-1.sash`, `roof.{framing,decking,underlayment,shingles,ridge-cap,trim,gutters}`, `attic.insulation`, `foundation.{footing,slab|wall,basement-floor}`, `structure.floor-1`, `hvac.{condenser,condenser.fan,air-handler,supply-duct,return-duct,registers,lineset}`, `plumbing.{water-heater,supply}`, `electrical.meter`, `solar.array`, `chimney`, `site.{ground,walkway,driveway,steps}`. IDs are identical across presets, conditions and palettes.
- **Hierarchy = physical attachment.** Openings are children of their wall, so moving `wall.front` carries its windows and door. Each wall group carries its facade frame (local x along the wall, y up, z outward), so `translate: [0, 0, 1]` on a wall layer slides it straight out.
- **Moving parts are pivot-ready groups:** sashes slide in facade-local +y, the door leaf rotates about its hinge (+y opens inward), garage sections follow their tracks, and the condenser fan spins about +Y. `asset.moving` lists them.
- **Actions** (frame-addressed, 30 fps reference): `door-open`, `windows-open`, `garage-open` (when present), `condenser-run` (loop, analytic spin-up), `lights-on`, `roof-peel`, `wall-peel`.
- **States:** `condition: "new" | "aged" | "damaged"` changes shingle weathering (algae streaks, granule loss, missing or curled tabs) and paint fade, keeping the same IDs. Use crossfade/cut between builds; no mesh morphing is implied.
- **Part rig:** captures rest at creation. Each `apply` restores rest, runs an optional base pose, then layers poses. Opacity clones materials (nested fades multiply), so shared materials are never mutated. Unknown part IDs throw. `dispose()` frees clones.
- **Sectioning:** wall, roof, foundation, floor and soil layers have real thickness. `HousePart.clippable` marks them for clipping-plane cutaways (SectionReveal). Interiors are framing, floors and ceilings only: no rooms, furniture or stairs yet.

## Craft notes

Lap boards are individual tilted profiles with baked occlusion, notched around casings and rake-cut in the gables. Corners use nested layer rings, so nothing overlaps. Framing places king and jack studs, headers, sills and cripples at every opening. Shingles are individual tabs (three-tab or architectural) with staggered slots and per-tab color. Gutters are K-style with hangers, and downspouts have goosenecks and splash blocks. All materials are procedural PBR at physical scale (OSB strands, lumber grain, asphalt granules, fiberglass, concrete, CMU, brick, soil strata, lawn).

## Limitations

- Gable roofs only (no hips, dormers or porches yet), one or two storeys, rectangular footprint.
- Construction is illustrative and not a structural, energy or code-compliance claim. Service routes show plausible paths, not engineered designs.
- Visual review so far is agent screenshot review in Storybook; **human visual review is still required** under [3D evidence rules](../verification/hero-quality-gate.md) before calling the asset hero-approved.
