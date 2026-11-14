# CRAYON1 — broken grain and natural rubbing pass

2026-11-14. **Basis:** visual inspection of the encoded 48-frame 960×540
proof from GitHub Actions `43629027415`, plus published physical-material
process references. This is an engine iteration, not a human-approved film.

## Observed weak point

The fox, sky, moon and hills contained a high density of nearly-horizontal
SVG strokes arranged into coherent repeating bands. Even though all strokes
were seeded and irregular at the small scale, they created a systematic
computer-generated stripe field at normal playback size. The silhouettes
were solid after recent opacity fixes, but the surface still read more like
digitally textured flat vector paint than rubbing real wax across paper.

## Implemented next pass

- Vary the orientation **per local hand-lifted rubbing patch**, including
  a secondary cross-grain gesture on the next layer, rather than keeping
  nearly all strokes parallel to the rows.
- Increase irregularity of patch start positions, nib lift distances,
  and quadratic control points without touching the total mark budget.
- Preserve a stable, deterministic result for every source seed, pressure
  and frame, with no procedural time noise, new runtime dependencies or
  schema changes.
- Add a regression measuring positive and negative stroke slopes and
  distinct tangent directions, not only the number of strokes.

## Reference principles

- [Rudolf, Mould and Neufeld — bidirectional wax deposition](https://doi.org/10.1111/j.1467-8659.2005.00826.x):
  pressure, nib contact and paper relief make wax texture spatially irregular;
  the paper is not a flat vector fill.
- [Sonnyé Lim — *My Mu* process interview](https://www.cartoonbrew.com/shorts/sonnye-lim-my-mu-crayon-animation-231556.html):
  digital timing roughs paired with actual crayon line and colour.
- [Hannah Jacobs — *It's OK* process interview](https://directorsnotes.com/2014/12/04/hannah-jacobs-tom-rosenthal/):
  expressive composition and visible paper-born crayon marks matter more than
  dense generic noise.

## Remaining — highest craft priority

The mark generator remains screen-space ribbon strokes, not a physically
measured crayon nib. A contact-height field, pressure tapering along each
curve, smear/erase/redeposit, local optical wax mixing and scanned calibration
are still missing. Character facial acting still needs more unique replacement
drawings at extremes. Before approval, export full 16:9 and 9:16 performances
and inspect alongside authentic crayon references at normal speed.
