# RISO61 — variable-density spot-ink gradients / original tidal field

**Status:** non-human ArtCraft material and animated two-master showcase. This does not change any human hand, face or character. Rendering is distinct from final physical-print acceptance.

## Authentic reference and topology

- [RISOTTO Studio, print settings and FAQ](https://risottostudio.com/pages/printing-faq): the physical press creates actual AM screen dots and grain-touch dither, not an RGB soft gradient. Very light 0–10% tones can drop out. 43, 71 and 106 screen settings differ in size/density and stepping.
- [University of Illinois Risograph Print Guide, Halftoning and Trapping](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): every physical color master has its own angle, frequency and registration; evaluate inked-to-paper boundaries per plate.
- [Outlet PDX, What is a Riso? close-up](https://www.outletpdx.com/riso): micrograph shows separate variable-area ink deposits and visible absorbent paper. External reference only.
- [No Gloss, What is Riso? screen detail](https://nogloss.ca/pages/what-is-riso): multiple independent halftone fields overlap into further colors; never pre-mix as one RGB image. External reference only.
- [University of Utah Marriott Library Riso instructions](https://lib.utah.edu/collections/book-arts/risograph.php): feed/registration vary, and large solids benefit from screened coverage.
- [Existing Kumiki RISO20/RISO26](../../registry/video/riso-screening.ts) and [RisoPrint](../../registry/video/print-plates-react.tsx): retain original paper fibers, tooth, ink multiplication, time-coded reveal and separate plate/source identity.

**Topological flow:** independent cobalt and vermilion stencil originals. Cobalt has one asymmetric four-cubic tidal ellipse, 16 wave contours with varied width, five independent perimeter rings, a continuously graded lower breaker and fine press targets. Vermilion has its own shifted four-cubic glow, 11 separately flowing interference contours and 23 micro-marker dots. The source curves retain their variable geometry and do not collapse into generic circles or opaque rectangles.

**Material edges:** individual ink discs are built from two true elliptical SVG arcs, with a distinct radius evaluated at every sheet-anchored screen site. The screen angle is independent per pigment. Slight deterministic paper-locked pickup irregularity, unprinted white between dots, overprint intersection, bounded gain and physical stock dropout remain independent of RisoPrint fiber texture and film motion. All artwork is original procedural SVG. No copied reference pixels are distributed.

## Component contract

Registry item: **riso-print**. Additional public exports:

- createRisoGradientGeometry(options): pure source-space variable-density AM dot master for x, y, width, height, cell, angle, seed, plateIndex, direction, stops, optional dotGain, irregularity, dropout. Horizontal/vertical/radial gradients. Two to twelve continuously interpolated value stops.
- risoGradientCoverage(stops, t): evaluate and clamp a nominal coverage within the supplied source knots.
- risoGradientDotPath(dots): a single efficient SVG path with two arcs per independent dot, keeping fine-scale native vector geometry.
- RisoGradientInk: clip those editable ink dots to an optional original source contour. Use it INSIDE the matching RisoPrint artwork callback and pass the current plate's paint.solid color.

Color must be a six-digit physical spot hex, not a CSS gradient or RGB mix. All geometry, screen pitch (2..36), angle, seed, coverage and irregularity controls are bounded. A 40,000-grid-site cap prevents pathological DOM generation: larger images are split into individual intentional bounded regions, not flattened or secretly downsampled. Optional coverage dropout 0–20% is a stock hypothesis, not a measured press profile. Radius changes do not move individual paper positions. RisoPrint continues to own registration, plate order, subtractive-looking multiply overprint, and physical fiber grain.

## Storybook and film acceptance

Same sidebar folder: **Video production → Film Looks → Risograph → Continuous Spot-Ink Gradient**. A two-master animated tidal atlas offers landscape 16:9 and portrait 9:16, physical cobalt/red/both ink separations, full 0–239-frame absolute seek, radial/horizontal/vertical gradient direction, gain, pickup irregularity, dropout, paper grain, independent registration and seed, moving versus frozen original source water contours.

The wave source strokes are computed solely from the absolute chosen frame; no independent clock or transient pseudo-randomness. Ink dots do not drift when source water moves, the frame seeks backward, or the artwork is redrawn. The physical press reveal is owned by the existing RisoPrint component.

Verification goals: more than 60 visibly different source radii across continuous stops, reversed/radial profiles, exact site stability under gain edits, explicit invalid input rejection and geometric limits, SVG clip-ID uniqueness, and real two-plate markup. Chromium Storybook must show two output aspects, true separated masters, reversible sliders, still/animated original geometry, reverse frame seek, and native screenshots.

**Limits:** This is a digital, non-calibrated print-material construction. Neither CI nor screenshots prove exact press density, ink absorption, screen frequency calibration, color gamut, trapping accuracy or credible physical output on every stock. Inspect reference close-ups at 1× and macro and verify a real test print before claiming authentic press parity. No new dependency or redistributed reference photo/film/font.
