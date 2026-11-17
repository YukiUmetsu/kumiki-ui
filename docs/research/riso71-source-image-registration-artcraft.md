# RISO71 · Original-image registration microscope / ArtCraft evidence

**Scope:** make the original RISO66–70 two-drum source images inspectable against a *real scanned print*. This is **an optional diagnostic**, not new human-hand work, a replacement art source, printer certification, or claims of verified physical proof. Existing >400 pressure-loaded dry-brush fibres, source stencil contours, true paper-open reserves, independent grayscale PDF/TIFF drums, 16:9/9:16 and FilmStage timing remain unchanged.

## Reference-image deconstruction (before code)

The following are actual published *photographs of physical prints*, rather than AI-generated imitations, generic "Riso texture" presets, or borrowed art to redistribute. External images are linked, not checked into the library; their owners retain their rights.

1. [PicoN! / photographed Risograph multicolor edge](https://picon.fun/design/20230721risograph/) — [photographic detail](https://picon.fun/wp-content/uploads/2023/07/%E3%83%88%E3%83%AA%E3%83%9F%E3%83%B3%E3%82%B0%E8%AA%BF%E6%95%B4DSC03598.jpg): microscopic ink dots make near-continuous violet planes in the magenta area; cobalt, yellow and fluorescent pink overlap in **non-neutral** hues. Edges are physically displaced by a small, nonuniform amount; paper remains open between lighter dots. A smooth RGB multiply or digital blur does **not** reproduce that physical screen topology.
2. [Fiona Wilson Prints / separated black-and-white stencils and layered orange/cobalt illustration](https://fionawilsonprints.co.uk/how-to-prepare-artwork-for-riso-printing/) — [real printed color-separation photograph](https://fionawilsonprints.co.uk/wp-content/uploads/2023/01/IMG_9729-scaled.jpg): discrete grayscale stencil originals are registered onto a common paper face; small marks, hatch gaps, garment loops and narrow hair edges survive in the final two-color artwork. Continuous silhouette ownership and holes matter more than a uniform per-image texture overlay.
3. [RISO's own print-process explanation](https://www.riso.co.jp/english/tech_portal/core/match.html): thermal perforations in a master wrapped around a drum physically determine deposition. [RISO digital duplicator product family](https://www.riso.co.jp/english/product/digital_dup/index.html) reports machine-dependent resolutions, so we must not silently assume a universal printable margin.
4. [RISOTTO Studio's print-preparation guide](https://risottostudio.com/pages/printing-faq) distinguishes scanned/halftone image treatment from preserving fine vector lines.

### Five-axis physical-image findings

| Feature | What the actual reference photographs show | Native source / inspection acceptance |
|---|---|---|
| **Continuity** | Colored silhouette joins and fine linework remain one designed shape through overprint. | The actual existing four RISO68 pressure shapes per drum are never rasterized or redrawn by this feature. |
| **Vector flow** | Long curved contours follow the illustration's subject, while print-dot grain occupies tonal surfaces. | Keep independent per-ink vector edge, pressure and >400 dry-fibre paths. No universal stamp/noise replacement. |
| **Edges** | Registration gives tiny ink-only offsets; paper and marks are the rigid reference. | Pick **four real paper corners first**, then cross centers independently per drum; never align colors to one another by hiding displacement. |
| **Depth/overprint** | Two semi-transparent inks generate a third visible value/color only where both print. | Separate masters remain independent and physically grayscale, color previews remain display-only. |
| **Micro-elements** | Dither dots, pinholes, negative-space wedge edges and small registration ghosts are not uniform Gaussian grain. | Keep original native fibres and paper openings; inspect at true 1×/2×/3× image scale. Do not pretend an uploaded photo proves physical equipment performance. |

## Implementation and workflow

Existing RISO70 lets an operator paste 12 manually observed pixel coordinates but **has no image-based way to actually examine or pick them**. RISO71 adds a local-only image microscope to the same Storybook studio:

- Upload local PNG/JPEG/WebP (<30 MB; 16–16000 natural pixels per side). No third-party source image or external tracking, no raster upload or image embedding in generated masters.
- Display the real uploaded image at 1×, 2× and 3×, keeping all paper/ink microdetail. Mouse picks map CSS display position into **natural scan pixel coordinates**, with optional explicitly entered X/Y for keyboard-accessible operation.
- Show color-coded, independent source-image annotations: paper corners vs per-drum printed registration crosses. Select/revisit all 12 readings; reset safely on source frame/seed/output/mark changes, or image changes.
- Only after **all 4 correctly ordered paper corners + 4 observed cross centers per physical drum** are present, pass the operator-pick observations to the existing unmodified RISO70 affine/scanner residual and per-plate drift calculation. Missing/out-of-image/crossed paper edges fail closed.
- The widget reads image pixels only to place human-chosen coordinates; it does **not** infer ink colors, trace artwork, auto-detect crosses, remove paper texture, or change the source's film animation. Synthetic RISO70 remains explicitly labeled synthetic.

## Release / validation gates

- Source invariance: no modification to RISO66–70 stencil geometry, 16:9/9:16 timing, press PDF or TIFF output.
- Unit: correct natural-pixel conversion under CSS resizing; all target ordering, scanner affine under paper rotation, meaningful RED drum deviation, incomplete scan rejection, collinear/crossed paper bounds and out-of-image rejection.
- Real Storybook: physical-image upload, 1×/3× native screenshot, image click + keyboard coordinate entry, full 12-point annotation, 2-ink measured report and zero JS errors. Test screenshot is **synthetic illustration data and not a physical print**.
- A later genuine press quality claim still requires user-provided rights-cleared full paper scans, multiple copies for registration variance, matched 1×/3× print visual comparison, independent printer profile and operator-signed proof. Browser tests alone cannot establish historical print fidelity.

No new dependencies or third-party reference artwork redistributed.
