# Orbit World Scene

`orbit-world` opens over the planet's illuminated limb and rises to the whole globe. It
then travels with a great-circle route as the route draws on the surface, and holds the
destination with legible labels. Supply a `SceneTemplateSpec<"orbit-world">`. The caller
owns playback and supplies `frame`; the component creates no clock.

**Causal beat.** *Input:* real locations (latitude/longitude), great-circle legs between
them, and a light source. *Transform:* the camera rises from a dawn limb to the globe,
then follows the route as it draws behind a travelling head. *Output:* an eased arrival
holds the destination in geographic context, with its label, readout and optional media.

**Beats.** `cueFrames` are *dock*, *reveal* and *resolve*.

- **Establish (0 → dock + ¼ of dock→reveal):** a low view across the horizon toward the
  sun, which sits just below the limb. The atmosphere shows a thin blue rim with a
  warm forward-scattered crescent, over a night side with city lights. The camera drifts
  from frame 0. While it pulls back, pitch follows the distance, so the horizon holds the
  lower third until the camera tilts down onto the whole planet. In landscape the globe
  settles right of centre, clear of the title column.
- **Route (dock + 6 → 55% of reveal→resolve):** the origin marker and label land, then the
  legs draw in order behind a glowing head (or the optional `subject` image, rotated to
  the heading). The draw is a smootherstep traverse. The camera follows the journey with
  lag, not exact tracking.
- **Arrive and hold (→ resolve → end):** the camera eases onto a point a few degrees short
  of the destination, so the incoming route stays in view. The destination ring pulses
  once, then its label, the readout and the optional media land. A slow push of about 6%
  settles by the last frame.

**One camera, pure of the frame.** `planOrbitWorld` builds the whole track once from the
payload and timing, then the stage indexes it by frame. Seeking is exact and repeatable.
The track has keyframes for the beats, a zero-phase Gaussian pass (`camera.smoothing`,
default 1 s) and a deterministic roll limiter. The limiter carries the previous up vector
along the move by parallel transport, then turns it toward north-up by at most
**14°/s** (`MAX_ROLL`). Holding north-up across the Arctic would otherwise spin the
frame. Measured on the demo (`cameraRates`): heading change ≤ 22°/s, surface speed
≤ 22°/s, roll ≤ 14°/s. North-up is within 2.6° at arrival and exact by frame 300.
`cameraMatrices` produces the column-major view and projection matrices. The WebGL
camera uses them directly, and markers, route and labels are projected through the same
matrices.

**Lit globe** (`registry/video/orbit-globe-gl.ts`, Three.js, loaded on demand):

- **Surface:** a 384×192 equirectangular sphere with a duplicated seam column and
  repeat-wrapped sampling, so there is no dateline seam. It is lit with a slightly wrapped
  Lambert, giving a soft twilight-wide terminator with a warm band.
- **Night side:** night lights are extracted from the Black Marble luminance, dimmed under
  clouds, over a faint earthshine.
- **Ocean:** Blinn specular from the water mask, Fresnel-weighted, with a deeper ocean tint.
- **Clouds:** cloud shadows are offset down-sun. The lit cloud shell sits at 1.007 R,
  drifts slowly as a function of the frame, and thins at the limb.
- **Atmosphere:** an additive back-face shell at 1.12 R. Its glow is computed from each
  ray's closest approach: a 0.0095 R rim, a faint 0.028 R halo, a sunset tint at the
  terminator and a forward-scattering crescent when backlit. The disc's limb takes the
  atmosphere colour on the lit side.
- **Stars and output:** a deterministic star field (1,400 points); ACES tone mapping
  and dithering.

It is an art-directed approximation, not a scattering simulation.

**2D fallback** (`registry/video/orbit-globe-flat.tsx`). Used under reduced motion, when
WebGL 2 or the day map is unavailable, while textures load, with `renderer: "projection"`
and with `placement: "stylized"`. It is an orthographic SVG disc with the 3D camera's
centre, radius and orientation.

- Natural Earth 1:110m land is filled with horizon-correct Weiler–Atherton clipping.
- Night is drawn as nested soft caps around the antisolar point.
- The atmosphere rim is weighted toward the sun.
- Optional coastlines and graticule are available. Great circles use `sampleGreatCircle`
  from the shared `globe-projection.ts`, which is unchanged.

**Inputs.** All visible copy is an input; the stage renders no fixed English.

