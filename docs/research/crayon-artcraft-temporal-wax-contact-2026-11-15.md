# ArtCraft: temporally stable wax-crayon contact (2026-11-15)

**Status:** Experimental, source-informed engineering correction; **not artist-approved**. Continue in the existing draft [Crayon PR #281](https://github.com/YukiUmetsu/kumiki-ui/pull/281) and the existing **Video production / Film Looks / Crayon / ArtCraft Adult Face Lab** Storybook folder. The full portrait still fails 17/18 frozen source landmarks and 4/5 tonal regions. No new crayon character is approved by this work.

## Source material and provenance

The following sources were **studied as examples and written evidence**; no third-party pixels are bundled or traced into SVG paths.

| Source | Observed medium behavior | What is and is not established |
| --- | --- | --- |
| Philadelphia Museum of Art, *Guidelines for Descriptive Terminology for Works of Art on Paper* (2014), p. 44, [conservation PDF](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) | Wax-crayon binder yields visibly cohesive, uneven deposits; possible clumping and pickup rather than loose uniform powder | Reliable medium taxonomy; no validated physical contact simulation |
| [Tiona Marco crayon paintings, survey](https://linesandcolors.com/2009/02/22/tiona-marco/) | Complex portraits, landscapes and animals can be built with ordinary wax crayons rather than smooth digital fill or stylized round symbols | Illustrates required scope; does not authorize copying an existing composition |
| [Bill Donnelly, Recent Work](https://www.billdonnellyart.org/recent-work.html) | Multiple colors and randomly shaped individual crayon strokes combine into a tactile layered surface | Artist's process statement, not a pixel-level stroke calibration |
| [Stockmar, *Painting with wax crayons*](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf) | Paper grain controls coverage; colors stack and allow lower pigments to show through | Supports contact and glaze layering; not a measured optical model |
| [Rudolf, Mould & Neufeld, *A Bidirectional Deposition Model of Wax Crayons* (2005)](https://doi.org/10.1111/j.1467-8659.2005.00826.x) | Paper relief, crayon tip, pressure, friction, existing wax and redeposition influence a moving stroke | The current Kumiki renderer has no faithful bidirectional wax-state solver |

## Medium-specific topology / flow / edge decomposition

**Macro topology.** A wax-painted patch consists of connected color masses composed of overlapping hand gestures, with deliberate paper gaps. For an opaque character surface, uncovered paper must not turn the subject translucent; shadow strokes remain attached to the subject's painted area. Distinct pigment layers may overlap without replacing the lower hue with one smooth digital gradient.

**Meso flow.** A worn broad nib forms a sequence of contact bands aligned with the stroke centerline and local tangent, not disconnected horizontal noise. Fiber contacts at points already traversed are irreversible in the drawing timeline. When the advancing tip moves from parameter `t=.40` to `t=.56`, previously completed wax grains must retain the same page coordinates and seeded contact widths.

**Micro edge behavior.** Raised paper fibers interrupt shallow contacts; wax may accumulate on a lifted tip. The existing `crayonPaperHeight`, `crayonDryNibPath` and `crayonStrokeEndPickup` approximate these effects. They are **not** verified matches against an individually licensed high-resolution physical stroke. The SVG clip silhouette remains mechanically smooth and must not be deemed a realistic crayon perimeter.

**Adversarial negative control.** Rendering every partial gesture by distributing a fresh 10-sample grid over `[start,currentTip]` causes previously drawn wax to slide or pop when the frame changes. This is a film-material failure even when start/end screenshots are visually similar and frame seeking remains deterministic.

## Implemented correction

- `crayonStableNibStops(lo,hi,end)` places contact stations against the *final length of the authored quadratic stroke*. All completed stations use fixed parameter values from the full nib path. Only the leading temporary tip interpolates.
- `crayonDryNibPath(mark,progress,"hand",paperSeed)` consumes these fixed stations. Paper-height samples, stroke drift and pigment-width hashes remain linked to the original station index.
- Legacy `"legacy"` contact still computes the historical four moving stations, preserving backward compatibility for existing scenes.
- The material Storybook lab now offers **Compare earlier/later frames**. It renders the same material and page seed at the current frame and 24 frames earlier; it also retains play/pause, scrub, restart and variable pressure.

## Verification and limits

The new unit test checks that complete contact stations remain a strict prefix as the nib advances, that the last station is the provisional tip, invalid ranges throw, and both hand-mode and legacy paths remain deterministic. Verification must include project typecheck, changed tests, actual Chromium Storybook frame captures, and a motion check at normal playback speed. A passing test does not prove that the *shape* of a stroke resembles a crayon reference.

**Remaining gates:** (1) physically plausible connected pigment mass and local overpainting/redeposition; (2) rights-cleared full-resolution wax-stroke macro image, registered to a candidate render, with topology and color/edge frequency comparisons; (3) independent artist judgment on actual 1×/3× screenshots and motion; (4) source-measured human facial anatomy and expressive deformation. Until all relevant gates pass, keep #281 draft and all new ArtCraft portrait work `!dev`.
