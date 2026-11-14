# Chinese Ink Character Animation: Reference Study and Roadmap

**Research date:** 2026-11-14. **Evidence status:** Sources, descriptions and accessible previews inspected; external streaming films not decoded frame-by-frame. Actual original Kumiki browser screenshots and encoded clips from PR #156 were separately available for inspection. These links are references, not artwork licenses.

## Videos to study for production decisions

| Reference | Direction for implementation |
|---|---|
| [小蝌蚪找妈妈 / Little Tadpoles Look for Mother (1960)](https://www.youtube.com/watch?v=LwOOO3tel6E) | Living silhouette deformation, creature choreography and independent tonal ink shape layers, not dark contour-only sprites |
| [牧笛 / The Cowboy's Flute](https://www.odysseychinesecinema.uk/film/the-cowboys-flute/) | Quadruped weight transfer, herdboy performance and multiplane landscape composition |
| [鹿铃 / The Deer's Bell](https://www.odysseychinesecinema.uk/film/the-deers-bell/) | Child/deer interaction, touch, expressive ears and tail movement; sparing color accents |
| [山水情 / Feeling from Mountain and Water](https://m.topys.cn/article/7743) | Restrained human acting, deliberate gestural silhouettes, long held landscape space |
| [Travelling Through Brush and Ink — making-of](https://vimeo.com/224334164) and [film](https://vimeo.com/221351889) | Frame-by-frame character pivots, practical prop contact, character placement within evolving painting and handcrafted scenery |
| [The Wind Guardians film opener](https://vimeo.com/574846968) | Hybrid 2D/3D ink look with view-stable hand-painted marks |
| [Dijiang's Tale](https://vimeo.com/652003206) | Original 2D acting on painted backgrounds; distinct character and environmental animation layers |
| [The Promise — Ink and Watercolor Animation](https://vimeo.com/350661229) | Brushwater life cycle and expressive figure movement; all rights reserved, reference only |
| [Living Chinese Ink Painting — Jiangnan](https://vimeo.com/112202490) | 3D NPR shading with film lighting and painted visual detail |
| [Ink Nanjing](https://vimeo.com/36997097) | Photo-to-ink motion graphics; identify as stylization, not real brush painting |
| [Chinese Ink Brush cFire collaboration](https://vimeo.com/828199347) | Multiple color acts, cranes, fish, boats and symbol-to-life animation across a long story |
| [Qiu Anxiong — Cake](https://vimeo.com/118084226) | Editorial and social-documentary subject matter in Chinese ink aesthetic |
| [Historical production perspective](https://paper.people.com.cn/rmzk/html/2018-09/07/content_1879952.htm) | The progression from tadpoles to quadrupeds, then deer/child and full human acting raises both animation and tonal-compositing complexity |
| [The Herd Boy's Flute camera/ink analysis (2026)](https://doi.org/10.1080/17508061.2026.2749963) | Multi-plane rostrum camera movement, frame-by-frame exposure, ink laid into paper and independent moving painted layers |

## Verified missing features

| Priority | Missing point | Required capability |
|---|---|---|
| P0 | Stop-start motion at each stage waypoint | C1-continuous directed path, authored speed curves and deliberately stopped keys |
| P0 | Skating feet while an actor travels | Stage-space planted contacts, swing clearance, two-bone IK and ground-pivot discipline |
| P0 | Existing image-asset characters not resolved by ink wrapper | Pass through approved image-asset mappings and return diagnostics rather than blank render |
| P1 | Rigid sleeves, hair, scarf, ears and tail | Secondary-motion channels, phase lag and bounded follow-through |
| P1 | Facial acting erased by material overlay | Independent eyes/brows/visemes, registered mouths and shape-attached ink grain |
| P1 | No object hand-off and multi-character contact | Named wrist/prop anchors, contact constraints, interaction cues, safe scene ordering |
| P1 | Dramatic motion loses brush aesthetics | Moving-part-local expressive bristle smears, finite trail and clear hold |
| P1 | Camera zoom/pan creates grain crawl | Paper-space pigment, camera-aware stroke detail and production-size visual QA |
| P2 | Blank areas treated as filler | Storyboard-controlled negative space, reserved captions and seals |
| P2 | No physically credible ink 3D character | View-consistent NPR shading mapped to approved 3D geometry and silhouettes |
| P2 | Generic video templates lack expressive blocking | Walk, stop, look, point, speak, bow, jump, inspect, carry, perform and multi-character scenes |

## INK4 directing contract

INK4 is purely a **motion director**, not a new clock, character generator or identity resolver. Input is the approved CharacterDefinition and CharacterInstance, authored character actions and a source track.

- A paper-space route has 2–48 authored waypoints, positive scale and an explicit facing at the turn. Cubic interpolation preserves velocity through non-stopping intermediate keys. Runtime output is a bounded INK3 track.
- A gait accepts author-specified hip height, two limb lengths, named part IDs, stance fraction, step cycle, toe lift and world route. It derives ground contacts without incrementally simulating prior frames.
- Analytic two-bone IK, alternating arms, torso bob, compensating head tilt and sleeve phase lag produce native CharacterPoseCorrectionTracks.
- Existing CharacterPresenter still owns facial acting, visemes, gaze, idle and approved art. INK4 must not silently overwrite human-authored correction tracks.
- Reduced motion must resolve to a stable chosen pose without playing the gait. Avoid presenting mathematical foot contact as proof of realistic character movement.

## Final acceptance scene

An original unnamed ink traveler enters a mountain handscroll, walks uphill without skating, stops, sees another actor, shifts gaze, gestures with a trailing sleeve, speaks through supplied visemes, picks up a prop with constrained hand contact, bows, and holds an expressive close-up. Capture foot/hip close-ups, face registration, sleeve lag and any ink-bleed texture stability. Both 16:9 and 9:16 must be rendered at normal speed and reviewed against actual ink-animation reference principles.

**Rights:** No third-party frames, model assets or audio are redistributed. Visual and motion techniques are independently implemented.
