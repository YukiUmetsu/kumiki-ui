# ArtCraft CP16 — Source-calibrated transparent colored-pencil skin glaze

2026-11-15 — **experimental material study; artistic likeness approval NOT PASSED**.

## Reference and failure analysis

- The source image is Christopher Campbell's [CC0 brunette portrait](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), the *same* 25-point registered photographic guide map and 285×318 actual Chromium comparison used by PRs #391–396. Source pixels are strictly **observational evidence**; no source image or blur is painted onto the pencil output.
- Existing v15 needlepoint controls removed some coarse grain but the 1× finish still has pale gaps and obvious white scratches against heavy dark contour strokes. In the old real Chromium screenshot a 5×5 high-pass skin-patch σ ranged from ~11 to ~15 (versus source ~2–7). Increasing *only* dark nibs is insufficient to achieve smoothly modeled malar/forehead/jaw form.
- Authentic material references: [Alyona Nickelsen on tight, needle-point light layers and dark-on-light grain](https://coloredpencilmag.com/amaalyona/); [Justin Maas' LYRA colored pencil portrait method](https://assets.ctfassets.net/f1fikihmjtrp/3M5deVdW8BF7XIDQvunZPx/fcf171dc2381a62fb64e7b58fc9d837b/LYRA_Combined_PDF.pdf). The technique is to preserve a translucent *broad color-value base* and selectively place crisp top contour and pencil-tooth marks, not to blur the finished drawing. Both are process-only references, never traced/embedded artworks.

## Topology, micro-layering and gradients

New `createPhotometricSkinGlaze` independently samples *actual source RGB luminance* under already face-classified `face-value` and `face-chroma` marks, using a 5-tap local optical average and a 4-point contrast gradient. The returned output comprises **paired, low-pressure curved pigment nibs**, positioned along both sides of each authentic source-measured base hatch to fill otherwise exposed paper tooth **without doubly darkening the central line**. The original base hatches remain completely unmodified. Source-sampled color with a very small ivory mix and luminance-proportional pressure maintains the real sitter's fine warm/cool tonal transitions. There is no uniform beige polygon, image data copy, CSS paint filter, photographic pixel diffusion or false source detail.

A measured face mask limits ONLY the new underlayers. The existing full-detail iris/eyelid, vermilion, nostrils, rooted hair and all other high-frequency gestures remain **exactly authored and are drawn on top**. Explicit reject gates protect photographed highlights (>0.92 Y), sharp gradient boundaries (>0.070 normalized), plus optically registered orbit (0.29 inter-eye span), lips (0.27) and nasal center (0.17). The existing dry-contact and skin needlepoint methods are unchanged.

The new `Source-measured skin pigment glazing` control (0–100%) sits in the **existing** Color Pencil / Reference Atelier folder and applies to both full-head and all four chronological paper-only storyboard stages. Zero draws **no extra marks and reproduces v15 pixels exactly**; the normal independent photo-to-pencil *video* export remains unchanged. Source-supported glaze count, reserved highlights and protected anatomy/boundaries are exposed in Storybook.

## QA and rejection gates

- Unit: deterministic colored-pencil fibers, untouched input photo and source mark objects, strict 0%-off identity, no fake glazes on pure white paper, protected eye/lips/mouth regions, finite alpha/geometry, reject malformed source/landmarks/seed/crop.
- Native Playwright: verified CC0 source, full-head 0 vs 100 side by side, 16:9 and 9:16, source-conditional pigment counts, original video export byte identity and all four storyboard stages.
- Quantitative: compare native presentation-size 285×318 **source/reference / v15 0% / v16 100%** high-pass skin noise and local luminance error in the existing malar, forehead, jaw and nasal patches. An output that merely changes pixels but increases grain or loses face likeness is not accepted on visual merit.
- Independent human portrait approval and medium correctness remain **NOT PASSED** even if CI is green. In particular no large flat texture field is permitted; preserve all material texture and contour flow.

## Final 285×318 real-Chromium photo comparison (same source and crop)

Full proof run: https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43738385812. The first centered/broad glaze darkened already-covered source skin beyond its actual value despite reducing noise, and failed a newly introduced **two-axis** QA: photographic mean-absolute luminance error AND 5×5 high-pass coarse grain. Revised source-aligned offsets preserve the original dark hatch cores, target **adjacent exposed paper gaps**, and pass both photographic accuracy and grain acceptance across landscape/portrait with no photo raster painting.

| Source face patch | Landscape 5×5 coarse grain old → new | Portrait coarse grain old → new | Photo-reference grain (landscape) |
|---|---:|---:|---:|
| Forehead | 10.96 → **8.58** | 10.18 → **8.02** | 1.54 |
| Cheek | 12.91 → **10.08** | 12.20 → **9.35** | 4.03 |
| Jaw | 13.54 → **10.14** | 13.17 → **9.03** | 1.80 |
| Nasal plane | 15.38 → **12.76** | 15.05 → **12.24** | 6.29 |

The same four source-matched region mean-absolute luminance errors improved from **12.01 → 10.95** in landscape and **11.28 → 10.59** in portrait. Native pixel comparisons changed 13,310 landscape / 13,664 portrait pixels above 5/255 color difference, **while independently checked real pupil, vermilion seam, near-black ear contact and garden background remained exactly byte-identical**. Both browser 16:9 and 9:16 framing, ordinary separate photo-to-pencil video export and the four chronological paper-only story frames passed.

**Artist verdict: STILL NOT APPROVED.** The 1× face and exaggerated remaining grain are not at the craftsmanship of the best photographed colored-pencil portraits; later passes need individually improved features, skin topology and facial form. This is a measurable incremental studio primitive, not a finished photographic realism solution.
