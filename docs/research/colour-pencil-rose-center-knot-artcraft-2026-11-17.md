# CP-F1 / FLORA1 · Rose central knot: six source surfaces and a true scroll reverse

**Date:** 2026-11-17. **Status: ART HOLD / optional**. Branch source ref before work: `main@eb6f58e`, after merged #602 rear cup, #601 front cuticle and #595 frontal tonal fields. This study does **not** change production defaults or imply artist acceptance.

## Authentic sources, anatomy, and rights

| Source | Direct reference | Observation and construction consequence |
|---|---|---|
| Dianne Sutherland, *Drawing a Complex Flower Structure: Rose* (2026) | https://www.botanicalartcourses.com/post/drawing-a-complex-flower-structure-rose | Botanical artists separate a central, ball-like bundle from the outer flower ring, and compare individual petals against a consistent axis. Center organs cannot be simply rings at regularly spaced radii. Our revised six surfaces are staggered in height, width, curl and tangent orientation, not transformed copies of one ellipse. |
| Bristle Studio, *Learn how to draw and paint roses* | https://bristle.studio/tutorials/how-to-draw-and-paint-roses/ | Loose central edges spiral from partially overlapped **separate petals**, with the inward curl smaller than the expanded outer lamina. Our front scroll has a distinct, physically occupied short abaxial fold; the dark recess has separate support and catches occlusion without painting a flat black hole. |
| Karen Elaine Evans, original artist *Pink Rose* | https://www.artfinder.com/product/pink-rose-6a554/ | In a coloured-pencil rose, edge light is discontinuous and dark folded pockets are chromatically diverse. We author optional short optically timed dark, warm, reflected and fibre contacts instead of a universal glowing white spiral outline. |
| UPOV Rosa L. technical descriptor TG/11/8 | https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf | Pedal shape, rolling, and arrangement vary across cultivars; no exact cultivar or photo of this rose has been authenticated, so no pixel/photo geometry claims can be made. |

Artist-owned imagery stays on its owner page; **no external art/raster, pixel sample, traced path, licensed scan or copy** is distributed in the library. All cubic curves in `colored-pencil-rose-center-knot.ts` are original, hand-authored source geometry for an imagined stylized rose. Reference status is qualitative; it is **not** a botanical-specimen measurement.

## Native A/B source deconstruction

Actual baseline visual evidence: [PR #602 native 44-organ browser evidence](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/44131907744/artifacts/14350263012). The 960×540 central knot crop looks like a **set of evenly concentric, dark-outlined C loops**. Although independent whorl-source laminae exist, their nearly circular upper arcs dominate the shape, and the innermost curl has no physically visible backside. Extra hatch marks would not repair this structural silhouette.

**Independent source-first changes**:

1. Opt-in `roseCenterKnotStudy` requires `roseInnerWhorlStudy`. Six originally named source surfaces (`inner-fold`, `heart`, `rose-whorl-recess`, `rose-whorl-left`, `rose-whorl-right`, `rose-whorl-scroll`) are re-profiled with **unequal shoulders, several local cusps, tilted crossing flow, and asymmetric return edges**. Existing original 11 base and 44 complete-form originals remain byte-identical with option OFF. Four existing independently timed inner-whorl contacts and two earlier center source marks remain in each region *before* any new marks, and 3-layer CP-F1 material, paper tooth and pressure are never replaced.
2. Each of the six surfaces receives **four authored new, low-pressure, bounded optical contour families**: crease shadow, interrupted cuticle light, local fibre return and broken surface glancing marks. They follow source curvature; no screen-space overlay, canned radial smoothing filter, gradient flattening or RNG scratch noise.
3. The **seventh** region `rose-center-scroll-underturn` has a distinct opaque physical surface. Its outer hinge is **byte-identical to the first cubic segment of the new scroll face** (`M234 175 C232 163 239 154 249 151`). Its reversed lip lies just outside the lit scroll; clipped paper-native 3-pigment material and four separate dry pencil contacts paint it **after the heart, before the front scroll**.
4. Every existing material hash and stage frame stays unchanged: unchanged 38? The exact prior 44 regions are preserved by `id`; six new path geometries keep original ids/material slot and all original optical contact traces, while only one new source region is inserted with stable materialIndex **42** (all previous original/rim indices remain fixed).
5. Native React Storybook reuses existing `Video Production/Film Looks/Colour-pencil` studio, new checkbox `Foundation rose center knot anatomy` (disabled until whorl enabled), three source-attached 2.15× camera foci (front/recess/physical backside). Disabling the parent whorl automatically unchecks the center. Portrait/landscape and seed limits remain supported.

## Quality controls and strict hold

- Unit: six keyed, nonmirrored **closed physical silhouettes**, original details are prefix-equal, stable pigment hashes, the seventh distinct underside has a shared hinge, and the whole unmodified botanical ecosystem expands **44 → 45** regions while staying under the existing **48** bound.
- Browser: both 960×540 and 540×960, initial A/B/restored **pixel byte parity**, new full 45-organ render, source-attached 2.15× inspection of front scroll/recess/backside, true actual SVG `isPointInFill` with sufficient nonzero **exposed** underface outside its front, f3/f6 frame-seek contract, no `image`/`foreignObject`/`feImage`.
- **Independent actual screenshot review required before merge**. Reject if the central surfaces still read as concentric stamps, the underside fails to show without exposing white pinholes, a big highly saturated dark sticker appears on the heart, or old preserved marks become visibly misattached. Work from source topology/light, not assertion weakening.
- **Remaining artistic hold:** no botanically authenticated multi-angle cultivar source, no measured landmark panel, no independently accepted complete-rose anatomy, no living-motion release. Do not turn ON the option in production by default or proclaim artistic mastery based on automated tests.

## Integrated with rounded frontal lamina geometry (#604)

The preceding source-front volume PR modifies only the two parent front-facing petal silhouettes, preserving the original physical hinge, fixed abaxial surfaces and cuticle sidewalls. This central knot experiment was re-authored on the latest merged source rather than overwriting those front silhouettes. The new compact central six-lamina composition is **independent** of the two new convex front shapes: it remains opt-in and requires only `roseInnerWhorlStudy`. If `roseFrontLaminaVolumeStudy` is also enabled, the complete FLORA1/CP-F1 botanical picture is still **45** bounded material regions (44 old plus one real scroll backside). Unit and native Storybook proof compose both; the new fold does not inherit a random offset, altered seed, or independent animation.

**Artist hold remains:** the new central cup is source-inspired but unmeasured and may still read as a rigid motif at 1×. Only the exact-head full/native and 2.15× macro comparison can be assessed for release; no animation or promotion to default.
