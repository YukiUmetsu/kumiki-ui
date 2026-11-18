# CRAYON1 F1 V50 — source-observed hair photometry on original rooted wax fibers

**Status 2026-11-17: isolated, opt-in, experimental / !dev / ART HOLD.**

Original source: [Christopher Campbell CC0 portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Evidence is the previously verified 608×1082 *browser crop*, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`; do not claim access to the full original JPEG. Source 7×7 median witnesses are compared to *actual native V48 Chromium* f299 pixels, no color normalization or altered source raster.

Physically, wax behaves as directionally pressure-deposited pigment on relief paper: [Rudolf et al., *Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), [Mould, *Simulating Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon.pdf). Original rooted fibers, varied pressure, micro-flecks, paper height and 18 source-rooted contour groups remain unchanged above deposited wax color.

Five-axis deconstruction: (1) **topology** 3 real hair masses and inner 267+ root paths; no disconnected sticker; (2) **vector flow** inherited V39 roots and V40/V41 asymmetric crown/curtains, unaltered; (3) **edge** feathered pigment contact with zero-alpha at its own ellipsoid boundary clipped to the original animated hair silhouette; (4) **depth** separately source-observed dark center crown, left reflected strands, low left-black and far curtain, never flatten existing three-pigment gradients; (5) **motion** no element ID, source path, seed, clip or timing changes across the original 300-frame film.

| Original source XY | Photo RGB | Native V48 RGB | Target |
| --- | --- | --- | --- |
| (278,215) | (45,34,29) | (73,51,44) | dark crown roots |
| (330,220) | (45,33,29) | (97,68,56) | rich crown value |
| (145,245) | (47,36,33) | (100,73,60) | asymmetric native hair root |
| (70,265) | (106,84,71) | (78,55,47) | near left reflected light |
| (40,364) | (92,64,50) | (46,34,29) | local auburn shine |
| (35,555) | (58,33,25) | (73,51,43) | near root value |
| (50,640) | (19,10,8) | (58,39,34) | under-occluded shadow |
| (80,830) | (2,1,0) | (71,53,45) | darkest hanging strands |
| (450,354) | (61,43,36) | (86,63,51) | far curtain root |
| (485,520) | (67,38,28) | (101,74,60) | far veil |
| (550,860) | (52,33,27) | (69,50,43) | source tail |

**Implementation:** reusable native CRAYON1 opt-in material underpaint fields (4 crown, 4 left, 3 right) mapped into the exact original V40 element bounds. Exactly the existing three wax materials change; preserve V48 face, V46 eye, original 267+ hair strands, photographic leaf backdrop and all 300 frames. Source witnesses and author-selected physical pigment mixtures are distinguished; pigment is a trial, not a proven result. Tests enforce all original artwork's deep equality, three modified materials, native pixel grain, original CC0 SHA, and fail-closed source integrity.

**QA status:** Opt-in `source-anat1-photometric-hair-v50` and four !dev interactive Storybook views are integrated in the existing ArtCraft workbench on the preserved V48 original 300-frame source geometry. Same-head Chromium PNG and independent photo-relative RGB/SSIM evaluation are recorded below. No merge before ArtCraft release requirements and professional review pass.

## Independent native Chromium source-relative verification, 2026-11-17

**Verified render head:** `89ca0ccf34fbfc813729fe1b1c66955ef2cf4da1`. [Original native browser V48/V50 screenshots](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44122687232/artifacts/14345592985) contain four exact 608×1082/2.3× source-compatible f299 screenshots, produced by original `CrayonScene` React/SVG (no composite overlays). The authentic independent source is the exact original 608×1082 screenshot SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, separately verified with `sha256sum`. It is **not** the original high-resolution JPEG.

**All three engineering workflows passed at this exact code:** [TypeScript/changed tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44122686658), [original crayon drawing grammar](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44122686549), [native Chromium ArtCraft screenshot/negative controls](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44122687232). These are engineering checks, not artist signoff.

Source-photo comparison below decodes the actual PNG 8-bit RGB pixels, extracts exactly matched `(x0,y0,x1,y1)` crops, computes `skimage.metrics.structural_similarity(...,channel_axis=2,data_range=255)` and mean per-channel absolute RGB error. No retouch, raster fitting, color correction, registration change, scaling or source replacement occurred.

| Original photographed ROI (x0,y0,x1,y1) | Native V48 SSIM | Native V50 SSIM | Δ SSIM | RGB MAE V48→V50 |
| --- | ---: | ---: | ---: | ---: |
| Entire 608×1082 photograph | .500630 | **.507668** | **+.007038** | 26.867→**26.087** |
| Crown (132,175,462,320) | .330301 | **.367543** | +.037242 | 28.799→24.705 |
| Actual center roots (225,185,366,275) | .253907 | **.318159** | +.064252 | 36.090→26.578 |
| Near/left temporal hair (0,225,125,656) | .315597 | **.323745** | +.008148 | 30.792→28.491 |
| Left lower curtain (0,655,135,1080) | .323070 | **.340958** | +.017888 | 35.114→33.773 |
| Far/right upper curtain (445,321,565,705) | .423315 | **.441029** | +.017714 | 23.871→22.289 |
| Far/right lower curtain (492,680,607,1040) | .480278 | **.489245** | +.008967 | 16.367→15.783 |
| Original face negative control (175,410,375,830) | .724289 | **.724289** | exactly unchanged | 20.419→20.419 |
| Original near iris (239,531,292,570) | .516876 | **.516876** | exactly unchanged | 27.827→27.827 |
| Original upper foliage (0,0,80,75) | .560451 | **.560451** | exactly unchanged | 16.608→16.608 |

All three native-source negative controls show **zero changed pixels at a >5 summed RGB delta**, not merely DOM-presence equality.

Original 7×7 pixel median source-relative spot results from identical screenshots confirm that every one of the 11 hair witnesses improved in RGB absolute error (though many remain too bright). Examples: central root at (278,215) source `(45,34,29)`, native V48 `(73,51,44)`→V50 `(61,43,38)`; left root (35,555) source `(58,33,25)`, V48 `(73,51,43)`→V50 `(57,40,35)`; far veil (485,520) source `(67,38,28)`, V48 `(101,74,60)`→V50 `(76,56,50)`.

**Independent visual criticism of true full-size native V50:** The dark crown and colored root-to-curtain transitions are less chalky and more consistent with the photographic shadow. Yet the actual hair outline remains a **large smooth helmet**, too few visible individual tapered hair locks survive at 1×, and the forehead, nose/eye, lip and landscape still look like layered paper rather than convincing original human anatomy and organic foliage. No stylized color pass can correct missing shape topology. Source SSIM 0.5077 is still far short of the required 0.85; an independent artist has not accepted the result. This work is a measurable **regional experiment only**.

**Next priorities:** original photo-relative 3D hair-root projection and true asynchronous strand depth (without copying a bitmap); realistic tarsal and tear-film construction; five anatomically connected skin value planes; all 18 actual final-render source landmarks; full natural-speed 300-frame playback and reference-visible artist gate. Keep PR #461 **DRAFT / ART HOLD / unmerged**.

