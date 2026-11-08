# Light Recipes: light doing something physical

**Scope:** Recipes where light is the subject, traced from the scene's real geometry at each frame. Every recipe is a pure function of `frame`. The plan and sources are in [doc 31](../31-react-three-fiber-content-plan.md).

| Recipe | Component | Job |
|---|---|---|
| Light Through It | `LightThroughIt` | Show cause and effect in light. A drop lands on a sunlit pool, and its rings focus the sun into moving lines on the floor |
| Real-Light Flythrough | `RealLightFlythrough` | Make a place look real. The camera moves forward through a set lit by path-traced, baked light |

## Install and inspect
- Registry item: `light-recipes`. It depends on `studio-recipes`, `fiber-stage` and `crafted-3d-hero`.
- Storybook: **Video production → Light Recipes → Light Through Water**, with the output of `inspectLightShot`.

## Minimal usage
~~~tsx
const spec = { durationFrames: 210, drop: { frame: 36, x: -.35, z: .25 }, view: { yaw: 6, pitch: 60, fill: 1.32 },
  title: { text: "Light bends where the surface curves", enter: 96 } };
<LightThroughIt frame={frame} fps={{ num: 30, den: 1 }} spec={spec} tone="dark-on-light" />
~~~

## Caustics (`createCaustics`, `applyCaustics`)
- **Method.** This follows Evan Wallace's WebGL Water:
  1. The light-bending meshes are drawn from the light, recording each surface normal and depth.
  2. A dense grid of rays (320 per side) refracts through that record onto the floor.
  3. A grid triangle that lands smaller than it started is brighter, by the ratio of the areas. Rays converging into a line make that line bright.

  Red, green and blue use slightly different indices (`dispersion`), so focused edges split into a faint spectrum.
- **Why curvature, not height.** A ripple focuses light at about `1 / ((n − 1) · amplitude · k²)` below the surface.
  - Long, low swells focus metres too deep and leave a half-metre floor flat.
  - `CALM_POOL` uses six short ripple trains, a few millimetres high, at unrelated angles and wavelengths. That puts the focus near the floor, and the pattern never repeats into a grid.
- **Through water.** A transmissive surface only sees opaque objects behind it. `applyCaustics` therefore adds the light inside the floor's own material, multiplied by its albedo. `replaceDirect` removes the floor's direct sun term, so the caustics are that sunlight, redistributed rather than added twice.
- **Pure.** The water is displaced on the CPU from `waterHeight(spec, x, z, seconds)`. The caustics read only that geometry, so a frame looks the same in any order. There is no time state, randomness or download.

## Baked light (`scripts/light-bake.py`, `RealLightFlythrough`)
- **Why bake.** Bounced light is most of what makes a place read as real: a sunlit wall glows onto the shadowed wall beside it. Real-time lights cannot afford it, so the set is lit once in Blender Cycles, and every surface's final lit colour goes into a texture. The render shows those textures unlit and without a second tone mapping.
- **The set.** A sandstone slot canyon, built procedurally from fixed parameters:
  - meandering walls that pinch toward a narrow top, with flowing flutes;
  - warped sandstone strata;
  - a high sun with a 0.6° disc and a dim blue sky that only enters through the top;
  - ten bounces.
- **Storing the bake.**
  - A filmic curve (ACES, fitted) rolls the highlights off before the bake is stored as 8-bit sRGB. A sun patch keeps its texture, and the dim bounce light keeps its colour.
  - The walls are grids, so their UVs come straight from the grid (along the canyon × height), with textures in the same proportions. The first bake used automatic UV islands, which bled dotted seams.
- **Cost.** About 1.5 minutes at 3072 px and 96 samples, run at low priority with `nice -n 15`. The glTF is 3.3 MB, and the camera path is written beside it.
- **Playback.** The camera moves forward along the baked path from the first frame, at a steady pace that eases only at the end, and lifts its eye from 3° to 16°. While the glTF loads the stage suspends, so an export waits.
- `inspectFlythrough` checks the direction of travel, the speed (under 20% of the set a second) and the title timing.

## Contracts
- `inspectLightShot` checks four things:
  - The rings have at least 2.5 s to spread (`light-rings-short`).
  - The drop does not land in the first 0.4 s (`light-drop-early`).
  - The title waits until the rings reach the floor (`light-text-early`).
  - The camera drifts under 15°, so it does not compete with the moving light (`light-orbit-busy`).

## Evidence
- Rendered in Playwright's default Chromium, full page, at frames 30, 84 and 150. The caustic web is irregular, and the rings from the drop focus light outward.
- **Human visual review is pending.**

## Limitations
- The baked set is static. Its light cannot change, and nothing moves in it.
- The canyon's surface detail is limited to the bake's 3072 × 1536 texture per wall. Close walls soften at 1080p.
- Caustics land on one horizontal floor. Walls do not receive them.
- The surface does not reflect the deck or the walls.
- The drop has no splash crown.
