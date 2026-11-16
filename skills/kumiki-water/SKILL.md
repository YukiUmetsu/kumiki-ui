---
name: kumiki-water
description: Use when drawing, painting, animating or reviewing sea, waves, surf, breakers, whitecaps, ripples, wakes, reflections, sun glitter on water, rivers, lakes or water colour in Kumiki in any art style, especially when waves are too steep or too regular, breakers look like walls or blobs, reflections are the wrong length or colour, a boat's wake has the wrong angle, a river snakes like a perfect sine, or water is one flat blue.
---

# Kumiki water (WATER1)

The pack `water` decides *how water behaves and what colour it is*. Your style decides *how it looks*. Read the
[spec](../../docs/component-specs/water.md) for the API; this is the working order.

1. **Start from the wind.**
   - Use `seaForBeaufort(force)` from `registry/nature/water-physics.ts` for the height, period, wavelength, crest
     speed, sea state and whitecap cover.
   - Real seas are flat at true scale: the steepest wave is H/λ ≈ 0.142 with a 120° crest.
   - Exaggerate only on purpose, and keep crests sharp and troughs flat.
2. **Animate from a surface.**
   - `seaSurface(wind, { seed })` gives the elevation anywhere and at any time. Its crests are short and come in
     groups.
   - Ride boats on it with `floatMotion`; water particles go round in `orbit`s.
   - Wave groups travel at half the crest speed in deep water.
3. **Breakers depend on the beach.**
   - `breakerType(iribarren(slope, H, T))`: gentle beaches spill, steep floors plunge, steep beaches collapse or
     surge.
   - Draw stages from `breakerShape(type, stage)`. The plunging lip follows its ballistic arc and encloses a tube of
     air; whitewater rides the face.
   - Waves break when about 0.8 × the depth high.
4. **Wakes and ripples.**
   - A boat's wake opens at 19.47° whatever its speed, with transverse crests 2πV²/g apart (`kelvinWake`).
   - Ripples are under 1.7 cm and never slower than 0.23 m/s (`rippleRings`).
5. **Light.**
   - The surface is the body colour mixed with the reflected sky by Fresnel: about 2% looking down, nearly all at the
     horizon (`surfaceColour`, `reflectanceAt`).
   - Wave faces turned toward you are darker; backs reflect the sky.
   - A reflection hangs from the water plane under the object (`reflectPoint`), so things on a bank show only their
     tops.
   - The sky's reflection is darker than the sky; dark things reflect at nearly their own value.
   - The sun's glitter widens with the wind (`glitterPath`).
6. **Colour.**
   - Pick from `WATER_COLOURS`: clear sea far to near, glacial turquoise, silty or tannin rivers, and others.
   - Show the bottom through depth with `throughWater`.
7. **Rivers.**
   - `meanderPath({ width, sinuosity })`: meanders 11 widths long, bends 2–3 widths in radius, sand point bars on
     the inside of each bend.
   - Add wander; never a perfect sine.
8. **A realistic sea.**
   - `renderOcean({ wind, sunElevation, sunAzimuth, pitch, sky })` (or `OceanView` in React) renders the open sea
     under SKY1's physical sky.
   - Waves come from the measured spectrum for the wind, whitecaps at Monahan's cover, and the glitter from Cox–Munk
     slopes.
   - Use it as the realistic look or as a reference for any style.
   - The sea's statistics come from `seaSpectrum` and `oceanField`.
9. **Check.** Compare with the cited photographs side by side, and run `tests/water.test.tsx`.
