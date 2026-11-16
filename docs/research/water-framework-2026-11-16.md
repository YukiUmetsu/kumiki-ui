# Water framework (WATER1) — research, 2026-11-16

What a drawing of water needs to get right in any style, where each number comes from, and what comparing the
drawings with references changed. The grades are: **reported** (quoted from the source), **measured** (sampled off
a CC0 or public-domain image), **estimated**.

## Sources

| Topic | Source | Grade |
| --- | --- | --- |
| Sea state | Wikipedia, Sea state: the WMO code 0–9 (calm glassy … phenomenal) with height bands, "largely" the Douglas wind-sea scale | reported |
| Fully developed sea | Stewart, *Introduction to Physical Oceanography* 16.4: Pierson–Moskowitz spectrum, α = 8.1 × 10⁻³, β = 0.74, ω₀ = g/U₁₉.₅; ω_p = 0.877 g/U₁₉.₅; H⅓ = 0.21 U₁₉.₅²/g ≈ 0.22 U₁₀²/g | reported |
| Wave limits | Wikipedia, Stokes wave: steepest wave H/λ ≈ 0.142 (Michell 1893), 120° crest, "sharp crests and flat troughs". Wikipedia, Wind wave: deep-water waves break past H/λ ≈ 0.17, shallow-water ones when H > 0.8 h; circular orbits shrinking with depth, ellipses in shallow water; the largest waves "somewhat less than twice" H⅓ | reported |
| Breakers | Wikipedia, Breaking wave: spilling (gradual slope, whitewater spills down the face), plunging (steep floor, crest curls over, traps air: the tube), collapsing (crest never fully breaks, lower face collapses), surging (steep reflective beach, smooth face, base runs up). Wikipedia, Iribarren number: ξ₀ < 0.5 spilling, 0.5–3.3 plunging, > 3.3 surging or collapsing | reported (the collapsing/surging split at 5 is estimated) |
| Ripples | Wikipedia, Capillary wave: λ_m = 1.7 cm, c_m = 0.23 m/s | reported |
| Wakes | Wikipedia, Kelvin wake pattern: arms at arcsin(1/3) = 19.47°, feathery wavelets at about 53°, a narrower V at high speed | reported; the crest curves are Kelvin's constant-phase lines, and the transverse spacing 2πV²/g follows from deep-water dispersion |
| Whitecaps | Monahan & O'Muircheartaigh (1980), W = 3.84 × 10⁻⁶ U^3.41; onset about 3 m/s (Thorpe 1982), both via Albert et al., ACP 16 (2016) | reported |
| Slopes and glitter | Cox & Munk (1954) via Mobley, Ocean Optics Web Book: σ² = 0.003 + 5.12 × 10⁻³ U (up-wind 3.16 × 10⁻³ U, cross-wind 0.003 + 1.92 × 10⁻³ U) | reported; the glitter width (two rms slopes, doubled on reflection) is estimated |
| Reflection | Wikipedia, Fresnel equations; Schlick's approximation R = R₀ + (1 − R₀)(1 − cos θ)⁵ with R₀ = ((n − 1)/(n + 1))², n = 1.333 for water | reported |
| Colour | Wikipedia, Color of water: weak red absorption makes water blue; particles and glacial flour turn it cyan or turquoise; algae green; tannins brown; silt red-brown | reported |
| Meanders | Wikipedia, Meander: meander length 10–14 (average 11) channel widths, bend radius 2–3 widths, sinuosity ≥ 1.5 meandering. Langbein & Leopold (1966), USGS PP 422-H: the sine-generated curve | reported; sinuosity = 1/J₀(ω) is derived from the curve |

## References for colour

One photograph each, sampled as medians in boxes that were drawn on the images and checked:

| Water | Photograph | Rights | Colours |
| --- | --- | --- | --- |
| Clear sea | La Herradura, Andalusia (Jebulon) | CC0 | far `#146593`, mid `#397695`, near over sand `#4e7992`, foam in shade `#9aa5b6` |
| Hazy sea | Sea horizon, Rethymno (Jebulon) | CC0 | `#6087a0` |
| Storm sea | NOAAS Miller Freeman in heavy seas (NOAA) | public domain | `#1f171f`, underexposed |
| Glacial lake | Milk Lake, Yading | CC0 | `#4c86a0` |
| Still lake | Disappearing Peaks in Lake Gunn | public domain | sky `#73afd8` → reflected `#738798`; forest `#1b2021` → `#1b211d` |
| Mountain lake | Calm waters between mountains (Unsplash) | CC0 | `#35586f` |
| River | Meandering river aerial (USFWS) | public domain | `#3d5c5f` |
| Silty river | Muddy River near St. Thomas (NPS) | public domain | `#6a6872` |
| Reef | Dry Tortugas (NASA, Landsat) | public domain | deep `#0e1626`, shallow `#03404d` |

