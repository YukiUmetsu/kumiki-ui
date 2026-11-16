# ArtCraft F1 V29 — source-space orbital hood, native wax (experimental)

**Status: HOLD / DRAFT. Not a realistic likeness.** Follows the unapproved V28 photo-conditioned five-value study in PR #461. The V29 variant is opt-in and never changes default drawing, exports or source identity.

## Reference and physical material deconstruction

- Primary anatomical geometry: [Christopher Campbell original photograph — CC0 on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg). Original photograph captured October 2015; project source is the previously verified 608×1082 registered crop, SHA256 `f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2`.
- Medium reference: [Princeton University Art Museum materials discussion](https://artmuseum.princeton.edu/art/stories-perspectives/collection-publications-drawings-and-watercolors), including paper adhesion, layered crayon and value blending. [National Portrait Gallery drawing materials](https://www.npg.org.uk/schools-hub/drawing-techniques-and-materials) distinguishes matte pastel tonal passes from binder-rich oil pastel; no digital smooth airbrush should replace native wax.
- Historical visual crayon portrait exemplar: [Fred Hatt, Esteban (2009)](https://fredhatt.com/blog/2010/03/08/empathic-portraits/); directional facial color strokes follow planes and preserve line density. Use as *technique*, not a traced identity.
- **Actual original Chromium V28 screenshots**: [exact head run 43872749109](https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43872749109), artifact 14228414264. Inspected both 608×1082 full still and 3× crop of *rendered* f299. The broad symmetric mauve oval socket patches look like pasted disks; skin/upper-lid transition is not credible. This is a release-blocking anatomical failure despite all three technical workflows passing.

## Five native medium axes

1. **Topology:** do not add shapes, delete eye details or paint an overlay. Change existing `socket-near` and `socket-far` only: a single continuous connected upper-orbital brow-bone ribbon per side, concave toward the eyelid, broad at the brow, tapering at the lateral canthus. Preserve actual original pupil, iris, lashes, lower tarsal rim, tear duct and the other 70+ semantic elements.
2. **Vector flow:** near brow ribbon follows oblique lateral turn, 21° wax flow; far eye is independently authored, narrower/foreshortened, 44° flow. No mirrored ellipse, no generic symmetry.
3. **Edges:** physically joined matte shaded wax, visible dry tooth and 12–16-source-unit native feather boundary; continuous film draw-in mask. Existing opaque face silhouette still occludes paper/background.
4. **Value/gradient:** retain directional light-to-shadow pigment in both native underpaint gradients and pressure-built wax marks; localized reduced burnishing prevents the uniform violet plaque. Far rim remains cooler/darker than the near lit edge.
5. **Micro-elements:** retain and independently check stroke-built pigment, nib micro-contact, paper relief, asymmetric path curls, eye/fine contour overlays and unmodified 300-frame clock. No source pixels, photos, raster masks or blur-image filters in the production renderer.

## Source vs actual render / release gate

The native V28 candidate is visibly far from Campbell's original photograph. V29 is a controlled **hypothesis** addressing one macro-shape flaw; no assertion of better SSIM or prettier artwork is valid before reviewing new exact-head 1× and 3× PNGs. Capture A/B in the same native 608×1082 Chromium camera at f299 and inspect original-rate film independently. The official ArtCraft 9.1 requirement (≥0.85 whole-source SSIM, 18 independently verified landmarks, five-value source/restored planes and visual signoff) is *not met*. Keep PR #461 draft/unmerged until it passes, even if CI turns green.

## Engineering guardrails

- New `source-orbital-hood` source option requires and preserves V28 calibrated facial values and V27 attached alar/naris geometry.
- Its exact transformations are isolated to two already-present parent-clipped, topologically connected wax elements. No new Storybook folder.
- Existing runtime, public CRAYON1 scene schema, default forms, source identity, eye coordinates, camera and sound/timing are unchanged.
- Vitest asserts near/far independent topology and all unaffected elements byte-equal; Playwright captures V28/V29 native 1×/3× screenshots for **actual pixel review**, not automatic artistic approval.
