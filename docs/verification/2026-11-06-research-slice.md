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

| Check | Result |
|---|---|
| `film:check` | Passed, with no warning |
| `film:review` | 0 errors, 14 warnings: 8 for the docked question in the letterbox bar, 3 `frame-mostly-empty`, 3 `focus-off-hero` |
| `film:render` | Two MP4s, 630 verified frames each, each with a 21.000 s audio stream |
| Accent timing | Sound starts at 5.08 s, 9.49 s and 15.05 s. The hit peaks at 10.3 s, on the turn frame (frame 310), at -14.3 dB |
| `video:measure` | 0 flashes in any second. 34% of the film is still. Longest still stretch: 2 s |
| Unit tests | 2617 pass |

The match cut, from frames of the rendered MP4: [match-cut-landscape.jpg](research-slice/match-cut-landscape.jpg). The paper bill becomes the bill icon. Both scenes push in to a meeting box, so neither scene shows an edge. The first version moved each scene to the other's box, and the frame edge of the old scene was visible.

Contact sheets and stills in [`film-pipeline/`](film-pipeline) are from this build.

## What the new measures found

- **The contrast measure finds the first defect of this project.** With `appearance: "light"`, the film has dark text on dark images. The measure reports 10 texts at about 1:1. With the default appearance it reports none.
- **A unit test found a flaw in the first contrast measure.** A background close to the text colour was counted as text, so white text over light paper passed. The mask is now narrow, and that case fails as it must.
- **The empty-frame measure finds the portrait weakness.** Three portrait frames of the object story use 18% to 21% of the frame. A person noted this in the first report. Now the tool reports it.
- **The squint test disagrees with the hook.** On the opening frame, the blurred eye lands on the receipt, not on the question. The plate now stays dim while the question is on screen, which helps to the eye. The measure still reports it, in both outputs. This is a design decision for a person.
- **The squint test also flags the portrait `cause-effect` opening.** The eye lands on the first rail node, not on the statement.
- **Pace did not change, and the tool shows why that matters.** One third of the film is still. Each object-story beat settles and then holds for up to 2 s. Nothing in this slice changes pace.

## Limits and open items

- **Human review is pending.** The agent looked at the frames. That is not approval.
- **Every new check is a warning.** The research comes from long films and classroom learning. No check is an error until a benchmark shows that it helps.
- **The squint test favors large plain shapes over text**, as a blurred eye does. It can be right about the pixels and wrong about the design.
- **`video:measure` reads the mean of the whole frame.** A small local flash can pass. It does not count a dissolve or a wipe as a cut, so this film shows 0 cuts.
- **The `question-reveal` exposure change is shared.** Every film that uses the recipe now holds its plate dim under the question. The scene-template browser spec was not rerun.
- **The teardown study is not done.** The tool is ready and was run on this film and on one repository clip. It needs a list of reference videos.
- **The accent kit is synthesized and plain.** It proves timing. A sound designer's kit can replace its three files.
