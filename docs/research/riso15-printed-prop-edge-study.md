# RISO15 — reference-led printed ephemera in two-human performance

**ArtCraft study (2026-11-15).** This work extends the existing RISO14 two-human animation and spot-ink print pipeline, rather than resurrecting PR #165's older, superseded character renderer. The current production system already includes original articulated figures, IK, paper-backed contour clearances and separate ink masters.

## Authentic process and illustration references

- [MICA — Risograph file preparation](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/printmaking-studio/risograph-file-prep/): independently prepared ink separations, overprinting and knockout.
- [Illinois — Risograph printing guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): press registration and paper/ink interaction.
- [Uma Joana — Let's Look at the Trailer II](https://ogaleria.com/products/lets-look-at-the-trailer-ii-by-uma-joana): asymmetric figure rhythm and bold plate-oriented ink.
- [Mina Braun print showcase](https://peopleofprint.com/best-of/pop-member-showcase-21-riso-prints/): expressive limited-color linework.
- [Natalie Andrewson risograph prints](https://www.natalieandrewson.com/products/6-makers-series-risograph-prints): tactile printed micro-elements and controlled density.

References inform medium behavior, not copied/traced silhouette coordinates. All SVG paths are original; no third-party assets are bundled.

## Five-axis ArtCraft deconstruction

| Axis | Visual evidence/production constraint | Code geometry | Regression rejection |
| --- | --- | --- | --- |
| Topological continuity | The letter must physically connect two hand contacts, not float above the frame | Existing independently evaluated world-space hand anchors drive the paper's outline, inset, all marks and paper knockout | Endpoints disconnect or actor ink becomes translucent |
| Vector flow | Interior ruling and fold track the direction of the passed sheet | Orthonormal basis along source→recipient vector, with parametric curves and creases | Detail stays screen-aligned when hand heights diverge |
| Edge / pressure | Fine tapered accents against strong shape boundaries | 2.1px outer contour, 0.95px inset, 0.85px ruling, 0.75px fold, stronger asymmetric seal | All details become wide uniform strokes |
| Rhythm | Address rules, seam marks and postmark should be organized, not random noise | 3 slightly irregular curved lines; intermittent hatches; off-center cancellation stamp | Equal-length repeating vector strokes cover the paper |
| Microtexture/depth | Two inks must be separate printable masters on opaque paper | Existing press halftone, registration and paper pores; blue outline, red stamp/facets; deterministic geometry; zero actor opacity changes | Global RGB halftone, crawling grain or transparent characters |

## Interactive and verification contract

`evaluateRisoTransferSheet` validates finite bounded source/endpoint and progress, yields no marks before prop deployment or when too small, and returns deterministic original curves. `RisoTransferSheetPlate` renders each plate separately using `RisoPaint` and optional detail state. Storybook's **existing** Risograph ArtCraft human ensemble story gets the detail checkbox; ink separation, portrait/landscape and frame scrubbing remain available, plus responsive stage sizing.

Focused unit tests assert geometry, negative inputs, frame-order invariance, opaque spots and independent blue/red DOM. Existing Playwright dual-aspect screen captures now check the detail toggle and plate isolation. Production footage and human visual approval are **not** inferred from those tests.

## Remaining production priorities

1. Correct true finger–paper grasp compression and foreground occlusion, with IK-projected contact and no silhouette crossings.
2. Individually authored front, 3/4 and profile faces and hands; improve anatomical character identities without shape simplification.
3. Quantitatively calibrate halftone dot gain, paper tooth and registration from legally sourced physical print scans.
4. Deliver a story-driven 30–60-second multi-character short with matching foley/music, deliberate camera grammar and independently inspected 16:9 / 9:16 output.
