# CP-F1 / FLORA1 — original middle-cup lamina, source-first ArtCraft

**Date:** 2026-11-17. **Status:** experiment behind `roseMiddleCupStudy=false`; ART HOLD pending human reference-matched critique. **Preceding:** merged PR #581 (four inner-whorl faces, still unapproved).

## Original references and rights

- [Karen Elaine Evans, *Pink Rose*](https://www.artfinder.com/product/pink-rose-6a554/): original colour-pencil artwork examined at available resolution, for technique/morphology only. Individual asymmetric petal shoulders are layered behind an outer rim; deep carmine occlusion differentiates turned lips from front planes. Copyright remains with artist.
- [Heather Rooney, pink rose coloured-pencil drawing](https://www.heather-rooney.com/colored-pencil): original artwork shows steadily shorter curved lamina between broad exterior planes and internal scroll, with differentiated shadow/lit-value bands. Technique observation only.
- [UPOV TG/11/8 rose morphology](https://www.upov.int/documents/d/upov/tg-documents-en-tg011.pdf): distinct inner/outer petal form, arrangement and reflex are diagnostic rose traits. Not a measured rose cultivar blueprint.
- [Ann Swan, botanical coloured-pencil technique](https://annswan.co.uk/biography/): form-aligned dry pencil layering over true botanical structure. No pixel texture, graphic silhouette, trace, photo crop, or source art redistributed.

## Deconstruction and authored topology

| Axis | Source observation | New original implementation |
|---|---|---|
| Macro | Legacy rose jumps directly from broad back cup to two oversized frontal petals and the small inner fold. Even with #581, there is a gap in petal sizes/overlaps. | Three intermediate **opaque**, individually authored curved lamina surfaces placed **after** the back-cup (or its folded face) but **before** the old frontal petals, with exact named z-order. |
| Meso | Left shoulder rises and dives; right petal tucks inward; guard creates an off-axis, occluded central bridge. Three shapes should not be repeated circles. | `rose-mid-left-shoulder`, `rose-mid-right-tuck`, and `rose-mid-center-guard`: separate cubic SVG support paths, no shared transforms or morph stamps. Attachment and negative spaces are unresolved artistic questions until rendered. |
| Micro | Dim recesses and broad lit faces require hue-separated pigment under nonuniform pencil pressure; no generic blur. | Each new physical support carries CP-F1 petal grain, three optical hue layers, individually directed flow and four authored time-staggered fine pencil contacts. Existing 11 original seed slots, original region bytes and four inner-whorl slots remain invariant. |
| Animation | Art remains correct at arbitrary timeline seeks; no free-floating detail panels. | Each mark starts in frame 174–264, source-attached to a named support; no new independent wind jitter. Physical articulated breeze is deferred pending accepted still morphology. |
| Compatibility | Old study switches remain independent and reversible. | `roseMiddleCupStudy=false` preserves the unchanged legacy source; enabled base rose has 14 named regions, with all previous options 42 (under 48-region contract). Stable new hash slots 35–37. |

## Testing and review gates

- Typed source inspector checks unique geometry and four separate contact traces per surface. Unit checks verify original region bytes, CP-F1 opaque support/3+ hue passes, z-order, 16:9/9:16, seed determinism including high seeds, invalid flag rejection and all-options combination.
- Native Chromium captures full-frame 1× A/B, two 2.15× macro views, both aspect ratios, restored identical SVG pixels and 42-region full botanical combo. No raster SVG elements. Independent 1× and 2.15× visual judgement is required before promotion.
- **ART HOLD:** The former 1× flower still reads as stylized graphic wedges, not a photorealistic botanical rose. Three middle petals do not make the whole corolla physically 3D. The new silhouette may look too rim-like or be occluded by old front faces; assess the actual screenshot at original playback size. Revisit geometry, not random hatch count, if so.

## Next priority after independent screenshot critique

Replace the old oversized frontal wedge faces with original asymmetric inward-rolling laminae and physically continuous seam contact; validate 16:9/9:16 native final frames against licensed photo/artist references *before* developing joint-rooted breeze motion. Any unapproved study remains opt-in.
