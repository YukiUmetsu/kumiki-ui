# Interactive Branching Video Player — recovery design

The user previously approved a hybrid, configurable interactive video player. The
original working copy was lost without a branch; this is the independent recovery
implementation. It does not depend on the unmerged Character2D draft PR.

## Architecture

- `interactive-branching-model.ts` is a deterministic, renderer-independent story
  graph. It owns checkpoint gating, one-time scoring, reaction-return bookmarks,
  branch transitions, completion and rank resolution.
- `InteractiveBranchingPlayer` uses one native HTML `<video>` media clock. It
  reacts to `timeupdate`, `seeking` and `ended`; it does not introduce a second
  requestAnimationFrame clock or duplicate the frame-driven `ExplainerPlayer`.
- Story clips are media URLs, including short answer-reaction clips. The caller
  can specify a different next chapter for each answer, or return to the current
  chapter after the reaction and continue.
- The authored experience is themeable through CSS custom properties and
  render slots: ornate frame, rank adornment, optional teacher/student characters,
  and an optional completion screen. The package does not impose cultural art.
- Player scores, current state and completion are observable for embedding in
  learning products. The app owns persistence/registration and authentication.

## Interaction and accessibility

- At a checkpoint, pause exactly at the authored time and display one labelled
  question with focusable choices. The player cannot seek past unresolved quizzes.
- Record each answer once. Reaction playback cannot award another point. Return
  to the saved time after reactions; valid choice branch targets override that
  return. A completed clip follows its authored next clip or finishes.
- Include visible playback controls and a seek range. Focus the quiz title and
  restore focus to the playback control after the answer. Preserve keyboard and
  touch operability, accessible status/results, and `prefers-reduced-motion`.
- Decorative actor cues and rank ornaments cannot block controls. Arbitrary
  text and media come from the caller and are never interpreted as markup.

## Non-goals

- No remote account registration, leaderboards, persistence, character-rig editor,
  streaming DRM or HLS engine; those are composition or integration concerns.
- The native video interface permits caller-owned hosted/local media. The
  Storybook demonstration uses the repository's in-house synthetic video fixture.

## Verification

Test pure state transitions and malformed authoring; test DOM focus, quiz gating,
score, reactions, rank, slots and language; run typecheck, lint, registry/catalog
checks, unit tests and build. Visual QA and real-browser playback should follow.
