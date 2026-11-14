# Chinese ink-wash character animation: further reference and craft audit

Research: November 14, 2026. PR #176. Video pages, documentary descriptions and academic analysis were inspected; no external film was frame-decoded end-to-end or copied.

## References

| Video or source | Observed/documented technique | Kumiki design response |
|---|---|---|
| [Herd Boy's Flute 1963](https://www.youtube.com/watch?v=vWb4OjXUsGU) | Boy and water buffalo inhabit a moving hand-painted landscape | Keep acting layer, paper texture and camera on distinct film planes |
| [Duan Xiaoxuan cinematography analysis 2026](https://doi.org/10.1080/17508061.2026.2749963) | Rostrum camera compositing, multi-pass exposure, speed-changing tracking shots, long quiet holds | Preserve absolute-frame layer/parallax timing while subjects move |
| [Little Tadpoles Look for Mama 1960](https://www.youtube.com/watch?v=InaOKrub0rA) | Several independently moving animals retain painted outlines and shallow-depth overlap | Stable multi-actor IDs, clear crowd order, shared material |
| [BFI Te Wei essay](https://www.bfi.org.uk/sight-and-sound/features/te-wei-founding-father-chinese-animation) | Character edges harmonize with diffuse painterly backgrounds | Control crisp eyes versus wet garments per rig part |
| [The Deer's Bell 1982](https://www.youtube.com/watch?v=JmFlQDrV_mw) | Child-deer relationship, physical bell and emotional parting | Future part-local prop ownership, actual hand contact |
| [Feeling from Mountain and Water 1988](https://www.youtube.com/watch?v=nbZgG_vEz3c) | Master/apprentice relationship communicated by subtle staging and deliberate stillness | Original two-character dialogue and bowing study |
| [Deep Sea particle ink 2023 study](https://journals.sagepub.com/doi/10.1177/17468477251324060) | Digital 3D particle ink for atmospheric depth | Future separate volumetric/curvature paint pipeline, not a grayscale filter |

All linked works are technique references only. No film frames, proprietary characters, dialogue or audio were imported. Hosting does not imply reuse permission.

## INK5 contribution

Reusable multi-character scene blocking that keeps existing INK1 material strokes, INK2 film layers and INK3 approved CharacterPresenter rigs intact. Per-character seed, identity, art/cues, independent stage track, front/back order, semantic attention beat, face orientation and explicit exchange-distance/feet-overlap audit. Reference Storybook example: Video production / Film Looks / Chinese Ink Ensemble Character Acting. The example is original generic art, not a reconstruction of a specific reference film.

## Defects that should block claims of cinematic quality

1. Root-to-root reach is only a coarse staging audit: it does not guarantee true hand-to-hand, held prop, or planted-foot contact.
2. A pair of differently tinted original rigs is not a diverse cast. New original rigged character sheets for human and animal profiles are still needed.
3. Gaze cues are currently authored using known in-rig targets; cross-character dynamically tracked eye aiming remains unimplemented.
4. No physically validated sleeve/hair spring response, 3D particle ink, orientation-aware strokes on moving geometry, or reusable prop-exchange constraints yet.
5. Browser snapshots and unit tests cannot certify realistic acting. Watch actual 16:9 and 9:16 MP4 at normal speed, inspect overlap, visible pigment and type margin.

## Next work order

P0: integrate existing INK4 grounded gait/IK correction tracks with multi-character hand-to-hand prop contact. The grounded gait solver already exists; do not duplicate it. P0: normal-speed dual-aspect video review and changes based on frames. P1: cross-character gaze and reactions plus cloth settle. P1: three or more original reusable character rigs with coherent eyes/face/speech/limbs, including animals. P2: subject-independent long film recipes and optional 3D-to-ink material projection.

## Verification

Run the existing ink-focused CI plus ink-wash-ensemble unit and Storybook Playwright tests. Export the two same-source 16:9 and 9:16 films from video-ink-ensemble--ensemble-export and video-ink-ensemble--ensemble-portrait-export. Record actual art approval separately from passing code checks.
