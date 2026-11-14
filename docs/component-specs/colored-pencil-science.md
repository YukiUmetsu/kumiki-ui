# Coloured Pencil / Scientific Field Notes (CP1)

**Status:** Implementation candidate; technical checks and normal-speed artistic acceptance are separate. **Visual approval: pending.**  
**Roadmap:** [35](../35-material-native-film-styles-implementation-roadmap.md), "Colour-pencil science art" in [35A](../35a-material-native-style-reference-gallery.md). This user-requested experimental slice does **not** complete Phase 3 brush, Phase 4 watercolor, or Phase 7 calibrated sensor imaging.

## Creative direction

An original field-notebook plate: archival warm paper, graphite construction, successive directional colour-pencil passes, pressure-dependent pigment density, a visible paper tooth, fine contour and vein/facet detail, and sparse scientific labels with no fictional numbers. The film starts with a graphite sketch, physically adds thousands of clipped pencil marks, resolves its details, then holds still. Botanical leaf and mineral facet subjects are independently authored; neither is adapted from a reference-film frame.

Palette roles: archival ivory paper `#F8F2E6`, graphite `#4C5148`, leaf sage `#94A985`, forest `#5C7560`, mineral slate `#718AA0`, amethyst-gray `#9C899B`, muted ochre `#AA9160`. These are **demo colours only**. The public material accepts authored hexadecimal colours.

Reference principles—not copied art:

- [Reference gallery, coloured pencil](../35a-material-native-style-reference-gallery.md): stroke-direction geometry, original graphite contour, texture held during camera motion and cutaways. Gallery includes a comparison film and checkpoints 00:06/00:19/00:30/00:41; these are listed checkpoints, **not claimed playback inspections**.
- [Massachusetts Horticultural Society botanical art](https://www.masshort.org/botanical-art): botanical specimen, restrained annotations, veining and specimen-specific shading. Referenced as observational design, with **no reuse** of source images.
- [Crayola, Claudia Nice: coloured-pencil techniques](https://www.crayola.com/docs/default-source/default-document-library/colored-pencils-tips-techniques-by-claudia-nice.pdf): variable pressure, layering, point sharpness and textured paper. Technique principles only; no copied artwork or text.

## Surface contract

- `registry/video/colored-pencil.ts`: CP1 data types, strict bounded `inspectPencilDrawing`, deterministic seeded hatch geometry and `evaluatePencilMark(frame, timing)`.
- `registry/video/colored-pencil-react.tsx`: standalone SVG `PencilDrawing` with per-region geometric clips, rotated stroke passes, unique instance IDs, paper-space grain and pure frame addressing. `children` is an optional caption/annotation composition slot.
- `src/video/colored-pencil-science.tsx`: original sample artwork: one leaf with vascular traces and a secondary leaf, or differently angled crystal faces. Responsive separately authored type/reading regions in 960×540 and 540×960.
- `src/video/colored-pencil-film.ts` and `examples/film/colored-pencil-science.film.json`: identical three-shot, 353-frame, 30 fps FD1 film. Existing FilmStage owns cuts, frame pacing and formats; `src/film/film-slots.tsx` is only an art-slot adapter.
- `src/video/colored-pencil-science.stories.tsx`: interactive specimen, aspect, paper-tooth, paper-seed, reduced-motion, frame seek and playback; separate FD1 film sample.

### Visual invariants

1. Pencil shade is made of *independent marks clipped to local geometry*, not a photographic overlay; angle, pitch, load and colour are authored per region.
2. Pressure changes the width and optical density; directional layers intersect to build chroma; each line has its own temporal onset.
3. Paper tooth is seeded in paper coordinates and does not change across frames or after the hold. Revisiting a frame must reproduce it.
4. Invalid bounds, excessive mark density, unsupported colours and invalid time inputs fail explicitly; no fallback to generic cards.
5. Graphite contours and specimen details are never read as sensor values; no fabricated labels, species determinations or experimental data.
6. End state is available at `reducedMotion=true` regardless of frame. No instance owns a timer, global counter or asynchronous renderer.
7. Base UI packages do not gain any dependency, image download, font download or render clock.

## Verification and art-review gate

Automated: `npm run typecheck`, `npx vitest run --project unit tests/colored-pencil-science.test.tsx`, `npm run catalog:check`, `npm run registry:validate`. Browser: `npx playwright test -c playwright.storybook.config.ts tests/e2e-storybook/colored-pencil-science.spec.ts` and capture leaf/crystal at initial/deposition/completed frames for **both** formats. Export: `npm run film:check -- examples/film/colored-pencil-science.film.json`, then actual 16:9/9:16 `film:review` and normal-speed `film:render` with a bounded reference comparison.

**Art-review questions:** Are individual strokes clearly visible at full delivery size, or do they merge into a flat vector fill? Is graphite beneath rather than an overly strong digital outline? Do facet-specific directions and leaf venation read organically? Are the hero silhouette and all caption safe zones legible? Is 9:16 still intentionally composed? Do lines show shimmer, moiré, blown-out whites or flicker? Do notes appear only after supporting drawing? Examine at least 0, 34, 100, 180, 275 and 352, plus an out-of-order seek.

**Not accepted merely because tests pass:** human review of encoded horizontal and vertical playback, iterative pencil tooth tuning based on actual pixels, camera/zoom microtexture QA, high-resolution export and measured runtime. Do not mark this style visually approved until those are recorded.
