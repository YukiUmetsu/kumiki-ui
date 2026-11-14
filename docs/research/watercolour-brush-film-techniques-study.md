# Watercolour and brush film-reference study — material, acting and production

**Date:** 2026-11-14  
**Scope:** **Watercolour / Brush** (not Chinese ink, sumi-e or ink-wash emulation).  
**Relationship:** Roadmap 35, WM1 brush renderer, WM2 authored-silhouette paint.  
**Rights:** The listed videos and films are references only. No frames, soundtrack, art or third-party scene assets are incorporated into this repository.

## Evidence method

Accessible filmmaker descriptions, preview imagery, demonstrations and primary technical papers were inspected. This study does **not** claim that every hosted film was decoded or viewed fully frame by frame. Recheck the actual films at normal playback speed and record shot timecodes before an aesthetic sign-off.

| Reference / watch link | Observed process or documented technique | Missing or required implementation behavior |
| --- | --- | --- |
| [Ina Xi — Mastering Wet on Wet, adjacent washes (YouTube)](https://www.youtube.com/watch?v=GRRsHpisYgk) | Paint consistency and timing make adjoining washes merge into a soft or controlled edge | Distinguish dry-on-dry, wet-on-dry, wet-on-wet; neighboring wash boundaries must be able to mix |
| [Anica Art Studio — Watercolor Backruns (YouTube)](https://www.youtube.com/watch?v=tdZTRkxDCQE) | Added water pushes damp pigment into cauliflower/bloom boundaries | Rewet events require an expanding, pigment-displacing backrun, not generic blur or opaque circles |
| [Michele Webber — Backruns, Cauliflowers & Blooms (YouTube)](https://www.youtube.com/watch?v=Fa3j1gcpvgc) | Blooms can be deliberate texture and have uneven local halos | Seed and local paper wetness must drive asymmetrical edges and remain still after drying |
| [Fig & Frame — Water, hand-painted short-film excerpts](https://figandframe.com/case-studies/water) | Character carrying water: bucket weight, posture, light, long shadow; motion belongs to the painted world | Reuse actual rigged walking/gaze/speech channels with a stable per-part painted material; foot contact and grounding |
| [The Snaffaloo (Vimeo)](https://vimeo.com/1067436390) | Frame-by-frame watercolor characters with painterly backgrounds and dimensional environment transforms | Artist-directed pose cadence and independently moving foreground/background layers |
| [Dijiang's Tale (Vimeo)](https://vimeo.com/652003206) | Watercolor-painted scenery combined with digitally animated characters | Mix stable painted background with reusable jointed character performer rather than repaint entire frame |
| [Watercolor Metamorphosis (Behance)](https://www.behance.net/gallery/150162997/Short-animated-film-Watercolor-Metamorphosis) | Individually painted, scanned and composited frames; organic texture and controlled drawing variation | Optional frame-cadence / line-boil constrained to shapes; avoid viewport-wide random texture |
| [SKINDEEP making-of (Film Shortage)](https://filmshortage.com/shorts/skindeep/) | Thousands of watercolour-painted frames composed with watery reflections | Separate physical wet-media style from optional cinematic refraction; water isn't a shortcut to painted material |
| [A Valsa do Pódio making-of (Vimeo)](https://vimeo.com/80460866) | Painted hundreds of frames with watery, incomplete brush forms before compositing | Support deliberate incompleteness, erased/reserved areas, shape edits across frames |
| [Curtis et al. — Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf) | Dry-brush, edge darkening, backruns, pigment granulation, glazing and pigment flow require separate physical mechanisms | Don't equate per-edge opacity, round speckles and CSS filters with genuine media simulation |
| [Watercolor Learning Center — Practicing Brushwork (PDF)](https://www.watercolorlearningcenter.com/uploads/2/4/8/5/24852303/practicing_brushwork.pdf) | Side-of-brush contact, pressure and falling pigment load create different stroke cross-sections | Replace uniformly mirrored ribbon edges with direction, brush tilt, asymmetrical pigment loading |

## Current WM1/WM2 deficiency audit

1. **Real pigments:** WM1 and WM2 render mostly independent transparent vector regions. There's no spatial water/pigment field, pigment sedimentation or true wet neighbor transfer. **Do not claim simulated fluid mixing.**
2. **Backruns and lifting:** No time-stamped rewet/drop event in WM2; adding an animated watercolor backrun primitive is the next local material slice.
3. **Edge topology:** Polygonal outlines are too even or lozenge-shaped at medium scale; low-frequency edge pooling plus fiber-scale variations should vary with paper and wetness, not just seed.
4. **Color behavior:** Fixed SVG color gradients are not pigment separation; wash mixing and glazing must be modeled separately.
5. **Character performance:** WM2 cannot yet place a character presenter on a path with grounded gait and gesture/viseme/blink while its original part drawings retain distinct watercolor surfaces.
6. **Scene grammar:** WM2 can paint arbitrary SVG silhouettes and masked images, but needs better actor, perspective, camera, object-motion and reveal composition.
7. **Motion craftsmanship:** Still backgrounds can hold; characters need silhouette-accurate rigging, feet-to-ground, object interaction, gaze, speech timing, hand-painted held poses and optional limited redraw cadence.
8. **Validation:** Actual 16:9/9:16 encoded motion, contact sheets, close-up paper crops, shuffled frame seeks, and human normal-speed art signoff remain independent gates.

## Priority implementations

**P0:** deterministic localized pigment backruns (rewet at a chosen frame, nonuniform perimeter, central lifting, pooled dark edge); defensive preflight and CPU seek tests.  
**P0:** reusable watercolor actor-stage bridge built *on* CharacterPresenter and FilmStage: feet-anchored motion, path easing, gait and shadow, with original face/arm/leg rigs and per-part watercolor material; no new character evaluator.  
**P1:** per-wash wetness and pigment field/canvas renderer, wet-on-wet crossing and sediment granulation; introduce numeric tolerance QA and documented resolution/performance.  
**P1:** more expressive acting with contact targets (hand + prop, feet + floor), facial poses, true audio/viseme alignment and on-twos painting mode.  
**P2:** more original genre fixtures (science, nature, history, product, illustrated story); reusable storyboard templates and artist-facing controllers.

## Engineering and acceptance

- Keep deterministic paint tied to absolute FilmStage frames and fixed paper coordinates, not requestAnimationFrame or random per render.
- Brand-specific, licensed film imagery is research only; ship original artwork and user-provided assets via explicit references.
- Separate original interactive/chart/video content from a material-native watercolor-painted drawing; a full-frame watercolor filter cannot deliver hand painting.
- Verify a shape's boundary, wet paint onset, diffusion, rewet, final dry hold and typography in both aspect ratios.
- **Art status:** reference research completed; no unconditional visual acceptance. Normal-speed human art review remains necessary.
