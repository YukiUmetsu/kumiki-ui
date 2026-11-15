# RISO16 — authentic paper-edge flow and animated two-hand print continuity

**2026-11-15.** Follow-up to [RISO15](riso15-printed-prop-edge-study.md).
Scope: one source-authored, rich paper prop between the existing Courier and Paper Artist; no new character or film engine. Art direction is **style-guided**; these third-party pictures are technique references, not trace targets.

## Inspected material and hand-reference examples

| Source image / provenance | Visible craft cue | Original code translation | Anti-example to reject |
| --- | --- | --- | --- |
| [The Printhaus, two-color hand illustration](https://www.theprinthaus.org/ph-courses/beginners-riso-printing) | Blue and orange illustrated hands, torn optical hierarchy of strong hand mass and tiny crossing line work; overprinted small elements stay recognizable | Full opaque actor knockout around the letter, independent blue outline and red stamp, no RGB noise texture | Transparent body or flat ribbon painted over fingertips |
| [Kat Schneider, *Pride & Prejudice Hands*](https://www.katschneider.com/store/prideandprejudice-hands) | Two genuinely distinct hands, thumb pressure/knuckle negative spaces, strong blue/red color planes and fine sloping black ink lines | The print is behind the independent hand masks; pinch changes the actual edge profile, not generic opacity | Unconnected mitten-like fingers; arbitrary black dot hands |
| [Fluopink, 2-color printed postcard held at a corner](https://www.fluopink.de/shop/p/riso-postkarte-total-blur-pink-blue) | Paper corners remain firm and white, held paper stays opaque, concentric separations reveal slight offset without destroying source contours | Rotated continuous paper path shared exactly by stencil knockout and ink path, protected register on both masters | Misaligned paper polygon allowing background to show through |
| [Out of the Blueprint, RISO file preparation](https://outoftheblueprint.org/files/) | Plates separated per ink, misregistration, halftone density and avoidance of unprintable heavy fill | Blue contour/fold shade is a screened master, red stamp/hatching another master | Post-composited RGB halftone blanket |
| [FaVU RISO Lab print quirks](https://dilny.favu.vut.cz/en/bookbinding/workplace/riso-lab/risograph-quirks) | Paper/ink texture is materially rooted in dot pattern rather than uniformly lowered polygon opacity | Dot-screen fold shade reuses RisoPrint's fixed-size plate definitions and film-stable paper tooth | Time-varying random dots that crawl between frames |

No external images, characters, scans or SVG paths imported. All outlines and line motifs authored in-house. A machine-readable source mask, aligned image crops and visual acceptance record were **not** available in this remote execution; no SSIM, microtexture or topology score is invented.

## ArtCraft five-axis structural breakdown

1. **Topology:** a *single closed* source→recipient paper perimeter. The paper knockout and the visible ink use `printDetails.outline` from the same deterministic evaluation; actor face/hand body masks remain unchanged. Both short edge midpoints lie along the evaluated hand anchor points; no duplicate screen-axis `sheet` polygon.
2. **Vector flow:** compute the longitudinal hand-to-hand tangent and its signed normal. Outer edge, inset, paper fold, fold shade, three curved address lines, cancellation stamp and fine grain strokes all use this local frame; a sinusoidal, bounded material bow deforms *all* of them coherently.
3. **Pressure and edge character:** outer edge is an asymmetric closed Bézier ribbon with irregular top/bottom curvature; end-pinching narrows only the contact zone. Ink pressure differs by intentional stroke type: 2.1 / 0.95 / 0.85 / 0.75 units.
4. **Rhythm:** uneven arc and near/far clusters of hatch lines, skewed round cancellation mark. A held source point remains stable; lateral changes do not jump to screen alignment.
5. **Microtexture:** no global pseudo-noise filter, half-transparent paper or new frame clock. Blue plate includes a screened wedge along the fold; red retains postal seal and individually spaced hatching. Paper pores and dot pattern remain anchored to existing `RisoPrint`.

## Precise testable contracts

- `evaluateRisoTransferSheet(source,end,progress,{curl,gripPinch})` is a pure, bounded evaluator. `curl`: 0–12 stage units; `gripPinch`: 0–1. Invalid or nonfinite values throw. Before deployment or for a sub-half-unit degenerate chord, all SVG geometries are empty. Between 0.5 and 28 units, paper thickness scales continuously with chord length so the opening letter never teleports into a full-width shape.
- One `outline` is supplied to **both** sheet knockout and blue-plate contour; no secondary silhouette/corner code in the ensemble.
- Longitudinal projection of the leading edge midpoint onto the tangent must be approximately zero; normal projection retains original paper thickness even when either hand moves vertically.
- No editor-only texture, no per-frame seeded random, no copied source artworks.
- RISO16 unit suite includes directed horizontal, tilted and reverse hand positions, zero-length and incomplete frame phases, deterministic seek and optional deformation controls.
- Existing dual-ratio Playwright proof now asserts printed fold texture and scrubs both new Storybook sliders. Existing RISO14 geometry/ink tests remain part of routine CI.

## Known limits / next priorities

This is contour and spot-print refinement, **not** solved fingertip collision, paper crumple simulation, physical grip force or perspective-accurate hand occlusion. Exact art-to-source five-axis comparison is pending rendered screenshot crops and independent aesthetic review. Next: real hand–paper grasp-plane ordering and fingertip skin deformation; independently drawn 3/4 and profile faces; physical print-scan dot gain calibration; complete 30–60-second narrative film with licensed audio.
