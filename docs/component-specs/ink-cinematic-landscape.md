# Code-painted Chinese ink cinematic scene engine (INK7)

**Status:** code-first production prototype, 2026-11-14. **Art-direction targets:** the two approved reference frames supplied in conversation (a contemplative mountain traveler; a scholar reading a scroll beside a river). Their source images are **not bundled or traced**. All displayed scenery and actors in this pack are authored SVG with independent objects and material behavior. The likeness is a direction, not a pixel-level recreation.

## Architecture

- `registry/video/ink-cinematic-scene.ts` — small validated **data-only scene specification**, two editable recipes, original motif objects, reusable art controls, and the pure frame evaluator. Independent of React, Storybook and the editor.
- `registry/video/ink-cinematic-scene-react.tsx` — original layered mountains, directional rock marks, pine needles, willow leaves, bamboo, architectural pavilion, stone bridge, river, mist and painterly ground, with separate parallax/wind/river/bird animation. Reuses INK1 `inkOutline`, `flyingWhite` and `inkHash` for structural pressure strokes.
- `registry/video/ink-cinematic-scholar-react.tsx` — full-figure original code-drawn scholar with animated walking feet and body, wide opaque sleeves, cloth planes, collar, face, head covering, independent fingers, a thinking hand or two-hand scroll hold.
- `src/video/ink-cinematic-landscape.stories.tsx` — reusable 2-shot film (mountain to river) through the **existing FilmDocument → FilmStage → VideoExportStage** pipeline. Never invent another timeline or render a still PNG behind the actor.

The same source is available in Storybook **Video production / Film Looks / Chinese Ink / Cinematic Landscape Engine**. Choose either scene, 16:9 or 9:16, play or scrub, and adjust motif detail, ink, mist, wind, camera, paper grain, and stable seed. The two export stories produce actual MP4s and use the same React renderer as interactive Storybook.

## Creating any scene in this style

```tsx
import { makeInkCinematicSpec } from "./components/video/ink-cinematic-scene";
import { InkCinematicScene } from "./components/video/ink-cinematic-scene-react";

const scene=makeInkCinematicSpec("riverside-scroll",{
  output:"landscape",
  seed:173,
  art:{detail:.95,ink:.79,mist:.72,wind:.32,camera:.6,grain:.35},
  actor:{x:440,y:655,scale:1.26,travel:90,gesture:"read-scroll"},
});
// Data-only customization: create other arrangements without editing renderer.
const custom={...scene,motifs:[
  ...scene.motifs,
  {id:"extra-near-pine",kind:"pine" as const,x:1170,y:638,scale:.54,depth:2 as const},
]};
const frame=104;
const image=<InkCinematicScene spec={custom} frame={frame}/>;
```

The image is an **animated code-rendered SVG scene** with independently drawn layers. Copy a template; move, scale, delete or add motifs; choose different actor positions and gestures; and adjust the material/direction parameters. The bundled motion is frame-pure and time-bounded so a project can seek to any frame in a render farm and receive the same geometry.

### Intentional restrictions

- The style is a curated 2D painting grammar, **not** a prompt-to-image engine that automatically paints arbitrary historical buildings, people, animals or unseen views. Its object vocabulary must be expanded by artists/developers for new subjects.
- The code is a symbolic/approximate facsimile of traditional **gou / cun / ran / dian** rock, pressure ink marks, and layered xuan-paper washes; it is not a physically calibrated fluid/pigment simulator.
- The currently bundled scholar has two staged gestures and a simple articulated walk, not generalizable inverse kinematics and cloth simulation. Further rig and silhouette work is needed for close-ups and film-quality character acting.
- 9:16 uses an independently chosen safe viewBox and actor position instead of scaling a 16:9 screenshot. Artists still need to approve both crops at full output size.
- Source reference rights are separate; there are **no** new external art/font/clip dependencies and no downloaded painting textures. The generated inspiration stills are not exported with the library.
- Exported film can be used in other videos, but 30 fps motion and aesthetic quality must be reviewed at normal playback speed, not accepted from unit-test pass status alone.

## Verification

Run `npm run typecheck`, `npm run registry:validate`, `npx vitest run --project unit tests/ink-cinematic-scene.test.tsx`,
`npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/ink-cinematic-scene.spec.ts`, then use `npm run video:export` on `video-ink-cinematic-landscape--production-export` or `--portrait-export`. Capture both scenes at early/mid/late frames. Reject missing limbs, paper/actor palette discontinuity, flat mountains, harsh repetitive trees and any scene that simply moves a whole still behind a character.
