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
