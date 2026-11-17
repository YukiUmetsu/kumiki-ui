---
name: kumiki-fx
description: Use when drawing, painting, animating or reviewing fire, flames, candles, campfires, torches, smoke, sparks, embers, explosions or firelight in Kumiki in any art style, especially when flames are the wrong size for the fire, flicker too fast or too evenly, are flat orange cut-outs, glow the wrong colour, smoke is the wrong colour for the fuel, sparks fly in straight lines, or firelight is white and even.
---

# Kumiki fire and effects (FX1)

Read the [spec](../../docs/component-specs/fire-effects.md).

1. **Size from power.** Flame height follows heat release and diameter (`flameHeight`): a campfire's flames are about
   1 m, a bonfire's over 2 m. A candle is a 3–4 cm teardrop.
2. **Flicker from size.**
   - Big fires puff slowly: about 1.5/√D Hz (`flickerHz`), so 2 Hz for a campfire and 1 Hz for a bonfire.
   - A candle in still air is steady.
3. **Colour from temperature** (`blackbodyRGB`): yellow-white core, orange edges, dull red tips and embers. Blue only
   at a small flame's base.
4. **Shape.** Flames tear into tongues and gaps higher up. Smoke billows and widens at about 7° each side: grey from
   wood, black from oil.
5. **Sparks** rise and swirl with the plume and cool from yellow to red within a second or two.
6. **Firelight** is warm (about 1900 K), flickers 10–30% and falls off with the square of the distance.
7. **Render or reference** with `renderFire` / `FireView`. Record what you checked.
