# FLORA2 — reference-guided 3D flora engine

**Registry item:** `flora-engine` (needs `art-foundations` and `crafted-3d-hero`) · **Files:** `registry/anatomy/flora-*.ts` ·
**Storybook:** Video production → Art Foundations → Plant Anatomy (3D flora engine, Reference blueprints, Organ close-ups,
Rows and groves, Register a profile) · **Skill:** [kumiki-plant-anatomy](../../skills/kumiki-plant-anatomy/SKILL.md) ·
**Research:** [reference study and parameter blueprint, 2026-11-17](../research/flora-engine-reference-study-2026-11-17.md)

FLORA2 grows any plant in 3D from a `SpeciesMorphologyProfile`. A profile is plain data: sizes, ratios and colours
measured from studied references, with a grade and a source for each number. The engine holds no species code. A moss
cushion, a row crop, a canopy tree, a climber, a succulent rosette and a flower use the same schema.

FLORA1 ([plant anatomy](plant-anatomy.md)) draws plants in 2D for any art style. FLORA2 builds them as meshes for
WebGL scenes. Both share `art-foundations` (seeded random streams, noise, graded ranges).

## Parts

| Part | File | What it does |
|---|---|---|
| `SpeciesMorphologyProfile` | `flora-profile.ts` | The schema, `checkFloraProfile` (broken references, impossible numbers, missing evidence) and `FloraProfileError`. |
| Reference profiles | `flora-profiles.ts`, `flora-profiles-popular.ts` | `FLORA_PROFILES` (18): Monstera deliciosa, Adansonia digitata, Dracaena cinnabari, Salix babylonica, Helianthus annuus, Zea mays, Echeveria, Polytrichum commune; and the popular coconut palm, English oak, Japanese maple, fiddle-leaf fig, snake plant, aloe vera, garden tulip, English lavender, saguaro and Boston fern (`POPULAR_PROFILES`). |
| Math | `flora-math.ts` | Vectors, centripetal Catmull–Rom, cubic Bézier, rotation-minimizing frames, monotone radius profiles, the heavy elastica, the growth curve, `MeshBuffer`. Noise comes from `foundation-raster`. |
| Skeleton | `flora-skeleton.ts` | `growSkeleton`: axes, forks, climbing, colonies and organ placements. |
| Leaves | `flora-leaf.ts` | `buildBlade` and `bladeLayout`: outlines, vein coordinates, fenestration, 3D shaping. |
| `ProceduralMeshBuilder` | `flora-mesh.ts` | Tubes with bark relief, organ templates and instance matrices, the fidelity table, organ close-ups. |
| `SpatialLayoutManager` | `flora-layout.ts` | Hero, rows, groves and ground cover. |
| `ReferenceGuidedFloraEngine` | `flora-engine.ts` | The profile registry, `generate`, `organ`, and a specimen cache. |
| Three.js adapter | `flora-three.ts` | `createFloraAsset`: `InstancedMesh` draw groups, physical materials, procedural maps, a `HeroAsset`. |

Only `flora-three.ts` imports Three.js. The other files make typed arrays, so they run in workers and tests.

## Use

```ts
import { ReferenceGuidedFloraEngine } from "./flora-engine";
import { createFloraAsset } from "./flora-three";
import { HeroAssetViewer } from "../craft/hero-viewer";

const engine = new ReferenceGuidedFloraEngine();          // registers FLORA_PROFILES
const scene = engine.generate({
  speciesProfile: "monstera-deliciosa",                    // an id, or a profile object
  seed: 7,                                                 // the same seed grows the same plant
  fidelityLevel: "high_def",                               // "preview" | "high_def" | "macro_ultra"
  layoutMode: { mode: "hero" },                            // or rows, grove, ground-cover
  growthStage: 1,                                          // 0 seedling → 1 mature
});
<HeroAssetViewer createAsset={() => createFloraAsset(scene, { fidelity: "high_def" })} width={1080} height={720} />;
```

`FloraEngineConfig` also takes `variants` (distinct specimens for a layout, default 4), `stageSpread` (± growth stage
between them) and `origin` (to put several species in one scene). Pass an array of scenes to `createFloraAsset` for a
mixed scene. `engine.organ(profile, organ, fidelity, maturity)` gives one organ alone for close-ups.

### Register a profile at run time

```ts
const issues = engine.register(myProfile);   // throws FloraProfileError if the check finds errors
const palm = engine.generate({ speciesProfile: myProfile.id, seed: 3, fidelityLevel: "high_def", layoutMode: { mode: "hero" }, growthStage: 1 });
```

