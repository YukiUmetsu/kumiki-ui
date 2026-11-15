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

## WC20: structure-led paint passes (pending proof)

The WC19 second pass remained too flat. The intermediate WC20 screenshot (actual
native Chromium) improved edge cohesion and iris overlap but **failed** art QA:
unpainted sclera had been flooded with broad skin/orbital brush pigment,
making the eye resemble a horizontal slit; the iris still lacked integration
with the lid, and hair/eyebrow shapes were too graphic.

- Retain real WM1 watercolor brush and WM4 pigment/deposition. No rasterized
  user reference and no fake SVG wash-fill fallback.
- First, paint the **foundation** with WC20's exact hand-authored eye aperture
  protected as an additional WM1 paper reserve. This is the desired unpainted
  eyeball substrate, not a white overlay pasted on the surface.
- Second, paint the **tinted sclera**, then the **iris**, with separate
  pressure-pigment subpasses constrained by the same asymmetric aperture.
- Finally, paint the top and bottom **eyelids and lashes** in foreground with
  pressure brush gestures (broken edges / regional near-black only).
- Continue measuring the actual source eye, brow, hair and orbital flow in
  the original owned reference image, not random facial ornament.

**Pending visual blockers:** the iris needs internal colored light/dark mixing,
upper-lid weight, irregular lash roots, soft skin tone transitions and natural
hair root mass direction at actual 1× and 3×. No human portrait is approved,
even if another browser capture and CI are green.

## WC20 source-geometry correction after a failed native proof

I inspected the user-owned 430×350 near-eye crop with a 25px coordinate
grid. Estimated construction landmarks (manual; not ground-truth segmentation):

| Feature | Source-crop coordinate (x,y) | Interpretation |
| --- | --- | --- |
| Outer canthus | (165,211) | partially lost in hair/socket shadow |
| Inner canthus | (359,205) | red tear pocket, not a black endpoint |
| Upper aperture apex | (276,160) | folds under a rounded brow ridge |
| Lower aperture bowl | (275,238) | asymmetrically warm rim and reflected light |
| Iris center | (291,190) | shifted toward the inner canthus |
| Brow center | (275,109) | rooted hairs, partly covered by fringe |
| Eyelid/iris overlap | upper ~8–12px | iris is not painted in front of the lid |

The source aperture's rough width:height is **194:78 ≈ 2.49**. The earlier
WC19 code drew ~360px across a shallow ~50–70px aperture, more than twice
as elongated as the observed reference. The initial WC20 correction was
still ~293:67 ≈ 4.37, and looked too much like a long slit in the actual
browser screenshot.

**Source-driven new pass:** the latest authoring anchors are outer
`(260,264)`, inner `(508,249)`, upper `(406,218)`, lower
`(380,300)`, giving a **248:82 ≈ 3.02** source-space opening while
retaining an original face interpretation. Compress sclera/lid/lash x-axes
around the iris, bring brow plane closer to eyelid, and align real WM1
painted irises and eyelid endpoints. No generic ellipse replaces the painted
source morphology.

This is still **not** a fidelity pass: source observations are human-labeled
approximations, the generated painting is not a pixel-aligned copy, and
independent actual-browser visual approval is pending.

## WC20 directional watercolor hair and complexion pass

After reviewing the source-measured native screenshot, the eye aperture was
closer to human proportions, but the upper-left hair still resembled a
**logo-shaped rounded umber wedge**, and the lower cheek consisted of broad
unattached light-pink vector ribbons. These defects fail the illustration
quality gate despite passing pressure/water transport checks.

Corrections now under browser review:
- Redraw the largest hair masses from **crown-to-temple descending gestures**,
  rather than a large horizontal cap. Reduce broad-stroke load and diameter
  and retain rooted negative-space strands.
- Suppress excessive dark side locks and keep soft cool/warm hair glazes,
  supporting the actual reference's inward-flowing hair.
- Reduce skin glaze widths/intensities to avoid floating pastel polygons.
  The cheek values now turn diagonally with the lower eye/face plane.
- Replace mechanically even eyebrow-hair origin spacing with explicitly
  irregular authored roots. Preserve WM1 per-contact pressure changes.

**Do not accept a technically green render on these changes alone**: visually
inspect the full 640×480 painting and hair/iris/lid crops. No user-facing
portrait Storybook story until a static full-face study exceeds the reference
quality threshold.

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
