---
name: kumiki-motion
description: Use when animating or reviewing people walking, running, rising from a chair or moving with a mood in Kumiki in any art style, especially when feet slide on the ground, legs swing like pendulums with straight knees, arms swing with the wrong leg, a run has no flight phase, cadence or speed is wrong, or a sad and a happy walk look the same.
---

# Kumiki human motion (MOTION1)

Read the [spec](../../docs/component-specs/human-motion.md).

1. **Use the gait curves** (`gaitPose(gait, phase, mood)` on ANAT1's body) rather than hand-set keys.
   - The knee bends twice per cycle in a walk (about 15–20° on loading, about 60° in swing).
   - Arms swing with the opposite leg.
2. **Plant the feet.** `gaitCycle(body, gait)` holds the stance foot's rolling point (heel, ball, toe) still and moves
   the body over it. Check frame by frame that the planted foot does not move against the ground.
3. **Timing.**
   - A walk is about 112 steps a minute (one cycle about 1.07 s), at about 1.2–1.4 m/s.
   - A jog is about 165 steps a minute, with a flight phase when both feet are off the ground.
4. **Mood** changes speed, stride, arm swing, head and trunk (`MOODS`). Sad is the clearest: slow, small, head down.
5. **Review** with `GaitStrip` (positions at true distances) and `GaitPlayer` (the planted-foot mark must stay still
   on the ground). Record what you checked.
