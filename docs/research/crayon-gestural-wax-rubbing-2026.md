# CRAYON1 gestural wax rubbing versus digital flecks

2026-11-14. This is a material craftsmanship pass on the CRAYON1 mark
generator, not a new story engine or imported texture.

## Visual audit

The first tapered-nib release converted short constant-width strokes to
filled pressure-contact ribbons. A side-by-side render exposed a remaining
problem: four short strokes for every 132px-wide patch generate a visually
busy field of many isolated digital flecks. Paper-relief alone cannot fix
this shape language. Original wax rubbings and other material-native
animation references have longer related bands of pigment, interrupted
by actual page tooth, which creates visual unity even when grainy.

## Implemented

- Default `markLength: "long"`: normally two longer lifted gestures per
  patch with occasional four-stroke patch breaks. Shortfall/nib lifting
  retains irregularity instead of drawing ruler-straight horizontal bars.
- Legacy `markLength: "short"`: preserve the original count and taper
  generation for grass, granular detail, or older film art direction.
- Existing gesture-cell angle coherence, independent seeds, the split
  undercoat, two coating passes and true 2D per-frame artist stroke order
  are unchanged.
- The longer form uses fewer **individual filled subpaths per frame**, but
  the same number of serializable mark entries and the same stroke-budget
  validation. A seeded 500x280 sample has 248 marks, 566 long-gesture arcs
  instead of 911 short-style arcs (about 38% fewer).
- Expose controlled A/B in *Material Studies → Long Wax Rubbing Vs Flecks*
  and the global editor in *Scene Engine → Mark Length*.
- Add unit coverage for path budget, actual mean arc length, deterministic
  reversibility, opaque body clipping and portable scene validation.

## Limitations

This still uses procedurally clustered quadratics rather than brush pressure
maps or pigment removal based on measured paper tooth. It should be inspected
on real export in 16:9 and 9:16 at normal speed before calling a film final.
