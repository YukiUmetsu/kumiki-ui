# Chart Morph

**Registry item:** `chart-morph` (`registry/video/chart-morph.ts`, `chart-morph-react.tsx`): the staging, the checks and the renderer. `film-document` depends on it.

**In a film:** a `"recipeId": "chart-morph"` scene.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P1 "Chart morph" recipe, the `motion-unstaged` check, and §10.

## Purpose

Show a chart changing from one state to another so the viewer can follow *what* changed: a new year's values, a new order, a new form. In two controlled experiments, animated transitions between chart states improved graphical perception over static ones, and simple staging, one kind of change at a time, was preferred and helped ([Heer & Robertson, InfoVis 2007](https://homes.cs.washington.edu/~jheer/files/2007-AnimatedTrans-InfoVis.pdf), grade A). Motion systems say the same thing in practice: elements that all move at once read as ambiguous, so motion is choreographed in an order.

## How a change plays

Between two states the compiler finds what changed and plays it in this order:

1. **The axis grows**, if the new values need more room, so nothing runs off it while the values change.
2. **The values move**: bars grow or shrink, value labels follow.
3. **The axis shrinks**, if the new values need less room: after the values, for the same reason.
4. **The order changes**: rows slide to their new places. Rows that move fade their names while they pass each other and land crisp; the highlighted row stays legible throughout.
5. **The form changes**: a bar thins to a stem as a dot grows at its end; a dumbbell's starting dot fades in and the stem from zero gives way to the line from start to value; a line draws through the dots (ordered categories only).

Each stage takes 0.8 to 1.1 s, eased, with a short gap between stages. The state's caption arrives as its first change begins, so it says what is about to happen, and the state then holds for its caption's reading time. Spare frames lengthen the holds evenly.

## Content

```json
{
  "title": "Solar's share of electricity",
  "label": "Bars show solar's share of electricity in ten places in 2015 …",
  "source": "Data: Ember and others, via Our World in Data, CC BY 4.0",
  "categories": [{ "id": "chile", "label": "Chile" }, …],
  "highlight": "chile",
  "format": { "decimals": 1, "suffix": "%" },
  "states": [
    { "id": "2015", "form": "bar", "values": { "chile": 1.7, … }, "sort": "desc", "caption": "In 2015, solar made under 9% …" },
    { "id": "2024", "form": "bar", "values": { "chile": 22.8, … }, "sort": "desc", "caption": "By 2024, Chile has gone from near the bottom to the top." },
    { "id": "change", "form": "dumbbell", "values": { … }, "compare": { … }, "sort": "desc", "caption": "Chile's share rose more than thirteen-fold …" }
  ]
}
```

- **Layout.** Unordered categories are rows (names on the left, values growing right). `"ordered": true` puts them across (values growing up) and allows a line.
- **Domain.** Each state's axis runs from zero (or the lowest value, if negative) to a round number above its largest value, unless `domain` sets it.
- **Highlight.** One category keeps the accent colour (the brand's colour in a film, warm amber otherwise) and a bold name.
- **`together: true`** on a state plays all its changes in one motion. It is allowed for a deliberate effect, and `motion-unstaged` warns.

## Checks

| Code | Severity | What it catches |
|---|---|---|
| `motion-unstaged` | warning | A state that changes more than one kind of thing at once |
| `chart-morph-no-change` | warning | A state identical to the one before |
| `chart-morph-crowded` | warning | More than 14 categories |
| `chart-morph-many` | warning | More than six states |
| `chart-morph-clipped` | warning | A value outside an authored domain |
| `chart-morph-short` | error | Too little time to stage the changes and read the captions |
| `chart-morph-caption` | error | A state without a caption |
| `chart-morph-compare` | error | A dumbbell without starting values |
| `chart-morph-line` | error | A line over categories with no order |
| `chart-morph-values`, `chart-morph-categories`, `chart-morph-highlight`, `chart-morph-domain`, `chart-morph-states` | error | Data that does not fit: missing values, repeated or unknown IDs, a backwards domain, fewer than two states |

## In a film

Each state after the first is a moment (its ID), at its first change, for sound cues, review frames and a story turn (the last state by default). Speed ramps above 1.3× are warned about, as the chart carries words; the scene does not drift with the film's camera.

**Example.** [`examples/film/chart-morph.film.json`](../../examples/film/chart-morph.film.json): solar's share of electricity in nine countries and the world, 2015 and 2024, from Ember via Our World in Data (CC BY 4.0). Chile goes from 1.7% (eighth of ten) to 22.8% (first); Italy from 8.2% to 13.5%. Every caption was checked against these values: "more than thirteen-fold" is 22.8 / 1.7 = 13.4 from the values shown.

**Storybook, Video production → Chart Morph:** `Staged` plays the example; `Together` plays the same data with every change at once, as `motion-unstaged` warns, for comparison; `Light` shows it on a light page.

## States

- **Reduced motion.** Each stage cuts at its midpoint instead of moving.
- **Light and dark** follow the film's appearance.
- **Text.** The title, source and caption are HTML, measured by the rendered-text audit; values and names are SVG text at 2.5% of the frame height or more.

## Evidence (2026-11-09)

- **Tests.** `tests/film-document.test.ts`, "chart morph": change order (growing and shrinking axes), the stage list, rows in motion mid-sort, the caption naming the new state, frame-order independence, every refusal, and the example's moments.
- **Render review.** Frames in each hold and each stage at 1920×1080: the rendered-text audit reports no problems. Problems found and fixed: names colliding while rows swapped places (eight collisions mid-sort), and dumbbell starting dots too faint over a leftover stem from zero.

## Limits

- One value per category per state; grouped or stacked bars are not supported.
- The form change is one step: a bar can become a dot or a dumbbell, but not a pie or an area.
