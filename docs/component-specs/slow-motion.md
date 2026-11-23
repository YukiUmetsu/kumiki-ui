# Smooth slow motion (VE1.7)

`npm run video:slowmo` slows a clip 2 to 8 times with new in-between frames, so it moves on every frame instead of showing each real frame several times. Short-form editors offer this as "smooth slow-mo" or "optical flow" ([CapCut](https://www.capcut.com/resource/optical-flow-in-capcut)).

```
npm run video:slowmo -- clip.mp4 --out=slow.mp4 [--factor=4] [--method=mci|blend] [--from=<s|Nf>] [--to=<s|Nf>] [--check] [--crf=18] [--overwrite] [--log=info] [--format=json]
```

**Methods.**

- **`mci`** (default): motion-compensated interpolation, through FFmpeg's `minterpolate` with bidirectional motion estimation, overlapped-block compensation and variable-size blocks. Moving things travel between frames.
- **`blend`**: cross-fades neighbouring frames (`framerate`). Nothing warps, but moving edges double.

**Output.** The clip runs at the source's rate, `factor` times longer. The audio is left out. The report counts the frames written: interpolation cannot reach past the last source frame, so a clip comes out a few frames short of count × factor (1 s at 4 times: 113 frames).

**The check (`--check`).**

- **What it measures.** How well the method rebuilds real frames on this clip. Every other frame of the range is dropped, then rebuilt twice, by the method and by plain repeating. Each rebuilt frame is compared with the real frame it replaces (SSIM).
- **Warnings.**
  - A method scoring under 0.85 shows its seams.
  - A method that beats repeating by less than 0.005 cannot follow the motion.
- **What it is not.** A guide, not a guarantee. It tests a two-times rebuild of real motion; four or eight times invents more frames.

**Errors.** Each has a code: `usage`, `file-missing`, `probe-failed`, `ffmpeg-missing`, `time-range`, `output-exists`, `encode-failed`, `check-failed`. Probing and frame ranges are the selective-colour file pipeline's (`selective-color-core.mjs`).

**In a film.** Use the slowed file as a footage scene's `video` at its normal rate. A footage scene with `rate` under 1 repeats frames instead.

## Evidence (2026-11-18)

**Choosing the default** on the CC0 peacock clip (handheld, fine feathers): every other frame was dropped and rebuilt.

| Method | SSIM of rebuilt frames |
|---|---|
| Motion-compensated | 0.948 |
| Blending | 0.943 |
| Repeating | 0.917 |

Side by side, blending doubled the thin legs and interpolation kept them crisp.

**The example.** [`examples/film/slowmo.film.json`](../../examples/film/slowmo.film.json) plays seconds 1 to 2 of the clip slowed 4 times.

- **The check on that second:** 0.952 against 0.933 for repeating.
- **Rendered frames.** Neighbouring frames (41, 42) at 960×540 show no warping.
- **Storybook.** **Promo Moves → Smooth Slow Motion**, against the same second played at a quarter speed.

**Tests.** `node --test tests/video-slowmo.test.mjs` covers:

- the options;
- the filters and arguments;
- SSIM parsing;
- a real run on a moving test card, where the check finds interpolation beating repeated frames.

**Limits.** FFmpeg's interpolation warps fast or tangled motion: wings, water, crowds, a hand crossing a face. A learned interpolator (for example RIFE, MIT-licensed) would do better on those. It is not part of this slice.
