# ArtCraft CP17 — Photographed neck-shadow root continuity

**2026-11-15. Experimental portrait; NOT independent artist approval.**

## Reference, anatomy and diagnosis

Licensed topological/value source: Christopher Campbell's [*Brunette woman portrait (Unsplash)*, 2015, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). The actual PR #399 native Chromium screenshots and the 3×/4× dry paper vs original **show a conspicuous ruled ivory neck streak** at photographed 285×318 screenshot x≈138–140, y≈238–281. The photograph shows a coherent sienna/umber neck-shadow surface under the jaw instead. The white streak is too regular, vertical and continuous to be realistic dry-pencil paper grain.

We measured the actual licensed source/PR #399 generated proof at 285×318 native screenshot coordinates. In a photo-dark lower-neck region x=136–144, y=240–278 (351 source pixels with luminance <=185/255):

| Source native luminance | v16 pencil luminance | Mean missing darkness | Mean absolute tone error |
|---:|---:|---:|---:|
| 99.45 | 125.03 | **26.30** | **27.01** |

The source-trained local guide map puts the neck gap near the photographed **hairline x** below the observed **chin y**. This is not a reusable universal neck contour. A deliberate source-based neck material construction should preserve the real facial jaw, sternocleidomastoid flow, existing auburn root strands and background. **It must not simply blur, stamp a patch of brown, or draw a synthetic straight rule.**

Craft references for mechanics only: [Janie Gildow's light-pressure layered colored-pencil scumbles](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf) and [Alyona Nickelsen's precise pencil/tooth and optical tonal build](https://coloredpencilmag.com/amaalyona/). The copyright-free *photograph* is the ONLY observed sitter geometry and hue source; artist paintings are neither traced nor embedded.

## Implemented source-conditioned correction

Pure `createPhotoNeckContactFibres` projects the 25-landmark source-registered **chin/hairline/eye separation** into the full-head paper crop; only a ~5-pixel-wide source-specific neck-root corridor from just below the chin to the photograph end receives any new mark. Three low-pressure passes with five offset fiber paths and deterministic seeded variation maintain different hue, pressure, width, taper and curved tangent rather than a repeated straight stripe. Each local mark samples the actual photograph and its *both-side* optical neighbors. Bright/paper pixels and green garden fail independently. At 0% the result is EXACT legacy output; a cropped-off neck produces zero marks, not an exception. No source image, color wash, screen filter or raster underpaint is returned.

In the existing single Color Pencil Storybook folder: add a reversible 0–100% **Source-observed neck contact closure** control with accepted/photo-supported and rejected sample counts; paint extra quadratic pencil contacts only after constructing the full paper portrait (and the fourth completed storyboard panel). The original 4-shot stage structure, all existing facial/hair marks, and the distinct normal photo-to-pencil video export remain unchanged.

## Release gates

- Pure geometry tests: deterministic seed, nonmutating reference data, source supported bounds, never paint garden green or paper white, no marks in offscreen neck, finite controlled alpha/width, fail closed for corrupt source/map/crop.
- Actual Chromium 16:9 and 9:16: both 0%/100% native CC0 screenshot A/B, brown ink contacts >100, source-dark gap should lose **at least 0.8** mean-luminance deficit on x136–144/y240–278; total local tone MAE must not increase by >1.5; photographed pupil, lip seam, garden and known near-black ear are **bit-identical**; ordinary video export unaffected.
- Artist-level check: inspect the corrected neck seam at **actual 1× and 4×** for fresh adjacent flaws and painterly continuity, not just passing negative gates. Human likeness and source realism still not approved as a whole.
