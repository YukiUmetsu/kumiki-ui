# Quiz Card

**Registry item:** `quiz-card` (`registry/video/quiz-card.ts`, `quiz-card-react.tsx`): the timing, the checks and the renderer. No dependencies.

**In a film:** drawn by the host at a frame (`<QuizCard plan frame />`), full-frame or in a region over another scene. It is not yet a film-document scene kind.

## Purpose

Show a quiz moment in a video: a question, two to four options, and then the answer, so the viewer can play along. In a trailer or an opening it also says what kind of programme this is.

A quiz on screen fails in two ways. It gives the answer before the question can be read, or it stops the film while the viewer reads. This component times the answer from the words on the card, and it is built to sit over a scene that keeps moving, with the question spoken as it appears.

## How it plays

1. **The card arrives** (10 frames), then each option, four frames apart.
2. **A thin line drains** from the last option's arrival to the answer. It ends exactly on the reveal frame, so the viewer always knows how long is left.
3. **A guess**, optionally: one option takes the accent outline and a small tag (`guess.by`, such as a presenter's name). Nothing says yet whether it is right.
4. **The answer** (`revealAt`): the right option fills with the accent and its letter becomes a tick, drawn in; a wrong guess gets a cross, shakes once and steps back; the others dim.
5. **The explanation**, 14 frames later: one italic line under the options.

The space for the explanation is held from the first frame, so the card does not change size when it appears.

## Content

| Field | Meaning |
|---|---|
| `question` | The question. Up to about 14 words. |
| `options` | Two to four `{ id, label, detail? }`. `label` is a few words; `detail` is one small line (a unit, a date). |
| `answer` | The id of the right option. |
| `guess` | `{ option, at, by? }`: an option picked at frame `at`, after the options and before the answer. |
| `explanation` | One line shown after the answer. |
| `eyebrow` | A small label above the question. |
| `enterAt`, `revealAt`, `leaveAt` | Frames. `revealAt` defaults to the reading time of the question and options. |
| `countdown` | `false` hides the draining line. |
| `layout` | `"row"`, `"column"` or `"auto"` (default): side by side when the options are short, stacked when they are long. |
| `appearance` | `"dark"` glass for bright pictures (default), `"light"` paper for dark ones. |

`compileQuizCard(content, durationFrames, fps)` returns `{ plan, problems }`; `quizCardAt(plan, frame, reducedMotion)` returns the card's state at a frame (phase, each option's tone and mark, the line's remaining share, the status text).

## Checks

| Code | Severity | When |
|---|---|---|
| `quiz-options` | error | Fewer than two or more than four options, a repeated id, an empty label, or no question. |
| `quiz-answer` | error | `answer` is not an option. |
| `quiz-guess` | error | The guess is not an option, or is not between the last option and the answer. |
| `quiz-timing` | error | Parts out of order or outside the scene. |
| `quiz-reveal-early` | warning | The answer comes before three quarters of the reading time (0.8 s, then three words a second; two CJK characters count as a word). |
| `quiz-question-long`, `quiz-option-long` | warning | Over 14 words; over five words. |
| `quiz-answer-brief`, `quiz-explanation-brief` | warning | The card leaves before the answer or the explanation can be read. |

## Sizing and customization

The card fills the box it is given and measures it. Its type is 2.7% of the box's width, more in a narrow or vertical box (up to 5.2% of the width, 3% of the height), and less when the card's own text (lines of question, rows of options, the explanation) would make it taller than the box. The same card therefore fits a full frame, a third of a frame and a vertical output. Text widths are estimated (half an em a character, one for CJK), so a film's rendered-text audit is still the check for clipping.

CSS variables, on the card or any ancestor: `--km-quiz-surface`, `--km-quiz-ink`, `--km-quiz-muted`, `--km-quiz-line`, `--km-quiz-accent` (falls back to `--km-accent`), `--km-quiz-on-accent`, `--km-quiz-wrong`, `--km-quiz-radius`. Type follows `--km-font-display` and `--km-font-body`. The component forwards `className`, `style`, DOM props and its ref.

## Accessibility

- Right and wrong are a tick and a cross as well as a colour, and the right option fills.
- The card is a `group` labelled with the question; the options are an ordered list; a `status` line says "The answer is not shown yet", then the guess, then the answer and the explanation. The explanation is hidden from assistive technology until it is shown.
- `reducedMotion`: parts switch on; nothing slides, pulses or shakes.

## Evidence (2026-11-10)

- Storybook, **Video production → Quiz Card**: two options with a wrong guess, four options on light paper with a right guess, the upper third of a frame, long Japanese copy in a vertical frame, reduced motion, and the checks.
- Rendered and reviewed in a film at 640×360: the question, the guess, the answer and the explanation, over a moving 3D scene.
- Not done yet: unit tests, a keyboard or screen-reader pass with real assistive technology, and a clean registry-install smoke test.
