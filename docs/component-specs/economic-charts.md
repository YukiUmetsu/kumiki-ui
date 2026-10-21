# Economic Charts (E01–E03) — CostWaterfall, LifecycleCostTimeline, BreakEvenComparison

**Scope:** Three typed chart recipes built on the infographic primitive engine, sharing its text layout, art-direction tokens and SVG renderer. They draw **precomputed, authored** values and say honestly what the data does and does not show. Kumiki never prices, discounts, amortizes, taxes or inflates anything.

## Install and inspect
- Registry item: `infographic-economic-charts`. It depends on `infographic-system` and `infographic-view`.
- Storybook: **House Math → Economic Charts**. Each story covers several domains, including non-home subjects (equipment TCO, software migration), plus edge cases. All of them work in 16:9 and 9:16, in four art directions, with frame scrubbing and live diagnostics.

## Minimal usage
~~~tsx
const chart = renderCostWaterfall(spec, { width: 1920, height: 1080, style: "minimal-technical", frame });
<EconomicChartView chart={chart} />;            // accessible SVG (title + summary)
economicChartToSvg(chart);                      // identical static export
chart.diagnostics; chart.summary; chart.anchors; chart.revealEnd;
~~~
`renderLifecycleCostTimeline` and `renderBreakEvenComparison` take the same options. The pure plans are exported for data checks with no rendering: `planCostWaterfall`, `planLifecycleCost` and `analyzeBreakEven`.

## Shared contracts
- **Units.** A `MoneyUnit` names a currency (ISO code) or a plain unit, plus a basis: `nominal`, `real` or `present-value`, with an optional reference such as "2026 dollars".
  - The unit line under the title always states them.
  - Time charts without a basis raise `basis-undeclared`.
- **Exact sums.** Amounts are summed in integer minor units (USD 2 digits, JPY 0), rounding half away from zero, so totals reconcile exactly.
  - Display rounding (`displayStep`) only affects labels, and is captioned.
  - One label precision is used per chart.
- **Missing is not zero.** `null` is drawn and captioned as missing and excluded from totals. Totals that exclude unknowns are marked "known items" or "known".
- **No silent conversion.**
  - A series whose `cadence` (`per-year`/`per-month`) or `basis` differs from the chart's is omitted with `cadence-mismatch` / `basis-mismatch`.
  - Events or jumps off the horizon are omitted with `event-out-of-range`.
- **Provenance.** The footer always states the source. If none is given, it says "Source: not declared", and `illustrative` data is labeled as such. `assumptions` print verbatim.
- **Layout.**
  - Measured type from the art direction; footer captions are laid out bottom-up so they never leave the canvas.
  - Event and crossing labels use guide-aware lanes: no guide line crosses a label, and guides skip panel-label rows.
  - After every render, `checkTextLayout` runs a rendered-bounds guard and reports `text-collision` / `text-outside-canvas`.
- **Determinism.** Output is a pure function of the spec and an absolute `frame`; omitting `frame` gives the final state. `revealEnd` is the frame where the reveal completes.

## CostWaterfall (E01)
- `start`, then ordered `steps` (`delta` with a signed `amount`, or `subtotal` / `total`), then an automatic final total (`total: false` disables it).
- A `stated` amount on a subtotal or total is checked against the derived sum. A mismatch is a `waterfall-total-mismatch` error, captioned on the chart; the bar shows the derived sum.
- Kinds are distinct:
  - increase and decrease carry a sign (+/−) in the label, not only a color;
  - zero is a flat tick;
  - unknown is a dashed placeholder;
  - partial totals are dashed and tinted.
- `baseline: "fit"` zooms the value axis and captions that it does not start at zero.
- `layout: "auto"` uses columns, but switches to rows for portrait canvases or labels that would need more than three lines.
- The reveal grows one bar after another. `highlight` dims the other steps.

## LifecycleCostTimeline (E02)
- Explicit `axis` (years or months; calendar or relative labels). Categories hold one precomputed value per period.
- Events:
  - an event `amount` is added as a separate one-off layer;
  - with `includedIn`, it is a marker only, shown with ◆ and captioned, so nothing is double counted.
- Views are `annual` (stacked; negatives below zero), `cumulative`, or `both` on a shared axis.
  - From the first missing value, the cumulative line is dashed and labeled "known".
  - `focus` dims the other categories and adds the focused category's own cumulative line and share.
- Event guides and dots align to the authored dates.
- The reveal is a constant-speed playhead (`framesPerPeriod`).

## BreakEvenComparison (E03)
- Two or more cumulative series of `cumulative-cost` or `cumulative-savings`, each compared with a `baseline`.
- `analyzeBreakEven` returns per pair:
  - lead states and crossings;
  - the crossing kind: `interpolated`, `at-jump`, `step`, `through-tie` (inside a ±`tolerance` stretch) or `in-gap` (bracketed only);
  - ties, status (`no-crossover`, `single-crossover`, `multiple-crossovers`, `insufficient-data`), `aheadFrom` and `aheadThroughout`.
- **Payback is only labeled with an authored `payback` definition.**
  - `rule: "sustained"` needs a lead that lasts through the horizon end, with no missing samples after it.
  - `rule: "first"` labels the first gain and flags it "(not permanent)" (`payback-not-permanent`) if the lead is later lost.
  - Without a definition, crossings are just "Crossover" or "Crosses back".
- Declared `jumps` are dotted segments and are never interpolated. Cumulative costs that fall without a declared jump raise `non-cumulative`.
- Views are `lines` (upfront values in the header row, end labels, low/high bands), `difference` (option − baseline, shaded by who is ahead, side labels in the gutter), or `both`.

## Limitations
- Text width uses the engine's deterministic advance model, not real font metrics. Bounds are therefore approximate, with a margin; check the final fonts visually.
- The collision guard covers text against text and the canvas. Marks are kept clear of text by construction (gutters, header rows, lanes), not by a geometric test against every line.
- Comparisons with more than about four options, or more than about 60 periods, get dense; split them or aggregate the data upstream.
- The numbers are only as true as the authored data and its source. These components cannot verify prices or forecasts.
