# Follow Subject Through Sections Scene

`follow-subject-through-sections` carries one recognizable subject (a person, object or
carrier) through distinct worlds, each a stage of a journey, and lands it at a destination.
Supply a `SceneTemplateSpec<"follow-subject-through-sections">`. The caller owns playback and
supplies `frame`; the component creates no clock. Every frame is a pure function of the spec,
the frame and the output size, so frames can be seeked and exported in any order.

**Causal beat.** *Input:* the subject enters the first world. *Transform:* the camera tracks
it through each world, and every boundary is a motivated transition that keeps the subject's
screen position, direction of travel, scale and light continuous. *Output:* it decelerates
onto its destination with contact, and the last statement holds.

## Inputs

| Input | Behavior |
|---|---|
| `subject.media` | Static fallback and provenance record (needs intrinsic `width`/`height`). Draw it facing +x. |
| `subject.size`, `anchor`, `contact` | Box height as a fraction of the shorter side (default 0.12); the media point that rides the path and pivots; the media y that touches the ground on arrival (default 1). |
| `subject.orient`, `maxTilt` | `"path"` pitches along travel (craft, birds), `"upright"` never rotates (walkers); pitch cap in degrees (default 24). |
| `sections[]` (2–8) | `environment` plate, optional depth `layers` (transparent images, depth −3..3), `focus` (plate point kept under the cover crop), `kicker`, `title`, `caption`. |
| Section timing | `start` (absolute cue frame) and/or `duration`. Sections with neither share the frames between their known neighbours. Each must be at least 24 frames. |
| `sections[].transition` | How this world arrives: `occluder-wipe`, `whip-pan`, `camera-carry` (default) or `match-cut`. `transitionFrames` is centred on the boundary (defaults 20, 14, 34 and 0). |
| `sections[].path` / `portraitPath` | Subject path in normalized stage space (points may sit up to 0.4 outside for entrances; `scale` per point). Omitted paths are generated: the first enters with its nose already in frame, middle ones hold a tracking position with a gentle drift, and the last lands. Paths that do not meet are blended across the transition, never jumped. |
| `sections[].foreground`, `atmosphere` | Procedural near forms (`foliage`, `trunks`, `grass`, `rock`, `none`) at the parallax rate; drifting `motes` or `mist`. |
| `sections[].light`, `ground`, `camera` | Light colour and exposure on the subject, blended across each transition; ground y that enables a shadow; per-world `pan`/`push` override (for example a calm push on the destination). |
| `direction` | `"ltr"` (default) or `"rtl"`. It is kept across every cut, and `rtl` mirrors the subject box. |
| `arrival` | `settle` (fraction of the last section at which it comes to rest, default 0.72); `contact` shadow and grass occlusion (default on). |
| `camera` | `pan` (plate travel per section, 0–0.5), `push` (0–0.4), `parallax` (near-form rate, 1–4), `follow` (tilt with the subject's height, 0–1). |
| `captionPlacement`, `progress` | Copy region: `"auto"` puts it in the lower third in landscape and the upper band in portrait. The segmented journey rail can be turned off. |
| `typography`, `palette`, `look` | `display`/`body` font families, `titleScale` (0.7–1.4), `titleWeight`; `ink`, `scrim`, `rail` colours; `grain`, `vignette`, optional landscape `letterbox`. The accent comes from the scene `accent`. |

All copy is caller text. Nothing in the stage is hardcoded English.

## Transitions

- **Occluder wipe:** a textured near mass crosses the lens: procedural bark for `trunks`, otherwise leaf or rock grain. On the swap frame it spans the whole frame, so the cut is hidden inside it.
- **Whip pan:** the plate travels inside its overscan under a directional blur (`feGaussianBlur` with duplicated edges), with a light streak. The swap happens at peak blur, so the frame never empties. The subject stays sharp, because the camera whips with it.
- **Camera carry:** a continuous pan from one world into the next. The incoming world is over-scanned beneath, and the outgoing world feathers its leading edge over a narrowing band. A defocused near threshold from the world being left passes over the seam.
- **Match cut:** a hard cut with a decaying 3.5% push kick. The subject must hold its position, and the preflight flags it if it moves more than 3% of the shorter side.

## Host rig slot

`FollowSubjectThroughSectionsScene` accepts `renderSubject(props)`, a runtime-only slot that
is never saved in the spec. It receives the evaluated `state` (section, progress, stage x/y,
`heading`, `bank` −1..1, `speed`, `arrived` 0..1, active `transition`, and blended `light`),
the scene `frame`, the `media`, and the box `width`/`height`. Draw the subject facing +x
inside the box: the stage positions it, pitches it and mirrors it for `rtl`. The Storybook demo
passes an original frame-addressable paper-plane SVG rig, `PaperPlaneRig` (bank rolls the
wings, speed adds trailing-edge flutter, and the world's light tints every facet).
`renderAsset` and `renderOverlay` work as in the other scene templates.

## Motion rules

Heading is pure and calm. Velocity is taken over a symmetric ±5-frame window. The heading is
smoothed with a 5-tap kernel over ±12 frames, then capped at 2.5° per frame by a short replay
that always starts 36 frames back. It levels out smoothly as the subject comes to rest.
Motion begins on frame 0: the subject's nose is in frame and the plate is already panning. Copy
enters after each arriving transition settles and leaves before the next one begins. The
journey rail persists.

## Preflight and safety

`followSubjectFraming(spec)` is CPU-only. It samples every other frame and lists any frame
where the subject box enters the copy region (`followSubjectCopyRegion`), leaves the stage
after its entrance, or moves across a match cut. Run it for every output size.
`followSubjectTimeline` and `followSubjectAt` are exported for hosts, rigs and audio cue
alignment. Display type is capped by `fitLongestWord`, and CJK breaks per character, so words
never break internally and are never clipped.

Measured in Storybook at 960×540 and 540×960, the title is 9.8% and 8.3% of the shorter side,
the caption 3.4% and 3.5%, and the kicker 2.6% and 2.7%. Reduced motion removes the camera,
parallax, particles and word motion. Each boundary becomes a cut, the subject holds a level,
representative position per world and rests at the destination in the last world, and the
Storybook keeps seeking available. The component forwards `ref`, DOM props, `className` and
`style`.

## Ported from FS1

An earlier FS1 (`origin/feat/scene-recipes-catalog-and-follow-subject`) was not merged. This
recipe keeps its sound ideas:
- environments composite as whole groups, so a new sky never leaks through an old foreground;
- depth layers with overscan-safe parallax;
- one persistent subject node with a static, provenance-bearing fallback;
- the `renderSubject` host slot.

This recipe replaces FS1's whole-scene crossfade with motivated transitions, its standalone
schema with the ST1 `SceneTemplateSpec`, and its percentage keyframes with per-section paths,
a heading and bank model, arrival contact, kinetic copy and a framing preflight. FS1's
Pip character art has unconfirmed rights and was not used. Its Kenney CC0 GLBs are 3D props,
not used by this 2.5D stage.

## Demo and credits

Storybook: **Video production / Scene Templates / Follow Subject Through Sections**. It has
play, pause and seek controls, 16:9 and 9:16, reduced motion, and an `en`/`ja` copy control.
A folded letter crosses four worlds from morning to evening: city (occluder wipe of pine
trunks) → forest (whip pan) → cape (camera carry) → highland, where it lands in the grass.

The plates are Poly Haven HDRIs, CC0, downloaded as 8K tonemapped equirectangular JPGs and
reprojected with ffmpeg `v360` to 120° cylindrical crops. The sources are
[Canary Wharf](https://polyhaven.com/a/canary_wharf) (Andreas Mischok; a small sign row on
the wall is softened so no third-party marks are legible),
[Misty Pines](https://polyhaven.com/a/misty_pines) (Greg Zaal),
[Cape Hill](https://polyhaven.com/a/cape_hill) (Greg Zaal and Rico Cilliers) and
[Champagne Castle 1](https://polyhaven.com/a/champagne_castle_1) (Greg Zaal). Provenance is
recorded in `assets/THIRD_PARTY_ASSETS.json`. The paper plane and the copy are Kumiki
originals. This is 2.5D multi-plane, not a navigable 3D world. There is no audio.

## Open items

- Human visual review of the exported MP4s at normal speed remains open; the agent reviewed contact sheets only.
- There is no audio or sound bridge yet.
- Near forms are procedural silhouettes, not photographed foreground elements.
- The whip blur radius is set in spec pixels, so it scales slightly with the CSS render size.
- Ground occlusion blades are drawn for grass and foliage destinations only.
