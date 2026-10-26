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
It distributes the model, React component and its stylesheet. Direct source
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
| `theme.colors` | Accent, background, foreground, border and glow colors |
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
requirements are built into the component. See Storybook `Video production /
Interactive Branching Player` for two non-default design examples.

The character slots accept an arbitrary React renderer, including the 2D/2.5D
`CharacterPresenter` under development separately. This feature does not require
its unmerged implementation to be present.

## Accessibility and runtime requirements

- The question is announced through its heading and an accessible group.
  Focus moves to it at a checkpoint and returns to the transport control after
  a choice. Buttons and the seeking range work with mouse, touch and keyboard.
- The controls expose accessible names and rank/score is communicated as text.
  Decorative frame art cannot intercept input. Reduced-motion system settings
  disable decorative animations and transitions.
- Poster and reaction clips should share appropriate accessibility descriptions.
  Each clip supports an optional `tracks` array of subtitle/caption URLs,
  languages, labels and a default flag. Provide transcripts separately when
  using spoken material.
- Playback after an answer is attempted, but browser autoplay policies can
  block it. The user can always press the labelled Play button.
- The library currently does not include HLS/DASH, caption-file generation,
  persistence, reward security or cross-device synchronization. External video
  hosts and learner accounts are application integration concerns.
