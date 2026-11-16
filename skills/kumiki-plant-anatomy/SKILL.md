---
name: kumiki-plant-anatomy
description: Use when drawing, painting, animating or reviewing any tree, bamboo, flower, grass, water plant or scenery vegetation in Kumiki in any art style (woodblock, ink, pencil, crayon, paper, watercolour, 3D), especially when re-making a plant already drawn in another style, when trees look like lollipops or clip art, branches are straight spokes, blossom or autumn colour is in the wrong month, or a new plant species needs adding.
---

# Kumiki plant anatomy (FLORA1)

The pack `plant-anatomy` decides *how the plant is built and when it does what*: architecture, leaves, flowers, bark
and calendar. Your style decides *how it looks*. Read the [spec](../../docs/component-specs/plant-anatomy.md) for the
API; this is the working order.

1. **Look it up first.** Run `findPlant(id)` from `registry/anatomy/plant-species.ts`. It accepts a species id
   ("mountain-cherry"), the id a style draws it by ("sakura") or romaji. Open its `PlantSheet` (Storybook: Art
   Foundations → Plant Anatomy), and check `styles` before drawing again.
2. **Build from the construction.** `growPlant(plantConstruction(id), { month, seed })` gives branches with widths,
   foliage masses, strands, placed leaves, blossom and fruit. `plantShapes` turns them into path data. Paint over it;
   don't invent a lollipop.
3. **Respect the architecture** (Vicat Cole):
   - excurrent conifers keep one straight leader;
   - sympodial trees (cherry, plum, zelkova) branch in curved steps of elbows;
   - opposite-budded trees (maple, paulownia) fork in V's;
   - pines carry whorled tiers of flat-topped needle pads, and old pines lean with a broken, flat crown;
   - willows hang curtains.

   Widths taper by Leonardo's rule.
4. **Respect the calendar.**
   - Draw each species in its months: flowers from `flower.months`, autumn colour from `seasons.autumn`, bare
     deciduous winters.
   - Blossom comes before the leaves for plum and peach, and with the red young leaves for the mountain cherry.
   - `inSeason(month)` lists what is in flower, in colour or in fruit.
5. **Organs at close range.** Use `leafShape`, `flowerShape`, `fruitShape` and `barkMarks` with the species' specs
   (cherry petals notched, plum petals round, peach petals pointed). Use the species' seasonal colours.
6. **Motion.** Pass `wind` and `t` to `growPlant`, and keep the same seed so the plant only sways. Each form's
   `wind.moves` says what moves.
7. **Sound.** Use the catalog ids in `species.sounds`. For the rest, source a CC0 recording with the search term
   given.
8. **Check.** Read your drawing's ground, top, crown base, crown edges and trunk width, then run
   `checkPlantProportions(id, measurePlant(lm))`. Compare with the species' references side by side.
9. **Add a species.**
   - Choose a growth form, then record sizes with sources (grade "reported" only with a quoted figure), leaf, flower,
     fruit, bark, calendar, colours, culture and PD/CC0 references.
   - `checkPlantData()` must stay empty, and `tests/plant-anatomy.test.tsx` must pass.
