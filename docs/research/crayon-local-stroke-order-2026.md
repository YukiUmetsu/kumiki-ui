# Crayon drawing motion — local blocking versus raster reveal

Date: 2026-11-14. Status: original CRAYON1 engine implementation; encoded
normal-speed dual-aspect human approval still pending.

## Reference principles

- [Alisi Telengut's oil-pastel process](https://www.animatematerials.org/workshops/demo-alisi-telenguts-oil-pastel-animation-method/)
  works repeatedly on a physical surface. Local contact changes the picture
  while the substrate remains continuous.
- [Dave Rudolf, David Mould and Eric Neufeld's crayon deposition
  model](https://doi.org/10.1111/j.1467-8659.2005.00826.x)
  treats user-provided strokes and their spatially localized contact with
  the paper, not a raster-frame height wipe.
- Real crayon drawings have hand-lifts, adjacent patches, overlapping pressure
  and irregular travel directions. These are artistic principles, not a
  frame-by-frame reconstruction of any specific copyrighted animation.

## Audited problem

`crayonMarks` created mark geometry in **row/column/layer** nested order
and `WaxRegion` revealed marks using their positions in that array.
Even with pressure-tapered nibs, an animated fill still traveled in
perfect horizontal rows, resembling a printer more than a hand.

## Implemented

1. Preserve each original quadratic mark, independent index, pigment color,
   pressure, nib shape and geometry. No marks are regenerated to change
   the order.
2. Add `strokeOrder: "patches" | "scanline"` to the independent wax material
   API and data-driven CRAYON1 scene. Both orders are strict/validated.
3. The new patch mode fills 5-row local patches in serpentine directions,
   then moves to adjacent patches, first coating before second coating.
   This is an authored **efficient local traversal**, not a simulated
   tracked hand/nib or pose.
4. Reuse all existing `crayonProgress(frame,...)` logic so random seeking,
   reduced-motion, reference timing, opacity masks, and export remain stable.
5. Interactive Storybook controls and focused deterministic tests compare
   the two orders and prove **exact final mark identity**.

## Remaining

Not a true inverse kinematics solver for a human coloring hand. An optional
pen-tip actor must be tied to the active segment's actual path and current
progress before that capability can honestly be advertised. More advanced
order constraints can support artist-authored stroke groups, pauses, erasure,
directional layering and brush hand-offs without changing film clocks.
