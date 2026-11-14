# 35B — Coloured-pencil science / editorial motion: expanded video research

**Study date:** 2026-11-14. **Status:** research-backed design directions, not visual acceptance. Search results and source descriptions were inspected, plus our *own* actual Chromium frames from PR #155. External videos were not systematically decoded or frame-inspected. Do not claim timed shot analysis until it has been done.

## Selected playable references and technique anchors

| Source (open video/page) | Scope and useful production observation | Kumiki implication |
| --- | --- | --- |
| [Smithsonian NMNH — Creating a Scientific Illustration: Coloring the Fish](https://naturalhistory.si.edu/education/natural-history-summer-explorations/deep-sea-animal-adaptations/fishes) | 9m27s real scientific specimen colouring; exact detail placement and form are central. | Preserve topology and observed details; original authored contour with specimen ID, provenance and optional figure callouts |
| [Daria Studio — Detailed Botanicals with Regular Pencils](https://www.youtube.com/watch?v=xEwRRxM129g) | Long, near-real-time graphite botanical studies, with individual subjects starting 00:49, 15:12, 20:03, 30:46, 42:23 and 49:36; labelled final sheet | Independent detailed subjects, variable pencil grades, legible plate index; do not force a single uniform stroke pass |
| [How to Color Properly with Colored Pencils](https://www.youtube.com/watch?v=VLSBg375yRE) | Listed chapters: layering 11:22; light first passes 12:24; change stroke directions 13:37; burnishing 16:00 | Light underdrawing → layered colour → selective smooth burnished regions, not a universal crosshatch |
| [Blooming Solitude — Botanical Illustration Process](https://www.youtube.com/watch?v=VTL_dFLqsys) | Time-lapse of original coloured-pencil botanical drawing; author describes outline, initial light base, deeper colour/shadow and highlight stages | Nonuniform pressure and progressive light-to-dark value study |
| [Smithsonian Gardens — The Art and Science of Botanical Illustration](https://www.si.edu/object/art-and-science-botanical-illustration-ft-alice-tangerini-smithsonian%3Ayt_-1sIkiQXDE8) | 3m03s: illustrators capture subtle differentiating plant traits | Evidence-bound silhouettes and detail marks, not invented specimens |
| [Natural History Museum of Utah — Scientific Illustration](https://nhmu.utah.edu/articles/art-and-details-scientific-illustration) | Article links an Allosaurus skull timelapse; sculptural pits, divots, creases and highlight 'sweet spots' | Curvature-following hatch plus focal patches of high detail; preserve paleontology source constraints |
| [Botanical Art & Artists — Coloured-pencil video guide](https://www.botanicalartandartists.com/video-tips-coloured-pencils.html) | Multiple real artist videos, including a 37-minute illustrated discussion of stroke choices and layering | Reference bank for varied edge pressure, working around leaf veins and gradual shading |
| [Princeton Art Museum — Drapery & Anatomy with Coloured Pencils](https://artmuseum.princeton.edu/art/stories-perspectives/video/drawing-collections-drapery-anatomy-colored-pencils) | Museum studio drawing instruction for drapery/anatomy | Direction maps should follow folds and physical forms, not a single hatch angle for every shape |
| [VT Perspective Gallery — Easy Coloured Pencil Techniques](https://campuslife.vt.edu/content/campuslife_vt_edu/en/student_centers/Squires/Perspective_Gallery/art-reach/_jcr_content/content/vtcontainer_1408450788/vtcontainer-content/vtmultitab_copy/vt-items_2/download/file.res/Easy%20Colored%20Pencil%20Techniques.pdf) | Hatching, crosshatching, stippling, scribbling; layered value and selective burnishing | Provide genuinely different mark families and material transitions, with pressure and spacing |
| [Vimeo — Animated Journal Spread](https://vimeo.com/298606461) | Stop-motion evolution of an illustrated mixed-media journal | Real paper page structure, transparent sequential reveals, readable holds and stop-motion option |
| [Vimeo — Secret Plot of Stationery](https://vimeo.com/1203163968) | Pencil drawing animation with mechanical erase and 4H–9B graphite texture | Deterministic erase/redraw and grade/opacity controls for transitions |
| [Lemo — Coloured-Pencil Science Illustration](https://lemomo-ai.github.io/lemo-opuscar/styles/colored-pencil/) | 0m51s science animation. Described as a 3D cutaway world redrawn as pencil texture, with graphite contours and paper labels | Future authored 2.5D/3D projection support must retain paper-space pigment; don't copy demo composition, characters, data or assets |
| [Wisko — Whiteboard-style videos](https://wiskoai.com/videos/) | Draw-region, whole-scene reveal and flow-ink visual strategies with separate educational/data formats | Draw part-by-part based on narration and semantic focus, keep library style neutral |
| [Project Learning Tree — Coloured Pencil Stop Motion](https://www.plt.org/ee-resource/colored-pencil-stop-motion-video/) | Original animated-pencil music video and behind-the-scenes coverage | Optional real-contact motion / pencil point follow; don't replicate source footage |
| [ReelStyles — Handdraw Story](https://reelstyles.com/style/handdraw-story) | Sample of line reveal, colour fill, subject life after reveal and multi-page film | Independent story objects and held motion, rather than a single still illustration |

**Rights:** all references are *viewing/technique research* only. No frames, art, narration, music or copied proprietary implementation are bundled. Video-link access does not grant reuse rights. Public-domain methods (pressure, stippling, burnishing, crosshatching, measured drafting) can be independently implemented.

## Review of our original first browser proof

Run [43572716668](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43572716668) captured two aspect-ratio compositions and the first stage of a new stroke pass. The images show disciplined legible text but a rigid planar leaf silhouette, low pigment density, prominent outline, insufficient local gradient / shadow variation, little botanical edge irregularity and a largely empty background. The portrait composition has sound reading-room separation but lacks secondary detail and author-selected zoom. The prior 140×140 repeat artifact was fixed using a paper-space 1024×1024 pattern. Broken strokes help, but not yet photographic pencil realism.

## Material and cinematic vocabulary to implement

| Domain | Generic operations needed | Material / story gate |
| --- | --- | --- |
| Biology, anatomy, paleontology, mineralogy | Authored regions, cross-sections, micro-detail, callouts, arrows, cutaway, labels | Provenance required for numerical or specimen-specific claims |
| Engineering, architecture, space | Scaled drawing, diagram arrows, construction overlay, elevation/section, perspective and camera move | Don't infer measured dimensions; explicitly supplied units |
| History, geography, travel | Hand-illustrated maps, plates, paths, geographic reveal, date/provenance captions | Maps and labels use source data rather than visually invented geography |
| Mathematics and data explainers | Shape-to-chart, discrete highlight, point-by-point visual reasoning, typed captions | Values supplied by client; pure graphical primitives must not fabricate data |
| Character / story / art films | Part ID, acting states, layered background and foreground, page-turn, parallax and residual held motion | Character identity preserved across shots; don't procedurally reinvent faces |
| Product / editorial videos | Label and arrow, exploded view, detail zoom, before/after, page sequencing, title/end card | Assets and rights supplied by caller; typography stays accessible |

### Engineering phases

1. **CP1 (current):** stroke, pressure, seeded paper tooth, specimen-specific direction and absolute-time reveal. Functional implementation; visible finish **not approved**.
2. **CP2 (this extension):** JSON-safe composition scene with authored arbitrary vector regions, per-shot camera framing, annotation and diagram overlays, path draw-on, type-safe evidence, reduced motion, multi-subject scenes and production-film examples. The original FD1 timeline remains the only timebase.
3. **CP3 (future):** edge-aware shading/tonal height maps, stipple and scribble brushes, selective burnishing, highlight removal/erase, 2.5D cutaway, authored depth layers and stable zoom LOD.
4. **CP4 (future):** character-part rigs and optional source-backed 3D camera projections, evidence-grounded diagrams/charts, audio-aligned drawing, reusable style recipe compiler and preset discovery.

**Visual approval still requires:** actual normal-speed 16:9 and 9:16 encoded films, stable out-of-order screenshot tests, close-up anatomy/facet review and independent human judgment. A CI pass never means 'absolutely beautiful.'
