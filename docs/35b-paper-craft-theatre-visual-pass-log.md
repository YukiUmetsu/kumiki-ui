# 35B — Paper craft theatre: seven-pass art log and qualification

**Scope:** ROADMAP 35, Phase 6 bounded prototype; PR [#158](https://github.com/YukiUmetsu/kumiki-ui/pull/158).
**Status:** implementation in review; visual acceptance **not yet granted**.
**Mediums:** layered cut cards, kirigami/unfold, pop-up stage, transmitted-light paper lightbox, shadow-puppet screen.

## Reproducible story and contracts

- Renderer: `registry/video/paper-craft-react.tsx`; evaluated geometry: `registry/video/paper-craft.ts`. Both resolve from absolute `frame`, never mutable sequence state.
- Source-fair original art: `src/video/paper-craft-demo.ts`. All painted regions are independent SVG contours; the moon, leaf, flower and eye have physically punched apertures.
- Runtime: `src/film/film-slots.tsx` consumes `paper-craft-study` from the existing FD1 `renderSlot`, preserving FilmStage timeline semantics. Five-shot proof: `examples/film/paper-craft-garden.film.json`.
- Interactive: `src/video/paper-craft.stories.tsx` → Film Art Styles / Paper Craft Theatre. Controls: five media, landscape/portrait, exact frame scrubbing, play/pause, surface tooth, shadows and reduced motion.
- Regression: `tests/paper-craft.test.tsx` asserts both sizes, five media, holes, stable shuffled seeking, low-motion end state, pivot amplitude and film-slot compilation.

## Seven successive offline visual passes (November 14, 2026)

The local art-contact sheet was rasterized from an independent SVG study using the same authored garden contours. This was **not** the full Storybook browser renderer; do not treat it as film-output certification.

| Pass | Concrete critique / change | Observation |
| --- | --- | --- |
| 01 — Silhouette | Base moon and layered ridge need stronger compositional scale | Large negative space successfully gives the moon a focal point; material still reads as flat vectors |
| 02 — Aperture | Replace painted inner marks with actual removed openings | Crescent, water and cloud cut-outs become visible against lower layers; negative-space path winding required care |
| 03 — Botanical detail | Add independent branch/leaves, segmented bird wing and flower | Forms are legible at 640 px, but joints need a real pivot rather than the whole bird translating |
| 04 — Separation | Add shadow/edge thickness per independent cut card | Cast separations clarify depth; border must not cast a huge shadow over the scene |
| 05 — Stock tooth | Anchor deterministic fibres to sheet coordinates | Surface gains tactile breakup without randomized frame flicker |
| 06 — Optical medium | Introduce rear lamp for lightbox and screen/rods for puppetry | Backlit palette, overlap and visible control geometry distinguish these scenes from front-lit collage |
| 07 — Finish and typography | Add cut-card frame and restrained informational accents | **Defect found:** the initial border painted over the whole composition in the independent renderer. Changed to compound even-odd cut paths + clipPaths; removed border shadow and moved labels out of botanical silhouettes. Rerendered successfully |

**Local proof created:** `paper_craft_seven_passes.jpg`, `paper_craft_showcase.mp4` (10 s, 640×360, 24 fps, silent). These artifacts were generated in the task runtime, **not vendored to GitHub**. The MP4 is a parallel motion-design study; use a browser-exported FilmStage render for final acceptance.

## Research provenance

- [ROADMAP 35A source board](35a-material-native-style-reference-gallery.md) links style-specific playable films for red cut paper, pop-up, paper lightbox and shadow puppetry. It also links an original-process [UNESCO paper-cut film](https://ich.unesco.org/en/video/1630), [UNESCO shadow puppetry](https://www.youtube.com/watch?v=8-mzqxZNp2g), and [University of Warwick pop-up mechanisms](https://warwick.ac.uk/fac/sci/wmg/about/outreach/resources/paperengineering/).
- This pass inspected the board's reference metadata and material principles; **normal-speed external reference playback was not completed**. The original reference films/stills/audio were not downloaded or embedded.
- No trademarked character designs, traced imagery, remote media or unlicensed music are shipped in PAPER1.

## Acceptance still required

1. Clean CI typecheck, focused Vitest, catalog validation and registry install smoke.
2. Browser 16:9 and 9:16 exports at opening, onset, folding peak and resolved holds; video must be watched at normal speed.
3. Compare two unrelated subjects. Current fixture is one world in five media; color alone must not masquerade as physical process.
4. Native paper mechanics still require more realistic V-folds/box folds, durable crease geometry, overlapping silhouette contact and true transmitted-light optics. Current pop-up uses a **2.5D authored projection**.
5. Human art reviewer records `accepted` or `needs-revision` explicitly; automated tests cannot grant it.
