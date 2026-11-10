# Quiz Card

**Registry item:** `quiz-card` (`registry/learning/quiz-card.ts`, `quiz-card-react.tsx`, `quiz.tsx`). No dependencies.
**Storybook:** Learning → Quiz Card.

One quiz question, for a page or a video, from the same card:

| Export | For | Driven by |
|---|---|---|
| `Quiz` | Lesson pages, apps, practice | What the learner does |
| `QuizCard` | Films: a frame-addressable quiz moment | A frame number |
| `QuizCardView` | Building your own (a timed live quiz, a results page) | A state you pass |

A question therefore looks the same in the video that teaches it and on the page that tests it.

## Purpose

Ask one multiple-choice question, let someone commit to an answer, then show the right answer and one line of why.

A quiz fails in a few ordinary ways. It hints at the answer before the pick. It shows right and wrong by colour alone. Its layout jumps when the explanation appears. In a video, it gives the answer before the question can be read. This component is built around those four.

## Interactive: `Quiz`

```tsx
<Quiz question={{ question: "About how old is the largest pyramid at Giza?",
                  options: [{ id: "a", label: "450 years" }, { id: "b", label: "4,500 years" }],
                  answer: "b", explanation: "It was built around 2560 BC." }}
      onReveal={({ option, correct }) => record(option, correct)} allowRetry />
```

1. The learner picks an option. The options are a native radio group: Tab reaches it, the arrow keys move the choice.
2. **Check answer** shows the answer. It is disabled until an option is picked.
3. The right option fills and gets a tick. A wrong pick gets a cross and steps back. "Correct" or "Not quite" is written beside the buttons, and the explanation appears.
4. The options are then disabled. With `allowRetry`, a wrong answer offers **Try again**.

