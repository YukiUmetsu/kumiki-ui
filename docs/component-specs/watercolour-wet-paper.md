# WM4 — Watercolour wet-paper pigment transport

**Status:** Engine and FilmStage proof implementation. **Artistic acceptance pending.**
**Registry pack:** `watercolour-wet-paper`
**Storybook:** `Video Production → Film Looks → Watercolour & Brush → Wet Pigment Studio`
**Production fixture:** `examples/film/watercolour-wet-paper.film.json`
**Components:** `registry/video/watercolour-wet-paper.ts`, `registry/video/watercolour-wet-paper-react.tsx`

## Why

WM1 generates pressure-shaped brush strokes. WM2 paints independent silhouette
washes and localized backrun rings. WM3 places painted character rigs in a film.
Those layers lack a **shared pigment field**: overlapping vector shapes
multiply color, but cannot move pigment from one wash into another.

WM4 adds a compact **shared-paper numerical transport** layer. All deposits
participate in one water and pigment grid. Their color-weighted mobile pigment
spreads into neighboring wetted cells and is irreversibly transferred to dry
sediment. Conservation follows the four RGB-weighted mass channels rather than
treating each painted color as an independent transparent decal. A stable
paper-space grain changes optical strength without modifying physical pigment.

**Not claimed:** accurate Navier–Stokes flow, pigment spectral reflectance,
real paper fiber microscopy, artist-quality edge topology, scanned painting,
or real-time 4K full-bleed painting.

## Public usage

```tsx
import { WatercolourWetPaper } from "./components/video/watercolour-wet-paper-react";
import type { WetPaperSpec } from "./components/video/watercolour-wet-paper";

const spec: WetPaperSpec = {
  version: 1,
  width: 960, height: 540, seed: 23,
  paper: { color: "#F8F2E8", tooth: .78 },
  cellSize: 24, flow: .7, granulation: .6, dryFrames: 180,
  drops: [
    { id: "blue", x: 560, y: 280, radius: 110,
      pigment: "#729DB5", load: .75, water: .92, startFrame: 12 },
    { id: "rose", x: 640, y: 310, radius: 100,
      pigment: "#D187A5", load: .65, water: .88, startFrame: 34 },
  ],
};
<WatercolourWetPaper spec={spec} frame={110}/>;
```

Use `inspectWetPaper()` before export. `frame` always comes from the FilmStage
absolute scene clock. `reducedMotion` resolves the final dried frame, never
a half-wet transient. Set `transparentPaper` when supplying an independent
underpainting or other painted layers. Draw sharp contour lines, characters
and all captions in **separate undistorted layers**.

## Numerical contract

- Grid: `ceil(width/cellSize) × ceil(height/cellSize)`, capped at 4,096 cells.
  Author 12–64 px pitch; 20–32 px is a practical proof range.
- Up to 24 drops spanning no more than 720 film frames; maximum 360 drying
  frames after the last drop. Inputs are checked for bounds and finiteness.
- One radial paint deposit distributes a fixed amount of pigment mass across
  cells, independent of grid density. Water injection is local to that deposit.
- Four-neighbor conservative transport moves mobile pigment and water. Water
  evaporates; pigment becomes fixed sediment as the paper dries. No pigment
  is manufactured or silently erased by transport.
- Rendering samples the dry/wet field to individual paper-space color cells,
  then applies **local** feathering and fixed seeded tooth displacement to the
  pigment layer only. Film-wide CSS watercolor filters are not involved.
- Simulation starts from authored deposition time on every query; seeking
  backward cannot inherit a mutable prior frame. Outputs are exactly fixed
  after `dryFrame`.
- Colors use RGB-weighted pigment masses for stable qualitative mixing,
  **not** a physically calibrated multi-pigment absorption model. Mass
  conservation and watercolor colorimetric accuracy are separate concepts.

## Evidence and limits

Test with:

```bash
npx vitest run --project unit tests/watercolour-wet-paper.test.tsx
npm run typecheck
npm run registry:validate
node scripts/registry-fixture.js --item=watercolour-wet-paper
npm run film:check -- examples/film/watercolour-wet-paper.film.json
```

The reference film contains 420 frames at 30 fps, with both 960×540
and 540×960 output declarations. The Storybook atelier controls pigment flow,
paper tooth, sediment granulation, seed, output, and each JSON deposit.

**Still required before artistic acceptance:** real Chromium close-up captures,
normal-speed 16:9/9:16 MP4 playback, no visible rectangular grid artifacts,
consistent saturated/diluted pigment behavior, authored edge topology,
clean film-safe typography, 1080p/4K profiling and visual review by a human.

## References (research only; no third-party artwork in the pack)

- [The Metropolitan Museum of Art — Watercolor](https://www.metmuseum.org/ja/perspectives/materials-and-techniques-drawing-watercolor):
  luminous transparent pigment, soft wet-on-wet tidelines vs defined dry-paper edges;
  original Winslow Homer paintings illustrate paper-dependent granulation.
- [MoMA — How to use watercolor](https://www.youtube.com/watch?v=YIFbLdPDGzo):
  brush shape, water consistency, wet-on-wet versus dry, distinct layering.
- [Getty — Watercolor Techniques](https://www.getty.edu/education/teachers/classroom_resources/curricula/stories_in_art/downloads/worksheet06_02.pdf):
  J. M. W. Turner layering, blotting and material-native highlights.
- [Ann Arbor Art Center — Watercolor Blooms & Basics](https://www.annarborartcenter.org/watercolor-basics/):
  glazes, blooms and water/pigment ratios.
- [Watercolour brush film-reference study](../research/watercolour-brush-film-techniques-study.md):
  production comparison and outstanding animation requirements.

The original code and botanical artwork are authored for this repository.
Reference images, animation frames and audio are not copied or redistributed.

## Next priorities

1. Replace rect-cell feathering with resolution-independent textured pigment
   coverage, measured against real scanned paint at close-up.
2. Introduce masks/obstacle boundaries and brush-path water deposition,
   so WM4 can be combined seamlessly with WM1 and WM2.
3. Improve wet-layer pigment reactivation, granule clustering, salt lifting,
   cauliflowers and edge pooling through **bounded** actual pigment motion.
4. Use the field on WM3 character part surfaces with hand-redrawn contour
   cadence, multiple actors, gestures, grounded props and authored camera work.
5. Review a narrated 20–40 second original film at **normal playback speed** in
   both aspects; retain source-level test evidence and an explicit art signoff.