The "Register a profile" story does this from JSON in the browser. Its example is a fan palm that has no code of its
own.

## The profile

| Field | Holds |
|---|---|
| `sources` | Each studied reference: URL, licence (`rights`), creator and what was observed. Photos are linked, never copied. |
| `size`, `measured` | Graded ranges (`reported` with a source, `measured` from our photo study, `estimated`). |
| `axes` | Axis rules: kind, surface, length (of the height, of the parent, or of the drop to the ground), radius, radius profile or weighted profile variants, root flare, limb swell, node rings, `ribs` (columnar cacti), elastica gravity and tip load, upturn, wander, `lean` (a leaning palm), start angle and divergence, lateral `children`, a dichotomous `fork`, `climb` and `colony`. |
| `organs` | `blade` (simple, palmate or fleshy leaves, petals, swords, grass blades), `capitulum` (a composite flower head), `corolla` (petals or tepals in whorls or a spiral, with stamens: a tulip), `ear` and `bud` (with an optional stalk: hanging fruit, acorns). |
| `placements` | Where organs sit: `along` an axis (spacing, nodes, divergence; `sides` with a `lift` for pinnae left and right of a rachis; a fixed `phase` and an `offset` to put spines on rib crests; size from base → middle → tip), at its `tip`, or as a `rosette`. |
| `surfaces` | Colour stops from foot to tip (sRGB, sampled from the references), underside colour, a coloured `rim` (variegated margin), roughness, clear coat, sheen and a procedural texture. |
| `support`, `layout`, `seedling` | A pole to climb, layout defaults, height at stage 0. |
| `blueprint` | The parameter blueprint in words: phyllotaxy, skeleton, surface, layout. |

## How a plant grows

1. **Height.** The mature height is drawn near the typical value. Growth stage scales it by a logistic curve.
2. **Axes.** Each axis bends as a heavy elastica. G = wL³/EI sets the droop: near 0 a straight stem, about 3 an arching
   bough, over 100 a hanging strand. The solver shoots backward from the free tip, so it stays stable for G in the
   thousands. A catenary needs two supports. A branch has one, so the elastica is the correct model. Upturn, smooth
   wander in metres, radius profiles (monotone cubic), root flare with buttress lobes, limb swell and node rings follow.
3. **Children.** They leave at the rule's angle and divergence (137.5° spiral, 180° two-ranked, whorls). Their length
   follows a crown envelope (Weber and Penn 1995).
4. **Dichotomous crowns.** Branch-tip targets are spread over a dome by the golden angle. They are split into 2, 3 or 4
   groups at each fork, along the widest direction of the group. Each segment heads for its group, and radii keep
   Σ r^Δ (Leonardo).
5. **Climbing and colonies.** A climbing axis winds up the support pole, then grows free. A colony places stems by a
   Poisson disc and makes them shorter toward the rim, so the tips form a cushion over a mound.
6. **Organs.** Leaves face the sky, or face away from the axis. Organs formed early in the plant's life are juvenile
   (heteroblasty: the first Monstera leaves have no holes). Over the organ cap, organs are thinned evenly and the kept
   ones grow a little.

## Leaves

- **Outline.** The half-width is `sin(πs/2m)^base` toward the base and `sin(π(1−s)/2(1−m))^apex` toward the apex. There
  are optional cordate lobes with a sinus, serration, undulation or rounded lobes (an oak), a waist (a fiddle-leaf fig)
  and a mucro.
- **Vein coordinates.** Each point gets the coordinate of the lateral vein through it. Laterals leave the midrib at an
  angle that changes from the base to the apex and curve near the margin.
- **Fenestration.** Splits and holes are laid out in vein coordinates, so they run between the laterals. Splits are
  tapered capsules from the margin. Holes are ellipses along the veins in rows. The hole size is scaled until the hole
  area matches the measured fraction for the leaf's light (Monstera: 1.6% in shade, 4.6% in sun).
- **Mesh.** A blade with cuts is cut from a grid by marching triangles, so the inside stays a regular grid that bends
  well. A blade without cuts is a strip that follows the outline. Thin blades are one sheet seen from both sides. Fleshy
  blades have a top and a bottom sheet that meet at the margin, with a keel.
- **Shape.** Fold, cup, pleats between laterals, margin ruffle and twist, then the midrib bends by the elastica. A
  negative droop curls the blade toward its upper face (incurved tulip tepals).
- **Maps.** The vein map uses the blade's own vein layout: midrib, laterals and an areole network. It gives colour,
  normal and roughness. Monocot, petal, farina, banded (zigzag cross-bands of a snake plant) and spotted (white flecks
  of an aloe) variants exist.
