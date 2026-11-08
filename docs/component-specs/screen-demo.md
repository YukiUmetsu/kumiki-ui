# Screen Demo

**Registry items:**

- `screen-demo` (`registry/video/screen-demo.ts`, `screen-demo-react.tsx`): the planner, the checks and the renderer. `film-document` depends on it.
- `screen-demo-example` (`registry/video/screen-demo-examples.tsx`): a worked example on a small task list built from Kumiki UI.

**In a film:** a `"recipeId": "screen-demo"` scene.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P0 "Screen demo" recipe, and §5, signaling.

## Purpose

Show real software being used: the format software makers ask for most. A demo is real UI, from one of two sources, operated by a choreographed cursor while a camera follows the work:

- **Screenshots**, one per state. A click shows the next.
- **Live React UI**, drawn from the demo's state. A click sets state, and typing fills it.

The motion is grounded rather than tweened, so it reads as a person working, not as an animation.

| What | How | Source |
|---|---|---|
| Cursor travel time | Fitts' law for the mouse, MT = 230 + 166·log2(D/W + 1) ms, × `pace` (1.35 by default: demos are watched, not performed) | MacKenzie, Sellen and Buxton 1991, via MacKenzie, *Graphics Interface* 1992 (A) |
| Cursor path | Minimum-jerk position profile (a bell-shaped speed) with a slight arc | Flash and Hogan 1985 (A) |
| Click | A 4-frame dwell on the target, a 3-frame press, and a 12-frame ripple | Practice (C) |
| Typing | About 10 characters a second, each gap varied, longer after spaces and punctuation; the caret blinks at the common 530 ms | Practice (C) |
| Camera | Lands on the element acted on a moment before the action; zoom about 1.5–2× | Screen-recording tools; practitioner guidance (C) |
| Callouts | A ring on the target and a short note: signaling | Mayer's signaling principle (A) |

## Content

```json
{
  "label": "A task list. The cursor opens a new task, types its name and adds it.",
  "screen": { "width": 1280, "height": 800 },
  "chrome": "browser", "url": "tasks.example.com/inbox",
  "source": { "kind": "ui", "ui": "tasks", "state": { "composer": false } },
  "targets": { "new-task": { "x": 1137, "y": 50, "width": 95, "height": 40 }, "title": { "x": 293, "y": 141, "width": 762, "height": 40 } },
  "steps": [
    { "do": "click", "target": "new-task", "set": { "composer": true } },
    { "do": "type", "target": "title", "text": "Send the quarterly summary", "click": false },
    { "do": "show", "target": "row-new", "callout": "New tasks land on top" }
  ]
}
```

- **`screen`.** The design size in CSS pixels: the size the screenshots show (2× captures welcome), or the size the live UI lays out at. Set `contentHeight` for a page that scrolls.
- **`targets`.** Named rects in content pixels.
  - For live UI, mark the same elements `data-km-demo-target="<name>"`, and read the rects with `measureScreenTargets(root)`. Storybook **Screen Demo → Measure Targets** shows how.
- **Steps.** Each step follows the one before, after time to see its result: 0.8 s after a change and 0.35 s after a plain action. `at` pins a step to a frame. `id` names its moment; by default it is `click-2`, `type-1` and so on.

| Step | Fields |
|---|---|
| `click` | `target`; `show` (a screenshot) or `set` (UI state) |
| `type` | `target`, `text`; `into` (UI state key), `cps`, `click` (click the field first, default true), `style` (type and field colour for screenshots) |
| `move` | `target` |
| `scroll` | `to`: a content y or a target |
| `show` | `show` or `set`, with no cursor action (a result loads); `target` for the camera and callout |
| `wait` | `frames` |

Every step can also take `callout`, which names the change, and `focus: false`, which keeps the camera where it is.

- **`chrome`.** `browser` (default, with `url`), `window` (with `title`), `phone` or `none`.
- **`cursor`.** `pace`, `size`, and `start` (a target or a point).
- **`zoom`.** `max` (default 1.8) and `auto` (default true).

## Camera

- **Opening.** It holds still for 0.6 s, so the viewer takes in the screen.
- **One framing per group.** Nearby actions that one framing can hold get one move, not one each; a field and its button share a single framing. A lone control is framed with room for its context. A field being typed into is framed by its start, where the words appear.
- **Stepping back.** After 3 s idle, before a scroll, and at the end (when at least 2.4 s remain) the camera steps back to the whole screen.
- **Portrait outputs.** A landscape screen in a portrait output is a thin strip, so the camera works from a higher base zoom (up to 1.6×) and crops in to follow the action, as vertical edits of desktop demos do. The deepest zoom rises with the base. `compileScreenDemo` takes the output size for this, and the film document passes it.
- **Reduced motion.** The camera cuts to each framing instead of gliding. Everything else is unchanged.

## Rendering

