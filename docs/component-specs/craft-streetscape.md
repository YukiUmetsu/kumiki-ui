# Procedural Streetscape — road, curb, paving and drainage details

**Installable item:** `craft-procedural-environments` (includes `registry/craft/streetscape.ts`, `street-lamps.ts` and re-exports from `environment-generator.ts`). **API:** `createCraftStreetscape`, `validateCraftStreetscape`, `CraftStreetscapeSpec`, plus standalone `createCraftStreetLamps`. **Status:** tested geometry, actual WebGL close-up approval pending. No npm dependency beyond installed Three.js, no Blender or external geometry/texture assets.

## When to use

| Shot | Use |
|---|---|
| Establishing or medium street view where a plain asphalt box looks unfinished | **Yes**. Build the road, curb profile, paved edges, drainage grilles and paint from one spec. |
| Camera moves laterally across road/sidewalk | **Yes**, provided the passing edges, elevation and pattern scale remain visible at output pixels. |
| Distant skyline with less than a few pixels of road | **No**. Use a simpler approved ground surface; these details will be subpixel. |
| Close-up of a storm drain, surveyed road marking or historically specific pavement | **No** as a hero asset. Supply reference-based geometry/textures and verify dimensions and surface wear. |

## Minimal scene recipe

```ts
import { createCraftStreetscape } from "./components/craft/environment-generator";

const street = createCraftStreetscape({
  schemaVersion: 1,
  id: "street-01",
  seed: 35,
  length: 49,
  roadWidth: 8,
  sidewalkWidth: 6,
  sidewalkSide: "negative", // "negative" | "positive" | "both" | "none"
  crosswalkAt: [1.5], // local X positions
  drainsPerSide: 3,
  lampsPerSide: 2, // optional actual lantern geometry on the selected sidewalk
  centerline: true,
  jointSpacing: 2.2,
});
street.group.position.z = -3.7;
scene.add(street.group);

// On scene teardown: street.dispose().
```

## Physical placement and controls

| Property | Units / rule |
|---|---|
| `length` | 12–120 world units; long direction is local **+X**. |
| `roadWidth` | 5–24 units; asphalt spans local Z = `±roadWidth/2`, its top is Y = **−0.10**. |
| `sidewalkWidth` | 1.5–9 units; negative sidewalk sits at Z below `−roadWidth/2`; positive above `+roadWidth/2`. Sidewalk top is Y = **+0.06**. |
| `sidewalkSide` | `both` by default; `none` builds just the asphalt/paint. |
| `crosswalkAt` | Up to 3 points, at least 4 units apart and 2 from the ends; each crossing has eight 0.26-unit bars spanning most of the road. Centerline segments are omitted near crossings. |
| `centerline` | `true` by default: broken 2.3-unit road-painted center strips. |
| `drainsPerSide` | Integer 0–8, default 2. Drains are set just inside road edges and moved away from zebra crossings. |
| `jointSpacing` | 1–6 units, default 2.2. Small physical strips describe saw-cut seams over the sidewalk surface. |
| `lampsPerSide` | 0–6 per active sidewalk, default 0. Adds actual cast-metal posts, swept brackets, shaded lantern glass, seam collars and fasteners. Posts avoid zebra crossing approaches and crowding; a very short or congested street may place fewer. No actual real-time point lights are created. |
| `colors` | Optional RGB integer overrides for `asphalt`, `paving`, `curb`, `paint`, `grate`. |

Curbs are **extruded seven-point cross-sections**, with raised stone edges and pitched noses. Drain wells have a dark inset, with seven separate metallic bars per well, **not a flat black photograph**. Road markings have real normal/depth response and seeded, restrained color variation. Everything is material-identified and uses stock PBR surfaces. Road, paving and curb materials are exposed as `street.materials` for optional scene-authored procedural microdetail.

Repeating paint, joints and grate bars use `InstancedMesh` and one shared unit box; the two curbs share one extruded profile. Optional streetlamps add **one nested group with three instanced draw objects**, regardless of the configured post count. A 49-unit road with one sidewalk, one crossing and three drains has a bounded number of draw objects rather than a new mesh for every joint or bar. Scene geometry/materials are owned by the factory, released idempotently by `dispose()`; the calling camera/renderer and absolute-frame clock remain authoritative. The same seed yields identical marking colors, joint phase, drain and lamp positions. [Streetlamp detail contract](craft-street-lamps.md).

## Verification and visual gate

Unit tests: dimensions/side alignment, actual non-flat curb profile, separate drain bars, stable seeded paint and joint locations, absent-feature builds, input validation, ownership/disposal. Consumer fixture compiles a scene recipe through the installable registry pack.

Storybook: **3D asset toolkit / Procedural Environments / Street Corner**, checkbox **Crafted streetscape (road, sidewalk, lamps)**. Compare on/off at frames **0, 58, 120**, seeds **1, 35, 99**. Check the curb's relative height, markings crossing rather than floating on the asphalt, drain grilles near the curb without overlapping zebra paint, sidewalk joint scale, **post grounding, height, arm reach and shade facing**, surface lighting and pixel-space density. Also inspect 9:16 framing and measure draw calls/GPU time. Tests are **not** proof of cinematic appearance; no frame is human-approved yet.

For controlled screenshots run `npm run storybook` and then `npm run craft:review` with Playwright Chromium installed. Review `detailed` versus `no-streetscape` with the same room settings, and `no-rooms` versus `baseline` with rooms off. The 16:9/9:16 contact sheet, frame hashes and reverse-seek results are stored in a new `dist/craft-environment-review/*/` folder; capture success does not mean visual acceptance. [Runbook and human gates](../verification/craft-environment-visual-review.md).
