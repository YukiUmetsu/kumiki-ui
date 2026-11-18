# Selective colour (VP1)

**Registry item:** `selective-color`. Its files are `registry/video/selective-color.ts` (config, checks, the four stages
and the engine) and `registry/video/selective-color-math.ts` (per-pixel colour maths, written to move into a shader).

**Storybook:** Video production → Film Looks → *Selective Colour*. It runs the engine on a photograph frame by frame.
Scrub or play a six-second shot whose window fades selective colour in at 1 s and out at 5 s. You can switch the plate,
the colour kept, the colour space and every threshold, and show the mask.

**Find it:** `npm run catalog:find -- --query="selective colour" --format=json` (also "colour splash", "color key",
"leave one colour", "black and white except").

**State:** VP1.1, the core and CPU reference path, is built. The GPU renderer (VP1.2), the file pipeline (VP1.3) and film
integration (VP1.4) come next; see the [roadmap](../06-roadmap.md).

## What it does

It turns a frame into high-contrast black and white and keeps chosen colours. A pixel keeps its colour as much as it
matches a target, and the effect fades in and out over timed windows.

The pipeline is four decoupled stages. Each is a pure function over typed arrays, so frames can run on any thread.

1. **Temporal gate** (`strengthAt`). This gives the effect's strength at a time, from windows with fades. Outside every
   window, `outside` decides: `monochrome` (the windows fade selective colour in and out of black and white) or
   `passthrough` (the original picture fades into the effect).
2. **Mask** (`colorMask`). It measures each pixel's distance from each target in the chosen colour space. It keeps the
   pixel fully within `tolerance`, fades it out over `softness` with a smoothstep, and drops greys and near-blacks
   through saturation and value floors.
3. **Refine** (`refineMask`). Matte clean-up first: `cleanBlack` clears speckles from what goes grey, and `cleanWhite`
   fills holes in what keeps colour, as in a grading qualifier. Then feathering: either edge-aware, with a guided filter
   whose guide is the frame's luma (He, Sun & Tang 2013), so the mask follows the object's edges instead of haloing, or
   a three-pass box blur. Then temporal smoothing: part of the last frame's mask carries over, against flicker.
4. **Composite** (`composite`). This draws a styled monochrome base: luma weights, a linear or sigmoid contrast curve
   about a pivot, then black and white levels for inky shadows. It takes `amount` of the colour out of the rest of the
   picture, and lets the original through the mask at the gate's strength.

`createSelectiveColorEngine(config, { fps, duration, logger })` runs them for one shot:

- it keeps the temporal state, and `reset()` clears it after a cut or a seek;
- it checks every frame's size;
- it clamps or refuses out-of-range times (`outOfRange`);
- it logs through an optional logger;
- it throws `SelectiveColorError` with a code.

## Configuration

Every value comes from the config. `SELECTIVE_COLOR_DEFAULTS` and `TARGET_DEFAULTS` hold the documented starting points,
and any field overrides them. `resolveSelectiveColorConfig` fills a partial config and lists its problems as JSON
pointers with fixes.

```ts
const engine = createSelectiveColorEngine({
  colorSpace: "lab",                       // "hsv" | "lab" | "ycbcr"
  targets: [{ color: "#d8261c", tolerance: 22, softness: 14, metric: "ciede2000", lightness: 0.3 }],
  amount: 1,                               // how much colour leaves the rest (1: grey)
  feathering: { radius: 2, edgeAware: true, epsilon: 0.002 },   // radius in thousandths of the frame height
  matte: { cleanBlack: 0.05, cleanWhite: 0.05 },
  temporal: { smoothing: 0.3 },
  monochrome: { luminanceWeights: "rec709", contrastBoost: 1.5, pivot: 0.45, curve: "sigmoid", blackLevel: 0.06, whiteLevel: 0.96 },
  windows: [{ start: 1, end: 5, transition: 0.75 }],            // seconds, or { unit: "frames" }
  outside: "monochrome",
  outOfRange: "clamp",
}, { fps: 30, duration: 6, logger: console });
const { data, mask, report } = engine.process({ width, height, data: rgba }, seconds);
```

