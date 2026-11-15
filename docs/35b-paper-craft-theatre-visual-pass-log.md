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

## Pass 15 — paper object reference study and reusable object library

Studied subject-specific construction from Diana Beltrán Herrera (kingfisher anatomy, paper insects), Helen Musselwhite (handcrafted canal-side architecture) and Jennifer Collier (rolled paper camera barrel and teacup set). Added five new authored paper-sculpture subjects with independent closed stock geometry; kept both original garden and multi-color botanical work intact. The object generator stays within the 128-layer render budget, and uses exact-frame movie timing for both 16:9 and 9:16 output.

**Review gate:** Inspect real browser screenshots for all five fully assembled objects and portrait; compare silhouette, recognizable anatomy, negative-space connectivity, feather/wing/roof/lens joinery, paper depth and visual hierarchy. Render production PNGs in both orientations, plus an encoded clip, on the actual PR head. The five-axis ArtCraft quantitative image comparison is not claimed without aligned matching references.

## Pass 16 — reference-guided curled stock and synchronized paper rigs

Research: reference bird cutwork and feather edge craft in Diana Beltrán Herrera's documented construction, and dragonfly wing venation in her paper wildlife sculptures. Implementation adds selective, **fully opaque** per-piece gradient curvature (`curl`), shared frame-exact flutter timing with `rigGroup` validation, and public 0–1 `curl`/`motion` controls for existing object artwork in Storybook and FilmStage. This is still a native SVG cut-paper stage, not physical 3D paper bending. Tests must verify strong named-pivot consistency, no opacity changes, both orientations, reduced-motion flat assembly, and actual browser captures.

## Pass 17 — separately hinged, opaque feather tips

Studied Diana Beltrán Herrera's original physical bird feathers. Added renderer support for attached second contours with bounded fold pivots and contact shadows. The kingfisher now has 18 two-part wing-feather pieces; eaves and napkin folds also gain small raised tips. Added `relief` 0–1, independent of earlier color-shading `curl`. Regression gates: 128 budget, root/tip attachment, reduced motion and seeded seek, opaque closed paths, invalid negative/infinite displacements, actual Chromium landscape/portrait captures and native-film exports. This is not manufactured 3D paper.

## Pass 18 — kingfisher anatomy rebuilt from actual bird and handmade paper references

Focus on a genuinely better bird rather than arbitrary effect layers. Reconstructed the entire original `kingfisher` geometry while preserving its contract, consistent wing rig and 18 real lifted feather tips. Changed skull-to-body connection, wing/body volume, blue and chestnut color tracts, crown markings, eye and cheek arrangement, short rectrices, bill wedge and perch-clinging tarsi. Added 12 compound layers containing fine individual paper feather contours. **Artistic validation:** inspect both exact browser screenshot ratios and native film frames, with no unmeasured ArtCraft score claims.


## Pass 19 — fine vane cutwork from paper-bird construction

