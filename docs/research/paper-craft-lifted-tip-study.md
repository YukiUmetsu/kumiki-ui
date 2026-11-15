# Paper Craft pass 17 — raised, hinged cardstock tips

November 14, 2026. Source craftsmanship research (not traced geometry or redistributed images):

- [Diana Beltrán Herrera, original paper birds](https://www.dianabeltranherrera.com/projects/birds): bird primaries consist of individual overlapping, attached paper feathers; larger wing strips are subtly lifted, smaller chest feathers stack shingle-like.
- [Smithsonian: Diana Beltrán Herrera's Flock of Paper Birds](https://www.smithsonianmag.com/science-nature/diana-beltran-herreras-flock-of-paper-birds-9713658/): her process begins with a paper form and then individually cuts, scores, positions and fixes species-specific feathers.
- [Herrera construction interview](https://artsintherightplace.wordpress.com/2012/07/21/diana-beltran-herrera-interview/): paper structure, cutwork planning and an unrestricted piece budget matter more than superficial color overlays.

## Geometry translated into Kumiki

`PaperCutLayer.liftedTip` is a **separate, closed SVG stock contour** attached by an authored sheet-space hinge, visually independent of the parent contour clipping mask. `PaperLiftedTip` bounds projected fold angle to ±25° and contact-shadow lift to 18 px. The renderer applies a hinge-relative transform to an independent opaque underside with its own shadow, while the material inherits the parent's complete rig transform. Fold strength is configurable 0–1.

The kingfisher has 18 root feathers, each originally a simple narrow tapered stock. Each has been rebuilt as a ~75% root blade plus a partly overlapping and independently rotated terminal cut. The root and tip share their hinge and parent flutter rig, so assembly and absolute-frame flutter cannot desynchronize. The layer count still respects 128. Canal house roof eaves and teacup napkin fold corners also use the same reusable shape primitive.

New `relief` 0–1 option is exposed on `paperObjectSpec`, validated in `paper-craft-study`, and available in existing Film Looks Storybook controls. `liftStrength` on `PaperCraftStage` modifies the folded projection without changing SVG topology. FilmStage screenshots exist in 16:9 and 9:16, together with interactive Storybook.

## Limits

This is **two-part, hinge-projected 2.5D paper**, a true change to silhouette rather than only RGB shading. It does **not** generate a smooth physically bent 3D mesh, solve sheet thickness, stretch, self-collision, kerf compensation or manufacture-ready cutting instructions. No pixel-similarity score is asserted without aligned input photos. Further improvements should sample actual feather positions and individual barbs at matched reference viewpoints.
