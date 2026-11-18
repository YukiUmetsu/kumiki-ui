# Crayon ArtCraft V57 — exact CC0 outer hair silhouette residual correction

**2026-11-17 · !dev · PR #461 draft/unmerged; independent original-source QA required.**

Original photo: [Christopher Campbell CC0 brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Registered source is 608×1082 browser-screenshot SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, NOT the original high-resolution camera JPEG. Crayon material reference: [Mould et al. physical bidirectional crayon deposition](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf). Original hair organic texture and roots cannot be replaced by static smooth gradients or decorative hatch lines.

## Independent V56 source geometry evidence

Actual same-head Chromium f299 V54 vs V56 compared by full-resolution `skimage.metrics.structural_similarity(...channel_axis=2,data_range=255)` and exact original reference source, without retouch, reframe, exposure or scaling:

| ROI | V54 source SSIM | V56 source SSIM | Delta |
| --- | ---: | ---: | ---: |
| Full 608×1082 | .508431 | **.514884** | +.006453 |
| Crown | .367543 | **.409812** | +.042269 |
| Central roots | .318159 | **.345640** | +.027481 |
| Right upper curtain | .441029 | **.449810** | +.008781 |
| Source face | .728724 | .728723 | negligible |
| Near iris | .534444 | .534444 | exact same pixels |
| Upper foliage | .560451 | .560451 | exact same pixels |

A 9×22 original brown-vs-green RGB material-boundary scan now detects *V56* hair at y[278,261,247,232,219,210,197,186,182,181,185,189,187,187,193,204,219,234,259,292,336,383] at x[10,25,40,60,80,100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500] versus actual source y[288,272,261,243,232,215,211,191,185,189,198,197,190,194,201,210,222,243,282,309,353,388]. V56 is still 3–23 pixels above its real photographed edge. The background/source color threshold is an *observation hypothesis*, not exact person segmentation; independent photo SSIM is mandatory to accept any retarget.

## V57 isolated outer contour hypothesis

Retarget only three existing full source wax parent outlines (hair-back, crown, right curtain). Lower the 6 upper contiguous cubic segments smoothly by 4–14 px so crown silhouette becomes closer to authentic CC0 material boundary, especially x225..475. Preserve all original lower strand and 267+ microcurve hair shapes, V49 facial color, V50 hair pigment, V54 approved upper lid, original iris, brow, ears, roots, foliage and entire 300-frame timeline. No extra artificial V51 rim stripes, no projected synthetic gradient, no raster photo compositing. Source values are explicit and all element identities/bounds/material must remain unchanged. Three opt-in !dev full/2.85× crown/2.15× right Storybooks. 

## Art hold

Test V56 (control) vs V57 same actual Chromium source 608×1082 f299 and original SHA, RGB/SSIM for global/crown/central roots/right curtain/eye and compare true 22 station boundary MAE, not merely a changed screenshot. Accept only if **net photo likeness** improves and original protected regions do not regress. Real professional review, 18 independently verified rendered facial landmarks, five connected source value planes, full 300-frame natural-speed review and whole SSIM .85 gate are still absent; PR **must remain draft/unmerged**.


## Independent V58 exact original CC0/native f299 acceptance audit (2026-11-17)

**Technical CI PASS** on candidate commit `7437f10d4ee63c3d1fd96ebdbef051eb99d78dd1`:
[TypeScript and changed unit tests](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44148840140),
[physical CRAYON1 drawing](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44148840093),
[real Chromium 1×/2.85×/2.15× A/B and original-CC0 pixel proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44148840153),
[raw source-registered screenshots, original-photo JSON report and source x-boundary values](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44148840153/artifacts/14358207060).

The test hashes the **actual** original 608×1082 CC0 screenshot first; refuses missing/wrong/ambiguous source. Frame 299, original same-head camera/seed, original paper pigment and source-pinned 22 x-stations. The browser's independent 7×7 channel SSIM sampled every 3px returns `REGIONAL_SOURCE_POSITIVE_CANDIDATE` and original brown-hair/green-foliage 22-station mean y-absolute-error **9.6818→5.6364px** (−41.8%). All data and rejected controls are attached as `v58-original-photo-hair-top-audit.json`. **Sampled browser SSIM must not be mislabeled as full-resolution skimage SSIM.**

I then decoded the actual native screenshots and the original photographic source separately to compute **full-resolution** `skimage.metrics.structural_similarity(..., channel_axis=2, data_range=255)` and RGB MAE at original coordinates, no retouch or scaling:

| Original CC0 ROI | V56 SSIM | V57 SSIM | Delta | RGB MAE V56→V57 |
| --- | ---: | ---: | ---: | ---: |
| Whole 608×1082 | .514884 | **.515517** | +.000633 | 25.5457→25.5096 |
| Crown | .409812 | **.418208** | +.008397 | 20.7651→20.3176 |
| Central hair root | .345640 | **.352846** | +.007206 | 22.8361→22.3247 |
| Right curtain | .449810 | **.451758** | +.001948 | 21.9673→21.8633 |
| Hair top (x0–530, y150–420) | .492972 | **.496045** | +.003073 | 20.1694→20.0003 |
| Left temporal hair | **.321938** | .321877 | **−.000062** | 28.6412→28.6426 |
| Near iris | .534444 | .534444 | 0, pixel-identical | 24.6062→24.6062 |
| Original far eye | **.340139** | .339973 | **−.000166** | 51.4765→51.4818 |
| Upper foliage | .560451 | .560451 | 0, pixel-identical | 16.6081→16.6081 |

**Art review of real Chromium final screenshot:** V57 looks somewhat less like a geometrically uniform scalp cap than V56, especially x250–475, but the reference is still a photographic human with a more complex parting, three-dimensional rooted shafts, shadow occlusion and realistic botanical background; the crayon recreation still looks like a simplified cut-out with hard graphic eyes, nose and lips. The original far-eye photo ROI includes the crossing near-side hair border: 2.64% of pixels differ by >5 summed RGB units and source SSIM mildly regresses there; left-temple source also very slightly regresses. **No claim of complete negative controls or production approval.**

**Decision:** V57 is a *regional source-positive, isolated !dev research candidate* that improves the objective photo topological fit but not an accepted full ArtCraft portrait. Preserve V56 alongside as a same-source control. Release still held by whole SSIM **.5155 vs ≥.85**, source-registered 18 final-render landmarks, five continuous facial value planes, natural-speed entire 300 frames, and independent professional-art approval. The draft PR must remain **unmerged**.
