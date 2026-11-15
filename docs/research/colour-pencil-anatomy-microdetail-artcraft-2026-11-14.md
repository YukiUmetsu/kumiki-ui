# Colour-pencil ArtCraft: fox, claws, and kingfisher feather anatomy

Date: 2026-11-14. **Reference mode: style-guided**, not pixel matched. Artist-owned reference art is linked, never redistributed or traced. All silhouette geometry and pigment marks are new original code.

## Reference-image study

| Reference | Visible craftsmanship (image or primary technique source) | Implemented improvement |
| --- | --- | --- |
| [American Red Fox Portrait, ArtGallery](https://www.artgallery.co.uk/listing/o9rquo84ye-american-red-fox-portrait) | Fine brow hair flows around asymmetric amber eye, pale muzzle overlays charcoal chin, whiskers emerge from fixed nose/cheek roots | Adds separate upper eye-lid marks, 3 anchored snout whisker fans, near/far toe creases, and an opaque fourth hind leg; no generic circles or random hair dots |
| [Bonny Snowdon, fox-coloured-pencil process](https://bonnysnowdonacademy.com/fox-draw-resources/) | Construct face anatomy before fur; face/ear/muzzle then layer value around the eye, directional shoulder hairs and lastly whiskers | Retains local fur tracts and unclipped whisker projections from a deliberately opaque muzzle; never adds undirected shader noise |
| [Cocomaru coloured-pencil kingfisher](https://www.lemon8-app.com/@cocomaru_art/7481105821024305669?region=jp) | Short blue-white crown pattern, distinct small coverts overlapping folded long wing feathers, narrow dark bill and high-contrast eye | New linked vane/rachis geometry on seven folded-wing and four separate shoulder-coverts, each shaft with four opposing barb pairs |
| [Daria Maier, River Kingfisher drawing](https://www.artmajeur.com/maier/en/artworks/15350452/river-kingfisher-bird-portrait-photorealistic-drawing) | Wing primaries flare with correctly radiating shafts and very fine parallel vanes; bright warm chest remains separate from blue wing | New deterministic curved shaft interpolator (all vane roots are mathematically on their rachis), local angle-aligned asymmetric barb spread and compact clipping |
| [Cornell Lab Bird Academy bird terminology](https://academy.allaboutbirds.org/bird-academys-a-to-z-glossary-of-bird-terms/) | Kingfishers have partly fused anterior digits and a backward-facing hallux, unlike oversized raptor grasping talons | Six overlapping individually closed body/forward/rear toe shapes for two feet, clipped paper support, small exterior terminal claws |
| [Cornell Lab Green Kingfisher species overview](https://www.allaboutbirds.org/guide/Green_Kingfisher/overview) | Shows partially joined forward-facing toe arrangement and perching behavior | Short ankle shafts, broad joining at toe roots and independent backward contact |
| [Peer-reviewed study of bird foot skin](https://pubmed.ncbi.nlm.nih.gov/33098345/) | Keratin scales, podotheca and digit connection shape the contact patch | Seventeenth reusable pigment material: keratin uses sharp hatch/stipple, not fuzzy fur-like fibre; five pressure-defined foot detail types |

Copyright holder rights were not verified for cropping or republishing these drawings; do not bundle any reference image with this package.

## Authored anatomy graph and measurable microdetail

### Fox
The prior source contained only three actual hind/fore legs, with no far hind. The existing planted dark far-foreleg region now contains a **second closed far-hind-leg silhouette**, drawn before the opaque torso. This retains the strict actor-region budget without weakening pose semantics; the near hind limb and near foreleg retain separate pivots. Toe/knuckle creases follow the near planted paws instead of one line across the entire foot.

The pale muzzle has **intentional open detail paths** (the parent silhouette still has opaque paper support) so whiskers can extend beyond the cheek rather than abruptly disappearing at the face clip boundary. Their roots remain attached to x227–234 around y122–130. Full photorealistic fox-eye and whisker fidelity is still pending.

### Kingfisher perching feet
An initial 900×580 isolated SVG macro (authored toe polygons, not full CP1 raster pigment) exposed cartoon-thick contours and oversized black claw hooks. Outline width and claw widths were reduced, scale rows made less regular, and claws allowed to project beyond the keratin polygon. Each foot now has three overlapping closed subpaths: short tarsus, fused anterior toe mass, and short backward hallux. The overall shape bounds are x98–170, y178–229; branch contact near local y218.

### Kingfisher folded wing
Seven hand-authored near-wing shafts and four covert shafts each supply original quadratic root, control, tip, and half-width. Four positions on each shaft (t=0.25, 0.43, 0.61, 0.78) sprout asymmetric left and right barbs on a tangent-derived local normal. Each axis therefore produces **nine connected curved SVG subpaths**, not detached noise or parallel ruler bands. Invalid color, degenerate tangent, excess shaft count and nonfinite parameters fail closed. The existing shoulder parent hierarchy prevents double transforms at folded/extended extremes.

## Storybook and validation

No additional Storybook folder. Existing Colour-pencil Character Performance has production-geometry macros for fox eyelid/whisker, fox paw, kingfisher bill/iris and feather wing. Existing Colour-pencil/Wildlife adds bill, crown, coverts and 4.8× short toe/perch views. These are real CP1 scene markup with Storybook-only magnification, not substitute raster images.

Automated tests validate 17 material recipes, six kingfisher closed toe silhouettes, keratin opacity, four-foot planting invariant, 11 anatomy-aware vane families with 8 barbs per shaft, barb roots within 0.011 paper units of the shaft after rounding, 16:9 and 9:16 scene validation, four-legged fox silhouette and existing 24-region ensemble budget.

**Not yet completed**: Chromium full-scene screenshot inspection, full-speed video/pose review, reference image pixel or semantic mask comparison, five-axis ArtCraft numerical audit, actual human artistic acceptance. CI success alone is not art approval.
