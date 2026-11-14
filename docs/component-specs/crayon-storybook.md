# Crayon Storybook (experimental material-native extension)

**Registry ID:** `crayon-storybook`  
**Source:** `registry/video/materials/crayon.ts`, `crayon-react.tsx`  
**Storybook:** Video production → Film Looks → Crayon → Storybook  
**Portable FilmDocument:** `examples/film/crayon-storybook.film.json`  
**Visual-approval state:** `not-reviewed` (automated tests are not visual acceptance)

## Opaque pigment and Storybook organization (2026-11-14)

All crayon videos and material demos now live under one **Video production →
Film Looks → Crayon** folder. Child Storybook pages are **Scene Engine**,
**Storybook**, and **Material Studies**. Explicit story `id` fields are
unchanged, so existing deep links retain their IDs.

The prior wax region's semi-transparent base could make completed animated
characters ghostlike, showing the buildings, sky and other characters
behind their bodies. It is **not physically plausible** for a dense
wax-crayon subject. CRAYON1 now supports an optional `coverage` property:

| Coverage | Underpaint | Paper grain / wax strokes | Use |
| --- | --- | --- | --- |
| `"open"` (default) | Legacy transparent colored glaze | Scumble and strokes break over the paper tooth | Atmosphere, skies, distant hills |
| `"opaque"` | 100%-opacity silhouette, progressively revealed while depositing color | Textured wax, hatches, scrapes and highlights remain on top; tooth only masks the surface strokes | Animals, people, architecture, props, flowers and solid subject regions |

Opaque underpainting does **not** fade after the subject finishes
construction. The solid silhouette is never masked by the porosity
filter. Color buildup is animated through the existing fill window,
including both outline-first and fill-first authoring and reduced motion.
This is not a new clock or a new independent renderer; the same
portable scene and FilmStage use the option.

The original fox, the multi-character dragon/forest friend/owl,
character performance, character construction, walk tests, animals in
illustrative scenes, town buildings, and chart bars explicitly use
opaque underpaint; their skies and atmospheres intentionally remain
open. Wax hatching has also gained original per-part orientation
matching anatomy and rooftops rather than uniform horizontal bands.

See [material-opacity and craft study](../research/crayon-material-opacity-and-craft-study.md),
and the Storybook **Material Studies / Layer Coverage Comparison**.
The browser optics test compares rendered interior pixels across two
contrasting background palettes, rather than trusting SVG attributes
alone. Independent human review of full encoded films is not implied.

## Original visual direction

Two independently authored themes share a reusable wax renderer. **The Lantern Trail** shows a fox finding its way through a deep-blue night, with waxed moon, dense hills, tall pines and lantern-rays drawn by hand. **One Little Seed** uses a sage-and-teal morning, pink-orange blossoms and a textured golden sun. Both provide 16:9 and 9:16 layouts; no external images, licensed characters, copied story, font download or audio dependency.

The material is not a photographic crayon filter:

- `crayonMarks(bounds, {seed, pressure, spacing, passes})` generates real overlapping curved deposits with stroke-specific pressure, scumble facets and scraped wax gaps.
- `WaxRegion` clips those deposits to authored silhouettes. Coverage is built by deposited strokes rather than a flat SVG fill with noise on top.
- `Paper` renders independently seeded paper fibers and a repeated, stable pore mask. `paperTooth` changes pore density/depth rather than changing the seed at every frame.
- `crayonProgress(frame,first,last,index,count)` reveals **each actual stroke** in an authored stagger. No timer, mutable simulation state or random rendering path exists in the renderer.
- The same absolute frame can be rendered in arbitrary order, in a browser or in the production FilmStage slot. Reduced motion shows the finished page.
- Narrative type uses a separate legible serif layer so paper and strokes never obscure captions.

### API

Install `crayon-storybook` and render `<CrayonStorybook frame={...} aspect="landscape" story="lantern" />`. Supported props:

| Name | Values | Behavior |
| --- | --- | --- |
| `frame` | nonnegative safe integer | Absolute timeline frame, 0 through 419 used by the authored story |
| `story` | `lantern` / `garden` | Original narrative illustration |
| `aspect` | `landscape` / `portrait` | Native 960×540 or 540×960 layout |
| `seed` | safe integer | Pinned paper/brush stochastic pattern |
| `pressure` | 0…1 | Wax line width and deposited opacity |
| `paperTooth` | 0…1 | Density and size of uncovered paper pores |
| `reducedMotion` | boolean | Render static end-state at any requested frame |
| SVG props | SVG-compatible | `style`, `aria-hidden`, and other display attributes |

The illustrative neutral character is part of the **demo**; the core `crayonMarks` / `WaxRegion` material process can be reused with other authored SVG silhouettes. Subject asset ingestion and full media-to-media transitions are not shipped in this slice.

### Articulated character performance (CRAYON1 scenes)

A character can now be assembled from independently authored wax or contour pieces without
baking all poses into a single image. Each element retains its stable `id` and its place
in the authored painter's order. Optional `parentId` references another element; optional
`pivot: { x, y }` sets the local rotation/scale hinge. Existing `motion` keys,
`poseCadence` (drawing on twos/threes), `timing`, and reduced-motion handling
continue to work. The renderer evaluates the root-to-leaf transform chain at the requested
absolute frame. A child can inherit a torso, shoulder and hand transform while its wax
pattern remains pinned. A prop may be listed before its parent in painter's order.

