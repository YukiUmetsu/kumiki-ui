# 35B — Paper craft theatre: seven-pass art log and qualification

**Scope:** ROADMAP 35, Phase 6 prototype rebased against latest main from original draft [#158](https://github.com/YukiUmetsu/kumiki-ui/pull/158).
**Status:** implementation in review; visual acceptance **not yet granted**.
**Mediums:** layered cut cards, kirigami/unfold, pop-up stage, transmitted-light paper lightbox, shadow-puppet screen.

## Reproducible story and contracts

- Renderer: `registry/video/paper-craft-react.tsx`; evaluated geometry: `registry/video/paper-craft.ts`. Both resolve from absolute `frame`, never mutable sequence state.
- Source-fair original art: `src/video/paper-craft-demo.ts`. All painted regions are independent SVG contours; the moon, leaf, flower and eye have physically punched apertures.
- Runtime: `src/film/film-slots.tsx` consumes `paper-craft-study` from the existing FD1 `renderSlot`, preserving FilmStage timeline semantics. Five-shot proof: `examples/film/paper-craft-garden.film.json`.
- Interactive: `src/video/paper-craft.stories.tsx` → existing **Video production / Film Looks** group; no additional sidebar folder. Controls: five media, landscape/portrait, exact frame scrubbing, play/pause, surface tooth, shadows and reduced motion.
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

## ArtCraft structural refinement (2026-11-14)

Observed process/craft references: [traditional red paper-cut botanical birds](https://www.sohu.com/a/471557319_121124566), [Helen Musselwhite's paper bird diorama](https://www.designswan.com/archives/helen-musselwhites-paper-art-brings-nature-to-life.html), [Calvin Nicholls' anatomical paper bird sculpture](https://www.allaboutbirds.org/news/paper-sculptures/), and [MIT layered paper shadow-box guidance](https://k12maker.mit.edu/uploads/9/7/5/8/97583140/shadow_boxes.pdf). These inform the construction sequence, never tracing or importing a copyrighted image.

Original garden now adds an enclosed tail, separate breast and beak, feather piercings, nine asymmetrically stepped petals, separate pierced calyx and leaf-vein stock. Opaque shadow-puppet stock replaces the prior .83 fill alpha. The new edge-light control varies die-cut rim catchlights, while depth shadows and paper tooth remain independently adjustable. Invalid/unterminated contour strings are rejected; reduced motion now suppresses backlight parallax on every seek.

**ArtCraft gate remains open.** No source/candidate region masks, registered five-axis pixel measurements, actual Storybook frame captures or normal-speed dual-format FilmStage renders were produced in this restricted session. Next: render 0/30/90/140/173 for both aspects, compare topology/occlusion/negative space and delicate edge survival, inspect normal-speed playback, tune from visible evidence, and record human signoff.

## ArtCraft structural reconstruction — rendered-pass 08

GitHub [browser and native FilmStage proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43652491931) passed for all five media and both formats, generating seven browser captures, ten 960×540/540×960 production frames, and a genuine encoded MP4. Actual frames were opened and inspected, not inferred from green checks.

**Visible weaknesses:** the original wing read as a detached red petal, the tail as a large dark slash, the body lacked an anatomically readable head/beak/eye and the bird floated without a continuous perch. Portrait's independent w/h-scaled anatomy looked disproportionately narrow. Existing paper grain, depth shadows and palette were legible, but the animal did **not** meet the requested craftsmanship standard.

**Follow-up geometry:** normalize bird part coordinates to a single physical scale for both outputs; join the rear branch to a continuous perch; redraw body/head as a coherent silhouette, independently constructed throat/breast, cutout eye with underlay, crest, tapered beak, multi-feather tail, pierced shoulder/wing coverts, and connected claw contact. Layered pieces remain independent closed die-cut paths, not a screenshot or animated raster image.

**Next art gate:** the revised source invalidates old preview images. Re-run and inspect the 10-frame portrait/landscape film and Storybook capture; perform aligned region comparison and normal-speed viewing. Artistic acceptance is not yet granted.


## Reference-driven paper botanicals — pass 09

A second original subject was built to avoid relying on palette changes alone. The reusable paper-botanical-kit composes independently shaped seeded flower petals, joined ferns and fine die-cut veins, a layered butterfly with authored apertures, and dimensional cardstock shadows. It contains two high-detail material palettes and aspect-specific peripheral floral arrangements; moving subjects are evaluated at an absolute film frame. See research/paper-craft-artcraft-botanical-study.md.

**Pending visual signoff:** actual browser and FilmStage captures for the current commit must be opened and critiqued for shape, negative-space rhythm, clipping, ocular/wing connection, shadows and portrait placement. The ArtCraft five-axis numerical reference/candidate gate is not satisfied until equivalent semantic regions are measured.

## ArtCraft pass 10 — critique after actual native export

Reviewed successful Chromium captures and both original FilmStage output formats from [initial botanical proof](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43655908826). Source-generated images confirmed the scene is coherent, that both palettes show paper depth, and that portrait proportions are correct. **Critical visual weakness:** the butterfly fore/hind wings were broad nearly featureless drops, materially much simpler than the reference craftsmanship. Ivory paper relief was especially low-detail.

Code correction: replace smooth oval wing outlines with multi-scalloped continuous cuts, increase genuine forewing perforations to 13 per side and hindwing perforations to 8 per side, add four different tapered vein bands to each forewing and three to each hindwing, emboss nine fine petal cuts per inner flower corolla, perforate the moth abdomen, and mirror wing swing directions. Memoize the costly scene geometry during Storybook playback. Verify the new screenshots before release; the first run is no longer sufficient evidence.


## ArtCraft pass 11 — physical continuity and efficient CI

Reviewed production and Storybook images from the revised wing/perforation pass (the prior approval evidence is visually superseded). New detail is clearly legible in color and ivory, with correct portrait proportions and no translucent subject stock. The aspect-only flower sprays, however, stopped just outside the circular papercraft mat. The rachis now begins **inside** the medallion radius so the flower and stem have a visible physical bridge to the main relief in both 16:9 and 9:16. A regression asserts this geometric overlap.

The expensive browser/film CI job now tests only the latest botanical studies and new three-scene film; older paper art browser suites remain in source for local runs. It captures a two-aspect native film frame and a 108-frame true production-slot preview. The cheaper targeted workflow still runs all paper unit tests and validates both older and newer JSON film documents.


## ArtCraft pass 12 — real output rejects straight-line supports

The actual 16:9 and 9:16 production images of pass 11 revealed a striking failure: the connected peripheral asters were now tethered by thin straight horizontal/vertical lines, which read as technical crosshairs rather than believable paper vines. Replaced each line with one closed S-curved ribbon and four individually tapered leaf blades built from the true ribbon Bézier anchors. The vine ends at its flower center and starts inside the circular medallion; nothing extends uselessly past the blossom. This is the topology-plus-craft correction required before merge.

## Chromatic paper craft pass 13 — dimensional color study

Researched saturated layered botanical and butterfly relief by Helen Musselwhite, multi-layer flowers by Maud Vantours, and nested cut-paper color rhythm by Jen Stark. Expanded the installable paper cut budget from 80 to 128 stable opaque sheets and created two saturated palettes: rainforest and wildflower. The new `colorLayers` control changes real cut-stock count; additional sheets include attached fern accents, outer/inner flower crowns, seed beads, punched-wing backings, peripheral floral tiers and a decorative ring.

Focused tests now assert color variety, 30+ extra paper layers, physical hole/shape order, 128-layer abuse rejection and unchanged reduced-motion/seed behavior. Storybook's existing Film Looks section receives three configurable examples; the 16:9/9:16 native three-shot film is portable. **Do not merge until actual screenshots and native export at the current commit pass manual visual review.**

## Chromatic ArtCraft pass 14 — corrections after real screenshot critique

Manually opened successful FilmStage 16:9 rainforest/wildflower and 9:16 rainforest frames from PR #251's first visual proof. The new saturated stocks and construction are visible, but the primary flowers still read as pointed starbursts and the moth upper/lower wing bodies contain large uninterrupted color fields. The early fern-overprint roots also did not exactly follow the original rachis curve.

**Changes implemented:** Broad rounded lips formed with four closed cubic arcs on the outer and under-petal crowns, separately colored inner vs outer cardstock on each flower, stronger physically layered dark/light contrast, four new colored cut-panel shapes on the moth's fore/hind wings, and six accent leaflets per frond repositioned along the actual rachis line. The wing color panels have explicit shared shoulder/abdomen pivots and remain distinct cut pieces. Follow the current-commit screenshot and native-film proof, not the superseded first-pass captures.
