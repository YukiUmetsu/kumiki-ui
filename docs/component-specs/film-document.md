# Film Document

**Registry items:** `film-document`, `film-look`, `film-3d-stage`, `scene-template-examples`, `rendered-text-audit`
**Source:** `registry/video/film-document.ts`, `film-stage.tsx`, `film-3d.ts`, `film-3d-react.tsx`, `film-schema-check.ts`, `film-document.schema.json`, `scene-template-examples.ts`, `registry/visual/rendered-text-audit.ts`, `rendered-frame-measures.ts`, `scripts/film.mjs`, `scripts/video-measure.mjs`, `scripts/film-sound-kit.mjs`

## Purpose

One JSON file describes a whole film. A person or an agent writes data, not TSX. The file compiles through the compilers that the repository already has: `compileSceneTemplate`, `compileObjectStory`, `compileCutPlan`, `validateCaptionTrack` and `resolveAudioCues`. It adds no renderer, clock or layout engine. Scene art and script stay the author's work.

If the film takes visual inspiration from analyzed footage, use the [Reference Lab → FD1 review map](film-reference-map.md) to link **explicit, human-selected source-video PTS** to frames of the separately authored film. Reference evidence never supplies scene recipes or sound cues automatically.

## Commands

```bash
npm run film:example -- --recipe=cause-effect --out=my-film   # a valid film and its assets
npm run film:check  -- my-film/cause-effect.film.json         # no browser, about half a second
npm run film:review -- my-film/cause-effect.film.json         # dist/film-review/<id>/
npm run film:render -- my-film/cause-effect.film.json         # dist/film/<id>/<output>.mp4
npm run film:ad     -- examples/ads/desk-before-after.ad.json # an ad brief becomes a checked film
```

`film:example -- --list` shows the recipes with a portable example. A recipe that needs real media has no portable example. Read its catalog entry instead.

`--only=<output id>` selects one output. `--out=<dir>` changes the folder. `film:render` also takes `--frames=<n>`, `--browser=chrome` and `--gl=gpu`. `npm run film:compare -- <a.mp4> <b.mp4> [--min-psnr=45]` checks that two renders show the same picture: the same renderer gives identical files, and software against GPU measured 49.9 dB on average, inside the declared 45 dB tolerance. The default draws WebGL in software, which matches on every machine but is slow. A ray world at full quality needs `--gl=gpu`. `film:check` takes `--format=json`.

## The file

```json
{
  "schemaVersion": 1,
  "id": "billing-gap",
  "fps": { "num": 30, "den": 1 },
  "outputs": [{ "id": "landscape", "preset": "youtube" }, { "id": "portrait", "preset": "youtube-shorts" }],
  "scenes": [
    { "id": "hook", "recipeId": "question-reveal", "durationFrames": 150, "content": { } },
    { "id": "gap", "recipeId": "object-story", "durationFrames": 300, "transition": { "kind": "dissolve", "durationFrames": 14 }, "content": { } }
  ]
}
```

[`examples/film/billing-gap.film.json`](../../examples/film/billing-gap.film.json) is a complete film. [`film-document.schema.json`](../../registry/video/film-document.schema.json) is the full contract. It is generated from the TypeScript types by `npm run film:schema`. Point an editor at it for completion.

- A **scene** is a `recipeId`, a `durationFrames` and the `content` of that recipe. Width, height, FPS and versions come from the film.
- A **transition** says how a scene arrives: `cut`, `dissolve`, `wipe` or `whip`. Its frames overlap the incoming scene, so a film lasts the sum of its scenes.
- An **output** is a platform `preset`, or a `width` and a `height`. Each scene reflows for each output. Nothing is cropped.
- **`appearance`** defaults to `dark`, because scene recipes are drawn for dark. In `light`, their text can be dark on a dark image.
- **`drift`** is a slow push-in across each scene, as a share of its size. `0.04` is 4%. The best short explainers are never still, and this is the cheapest way to get there. Reduced motion drops it.
- **`captions`** use film frames, and their timing source is required. An object-story scene draws its own captions, so do not cover it with film captions.
- **`audio`** holds lanes, sounds and links. `assetRef` is relative to the film file. `film:render` mixes them with FFmpeg. A link can name `<scene id>/focus`, `/reveal`, `/resolve` or `<scene id>/<beat id>`.
- **Asset paths** are relative to the film file. Every image needs a `licenseRef`. The exporter refuses an image without one, so the checker reports it first.
- **`art`** in an object story is `finance:<kind>`, `technology:<kind>` or `business:<kind>` in the capture page. An object with no art draws a word card. In your own app, pass `renderObject` to `FilmStage`.

