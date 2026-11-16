# Sky and weather framework (SKY1) — research, 2026-11-16

What a drawing of weather needs to get right in any style, where each number comes from, and how it was checked
against references. The grades are: **reported** (quoted from the source), **measured** (sampled off a CC0 or
public-domain image), **estimated** (no direct source).

## Sources

| Topic | Source | Grade |
| --- | --- | --- |
| Wind | Wikipedia, Beaufort scale: forces 0–12 with m/s, wave heights and sea and land descriptions; v = 0.836 B^(3/2) m/s | reported |
| Rain rates | Wikipedia, Rain: light < 2.5, moderate 2.5–7.6, heavy 7.6–50, violent > 50 mm/h | reported |
| Drop size and shape | Wikipedia, Raindrop: drops 0.1–9 mm, break up near 6 mm; under 2 mm "more or less spherical"; larger drops flatten "like hamburger buns"; not tear-shaped | reported |
| Fall speed | Atlas, Srivastava & Sekhon (1973), v = 9.65 − 10.3 e^(−0.6D), a fit to Gunn & Kinzer (1949); checked in the disdrodb source | reported |
| Drop axis ratio | Brandes, Zhang & Vivekanandan (2002), r = 0.9951 + 0.02510D − 0.03644D² + 0.005030D³ − 0.0002492D⁴. The cubic term was checked against two citing papers, because one copy had 0.005303 | reported |
| Drop spectrum | Marshall & Palmer (1948) via Wikipedia, Raindrop size distribution: N₀ = 8000 m⁻³ mm⁻¹, Λ = 4.1 R^−0.21 | reported |
| Snow | AMS Glossary, Snow: intensity by visibility. Locatelli & Hobbs (1974): aggregates fall at 0.4–1.2 m/s | reported |
| Hail | Wikipedia, Hail: 5 mm–15 cm; about 9 m/s at 1 cm and 48 m/s at 8 cm (the article's estimates); onion layers | reported |
| Visibility | Wikipedia, Visibility: fog < 1 km, mist 1–2 km, haze 2–5 km; Koschmieder x_V = 3.912/b_ext (2% threshold) | reported |
| Rain visibility | V ≈ 11.6 R^−0.63 km, a 1973 regression quoted second-hand | estimated |
| Clouds | Wikipedia, List of cloud types: étages (high 5–12 km, middle 2–7 km, low under 2 km) and genus descriptions | reported |
| Element widths | WMO International Cloud Atlas: cirrocumulus < 1°, altocumulus 1–5°, stratocumulus > 5°, observed more than 30° above the horizon | reported |
| Twilight | Wikipedia, Twilight: civil 0–6°, nautical 6–12°, astronomical 12–18° below; golden and blue hour have several definitions | reported |
| Overcast sky | CIE standard overcast sky (Moon & Spencer 1942): L(γ) = L_z (1 + 2 sin γ)/3 | reported |
| Lightning | Wikipedia, Lightning: median flash 0.52 s; 3–4 return strokes (up to 30) 40–50 ms apart; strobe; thunder at 343 m/s | reported |
| Rainbow | Wikipedia, Rainbow: primary about 42°, secondary 50–53° reversed, Alexander's band, centre at the antisolar point, none with the sun above 42° | reported |

## References for the shapes and colours

- **Shapes:** the 1896 International Cloud Atlas (Hildebrandsson, Riggenbach and Teisserenc de Bort), plates 1
  (cirrus), 5 (cirrostratus), 6 (cirrocumulus), 7 (altostratus), 9 (altocumulus), 11 (stratocumulus), 13 (nimbus), 19
  (cumulus), 22 (cumulonimbus) and 27 (stratus), public domain, Wikimedia Commons.
- **Sky colours:** one CC0 or public-domain photograph each, sampled at the zenith, mid-sky and horizon:
  - a clear sky;
  - cumulus over Tegucigalpa (day: `#3d628c`, `#69859f`, `#96a5a5`);
  - a sky gradient at dusk (sunset: `#82838a`, `#aca699`, `#c89e61`);
  - clouds over Brofjorden at blue hour (`#4c8aba`, `#9acae8`, `#8fa1aa`);
  - an overcast sky (`#aeaeb1` at the zenith, `#8697a0` at the horizon);
  - a cumulonimbus with a precipitation shaft.

  Exposure and white balance vary between cameras, so these palettes are a starting point. Golden hour, civil and
  nautical twilight and night are estimated.

## What the comparison found and changed

The first drawings were compared with the atlas plates and photos side by side:

- **Cumulus.**
  - First version: boxy sides, and every lobe's lit disc showed, so it looked like soap bubbles.
  - Fixed: the outline is now the union of discs seen from inside, so cusps stay sharp. Lobes sit inside a
    superellipse dome. Lobes are painted top first, so lower lobes' bright crowns stand in front of the shaded
    undersides above (the cauliflower read). Low lobes are in shadow, the away side has a soft shadow, and the
    flat base is darker.
- **Cumulonimbus.**
  - First version: a thin pillar under a detached slab, then a heavy bowl.
  - Fixed: the body now widens upward and the anvil's underside flares from the body's flanks. The anvil top is
    flat and lit, the downwind edge fibrous, and the lower body dark.
- **Altocumulus and stratocumulus.** First drawn as icon stamps and a caterpillar of ovals. Now they are irregular
  masses in slanted rows and merging rolls. In a scene they sit on one base plane in perspective at their WMO widths.
- **Rain curtains.** Rounded drips first, then blocky bands; now streaked strips.
- **Scenes.**
  - Hills were saw teeth at arbitrary heights. They now sit on the ground plane at 0.3–8 km with heights in
    metres, and the ground fades by distance.
  - Trees are FLORA1's grown species at 30–300 m, bare in snow, so fog fades them visibly.
  - A rainbow had appeared under an overcast sky. It now needs broken cloud and the sun under 42°.
  - Rain and snow were labelled "mist" and "fog" by visibility alone. Those names now need the obscurity asked for.
- **High clouds.** Cirrus vanished in haze. Haze now lies in the lowest 1.5 km, so a sight line up to a high cloud
  crosses only part of it (estimated).

## Open

- Photoreal cloud rendering (volumes, silver linings) is out of scope. The shapes are construction for painting.
- Further phenomena worth adding with sources: halos (22°, sun dogs), crepuscular rays, mammatus, virga detail,
  frost and dew, wind-driven snow drifts, puddle ripples (the water framework).

## Round two: cumulus in detail (2026-11-16)

The owner asked for more detail in clouds, especially cumulus, from more physics and more real images and videos.

**References studied** (CC0 or public domain):
- four cumulus congestus photographs over Gåseberg (W. Carter, CC0);
- cumulus mediocris 1 and 3 (J. Naukkarinen, public domain);
- cumulus humilis, Sunbury (CC0);
- cumulus congestus, early stages (public domain);
- a silver lining over Geelong (public domain);
- two time-lapses: "Growing cumulus clouds in time lapse" (CC0) and "Cloud time lapse 1280" (public domain), studied
  frame by frame.

**What they show:**
- Lumps on lumps at three or four scales.
- Sunlit crowns near white, falling through blue-grey half-tones to deep blue-grey shadow. The shadows take the
  sky's blue.
- Crevices where a lower crown stands in front of the shade above.
- Flat grey bases.
- Turrets that push up, round over, then soften and fade, while new ones rise beside them.

**Measured.** Shading ladders from the 10th, 25th, 50th, 75th and 95th luminance percentiles of cloud pixels:
- mediocris: #7892aa, #88a0b5, #92afcb, #b7c2cd, #dddde0;
- congestus: #3c5f7e, #55718c, #7690aa, #9fb2c4, #e2e5e6;
- the backlit body: #2f404a to #384c57.

**Reported.**
- Espy's LCL, about 125 m per °C (Wikipedia).
- Cloud perimeter fractal dimension about 1.35 (Lovejoy 1982, Science 216). That figure is for cloud areas seen from
  above, so the model is compared with the photographs' side-view silhouettes instead: the same box count gives
  about 1.03–1.19 for the photographs and about 1.0 for the model.
- Updrafts under about 1 m/s in fair cumulus (Penn State Meteo 3). Median peak 4.9 m/s in cumulus 0.7–4 km deep
  (ACP 16, 10159, 2016).

**What changed from the first renders:**
- Bubble-wrap discs and too-dark interiors gave way to big forms first: masses lit by sun azimuth and depth, with
  lumps lit by their place on their mass.
- Even, smooth outlines gave way to a tree of rising thermals with notches between towers.
- Hard ball outlines gave way to irregular lumps with occlusion shadows.
- A backlit glow on interior lumps now sits only on the true silhouette (tested on a raster).
- Turrets that broke into floating bubbles now rise and fade as whole turrets.
