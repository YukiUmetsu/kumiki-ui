# RISO66 — source-native shared-edge ink trap with dry-fibre preservation

**Status:** digital, experimental, original source-native stencil artwork. Human hands and anatomy are out of scope. Passing tests cannot certify arbitrary contour topology, a calibrated press profile, actual ink diffusion, or print-shop ready registration.

## Authentic source and five-axis deconstruction

1. [College for Creative Studies, Registration & Trapping](https://campus.collegeforcreativestudies.edu/imaging-center/2021/06/22/registration-trapping/): adjacent spot areas should slightly overlap under expected register drift, rather than leaving paper-white seams. Registered cross and overprinted silhouettes are distinct from just post-blurring a composite.
2. [Risolana, Printing](https://www.risolana.org/printing): one stencil per color, broad flat spot inks, paper grain and nonidentical registration. Enlarging a selected positive solid is not the same as applying a blanket RGB raster filter.
3. [Cecilie Press, Risograph Printing](https://www.ceciliepress.com/risograph-printing): real multi-pass misalignment cannot be eliminated entirely; different sheet regions can behave differently. No machine tolerance is inferred from a digital design-pixel budget.
4. [Ora Labora photographed red/blue print](https://oralaborastudio.es/risografia/): local irregular offset reveals paper at misregistered contours; the overlapped intersection forms a separate dark appearance. The printed illustration is observed only as a reference, never traced or imported.
5. [Système Sensible press-detail photographs](https://www.systemesensible.fr/imprimerie_riso.html): filament-scale substrate exposure and rough pressure contours, not a uniform crisp stroked border. No external pixels, designs or textures ship.

**Topological continuity:** The base first plate is an authored closed pressure ribbon. Its *existing exact* outer polygon, centerline, variable sampled pressure, 30+ source stations, 50+ internal dry-bristle slots/pores and independent original second plate form the material contract. The new edge algorithm moves only continuously qualifying first-master **exterior** points; it passes all original interior `dryPaths` by reference, so it never deletes a sliver, redraws a pore or fills a hole with an opaque external band. All source paths, opposite edge samples and strand IDs remain untouched when this opt-in trap is disabled.

**Vector flow:** An 81-sample cubic follows authored control handles, precise local pressure and an absolute frame. For each original edge station, compare **both** second-stencil outer sides. Qualify only positive forward gaps (<=12 source pixels), opposite normals (dot <= -0.74), near-parallel moving tangents (absolute dot >= .88), and sustained runs of >=5 stations. Isolated crossings and point contacts are never treated as shared edges. Smooth the qualifying run's first/last three stations to zero extension; leave all other named stations exactly original.

**Edge specificity:** Both original waves of seed-bound edge grain are reused. A bounded exterior bridge (<=12 px) extends *the source-positive silhouette itself*, not an overpaint shape; the same source-native evenodd geometry still subtracts all existing paper-white openings. Print red plate retains its own offset and complex dye intersection. No global dilation, SVG morphology, glow, blur, rasterization, RGB ghosting, made-up physical ink-flow, or silent gradient flattening.

**Depth and material:** Reuse the exact RISO1 two separate masked spot passes, paper fibers (450), pores (330), separate screen patterns and multiply-style overprint. Contact is computed in original paper coordinates, *before* the red physical registration displacement. Screen/stock remains fixed to paper even if source frame changes. This is digital provenance, not a spectrophotometric press calibration.

**Temporal:** `createRisoContactTrap` is pure, stateless and independent of clocks. The two authored streams and original counter-motion depend solely on requested frame 0..239 and seed. Seeking backward reconstructs the same geometry, including the same holes. Keep the original RISO64/RISO65 film output unchanged unless a caller explicitly opts in.

## Implementation and review

- Existing `createRisoBrushGeometry` now exposes original `edgePositive` / `edgeNegative` stations and the unchanged original `risoBrushClosedPath` helper. It **does not change** the existing outer path or other return values.
- `createRisoContactTrap` receives two original geometries and explicit side/gap/extension/overlap/minimum-run. Returns a copy of the selected first-plate geometry with one locally updated outer contour and the **same** `dryPaths`, centerline, pressure widths, opposite edge. Zero extension returns the original object unchanged.
- Registry item `riso-print` includes the new helper for clean independent consumer install. No added package dependency.
- Storybook `Risograph · Native Shared-Edge Trapping` uses fresh original 2-color source art with six additional independent pressure-loaded bristle accents, paper texture and print typography, not the old 20-stroke editorial film simplified or silently overwritten. Compare exact A/B on both output ratios, physical master isolation, 1×/3× live-native views, bounded ink gap, extension, overprint, grain, registration, seed and absolute source time.
- Vitest catches topology drift, byte-identical zero-trap, absence of remote-geometry/point-contact trapping, nonsequential seek, malformed input and 16:9/9:16 original-path preservation. Playwright captures actual browser PNGs for independent art audit.

## Known limits and remaining priorities

1. Supported ribbons are smooth source-native pressure curves. This is **not a generalized polygon Boolean solver** and does not assert topological safety against *all* arbitrary self-crossing, concave or closely packed external silhouettes. For extreme geometries reject or require independent visual/manual contour review.
2. Zero visible paper seam is not guaranteed: computed nominal contact and actual press registration differ; trapping width, ink-screen holes, opacity and real feed drift require print-shop proofing. The numeric allowance must never be called measured tolerance.
3. Review actual 1× and 3× native artifacts for physically meaningful extension vs unacceptable excess overprint. Compare at two seeds and at least three absolute frames; CI does not replace actual art signoff.
4. Next: robust closed-path contact manifold with self-intersection diagnostics, optional gap topology audit, and print-shop-ready separated grayscale master export with trim/bleed marks. **Keep human-hand PR #513 untouched.**
