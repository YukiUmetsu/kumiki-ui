# Eye construction study — source observations and prototype plan

Target: a small, right-facing original paper puppet eye at final film scale, with an enlarged static study before production integration. References are for technique and anatomical observations, not to copy the artist's composition or identity.

1. Shelley Castillo Garcia, layered paper eye, [source image](https://inspgr.id/app/uploads/2019/03/art-shelley-castillo-13.jpg), SHA-256 `791fa8c99b5a3b3aea302ec34ac9d4883de0e16ec4f3449dbe6926efaa83fe16`, rights unverified; local study only. Close examination: the eye socket is a nested field of irregular cut edges, not an outlined cheek island; dark upper eyelid continues into tapered lashes that overlap the pupil; individual edges cast directional shadows. It is an extreme close-up and does not imply that every eyelash is visible in the small film shot.
2. RAW PAPER ART, [Anne in Purple](https://rawpaperart.com/portfolio), image SHA-256 `82b880e393322342aee191c8c4c9ceee4abeebff130605442c50d80a49933ee7`, rights unverified; local study only. Broad irregular bands connect the cheek, temple and jaw; neighbouring values meet as fitted cuts. The eyelids are dark tapered curves and their intersections remain distinct. This is a front view with closed eyes, so it is not a geometrical template for the puppet's profile.
3. Lotte Reiniger, [Cinderella king and queen cut-outs](https://www.bfi.org.uk/inside-the-archive/features/object-week-lotte-reiniger-cut-out-figures-backgrounds-cinderella), © Primrose Productions, licensed to BFI; image SHA-256 `db3a046e1c554fbc73772ab9b21dffc358315b2b9711f8d5a2eb43be66a65035`, local study only. The separate rigid silhouette parts overlap at visible joint fasteners; thin projections, openings in the crown and uneven lace contours remain integral to the surrounding mass. Small shot-size figures require silhouette legibility before internal detail.
4. Library of Congress [female profile photograph](https://www.loc.gov/item/99472203/), source and rights documented in paper-royal-profile-refinement.md. The inspected local eye crop is `/tmp/paper-profile-female-eye-source.png`, 650×650. It shows an upper lid occluding the dark iris, a sloped fold above the lid, narrower outer corner, and a lower lid turning into the cheek. It is a three-quarter view; the production puppet is closer to profile. Do not claim pixel or identity matching.

## Feature to construction map

| Region | Observed reference principle | Prototype geometry | Reject |
| --- | --- | --- | --- |
| Socket and cheek | Continuous broad value changes, no closed decorative outline | adjoining large paper planes extending beyond the crop | isolated cheek sticker or contour ring |
| Eye aperture | upper/lower contours converge at distinct corners | asymmetric closed almond stock, tapered at both ends | ellipse or white triangular wedge |
| Iris and lid | dark iris tucked under upper lid | dark iris stock covered by the upper lid; narrow lower rim | full oval protruding past lid |
| Fold | lid fold arcs separately above eye | one subdued tapered arc tied to socket plane | eyebrow substituted for lid fold |
| Microdetail | raised cut edges and nonuniform tapered lashes | only a few authored tapered cuts with silhouette intersections | random parallel surface dashes |

Draw a neutral static single eye on overlapping solid stocks; review at 1× and 3× against the actual photo and paper sources. Source/actual-render landmarks, critical masks, source-matched full face and five value planes are absent; do not call this a portrait or release-gate pass. No production rigging from this study until static visual review.

## Static prototype — rejected, not product art

An original [editable eye prototype](assets/paper-royal-study/eye-prototype-unapproved.svg) and [3× browser render](assets/paper-royal-study/eye-prototype-unapproved-3x.png) test opaque paper stocks, a clipped iris and a separate upper lid. SHA-256: SVG `5c801c586b9ef0438780469bed38584be9a062a64b40c4d70c4ab327b678ba9f`; render `6c009b190cba69d804a59e23452ced2124fbe1ad13c624b8da5b386eab9f6b40`. This is isolated research, not the actual royal story or a finished component.

Independent review rejected it: the symmetrical almond and central iris do not reproduce the oblique near eye; the upper lid and brow are generic smooth ribbons, lashes are triangular, and the broad cheek bands do not follow orbital or nasal planes. A subsequent uncommitted attempt shifted the iris but detached the lash shapes from the lid; it was discarded after rendering. Reconstruct the corner and lid geometry from a matched view, preserve lash roots, and map adjacent paper planes to the actual socket and nose before another review. Source and output annotations, anatomy/structural checks and 1× full-character evidence remain open. No product geometry was changed by this study.

[Diagnostic comparison board](assets/paper-royal-study/eye-study-board.png), SHA-256 `e29daf52575d68d103ef36b7746a25bd80f9042a10930e7146e0030d9b8c67e4`: left is the LOC crop, coordinates `(225,55,450,225)` within the previously documented 650×650 crop, enlarged 2× with nearest-neighbor sampling; right is the original prototype's 3× browser output, cropped at `(470,455,1000,755)`. The images are differently scaled and unregistered; the board is for qualitative comparison only and is not a measured match.
