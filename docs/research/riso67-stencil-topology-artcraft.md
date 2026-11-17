# RISO67 — fail-closed native stencil contour topology ArtCraft

**Scope:** two authored physical ink masters, original cubic pressure ribbons, exact quadratic native SVG ink and paper-open paths. **Non-human.** The new optional guard examines an already proposed local trap and declines to render it when sampled topology creates new defects. No source artwork is simplified, re-sampled for drawing, replaced with raster, or silently white-overpainted.

## Authentic sources and five-axis ArtCraft reasoning

- College for Creative Studies, [Registration & Trapping](https://campus.collegeforcreativestudies.edu/imaging-center/2021/06/22/registration-trapping/): second color passes physically drift, leaving unprinted white seams; deliberately overlapping adjacent physical shapes reduces risk but cannot guarantee zero registration error.
- University of Illinois, [Riso Print Guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): printed registration marks and intentional overprint vs knockout are separate practices. Independent vector master silhouettes are required, not a flattened RGB/postprocessing grade.
- Ora Labora, [photographed red/blue Risograph print](https://oralaborastudio.es/risografia/): overprinting creates dense ink intersections with visible imperfect edges, while tiny paper-white openings are materially significant. Reference observed but artwork not traced or bundled.
- PicoN!, [risograph print detail](https://picon.fun/design/20230721risograph/): fine dots, ragged ink edges and misregistration can coexist. Outer material-contour motion cannot be allowed to delete internal source cutouts.
- Risolana, [Printing](https://www.risolana.org/printing): registration/trapping affects material boundaries, not the entire image. Print methods vary and calibration is printer-specific.

**Topology:** RISO66 pressure source has 81 original base stations, two independently sampled exterior edges, plus every individual dry-fibre and micropore winding path. RISO67 scans the *same actual SVG `Q` contour geometry* with existing audited `flattenRisoSvgPath` (adaptive chord flatness .1..1.5 px, default .35). Source path serialization, station count, pressure widths and internal closed white-paper shapes remain unchanged. A new crossing of nonadjacent outer edges, a new outer-to-hole boundary contact, a paper hole newly outside the solid silhouette, vanished source contour, changed winding or mismatched paper-hole identity declines the trap completely. Original imperfect baseline cutouts are reported separately; **a differential pass does not certify the baseline flawless**.

**Vector flow:** The first master follows the same exact cubic dynamics as RISO66. The optional source-space extension is proposed once, audited against independent original geometry, and either accepted whole or dropped whole. No aliasing from rendered pixels or accumulation of animation time. Unchanged/safe/rejected states use the same current source frame and same master seed.

**Edge:** The original dry-brush sawtooth edge pickups, tiny tapered fibre channels, paper pores, and secondary six accents still render at 1×/3×. The auditor is read-only and must not mutate or normalize the source. The separate original red master remains free of the blue source's optional trap and keeps its own original screen.

**Material, depth and time:** Preserve independent spot-ink overprint, 450 paper fibers/330 pores in RISO1, source-based grain, and exact evenodd knockout. Four native Chromium A/B screenshots (landscape/portrait, 1×/3×), source frame rewind and deliberately broken test specimen are needed. Stress mode must never pass the intentionally damaged candidate to the actual press renderer.

## Implementation and release constraints

- Public `auditRisoTrapTopology(original,candidate,flatness)` and `createGuardedRisoContactTrap(base,neighbor,opts,flatness)` live in `registry/video/riso-stencil-topology.ts`.
- Reuses existing `registry/video/riso-path-geometry.ts` adaptive SVG flattening, available to clean `riso-print` registry consumers. No new dependency.
- Every newly introduced crossing or damaged paper hole returns `accepted:false`, `reason:"new-topology-defect"`, and the **original complete geometric source**. Consumers may display the diagnostic but must never silently print the unsafe candidate.
- Existing RISO66 and RISO65 default outputs remain byte-identical unless `topologyGuard`/the exported function is expressly used.
- New Storybook `Risograph · Native Stencil Topology Guard` retains all rich original two-spot art, aspect/frame/seed, ink isolation, paper grain, 1×/3× and bounded trapping. An optional explicit inspector challenge disturbs a *test-only* sampled curve; no invalid geometry reaches the displayed print.

### Limits

This is a sampling-based **differential** safety gate, not an exact algebraic quadratic-intersection solver or generic polygon Boolean engine. It cannot prove every subpixel knot, spectral press interaction, hidden baseline flaw or actual printer tolerance. Comparisons count intersections at the specified chord tolerance; optical inspection and physical print tests remain separate mandatory release gates for print-shop use. Numerical clipping and geometry beyond source-native smooth ribbons are not certified. Next: separated per-master grayscale exports, trim/bleed marks and printer-specific calibration, with exact dimensions and independent reproduction QA.
