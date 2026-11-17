---
name: kumiki-terrain
description: Use when drawing, painting, animating or reviewing mountains, valleys, volcanoes, mesas, dunes, cliffs, hills or any landscape ground in Kumiki in any art style, especially when mountains look like random triangles, a volcano is drawn as a straight cone, snow covers vertical cliffs or sits at the wrong height for the place, trees grow above the treeline, valleys are V-shaped where glaciers were, dunes have no slip face, or distant ranges do not fade.
---

# Kumiki terrain (GEO1)

The pack `terrain` decides *what the ground is*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/terrain.md) for the API; this is the working order.

1. **Name the landform by how it formed.**
   - Pick it from `LANDFORMS`: a fold range, a glacial horn or U-valley, a river V-valley, a strato-, shield or
     cinder volcano, a mesa, a dune, scree, a sea cliff or hills.
   - Its `slope`, `relief` and `profile` are the silhouette to draw.
   - A stratovolcano is concave (steep top, flaring foot). A straight cone is a cinder cone. A shield is a low line.
2. **Put snow and trees at the right heights.**
   - `snowlineAt(latitude)` and `treelineAt(latitude)` give the heights: the Alps about 2,900 m and 2,100 m; tropical
     peaks about 4,800 m and 3,800 m.
   - Snow lies lower on slopes facing away from the sun and does not hold on faces steeper than about 50°: cliffs
     stay dark.
3. **Loose material lies at its angle of repose** (`ANGLE_OF_REPOSE`, about 30–40°). Scree fans out under cliffs,
   and a dune's slip face is about 33°.
4. **Distance is planes.** Draw three to five ranges, each lighter, bluer and simpler (`DISTANCE_NOTES`; SKY1's
   visibility).
5. **For a realistic landscape or a painting reference**, render it:
   - `TerrainView` / `renderTerrain({ kind, seed, latitude, winter, sunElevation, sunAzimuth, visibilityKm })`;
   - to build your own ground, use `terrainHeightfield` (eroded) and `terrainHeightAt`.
6. **Review.**
   - Compare the silhouette with the landform's `profile` and its slopes.
   - Check snow on cliffs, trees above the treeline, and ranges that do not fade.
   - Record what you checked; renders are not a human visual review.
