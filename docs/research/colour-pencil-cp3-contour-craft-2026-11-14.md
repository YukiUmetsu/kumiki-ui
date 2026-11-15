# ArtCraft CP3 contour pass — from paper cut-out toward animal anatomy

Date: 2026-11-14. **Status: incremental contour study, not visually accepted as master-level art.**

## Evidence and diagnosis

After PR #282, the actual Chromium 16:9 hero and ruff/feather macros were inspected (saved in the artcraft-pencil-animated-fibre-evidence artifact attached to its GitHub Actions run). The 942 new short fibres are visible and the 21 detail tracks are correctly poseable, but **the fox still looks like a smooth vector animal with a triangular cardboard chest ruff and a flat oversized muzzle**. The kingfisher has a circular head and a broad cyan shoulder sticker. This is a **macro/meso silhouette failure**, not a problem that further microscopic scratches would fix. It is important not to claim the result meets the user’s realism standards.

## Sources

- [Bonny Snowdon's fox drawing process](https://bonnysnowdonacademy.com/fox-draw-resources/): head/ear anatomy and shadow contours before layering short directional fibres.
- [Kathy Stocks' Fall Breeze](https://www.katewoodliffodonnell.com/wp-content/uploads/2022/02/cpm2202.pdf), Colored Pencil Magazine 2022: long asymmetric ruff edge and tonal neck transition.
- [Gary Tymon kingfisher reference](https://www.etsy.com/listing/737858800/kingfisher-color-pencil-drawing-print): flattened crown profile, small orange cheek patch, separately overlapping coverts, fine blue rachis structure.

No artwork or reference photograph is traced or redistributed. Geometry is a new hand-authored derivative of the original open-source fox/kingfisher story, informed by these **general anatomy and medium principles**, not a source-faithful reproduction of any artist.

## New authored structure

- Fox muzzle moves from the former broad capsule silhouette to an asymmetrically tapered cheek/nose wedge; the lower-jaw and whisker-pad contour is updated with smaller connected curves and softer mouth shadow.
- Fox ruff exchanges starburst-like straight-line teeth for a more irregular multi-curve neck/shoulder perimeter while keeping its root under the head and across the chest. All existing separate ruff pigment tracts keep their local pivots.
- Fox tail tip now has layered warm cream/sepia value with uneven long-to-short fringe geometry, not a paper-white hollow-looking wedge.
- Kingfisher crown changes from a generic circle to a flatter, asymmetrical forward skull and nape; the orange cheek is reduced into a narrower under-eye plane.
- Kingfisher beak acquires a thin, slightly varying upper ridge and lower ramus with a more definite distal point rather than an engineering triangle.
- Kingfisher shoulder coverts gain several small organically curved overlapping edge notches. Their existing independently animated fine-blue vane tracts remain attached.

All edits modify existing region paths or supporting pigments, **not** the actor/scene API, z-order, 12+11 original part IDs or 24-region limit. The original Storybook hierarchy and frame-scrubbable materials remain intact.

## Review gates

- Unit: `tests/colored-pencil-anatomical-fibres.test.ts` checks 16:9/9:16 material/scene validation, semantic part counts and bounded curved landmarks.
- Browser: path-scoped Chromium `colored-pencil-fibre-visual-proof.yml` captures 16:9/9:16 hero images and 4× fox ruff / kingfisher covert details; no claims from source code alone.
- **Not passed as artistic equivalent to reference:** high-resolution five-axis shape attachment, fur clump topology, bill/cheek specular grain, true tapered hair widths, believable leg length, silhouette anatomy across gait extremes, full-speed production film and professional artist review remain outstanding. Future work must replace large underpaint blocks with graded shape planes, not add random line count.