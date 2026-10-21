# ComparisonStage (E04) — fair side-by-side comparisons in 2D or 3D

**Scope:** Lays out two or more subjects so that size is either honestly comparable or honestly labeled as not comparable. The planner is renderer-neutral. Slot content can be a 3D `HeroAssetViewer`, a 2D SVG (floor plans, sections) or anything else.

## Install and inspect
- Registry item: `comparison-stage` (planner + `ComparisonStageView`). Equipment fixtures come from `createHomeEquipment3D` in `domain-home-3d`.
- Storybook: **House Math → Comparison Stage**. It covers house presets (3D), water heaters and HVAC equipment (3D), non-home finance objects (3D) and floor plans (2D). Every set can be shown at equal or fit-each scale, from several view angles, in 16:9 and 9:16, in metric and imperial.

## Minimal usage
~~~tsx
const plan = planComparisonStage({ id: "heaters", scale: "equal", dimension: "height",
  subjects: [subjectFromHero("tank", "Tank", tankAsset), subjectFromHero("tankless", "Tankless", tanklessAsset)] }, { width: 1600, height: 900 });
<ComparisonStageView plan={plan} width={1600} height={900} renderSlot={slot =>
  <HeroAssetViewer createAsset={make[slot.id]} width={slot.rect.width} height={slot.rect.height} camera={comparisonCamera(slot, subject[slot.id], view)} />} />;
~~~

## Contracts
- **Scale policy is always declared.**
  - `equal`: one px-per-meter for every slot, chosen so the largest subject fits. Elevations stand on a shared ground line, with one shared scale bar.
  - `fit-each`: each subject fills its slot. The stage is captioned "Not to scale", and every slot gets its own scale bar and a `×ratio` badge (`fit-each-scale` info diagnostic).
- **Real-world sizes.** Subjects carry `[w, h, d]` in meters. `subjectFromHero` derives the size from authored `bounds × metersPerUnit`. Projected extents follow the declared view (front, angled or top). Invalid sizes are errors.
- **No silent enlargement.** A subject that becomes tiny at the shared scale is reported (`subject-tiny`) with advice to add a labeled inset or a fit-each view. It is never scaled up quietly.
- **Matched 3D cameras.** `comparisonCamera` uses the same fov and view angles for every slot. It solves the distance and aim so the subject's projected bounding box lands on the planned rect.
  - Perspective still shows a little of off-axis faces (a roof seen from below eye level).
  - The remaining mismatch is returned as `residual` (shown per slot in the story; about 5–8% in height for deep houses, with exact widths).
- **Measurements.** `dimension` chooses the printed quantity: `height`, `width`, `depth`, `footprint` (with area), `volume` (envelope) or `none`. Units are `metric` or `imperial`.
- **Layout.** `auto` gives a row on wide stages (up to 5), a column on tall stages (up to 3), otherwise a grid. Labels, measurements and captions are real text in reserved strips below each slot.
- **Shared lighting.** Pass the same `studio` options to every viewer. Each slot still has its own studio backdrop, sized to its asset.

## Limitations
- A per-slot viewer is used rather than one shared scene. Equal scale is therefore defined by the solved box fit, not by literal co-placement in one world.
- Bounding boxes include authored extras such as mounts, vents, pads and plinths; caption them (the story does this for the wall-hung tankless unit).
- Human visual review is still needed for materials and the readability of very small subjects.
