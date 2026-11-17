# RISO48 — Projected supporting phalanges in the original film hand

**Scope:** source-only **2D camera-space foreshortening** of the receiving Paper Artist's middle, ring and little fingers, not inferred 3D realism. Continues RISO46/47 in the same PR #460 and the existing Risograph ArtCraft Storybook.

## Reference-based reason for a new shape direction

- [Proko: Hand Muscle Anatomy](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/): the palm is three major volume groups, not a rectangular palm plus equal-width rods; the thumb's dorsal thenar is shorter and the supporting fingers roll into the palmar volume while the thumb/index opposition occurs on a different plane.
- [Proko: Realistic Hand Details](https://www.proko.com/course-lesson/how-to-draw-hands-details-for-realistic-hands/): phalanges have nested volume envelopes and individually offset joints. Purely increasing frontal MCP/PIP bend does not equal changing the projected length from a three-quarter view.
- [NCBI clinical Froment sign photograph](https://www.ncbi.nlm.nih.gov/books/NBK564355/figure/article-23735.image.f3/): real support digits visually shorten and overlap the folded side of the palm behind a thumb/index-held strip. Caution: this depicts a clinical sign; no disease-specific IP flexion is used or claimed anatomically normal.
- [RISOTTO Risograph FAQ](https://risottostudio.com/pages/printing-faq): genuine physical halftone coverage, distinct masters and translucent inks. Keep RISO31 RED positive phalanges and RISO37 BLUE moving nail/crease engravings. **No added RGB collage, 3D photo tracing or page-cover filter.**

## RISO47 rejected motion versus RISO48 source projection

RISO47 tried larger receiver support MCP angles (+44°/+40°/+36°) and higher PIP/DIP gains, but native source-white finger corridors collapsed (<3 units at f154/156). Rather than weaken the axis test or falsely hide the collision, restore RISO45 clinical, distinct original angles and source X fan. RISO48 instead reduces only **projected 2D PIP/DIP pivot distance** relative to the untouched ANAT1 skeletal lengths while maintaining the original joint rotation and true physical ink parts.

Implementation: `riso48ProjectedPivot` is applied only when constructing the second actor's `left-(middle|ring|pinky)-(pip|dip)` joints. On the original source absolute frame 160, the per-digit PIP/DIP projection offsets are: middle -2.2/-2.1, ring -2.3/-1.8, little -2.0/-1.5 units. f0–f146 remains canonical anatomy; original easing interpolates from f146 to f160; receive/release/hold progressively retain the 3/4 fold. Red proximal/intermediate/distal curves, actual bone labels and blue attached nail/crease paths remain intact. Their shapes are **not** uniformly scaled or reduced in complexity.

This is a **bounded editorial camera approximation** (visible bone ratio >.55), not a replacement for actual 3D projected skeletal positions. The separate `RISO31_GEOMETRY` stores reference true lengths, while `riso31Inspect` returns actual projected 2D station lengths. Old test assumptions that all animated source lengths always equal anatomical lengths are correct for non-projected digits; the new special-case test checks camera shortening is explicitly bounded and no geometry is dropped.

## Hard validation and artist gate

- Exact 2-frame source-white corridor must remain >3 across both humans, two hands and all 240 original f0..239 cels, no axis pair crossing.
- Three original RED screen/solid phalanges each, individual blue moving folds/nails, genuine wrist source parents, unchanged clinical PIP/DIP rotations.
- In all 16:9 and 9:16 frames f160/166, the real sheet must remain physically below the actual INDEX 3-bone red/3-blue stamps, with the original thumb and support below opaque paper. Both live original actors, real paper pressure and movement retain existing contracts.
- RISO46 native Chromium f154, f156, f160, f166 in the same Storybook at 6.2× and 7.4×; full-film 960×540 and 540×960 proof. Compare with RISO47 at native 1×, not only code transformations or pixel percentages.
- **Visual release not guaranteed.** If visual review still sees rake-like fingers, unnatural 3/4 contour or detached printed thumb, keep PR as draft; a fuller camera-conditioned ANAT1 pose-aware redraw will be necessary.

No external assets copied, no dependencies added, no new Storybook folder.
