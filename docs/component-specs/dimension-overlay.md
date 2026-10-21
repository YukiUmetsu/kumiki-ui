# DimensionOverlay (V07) — measured dimensions on 2D and 3D assets

**Scope:** Dimension lines, layer-thickness chains, areas, angles and scale references whose values come from the asset's own meters, never from screen pixels. They draw over a 3D viewer or inside a 2D SVG.

## Install and inspect
- Registry items:
  - `dimension-overlay` (resolve + layout + `DimensionOverlaySvg`);
  - `measure-units` (length, area and angle text; also used by ComparisonStage);
  - `domain-home-dimensions` (`houseDimensions(layout, sets)`).
- Storybook: **House Math → Dimension Overlay**.
  - House presets in three 3D views: an overview, the roof layers edge-on at the gable, and the side with wall stack, foundation and pitch.
  - The same specs on the 2D cross-section.
  - Units in metric and imperial.

## Minimal usage
~~~tsx
const specs = houseDimensions(layout, ["overall", "roof-layers", "pitch"]);     // or author DimensionSpec[]
const { dimensions } = resolveDimensions(specs, { units: "metric" });          // true values in meters
const projector = createThreeCalloutProjector({ camera: heroViewCamera(asset, view, w, h), viewport: { width: w, height: h }, root: asset.group, parts: asset.parts });
const laid = layoutDimensions(dimensions, { project: projector.project, viewport: { width: w, height: h }, frame });
<svg viewBox={`0 0 ${w} ${h}`}><DimensionOverlaySvg dimensions={laid.dimensions} /></svg>;
~~~
For 2D, pass a projector such as `p => ({ ...toPx(section.project(p)), inView: true })`.

## Contracts
- **Kinds:**
  - `length`, a line with extension lines and ticks;
  - `chain`, consecutive segments such as layer stacks, with an optional total;
  - `area`, a planar polygon of any orientation (Newell normal);
  - `angle`, an arc, in degrees or roof `pitch` (rise:12);
  - `scale-reference`, a 1.75 m person or a bar of `meters`.
- **Sources.**
  - Points are raw coordinates, `{ anchor }` or `{ part, at: [-1..1 per axis] }` from an InspectableAsset. Values are measured from them in `metersPerUnit`.
  - An authored `{ value, source }` is shown instead of the measured value. It needs a source (`dimension-unsourced`). A difference beyond the tolerance (default 2%) raises `dimension-mismatch`.
  - Unknown references raise `dimension-ref-unknown`; zero lengths are errors.
- **Readable labels.**
  - Labels stay upright along their line.
  - Spans too short for their text move their labels to a stacked column with leaders, which is how thin layers such as 2 mm underlayment are labelled.
  - Collisions with other labels or `avoid` rects are resolved by flipping or pushing; otherwise the label is reported `unplaceable` (never silently dropped).
- **Honest projection.** A dimension seen at less than `foreshortenLimit` (default 50%) of its square-on length is flagged `foreshortened`. It is drawn in the warning color and keeps its true value. Dimensions whose anchors leave the frame are `outside`.
- **Draw-on.** Each spec has a `frames` window. Extension lines draw first, then the line grows from its center, then ticks and labels appear. Evaluation is pure per frame.
- **House model.** `ROOF_LAYERS` and `SHINGLE_THICKNESS` are shared by the 3D build and the dimensions, so a roof stack label (16 mm decking, 2 mm underlayment) is the built geometry. `HouseDimensionOptions` chooses where stacks cut: `wallAt` (fraction along the front wall) and `roofAt` (`gable` or `field`).

## Limitations
- Text width uses a deterministic estimate unless `measure` is supplied; pass a DOM/canvas measurer for exact fonts.
- Lines are not occlusion-tested against the model (extension lines may cross geometry); place dimensions on visible faces or in sections.
- Layer stacks inside closed walls are only meaningful in a section or cutaway view, so combine them with SectionReveal for 3D.
