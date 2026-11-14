# Material-native crayon character continuity and anatomical polish

Date: 2026-11-14.

## Identified visual defect

The dragon/village multi-character film cloned only the *old* simplified
body-part IDs from the performance hare. When the main performance character
received more sophisticated shoulders, shin forms, boots, face volumes,
clothing and fur in PR #211, the dragon film's companion retained the
oversimplified source silhouette and mismatched decorative parts. Its original
layout also used the old ankle y≈103 even though the newer boots reach y≈166;
in 960×540 output the feet could sit below the bottom of the image.

A further mismatch: the head, face and ear artwork were parented correctly
but the companion's facial and ear motions were not coordinated to its own
story beats.

## Implementation

- Reuse all core character-anatomy layers from the mature editorial hare
  (face shadow planes, eye hierarchy, modeled coat panels, pockets, shin
  volumes, boots, form-following fur and garment hatching, ear folds).
- Keep flowers, writing and independent meadow scenery out of the companion.
  All selected children retain their corresponding selected parent.
- Adjust companion floor origin from 0.83H to 0.765H in 16:9 and from
  0.835H to 0.79H in portrait so grounded boots remain on the film.
- Give the ears and fabric tail deliberately staggered secondary motion;
  synchronize iris, pupil, eyelids and eyebrows to the companion's own
  expressive cues.
- Add restrained form-directed anatomical hatching following dragon flank,
  cheek and neck, rather than arbitrary surface grain.
- Layer a separate dragon iris and opaque **painted eyelid** over it at the
  held blink. Closing a line alone had left the eye visible.
- Give the owl more anatomically tapered facial disks, smaller pupils,
  and directionally organized feather hatching on the breast and crown.
- Replace childlike 'three little lives' text with restrained editorial
  'three studies / a living landscape' copy.

All implementation uses existing scene-grammar widgets, exact-frame keys
and original procedural wax code; no external artist assets are copied.

## Element-budget discipline

The expanded high-quality cast initially exceeded the CRAYON1 hard
240-element scene limit. Rather than weakening the validator or deleting
the anatomical art, roof shingles, castle railings, adjacent dragon-spine
points, jaw tooth glints and spark motifs now share bounded SVG groups.
The source paths and their individual marks remain present, while
unnecessary per-scratch actor lifecycles are consolidated. Group reveal
timing remains authored at the motif level. Fine face and limb joints
are still individually controllable.

## Acceptance limits

This is a source-art/actor-integration improvement, **not** a certified
cinematic render. The 11-second, 30fps, dual-aspect character film still needs
normal-speed encoded review for facial clarity, grounded foot plants and
secondary motion. Advanced work includes painted 3/4 turnarounds,
membrane-aware wing folds, measured proportion meshes and thumbnail-level
lighting hierarchy. Source tests focus on anatomy continuity; broad browser
and export QA remains local/manual per CI cost policy.
