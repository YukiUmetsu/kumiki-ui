# CP-F1 FLORA1 — six independently authored frontal rose value fields

**Date:** 2026-11-17. **Status:** ART HOLD. Opt-in `roseFrontValueStudy` requires `rosePhysicalFolds`; **default remains OFF**. Existing 11-part source, past 42-region combined botanical drawing, fold geometry, original pencil contact paths and all material seeds are preserved.

## Reference and rights inspection

1. **Karen Elaine Evans, *Pink Rose*** — artist's original coloured-pencil work: https://www.artfinder.com/product/pink-rose-6a554/ . Source image shows a deep cool-red pocket on the inner side of the upper fold; irregular warm yellow-pink bounce light on the broad outward-facing petal; white reflected edge is highly selective and an unbroken white perimeter is NOT required. The shadow/half-tone transitions are **area-shaped** across real petals, not generic gradient stripes. Licensed for **visual study only**, not copied.
2. **Gary Greene, drawing a rose in coloured pencil** — https://www.artistsnetwork.com/art-techniques/touchable-textures-in-colored-pencil/ . Sequence emphasizes intermediate pigments and localized early dark-red shadow before lighter optical glazes; paper tooth is retained. **Technique reference only.**
3. **Ann Swan's botanical coloured-pencil work** — https://annswan.co.uk/ . Following photographed plant form, anatomical roll and crossing of petal planes come BEFORE colored-pencil polish. **Technique reference only.**
4. **UPOV rose morphology TG/11/8** — https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf . Petal profile/rolling/relative positioning are distinct morphological traits; no real cultivar measured for this source.

No downloaded reference art, sampled pixels, traced path, photo filter, blur, CSS/shader gradient substitute or redistribution is added to the product. Existing work remained on ART HOLD after screenshot review of merged #589/#591.

## Source-first construction

| Scale | Genuine source feature and 1× failure | New renderer-independent native feature |
|---|---|---|
| Macro | Existing front petals look like two broad flat coral/pink cardstock pieces with a dark dividing line. Natural roses have more nuanced depth and broad warm/cool fields. | Six independent **source-coordinate cubic value axes**, each allocated to ONE of the two real folded frontal petal supports: `fold-core`, `convex-belly`, `reflected-field`. Their control points and transverse widths differ per petal. They have no new detached surface/contour. |
| Meso | Hue was previously driven mostly by one broad linear tonal support, plus random crosshatch. That cannot create a local cooler contact zone versus a brighter curved belly. | Each field generates three separately timed, independent tonal pigment passes and uses a tapered transverse envelope and tangent-following short curved marks. Core shadows start f171, rose halftones f211, reflected contact f259. Does NOT delete, change or suppress the original CP-F1 tonal support, 3+ full-surface material passes, dense microfibre texture, fine cuticle and seam contacts. |
| Micro | Source artist references show dry-layer pigment and local color variability; uniform opaque gradient bands would read plastic. | 3×6 independent optical trace families, each 96–130 short individually curved dry strokes. Per-contact position/length/bend is deterministic for seed and exact paper coordinates; layered families are not noisy frame-to-frame and never become opaque paper-colored patches. Preserve paper tooth mask. |
| Topology & depth | Some contact paths deliberately overrun the bounded red petal silhouette; painting them unmasked creates floating red fuzz outside flower and into other petals. | New reusable `PencilRegion.interiorDetails` channel **only** clips authored interior optical deposit to the parent region's true source SVG shape. The original `details`, peripheral contour and every optical lip/fibre remains un-clipped, physically drawn in prior z-order. Strict 36-trace budget, existing 12k-char path validator and single-pass renderer keeps generic value facility reusable for all CP-F1 scenes. |
| Film & UI | A material study should remain independently inspectable and reversible. | One separate `Foundation rose frontal local values` control, disabled until physical folded petals are activated, and auto-off if folded petals are disabled. Original Storybook left/right 2.15× source-attached macros and both 16:9/9:16 film aspect configurations reused. No new Storybook folder. |

## Validation and release gate

- Source tests: six distinct independently drawn cubic axes, three different signed physical value roles per petal, 18 material-color trace groups total; unique trace IDs, valid path/opacity/timing budgets; seeds including 0 and 2147483000 deterministic.
- Compatibility: exactly 16 physical-fold-only regions and exactly 42 botanical combined regions, legacy A/B shape/path/pigment/detailed stroke byte parity; only two petal regions gain `interiorDetails`. Other four subjects and film aspects remain unchanged.
- SVG safety: new contained trace renderer is source-silhouette clipped, while the original rolled cuticle and graphite details remain in the parent region after it. Malformed/oversize contained paths fail the standard CP-F1 inspector. No raster SVG elements.
- Native Chromium: 1× A/B and restored identical output in both aspect ratios, both actual source-attached 2.15× petal macros, 42-region all-options composition, six film stages, scrubbing proof and auto-reset state.
- **Artistic hold, not a production-grade rose:** the existing 3D topology is still not validated against a rights-cleared photographed specimen. If screenshot reveals a flat dark wedge, too mechanical evenly distributed shading, a bright plastic contour, loss of existing micro-strokes, or a visible paper-through overlap, reject and revise **geometry/field axes**, not only add extra random hatch. Do not promote to default until independent 1×/3× fidelity assessment accepts.

## Further priorities

After genuine visual review: local cuticle thickness and selective irregular rim edges need source-faithful reconstruction; reconcile rose front/inner-middle occlusion order; verify petal axes and cross-view physical depth against an actual rights-approved specimen. Only THEN add root-connected wind animation. This is a still-anatomy/medium task, not an FX task.
