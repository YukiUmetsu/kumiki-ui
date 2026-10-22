# ChartStory — tell a chart's story without bending its data

**Status:** Implementing. Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** P0, second slice of Phase 3 in [17 — Explainer Visual Components](../17-explainer-visual-components.md#3-highest-priority-component-contracts-p0).
**Scope:** Animates an existing chart through story beats:
- establish the axes, reveal series, focus one data point, compare two points;
- switch to a what-if scenario and back;
- conclude with a claim that is checked against the data.

It guarantees the chart stays honest while it moves:
- the value axis never rescales between beats or scenarios;
- bars and areas start at zero;
- marks are addressed by data identity;
- no number is shown that is not in the data.

It cannot judge whether the data itself is true.

## Reuse and the gap it fills
- **Reused:**
  - **Every mark, tick, legend and note** comes from `renderChart` (infographic-system); there is no second chart engine. The SVG is drawn by `PaintDefs` / `PrimitiveShape` (infographic-view).
  - **Mark identity:** the renderer's `semanticId` (`series:index`, `series` for lines and areas) addresses marks, and `category:i` / `series:id` anchors locate them.
  - **Domain and summary:** `chartDomain` and `chartSummary`. The accessible label is the current scenario's summary.
  - **Timing:** `evaluateEasing` (motion-track).
  - **Text:** claims and pills are measured with the real faces through `createCanvasMeasurer` and broken at `segmentText` opportunities (media-document). They are re-measured when web fonts finish loading.
- **The gap:** the registry could draw a correct static chart, but nothing animated one safely. Generic tweening rescales axes, invents in-between labels, and lets a closing line claim anything.
- **Engine improvements made for this slice (they benefit every chart):**
  - Line value labels no longer overprint other series' markers.
  - The lowest of several series puts its labels below its points.
  - Legend labels carry their series `semanticId`, so they can follow the series.

## Install and inspect
- Registry item: `chart-story` (`chart-story.ts`, `chart-story-react.tsx`).
- Storybook: **Infographic → Chart Story**.
  - **Chart story:** a 19.5-second story at 9:16 and 16:9, with a line/bar toggle. The data is a fictional sample of parcels per driver-hour, January–June, for grouped and ungrouped routes. The beats are:
    1. axes;
    2. reveal ungrouped routes;
    3. reveal grouped routes;
    4. focus on June;
    5. compare January with June (+44.4%);
    6. a what-if where every route is grouped;
    7. back to the actual data;
    8. the checked claim "Grouped routes delivered 44% more parcels per driver-hour in June than in January."
  - **Refusals:** a truncated bar axis, an overclaim, a highlighted missing value, a percent change from zero, and scenarios with different series or units. Each is reported.

## Minimal usage
~~~tsx
const spec: ChartStorySpec = { id: "growth", fps: { num: 30, den: 1 }, title: "Parcels per driver-hour", initialScenarioId: "actual",
  scenarios: [{ id: "actual", label: "Actual, Jan–Jun", spec: chartSpec }],
  beats: [
    { id: "axes", kind: "establish", durationFrames: 45 },
    { id: "series", kind: "reveal", seriesIds: ["grouped"], durationFrames: 60 },
    { id: "growth", kind: "compare", seriesId: "grouped", from: 0, to: 5, measure: "percent-change", durationFrames: 90 },
    { id: "claim", kind: "conclude", durationFrames: 120,
      claim: { text: "Up 44% from January to June.", support: { kind: "percent-change", seriesId: "grouped", from: 0, to: 5, value: 44 } } },
  ] };

<ChartStoryView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Scenarios:** `{ id, label, note?, spec: ChartSpec }`. Every scenario must keep the first one's recipe, categories, series IDs and unit, so marks keep their identity (`chart-story-scenario-mismatch`, `chart-story-unit-mismatch`). `chartStoryDomain` merges all scenarios into **one** value domain, and `layoutChartStory(spec, frame, style)` renders each scenario into the same frame with that domain.
- **Beats:**
  - `establish`: axes only.
  - `reveal { seriesIds }`: the series fade in, and stay visible afterwards.
  - `focus { seriesId, index, note? }`: a ring and a pill with the exact value and unit. Other marks dim, and the point's own label gives way to the pill.
  - `compare { seriesId, from, to, measure: "difference" | "percent-change" }`: rings on both points, a bracket, and a pill such as "18 → 26 parcels/h · +44.4% vs Jan".
  - `scenario { scenarioId }`: matching primitives morph over `moveFrames` (default 24). Rects, ellipses, lines, polylines and same-structure paths (bars) interpolate. Text whose content changes **crossfades** between the two real values, never through invented numbers.
  - `conclude { claim }`.
- **Claims:** `support` is one of:
  - `value { seriesId, index, value, tolerance? }`;
  - `difference { seriesId, from, to, value, tolerance? }`;
  - `percent-change { seriesId, from, to, value, tolerance? }` (default tolerance 0.5);
  - `max { seriesId, index }`;
  - `min { seriesId, index }`.

  `checkChartClaim` recomputes the value from the claim's scenario. The card shows "Checked against the data: 44.4%", or the reason it is not supported.
- **Evaluation:** `evaluateChartStory(spec, frame)` returns the beat, local frame, scenario and morph progress, series opacities, focus, compare and claim. `chartStoryPrimitives(layout, state)` returns the frame's primitives. Both are pure, so seeking is exact.
- **Validation:** `validateChartStory(spec, layout?, { minTextPx })`.
  - **Honesty (errors):**
    - `chart-story-truncated-bars`: bars or areas without a zero baseline.
    - `chart-story-log-bars`: bar lengths on a log axis.
    - `chart-story-claim-unsupported`: the claim doesn't match the data.
    - `chart-story-focus-missing`: a highlighted point has no value; missing is never shown as a point.
    - `chart-story-zero-base`: a percent change from zero.
  - **Structure (errors):** `chart-story-scenario-unknown`, `chart-story-scenario-mismatch`, `chart-story-unit-mismatch`, `chart-story-series-unknown`, `chart-story-index-invalid`, `chart-story-beat-invalid`.
  - **Warnings:**
    - `chart-story-non-zero-axis`: a line chart's axis is truncated. It is disclosed, so say it in narration too.
    - `chart-story-beat-short`: a highlight beat ends before it settles.
    - `chart-story-claim-off-screen`: the claim cites a scenario that isn't on screen.
    - `chart-story-no-conclusion`.
    - `chart-story-text-small`: chart text is under `minTextPx`.
- **Component:** `ChartStoryView` owns no clock.
  - **Props:** `spec`, `frame`, `width` / `height`, `artDirection` (default `editorial`), `safe?` (a normalized rect, such as a ShortSafeFrame content area; default a 5% inset), `styleOverride?` (token overrides), `onDiagnostics`, plus forwarded `div` props and ref.
  - **Lanes:** title, chart and claim lanes are fixed for the whole story, so the chart never moves.
    - The claim lane is sized for the longest measured claim at that output: at least 17% of the safe height in portrait and 20% in landscape, capped at 30%. Above the cap, the view reports `chart-story-claim-overflow` rather than truncating.
    - Claims are wrapped evenly, with no lone last word.
  - **Type and strokes:** `chartStoryStyle` scales the art direction's type ramp to the output's short side, with a floor of 2.6% for small text, and makes strokes 1.5× heavier for video.
  - **Root attributes:** `data-chart-story-beat`, `data-chart-story-scenario`, and `data-chart-story-status` (`pending` until the faces have loaded, then `error` or `ready`).
- **Limits:**
  - One focus or comparison at a time, within one series.
  - Scenarios cannot add or remove series or categories.
  - Recipes whose marks are neither shapes nor same-structure paths crossfade instead of morphing.
  - Claim text is author text: only the number in `support` is checked, not the wording around it.
  - Chart labels use the infographic engine's deterministic width model, not real font metrics.

## Verification (2026-10-22)
- `npx vitest run tests/infographic-chart.test.ts`: four ChartStory cases.
  - **Axes:** one domain and identical axis geometry across scenarios, and the demo validates.
  - **Claims and refusals:** value, percent-change, max and min checks; an overclaim, a truncated bar axis, an out-of-range index, a missing focus value, and a unit mismatch.
  - **Morphs:** line and bar geometry interpolates mid-morph, and every visible text is one of the two layouts' real texts.
  - **Beats and seeking:** series and their legend labels are hidden before their reveal; focus dims others and hands the point's label to the pill; value and compare labels are exact; seek parity holds.
- Rendered in Storybook at 1080×1920 and 1920×1080 and reviewed by the agent: reveal, focus, compare, what-if, back, claim, plus the bar recipe's compare and morph. Every frame was `ready`, the good story raised no diagnostics, and there were no console errors.
- Fixed after review:
  - **Small text:** chart labels were 18 px on a 1080 frame (`chart-story-text-small`), so a video type floor was added.
  - **Claim overflow:** the 16:9 claim overflowed its fixed lane, so the lane is now sized from the measured claim.
  - **Wrong font metrics:** the claim was measured before the web font loaded, so it is now re-measured on load and reported `pending` until then.
  - **Lone last word:** a one-word last claim line is gone, thanks to balanced wrapping.
  - **Overlapping labels:** value labels overprinted the other series. The engine now avoids markers and puts the lower series' labels below.
  - **Covered labels:** focus and compare rings covered the point's own label, which now gives way to the pill. The compare pill now states both values.
  - **Bars:** bars are paths, so the compare rings were missing and the bars crossfaded instead of growing. Path bounds and path morphs were added.
  - **Legend:** it named series before they were revealed.
  - **Spacing:** the source note touched the claim card, so a gap was added.
  - **Axis:** the demo's line chart is zero-based, since the claim is a ratio.
- **Human visual review:** pending. No real dataset has been exercised; all data is a fictional sample.
