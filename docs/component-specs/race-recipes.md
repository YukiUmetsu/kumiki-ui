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

## Race livery

`livery` puts a race livery over the car's own finish:

```json
"livery": { "body": "#f3f3f0", "accent": "#1f3f9e", "number": "27", "stripes": "#c8202a" }
```

- **Paint.** Materials named `Paint 1` and `Paint 2` take the body and accent colours. Each car gets its own copies first: copies of a loaded model share materials, so one car's paint would otherwise repaint every copy on the page.
- **Decals.** These are projected onto the body when the car loads, and ride on the panels they land on:
  - The number goes in white roundels on both doors, and on the bonnet, off the centre line and reading from the front.
  - Stripes is a colour, or `true` for white: twin stripes over the top from nose to tail.
  - Projection skips glass, so the stripes stop at a glass roof rather than showing the cabin through it.
- **Both sides read.** Because the decals are projected, the number reads the right way round on both sides. A painted texture on a model that maps both doors to one mirrored area cannot do that.
- **Contrast.** Choose stripes that contrast with every panel they cross: on the example car, blue stripes vanished over the blue bonnet centre.

The speed-ramp example drives the Car Concept in this livery, and Storybook **Race Livery Frames** shows it from both sides, ahead and at the pass. The car file is unchanged; the livery is an adaptation drawn at render time, which CC BY allows with the credit kept.

## Following at the same speed

A `follow` camera rides at the car's speed, `along` metres ahead (+) or behind (−) and `side` metres out. The car holds its place in frame and the track streams past. A camera car shakes a little on the road (`shake`, default 12 mm).

Storybook **Track Follow** has three setups:

| Setup | Position |
|---|---|
| Alongside | Beside the car, low |
| Chase | Behind, high |
| Lead | In front, looking back |

**Track Follow Frames** shows each with and without motion blur.

## Motion blur from the shutter

When the camera keeps pace, the track moves about 1.9 m per frame at 58 m/s, nearly one 2 m kerb block. Drawn sharp, the kerbs strobe and crawl backwards.

So each frame averages the moments inside a film shutter:

- **The shutter.** `shutter.angle` defaults to 180° for a following camera and 90° trackside, as sports operators shoot: near the lens the car turns about 6° toward the camera in half a frame, which smeared its nose at the pass with 180° (Storybook **Track Pass Blur** compares them). `shutter.samples` defaults to 6, and 1 turns the blur off.
- **The averaging.** The moments are rendered into a float buffer, averaged in linear light, then tone-mapped once.
- **What it does.** The track streams past a following camera, and a trackside pan smears.
- **Speed ramps.** The shutter's span is in film time, `rate` × the angle, so a speed ramp's hold sharpens the picture as it slows time.
- **Cost.** Six renders a frame.

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
**Your own cars, for local renders.** A car whose licence allows rendered output, but not redistribution, can be used on your own machine:

1. Put the `.glb` in `local-assets/vehicles/` (git-ignored, so it is never committed).
2. Name it in a race shot: `"car": "<file name without .glb>"`.
3. Keep that film file in `local-assets/films/` too, since it will not render on another machine.

Storybook's race and speed-ramp stories list local cars in a `car` picker. In your own app, pass the car's URL with `TrackPass`'s `car` prop, or as the renderer's `race.cars`.

- **Wheel names.** The car's wheels must be named for front or rear and left or right. `Wheel_FL` / `Wheel_BL` and `WheelFrontL` / `wheel_front_left` are found automatically. Single-mesh wheels are handled.
- **Example.** A downloaded CGTrader sports car, with a sponsor livery, was rendered this way. Its unclear licence and real brand marks keep it out of the repository.

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
- **Sampled blur.** Motion blur is six sampled moments, not continuous. At the fastest pans the samples can show as faint steps; raise `shutter.samples` for a final render.
- **No sound.**
