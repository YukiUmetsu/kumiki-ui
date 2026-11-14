# INK1 — material-native brush and absorbent paper

**Registry pack:** `ink-brush`  
**Files:** `registry/video/ink-brush.ts`, `registry/video/ink-wet-paper.ts`, `registry/video/ink-brush-react.tsx`  
**Storybook:** Video production → Film Looks → Ink Brush → **Brush Deposition Lab** or **Brush Material Microscope**  
**Production fixture:** `examples/film/ink-brush-studies.film.json`  
**Status:** code implemented, artistic visual-review gate still separate.

## Behavior and animation contract

Ink strokes are **authored control-point gestures**, not screen-space ink wipe transitions. Each stroke has paper-space `x/y` control points, `pressure` (0..1), local `pace` (.25..4), contact `width`, pigment `load`, `dryness`, one of five authored ink tones, `startFrame`, and `durationFrames`.

`sampleInkBrushStroke()` provides an interpolated, distance/pace-timed brush trajectory. The same trajectory drives both material renderers:

1. **Paper pigment (default):** `sampleWetInk(spec, frame, {scale, bleed, reducedMotion})` deposits anisotropic pigment/water footprints into a paper-coordinate raster. Each dab conserves its own pigment amount, regardless of subsequent independent strokes. A fixed seeded fibre field creates varying deposition; water controls finite capillary spread, absorption and drying over at most 56 source frames after contact. No film-frame history is required, so arbitrary seeking is deterministic and the dry hold is exactly stable.
2. **Earlier vector (optional):** `evaluateInkBrush()` produces variable-width SVG outlines, isolated ink-rich cores, directional bristles and flying-white paper apertures. It remains available to compare the two approaches; it is no longer the default appearance.

The raster path is a transparent RGBA image composed **over authored paper, below typography**. `encodeWetInkPng()` writes a portable RGBA PNG without Node-specific compression or an extra runtime dependency; `wetInkPngDataUri()` feeds the SVG image layer. SSR/Chromium and film export use the **same FilmStage absolute frame**.

### Public API

```tsx
import { InkBrushCanvas } from "./components/video/ink-brush-react";

<InkBrushCanvas spec={{
  version: 1, width: 960, height: 540, paper: "#F2EFE4", seed: 17,
  strokes: [{
    id: "branch", width: 28, load: .85, dryness: .75, tone: 0,
    startFrame: 10, durationFrames: 60,
    points: [
      { x: 180, y: 400, pressure: .08, pace: 1.8 },
      { x: 340, y: 275, pressure: .95, pace: .65 },
      { x: 525, y: 120, pressure: .05, pace: 1.7 },
    ],
  }],
}} frame={42} renderMode="wet" bleed={.65} rasterScale={.5} paperTooth={.45} />;
```

`renderMode="vector"` switches to the earlier SVG implementation. `bleed` is 0..1; `rasterScale` is .125..1 with a 2.2-million-cell upper bound; `reducedMotion` samples the completed, dry image immediately. No second film clock or dependency is introduced.

## Two original subjects, production proof

- **THE DELTA FORMS**: a river branches into tributaries.
- **A QUIET BRANCH**: a botanical trunk and canopy appear.
- Six-shot, 600-frame FD1 film at 30 FPS, both 16:9 and 9:16; same production `src/film/film-slots.tsx` loader.
- Storybook includes Play/Pause, timeline scrub, both subjects/aspects, load/dryness/brush width, paper seed, zoom, reduced motion, **Paper pigment vs Earlier SVG** selector, and capillary-spread control.

```bash
npm run film:check -- examples/film/ink-brush-studies.film.json
npm run film:frame -- examples/film/ink-brush-studies.film.json --frame=160 --only=landscape --out=dist/ink-qa
npm run film:frame -- examples/film/ink-brush-studies.film.json --frame=500 --only=portrait --out=dist/ink-qa
npm run film:render -- examples/film/ink-brush-studies.film.json --frames=180 --only=landscape --out=dist/ink-qa
npm run registry:validate
node scripts/registry-fixture.js --item=ink-brush
```

## Research and artistic acceptance

- [Brushstroke movement and absorbent-paper references](../research/ink-brush-reference-movement-study.md) records concrete video lessons and publications as design inputs, plus the limitation that direct online-video frame extraction was inaccessible.
- [Asian Art Museum brushstroke vocabulary](https://education.asianart.org/resources/a-visual-vocabulary-of-brushstrokes/) describes pressure, pace, ink and moisture as material fundamentals.
- [Asian Art Museum brushpainting introduction](https://education.asianart.org/resources/an-introduction-to-chinese-brushpainting-techniques/) provides related technique context.
- [Roadmap 35A video board](../35a-material-native-style-reference-gallery.md) specifies checkpoints for independent visual QA. No reference videos, copyrighted imagery, fonts or assets are copied into this pack.

The numerical spreading, absorption and drying response is a **bounded analytic approximation**. It is not a measured capillary-transport solver, a resolved fluid simulation, or calibration against microscopic Xuan-paper fibres. Browser-stable PNG output and green tests demonstrate determinism and technical behavior, **not** real-world artistic fidelity.

Review gates: deterministic unit and PNG checks, production slot/film compilation, clean registry consumer install, 16:9 and 9:16 Chromium captures, encoded normal-speed MP4, comparison with the earlier SVG, source-material close-ups, and explicit visual approval. The full 20-second two-aspect export and independent visual sign-off should not be claimed from a 6-second proof.

## Focused regression tests

`tests/ink-brush.test.tsx` checks authored geometry and legacy vector contract; `tests/ink-wet-paper.test.ts` checks ink deposition, blank paper, wet spread, absorption, mass conservation, dry hold, reduced motion, PNG transparency, and **adding a later separate stroke never alters an already dried region**. `tests/e2e-storybook/ink-brush.spec.ts` checks actual browser PNG, A/B material switch, two aspects, shuffled seek parity, and material microscope.

**Next fidelity improvements:** better pressure × brush-angle footprint, explicit loaded multi-tone nib gradient within one stroke, measured paper permeability and capillary diffusion, and filmed motion/physical-reference acceptance.
