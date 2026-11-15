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

## CP3 follow-on — rooted feather-vane construction (2026-11-14)

**ArtCraft diagnosis:** previous kingfisher wing highlights resemble a small comb: only four identical pairs per feather, perpendicular struts and almost constant widths. Reference craftsmanship uses a visible central rachis, swept fibres, asymmetric vane widths, irregular mark rhythm and local soft-edge pigment. This iteration deliberately addresses **one named meso-level detail** without falsely treating scratch count as realism.

**Technique references, not licensed assets:**

- [Gary Tymon, kingfisher coloured-pencil drawing](https://www.etsy.com/listing/737858800/kingfisher-color-pencil-drawing-print): compare overlapping coverts, dark shaft and pale interrupted barbs. This is *not* a trace or anatomical identity source.
- [Bristle Studio, drawing an iridescent feather](https://bristle.studio/tutorials/how-to-draw-an-iridescent-peacock-feather-in-coloured-pencil/): barbs travel outward from a shaft, and pointed details read best after translucent body colour is established.
- [Artists & Illustrators, realistic coloured-pencil wildlife](https://www.artistsandillustrators.co.uk/how-to/animals-wildlife/working-with-coloured-pencils-everything-you-need-to-know/): large form and selective accents matter more than drawing every feather. Avoid rasterizing an artist's drawing into our component.

**Editable construction:** vaneTracts now uses ten non-equidistant pairs per authored quadratic shaft, not four; each barb starts on the same rachis, curves toward the feather tip and has a smaller trailing vane. Vane breadth swells near the middle and narrows near both endpoints; local width irregularity avoids a perfect rake. Folded primaries and shoulder coverts retain the same part IDs, clip regions, rig hierarchies, opacity support and absolute film frames. Input guards reject unbounded coordinates and reversing handles before emitting invalid SVG.

**ArtCraft axis review:** topology = rooted branch starts; flow = quadratic shaft tangents plus tipward sweep; stroke weight = width/emphasis variation; spatial rhythm = irregular authored stations; texture = existing translucent multiple-pigment fibre layers. Unit tests verify finite bounded SVG and all twenty attachments, but **source-derived crop masks, five-axis numeric comparison and human visual approval have not yet been obtained**. Code checks are not proof of source fidelity.

**Storybook:** the new *Feather construction · 2.85× shaft and vane macro* story lives under the existing *Video Production/Film Looks/Colour-pencil/Wildlife* group (no new folder). Existing scene/film IDs remain unchanged. The macro shows real animated source paths and supports portrait switching, paper tooth, frame seeking and reduced motion.

**Next artistic gate:** capture a true 1× encoded film, 2.85× wing/coverts, 4× eye/beak and compare against original reference and prior Chromium proof. If the wing still reads as flat sticker at film scale, change the underlying feather mass and reflected-light planes before adding more barbs. No master-level approval claimed.
