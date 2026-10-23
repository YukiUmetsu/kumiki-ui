# MapStage — walk through licensed map geometry

**Status:** Implementing (first vertical slice). Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** Phase 4 (subject breadth), in [17 — Explainer Visual Components](../17-explainer-visual-components.md#4-high-value-expansion-components-p1). Subjects: history, geopolitics, supply chains, population.
**Scope (this slice):** Caller-supplied GeoJSON-style geometry with a mandatory attribution; equirectangular and orthographic projections fitted to the output; regions filled by a legend key; routes that draw by frame; pins with measured labels; a camera that eases to a feature's bounds and then holds; a legend and an attribution line that are always drawn.

Not in this slice: a geographic database, any bundled or fetched geometry, basemaps, graticules, Mercator or other projections, route styling beyond one colour, region labels, antimeridian-crossing geometry, and clipped polygon geometry at the orthographic horizon (features that cross it are not drawn and are reported).

## Reuse and the gap it fills
- **Reused:**
  - **Text measurement:** `createCanvasMeasurer` (media-document), so label, legend and attribution widths come from the real face.
  - **Wrapping:** `layoutCaptionLines` (caption-track) for the attribution line, so it wraps and is never truncated.
  - **Easing:** `evaluateEasing` (motion-track) for camera moves and route progress.
  - **Route heads:** `samplePolylineAt` (flow-path), the arc-length sampler, to place the head of a route that is still drawing.
  - **Seek checks:** `inspectSeekParity` (explainer-principles) in the tests.
- **Not reused:**
  - **LocationPin2D:** it draws an abstract street-grid tag, not a map. Pins are drawn here as circles with measured labels.
  - **d3 / geo libraries:** the brief excludes them. The two projections are short pure functions in the core.
- **The gap:** the registry had no way to walk a viewer through caller-licensed geometry with stable identities, exact camera fits, and legible labels, where the licence is always visible.

## Install and inspect
- Registry item: `map-stage` (`map-stage.ts`, `map-stage-react.tsx`). Target path: `components/visual/`.
- Storybook: **Visual / Map Stage**.
  - **Walkthrough:** three invented domains, one component, each shown at 9:16 (1080×1920) and 16:9 (1920×1080). Each is labelled "Fictional geometry, no real boundaries" on screen.
    - **Supply chain:** an invented island chain on an orthographic view, with three supply legs.
    - **Population:** invented regions and flow lines on an equirectangular view. The lines show direction only; no volume is implied.
    - **History:** an invented border between two invented states, with a crossing gate and an envoy route.
  - **Refusals:** six deliberately broken variants of the population map, each with the code it must raise: missing licence, latitude beyond ±90, unknown route endpoint, colliding pin labels, unknown projection, and an attribution that cannot fit.

## Minimal usage
~~~tsx
const spec: MapStageSpec = {
  id: "routes", fps: { num: 30, den: 1 }, projection: "orthographic",
  collections: [{ type: "FeatureCollection", id: "invented", attribution: { source: "…", licence: "…" }, features }],
  routes: [{ id: "leg-1", featureId: "route-1", from: "port-a", to: "port-b" }],
  legend: [{ key: "main", label: "Main island (invented)" }],
  beats: [
    { id: "chain", kind: "establish", durationFrames: 60 },
    { id: "leg-1", kind: "route", routeId: "leg-1", durationFrames: 75 },
    { id: "dock", kind: "focus", targetId: "port-b", durationFrames: 90 },
  ],
};

<MapStageView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Geometry:** `MapCollection { type: "FeatureCollection", id, attribution, features }`.
  - Features are `{ type: "Feature", id, geometry, properties? }`.
  - Geometry is `Point`, `LineString`, `Polygon` or `MultiPolygon`, with `[longitude, latitude]` positions in degrees.
  - `properties.name` labels a pin. `properties.fillKey` colours a region through the legend.
- **Attribution:** `{ source, licence, url? }` is required on every collection. Missing or empty source or licence is refused (`map-attribution-missing`). A URL must be http(s).
- **Routes:** `{ id, featureId, from, to, color? }`.
  - `featureId` must be a LineString. `from` and `to` must be Point features.
  - The first and last positions of the LineString must equal the pins exactly.
  - A route is drawn by progress during its beat, then held at full length.
- **Beats:**
  - `establish`: fits every feature.
  - `route`: fits the route, then draws it.
  - `focus`: fits one feature (a point, line or region) and holds.
  - The camera eases from the previous beat's view over `moveFrames` (default 30), then holds.
- **Projections:**
  - `equirectangular`: x = Δλ·cos φ₀, y = φ − φ₀.
  - `orthographic`: the standard globe projection, with features partly behind the horizon not drawn.
  - Fits keep the projected extent aspect-preserving, use one scale for both axes, and leave `padding` (default 0.12) clear. A single point gets at least `minSpanDeg` (default 4°).
  - After fitting, the camera zooms out until every pin in the viewport has its full label inside it.
- **Layout:** `layoutMapStage(spec, box, options)`.
  - The legend sits in a top band, wrapped by measured width. The attribution sits in a bottom band, wrapped by measured lines. The map gets the rest, and must keep at least 35% of the height.
  - Options: `measure`, `labelPx`, `legendPx`, `attributionPx`, `readablePx?`, `family?`, `padding?`, `minSpanDeg?`.
- **Evaluation:** `evaluateMapStage(spec, layout, frame)` is pure. It returns the beat, the camera, screen-space features, route progress and pins with label rectangles.
- **Validation:** `checkMapSpec(spec)` is structural and needs no measurement.
  - **Errors:** `map-projection-unknown`, `map-attribution-missing`, `map-attribution-url-invalid`, `map-feature-duplicate`, `map-position-invalid`, `map-coordinate-range`, `map-line-invalid`, `map-ring-invalid`, `map-ring-open`, `map-geometry-unsupported`, `map-no-geometry`, `map-fill-key-unknown`, `map-legend-duplicate`, `map-route-duplicate`, `map-route-unknown`, `map-route-endpoint-mismatch`, `map-target-unknown`, `map-beat-invalid`.
  - **Layout errors:** `map-attribution-unfit`, `map-legend-unfit`, `map-viewport-too-small`, `map-measure-unavailable`.
  - **Frame checks (every frame):** `map-label-collision` (error at a settled view, warning `map-label-collision-moving` while the camera moves).
  - **Warnings:** `map-legend-unused`, `map-route-unused`, `map-antimeridian`, `map-label-outside` (a pin in the viewport whose label is cut off), `map-feature-behind-horizon`, `map-text-small`.
- **Component:** `MapStageView` owns no clock.
  - **Props:** `spec`, `frame`, `width` / `height`, `family?`, `onDiagnostics` (called only when the diagnostics change), plus forwarded `div` props and ref.
  - Root attributes: `data-km-map-stage`, `data-map-stage-beat`, `data-map-stage-status` (`ready`, `pending` until fonts load, or `error`).
  - Geometry is drawn inside a clip path matching the map viewport, so it never runs under the legend or attribution. A refused spec draws no geometry and lists its errors.
- **Determinism:** no randomness and no clock. Seek parity holds by construction and is checked with `inspectSeekParity`.

## Limits
- Only the four GeoJSON geometry types, in degrees. No altitude; the third position value is refused.
- Antimeridian-crossing shapes draw the wrong way round; they are warned, not repaired.
- Orthographic features that cross the horizon are dropped at that view, with a warning, rather than clipped.
- Labels are single-line and are never wrapped; a label wider than the viewport is warned, not truncated.
- Region names are not drawn, and collisions are checked for pins only, not for region labels.
- Attribution text is whatever the caller supplies. The component cannot verify that a licence permits the distribution.
- Fonts other than the one passed as `family` will mis-measure; pass the same family to every stage.

## Verification (2026-10-23)
- Unit tests: `tests/tmp-map-stage.test.ts`, describe "MapStage core: projections, refusals, timing and seek parity", nine cases. Run with `npx vitest run tests/tmp-map-stage.test.ts` (9 passed). Tests use an injected measurer test double, since jsdom has no canvas; browser runs use `createCanvasMeasurer`.
  - **Fit:** the establish view keeps pins inside the viewport and preserves aspect.
  - **Projections:** the equirectangular centre and the orthographic horizon are correct.
  - **Refusals:** licence, projection, duplicate ids, unknown fill keys, coordinate range, route endpoints, endpoint mismatch, and open rings are each refused.
  - **Labels:** a settled label collision is refused.
  - **Attribution:** it wraps without truncation, and an unbreakable one is refused.
  - **Routes:** progress is zero before its beat, eases across it, and holds.
  - **Camera:** it eases to a focus over `moveFrames`, then holds exactly.
  - **Seek parity:** `inspectSeekParity` passes over the whole timeline.
- Storybook (headless Chromium, 2× device scale): all three domains at frames 0, 70, 130, 200, 260 and 330 on both outputs reached `ready`. No diagnostics were listed at any sampled frame, and there were no console errors.
- Fixed after review:
  - Map geometry drew under the legend. It is now clipped to the viewport.
  - Labels at the edges were clipped. The camera now zooms out until labels fit.
  - The walkthrough hid warnings after re-clicking the selected domain. Views are now keyed by domain.
  - The unfit-attribution refusal echoed a 200-character token and overflowed the page. Its message is now short, and refusal text wraps.
  - Border lines looked like region edges. They now have a heavier, distinct stroke.
- **Human visual review:** pending. All geometry is invented and placed in an open ocean window, with no basemap and no real boundary.
