# WATER1 — water framework for any art style

**Registry item:** `water` (needs `art-foundations`, `sky-weather`) · **Files:** `registry/nature/water-*.ts(x)` ·
**Storybook:** Video production → Art Foundations → Water (Sheet, Sea lab, Breaker lab, Open sea rendered, Ocean lab) · **Skill:**
[kumiki-water](../../skills/kumiki-water/SKILL.md) · **Research:**
[water framework, 2026-11-16](../research/water-framework-2026-11-16.md),
[the rendered ocean, 2026-11-16](../research/water-ocean-2026-11-16.md)

WATER1 holds what stays true about water in every art style:

- a wind raises a sea of a certain height, period and whiteness;
- waves have sharp crests and flat troughs;
- a beach's slope decides how they break;
- a boat's wake opens at 19.47°;
- water reflects 2% looking down and nearly everything at the horizon;
- rivers bend as sine-generated curves about 11 widths long.

The style decides how it looks. It builds on SKY1 (the Beaufort scale and sky colours) and shares `art-foundations`.

## What it is for

- **A sea for a wind.** `seaForBeaufort(force)` or `fullyDevelopedSea(wind)` gives the significant height, peak
  period, wavelength, crest speed, sea state and whitecap cover. `seaSurface(wind, { seed })` gives a surface to
  sample anywhere and at any time. Its components follow Pierson–Moskowitz with a spread of directions (short
  crests, groups), and each is a third-order Stokes wave.
- **Animating floats and boats.** `floatMotion(surface, x, t, length)` gives heave and pitch. `orbit(H, L, z, θ,
  depth)` gives a water particle's path: circles in deep water, ellipses in shallow.
- **Breaking waves.**
  - `iribarren(slope, H₀, T)` and `breakerType(ξ)` give spilling, plunging, collapsing or surging.
  - `breakerShape(type, stage)` gives a cross-section to paint at any stage: water, foam, the air in a plunging
    tube, and spray.
  - `breakingDepth(H)` and `lipReach(H)` set where the wave breaks and where the lip lands.
- **Wakes and ripples.** `kelvinWake(speed, length)` gives Kelvin's crest curves with cusps on the 19.47° lines and
  transverse waves 2πV²/g apart. `rippleRings(t)` gives rings from a drop.
- **Light.**
  - `fresnel`, `reflectanceAt(depression)` and `surfaceColour(body, sky, depression)` give the colour of the surface.
  - `reflectPoint` mirrors about the water plane.
  - `glitterPath(sunElevation, wind)` gives how wide the sun's glints spread (Cox–Munk).
  - `throughWater(bottom, water, depth)` gives the colour of the bottom seen through water.
- **Rivers.** `meanderPath({ width, sinuosity })` draws a sine-generated channel 11 widths per meander, and
  `meanderAngle(K)` solves its swing from the sinuosity (K = 1/J₀(ω)).

## Data (registry/nature/water-data.ts)

| Table | Holds | Grade and source |
| --- | --- | --- |
| `SEA_STATES` | WMO codes 0–9 with height bands | reported, Wikipedia (Sea state) |
| `FULLY_DEVELOPED` | H⅓ = 0.22 U₁₀²/g; ω_p = 0.877 g/U₁₉.₅ | reported, Pierson & Moskowitz (1964) via Stewart 16.4 |
| `WAVE_LIMITS` | Steepest steady wave H/λ 0.142, 120° crest; real waves break near 0.17; H > 0.8 h in shallow water; largest wave under 2 H⅓ | reported, Wikipedia (Stokes wave, Wind wave) |
| `BREAKERS` | Spilling ξ₀ < 0.5, plunging 0.5–3.3, collapsing and surging > 3.3, with beaches and looks | reported, Wikipedia (Breaking wave, Iribarren number); the collapsing/surging split at 5 is estimated |
| `SMALL_WAVES` | Capillary ripples < 1.7 cm, 0.23 m/s minimum; Kelvin wake 19.47°, feathers 53° | reported, Wikipedia |
| `WHITECAPS` | W = 3.84 × 10⁻⁶ U^3.41, onset about 3 m/s | reported, Monahan & O'Muircheartaigh (1980), Thorpe (1982) |
| `SLOPES` | Mean square slope 0.003 + 5.12 × 10⁻³ U | reported, Cox & Munk (1954) via Mobley |
| `MEANDERS` | Meander length 10–14 (11) widths, bend radius 2–3 widths, sinuosity classes | reported, Wikipedia (Meander) |
| `OPTICS` | n = 1.333, R₀ ≈ 0.02 | Fresnel; Schlick's approximation |
| `WATER_COLOURS` | Clear sea from shore to horizon, hazy sea, storm sea, glacial lake, still-lake reflection, mountain lake, river, silty river, reef from space (measured, one CC0/PD photo each); tannin stream and green pond (estimated) | why each colour arises: reported, Wikipedia (Color of water) |

## Construction (registry/nature/water-physics.ts)

The rules are the ones listed under each function in **What it is for**:

