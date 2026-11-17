---
name: kumiki-sky-weather
description: Use when drawing, painting, animating or reviewing sky, clouds, rain, snow, hail, fog, mist, haze, wind, lightning, thunder, rainbows or the light of a time of day in Kumiki in any art style, especially when rain falls too slowly or straight down in wind, clouds float at random heights or look like clip art, a fog does not fade with distance, a rainbow appears under an overcast sky, or the sky colour does not match the hour.
---

# Kumiki sky and weather (SKY1)

The pack `sky-weather` decides *what the weather is and how it behaves*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/sky-weather.md) for the API; this is the working order.

1. **Choose the weather, then derive the rest.**
   - Call `weatherState({ precipitation, intensity, wind, obscurity, clouds, cover, sunElevation, thunder })` from
     `registry/nature/sky-physics.ts`.
   - Use its drop size, fall speed, slant, visibility, clouds, sky colours and notes instead of guessing.
   - Wind is a Beaufort force; its land signs (`BEAUFORT`) tell you what trees, smoke and flags do.
2. **Clouds by genus, on a plane.**
   - Pick genera from `CLOUD_GENERA`. Heaps (cumulus) are fair weather; towers (cumulonimbus) bring storms;
     nimbostratus brings steady rain.
   - Draw single clouds with `cloudShape(genus, { seed, sun, wind })`.
   - Draw a sky full of them with `cloudDeck(genus, camera)`. All bases share one height, so nearer clouds sit higher
     and larger, and rows converge on the horizon.
   - Patterned clouds keep their WMO element widths: Cc < 1°, Ac 1–5°, Sc > 5°.
   - For a realistic sky, or a reference to paint from, render the genera as volumes:
     - `renderCloudSky({ layers, sunElevation, sunAzimuth, pitch })` (or `CloudSky` in React), with the views in
       `CLOUD_SCENES`;
     - cirrostratus shows its 22° halo; altostratus shows the sun as through ground glass;
     - the storm's anvil streams downwind.
3. **Rain and snow.**
   - Drops are spheres or buns, never tears.
   - On camera they are streaks: speed × exposure (1/48 s at 24 fps).
   - They lean by tan θ = wind ÷ fall speed. Snow falls about eight times slower, so it drifts far more and
     flutters.
   - To animate, hand `toEnvironmentalEffect(state, { region, unitsPerMetre, fps })` to `compileEffect` (the
     `environmental-effects` renderers) rather than writing a new particle system.
4. **Distance.**
   - Fade things toward the horizon colour by `1 − contrastAt(km, visibility)`. Fog < 1 km, mist 1–2 km, haze
     2–5 km.
   - Haze sits low, so high clouds stay crisper than the horizon.
5. **Time of day.**
   - `sunElevation(lat, day, hour)` → `skyPhase` and `skyGradient(sun, cover)`.
   - Shadows are `shadowLength(sun)` times the height.
   - An overcast sky is brighter at the zenith than at the horizon.
6. **Storms and light.**
   - Lightning flickers: 3–4 strokes 40–50 ms apart (`lightningFlash`).
   - Thunder follows about 3 s per km (`thunderDelay`).
   - A rainbow needs the sun behind the viewer and under 42°, with rain in front. Red is outside, and the secondary
     bow is reversed (`rainbow`).
7. **Check.** Compare with the 1896 Cloud Atlas plate cited on each genus and the sampled photographs, side by side.
   Run `tests/sky-weather.test.tsx`.
8. **Add a phenomenon.** Record it with a grade (reported only with a quoted figure) and a PD/CC0 reference. Keep the
   test passing.
