# Actual Solid Cutouts — true CSG host apertures

**Status:** implemented/tested on the feature branch; actual camera-close GPU visual review pending. **Registry ID:** `craft-solid-cutouts`. **Source:** `registry/craft/solid-cut.ts`. **Storybook:** `3D asset toolkit / Actual Solid Cutouts / Architecture`, `/ Enclosure`. **Backend:** pinned `three-bvh-csg@0.0.18` and `three-mesh-bvh@0.9.7`, MIT; Three.js 0.186.1. No Blender or new renderer.

## When to use

- **Use:** a window through an architectural panel, a port bored into a device, a ventilation passage through an enclosure, a recessed circular socket or a mechanism where a camera can see the real inside wall of a cut.
- **Use `craft-detail-kit` instead:** isolated surface fasteners, raised/grille faceplates, trim and ribbing on a mostly solid body. Its vents have holes in the faceplates but *not* in the underlying host.
- **Compose both:** calculate the host cutout here, then attach approved detail-kit frames, collars and screws to the body without painting fake holes.
- **Do not use:** high-frequency live boolean geometry changes every frame, arbitrary broken/non-manifold imported meshes, a full CAD/kernel replacement, or thin surfaces outside the centered box-solid contract. Build an authored asset elsewhere if the geometry needs much more than this contract.

## Smallest useful recipe

```ts
import { createCraftSolidCuts } from "./components/craft/solid-cut";

const result = createCraftSolidCuts({
  schemaVersion: 1, id: "service-panel",
  body: { width: 4.2, height: 2.6, depth: .35 }, quality: "hero",
  apertures: [
    { id: "window", face: "front", at: [0, .08], shape: "rectangle",
      width: 1.4, height: 1.2, through: true },
    { id: "fastener-pocket", face: "front", at: [-.42, -.4], shape: "round",
      radius: .06, depth: .12 },
  ],
}, { material: approvedPbrMaterial });

scene.add(result.mesh);
// result.anchors maps "window" / "fastener-pocket" to face, pose and extent.
// Animate the resulting mesh with the existing MG1/Three.js camera.
// On teardown: result.dispose(); caller keeps ownership of approvedPbrMaterial.
```

The host is a **centered box solid**, not an imported arbitrary mesh. `at` uses normalized face coordinates in `[-0.5, +0.5]`. The local axes match `craft-detail-kit`: front/back/top/bottom/left/right. A `through: true` aperture crosses the entire host thickness. Otherwise, specify a positive `depth` smaller than that face's host thickness; the cutter produces a closed pocket with an actual back wall. A round cutter is a capped radial solid: 80 segments in `hero`, 40 in `supporting`.

The output includes a real `BufferGeometry` with normals and UVs, a shadow-capable `Mesh`, semantic `userData.cutIds`, and pose/normal/extent anchors for additional frames, glazing, material variants or callouts. Callers can supply their own PBR material; the adapter never mutates or disposes it. Without one, the adapter creates and owns a neutral MeshStandardMaterial.

## Constraints and caveats

| Constraint | Why |
|---|---|
| 1–16 unique apertures, positive body dimensions ≤100 world units | Predictable one-time CPU boolean budget |
| Rectangle or round cutters; each must stay inside its face with a solid border | Avoids coincident outer edges and non-manifold boundary cases |
| Blind depth less than host thickness, through cuts omit depth | Keeps pocket and through semantics unambiguous |
| Max 180,000 result vertices after each cut | Avoids exploding geometry and GPU cost |
| Host box and cutters are watertight closed solids | Required by BVH-CSG for meaningful booleans |
| No animation clock, no renderer, no asset/network dependency | Reuses Kumiki's camera, scene and export system |

**CSG is not guaranteed mathematically manifold in all degenerate/near-coincident cases**; the library itself documents numerical and triangle-splitting limitations. Structural unit tests measure this adapter's expected apertures and blind depths, not every possible boolean topology. Visual QA must inspect cut interiors, perimeter normals, UV stretch, light leaks, close-up faceting and shadow bias. For production buildings, use separately authored geometry when complex unions or repeated layered cuts become pathological.

The resulting cavity surface has the host material unless the caller adds a lining or custom PBR finish. For a cinematic window, model glazing, seals and interior light as **separate semantic parts**; the cut alone is not a finished building. The Storybook samples combine real host cuts with Kumiki's `craft-detail-kit`, material kit and studio lights.

## Validation and acceptance — 2026-10-31

- `tests/craft-solid-cut.test.ts` verifies actual through-window ray misses, blind recess back-wall hits, all six face normals, material ownership and invalid input failures.
- `npm run typecheck`, focused ESLint, `registry:validate` (205 items), `catalog:check` (375 entries / 793 stories), `registry:smoke`, isolated `registry:fixture -- --item=craft-solid-cutouts` and `build-storybook` all passed. The broader relevant unit suite passed 29/29 tests over five files. These are structural/build checks, not aesthetic approval.
- **Not visually approved** without inspected browser GPU captures for both Storybook examples at close/medium camera positions, 16:9 and 9:16, including physical interiors and output-frame performance.

## Upstream and attribution

- [`three-bvh-csg`](https://github.com/gkjohnson/three-bvh-csg), MIT, installed `0.0.18`.
- [`three-mesh-bvh`](https://github.com/gkjohnson/three-mesh-bvh), MIT, installed `0.9.7`.
- This is a *new adapter around existing licensed packages*, not a vendored copy of their implementations or a new CAD engine.
