# WC19 — Eye-only, physically painted watercolor craft study

**Status: unapproved experimental asset.** This is an intermediate master-craft construction exercise, **not a finished portrait**, not a published Storybook human, and not a new animation film.

## Observed reference and source rights

- Primary measured source: a model-generated watercolor woman portrait already in the user's private image library (`静謐な水彩画の女性肖像.png`, 1122×1402). It was visually inspected at full size, then the near eye was cropped at original coordinates `[470,360,685,535]` and magnified 2× **for inspection only**. No pixels, raster image, sampled image patch, data URL or file fixture from that source are checked into Kumiki UI. This study is an original interpretation of the *craft and regional geometry*, not a source-matched portrait reproduction.
- <https://marywhyte.com/workshops.php> — museum-quality portrait benchmark: broad cheek/forehead glazes, a specific upper-lid weight and locally lost edges. Use the technique, not the person's likeness.
- <https://artprof.org/learn/tutorials-media/painting/painting-an-eye-in-watercolor/> — evidence for subtly tinted sclera, dimensional upper/lower lids, preserved white, uneven eyelashes and mixed crisp/soft edge distribution.
- <https://watercolorpainting.com/how-to-paint-a-super-realistic-watercolor-eye-to-give-life-to-portraits/> — observed wet-in-wet base, separately settled iris/pupil, after-drying hard accents and paper reserves.
- <https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf> — established watercolor material mechanisms: capillary transport, glazing, granulation, pigment accumulation and distinct types of edge. WM4 is a bounded qualitative simulation, not complete watercolor chemistry.

## Feature-to-stroke construction

| Semantic region | Specific observation in the owned source crop | WM1 mark logic | WM4 wet support | Rejection |
| --- | --- | --- | --- | --- |
| Supraorbital brow | Long broken arch, anisotropic roots from face toward hairline; darks accumulate near inner half | two unequal broad masses, segmented light/cool paint, 12 tapered hair gestures | umber/midline watercolor pigment | uniformly thick vector eyebrow and repeated equal-size comb marks |
| Orbital fold | warm-violet shadow above eyelid; near-root shadow heavier than far tail | sequential wet folds and drier dark sectional marks | diffuse cool socket pigment | straight closed outline or flat eye socket |
| Upper and lower lids | unequal curvature and value; partially lost lower rim | two individually curved pressure-graded paths, open corners and few secondary passes | warm and cool washes with slightly different drying | complete solid almond stroke with identical black upper/lower width |
| Sclera | mostly cool **tinted** paper, not white eyeball disk | 4 pale, uneven wash gestures behind iris | paper light + reserved white | perfect opaque white oval |
| Iris / pupil | olive, warm umber and shadow blue; eye partly occluded by upper lid | 10 principal masses + 14 irregular radial fiber marks, four pass pupil layers | physically deposited olive/sepia pigment | perfect flat circular iris pasted on skin |
| Upper/lower lashes | irregular angles and lengths rooted on upper/lower margins | 24 short dry-bristle tapers with individually changing pressure and trajectory | no fake random spatter | evenly spaced thick eyelash fence |
| Cheek, brow ridge, hair | glazes follow actual plane turn, dark hair mass behind face | 13 face-plane wash gestures, 11 rooted hair passages, paper lifts | broad wet face glazes + blue/ochre transport | a full opaque ellipse or constant noise filter |

**Drawing scale:** an original 640×480 eye-only sheet. Main eye anatomy is centered toward the right, with left hair/rooted brow entering from the upper-left. The near eye remains asymmetric; landmark geometry is codified as `WC19_EYE_LANDMARKS`.

## Medium requirement

- Uses `WatercolourSurface` and `PaintStroke` exclusively for painted marks (WM1), including **hair, iris, pupil, upper/lower eyelids, sclera, brows and cheek**.
- Uses `WatercolourWetPaper` with actual `WetPigmentDrop.path`, water, load, 14-pixel wet grid, flow and irreversible sediment for underpainting (WM4).
- Built-in pressure taper, brush speed, bristle breakup, local paper flecks and bloom effect come from the existing library engines, not a substitute postfilter.
- Skin/eye parts are **not** represented by a fake SVG `<circle>` or filled `<path>` in any WC19 source component. Every visible mark comes from the real watercolor renderer.
- Reserve iris highlights and fold sparkles as **paper gaps through both WM1 and WM4**. WC19 extends the actual WM1 brush type with validated `reservePaths` and masks the brush deposition, rather than drawing an artificial white circle over a dark pupil. It must be verified from actual screenshots.

## Visual QA iteration record

**Pass 1 (actual 640×480 Chromium dry frame, rejected):** The proof showed a green iris disk rather than an integrated eye, a heavy lower-lid V/almond silhouette, an overly solid eyebrow, extremely regular eyelash spacing, and a flat cream background without cotton-paper fibers. Macro shape was not convincing despite real WM1/WM4 operation. Source proof: [WC19 workflow run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43674746215), screenshot `wc19-dry-eye-native.png`.

**Pass 2 (source changes under browser review):** reduced iris/pupil mark widths, lightened the lower waterline and eyebrow mass, pulled the lower lid up to better overlap the iris, broke uniform lash spacing, made WM4 draw actual paper fibers, and added **WM1 paper-reserve masks** to retain the catchlight across every pressure-brush pass. This does not guarantee artistic improvement; compare the second native render and 3× crops before promoting the painting.

## Production / ArtCraft acceptance blockers

1. **Composition quality:** source-to-render eye crop has anatomically continuous upper/lower lid, tinted sclera, overlapping iris and asymmetric brow.
2. **Materials:** identifiable wet granulated wash, controlled directional drybrush and layered pigment, with no detached stickers or clean shape-filled boundaries.
3. **3× crops:** inspect iris, pupil, eyebrow, both lids, cheek and hair root. The source detail in each region must genuinely survive rather than being a broad blur.
4. **No false pixel SSIM:** the study is not intended as a same-pose literal source copy. Pixel SSIM against someone else's watercolor portrait is invalid. Compare semantic construction, local topological continuity, brush-direction distributions and pigment morphology.
5. **Visual proof:** inspect native Chromium wet/drying/dry frames, identify obvious defects, then either iterate or explicitly reject.
6. **No Storybook promotion** or full-face animation until artistically acceptable eye exists and subsequently both eyes, nose, mouth, skull/hairline and jaw also pass, on an original complete-head reference.

**Known medium constraints:** WM1 has a 120 stroke cap and the model uses 117 hand-authored strokes here. WM4 uses a finite grid and cannot preserve individual eyelash-scale liquid flow. A convincing original human eye may require localized additional brush sublayers and high-resolution paper/detail handling. Increasing the random stroke count alone is not acceptance.

## Reproduction

```bash
npx vitest run --project unit tests/watercolour-eye-brush-study.test.tsx
node scripts/watercolour-eye-native-proof.mjs --out=dist/wc19-native-eye
```

The GitHub workflow `watercolour-wc19-eye-native-proof.yml` publishes actual screenshot evidence. Image assets are **not embedded** in source nor expected to be available to users of the library.
