# ArtCraft CP-F1 + FLORA1: Rose odd-pinnate leaflet reconstruction

**Date:** 2026-11-17. **Status:** new opt-in botanical anatomy A/B, NOT independently approved for realistic botanical film. Does not identify a cultivar or claim matched photographed morphology.

## Authentic morphology and art references

- [Australian Office of the Gene Technology Regulator — *The Biology of Hybrid Tea Rose*](https://bangladeshbiosafety.org/wp-content/uploads/2017/06/Biology_of_Rose_Au.pdf), p. 22: odd-pinnate five-leaflet rose, rachis, basal adnate stipules, photographed leaflet pairs and terminal leaflet.
- [Missouri Plants — *Rosa carolina*](https://www.missouriplants.com/Rosa_carolina_page.html): sharply serrated leaflet tips, paired asymmetry, attached midrib, varied green reflectance.
- [Japanese Ministry of Agriculture, Forestry and Fisheries — cultivar image](https://www.hinshu2.maff.go.jp/vips/cmm/apCMM112.aspx?LANGUAGE=Japanese&TOUROKU_NO=26714): official plant-identity photograph showing five- and seven-leaflet rose morphologies, variable tooth size and vascular axis.
- [Rosa palustris botanical description](https://biorepo.neonscience.org/portal/taxa/index.php?clid=8713&taxauthid=1&tid=31976): usually seven leaflets, fine margin serrations and hairy rachis. Evidence that true species morphology **varies**.
- [Ann Swan / ASBA colored-pencil botanical-art technique](https://asba-art.org/content.aspx?club_id=92618&item_id=2243910&page_id=4002): vein accuracy, layered optical colour, pigment materials and actual texture rather than uniform flat outlines.
- [CP-F1 Artist Board](colour-pencil-foundation-2026-11-14.md): layering and source-first shapes before pigment detail.

Images and photos are **reference observations only**. No photographs, traced contours, fonts, third-party SVG, or artist assets are redistributed. All geometry, serration phase, local marks and palettes are authored in this repo.

## Five-axis deconstruction before code

| ArtCraft axis | Observed morphology | New native behaviour | Unsolved risk |
|---|---|---|---|
| Topological continuity | One rose leaf contains an axis and an odd number of attached leaflets; two opposite pairs plus a terminal leaflet make a common five-leaflet example. The leaf attaches via a petiole with paired stipules. | Each of two original large green blade placeholders becomes eight **separate** parts: five physically placed leaflets, one tapered rachis/petiole, two basal stipules. Every leaflet roots on its local rachis rather than floating. | The source rose has no confirmed species; five leaflets are one valid example, not a universal rose standard. |
| Local flow | Lamina direction flows tipward and turns independently in each oblique leaflet; left and right anatomy is not a mirrored overlay. | Ten individually authored root/belly/tip quadratic axes, independent width/foreshortening, local positive-negative normal, nonuniform blade widths. | Macro inspection may find some blade curvature or junctions too regular. |
| Micro-silhouette | Rose margins have many fine, pointed and slightly asymmetric teeth, not scalloped ripples, smooth ellipses or a jagged star. | Eleven to fourteen independently placed small marginal teeth per side of each leaflet. Tooth depth tracks physical lamina width and tapers to nothing at root/tip. | Tooth continuity, albedo and anti-aliased 1× readability remain an actual browser/art gate. |
| Luminance and pigment | Midrib, herringbone veins, soft green field, olive core, warm reflected surface and light grain differ across leaves. | Distinct CP-F1 solid supports, authored warm/dark/light triads, localized midrib + 14 side veins + 34 sparse short surface fibres per blade; inherited three CP-F1 material passes and paper tooth. | Leaf surfaces still have modeled, not measured, real botanical spectral response. |
| Edge layering and occlusion | Overlapping paired leaflets should have real paper-opening wedges and slender cross-organ rachises. | Original leaf-wide silhouettes removed **only when explicitly opted in**; every independent SVG shape is individually clipped and preserves a small negative space between blades. | Flat 2D layering can still require deeper over/under leaf geometry and live wind rigging. |
| Film continuity | A/B must show exactly the same red corolla and green calyx across arbitrary seeds, pressure and aspect. | Existing petal, calyx, sepal, stem, original details, material seed index, light gradients and film timing are byte-identical when flags change. New leaf hash positions stable with calyx toggles. | Real dynamic wind articulation has not yet been visually evaluated. |

## Experiment and safety

- Production-default `rosePinnateStudy=false`; current original leaf regions (legacy two large blades) render exactly as before.
- When enabled the original `leaf-left` and `leaf-right` regions are replaced by 16 source-native leaf organs. The total rose specimen becomes 25 material regions; with the opt-in six-part calyx it becomes 30.
- No new dependencies or external art source; no new Storybook folder. Studio controls cover 16:9/9:16, pressure/tooth/burnish, deterministic seed, frame scrub, 2.15× macro, optical lamina/lip A/B, calyx A/B, and pigment-only mode.
- Structural validation rejects fewer than two five-leaflet groups, duplicate organ IDs, invalid/degenerate geometry, collapsed leaflet dimensions, missing veins, unsupported source paths, and a missing terminal leaflet.
- Screenshot tests compare actual unchanged baseline output to transformed native source (not a raster imitation). Browser also measures every leaflet's **actual SVG root-to-rachis distance**, checks ten serrated native source paths and the dedicated vein traces.
- **Release gate:** exact-head CP-F1 unit, TypeScript, Storybook browser tests, actual 960×540/540×960 and 2.15× artist-reviewed image artifacts. Passing tests does **not** certify the rose visually realistic.

## Independent artist rejection criteria

Reject a schematic round-tipped leaf, identical mirrored paper-cut blades, repeated saw-tooth silhouettes at 1×, missing negative gaps, isolated tips that do not attach to rachis, generic linear veins without organic fan, saturated green plastic surfaces, a disconnected receptacle, or changed original petal shading.

## Remaining highest-value priorities

1. Compare and correct local leaflet serration, blade curvature and attachment against a rights-verified detailed rose photograph, ideally same variety/bloom stage.
2. Replace the **still simplified red corolla** with source-measured, physically folded asymmetric petals and true negative-space underturn, preserving every prior fibre/lip source.
3. Motion under seek/replay, with real wind-driven phyllotaxy and physically tied stems; 1× film export and independent artist acceptance.

**Do not promote a study toggle to the normal production export before the human ArtCraft image comparison and measured morphological approval.**
