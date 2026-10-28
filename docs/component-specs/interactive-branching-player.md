# Interactive Branching Player

A source-distributed React player for interactive learning, mysteries, and
guided experiences. It plays ordinary browser-supported video clips, pauses at
authored multiple-choice checkpoints, can play a short response clip, and then
resumes the original chapter or enters an alternate chapter.

This is separate from the existing frame-clock `ExplainerPlayer`: one native
`HTMLVideoElement` controls source playback and event timing. The application
provides its own video URLs, learner registration, persisted scores, progress,
and media delivery. It does not connect to a backend or upload viewer data.

## Install and import

Add registry entry `interactive-branching-player` through the Kumiki catalog.
It distributes the model, React component and its stylesheet. The optional
`interactive-branching-frames` entry adds the frame themes. Direct source
import from `registry/video/interactive-branching-player` is also supported.

```tsx
import { InteractiveBranchingPlayer } from "./components/video/interactive-branching-player";
import type { BranchingStory } from "./components/video/interactive-branching-model";

const story: BranchingStory = {
  id: "birds", startClipId: "lesson", clips: [
    { id: "lesson", src: "/media/lesson.mp4", title: "Bird migration",
      checkpoints: [
        { id: "q1", time: 20, question: "What helps birds navigate?", choices: [
          { id: "sun", label: "The sun", correct: true, reactionClipId: "well-done" },
          { id: "wind", label: "Only the wind", correct: false, reactionClipId: "explanation" },
        ] },
      ], nextClipId: "closing" },
    { id: "well-done", src: "/media/positive.mp4" },
    { id: "explanation", src: "/media/try-again.mp4" },
    { id: "closing", src: "/media/closing.mp4" },
  ],
};

export function Lesson() {
  return <InteractiveBranchingPlayer story={story} viewer={{ name: "Alex" }}
    onAnswer={(answer, state) => saveProgress({ answer, state })}
    onComplete={state => finishLesson(state)} />;
}
```

Replace `saveProgress` and `finishLesson` with application services. Callbacks
are triggered by user events, not by rendering. Keep `story` object identity
stable to preserve progress; changing `story` resets the local player.

## Graph model and branching behavior

- Clips have unique IDs, a playable `src`, optional `poster`, `title`, a natural
  `nextClipId` and checkpoints with unique IDs and non-overlapping nonnegative
  times (seconds). Each checkpoint has two or more choices, including a correct
  answer. Checkpoints are independent of quiz score thresholds.
- `choice.reactionClipId` plays a reaction clip, then returns to the original
  chapter at the paused time. `choice.nextClipId` instead enters another chapter
  after the reaction, or immediately when no reaction is supplied.
- A seek across an unresolved checkpoint stops at the earliest unresolved one.
  An answer is awarded once even after seeking backward and replaying that time.
- `validateBranchingStory` reports broken references, blank/duplicate IDs,
  invalid times and malformed questions. The component exposes those errors
  rather than silently playing an invalid script.
- Clips may refer to any browser-supported video format. Authoring loops are
  possible; consumers should ensure intended exit paths and terminal clips.

## Personalization and art direction

| Prop | Purpose |
| --- | --- |
| `viewer` | Name, title and independently saved badge labels |
| `ranks` | Ordered by accuracy and minimum correct answers, evaluated live |
| `theme.colors` | Accent, background, foreground, border and glow colors. `glow` is also the accent of the controls drawn over the video, so keep it light |
| `theme.frame` | A physical frame around the video window (see below) |
| `theme.ornament` | Decorative overlay covering the video frame, pointer-inert |
| `theme.rankOrnaments[rankId]` | Upgradeable frame decorations tied to rank |
| `actors` | Student/teacher or other characters with clip-timed action cues |
| `renderActor` | Render a ReactNode based on actor and action state: idle, walk, think, point, celebrate, talk |
| `renderCompletion` | Fully customized result or ceremony scene |
| `labels` | Localize the controls, outcomes, quiz instruction and completion copy |
| `onStateChange`, `onAnswer`, `onComplete` | Integration hooks for local persistence or a learning backend |