References: [Diana Beltrán Herrera's paper bird collection](https://www.dianabeltranherrera.com/projects/birds) and [the photographed hand-assembled feather detail](https://www.creativeboom.com/work/paper-birds-delicate-feathered-friends-crafted-entirely-from-coloured-paper/). Individual overlapping feathers have deliberate taper, close-fitting lateral barbs and fine irregular hand-cut margins. Previously, the Kumiki kingfisher's 18 feather vanes were largely smooth geometric capsules despite the revised anatomy.

**Correction:** author the primary's visible front and back vane edges as actual contours with shallow seeded, symmetric-in-count but asymmetric-in-placement V-shaped notches. Maintain the rounded root, 18 physical individual feather blades, 18 independently hinged opaque tips, all coherent anatomical rig pivots and 128-layer budget. The detail control changes real cuts rather than color/noise. No third-party pixels or outlines are copied.

**Release evidence:** focused geometry/rig tests plus native landscape/portrait Storybook screenshots and FilmStage renders from the PR visual proof. Do not claim matched ArtCraft scores or manual visual approval based only on passing mechanical tests.


## Storybook consolidation — one object, one configurable page

The Film Looks sidebar had expanded to 25 Paper Craft stories, duplicating nearly identical subject renders for portrait, stock, feather relief, animation and revised anatomy. Consolidated all of them under **Video production / Film Looks / Paper Craft** as seven pages: Garden, Botanical & Butterfly, Kingfisher, Dragonfly, Canal Houses, Camera and Teacup & Citrus.

All five media remain selectable in the on-stage selector; aspect, palette, detail, color-layer density, curl, motion, relief, surface tooth, shadows, edges, frame scrubbing and seed remain available through relevant Storybook controls. Subject identity is fixed per object page. Legacy preview story URLs change to the consolidated folder; native FilmStage contracts and paper-sculpture IDs do not.

E2E browser proofs were revised to vary Storybook URL arguments and exercise dynamic media buttons rather than maintaining repeated preview stories. Verify the current commit in Chromium: seven URLs, five distinct objects, both aspects, opaque cardstock, feather-hinge alignment, coordinated motion, botanical palettes, gallery media and console errors. Tests cannot replace independent visual craft review.


## Pass 20 — scenery reference-to-contour foundation

New landscape ArtCraft references studied: Hari & Deepti's illuminated nested shadow boxes, Helen Musselwhite's cut-paper woodland illustration, Eiko Ojala's restrained vertical landscapes and Louise Jenkins's stacked countryside paper. See `docs/research/paper-craft-scenery-artcraft-study.md` for technique-specific observations and copyright boundary.

Added `paperScenerySpec`: two original scenes (woodland stream and alpine lake) with individually cut trunks, boughs, canopies, notched pines, mountains and snow, real lake/stream surfaces, ferns, smaller botanicals, true oval die-cut mat and multi-plane shading. Seeded microdetail is actual geometry, not a transparent visual filter. Both landscapes and all 3 palettes share the exact PAPER1 runtime, 128-sheet bound and absolute-frame motion contract. No unlicensed image files, new runtime dependencies or extra Storybook folder.

One **Scenery** page joins the existing `Video production/Film Looks/Paper Craft` group; choose scenery, palette, detail, breeze and aspect through controls. The `paper-craft-study` FilmStage slot now accepts `artwork:"scenery"` and has a two-scene landscape/portrait film.

Verification gate: focused unit tests for paths/holes, opaque stock, seeded detail and seeks, FilmStage compile and both aspects, Chromium captures and native film render. Run these against the final PR SHA. ArtCraft structural analysis does not substitute for direct image comparison, and no unmeasured quantitative fidelity is asserted.


### Pass 20b — actual rendered-frame critique and corrections

Inspected the genuine Chromium screenshots and FilmStage 16:9/9:16 images (initial PR #296 proof artifacts, not an independent mockup). Initial woodland output **failed artistic readiness**: trees were skinny poles with microscopic isolated leaves and most ferns/flowers fell outside the elliptical frame; the stream disappeared behind the front bank. Initial alpine output **failed structural readiness**: mountain base polygons extended to the stage bottom, leaving obvious vertical seams, while ledges/moss were clipped off-frame. Sunrise halos read as target circles.

**Corrections implemented:** grow each rooted tree into four natural boughs with spatially connected veined canopy packets; increase independently cut foliage and reposition ferns/flowers into the actual oval view aperture; re-expose a true foreground water sheet and pebble detail. Recut alpine mountains as independent closed paper peaks ending in curved foothills rather than rectangular full-stage extensions, add directional snow/rock facets, pull pines/ledges/moss into visible space and remove hard annular sun rings.

These are visible-construction changes, not global noise, random transparency or a claim of photorealism. Regenerate fresh final-commit browser/film captures: the first proof images are superseded and cannot certify this correction.
