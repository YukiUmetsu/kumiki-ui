# Crayon ArtCraft F1 V41 — photographed forehead/hairline and far-temple occlusion

**2026-11-16 · experimental `!dev`, PR #461 DRAFT / ART HOLD.**
**Do not merge or claim likeness without an independent CC0 photo / native-image pixel review.**

## Reference and physical medium

- Real reference: Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), CC0 1.0. Use the previously verified **608×1082 browser crop**, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, from the [archived independent source capture](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169). The full-resolution original camera JPEG is not the pixel benchmark.
- Existing controls: V40 [native 608×1082, crown 2.85× and far curtain 2.15× browser PNGs](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43995910093/artifacts/14290426118), [previous independent original-photo metrics](crayon-f1-anat1-hair-contour-v40-2026-11-16.md).
- Crayon medium: the [Philadelphia Museum of Art's terminology guide](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) documents waxy pigment's raised irregular deposition and pickup/lift at mark ends. The actual medium requires continuous underpainting and paper tooth rather than flat, smooth digitally cut face borders. This work keeps all V40 native wax/material.
- Art reference triangulation: the licensed source photograph is the person and pose reference; real drawn-crayon portrait references inform touch, grain and edge characteristics only. **No third-party drawing or photographic pixels are embedded in runtime.**

## Independently observed source boundary

The visible failure is **shape and occlusion**, not absence of additional hair filaments. On V40 the near-left forehead emerges too late and the far-right forehead appears far too early; V40 has an inflated, oversimplified frontal arch rather than the photographed oblique scalp-to-temple transition.

We sampled the **exact same 608×1082 original-source PNG** and V40 actual Chromium RGB PNG frame 299 at source pixel coordinates, averaging each 7×7 neighborhood. The sample's first sustained warm-skin run is 6 adjacent y positions with `R>142; R>G+22; G>B+5; G>103`. Ambiguous regions x320/x440 were **not** used as independent high-confidence samples. This is a diagnostic *color boundary proxy*, not semantic segmentation or a measured full anatomical silhouette.

| x (source px) | CC0 first warm-skin y | V40 first warm-skin y | V40 - source |
|---:|---:|---:|---:|
| 140 | 334 | 355 | +21 |
| 160 | 322 | 331 | +9 |
| 180 | 314 | 315 | +1 |
| 200 | 307 | 304 | −3 |
| 220 | 301 | 296 | −5 |
| 240 | 296 | 290 | −6 |
| 260 | 294 | 287 | −7 |
| 280 | 296 | 287 | −9 |
| 300 | 293 | 287 | −6 |
| 340 | 291 | 285 | −6 |
| 360 | 299 | 288 | −11 |
| 380 | 312 | 293 | −19 |
| 400 | 327 | 302 | −25 |
| 420 | 353 | 316 | −37 |

The sample supports a non-symmetric correction: broaden exposed upper-left forehead and **lower the far-right exposure** under a forward-falling hair curtain. The original CC0 has naturally varied tiny hair fibers at the boundary: no new smooth wide face sticker can substitute for native wax contact.

## Five-axis physical construction

1. **Topology.** Keep the single connected V40 source face, same existing forehead wax, crown hair, and two side curtains. Modify **only** `face-outline`, `forehead-light` and `hair-right-curtain` Bézier paths; do **not** change original source eye, upper eyelid, brow, mouth, nose, chin, ear or neck geometry. Preserve the 18 complete rooted hair-group cubics, dry contact width, color/pigment, and clipping.
2. **Vector flow.** The frontal skin boundary starts near x120,y350; the upper forehead advances through x194,y309 and x321,y286, then turns obliquely down through x382,y310 toward x439,y401. The far curtain's interior falls diagonally toward x447,y404 to cover the far temple: no straight vertical paint bar or circular symmetric wig arch.
3. **Edge characteristics.** The edge is a set of connected cubic transitions, not a clip rectangle. The original crown wax remains beneath the skin, and the far curtain remains on top by the existing physical layer order. Existing paper-height dropout, feather-contact settings, dark hair root pigments, fine irregular fibers and surface tooth remain untouched. Forehead tonal glazing is real existing wax clipped to the updated continuous face.
4. **Depth/skin-hair layering.** The same face overlaps the crown on the left, whereas the far curtain overlaps exposed skin along the right; ear and eyes retain their original draw order. V41 does **not** paste floating skin over the image or increase dark hair brightness to conceal a geometry defect.
5. **Temporal.** Opt-in `midfaceForm:"source-anat1-hairline-v41"` follows V40, with no new element, no altered seed, 608×1082 camera, independent motion, clip, color, fiber path or 300-frame time sequence. Earlier variants remain byte-identical.

## Required review before promotion

- Tests: exact same element IDs, order and count as V40 at low/high detail; all non-target elements byte-identical, all original hair-fiber cubics exact; changes constrained to 3 wax paths; source SHA unchanged, three !dev Storybook views; malformed source geometry fail closed.
- Chromium: V40 native negative-control vs V41 at identical frame 299, same source viewport and camera. Capture full 1×, upper forehead 2.4× and far/right curtain 2.15×. Independent source-photo comparisons must report whole, face, forehead, far hair and near eye pixel metrics; **regressions matter as much as global improvement**.
- Art: original skin/hair transition should be source-traced and look natural at actual publication scale. Inspect face-plane shape and wax grain, reject accidental blank scalp strips, duplicated near eye, jagged brown sticker bands, new flat tonality or temporal popping.
- The existing whole-image original-photo SSIM requirement remains **≥0.85**; V40 was 0.412048. No increase should be claimed before calculating V41 against source PNG at the exact GitHub head. Complete source/render 18-landmark verification, 5 tonal planes, natural-speed 300-frame review and artist approval remain missing.

**Current verdict:** candidate under visual scrutiny, NOT APPROVED, DRAFT, UNMERGED.
