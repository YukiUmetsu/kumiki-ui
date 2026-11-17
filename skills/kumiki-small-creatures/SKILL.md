---
name: kumiki-small-creatures
description: Use when drawing, painting, animating or reviewing insects, spiders, snails or other small creatures in Kumiki in any art style (fireflies, dragonflies, butterflies, cicadas, bees, ants, ladybirds, mantises, crickets, beetles, spiders, snails), especially when insects have legs on the abdomen or the wrong number of legs, spiders have antennae, wings grow from the wrong place, butterflies rest with wings flat, wingbeats are drawn as slow flaps that a camera would blur, or fireflies glow the wrong colour or rhythm.
---

# Kumiki insects and small creatures (BUG1)

Read the [spec](../../docs/component-specs/small-creatures.md).

1. **Count and place the legs** (`BUG_PLANS`).
   - Insects have six, all on the thorax, with a knee (femur and tibia).
   - Spiders have eight, plus palps, and no antennae.
   - Snails have a foot, with their eyes on the upper tentacles.
2. **Wings by order** (`WINGS`).
   - Butterflies rest with wings closed upright; dragonflies hold four out flat.
   - Beetles' elytra meet in a straight line; flies have one pair.
3. **Size** (`BUG_SPECIES[].length`): a ladybird is about 7 mm, a mantis about 85 mm. Draw them against the scene's
   scale.
4. **Motion.**
   - Insects walk in the tripod gait.
   - Wingbeats above half the frame rate are a blur (`wingsOnFilm`).
   - A Genji firefly flashes yellow-green about every 2 s (west) or 4 s (east), in step with its neighbours.
5. **Draw or reference** with `bugTopView(id, pose)`, `BugFigure` and `BugMotion`. Review against the species card and
   record what you checked.
