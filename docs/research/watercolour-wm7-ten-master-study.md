# WM7 — Ten master watercolour studies and material-gap implementation

**Date:** 2026-11-14  
**Status:** ongoing original-code implementation on [PR #218](https://github.com/YukiUmetsu/kumiki-ui/pull/218) after WM4/WM5 in merged [PR #202](https://github.com/YukiUmetsu/kumiki-ui/pull/202).  
**Scope:** 10 carefully chosen historical and contemporary watercolor practitioners, based on technique diversity; **not** an objective worldwide ranking. Original paintings remain their owners' works. Reference artworks are studied, not packaged, copied or traced.

## 1. Ten reference artists and specific artwork analysis

| Artist / primary reference | What to observe in the actual watercolor | Missing in Kumiki as of WM6 | Original implementation or open work |
| --- | --- | --- | --- |
| **J. M. W. Turner** — [*The Lake of Zug* (1843); Met watercolor technique guide](https://www.metmuseum.org/de/perspectives/materials-and-techniques-drawing-watercolor) | Tonal atmosphere is created by different wet and dry washes; highlights emerge by scraping/rubbing paper, not painting generic white decals on top. Soft boundaries transition into selected dark anchors. | Mist lacks a dramatic value hierarchy; regular semi-transparent horizontal shapes; little real subtraction of pigment | **WM7:** authored weather-glaze polygons and black-on-white *lift mask* carve paper through only new pigment. **Remaining:** real wet lifting/rewetting of base WM4 material, nonuniform cloud wash transitions |
| **Winslow Homer** — [*Fishing Boats, Key West* (1903); Met](https://www.metmuseum.org/art/collection/search/11120) | Clear zones of translucent blue/gray washes versus calculated unpainted white sails, boat sides and moving water, with a few graphite rigging lines. Light has structural meaning. | Boat material too flat, water marks detached from specific boat contact, no dominant dark-water mass | **WM7:** darker near-water tonal grouping, shaped contact shadow and lifted ripple sleeves. **WM6:** sail and hull detail. **Remaining:** rig and hull anatomy, full reflective radiometry |
| **John Singer Sargent** — [*In the Generalife* (1912); Met](https://www.metmuseum.org/art/collection/search/12116) | Dynamic coexistence of sharply described forms, washed-out soft forms, wax-crayon resist and expressive human anatomy; varies edge fidelity based on light and focal importance. | Uniformly crisp vector structural contours, equal-level subject detail, tiny featureless figures | **WM7:** separate wet-edge blur from unfiltered drybrush, local selective loss and bright reserve. **Remaining:** expressive articulate multi-character rigs and light-aware anatomical faces |
| **Albrecht Dürer** — [*Young Hare* (1502), watercolor/gouache; Web Gallery of Art](https://www.wga.hu/html_m/d/durer/2/16/2/01hare.html) | Layered translucent ground plus many short fur-like strokes that follow actual anatomical growth direction. White gouache accents exist but do not replace underlying construction. | Stems/flowers generic in silhouette; no varied species anatomy; brush marks can float | **WM6:** midribs, veins, head families with rig-following sway. **WM7:** leaf-confined dark glazes. **Remaining:** true botanical species and animal anatomy/part-directed fiber flow |
| **Paul Cézanne** — [*Mont Sainte-Victoire*; MoMA technical study](https://www.moma.org/artists/1053-paul-cezanne), [MoMA watercolor material wall text](https://press.moma.org/wp-content/uploads/2021/06/CezanneDrawing_WallTexts_Final.pdf) | Thin watercolor passes allowed to dry before layering, broken but purposeful parallel/perpendicular contour/color fragments, graphite over/between washes; crucial unpainted gaps. | Colors fused as one global blur; little variation between dry-defined and wet edges | **WM7:** independent separately timed translucent glazes, selective structured drybrush and paper holes. **Remaining:** multi-pass discrete dry time and true glaze reactivation ordering |
| **John Sell Cotman** — [*Lake and Mountains in Wales* (c.1806); Winchester College](https://winchestercollections.co.uk/collection/cotman-lake/) | Strong geometric compositions and very clear mass/plane delineation. Simplification is *deliberate hierarchy*, not low detail. Sharp shadow-value anchors support otherwise restrained washes. | Roof and meadow feel uniformly pale; no single dominant anchoring value | **WM7:** explicit large-value mass/roof-plane/portal shadows. **Remaining:** source-consistent spatial shadow projection, measurable tonal hierarchy in both ratios |
| **David Cox** — [*Landscape* (c.1840); Princeton University Art Museum](https://artmuseum.princeton.edu/art/collections/objects/11094), [Yale weather study](https://britishart.yale.edu/publications/sun-wind-and-rain-art-david-cox) | Coarse paper, short broad rapid strokes, visible black chalk/graphite, weather shifts in value and edges. Textural rhythms follow wind/cloud/ground. | Painterly details repeated uniformly; paper fibers have no directional dry-brush skipping | **WM7:** bounded directional dry-brush strokes following current and leaf shape; turbulence applied only to wash edges. **Remaining:** actual fiber-resolved paint pickup and intentional wind-driven growth direction |
| **Beatrix Potter** — [Nature and ground beetle studies; V&A](https://www.vam.ac.uk/articles/beatrix-potter-a-life-drawing-nature) | Scientifically observed posture, realistic plant/animal anatomy, meticulous drybrush and accurate tiny features, often combined with story. A correctly drawn subject precedes any texture. | Simplified petals, repeated seedheads, schematic person and no detailed character performance | **WM6/WM7:** distinct panicle/umbel/daisy/grass family marks and anatomically local leaf glazes. **Remaining:** measured botanical ground-truth, distinct species/animal rigs, drawing-accuracy QA |
| **Joseph Zbukvic** — [Artist portfolio and practice](https://www.josephzbukvic.com/about-1/) | Plein-air tonal design: a limited palette with controlled atmospheric softness, strong focal darks, warmer highlights, bold selective motion and reduced peripheral detail. | Everything has similar soft low contrast; little color-temperature separation or focal strength | **WM7:** limited warm/cool horizon washes, darker foreground and vessel contact; no uncontrolled global saturation. **Remaining:** value histogram targets by film moment, scene-specific contrast art direction |
| **Mary Whyte** — [*Goldenrod*, watercolor; U.S. Department of State art program](https://art.state.gov/personnel/mary_whyte/) | Strong human-centered storytelling, believable flesh/fabric variation, individual expressions and physically grounded shadow/pose. Watercolor serves anatomy and narrative. | Estuary sailor is a tiny diagram figure; no varied expression/hand anatomy, dress/fabric texture or figure-to-ground lighting | **Still required:** WM3 character-part material masks, painterly skin/clothing, proportion QA and expressive multi-actor performance. WM7 does not misrepresent this as solved |

## 2. Common principles across ten: what to build first

The chief priority is **not more procedural flecks**. Several painters achieve complexity with a few decisive, irregular *values*. Detailed, natural watercolor is a union of:

- **Designed luminous paper:** highlights must often be unpainted gaps or pigment removed from a glaze, not a blanket white overlay.
- **Value hierarchy and color temperature:** strongly grouped darks, distant soft values, controlled warm/cool focal accents.
- **Dry/wet differentiation:** local paper-tooth roughness and sharp dry passages against genuinely feathered wet edges; a full-frame blur destroys subject construction.
- **Anatomically governed brush direction:** every stroke must help reveal form, growth, material, or water flow. More strokes on the wrong anatomy reduce realism.
- **Layer sequence:** transparent passes applied at meaningful film frames, final dark accents, drybrush marks and selective lifting after washes.
- **Figure fidelity:** watercolor craftsmanship does not excuse drawing a human as featureless primitive geometry.

## 3. WM7 technical implementation (original geometry only)

### Material module

`src/video/watercolour-masterwork-material.tsx` adds the deterministic
`watercolourMasterworkMaterialPlan(study,seed,intensity)` and
`WatercolourMasterworkMaterial` renderer. Art-directed, bounded paths are returned as typed geometry, without image assets. Each mark identifies `tonal-mass`, `transparent-glaze`, `wet-edge`, `directional-drybrush`, or `focal-shadow`.

- **Botanical:** two broad meadow tonal groups; 57 exact root-attached leaf glaze paths and 57 thinner dry-brush strokes with the same wind motion as stems; selective flower heads; small ground highlight lifting.
- **Estuary:** three complementary cloud, horizon and deep-water masses with a boat-contact shadow; dozens of perspective-varying curves; shaped boat reflection sleeves; actual *masked holes in added pigment* for white water.
- **Courtyard:** roof-plane contrast, asymmetric plaster sunlight/shade, arched portal dark, masonry strokes tested against every window aperture; small roof highlight lifts.
- **All:** shared `materialDepth` parameter (0–1) in Storybook and optional FilmStage slot `props.materialDepth`; local seeded low-scale SVG displacement applies only to paint and never to captions. Frame time is absolute; no timer or mutable history.

**Honest material limitation:** the removal mask lifts only **this new glaze layer**; it does *not* subtract already-dried WM4 pigment or model chemically realistic granulation, wax resist, watercolor pigment optics, or fiber capillarity. It makes highlights materially less wrong than white overlays, not physically perfect.

### Verification gates

- `tests/watercolour-masterwork-material.test.tsx`: bounded geometry, repeatable seeds, zero-effect control, independent glazes vs masked reserves, real plant-rig attachment, window-safe masonry, two-ratio film slot validation.
- Real Chromium captures and production frame exports must compare WM6 baseline to WM7 at both normal size and magnified subject crops. Inspect new dark-value grouping, *no opaque white paint* in lifted zones, credible botanical shading and sky/water separation.
- A passing typecheck and pixel diff prove change, **not** reference-equivalent artistic quality. Record human art approval separately.

## 4. Prioritized unsolved roadmap

| Rank | Remaining feature | Concrete acceptance test |
| --- | --- | --- |
| P0 | Anatomical subject sources and whole character rigs | Measured proportions, correct connections/occlusion, six closeups and 30fps gestures, including face/hands/fabric |
| P0 | True paper-resolved drybrush and edge bleed | Comparison at 100%, 200% and downsampled 540p; irregularity correlated with actual stroke geometry; no checkerboard or solid rectangles |
| P1 | Physically integrated pigment lifting/reactivation | Actual WM4 pigment mass ledger accounts for removal, transport and rewetting; no white-stick-on highlights |
| P1 | Storytelling composition and value hierarchy | Visible focal subject and darkest-value anchors at mobile size in both aspect ratios; narrative figures legible |
| P1 | Full normal-speed dual-ratio film QA and CPU budgets | Entire 1260 frames in both formats; seek determinism; profile at 1080p/4K; identify cache/checkpoint architecture |
| P2 | Controlled style families, authoring interface and brush gestures | Reusable material API supporting watercolor, opaque accents and lost edge controls, without references to named artist identities at runtime |

## 5. Source and licensing policy

All external artwork and web screenshots here are **research-only links**. Do not fetch and commit copyrighted source images; no tracing or direct image reconstruction. New material geometry and compositions are authored specifically for Kumiki. Avoid claiming authentic reproduction of living artists' individual signatures or a transfer of their exact works.
