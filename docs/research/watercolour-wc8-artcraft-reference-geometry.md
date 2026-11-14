# ArtCraft WC8 — Reference-guided source geometry, not decorative detail

**Status:** code implementation and visual qualification in progress.
**Source target:** original Kumiki-UI WM4–WM7 three-study watercolor film.
**Reference mode:** \`style_guided\` — study shape grammar, pigment and construction from historical watercolor works; **never** assert pixel-matched reproduction or claim to have sourced the exact image from a user's uploaded artwork.
**Rights:** Met Open Access public-domain images are referenced by URI; no copied images are committed or traced.

## Explicit use of ArtCraft workflow

Relevant ArtCraft suite procedures (v6): art-mastery, art-reference-research, art-reference-structural-study, art-material-study, art-fidelity-review and art-mathematical-art-fidelity. The artifact loop is **references → semantic zones → topology/flow → static hero construction → moving parts → real screenshot → independent critique**. We do not treat a large number of SVG marks, green CI or pixel variance as proof of artistic quality.

The full 12-skill local bundle is designed for user's local agents under \`~/.agents/skills/\` or \`~/.claude/skills/\`. This repo only borrows the ArtCraft **methodology**, not a claim that the v6 Python \`art_axis_audit.py\` is installed in GitHub Actions. Reference-aligned five-axis numerical baselines require source crops, artist-authored semantic masks and the *actual checker implementation*. **Do not counterfeit baseline scores.**

## Reference study: the individual sources

| Scene | Reference artwork, source | Observed structure that matters, from the actual image | Old Kumiki deficiency | WC8 original rework |
| --- | --- | --- | --- | --- |
| Botanical, flower/leaf closeup | [Pierre-Joseph Redouté, *Erica Fulgida* (1813), Met Open Access 2015.604.1](https://www.metmuseum.org/art/collection/search/697702) | Petal and leaf tips are asymmetric, flower parts are attached along a real branching axis, narrow dark underturns coexist with nearly white vellum, fine marks follow growth. Floral stem details have multiple *distinct* length scales. | Repeated equal ellipses for each daisy head; circular disc and loosely spaced leaves; extra veins in earlier WM6 were added over the wrong primitive form. | One hero corolla built from **13 closed asymmetric root-joined petal shapes** with irregular turning points, individual midribs, multi-color center, 28 seed/ovary speckles, six sepals attached behind the disc. Existing stem pivot, botanical local rig and film timing remain the single source of truth. |
| Estuary, boat/cloth closeup | [Winslow Homer, *Fishing Boats, Key West* (1903), Met Open Access 10.228.1](https://www.metmuseum.org/art/collection/search/11120); [J.M.W. Turner, *The Lake of Zug* (1843), Met](https://www.metmuseum.org/art/collection/search/337499) | Boat is a *solid enclosed buoyant mass*, sail edges have meaningful pull and folds, rigging connects to structural mast/deck points, human silhouette breaks into discernible head/trunk/limbs. Negative white paper is intentionally preserved in sunlit cloth and reflections; atmosphere is lighter at distance. | Original little boat was a handful of flat triangles and loose white wake stripes; the figure was an ambiguous ~4-pixel oval; W7's material glazing did not correct source anatomy. | Closed side/hull shape plus under-keel silhouette and deck rails, two connected cloth sails with separate fold material, anchored mast, backstay, forestay, boom, forearms/thigh/shin/head of a single visible seated sailor, and 14 shape-rooted broken wakes. WC8 does **not** copy Homer's boat silhouette or arrangement. |
| Courtyard, masonry and roof closeup | [John Sell Cotman, *St. Luke's Chapel, Norwich Cathedral* (1808)](https://gallerix.org/storeroom/96149437/N/546/) and [Cotman, *Tilney All Saints*](https://sublimesites.co/2015/08/18/cotmans-norfolk-tilney-all-saints-near-kings-lynn/) | Architectural material is organized into roof planes, cornice/eaves, recessed openings and wall courses. A sharp door/window void gives scale. The light/dark hierarchy attaches to *mass*, not random mortar marks. | Building read as two flat trapezoids and six identical rectangles; previous fine masonry hatches were mainly cosmetic and risked drifting across glass. | Four roof-course contours travel continuously across left pitch, center ridge and right pitch; slate fragments are anchored into the actual roof; fascia/eave, structural wall edge, six recessed-window reveals, and irregular mortar marks explicitly excluded from every pane and door. |

### ArtCraft shape graph (authored semantic relationships)

- **Floret:** \`stem-root → peduncle → flower disc → 13 petal roots\`. Each root is locally \`(0, -3.7)\`; closed organic petals extend outward with 3+ distinct turning/ridge points and unequal widths. Sepals overlap *behind* petals; the disc overlaps roots in front. Petal midribs are open internal contours. Interpetal gaps are intentionally unpainted paper; independent disc flecks are allowed.
- **Boat:** \`mast-top → mast-foot → deck/hull\`; \`mast-top → stern\` and \`mast-top → bow\` are explicit rope paths. \`hull → keel → contacting wakes\` is an enclosure with adjacent water shadow. \`neck → head\`, \`torso → shoulder → elbow → wrist\`, and \`torso → hips → thigh → shin → shoe\` are semantically connected. The sailor is not a generic dot.
- **Courtyard:** \`roof-left → ridge-center → roof-right → eave\` is one plane-guided band system, not disconnected hatches. \`wall → window surrounds → glass negative space\` preserves all six aperture interiors. Mortar lines reject both endpoints crossing the pane rectangle.

## Five axes: required / not applicable policies for current original design

1. **Topology — required** for attached petals, hull + rigging, window apertures. Source-relative numerical component counts **not measured** (semantic reference masks unavailable in this runtime). Structural source-code checks validate explicit roots, closed paths and aperture counts; this is not a substitute for axis verification.
2. **Flow — required** for flower midribs, rigging and roof courses. Authored flow paths are tested for nonconstant shapes/angles and end anchor equality. True source skeleton comparisons pending reference-mask markup.
3. **Stroke pressure — required** for watercolor petal folds and rigging and painting material. Different widths are prescribed in source; quantitative spatial pressure distribution relative to sources is not yet measured.
4. **Optical rhythm — required** for floral rays, roof courses and foreground wake. Unequal petal length and interrupted wake counts are source-checked. Annotated cross-normal probes still required.
5. **Microtexture — not applicable to WC8 geometry release**: WM4–WM7 pigment, lift, paper, absorption and grain systems remain unchanged. Reassess with paired paper-patch FFT on future material-specific work.

### Negative controls explicitly rejected

- A petal replaced with a rotated equal-size ellipse, painted as a disconnected disk orbiting the stem.
- White boat sails represented by single smooth triangles with a dot sailor and floating ropes.
- Rectangular windows painted over with random masonry accents; roof with unaligned random parallel hatches.
- Adding seeded speckles to empty paper to increase high-frequency energy without fixing the above topology.

## Static hero / release checklist

- Every botanical hero floret has 13 attached petal loops, variable petal lengths and a physically layered disc/sepals.
- Boat has closed hull and sails, the **boat** stays tied to mast/deck roots, attached seated figure, multiple body parts, and a shared wake origin.
- Six courtyard windows have aperture groups; mortar strokes do not cross a pane, and facade has four roof courses.
- Render all 3 scenes in landscape 960×540 and portrait 540×960 at source film frames 355, 775 and 1195; capture 100% + enlarged hero crops.
- At least one true film MP4 export must play; avoid treating static Storybook screenshots as proof of motion.
- A separate visual critique must reject or label any remaining unrealistic geometry. ArtCraft's v6 five-axis \`release\` gate is **not** claimed without the full checker and annotated masks.

## Remaining higher-priority gaps after WC8

1. Hero animal/human characters still need robust anatomy, independent facial expressions, hand construction and articulated animation, not just a seated illustrative figure.
2. Botanical plant species still lack correct leaf-to-stem morphological taxonomy beyond stylized daisy/seed-head families; Redouté is a **quality reference**, not an assertion that Kumiki draws his species.
3. Roof-course geometry is now coherent, but actual field-perspective masonry and authentic worn stucco require image-level comparison and photographic/architectural source construction, not random texture.
4. Water currents, wet paper grain, soft light and 1080p/4K playback are still qualitative and need future physical pigment, capillarity and performance work.
5. Finish complete 42s dual-aspect motion review, human artistic approval, and source-matched five-axis semantically masked audits; do not mark WC8 “museum quality.”


## First rendered visual critique (actual native Storybook and FilmStage)

[WC8 proof run 43647506571](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43647506571) passed technical browser and real film export in both ratios; **the initial candidate is artistically rejected as-is** because the flower florets were visibly too small and muddy at 960x540, although the boat's constructed silhouette and explicit stays/sailor were materially more legible. This came from miscalibrated petal length and value/gradient opacity, not missing global texture. A follow-up correction expands 13 attached floret lengths to the 17–24px range, gives stronger bright translucent interiors, and keeps thin root shadows/midribs. New snapshots must be inspected before promoting the change.

The comparison remains **style_guided**, not pixel-matched. Existing WM7 film frames are a valid *before* control, but are not a substitute for annotated reference-source masks and ArtCraft's five-axis source-relative baseline.
