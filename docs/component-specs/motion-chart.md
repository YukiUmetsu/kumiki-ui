# Guided Motion Chart

**Registry item:** `motion-chart` (`registry/video/motion-chart.ts`, `motion-chart-react.tsx`): the timeline, the checks and the renderer. `film-document` depends on it.

**In a film:** a `"recipeId": "motion-chart"` scene.
**Research:** [32 — Professional video recipes](../32-professional-video-recipes-research.md): the P1 "Guided motion chart" recipe, and §6.

## Purpose

Show how many things change together over time: bubbles placed by two measures and sized by a third, moving across years, with the year large behind them. The form is Hans Rosling's.

The research behind it is blunt. In a user study, animated bubble charts were the *least* effective for analysis, next to small multiples and traces ([Robertson et al., InfoVis 2008](https://faculty.cc.gatech.edu/~stasko/papers/infovis08-anim.pdf), grade A). They worked in Rosling's talks because he told a story and primed viewers to look at one bubble before something happened to it ([Roslingifier](https://users.umiacs.umd.edu/~elm/projects/roslingifier/roslingifier.pdf)). So the chart is built around that guidance, and an event without it is refused.

## How an event plays

Each event names an entity, a stretch of time and a cue:

1. **Hold and cue.** Playback eases to a stop at the event's start. The cue ("Watch China.") appears in a caption band under the chart, which never moves while it is read. The other bubbles dim and turn grey, and a white ring with a soft glow marks the subject. The hold lasts its reading time, and at least 1.4 s.
2. **The change.** Time plays again at a third of the normal speed. The subject leaves a trail: a dot at each data time it passes, older ones fainter, joined by a thin line.
3. **The note.** At the end, an optional note says what it meant. It holds for its reading time, then the guidance fades and playback carries on.

Between events, time plays at an even rate, eased into and out of each hold. The scene's length is shared out after the holds take their reading time; a scene too short for them is refused, and playback faster than 12 time steps a second is warned about, since the bubbles then jump.

## Content

```json
{
  "id": "nations", "recipeId": "motion-chart", "durationFrames": 1350,
  "content": {
    "title": "Health and wealth of nations, 1950–2020",
    "label": "Bubbles for 32 countries move over seventy years …",
    "x": { "label": "Income per person", "unit": "international-$, 2011 prices, log scale", "scale": "log", "domain": [300, 90000] },
    "y": { "label": "Life expectancy", "unit": "years", "domain": [25, 87] },
    "size": { "label": "population" },
    "groups": [{ "id": "asia", "label": "Asia", "color": "#E5534B" }, …],
    "times": [1950, 1951, …, 2020],
    "entities": [{ "id": "china", "label": "China", "group": "asia", "values": [[799, 43.8, 544044355], …] }, …],
    "events": [{ "id": "famine", "entity": "china", "from": 1957, "to": 1963, "cue": "Watch China.", "note": "Famine: life expectancy falls from 49 to 33 years, then recovers." }],
    "labelled": ["ghana", "argentina", "india", "united-states"],
    "source": "Data: Our World in Data, CC BY 4.0"
  }
}
```

- **Values** are `[x, y, size]` per time, aligned with `times`, or `null` where there is none. Between data times, positions are linear (in log space on a log axis).
- **Domains and ticks** default to the data's padded range and round numbers (1, 2 and 5 per decade on a log axis).
- **Groups** colour the bubbles; without a colour, a group takes the next of eight colour-blind-safe defaults.
- **Labels.** The watched entity is labelled while it is watched; `labelled` entities throughout. Each label tries four places round its bubble and takes the first inside the safe area, clear of labels already placed and of large bubbles; one that fits nowhere waits.

## Checks

| Code | Severity | What it catches |
|---|---|---|
| `motion-chart-uncued` | error | An event with no cue |
| `motion-chart-event-overlap` | error | Two events at once: watch one thing at a time |
| `motion-chart-event-time` | error | An event that runs backwards or outside the times |
| `motion-chart-event-entity`, `motion-chart-labelled` | error | A name that is not an entity |
| `motion-chart-times`, `motion-chart-values`, `motion-chart-log`, `motion-chart-group`, `motion-chart-entity` | error | Data that does not fit the chart: times out of order, missing or non-finite values, zero on a log axis, unknown groups, repeated IDs |
| `motion-chart-short` | error | Too little time left after the holds to play the data |
| `motion-chart-cue-long` | warning | A cue over eight words: a pointer, not a sentence |
| `motion-chart-many-events` | warning | More than four events in one scene |
| `motion-chart-crowded` | warning | More than six labels at once |
| `motion-chart-fast` | warning | Playback over 12 time steps a second |

## In a film

Each event adds three moments: `<event>-cue`, `<event>` (the change starts) and `<event>-note`. Sound cues can land on them, review frames sample them, and a story turn falls on the last note by default. Speed ramps above 1.3× are warned about, as for cards: the chart carries words. The scene does not drift with the film's camera, so its text stays still.

**Example.** [`examples/film/motion-chart.film.json`](../../examples/film/motion-chart.film.json): 32 countries, 1950–2020, income per person (log) against life expectancy, sized by population. Three events, each checked against the data:

| Event | What the data shows |
|---|---|
| China, 1957–1963 | Life expectancy 48.8 (1958), 33.4 (1960), 51.0 (1962): the famine |
| South Korea, 1963–1988 | Income $1,721 against Ghana's $2,270 in 1963; $12,040 against Argentina's $11,244 in 1988 |
| Botswana, 1988–2012 | Life expectancy 61.7 (1988), 52.4 (2002), 60.4 (2012), while income rose: HIV, then treatment |

The data is Our World in Data's "Life expectancy vs. GDP per capita" (CC BY 4.0), from the Maddison Project Database 2023 (GDP), the UN World Population Prospects 2024, HMD, Zijdeman et al. and Riley (life expectancy), and HYDE, Gapminder and the UN WPP (population).

**Storybook, Video production → Motion Chart:** `Guided` plays the example with buttons that jump to each cue; `Light` shows it on a light page.

## States

- **Reduced motion.** Time does not glide: within each stretch of playback it steps to the next hold halfway through, and the guidance appears without fading, so the information arrives without motion.
- **Light and dark.** `appearance` follows the film's.
- **Text.** Title, source, legend and captions are HTML, so they wrap and the rendered-text audit measures them. Axis labels and ticks are SVG text at 2.5% of the frame height. The year is marked as artwork, since it is a backdrop.

## Evidence (2026-11-09)

- **Tests.** `tests/film-document.test.ts`, "guided motion chart": the hold, slowed change and note in order; the cue and note in the caption at the right frames; the same state in any frame order; reduced-motion steps; every refusal; the example's moments.
- **Render review.** Frames at the intro, each cue, each change and note, and the end, at 1920×1080: the rendered-text audit reports no problems. Problems found and fixed on the way: tick and axis text under the minimum size; SVG text measured as black (the audit reads `color`, not `fill`); the source wrapping into the caption band; a story label sitting over the watched bubble; a label running past the safe edge, then colliding with another.

## Limits

- Bubbles are drawn as SVG: a few hundred entities at most.
- Label placement is greedy, in a fixed order (the watched entity, then the story's labels); it does not search all arrangements.
- A cue names its entity in words; the chart does not point an arrow from the caption to the bubble, relying on the ring and the dimming instead.