| Field | Meaning |
|---|---|
| `colorSpace` | `hsv`: a hue window, quick and editor-like. `lab`: perceptual distance, ΔE (CIE76 or CIEDE2000), with `lightness` to weigh ΔL (0 holds steady under shading). `ycbcr`: distance in the CbCr plane alone, which separates chroma from light (skin detectors use this plane). |
| `targets[]` | `color` (#rrggbb; in HSV its hue is the window's centre), `tolerance` and `softness` in the space's units (degrees of hue, ΔE, or CbCr distance), `saturationMin`/`saturationSoftness` and `valueMin`/`valueSoftness` floors, `metric`, `lightness`. A pixel takes the best target. |
| `amount` | How much colour leaves the rest of the picture: 1 is full grey. |
| `feathering` | `radius` (thousandths of the frame height, so it scales with the output), `edgeAware` (guided filter), `epsilon` (higher feathers across weaker edges). |
| `matte` | `cleanBlack` and `cleanWhite`, 0 to 0.5 each. |
| `temporal.smoothing` | 0 (off) to 0.95. High values lag behind fast motion. |
| `monochrome` | `luminanceWeights` (`rec601`, `rec709` or three numbers adding up to 1), `contrastBoost`, `pivot`, `curve` (`linear` or `sigmoid`), `blackLevel`, `whiteLevel`. |
| `windows[]` | `start`, `end`, `transition` (or `fadeIn` and `fadeOut`), `unit` (`seconds` or `frames`), `curve` (`linear` or `smooth`). Overlapping windows take the strongest. No windows: always on. |
| `outside` | `monochrome` or `passthrough`. |
| `outOfRange` | `clamp` (with a warning) or `error`. |

**Checks** (`inspectSelectiveColorConfig`): an unknown colour space or standard; a bad target colour, tolerance,
softness, floor or metric; an amount, radius, epsilon, matte or smoothing out of range; luma weights that do not add up
to 1 (a warning); contrast, pivot or curve out of range; levels that cross; a window that ends before it starts, or
fades longer than itself (a warning); no targets (a warning: the picture goes all grey); a hard edge (softness 0, a
warning).

## Performance

The reference path runs on the CPU over typed arrays:

- an 8-bit sRGB-to-linear table;
- a 1024-entry tone table for the monochrome base;
- O(n) box means from running sums, so the guided filter costs the same at any radius.

A 960×540 frame takes about 45–70 ms on a laptop CPU in Storybook. The per-pixel maths has no allocation and only
branches a shader can take, so VP1.2 can mirror it in a fragment shader and check parity against this path. Frames are
independent apart from the temporal mask, so VP1.3 can process frames in parallel within each shot.

## Sources

| Source | Grade | Used for |
|---|---|---|
| ITU-R BT.601 and BT.709 (luma weights) | A (standards) | Monochrome weights and YCbCr |
| IEC 61966-2-1 (sRGB) and CIE 15 (CIELAB, D65) | A (standards) | Linearisation and CIELAB |
| Sharma, Wu & Dalal, *The CIEDE2000 color-difference formula: implementation notes, supplementary test data, and mathematical observations*, Color Res. Appl. 30 (2005) ([page](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/)) | A | CIEDE2000, and its 34 test pairs |
| He, Sun & Tang, *Guided Image Filtering*, ECCV 2010 and IEEE TPAMI 35 (2013) ([paper](https://people.csail.mit.edu/kaiming/publications/pami12guidedfilter.pdf)) | A | Edge-aware feathering in linear time |
| Chai & Ngan, *Face segmentation using skin-color map in videophone applications*, IEEE TCSVT 9 (1999) | A | Chroma (CbCr) separation of skin under changing light |
| DaVinci Resolve manual, HSL qualifier and Matte Finesse ([mirror](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part2816.htm)) | B (vendor manual) | Hue centre, width and soft edge; saturation and luminance limits; clean black and clean white |
| Adobe Premiere Pro and After Effects, *Leave Color* ([manual](https://www.manualsdir.com/manuals/753888/adobe-premiere-pro-cs4.html?page=359)) | B (vendor manual) | Amount to decolour, tolerance, edge softness, RGB or hue matching |
| Temporally coherent video matting: Wang & Cohen (2010), Bai et al. (2011); a temporal matte filter (US 8,792,718) | A/B | Masks need temporal smoothing against flicker |

## Limits

- The mask measures colour only. It does not know objects, so a red sign and a red dress keep colour together; spatial
  masks (shapes, tracked regions) are VP1.4.
- Temporal smoothing is a blend with the last frame, not motion-compensated, so high values trail behind fast motion.
- Feathering and colour maths run in gamma-encoded sRGB, as grading qualifiers do; CIELAB is computed through linear
  light.
- The CPU path suits previews and short shots; long or 4K renders wait for the GPU path (VP1.2) and the file pipeline
  (VP1.3).

## Verification

- `tests/selective-color.test.ts`:
  - CIEDE2000 matches all 34 pairs of Sharma, Wu & Dalal to four decimals; sRGB red is L* 53.24, a* 80.09, b* 67.2;
    HSV, hue distance and YCbCr are checked;
  - the target red is kept in all three colour spaces, and blue, grey, near-black and pale red are not; the soft edge
    falls steadily with hue;
  - windows fade in and out in seconds and in frames, and overlapping windows take the strongest;
  - the composite keeps red, greys the rest, goes all grey outside a window (monochrome) or shows the original
    (passthrough); the black level crushes, and the contrast curve steepens;
  - an edge-aware feather keeps a hard edge where a blur spreads, and temporal smoothing calms a flickering mask;
  - bad configs, frames and times are refused with codes, and clamped times are logged.
- Rendered review in Storybook (Chromium, 960×540) on a night street:
  - the red gate keeps its colour while yellow ornaments and blue neon go grey, and the mask follows the gate's edges
    with no halo;
  - before the window the shot is all black and white;
  - halfway through the fade the red is half back.
