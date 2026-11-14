# CRAYON1 performance: expressive grounded character polish

Date: 2026-11-14. Scope: original *The Little Flower* 9-second animated
character scene in 16:9 / 9:16, **not** a newly invented character asset.

## Existing limitations

The torso moved by a nearly rigid transform. Outer ears followed the skull,
but ear pigment did not live inside the ear transform hierarchy. The scarf
knot and loose end behaved as one rigid body. Feet traveled when the entire
torso compressed or rotated. Mouth visemes and eyelid cues existed without
eyebrow expression, which made the face less communicative.

## Implemented

- Seven authored torso volume keys, with restrained X/Y squash and stretch
  synchronized to anticipation and the lifted flower gesture.
- Two independently timed and differently responsive ears. Each inner ear
  now belongs to its matching outer ear in the scene DAG, preserving
  painted detail during head/ear motion.
- Articulated loose scarf tail with six-frame delay. Stitched line detail
  moves with the scarf tail instead of staying on the torso.
- Individually authored left and right eyebrow poses: neutral, concern,
  wonder, smile. Pose cues lead and follow mouth and eyelid timings.
- Two original wax feet now pin their toe contact points on the page
  while the body compresses, rotates and breathes. No transparency.
- All keys, parent links and image shapes are original scene JSON;
  deterministic absolute frames, reduced motion and both aspects remain.

## Direct references / technique

- Walt Disney's classic principles of anticipation, secondary action,
  follow-through, and squash/stretch as codified in animation literature.
- Contemporary under-camera pastel animation emphasizes continued physical
  surface and held frame exposures rather than independent digital layers;
  this is an authored hybrid, not frame-captured physical paint.

## QA and remaining scope

This is not full flesh deformation, anatomical forward-kinematics skinning
or physically solved joint motion. Confirm actual browser videos and refine
turnaround-view ear intersections, contact-shape roll and mouth-color fills.
Mouth paths are still designed symbolically, not acoustic lip synchronization.
