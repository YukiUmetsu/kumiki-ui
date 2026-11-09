# Race Recipes

**Registry item:** `race-recipes` (`registry/visual/race-recipes-react.tsx`). The pure spec and checks, `race-shots.ts`, are in `studio-shot-model`.
**In a film:** a `shot-3d` scene with `"shot": "race"`.

## Purpose

A car at speed on a track, as pure functions of the frame. It was made to demonstrate [speed ramps](film-document.md#speed-ramps), and stands as a shot in its own right.

`TrackPass` offers two cameras:

- **`trackside`** (the default). A low camera beside the track, on a long lens, pans with the car as it approaches, passes level with the lens (`passFrame`), and races away. This is the classic shot of a car film.
- **`follow`**. A camera car rides alongside, `along` metres ahead of or behind the car, so the car holds its place in frame and the track streams past behind it.

## The world

- **The track** is drawn in metres:
  - photographed asphalt (Poly Haven "Asphalt Track", CC0) with painted edge lines;
  - 2 m red-and-white kerbs;
  - grass verges (the meadow textures);
  - galvanised guardrails on posts every 2.5 m, whose spacing streams past to show speed.
- **The sky** is a daylight HDR (Poly Haven "Kloofendal 48d Partly Cloudy, Pure Sky", CC0). It lights the scene and reflects in the paint. Its brightest pixel places the sun, so the sun's shadows agree with the reflections. The shadow camera follows the car.
- **The car** is any glTF. Its four wheels are found by name: `WheelFrontL`, `Wheel_FL`, `wheel_front_left` and the like.
  - The car is turned to drive along +x, from its front and rear axles.
  - It is seated on the lowest point of its tyres, measured on the vertices.
  - Each wheel turns about its own axle (its thinnest side) by distance travelled over its radius. Brake pads and calipers stay still.
  - The body rides a few millimetres on a repeatable road profile.

## Motion blur that follows the ramp

At 58 m/s a wheel turns about 326° a frame. Drawn sharp, its spokes alias (the wagon-wheel effect) and look stopped or reversed.

A film camera's 180° shutter smears them into a disc instead, so each rim gets a blur disc on its outer face. The disc fades in with the wheel's turn during half a frame: from 25°, fully by 90°. That turn is measured in film time: `TrackPass` takes `rate`, the content frames per film frame, and `FilmStage` passes it through any speed ramp. So the wheels smear at speed and sharpen as a hold slows time, as they do in real slow motion.

## Checks (`inspectTrackPass`)

| Code | Severity | When |
|---|---|---|
| `race-pass-outside` | error | The pass is not inside the shot |
| `race-approach-short` | warning | The car reaches the camera in under 0.8 s |
| `race-exit-short` | warning | The shot ends within 0.6 s of the pass |
| `race-speed` | warning | A speed outside 10 to 100 m/s |
| `race-camera-close` | warning | A camera within 4 m of the car's line |
| `race-title-at-pass` | warning | A title entering at the pass |
| `race-title-short` | error | A title not on screen long enough to read |

The pass rules do not apply to `follow`.

In a film:

- **`pass`** is a transient moment: the review samples the pass itself. It is the shot's default turn; a follow shot turns on its title.
- **Assets.** The renderer needs `race` assets: `{ car, track }`. The capture page loads them only for a film with a race shot.

## The car

`assets/models/vehicles/concept-car.glb` is "Car Concept" by Eric Chadwick / Darmstadt Graphics Group, from the Khronos glTF Sample Assets. It is CC BY 4.0, built from a CC0 model by Unity Fan.

- **Changes.** The Khronos logos are removed: the logo texture is taken out of the emissive slots it lit on the rims, mirrors, brakes and hardware, and the licence plate is blank. The files are packed into one GLB.
- **Credit.** The credit and licence notice ship beside it, in `concept-car.LICENSE.md`. Provenance is in `assets/THIRD_PARTY_ASSETS.json`.

**Other cars.**

- **Ruled out.** Free race cars from Free3D and CGTrader were considered. Their standard terms forbid redistributing the model files, and the candidates were real branded cars (trademarks and trade dress). Neither can ship in a public library.
- **For your own rendered videos.** A car whose licence allows rendered output can be loaded from outside the repository, with `TrackPass`'s `car` prop or the renderer's `race.car`. Do not commit it.

## Evidence (2026-11-08)

- **Tests.** `tests/race-shots.test.ts` (8 tests) covers:
  - speed and the pass;
  - wheels turning by distance over radius, at sub-frame precision;
  - the trackside camera panning and the follow camera keeping pace;
  - a repeatable ride;
  - every check;
  - wheel names in three conventions;
  - the film moment and turn.
- **Install.** `registry:fixture` passes for `race-recipes`, `film-3d-stage` and `film-document`.
- **Review.** Storybook **Video → Race Recipes → Track Pass Frames**, GPU, and `film:review` of `speed-ramp-3d` (0 errors, 0 warnings). Faults found and fixed:
  - a car floating 30 cm above the road (it was seated on loose mesh boxes);
  - frozen or aliased spokes at speed;
  - the blur disc hidden inside the dished rim from a raised camera.
- **What the ramp does.** In the speed-ramp example, measured from the shot itself:

  | | Car within 6 m of the lens | Camera pan at the pass |
  |---|---|---|
  | Ramped | 42 frames (1.4 s) | 2.1° per frame |
  | Even, same content in the same length | 5 frames (0.17 s) | 17.1° per frame |

  Pixel change per frame misleads here: near the pass the car fills the frame and the camera pans fastest, so even slowed it changes more pixels than the distant approach.
- **Storybook Compare.** It needed a Suspense boundary around each film. Without one, a state update that briefly suspended the 3D subtree was rendered but never committed, so Play did nothing. The film capture page renders frame by frame and was unaffected.
- **Not yet done.** No owner viewing yet.

## Limitations

- **One straight.** No corners, no braking or steering, and no tyre marks.
- **Wheels only.** Motion blur covers the wheels only; the body and background are sharp, as at a high shutter speed.
- **No sound.**
