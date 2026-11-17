# RISO68 — physical grayscale master export, true source topology, bounded trim/bleed

**Status:** original source-native grayscale vector print study. Produced SVG is a real isolated K-only master, NOT a printer-approved PDF, real measured paper profile, press-specific acceptance claim or a substitute for a physical proof. No people, faces, human anatomy or hands.

## Authentic reference / five-axis ArtCraft deconstruction

1. RISOTTO Studio, Basic print setup: https://risottostudio.com/pages/basic-print-setup and Advanced print setup: https://risottostudio.com/pages/advanced-print-setup. Their physical crop and bleed diagrams explain why marks are offset beyond actual trim and why an ink silhouette needs extra material beyond a cut. We study the technique but reproduce none of their artwork or photos.
2. Risolve Studio, File setup: https://risolvestudio.com/pages/file-set-up. This printer explicitly says NOT to include crop marks, requests separately labeled ink files and often PDF at 300–600 PPI. This conflicts with assuming crop marks on every master, so RISO68 makes the mark policy explicit; default none. SVG is not PDF.
3. Inkling Studio, Risograph print guide: https://theinkling.studio/pages/print-guide. Explicit single-ink grayscale stencils, sheet margins and bleed. Inkling's stated physical printable area applies to their own equipment only, not all Riso machines.
4. MICA, Risograph file preparation: https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/. A separate grayscale source per spot ink, black percentage controls deposit density, registration varies.
5. Original RISO62/RISO66 source art, docs/research/riso66-native-contact-trap-artcraft.md, and the independently reviewed RISO67 browser proofs. Keep their exact pressure control flow, uneven ink edge and hundreds of paper-white holes. Existing source art is authored inside this repository; no third-party artwork, font, scan or texture is imported.

**Topological continuity.** Two independent original positive-ink cubic pressure ribbons and six original thin bristle accents still come from the same RISO66 source drawing. The RISO67 geometric guard is opt-in on the blue material contact and the red master stays independent. Each source ribbon carries its original positive outer path plus ALL its independent white substrate openings inside a single evenodd path. No rasterized rendering, simplified cubic, extra path smoothing, fake white-paint overlay, lost dot or discarded fibre is permitted.

**Vector flow.** Each physical grayscale master gets precisely its own source coordinates. The same uniform source-to-millimeter scale and trim translation apply to both masters. The nominal digital RGB color-proof misregistration vector must never be baked into a physical separation; this would make accurate real press registration impossible.

**Edge material.** Original irregular pickup edges, tiny open bristles, fibre slits and paper pores survive at 1x and 2x native SVG. Pure grayscale is a source density K fraction: 100% K is #000000; K50 is #808080; K80 is #333333. The paper is white, each silhouette uses fill-rule evenodd, no filter or RGB compositing, and no fonts that depend on operator machine availability. Digital source spot RGB values appear only in downloadable file names to distinguish intended ink.

**Measured sheet and printer allowance.** Physical geometry is in millimeters, not in video design pixels or raster DPI. Example A4 landscape sheet 297 x 210 mm has centered 240 x 135 mm trim (16:9). Example A4 portrait 210 x 297 mm has 135 x 240 mm trim (9:16). These are explicit study profiles, NOT a universal risograph machine's printable area. All designs have a declared safe inset inside trim, bleed outside trim and printable inset inside sheet. Crops are 8 independent lines, optional registration crosses add 8 more, and every line must remain inside the declared printable margin.

**Depth and paper.** Every print master contains a full white page and its own grayscale stencil only. The digital print preview's colored ink, paper-grain RGB, multiply blending, screen patterns and registration jitter are not baked into the physical file. Dryness is represented by actual unprinted native cutout geometry.

**Temporal.** Each original source drawing accepts an absolute 0..239 frame and a deterministic integer seed. Seeking back to a previous frame yields identical vector paths and ink marks. The paper trim and crop marks do not drift between frames.

## Implementation / API / visual gates

- registry/video/riso-separation-master.ts: inspectRisoSeparation(spec,plates,layout), serializeRisoSeparationMaster(spec,plates,layout,plateId), grayscaleForRisoDensity, risoSeparationFilename. One to three independent named grayscale spot masters are supported.
- Authored paths must be closed original positive-ink SVG contours. Every dry-fibre hole is an independent closed winding curve. The parser rejects unknown SVG commands and XML/script injection; no raster images or foreignObjects are admitted.
- Output is a standalone XML SVG with measured physical millimeter width, height and viewBox; every native positive ink shape remains a physically editable path with its original white holes. Distinct grayscale K levels intentionally encode stencil density, not a simulated RGB overprint.
- Preflight refuses export on sheet/trim distortion, missing masters, duplicated IDs, invalid shapes, changed critical content margins, unprintable bleed or impossible crop marks. The report is explicit rather than silently clipping ink.
- Storybook, Video production/Film Looks/Risograph / Native Grayscale Master Separation, exposes two complete original vector print masters, ratio, frame, source seed, K density, optional ink-color reference proof, printable inset, safe inset, physical bleed, crop/registration policy, native 1x/2x and two actual browser download buttons.
- Browser tests download and inspect actual distinct SVG files. Independent screenshots of 16:9 and 9:16, 1x/2x, are necessary before merge. Test color-channel isolation, exact dry holes, no RGB proof fields, identical physical marks, invalid press geometry blocking exports and backwards seeks.

## Critical limitations

1. This creates editable self-contained vector SVG. Actual print shops often require grayscale PDF/TIFF and may rasterize or impose their own density and DPI. No claim that these files are directly accepted by every press operator; convert and test per vendor.
2. Different shops disagree about crop marks, paper-feed leading edge, print margins and bleed policy. Leave marks off unless your particular shop explicitly requires them.
3. No automatic RGB photo separation, text-to-outline font conversion, press-specific dot screen calibration, print shop color-management or physical roller/feed tolerances.
4. A bounded geometric safe margin cannot guarantee physical lack of smearing, registration error or unexpected ink spread. Physical trial and operator approval are still required.
5. Next priorities: shop-specific profile contracts, actual grayscale PDF/TIFF output and a verified original-material print proof.
