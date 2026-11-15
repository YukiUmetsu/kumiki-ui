# Watercolour & pressure brush — WM1

**Registry:** `watercolour-brush`  
**Storybook:** `Film Art Styles / Watercolour & Brush / Painted Film`  
**Source:** `registry/video/watercolour-brush.ts`, `registry/video/watercolour-brush-react.tsx`  
**Status:** functional first implementation; **visual quality not yet accepted** (16:9 and 9:16 normal-speed external review outstanding).

## Why this exists

This is not a photo color grade, a watercolor overlay or a rebranded `film-matte` mask. The artist authors the actual brush centerline, pressure, speed, diameter, pigment, water and timing on a fixed paper plane. Paint follows the pen, initially deposits in a pressure-derived filled polygon, spreads as a **separate** wetted region, absorbs into paper, then dries into a stable image. This first pass uses deterministic analytic approximations, not a numerically solved fluid simulation; material parameters must not be described as laboratory-accurate measurements.

Five pigment strengths are supported (`tone: 1..5`), independent colors per stroke, optional ink-only transparent-paper output, dry-brush bristle gaps, pigment flecks and paper-fibre detail. Multiple strokes multiply optically, preserving translucent glazing. SVG filters affect the wet edge **only**, not the entire film or typography. Noise is seeded in paper-space.

## Public contract

```tsx
import { WatercolourSurface } from "./components/video/watercolour-brush-react";
import type { PaintSurfaceSpec } from "./components/video/watercolour-brush";

const surface: PaintSurfaceSpec = {
  version: 1,
  medium: "watercolour", // or "ink"
  width: 960, height: 540, seed: 34,
  paper: { color: "#F7F0E4", tooth: 0.72 },
  strokes: [{
    id: "branch", color: "#3F695F", tone: 4,
    width: 28, water: 0.58, load: 0.88, dryBrush: 0.27,
    startFrame: 12, drawFrames: 50, spreadFrames: 24, dryFrames: 80,
    points: [
      { x: 340, y: 430, pressure: 0.13, speed: 0.6 },
      { x: 460, y: 330, pressure: 0.9, speed: 0.2 },
      { x: 560, y: 220, pressure: 0.05, speed: 0.7 },
    ],
  }],
};

<WatercolourSurface spec={surface} frame={120} />;
```

`frame` is an absolute integer. `reducedMotion` returns the fully dry end state, even at frame zero. `transparentPaper` emits only pigment. `inspectPaintSurface()` returns path-specific issues for invalid source art. Render consumers should preflight before export. FilmStage should own the scene timeline, with WM1 in a `slot` scene; do not add a second clock.

### Material phases

1. **Deposit:** a Catmull–Rom sampled centerline with velocity- and pressure-dependent width. The pen reveals a *prefix* of one fixed path rather than jumping between disconnected full curves.
2. **Spread:** a second, slightly wider wet ribbon grows around the deposited mark according to water load and elapsed frames. Pigmented-edge displacement is anchored to the paper, not frame time.
3. **Absorb & evaporate:** fixed pigment speckles, subtle tidal deposits, and the progression of wetness toward zero. A completely dry stroke is identical at every later frame.
4. **Glaze:** overlapping strokes remain independent transparent colors and use multiply blending. Different inks can be layered without turning all coverage into a single flat opaque shape.

### Current limitations

- This is a deterministic **stylized** simulation, not conservation-grade spectral pigment mixing or a hydrodynamic water solver.
- Bristle breakup, bloom and granulation are approximate and require multi-scale rendering inspection. Tiny paper texture may alias in reduced-resolution export; inspect actual frames.
- A scene may freely author final letterforms as regular SVG text; typography is *not* passed through pigment distortion.
- Extra-long films should cache stationary fully dried layers in their capture pipeline if profile data shows a bottleneck.
- No source artwork from third-party examples, museum paintings or published demo frames is bundled.

## Film fixtures and QA

`src/video/watercolour-brush-demo.ts` contains two **original** scenes sharing the same WM1 material: an iris botanical study and a coastal morning landscape. `src/video/watercolour-brush-film.ts` compiles to two FD1 slots across `960×540` and `540×960`. The Storybook player supports full playback, absolute scrubbing, water/paper material controls, seed changes, and reduced motion.

Automated regression: `tests/watercolour-brush.test.tsx` checks seeded geometry, pressure, fixed-frame seeking, phase settlement, pigment coverage, source validation, server-rendered SVG and FilmDocument output shape.

**Art review:** `not-reviewed`. No signed-off normal-speed 16:9/9:16 captures, frame contact sheets or encoded MP4 are asserted. Code-level pass, screenshot existence or matching the reference's subject is not an art acceptance.

## Independent sources and attribution

These informed *observable craft behavior*, not copied source code or licensed scene designs:

- [Metropolitan Museum of Art: Watercolor](https://www.metmuseum.org/perspectives/materials-and-techniques-drawing-watercolor) — damp-paper diffusion, edges, dry brush and paper.
- [Asian Art Museum: A Visual Vocabulary of Brushstrokes](https://education.asianart.org/resources/a-visual-vocabulary-of-brushstrokes/) — hand pressure, speed, load and distinct stroke families.
- [Brooklyn Museum: Glossary of Watercolor Materials and Techniques](https://cms-files.brooklynmuseum.org/a1dfb7500019ba72a2ebbcdb3c9b7a7d1b40779b.pdf) — paper hills versus valleys and dry-brush breakup.
- [Curtis et al., *Computer-Generated Watercolor*](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) — separation of pigment deposition, edge migration, backruns and granulation. Used as research principles, not as imported implementation.
- [Kumiki 35A watercolor film reference](../35a-material-native-style-reference-gallery.md) — reference film checkpoint destinations 00:17, 00:42, 01:07 and 01:32, for **future normal-speed manual comparison**. No claim of having watched or reused the original film.

**Next gates:** capture real export frames and video in both aspects; at minimum inspect dry tip, first wet expansion, layered glazes, readable bilingual captions, animated material seam and full normal-speed 16:9/9:16 playback. Log defects and repeat until human art acceptance; implement explicit watercolor wash-to-image and image-to-wash moves after that review.
