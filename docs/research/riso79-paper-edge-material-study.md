# RISO79 — Paper cut edge and Risograph surface material study

Status: source-led visual study for the RISO79 pull-tab theatre. The reference images below were inspected in the browser at their available original resolutions; image rights and source observations are recorded next to each. The board intentionally separates **clean die-cut stock**, **torn-paper negative controls**, and **actual Risograph ink**. Do not blend these into one generic “paper texture.”

## Image reference board

### 1. Actual Risograph ink and paper tooth — macro

![Garden Party Risograph print macro by Cetrl, CC0](https://upload.wikimedia.org/wikipedia/commons/d/dc/Garden_Party%2C_closeclose.jpg)

- **Source:** [Garden Party, closeclose.jpg — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Garden_Party,_closeclose.jpg)
- **Creator:** Cetrl; 2022; 432 × 432 px.
- **Rights:** CC0 1.0, public-domain dedication. [License](https://creativecommons.org/publicdomain/zero/1.0/).
- **Observed:** the photographed Risograph surface has distinct spot-ink regions, uneven ink deposit, visible screen dots, pigment-edge variation and a paper substrate that remains perceptible between marks. The small image supports a qualitative surface study, not measurement of individual paper fibres or exact dot dimensions.
- **Construction consequence:** preserve the original blue/red spot masters and their screen geometry. Paper grain is a substrate property; do not lay a uniform noise filter over the completed image. Do not make the printed insert regenerate or shimmer when the tab moves.

### 2. Physical paper-cut topology and edge shadow

![Paper Cut Example 3a by Whicupz, CC BY-SA 3.0](https://upload.wikimedia.org/wikipedia/commons/2/2d/Paper_Cut_Example_3a.JPG)

- **Source:** [Paper Cut Example 3a — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Paper_Cut_Example_3a.JPG)
- **Creator:** Whicupz; 2008; 1,011 × 674 px.
- **Rights:** CC BY-SA 3.0 (also offered under GFDL). [License](https://creativecommons.org/licenses/by-sa/3.0/).
- **Observed:** the opening is a continuous cut contour; the cut remains legible from the exposed sheet edge and its small dark contact shadow. The image is not a macro photograph, so exact caliper and cut angle remain unknown. Its edges are comparatively clean, not deckled.
- **Construction consequence:** render a continuous cut face, a restrained inside wall, and a directionally displaced shadow on the lower sheet. A dark outline alone does not establish paper thickness. Keep the shadow inside the aperture so it does not become a dark stroke printed onto the cover.

### 3. Torn paper — explicit negative control, not the target

![Tattered Edges by Playingwithbrushes, CC BY 2.0](https://upload.wikimedia.org/wikipedia/commons/8/86/Tattered_Edges.png)

- **Source:** [Tattered Edges — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tattered_Edges.png)
- **Creator:** Playingwithbrushes; 2008; 1,338 × 1,216 px.
- **Rights:** CC BY 2.0. [License](https://creativecommons.org/licenses/by/2.0/).
- **Observed:** long, irregular, torn fibres, frayed paper layers and a rough, damaged perimeter.
- **Forbidden substitution:** do not apply this deckled/torn silhouette to a precision die-cut aperture. RISO79's old 1–5 source-unit “whiskers” were too long and too regularly spaced for a clean cut edge. The replacement microfibrils are short and restrained; their purpose is subtle cut-face texture, not a ripped-paper effect.

### 4. Paper engineering context

- [Smithsonian Libraries — Paper Engineering: Fold, Pull, Pop & Turn](https://library.si.edu/digital-library/exhibition/paper-engineering/page-turners-paper-engineering-fold-pull-pop-turn): separate the stationary cover, moving insert and visible aperture; the motion belongs to the paper mechanism, not to the printed image.
- [University of Michigan — Get Those Books Moving, Part 1](https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-1) and [Part 2](https://blogs.lib.umich.edu/beyond-reading-room/get-those-books-moving-part-2): pull tabs and slats are distinct mechanical paper components.
- [Jack Eisner — 3 Dimensional Paper Cut-Out Fish](https://www.mutualart.com/Artwork/3-Dimensional-Paper-Cut-Out-Fish/2E35C6E844A01FD07ADD96966B0FBC00): layered paper relief and cast-shadow reference; image use remains link-only because a reusable image licence was not established.

### 5. Risograph stock and ink constraints

- [SAIC Service Bureau — Risography Printing](https://sites.saic.edu/servicebureau/home/services/risography-printing/): Riso ink dries by absorption; uncoated paper with a little tooth is preferred.
- [UNM ARTSLab — Risograph](https://artslab.unm.edu/research/risograph/): uncoated absorbent stock; paper/ink interaction is not equivalent to a glossy digital overlay.
- [Reed College — Risograph Printing](https://libguides.reed.edu/c.php?g=1339150&p=11371973): ink is absorbed into the paper fibres.

These are process references, not a claim that the browser artwork can reproduce a real printer's fluid, pressure, drying or paper-caliper physics.

## Five-axis source deconstruction

| Axis | Source observation | RISO79 implementation contract |
|---|---|---|
| Topology | One continuous cover has closed cut openings; the separate print is visible beneath them. | Keep one stationary cover mask and one intact mobile print. No open cuts, accidental gaps or per-frame image reconstruction. |
| Contour | Die-cut contour is crisp and continuous; corners and transitions are not generic deckled tears. | Preserve original source-space cut paths. The current rectangular aperture remains the hero mechanism; organic hand-authored contours are a later extension, not fabricated from noise. |
| Direction / flow | Cut fibres are subordinate to the edge and paper grain; print screens belong to their own plate. | Use deterministic, short, irregularly spaced microfibrils anchored to each original edge. Keep spot-ink screen and registration coordinates independent of the paper movement. |
| Value / depth | The cut wall is a narrow material band; a dark occlusion shadow falls onto the lower sheet; the near edge catches light. | Use a caliper-derived inner wall, a separate lamp-directed shadow clipped to the aperture, a near-edge bevel and a restrained top-face glint. No Gaussian blur. |
| Microtexture | Riso's ink and the paper tooth coexist; torn fibres are not interchangeable with a precision cut. | Retain original screened plate geometry; avoid blanket noise. Show only subtle, short cut-face fibres at 3× inspection scale. |

## Diagnosis of the previous RISO79 render

The actual 3× Chromium capture showed the source ink and halftone intact, but the paper edge read as a pale contour with a weak dark stroke. The previous shadow was centered on the cut line, so it did not establish a separate lower-sheet cavity. The long fibre strokes could also read as torn paper when enlarged.

The defect was in the **edge material model**, not the source art. The correction must therefore leave both original RisoPrint masters untouched.

## New edge construction

- \`paperDepthMm\` is the top-stock caliper control (default 0.32 mm; supported 0.08–1.2 mm). It is converted to source-space CSS units using 96 px/in. At 0.32 mm this is approximately 1.21 source units. This conversion is a display convention, not a physical printer calibration.
- \`lightDirection\` points from the lamp toward the sheet. The cast shadow is projected in the opposite direction, scaled by the stock depth.
- The cavity shadow is clipped to the actual die-cut aperture and falls on the separately printed insert. It is not a blurred drop shadow around the cover.
- The cut wall is a distinct stock-colored cross-section, clipped to the aperture. Its width scales with the caliper.
- A narrow bevel and top-face glint establish the lit side without outlining the entire opening in cartoon white.
- The 88 per-window fibres remain deterministic but are now short microfibrils with stronger positional variation. They do not alter the cut contour or the original ink plates.
- \`paperRelief=0\` removes the added material relief while preserving the true cut openings and both original print masters.

## Adversarial controls

Reject these superficially plausible implementations:

1. One dark stroke on the cut contour with no separate lower-sheet shadow.
2. A large blurred drop shadow that spills across the stationary cover.
3. Long evenly spaced fibres that turn a precision die-cut into a torn-paper/deckle edge.
4. A paper-grain overlay applied after both inks, flattening the separate plates.
5. A moving crop or regenerated print instead of one intact original insert moving behind a stationary mask.

## Actual render acceptance

The focused RISO79 CI must capture and preserve actual Chromium output at 1× and 3×, including a thick-stock 3× stress frame. Review the images, not only DOM assertions:

- At 1×, the window remains readable and the edge must not become a cartoon outline.
- At 3×, the wall, inner shadow, bevel and short microfibrils must be distinguishable without obscuring the printed halftone.
- Changing stock depth or lamp direction must change only the paper edge/shadow, never the source ink paths, screen dots, registration or cut contour.
- The cover typography and printed insert must remain unclipped at all pull directions and both output aspect ratios.
- Reduced motion resolves to a still without changing the source artwork.

This is a stylized 2.5D visual material model. It does not claim to simulate real paper anisotropy, edge compression, fibre pull-out, friction, slot clearance, physical bending, pigment migration or press calibration.
