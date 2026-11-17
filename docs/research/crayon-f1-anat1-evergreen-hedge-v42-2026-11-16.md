# Crayon ArtCraft F1 V42 — photographed evergreen hedge as physical wax volume

**Status:** experimental `!dev`, ART HOLD. Source date 2026-11-16. V42 is not a finished or artist-approved realistic portrait. **Do not merge PR #461** on the strength of unit checks or browser screenshot differences alone.

## Licensed photograph and primary medium

**Identity and rights:** Christopher Campbell, [*Brunette woman portrait (Unsplash)*](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg), October 2015, CC0 1.0. Benchmark is *the independently captured 608×1082 browser crop*, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`, available in [archived source screenshot artifact 14148787169](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614/artifacts/14148787169). Do not represent this as the original full-res camera JPEG.

**Physical medium:** [Rudolf, Mould and Neufeld, *A Bidirectional Deposition Model of Wax Crayons*](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf), describes wax/paper contact, pressure, deposition and tooth. [Philadelphia Museum of Art, *Descriptive Terminology for Works of Art on Paper*](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf), distinguishes pigment rubs, layers, surface texture and broken/raised contacts. These are principles, **not** evidence that synthetic wax is indistinguishable from physical hand-coloring. No downloaded artwork is embedded.

## Actual photographic deconstruction

Before coding, examined the byte-verified 608×1082 PNG and unmodified V41 native Chromium full-frame PNG. The source woman's face extends from near x108,y282 to x500,y862, flanked by dark brown hair and neck, with diffuse **green-black foliage/bokeh** visible in the large paper-only regions above her crown and to either side of the two curtains. In V41 these exposed spaces are light beige paper, a source-specific structural mismatch.

Seven **measured source raster regions** (simple actual RGB median / mean on the source PNG, **not** painted uniform color targets):

| Region (x0,y0,x1,y1) | Source median RGB | Source mean RGB | Character |
| --- | --- | --- | --- |
| Upper total (0,0,608,163) | (19,33,10) | (25,39,14) | deep green-black canopy, uneven warm reflected patches |
| Upper left (0,0,225,160) | (24,39,11) | (30,44,17) | dark fern shapes with staggered olive bokeh |
| Upper right (385,0,608,170) | (21,36,11) | (25,39,14) | darker recesses and intermittent bright leaves |
| Far side above (520,180,608,355) | (37,61,17) | (45,65,25) | higher-lit green wedge behind far hair curtain |
| Far side middle (550,345,608,625) | (13,21,9) | (20,28,13) | almost black deep hedge, blurred foliage |
| Far side lower (580,625,608,900) | (49,45,29) | (53,59,34) | foliage partly occluded by warm brown locks |
| Near upper left (0,150,80,290) | (51,75,28) | (58,74,34) | strongest broken warm-green leaves |

All coordinates refer to the actual 608×1082 CC0 screenshot, not a hallucinated tree image or flattened collage.

## Reconstructed five-axis material

1. **Topology:** One contiguous dark-green wax undercoat extends beneath the **existing** original CC0 portrait. Local canopy shadow, far/right opening, near/left opening, 19 individually located distant botanical bunches, then delicate leaf laminae share a single 608×1082 native paper. Each bunch has **three nonidentical cupped leaves** with connected four-part Bézier outlines, asymmetric tip, vein and taper. This intentionally does not assert botanically classified species from a blurry photograph.
2. **Vector flow:** A fixed set of spatially authored photographed light/dark locations, not a global tiled forest pattern. x14..178 seeds near-side fronds; x235..405 represent upper canopy; x468..603 seeds far-side branches and sparse lower pockets. Each 3-leaf bunch varies axial angle, length, width, bend and leaf divergence. Source backplane remains dense and blurred, so each distant botanical grouping uses physically bounded color and softened wax contact rather than razor-cut leaf stickers.
3. **Wax edge/texture:** CRAYON1 solid tooth-laden stroke-built dark pigment `coverage:opaque`, `deposition:stroke-built`, dry nib, controlled pressure and `underpaintGradient`, localized muted colored reflectance in olive/fern/moss, native `featherContacts` and `blendRadius` up to 13 for out-of-focus distant leaves. Separate 0.43px, lower-opacity source-direction laminae are **physically clipped to the exact corresponding wax leaf group's shape**, not arbitrary SVG circles. No digital image/filter/stock texture. No uniform flattened green fill claimed as finished background.
4. **Temporal/depth layering:** Background drawing stages 0–93; original source portrait retains the same authored 300 frames. New *generic* `CrayonBase.renderLayer:"backdrop"` field renders only explicitly tagged source environment first, independent of insertion order, while preserving the **original authored wax index and seed**. V42 appends all new elements after the original face and does **not** mutate, reorder, or reseed the 18 fine rooted hair groups, any eyelid, mouth, ear, tone, crown, or neck. Screen-space artwork and legacy scenes default to unchanged `normal`.
5. **Interactivity:** Opt-in `midfaceForm:"source-anat1-hedge-v42"` in existing `Video Production / Film Looks / Crayon / ArtCraft Adult Face Lab`. Same source/deterministic camera, adjustable detail (0.2..1), synchronized movie frame and normal playback. Three standalone !dev Storybook states: exact full 608×1082, near upper foliage macro and far-side foliage macro. V41 stays a source-matched negative control.

## Verification, rejection and release criteria

- Strict unit: the entire original V41 `elements` array remains a **deep-equal prefix**, same `seed`, paper, camera and 300 frames; all appended hedge elements exclusively `renderLayer:"backdrop"`. All leaves/stems native `wax` / parent-clipped `contour`, deterministic detail 0.2 and 1, no duplicate IDs; invalid detail and missing originals throw. New generic CRAYON1 `renderLayer` validation rejects all unknown values.
- Actual browser proof: **same-head V41/V42** native PNGs at frame 299, identical source camera and deterministic seed. Capture 1×, upper-source 2.4× and far-side 2.4× and confirm background is behind face by checking actual DOM painter order. Native screenshots demonstrate that environmental pixels changed, **not** artistic likeness or human approval.
- Independent ArtCraft photo comparison: compute source vs same-head V41/V42 per RGB source ROI (whole, top, top-left, top-right, far-side, face, near eye) using `skimage.metrics.structural_similarity(...,channel_axis=2,data_range=255)`. Reject improvements achieved by degrading the face or introducing foliage on skin. Inspect photo ↔ native at 1× and 2.4× for too smooth green undercoat, symmetrical 3-leaf icon repeats, harsh spikes, excessive cartoon saturation, bland fake bokeh or matte edge contamination.
- The whole original CC0-photo SSIM target remains **≥0.85**. V41 ~0.414. 18 *final-render* independently measured landmarks, five matched facial tonal planes, frame-by-frame natural-speed 300-frame artist review and independent professional approval are still required.

**Initial decision:** V42 is an isolated photometric/background research candidate. No SSIM result or release approval should be stated until source/render pixels are measured from the actual CI artifact. Keep PR **DRAFT / unmerged**.
