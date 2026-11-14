# WM5 — Subject-Bound Watercolor Craft Research & Art Review

**Date:** 2026-11-14  
**Scope:** Original Kumiki scenes, WM4/WM5 material API, 16:9 and 9:16 exports.  
**Reference policy:** Study technique, material and observation; do not trace, bundle, reconstruct or redistribute copyrighted reference images.

## 1. What the reference art actually teaches

The **real failure of the earlier output** was not insufficient noise or flecks. The painting had wet color *behind* simple, clean SVG subjects, so pigment did not appear to constitute the actual botanical anatomy, coast or architecture. Individual vector strokes were mathematically precise, small relative to the canvas, and visually separable from the washes.

Source observations:

- [Curtis et al., *Computer-Generated Watercolor*, SIGGRAPH 1997](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf): categorizes dry-brush, edge darkening, backruns, granulation, outward flow and glazing as **different material processes**. Its pigment/advection model motivated conservative outward wet-front transport. This project intentionally uses a bounded, simplified model.
- [Utah Division of Arts & Museums watercolor guide](https://artsandmuseums.utah.gov/wp-content/uploads/2019/01/Watercolor-Society.pdf): washed value gradients, successive translucent glazes, water-driven backruns, and reserved paper as highlights. **Paper white must be an absence of paint.**
- [Isabella Stewart Gardner Museum, John Singer Sargent, *Santa Maria dei Gesuati, Venice* (1906)](https://www.gardnermuseum.org/experience/collection/10881): luminosity through untouched light stone, selective dark detail near major architecture, local color in the shadow planes; no need to outline every structure.
- [John Singer Sargent, *The Bridge of Sighs*, Artsy](https://www.artsy.net/artwork/john-singer-sargent-the-bridge-of-sighs): selective deep cools and warmer reflected stone; diffuse water color can coexist with carefully constructed bridges and gondola proportions.
- The user-provided [18-painting overview](https://fuumuui.com/blogs/art/18-famous-watercolor-paintings-and-artists) contains 18 paintings from 12 artists and some works in other mediums. Use non-watercolors for construction/composition only, **not** evidence of watercolor pigment behavior. See [original 18-work research](watercolour-18-masterworks-craft-study.md).

### Craft evaluation rubric

1. **Construction (0–5):** each leaf attaches to its actual stem; architectural mass obeys perspective; boat and scale marks follow geometry.
2. **Pigment registration (0–5):** the colored wash *fills the authored subjects* instead of sitting outside as a soft halo.
3. **Physical plausibility (0–5):** pigment mass conserved while mobile; water carries pigment near the wet front; sediment stays after drying; paper-white highlights are not opaque white stickers.
4. **Fine edges (0–5):** lost edges, crisp dry brush, irregular brush filaments, lifted highlights and intentional graded glazing coexist. Uniform blur is not enough.
5. **Composition (0–5):** the artwork reads at normal mobile size, has a dominant focal area and negative space serves the story, not a half-empty layout.
6. **Motion (0–5):** wet spreading, stroke emergence and plant or sail movement behave as a single artwork through repeated, reverse and reduced-motion seeks.

A 5/5 score cannot be self-assigned merely because a unit test passes. Review the **actual exported stills and videos** at intended playback size.

## 2. Code implementation

**New material contract:** `paintAreas` is a bounded union of authored polygons in paper coordinates. The paper grid is still at most 4,096 cells; a cell is active only inside the user-authored silhouettes. All pigment, water, transfers and sediment stay on active cells. At each reflective edge, missing neighbors return the intended fraction to the source cell, not an unrelated polygon.

**Edge behavior:** `edgePooling` moves a bounded, conservative portion of mobile pigment toward drier adjacent cells. This enhances deposited pigment along some wash boundaries without painting a decorative outline. The optical color remains RGB-weighted and **is not** measured chemical pigment physics.

**Original scene regions:**

| Study | Art-directed regions | Material detail |
| --- | --- | --- |
| Botanical | 24 individually oriented leaf shapes attached to the same geometry as 8 focus stems | Green/olive/sage glazes and connected sway |
| Estuary | Original uneven coastal silhouettes, a farther mist bank, a broad water wash | Cobalt/viridian/umber wet passages with pressure-guided water strokes |
| Courtyard | Nonuniform pitched roof, building wall planes, cool shadow, irregular garden crown | Warm plaster / slate / cool bounced reflection |

Each region is a *transport obstacle* and an SVG **final pigment** boundary. The final clipped edge may still look too sharp because the polygon is geometrically smooth. The original hand-ink/pencil shapes are separate and require source-level craft, not an all-scene blur.

**Video compositions:** The legacy three-chapter lookbook keeps its study text; the new `artOnly` option reprojects ambient underpainting, source shapes and subject pigment together into a deliberately larger, uncluttered canvas. FilmStage output is portable through `examples/film/watercolour-master-studies-art-only.film.json`.

## 3. Verification protocol

- Typecheck entire repo, run changed Vitest suites, validate registry and film fixtures.
- Assert masked pigment cells never appear outside the painted regions; check conservation at wet and dry frames; test distinct regions do not exchange pigment across unpainted space.
- Playwright Storybook captures all three original studies, both ratios and full-frame/no-title presentation at the final dry frame.
- FFmpeg outputs an actual, inspectable preview from the original portable film fixture.
- **Manual art QA:** examine closeups in studio-scale frames and watch animation at actual 30 fps. Look specifically for polygon cutout edges, over-soft washes, opaque digital fill and anatomical shortcuts.

### Still missing

- Shared wet-paper field with moving **WM3 articulated actor skin/clothing parts**, coupled to the rig surface in each pose.
- 3D-informed or photograph-informed proportion and perspective audits for intricate botanical and architectural subjects; botanical leaf silhouettes still contain source approximation.
- Detailed dry-brush and graded pigment separation, granule clustering, backruns, lifting and in-layer rewetting.
- Full-length 42 s real-time 16:9 *and* 9:16 encoded art-film review; 4K memory/frame-time profiling.
- Professional visual art-direction signoff. A passed CLI, Chromium or Vitest report does not provide artistic acceptance.

## 4. Work priority

**Next highest ROI:** masked curved **WM3 character rigs** and localized hand-painted brush contour emission, followed by measured 4K optimization and full-film acceptance. Avoid adding dozens of low-impact random texture marks; source construction, coherent material color and silhouette integrity dominate perceived quality.


## 5. WM5 rendered-result audit — 2026-11-14

- [First scoped full-browser/film run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43636895406) and [portrait-camera correction run](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43637467535) both succeeded.
- Actual exported comparison has **12 original stills**: three subjects × two native ratios × (editorial, art-only). The 48-frame encoded art-only preview is a real FFmpeg export, not a mock or CSS animation.
- The initially uniform portrait camera left the image small in a blank column. Three independent **undistorted** subject focal cameras now enlarge botanical, boat/water and building areas.
- The coastal region's straight cutout was corrected by authoring full-width physical water regions. In the editorial study, those would spill into the title's negative space; a controlled watercolor reveal mask now tapers the distant coast back into unpainted paper. This last editorial mask was checked by source/SSR assertion but not followed by a third complete film export.

**Art evaluation:** Better full-screen use and coherent pigment registration, but still a premium *diagrammatic* ink/watercolor art direction rather than a painter's detailed documentary. The landscape needs richer controlled tonal mass and shore geology; 9:16 botanical closeups need actual venation, petal construction and varied clumps; the facade needs atmospheric perspective, mortar/weathering, roof tiles and human-scale context. No source-painting quality claim.

**Next technical gates:** polygon resolution independence (thin leaf occupancy), wet-layer reactivation and dry-brush fiber breakup, real actor-part rig masking, long-film temporal visual QA and 1080p/4K performance profiling.
