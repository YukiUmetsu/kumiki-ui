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
- One radial deposit, or an optional *pressure-guided polyline wash*,
  distributes a fixed amount of pigment mass across the paper cells.
  Brush-path points expose `x`, `y`, and `pressure` in paper coordinates.
  Local water injection follows the actual gesture, not a canvas-wide filter.
  The source validates 2–64 distinct, bounded, pressure-bearing points.
- Optical coverage uses **pigment mass per physical paper area**: grid pitch
  changes numerical precision, not the nominal tone of the same painting.
- The SVG adapter reconstructs a continuous irregular feathered pigment
  field from overlapping, paper-locked curved footprints rather than
  grid-aligned rectangle edges. Reserved highlights are masked after wicking.
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

## WM5 — source-aware subject pigment (2026-11-14)

WM5 extends the same public `WetPaperSpec` without a schema-version break:

- `paintAreas?: {x:number; y:number}[][]` defines 1–48 nondegenerate,
  paper-space subject polygons (3–64 vertices each). **The simulator**
  constrains deposited pigment, water and four-neighbor transport to
  occupied cells, so pigment cannot flow from a painted leaf through
  untouched paper into a disconnected roof. The SVG renderer clips the
  final diffused layer to the same polygon geometry. Edge geometry and
  numerical cell occupancy are separate; this is an intentionally
  bounded qualitative approximation, not an SVG-exact fluid solver.
- `edgePooling?: number` sets 0–1 conservative wet-to-dry pigment
  advection, followed by existing dry-front sedimentation. Values of
  0 preserve the original material behavior; no mass is added.
- `watercolourSubjectSpec(study,seed,material)` in
  `src/video/watercolour-master-studies.tsx` creates original, distinct
  color regions for **24 individually constructed botanical leaves**,
  irregular layered coastlines, or roof/wall/shadow/garden architecture.
  They respond to the same absolute frame and palette controls as the
  underlying wet-paper field, with an independent pigment glaze pass.
- `WatercolourMasterStudyPage artOnly` produces a larger artwork-only
  composition with no editorial typography; the Storybook
  **Full-canvas watercolor artwork** checkbox provides the comparison.
  The production slot accepts `props.artOnly: true`.
  The portable film at
  `examples/film/watercolour-master-studies-art-only.film.json`
  supplies three 14-second scenes in both output ratios.

A constrained subject surface needs deliberate authored geometry:
polygon bounds should cover the *painted region*, not the entire figure
bounding box. It must have meaningful cell coverage at the chosen
`cellSize`. Very thin strokes still need WM1/WM2 brush drawing;
the 16-pixel reference mask is not a contour-level 4K micropaint renderer.

The source design follows the documented differences between *wet-on-dry
edge darkening*, *wet-on-wet flow*, *granulation*, and *thin translucent
glazes*. See [Curtis et al., Computer-Generated Watercolor
(1997)](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf)
and [Utah Division of Arts & Museums watercolor technique
guide](https://artsandmuseums.utah.gov/wp-content/uploads/2019/01/Watercolor-Society.pdf).
The scenes reproduce **techniques**, not any museum images.

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

**Recorded proof:** [PR WM4 workflow run 43634979447](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43634979447)
passed real Chromium Storybook checks in both aspect ratios,
six real FilmStage frame exports, and a 70-frame encoded 960×540 preview.
The exported artwork was **inspected by an agent**: watercolor deposition
is coherent and paper reserves hold, but the illustrations still read as
light vector artwork with a diffuse underpainting, rather than the
confident material edges, complicated anatomical/architectural construction
and controlled watercolor contrast of the reference paintings.
Do **not** treat this as final artistic approval.

**WM5 recorded technical evidence:** [pass 1](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43636895406) and
[pass 2](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43637467535)
completed real Chromium visual verification for 16:9 and 9:16 in
both editorial/full-canvas modes. FilmStage exported twelve representative
full-color production frames and a 48-frame encoded landscape MP4.
The agent inspected the exported 12-frame comparison: more coherent leaf,
coastal and building glazes; substantial improvement to subject framing
in portrait; still limited realism, particularly small botanical structures,
mechanical facades, distant wave anatomy and weak surface contrast.
These passes do **not** imply full 42-second dual-format or 4K acceptance.

**Still required before artistic acceptance:** full-length normal-speed
16:9 and 9:16 MP4 playback, reference-grade subject-level pigment/glaze
interaction, anatomically faithful drawing, organic directional
brush boundaries, calibrated wet/dry color ratios, clean film-safe
typography, 1080p/4K performance profiling, and human art acceptance.
Routine CI remains typecheck + changed tests; the full WM4 proof workflow
is available manually without running automatically on every PR.

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
2. Extend the newly implemented **polygon-restricted** wet medium to
   curved SVG silhouettes, authored multi-polygon overlap and WM3 actor
   parts; preserve conservation at every water-contact boundary. Pressure
   paths, conservative wet-front edge pooling and region barriers now exist,
   but contour-fidelity and physically calibrated evaporation do not.
3. Improve wet-layer pigment reactivation, granule clustering, salt lifting,
   cauliflowers and backruns; contrast numerical edge pooling against scanned
   watercolor *without* manufacturing pigment.
4. Use the field on WM3 character part surfaces with hand-redrawn contour
   cadence, multiple actors, gestures, grounded props and authored camera work.
5. Review a narrated 20–40 second original film at **normal playback speed** in
   both aspects; retain source-level test evidence and an explicit art signoff.
