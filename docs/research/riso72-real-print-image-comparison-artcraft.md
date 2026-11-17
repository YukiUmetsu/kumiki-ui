# RISO72 — photograph-led paper-coordinate, vector-vs-actual-scan print-art audit

**Release state: observational tool, NOT physical print or artist-fidelity approval.** RISO71 could mark twelve original scanner-image coordinates and report per-ink registration drift, but offered no source-versus-physical-photo comparison in exactly the same physical paper coordinate system. RISO72 adds this comparison to the EXISTING RISO70/71 Storybook. The untouched production RISO68–70 separate grayscale PDFs/TIFFs retain all source pressure paths, dry brushes, unprinted fibre slits, winding and edge continuity; no film or human-hand edits.

## Authentic reference IMAGE study (external artwork only)

- [PicoN! real Risograph close-up photograph (Japan)](https://picon.fun/design/20230721risograph/) — [direct detail image](https://picon.fun/wp-content/uploads/2023/07/%E3%83%88%E3%83%AA%E3%83%9F%E3%83%B3%E3%82%B0%E8%AA%BF%E6%95%B4DSC03598.jpg): inspect the **tiny magenta halftone dots**, dense cobalt field, visibly separate fluorescent yellow contour and green/orange mixed inks. Fine dots do not reduce to one uniform high-frequency grain; local paper is still present between them. A real optical register error must be measured against the *paper*, rather than artificially aligning ink edges until all ghosting disappears.
- [ALBATRO physical Risograph separation/contact test print](https://albatro.base.shop/items/62344398) — [printed test-sheet photograph](https://baseec-img-mng.akamaized.net/images/item/origin/7a22ebbd1d9e1168b99124c981d7f0e0.jpg): a grid of distinct masks prints multiple transparent colored box views on the same substrate. Compare the black/white stencil ownership to actual printed overlap and preserve the independent color masters instead of flattening their edges.
- [Fiona Wilson Prints: documented two-color Risograph stencil preparation](https://fionawilsonprints.co.uk/how-to-prepare-artwork-for-riso-printing/): one grayscale source per ink; tactile drawn detail depends on original line/white-paper cutout masks and correct registration across separate press passes.
- [Texas Tech University, 2026 *RISO Printing Guide*](https://www.depts.ttu.edu/art/documents/resources/current-students/facilities-technology-risostudio-printguide_ac26.pdf): print-shop grayscale source requirements and registration practices; shop-specific margins must be operator supplied. [Risolana, shop workflow](https://www.risolana.org/printing): consecutive physical ink passes can misregister. These sources inform the workflow, not a claimed exact simulated machine profile.

**Rights:** Photograph references are linked, not downloaded into the application, traced, redistributed, used as an image fixture, or treated as original artwork. A genuine user-owned scan must be supplied independently to review real printed marks.

### Five-axis structural deconstruction of the printed reference photos

| Axis | Physical reference observation | RISO72 design response |
| --- | --- | --- |
| Positive contour continuity | The physical colored shape's silhouette remains visually coherent through local misregistration and overprint. | Compare each existing original closed vector stain/pressure edge directly with **unaltered** photographed sheet pixels; forbid automatic ink-based image fitting. |
| Intrinsic vector flow | Drawn stroke direction is distinct from screen/registration texture; long curved figures retain their own directional mechanics. | Native SVG source stays vector and its 400+ independently authored dry-brush openings remain intact at 1×/3×. |
| Real ink edges | A faint second outline may come from drum movement; paper corners do not move with the inks. | Four **paper** corners determine affine deskew; eight separate cross centers remain as independent displacement arrows. |
| Layered depth | Two printed spot inks make mixed physical hues; scanner illumination changes their apparent density. | Show original **K-only drum** versus **color photo** side-by-side or explicitly labeled overlay. This is for structure, not quantitative color delta or density calibration. |
| Micro-details and paper | Uninked paper pockets, colour flecks, halftone sites and fibre gaps survive physically where local stencil cutouts permit. | Source SVG is not converted to pixels; original scan image is not denoised. User can pan the same mm-space microscope over both layers at 1×, 2× and 3×. |

## Original-image comparison method

1. User uploads original PNG/JPEG/WebP photo or scan in RISO71 and marks all four paper corners (TL/TR/BR/BL) and 4 physical crosses per drum.
2. RISO72 constructs **only** a paper-derived affine transform: image scan pixels to physical sheet millimeters, using original paper corners TL, TR, BL and the expected 297×210 or 210×297 print format. Fourth BR is an **independent residual**, not used to hide perspective skew.
3. Reject mirrored or folded paper corner order, source pixels outside the uploaded image, degenerate geometry, or non-affine disagreement greater than the declared 0.5 mm visual comparison budget. Never warp original 400+ dry-brush source fibres.
4. Place the existing native RISO68 grayscale SVG master and unmodified scanned image on the same physical millimeter coordinate. Both share explicit pan/zoom: whole sheet, 2× and 3× paper-edge macro. The original SVG remains independently editable/exportable.
5. Overlay each drum's **observed mark center** as a measured red or blue cross and draw the displacement vector to the expected source register cross. This is an operator-entered measurement; there is no automatic ink color segmentation.
6. Switch source master (cobalt/vermilion), paired, overlay, original-only and scan-only views. The overlay's opacity is merely an observation aid; do not interpret RGB vs grayscale as a quantitative print-density result.
7. Never upload the image to the backend. The current blob URL and natural pixel dimensions are ephemeral browser state; the film, source SVG and exported grayscale print files stay unchanged.

## Tests and explicit limitations

- Unit source photo geometry: exact origin, x/y rotation, paper-to-pixel inversion, invalid shape/size, swapped/mirrored/folded order, independently detected non-affine BR disagreement, and ink mark offsets not influencing page registration.
- SSR: actual two independent source SVGs, K-only evidence, original native shape IDs, eight per-ink physical-mark vectors and absence of any smoothing/rasterization primitives.
- Chromium: **synthetic, explicitly test-only photo** generated from the *real original RISO68 SVG* by a screenshot (NOT an authentic scanned print). Verify uploaded image, 12-point paper and cross annotation, 1×/3× synchronized source/photo crops, two plate switches and revert, overlay and original-only mode, screenshot artifacts and no page errors.
- Full RISO70 print-shop regression, clean registry consumer, strict TS and source tests, true Storybook build, original PDF/TIFF and Poppler independent PDF decodes must pass.

**Still ART HOLD:** Physical print realism and photographic style fidelity require a rights-cleared actual scan from a real physical print, measured corners/mark centers (or scanner metadata), reference-relative 1×/3× independent image review, multiple printed copies, measured press stock and feed margins. A passing code test or test screenshot **does not** approve press accuracy, print-shop acceptance, or the unapproved RISO59 human-hand anatomy. Do not enable unapproved hand assets by default.