## Story

A scene can state what it does to the viewer's belief. The fields are optional. If one scene has a `story`, the film is checked.

```json
"story": { "opens": ["which-charge"], "expects": "The totals are equal", "actually": "The receipt is $20 short", "turnAt": "measure", "hero": "bill" }
```

- **`opens` and `closes`** name a question. A loop that closes with no earlier `opens` is an error. A loop that never closes is a warning. The first scene must open a loop.
- **`expects` and `actually`** make a **turn** when they differ. A film of 20 s or more with no turn gets a `story-flat-arc` warning. `turnAt` names the cue or beat where the turn lands. The default is `reveal`, or the last beat of an object story.
- **`hero`** names where the eye must land on the opening frame of the scene: a subject ID, or `text` for the largest text. The review checks it.

- **`link`** says how a scene follows the one before: `but` turns against it, `therefore` follows from it, and `and` only adds to it.
- **`feeling`**, from -1 to 1, says how the scene leaves the viewer, for the arc check.

The checks:

| Code | Warns when | Evidence |
|---|---|---|
| `story-and-then` | Two scenes in a row only add (`"link": "and"`): a list, not a story | Parker and Olson's And, But, Therefore (practice) |
| `story-unprimed-reveal` | A turn lands with no question open before it: no earlier `opens`, and none at least a second before it in its own scene | Curiosity before an answer improves memory of it (Gruber et al. 2014) |
| `story-no-protagonist` | A story of 20 s or more carries nothing (subject, hero or 3D subject) across scenes | Transportation needs identifiable characters (van Laer et al. 2014, meta-analysis) |
| `story-arc-flat` | With three or more `feeling`s in 30 s or more, they never fall below the start, or never recover | The common arcs fall before they rise (Reagan et al. 2016) |
| `pacing-monotone` | Four or more scenes all within 12% of the same length (any film, with or without a story) | Shot lengths in films mix long and short (Cutting et al. 2010; a correlation, not a measure of quality) |

`film:review` adds **`text-moving-while-read`**. It compares each reviewed frame with the frame three later in the same scene, and warns when a fully visible line has moved against the rest of the text. Rules:

- Motion shared by all text (a push, drift or shake) is removed first.
- Labels that follow a moving subject carry `data-km-text-tracks` and are left out: objects in an object story, the 3D recipes' labels.
- Scenes whose look shakes or floats the camera are skipped.

These checks are warnings from research on stories. They are not a formula. A person can accept a film that has none of them.

## Subjects and the match transition

A **subject** is a thing with a name and a place on screen. An object story names its objects itself. Another scene declares them:

```json
"subjects": { "bill": { "of": "image", "region": { "x": 0.31, "y": 0.11, "width": 0.39, "height": 0.8 } } }
```

