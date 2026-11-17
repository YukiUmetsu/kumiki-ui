# GEO1 — terrain and landforms for any art style

**Registry pack:** `terrain` (depends on `art-foundations`, `sky-weather`)
**Files:**

- `registry/nature/geo-data.ts`: landforms, angle of repose, snowline and treeline, ground covers, distance notes.
- `geo-terrain.ts`: heightfields and erosion.
- `geo-render.ts`: rendered landscapes.
- `geo-react.tsx`: `TerrainView`, `LandformProfile`, `GeoSheet`.
- `geo-render-pool.ts`, `geo-render-jobs.ts`, `geo-render-worker.ts`: rendering in workers.

**Storybook:** Video production → Art Foundations → Terrain and Landforms → **Sheet**, **Landscapes**, **Terrain lab**.
**Status:** implemented; agent review of renders only — **human visual review not recorded**.

## What it is for

Draw land that reads as real in any medium. The framework decides *what the ground is*: its slopes, its profile, where
snow lies and trees stop, and how distance fades it. A style decides *how it looks*.

## Landforms (`LANDFORMS`)

Twelve landforms, each with:

- how it formed;
- its slopes and relief, as graded ranges with sources;
- a silhouette (`profile`, 21 heights);
- drawing notes, with the common mistakes;
- the heightfield kind that builds it.

The landforms:

- **Fold ranges and glacial horns.** Branching ridges, couloirs, cirques; faces of 40–50° on a horn.
- **U-valleys and V-valleys.** A flat floor and steep walls with hanging valleys, against interlocking spurs.
- **Stratovolcanoes.** A concave profile, 30–35° near the top and about 10° at the foot.
- **Shield volcanoes** (under 10°) and **cinder cones** (straight sides at the angle of repose).
- **Mesas and buttes.** A cap-rock cliff over a talus apron (built from a distance-to-edge field: a flat table, a near-vertical cliff band, then talus at 33°).
- **Barchan dunes.** A windward back of 5–15° and a slip face of about 32–34°.
- **Scree, sea cliffs and rolling hills.**

## Tables

- `ANGLE_OF_REPOSE`: dry sand about 34°, scree 30–40°, cinders about 33°, settled snow.
- `SNOWLINE_POINTS` and `TREELINE_POINTS` are reported anchors, from the equator to 70°. `snowlineAt(latitude)` and
  `treelineAt(latitude)` interpolate between them; the in-between values are estimated.
- `GROUND_COVERS`: albedo ranges for fresh and old snow, ice, rocks, sand, grass, forest and soil, with colours.
- `DISTANCE_NOTES`: Koschmieder fading, and ranges drawn as planes.

## Heightfields (`terrainHeightfield`)

`terrainHeightfield({ kind, seed, n, span, relief, base, rain })` returns heights in metres on an n × n grid. Each kind
has its own natural span, from 1.2 km for dunes to 30 km for a shield.

- **Shape by kind.** Ridged, domain-warped noise for ranges. Concave cones with craters and radial gullies for
  volcanoes. Cap-rock plateaus over aprons, with strata, for mesas. Asymmetric sawtooth transverse dunes. Valleys
  carved as a U or a V along a meander. A cliffed coast with a deep sea floor.
- **Hydraulic erosion** (`erode`): droplets run downhill, eroding where they speed up and depositing where they slow
  (Beyer 2015). This cuts branching gullies and lays fans.
- **Thermal erosion** (`settle`): material settles to its angle of repose; dunes settle at 33°. Mesas skip it, so their
  cap rock stands.
- **Reading heights** (`terrainHeightAt`) works anywhere. Past the edge, ranges continue for mountain kinds and a plain
  for the others, so a horizon never ends in a cut.

## Rendering (`renderTerrain`, `TerrainView`)

Rays march over the heightfield, plus sub-grid ridged detail. Covers follow height, slope and aspect:

- **Snow:** above `snowlineAt(latitude)`, lowered by the season and on shaded slopes, holding only under about 50°,
  and thinned by wind scour near the line.
- **Rock and scree:** rock where the slope exceeds about 38°, and scree at the angle of repose below it.
- **Vegetation:** meadow above `treelineAt` and forest below it, on slopes trees can hold.
- **Other covers:** ash on volcanic cones, sand and sandstone, and water below sea level, with wind waves and a
  Fresnel sky reflection.

Light comes from SKY1's `atmosphere()`: reddened sunlight, sky irradiance by slope, soft terrain shadows marched toward
the sun, and aerial perspective along each ray. Exposure is metered like SKY1's camera. `TerrainView` renders in a
worker, cached, with a half-size preview and a working badge (see `foundation-render.ts`).

## Limits

- The grid is 256–384 points per side, so the nearest ground is detail noise, not modelled rocks.
- Trees are colour, not modelled.
- Snow does not drift.
- Erosion is a droplet model, not a fluid simulation.
