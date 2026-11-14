# WM6 — Observational Watercolor Detail Craft Study

**Status:** draft PR #218: https://github.com/YukiUmetsu/kumiki-ui/pull/218
**Extends:** merged WM4/WM5 PR #202.
**Source:** src/video/watercolour-craft-detail.tsx

## Source observations

1. [The Metropolitan Museum of Art, Nineteenth-Century American Drawings](https://www.metmuseum.org/essays/nineteenth-century-american-drawings): Winslow Homer uses large color/value planes with isolated opaque accents and white reserves. John Singer Sargent interleaves lost edges with sharply articulated focal details. Neither is a uniform noise filter.
2. [The Met, Watercolor](https://www.metmuseum.org/de/perspectives/materials-and-techniques-drawing-watercolor): dry brush exposes paper texture, wet lifting removes pigment, and scraping exposes the substrate. These require different rendering treatments.
3. [Brooklyn Museum, John Singer Sargent Watercolors](https://www.brooklynmuseum.org/exhibitions/sargent_watercolors): transparent/opaque watercolor passages, wax-resist and graphite drawing as distinct cooperating media. Source observation informs drawing technique, not copied image pixels.
4. Botanical illustrations: accurate grasses have connected culms, laminae with midribs, side veins, differentiated panicle/spike/umbel/awn structure, and near-field shadow. Repeating small green dots without anatomy does not work.

## Where the previous scenes fell short

- Botanical: simplified leaf shapes lacked visible veins, and heads looked procedural rather than differentiated.
- Estuary: a repetitive set of horizontal washes failed to communicate water motion and connected reflections.
- Courtyard: windows were regular vector shapes over flat walls with little projected slate, mortar interruption or weathering.
- All three: canvas-wide noise would not fix physical object construction.

## New craft language

- The pure deterministic craft-mark generator works from study, 31-bit paper seed and a bounded 0–1 detail scalar, not wall-clock randomness. No licensed reference art is bundled.
- Botanical veins derive from the same physical insertion coordinates as their source leaves; differentiated heads use distinct seed, floral and awn grammars. Stem movement is applied using the same frame-dependent sway as the base artwork.
- Water paths are curved, nonparallel and perspective-scaled. Secondary bright filaments connect at explicit coordinates to their parent reflections. Fine accents remain selective rather than uniformly scattered.
- Roofing marks are projected into approximate roof bands. Plaster and masonry fragments are emitted in architectural planes; all six window apertures are explicitly avoided. Sills include varying reflected light and shadows.
- A 0–1 Fine brush craftsmanship Storybook control preserves all base watercolor pigment fields even at zero. FilmStage slots accept an optional craftDetail numeric value in the same range.
- Bounded prominent specimens and vein counts cap SVG complexity. Background plants remain less articulated on purpose.

## Verification and release gate

Unit suite: tests/watercolour-craft-detail.test.tsx checks repeatability, frame changes, botanical categories, window apertures, unique curved waterwork, budget caps, portable scene controls and invalid inputs. Storybook browser suite: tests/e2e-storybook/watercolour-wm6-detail.spec.ts captures all three studies in both output ratios with detail enabled and disabled.

Visual review must look at actual film frames, closeups and normal-speed motion; a green test result is not artistic acceptance. Reject repeated hatching, floating leaf veins, sharp cutout pigment edges, overbright white accents and disconnected architectural strokes.

## Remaining work

1. Species-grade botanical branching, petal material variation, veining and foreground grouping.
2. Wave-volume contour and foam topology; wet paint, edge darkening, dry-brush paper relief, reactive backruns and realistic highlights.
3. Dimensional masonry, perspective-correct roof tiling, stone deterioration and windows with authentic reflected light.
4. Extend WM3 actor-part masks to multi-character choreography with the same watercolor medium.
5. Cache or checkpoint the fixed-frame pigment solver and profile 1080p/4K playback.
6. Review both entire 42-second landscape/portrait films at normal speed and obtain human artistic acceptance.

This does not claim spectral pigment chemistry or parity with the original watercolor masterworks.