- **Live UI.** It is drawn with `inert`, `aria-hidden` and no pointer events, and all CSS transitions and animations inside it are switched off, so a state change shows on the exact frame. The UI animates its own entrances from `since` (frames since each key changed), never from timers.
- **While keys land** the pointer fades out, so the caret is the only mark in the text. It returns when typing ends.
- **A drawn caret in live UI** must follow a copy of the text set in exactly the field's type and inset (border and padding). Set those inline, as `TasksScreen` does, because a component's own size classes can win over yours.
- **Typing on a screenshot** is drawn over the field, with the field's colour laid under it to hide the placeholder, and is gone when the next screenshot replaces the field.
- **Callouts.** Each puts a ring on its target and shows its note in a lower-third band. The band moves to the top when the target is low in the frame, so the note never covers the interface it explains.
- **The window is an illustration.** The window and the screen inside it are marked `data-km-illustration-region="art"`, so the film's text audit judges the demo's own notes, not the address bar or the screen's words. Size the live UI's type for the output, as you would a screenshot.
- **Text alternative.** The scene has `role="img"` and `aria-label` from `label`.
- **In a film.** The brand's corner bug is hidden over a screen demo, whose window fills that corner. The film's `drift` does not apply, since the demo has its own camera.

## Checks

These are run by `compileScreenDemo`, and by `film:check` for film scenes.

| Code | Severity | When |
|---|---|---|
| `screen-unknown-target`, `screen-unknown-state` | error | A step names a target or screenshot that does not exist |
| `screen-show-ui`, `screen-set-images` | error | `show` on live UI, or `set` on screenshots |
| `screen-target-outside` | error | A target falls outside the screen |
| `screen-image-size` | error | A screenshot is not the screen's shape |
| `unlicensed-asset` | error | A screenshot has no rights reference |
| `screen-overflow` | error | The steps run past the scene |
| `screen-label`, `screen-no-steps`, `screen-step-id`, `screen-wait`, `screen-type-empty`, `screen-scroll-none`, `screen-callout-target` | error | Malformed content |
| `screen-result-hold` | warning | Less than 1 s after the last action |
| `screen-rushed` | warning | Two actions land within 0.4 s |
| `screen-step-overlap` | warning | An `at` starts before the step before it is done |
| `screen-type-long` | warning | Over 48 characters typed |
| `screen-callout-long` | warning | A callout over eight words |
| `screen-target-small` | warning | A target under 12 px |
| `screen-zoom-soft` | warning | At this output size, the camera enlarges screenshots past their pixels |

In a film:

- Each step is a named moment, for captions, `audio.cues` (a click sound on `add`) and the story.
- The story's turn defaults to the last step that changes the screen.
- A screen demo counts as a subject for the story's protagonist check.
- The look check warns about held-frame cadences on it, as on any interface.

## Examples

**Films:**

- **`examples/film/screen-demo-live.film.json`.** Landscape: a hook card, the live task-list demo, then the end card. The film's dark appearance re-themes Kumiki's own components through the tokens.
- **`examples/film/screen-demo-screenshots.film.json`.** Vertical (Shorts): the same flow from four screenshots.

**Screenshots:** `examples/film/assets/screens/tasks/*.png` are 2× captures of `TasksScreen`, made by this project from Storybook **Screen Demo → Capture**.

**Storybook, Video production → Screen Demo:**

- Live UI
- Screenshots
- Vertical
- Sheet: frames across the flow
- Measure Targets
- Capture

To add your own live screen to film files, register it in `src/film/film-screens.tsx`. In your own app, pass `renderScreen` to `FilmStage`.

## Evidence (2026-11-08)

- **Tests.** `tests/screen-demo.test.ts` (15 tests) covers:
  - Fitts' law timing against MacKenzie's constants;
  - repeatable, uneven typing;
  - the example's plan, clicks, typing and caret;
  - the shared framing for a field and its button, and the step back at the end;
  - seek order;
  - reduced-motion cuts;
  - the portrait crop;
  - screenshot swaps and typed text leaving with its screenshot;
  - the soft-zoom warning and every content check;
  - both example films compiling, with their moments and turn.
- **Install.** `registry:fixture` passes for `screen-demo`, `screen-demo-example` and `film-document`.
- **Review.** `film:review` on both example films:
  - the live film: 0 errors, and four `frame-mostly-empty` warnings, all on its end card;
  - the screenshots film: 0 errors, 0 warnings.
- **Contact sheets reviewed**, with these faults found and fixed:
  1. A wide text field framed at zoom 1, which made typing unreadable.
  2. The camera swung between a field and its button.
  3. Callouts beside small targets covered the task text.
  4. The demo ended on its last click.
  5. Mid-rise screenshots were captured before Storybook applied the state.
  6. The screenshot placeholder showed through typed text, and typed text outlived its screenshot.
  7. In vertical, the full screen was a thin strip.
  8. In vertical, the opening started on a tiny view.
  9. The brand bug sat on the window.
  10. The overflow check counted settle time as required.
  11. **Owner review: "typing looks weird".** In live UI the caret sat before the last character. The field's own `text-base` and padding classes won over the example's, so the caret's copy of the text was set smaller than the field. The field's type and inset are now inline and shared with the caret, which measures within 0.05 px of the end of the text at every sampled frame. The pointer also fades out while keys land, so it no longer reads as a second caret.
- **Not yet done.** No owner viewing yet. No video rendered.

## Limitations

- **Targets for live UI are declared.** The review does not yet re-measure `data-km-demo-target` against them, so keep `measureScreenTargets` output in step with the UI.
- **One cursor.** There are no touch gestures (taps, swipes) for phone screens yet; a tap is a click with the arrow.
- **No drag.** There is no drag-and-drop step.
- **The camera works in screen coordinates.** It does not frame the cursor and a far target together during a long move.
- **Under-pixelled screenshots soften.** A screenshot enlarged past its pixels is warned about, not fixed; capture at 2×.
