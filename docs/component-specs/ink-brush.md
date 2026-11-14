# INK1 — material-native ink brush geometry (Phase 3, first slice)

**Registry item:** \`ink-brush\`  
**Sources:** \`registry/video/ink-brush.ts\`, \`ink-brush-react.tsx\`  
**Storybook:** **Video production → Film Looks → Ink Brush → INK1 · Brush Deposition Lab**  
**Production fixture:** \`examples/film/ink-brush-studies.film.json\`  
**Review state:** \`not-reviewed\` (automated checks do not grant artistic acceptance).

## Medium-specific behavior

Ink is **authored geometry** rather than a photographic texture grade or the existing generic \`film-matte.ts\` transition. Every stroke has 2–20 ordered control nodes with paper-space \`x\`, \`y\`, contact \`pressure\` (0..1) and segment \`pace\` (.25..4); its independent \`width\` (1..120 design pixels), \`load\` (0..1), \`dryness\` (0..1) and five discrete ink tones control a pressure-sensitive variable-width mark.

The CPU samples a bounded Catmull–Rom centerline and integrates **length / pace** to convert absolute frame progression into a travel distance. Variable-width left/right edges form a closed SVG silhouette, tapered at actual brush entry/exit. Pinned paper-space seed produces fixed small edge variations and **flying-white** split-bristle holes. The holes are cut *within each mark's own SVG mask*, not drawn as opaque paper-colored lines over other strokes.

A fixed paper surface and anchored fibers do not animate or depend on screenshot ordering, DPR or wall-clock time. A stroke is deposited once as \`frame\` advances and remains stable after its own \`startFrame + durationFrames\`; seeking backward recomputes its shape independently. Input diagnostics report JSON-style paths. Missing stroke data is a failure, not a fabricated brush/image substitution.

### Contract

\`\`\`tsx
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
}} frame={42} paperTooth={.45} />;
\`\`\`

The SVG accepts optional \`children\` for authored type/overlays, \`paperTooth\` from 0..1, \`label\`, standard SVG attributes and \`reducedMotion\` to show the completed mark. The pure \`evaluateInkBrush\` exports geometry, progress, pigment color, opacity, brush gaps and bounds for tests and non-React renderers. It is separately installable with no new optional dependencies.

The **first implementation is not wet diffusion**: it does **not** simulate water transport, absorption, evaporation, pigment granulation, or rice-paper chemistry. Do not describe it as a finished ink-wash or watercolor engine.

## Original field-study films

The two independent educational/editorial subjects are **THE DELTA FORMS** (a river branching into tributaries) and **A QUIET BRANCH** (a branching tree and leaves). All artwork is locally generated from original typed control-point data in \`src/video/ink-brush-demo.tsx\`. No external film or third-party asset is bundled.

- \`src/video/ink-brush-film.ts\`: 6-slot, 600-frame FD1 film at 30 FPS (delta gesture, tributaries, hold → tree trunk, canopy, hold).
- \`src/film/film-slots.tsx\`: production loader passes the existing FilmStage local frame + authored \`offsetFrame\` to the material adapter.
- \`src/video/ink-brush.stories.tsx\`: Storybook Play/Pause, full-film seek slider, two subjects, 16:9/9:16, width, dryness, load, grain seed, paper tooth and reduced-motion controls.

\`\`\`bash
npm run film:check -- examples/film/ink-brush-studies.film.json
npm run film:frame -- examples/film/ink-brush-studies.film.json --frame=160 --only=landscape --out=dist/ink-qa
npm run film:frame -- examples/film/ink-brush-studies.film.json --frame=500 --only=portrait --out=dist/ink-qa
npm run film:render -- examples/film/ink-brush-studies.film.json --frames=180 --only=landscape --out=dist/ink-qa
\`\`\`

## Material reference / rights packet

- [Asian Art Museum: A Visual Vocabulary of Brushstrokes](https://education.asianart.org/resources/a-visual-vocabulary-of-brushstrokes/) — independent process reference; pressure, speed, moisture, the amount of ink, dry-brush splits and tone variation matter physically. The reference's examples and description informed **parameters**, not literal art, geometry or labels.
- [Asian Art Museum: An Introduction to Chinese Brushpainting Techniques](https://education.asianart.org/resources/an-introduction-to-chinese-brushpainting-techniques/) — independent process reference for wide vs fine marks and varied speed, pressure and moisture. No photos or text copied into production.
- [Roadmap 35A: ink wash video and stills](../35a-material-native-style-reference-gallery.md) — third-party comparison targets at 00:07, 00:18, 00:28, 00:39. Opening its public web page is not proof of viewing the entire encoded reference film; this review remains open.
- **Artwork/rights:** new vector artwork authored in this repository. No copied benchmark video, characters, proprietary fonts, sounds, screenshots or reference samples. No third-party runtime assets.

**Reference-review limitations:** This PR independently implements brush pressure/cadence and split bristles only. Wet spreads and physical media fidelity cannot be declared complete from stills. Compare actual normal-speed 16:9 and 9:16 exports with process references before artistic approval.

## Verification and follow-up

\`tests/ink-brush.test.tsx\` covers type/data validation, 5 tones, point/sheet bounds, pace/pressure/load/dryness sensitivity, deterministic shuffled seek, exact static holds, reduced-motion, full Film Document compilation and production slot resolution. Browser screenshots and an actual playable MP4 are required as additional visual evidence; no CI success alone certifies art quality.

**Next roadmap implementation (Phase 3 PR 5):** deterministic authored pigment deposition → finite wet spread → paper absorption → evaporation/dry hold with true paper-anchored color and stroke chemistry. Do not simulate this with a Gaussian blur or a generic ink-matte wipe.
