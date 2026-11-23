# Subject reframe (VE1.12)

A crop of another shape that follows the subject, so a landscape clip becomes a vertical one (9:16) and keeps its subject in view. Editing apps ship this as one step: Adobe Premiere Pro's Auto Reframe, with Slower, Default and Faster motion presets ([Adobe](https://learn.adobe.com/premiere-pro/using/auto-reframe.html)). That shows the job is common, not that it brings views. The planner follows Google's AutoFlip ([Google Research, 2020](https://research.google/blog/autoflip-an-open-source-framework-for-intelligent-video-reframing/)): it reads the whole clip before it decides, and picks a stationary, panning or tracking crop.

- **The planner**: `registry/video/subject-reframe.ts`. It is pure and is used by both paths below.
- **A file**: `npm run video:reframe` writes the vertical video.
- **A film**: a footage scene's `reframe` makes every output of another shape follow the subject.

The subject's place comes from its cutout (VE1.5, `npm run video:matte`), so this slice needs a cutout first.

## How the crop is planned

1. **The subject in each frame.** `subjectBox` reads a frame of the cutout's alpha.
   - The box holds all but 0.5 % of the subject's alpha on each side, so a stray speck of matte does not stretch it.
   - The centre is the alpha-weighted centre, so it stays with the body on a long tail or a raised arm.
   - A frame where the subject covers less than 0.05 % of the picture has no subject.
2. **Where the crop may stand.** The crop is as large as the frame allows at its shape, and moves along the one axis that has room: across, for a vertical crop of a landscape clip. In each frame:
   - a subject up to 80 % of the crop's length is kept whole, with padding (6 % of the crop by default) on both sides;
   - a larger subject (a dancer's flying skirt, a bird's long train) is framed by its centre, which stays in the crop's middle half. Its ends may leave the frame. Keeping the edges of a subject that nearly fills the crop chased every swing of the skirt: the first plan of the 1894 dancer moved 0.91 crop widths a second, and this rule brought it to 0.33.
3. **The calmest move that stays in range**, for the whole clip:
   - **stationary**: one place inside every frame's range, nearest the subject's average centring, like a camera on a tripod;
   - **panning**: a straight line at one even speed, if it stays in range and holds the subject within 20 % of the crop's length of centre on average;
   - **tracking**: the Whittaker smoother ([Eilers 2003](https://doi.org/10.1021/ac034173t)), the path nearest the centring with its acceleration penalised by λ = (response × fps)⁴. Response is 0.9, 0.5 or 0.22 s for `slower`, `default` and `faster`. Where the path leaves the range, the frame furthest outside in each stretch is pinned to the edge, and the path is solved again until it stays inside. Pinning whole stretches copied the edge's corners into the path. The planner sees the whole clip, so the crop starts to move before the subject reaches the edge.
4. **Frames without a subject** are bridged smoothly between the frames around the gap.

`mode` can name one move instead of `auto`. A warning then says how many frames cut into the subject.

## The file tool

```
npm run video:reframe -- <input> --cutout=<cutout.webm> --out=<vertical.mp4> [--aspect=9:16] [--mode=auto|stationary|panning|tracking]
  [--motion=slower|default|faster] [--padding=0.06] [--height=<px>] [--from=] [--to=] [--track=<track.json>] [--crf=18] [--overwrite] [--log=info] [--format=json]
```

- **The cutout** must be from the same input, with its first frame at `--from`. libvpx decodes the cutout, because FFmpeg's own VP9 decoder drops the alpha.
- **Each frame is resampled** from the crop's exact place, to a fraction of a pixel, with a Catmull-Rom filter (`resampleCrop`), so a slow pan glides instead of stepping a pixel at a time. When the output is smaller, the filter widens and averages, so the picture does not alias.
- **The output** has the crop's shape at `--height` (default the source's height; both sides even), H.264, with the input's audio.
- **`--track`** writes the subject's track for a film: `{ width, height, fps, offset, rows }`, one row a frame, `[x, y, width, height, cx, cy]` or null.
- **Errors** carry a code: `usage`, `file-missing`, `probe-failed`, `ffmpeg-missing`, `time-range`, `output-exists`, `cutout-mismatch`, `decode-failed`, `no-subject`, `encode-failed`.

## In a film

```json
"reframe": { "track": [[159, 119, 445, 425, 374.2, 292], …], "offset": 0, "mode": "auto", "motion": "default", "padding": 0.06 }
```

- **Where it goes.** `reframe` sits on a footage scene's content. `track` and `offset` are the `--track` file's `rows` and `offset`.
- **Each output plans its own crop.** The plan covers the footage frames the scene plays. An output with the footage's own shape is not cropped.
- **What follows the crop.** The footage, its echo and the subject layers (cutout, outline, trail, clones) all take the same crop. A cutout of another size takes it scaled to its own.
- **The push.** The scene's slow push centres on the subject.

## Checks

| Code | Severity | When |
|---|---|---|
| `reframe-aspect` | error | A shape that is not a positive width ÷ height |
| `reframe-no-subject` | error | No frame of the track shows a subject |
| `reframe-same-shape` | warning | The crop is the whole frame (the file tool; a film skips such an output) |
| `reframe-subject-lost` | warning | The subject is missing for over a second in a row; the crop holds near where it last saw it |
| `reframe-subject-wide` | warning | The subject is wider (or taller) than the crop in some frames; its ends are cut |
| `reframe-subject-cut` | warning | A named mode cuts into the subject's padding |
| `reframe-fast` | warning | The crop moves faster than one of its own lengths a second and whips across the picture |
| `reframe-track` | error | A film's track is empty or a row is not six numbers or null |
| `reframe-offset` | error | The offset is not a frame of the footage |
| `reframe-track-short` | error | The track does not cover the frames the scene plays |
| `reframe-mode`, `reframe-motion`, `reframe-padding` | error | A value outside its list or range |

In a film, the plan's warnings name the output they come from.

## Limits

- **One subject.** The cutout's alpha is the subject: two people far apart are one wide subject, framed by their joint centre.
- **No zoom.** The crop is as large as the frame allows, and moves along one axis.
- **No added motion blur.** A crop that pans fast over a sharp, still background can strobe; `reframe-fast` flags speeds over one crop length a second.
- **Cost.** In a film, the plan is made once for each output and played range, then read every frame.

## Example and evidence (2026-11-21)

**Example.** [`examples/film/reframe.film.json`](../../examples/film/reframe.film.json):

- **The clip.** A young deer wades across a river, filmed on a long lens that follows it loosely. It is `deer-river.mp4`: 10 s of a public-domain BLM clip at 960 × 540, with a keyframe every 10 frames.
- **Outputs.** The film has a vertical output (1080 × 1920), a vertical draft (360 × 640) and a landscape output, which has the clip's shape and is not cropped.
- **How it was made.** `npm run video:matte` cut the deer out (300 frames in 237 s). Then `npm run video:reframe -- deer-river.mp4 --cutout=deer-river-cutout.webm --out=… --track=…` wrote the track.
- **The plan.** A tracking crop, 304 × 540 of 960 × 540, moving at most 3.2 crop widths a second. That peak is where the source camera whip-pans: the deer jumps 210 px across the frame in five frames, and the crop follows it against the pan. Frame by frame through frames 164 to 198, the deer stays in the vertical frame and close to its centre. The film check gives that `reframe-fast` warning and a `reframe-subject-wide` warning for 20 frames.
- **Storybook.** **Promo Moves → Subject Reframe**: the whole clip with the crop drawn on it, the vertical film, and a centre crop.

**Rendered frames** (the file tool at 304 × 540 and the film draft at 360 × 640), against a centre crop of the same frames:

- **Frame 178.** The deer is at the left edge of the landscape picture. The reframed crop holds it; the centre crop shows only rocks and water.
- **Frame 280.** The centre crop cuts the deer in half, and the reframed crop has it whole near the middle.
- **Frames 0, 60, 120, 170, 190 and 240.** The deer's centre stays inside the crop.

**Render speed.** A footage scene seeks its clip to every frame, and each seek decodes from the last keyframe.

- **The first draft** used the 1894 dancer clip, which has 2 keyframes in 200 frames: the film draft took 4.3 s a frame.
- **The deer clip** has a keyframe every 10 frames, and its film draft took 0.18 s a frame (300 frames in 55 s).
- **The film spec asks for a keyframe on every frame.** This demo trades that for a 4.8 MB file. The older example clips (dancer, peacock, teacher) have long keyframe intervals too.

**Tests.**

- `tests/subject-reframe.test.ts`:
  - boxes from alpha;
  - the three moves on synthetic tracks: still, steady crossing, run-stop-return. The run-stop-return case checks that the crop is smooth and starts to move before the subject;
  - a faster setting follows more closely;
  - gaps, every check code, the Whittaker smoother's limits;
  - the film checks, and the example compiling.
- `node --test tests/video-reframe.test.mjs`:
  - the options;
  - a real run on a box crossing a card. It gives a panning crop, the box stays inside every frame, and the track is written.
