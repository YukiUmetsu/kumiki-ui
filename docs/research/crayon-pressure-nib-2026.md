# Wax crayon pressure-nib study (2026-11-14)

Evidence: published papers, real crayon artworks and the prior original
Kumiki crayon film frames. No third-party textures, footage or screenshots
were imported. Sources were reviewed as text or stills, not claimed to be
fully watched at normal playback speed.

## Material reference and engineering decisions

- [Rudolf, Mould and Neufeld, *A Bidirectional Deposition Model of Wax
  Crayons*](https://doi.org/10.1111/j.1467-8659.2005.00826.x):
  pressure, the evolving crayon contact profile and paper height field govern
  wax deposition; wax removal and redeposition matter for a future true
  material simulation.
- [Murakami, Tsuruno and Genda, *Real-Time Rendering of Strokes Using Multiple
  Illuminated Paper Textures*](https://doi.org/10.11371/iieej.34.319):
  pressure-sensitive marks and paper-surface irregularity influence
  the distribution of pigment along a stroke.
- [Carleton University wax-crayon paper](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf):
  measured paper height and optical pigment density remain beyond the
  present SVG-only implementation.

## Audit

Previously, `crayonMarks` generated independent short quadratic curves,
but `WaxRegion` painted each entire multi-curve mark with one constant
`strokeWidth`, so stylized lines read like equally thick digitally rounded
ribbons. The prior broken-grain pass changed the orientation, but not each
stroke's contact profile.

## Iteration

- Preserve the original authored `d` stroke geometry and pressure/seed.
- Retain the numeric quadratic control points as `nibArcs`.
- Render variable-width **filled ribbon geometry** with a narrow touch-down,
  broadening through contact then tapering at the lift.
- Use bounded five-segment adaptive partial-progress geometry for frame
  seeking without a second animation clock.
- Provide `nibStyle: "rounded" | "tapered"` for visual A/B comparison and
  strict scene JSON validation; default to tapered, retain classic as opt-in.
- Add Storybook contact-comparison story and deterministic geometry,
  backward-seek and invalid-data tests.

## Visual QA and open items

1. Review the Storybook nib A/B at frames 15, 45, 88, 115 and both aspects.
2. Capture actual exported 16:9 and 9:16 frames and play the full films at
   normal speed. Compare line naturalism, color density and frame-to-frame
   continuity; this session does not yet certify human artistic approval.
3. Benchmark 1080p and 4K scene complexity for many complex character parts.
4. Upgrade to a bounded paper height-field, pressure-controlled smearing,
   pigment pickup, wax scraping and local optical color mixing only when the
   small renderer's visual limits justify the cost.
5. For true expressive characters, add more unique artwork at extreme
   wing, face, hand and foot poses rather than affine-only joints.
