# RISO73 — Physical second-copy image deconstruction and print-repeatability ArtCraft

**State:** new observer-only inspection instrument; PRINT / VISUAL ART HOLD until two independently acquired scans of genuine multi-ink Risograph copies are reviewed by a human artist. A software test with two screenshots is NOT independent press evidence.

## Reference-based **image** observations

1. [PicoN! Japanese Risograph close-up](https://picon.fun/design/20230721risograph/) — [source photograph of actual printed ink](https://picon.fun/wp-content/uploads/2023/07/%E3%83%88%E3%83%AA%E3%83%9F%E3%83%B3%E3%82%B0%E8%AA%BF%E6%95%B4DSC03598.jpg): spatially offset yellow/navy center rings, magenta halftone-dot field, mixed purple and green contact, and visibly exposed paper. These are distinct **physical print phenomena**, not a single Gaussian-grain filter.
2. [Nogloss RISO printed ink overlap](https://nogloss.ca/pages/what-is-riso) — photograph shows dense magenta/blue screened shapes with strongly patterned mixed-ink density. Changing two-color relative register changes the apparent local overprint shape while neither independent ink stencil needs to change.
3. [DRUK print close-up](https://www.druk.london/gallery) — transparent light-blue fields, dilute fine pink lines, cross-hatched magenta dot screen and pale shared substrate; soft color density does not imply flattened source silhouette.
4. [MICA risograph two-color process guide](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/) — registration changes naturally across consecutive stencil passes; repeat printing makes it possible to distinguish a source problem from a feeder/press variation.
5. [Dizzy Ink actual-print imperfections](https://www.risograph.co.uk/08-imperfections), [Moniker Press proof/print guide](https://www.monikerpress.ca/printing/) — paper grip and extra feed passes can produce shift, marks, uneven ink, or paper-dependent distortion. A single paper/photo comparison is insufficient to attribute these to a source geometry change.

All third-party photos are **links only**. None is bundled, cropped into a fixture, rasterized into code, traced, or redistributed. No local printer profiles, ICC calibration or hardware registration tolerances are claimed. No art assets were altered.

## Medium-specific reference deconstruction

| Axis | Authentic medium observation | Implementation decision |
| --- | --- | --- |
| Topology / independent source masks | The paper-negative stipple, holes and clean white cutouts remain important in every spot pass. | Preserve original K-only native SVG paths and physical per-drum PDFs/TIFF. Compare physical photographs side-by-side without changing source masks. |
| Vector flow | Each dark stroke/edge is directional and has its own dry-brush contour across print copies. | Do not run contours or alignment through optical filters; annotate paper corners, not strokes. |
| Edges and misregistration | Two copies can show different relative plate drift while preserving exact original drawing. | Compute copy-2 minus copy-1 physical cross shifts for each of the eight independent ink crosses; separately compute *change in* red-vs-blue register. |
| Layering | Spot inks overprint to new tones and dot overlap; RGB scanned photo cannot be equated to an individual grayscale press stencil. | Compare two original full-color scan images, not an RGB recolored K-only master. Include pan and 1×, 2×, 3× zoom; honest overlays. |
| Material / scale | Paper fibres, texture and halftone cell spacing are true optical detail and require a source scan with sufficient PPI. | Preserve natural original raster pixels through browser SVG photo transformation; no denoise/blur/sharpen/depth-faking. Use a common **real sheet-mm** grid. |

## Physical evidence protocol

- Print at least two separate genuine sheets from the same original grayscale spot-ink masters, unchanged design/frame/trim and configured press.
- Digitize each sheet with independent flat photos/scans, avoiding perspective, paper wrinkles, clipping and inconsistent light. Files must be operator-owned and consented for use.
- Choose *Operator-entered actual scanned pixels* in the RISO70 physical inspector; upload sheet 1 through the original RISO71 annotator. Mark four physical paper corners, then four cross centers **on each drum**.
- Enable **Inspect another physical print copy**. Upload an independent sheet-2 image and annotate another twelve points; never reuse sheet-1 scanner pixel coordinates.
- Each page is transformed using **only its own PAPER corners** (RISO72). The independent fourth corner has a strict 0.5 mm default residual budget; folded/mirrored/degenerate/strong-perspective scans fail closed.
- Every scanned photo retains its native pixel resolution, its own paper-to-scan affine, and its own two drum observations. The two images align **only** through paper millimeters, never by matching ink edges.
- View paired 1×, overlay at 3×, pan both with the same paper-space camera, choose second-only, and disable/or enable vector marks. The purple/blue and red cross vectors must represent actual operator measurements; no inference from color segments is performed.
- Inspect separately: (a) shift of each drum across two sheets; (b) the *change in inter-drum relative register* (which rejects common paper translation); (c) fine original paper gaps and halftone/ink pooling at every print-copy overlay. Choose an explicit repeatability budget; it is NOT a manufacturer approval.
- A scan with twelve points but unknown press/copy provenance remains **operator-entered, unverified**. Report numbers are relative to that operator input; they don't certify a physical machine. No photo persists to cloud; only the active browser page has the blob URLs.

## RISO73 UI and test contract

**Public internal composition:** `Riso73TwoCopyPrintStudy` accepts two independently uploaded local photos, two independent 12-point `RisoScanMeasurements`, original physical sheet millimeters, two original press-order plate IDs and immutable nominal source registration targets. It is an optional native Storybook/print-shop panel, NOT a new registry install item. The component does not modify source SVGs. There are no new runtime dependencies.

**States:** second scan hidden by default; first complete; second upload incomplete; two complete; paper geometry error; measured within operator budget; measured outside budget; paired/overlay/first/second; 1×/2×/3× with normalized paper-space pan; marks visible/hidden; remove second and restore first inspector. Buttons, ranges and selects use native keyboard controls; invalid scan evidence is explicitly labeled and blocked.

**Deterministic tests:** two different photo image sizes, two affine rotations/scales, independent physical pass offsets, numeric true copy delta, true change of inter-drum error, user-declared budget violation, non-real `synthetic` provenance rejection, missing/crossed/out-of-frame marks, non-affine BR residual, SSR two photo images/eight physical vectors per print. Browser runs upload two screenshots **of the same original vector** and manually enter deliberately different simulated numbers to validate UI and measured displacement calculations. The browser fixture is NEVER presented as a real printed image or a press observation. Screenshots at real Storybook 1×/3× show geometry and layering only.

**Independent human art acceptance outstanding:** Acquire at least two true physical prints and their unaltered original photographs, visually inspect 1×/3× fine dot topology, ghost outlines, density pooling, paper exposure, actual drum overlap and copy-to-copy changes with source reference. Record optical paper/ink differences, not merely marker-only metrics. Press shop approval and physical art quality remain **ART HOLD** regardless of green TypeScript/CI. Unapproved human-hand artwork remains unchanged, separate and quarantined.
