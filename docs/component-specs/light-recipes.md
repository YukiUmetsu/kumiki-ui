# Light Recipes: light doing something physical

**Scope:** Recipes where light is the subject, traced from the scene's real geometry at each frame. Every recipe is a pure function of `frame`. The plan and sources are in [doc 31](../31-react-three-fiber-content-plan.md).

| Recipe | Component | Job |
|---|---|---|
| Light Through It | `LightThroughIt` | Show cause and effect in light. A drop lands on a sunlit pool, and its rings focus the sun into moving lines on the floor |
| Real-Light Flythrough | `RealLightFlythrough` | Make a place look real. The camera moves forward through a set lit by path-traced, baked light |
| Captured Place | `CapturedPlace` (item `splat-stage`) | Show a real place as itself. A slow forward move through a Gaussian-splat capture trained from photographs |

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

## Captured places (`splat-stage`, `CapturedPlace`)
- **Renderer.** Spark (`@sparkjsdev/spark`, MIT) is pinned at 2.4.0. It is the only dependency of the optional `splat-stage` item, and its bundle has no network URLs. It reads PLY, SPZ, SPLAT and KSPLAT.
- **Exact frames.** Spark sorts splats by depth in workers. Each frame takes a `useStageHold` until the capture has loaded and Spark has sent no `onDirty` for three animation frames, so an export captures the sorted picture for that camera. In a test, frame 120 reached from frame 0 and from frame 230 was pixel-identical. Any later `onDirty` starts a new settle cycle, and settling waits for the load. The first version could settle during loading, while Spark was still silent, and a capture shown on its poster frame then stayed blank until the frame changed. A reel caught this.
- **The capture.** The Montreal Clock Tower, trained by us from Heritage3DMtl drone photographs (CC BY 4.0). The pipeline is in `docs/31-react-three-fiber-content-plan.md`, and the provenance is in `assets/THIRD_PARTY_ASSETS.json`. The credit is shown on screen.
- **Capture pipeline.** It runs once, offline, at low priority, and takes about 40 minutes on an M4:
  1. Download one building from Heritage3DMtl (the Clock Tower is 0.94 GB).
  2. `python3 scripts/capture/alicevision-to-colmap.py 2_sfm/sfm.json sparse_txt` converts the dataset's AliceVision solve to COLMAP. Rotations are camera-to-world, verified by reprojection at a median 1.5 px.
  3. `colmap image_undistorter --max_image_size 1600` undistorts the photos (22 s).
  4. `brush_app dataset --total-steps 15000 --max-splats 800000 --sh-degree 1 --max-resolution 1600 --seed 7` trains the splats (Brush v0.3.0, Apache-2.0, official release with a verified checksum). It took 37 minutes on the GPU.
  5. `node scripts/capture/splat-to-spz.mjs in.ply out.spz cx cy cz half 0.02` converts to SPZ. That turned 59 MB of PLY into 4.75 MB.
- **What we tried.** An opacity threshold of 0.05 saved 0.45 MB but stripped the faint distant city, leaving grey smudges. The 15,000-step model is sharper on the tower than the 10,000-step one.
- **Orientation and path.**
  - The scene's up axis is the average up of the drone photos, which keep the horizon level. It is applied as `rotation`.
  - The path stays on the side where most photographs were taken (azimuth −180° to −60°), at the height the drone flew.
  - Splats dissolve into floaters where no photograph looked.
- `inspectCapturedPlace` checks three things: the move is toward the subject, it is under a quarter of the distance a second (splat edges shimmer under fast moves), and a credit is present.

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
- The capture's sky and water reconstruct as soft white haze, as is usual for splats of reflective water and a featureless sky. Keep the camera on the photographed side and at the drone's height.
- The baked set is static. Its light cannot change, and nothing moves in it.
- The canyon's surface detail is limited to the bake's 3072 × 1536 texture per wall. Close walls soften at 1080p.
- Caustics land on one horizontal floor. Walls do not receive them.
- The surface does not reflect the deck or the walls.
- The drop has no splash crown.