Forest, theater, computer, snake, toy-brick, Japanese, American, Chinese,
Indian and Middle Eastern art directions can all be authored with independent
theme/actor props. No culture-specific assumptions or fixed decorative
requirements are built into the component.

The character slots accept any React renderer. The Storybook stories drive the
repo's `CharacterPresenter` rigs for Pip and Doctor Quill through a small
Storybook-only adapter (`src/video/branching-character-actors.tsx`) that maps
player actions to rig actions: walk → walk + bob, talk → approximate speech,
point → point, think → question (Pip) or think (Quill), celebrate → cheer
(Pip) or nod (Quill). Characters step up above the controls while the controls
are shown.

## Controls and info overlay

Viewer info (name, title, rank, badges, score) and the transport controls are
drawn inside the video window over dark scrims, like a streaming player. They
are shown while paused, after pointer movement, and while keyboard focus is in
them; during playback they fade out after 2.6 s of inactivity. Hidden controls
stay in the tab order, and focusing one with the keyboard shows them again. A
tap on touch screens reveals them, and a mouse click on the picture toggles
playback. Questions and the completion screen replace the overlay.

The bottom bar has play/pause, mute with an expanding volume slider (hidden on
touch devices and narrow windows), elapsed / total time, the chapter title,
a playback-speed selector (0.5× to 2×, native `<select>`), a captions toggle
when the clip has tracks, and full screen when the browser supports it. The
timeline marks each checkpoint, filled once answered. Volume, speed and
captions are kept across clips. Full screen keeps the frame and fits the
whole stage to the screen height.

Keyboard shortcuts work while focus is in the player and outside the
question: <kbd>k</kbd> or <kbd>Space</kbd> play/pause, <kbd>m</kbd> mute,
<kbd>f</kbd> full screen, <kbd>c</kbd> captions, <kbd>←</kbd>/<kbd>→</kbd> 5 s,
<kbd>j</kbd>/<kbd>l</kbd> 10 s. Seeking by keyboard is gated by checkpoints
exactly like the timeline.

## Frames

`theme.frame` places the video in a window inside a frame. A frame declares
its thickness as fractions of the stage width (`insets`), an optional
`intrusion` band (how far front art may lean into the window), a
`windowRadius`, and two renderers that receive measured stage geometry:
`renderBack` (walls, mouldings, columns) and `renderFront` (vines, blossoms,
recess shadows). Both layers are `aria-hidden` and pointer-inert. Questions,
completion text, the info overlay and the controls are padded clear of the
intrusion band.

Registry item `interactive-branching-frames` (`branching-frames.tsx`) ships six
procedural SVG frames and matching complete themes in `BRANCHING_FRAME_THEMES`:

