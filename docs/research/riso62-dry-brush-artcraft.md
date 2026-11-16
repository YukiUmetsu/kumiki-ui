# RISO62 — source-vector pressure / dry-brush splintering

**Art status:** Original non-character illustrated source study, not an empirically calibrated print or reused raster texture. RISO59/RISO60 hand anatomy remains untouched.

## Reference studies and source deconstruction

- [Roller Ink Riso, Printing / smudge macro](https://www.rollerinkriso.com/services): uneven pigment contact, substrate-exposed breaks, fibrous dry deposits, local broad-to-thin mark changes.
- [University of Utah Marriott Library, Risograph Instructions](https://lib.utah.edu/collections/book-arts/risograph.php): broad opaque ink areas can smudge and transfer poorly; screen and texture large ink fields rather than uniformly solid deposits.
- [MICA gradlab Riso Printing](https://gradlab.mica.edu/RisoPrinting): absorption into uncoated paper, dry times, registration and layer-specific ink behavior.
- [RISOTTO Studio, printing FAQ](https://risottostudio.com/pages/printing-faq) and [Illinois Print Guide](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): independent spot-color stencil separations, relative angles and registration.
- The RISO61 [continuous spot-screen source study](riso61-variable-tone-gradient-artcraft.md) supplies the paper-locked AM/fibre-print baseline. The new brush creates *authored pigment edges* instead of substituting noisy alpha gradients.

References are observational only. No images or source assets from these sites are copied into this repository. A Photoshop/Procreate dry-brush filter is not equivalent to a Risograph stencil; these original strokes are a stylized material vocabulary.

### Topology, pressure and vector flow

1. A single original 4-point cubic centreline governs each mark's medial axis, independent of the destination frame or paper stamp. Its tangents define local normals.
2. A named continuous series of 2–12 pressure stations, starting at 0 and ending at 1, separately control tangent-following width rather than global line scale. Each side receives its own small seeded edge variation. A continuous closed quadratic-ribbon outline preserves densely sampled geometry and rounded linked edge flow.
3. At dry stock settings, 1–13 original narrow closed interior splinters arise from the same curve-relative tangent direction. **They are real evenodd holes in the positive physical pigment stencil**, not a white repaint, alpha filter, bitmap, CSS mask or flattening of original marks.
4. Two separately registered plates reuse existing `RisoPrint` ink order, substrate fibres, tooth mask, multiply overprint and fixed paper coordinates. Fine hairs and nested negative spaces are preserved at high source zoom.
5. A 16:9 / 9:16 *Calligraphic Current* studio composes 20 original curved gestures, micro-registers and precise source labels. Geometry varies from the absolute 0–239 film frame, and the same frame can always be regenerated without accumulating state.

### Reusable API

- `createRisoBrushGeometry(options)`: the base cubic `start, control1, control2, end`, pressure knots `{at,width}`, width 1–96 source units, dryness 0–1, integer seed and optional 24–256 centerline stations.
- `risoBrushPressureAt(stops,t)`: clamped, eased pressure curve for an independently authored source mark.
- `risoBrushInkPath(geometry)`: a single SVG native path containing one original positive fill and optional narrow negative inner contours.
- `RisoDryBrushInk`: reusable React ink art component for one spot plate. Requires exact `paint.solid` hex from its own `RisoPrint` pass. Contains no custom clock, filter, postprocess compositor or CSS gradients.
- Same Storybook folder: **Video production → Film Looks → Risograph → Dry-Brush Ink Atelier**, with aspect, source frame, both/individual plates, dryness, pressure width, paper grain, registration, seed and motion freeze.

### Quality controls

- Pure renderer rejects malformed cubic coordinates, degenerate short gesture, nonfinite values, pressure controls outside 0..1, duplicate/disordered stations, widths outside range, steps outside 24..256 and invalid seeds.
- Unit checks assess individual source pressure variation, low-to-high dry surface response, seed reproducibility, 80-station geometry, real nested editable stencil openings, two-spot plates and no raster/filter elements.
- Native Chromium Storybook checks both dimensions, red/blue/both physical masters, richness of paths and frame repeatability, with exact evidence screenshots. A registry fixture installation and strict typecheck are part of the scoped workflow.

**Not an art pass:** This source-vector print simulates dry gestural calligraphy *printed through Riso masters*. Actual ink absorption, plate trapping, burst fibre statistics and registration must be tested on physical stock; pleasing Storybook screenshots cannot certify photographic microstructure or true press fidelity. Never replace the existing approved art or other styles automatically.

## ArtCraft iteration — source-built field vs repetitive geometry

**Rejected screenshot (revision 1):** 11 nearly parallel cobalt and nine parallel vermilion strokes. The 960×540 capture read as a regular bundle of ribbons, while 540×960 looked like two mechanical hair combs. Eleven short cutouts per stroke were barely visible at 1×. Engineering checks passed, but this was not an artistic pass.

**Revision 2 (current candidate):** resculpt all 20 original cubic gestures with *independent, authored* normalized control points for both 16:9 and 9:16. Each original stroke keeps its own pressure curve, local orientation, full 81-point positive sampled contour and pigment master, but now follows different crest/eddy trajectories and independent swash, filament and hero width roles. The original nineteen witness marks and nine red micro echoes remain; they move to physically source-anchored curves rather than orphaned sheet speckles. An absolute-frame pulse deforms only cubic handles, never the paper seed or tone stroke count.

**Dry-ink micro topology:** per ribbon produce up to 39 source-following extended bristle streaks, laid across seven width lanes. Each sample is calculated *on the exact original cubic*, not snapped to the outer ribbon station index. Local splinter thickness tapers with independently authored source pressure and sinusoidal bristle envelopes, with bounded seed-stable flicker and offset. Add up to 38 separate irregular eight-vertex paper pores. The positive outline receives independently seeded slow edge grain, short pickup disturbance and rare edge nicks without deleting the original 81 centreline sample stations or changing exact pressure knots. All holes remain true positive-fill evenodd negative source geometry; never paint with paper hex above ink.

**Press-reference observations for this change:** [University of Utah's Risograph instructions](https://lib.utah.edu/collections/book-arts/risograph.php) warn that large solid ink fields and inconsistent stock feed cause uneven deposits. [MICA's preparation guide](https://www.mica.edu/campus-life-and-resources/places-and-spaces/maker-spaces-fabrication-studios/2d-prototyping-studio/riso-image-making-and-printing/) cautions that grain, smudging and registration are physical ink phenomena. [Out of the Blueprint's RISO preparation guide](https://outoftheblueprint.org/files/) recommends reducing heavy ink and recognizes Grain Touch as distinct from screen-covered halftoning. [Roller Ink Riso's real printing sample](https://www.rollerinkriso.com/services) has textured overlapping spot masters and irregular edge contact. None of these examples licenses reusing their artwork; this project constructs new native vectors from observed material categories only.

**Acceptance:** inspect real native Chromium screenshot files at 1× and 3× and both physical ink masters. Evaluate whether source arcs have varied rhythm, large paper spaces survive, fine relief actually prints visibly without becoming random lace, and source film frames are stable under seeking. Passing CI is technical, not proof of press colour or of world-class original art.


**Storybook transport:** Play/Pause/Replay is a local interactive preview at 24 fps; actual source geometry remains absolute-frame evaluated and reversible. The stencil component does not run timers. Seeking the range slider or disabling motion stops preview. The Playwright browser proof asserts transport start/pause without conflating this convenience preview with an encoded MP4 or the production FD1 clock.
