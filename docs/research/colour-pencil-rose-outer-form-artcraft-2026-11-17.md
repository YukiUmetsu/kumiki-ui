# CP-F1 / FLORA1 — individually layered outer rose petal form colour (ART HOLD)

**Date:** 2026-11-17. **Stage:** experimental. Opt-in `roseOuterFormStudy=false` in all shipped/default drawings; requires `rosePhysicalFolds=true`. Prior work: #601 frontal physical cuticle, #602 rear cup, #604 convex front faces, #605 center knot. The new outer value fields do **not** certify reference likeness.

## Source reference board and art deconstruction

1. **Karen Elaine Evans, original artist-owned *Pink Rose***: https://www.artfinder.com/product/pink-rose-6a554/ — technique/morphology only, no asset redistribution or tracing. The petals have warm, rounded pink laminae; their cool undersides recess into neighboring overlapping folds and their pale return edges are interrupted. The wide outside petals are not a single unvaried dark slab.
2. **Gary Greene, original colored-pencil rose process**: https://www.artistsnetwork.com/art-techniques/touchable-textures-in-colored-pencil/ — archival artist instruction on deliberately separate translucent pencil layers, maintaining paper tooth, and reserving highlights before increasing saturation. This is a material method observation, not a licensed pixel source.
3. **Ann Swan botanical pencil**: https://annswan.co.uk/ — fine fibre marks turn with living forms, including changes in local pressure and edge definition. The optical pencil layer cannot substitute anatomy or hide insufficiently attached stems.
4. **London Art College botanical coloured-pencil drawing**: https://www.londonartcollege.co.uk/content/attachments/LAC-Botanical-Coloured-Pencil-Sample-Pages.pdf — instructional paper; subtle changes of pigment density and stroke direction signal rounding. The paper was used as a general concept source only, not source/photographic material.
5. **Reference critique of current code artwork**: a genuine Chromium 960×540 full 45-organ film screenshot after #605 (saved from workflow artifact). It shows two broad *outer* petals reading as flat, strongly saturated burgundy lobes while the comparatively brighter front overlaps look like separate graphic symbols. That is an unapproved stylized drawing. This change addresses only outer lamina **material perception**, not the still-deficient source-matched cultivar anatomy.

## Topological, tangent and pigment disassembly

The existing outer-face polygons already carry named original geometry and physically exposed real abaxial undersides. Source coordinates:

- `outer-left`: original face roughly x125–255 / y122–275; crescent fold runs diagonally inward, convex belly expands lower/outward, return edge follows the lower-left shoulder.
- `outer-right`: original face roughly x230–369 / y135–278; upper reflex bends rightward, belly rounds outward down the screen, return light occupies a shorter and separately curved top/right edge.
- **Do not mirror** the two petals: the six cubic axes `left-infold`, `left-round`, `left-edge`, `right-infold`, `right-round`, `right-edge` are separately authored. The broadest envelope is the middle *convex* body (half-width 27–28 scene units), rather than a narrow pencil outline pretending to be volumetric light.
- Each of three named anatomical form axes deposits independent cool contact / middle tone / broken light families with a randomized-short **tangent-following** hand pressure pattern and paper gaps (9 traces per facing petal; 18 paths, more than 2,500 distinct short optical deposits total). Cubic tangents and transverse envelopes vary smoothly; a bounded seed only changes scumble spacing, not geometry, palette, edge topology or pigment ordering.
- The optical deposits are **source-clipped to the exact original facing polygon** in the existing CP-F1 vector renderer. They deliberately do not repaint over physical petals as separate opaque regions or punch holes into paper. All original optical fibres, line edges, physical underside, paper tooth, original layer seeds, art stages, 45-region max stack, and other objects remain intact.
- Two original face-only *three-pigment* palettes shift the dark uniform outer surfaces toward a warmer rounded pink middle value. This is an explicitly opt-in artistic intervention; `rose-turn-outer-left/right` underside pigments do **not** change. The 18 overlaid marks are on the original opaque CP-F1 material and honor the exact 6-stage film timing. No digital linearGradient, bitmap texture, blur, shader noise or copy of artist-owned source pixels.

## Implementation acceptance and limitations

| Scope | Contract |
|---|---|
| API | `roseOuterFormStudy` boolean, default OFF and requires `rosePhysicalFolds`. No new exported component or dependencies; all non-rose subjects stay byte-identical. |
| Source | Two existing named full-surface outer faces; stable path, bounds, original material seed and detail arrays. Only their 3 material colors and 9 clipped form-aligned marks each change on opt-in. |
| Storybook | Existing **Video Production → Film Looks → Colour-pencil → Drawing Foundation** checkbox; independent actual-face 2.15× `rose-outer-left/right` macros; 16:9 and 9:16 native 1× original/revised/restored; all 45 FLORA1 regions and combined 36 original-front/new-outer interior optic marks. |
| Checks | Six independently-authored cubic axes, original color families, deterministic valid seeds, all 9 short-marks-per-side independently time addressed, unchanged opaque underside and all unrelated material. Reject off-source mark leakage, solid new overlay surfaces, changed default appearance or missing exact restored pixels. |
| Artistic hold | Even successful tests and visually fuller color **do not establish realistic rose fidelity**. Inspect actual 1× and both 2.15× screenshots. Reject blotchy speckling, overly repeated scratches, garish saturated ribbons, insufficient highlight, harsh woodcut/vinyl shape silhouettes or loss of source detail. |
| Next | Use owned/rights-cleared reference photo with actual observed petal silhouette, depth, color/light measurements and per-petal topology; then root-anchored full-petal motion with all 3 connected surfaces. Do not animate individually floating optical marks. |

No external source photos or PDFs are bundled, sampled, redistributed, or claimed to be exact cultivar measurements.
