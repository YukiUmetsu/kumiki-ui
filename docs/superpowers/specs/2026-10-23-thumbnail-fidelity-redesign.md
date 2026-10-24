# Thumbnail fidelity redesign — design

## Intent

Bring Kumiki-UI's three House Math editorial Storybook previews close to the newly approved cinematic reference PNGs, while keeping the deliverable a reusable, independently editable media composition rather than a flattened picture. The references are visual targets, not a promise of pixel-identical reconstruction.

## Goals and non-goals

- Make three publication-quality 16:9 examples: housing-cost reveal, HVAC expense, and rent-versus-buy.
- Preserve replaceable photographic backdrops, editable headline/cue text, and independently authored accents in the canonical `MediaDocument` export path.
- Generalize the authoring controls for arbitrary editorial subjects. House Math names, words, and colors belong only in demo fixtures.
- Provide Storybook display at full size and 320/160/96-pixel inspection; export browser-rendered PNGs and record human visual QA.
- Retain deterministic safety checks for clipping, readability, image placement and text overlap, but do not claim they judge aesthetic quality or CTR.
- Do not add an image-generation service, a thumbnail editor UI, a new exporter, predictive marketing grades, or automatic image segmentation.

## Approaches considered

1. **Flatten the generated reference PNGs** — most visually faithful and cheapest, but destroys the editable composition contract. Rejected.
2. **Text-free photographic scenes plus code-native editorial layers** — closest to the references while preserving editability and reusable authoring controls. Recommended.
3. **Code-only 2D/3D scenes** — maximizes procedural control but cannot efficiently reproduce the desired photographic realism. Rejected for these examples.

## Proposed design

### Generic composer

Extend the existing `composeEditorialThumbnail` without changing behavior for existing inputs. Add an opt-in `full-bleed` art direction in which the caller supplies a text-free 16:9 photo scene whose subject and negative-space composition are already art-directed; Kumiki adds independently editable title layers and optional graphic accents. Keep ordinary `subject-left`, `subject-right`, and `split-comparison` paths intact.

The caller declares explicit normalized text frames, desired type sizes, tracking, alignment, and optional shadow/stroke treatment within bounded public options. No smart guessing from image pixels. Validate bounds and conflicting declarations before creating the canonical M0 document. Support multiple text layers, including a central `VS` cue, without fixed layout-specific positions. Always preserve source asset attribution and license metadata.

### Examples and assets

Produce text-free scene source PNGs from the approved references, keeping believable house/HVAC subjects and the overall scene lighting; reference PNGs themselves are not used as production layers because their letters are baked into pixels. If removal cannot preserve clean background or composition, author replacement text-free scenes rather than obscuring in-image letters with boxes.

- **House cost:** right-side illuminated home; large left-side `$500K` and `ISN'T THE COST`, restrained gold accent.
- **HVAC:** dominant condenser/copper mechanism on right; `WHY SO` / `EXPENSIVE?` at left.
- **Rent versus buy:** contrasting but credible residential contexts; `RENT` and `BUY` high on opposite sides, `VS` near center.

The layer geometry should deliberately match the selected scene assets; flexible normalized controls remain available to consumers with different imagery. Existing generic recipe examples remain documented as structural scaffolds, not photo-quality thumbnail examples.

## Verification / release criteria

1. Tests demonstrate explicit frame validation and editable image, text and accent layers, including CJK text and bad frame rejection.
2. Existing thumbnail and export tests remain green, plus typecheck, build, and catalog checks when registry metadata changes.
3. The Storybook examples export valid 1280x720 PNGs with no baked reference text; replacing the headline in fixture data changes the exported image.
4. Compare actual Storybook/exported output against each approved visual reference at full size and 320px. Record human visual inspection of subject clarity, text hierarchy, spacing, depth, and crop; do not substitute passing geometry tests for this gate.
5. One PR with implementation, rights/provenance notes, tests, and before/after evidence; no merge without human visual sign-off.

## Constraints / judgment calls

- The public API must remain industry-neutral; only Storybook cases mention House Math.
- No runtime AI calls, external stock downloads, or newly required packages.
- Browser raster export may differ from generated typography because source artwork uses baked type. A close visual family, not pixel equality, is the target.
- For nuanced visual effects not supported by M0, prefer small reusable image/shape layers over bypassing its exporter.

### As-built distinction

The approved benchmark previews led to text-free, full-bleed photographic
scenes rather than independently assembled photo cutouts. The final House Math
headlines and `VS` are editable M0 text. The photographic objects and gold arc
or diagonal separator **within a scene remain pixels**, not individual
`EditorialProp`s. Generic editorial props remain available for consumers
requiring individual asset placement. This tradeoff, its image provenance and
the separate PNG export review are disclosed in `ASSETS.md` and the thumbnail
verification report; it is not described as a fully editable photo scene.
