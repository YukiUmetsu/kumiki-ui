# ArtCraft CP16 — Source-calibrated transparent colored-pencil skin glaze

2026-11-15 — **experimental material study; artistic likeness approval NOT PASSED**.

## Reference and failure analysis

- The source image is Christopher Campbell's [CC0 brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), the *same* 25-point registered photographic guide map and 285×318 actual Chromium comparison used by PRs #391–396. Source pixels are strictly **observational evidence**; no source image or blur is painted onto the pencil output.
- Existing v15 needlepoint controls removed some coarse grain but the 1× finish still has pale gaps and obvious white scratches against heavy dark contour strokes. In the old real Chromium screenshot a 5×5 high-pass skin-patch σ ranged from ~11 to ~15 (versus source ~2–7). Increasing *only* dark nibs is insufficient to achieve smoothly modeled malar/forehead/jaw form.
- Authentic material references: [Alyona Nickelsen on tight, needle-point light layers and dark-on-light grain](https://coloredpencilmag.com/amaalyona/); [Justin Maas' LYRA colored pencil portrait method](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf). The technique is to preserve a translucent *broad color-value base* and selectively place crisp top contour and pencil-tooth marks, not to blur the finished drawing. Both are process-only references, never traced/embedded artworks.

## Topology, micro-layering and gradients

New `createPhotometricSkinGlaze` independently samples *actual source RGB luminance* under already face-classified `face-value` and `face-chroma` marks, using a 5-tap local optical average and a 4-point contrast gradient. The returned output comprises deterministic **wide, low-pressure curved pigment nibs** plus finer companion nibs. Source-sampled color with a very small ivory mix and luminance-proportional pressure maintains the real sitter's fine warm/cool tonal transitions. There is no uniform beige polygon, image data copy, CSS paint filter, photographic pixel diffusion or false source detail.

A measured face mask limits ONLY the new underlayers. The existing full-detail iris/eyelid, vermilion, nostrils, rooted hair and all other high-frequency gestures remain **exactly authored and are drawn on top**. Explicit reject gates protect photographed highlights (>0.92 Y), sharp gradient boundaries (>0.070 normalized), plus optically registered orbit (0.29 inter-eye span), lips (0.27) and nasal center (0.17). The existing dry-contact and skin needlepoint methods are unchanged.

The new `Source-measured skin pigment glazing` control (0–100%) sits in the **existing** Color Pencil / Reference Atelier folder and applies to both full-head and all four chronological paper-only storyboard stages. Zero draws **no extra marks and reproduces v15 pixels exactly**; the normal independent photo-to-pencil *video* export remains unchanged. Source-supported glaze count, reserved highlights and protected anatomy/boundaries are exposed in Storybook.

## QA and rejection gates

- Unit: deterministic colored-pencil fibers, untouched input photo and source mark objects, strict 0%-off identity, no fake glazes on pure white paper, protected eye/lips/mouth regions, finite alpha/geometry, reject malformed source/landmarks/seed/crop.
- Native Playwright: verified CC0 source, full-head 0 vs 100 side by side, 16:9 and 9:16, source-conditional pigment counts, original video export byte identity and all four storyboard stages.
- Quantitative: compare native presentation-size 285×318 **source/reference / v15 0% / v16 100%** high-pass skin noise and local luminance error in the existing malar, forehead, jaw and nasal patches. An output that merely changes pixels but increases grain or loses face likeness is not accepted on visual merit.
- Independent human portrait approval and medium correctness remain **NOT PASSED** even if CI is green. In particular no large flat texture field is permitted; preserve all material texture and contour flow.
