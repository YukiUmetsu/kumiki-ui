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

**Cut geometry:** 1–80 separate opaque layers, 0–32 depth, each a bounded, closed SVG contour with optional true even-odd cut-out `holes`. Use anchored pivot sheet coordinates for swing/unfold/rise. Invalid/malformed runtime input fails validation. **Frame time:** absolute nonnegative integer, repeatable seed, no local timers, reduced motion resolves to static assembled artwork and disables parallax. **Material controls:** `tooth`, `shadowStrength`, `edgeStrength` all clamped 0–1; paper colors are six-digit opaque hex.

**Film integration:** existing `paper-craft-study` slot accepts `medium` (layered, kirigami, pop-up, lightbox, shadow-puppet) and nonnegative integer `offsetFrame`; match portrait/landscape from output size. Custom films can pass their own `PaperCraftSpec` directly to the React stage.

**Material honesty:** edge catchlights, genuine geometric apertures, independent cut stock and deterministic contact shadows differ from a flat-paper video filter. But axis-specific physical folds, hinging constraints/tabs, translucent tissue optics, advanced actor rigs and user/ArtCraft visual approval are not yet implemented. Follow the [visual review log](../35b-paper-craft-theatre-visual-pass-log.md).

## Character construction

For editable wildlife cutwork, construct a visually complete static animal before animating its parts. The garden bird now uses local coordinates multiplied by one uniform `birdScale` for horizontal and portrait outputs. The branch continues into the bird's perch and talons; anatomical regions include the head-body outline, breast/throat, pierced eye, crest, beak, wing with true feather apertures, coverts, tail feathers and feet. Depth order separates real paper stock. The moving wing's pivot stays at its shoulder. This illustrates a character-specific fixture rather than a generic anatomy solver.
