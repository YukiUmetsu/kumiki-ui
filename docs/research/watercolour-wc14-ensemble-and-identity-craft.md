# WC14 — Independent watercolour portrait identities and two-actor production

**Status:** Implementation and automated structural checks proposed. Native-resolution
Chromium capture, normal-speed MP4 playback and independent visual assessment must be
recorded before claiming artistic reference fidelity.

## New reference research (technique only; no third-party artwork shipped)

| Reference | Observed feature | Source construction response |
| --- | --- | --- |
| [Álvaro Castagnet watercolor portrait](https://www.pinterest.com/pin/alvaro-castagnet--300474606401402831/) | In the visible study, strong warm cheek pigment, soft transitions into paper and a few high-value marks around the eyes; clothing disappears into reserved paper | Create distinct cheek/jaw volumes; keep collar and hair underpaint opaque while the outer washes are transparent |
| [Charles Reid: Watercolor Master, artist's site](https://www.charlesreidart.com/) | Direct gestural marks, light-led portrait identity and economical edge selection | Keep irregular, purposeful dry-brush accent paths, not dense evenly spaced bristle noise; separate found eyes from lost cheek edges |
| [Charles Reid interview/process photographs](https://static1.squarespace.com/static/548fb796e4b0720a1db60a30/t/57afc336e58c62414bdc06e2/1471136571041/InterviewCharlesReidlowrez.pdf) | Visible construction progresses from a sitter's line sketch and localized face color to reserved garment and surrounding washes | Reveal head/hair/eyes/garment at controlled absolute frames; do not fade a flattened completed bitmap |
| [Liz Chaderton, hard and soft watercolor edges](https://letter.museumapp.co/paint-hard-and-soft-with-liz-chaderton/) | A portrait benefits from a mix of deliberately hard feature edges and gradually disappearing contours | Keep eyeball/iris wholly within a hard, asymmetric eyelid aperture; reserve high edge softness for temple/cheek turns |
| [Curtis et al., Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) | Color deposition, glazing, pigment pooling and granulation describe different effects | Reuse per-shape optical washes and shared wet-paper deposition; do not fake multiple characters by duplicating CSS image overlays |

These are *aesthetic/technique* references, not licensed source assets for tracing,
exact reproduction or training. Do not copy protected sitter likenesses.

## ArtCraft structural dossier: what changed

Prior WC13 delivered two sitters with different hair/beard palettes and age cues,
but used one **shared face silhouette, nose, eyes and lips**. This weakens
character identity even if all material shaders are perfect.

The WC14 source geometry now has physically different:
- near/far eye anchors, orbital span and eyelid apertures;
- head/jaw silhouette and chin endpoint;
- nose dorsum, side plane, tip and nostril marks;
- upper/lower lip boundaries and philtrum/chin shading;
- beard/long-hair flow fields made of irregular authored paths rather than
  mechanically repeated sine waves.

Canonical portrait space is **600 × 800**. The first sitter's eye anchor is
(276,234) near / (374,225) far; the second is (264,242) near / (361,232)
far. The source face/chin landmarks are separate and immutable across
16:9 and 9:16 output transforms. The common renderer still handles
local pigment glazes and paper tooth.

### Character graph and attachment roles

| Part | Parent and connection | Stress pose / failure gate |
| --- | --- | --- |
| Eye aperture | source face → named near/far eye → moving gaze under clip | Both iris/pupil remain inside their lid while head rotates; independent blinks |
| Hair flow | head silhouette plus local crown/fringe ribbons | Irregular strokes turn with root-to-temple curvature; no separate floating lines |
| Mouth/nose | cheek/midface planes and philtrum | Face B uses genuinely different contour geometry, not palette-only swap |
| Garment and neck | opaque overlapping underpaint | No dark back-hair showing through cheeks, no ghosted shoulders |
| Performer | actor-specific namespace + absolute frame delays | Frame 185: actor A blinks, B open; frame 231: B blinks, A open |

**Negative controls:** Recolor-only portrait duplication; cyclic sine-wave
hatching; transparent person-shaped masks; two CSS-scaled independent canvases;
identical eye/mouth anchor placement; shared SVG paint IDs. These controls
should fail identity, opacity, topology or temporal independence gates.

## Generic production API

- `watercolorPortraitFigure(subject)` yields an editable original figure tree.
- `watercolorPortraitEnsembleSpec(output, seed, cast)` composes **1–3** actors
  on the same paper with unique element IDs and actor-local film delays.
- `inspectPortraitCast` checks identity, count, unique IDs, numeric
  placement, scale and bounded frame delays. Unexpected JSON keys fail.
- `watercolour-portrait-ensemble` FilmStage slot supports independent
  16:9 and 9:16 native outputs. The portable example is
  `examples/film/watercolour-portrait-ensemble.film.json`.
- Storybook stays in the existing **Video Production / Film Looks /
  Watercolour & Brush** folder under **02B Two-Character Film**, with
  independent sitter controls, paint delays, frame scrubbing and JSON authoring.

This is a reusable composition layer for watercolor **portraits**, not yet a
universal full-body puppet system. Hands, feet, facial phonemes, ¾/side
turnarounds and detailed actor interaction are still incomplete.

## QA status and remaining gates

1. Automated source assertions: no duplicate SVG IDs, renderer schema
   validity, independent frame-key timing, full opaque foundational layers,
   source-specific bone/face geometry, JSON security and FilmStage export.
2. Browser proof: both ratios, frames 0/185/231/255, opacity, clipping,
   alternative sitter assignments and reduced motion. Capture actual screenshots.
3. **Not artist-approved until externally inspected**: compare source images
   and screenshots at full frame, eye 300%, mouth 300%, hair 200%; inspect
   primary close-up form, reserved paper and whether human expression is appealing.
4. Run actual exported films at **normal speed** with motion/film continuity
   review; test seek order, idle holds, ink flicker and long-play rendering.
5. Then extend to fully rigged bodies, animals, buildings, landscape props,
   atmospheric scene transitions and arbitrary character asset import.