| Prop | Meaning |
|---|---|
| `question` | `{ question, options, answer, explanation?, eyebrow?, layout?, appearance? }` |
| `value`, `defaultValue`, `onValueChange` | The picked option's id: controlled, or held by the component. |
| `revealed`, `defaultRevealed`, `onReveal` | Whether the answer is shown: controlled, or held by the component. `onReveal` gets `{ option, correct }`. |
| `revealOn` | `"submit"` (default) or `"select"`: the first pick shows the answer, for a quick-fire round. |
| `allowRetry`, `onRetry` | Offer "Try again" after a wrong answer. |
| `disabled` | The learner cannot choose or check. |
| `after` | Shown beside the buttons after the answer: a link to the next question, a score. |
| `labels` | The component's own words, for other languages. |
| `size`, `variant`, `name`, `reducedMotion` | See [Themes](#themes). `reducedMotion` defaults to the system setting. |

There is no timer in the interactive quiz. A time limit needs a way to extend it; build one on `QuizCardView` if you need it.

## In a film: `QuizCard`

`compileQuizCard(content, durationFrames, fps)` returns `{ plan, problems }`; draw it with `<QuizCard plan={plan} frame={frame} />`. It fills the box it is given: the whole frame, or a region over a scene that keeps moving. It is not yet a film-document scene kind; a host draws it.

1. **The card arrives** (10 frames), then each option, four frames apart.
2. **A thin line drains** from the last option's arrival to the answer, and ends exactly on the reveal frame.
3. **A guess**, optionally (`guess: { option, at, by }`): one option is picked and tagged with who picked it.
4. **The answer** (`revealAt`), then **the explanation** 14 frames later.

Film-only content: `guess`, `enterAt`, `revealAt` (defaults to the reading time of the question and options), `leaveAt`, `countdown`.

| Check | Severity | When |
|---|---|---|
| `quiz-options` | error | Fewer than two or more than four options, a repeated id, an empty label, or no question. |
| `quiz-answer` | error | `answer` is not an option. |
| `quiz-guess` | error | The guess is not an option, or is not between the last option and the answer. |
| `quiz-timing` | error | Parts out of order or outside the scene. |
| `quiz-reveal-early` | warning | The answer comes before three quarters of the reading time (0.8 s, then three words a second; two CJK characters count as a word). |
| `quiz-question-long`, `quiz-option-long` | warning | Over 14 words; over five words. |
| `quiz-answer-brief`, `quiz-explanation-brief` | warning | The card leaves before the answer or the explanation can be read. |

In a film, have the question spoken as it appears: nobody then has to read it against the clock.

## Themes

Three levels, coarse to fine. All of them work for `Quiz`, `QuizCard` and `QuizCardView`.

1. **`appearance`** (on the question): `"dark"`, `"light"`, or `"system"`. `"system"` uses the design system's tokens (`--km-surface-elevated`, `--km-text-primary`, `--km-text-muted`, `--km-border-subtle`, `--km-action-primary`, `--km-status-danger`), so the card follows the page's own light or dark theme.
2. **`variant`**: `"glass"` (translucent, blurs what is behind; the film default), `"solid"` (opaque; the interactive default) or `"outline"` (no fill or shadow, for a surface that already has one).
3. **CSS variables**, on the card or any ancestor:

| Variable | Sets |
|---|---|
| `--km-quiz-surface`, `--km-quiz-option` | The card's fill; an option's fill. |
| `--km-quiz-ink`, `--km-quiz-muted`, `--km-quiz-line` | Text, secondary text, borders. |
| `--km-quiz-accent`, `--km-quiz-on-accent` | The eyebrow, a picked option, the main button. Falls back to `--km-accent`. |
| `--km-quiz-correct`, `--km-quiz-on-correct` | The right option's fill and its text. Defaults to the accent; set it to a green if your brand marks right answers that way. |
| `--km-quiz-wrong` | A wrong pick's border, cross and "Not quite". |
| `--km-quiz-focus` | The keyboard focus ring. Defaults to the ink. |
| `--km-quiz-radius`, `--km-quiz-shadow` | Corners; the card's shadow (`none` removes it). |
| `--km-quiz-font-display`, `--km-quiz-font-body` | The question and explanation; everything else. Fall back to `--km-font-display` and `--km-font-body`. |

**Sizes.** `Quiz` takes `size`: `"sm"` (0.875 rem), `"md"` (1 rem) or `"lg"` (1.25 rem); the card is as wide as its parent and as tall as its content. `QuizCard` measures its box instead: 2.7% of the box's width, more in a narrow or vertical box (up to 5.2% of the width, 3% of the height), and less when its own text would make it taller than the box. Text widths are estimated, so a film's rendered-text audit is still the check for clipping.

**Layout.** `layout: "row" | "column" | "auto"`: side by side when the options are short, stacked when they are long.

All three components forward `className`, `style`, DOM props and their ref. Storybook's **Themes** story shows six looks made only from these settings.

## Accessibility

- Nothing is marked right or wrong before the answer.
- Right and wrong are a tick and a cross as well as a colour, the right option fills, and the result is written in words.
- The card is a `group` named by the question. Interactive options are a `radiogroup` of native radios labelled by the question; in a film they are an ordered list.
- A `status` line says "The answer is not shown yet", then the pick, then the answer and the explanation. The explanation is hidden from assistive technology until it is shown.
- When "Check answer" is pressed it leaves the page; focus moves to the result.
- Disabled means disabled: the radios and buttons take the native `disabled` attribute.
- Reduced motion: parts switch on; nothing slides, pulses or shakes.
- The space for the explanation is held from the start, so the card does not change size.

## Evidence (2026-11-10)

- Storybook, **Learning → Quiz Card**: interactive, quick-fire, sizes and disabled, six themes, Japanese, and six film stories (two options, four options on light paper, upper third, Japanese vertical, reduced motion, the checks).
- Keyboard only, in headless Chromium: Tab to the options, arrow to a choice, Tab to "Check answer", Enter. Checked: the button is disabled before a pick; the radios are disabled after; focus lands on the result; the status line and `onReveal` report the answer; "Try again" clears the pick.
- Rendered in a film at 640×360 over a moving 3D scene: question, guess, answer, explanation.
- Not done yet: unit tests, a pass with a real screen reader, contrast measurements for each theme, and a clean registry-install smoke test.