- **Light in the crown.** Each leaf gets a tint: leaves deep and low in the plant's cloud of organs are darker (to 0.48),
  and every leaf varies a little in tone and hue. Undersides are paler by the luminance ratio of the profile's underside
  to its upper side (softened by a square root), a little greyer, matte and without the wax coat.

## Fidelity and performance

| Level | Tubes | Hero blade | Organ triangles per plant | Organ cap | Maps |
|---|---|---|---|---|---|
| `preview` | 7 segments | 16 cells | 0.4 M | 60 000 | 256 px |
| `high_def` | 14 | 40 | 2.5 M | 300 000 | 512 px |
| `macro_ultra` | 24 | 96 | 8 M | 800 000 | 1024 px |

- **Triangle budget.** Each blade template gets its cells from the budget ÷ its instance count. Thousands of small
  leaves stay cheap, and a hero leaf gets the full grid. Template keys hold the detail level.
- **Draw calls.** One `InstancedMesh` per specimen part and per organ template. A field of 126 plants is 68 draw
  calls.
- **Level of detail.** `preview` keeps 65% of small organs and makes each one cheap (about 12 triangles), so a tree in
  a field stays leafy. Keeping 40% made oaks look bare in winter.
- **Measured.** We orbited the "Rows and groves" scenes in Chromium (ANGLE Metal, Apple M4). All eight held 60 frames per
  second, the display cap:

  | Scene | Plants | Triangles |
  |---|---|---|
  | Maize and sunflower rows | 126 | 5.7 M |
  | Baobabs and dragon trees | 9 | 4.8 M |
  | Weeping willow grove | 4 | 3.4 M |
  | Tulip and lavender fields | 251 | 5.3 M |
  | Coconut palms on a beach | 5 | 1.7 M |
  | Saguaro desert | 14 | 2.1 M |
  | Oak and maple parkland | 7 | 9.5 M |
  | Succulent bed and moss cushions | 29 | 3.4 M |

  The parkland at `high_def` (26.7 M triangles) ran at 44 frames per second. Headless software rendering (SwiftShader)
  is far slower and is not a performance measure.

## Layout

- `rows`: `rowCount`, `plantsPerRow`, `rowPitch` and `plantSpacing` (defaults from the profile, for example maize at
  0.76 m by 0.155 m), `staggerOffset` (fraction of a spacing on odd rows) and `organicJitter` (position, size, about 6% ×
  jitter gaps).
- `grove`: clumps (a Thomas cluster process) with a minimum spacing.
- `ground-cover`: a Poisson disc at a density per m².
- `hero`: one plant at the origin.

## Evidence

- **Grades.** Every number in a profile carries a grade and a source id. The reference study gives the method: sky masks
  for silhouette ratios, luma percentiles for colours, and quotes for reported values.
- **Checks.** `tests/flora-engine.test.ts` covers the following:
  - profile checks and broken-profile errors;
  - determinism and growth with stage;
  - the Monstera hole fraction (sun and shade) and juvenile leaves without holes;
  - the elastica limits;
  - the dragon tree's crown width against the measured 1.69 × height;
  - the row pitch and stagger, and the Poisson spacing;
  - registration at run time and `inspectHeroAsset` on an instanced asset.
- **3D gate.** No FLORA2 asset is in `docs/verification/hero-approvals.json`. All are work in progress until a person
  reviews them.

## Stylizations and limits

- Leaves are drawn larger than life where a crown must read at tree scale with the leaf counts a GPU can draw: willow
  strand leaves 1.3×, Japanese maple 1.4×, English oak 2.2× (a real oak crown has about ten times more leaves).
- At `preview`, fine axes and small organs are thinned, and the kept organs grow a little to cover the same area.
- There is no wind or growth animation yet. FLORA1's sway rates (`swayHz: "species"`) are the reference for it.
- There are no flowers on the baobab, the dragon tree, the willow, the aloe and the saguaro. Maize kernels are inside
  the husk. Moss sporophytes are not drawn. Baobab pods, acorns and coconuts are simple spindles on stalks.
- Palmate maple lobes are separate blades that overlap at the base. The palm of the leaf is their overlap, not one
  outline.
- Colours were sampled under the photos' light and then lowered toward an albedo by judgement. They are not measured
  reflectances.
- Echeveria colours come from a greener specimen than E. elegans. The moss colour is estimated from the description.
  Commons rate limits stopped the photo downloads for the maple, fig, aloe, tulip, lavender, saguaro and fern, so their
  colours are estimated and their profiles say so.
- Each surface has one material. Petiole stalks built into a compound leaf take the leaf's roughness.
