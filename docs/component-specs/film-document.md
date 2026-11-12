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
- A **transition** says how a scene arrives: `cut`, `dissolve`, `wipe`, `whip`, `match` (a subject carried across; see [Subjects](#subjects-and-the-match-transition)) `container` (a tile grows into the scene; see [Container transform](#container-transform)), `pass-by` (the cut hides behind a foreground; see [Pass-by](#pass-by)) `dip` (down to a colour and up again; see [Dip and fade](#dip-and-fade)), `flash` or `burst` (see [Flash cut, burst and flip](#flash-cut-burst-and-flip)), or `shape` (the next scene opens through a growing shape; see [Shape wipe](#shape-wipe)). Its frames overlap the incoming scene, so a film lasts the sum of its scenes.
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

### Container transform

When one thing in a scene *becomes the place* of the next (a row of a contents card opening into its chapter, a tile opening into its detail), `{ "kind": "container", "subject": "item-2" }` grows the next scene out of it. The tile lifts as a raised surface, glides and grows to fill the frame on an emphasized easing (cubic-bezier(.4, 0, .05, 1): a gentle lift, a quick middle, a long settle), and its corners square off as it lands. The incoming scene rides inside it, cropped like a cover image, and fades through once the surface has hidden the tile's own words. The outgoing scene stays whole under a deepening scrim. Interface motion systems use this move when an element and its destination are one thing; it tells the viewer where the new scene came from, so a contents card stays a map ([doc 32](../32-professional-video-recipes-research.md), P1).

- **Subject.** A list card's rows are `item-1`, `item-2`, … and are measured where they are drawn, so nothing is placed by hand. Any other scene names the tile in its `subjects`; a scene that tags the element with `data-km-film-subject` is measured instead of using the declared box.
- **Options.** `durationFrames` (default 22), `color` (the surface; default a raised surface of the film's appearance), `radius` (the tile's corners as a fraction of the frame's short side; default 0.016).
- **Checks.** `film-container-subject` (error): a subject the scene before does not have. `film-container-timing`: under 0.4 s reads as a jump, over 1.2 s as a slow zoom. `film-container-large`: the tile already covers half the frame. `film-container-small`: under 3% of the short side. `film-container-radius` (error): outside 0 to 0.1.
- **Reduced motion** keeps a plain dissolve of the same length.

Example: [`examples/film/container-transform.film.json`](../../examples/film/container-transform.film.json), a two-row contents card whose second row opens into the solar chart morph. Storybook, **Video production → Container Transform**, plays it beside a plain dissolve of the same length and the reduced-motion version.

Evidence (2026-11-09): `tests/film-document.test.ts`, "container transform" (measured rows, declared boxes, every check, the example). Frames 167–191 rendered at 960×540 and reviewed: a first draft on the standard easing (cubic-bezier(.2, 0, 0, 1)) moved 30% of the way by the third frame, so the tile jumped off the list; the emphasized curve lifts it visibly by frame 4 and leaves the long part of the move for the settle.

### Whip

`{ "kind": "whip", "direction": "left" }` swings from one scene to the next as one camera move: both scenes move together edge to edge, eased in and out, smeared by motion blur in the middle, and grown slightly while blurred so the blur's faded edges stay out of frame. A scene is exactly one frame big, so the next one is carried in behind the last rather than the camera panning off the edge into the empty stage. Default 10 frames; reduced motion keeps a dissolve.

### Zoom through

`{ "kind": "zoom", "subject": "glow", "edge": "soft" }` pushes the camera into a region of the outgoing scene, and the incoming scene is inside it: a photograph inside a screen inside a room, or daylight through a wall of ice (doc 32, P2 "Infinite zoom"). The camera's scale moves in log space, eased at both ends, while the region slides to the frame's centre, until the region covers the frame.

- **`edge: "hard"`** (default) keeps the incoming scene inside the region's box, scaled with it and clipped to it: for a screen, a window or a frame.
- **`edge: "soft"`** keeps the incoming scene whole and shows it through a feathered circle centred on the region, which grows past the frame's corners as it lands: for light, water or a glow. A shrunken scene with a feathered edge would still show its own straight edges, so the soft edge never shrinks it.
- **Subject.** A declared subject, a list card's row, or an annotated picture's mark (its detail is tagged where the camera puts it). Clear a mark first with its `until`, or the pen's circle swells past the camera.
- **Checks.** `film-zoom-subject` (error). `film-zoom-timing`: under 0.6 s is a jump cut with a blur; over 2.5 s a crawl. `film-zoom-deep`: a declared region magnified more than 8×, where a picture softens. Default length 36 frames.
- **Reduced motion** keeps a plain dissolve of the same length.

Example: [`examples/film/zoom-through.film.json`](../../examples/film/zoom-through.film.json): inside an ice cave, the camera pushes into a wall glowing with daylight and comes out at Dynjandi, whose thesis waits (`titleAt`) until the scene has landed. Storybook, **Video production → Zoom Through**, compares the soft edge, the hard edge and a dissolve.

Evidence (2026-11-09): `tests/film-document.test.ts`, "zoom through". Frames 150–252 rendered at 960×540, and the zoom at 1920×1080 and 1080×1920. Two drafts failed review: the hard edge read as a photograph pasted onto the ice, and a feathered edge on the shrunken scene still showed the scene's straight edges as it grew, so the soft edge became a circle on the whole scene. The incoming scene's title was cut in half by the growing circle, so annotated pictures took `titleAt`.

### Pass-by

`{ "kind": "pass-by", "direction": "left" }` hides the cut behind something close to the lens: a column, a wall, a passer-by. A dark foreground, far out of focus and shaded round, crosses the frame at a steady speed. The incoming scene is revealed along its centre, so the seam is always behind it, and both scenes drift the way it travels at a sixth of its speed, as they would past a column on a moving camera. A run of scenes joined this way reads as one take (a "stitched oner"; doc 32, P2).

- **Options.** `direction` is the way the foreground moves, `"left"` (default) or `"right"`. `width` is the foreground's width as a fraction of the frame, 0.2 to 0.8 (default 0.42). `durationFrames` defaults to 14. `color` defaults to a near-black.
- **The foreground** is drawn with gradients, not a blur filter. Its edges are smoothstep ramps of opacity as wide as its defocus plus its motion over half a frame (a 180° shutter). A large blur filter bands in software rendering and would leave the core translucent over the seam.
- **Checks.** `film-pass-by-direction` (error): not sideways. `film-pass-by-width` (error): narrower and the eye catches the seam beside it; wider and it is a wipe to black. `film-pass-by-timing`: under 0.25 s it flashes past; over 0.9 s the viewer studies the foreground and sees the trick.
- **Craft.** It works between scenes whose cameras move, and best when they move the same way. Two still frames joined by a pass-by read as a wipe.
- **Reduced motion** keeps a plain dissolve of the same length.

Example: [`examples/film/pass-by.film.json`](../../examples/film/pass-by.film.json), a flight up a river valley joined to a waterfall. Storybook, **Video production → Pass-By**, plays it beside a hard cut and a dissolve, at full or quarter speed.

Evidence (2026-11-09): `tests/film-document.test.ts`, "pass-by". Frames 119–135 rendered at 960×540 and reviewed: the seam stays behind the foreground for the whole pass. A first draft drew the foreground with an SVG blur; it banded into blocks and let the seam show through, so the edges are now gradients.

### Dip and fade

`{ "kind": "dip" }` takes the picture down to a colour, holds it, and brings the next scene up out of it. Use it for a jump in time or place, or a chapter: a dissolve says two pictures belong together, a dip says something has passed between them. It can carry one line on its hold:

```json
{ "kind": "dip", "text": "Two hours west" }
{ "kind": "dip", "color": "#ffffff", "holdFrames": 4 }
```

- **Length.** The hold is 6 frames, or the line's reading time (0.8 s plus three words a second). The dip adds 8 frames down and 8 up, so a plain dip is 22 frames. `durationFrames` and `holdFrames` override them.
- **Linear light.** The veil's opacity follows `1 - (1 - t)^(1/2.2)`, so light falls off evenly and mid-tones do not go muddy on the way down.
- **The line** is set centred in the film's display type, near-white on a dark colour and near-black on a light one. It comes up and goes down within the hold.
- **Quiet.** A dip gets no whoosh accent.
- **Reduced motion** keeps the dip: it is not motion.

The film itself can open up from a colour and end on one: `"fade": { "in": 18, "out": 24, "color": "#000000" }`. The fade covers captions too, so the film ends on a clean colour.

| Code | Severity | What it catches |
|---|---|---|
| `dip-color`, `dip-hold`, `dip-text`, `dip-frames` | error | A colour that is not `#rrggbb`, a broken hold, an empty line, or a dip too short to fade |
| `dip-timing` | warning | Each fade under about 4 frames (a flash) or over 0.6 s (the picture lingers half-dark) |
| `dip-text-time`, `dip-text-long` | warning | A line held shorter than its reading time, or more than eight words |
| `dip-hold-long` | warning | An empty colour held over 1.5 s, or a line held 1.5 s past its reading time |
| `dip-white-long` | warning | A light colour held over 0.5 s: a bright frame tires the eye |
| `dip-hides-start` | warning | The incoming scene's clock runs under the colour, so a moment or an annotated thesis landing there is never seen. Set `titleAt` later |
| `fade-color`, `fade-frames` | error | A fade's colour, or a fade outside 0 to 4 s, or fades longer than the film |
| `fade-short`, `fade-loop` | warning | A fade under 0.2 s, or a fade out in a looping film |

Example: [`examples/film/dip.film.json`](../../examples/film/dip.film.json), an ice cave, a dip with "Two hours west", then Dynjandi; the film fades in and out. Storybook, **Video production → Promo Moves → Dip**, plays it beside a plain dip, a dip to white, a dip to a brand colour and a dissolve of the same length.

Evidence (2026-11-11): `tests/film-document.test.ts`, "dip and fade". Frames across the dip and both fades rendered at 960×540 and reviewed. The first draft let the waterfall's thesis land under the black, so `dip-hides-start` was added and the example's `titleAt` moved after the dip.

### Flash cut, burst and flip

**Flash cut.** `{ "kind": "flash" }` lands the cut on two frames of white, and the next scene burns back through it over four frames, over-exposed for a moment, like a camera flash. `color`, `frames` (1 to 4) and `fadeFrames` (0 to 12) change it. Use it on a peak: a drop in the music, the turn of a montage.

**Burst.** `{ "kind": "burst", "inserts": [...], "framesEach": 2 }` puts 2 to 8 very short inserts, 2 to 6 frames each, between two scenes. An insert is a still of one of the film's scenes, `{ "scene": "cave", "at": 60 }` (a content frame or a moment; the middle of the scene by default), or a licensed picture, `{ "image": { "id", "src", "alt", "licenseRef", "width", "height" } }`. Pictures go into the export manifest like any image.

**Flip.** A card takes `"flips": [54, 62, 70, 78]`: at each card frame it cuts to the opposite ground, dark to light and back. Words and layout stay; only ink and ground swap. A card over a photograph does not flip.

- **Length.** A flash and a burst take their length from what they show; `durationFrames` is refused.
- **Quiet.** Neither gets a whoosh accent.
- **Reduced motion.** A flash becomes a plain cut. A burst holds its first insert. Flips stay: they are not motion, and they are capped below.
- **Safety.** A flash is a pair of opposing changes in light. A film may flash at most three times in any second (WCAG 2.3.1). `film:check` counts flash cuts and flips (`flash-rate`, an error). A burst's pictures are measured on the rendered frames by `film:review`, frame by frame across each flash and burst window, with the same rule (`flash-rate`, an error in the review).

| Code | Severity | What it catches |
|---|---|---|
| `flash-color`, `flash-frames`, `flash-duration` | error | A colour that is not `#rrggbb`, a flash held over 4 frames (that is a dip) or burning back over 12, or a length of its own |
| `burst-frames`, `burst-inserts`, `burst-insert`, `burst-licence` | error | Inserts under 2 or over 6 frames, fewer than 2 or more than 8 inserts, an unknown scene or moment, or a picture without a rights record |
| `burst-long`, `burst-unrelated`, `burst-hides-start` | warning | A burst over 0.9 s, inserts that come from none of the film's scenes, or a moment of the incoming scene hidden under the inserts |
| `card-flip`, `card-flip-close`, `card-flip-photo` | error, warning | A flip outside the card or out of order; flips under 5 frames apart; flips on a photo card |
| `flash-rate` | error | More than three flashes in any second |

Example: [`examples/film/flash.film.json`](../../examples/film/flash.film.json): a flipping title card, two flash cuts between photographs, then a burst of four inserts into the last scene. Storybook, **Video production → Promo Moves → Flash Cut, Flash Burst, Polarity Flip**, plays each beside the hard cut or still card it replaces.

Evidence (2026-11-11): `tests/film-document.test.ts`, "flash cut, burst and polarity flip". Frames across each move rendered at 960×540 and reviewed. `film:review` on the example at draft size: 0 errors; on a copy whose burst alternated a dark card and a bright photograph every 2 frames, it reported `flash-rate` at 4.5 flashes a second.

### Shape wipe

`{ "kind": "shape", "shape": "circle", "subject": "glow", "color": "#ffffff" }` opens the next scene through a growing shape: an iris `circle`, a `diamond`, a `star`, a `square`, or the brand's `mark`. It grows from the centre of a subject of the outgoing scene (declared in its `subjects`), or from the frame's centre, slow at first and fast into the corners, and its last frame covers the far corner. `color` draws a thin line on its edge so the shape reads as designed. Default 16 frames.

- **Mark.** `"shape": "mark"` grows the film's `brand.mark`, used as a mask. A picture's outline cannot be measured, so over the last third the rest of the incoming scene fades in around the mark, and the wipe always ends on the full scene. Use a solid silhouette with a transparent background.
- **Reduced motion** keeps a dissolve of the same length.

| Code | Severity | What it catches |
|---|---|---|
| `shape-unknown`, `shape-color` | error | A shape that is not listed, or an edge colour that is not `#rrggbb` |
| `shape-subject` | error | A subject the scene before does not declare |
| `shape-mark` | error | A mark wipe in a film with no `brand.mark` |
| `shape-timing` | warning | Under 8 frames (it pops open) or over 30 (the viewer studies the old scene through it) |

Example: [`examples/film/shape-wipe.film.json`](../../examples/film/shape-wipe.film.json): an iris from the daylight in an ice cave, a diamond from the centre, then the water-drop mark into the end card. Storybook, **Video production → Promo Moves → Shape Wipe**, compares straight wipes and dissolves.

Evidence (2026-11-11): `tests/film-document.test.ts`, "shape wipe". Frames rendered at 960×540 and reviewed. The first mark draft faded the outgoing scene out and left the stage's black around the drop on the last frame; the incoming scene now fades in around the mark instead.

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

## Loop

`"loop": { "frames": 18 }` makes a film loop, as Shorts and Reels replay on their own. Over its last `frames` (default 12, 6 to 45), the first scene's opening frame dissolves in on top, so the film's last frame is its first and the replay starts on the picture it ends on. It is a dissolve, so reduced motion keeps it.

- **Checks.** `film-loop-frames` (error): outside 6 to 45 frames, or longer than the last scene. `film-loop-long`: a film over 60 s rarely replays on its own. `film-loop-end-card`: the loop dissolves the end card's call to action into the opening.
- **Sound** does not loop with it: the beds and cues end as authored.

Example: [`examples/film/loop.film.json`](../../examples/film/loop.film.json), the annotated Dynjandi as a vertical Short. Evidence (2026-11-09): `tests/film-document.test.ts`, "loop ending"; frames 461–479 and 0 rendered at 540×960, and the last frame measured identical to the first (PSNR infinite).

## Cold open and playing a stretch

`coldOpen` opens the film on a few seconds of its own climax, then a title, then the story from its start:

```json
"coldOpen": { "scene": "chain", "at": 340, "frames": 90, "title": "How did it come to this?" }
```

- **The flash-forward** replays the named scene, ending on `at` (one of its moments, or a content frame) after `frames` (3 s by default). It ends *on* the moment, a cliffhanger cut, so it raises a question rather than answering it.
- **The title** is a headline card, as long as its reading time.
- **The story.** The replay opens a question (`cold-open`) and the climax scene closes it when it plays in order, so the story checks see the loop the cold open creates. The replay carries no other story.
- **Why.** Curiosity before an answer improves memory of the answer and of what comes with it (Gruber et al. 2014; doc 32, §12).

| Code | Severity | What it catches |
|---|---|---|
| `cold-open-spoils` | warning | The flash-forward shows the scene's turn: it gives the answer away |
| `cold-open-first`, `cold-open-early` | warning | It replays the first scene, or one from the first half: not a climax |
| `cold-open-long`, `cold-open-short` | warning | Over 6 s (retelling, not teasing) or under 1.5 s (a flicker) |
| `cold-open-scene`, `cold-open-moment`, `cold-open-ramped` | error | An unknown scene or moment, or a scene that already ramps its speed or plays a stretch |

Diagnostics inside the expanded film point back to the author's scenes; the replay and title report under `/coldOpen`.

**`play`** is the building block, and any scene can use it: `"play": { "from": 100, "frames": 90 }` plays 90 frames of the scene's content from content frame 100. The content is still compiled, timed and checked at its full `durationFrames`, so a 3D shot's motion is the same as in the whole scene; moments outside the stretch leave the film. It is a time map like a speed ramp, so a scene takes one or the other (`film-play-speed`), and the stretch must lie inside the content (`film-play-range`).

**Example.** [`examples/film/cold-open.film.json`](../../examples/film/cold-open.film.json) is the savings film with a cold open: three seconds of the four dominoes being tipped and falling, cut as the last goes down, then "How did it come to this?", then the film from its first scene.

## Motion charts

A `"recipeId": "motion-chart"` scene is a guided motion chart: bubbles over time, and before each event a hold with a cue that says what to watch, the rest dimmed and the subject ringed. See [Guided Motion Chart](motion-chart.md).

## Annotated pictures

An `"recipeId": "annotate"` scene makes an argument on a picture: the camera stops on each detail, a pen circles, points at, underlines or measures it, and a few words sit beside it while the rest of the frame dims. Each mark is a moment. See [Annotated Picture](annotate.md).

## Title sequences

A `"recipeId": "title-sequence"` scene opens a film on one symbol in cut paper, its pieces arriving on twos, then lays the title in word by word. See [Title Sequence](title-sequence.md).

## Footage, cast and model turns

- **Footage** (`"recipeId": "footage"`): a real clip, frame-exact through the browser video adapter, cover-fitted under a slow push (`push`, default 1 to 1.06), with `from`, `rate`, `focus` and optional words (`title`: lands word by word over a soft shade, top, middle or bottom). Prepare clips as VP9 WebM with a keyframe on every frame (`ffmpeg -c:v libvpx-vp9 -g 1`) so each frame seeks exactly. Checks: `footage-video`, `footage-rate`, `footage-push` (errors); `footage-licence`, `footage-runs-out`, `footage-title-short`, `footage-title-long`.
- **Cast** (`cast` on any scene): characters that perform over the scene: where their feet stand, their height, how they arrive (pop, or slide from a side or below), when they leave, and cues (an action, an expression, speech frames). FilmStage gives each a box inside the scene's layer, so transitions carry them with their scene; the host draws them with `renderCast`. Kumiki's capture page draws Pip and Quill from the character fixtures (`src/film/film-cast.tsx`). Check: `film-cast`.
- **Model turn** (`"shot": "model-turn"`): a licensed glTF, loaded by the host into the 3D renderer's `models` (the capture page loads `models/<id>.glb` beside the film), turned like a hero turn.
- A drawing's strokes are tagged on screen like list rows and marks, so a zoom can push into a stop on a hand-drawn map.
- **Slot scenes** (`"recipeId": "slot"`, content `{ slot, label, props }`): a scene the host draws by name, for bespoke work no recipe covers (a custom 3D set, a branded animation). The film times, cuts, casts and mixes it like any other scene; FilmStage passes `slot` and `props` to `renderSlot`. Kumiki's capture page draws its slots from `src/film/film-slots.tsx` (app code): a walk around a tiny 3D Earth past glTF landmarks at their real places, a made-up little planet walked side-on (it can turn one landmark per bar of the music), a 3D biplane passing the camera, a logo landing, a sign-off and a finale. The same page draws cast members that are not characters (the biplane, a place label) from a `cast-props.json` beside the film. Checks: `slot-name`, `slot-label`.
- **Walking cast** (`walk: { from, to, grow?, toAt? }` on a cast member): the host plays the character's walk cycle for those frames while FilmStage grows it and moves its feet, so it walks out of the picture toward the viewer (front-facing art cannot slide sideways convincingly). With `grow: 1` it walks in place, as on a turning planet.
- **Cast light and shadow** (`light: { color, edge, side }`, `shadow` on a cast member): drawn characters over a photograph or a 3D set read as pasted on unless the scene's light is on them. `color` multiplies the character as coloured light does (a warm `#ffe2bd` at golden hour, a cool `#cfe0ee` in shade), `edge` draws a thin rim of light on the sun's `side`, and `shadow` (0 to 1) lays a soft contact shadow under the feet where they are in the picture.

## Panels

A `"recipeId": "panels"` scene plays two to four scenes at once, side by side or in a grid: a before and after, two worlds, three forms of one thing.

```json
{ "id": "compare", "recipeId": "panels", "durationFrames": 180, "content": {
  "layout": "columns", "label": "A list of what ice does beside a waterfall.",
  "align": { "frame": 80, "moments": ["item-3", "landed"] },
  "panels": [ { "recipeId": "card", "durationFrames": 200, "content": { "card": "list", "title": "Ice", "items": ["Holds still", "Lets light through", "Melts"] } },
              { "recipeId": "card", "durationFrames": 200, "content": { "card": "headline", "text": "Then it runs", "photo": { … } } } ] } }
```

- **Each panel is a scene.** It has its own recipe and content, and no transition. It is compiled at its panel's size (rounded up to even pixels), so a card reflows for a tall, narrow box instead of being squeezed. Its own problems come through under `/content/panels/<i>`. Film-wide checks (story, pacing, ads) stay with the outer film.
- **Layouts.** `columns` (the default) sit side by side and stack in a vertical output. `rows` sit one above the other and go side by side in a vertical output. `grid` is two by two. A line of the frame's short side × 0.006 (`line`, default near-black) separates them.
- **Opening.** The split opens from the centre line outward over `openFrames` (default 12), each panel two frames after the one before. Reduced motion shows the panels open.
- **Align.** Each panel's moment in `align.moments` lands on frame `align.frame` of the panels scene: a panel whose moment comes later plays ahead, and one whose moment comes sooner holds its first frame until it is due. `null` leaves a panel as it is. Moments mean what their recipe says: a list item's moment is the start of its entrance, a headline's is when it has landed. The panels scene gets an `aligned` moment for sounds and captions.

| Code | Severity | What it catches |
|---|---|---|
| `panels-count`, `panels-label`, `panels-line`, `panels-open`, `panels-nested` | error | Not 2 to 4 panels, no text alternative, a line colour that is not `#rrggbb`, a bad opening length, or panels inside a panel (the schema refuses it too) |
| `panels-align`, `panels-length` | error | A moment a panel does not have, or a panel too short for its lead |
| `panels-small` | warning | A panel's short side under a third of the frame's: its words will be small |

Example: [`examples/film/panels.film.json`](../../examples/film/panels.film.json): three places in three columns, then a list beside a waterfall, aligned. Storybook, **Video production → Promo Moves → Panels**, shows it in landscape and vertical, and beside the same scenes played one after another.

Evidence (2026-11-11): `tests/film-document.test.ts`, "panels". Frames rendered at 960×540 and 1080×1920 and reviewed. The first draft compiled odd-width panels, which a film cannot encode, so panels round up to even sizes and the odd pixel is clipped.

## Draw-on

A `"recipeId": "draw-on"` scene draws line art stroke by stroke with the pen on the end of the line; washes bloom in closed outlines and labels land as their strokes finish. Each stroke is a moment. See [Draw-On](draw-on.md).

## Chart morphs

A `"recipeId": "chart-morph"` scene changes a chart from state to state in stages, one kind of change at a time (axis, values, order, form), with one category kept identifiable. A state that asks for its changes together is warned about (`motion-unstaged`). See [Chart Morph](chart-morph.md).

## Scene sounds and split edits

A scene's `sound` is its own recorded ambience from the catalog. It plays under the scene and follows it when the film is re-timed, so it never has to be placed by frame like a bed. By default it starts and stops with its picture: two sounds crossfade over four frames at a hard cut, and across the whole of a dissolve.

A transition can split the edit (`film-split-edits.ts`):

- **J-cut, `audioLead`.** The incoming scene's sound starts that many frames before its picture, so the viewer hears where they are going before they see it.
- **L-cut, `audioTail`.** The outgoing scene's sound carries on that many frames past the cut, so the last place lingers into the new one.

A split fades over half its length (four frames to 0.75 s), so the sound is at full level for the half nearest the cut.

```json
{ "id": "tunnel", "transition": { "kind": "cut", "audioTail": 30 }, "sound": { "sound": "bed-wind-mountain", "gainDb": 2, "lowpassHz": 900 }, ... },
{ "id": "fall", "transition": { "kind": "cut", "audioLead": 24 }, "sound": { "sound": "bed-waterfall-near" }, ... }
```

A scene sound takes `gainDb`, `lowpassHz` and `reverse`, like a bed, and needs `audio` on the film. The compiled film lists every scene sound's span, fades and split in `sceneSounds`; the mixer bakes each as an ambience lane.

| Code | Severity | What it catches |
|---|---|---|
| `split-no-sound` | error | A J-cut into a scene with no sound, or an L-cut out of one |
| `split-overrun` | error | A lead that starts before the previous scene, or a tail that outlasts the next |
| `split-frames` | error | A split that is not a whole number of frames |
| `scene-sound` | error | A sound that is not a catalog ID, or a gain or low-pass out of range |
| `scene-sound-no-audio` | error | Scene sounds in a film with no `audio` |
| `split-short` | warning | A split under 4 frames, lost in the cut's own crossfade |
| `split-long` | warning | A split over 3 s, which stops reading as a cut and becomes a sound bridge |

There is no fixed length for a split. One editing guide gives 6 to 12 frames at 30 fps for a quick line, and half a second to a second for slower material, adjusted by ear; so length is a warning, never an error.

**Example.** [`examples/film/split-edits.film.json`](../../examples/film/split-edits.film.json) cuts three places on one river: the river's rush carries a second into the ice tunnel (L-cut), and the waterfall's roar starts in the tunnel 0.8 s before the picture (J-cut). The draft render was checked with earshot: energy above 2 kHz (the river) holds through 4.5 s, half a second past the 4.0 s cut, and fades by 5.0 s; the waterfall's rises from 7.1 s to full by 7.4 s, before the 8.0 s cut. Mix: -14.1 LUFS, -1.8 dBTP.

The tunnel uses the mountain wind, low-passed, rather than the cave-air recording: cave air has a crest of almost 29 dB (full-scale knocks over a quiet floor), and under a limited master it asked for more than the 9 dB of limiting the renderer allows.

**Storybook, Video production → Split Edits → Compare** plays the film with its sound in the browser, the audio clock driving the picture, with split edits on or off, over a timeline of picture and sound tracks.

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
  | `becomes` | `Becomes` | `from`, `to`: hero assets from the catalog (`SHOT_3D_BECOMES`) |
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
  | `becomes` | `dissolve`, `form`, `title` |
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

**Example.** `examples/film/speed-ramp-3d.film.json` is one shot in two sections:

1. **Initial speed.** A camera car chases a race car from behind at about 210 km/h for three seconds, at natural speed.
2. **Speed ramp.** The camera rises (`"rise": { "height": 2.6 }`, arriving as the ramp begins), then time speeds up to 2.5× over the last 1.5 s (`"exit": 45`) and the car races away from a camera that keeps its first speed.

The compiled ramp reports where it starts speeding up (`rampUp`), so other motion can lead into it. A hold (`"holds": [{ "at": "pass", "frames": 45 }]`) slows a moment almost to a stop instead; a chasing camera then brakes to stay behind.

The wheels' motion blur follows the ramp: `FilmStage` gives each 3D shot its playback `rate`, and the ramp itself as a `clock`, so a race shot's `chase` camera can drive in film time while the car is ramped.

**Storybook, Video production → Speed Ramp:**

- **Compare** plays it beside the same content at an even speed in the same length, on one clock. Each panel's timeline shows the holds and the cut ramp, and a content-time ruler: a tick for every 6 content frames, close where the content races and far apart where it holds. A live readout shows the speed.
- **Graphs** draws each ramp as a time map.

A ramp multiplies the content's own motion. Ramping into a cut needs a shot that is still moving at its end; a shot that eases to a stop gains nothing from `exit`.

## Stutter

`"stutter": { "at": 66, "frames": 6, "repeats": 3 }` on a scene plays six content frames from frame 66 four times in all, then the scene carries on: a "b-b-b-but" on a landing, a hit or a turn. `at` is a content frame or one of the scene's moments; `frames` is 2 to 8 (default 4); `repeats` is 1 to 4 (default 2).

- **Length.** The scene runs `frames × repeats` longer than its content. Its content is compiled and checked at its own length, and every moment after the stutter moves later by the repeats, so sounds and captions tied to moments stay in step.
- **Time map.** A stutter is a time map like a speed ramp, so a scene takes one of a stutter, a speed ramp or a stretch (`stutter-time-map`).
- **Reduced motion** plays the content once, evenly slowed to the scene's length.
- **Sound.** Sounds tied to a moment inside the stutter play once, on its first pass. Repeating them with the picture comes with the sound work in doc 34.

| Code | Severity | What it catches |
|---|---|---|
| `stutter-frames`, `stutter-repeats` | error | Outside 2 to 8 frames, or 1 to 4 repeats |
| `stutter-moment`, `stutter-range` | error | A moment the scene does not have, or a stutter that does not fit in the content |
| `stutter-time-map` | error | A stutter with a speed ramp or a stretch |
| `stutter-on-ui` | warning | A stutter on a screen demo, which reads as broken playback |

Example: [`examples/film/stutter.film.json`](../../examples/film/stutter.film.json), the cut-paper title sequence with its falling water stuttered. Storybook, **Video production → Promo Moves → Stutter**.

Evidence (2026-11-11): `tests/film-document.test.ts`, "stutter". Frames 66 to 90 rendered at 960×540: the water streaks fall, jump back and fall again three times. A first draft stuttered on the `symbol` moment, after the pieces had landed, so nothing visibly repeated; the example now stutters the falling water.

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

**Colour script.** Each contact sheet opens with the film's colour script: a band per scene, as wide as the scene is long, and in it, for each of the scene's review frames in order, the frame's four main colours stacked by their share of the frame, with the scene's light (relative luminance) and warmth beneath. It shows the arc a grade follows through the film (doc 32, P3 "Grade arc"; doc 33's per-scene looks make the grade change). A mean colour is not enough: averaged, most photographs are a grey. `report.json` holds `colourScript` for each output: each scene's light, warmth, and each frame's mean, light, warmth and palette. The palette is a k-means of the frame's pixels from centres spread across its light, so a frame always gives the same palette. Evidence (2026-11-09): `tests/film-document.test.ts`, "colour script"; `film:review` of `examples/film/zoom-through.film.json` shows teal ice turning to the waterfall's olive and grey. That review also found the annotated picture's thesis at 1.5:1 while it faded in over bright ice: its scrim is darker now, and fading text is marked as entering, as cards do.

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
