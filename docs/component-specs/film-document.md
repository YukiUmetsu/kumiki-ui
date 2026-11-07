# Film Document

**Registry items:** `film-document`, `scene-template-examples`, `rendered-text-audit`
**Source:** `registry/video/film-document.ts`, `film-stage.tsx`, `film-schema-check.ts`, `film-document.schema.json`, `scene-template-examples.ts`, `registry/visual/rendered-text-audit.ts`, `rendered-frame-measures.ts`, `scripts/film.mjs`, `scripts/video-measure.mjs`, `scripts/film-sound-kit.mjs`

## Purpose

One JSON file describes a whole film. A person or an agent writes data, not TSX. The file compiles through the compilers that the repository already has: `compileSceneTemplate`, `compileObjectStory`, `compileCutPlan`, `validateCaptionTrack` and `resolveAudioCues`. It adds no renderer, clock or layout engine. Scene art and script stay the author's work.

## Commands

```bash
npm run film:example -- --recipe=cause-effect --out=my-film   # a valid film and its assets
npm run film:check  -- my-film/cause-effect.film.json         # no browser, about half a second
npm run film:review -- my-film/cause-effect.film.json         # dist/film-review/<id>/
npm run film:render -- my-film/cause-effect.film.json         # dist/film/<id>/<output>.mp4
```

`film:example -- --list` shows the recipes with a portable example. A recipe that needs real media has no portable example. Read its catalog entry instead.

`--only=<output id>` selects one output. `--out=<dir>` changes the folder. `film:render` also takes `--frames=<n>`, `--browser=chrome` and `--gl=gpu`. The default draws WebGL in software, which matches on every machine but is slow. A ray world at full quality needs `--gl=gpu`. `film:check` takes `--format=json`.

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

## Measure a finished video

`npm run video:measure -- <file.mp4>` reads any video file and reports its cuts and shot lengths, its still stretches, the time of its first visible change, and its flashes. It fails when one second holds more than three flashes, which is the WCAG 2.3.1 limit. Use it on a rendered film, or on a reference video for a teardown.

It reads the mean of the whole frame. A small local flash can pass. A dissolve or a wipe is not counted as a cut. It cannot read text.

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
