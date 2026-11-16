---
name: kumiki-materials
description: Use when choosing, painting, rendering or reviewing what something is made of in Kumiki in any art style (metal, wood, bamboo, tatami, paper, plaster, lacquer, stone, tile, thatch, ceramic, glass, snow), especially when colours or values are guessed, metals look like grey plastic, wet surfaces are not darker, old things look new, or a PBR material needs base colour, metalness and roughness.
---

# Kumiki materials (MATL1)

The pack `materials` decides *what a material's colour, value, gloss and age are*. Your style decides *how it
looks*. Read the [spec](../../docs/component-specs/materials.md) for the API; this is the working order.

1. **Look it up.**
   - Use `findMaterial(id)` from `registry/materials/materials-physics.ts`.
   - Each record gives its linear colour, metal or not, roughness, grade and source, and painting notes (`look`).
   - Pick the real record rather than an eyeballed colour.
2. **Value first.**
   - `lightness(albedo)` gives the painter's value (L*): snow and paper near 95, plaster 86, light wood 72, black
     lacquer 13.
   - Keep these relations when stylising.
3. **Metal or not.**
   - A metal has no diffuse colour: it shows tinted reflections of its surroundings, darker where it faces the
     ground.
   - Dielectrics show their colour, with a small white highlight (about 4%).
   - `highlightSpread(roughness)` says how wide the highlight is.
4. **Renderers.** `toStandardMaterial(m)` gives base colour, metalness, roughness and IOR for three.js, glTF or
   Blender.
5. **Wet.**
   - `wetMaterial(m, wetness)`: porous materials (sand, brick, terracotta, wood, plaster, paper) darken to about
     55–85% and gain gloss.
   - Metals and glazes only gain gloss.
6. **Age.**
   - `weathered(track, years, environment)`:
     - copper browns within years and greens after about 8 (sea) to 20 years;
     - outdoor wood greys within a year;
     - iron rusts where water stands;
     - tatami and bamboo yellow and then brown.
   - Red lacquer wears through to black at rims (`lacquerWear`).
7. **Check.** Compare with the cited references side by side, and run `tests/materials.test.tsx`.
8. **Add a material.**
   - Prefer the CC0 Physically Based database, or measure a CC0 ambientCG map or photo in marked boxes.
   - Record the grade and source, and keep the test passing.
