# User-supplied coloured-pencil artwork — visual study and quality gates

**Date:** 2026-11-14. **Input:** twelve images supplied directly in the conversation. The original artwork files remain outside this public GitHub repository; the artists' licensing and redistribution permissions have not been verified. Do not commit, trace or redistribute these image assets. Use original demonstrations to explore the *techniques*, not their compositions.

## Art direction by reference

| Supplied image | Visible craftsmanship | General engine requirement |
| --- | --- | --- |
| City plaza and towers | Vanishing-point pavement, uneven architectural marks, warm sunlit focal buildings, cooler periphery and fading page edges | Perspective-aware scene grammar; locally sharp architecture; layered distance haze |
| Painter bird with beret and palette | Completely opaque, rounded bird silhouette, finely aligned feathers, glossy eye, articulated toes and held props | Directional short-fibre marks; detailed wing anatomy; believable contact and hand/wing grip |
| Portrait with purple bob, butterflies and ribbon | Facial planes, asymmetric expression, individual flowing hair bundles, cloth overlap, saturated background and crisp decorative wings | Proportion-locked face rigs; high-frequency hair strands; depth-correct layering and opacity |
| Autumn creek with trees | Branching/tapering trunks and twigs, granular leaf clusters, pointillist grass, water highlights | Branch structures, texture-specific strokes, foreground/midground separation and ripples |
| Fish pond with leaves | Overlapping fish silhouettes, anatomical fins, leaf venation, physically meaningful concentric ripples | Creature rigging, curved wave marks, independent water depth and highlights |
| Village and mountains | Building complexity, distinct roofs/windows, expressive scribbled scenery, atmospheric mountain gradients | Multi-building layout with strong geometry and distant tonal hierarchy |
| Perched red-and-blue bird | Overlapping flight-feather anatomy, contour-following breast colour and grounded claws | Component-level feather rigging, short aligned fibres and branch contact |
| Clouded mountain valley | Soft volumetric distant forms, tiny tree/flower detail at the foreground and atmospheric depth | Scale-dependent level of detail, white space, layered coloured-pencil landscape fields |
| Shadowed forest stream | Deep dark foliage, complex bark, angular rock forms, water reflection and highlights | Dense but bounded texture, local darkness and true occlusion |
| Canoe and waterfall | Saturated reflective boat, fine ripples, independent waterfall and mountain forms | Perspective-consistent object construction, flow-field water strokes and material separation |
| Partially drawn bird | Finished coloured body next to unfinished construction outlines on white paper | Distinct graphite-construction and pigment-deposition stages; stable incomplete holds |
| Multicolour winged fantasy creature | Detailed membrane, feather, scale, claw and fur regions, saturated material-specific colour | Per-part mark vocabulary; multi-part rigs and controlled pigment layering |

## Findings against the current implementation

- **Already available:** CP1 paper-stable seeded hatching, pressure, optical core/rim shading, form-following fan, composable CP2 scenes, multiple authored actor parts and frame-addressable playback.
- **P0 weakness:** uniform repeated hatch families are insufficient for feather strands, fine hair, bark, foliage grain and rough stone. Add optional `texture: "fiber"` and `"stipple"` alongside existing `"hatch"`, with no default change. Ensure each mark is a physically drawn paper-local SVG path, not a full-screen filter.
- **P0 weakness:** anatomical/proportion accuracy dominates realism. Develop distinct visual part sheets for eyes, beaks, wing feathers, feet, hair volumes, fabric seams, facial expressions, trunks and branches. No simple circles or opaque vector polygons as final-quality substitutes.
- **P1:** create form-aware hatch-flow maps and independent localized pigment density masks, not just a global direction per region. Avoid texture shimmering at camera zoom.
- **P1:** build production-ready original city, forest stream, bird performer and fantasy creature shots; inspect perspective, depth, fine detail, articulated action, and 16:9/9:16 output.
- **P1:** sequence construction graphite, coloured base passes, aligned local texture, dark accents and final glints. Preserve original authored incomplete frames and long holds.

## Acceptance criteria

1. A reproducible specimen renders with hatch, fibre and stipple marks; a 275→25→275 frame seek reproduces the same geometry.
2. Fibre marks follow the authored physical form instead of being noise; stipple density is bounded and visually retains visible paper tooth.
3. For each original character design, silhouette, facial proportions, eye directions, feather anatomy and foot/prop contact remain coherent in multiple poses.
4. Architecture respects a single physical perspective; nature preserves atmospheric depth, detail scaling and distinct foreground subjects.
5. Each material (plumage, face, hair, cloth, foliage, bark, water, stone) uses appropriate marks. No transparency through solid actors.
6. Compare frames and watch normal-speed 16:9 and 9:16 videos. Tests can prove stability, not artistic excellence.

**This first code pass implements the three mark families and an interactive material laboratory only.** It does not reproduce these image compositions or certify that realistic portraits, landscapes, buildings or fantasy animals are already supported to final-art quality.
