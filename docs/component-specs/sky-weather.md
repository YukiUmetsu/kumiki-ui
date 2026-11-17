# SKY1 — sky and weather framework for any art style

**Registry item:** `sky-weather` (needs `art-foundations`, `plant-anatomy` for the demo scene's trees) · **Files:**
`registry/nature/sky-*.ts(x)` · **Storybook:** Video production → Art Foundations → Sky and Weather (Sheet, Weather
lab, Cloud genera, Cumulus study, Cloud genera rendered, Sky lab) · **Skill:** [kumiki-sky-weather](../../skills/kumiki-sky-weather/SKILL.md) · **Research:**
[sky and weather framework, 2026-11-16](../research/sky-weather-framework-2026-11-16.md),
[rendered skies and volumetric clouds, 2026-11-16](../research/sky-volume-clouds-2026-11-16.md)

SKY1 holds what stays true about weather in every art style, so rain drawn in woodblock, pencil, paper or 3D falls at
the same speed and slant. Its clouds sit on the same base plane, and fog fades things by the same rule. The style
decides only how it looks. It sits beside ANAT1 (people), ANIM1 (animals) and FLORA1 (plants) and shares their
foundation module.

SKY1 is a knowledge and construction layer. It does not replace the particle renderer: `toEnvironmentalEffect` turns
a weather state into an `environmental-effects` spec, so the existing three.js and SVG renderers draw the rain and
snow at real speeds.

## What it is for

- **Choosing weather that hangs together.** `weatherState({ precipitation, intensity, wind, obscurity, clouds,
  cover, sunElevation, thunder })` derives everything else:
  - drop size and fall speed;
  - slant and visibility;
  - the clouds that bring that weather;
  - the sky's colours;
  - notes in words from the sources.
- **Drawing clouds.** `cloudShape(genus, { seed, width, species, sun, wind })` gives layered path data for each of the
  ten WMO genera. `cloudDeck(genus, camera)` sets a genus in perspective: bases on one plane, rows converging on the
  horizon, distant clouds flattened and faded.
- **Animating rain and snow.** Pass `toEnvironmentalEffect(state, { region, unitsPerMetre, fps })` to `compileEffect`.
  Speeds and drift are the real ones at your scale; density follows the number of visible drops.
- **Painting a sky for a time of day.** `skyGradient(sunElevation, cover)`, `skyPhase`, `sunElevation(lat, day,
  hour)`, `shadowLength`.
- **Storms and light.** `lightningFlash(seed)` gives the stroke timing (the strobe), `lightningChannel` a branching
  bolt, `thunderDelay(km)` the wait, and `rainbow(sunElevation)` the bows.

## Data (registry/nature/sky-data.ts)

Every number is graded `reported` (quoted from a cited source), `measured` (sampled off a CC0 or public-domain
reference) or `estimated`.

| Table | What it holds | Grade and source |
| --- | --- | --- |
| `BEAUFORT` | Forces 0–12: m/s, wave heights, sea and land signs | reported, Wikipedia |
| `RAIN_CLASSES` | Light < 2.5, moderate 2.5–7.6, heavy 7.6–50, violent > 50 mm/h | reported, Wikipedia (UK practice) |
| `SNOW_CLASSES` | By visibility: light ≥ 1 km, moderate 0.5–1, heavy < 0.5 | reported, AMS Glossary |
| `OBSCURITY_CLASSES` | Fog < 1 km, mist 1–2, haze 2–5 | reported, Wikipedia (international definitions) |
| `HYDROMETEORS` | Drizzle, rain, snow and hail: size, fall speed, look | reported (Wikipedia; Locatelli & Hobbs 1974) |
| `CLOUD_GENERA` | Ten genera: étage, base and top heights, form, look, weather, colours | heights and look reported (Wikipedia); colours estimated; 1896 Cloud Atlas plate each |
| `ELEMENT_WIDTH_DEG` | Cc < 1°, Ac 1–5°, Sc > 5° seen 30° up | reported, WMO International Cloud Atlas |
| `SKY_PHASES` | Seven phases by sun elevation with zenith, mid and horizon colours | bands reported (Wikipedia, Twilight); day, sunset and blue-hour colours measured off one photo each; the rest estimated |
| `OVERCAST` | Luminance (1 + 2 sin γ)/3 | reported, CIE standard overcast sky (Moon & Spencer 1942) |
| `LIGHTNING` | 0.52 s flash, 3–4 strokes (to 30) 40–50 ms apart, 343 m/s | reported, Wikipedia |
| `RAINBOW` | Primary 42°, secondary about 51°, colour order, Alexander's band | reported, Wikipedia; band width estimated |

## Construction (registry/nature/sky-physics.ts)

| Function | Rule |
| --- | --- |
| `dropFallSpeed(D)` | v = 9.65 − 10.3 e^(−0.6 D) (Atlas, Srivastava & Sekhon 1973) |
| `dropAxisRatio(D)` | Brandes, Zhang & Vivekanandan (2002) polynomial; spheres under 1 mm, about 0.68 at 5 mm |
| `dropSpectrum(R)` | Marshall–Palmer N₀ = 8000, Λ = 4.1 R^−0.21; median volume diameter 3.67/Λ |
| `beaufortSpeed(B)`, `beaufortOf(v)` | v = 0.836 B^1.5 |
| `slantDeg(v, wind)` | tan θ = wind ÷ fall speed (drops move with the air) |
| `streakLength`, `exposureTime` | speed × exposure; 180° shutter at 24 fps = 1/48 s |
| `rainVisibility(R)` | 11.6 R^−0.63 km (estimated, second-hand regression) |
| `contrastAt(d, V)` | e^(−3.912 d/V) (Koschmieder, 2% threshold) |
| `sunElevation`, `shadowLength` | Solar geometry (about ±1°) |
| `skyGradient(sun, cover)` | Blends the phases by elevation; cover greys toward the overcast sky |
| `cloudOnScreen` | A base at height h and distance d sits f·(h − eye)/d above the horizon |
| `hailFallSpeed(cm)` | A power law through 9 m/s at 1 cm and 48 m/s at 8 cm |

## Clouds (registry/nature/sky-clouds.ts)

The forms follow the 1896 atlas plates and the genus descriptions:

- **Heaps (cumulus).** Lobes sit inside a superellipse dome with a flat base. The outline is the union of discs, so
  cusps stay sharp. Lobes are painted top first, so each lower lobe's lit crown stands in front of the shaded
  underside of the one above (the cauliflower). Low lobes are in the cloud's own shadow, under a soft shadow on the
  side away from the sun and a darker base band.
- **Tower (cumulonimbus).** The heaped body widens upward into an anvil with a flat top. The anvil's underside flares
  from the body's flanks and thins to fibres downwind. Below are a dark base and a rain curtain.
- **Wisps (cirrus).** Hooked heads with tapering strands that fan into fibres.
- **Ripples (cirrocumulus).** Small grains in rows, no shading.
- **Puffs (altocumulus).** Irregular rounded masses in slanted rows, shaded beneath. Nearer rows are larger.
- **Lumpy layer (stratocumulus).** Rolls merging into each other.
- **Layers.**
  - Cirrostratus is a veil.
  - Altostratus is a sheet.
  - Nimbostratus is a dark layer with streaked rain curtains.
  - Stratus is a low band.

`cloudDeck` sets these on a camera. It places heaps from 2 to 25 km (no nearer than keeps the cloud in frame), with
patterned elements at their WMO widths and layers as slices that fade with distance. Haze lies in the lowest 1.5 km
(estimated), so high clouds fade less than the horizontal visibility suggests.

## Cumulus in detail (registry/nature/sky-cumulus.ts)

`cumulusModel` builds a heaped cloud the way photographs and time-lapses show it:

- **A tree of rising thermals.** Base bubbles each spawn one or two smaller bubbles above them, until their column
  reaches its own height. Towers of different heights leave notches. Towering clouds keep their bubble size;
  fair cumulus taper.
- **Lumps on lumps.** Face lumps cover each mass. Cauliflower lumps at about 0.45 of their parent's size grow on every
  exposed stretch of rim, at three more levels.
- **Light.**
  - The masses carry the big-form light:
    - a frontal part (the sun's azimuth from the viewer's back: 0 front-lit, 90 side-lit, 180 backlit);
    - a side part, which dies away with the depth of cloud between a mass and the sun across the picture;
    - darkening with height, base and overlap.
  - Each lump takes its mass's light, brighter on the cap facing the sun.
  - The cloud is exposed like a camera, so the brightest crown is white.
  - Backlit, the body darkens to the measured "no direct light" tone. Lumps whose edge borders sky glow on the side
    facing the hidden sun (the silver lining).
- **Paint order.** Mass by mass, back to front. Each lump casts a soft occlusion shadow onto what lies behind it, so
  a lower crown stands bright against the shade above (the crevices). Lumps are drawn as slightly irregular rounded
  shapes, and a slight blur turns vector edges into vapour.
- **Colour.** The shading ladders were measured from cloud-pixel luminance percentiles in CC0 and public-domain
  photographs:
  - fair: cumulus mediocris;
  - towering: cumulus congestus;
  - the backlit body: a silver-lining photograph.
- **Time.** Upper masses are turrets that rise, swell, then soften and fade together, each on its own phase. The rise
  speed comes from measured updrafts (fair under about 1 m/s, congestus median peak 4.9 m/s); turret life is
  estimated.
- **Patterned decks.** Altocumulus and stratocumulus elements in `cloudDeck` are small clusters of lumps lit the same
  way.
- **Detail levels.** Far clouds use fewer levels (`detail`).
- **Edge roughness.** `outlineDimension` box-counts the silhouette. The model measures about 1.0, and real cumulus
  photographs about 1.03–1.19 with the same method (the higher values partly from mask noise).

## Rendered skies (registry/nature/sky-atmosphere.ts, sky-volume.ts)

**Atmosphere.** `atmosphere({ sunElevation, sunAzimuth, visibilityKm })` gives:
- the clear sky's radiance in any direction;
- sunlight arriving at any height, reddened by its path;
- the sky's light on the ground;
- aerial perspective.

It is single scattering in a spherical atmosphere (Nishita 1993) with the constants of production sky models
(Hillaire 2020):
- Rayleigh air, 8 km scale height;
- aerosol Mie scattering set from the visibility by Koschmieder, 1.2 km, g 0.8;
- ozone absorption.

Multiple scattering adds a small estimated fill.

**Clouds as volumes.** `renderCloudSky({ layers, sunElevation, sunAzimuth, pitch, fov, visibilityKm, wind, width,
height })` renders genera as cloud water or ice and returns sRGBA. `CLOUD_VOLUMES` gives each genus:
- base and top;
- water or ice content and effective radius (Hansen 1971 for Sc, As, Ns, St and Cu congestus; others estimated);
- a default cover and cell size.

Extinction is `extinction(LWC, r_e)` = 3·LWC ÷ (2ρ r_e) (Stephens 1978).

| Genus | Structure |
| --- | --- |
| Cumulus | Thermals from a coverage map (rank-normalised, so cover is the share of sky), flat bases, domed cauliflower tops (Perlin–Worley shape, inverted-Worley billows, eroded edges) |
| Stratocumulus | Rolls across the wind, cells over 5° wide, gaps of sky |
| Altocumulus, cirrocumulus | Cells at their WMO widths (1–5°, under 1°) in billow rows about 7–10 shear-layer depths apart (Kelvin–Helmholtz) |
| Cirrus | Ice fall streaks: strands 12 times longer along the wind than across, curved into hooks by shear (a parabola) |
| Cirrostratus | A thin ice veil with fibres; the 22° and 46° halos from the minimum deviation through 60° and 90° ice prisms (`minimumDeviation`), red inside, blue outside |
| Altostratus | A translucent sheet with thicker and thinner patches; the sun as through ground glass |
| Nimbostratus | Thick and dark, a ragged base, thickness patches, scud (pannus) and rain |
| Stratus | A low layer with gentle undulations |
| Cumulonimbus | A body of towers with a flanking line, an anvil at the tropopause spreading downwind and thinning to fibres, an overshooting top, mammatus 1–3 km across and 0.5 km deep (Schultz et al. 2006), a rain shaft |

**Light** has these parts:
- **Sunlight:** reddened to each point and marched to the sun through every layer above.
- **Scattering:** octaves of multiple scattering (Wrenninge et al. 2013), and two-stream diffuse transmission through thick decks.
- **Phase functions:** forward-peaked for water; halos for ice.
- **Sky light:** from above, shaded by the cloud over each point.
- **Aerial perspective:** grey air under overcast.
- **Ground:** the sun's disc dimmed through thin cloud; cloud shadows on the ground.

Exposure meters like a camera (scene average blended with a sunny-day exposure), with a partial white balance.
`CLOUD_SCENES` gives each genus a view that shows its tell-tale feature.

A 320 × 180 sky takes about 1–2 s on a laptop CPU. Rays within 6° of the horizon take two samples.

## React (registry/nature/sky-react.tsx)

- `CloudLayers` and `CloudFigure` draw a cloud.
- `WeatherScene` draws a level pinhole camera, eye at 1.6 m, containing:
  - sky;
  - cloud decks;
  - hills and ground on the ground plane;
  - FLORA1 trees at 30–300 m (bare in snow);
  - rain streaks at real speeds and slants (drops over 2 mm within 2–8 m);
  - snow with flutter;
  - fog by Koschmieder;
  - a rainbow (only with broken cloud and the sun under 42°);
  - lightning.
- `CloudAtlas` lays out the ten genera by height. `SkySheet` is the reference sheet.
- `CloudSky` (sky-volume-react.tsx) renders a sky into a canvas after paint, sharing the render queue and cached.
  `RenderedCloudAtlas` shows the ten genera rendered, each with its heights, water content, droplet size and
  extinction.

Text is HTML in cards. The SVG labels in `CloudAtlas` sit under each cloud at fixed positions, checked at
1280 px.

## Known limits

- Cloud shapes (`cloudShape`, `cloudDeck`) are construction for painting. The volume renders are the faithful view.
- In the volume renders:
  - layer thicknesses, most water contents and the coverage maps are estimated;
  - distant cumulus near the horizon still alias at small sizes;
  - the anvil reads a little like a plate;
  - no human visual review yet.
- Sky colours are one photograph each where measured. Camera exposure and white balance vary, so treat them as a
  starting palette.
- Rain visibility is a second-hand regression (estimated), and the 1.5 km haze layer and the ×2.5 contrast for the
  sight line up to clouds in rain are estimated.
- The Beaufort speeds are mean wind at 10 m. Near the ground the wind is weaker, so drawn slants near the ground may be
  less steep.
