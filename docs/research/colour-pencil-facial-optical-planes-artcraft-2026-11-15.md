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

## Storyboard evidence and negative-only gates

The existing `Video Production/Film Looks/Colour-pencil` Storybook construction sequence now has an interactive 3× licensed source/code-drawing anatomy atlas for **eyes, nose, lips**, and a separate feature-depth slider. Browser tests run all crops in **16:9 and 9:16** and prove the licensed reference is not painted beneath the stroke canvas or included in normal video export.

Target negative filters: preserve all previous dark hair/ear occlusion and five facial-tone probes; keep total output below 120,000 strokes and deterministic; do not invent lip deposits for plain skin; preserve iris glints. Source and actual rendered 1× and 3× after screenshots must be inspected; the source-reference deviation alone does not prove art quality.

**Remaining independent ArtCraft gate:** 18 independently measured source/output landmark comparisons, actual ArtCraft v7 `portrait_fidelity_gate.py` source-file hash/fidelity run, measured skin tooth and independent artist likeness critique. Until then, **no promotion to released realistic character**.
