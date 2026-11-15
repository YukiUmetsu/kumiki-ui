# PAPER1 — Paper Craft Theatre

**Status:** Art-directed, deterministic **2.5D prototype**. This is not a physically engineered V-fold or machine-ready cut pattern.

- Core `registry/video/paper-craft.ts`; renderer `registry/video/paper-craft-react.tsx`.
- Installable registry item `paper-craft` depends only on React.
- Original fixtures: `src/video/paper-craft-demo.ts` and `examples/film/paper-craft-garden.film.json`.
- Six interactive stories live in **Video production → Film Looks** itself: no new Storybook sidebar folder.

```tsx
import { PaperCraftStage } from "./components/video/paper-craft-react";
import type { PaperCraftSpec } from "./components/video/paper-craft";
const spec: PaperCraftSpec = {
  version:1, id:"cut-paper", style:"layered", width:960, height:540,
  fps:30, durationFrames:240, seed:4, backing:"#efe4d7", light:"#fff2d8",
  layers:[{id:"ridge",depth:3,color:"#5f7b74",
    path:"M0 380 Q300 180 570 360 L960 400 V540 H0 Z",
    motion:"rise",pivot:[480,400],enterFrame:12,durationFrames:42}]
};
<PaperCraftStage spec={spec} frame={120} tooth={0.5}
  shadowStrength={0.7} edgeStrength={0.6} />;
```

**Cut geometry:** 1–128 separate opaque layers, 0–32 depth, each a bounded, closed SVG contour with optional true even-odd cut-out `holes`. Use anchored pivot sheet coordinates for swing/unfold/rise. Invalid/malformed runtime input fails validation. **Frame time:** absolute nonnegative integer, repeatable seed, no local timers, reduced motion resolves to static assembled artwork and disables parallax. **Material controls:** `tooth`, `shadowStrength`, `edgeStrength` all clamped 0–1; paper colors are six-digit opaque hex.

**Film integration:** existing `paper-craft-study` slot accepts `medium` (layered, kirigami, pop-up, lightbox, shadow-puppet) and nonnegative integer `offsetFrame`; match portrait/landscape from output size. Custom films can pass their own `PaperCraftSpec` directly to the React stage.

**Material honesty:** edge catchlights, genuine geometric apertures, independent cut stock and deterministic contact shadows differ from a flat-paper video filter. But axis-specific physical folds, hinging constraints/tabs, translucent tissue optics, advanced actor rigs and user/ArtCraft visual approval are not yet implemented. Follow the [visual review log](../35b-paper-craft-theatre-visual-pass-log.md).

## Character construction

For editable wildlife cutwork, construct a visually complete static animal before animating its parts. The garden bird now uses local coordinates multiplied by one uniform `birdScale` for horizontal and portrait outputs. The branch continues into the bird's perch and talons; anatomical regions include the head-body outline, breast/throat, pierced eye, crest, beak, wing with true feather apertures, coverts, tail feathers and feet. Depth order separates real paper stock. The moving wing's pivot stays at its shoulder. This illustrates a character-specific fixture rather than a generic anatomy solver.


## Native botanical sculpture generator

The installable paper-craft registry pack includes components/video/paper-botanical-kit.ts. This is a separate, original high-detail paper sculpture scene with sculpted flowers, lace-cut fern veins, pierced moth wings, layered stock, seed sprays and an engineered-looking shadowbox frame. No third-party source artwork is embedded.

Usage example:

    import { paperBotanicalSpec } from "./components/video/paper-botanical-kit";
    const spec = paperBotanicalSpec("layered", "landscape",
      { palette:"nocturne", detail:1, seed:37 });
    <PaperCraftStage spec={spec} frame={190} shadowStrength={.95}
      tooth={.6} edgeStrength={.7} />;

Choose palette = "ivory" for monochrome sculptural paper or "nocturne" for midnight colored cardstock. Detail 0–1 changes the amount of actual leaf and petal geometry. The scene has a bounded maximum of 128 separately drawn sheets, stable seed-derived imperfections, and a real portrait layout without nonuniformly stretching wings or petals.

FilmStage's existing paper-craft-study slot accepts artwork="botanical", palette, detail and seed alongside medium. Production film: examples/film/paper-craft-botanical.film.json. Six Storybook botanical studies remain directly in Video production / Film Looks, *not* a new sidebar folder.

See docs/research/paper-craft-artcraft-botanical-study.md for observed references, the source-to-geometry plan and artistic limitations.

### Chromatic cut-paper relief

Two new saturated paper-stock sets, **rainforest** and **wildflower**, complement the existing nocturne and ivory stock families. A new optional 0–1 `colorLayers` option controls the **quantity of real cut shapes**, not CSS opacity or a color grade.

```tsx
const spec = paperBotanicalSpec("layered", "landscape",
  { palette: "rainforest", detail: 1, colorLayers: 1, seed: 37 });
```

At full density, the generator adds more than 30 differently colored independent cardstock plates, including a concentric pressed-paper ring, accent leaflets attached to existing fronds, extended 13-petal outer crowns, nested flower hearts and stamen beads, satellite-bloom underlayers, and actual paper wing linings visible through apertures. Rendering remains bounded at `MAX_PAPER_LAYERS=128` and frames stay deterministic. Different palettes use indexed stock colors across individual blooms, not a uniform global hue change. `colorLayers=0` retains the simpler original silhouette.

Use Storybook's existing **Video production / Film Looks** controls to compare the color sets and adjust `colorLayers`, `detail`, `tooth`, `edge`, `shadow`, `seed`, paper medium and aspect ratio. The original garden and earlier botanical stories remain available without any new Storybook sidebar folder. The native dual-output, three-scene film is `examples/film/paper-craft-chromatic.film.json`.

These are expressive cinema cutouts; they are **not** manufacturer-ready laser/cutter paths, real physical pleating or calibrated 3D foam-board spacing.