```json
{
  "id": "left-hand", "kind": "contour", "parentId": "left-arm",
  "pivot": {"x": 12, "y": 20},
  "d": "M 0 0 L 20 10", "color": "#684630", "width": 5,
  "timing": {"start": 0, "end": 239},
  "poseCadence": 2,
  "motion": [
    {"frame": 0, "x": 0, "y": 0, "rotate": -15},
    {"frame": 60, "x": 0, "y": 0, "rotate": 35}
  ]
}
```

Hierarchy validation rejects missing parents, cycles, non-finite/out-of-range pivots,
and screen-space/world-space mismatches. This is an authored **2D articulated transform
system**, not skeletal mesh skinning, inverse kinematics, automatic lip-sync or fully
redrawn hand-drawn shape interpolation. For convincing performances, animate the body
gesture first, then head/limb anticipation, overlapping tails/hair, blink/mouth poses,
and consistent contact points; unique replacement drawings remain separately authored.

**New reference research** (techniques and observations from published source
descriptions, not claimed frame-by-frame viewing):
- [Kristi Sword's wax-crayon application process](https://vimeo.com/113245451) describes
  heated wax dots applied individually to paper: dense and sparse deposition should have
  local material character rather than uniform noise.
- [Carla Veldman's animation reel](https://vimeo.com/151267555) labels several traditionally
  drawn pencil-crayon character segments, useful as motion/reference targets.
- [Crayon stop-motion short](https://www.youtube.com/watch?v=E5L0PWptozc) is a published
  crayon animation reference; use its material/acting principles without copying frames.
- [Wunderkammer process](https://vimeo.com/300069833) documents replacement paper drawings
  for movements beyond simple puppet articulation, a useful complementary technique.

**Remaining craft gaps:** morphing between authored replacement shapes, independent
mouth/eye phonemes, inverse kinematics, foot lock and contact-aware locomotion, wax
smear/erase/redraw transitions, independent depth parallax, and fully reviewed encoded
proofs with normal-speed human approval. A rig alone does not qualify a shot as visually
beautiful or production-approved.

### Replacement drawing animation

CRAYON1 now supports optional `drawings` on `wax` and `contour` elements:
an ordered series of hand-authored replacement SVG paths, keyed to **absolute
scene frames**. This is a material-native shape replacement, not an attempted
interpolation between unrelated SVG commands. Each redraw is painted using the
existing wax/contour material; its `id`, painter order, parent rig, and seeded
paper/wax treatment remain stable.

```json
{
  "id": "character-eye", "kind": "contour", "parentId": "character-head",
  "d": "M0 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0",
  "color": "#34495e", "width": 3,
  "timing": {"start": 0, "end": 239}, "poseCadence": 2,
  "drawings": [
    {"frame": 90, "d": "M0 0 Q5 4 10 0"},
    {"frame": 96, "d": "M0 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0"}
  ]
}
```

Wax replacements include an additional `bounds` matching each silhouette,
for correct clipped wax deposition. The initial element path is drawing 0; keys
must be strictly increasing, start after frame 0, and stay within the scene.
The same `poseCadence` steps both rig motion and replacement drawing selection.
Reduced motion samples the final held pose. Malformed keys, paths, and bounds
are rejected at the JSON scene boundary.

The **town illustration** includes a new original bird built with an articulated
body/wing and separately redrawn eyelids. This validates the combined workflow,
but it is not a finished full-character performance reel.

Technique study: [Moonbird (1959), Animate Materials](https://www.animatematerials.org/media/moonbird/)
documents wax/paper layers and intentionally expressive, imperfect linework.
[Cláudio Martins on Sebastiana](https://www.toonboom.com/claudio-martins-on-the-making-of-sebastiana)
describes aligning the character animation with a crayon/pastel visual treatment.
[Life Drawings production notes](https://thewaltdisneycompany.com/news/disney-animation-short-circuit/)
describe hand-drawn character motion combined with more dimensional environments.
These sources support **material and performance principles**, not copying their
frames, stories, characters, or licensed media. Their full videos were not
decoded and frame-by-frame compared during this implementation.

**Outstanding:** viseme schedules synchronized to dialogue/audio, blend-aware
transition staging between redraws, two-handed prop constraints, IK/foot
contact, and normal-speed encoded dual-aspect proof with human signoff.

### Authored character acting and dialogue exposure sheets

The `CrayonContourElement` API supports **named performance drawings** on top
of replacement drawing keys. Supply `poses` (stable reusable SVG outlines) and
`poseCues` (strictly ordered absolute-frame selections), without a second
animation clock or duplicating a path for every phoneme. The original `d` is
the reserved `base` pose. This is suitable for mouth visemes, blinks, eye
expressions, brows, hands, costume folds and other hand-drawn contour acting.

```json
{
  "kind": "contour", "id": "mouth", "parentId": "head",
  "d": "M-9 -64 Q0 -58 9 -64", "color": "#4e4b64", "width": 4,
  "timing": {"start": 0, "end": 269}, "poseCadence": 2,
  "poses": [
    {"id": "mbp", "d": "M-12 -64 Q0 -61 12 -64"},
    {"id": "ah", "d": "M-11 -65 C-12 -46 12 -45 11 -65Z"},
    {"id": "oh", "d": "M-7 -63 a7 10 0 1 0 14 0 a7 10 0 1 0 -14 0"}
  ],
  "poseCues": [
    {"frame": 0, "pose": "base"},
    {"frame": 76, "pose": "mbp"},
    {"frame": 82, "pose": "ah"},
    {"frame": 106, "pose": "oh"},
    {"frame": 138, "pose": "base"}
  ]
}
```

An editor or speech-alignment pipeline must produce `poseCues` from actual
audio/phoneme timing. **Kumiki does not synthesize voice, infer phonemes from
written text, analyze a soundtrack, or claim automatic lip-sync.** Every cue
uses frame positions in the film's existing FPS timeline, which ContentGen
should derive from its narration/audio metadata. Exposures hold according to
`poseCadence`, permitting on-twos animation, while camera animation remains
frame-accurate. Scenes are seek-stable, including out-of-order exports and
reduced-motion end-state rendering.

`drawings` (sequential anonymous redraws) and `poses` / `poseCues`
(named reusable redraws) are mutually exclusive on a single contour. Strict
validation enforces bounded SVG path data, unique pose IDs, defined cue
references, sorted frame keys, and practical track limits.

**Live example:** Storybook **Video production / Film Looks / Crayon
Scene Engine / Character Performance** and **Character Performance Portrait**.
The original little woodland character waves a flower, gives a short performed
greeting (authored without a soundtrack), blinks, smiles, tilts its head and
lets its tail follow through. Both aspects use the same semantic
`src/video/crayon-performance-fixtures.ts` scene factory, with native
compositions. The performance cue list is a timing study, **not a claim of
speech synchronization to a real vocal recording**.

**Research and craft targets:**
- [Walt Disney Animation Studios — Animation process](https://www.disneyanimation.com/process/animation/):
  anticipation, weight, follow-through and secondary action should drive
  acting, not independent random wiggling of elements.
- [Toon Boom — 12 Principles of Animation](https://helpcentre.toonboom.com/hc/en-ca/articles/57087608774931-About-the-12-Principles-of-Animation):
  structured posing and meaningful overlapping motion.
- [Figma — Lip Sync Animation](https://www.figma.com/resource-library/lip-sync-animation/):
  phoneme groups mapped to a small reusable set of visual mouth shapes.
- [Timing for Animation, lip-sync preview](https://www.oreilly.com/library/view/timing-for-animation/9781000338225/xhtml/80_Chapter70.xhtml):
  dialogue acting and phonetic exposure timing are related but distinct jobs.

These sources informed the authored craft decisions. Their media were not
fully frame-decoded and no outside copyrighted artwork or narration is
bundled with the examples.

**Remaining gates:** true voice-aligned cue import, gesture-directed
performance authoring, higher-density replacement drawings, foot contact
and gait control, full encoded 16:9 + 9:16 visual/audio review and independent
human visual approval. Automated passing tests do not confer artistic
approval.

### Grounded walking and contact-pinned attachment

The CRAYON1 scene grammar now supports optional **contacts** on a wax, contour,
or other world-space element. Each contact defines a non-overlapping, inclusive
frame range and an anchor in that element's *local drawing coordinates*.
The anchor's world position at the start of the range becomes the fixed contact
point for its duration. A world-space translation cancels inherited body and
joint travel at each absolute frame. The rest of the rig, its original drawing,
paper texture, paint ordering, and camera remain unchanged.

```json
{
  "kind": "wax", "id": "left-foot", "parentId": "body",
  "d": "M-44 90 Q-20 75 -8 90Z",
  "bounds": {"x": -47, "y": 70, "width": 43, "height": 27},
  "colors": ["#77748c", "#5f5b79", "#a9a1b0"],
  "timing": {"start": 0, "end": 269}, "poseCadence": 2,
  "contacts": [
    {"start": 0, "end": 38, "anchor": {"x": -29, "y": 93}},
    {"start": 94, "end": 156, "anchor": {"x": -29, "y": 93}}
  ]
}
```

This is a **single-point stance constraint**, not inverse kinematics or a
full-sole physics solver. An artist still supplies anticipation, center-of-mass
travel, step heights, foot rotation, limb drawing changes and the timing of
lift/plant events. Because there is no mutable simulation, direct seeks to
frame 156 after frame 0 and after frame 269 give identical planted positions.
Contacts are expressed in world geometry *before* the film camera; camera
moves therefore do not break contact. The contact list must be ordered,
non-overlapping, within the scene duration, have bounded finite anchors, and
must not apply to screen-space caption overlays.

Storybook now exposes **Video production / Film Looks / Crayon / Scene Engine /
Character Walk Cycle** and **Character Walk Portrait**. The original "A Little
Journey" walk places alternating feet on the painted meadow, carries the
flower as a hand-child prop, and gives the tail/scarf/arms/head coordinated
follow-through. Its original artwork is derived from the reusable character
performance scene; these are **two distinct authored performances**, not
a universal generated gait engine.

**Still required:** multi-point foot-sole deformation, leg-chain IK, floor
height sampling for arbitrary geometry, automatic gait authoring from
locomotion velocity, collision/contact timing derived from geometry, smooth
contact hand-off at every speed, genuine hand-to-hand prop transfer and
normal-speed 16:9/9:16 encoded visual approval.

### Connected articulated limbs (native crayon connectors)

CRAYON1 supports a new validated `connector` element. It joins two named,
moving, local-drawing anchors by painting a **dry-wax contour in world space**
at each absolute source frame. The anchors may belong to independently
animated hierarchy branches. Each anchor includes contact correction, so
a hip-to-foot stroke remains joined to a planted foot as the torso advances.
Connectors preserve the authored painter's order, seeded brush rendering,
reduced-motion end state and deterministic film seeks.

```json
{
  "kind": "connector", "id": "leg-back",
  "timing": {"start": 0, "end": 26}, "poseCadence": 2,
  "from": {"elementId": "body", "anchor": {"x": -25, "y": 76}},
  "to": {"elementId": "foot-back", "anchor": {"x": -29, "y": 103}},
  "color": "#8b6c80", "width": 12, "opacity": 0.86,
  "bendKeys": [
    {"frame": 0, "bend": -5},
    {"frame": 65, "bend": -28},
    {"frame": 94, "bend": -8},
    {"frame": 269, "bend": -5}
  ]
}
```

`bend` supplies a static signed perpendicular control-point offset. Optional
`bendKeys` smoothly interpolate knee/elbow bend while the attachment points
move; `poseCadence` holds on twos or threes. No untrusted SVG path is accepted
from connector references. Validation rejects missing or screen-space
references, connector-to-connector references, invalid anchors, unsorted or
nonfinite bend keys, and local transforms that would double-transform the
world-space path.

The walk examples in **Video production / Film Looks / Crayon / Scene Engine**
now show two articulated crayon legs joining the original body to alternating
planted feet, with stronger knee curvature during the swing phase. There are
landscape and portrait versions and browser evidence for both.

**Limitations:** This solves position continuity with one curved segment per
leg but does not implement physical two-bone IK, heel/toe rolling, leg volume
or limb self-occlusion. Full 16:9/9:16 encoded normal-speed artistic signoff
remains a separate gate.

### Two-bone walking poses and eased contact release

Use the optional analytic `ik` mode on an existing CRAYON1 `connector`
to draw **two articulated bone segments** between a world-space hip and
a planted or swinging ankle, rather than an arbitrary quadratic bend. The
solver uses two preferred bone lengths and an explicit left/right bend
direction. It produces the same pose from the same absolute frame even after
backward seeking, while honoring the already-authored world-space contact
constraints.

```json
{
  "kind": "connector",
  "id": "leg-back",
  "timing": {"start": 0, "end": 26},
  "poseCadence": 2,
  "from": {"elementId": "body", "anchor": {"x": -25, "y": 76}},
  "to": {"elementId": "foot-back", "anchor": {"x": -29, "y": 103}},
  "color": "#8b6c80",
  "width": 12,
  "ik": {"upperLength": 45, "lowerLength": 43, "bendSide": "left"}
}
```

`ik` cannot be combined with the former hand-drawn `bend` or
`bendKeys` mode on the same connector. Artists can choose either in Storybook,
without altering their geometry. For reachable targets, preferred upper/lower
segment lengths are exact; unreachable or overly compressed targets keep
the stroke connected while the solver reports `extended` or `compressed`.
This is **2D analytic posing**, not dynamic physics, skeletal skinning or
collision prevention.

The `contacts` entries also accept optional `releaseFrames` (0–24) to
fade out the outgoing positional correction after a planted stance ends,
avoiding the previous sudden jump at takeoff. Transitions remain frame-stable.
Runtime scene validation rejects a release tail that overlaps the next stance,
a release beyond the film duration, and conflicting ancestor/descendant
contact windows. A rendered foot receives
`data-km-crayon-contact="planted"` or `"releasing"` for browser QA.

The original **A Little Journey** walk now also contains authored shoe/foot
pitch keys around each sole pivot, and the **Video production / Film Looks /
Crayon Scene Engine** stories include new **Character Two Bone IK** and
**Character Two Bone IK Portrait** examples. The Storybook Controls panel
lets the artist switch between hand-drawn knees and the IK solver and adjust
walk **stride (0.6–1.6×)** and **lift (0.6–1.8×)**. This is a controllable
study using hand-authored root and swing timings—not an automatic locomotion
planner; real heel-to-toe support-pivot switching, uneven-terrain grounding,
full-sole distortion, smooth gait retiming and contact-aware arm IK remain
open.

Automated qualification covers two aspect ratios, IK geometry, unreachable
states, corrupt authored data, the foot-release tail, deterministic out-of-
order seeking and real Chromium story controls. Normal-speed exported films
and independent artistic acceptance still require separate review.

### Real-time Storybook playhead (presentation only)

Both interactive Crayon Storybook and the generic Crayon Scene Engine now use
the same `src/video/crayon-story-playback.ts` clock. The playhead derives
each absolute source frame from monotonic elapsed time and the authored FPS,
rather than advancing one frame per `setInterval` callback. Slower browsers
may drop presented intermediate frames, but **story time does not drift**.
Scrubbing, pause, restart and switching subject/aspect reset the timebase
safely, including when the prior scene was longer.

Storybook Controls provide a **0.25×–2× speed slider** and **loop toggle**.
The pure frame sampler has deterministic unit coverage for irregular browser
paints, accelerated and slowed playback, repeat boundaries, invalid clocks,
and end-frame clamping. Chromium tests exercise start/pause/restart in the
actual Storybook iframe. This playhead lives only in the preview UI: the
CRAYON1 renderer and FilmDocument export always evaluate absolute frames
from the film's own timeline, so export timing is unaffected.

This does not guarantee that every individual frame paints in a slow browser
or that rendered narration/audio are synchronized inside Storybook. For
production, use the film export pipeline and review the encoded result.

### Crayon drawing as an authored process (CRAYON1 construction)

A handmade-looking scene must reveal **how marks are made**, not simply
apply a paper texture after a full silhouette fades in. The optional
`construction` field on any `wax` element now provides a validated,
deterministic drawing order:

```json
{
  "kind": "wax", "id": "original-character-body",
  "timing": {"start": 138, "end": 276},
  "construction": {
    "order": "outline-first",
    "outlineFraction": 0.31,
    "glaze": 0.17
  }
}
```

This illustrative partial fragment belongs inside a full valid
`CrayonWaxElement` with a path, colors and bounds. The native wax contour
is genuinely traced along its SVG path first, then directional crayon
patches accumulate in two seeded passes. `glaze` is limited to 0–0.45
so the drawing does not begin as a solid-colored cutout. `fill-first`
reverses the explicit sequence and is useful for broader background
wash/colored studies. Without `construction`, the pre-existing
`WaxRegion` render contract and scenes remain unchanged.

The optional `exitFade` on a scene element defines a validated
post-drawing interval to retire temporary sketch guides. It has
discrete testable states (`visible`, `fading`, `finished`) and does
not alter the paper substrate or erase real deposited wax.

`src/video/crayon-character-draw-fixtures.ts` authors an original
450-frame short: **blank paper → light construction axes → tail/ears/body
contours → directional wax fill → detailed face → soft scenery fill →
animated character payoff**. Two Film Looks Storybook stories are interactive:

- **Character Draw In** (16:9)
- **Character Draw In Portrait** (9:16)

Storybook Controls expose outline/fill ordering, outline duration,
binder/glaze, seed, paper tooth, play speed and loop. The film still uses
CRAYON1 and FilmDocument: no new renderer or second timeline. For
verified-making-of comparisons and a prioritized craft backlog, see
[Crayon drawing and animated characters — research](../research/crayon-drawing-and-character-animation-study.md).

**Limitations:** The guide fade is illustrative, not a simulated physical
eraser. Character parts still use fixed seeded marks when animated, whereas
high-end crayon frame-by-frame films redraw and rescan texture on each
exposure. Hand/tool tracking, per-stroke pressure kinetics, multistroke
semantic sequencing inside *one* complex outline and whole-video
normal-speed independent art signoff remain open.


### Structural craftsmanship: grouped detail atlas

The Dragon Village cast and observatory now support dense, authored
**scute, limb, wing, feather, masonry, pitched-roof and carved-stone**
detail without introducing hundreds of React nodes per object.
`crayonScaleField`, `crayonMasonryCourses` and
`crayonRoofCourses` generate deterministic, validated SVG subpaths with
limits on rows, columns and output complexity. Each generated detail
region is a single named `CrayonContourElement` attached to the
appropriate animated rig or building part, preserving actor and camera
motion. The existing `villageDetail` control varies actual hand-drawn
geometry density, not just procedural paper noise.

The **Dragon Anatomy Detail**, **Dragon Anatomy Detail Portrait** and
**Castle Masonry Detail** stories provide original close-up films in
`Video production / Film Looks / Crayon / Scene Engine`. The new
`shot` option is `wide | dragon | architecture`. The wide shot retains all actors and copy. Both close-ups hide story lettering. The dragon inspection view isolates the creature against the paper landscape, while the architecture inspection view hides the cast; this avoids visual occlusion. The source rig keys and wax artwork are not modified. Camera framing is
validated in both native 960×540 and 540×960 sizes, with exact-frame
seek tests and real Chromium screenshots.

The architectural language and dragon anatomy decisions are
reference-backed in the
[creature and architecture study](../research/crayon-dragon-creature-and-architecture-study.md).

### Multi-character creature rigging and sophisticated architecture

**Dragon & The Village** is a 330-frame (11 second), three-actor
example in the native `Video production / Film Looks / Crayon Scene
Engine` gallery. The hand-authored scene combines a complex castle-like
observatory and two different village buildings with a separately
animated dragon, forest friend and owl. A portrait layout does not
simply crop the landscape composition.

The new optional CRAYON1 per-element rig fields are:

- `motionLagFrames: 0..24` for deterministic delayed evaluation of
  independently keyed appendage poses, which makes tail, whisker and
  feather follow-through visible without frame-order-dependent simulation;
- `placement.scaleX` / `placement.scaleY` and
  `motion[].scaleX` / `motion[].scaleY` (0.4..2) for nonuniform,
  pivot-relative 2D squash-and-stretch, consistently applied to SVG
  rendering and world-space attachment math.

The scene exposes **dragon wing power (0.5–1.6)**,
**architecture detail (0.25–1)**, **follow-through (0–18 frames)**,
**cast (two or three actors)** and **dragon palette (teal/copper/plum)**
in Storybook Controls. Existing material controls, exact frame seeking,
video speed and looping remain active. Both this Storybook and the
original Crayon Storybook default to **1.2× presentation playback**, an
intentionally modest increase. Native film export still runs at the
authored frame rate.

The dragon is assembled from independently animated membrane wings,
vein paths, torso, three tail segments, neck and head, jaw, horn spikes,
whiskers, scales, four feet and claws; the owl and forest friend have
their own independent acting cues. The reusable machinery works for
other fantasy creatures, but this is not a universal automatic
quadruped-rig generator. Physical flight, advanced foot-ground contact,
deforming wing skin, procedural building construction, and complete
normal-speed production approval remain **future work**.

Reference comparisons and visual acceptance notes are in
[Dragon / creature and architecture study](../research/crayon-dragon-creature-and-architecture-study.md).

### Production proof

The 420-frame (14 s at 30 fps), three-shot FilmDocument uses the existing `slot` scene type in `FilmStage`, not another timeline or an unbounded playback loop. Its shot frames are 0…119, 120…269 and 270…419. The slot adapter adds each scene's `offsetFrame` to its local frame. The second original scene, the flower garden, is available as a separate interactive Storybook story.

```bash
npm run typecheck
npm run registry:validate
npm run catalog:check
npm run test -- tests/crayon-storybook.test.tsx
npm run film:check -- examples/film/crayon-storybook.film.json
npm run film:frame -- examples/film/crayon-storybook.film.json --frame=360 --only=landscape --out=dist/crayon-proof
npm run film:frame -- examples/film/crayon-storybook.film.json --frame=360 --only=portrait --out=dist/crayon-proof
npm run film:render -- examples/film/crayon-storybook.film.json --only=landscape --out=dist/crayon-proof
```

## Reference / evidence packet

**Style research, without reproduction.**

- Roadmap board: [35a material-native reference gallery](../35a-material-native-style-reference-gallery.md), Crayon Storybook entry.
- [Lemo-Opuscar Crayon Picture Book overview](https://lemomo-ai.github.io/lemo-opuscar/styles/crayon-book/): source labels stills at **00:08 / 00:19 / 00:31 / 00:42**, 0:52 runtime, 1280×720. Its film description uses live wax drawing and wash; our scene, character, text, palette and motion are original. We inspected the public page's text and its listed still timestamps, **not** full decoded video frames at normal speed.
- [Philadelphia Museum of Art, Descriptive Terminology for Art on Paper](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf): notes wax-crayon cohesion, visible oily binder, uneven deposition and clumping (compared to chalk).
- [Stockmar wax-crayon guidance](https://www.stockmar.de/en/service/publications/?cid=1237&file=files%2FContents%2FDownloads%2FKreativtipps%2FEN%2FSTOCKMAR_wax+crayons_getting-started_EN.pdf): describes tooth-sensitive pigment density and translucent layering.

**QA still required:** export real 16:9 and 9:16 films; inspect frames before and after each drawing event, then watch the complete encoded films at normal speed. Evaluate whether density, grain, strokes and outlines read as actual wax at thumbnail size, whether the landscape title overlaps the pines/fox, and whether the portrait illustration respects the lower caption zone. Compare static-sample re-seek pixels and performance on Chromium, check CJK captions separately when integrated into a generic caption system, and record an independent human reviewer/date/result. No screenshot or CI pass alone authorizes the visual state `accepted`.

**Limitations:** no pigment melting, calibrated light scattering, watercolour wash/wax resist, user-provided character rig, actual page-turn physics, original recorded foley, or generic cross-media transition in this experimental extension.


## Generic CRAYON1 engine — author any subject without changing renderer code

The two original storybook illustrations remain examples, **not the public scene grammar**. New work should use `CrayonScene` with a validated `CrayonSceneSpec`, then assemble those scenes into the existing FilmDocument. This allows science diagrams, maps, product sketches, hand-drawn charts, children's stories and educational explainers, provided that the author supplies their own original vector shapes and accurate data.

**Source modules:** `crayon-scene.ts`, `crayon-scene-react.tsx` (included in the same `crayon-storybook` registry item). They depend only on local wax primitives, SVG and React; no runtime model, image generator, WebGL, remote font or new package is needed.

The data grammar supports:

- **`wax`**: authored `d` path, subject bounds, three wax tones, 0–1 pressure, 4–32 pixel spacing, optional `angle` for directional rubbing. Pigment arrives as multiple lifted and overlapping strokes clipped to the author's actual geometry.
- **`contour`**: dry, double-edged drawing path, adjustable width/opacity, frame-addressed reveal.
- **`lettering`**: up to six explicit lines, readable serif/sans/mono choices with CJK fallbacks, font-size, line height and optional high-contrast backing. `screenSpace: true` keeps captions independent of camera moves.
- **`placement` and `motion`**: per-element translation, scale, rotation, keyframe easing and 1–4-frame held actor poses. The same semantic element ID and wax texture remain stable across frame seeks.
- **`camera`**: scene-coordinate focus/zoom keys with pure interpolated sampling; paper and all world elements share the transform, while screen-space type does not.
- **`paper`, `paperTooth`, `seed`**: explicit paper stock, pore density and seeded fiber/wax imperfection. Material parameters are bounded and validated.
- **`reducedMotion`**: static completed illustration, including final camera and object poses, rather than removing the content.
- **`inspectCrayonScene(unknown)`**: runtime contract validation for IDs, color roles, SVG commands, dimensions, timing, camera keys, bounds, text and author parameters. Unsupported types fail explicitly.

Example of a neutral new subject (the object could instead be a leaf, animal, building, planet, molecule or diagram component):

```tsx
import { CrayonScene } from "./components/video/materials/crayon-scene-react";
import type { CrayonSceneSpec } from "./components/video/materials/crayon-scene";

const scene: CrayonSceneSpec = {
  version: 1, id: "my-illustrated-scene",
  width: 960, height: 540, durationFrames: 180,
  seed: 41, paper: "#FAF0DD", paperTooth: .6,
  elements: [
    {
      id: "illustrated-leaf", kind: "wax", timing: { start: 10, end: 110 },
      d: "M480 115 Q645 190 502 404 Q360 310 480 115Z",
      bounds: { x: 355, y: 110, width: 300, height: 300 },
      colors: ["#709F77", "#507E67", "#B6C99B"],
      spacing: 7, pressure: .88, angle: -18,
      motion: [{frame:0,x:0,y:0}, {frame:179,x:12,y:0}],
      poseCadence: 2
    },
    {
      id: "leaf-contour", kind: "contour", timing: { start: 110, end: 160 },
      d: "M479 128 Q488 266 494 394",
      color: "#3C675A", width: 4.2
    },
    {
      id: "caption", kind: "lettering", timing: { start: 115, end: 165 },
      screenSpace: true, x: 45, y: 470, fontSize: 27,
      lines: ["The leaf stores energy."],
      color: "#30485C",
      backing: {color:"#FAF0DD",padding:12,width:540,height:44,radius:8}
    }
  ],
  camera: [
    {frame:0,focusX:480,focusY:270,zoom:1},
    {frame:179,focusX:490,focusY:260,zoom:1.06}
  ]
};
export const LeafFrame = ({frame}:{frame:number}) =>
  <CrayonScene spec={scene} frame={frame} />;
```

**Production without hand-coded slot implementations:** use the existing FD1 `recipeId: "slot"`, `content.slot: "crayon-scene"`, and `content.props.scenes: { landscape: CrayonSceneSpec, portrait: CrayonSceneSpec }`. The slot validates the selected scene's dimensions and frame count. The same slot accepts `content.props.scene` for one output shape.

See `examples/film/crayon-scene-three-subjects.film.json` for a complete three-subject production film (water, illustrated numbers, village) with independent 16:9 and 9:16 compositions. It uses the same native FilmStage timing, export, sound integration and existing cuts as any other FilmDocument. `src/video/crayon-scene-fixtures.ts` demonstrates three more source-authored subjects. Storybook contains **Crayon Scene Engine** with interactive subject, output, seed, paper and frame controls.

```bash
npm run test -- tests/crayon-storybook.test.tsx tests/crayon-scene.test.tsx
npm run film:check -- examples/film/crayon-scene-three-subjects.film.json
npm run film:render -- examples/film/crayon-scene-three-subjects.film.json --only=landscape --out=dist/crayon-general
npm run film:render -- examples/film/crayon-scene-three-subjects.film.json --only=portrait --out=dist/crayon-general
```

**Physical-media research and accuracy limit.** The [Philadelphia Museum of Art conservation terminology](https://legacyweb.philamuseum.org/doc_downloads/conservation/DescriptiveTerminologyforArtonPaper.pdf) describes wax crayons' visibly cohesive, uneven binder and local clumping. The research paper [*Simulating Wax Crayons* (Mould)](https://people.scs.carleton.ca/~mould/papers/crayon-cgf.pdf) models how pressure, contact geometry, the paper height field, wax deposition and directional smearing interact. Our renderer currently approximates **the visible outcomes** using author-controlled pressure, directional multi-pass strokes, lifted scumbles, clipped abrasion and paper-tooth pores. It is **not** a height-field simulator and does not implement physically calibrated wax redeposition. The difference is an explicit art-review target; the normal-speed video must be assessed, not rubber-stamped from the source-level parameters.

**What this does not automate:** interpreting arbitrary raster photos into credible wax strokes; inventing or reliably rigging a new character from text; typography line-breaking for arbitrary-length Japanese copy; exact physical wax optics; arbitrary path morphing; and subject-specific story planning. Authors or upstream generation tools must supply original SVG paths/characters, text, values, narrative timing and two aspect-aware layouts. This boundary prevents a generic SVG filter from masquerading as a physically crafted crayon illustration.

**Updated qualification gates:** `tests/crayon-scene.test.tsx` exercises six independent 16:9/9:16 subjects, schema-negative cases, pose/camera seeking and FilmStage integration. The portable film has both outputs. `tests/e2e-storybook/crayon-scene.spec.ts` exercises four actual browser compositions; `.github/workflows/crayon-browser-qa.yml` runs inexpensive on-PR Chromium checks and reserves full encoded-film exports for manual `workflow_dispatch`. The full normal-speed video and independent human art review are still mandatory before marking `accepted`.


## Held crayon exposures, anatomical redraws and encoded-film QA (2026-11-14)

**Research:** [crayon-animation-film-technique-study.md](../research/crayon-animation-film-technique-study.md)
compares seven hand-drawn films and their documented production methods.
The technical goal is credible handmade imperfection, not arbitrary image
noise. Materials and animation require three independent channels:
solid silhouettes and stable paper; held, repainted local marks; and
independently animated acting / camera.

The optional `CrayonWaxElement.redraw` field is
`{holdFrames:2|3|4|5|6,strength:0..1,beginFrame?:number}`.
A 3-frame hold produces approximately 10 distinct wax-pigment
exposures per second on a 30-fps film. The surface is *not re-randomized
per frame*: at each exposure transition only 14 scattered local wax
dabs change, with correlated locations and bounded displacement.
The silhouette remains opaque and completely unchanged by the material
redraw. The seed, actor, fixed paper tooth and original fills are
deterministic in either seek direction. `beginFrame` enables an acting
figure to start reworking pigment before its complete construction
timeline ends. For a drawing-in sequence it should start after the
permanent figure has emerged; the character-draw demo uses frame 408.

`CrayonWaxElement.edgeRoughness` (0..1) introduces staggered,
fragmented wax deposits that follow the opaque silhouette's rim.
These accents increase surface irregularity without cutting holes
through body mass. `coverage:"open"` and old scenes retain their
original translucent behavior; new metadata is optional.

The Dragon Village scene now supplies explicit hand-redrawn SVG
silhouettes for the near and far wing membranes, synchronized near-wing
rib redraws, and re-arched neck contour exposures. The wing still
inherits the original motion hierarchy; this is **authored shape
substitution**, not continuous soft-body physics. Storybook
`Dragon Hand Redraw` and `Dragon Wing Morph` in
**Video production → Film Looks → Crayon → Scene Engine** expose
`redrawStrength` and `exposureFrames` Controls. The baseline
`Dragon Village` keeps its existing URL and 330-frame duration.

**Encoding proof:** `examples/film/crayon-painted-exposure-preview.film.json`
has a 48-frame, 30-fps original fox excerpt with an offset to the active
character paint. On crayon PRs the browser workflow encodes an MP4,
probes its stream, and extracts actual source frames into an artifact.
The existing on-demand workflow can render the complete 420-frame
14-second film in landscape and portrait; those full runs are not
substituted by the brief automated excerpt. After an actual normal-speed
viewing, record whether frame boil, wing silhouette pops and edge
flicker pass or fail. Unit and browser CI are structural evidence,
not independent human artistic acceptance.

**Known remaining work:** true four-legged IK grounding, deformable
membrane skinning, pigment accumulation/erasure model, calibrated
physical crayon nib scans with safe rights, and real-time full-film
normal-speed acceptance. Do not claim those capabilities from a
short encoded smoke alone.

## Stroke-following opaque build-up (2026-11-14)

During construction, foreground subjects now acquire dense pigment **along their
existing individual crayon strokes**, not through a vertical rectangular wipe.
The first pass of original seeded hatching provides the underpainting mask; a
late, brief settling coat closes remaining pores and yields the same fully opaque
completed silhouette as before. The tooth-masked decorative strokes remain
above the backing. This keeps completed actors and buildings solid while making
their creation look materially drawn rather than digitally revealed.

Use Storybook **Material Studies / Stroke Path Underpainting** at frame 82, then
scrub through frames 0–120 to compare the incomplete contact patches with the
finished 100%-opacity body. The old `coverage: "open"` mode and all scene JSON
contracts stay unchanged. A new deterministic SSR test checks the material mask
only while construction is incomplete, preventing accidental permanent holes.
See [the deposition/film follow-up study](../research/crayon-wax-deposition-follow-up-2026.md).

**Still pending:** real nib-contact path sampling, pressure-sensitive paper
height fields, wax smearing/erasing, deformable wing and torso skin, independent
normal-speed human visual acceptance in both aspect ratios. This change is an
engine improvement, not a claim of finished film-quality artwork.

## Variable-pressure wax nib contact (2026-11-14)

CRAYON1 now produces short, physically motivated **tapered ribbon-shaped wax
deposits**, evaluated from the same seeded quadratic paths as the existing
crayon marks. Each stroke lands with a narrow tip, broadens under nib
pressure and narrows as it leaves the paper. Local grain differences are
pinned to each nib sample, not rerandomized per video frame.

The optional wax-element `nibStyle` is `"tapered"` (default) or
`"rounded"` (legacy constant-width line, maintained for backward visual
comparison). It is accepted in serialized scenes and directly in
`WaxRegion`. The fallback is explicit: old scenes render with the upgraded
wax contact unless they select `"rounded"`.

Storybook: **Video production → Film Looks → Crayon → Material Studies →
Nib Contact Comparison** renders both nib styles on the same source art,
with controls for aspect-independent pressure, paper tooth, frame and
coverage.

The variable-width ribbon consists of at most five fixed sample intervals
per short cubic-free quadratic mark. It respects the original marks'
construction windows, clipping, tooth masks, opacity, seed, painter order,
and reduced-motion end state; no second renderer, timer or dependency is added.

The ribbon is an economical **contact model**, not wax height-field physics.
It does not reproduce bidirectional pigment pickup, multi-layer optical
mixing, or measured real-paper calibration. Actual full-film playback and
human visual approval are still necessary.
