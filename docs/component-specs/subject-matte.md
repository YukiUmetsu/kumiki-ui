# Subject matte (VE1.5)

The subject of real footage, cut out of every frame, and the short-form effects it makes possible: words behind a person, an outline, a new background and clones. Two parts:

- **`npm run video:matte`** makes the cutout from a video file: a VP9 WebM with an alpha channel, frame for frame with the clip.
- **A footage scene's `subject`** draws that cutout over its own footage in a film (`film-subject.ts`, `footage-react.tsx`).

## Why

Text behind the subject, a stroke around a cut-out subject, background removal and the clone effect are one-tap tools in the editors people make short-form video with. Adobe Premiere's Object Mask has a tutorial for text behind a subject ([Adobe](https://www.adobe.com/learn/premiere-pro/web/text-behind-subject-object-mask)). CapCut has text behind a person and auto cutout ([CapCut](https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut)). Instagram Edits has one-tap cutouts ([TechCrunch](https://techcrunch.com/2025/08/12/a-guide-to-using-edits-metas-new-capcut-rival-for-short-form-video-editing)). Kumiki had no subject segmentation; selective colour's selected item finds an item by its colour, not by what it is.

## Making a cutout

```
npm run video:matte -- clip.mp4 --out=clip-cutout.webm [--mask=clip-mask.mp4] [--model=isnet|u2netp] [--width=960]
  [--from=<s|Nf>] [--to=<s|Nf>] [--smoothing=0.5] [--edge=0.006] [--clean=0.12] [--threads=<n>] [--overwrite] [--log=info] [--format=json]
```

1. **Decode.** FFmpeg decodes the clip at its own rate, scaled to `--width` and keeping its shape. Probing, frame ranges and coded errors are the selective-colour file pipeline's (`selective-color-core.mjs`).
2. **Segment.** A Python process (`scripts/video-matte-model.py`) runs a salient-object model on each frame, on the CPU, through onnxruntime. The model is loaded once.
3. **Refine.** Node refines each raw mask (`registry/video/subject-matte.ts`):
   - **Clean.** Levels below `clean` are background, and above `1 − clean` subject.
   - **Edges.** The guided filter snaps the edge to the picture (He et al. 2013; the same filter selective colour uses).
   - **Over time.** The matte keeps `smoothing` of the last one where the picture did not change, so a still subject stops shimmering. Where the luma changed by more than `motion` (0.05), it keeps none, so a moving subject leaves no trail.
4. **Edge colour.** In the soft edges, the subject's own colour is estimated without the background mixed in: blur fusion, a coarse then a fine pass (Germer et al., "Fast Multi-Level Foreground Estimation", ICPR 2020). Without it, feathers and hair carry a fringe of the old background onto the new one.
5. **Encode.** The cutout goes to VP9 with alpha (`yuva420p`), the codec browsers decode with an alpha channel. `--mask` also writes the matte as grey H.264.

**Models.** Both are their authors' Apache-2.0 weights, fetched on first use into `~/.cache/kumiki/models` (or `$KUMIKI_MODELS`). Each file is checked against a pinned SHA-256 before it is used. They are not part of the library or its install.

| `--model` | Model | Input | Size | Speed (960×540, laptop CPU) | Use |
|---|---|---|---|---|---|
| `isnet` (default) | IS-Net / DIS (Qin et al., ECCV 2022) | 1024² | 179 MB | 0.9 to 1.3 s a frame | Final cutouts: the peacock's head, legs and train survive |
| `u2netp` | U²-Net-p (Qin et al., Pattern Recognition 2020) | 320² | 5 MB | 0.17 s a frame | Drafts and quick checks; edges are blobs |

**Requirements.** `python3` with `onnxruntime`, `numpy` and Pillow, plus FFmpeg with `libvpx-vp9`.

**Errors.** Each has a code: `usage`, `file-missing`, `probe-failed`, `ffmpeg-missing`, `python-missing`, `model-download`, `model-checksum`, `time-range`, `output-exists`, `decode-failed`, `model-failed`, `encode-failed`. With `--format=json` an error comes back as `{ "error": { "code", "message", "hint" } }`.

## In a film

