# Storyboard Shots

**Status:** development implementation; expanded QA deferred by user request.

`StoryboardShots({ storyboard, frame, onFrameChange, label? })` displays the active shot's claim
and visual objective, followed by selectable shots with rational-FPS timestamps. It reads the
existing `Storyboard` contract through `shotAt`, without a new shot schema or clock. The caller
owns the frame and passes a reduced-motion-resolved frame when appropriate. Selecting a shot
requests its start frame. Native buttons support keyboard activation; the active shot has
`aria-current="step"`. During storyboard gaps it explains how to select a shot. It forwards div
props, className and ref, and uses existing semantic Tailwind/token utilities.

Both camera demos now use this component. The 2D demo describes establish, push in, hold,
cut + roll, track + reframe and pull back, with intervals matching its actual keyframes. The
progressive reveal demo reuses the same navigation. There are no external dependencies beyond
React and the existing scene-storyboard registry item.

Executed in this increment: `npm run typecheck` and `npm run build` passed; tests/screenshots deferred.
