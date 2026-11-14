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
