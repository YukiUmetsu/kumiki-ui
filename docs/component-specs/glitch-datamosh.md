# Glitch cut and datamosh (VE1.9)

Two ways to break the picture on purpose. Both are lo-fi digital looks that short-form editors use on a beat or a drop ([Epidemic Sound](https://epidemicsound.com/blog/how-to-datamosh), [Adobe Express](https://adobe.com/uk/express/learn/blog/what-is-datamosh), [Soundstripe](https://www.soundstripe.com/blogs/what-is-datamoshing)).

- **`{ "kind": "glitch" }`**, a film transition: the frame breaks into horizontal bands that jump sideways, some torn into red and blue, while the next scene takes over band by band.
- **`npm run video:datamosh`**: a real datamosh between two video files. The second clip's motion moves the first clip's last picture until a keyframe brings the second clip back clean.

## Glitch cut

```json
"transition": { "kind": "glitch", "durationFrames": 8, "intensity": 0.7 }
```

**How a frame is built.** `registry/video/film-glitch.ts` makes the bands; `glitchBands()` is pure and seeded by the scene's place in the film.

- **Bands.** Each band is 2 % to 16 % of the frame tall, and the bands cover the frame exactly once. The layout holds for two frames, then changes.
- **Take-over.** The incoming scene takes each band with a chance that rises smoothly through the cut. Every band is the incoming scene by the end.
- **Jumps and tears.** They peak in the middle of the cut, scaled by `intensity` (0.1 to 1, default 0.7):
  - a jump goes up to 9 % of the frame's width;
  - about four bands in ten tear their red and blue channels apart by up to 2 %.

**How it is drawn.** `film-glitch-react.tsx` is an SVG filter per layer.

- **Per band.** Each band is an `feOffset` limited to the band's own filter region. A torn band splits into three channel offsets (`feColorMatrix`) that are added back together.
- **The two layers.** The outgoing layer draws every band, so a jump shows the outgoing picture behind it; the incoming layer draws only the bands it has taken. A jump also shows a dark sliver of the stage at the band's end, which is part of the "broken signal" look.

**Sound.** By default the film's accents put a whoosh on it (`"on": "all"`). The catalog has no glitch sound yet.

**Reduced motion** plays a dissolve.

| Code | Severity | When |
|---|---|---|
| `glitch-intensity` | error | An intensity outside 0.1 to 1 |

## Datamosh

```
npm run video:datamosh -- a.mp4 b.mp4 --out=mosh.mp4 [--a-from=] [--a-to=] [--b-from=] [--b-to=] [--mosh=24] [--bloom=0] [--width=960] [--quality=3] [--crf=18] [--overwrite] [--log=info] [--format=json]
```

This is how video artists datamosh by hand, as a script:

1. **Re-encode.** Both clips are re-encoded as MPEG-4 Part 2:
   - at one size (the first clip's shape at `--width`, the second clip cropped to it) and one rate (the first clip's);
   - with no B-frames and one keyframe;
   - the second clip gets a second keyframe `--mosh` frames in.
2. **Splice.** Their raw streams are split at the VOP start code `00 00 01 B6`, and the second clip's first VOP, its keyframe, is left out. `--bloom` repeats the second clip's first motion that many times first, so the pixels keep flowing.
3. **Decode.** FFmpeg decodes the spliced stream: the second clip's motion vectors and residuals now act on the first clip's last picture. The result is written as H.264 at `--crf`, the same frames every run. The audio is left out.

Smooth motion in the second clip smears the old picture along it. Big, sudden motion makes the encoder code whole blocks afresh, which replace the old picture in squares: both are real datamosh looks.

`splitVops`, `vopType` and `assembleMosh` are exported and pure.

**Errors.** Each has a code: `usage`, `file-missing`, `probe-failed`, `ffmpeg-missing`, `time-range`, `output-exists`, `encode-failed`, `stream-failed` (no pictures, no keyframe first, or B-frames in the second clip).

## Example and evidence (2026-11-21)

**Example.** [`examples/film/glitch.film.json`](../../examples/film/glitch.film.json).

- **The cuts.** Three photo cards on `bed-drums-hiphop-110`, joined by glitch cuts centred on kicks: frames 127 to 135 and 257 to 267.
- **The datamosh scene.** A footage scene plays `annabelle-peacock-mosh.mp4`, made by the tool from the two CC0 clips: the 1894 dancer is moved by the peacock's motion from frame 50, and the peacock comes back clean at frame 91.
- **Storybook.** **Promo Moves → Glitch And Datamosh**, beside hard cuts, with the film's mix (−15.0 LUFS).

**Rendered frames** (960×540):

- **The cuts.** Frames 129, 131 and 133 and 260, 262 and 264 show the intercut bands, the sideways jumps and the red and blue tears, which peak mid-cut.
- **The datamosh**, sampled from the clip:
  - the feathers and the deck's lines paint over the dancer's colours;
  - then the clean peacock appears.
  - In the other order (peacock into dancer), the dancer's big swirl came out blocky.

**Tests.**

- `tests/film-glitch.test.tsx`:
  - the bands cover the frame exactly once;
  - the cut starts and ends clean and tears hardest in the middle;
  - a seed always tears the same way;
  - the filters draw the right bands on each layer;
  - the example compiles, with dissolves in the cut plan.
- `node --test tests/video-datamosh.test.mjs`:
  - the options;
  - splitting a stream and dropping only the first keyframe;
  - a real mosh of two test cards: mid-mosh the frame keeps the first card's navy, and after the keyframe it is the second card's olive.

**Owner review.** Visual and listening review is pending.
