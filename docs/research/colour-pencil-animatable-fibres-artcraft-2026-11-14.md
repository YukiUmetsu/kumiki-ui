# CP3 ArtCraft — Editable rooted fur/feather micro-craft (2026-11-14)

**Status:** Code implementation and browser-review candidate. **Not approved as world-class coloured-pencil illustration.** This work addresses the important limitation of the prior photo-guided studies: those studies inherit their anatomy from the source photograph but do not supply independent, keyed features for future character animation.

## Reference notes and permission

- [Bonny Snowdon Academy, How to Draw a Fox in Coloured Pencil](https://bonnysnowdonacademy.com/fox-draw-resources/) (tutorial, updated 2026): anatomical head/ear first, shadow structure second, fur growth direction follows face/neck/shoulder; pale guard hairs applied late after layers. This PR follows the **process**, not traced line art or copied reference photo.
- [Kathy Stocks, Fall Breeze, Colored Pencil Magazine, February 2022](https://www.katewoodliffodonnell.com/wp-content/uploads/2022/02/cpm2202.pdf): long dark-to-cream neck transition, translucent ochre face, pale split-tip guard hairs and an incomplete/soft silhouette against paper. Work is copyrighted; no artwork pixels incorporated.
- [Gary Tymon kingfisher colour-pencil print](https://www.etsy.com/listing/737858800/kingfisher-color-pencil-drawing-print): layered turquoise/navy crown, separately grouped overlapping blue upper wing coverts, variable-length parallel vane tracts, clean glossy eye/keratin bill separation. Technique reference only, not copied.
- [Claire Milligan bird artwork](https://www.pinterest.com/pin/awesome-colored-pencil-works-by-claire-milligan-pet-portrait-wildlife-artist--446419381805336706/): layered blue primary feathers with interlocking rachises and small high-value light accents; source not licensed for redistribution or tracing.

## Primary deficiency and design decision

Current 12-piece fox and 11-piece kingfisher vector figures still use simplified anatomical masses and polished SVG edges. Simply adding random lines would produce a denser cartoon. Previous photo-to-pencil renderer preserves real geometry but the eyes, hair bundles and wings are not independent and cannot perform a 2D articulated gesture. We need editable semantic lines that follow *authored growth fields* and inherit their existing opaque actor region. A fully realistic fur renderer will require richer geometry/material construction and high-resolution review; this PR is only one bounded foundation.

Instead of creating 21 extra CP1 regions (the page is intentionally limited to 24), CP3 `PencilActorPart.detailTracks` now binds individually named `PencilTrace.id` to independent pose curves. The existing parent region remains the ONLY opaque body silhouette, owns the paper/colour deposition, clipping and z-order. Each trace gets an optional validated part-local SVG `transform`, and an ordered absolute-frame `keys` animation. The interpolation reuses `evaluatePencilPose`, making seeks 216→187→216 deterministic, all without a new clock or dependence on a photo.

## Original geometry contract (paper coordinates, author-controlled)

| Parent part | Named fibre field | Hand-authored root-to-tip quadratic axis | Width | Mean hair length | Count | Material intent |
| --- | --- | --- | --- | ---: | ---: | --- |
| fox tail | `tail-guard` | `(3,117) → (24,138) → (57,146)` | 12 | 10 | 168 | warm rust shadow/core/light guard hairs |
| fox ruff | `ruff-undercoat` | `(158,119) → (171,143) → (179,165)` | 14 | 8 | 177 | cream underfur with dark base |
| fox brow/head | `brow-fur` | `(171,67) → (194,83) → (219,105)` | 10 | 4.6 | 105 | short directionally changing forehead coat |
| kingfisher breast | `breast-filaments` | `(110,126) → (108,151) → (122,179)` | 9 | 6 | 108 | copper/peach chest filaments |
| kingfisher near wing | `folded-primaries` | `(136,132) → (143,161) → (155,188)` | 11 | 10 | 165 | deep-blue primary dark/core/glint |
| kingfisher coverts | `shoulder-coverts` | `(139,120) → (147,133) → (156,146)` | 7 | 5.4 | 108 | broken cyan upper-wing coverts |
| kingfisher crown | `crown-barbs` | `(106,73) → (127,64) → (152,77)` | 8 | 4.4 | 111 | short black/blue/ice-blue crown marks |

Each field is generated in **three** colour strata (shadow/base/light) with independently named traces: 21 detail tracks total and 942 individual root-to-tip strokes. Taper appearance comes from a thin, short, slightly bending low-opacity line, **not** an accurate variable-width pencil nib. The fields use deterministic seeded local variations, a smooth root/tangent from the authored axis and lateral spread kept within the parent's silhouette clipping; see `src/video/colored-pencil-anatomical-fibres.ts`. Rootedness is authored analytically, not verified against a photographic hair segmentation.

### Rig hierarchy and state

- Actor placement → parent part pose → pigment region and clipped details → each semantic trace's own subtler pose.
- Independent detail tracks: max **12 per part**, **48** across up to six actors, **24 keys per track**. Referential integrity requires trace IDs to exist within the parent's authored details. All transforms are bounded and validated; no arbitrary scripting.
- Fox ruff/guard hairs flex a few degrees with head/tail gestures; the kingfisher's coverts/primaries respond to wing movement while remaining attached to the wing parent. No piece of photographic fur is merely moved as one bitmap.
- Storybook remains in **Video Production / Film Looks / Colour-pencil → Character performance**. Three choices: independently posed fibres, fixed fibres following their parent only, or hidden fibres. There are two new macro crops, fox ruff and kingfisher shoulder coverts, plus existing frame-seek, aspect and material controls.

## Real quality gates

Tests: `tests/colored-pencil-anatomical-fibres.test.ts` checks finite authored paths, 942 individual short root-to-tip subpaths, transform validation, every named detail reference, original region count, hierarchical inheritance, seek/reduced-motion equivalence in 16:9 and 9:16, and safe failure cases.

Actual Chromium evidence: `tests/e2e-storybook/colored-pencil-anatomical-fibres.spec.ts` checks 21 semantic tracks rendered inside 24 original regions, motion vs frozen and hidden view, exact rewind and 16:9/9:16 composition screenshots, 4× fox ruff and feather-coverts crops. Dedicated path-scoped workflow `colored-pencil-fibre-visual-proof.yml` captures these to an artifact without expanding routine CI. Inspect those pixels before merging; screenshots do **not** automatically pass artistic standards.

**Known unresolved art gaps:** Actual fox muzzle/head proportions in the editable rig still differ considerably from high-fidelity animal work; wing feather overlap lacks individually colored, closed rachis/vane silhouettes; colour-pencil pigment pass can still appear like low-pressure SVG speckling; generated hairs are hairline strokes, not realistic tapered triangular strands; eyes, fur shadows and lighting remain too schematic. Full-motion 30fps normal-speed review and artist-led five-axis acceptance are pending. Do not represent this change as parity with the referenced artists.