`of` is `frame` (fractions of the frame, the default), `image` (fractions of the scene's first image, which needs a `width` and a `height`), or `object` (fractions of the object with that ID, to tighten its box).

When two adjacent scenes hold the same subject ID, the checker proposes a match (`film-match-available`). `{ "kind": "match", "subject": "bill" }` then carries the subject across the cut. Both scenes push in to a meeting box where each one still covers the frame, they dissolve there, and the new scene pulls out. Give the incoming object story a `carried` arrangement, so its object is on stage at its first frame. Reduced motion keeps the dissolve and drops the travel.

## Sound accents

```json
"audio": { "lanes": [], "accents": { "kit": "assets/sfx" }, "licenseRef": "original-synthesized-kumiki-kit" }
```

`npm run film:sound-kit -- <folder>` makes an original kit: `whoosh.wav`, `riser.wav`, `hit.wav`, `ping.wav` and `kit.json`. `film:render` then places a whoosh that peaks at the middle of each transition, and on each turn the sound that its `story.turnAccent` asks for: `soft` (the default) is one quiet tone for a dry twist, `impact` is a riser and a hit for a big reveal, and `none` is silence. `kit.json` states where each sound peaks, so the peak lands on its frame. You can replace the files with licensed sounds. Keep `kit.json` true, and set `licenseRef`.

`npm run film:sound-kit -- <folder> --preset=neutral` makes a kit of designed CC0 sounds instead of plain tones, with physical sounds for `audio.cues`. See [Sound Catalog](sound-catalog.md).

A cue can sit in a space. Its sound must come from a catalog kit:

```json
"cues": [{ "id": "far", "sound": "water-drop", "at": "ice/reveal", "room": "cave", "pan": -0.4, "distance": 6 }]
```

## Beds and mastering

`audio.beds` lays recorded ambience under the film. `audio.master` finishes the mix for a platform.

```json
"audio": {
  "lanes": [],
  "beds": [{ "id": "fall", "sound": "bed-waterfall-near", "startFrame": 84, "durationFrames": 130, "gainDb": 2, "fadeSeconds": 1.2 }],
  "master": { "profile": "youtube", "duckDb": 10 }
}
```

Set `"limit": true` for a mix of real recordings. A bed can also take `lowpassHz`, to sound muffled, and `reverse`. A film that misses its target stops at render, before any frame is drawn. `film:render` writes `mix-report.json`. See [Sound Design](sound-design.md).

## Ray worlds

A scene can be a ray-traced world, with `"recipeId": "ray-world"`. See [Ray Worlds](ray-world.md).

## 3D shots

A scene can be one of the React Three Fiber recipes, with `"recipeId": "shot-3d"`. [`examples/film/device-journey-3d.film.json`](../../examples/film/device-journey-3d.film.json) is a complete film: particles gather into a phone, its screen comes alive, then the camera steps through the screen into a meadow.

```json
{ "id": "turn", "recipeId": "shot-3d", "durationFrames": 210, "content": {
  "shot": "hero-turn", "subject": "phone", "studio": { "look": "strip" },
  "label": "A phone turns to its three-quarter view under strip lights.",
  "spec": { "yawFrom": -80, "yawTo": -32, "pitch": 8, "settleFrame": 72, "claim": { "text": "Built to be held", "enter": 80 } } } }
```

- **`shot`** names the recipe. **`spec`** is that recipe's own spec, without `durationFrames`, which comes from the scene. The [studio](studio-recipes.md) and [light](light-recipes.md) specs describe every field. The schema completes them in an editor.

  | `shot` | Recipe | Also needs |
  |---|---|---|
  | `hero-turn` | `ProductHeroTurn` | `subject`, optional `action` |
  | `light-sweep` | `LightSweep` | `subject`; the studio look is the sweep's own |
  | `race` | `TrackPass` | the renderer's `race` assets (a car and the track); see [Race Recipes](race-recipes.md) |
  | `part-spotlight` | `PartSpotlight` | `subject` |
  | `exploded-view` | `ExplodedView` | `subject` |
  | `finish-compare` | `FinishCompare` | `subject`, one `finishes` entry (`body`, `trim`) per pane |
  | `two-angle` | `TwoAngleProof` | `subject`, optional `action` |
  | `screen-alive` | `ScreenComesAlive` | `subject`, `screen`: `weekly-energy` |
  | `step-inside` | `StepInside` | `subject`, `world`: `meadow` |
  | `many-into-one` | `ManyIntoOne` | `subject` |
  | `light-through-water` | `LightThroughIt` | |
  | `baked-flythrough` | `RealLightFlythrough` | `set`: `slot-canyon` |
  | `captured-place` | `CapturedPlace` | `capture`: `clock-tower`. Its camera path and credit are the defaults, and `spec` may override them |
  | `physics-point` | `PhysicsPoint` | `bake`: `domino-chain` or `stack-compare` |
  | `shadow-reveal` | `ShadowReveal` | `spec.silhouette` |
  | `chain-reaction` | `ChainReaction` | `spec.links` (3 to 8); the bake for that count |
  | `physical-data` | `PhysicalData` | `spec.series` and `spec.unitValue` |
  | `tabletop-story` | `TabletopStory` | `spec.objects` and `spec.beats` |
  | `scale-journey` | `ScaleJourney` | `spec.stops`, smallest first |
  | `inside-out` | `InsideOut` | `subject` with a cutaway (`phone`) |
  | `diorama-journey` | `DioramaJourney` | `spec.stations` |

  The last seven are the [story scenes](story-scenes-3d.md). [`savings-3d.film.json`](../../examples/film/savings-3d.film.json) and [`payment-3d.film.json`](../../examples/film/payment-3d.film.json) use them.

- **`subject`** is `phone` or `laptop`, the crafted assets in `technology-3d.ts`. Parts and actions are checked against `SHOT_3D_SUBJECTS` in `film-3d.ts`, so a misspelt part fails at `film:check` with the list of real ones. A test keeps that table in step with the assets.
- **`label`** is required: a text alternative for the shot. **`studio`** sets `look` (`softbox`, `strip`, `rim`, `high-key`) and `palette`. **`tone`** is `dark-on-light` for pale light, and the checker warns when it is missing.
- **Moments.** Each shot names its own moments, so `audio.cues` and `story.turnAt` can land on them, as `<scene id>/<moment>`:

  | Shot | Moments |
  |---|---|
  | `hero-turn` | `settle`, `claim`, `action` |
  | `light-sweep` | `sweep`, `cross` (transient: the review samples the moment itself), `settle`, `claim` |
  | `race` | `pass` (transient), `title` |
  | `part-spotlight` | `push`, `close`, `label` |
  | `exploded-view` | `explode`, `apart`, `title`, `reassemble`, `together` |
  | `screen-alive` | `push`, `close`, `ui`, `title`, `pull` |
  | `step-inside` | `push`, `close`, `cross`, `title` |
  | `many-into-one` | `gather`, `form`, `title` |
  | `light-through-water` | `drop`, `title` |
  | `physics-point` | `settled`, `label-<group>`, `title` |
  | `shadow-reveal` | `question`, `reveal`, `aligned`, `answer` |
  | `chain-reaction` | `link-1` … `link-n`, `push`, `settled`, `title` |
  | `physical-data` | `drop`, `stacked`, `title` |
  | `tabletop-story` | each beat's `id`, and `<id>-set` when its objects land |
  | `scale-journey` | each stop's `id` as the camera arrives, `title` |
  | `inside-out` | `cut`, `open`, `label-1` … `label-n`, `title` |
  | `diorama-journey` | each station's `id` as the traveller arrives, `title` |

  Other shots name `title`, and `moments` adds your own. A story's turn lands by default on the moment the shot exists for, such as `form`, `cross`, `apart` or `settled`.
- **Checks.** `film:check` runs each recipe's craft check (`inspectStudioShot`, `inspectLightShot`, `inspectPhysicsShot`, `inspectFlythrough`, `inspectCapturedPlace`) in Node, without three.js. Text too short to read, or a title before the physics settles, is an error with a path into `spec`.
- **Review.** `film:review` draws each shot's opening, each moment once it has settled, and its end.
- **Drift and reduced motion.** `drift` does not apply, because each shot moves its own camera. Under reduced motion a shot shows its last frame, which every recipe builds as a still, readable picture.
- **Rendering.** `film:render -- <file> --gl=gpu` draws 3D shots on the GPU. Software WebGL draws them too, but slowly. A 90-frame 960 × 540 draft of the example took 17 s on an M4.

### In your own app

Install `film-3d-stage` and pass its renderer to `FilmStage`:

```tsx
import { createShot3dRenderer } from "@/components/video/film-3d-react";
const renderShot3d = createShot3dRenderer({ meadow: { grass, grassNormal, dirt, dirtNormal } });
<FilmStage film={film} frame={frame} renderObject={renderObject} renderShot3d={renderShot3d} />
```

- The renderer bundles no asset files. Give the URLs of the files your films use: `meadow`, `bakedSets`, `captures`, `physics` and `woods`.
- `capturedPlace` takes `CapturedPlace` from `splat-stage`. It is the only shot that needs Spark, so other films never install it.
- A shot whose files are missing fails with their name.
- The capture page (`src/film/capture.tsx`) loads the 3D renderer only for a film that has a 3D shot, and each set's files only for a film that uses that set.
- The film checker does not install the recipes. It needs only `studio-shot-model`: their specs and checks, with no npm dependencies.

### Limits

- The subjects are the phone and the laptop, and the sets are those listed above. A new subject needs an entry in `SHOT_3D_SUBJECTS` and in the renderer. A glTF product is not a subject yet.
- `tabletop` takes photographed walnut for a tabletop story's table, and `chainBakes` the growing-domino bakes, both given to `createShot3dRenderer`.
- `screen-alive` has one screen, `weekly-energy`, from `screen-paints.ts`.
- During a transition two 3D scenes draw at once, in two WebGL contexts.

## Looks

A film can name a **look**: how it feels, as explicit numbers for grade, film or video texture, cadence, camera, a 3D lens and lighting mood, type and sound.

```json
"look": { "preset": "warm-35mm", "mood": ["nostalgic"] }
```

- A scene's `look` merges over the film's, for a grade that changes with the story.
- `--look=<preset>` and `--mood=<a,b>` on `film:check`, `film:review` and `film:render` try a film in another look without editing it.
- Twelve presets, eight moods and the checks are in [Film Look](film-look.md).

## Brand, cards and ads

A film can carry a **brand** (a name, a colour, an optional mark, one call to action and a corner bug), and **card** scenes, `"recipeId": "card"`:

- a hook headline;
- a numbered list;
- a before-and-after or myth-and-fact versus;
- a quote with a rating;
- the end card.

```json
"brand": { "name": "Brand A", "color": "#2f6bff", "cta": { "text": "Try it free" }, "bug": true },
"scenes": [{ "id": "hook", "recipeId": "card", "durationFrames": 72, "content": { "card": "headline", "text": "Your budget leaks every week", "emphasis": "leaks" } }]
```

When a film has a brand, `film:check` adds the ABCD ad checks: a hook within 3 s, the brand within 5 s, an end card with a call to action, captions for narration, and a vertical ad of 60 s or less. `npm run film:ad -- <brief.ad.json>` writes a whole ad from a short brief in one of six formats. See [Ad Formats](ad-formats.md).

## Speed ramps

Any scene can take a `speed`: it plays `source` frames of its content in its own `durationFrames`. Practice behind it (doc 32, §7):

- **Fast, slow, fast**, with a "ramp and hold": about 1.5 s of near-stillness, so the product registers.
- **Ramps into and out of a cut**, which hide the join inside one fast move.

```json
"durationFrames": 120,
"speed": { "source": 144, "holds": [{ "at": 72, "frames": 42 }], "exit": 10 }
```

| Field | Meaning |
|---|---|
| `source` | Content frames. The recipe, its moments and its checks are timed in these. |
| `holds` | Near-still moments: a content frame or one of the scene's moments (`"settle"`), and output frames to hold. |
| `slow` | Speed during a hold. Default 0.08. |
| `ramp` | Output frames between fast and slow. Default 8. |
| `enter`, `exit` | Ramp out of the previous cut and into the next over these frames, at 2.5× the baseline. Pair with a cut or a whip. |

**How the ramp is solved.**

- The speed is a baseline rate with smooth dips for holds and smooth boosts at the ends.
- The baseline and each hold's place are solved so the content fits exactly and each hold is centred on its moment (`film-speed.ts`).

**Timing.**

- **Moments.** They land where the ramp puts them, so captions, `audio.cues`, the story's turn and review frames follow the ramp.
- **What does not move.** The scene's drift and its effects keep film time.
- **Reduced motion.** The content plays at an even speed.

**Checks.**

| Code | Severity | When |
|---|---|---|
| `speed-hold-moment` | error | An unknown moment |
| `speed-hold-range` | error | A hold outside the content |
| `speed-impossible` | error | Holds that leave no time (over 12×) |
| `speed-hold-placement` | error | A hold that cannot be centred on its moment |
| `speed-fast` | warning | Over 4× outside the holds |
| `speed-hold-short` | warning | A hold under 1 s |
| `speed-text-short` | warning | A ramped 3D shot's text left too little time to read in film time |
| `speed-on-text` | warning | Cards and screen demos played faster than 1.3× |

**Example.** `examples/film/speed-ramp-3d.film.json`:

1. A race car at about 210 km/h races toward a trackside camera, slows almost to a stop as it passes the lens (`"at": "pass"`), and races away, faster, into a whip.
2. A camera car comes out of the cut fast, riding alongside.

The wheels' motion blur follows the ramp: `FilmStage` gives each 3D shot its playback `rate`.

**Storybook, Video production → Speed Ramp:**

- **Compare** plays it beside the same content at an even speed in the same length, on one clock. Each panel's timeline shows the holds and the cut ramp, and a content-time ruler: a tick for every 6 content frames, close where the content races and far apart where it holds. A live readout shows the speed.
- **Graphs** draws each ramp as a time map.

A ramp multiplies the content's own motion. Ramping into a cut needs a shot that is still moving at its end; a shot that eases to a stop gains nothing from `exit`.

## Screen demos

A `"recipeId": "screen-demo"` scene shows real software being used, from screenshots or live React UI, with a choreographed cursor, a camera that follows the work, and callouts:

```json
{ "id": "demo", "recipeId": "screen-demo", "durationFrames": 460, "content": { "label": "…", "screen": { "width": 1280, "height": 800 },
  "source": { "kind": "ui", "ui": "tasks" }, "targets": { "add": { "x": 1067, "y": 141, "width": 60, "height": 40 } },
  "steps": [{ "do": "click", "target": "add", "set": { "added": true }, "callout": "Added" }] } }
```

- Each step is a named moment for captions, sounds and the story.
- The camera crops in for portrait outputs.
- Live UI needs `renderScreen` on `FilmStage`. Film files name screens registered in `src/film/film-screens.tsx`.

See [Screen Demo](screen-demo.md), and `examples/film/screen-demo-live.film.json` and `screen-demo-screenshots.film.json`.

## Shader effects

A scene takes up to two shader effects in `fx`. See [Shader FX](shader-fx.md). `film:render` and `film:review` draw them. A `FilmStage` in your own app needs the `renderFx` prop.

A transition takes one effect in `fx`, with `"layer": "transition"`. It covers the frame at the midpoint, so the two scenes swap unseen. It needs a `dissolve`, `wipe` or `whip` of at least 8 frames.

```json
"transition": { "kind": "dissolve", "durationFrames": 28, "fx": { "id": "melt", "effect": "grain-gradient", "layer": "transition" } }
```

## Diagnostics

`compileFilm` returns all problems at once. Each one has a JSON Pointer `path`, a `code`, a `message` and, where it can, a `hint`.

```text
ERROR /scenes/0/durationFrame [schema-unknown-key] Unknown field "durationFrame".
  fix: Did you mean "durationFrames"? Known fields: id, durationFrames, transition, ...
```

Shape problems point to the exact field. Recipe rules point to the `content` of the scene, because the recipe validators do not track paths. `listSceneTemplateProblems` returns every recipe rule that fails, where `validateSceneTemplate` stops at the first.

A compile without a browser cannot measure text, so it treats every caption as a fit. The capture page compiles again with loaded fonts, and that result decides. `film:render` and `film:review` stop on it before they draw a frame.

## Review

`film:review` draws the opening of each scene, each settled cue, each finished beat, each scene end and each transition midpoint, for each output. It writes:

- `<output>.png`: a contact sheet 3840 px wide, with a label on each frame.
- `frames/<output>-f<frame>.png`: each reviewed frame at output size. Look at these before you accept a film. Some defects do not show on a contact sheet.
- `report.json`: each frame and its problems, with `review.status` set to `not-reviewed`.

The review also measures the pixels of each frame, with no model:

- `text-low-contrast`: the contrast between a text and the hardest 15% of what is drawn behind it is under 3:1. The measure reads the screenshot, so it sees an image, a scrim or an opacity as drawn.
- `frame-mostly-empty`: the box around everything with an edge covers under 30% of the frame.
- `focus-off-hero`: after a strong blur, the point with the most contrast is not on the scene's `hero`. A large plain shape beats text in this measure, as it does for a squinting eye.

All three are warnings. `report.json` holds `content.coverage` and `content.focus` for each frame.

The command exits with an error for `text-collision`, `text-clipped` and `text-outside-frame`. `text-too-small` (under 2.3% of the short side) and `text-outside-safe-area` are warnings. Text under 50% opacity is mid-fade and is not checked. Text wholly outside its clip cannot be seen and is not checked. Glyphs inside a domain illustration are artwork and are not checked. Frames inside a transition are not checked, because two scenes share them.

**The audit reads text boxes only.** It cannot see text inside a canvas, an image or WebGL. It cannot judge contrast, or text on a busy image. It cannot judge quality. A clean report means that the geometry passed. It does not mean that the film is good, so look at the sheet.

## Check seeks

`npm run film:seek -- <file> [--frames=80,4,80,160,4]` seeks in a shuffled order, captures each frame again on a fresh page, and compares the pixels. It also counts WebGL contexts and times each frame. A frame must not depend on what came before it.

## Preview one exact frame

`npm run film:frame -- <file.film.json> --frame=120 [--only=landscape] [--out=dist/film-frame]` compiles the film in the same capture browser as `film:review`, seeks directly to the requested global frame, and saves one full-resolution PNG plus a JSON report containing the existing text, contrast, occupancy and focus checks. It does **not** render a video, process audio, or create a contact sheet. It is intended for checking one correction quickly; use `film:review` for multiple scenes and the full contact sheet.

If the film has multiple outputs, the first declared output is used by default; pass `--only` to pick another. Frames are zero-based and must be within the selected output's `durationFrames`. Transition frames are captured but skip geometry/pixel content checks, just like the regular review. The output is always marked `not-reviewed`: the image still needs human inspection. Requires local Playwright Chromium; the expensive browser capture is not an automatic CI job. Pure frame-selection tests run with `node --test tests/film-frame.test.mjs`.

## Measure a finished video

`npm run video:measure -- <file.mp4> [--format=json] [--max-seconds=600]` makes a **local, advisory** edit-quality report from FFmpeg frame statistics. It reports candidate cuts, shot lengths, still stretches (including the final hold), the first substantial change, opposing whole-frame brightness changes and isolated near-black/near-white frames that could be accidental one-frame dropouts. Inspect the listed timestamps in the source film before making a change; intentional title cards, transitions and flashes can trigger candidates. The command scans at most 600 seconds by default (configurable to 3600); `scope.truncated` says whether the known source is longer than the scan. `--format=json` produces a versioned machine-readable report.

**This is not a WCAG flashing test or an artistic approval.** It measures approximate 8-bit luminance on a scaled whole frame, not spatial regions, true relative luminance or saturated-red transitions. The `flashes.reviewRequired` flag is a conservative screening lead when more than three candidate opposing pairs occur in one second; the command exits nonzero for that finding. A zero exit code **does not** mean the film complies with WCAG 2.3.1. Actual flashing conformance needs an appropriate validated method plus review; see [W3C's explanation](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold). A dissolve or wipe is not a cut in this heuristic; it cannot read text. The pure analyzer has fast synthetic tests in `tests/video-measure.test.mjs`, and actual MP4 scans are local-only, excluded from automatic CI to conserve credits.

## React

```tsx
const result = compileFilm(input, { outputId: "portrait", objectStory: { measure: createStoryTextMeasure() } });
if (result.ok) return <FilmStage film={result.film} frame={frame} renderObject={renderObject} />;
```

`FilmStage` has no clock. It mounts only the scenes that the cut plan shows at the frame. `reducedMotion` replaces moving transitions with their fallback and settles object stories.

## Accessibility

A film is an exported video, so its alt text and captions are the author's content. `FilmStage` honours reduced motion. Scene images keep their `alt`. Captions that `film:render` burns in are not a separate caption track.

## Limits

- Subject-based cuts (`match-cut`, `punch-in`) need subject bounds, so a film file does not offer them.
- An output with a `preset` applies that preset's safe area to each card recipe. A scene can set its own `safeInsets`. Full-bleed recipes own their frame and place their own copy, so the film does not set insets on them. The `question-reveal` letterbox keeps its docked question in the top bar, so `text-outside-safe-area` warnings are expected there.
- Frame state is pure. In a shuffled-seek test, one of six frames differed at about 52 dB, only along edges and only on the first paint of a layer. Recipes that set `will-change: transform` are the likely cause. Exports run in order, so a full export does not depend on it. The cause is not proved.
- A film runs in a Vite server on 127.0.0.1 inside this repository. The registry items run in any React app, but the CLI does not ship with them.
