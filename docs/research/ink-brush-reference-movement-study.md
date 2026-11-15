# Ink-brush motion and paper-response reference study

**Date:** 2026-11-14
**Scope:** Phase 3 native ink-brush material / PR #153
**Evidence level:** Published video lesson descriptions, written technique commentary, available stills and graphics research. Remote YouTube/Vimeo stream decoding and frame-by-frame playback were **unavailable** in this execution environment. Do not represent the timing notes below as measurements made from downloaded videos.

## Primary video demonstrations to visually qualify

| Demonstration | Key movement evidence in the source | Animation requirement |
| --- | --- | --- |
| [Shimura Kazu — Basic Sumi-e Technique First Step](https://www.youtube.com/watch?v=z0ljeeZJcRA) | Straight brush, side brush, thin line and leaves; source explicitly describes a brief pause at contact and lift, front/back ink loading and five tones within one brush | Preserve contact → decisive pull → release. Contact width must depend on brush angle/pressure; a single stroke cannot be painted as one monochrome ribbon |
| [Oriental Art Supply — Decisive Strokes and Thoughtful Pace](https://www.youtube.com/watch?v=9jfR_35qrRU) | Raw Xuan paper demands confident movement followed by a pause to observe the new mark | Independent authored stroke onset; distinct slow loaded gestures vs brisk kasure gestures; still holds are part of the composition |
| [Kate Wu — Chinese Painting: Ink, Paper and Brushes](https://www.youtube.com/watch?v=8r4AC4kiwZE) | Upright and slanted stroke methods on real paper, orchid exercise | Angle/pressure/deposition must change the shape and density of contact |
| [Bill Buchman — How to Make Strokes in Sumi-e](https://www.youtube.com/watch?v=vAoOf1W6abk) | Dry versus wet brush and manipulation of the bristle tip | Flying-white gaps and pale capillary wash should come from differing moisture/load, not a generic mask overlay |
| [Larkin Green Studio — Preparing Ink and Paper](https://www.youtube.com/watch?v=9I_rAtMAcuI) | Ink loading, bone stroke, thin–thick–thin and bamboo practice | Model tapering and ink reservoir depletion across the same gesture |
| [Tristina Dietz Elmes — Bamboo and Flowers workshop](https://www.dietzart.gallery/blog/asian-bamboo-flowers-watercolor-painting) | Published workshop chapters: 36:51 stroke practice, 1:04:40 ink strokes on rice paper, 1:10:22 bamboo | Review actual deposition and paper absorption at these timestamps during independent full-video QA |

### Graphic-science cross-check

- [Lee (2001), *Diffusion rendering of black ink paintings using new paper and ink models*](https://www.sciencedirect.com/science/article/pii/S0097849300001321) — account for paper fibre mesh, mobile ink and irregular diffusion separately from brush geometry.
- [You et al. (2013), *Realistic paint simulation based on fluidity, diffusion, and absorption*](https://onlinelibrary.wiley.com/doi/full/10.1002/cav.1500) — pigment/binder/solvent/paper are distinct physical components; absorption and diffusion are not synonymous.
- [Li & Bai (2015), *Image-based ink diffusion simulation*](https://wseas.com/journals/articles.php?id=4165) — distinguish primary stroke region from diffused region.

### Implementation mapping

1. Keep pressure/pace samples and their exact FilmStage timestamps in **INK1 vector geometry**; don't re-author the path for the wet model.
2. Deposit ink and water from an **anisotropic nib footprint**, with load depletion along the gesture.
3. Let individual wet footprints expand and absorb with age in **fixed paper coordinates**; keep dry brushes narrower and more broken.
4. Conserve pigment **per dab**. A newly deposited stroke must never alter a dried, spatially separate stroke (verified regression).
5. Resolve to an exactly stable dried sheet after a bounded interval, even when jumping backward and forward in the film.
6. Draw into a transparent raster ink layer above the paper, beneath authored typography; retained SVG mode is for A/B comparison, not a second clock.
7. Export original 16:9 and 9:16 stories through existing FilmStage and inspect **normal-speed encoded MP4**, stroke close-ups and shuffled frame seeks.

**Limits:** The present layer is a bounded analytic approximation, not an SPH fluid solver, calibrated Xuan-fibre microscopy, measured time constants, or verified frame-by-frame recreation of copyrighted references. No external imagery/footage is bundled. A normal-speed physical-video reference review is still required before declaring artistic parity.
