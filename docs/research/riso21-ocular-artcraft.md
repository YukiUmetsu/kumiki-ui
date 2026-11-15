# RISO21 — ArtCraft v9 ocular construction in two animated original figures

Date: 2026-11-15. Continuation of RISO20's two-spot print material engine and RISO19's two-person handoff. Only the original **Courier** and **Paper Artist** face-source linework is extended. No third-party artwork or raster filter is redistributed.

**Skill provenance:** Owner's **ArtCraft 9.1** bundle, `artcraft`, `art-reference-research`, `art-reference-structural-study`, `art-2d-character-craft`, `art-human-anatomy`, `art-material-study`, `art-animation-rigging` and `art-fidelity-review`. The skills' full release, reference-pixel, 3/4 human anatomy and independent artist gates are *not* satisfied just because a source file/test exists.

## 0. Actual current/previous-art observations

A *prior* actual Chromium capture, `riso10-proof.zip / courier-zoomed-detail.png` (2026-11-14; available in the owner's Library, not rebundled in this PR), shows the Courier with smoothly geometric large pupils, an open lower eyelid, almost uniformly thick upper arcs, and near-absent small canthi and suborbital ink marks. That capture is **not** from the current source revision and is **not** a verified RISO21 after image.

The original `COURIER` head is authored in head-local stage coordinates (roughly `x:-38..43, y:-77..37`); the distinct `PAPER_ARTIST` head uses its own hairline and face (roughly `x:-46..46, y:-81..31`). The original iris widths are approximately 4–6 design units. The new eye details **must stay inside the existing face source**, not replace any portrait silhouette with a single universal mask.

## 1. First-source study: observed genuine printed references

| Art / reuse rights | Topology and actual observed detail | Construction choice; wrong shortcut |
|---|---|---|
| [Fish Guts Press, close printed blue/pink eyes](https://fishgutspress.com/collections/frontpage) — artist-owned; technique reference only | A cropped pair of different slanted eyes; dark blue iris edges partly hidden under a thicker top lid. Bright paper sclera remains uncovered. Tightly spaced screened pink/blue dots continue through the orbital plane while open inkless paper retains local shine. | Preserve source eye apertures and independent iris, add eye-corner contours and **small blue tapered upper-lid roots**, red printed iris shadow and under-eye marks. Never paint an entire face with photographic noise. |
| [*TAROT ZINE*, Behance](https://www.behance.net/gallery/96806545/TAROT-ZINE) — creator attribution and actual print method not independently verified; illustration study only | The detailed face combines an unequal left/right eyelid arc, small pointed tear corners, multiple directional brow strands, a strong lower-lid printed rim, nested dark eyebrow hatching and organic shadow planes. | Construct individual non-mirrored left/right canthi, eyelash wedges and six unequal curved red under-eye hatching groups per actor. Do not copy or trace the original composition. |
| [Kat Schneider, *Pride & Prejudice Hands*](https://www.katschneider.com/store/prideandprejudice-hands) — published artist-owned Riso | Differently posed hands use distinct knuckle roots and short, purposeful interior marks over matte visible paper; no plastic 3D gradient filter. | Keep hand/face ink authored as locally attached shapes, full-opacity paper clearance, independently registered spot inks, and restrained local detail rather than global grain. |
| [Risolana, print preparation](https://www.risolana.org/printing) — production-process guidance | Masters are single-color separations; underprinting, halftone and uncoated stock create optical tone, and paper must be fed multiple times. | No RGB effects, no relocated body paint, no translucent face; blue solid contours and red screened pockets remain distinct. |

The online source previews are directly visually inspected, but high-resolution rights-cleared *aligned* source crops have **not** been secured. No pixel or facial identity metric can be honestly claimed. This is a **style-guided original illustration study**, not a direct reproduction of a specific artist's character. See [reference-study manifest](riso21-reference-study.json) and [structure manifest](riso21-character-structure.json).

## 2. ArtCraft semantic geometry lock, before code

| Axis | Critical distinct topology / flow | Original image issue and RISO21 construction | Negative control |
|---|---|---|---|
| Topological continuity | Separate left/right eye slit contours, inner corner, outer lash roots, iris; each part is attached to the existing **head** joint. Paper remains opaque under ink. | Four new semantic ink part IDs *per identity*; original face, brow, upper/lower lids, irises and forehead/hair untouched. | Floating dots, primitive circles, mirrored identical face, detached feature on rotation |
| Vector flow | Eyelashes should taper from upper lid toward outside; lower-orbit hatching flows along the anatomical eyelid margin and shortens toward corners. | Distinct authored cubic/quadratic curves per actor and asymmetrical socket; blink-specific redraws. | Uniform radial eyelashes, parallel straight bars, overlong line that crosses the face boundary |
| Weight and edge | Thicker dominant blue upper contour, narrow blue lash wedges, secondary screened red iris/lower-eye tonal pockets. | Closed variable-width contour polygons and genuine second spot-ink screen, never an SVG opacity fog. | Opaque white eye pasted on top; red mass covers the sclera |
| Rhythm | Small 1–2 design-unit feature clusters only where ocular drawing benefits; more spacing than fill, different left/right durations and lengths. | Six uneven shaded lower-orbit pockets per actor; four separate tapered lash roots; no repetitions across frames. | Global posterized noise, identical repeated lashes |
| Ink/paper microtexture | Use existing RISO20 halftone, FM dots and tooth mask only for parts painted as `screen`. | `eye-iris-grain` and `eye-lower-orbit-engraving` deposited on red spot master. Blue masses remain solid and paper face opaque. | Postprocessed digital blur, accidental body transparency |

**Provenance separation:** Existing original art is the canonical character *identity* reference for internal continuity. Fish Guts Press and other cited published art are *craft/material* references, not the person whose likeness should be copied. A source-photo portrait similarity score is therefore currently not applicable, but the independent human-anatomy release gate remains unsatisfied.

## 3. Changes and current gates

- `COURIER`: four independently identifiable new head-local source contours. Their `blink` variants preserve the eye's closure shape and never rerig the head.
- `PAPER_ARTIST`: four separately authored paths that retain its narrower/upturned eye and haircut geometry; do not share Courier eye path constants.
- `RISO_COURIER_SHEET`: left and right subpath regions for canthus, lash, iris screen, and orbit so source-mesh/triangle QA stays inspectable. Paper Artist's existing auto-generated source sheet maps its four new parts.
- Storybook **same existing folder**: `Video production → Film Looks → Risograph → RISO21 · Eye and Portrait Craft`. The two original actors are composited using actual `RisoPrint`, `RisoCharacterInk` and `RisoCharacterKnockout`; no appearance-only HTML facsimile. Controls: exact 16:9/9:16 composition, four source film poses, independent blue/red spot isolation, AM/FM material screening, ink gain, and semantic region IDs.
- Structural tests and the optional Chromium test cover named source-part mapping, opacity, pose determinism, expression morphs, screen separation, 16:9/9:16 and actual screenshot export.

**Not passed / no false claims:** No licensed, source-aligned 1×/3× eye/face crops, no independent 18-landmark portrait matching, no full ArtCraft v9 human-anatomy manifest with actual source/render masks, no signed visual likeness review, no encoded normal-speed MP4, and no actual Playwright screenshots from RISO21 unless a separate browser run records them. Source-to-render *aesthetic acceptance remains blocked*. Green unit/typecheck is only a code integration gate.

## 4. Next visual critique

Capture at frames 46, 78, 160, 198 with the actual Storybook screenshot test, including red-only and blue-only plates. Compare at 1×/3× against (a) earlier canonical original Courier head, (b) accessible print-reference *technique* crops, and (c) new Paper Artist head. Reject if lashes detach, upper lids become too thick, red ink fills sclera, hatches become visual freckles, expression ink pops on blink, a head clips at portrait crop, or an eye changes identity. Do not advance from eye detail to full 3/4 face rig until those failures are resolved and a strict independent anatomy/source gate is assembled.
