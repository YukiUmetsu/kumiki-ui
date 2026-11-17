# RISO77 ArtCraft: original Risograph cutout rostrum animation

## Image-based source study: paper is a moving object, not an overlay

**Original physical evidence and important distinction:** The Riso printed and cut animation practices below establish *material-specific* visual traits (tonal instability, irregular cut edges, dimensional lifted layers and print-to-print flicker). This component **does not claim to reproduce actual press measurements**, and no licensed source photo/video is copied or redistributed.

| Independent image/video source | Topological continuity, ink flow, edge scale, depth, and motion observation |
| --- | --- |
| [Hiromu Oka, FUJIFILM CLAY — Risograph](https://www.behance.net/gallery/146765113/FUJIFILM-CLAY-Risograph-feat-Hiromu-Oka), [original uploaded moving film](https://vimeo.com/722274566), [making-of interview](https://www.itsnicethat.com/articles/hiromu-oka-hodo-station-process-animation-051222) | Actual Risograph prints and scans used as source frames. What remains visually convincing is recurring printed color and paper-origin contours; the original stencil is not a blur of a digital hero asset. This inspires real artwork-per-piece and time-quantized paper motion, **not** arbitrary per-frame regenerated random noise. |
| [SPOTS, hand-printed four-color Riso film](https://vimeo.com/1234898709) | Artist describes 115 original frames printed on three sheets, cut and digitally reassembled. Color shifts, texture and misregistration come from *individual physical impressions*. Our compositor retains independent source colors and deliberate repeatable paper motion, but cannot assert physical frame-to-frame variation without source scans. |
| [Happyland pop-up Risograph zine, Wuthipol](https://www.wuthipoldesigns.com/photobooks/happyland), [physical layered photo](https://images.squarespace-cdn.com/content/v1/54bfaa62e4b0425035282cfb/1715264989168-Y11JL87NWVVG3KC12UE7/HL_03.jpg) | Physically folded cut-out city rises visibly from the page: each separately printed surface has thickness; angled paper portions cast a discrete shadow onto the paper underneath. A flat translation with an unrelated blurred UI shadow would feel incorrect. |
| [VISAP 2023 — Reinterpreted Spaces printmaking flag book](https://visap.net/2023/contributions/reinterpreted-spaces-an-ai-printmaking-collaboration), [physical page photograph](https://visap.net/2023/images/contributions-images/Image%2010%20%28File%20responses%29/nextImageExportOptimizer/5.%20Book_Hillary%20-%20Hannen%20Wolfe-opt-3840.WEBP) | Distinct sheets protrude at different heights, with readable white paper rims, localized contact shadows, full printed designs on each flag, and overlapping edges. Paper layering must establish a stable z-order rather than sorting each frame by visual color. |
| [Ignacio Osorio — GEOMETRIP paper-collage film](https://ignacioosorio.work/geometrip) | Original paper collage animations use physically authored individual frames; 260 distinct handmade compositions contain slight imperfections and hold an intentionally stepped visual rhythm. Our on-ones/twos/threes/fours exposure samples represent rostrum capture cadence without fabricating separate real paper frames. |
| [Jake Fried — Paper Trail](https://www.itsnicethat.com/articles/jake-fried-paper-trail-animation-131017) | Extreme layered collage complexity builds meaning via cut-out elements rather than a flattened image sequence. Each separate SVG paper piece must retain a full source stencil and its original named silhouette. |

### Non-negotiable medium-specific shape rules

1. **Source topology:** Every independently mounted original cutout has an artist-authored *closed* SVG path; it is never a polygon auto simplification of an existing photo or a single rectangular CSS card. The original base sheet and each independent source cutout retain **full vector overprinting, AM/FM screen, source-native paper-tooth holes, printed type, and RISO75 ink-contact geometry**. All cutout masks are outside the untouched originals.
2. **Vector flow:** Motion is along directed paper displacement paths and rigid-body rotation about deliberate print-collage pivots. Individual ink paths never acquire their own velocity; the per-piece clipping path, ink, paper grain and micro-edges all move as one whole material.
3. **Edge and contact:** Every cutout emits a sharp original paper silhouette, thin contrasting rim and two aligned contour-cast contact shadows, offset by its actual paper-plane depth and common rostrum lamp position. No GPU bloom, Gaussian blur, image-wide opacity smear or generic glass gradient masks fine overprint detail.
4. **Layer color and depth:** Three separately printed cutouts from one continuous source edition (typographic arch, river ring, letterpress footer) mount over a different cobalt/vermilion print. Each preserves true *source-separated* two-spot ink rather than performing an RGB multicolor image transformation. Each paper plane has an authored depth of 2.5, 5.2 or 7.6 design millimeters; back-to-front sorting remains physically stable, while paper lift during entry temporarily increases shadow separation.
5. **Temporal coherence:** Only paper transforms move in time. `evaluateRisoRostrumCutout` samples existing FilmStage absolute frames with explicit stop-motion cadence (1/2/3/4 frame exposures). With 24fps FD1, twos equals 12 changed paper poses/s. Ink screen coordinates, original imperfection seeds, print registration, full pages and subject type remain fixed across exposure holds and 1×/2×/3× rostrum camera magnification.

## Reusable component spec

**Name:** `RisoRostrumStage` and `evaluateRisoRostrumCutout`.

**Use:** Reusable 2.5D tactile collage, independently mounted printed posters, paper research sequences, product/story editorial cutouts, short-form kinetic zines, and physically plausible stop-motion paper shape choreography. **Not for:** reproducing a real scanned user's print frames, full 3D paper folding or a press-calibrated material simulation.

**Public API:** `base:RisoSheet`, `cutouts: RisoRostrumLayer[]` (each piece: original `sheet`, original closed `contour`, unique `id`, `pivot`, `entryOffset`, `entryAngleDegrees`, optional `finalOffset` and `finalAngleDegrees`, `depthMm`), `frame`, `startFrame`, `durationFrames`, `exposureFrames?:1|2|3|4`, `camera?:[x,y]`, `lamp?:[x,y]`, `drumContact`, `paperGrain`, `misregistration`, `reducedMotion`, accessible `label`, `className`, `style`.

**Structure:** SVG outer scene as `role=img`; original base `RisoPrint`; each cutout's original `RisoPrint` under its own precise unmodified clip path; two physically displaced shadows; paper rim. The group transform affects the entire original sheet and material. Same physical page coordinates and paper canvas across all layers, independently specified spot colors and paper stock permitted. Source type/surface remains accessible through one outer image label; nested redundant prints are aria-hidden.

**State coverage:** 0 (initial original poster), moving paper cutouts (144 existing FD1 frames), and 1 (fully mounted still). 24fps film passes 36 original, 144 mounting, 72 hold frames; 16:9 and 9:16 original compositions authored separately. The stop-motion sample number and the physical paper silhouette are inspectable in Storybook. Paper layer count [1,12], unique IDs, explicit source SVG path, 0–12mm design thickness, bounded rostrum camera and lamp and strong geometry preflight.

**A11y:** Native button, select and range controls, keyboard home/end, accessible film beat navigation, no automatic animation under reduced motion, combined SVG `role=img` with meaningful description, exact role structure. The original ink remains visually intact and Storybook controls have sufficient touch sizes.

**Customization:** Cutouts are composable source `RisoSheet` data, not tied to the demonstration or a hard-coded palette. `className` and `style` are forwarded; no new runtime library. Original `RisoPrint` supports existing AM/FM dot density, ink per plate, paper tooth, transparent ink and optional contact pressure.

**Performance:** 1 base plus at most 12 cutouts with each original stencil; practical video benchmark is three. No decoded bitmap frame tiles or local random mutations; 1–4 exposure frames. No image download/network or external fonts. Actual physical print fidelity is held for independently approved owner-supplied examples.

## Required screenshot and verification gates

- [ ] 16:9 1× full original composition at middle and last, and 3× paper seam (no displaced ink or texture crawling).
- [ ] 9:16 1× original cutout art with all three pieces, no clipping of source type from accidental UI overflow; intentional paper-contour clipping is documented.
- [ ] 24fps on twos holds frames 112→113 in actual browser, and advances at 114; all source print geometry remains identical through camera and lamp changes.
- [ ] Independent lighting moves shadows, not printing; parallax moves a whole paper plane, not just the ink; later cutouts have larger depth.
- [ ] Zero/last film states show original and fully mounted print; reduced motion has every cutout settled.
- [ ] Strict TS, Vitest original source topology/geometry, clean registry `riso-print` install, Storybook build and Chromium, reviewed real 1×/3× captures and artist sign-off.
- [ ] No third-party assets licensed or copied, no human hands, no new runtime dependencies.

This is **an animated, reusable printmaking visual material and film component**, not another scanner diagnostics workflow.