Three earlier boxes missed their subject and were redrawn: one caught the shore instead of the glacial lake, one
landed on dark water instead of foam, and one landed on deep water instead of reef.

The still-lake pair checks the optics. In linear light, the sky's reflection has about 0.59 of the sky's luminance,
which is what Schlick gives near 84° incidence. Dark trees reflect at nearly their own value.

## What the comparison found and changed

- **The sea scene.**
  - First version: bands 1/8 of the peak wavelength apart, so shorter waves aliased into stripes. Bands are now set
    by the shortest wave near the viewer and by about 1.2 px on screen farther out, with per-column reflectance runs.
  - Whitecaps merged into slabs along one crest. The threshold is now weighted by sea area, with patches only at
    crest maxima and a wider spread of wave directions.
  - Only three glints appeared, because sampling one facet per cell almost never mirrors the sun. Each cell now
    draws a glint with the Cox–Munk chance that one of its facets does, so the glitter path emerges at the reported
    width.
  - The sky at 20° read golden. SKY1's day palette now holds from 12°.
- **Breakers.**
  - First version: a gaussian lump with a sheer wall and a detached thin lip.
  - The front face's exponent now takes it from convex to hollow. The plunging lip is thick at its root on its
    ballistic arc, and a concave tube wall leaves the air pocket as a hole in the water.
  - The spilling roller sat in the air, white on pale sky; it now rides the face.
  - Collapsing had a notch in its crest; the crest now stays whole while the base falls into foam.
- **The sea at true scale.** Labels overlapped the waves; each row is now as tall as its own waves.
  Pierson–Moskowitz at force 12 gives 27 m, more than real seas usually reach, so the Beaufort table's heights sit
  beside each row.
- **Reflections.** The SVG caption was cut off; the captions are now HTML.
- **Meanders.** They were perfectly regular. They now wander, with point bars placed at measured curvature peaks.

## Open

- Shoaling (wave height and length changing as depth falls), refraction around headlands, and swash on sand.
- Caustics on a shallow bottom, spray and mist, waterfalls, rain on water (with SKY1), ice and snow on water.
- Applying the sea scene's colours and the breakers to UKIYO1's great-wave idiom and to the watercolour and 3D packs.

## Round two: waves in detail (2026-11-16)

**References studied** (CC0 or public domain):
- Unsplash: Huge rolling wave, Inside of the small wave, Rolling wave crash, Big ocean surf wave, Wave crashing,
  Foaming sea wave, Splashing wave from within, Ocean foam, Rolling wave;
- NOAA: Large breaking wave, Breaking wave;
- videos: Santa Rosa Island Waves (CC0), Crashing waves in the San Juan Islands (public domain), Body surfing a wave
  (CC0) and Ocean surface waves 05 (CC0), all studied frame by frame.

**Measured.**
- Colours as medians in marked boxes:
  - thin lip and crest: teal #046983 to #0a6c6a;
  - mid face: #02334a to #0a3f41;
  - lower face, mirroring the sky: #445f77;
  - inside the tube: #76b6c9 to #7dbbcd;
  - whitewater: #eeeef2 in sun, #a6bdd0 in shade.
- Foam decay from the white-pixel fraction of the Santa Rosa surf zone at 5 frames per second: e-folding 1.8–7.7 s,
  median about 5 s, over eight breaks in one video, so treat it as one coast and one day.

**Reported.** Pure-water absorption (Pope & Fry 1997, via the Oregon Medical Laser Center data file): 0.0064 m⁻¹ at
440 nm up to 0.62 m⁻¹ at 700 nm. That is why light through a crest turns teal.

**Seen in the video:**
1. The crest whitens and peels along its length.
2. Whitewater rushes forward as a band.
3. It thins into streaky lace that drifts and fades over seconds.
4. Bubbly water stays pale turquoise where the foam was.

**What the renders changed:**
- Stray surface lines framed the tube; the sky-lit line now runs only on flat water.
- The whitewater read as pebbles; it is now a soft mass with a few bubbles.
- A foam patch floated in the air after the lip fell; it is gone.
- Wind streaks drawn as long vertical lines read as rain; lace now aligns along the wind instead.
