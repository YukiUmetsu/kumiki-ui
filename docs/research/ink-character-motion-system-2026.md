# Phase 4 — Chinese ink animation / character systems research

**Date:** 2026-11-14  
**Implementation basis:** INK1 merged in PR #159. This research guides a reusable character, environment, and cinematic layer rather than duplicating any existing film's characters.

## Reference set and observable design language

| Film or production | Public viewing / production page | Animation principle | Engineering consequence |
| --- | --- | --- | --- |
| *Little Tadpoles Look for Mama* (1960/61), Te Wei | [Chinese Film Archive catalogue](https://www.cfa.org.cn/cfaen/gz/dymlcx/dy/2023060210450390599/index.html); [museum discussion](https://www.mplus.org.hk/en/cinema/animation-pioneers-in-asia/mainland-china-revisiting-the-classics/) | Many small animals move with recognizable silhouettes and soft, variable-density washes while the landscape stays largely quiet. | Separate silhouette, wash, eye/expressive detail, action timing, and sparse background layers; reusable creature rigs, not one character template. |
| *The Herd Boy's Flute / 牧笛* (1963), Te Wei and Qian Jiajun | [Available 20-minute YouTube upload](https://www.youtube.com/watch?v=ARpWx-ZH4I0); [historical analysis](https://doi.org/10.1080/17508061.2026.2749963) | Story is conveyed through boy/buffalo gestures, water and landscape, flute playing, and environmental holds. | Distinct acting and action cues; pose-keyed movement, body turns, breathing, secondary motion, and environment/camera tracks. |
| *Feeling from Mountain and Water / 山水情* (1988), Te Wei | [Available 19-minute upload](https://www.youtube.com/watch?v=3f0MqW15YeQ); [ACAS analysis](https://acas.world/2020/08/12/feelings-of-mountains-and-rivers-minimalism-and-monumentalism-in-motion/) | Expressive close-up acting alternates with nearly still, highly negative-space landscapes. | Actor transforms must be independent of paper-space scenery; retain parallax and gentle camera drift, generous holds, fine facial and hand performance. |
| *Feeling from Mountain and Water* making-of | [CCTV interview with key animator](https://www.youtube.com/watch?v=z7S4NOIcWo0); [Columbia Journal analysis](https://journals.library.columbia.edu/index.php/cja/article/download/9275/4850/22666) | **筆墨分解 (bimo fenjie):** moving figures' individual strokes and wash tones were separated into multiple cel layers. | Explicit layered drawing on a hierarchical character rig, multi-tone and contour layers separately transformable. |
| *Travelling Through Brush and Ink / 筆墨行旅* (2017) | [Making-of](https://vimeo.com/224334164); [film](https://vimeo.com/221351889) | The production describes frame-by-frame, physically constructed characters transforming into animals and plants as they move through paintings. | Component model must support **pose and silhouette swaps**, not only bone rotations; props and environment can transform alongside actors. |
| *The Wind Guardians* opener | [Vimeo](https://vimeo.com/574846968) | Modern film opener combines 2D and 3D with ink-wash textures and dramatic spatial staging. | Future phase: object-space brush tracking over 3D rigs, 2.5D camera planes, contact shadows and compositing. |
| *Ink Nanjing* motion graphics | [Vimeo](https://vimeo.com/36997097) | Uses photographic reference, animated ink treatment and designed sound. | Future phase: typography, graphic reveals, motion picture/live-action ink treatments, synchronized sound cues. |
| *Companionship* | [Vimeo](https://vimeo.com/1179421829) | Contemporary ink-wash short about fishing and cormorants, emphasizing quiet motion and open paper. | Actor/environment interactions (water, boat, fishing pole, birds), not just standalone gestures. |

### Production-technique cross-checks

- [China Animation Museum](https://ccam.hzxcw.gov.cn/m/article/458.html): moving figures in traditional ink films used separate flat-cel tonal layers combined in photographic passes. Moving water-ink silhouettes is a **compositing and acting problem**, not just a shader.
- [Chinese animation history, China Writers](https://wyb.chinawriter.com.cn/content/202311/08/content72287.html): gradated ink achieved by multiple tonal cel passes and controlled focus/exposure, avoiding the flat monochrome cartoon look.
- [2021 technical survey](https://m.fx361.com/news/2021/1124/19904895.html): key animation, inbetweens, separately inked light/dark/dry/wet layers, and compositing supported the classical approach.
- [Patent CN105205846B](https://patents.google.com/patent/CN105205846B/zh): a later hybrid system explicitly breaks contours and washes into separate tracked layers attached to animated geometry, with scenery planes independent from actors. This is an engineering precedent, not a source to copy.

**Evidence caveat:** I verified public descriptions, historical/technical research, and accessible stills. The execution environment does not supply a reliable online video decoder, so I did **not** perform decoded frame-by-frame measurements of those third-party streams. Timing/acting patterns here are qualitative artistic/production references, not claimed numerical measurements.

## Missing capabilities — priority order

1. **Generalized layered-character rig (implement first):** authored brushwork and wash layers, parent-joint hierarchy, JSON-safe keyframe curves, expressive pose/viseme swaps, blink and secondary dynamics, frame-exact seeking. Two-bone IK for hands/feet. Do not hard-code a single human body plan.
2. **Reusable actions and interactions:** walk/run, turn, jump, bow, reach, speak, play instrument, fly, swim, contact/prop ownership, action blending, event constraints and grounded foot placement. Author actions as clips, not one fixed film.
3. **Material identity preservation:** keep tonal/dry-edge detail attached to moving anatomy, with shape topology overrides for profile/three-quarter/front turns and expression-specific redraws. No screen-space texture swimming.
4. **Living landscape:** separate cloud/mist/water/rock/bamboo/trees, calibrated blank space, fine wash diffusion, mild camera drift, world layers with parallax and occlusion.
5. **Modern cinematic system:** ink-aware camera, depth of field, selective 3D underlays with tracked brush lines, paper-to-scene transformations, shot-to-shot film grammar and reusable transitions.
6. **Performance and quality:** vector/bitmap caching, frame bake for production, stable playback at 1080p and export at 4K, audio/viseme sync, target aspect ratios, storyboard presets and a reference-fidelity rubric.

## Current implementation slice / acceptance

**Scope for first PR after #159:** a pure evaluated actor-rig graph plus an SVG multilayer renderer, an original two-character Storybook scene, and sample FilmStage slot. Validate arbitrary JSON-safe rig data, parent cycles, IK geometry, expression selection, deterministic seeking, reduced motion, and browser playback/screenshots.

**Do not overclaim:** This foundation will not itself equal a feature-film animation program. Its initial examples prove a generic actor API; complex 3D tracking, skeletal retargeting, robust cloth, phoneme alignment, and artist-calibrated fluid paper will remain separate roadmap items.
