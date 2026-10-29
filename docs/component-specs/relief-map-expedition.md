# Relief-Map Expedition Scene

`relief-map-expedition` starts above a physical terrain model, descends once to an
oblique view, traces a geographically registered route over the real surface and holds
a labelled destination. Supply a `SceneTemplateSpec<"relief-map-expedition">`. The caller
owns playback and supplies `frame`; the component creates no clock.

**Causal beat.** *Input:* a licensed elevation model, a route and a destination.
*Transform:* the terrain is lit by a low oblique sun with cast shadows and sky
occlusion; the camera descends from overhead to the expedition view; the route
draws along the draped surface. *Output:* the destination ring and label, plus the
large readout, held together.

**Beats.** `cueFrames` are *dock*, *reveal* and *resolve*.

- **Establish (0 → dock):** an overhead, north-up view of the whole model with the
  title. The camera is already pushing in and turning on frame 0 (cubic ease-out from 1.2×
  distance and −12° yaw), so the hook has no dead lead-in. In landscape the model sits
  right of centre, clear of the title column.
- **Descend (dock → reveal):** one smooth move from 86° to the oblique pitch. Notes
  (exaggeration, route provenance, credit) appear. The camera then drifts only slightly
  for the rest of the scene.
- **Trace (reveal → 82% of the way to resolve):** the route draws from its start ring,
  arrowhead leading. The start label holds during the climb. The arrowhead uses SA1's
  `headingWindow: 0.1` and `maxTurn: 6`: heading is averaged over the last tenth of the
  route and never turns faster than 6° per frame. That is a pure replay from the trace's first frame,
  so seeking stays exact. Measured on the demo: maximum turn 6° per frame (16.7° without the
  cap, 172° with the raw local segment).
- **Arrive and hold:** the arrowhead hands over to the destination ring, which pulses
  in, and the destination label and the readout (`detailLabel` and `detail`) land.

**Geometry is real.** The heightmap is decoded (Terrarium RGB) and drawn as a WebGL 2
heightfield mesh (288² vertices) with model-block skirts. Lighting is baked once per
input set: hypsometric albedo × (sky ambient × local occlusion + sun × cast shadow
found by marching each texel towards the sun). Light uses the exaggerated surface the
viewer sees. Haze begins at the subject, so only far terrain recedes. The route is
densified along the surface (80 m steps), smoothed along its length
(`route.smoothing`, Gaussian over arc length, default 0.6 km, endpoints kept exact), lifted
25 m, and projected through the same view-projection matrix as the mesh. Segments the
terrain hides from the eye by more than 120 m are dropped by a heightfield march.
Grazing crests are ignored, so they don't chop a route on a camera-facing flank. Labels and marks are SA1 annotations in stage space,
so their typography matches the other scene templates. Pure geometry lives in
`registry/video/relief-terrain.ts`.

**Inputs.** All visible copy is an input.

| field | purpose |
|---|---|
| `title`, `eyebrow` | display title and kicker |
| `terrain` | `{ heightmap, encoding: "terrarium", bounds, projection?, source }`; Terrain Tiles are Web Mercator |
| `verticalExaggeration` | 1–5; anything but 1 requires `exaggerationNote`, which is always shown |
| `route` | `{ points, label?, smoothing? }` in travel order, inside the bounds; `smoothing` in km (0–2, default 0.6) trades a little accuracy for a calm line |
| `destination` | `{ latitude, longitude, label, detail?, detailLabel? }` |
| `routeNote`, `credit` | provenance lines shown with the exaggeration note |
| `light` | sun azimuth (from north, clockwise) and altitude 3–80°; default 250° / 24° |
| `palette` | hypsometric `#rrggbb` stops in metres; the default is elevation-relative |
| `water` | colour for elevations at or below 0 m |
| `camera` | oblique `yaw` (0 = from the south), `pitch` 10–70°, `distanceScale` 0.5–3 |
| `look` | `grain`, `vignette` |

**Honest states.** The stage reports `data-km-terrain-state` as `loading`, `ready` or
`error`. While loading it shows the title and notes over the backdrop, never a fake
terrain. Without WebGL 2 it says so in place of the map. The canvas reports the frame it
last drew in `data-km-gl-frame`, so capture can wait for an exact frame. The drawing
buffer is twice the composition size in both aspects. Reduced motion cuts from the
overhead view to the settled oblique view at the descent beat. It also draws the route
and destination settled in their windows and stops grain drift.

**Typography and safety.** The title is 12.4% of the short side, and the readout
about 10%. Labels are 2.9%, and the notes 2.4%. Landscape keeps copy in a left column
(title top, readout bottom) with notes top right. Portrait stacks title, terrain and
readout, with notes at the foot. The rendered-bounds pass found no overlaps or out-of-stage text
at checked frames in either aspect.

**Limits.** The terrain is a baked-light model, not a physically based sky; sun
direction is fixed per input set. Route occlusion is sampled, not exact. Very large
regions are limited by heightmap resolution (1024² in the demo, ~26 m per pixel).

Storybook: **Video production / Scene Templates / Relief Map Expedition**. The demo uses
Terrain Tiles zoom 12 for Mount Rainier (16 tiles stitched to 1024²), built from USGS
3DEP and SRTM data (public domain in the US; credit "courtesy of the U.S. Geological
Survey"). A US location was chosen because the SRTM terms assert copyright for
distribution outside the United States. The route is a least-cost path computed over
that elevation between Paradise, Camp Muir and Columbia Crest. It is **not** a guided
climbing route, and the scene says so. Height is exaggerated ×1.5 and declared on screen.
The 4,392 m readout is author-supplied copy; the stitched DEM peaks at 4,388 m. The demo
has no audio. Human visual review at normal speed remains open.