| Theme | Construction |
| --- | --- |
| `moss-stone` | Coursed dry stone with a flat arch of voussoirs and keystone over the window, a projecting sill, cushion moss on the stones and in the joints, willow vines |
| `marble-colonnade` | Veined white marble entablature (cornice, dentils, egg-and-dart, laurel frieze, stepped architrave), fluted Corinthian columns with acanthus capitals, stylobate |
| `blossom-branch` | Bevelled white moulding with two cherry boughs bent around opposite corners: full and half-open blossoms, buds, young leaves, loose petals |
| `stone-portico` | Weathered stone pediment with medallion and garland relief, acroteria, triglyph frieze, paired Ionic columns, worn steps, lichen and rain streaks |
| `leaf-canopy` | Flat illustrated branches and dense leaf clusters on a cream mat |
| `walnut-lintel` | Walnut frame with an upswept cap, through-rail, cloud-lift blocks, ebony keys and pegs, flat-sawn grain |
| `forest-grove` | Rustic frame of sawn branches laid tight around the window: ridged, fissured bark with knots, broken side shoots and end grain showing rings and pith, twine lashings at the corners, cushion moss, leaf sprays from two corners, trailing ivy, ferns, toadstools, wood anemones and softly pulsing fireflies |
| `theater-proscenium` | A stage opening framed only by velvet, fitted close to the picture: the curtains' gold-galloned leading edges run behind it, the valance hem stops just above it and the stage floor runs under it. A pelmet with twisted gold cord and embroidered lozenges, swags with embroidered borders, bullion fringe and tassels, acorn-finialed rod, rope tiebacks, fold crests catching the footlights, pooled velvet with soft floor shadows, grained perspective floorboards with butt joints and nails, a gilt lip with shell footlights and a panelled fascia |
| `adventure-map` | Aged airmail map board with a real world map (Natural Earth coastlines, cropped 105°W–165°E): engraved coast ripples, hatched land, mountain ranges, equator and tropics, a sailing ship and one dashed voyage linking real ports around the window. Keepsakes: a pocket compass (knurled case, bow and hinge, 2° dial, engraved cardinal letters and fleur-de-lis, 32-point rose, blued-steel needle with counterweight and jewelled pivot, lubber line, domed glass), field binoculars (ribbed eyecups, knurled dioptre and focus wheels, stitched leather, turned brass bands, coated lenses, strap lugs), perforated stamps, postmarks, a rubber stamp, brass corners and a buckled strap. No lettering beyond the compass points, which are drawn as strokes |
| `koi-pond` | Deep pool with soft shores and caustic light; flowing water ribbons that end in curls, whorls, water-plant sprigs, bubbles and droplets; four koi (gold, kohaku, spotted ogon and a red veiltail) with bent bodies, scale rows, translucent ray-lined fins |

A framed player has no card of its own: the page background, border, padding
and shadow are removed, so the frame's outermost stone or branch meets the page
directly. Frame art must not paint a backdrop outside its own outline.

Frames are generated for the measured size, not stretched, so the same frame
works at 16:9 and in the 4:5 portrait window used below 580 px. Detail is
seeded: the same size always draws the same frame. Use `MOSS_STONE` and the
other frame exports with your own `colors` to recolor the player around a
frame.

The world map ships as `branching-world-map.ts`: Natural Earth 1:110m land
(public domain) via world-atlas 2.0.2 (ISC), simplified and stored as
half-degree integers (about 15 KB).

The stories play an in-house 14-second ocean loop with synthesized surf,
generated by `npm run video:branching-demo`
(`scripts/generate-branching-ocean-demo.mjs`, ffmpeg with VP9 and Opus). Every
motion is periodic over the clip, so it loops without a seam, and each surf
swell lands as a wave washes up the sand. No third-party footage or audio is
used.

Storybook: `Video production / Interactive Branching Player` — **Frame Themes**
shows all ten. The **Forest Lesson** story uses `forest-grove` and the
**Theater Stage** story uses `theater-proscenium`, each with Pip and Doctor
Quill.

## Accessibility and runtime requirements

- The question is announced through its heading and an accessible group.
  Focus moves to it at a checkpoint and returns to the transport control after
  a choice. Buttons, the seeking and volume ranges and the speed selector work
  with mouse, touch and keyboard; the overlay never hides them from the tab
  order.
- The controls expose accessible names and rank/score is communicated as text.
  Decorative frame art cannot intercept input. Reduced-motion system settings
  disable decorative animations and transitions, including the overlay fade.
- Poster and reaction clips should share appropriate accessibility descriptions.
  Each clip supports an optional `tracks` array of subtitle/caption URLs,
  languages, labels and a default flag. Provide transcripts separately when
  using spoken material.
- Playback after an answer is attempted, but browser autoplay policies can
  block it. The user can always press the labelled Play button.
- The library currently does not include HLS/DASH, caption-file generation,
  persistence, reward security or cross-device synchronization. External video
  hosts and learner accounts are application integration concerns.
