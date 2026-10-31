# Procedural Streetlamps — supporting/background built detail

**Installable:** `craft-procedural-environments` (same pack as streetscape), `createCraftStreetLamps`, `planCraftStreetLamps`, `validateCraftStreetLampSpec`; source `registry/craft/street-lamps.ts`. Uses pinned Three.js geometry, no new dependencies, stock assets, Blender or external textures. **Status: structural tests pass; browser/GPU and human close-up visual approval pending.**

## When to use

Use for an urban street, establishing camera move, or architectural midground where unoccupied pavements look empty and lamp post silhouettes add scale and depth. Do not substitute for a camera-close hero fixture, surveyed real-world luminaire, legally specific traffic light, or a scene requiring physically calibrated nighttime illumination. The warm lantern is a **glowing glass surface only**; supply scene-authored lights when actual light cast is required.

## Use without authoring geometry

```ts
import { createCraftStreetLamps } from "./components/craft/environment-generator";

const lamps = createCraftStreetLamps({
  schemaVersion: 1, id: "avenue-lights", seed: 21,
  length: 49, roadWidth: 8, sidewalkWidth: 6,
  sidewalkSide: "negative", // or positive, both, none
  crosswalkAt: [1.5],
  lampsPerSide: 2,
  height: 4.5, reach: 1.04,
});
scene.add(lamps.group);
// Later: lamps.dispose(); also removes meshes from the parent scene.
```

Or use `createCraftStreetscape({ ...spec, lampsPerSide: 2 })` and dispose only the returned streetscape. The nested lamp kit is exposed as `street.lamps`, and `street.group.userData.lampCount` reports actual placement count.

## What you get

| Part | Construction and surface |
|---|---|
| Base and shaft | Rounded, tapered, concentric lathe profile; bolted base flange; cast dark-metal PBR |
| Gooseneck | Actual smoothly swept tube, curved upward and then down toward street |
| Fixture | Layered bell shade, head collar and rolled rim with contrasting machined finish |
| Lens | A non-flat slightly translucent glass globe, partly recessed behind shade; restrained warm emissive material, no punctual Light object |
| Supporting details | Clamp ring, access fasteners, deterministic small metal tint variation |

The forms are merged once per material and instanced: **one cast-metal, one contrasting metal and one glass draw object** for every batch of lamps. The arm is authored facing local **+Z**; lamps placed on the positive sidewalk are rotated to point **−Z** toward the road. Road direction is local **+X**. Each foot sits at sidewalk level **Y = +0.06**, its Z anchor at `sign * (roadWidth/2 + sidewalkWidth * .78)`.

`lampsPerSide` is an integer **0–6**, `height` **3.6–6**, `reach` **.65–1.4**. Roads are **12–120**, widths **5–24**, sidewalks **1.5–9**, all in scene units. This is an authoring scale, not a claim of measured municipal dimensions. Posts keep at least **3.15 units** from specified zebra centres and **3.6 units** apart; when space is insufficient, impossible candidates are skipped, with the actual count exposed rather than silently placing collisions. No external renderer/timer/state is created. `dispose()` is idempotent and releases all merged geometry and materials.

## Review

Storybook **3D asset toolkit → Procedural Environments → Streetlamp Detail** provides the purpose-built close-up orbital inspection, sliders for height/arm reach and real 16:9/9:16 camera output. **Street Corner**, checkbox **Crafted streetscape (road, sidewalk, lamps)**, tests real street context at frames 0, 58, 120 and seeds 1, 41, 99. The exact street capture matrix can be printed with `npm run craft:review -- --plan`; browser images require `npm run storybook` and `npm run craft:review` on a render host with Chromium. Inspect base grounding, fixture proportions, alignment to curb/crosswalk, repetitive silhouettes, shade/glass intersection, material response and GPU draw times. [Visual-review runbook](../verification/craft-environment-visual-review.md). No frame has yet been human-approved.
