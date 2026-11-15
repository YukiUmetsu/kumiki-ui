# ArtCraft v7: measured vermilion and nasal pencil-plane rebuild

Status **EXPERIMENTAL / artist review NOT PASSED**. These marks are a study for one licensed source, not an approved universal human drawing algorithm.

## Licensed source and craftsmanship reference

Anatomical reference and exact guides: [Christopher Campbell, *Brunette woman portrait (Unsplash)*, CC0](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). It is the same 25-landmark, author-measured source crop and hair silhouette already used by `src/video/colored-pencil-portrait-guides.ts`. No source image bytes or artist-owned images enter the pencil stroke generator.

**Artist craft comparisons only** (no copyrighted outlines traced, pixel data copied or likeness used): [Elena Pancorbo pencil portraits](https://www.elenapancorbo.com/) present anatomically quiet skin planes beneath warm/chroma-rich vermilion, curved lip volume and fine sharp contours; [Jesse Lane's colored-pencil realism](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020) keeps eye sockets and nostril cast shadows dark but physically connected to soft form; [Justin Maas, *Portrait Drawing with Lyra Rembrandt Polycolor*](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf) explicitly starts with measurement and value before multiple hue layers.

## Previous actual-browser rejection (PR #361)

The 285×318 screenshot of the **540×600 dry-paper output**, inspected against the exact CC0 photo crop, shows an artificially pale upper/lower mouth despite acceptable general hair mass. Pixel region values use **mean luma of 7×7 RGB screenshots**, not `fiveValueCounts`; RGB are screenshot pixel bytes, not the original file.

| Observed region in 285×318 crop | CC0 source luma /255 | Old dry-pencil output /255 | Deviation |
| --- | ---: | ---: | ---: |
| Upper vermilion (180,188) | 75.3 | 113.0 | +37.7 |
| Lower vermilion (194,201) | 110.6 | 150.9 | +40.3 |
| Nasal ala (182,157) | 63.3 | 78.0 | +14.7 |
| Nasal bridge (176,142) | 198.8 | 238.4 | +39.6 |
| Cheek (119,164) | 185.4 | 213.5 | +28.1 |

The previous 285×318 browser output PNG SHA-256 is `027268219d086440bbb7fc28de4bce8856e0a76c6665233de2521fa01274db81`; source-crop screenshot SHA-256 `a5ca58f60268820ce19bd9421a050f90e04cdf489b39d02b514ead0919b47e07`. These hashes identify **browser screenshots**, not the original CC0 file bytes.

## Local construction sequence

`createFacialOpticalPlanes(source,guides,seed,strength)` is a deterministic, standalone **paper-only gesture generator**. With the measured lip corners/cupid/lower marks it interpolates an anatomical vermilion band, then samples actual hue, optical darkness and *adjacent skin* contrast. Uniform peach skin and teeth **must never** become a lipstick-shaped digital fill. Short, slightly curved warm-red/brown dry strokes follow the lip pillows in two light layers. The nasal alar construction samples the true local source-value gradient, rotates sharpened fibres along the edge tangent, and leaves the highlight unfilled. There are no general face ellipses, bitmap pigment washes, photo pixel underlays, or artist artwork transfers.

`createDryPencilHeadPlate` composes this low-count plane layer before the already-audited actual eye/lip/nose feature marks. The feature depth parameter is bounded 0…1, defaults to .85, and belongs exclusively to the opt-in CC0 research inspector. Existing main video export remains untouched.

## V2 real-browser rejection and repaired measurement

The first optical pass improved the upper vermilion (source 75.3, output 82.8) and alar shadow (source 63.3, output 71.0) but did **NOT** improve the actual lower lip (still 150.9 vs source 110.6). We rejected that partial result on visual comparison.

**Topology correction:** the original model passed the measured `lipCupid` and `lipLower` points as quadratic Bézier *control handles*, although they are observed points **on** the anatomy. A quadratic only reaches halfway toward its handle at t=.5, missing the true lower-lip point by roughly 6 screenshot pixels. `observedVermilionEnvelope` solves the control Y coordinate at the landmark's measured X: the resulting upper and lower curves pass through their source-observed points exactly. The second two-direction, warm/cool pencil stroke pass then fills photographed pigment planes without painting teeth/skin via local color and value checks.

**Actual Chromium V2** [source-vs-dry proof run 43694195850](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43694195850), observed 285×318 screenshot, 7×7 average RGB → Y:

| Photo-registered plane | Source Y | Prior PR #361 dry Y | V2 dry Y | Improvement |
| --- | ---: | ---: | ---: | ---: |
| Upper vermilion | 75.3 | 113.0 | **78.2** | 34.8 closer |
| Lower vermilion | 110.6 | 150.9 | **138.2** | 12.7 closer |
| Nasal ala | 63.3 | 78.0 | **71.0** | 7.0 closer |
| Nasal bridge | 198.8 | 238.4 | 238.4 | **not yet improved** |
| Cheek halftone | 185.4 | 213.5 | 213.5 | **not yet improved** |

V2 real Chromium dry-only output SHA-256 landscape `691488a3f35f0793758831b3806bf4d66d7942ba003d57dfd165afd770fa6213` and portrait `0256edd6240b80072e745ce4a02e65e42070c0bca57eea57e6d2ca50b877a51d`; 3× lips atlas screenshot `16daaa191ef01eb5433d1f6854d80b2c7fbed0e7664d1876a3ae8ffde8a035d7`. These are PNG hashes, **not** a hash of the original CC0 photograph.

The final source/dry `compareCC0Vermilion` is a **negative-only optical gate** at these two registered anatomical patches. It rejects a return to the previous washed-out lip using source-dark bounds and maximum luma deficits (25 upper / 36 lower). This does NOT approve anatomical likeness or hand-crafted pencil material quality. Existing eye, hair, shadow and five-plane tests remain mandatory. V2 screenshots remain somewhat speckled and pallid in the cheek and nasal bridge; those are unaddressed craft failures and must not be called solved.

## Storyboard evidence and negative-only gates

The existing `Video Production/Film Looks/Colour-pencil` Storybook construction sequence now has an interactive 3× licensed source/code-drawing anatomy atlas for **eyes, nose, lips**, and a separate feature-depth slider. Browser tests run all crops in **16:9 and 9:16** and prove the licensed reference is not painted beneath the stroke canvas or included in normal video export.

Target negative filters: preserve all previous dark hair/ear occlusion and five facial-tone probes; keep total output below 120,000 strokes and deterministic; do not invent lip deposits for plain skin; preserve iris glints. Source and actual rendered 1× and 3× after screenshots must be inspected; the source-reference deviation alone does not prove art quality.

**Remaining independent ArtCraft gate:** 18 independently measured source/output landmark comparisons, actual ArtCraft v7 `portrait_fidelity_gate.py` source-file hash/fidelity run, measured skin tooth and independent artist likeness critique. Until then, **no promotion to released realistic character**.
