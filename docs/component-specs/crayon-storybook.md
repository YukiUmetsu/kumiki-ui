# Crayon Storybook (experimental material-native extension)

**Registry ID:** `crayon-storybook`  
**Source:** `registry/video/materials/crayon.ts`, `crayon-react.tsx`  
**Storybook:** Video production → Film Art Styles → Crayon Storybook  
**Portable FilmDocument:** `examples/film/crayon-storybook.film.json`  
**Visual-approval state:** `not-reviewed` (automated tests are not visual acceptance)

## Original visual direction

Two independently authored themes share a reusable wax renderer. **The Lantern Trail** shows a fox finding its way through a deep-blue night, with waxed moon, dense hills, tall pines and lantern-rays drawn by hand. **One Little Seed** uses a sage-and-teal morning, pink-orange blossoms and a textured golden sun. Both provide 16:9 and 9:16 layouts; no external images, licensed characters, copied story, font download or audio dependency.

The material is not a photographic crayon filter:

- `crayonMarks(bounds, {seed, pressure, spacing, passes})` generates real overlapping curved deposits with stroke-specific pressure, scumble facets and scraped wax gaps.
- `WaxRegion` clips those deposits to authored silhouettes. Coverage is built by deposited strokes rather than a flat SVG fill with noise on top.
- `Paper` renders independently seeded paper fibers and a repeated, stable pore mask. `paperTooth` changes pore density/depth rather than changing the seed at every frame.
- `crayonProgress(frame,first,last,index,count)` reveals **each actual stroke** in an authored stagger. No timer, mutable simulation state or random rendering path exists in the renderer.
- The same absolute frame can be rendered in arbitrary order, in a browser or in the production FilmStage slot. Reduced motion shows the finished page.
- Narrative type uses a separate legible serif layer so paper and strokes never obscure captions.

### API

Install `crayon-storybook` and render `<CrayonStorybook frame={...} aspect="landscape" story="lantern" />`. Supported props:

| Name | Values | Behavior |
| --- | --- | --- |
| `frame` | nonnegative safe integer | Absolute timeline frame, 0 through 419 used by the authored story |
| `story` | `lantern` / `garden` | Original narrative illustration |
| `aspect` | `landscape` / `portrait` | Native 960×540 or 540×960 layout |
| `seed` | safe integer | Pinned paper/brush stochastic pattern |
| `pressure` | 0…1 | Wax line width and deposited opacity |
| `paperTooth` | 0…1 | Density and size of uncovered paper pores |
| `reducedMotion` | boolean | Render static end-state at any requested frame |
| SVG props | SVG-compatible | `style`, `aria-hidden`, and other display attributes |

The illustrative neutral character is part of the **demo**; the core `crayonMarks` / `WaxRegion` material process can be reused with other authored SVG silhouettes. Subject asset ingestion and full media-to-media transitions are not shipped in this slice.

### Production proof

The 420-frame (14 s at 30 fps), three-shot FilmDocument uses the existing `slot` scene type in `FilmStage`, not another timeline or an unbounded playback loop. Its shot frames are 0…119, 120…269 and 270…419. The slot adapter adds each scene's `offsetFrame` to its local frame. The second original scene, the flower garden, is available as a separate interactive Storybook story.

```bash
npm run typecheck
npm run registry:validate
npm run catalog:check
npm run test -- tests/crayon-storybook.test.tsx
npm run film:check -- examples/film/crayon-storybook.film.json
npm run film:frame -- examples/film/crayon-storybook.film.json --frame=360 --only=landscape --out=dist/crayon-proof
npm run film:frame -- examples/film/crayon-storybook.film.json --frame=360 --only=portrait --out=dist/crayon-proof
npm run film:render -- examples/film/crayon-storybook.film.json --only=landscape --out=dist/crayon-proof
```

## Reference / evidence packet

**Style research, without reproduction.**

