# RISO60 — vector-only interdigital paper-negative and edge-continuity inspection

**Status: review-only ArtCraft evidence.** The original RISO59 human hand remains anatomically unapproved. This change does **not** redraw or erase any stroke, substitute a third pigment, certify a likeness or promote the experimental A/B to production. It makes the actual printable negative-space topology inspectable before further hand reconstruction.

## Authentic source and geometric deconstruction

- [Illinois School of Art & Design, Risograph print guide: registration and trapping](https://web.faa.illinois.edu/app/uploads/sites/6/2021/05/riso_print_guide.pdf): print separations, knockouts, plate registration and tiny physical-paper gaps must be evaluated as independent stencil geometry.
- [RISOTTO Studio, Advanced Print Setup](https://risottostudio.com/pages/advanced-print-setup): plan overlaps and trapping for physical color separations; transparent screen compositing is not equivalent to genuine paper reserve.
- [Kat Schneider, *Pride & Prejudice Hands* physical two-color Riso print](https://www.katschneider.com/store/prideandprejudice-hands): differentiated digit silhouettes, well-protected negative spaces, dense tactile inks.
- [Proko, Hand Muscle Anatomy](https://www.proko.com/course-lesson/how-to-draw-hands-muscle-anatomy-of-the-hand/): thenar and hypothenar connections, interdigital skin near the MCP crests, and the challenge of three-quarter paper pinches. **Only used as an external structural reference.**
- [RISO59 source study](riso59-threequarter-envelope-artcraft.md), [ANAT1 skill](../../skills/kumiki-human-anatomy/SKILL.md): true-length bone projection still leaves camera-hidden depth sign as an authored hypothesis. Do not confuse structural tests with human visual verification.

**Outline topology.** The existing 16 connected original vermilion palm cubics define one closed positive-print boundary, around the radial wrist, thenar arc, first web, four MCP crests, hypothenar, and wrist return. The two original 4-cubic physical paper-negative interdigital stencils correspond to *middle–ring* and *ring–little* webs. Nothing is overlaid or simplified: the original 12 articulated RED phalanges, cobalt nails, source gradient screens, fibre/dot noise, two-layer print, 24 fps frame clock and 16:9 / 9:16 cameras are unchanged.

**Spatial test.** On evaluated original SVG source vectors (not screenshot pixels), a paper-negative reserve has:

1. **Unprinted rest:** a zero-area original four-cubic cutter before contact; print should be untouched.
2. **Exterior notch:** a non-degenerate cutter with both interior and exterior boundary samples and at least two proper intersections through the closed positive palm.
3. **Interior hole:** all cutter sample vertices inside with no positive-boundary crossing; reject if intended as an open web.
4. **Outside miss:** all cutter sample vertices outside with no crossing; this produces no white indentation.
5. **Boundary uncertain:** tangent, ambiguous, or insufficiently sampled edge. Inspect actual 1× render; do not silently pass.

The checks are descriptive, not an absolute proof: polygon flattening has 0.2 local-unit flatness; tangent and coincident boundaries are explicitly not counted as proper crossings. RisoPrint still owns the actual paper cut on both drums. Borderline reports must be compared with native screens and the true reference photograph.

## Interactive Storybook and test coverage

The existing **Video Production → Riso ArtCraft Studies → Human Hand Anatomy Print** retains the baseline RISO59 A/B toggle, both actual actors, editable frame, screen density, source zoom, red-only/blue-only/both plates, full 16-cubic source anatomy and 4-cubic reserve detail. Each active hand now has a keyboard-accessible native **RISO60 inspect original RED stencil and paper-negative webs** disclosure showing real per-frame source area, number of cubics, crossing counts and explicit notch/hole/miss/rest classifications. Opposite inactive hands do not acquire fake diagnostics.

- Unit tests: synthetic well-defined square/notch/hole/miss; both real actors and RISO59 candidate at multiple source keys and in-between frames; deterministic, bounded, source-pure, real zero-area rest and original two-plate invariant.
- Chromium native Storybook: both actors and actual disclosure states, zero-area rest versus contact, baseline/candidate reversibility, physical plate switches and saved matching artwork screenshots.
- CI workflow includes the new module, unit suite, Storybook and Chromium coverage without changing unrelated jobs.

## Remaining, mandatory art release gate

Even if all tests pass, the supporting distal phalanges still need geometry-led improvement and matched real-photo 3/4 hand review. Inspect candidate and baseline at f144/f154/f156/f160/f166 in **native 1×** 960×540 and 540×960 print, followed by 6.2×/7.4× spot-ink macro crops; measure hand landmarks against a rights-reviewed photograph. Reject dangling red pulp blobs, mitten palms, floating cobalt nails, internal white gouges and off-contour misses. Physical press registration/trapping remains unverified. **Do not turn the RISO59 opt-in flag on by default.**