| field | purpose |
|---|---|
| `locations` | `{ id, label, latitude, longitude, detail?, image? }`; `detail` is the destination's second line, `image` its arrival media |
| `routes` | ordered `{ id, from, to }` great-circle legs; default: consecutive locations |
| `title`, `eyebrow` | display title (kinetic words) and kicker |
| `readout` | `{ value, label? }`, the large figure held with the destination; `greatCircleKm` helps compute a distance |
| `credit` | source line, shown verbatim |
| `camera` | `opening` `"limb"`/`"global"`, `start` `{ latitude, longitude, altitude? }`, `orbitDegrees` (lead-in along the route's circle, default 32), `destination` id, `establishAltitude`/`arrivalAltitude` (Earth radii), `smoothing` 0.2–2 s, `fixed` |
| `globeRadiusPercent` | establishing globe diameter as % of the short side, 30–90 |
| `textures` | `{ day, night?, water?, clouds? }` equirectangular maps, 0° longitude at the centre |
| `sun` | subsolar `{ latitude, longitude }` or `{ time }` (UTC ISO; NOAA approximation, about 0.1°). Default: illustrative light solved so the opening horizon is at dawn and the destination is ~42° from the subsolar point |
| `atmosphere` | `{ color: #rrggbb, strength 0–2 }` |
| `layers` | `clouds`, `stars`, `nightLights` (default on), `coastlines`, `graticule` (default off; coastlines are forced on in the 2D globe without textures) |
| `palette` | `route`, `marker`, `ink`, `space`, `ocean`, `land` (`#rrggbb`); route and markers default to the scene `accent` |
| `typography` | `display`, `body` font stacks |
| `renderer` | `"auto"` or `"projection"` |
| `placement`, `globe`, `subject` | v1 fields (see migration) |
| `look` | `grain`, `vignette` |

**Migration from v1.** v1 payloads (`globe`, `locations`, `placement`, `subject`, `camera`
`{latitude, longitude, orbitDegrees}`, `globeRadiusPercent`) still validate.
`resolveOrbitWorld` migrates them:

- `camera.latitude/longitude` becomes the opening view. v1 used it as a fixed camera with
  a small wobble; set `camera.fixed: true` for a fixed comparison camera.
- `orbitDegrees` becomes the lead-in arc along the route's circle.
- Routes default to consecutive legs, and the destination is the last leg's end.
- `placement: "stylized"` forces the 2D globe with `globe` as a faint overlay.
- `subject` now rides the route head, rotated to the heading.
- `globeRadiusPercent` keeps its meaning as the establishing size.

Validation is in `checkOrbitWorld` and covers ids, route references, coordinates,
altitudes, colours, sun time and empty copy.

**Labels.** Labels are HTML chips: solid backing, an accent edge and a solid leader from
the marker. Their padding is at least 2.1% × 1% of the short side. Sizes are measured
conservatively with a CJK-aware em estimate and wrap at 30% of the width (60% in
portrait). `layoutLabels` places them greedily by priority (destination, origin,
waypoints). It flips away from frame edges and avoids the title, readout, credit and media
regions, other labels and markers. A side is chosen **once**, at the label's reference
frame (the arrival for the destination, just after its appearance for the origin). It is
then held and clamped into the 4% safe area while the camera moves, so labels never jump
sides mid-move. Markers fade out at the limb. The title is up to 9% of the short side,
fitted to the longest word. The readout is up to 8.5%, labels 2.5–3.6%, secondary text
and credits 2.3–2.6%.

**Honest states.** The stage reports `data-km-globe-state` as `loading`, `globe` or
`projection`, and `data-km-orbit-mode`. While textures load it shows the 2D globe, never
a blank frame. The GL canvas reports the frame it last drew in `data-km-gl-frame`. The
drawing buffer is twice the composition size. Reduced motion shows the settled
composition in the 2D globe. Labels, route and readout cut in on their beats, and grain
and cloud drift stop.

**Registry.** `orbit-world` depends on `scene-template-foundation`. The foundation now
lists `three`, because the stage dynamically imports the GL module; Three.js is fetched
only when a lit globe is drawn.

**Verification done.** Storybook frames were rendered in 16:9 and 9:16, EN/JA/long copy,
reduced motion (2D) and the WebGL globe (SwiftShader). Close-ups of the terminator, rim
and dawn limb were inspected. An automated rendered-bounds pass checked every frame of
both aspects: text inside the stage, no overlaps, no clipped chips. Every frame was
encoded to MP4. Five targeted tests cover v1 validation and migration, camera purity and
rates, the subsolar point, cap clipping and label layout, and the reduced-motion render.

**Limits.**

- This is not photorealism. The atmosphere, cloud shadows and night lights are
  approximations; there is no terrain relief or true volumetric scattering.
- Close arrivals are bounded by texture resolution: the 4k day map is about 11 px per
  degree.
- The water mask is a colour classification, so some dark lakes and July sea ice read as
  water.
- The 2D fallback's 110m land is coarse at close range.
- The route is drawn above the cloud shell for legibility. It is a stylized choice.
- Human visual review at normal playback speed remains open.

Storybook: **Video production / Scene Templates / Orbit World** (copy control EN/JA/long).
The demo flies London Heathrow (51.470° N, 0.454° W) to Tokyo Haneda (35.549° N,
139.780° E): 9,590 km, computed with `greatCircleKm`. Imagery:

- NASA Earth Observatory Blue Marble: Next Generation (July 2004) and Black Marble 2016.
- NASA Visible Earth cloud composite (not a specific day).
- An ocean mask derived from Blue Marble.

NASA imagery is public domain in the US; see `assets/THIRD_PARTY_ASSETS.json`. The
lighting is illustrative and says so. The demo has no audio.
