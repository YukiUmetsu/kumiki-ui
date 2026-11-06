# Film Document

**Registry items:** `film-document`, `scene-template-examples`, `rendered-text-audit`
**Source:** `registry/video/film-document.ts`, `film-stage.tsx`, `film-schema-check.ts`, `film-document.schema.json`, `scene-template-examples.ts`, `registry/visual/rendered-text-audit.ts`, `scripts/film.mjs`

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

`--only=<output id>` selects one output. `--out=<dir>` changes the folder. `film:render` also takes `--frames=<n>` and `--browser=chrome`. `film:check` takes `--format=json`.

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
- **`captions`** use film frames, and their timing source is required. An object-story scene draws its own captions, so do not cover it with film captions.
- **`audio`** holds lanes, sounds and links. `assetRef` is relative to the film file. `film:render` mixes them with FFmpeg. A link can name `<scene id>/focus`, `/reveal`, `/resolve` or `<scene id>/<beat id>`.
- **Asset paths** are relative to the film file. Every image needs a `licenseRef`. The exporter refuses an image without one, so the checker reports it first.
- **`art`** in an object story is `finance:<kind>`, `technology:<kind>` or `business:<kind>` in the capture page. An object with no art draws a word card. In your own app, pass `renderObject` to `FilmStage`.

## Diagnostics

`compileFilm` returns all problems at once. Each one has a JSON Pointer `path`, a `code`, a `message` and, where it can, a `hint`.

```text
ERROR /scenes/0/durationFrame [schema-unknown-key] Unknown field "durationFrame".
  fix: Did you mean "durationFrames"? Known fields: id, durationFrames, transition, ...
```

Shape problems point to the exact field. Recipe rules point to the `content` of the scene, because the recipe validators do not track paths. `listSceneTemplateProblems` returns every recipe rule that fails, where `validateSceneTemplate` stops at the first.

A compile without a browser cannot measure text, so it treats every caption as a fit. The capture page compiles again with loaded fonts, and that result decides. `film:render` and `film:review` stop on it before they draw a frame.

## Review

`film:review` draws each cue, finished beat, scene end and transition midpoint, for each output, and it writes:

- `<output>.png`: a contact sheet with a label on each frame.
- `report.json`: each frame and its problems, with `review.status` set to `not-reviewed`.

The command exits with an error for `text-collision`, `text-clipped` and `text-outside-frame`. `text-too-small` and `text-outside-safe-area` are warnings. Text under 50% opacity is mid-fade and is not checked. Frames inside a transition are not checked, because two scenes share them.

**The audit reads text boxes only.** It cannot see text inside a canvas, an image or WebGL. It cannot judge contrast, or text on a busy image. It cannot judge quality. A clean report means that the geometry passed. It does not mean that the film is good, so look at the sheet.

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
- Scene recipes do not read the platform safe area. Full-bleed recipes turn `safeInsets` into padding, so the film does not set it for you. Expect `text-outside-safe-area` warnings, and set `safeInsets` on a scene if you need them gone.
- Frame state is pure. In a shuffled-seek test, one of six frames differed at about 52 dB, only along edges and only on the first paint of a layer. Recipes that set `will-change: transform` are the likely cause. Exports run in order, so a full export does not depend on it. The cause is not proved.
- A film runs in a Vite server on 127.0.0.1 inside this repository. The registry items run in any React app, but the CLI does not ship with them.