```json
{ "recipeId": "footage", "content": {
  "video": { "id": "peacock-walk", "src": "assets/footage/peacock-walk.mp4", "width": 960, "height": 540, "fps": 30, "frameCount": 120 },
  "title": { "text": "STRUT", "at": 4, "place": "top", "size": "giant" },
  "subject": { "cutout": { "id": "peacock-walk-cutout", "src": "assets/footage/peacock-walk-cutout.webm", "width": 960, "height": 540, "fps": 30, "frameCount": 120 },
    "behind": true } } }
```

| Field | What it does |
|---|---|
| `cutout` | The cutout video. `offset`: the footage frame its frame 0 matches (default 0). Same shape and frame rate as the footage. |
| `behind` | The scene's title sits between the footage and the subject. A `"size": "giant"` title fills most of the frame's width, for the subject to stand in front of. |
| `outline` | A line of `color`, `width` (0.002 to 0.03 of the short side, default 0.006), with an optional `glow` (0 to 1). It grows from the cutout's solid part (alpha over about 0.3), so a model's faint haze over shadows gets no line. |
| `background` | `{ "color": "#16213a" }`, or `{ "blur": 0.012 }`: the footage itself blurred under the subject, as if shot on a long lens. |
| `clones` | Up to six earlier copies of the subject, each `delay` frames of footage behind, `opacity` 0.2 to 1. They need a locked-off camera: each copy stands where the subject stood. |

**How it is drawn.**

- **Layers.** The footage and the cutout are two frame-accurate clips with the same framing and push. The cutout's frame for a footage frame is `frame − offset`, less `delay` for a clone; a clone shows once the footage has that much history.
- **Words.** With `behind`, the title is drawn between the footage and the subject.
- **Outline.** An SVG filter on the cutout's canvas (`feComponentTransfer`, then `feMorphology` dilate).

| Code | Severity | What it catches |
|---|---|---|
| `subject-cutout`, `subject-shape`, `subject-rate`, `subject-offset` | error | No cutout, a different shape or frame rate from the footage, an offset outside it |
| `subject-outline`, `subject-background`, `subject-clones` | error | Values outside their ranges |
| `subject-webm`, `subject-licence` | warning | A cutout that is not a WebM; no rights record |
| `subject-behind-no-title` | warning | `behind` without a title |
| `subject-clones-background` | warning | Clones over a new background float free of the ground they stood on |

**Rights.** A cutout is a derivative of its footage, so it carries the footage's licence. Record both in `assets/THIRD_PARTY_ASSETS.json`.

## Example and evidence (2026-11-18)

**Example.** [`examples/film/subject.film.json`](../../examples/film/subject.film.json).

- **The footage.** [Peacock walking and eating](https://commons.wikimedia.org/wiki/File:Peacock_walking_and_eating.webm) by Mx. Granger, CC0. It is trimmed to 4 s, held to 30 fps and scaled to 960×540 (3.0 MB), and its cutout is 2.8 MB.
- **The scenes.**
  1. The giant word "STRUT" behind the bird.
  2. The bird outlined in white with a glow, over a deep blue ground.
- **Storybook.** **Promo Moves → Subject Cutout**, beside the same footage without the subject.

**Tests.** `tests/subject-matte.test.tsx` covers:

- the cleaned levels;
- steadying a still picture without trailing a moving one;
- background colour taken out of a soft edge;
- every subject check;
- the layer order: footage, words behind, clones, subject.

**Rendered frames** (`film:frame`, 960×540):

- **Text behind.** The word spans the top, with the peacock in front of its middle letters.
- **Outline.** It hugs the body, legs and feet. A first draft outlined the model's haze between the legs as well; the outline now grows from the solid part only.

**Model choice.** The same peacock frame through both models: U²-Net-p gives a blob; IS-Net keeps the head, the thin legs and the feather tips.

**Edge colour.** The cutout over magenta and over blue shows no green fringe from the grass.

**Limits.**

- **The model's haze.** IS-Net reads the deck seen between the peacock's legs, and its shadow, as part of the subject at 0.3 to 0.6. The clean level (0.12) and the guided filter reduce this but do not remove it: a faint haze stays under the legs over a new background.
- **No clone demo.** Clones are built and tested, but the demo has none. No CC0 clip of a subject crossing a locked-off frame was found: a great egret clip was tried, and the bird moves 15 % of the frame in 9 s, so its copies piled on top of each other. A clip filmed on a tripod with a person walking across would show it.
- **Safari.** It does not play VP9 with alpha, so it shows the plain footage. Chromium (the capture browser) and Firefox play it.

**Owner review.** Visual review is pending.
