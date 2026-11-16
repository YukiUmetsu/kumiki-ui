---
name: kumiki-animal-anatomy
description: Use when drawing, painting, rigging, animating or reviewing any animal, bird or fish in Kumiki in any art style (woodblock, crayon, pencil, paper, ink, 3D), especially when re-making an animal that already exists in another style, when a drawn animal's proportions, face, legs, gait, coat colours or markings look wrong, or when a new species needs adding.
---

# Kumiki animal anatomy (ANIM1)

The pack `animal-anatomy` decides *what the animal is*: its build, face, coat, gaits and sounds. Your style decides
*how it looks*. Read the [spec](../../docs/component-specs/animal-anatomy.md) for the API; this is the working order.

1. **Look it up first.** Run `findAnimal(id)` from `registry/anatomy/animal-species.ts`. It accepts a species id
   ("asian-black-bear"), the id a style draws it by ("bear") or romaji ("kuma"). Open its `AnimalSheet` (Storybook:
   Art Foundations → Animal Anatomy). Then check `styles` to see where it is already drawn, and reuse that before
   drawing again.
2. **Build from the construction.** `poseAnimal(animalConstruction(id))` gives masses, leg chains on the right foot
   posture, head, ears and tail in shoulder-height units. `skeletonShapes` gives path data for the silhouette and every
   coat region. Draw over it in your medium; do not invent proportions.
3. **Face.** Take the eye position and size, ear size and placement, head depth and the defining features from
   `species.face`. Keep its "do not" notes ("a bear does not smile", "not a fox's long snout").
4. **Colour and fur.** Use `species.coat`:
   - `palette` swatches are painted by `fill` (area, tip, band, eye-patch; accents are palette only);
   - `long` lists the long-coated regions, `lay` says how the coat lies;
   - `markings` and `variants` give the seasonal and juvenile coats.
5. **Motion.** Use `ANIMAL_GAITS` for footfalls (`quadFootfalls`), body bob, pitch and spine flex (`quadBody`).
   `strideFrames(gait, mass)` gives the cycle length, and `gaitSpeed` the travel speed. Planted feet must not slide:
   track them frame by frame. Study Muybridge before changing a gait.

   **Postures:** sit, lie, rest (lying, head down) and rear come from `ANIMAL_POSTURES`.
   - Only the plans that take a posture naturally have it: horses and cattle never sit; bears, horses, hares, weasels,
     macaques and mice rear.
   - Animate with `poseAnimal(c, { posture, amount })` over the posture's `frames`. Cattle and horses kneel first;
     dogs and cats sit first.
   - Check every frame: nothing through the ground, the planted feet still.
6. **Sound.** Use the catalog ids in `species.sounds`. For the rest, source a CC0 recording with the search term given,
   and add it to the sound catalog.
7. **Check.** Read your drawing's or rig's landmarks: withers, brisket, point of shoulder, point of buttock and ground.
   Run `checkAnimalProportions(id, measureAnimal(lm))`. Out of range beyond about 10% means fix it, or note why the
   style departs on purpose. Then compare the render with the species' references side by side.
8. **Add a species.** Give it a body plan, and record only what differs:
   - sizes, each with a source;
   - proportions, graded reported, measured or estimated;
   - face, palette, sounds and culture;
   - PD or CC0 references only.

   `checkSpeciesData()` must stay empty, and `tests/animal-anatomy.test.tsx` must pass.

Never upgrade an estimated value to measured without a reference, and never fabricate sources.
