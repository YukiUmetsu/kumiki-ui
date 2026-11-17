# RISO80 — Source-authored organic die-cut contours

Status: implementation and automated Chromium proof are in this branch. Human visual approval remains separate from CI. This is an original SVG paper-window illustration feature, not a claim of physical cutting-die or kirigami fabrication accuracy.

## Reference image board

### 1. Japanese kiriorigami: cut silhouettes, raised planes and cast shadows

![Works of basic type of kiriorigami paper crafts by Masakazu Kawai](https://upload.wikimedia.org/wikipedia/commons/d/d8/Works_of_basic_type_of_kiriorigami_paper_crafts.JPG)

- **Original source:** [Works of basic type of kiriorigami paper crafts — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Works_of_basic_type_of_kiriorigami_paper_crafts.JPG)
- **Creator:** Masakazu Kawai (Drkiriorigami); photographed 21 November 2012.
- **Original dimensions:** 1,249 × 882 px.
- **License:** [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- **Observed:** multiple cut-and-fold paper forms (dragon, angel and smaller animals) have deliberately authored silhouette contours. The raised portions cast soft directional shadows; cut edges remain subordinate to the silhouette rather than becoming a fuzzy outline. The photograph also shows that different contour regions can transition from broad curves to sharper tips.
- **Transfer to RISO80:** use the image as evidence that an organic paper silhouette needs a continuous, authored perimeter and a separate depth cue. Do not trace the dragon, angel or other depicted forms. The RISO80 aperture shapes are original.

### 2. Kirigami radial cuts: repeated slits and retained paper bridges

![Kirigami radial cut construction by Bharath Kishore](https://upload.wikimedia.org/wikipedia/commons/3/3a/Kirigami_%281%29.jpg)

- **Original source:** [Kirigami (1).jpg — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Kirigami_(1).jpg)
- **Creator:** Bharath Kishore; photographed 16 February 2009.
- **Original dimensions:** 556 × 531 px.
- **License:** [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/).
- **Observed:** a radial arrangement of narrow cut slots retains deliberate paper bridges between adjacent cuts. The slit tips and raised flaps produce directional shadows; the circular centre and outer stock remain continuous.
- **Transfer to RISO80:** spacing between separate windows is structural, not merely visual. The renderer keeps a conservative seven-source-unit minimum gap between declared window envelopes. It does not allow neighboring organic apertures to merge or accidentally remove the bridge of stock between them.

### 3. Precision paper-cut edge and layered shadow reference

- [Paper Cut Example 3a — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Paper_Cut_Example_3a.JPG), Whicupz, 2008, CC BY-SA 3.0. The existing RISO79 paper-edge study records the image and license. Its clean cut contour is a negative control against long deckled fibres.
- [Minimalist Paper Art — Paulina M. Johnson](https://paulinamjohnson.com/). Link-only reference: the artist's layered curved paper strips show how repeated contours build depth through occlusion and shadow. No redistribution license was established, so no image is embedded or copied.
- [Smithsonian Libraries — Paper Engineering: Fold, Pull, Pop & Turn](https://library.si.edu/digital-library/exhibition/paper-engineering/page-turners-paper-engineering-fold-pull-pop-turn) and [University of Michigan — Get Those Books Moving, Part 1](https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-1) provide paper-mechanism context. The RISO80 window remains a cut in the stationary top stock; the complete printed underlay is still a separate moving sheet.

**Rights handling:** the two embedded photographs are remotely displayed from their Wikimedia Commons original URLs, with creator, original dimensions and license recorded above. The image files are not copied into the registry or redistributed as component assets. No source motif is traced, extracted or used as a production print master.

## Five-axis deconstruction

| Axis | Reference observation | RISO80 construction |
|---|---|---|
| Topology | Kiriorigami has one continuous sheet with cut/fold regions; radial kirigami retains stock bridges between neighboring slots. | Each aperture is exactly one connected, closed contour. Declared window envelopes must remain separated; multiple islands and holes are not silently combined. |
| Vector flow | Organic paper silhouettes transition smoothly through curves and sharper tips. | Authors supply one absolute SVG path with M/L/C/Q/Z. The exact path remains the mask geometry; the sampled polyline is only for validation and fibre placement. |
| Edge character | Clean cut contours are crisp; raised paper planes create shadows independently of the cut edge. | A single path drives the mask, cross-section, bevel, cavity shadow and edge highlight. Microfibrils remain short and attached to the actual contour; no torn-paper fringe. |
| Layer / value | Raised folds and radial flaps reveal the direction of light and the depth of the underlying sheet. | Stock caliper and the existing lamp direction continue to drive the 2.5D cut wall and cast shadow. The full second print remains intact below the aperture. |
| Temporal | A cut/fold structure belongs to the paper sheet, not to the camera or the printed subject. | Aperture path and fibre geometry are invariant across frame, pull direction, camera zoom and aspect. Only the complete insert paper plane translates. |

## Geometry contract

RisoPullWindow.contour is optional. When absent, RISO79's rounded-rectangle path is unchanged. When present:

1. It must be one uppercase, absolute, closed SVG subpath using only M, L, C, Q and Z. This deliberately small grammar is easy to audit and serializes identically in SVG and Storybook.
2. Coordinates are absolute source-sheet units. The existing x/y/width/height are the conservative envelope; all sampled points and Bézier controls must lie inside it.
3. Positive signed area is required: clockwise when viewed in SVG's downward-positive coordinate system. This gives the outward normal an unambiguous direction for the fibres.
4. The sampled contour must have a substantial enclosed area and at least 80 source units of perimeter. Open paths, multiple subpaths, malformed commands, unsupported arcs/relative commands, out-of-bounds handles and zero-length edges are rejected.
5. Non-adjacent proper crossings, touches and collinear overlaps are rejected. The validation is a bounded deterministic sample guard (eight samples per cubic, six per quadratic), **not** a formal exact Bézier-curve intersection proof. Authors must still inspect the real output.
6. Each organic contour receives 88 short, seeded cellulose microfibrils distributed by arc length over the full perimeter. Their normals use the validated winding. Their start positions and curves are identical at every FilmStage seek.

The exact authored path is preserved in the aperture mask. No raster tracing, smoothing, contour morph, image regeneration or per-frame randomization is used. The existing two original spot-ink masters remain byte-identical in their source path/plate geometry.

## Original demonstration silhouettes

The Storybook control "RISO80 window shape" toggles between the original rounded cuts and three independently authored organic silhouettes in both source compositions:

- Landscape: three asymmetrical, tapered leaf/ripple cuts with different shoulders and lower returns.
- Portrait: three narrow, flowing vertical cuts whose width is intentionally constrained by the 9:16 composition.
- Every window has its own stable ID and source-space envelope. The current renderer conservatively rejects overlapping envelopes even if two custom contours might geometrically miss each other.

These are original demonstration paths, not traced versions of the reference photographs.

## Actual-render acceptance

The focused CI captures real Chromium images for:

- Rounded RISO79 negative control.
- Organic landscape at 1× and 3×.
- Organic portrait at 9:16.
- Reverse seek from the first to final FilmStage frame.
- Source-path, fibre-path and both original print-master signatures before and after the seek.

Visual acceptance checklist:

- At 1×, the three windows read as intentionally authored apertures, not melted blobs, decorative ink outlines or torn-paper holes.
- At 3×, each contour is continuous and smooth; the 88 microfibrils are short, attached and subordinate to the edge. No long whiskers or evenly spaced brush-like fringe.
- The bevel and cavity shadow remain restrained and follow the current lamp. They must not become a white cartoon stroke or a dark printed border.
- At every seek, only the complete underlay moves. Original spot-ink paths, halftone screens, typography, paper pores, window contours and fibre paths remain unchanged.
- The landscape and portrait versions preserve their original typography and negative space; the windows must not expose blank paper or clip important type.

A green CI run and captured PNGs do not imply independent human artistic approval. The feature remains a stylized 2.5D paper illustration, not a physical model of die-cut tolerances, paper grain pull-out, crease mechanics, friction or press calibration.

## Remaining priorities

1. Interleaved physical slats for a true mechanical reveal, with validated slot order, travel limits, overlap and collision clearance.
2. A paper-wheel / volvelle mechanism with a fixed axle, cut window, independent printed disc and exact seek-safe rotation.
3. Human normal-speed review of the organic landscape and portrait output before claiming final paper-material fidelity.