- dispersion (`wavelength`, `phaseSpeed`, `groupSpeed`; deep and shallow water);
- the fully developed sea;
- a seeded sea surface;
- `trochoidProfile` for a drawn wave train;
- orbits and float motion;
- breakers, ripples, wakes, light, rivers and colour.

## React (registry/nature/water-react.tsx)

- **`SeaScene`.** A level camera on a sea for a Beaufort force. Every band mixes the body colour with the reflected
  sky (SKY1's gradient at that angle) by Fresnel at the band's own tilt. The horizon therefore goes to sky colour,
  and faces turned to the viewer show the body. Whitecaps cover the reported share, weighted by sea area. A glint
  appears only where a facet mirrors the sun. Each cell's chance comes from the Cox–Munk slopes left over after the
  resolved waves, so the glitter path emerges rather than being painted.
- **`BreakerFigure`, `SeaByWind`, `WakeFigure`, `RippleFigure`, `ReflectionFigure`, `MeanderFigure`,
  `WaveShapeFigure`.** The pieces of `WaterSheet`. `SeaByWind` puts the fully developed sea at true scale beside the
  Beaufort table's typical heights.

Text is HTML in cards. The only SVG text is in `SeaByWind`, which sizes each row to its own waves, and in small axis
labels checked at 1280 px.

## Detail after photographs and video (round two)

**Breakers.** `breakerDetail(shape)` adds what photographs of breaking waves show, and `BreakerFigure` paints it:
- flow lines inside the face;
- a translucent teal zone at the crest and lip, where the water is thin and lit through;
- a cyan-lit tube;
- whitewater as a soft white mass, shaded beneath and roughened by bubbles, over a blurred plume of aerated water;
- foam lace crusts on the water ahead and behind;
- spindrift blown back off the crest.

The colours (`BREAKER_PALETTE`) are measured from four CC0 and public-domain photographs. The teal comes from water's
absorption: red dies within metres (`WATER_ABSORPTION`, Pope & Fry 1997).

**The sea.** `SeaScene` leaves foam lace where a crest broke in the last 1–8 seconds, fading with the measured decay
(`FOAM_DECAY`: e-folding about 5 s, from a CC0 surf video). Bubbly water beneath the foam is paler. At force 7 and
above, the lace is drawn out along the wind. With a low sun ahead, thin crests glow teal.

## The rendered ocean (registry/nature/water-ocean.ts)

`renderOcean({ wind, fetchKm, windDirection, choppiness, time, sunElevation, sunAzimuth, pitch, eyeHeight, sky,
particles, width, height })` renders the open sea under SKY1's physical sky on the CPU and returns sRGBA. The pieces
are exported.

**The waves.** `seaSpectrum`:
- **Spectrum:** JONSWAP (Hasselmann et al. 1973), the Pierson–Moskowitz sea when fully developed.
  - The fully developed peak and height reproduce the reported relations within 10%: H_s ≈ 0.22 U₁₉.₅²/g,
    ω_p = 0.877 g/U₁₉.₅.
  - A short fetch gives the smaller, shorter JONSWAP sea.
- **Spreading:** cos^2s with s from Hasselmann et al. 1980 (estimated coefficients).
- **Dispersion:** deep water with a capillary correction.

**The surface.** `oceanField`:
- **Cascades:** three FFT cascades (Tessendorf 2001), with no common tile.
- **Crests:** the horizontal displacement −λD gathers and sharpens the crests.
- **Whitecaps:** where the Jacobian folds, at the cover Monahan & O'Muircheartaigh measured for the wind. Foam from
  2.5 s earlier fades at WATER1's measured 5 s.
- **Slope calibration:** the finer cascades are scaled so the resolved slopes stay within 85% of Cox–Munk's measured
  mean square slope; the rest is sub-pixel roughness.

**The light:**
- Fresnel reflection of the sky and its clouds (`skyEnvironment` from SKY1), spread by the unresolved slopes.
- The sun's glitter from the Cox–Munk slope density.
- Light back out of the water from absorption (WATER1's table) and Morel's (1974) seawater backscatter, R ≈ 0.33 b_b/a
  (estimated form): blue for clear water, greener with particles.
- Turquoise light through backlit crests.
- Foam lit by sun and sky.
- Haze to the horizon.
- Detail fades with each pixel's footprint.

React: `OceanView` (queued, cached) and `SeaByBeaufort`.

## Known limits

- **`breakerShape` is a construction for painting, not a fluid simulation.** The lip arc is ballistic and the tube
  wall is a Bézier.
- **Pierson–Moskowitz heights at force 10 and above exceed what real seas usually reach:** duration and fetch limit
  them. The sheet shows the Beaufort table's heights beside them.
- **The whitecap patch size and the depth-colour clarity are estimated**, as is the mapping from coverage to crest
  height.
- **Measured colours come from one photograph each.** The storm-sea body is underexposed in its source.
- **The rendered ocean is deep water only:** no shoaling, breakers or spray. Foam has no history beyond 2.5 s, and
  the spreading coefficients are estimated. No human visual review yet.