- Roadmap board: [35a material-native reference gallery](../35a-material-native-style-reference-gallery.md), Crayon Storybook entry.
- [Lemo-Opuscar Crayon Picture Book overview](https://lemomo-ai.github.io/lemo-opuscar/styles/crayon-book/): source labels stills at **00:08 / 00:19 / 00:31 / 00:42**, 0:52 runtime, 1280×720. Its film description uses live wax drawing and wash; our scene, character, text, palette and motion are original. We inspected the public page's text and its listed still timestamps, **not** full decoded video frames at normal speed.
- [Philadelphia Museum of Art, Descriptive Terminology for Art on Paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf): notes wax-crayon cohesion, visible oily binder, uneven deposition and clumping (compared to chalk).
- [Stockmar wax-crayon guidance](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf): describes tooth-sensitive pigment density and translucent layering.

**QA still required:** export real 16:9 and 9:16 films; inspect frames before and after each drawing event, then watch the complete encoded films at normal speed. Evaluate whether density, grain, strokes and outlines read as actual wax at thumbnail size, whether the landscape title overlaps the pines/fox, and whether the portrait illustration respects the lower caption zone. Compare static-sample re-seek pixels and performance on Chromium, check CJK captions separately when integrated into a generic caption system, and record an independent human reviewer/date/result. No screenshot or CI pass alone authorizes the visual state `accepted`.

**Limitations:** no pigment melting, calibrated light scattering, watercolour wash/wax resist, user-provided character rig, actual page-turn physics, original recorded foley, or generic cross-media transition in this experimental extension.


## Generic CRAYON1 engine — author any subject without changing renderer code

The two original storybook illustrations remain examples, **not the public scene grammar**. New work should use `CrayonScene` with a validated `CrayonSceneSpec`, then assemble those scenes into the existing FilmDocument. This allows science diagrams, maps, product sketches, hand-drawn charts, children's stories and educational explainers, provided that the author supplies their own original vector shapes and accurate data.

**Source modules:** `crayon-scene.ts`, `crayon-scene-react.tsx` (included in the same `crayon-storybook` registry item). They depend only on local wax primitives, SVG and React; no runtime model, image generator, WebGL, remote font or new package is needed.

The data grammar supports:

- **`wax`**: authored `d` path, subject bounds, three wax tones, 0–1 pressure, 4–32 pixel spacing, optional `angle` for directional rubbing. Pigment arrives as multiple lifted and overlapping strokes clipped to the author's actual geometry.
- **`contour`**: dry, double-edged drawing path, adjustable width/opacity, frame-addressed reveal.
- **`lettering`**: up to six explicit lines, readable serif/sans/mono choices with CJK fallbacks, font-size, line height and optional high-contrast backing. `screenSpace: true` keeps captions independent of camera moves.
- **`placement` and `motion`**: per-element translation, scale, rotation, keyframe easing and 1–4-frame held actor poses. The same semantic element ID and wax texture remain stable across frame seeks.
- **`camera`**: scene-coordinate focus/zoom keys with pure interpolated sampling; paper and all world elements share the transform, while screen-space type does not.
- **`paper`, `paperTooth`, `seed`**: explicit paper stock, pore density and seeded fiber/wax imperfection. Material parameters are bounded and validated.
- **`reducedMotion`**: static completed illustration, including final camera and object poses, rather than removing the content.
- **`inspectCrayonScene(unknown)`**: runtime contract validation for IDs, color roles, SVG commands, dimensions, timing, camera keys, bounds, text and author parameters. Unsupported types fail explicitly.

Example of a neutral new subject (the object could instead be a leaf, animal, building, planet, molecule or diagram component):

```tsx
import { CrayonScene } from "./components/video/materials/crayon-scene-react";
import type { CrayonSceneSpec } from "./components/video/materials/crayon-scene";

const scene: CrayonSceneSpec = {
  version: 1, id: "my-illustrated-scene",
  width: 960, height: 540, durationFrames: 180,
  seed: 41, paper: "#FAF0DD", paperTooth: .6,
  elements: [
    {
      id: "illustrated-leaf", kind: "wax", timing: { start: 10, end: 110 },
      d: "M480 115 Q645 190 502 404 Q360 310 480 115Z",
      bounds: { x: 355, y: 110, width: 300, height: 300 },
      colors: ["#709F77", "#507E67", "#B6C99B"],
      spacing: 7, pressure: .88, angle: -18,
      motion: [{frame:0,x:0,y:0}, {frame:179,x:12,y:0}],
      poseCadence: 2
    },
    {
      id: "leaf-contour", kind: "contour", timing: { start: 110, end: 160 },
      d: "M479 128 Q488 266 494 394",
      color: "#3C675A", width: 4.2
    },
    {
      id: "caption", kind: "lettering", timing: { start: 115, end: 165 },
      screenSpace: true, x: 45, y: 470, fontSize: 27,
      lines: ["The leaf stores energy."],
      color: "#30485C",
      backing: {color:"#FAF0DD",padding:12,width:540,height:44,radius:8}
    }
  ],
  camera: [
    {frame:0,focusX:480,focusY:270,zoom:1},
    {frame:179,focusX:490,focusY:260,zoom:1.06}
  ]
};
export const LeafFrame = ({frame}:{frame:number}) =>
  <CrayonScene spec={scene} frame={frame} />;
```

**Production without hand-coded slot implementations:** use the existing FD1 `recipeId: "slot"`, `content.slot: "crayon-scene"`, and `content.props.scenes: { landscape: CrayonSceneSpec, portrait: CrayonSceneSpec }`. The slot validates the selected scene's dimensions and frame count. The same slot accepts `content.props.scene` for one output shape.

See `examples/film/crayon-scene-three-subjects.film.json` for a complete three-subject production film (water, illustrated numbers, village) with independent 16:9 and 9:16 compositions. It uses the same native FilmStage timing, export, sound integration and existing cuts as any other FilmDocument. `src/video/crayon-scene-fixtures.ts` demonstrates three more source-authored subjects. Storybook contains **Crayon Scene Engine** with interactive subject, output, seed, paper and frame controls.

```bash
npm run test -- tests/crayon-storybook.test.tsx tests/crayon-scene.test.tsx
npm run film:check -- examples/film/crayon-scene-three-subjects.film.json
npm run film:render -- examples/film/crayon-scene-three-subjects.film.json --only=landscape --out=dist/crayon-general
npm run film:render -- examples/film/crayon-scene-three-subjects.film.json --only=portrait --out=dist/crayon-general
```

**What this does not automate:** interpreting arbitrary raster photos into credible wax strokes; inventing or reliably rigging a new character from text; typography line-breaking for arbitrary-length Japanese copy; exact physical wax optics; arbitrary path morphing; and subject-specific story planning. Authors or upstream generation tools must supply original SVG paths/characters, text, values, narrative timing and two aspect-aware layouts. This boundary prevents a generic SVG filter from masquerading as a physically crafted crayon illustration.

**Updated qualification gates:** `tests/crayon-scene.test.tsx` exercises six independent 16:9/9:16 subjects, schema-negative cases, pose/camera seeking and FilmStage integration. The portable film has both outputs. `tests/e2e-storybook/crayon-scene.spec.ts` exercises four actual browser compositions; `.github/workflows/crayon-browser-qa.yml` runs inexpensive on-PR Chromium checks and reserves full encoded-film exports for manual `workflow_dispatch`. The full normal-speed video and independent human art review are still mandatory before marking `accepted`.
