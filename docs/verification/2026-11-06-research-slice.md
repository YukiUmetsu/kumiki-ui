# Research slice verification

Date: 2026-11-06. Branch: `feat/research-slice`. Scope: the first slice of [plan 26](../26-automated-content-quality-plan.md), built on the example film `examples/film/billing-gap.film.json`.

## What was built

| Research finding | Built | Where |
|---|---|---|
| Reversals and curiosity gaps (4.1) | `story` on a scene: loops that must close, turns, a `flat arc` warning | `film:check` |
| Carry identity across a cut (4.3) | `subjects` on a scene, a `match` transition, and a proposal when two scenes share a subject | `film-document`, `FilmStage` |
| Sound is half of the edit (4.4) | `audio.accents`: a whoosh on each transition, a riser and a hit on each turn. An original synthesized kit | `film:render`, `film:sound-kit` |
| A review that sees (2E, 4.6) | Pixel measures: text contrast, empty frame, squint test | `film:review` |
| Flash limit, pace, teardown | `video:measure` reads any video file | new command |

The story fields sit on film scenes. The separate storyboard file of the plan is not built.

## Results on the example film

The film was rewritten after the owner said that it was hard to understand. The [reference teardown](2026-11-06-reference-teardown.md) gives the reasons and the changes. These results are for the rewritten film.

| Check | Result |
|---|---|
| `film:check` | Passed, with no warning |
| `film:review` | 0 errors. Warnings: the docked question in the letterbox bar, 4 `frame-mostly-empty` in portrait, 2 `focus-off-hero` on the opening |
| `film:render` | Two MP4s, 540 verified frames each (18 s), each with an audio stream |
| Accents | A riser and a hit on the turn ("Neither.", frame 90), and a whoosh on the match |
| `video:measure`, landscape | Still for 9% of the time, down from 34%. Longest still stretch 1.7 s. No flash |
| `video:measure`, portrait | Still for 25%, down from 34%. The objects are small in portrait, so the drift moves few pixels |
| Unit tests | 2617 pass |

The match cut, from frames of the rendered MP4: [match-cut-landscape.jpg](research-slice/match-cut-landscape.jpg). The paper receipt becomes the receipt icon. Both scenes push in to a meeting box, so neither scene shows an edge. The first version moved each scene to the other's box, and the frame edge of the old scene was visible.

Contact sheets and stills in [`film-pipeline/`](film-pipeline) are from this build.

**Fixed alongside:** a measured gap in `object-story` stayed on screen after a later beat changed one of its values, so it showed a number that was no longer true. It now ends when either value changes.

## What the new measures found

- **The contrast measure finds the first defect of this project.** With `appearance: "light"`, the film has dark text on dark images. The measure reports 10 texts at about 1:1. With the default appearance it reports none.
- **A unit test found a flaw in the first contrast measure.** A background close to the text colour was counted as text, so white text over light paper passed. The mask is now narrow, and that case fails as it must.
- **The empty-frame measure finds the portrait weakness.** The portrait frames of the object story use 19% to 23% of the frame. A person noted this in the first report. Now the tool reports it.
- **The squint test disagrees with the hook.** On the opening frame, the blurred eye lands on the receipt, not on the question. The plate now stays dim while the question is on screen, which helps to the eye. The measure still reports it, in both outputs. This is a design decision for a person.
- **The squint test also flags the portrait `cause-effect` opening.** The eye lands on the first rail node, not on the statement.
- **The pace measure led to a change.** One third of the first film was still, and the top shorts in the teardown are still for 0% to 2%. A slow push-in (`drift`) now brings landscape to 9%. It moves the whole frame. The reference films move the subject itself.

## Limits and open items

- **Human review is pending.** The agent looked at the frames. That is not approval.
- **Every new check is a warning.** The research comes from long films and classroom learning. No check is an error until a benchmark shows that it helps.
- **The squint test favors large plain shapes over text**, as a blurred eye does. It can be right about the pixels and wrong about the design.
- **`video:measure` reads the mean of the whole frame.** A small local flash can pass. It does not count a dissolve or a wipe as a cut, so this film shows 0 cuts.
- **The `question-reveal` exposure change is shared.** Every film that uses the recipe now holds its plate dim under the question. The scene-template browser spec was not rerun.
- **The teardown set is small.** Ten videos, with no long-form work from the leading studios. See its report.
- **The film has no voice.** The teardown shows that every top short is led by narration. This is the largest gap that remains.
- **The accent kit is synthesized and plain.** It proves timing. A sound designer's kit can replace its three files.
