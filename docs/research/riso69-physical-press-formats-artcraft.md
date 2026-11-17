# RISO69 — source-true grayscale vector PDF and 8-bit physical TIFF drum delivery

**Status: source-native, non-human, printer-specific delivery study.** RISO69 builds directly upon source-original K-only RISO68 exports and the opt-in RISO67 safe-contact trap. No existing source fibers, pressure creases, paper apertures, painter's curves or separate physical ink masters are simplified. **PDF/TIFF format compliance does NOT constitute machine calibration, an accepted print-shop order, or physical press proof.**

## Authentic print-shop methods: the rules genuinely disagree

1. [Risolve Studio, File Set Up](https://risolvestudio.com/pages/file-set-up): requests 300–600 PPI PDF with spot colors separated, accepts named grayscale separations, instructs users **not to include crop marks** or flatten PDF layers. This supports marks disabled by default and distinct independently named masters.
2. [RISOTTO Studio, Basic Print Setup](https://risottostudio.com/pages/basic-print-setup): typically uses 300 DPI grayscale PDFs, one file per physical spot color, A3 physical sheet and 10 mm border. Full-bleed trim/mark policy differs even across its own diagrams. Its A3 printable limits do not apply to all printers.
3. [RISOTTO Studio, Advanced Print Setup](https://risottostudio.com/pages/advanced-print-setup): grayscale density is physically translated into each chosen color. Large K100 fields may deposit too much ink; tonal values and edge fineness need test prints. Native vectors keep the actual line geometry whereas raster JPEG makes fine details jagged.
4. [SAIC Service Bureau, Risography Printing](https://sites.saic.edu/servicebureau/home/services/risography-printing/): requires separate grayscale/B&W PDF files, normally 300 DPI, with print size/ink profile linked to their own operational constraints.
5. [Risolana, Printing](https://www.risolana.org/printing): a separate grayscale image per ink, where black percentage controls spot ink; paper grain and margins are material not digital RGB simulation.
6. RISO68's original standalone vector master, source ArtCraft research in docs/research/riso68-grayscale-print-separation-artcraft.md, and RISO67's independently reviewed geometry topology gate are the **actual source artworks** here, not traced or copied third-party images.

### Five-axis deconstruction / decisions

**Topology:** For each of the two original independent RISO66/RISO68 pressure-loaded ink masters, exactly one black/gray physical source file is emitted. The source outerPath and *each* original closed dryPaths remain independent winding contours on the same drum. PDF converts source SVG Q to the **exact equivalent cubic Bézier** (one cubic per source Q, never a polyline approximation), closes each original subpath and fills once with the PDF evenodd path operator \`f*\`. This means the paper-white openings retain their source topology and physical master identity; no morphology, RGB screenshot, blur, anti-aliased layer screenshot or dissolved paper channel.

**Vector flow:** Both PDFs have identical physical page size, uniform source-to-trim matrix and identical selectable crop/register lines. Source curve conversion is deterministic. Digital colored RISO1 registration drift and per-layer RGB opacity are *never* embedded in either grayscale file. Unsupported SVG commands are rejected, never approximated silently.

**Edge and tactile detail:** The 81 native station pressure ribbon, source edge grain, independently generated long dry fibers, transient slit micropores, plus six tiny independent filaments remain exact vector in the PDF. The TIFF is an **explicit 300/600 PPI rasterization** of that exact source grayscale SVG via a white-backed browser canvas; it necessarily quantizes subpixel holes/edge fraying. This is disclosed, not misrepresented as lossless vector print fidelity. Fine bristle openings should be compared against the native vector/physical press output.

**Material and color:** The physical PDF operates exclusively in PDF DeviceGray (0 is K100 black, .22 is K78), with a white sheet, no DeviceRGB/Image/SMask/Font. The TIFF is **real TIFF 6.0, uncompressed Baseline, one sample/pixel, BitsPerSample 8, Compression 1, Photometric BlackIsZero, PlanarConfiguration chunky, exact XResolution/YResolution rational 300 or 600, unit inches**. Never rename PNG to TIFF. All source colors in file names are metadata, never in the file channels. The pixel dimensions are round(sheetMm / 25.4 * PPI) with at most 0.5px physical rounding; actual paper/feeder margin remains independently declared.

**Temporal:** Pure PDF/TIFF bytes are deterministic for source frame 0..239, seed and geometry; source frame rewind reproduces identical master. DPI changes TIFF sampling only; crop and register marks remain fixed in millimeter paper space.

### API and implementation

- \`registry/video/riso-press-pdf.ts\`: \`risoSvgPathToPdfOperators\` exact M/L/H/V/Q/C/Z-to-PDF path translation; \`serializeRisoSeparationPdf\` one preflighted independent DeviceGray vector PDF 1.4 with proper PDF xref stream lengths and physical MediaBox.
- \`registry/video/riso-press-tiff.ts\`: \`measureRisoTiffRaster\` bounded 300 or 600 PPI / 40M pixels; \`encodeRisoGrayscaleTiff\` dependency-free TIFF 6.0 14 proper IFD tags and rational DPI. **Pure** and unit-testable, no browser needed.
- \`registry/video/riso-press-raster.ts\`: opt-in browser-only adapter loads the original validated K-only SVG in a canvas, confirms no RGB channels, samples exact DPI, and encodes the genuine grayscale TIFF. Not an RGB composite renderer.
- \`src/video/riso-press-delivery-studio.tsx\`: new interactive Storybook in the SAME Risograph section, two exact original independently rendered grayscale native masters, output ratio, absolute frame/seed, grayscale density, mark/bleed/safe/printable policy, PDF/TIFF selection, 300/600 PPI and 1×/2× macro, two actual browser download buttons.
- Consumer install \`riso-print\` includes three new modules and has NO new NPM dependency.
- Tests: SVG exact Q→cubic semantics (including relative commands); actual PDF one-page MediaBox/xref/DeviceGray/f* and marked registration; no RGB/other master; TIFF IFD/strip offsets, physical pixel size, BlackIsZero, 300/600 resolution; invalid path/unsafe page rejection; Storybook; browser file download; independent Poppler \`pdfinfo\` and \`pdftoppm\` render; inspect actual 1×/2× browser captures in two aspect ratios.

### Caveats and next priorities

1. The PDF is genuinely all-vector and monochrome and TIFF is genuinely single-channel grayscale, but there is NO CMYK/ICC press profile; these are independent original ink source files, not universally certified PDF/X or "camera-ready" proof. Some shops require vendor-generated TIFF separations or particular raster encoding.
2. The PDF currently supports actual source M/L/H/V/Q/C/Z curves only. It fails closed for elliptical arcs and smooth/reflected SVG commands until exact conversion and independent proof are implemented. This must not be misrepresented as a universal SVG-to-PDF converter.
3. TIFF at 300/600 PPI has an explicit 40-million-pixel safety ceiling. At print DPI, minuscule native paper holes may disappear; compare 300 vs 600 against vector master and actual paper. 600 PPI A4 is ~35 MP and demands significantly more memory.
4. Print shops conflict on flattening, bleed and crop marks; exact policy must be confirmed by the shop. The supplied centered A4 16:9/9:16 demo dimensions are not universal equipment settings.
5. Production claim needs printed proof: scan/photo of each press-separated and overprinted stock, measured feeding drift/registration at multiple positions, material/ink calibration and actual paper texture. Human-hand PR #513 remains untouched.
