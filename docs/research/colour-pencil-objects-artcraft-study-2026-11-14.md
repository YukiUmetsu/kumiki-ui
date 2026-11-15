# Coloured-pencil ArtCraft: object materials and reference study

**Date:** 2026-11-14  
**Reference mode:** style-guided, **not** pixel-matched. Third-party art is studied for physical techniques and structural principles only; no pixels, source SVG, traced paths or proprietary artwork are shipped. All four subject plates are independently authored.  
**Status:** technical implementation candidate; ArtCraft five-axis, actual Chromium pixel critique, full normal-speed video and independent human acceptance **pending**.

## Reference image board (remote viewing only; rights not cleared for redistribution)

| ID | Artist / primary page and visible subject | Macro construction | Meso / micro craft | Original code translation |
| --- | --- | --- | --- | --- |
| R1 | [Susan Rubin — *Climbing Rose*](https://www.susanrubinstudio.com/living-color-2021.html). Observed red rose with overlapping curled petals and two buds | Detached petal planes overlap around a dark cup; sepals/stems root beneath the corolla | Warm red face, cooler magenta cut-in folds, a pale curved ridge, visible radial coloured-pencil direction | The original rose plate has seven different petal masses, a dark inner fold, leaf midribs, two leaf planes and an attached sepal. Petal surfaces use fibre-shaped upper layers, distinct chromatic bands and opt-in silhouette clipping. |
| R2 | [Phil Schorn — pink rose and bud](https://www.artskai.org/kai-artist-spotlights/philip-schorn). Single luminous bloom on dark | Deep interior recess and clear petal overlap sequence | Light, fine petal-edge glints against dark violet core; short strokes tangent to curling petal contour | Separate dark cup and foreground rim; do not simply scatter white dots or use flat red circles. |
| R3 | [Alyona Nickelsen — wine glass edge guide](https://coloredpencilmag.com/wp-content/uploads/2017/02/COLORED_PENCIL_Magazine_01_January_2016.pdf). Glass and fabric study | The glass is a volume defined by contour, distortion and reflected windows, rather than opaque blue fill | Hard specular streaks, tinted edges, selective interior transparency and background warped through vessel | The original citrus-and-pitcher plate uses a non-opaque glass recipe, separate glints/lip/handle, a solid citrus foreground and a fabric ground plane. **Refraction remains an approximation**; no physical ray tracing is claimed. |
| R4 | [Lisa Wronski — architectural coloured-pencil drawing](https://www.lisawronski.com/). Brick bay façade and storefront | Repeated openings share a vertical axis and measured spacing | Mortar pitch rhythm, darker reveals, fine tracery, shaded awning, paper-grain sky | Original three-arch façade has separate recessed panes beneath transparent glass, layered brick rows with alternating joints, and a blue fabric awning. **Perspective is authored, not computer-vision reconstructed.** |
| R5 | [Veronica Winters — white drapery study](https://www.craftsy.com/post/how-to-draw-fabric). Soft fabric folds with cool shadow valleys | Cloth reads as several joined folds, not a single polygon with added stripes | Highlights ride crests, deeper bluish shadow pockets sit between folds | Three separate original blue textile surfaces overlap; a brass cup contrasts matte fibres and smooth specular metal. |
| R6 | [Marcello Barenghi — metal teapot study](https://www.amusingplanet.com/2013/09/realistic-colored-pencil-drawings-by.html) (secondary publication; original artwork not licensed here) | Metallic volume reads through reflected light/dark shapes | Very narrow bright reflections and dark hard-edged contacts | Metal surfaces are opaque and burnished with high pressure; highlight edges are separately authored. |
| R7 | [Neki Haidari — *Fair Eyes*](https://www.dokhtaraart.com/all-prints/p/fair-eyes). Observed realistic eye/cloth crop | Facial structure and eyelids dominate believable portrait geometry | Microvariation in skin/eyelashes, textured cloth edges | **Not yet implemented as a face study.** Requires per-landmark anatomy and high-resolution reference crop before claiming portrait craftsmanship. |
| R8 | [Néstor Canavarro — detailed portrait](https://www.behance.net/gallery/53508807/Colored-Pencils-Portraits) | Planes of cheek and nose remain continuous | Individual pores and wrinkles follow local form | **Research-only backlog** for skin/hair. Do not repurpose the fabric/fur presets as a complete portrait model. |

All above reference images are for analysis only. Links may change; gallery images may have all rights reserved. References are not bundled into the npm package, Storybook assets or test snapshots.

## Source-backed technique principles

- [Claudia Nice / Crayola, *Colored Pencil Tips & Techniques*](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): soft/medium/heavy pressure layering, paper tooth, stippling, hard-point edges, colour-matched burnishing and white highlights.
- [Oxford University Museum of Natural History, scientific drawing techniques](https://oumnh.ox.ac.uk/sites/default/files/oumnh/documents/media/bowstead_-_drawing_techniques.pdf): iridescent colour can emerge from many scribble/stipple layers; burnishing yields luminous smoother areas. This informs the opacity/stipple distinction but does not certify exact physical simulation.
- [Janie Gildow, *How to Color — with Colored Pencils*](https://www.desertmuseumarts.com/_files/ugd/7a6b2d_b5b3d4744f55473394fbd965bad1a04a.pdf): point sharpness determines visible tooth, rounded vs sharp application; repeated light-to-heavy pigment supports smoother value gradients.
- [Sherry Bruce Smith — artist statement](https://www.sherrybrucesmith.com/about): deliberate still-life staging and slowly built translucent/opaque pencil layers; shadow placement on fabric is structural, not an optional decoration.

## Material-to-object construction contract

The public, geometry-independent \`createPencilMaterialRegion\` consumes a **caller-authored** local SVG silhouette, its exact bounds, RGB palette, seed, timing, material ID and any high-value contours/details. It returns a CP1 \`PencilRegion\`, retaining existing frame/pressure validation. It does **not** discover objects from raster references. This is the practical route to arbitrary objects without pretending a stylistic filter can infer three-dimensional anatomy.

| Surface | Mark / support strategy | Style-critical geometry must still be authored |
| --- | --- | --- |
| Petal / leaf | Narrow fibre highlights over crossing coloured hatches, opaque support | Curl edges, cut-ins, leaf branching, venation |
| Citrus | Warm base, core-weighted speckled pores and light glints, opaque | Asymmetric fruit silhouette, navel, stem, cut flesh |
| Glass | Sparse rim pigment, separate elongated specular arcs, **no opaque support** | Rim ellipse, double glass walls, background distortions |
| Metal | High-pressure crosshatch, strong rim values, opaque | Reflected environment, crisp specular banding and bent contour |
| Masonry | Slightly broken/stippled surface over directional underlayers, opaque | Single-world perspective, real apertures, masonry joints |
| Fabric | Intersecting long base hatches + aligned short fibres, opaque | Multi-plane folds, highlight crests, shadow valleys, seam roots |
| Wood / stone / fur | Directional fibres or granular stipples, selected optical mass | Grain/flute, irregular chipping, species-specific hair or feather topology |

### ArtCraft gate ledger

- **Reference research:** links, material features and rights status above. No actual cropped pixels saved to the repository because third-party redistribution rights are unclear.
- **Structure:** four explicit silhouette/layout grammars, named negative spaces (flower center, glass opening, facade windows, drape folds). The stories use one independent landscape/portrait staging and preserve a title-safe region.
- **Material:** ten reusable recipes with CP1 3-pass typed hatch/fibre/stipple and pressure, paper tooth, underpaint and support semantics. Grain is paper-space and deterministic.
- **Interactive story:** one new story in the **existing** \`Video Production/Film Looks/Colour-pencil\` Storybook group; object, output, pressure, paper tooth, seed, playback speed, reduced motion, and frame seeking are controlled.
- **Technical gates:** focus Vitest for all four subjects in 16:9/9:16, material-family selection, opacity, invalid input; local-only Playwright proof for 8 final frames and shuffled seeks. These do not equal an ArtCraft pixel-fidelity pass.
- **Critical unverified art gates:** normal-speed exports for each object, side-by-side motif crop analysis at actual resolution, per-object connection/contour/spacing/texture five-axis measurements, source-based proportions, subject-appropriate cast shadows and glass refraction. The rose still has stylised petals; the brick facade has repeated simplified windows; brass reflections need an environment map. A green CI run is **not** world-class art acceptance.

## Local verification

\`\`\`bash
npm run typecheck
node scripts/check-video-storybook-source.mjs
npx vitest run --project unit tests/colored-pencil-materials.test.tsx tests/colored-pencil-science.test.tsx
npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/colored-pencil-materials.spec.ts
\`\`\`

**Next craftsmanship priorities:** close crop revision of rose petal curl/veins, glass rim/refraction, cast shadows on fabric and 3D metal reflections; new domain-specific portrait/animal/vehicle/landscape geometry before declaring that the system renders any arbitrary prompt or raster image.
