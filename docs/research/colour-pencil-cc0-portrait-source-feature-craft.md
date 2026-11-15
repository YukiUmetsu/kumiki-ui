# Coloured-pencil human face — source-derived feature construction (ArtCraft v7)

**Status: experimental, not artist approved.** This PR does *not* replace the rejected 22-region SVG portrait with another invented face. It extends the existing `ReferenceGuidedFaces` art engine with localized pencil marks attached to a **single rights-verified CC0 photograph**.

## Reference sources, licensing, and observed differences

- **Anatomical source:** [Christopher Campbell, *Brunette woman portrait* (2015), Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), verified [CC0](https://creativecommons.org/publicdomain/zero/1.0/); Wikimedia lists the 2015 Unsplash upload before the June 2017 custom-licence change. The original photograph can be used for reproducible crop-local facial geometry. **No facial contour is traced from artist-owned work.**
- **Craft benchmark (technique only):** [Elena Pancorbo's portraits](https://www.elenapancorbo.com/). Study subtle lid overlap, warm cheek-to-temple gradual planes, hair root groups and selectively tight/detail-rich linework. Her art is not embedded, sampled, or used for identity landmarks.
- **Craft benchmark (technique only):** [Jesse Lane, coloured-pencil portrait processes](https://www.theartguild.org/home-2/the-portrait-in-colored-pencil-workshop-with-jesse-lane-june-13-14-2020). Study deep orbital values, selective wet-looking eye glints, skin tonal depth and hair separation; no contours copied.

## Source measurements

The existing `ReferenceGuidedFaces` camera produces a canvas of 900×506. Earlier local browser evidence contains a 608×343 output capture of the same photographed subject, which was inspected at native size and 4× face crop. We manually observed 25 distinct points: left/right and center of both eyelid apertures, three points on each brow, bridge/tip/alar of the nose, cupid bow/lip corners/lower lip, both cheeks, chin, forehead and hairline. Uncertainty is **~2–5 screenshot pixels per feature**; no false subpixel precision is claimed. The source points were inverse-mapped through the initial 2.05× zoom and focal position `(.52,.25)` to intrinsic normalized photo coordinates (not the legacy rejected SVG geometry). Source coordinates are in `CC0_WOMAN_PORTRAIT_SOURCE_FEATURES`.

`mapCC0WomanPortraitFeatures` projects the same source-space points into a new `fit` or `focus` viewport, 16:9 or 9:16, using the exact input image native width/height and crop math already used by `ReferencePencilAtelier`.

## Procedural drawing detail

- Upper eyelid and far eyelid: short, low-opacity edge-following, local-sampled dark pigment lines. No new opaque eye-white or solid cartoon pupil.
- Near/far eyebrows: independent short curved root-to-tip fibres rather than a dark rectangular brow.
- Iris: tiny radial pigment strokes at the photographed iris position while preserving photographed catchlights.
- Nose: soft, low-pressure bridge-to-alar marks; never an opaque nasal wedge.
- Lips: upper and lower vermilion edge traces with separate vertical fine-grain deposits; reuses photographed boundary.
- Facial volume: 5 localized skin planes (near/far cheek, forehead, nose and chin) receive layered, visibly sized fanned paper-grain deposits matched to local photo-derived material colour instead of hatching across the entire scene. No complexion assumption or global skin segmentation is used.\n- Every mark: source-local sampled RGB → controlled earth pencil chroma, deterministic seed and CP-F1 chronological pass, clipped to page.
- **Fidelity boundary:** the photographed value map stays unchanged by guide introduction, guaranteeing geometry/skin volume cannot shift because of overlaid marks. No guide data applies to uploaded user photographs, a man portrait or wildlife.

These source-derived paths are **not universal facial recognition** and do not magically make a true high-end pencil painting. They are a more reliable basis for a later face drawing engine than the rejected hand-invented human SVG.

## Concrete tests and quality acceptance

`tests/colored-pencil-portrait-guides.test.ts` validates camera projection relative to actual observed coordinates, distinct feature families, cropping, deterministic marks, bounded pressure and explicit opt-in. `tests/e2e-storybook/colored-pencil-portrait-guides.spec.ts` checks Chromium interactivity in both formats using **synthetic controlled art**; these E2E screenshots are *technical regressions only*, not examples of professional human portrait quality. The overlay is debugging-only and never alters export canvas pixels.

**Actual same-source A/B:** `ReferenceGuidedFaces` exposes **Draw anatomy-aligned pencil passes**. Switching it off preserves the source photo, canvas framing, CP-F1 base pigment and all existing controls; switching it on adds only the source-aligned feature/form marks. The live CC0 browser proof now saves both versions from the identical source and frame in both aspect ratios. The earlier pre-PR screenshot is not a valid A/B because previous pipeline revisions differ.

**Additional real-source ArtCraft review still required for artistic release:** source photo pixels → actual Chromium render at 1× and 3×, eye/nose/lips/hair color/contour discrepancies and visual rejection notes; run the v7 independent landmark/value gate with the exact source/candidate image bytes. Green TS, unit and E2E tests cannot substitute for this. The legacy SVG portrait remains quarantined, and no general human rig is promoted.
