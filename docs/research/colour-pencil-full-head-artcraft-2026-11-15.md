# ArtCraft v7 · CC0 full-head value and hair-material construction

Status: **experimental only; artist acceptance withheld**, 2026-11-15.

## Reference-led procedure

**Geometry reference:** [Christopher Campbell's CC0 brunette photo at Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). We used the actual 608×343 image in the existing Storybook browser proof (the rendered photo crop is 900×506) to observe the hairline, cranial silhouette and face silhouette in screenshot coordinates. The marked points in `colored-pencil-full-head.ts` have an *estimated* ±4 screenshot-pixel observation tolerance. They reproject to landscape/portrait using the existing source-normalized 25-point facial map; they are not a universal face detector or independent approval-quality landmarks.

**Artist technique references (no art pixels or contours copied):**

- [Elena Pancorbo's portraits](https://www.elenapancorbo.com/): connected facial volume under the orbits and cheekbones; bright paper reserves and controlled red-brown drawing accents.
- [Jesse Lane workshop portrait](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020): continuous value blocks, underlying cool/warm layers, intact corneal light and hair-to-skin occlusion.
- [COLORED PENCIL Magazine, Silvia Maccaferri, *Dare to Draw Hair!*, 2016](https://coloredpencilmag.com/wp-content/uploads/2017/02/COLORED_PENCIL_Magazine_05_May_2016.pdf): grouped hair masses, root flow, dark core before fine individual fibres.
- [Royal Talens coloured-pencil portrait technique](https://www.royaltalens.com/blogs/pencils/portrait-drawing): layered shading and burnishing, fine pencil points for edges rather than equally thick outlines.

## New paper-only head proof

`createDryPencilHeadPlate(sourcePixels,sourceFeatures,seed)` returns a 540×600 plate of **independent pencil paths, with no photographic underpaint**. The original source data never goes into this plate as an image. An opt-in comparison sits in the **existing** `Video Production/Film Looks/Colour-pencil` Storybook folder, so the source and the generated drawing are simultaneously visible.

1. **Silhouette hierarchy:** source-measured face polygon and enclosing connected hair silhouette; clipped to the actual photograph. Source image is a particular 3/4 portrait; the source-specific silhouette must not be used for arbitrary uploaded faces.
2. **Five value bands:** separately counted deep, cast, halftone, light and paper reserve. Luminance is smoothed over a small optical neighbourhood, classified into coarse bands, then deposited in three distinct low-pressure passes. Not a 1:1 photo raster or a generic beige face oval.
3. **Face materials:** forehead, nose, cheek and jaw strokes orient to volumetric landmarks. Face contour is feathered, supporting soft plane changes. Each local pigment mark takes its colour from the rights-verified source rather than a hard-coded skin complexion.
4. **Hair:** skin and hair are separate semantic material fields. Source-specific auburn colour and connected head envelope reject green garden pixels; two broad low-pressure hair passes precede root-aligned quadratic hair strands. A green-only source cannot accidentally create a brown wig.
5. **Measured facial details:** source-observed eyelid, brows, iris glints, alae, vermilion and chin fibres remain anchored to the 25 already measured landmarks. The old rejected synthetic character remains rejected.

**Runtime budget:** only computed while the user enables the experimental full-head inspector. The regular photo-backed drawing, animation timeline, and video-export bitmap are unchanged. Unit tests include material ownership, missing/bad guide fail-closed checks, deterministic seeds, image extents and 5 value bins. Browser tests on the real CC0 image record separate side-by-side 16:9/9:16 PNGs and compare the unchanged main export bitmap.

## ArtCraft gate still BLOCKED

The full-head silhouette and hair contours are **one source measurement** and not independently annotated on the rendered drawing. The 18-landmark+five rectangle match, reference-file SHA-256, ArtCraft v7 `portrait_fidelity_gate.py` proof and professional 1×/3× human face critique are not yet complete. Technically passing tests **does not** authorize the art as a released/approved character. The current experimental crop can still have flat noses, weak brow detail, fake hair flow or unconvincing surface tooth. Reject and iterate based on actual screenshots before upgrading.

Next prioritize: visually inspect the actual cropped hair/face, correct connected hair masses and cheek/jaw landmark uncertainty, add five independently chosen tonal rectangles, calibrate pencil tooth/burnish, then apply the independent ArtCraft gate.


## Real-browser ArtCraft critique and rejection/repair log

Actual Chromium / licensed source artifacts (no synthetic proxy):

| Iteration | Source-vs-output evidence | Independent inspection | Status |
| --- | --- | --- | --- |
| V1 | [CI run 43687447939](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43687447939) | Face almost disappears into paper; hair drawn as thin grey comb; white scalp/ear void | **Rejected** |
| V2 | [CI run 43687762619](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43687762619) | Warmer and more readable face, auburn hair, but face cut out in a pale rim and a black hair lock missing | **Rejected** |
| V3 | [CI run 43688035743](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43688035743) | Dark hair recovered by source-connected chromatic neighbourhood; facial shadow and hair mass remain unnaturally uniform | **Unapproved** |
| V4 | [CI run 43688292304](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43688292304) | Source-gradient eye/lip/nose accents; actual-output improvement is limited at 1×. Hair outline still needs better root/edge craft; image does NOT satisfy Pancorbo/Lane fidelity | **Unapproved** |

Crop-image evidence (these are **browser-rendered screenshot bytes**, *NOT* the original Wikimedia photograph bytes):

- 608×343 source image examined for the manual landmarks; rendered 540×600 comparison canvas photographed at 285×318.
- Landscape source-comparison PNG SHA-256: `366a8f5f5572a70048bd4428f10034092b2dc702227ec395ccc06d9c087914fc`.
- Experimental V4 dry-only landscape PNG SHA-256: `aa4adcb8e9a72b2d348efe4d49f6da29f75b06c88ff90fcda9f0fb64abcd0958`.
- Experimental V4 dry-only portrait PNG SHA-256: `d9c0e663121eda32352a82f6a577c354ec81cfea7307e1ac457ccd1ba5371c66`.

These hashes pin exactly what was reviewed, rather than relying on screenshot existence. No claim that the original source-file byte hash or independent ArtCraft v7 `portrait_fidelity_gate.py` approval has been completed. The rendered face still has a stylized eye, weak nasal cartilage, soft vermilion and uneven paper-to-hair transitions. Do **not** promote it to a released character. The opt-in Storybook proof is legitimate research/QA infrastructure only.
