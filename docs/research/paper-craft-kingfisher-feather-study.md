# PAPER1 kingfisher — fine vane and auricular papercraft study (2026-11-15)

## Linked reference board and rights

Only construction principles are transferred. All images below are artist-owned, linked for study, not embedded, traced or redistributed.

| Source | Region to inspect | Observed craft vocabulary | Original code translation |
| --- | --- | --- | --- |
| [Diana Beltrán Herrera, paper birds](https://www.dianabeltranherrera.com/projects/birds) | teal wing, orange neck and feathers | stepped opaque feather stock, small stalk-to-vane structures, raised sheet tips | keep 18 separately folded flight-feather pieces; align new tapered vane ribs in their own root→tip coordinates and existing hinge |
| [Pippa Dyrlaga, *Kingfisher*](https://www.pippadyrlaga.com/2023-2024) | head, short tail, etched feather details | small high-density details obey anatomy and preserve strong silhouette/negative-space bridge | a discreet seven-rectrix second-tone tail shaft stock; tucked orange auricular flecks inside cheek, not a cartoon stripe |
| [Helen Musselwhite, dimensional nature papercraft](https://helenmusselwhite.com/about/) | paper bird against stacked botany | independent color cardstock, varied cut depth, selective low-contrast vs high-contrast details | near-body close-tone stocks with existing cast shadows and physical paper tooth; no alpha overlays |

The source-linked feature ledger and region targets are in [paper-craft-kingfisher-reference-study.json](paper-craft-kingfisher-reference-study.json). Reference image preview crops were inspected but not retained or measurable at source resolution. Bboxes in the study ledger are **approximate region selectors only**, not precision landmark measurements.

## Constructed form and joint graph

`perch → toes → tarsi → body scaffold → neck/head → cheek/eye/bill`; `scapula/shoulder → wing base → coverts → 18 hinged primaries (3 columns × 6 rows) → lifted tips`; `pelvis → seven short tail rectrices`.

All new geometry is *physical* closed, opaque paper stock:

- **Mesostructure:** keep original skull/wing/chest/collar silhouette, folded feather cuts, real pierced rachis apertures and non-independent wing movement.
- **Wing microstructure:** reuse each of the 3 existing grouped wing-spot stocks. Add short opposing papercut barbs inside the region of six primaries per column. Positions are recomputed from the actual primary's root and endpoint. Layer/rig count stays bounded.
- **Tail microstructure:** one close-toned cut-stock group with 2–4 short tapered shafts per tail feather; no outgrowing the pre-existing tail silhouette.
- **Cheek microstructure:** one low-contrast, 4–7-piece auricular paper sheet aligned with the compact side of the face, not crossing eye/white throat/beak.
- **Motion:** wing barb groups share precisely the same `rigGroup`, pivot and flap phase as the 18 primary feathers. No independent flutter or alpha ghosting.

## Rejected shortcuts and QA gate

Do not treat randomized dashes as a feather map; the rib vectors must be local to each primary. Do not raise visibility through bright generic yellow strokes. Do not mask missing anatomy with grain or gradients. Retain the **128-piece** upper bound and two genuinely differently laid-out export aspects.

Technical QA: `npm run typecheck`, `npm run registry:validate`, focused paper Vitest, Storybook browser image captures, native FilmStage kingfisher f175 in 16:9 and 9:16, no JS exceptions, real opaque paper layers.

**Artistic QA not self-approved:** inspect the *current-commit* rendered images at 1× and 3×, score wing barcode/floating-detail risk, test tail bridge legibility against dark backing, check cheek does not look beaded, re-render after each corrective modification, and evaluate normal-speed wing motion. The v7 pixel-matched source audit is not applicable to this original style-guided scene; independent visual comparison remains required.
