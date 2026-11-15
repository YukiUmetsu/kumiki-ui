# ArtCraft 9.1 — F1 source-registered eyes / wax-crayon orbital construction

**Status: research, still REJECTED.** Scope is **only the paired source-specific eyes** of the existing [PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281). Keep the same Crayon Storybook folder, photographed F1 identity, face-space 608×1082, original hair occlusion, and `!dev` workbench. Do not combine with the unrelated B1 character body.

## Sources, rights, limits

- **Canonical identity and proportions:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), photo 2015, **CC0 1.0**. ArtCraft's locked reference is the native 608×1082 screenshot SHA-256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`. The original full camera JPEG is *not* claimed as a locally verified F1 pixel source.
- **Traditional-media observation:** Tanja Jensen, [*Portraits in Oil Pastel; Rendering a Realistic Eye*](https://www.skillshare.com/en/classes/portraits-in-oil-pastel-rendering-a-realistic-eye/1628683878) (finished brown-eye close-up): layered under-lid color, uneven dark lash-root value, displaced highlights, pigment changing with pressure. **Rights unverified**, link only, do not copy source pixels.
- **Additional mark reference:** Naomi Duben, [oil pastel drawings](https://www.naomiduben.com/oil-pastel-drawings): uneven semi-opaque pigment deposits, dark iris/lid contact and warm/orange cool-violet orbital transitions. Artist material differs from wax crayon, so use as *structure/mark contrast guidance*, not a wax chemistry reference. **Rights reserved**, no embedded imagery.
- **Medium source:** conservation-observed crayon contact and tip pickup summarized in `crayon-artcraft-v9-fiber-contact-2026-11-15.md`. Actual soft oil pastel and wax crayon are **not interchangeable**: do not infer wax binder flow from pastel photographs.

## Actual baseline from photographed/source and native browser render

Both source and candidate were cropped with identical pixel rectangles: near x195..340/y470..596 (145×126 px), far x380..492/y444..560 (112×116 px). The **source** has soft orbital volume, an upper lid **over** the iris, dark contiguous lash margin and irregular asymmetric eyelid creases; the rendered **baseline** has two nearly circular free-standing brown irises, large pale sclera regions and vertical geometric hair-like spikes.

- Near eye anatomical observation at source: canthal region around x218..322/y517..581; exposed iris approx x245..281/y533..565. Source native iris looks closer to **36 px** across versus previous CRAYON1 iris bound **53 px**. Fully source-observed exact pixel mask for iris is not yet independently manually annotated.
- Far eye at x404..474/y490..555; upper iris and far/right corner partly hair-occluded, not a reflection of the near eye; old CRAYON1 iris bound **48 px** versus proposed **38 px**.
- **Unmodified native baseline ArtCraft v9.1 `portrait_fidelity_gate.py`:** full frame SSIM `0.3491`, edge-difference ratio `3.4318`, histogram correlation `-0.2907`; **FAIL**. Named matching near crop SSIM `0.3013`, edge ratio `2.9043`, histogram correlation `-0.1790`; **FAIL**. Far crop SSIM `0.3067`, edge ratio `2.7809`, histogram correlation `-0.2308`; **FAIL**. The gate compares a photograph to an illustration and is intentionally strict; differences require contour/landmark review, not a claim that all pixel mismatches are unacceptable artistic choices.

## Source-to-construction matrix

| Part | Photo topology / attachment | Rejected shortcut | New code-native structure |
| --- | --- | --- | --- |
| Near white region | tapered wedge, mostly nasal-side sclera, warm shadow toward outer side | oversized smooth white almond | source-space crooked cubic rim; real opaque wax underpainting; full width <=116 px |
| Near iris + pupil | dark source-held upper third, nonconcentric unequal dark interior; iris x245..281 | 53-px freestanding circular brown icon and central round black dot | 42-px irregular iris and 21-px pupil parent-clipped, partly covered by later upper lid and lash-root |
| Far iris + pupil | compressed by face turn and hair occlusion, darker than near | 48-px full doll iris, exposed evenly on both sides | 38-px source-asymmetric iris, 18-px pupil, hair occlusion retained |
| Upper eyelid + lid fold | two overlapping planes, slight temporal thickening; lash margins dark, actual skin folds warm | one clean arch plus evenly spaced smooth SVG eyelash needles | connected orbital fold/open wax; overpainting upper tarsal wedge; skinny dark opaque wax lash-root; seven near / four far tiny *connected* tapered wedges |
| Lower tarsal area | flesh-red line turning into displaced cheek cast shadow, uneven side-to-side depth | complete oval around eye | separate open lower-lid planes and pressure-built pigmented margins |
| Tear duct | small nasal pink transition on face, distinct from eye white | generic thin vector bracket | parent-clipped muted open wax meniscus |
| Hair/eye | far eye partially hidden by curtain, do not draw highlights over it | screen-level eyelid outlines over hair | draw all source-based eye details before `hair-right-curtain` in same scene layer graph |

**Five-axis checks:**
1. **Connectivity:** iris→sclera, pupil→iris; eyelids/creases/lashes→face, far eye→same hair occlusion. Do not add floating detail.
2. **Curvature:** both lids use shallow asymmetrical source-oriented cubic arcs, not constant-width ovals.
3. **Width:** iris near 42 px, far 38 px, pupil near 21 px, far 18 px; compare ratio against source screenshot, not idealized face norms.
4. **Spacing:** seven hand-placed near / four far wedges with varied direction, not procedural equal-frequency eyelashes.
5. **Microtexture:** native dry, paper-seeded wax contact with muted opacity and opaque dark lash root. Authentic crayon style still **unverified** without high-res matched wax crayon process reference.

## QA and release decision

- `tests/crayon-artcraft-cc0-full-face.test.tsx` asserts iris bounding boxes, anatomy parent clipping, source hair overpaint order, real opaque wax lashes, split open eyelid masses, 608×1082 source lock and legal 3× camera limit.
- Existing Storybook **Cc0SourceRegisteredFaceWorkbench** adds *Near eyelid/iris (2.95×)* and *Far eyelid/iris (3×)* to the **same** Crayon page.
- Native Chromium `crayon-adult-face.spec.ts` captures **source-equivalent full frame**, **near eye frames 210/299**, and **far eye frame 299** through shared, CRAYON1-valid fixed cameras. Native pixel screenshot and independent ArtCraft checks remain necessary: code and tests do not certify fidelity.
- **Release gate intentionally REJECTED.** Additional source-matched canthal/iris contour tracings, independent artist review, realistic wax luster/pressure tests, face-jaw-neck likeness and dynamic blink/expressions are missing. Do not merge or publish as an approved portrait.

