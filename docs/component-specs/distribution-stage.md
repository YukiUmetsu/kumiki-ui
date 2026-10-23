# DistributionStage — distributions with checked axes, probability areas and stated intervals

**Status:** Implementing (first vertical slice). Automated checks and agent screenshot review are recorded below. Human review is pending.
**Catalog phase:** Phase 4 (subject breadth), in [17 — Explainer Visual Components](../17-explainer-visual-components.md#4-high-value-expansion-components-p1). Subjects: machine learning, healthcare education, finance.
**Scope (this slice):** One distribution per stage, drawn from samples, pre-binned counts or densities, or a closed-form normal. Sampling reveal, probability areas, stated intervals and checked axes.

Not in this slice: kernel density estimates, fitted distributions, two-dimensional densities, multiple distributions on one axis, log axes, and any derivation of intervals (intervals are stated inputs).

## Reuse and the gap it fills
- **Reused:**
  - `chartTicks` and the `ChartDomain` type from `infographic/chart.ts`, so axis ticks follow the same nice-step rule as the existing charts.
  - `createCanvasMeasurer` (media-document), so every label is measured with the real face.
  - `evaluateEasing` (motion-track), for fade-in of shading and intervals.
- **Not reused:**
  - The infographic chart renderer (`renderChart`). It draws bars, lines and areas from categorical `ChartSpec`s. Stacked sample blocks, shaded x-intervals and stated brackets need their own geometry, and forcing them through `ChartSpec` would hide the probability and interval semantics.
  - `ChartStory` (`chart-story`). Its beats address categorical series and scenarios. This component uses the same beat idea, but addresses areas and intervals by id.
  - `ScalarField`. It is a two-dimensional field renderer and does not describe one-dimensional distributions.
- **The gap:** the registry had no way to show a distribution whose counts, probabilities and intervals are checked against the stated data, with labels that say where each number came from.

## Install and inspect
- Registry item: `distribution-stage` (`distribution-stage.ts`, `distribution-stage-react.tsx`).
- Storybook: **Visual / Distribution Stage**.
  - **Walkthrough:** three fictional domains, one component. Each runs about 14 seconds and is shown at 9:16 (1080×1920) and 16:9 (1920×1080).
    - **ML:** confidence scores of a fictional model, 240 samples, 10 bins, count axis, probability of a score of 0.9 or higher.
    - **Healthcare education:** a clearly synthetic teaching measurement, 400 samples, 16 bins, count axis, a probability above 6.0 units, and a stated 95% interval for the mean. No patient data.
    - **Finance:** a daily-return normal with illustrative parameters (mean 0 %, standard deviation 1.4 %), density axis, probability of a loss worse than 2.5 %.
  - **Refusals:** samples outside the bins, a density label on whole counts, a count label on density heights, density heights that do not integrate to 1, a count label on a normal curve, a zero-width area, a level of 1.2, an inverted interval, and an interval that does not contain its estimate.

## Minimal usage
~~~tsx
const spec: DistributionStageSpec = {
  id: "scores", fps: { num: 30, den: 1 }, title: "Fictional model: confidence", provenance: "Fictional sample",
  xLabel: "Confidence score (0 to 1)", yAxis: "count", seed: 5,
  source: { kind: "samples", values, bins: { count: 10, min: 0, max: 1 } },
  areas: [{ id: "high", low: 0.9 }],
  beats: [
    { id: "axes", kind: "establish", durationFrames: 45 },
    { id: "reveal", kind: "reveal", durationFrames: 150 },
    { id: "area", kind: "area", areaId: "high", durationFrames: 120 },
  ],
};

<DistributionStageView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Sources** (`source.kind`):
  - `samples` with `bins`: either explicit edges, or `{ count, min, max }` with equal-width bins. Counts are exact. Every sample must be finite and fall inside the bins; the last bin includes its right edge.
  - `normal` with `mean` and `sd` (sd above 0). The density is closed form. Its CDF is the approximation below.
  - `bin-counts` with `edges` and `counts`. Counts must be whole numbers of zero or more.
  - `bin-density` with `edges` and `heights`. Heights must integrate to 1 (within 1e-6).
- **Axis rules** (`yAxis: "count" | "density"`). The label must match the data, so a mislabelled axis is an error:
  - `samples` accepts either. Density heights are count / (n × bin width).
  - `normal` must be `density`.
  - `bin-counts` must be `count`.
  - `bin-density` must be `density`.
  - The y label is generated from `yAxis`, so it cannot disagree with the plotted quantity. Sample histograms add "(each block is one sample)".
- **Probability areas** (`areas: { id, low?, high?, label? }`): shade `low ≤ x < high`. An omitted bound is unbounded on that side.
  - **Normal:** P from the CDF; the label says "under the normal model".
  - **Samples:** the fraction of samples in the range; the label says "from N samples".
  - **Bin counts and bin densities:** bounds must sit on bin edges (`distribution-area-off-bins` otherwise). The label says "from N counted samples" or "from the stated bins".
  - Refused: zero width, inverted, both bounds missing, and a non-finite bound.
- **Stated intervals** (`intervals: { id, estimate, low, high, level, label? }`): drawn as a bracket at their x position with the estimate marked. Labelled as stated. Refused: level outside (0, 1), inverted range, and a range that does not contain its estimate.
- **X range:** the union of the bin edges, the normal range (mean ± 4 sd), every finite area bound and every interval's values. `xRange` may be given explicitly; it is refused if it clips any of them.
- **Reveal:** at most one `reveal` beat per spec.
  - **Samples:** a seeded permutation (mulberry32 with `seed`, default 1) fixes the order. Revealed samples stack into their bins, one block per sample. The block height is one sample on the constant axis, so the end state equals the exact counts.
  - **Bin sources:** bars grow to their exact heights.
  - **Normal:** the curve draws left to right.
  - Without a reveal beat, everything is visible from frame 0.
- **Shading and intervals** fade in over `moveFrames` (default 18) when their beat starts, then hold.
- **Layout:** `layoutDistributionStage(spec, canvas, { measure, family?, baseFontPx?, minFontPx?, readablePx? })`.
  - The base font is 3.6% of the short side. Titles and notes wrap. Area labels and interval labels wrap onto extra rows when they are too wide. Nothing is truncated; a word wider than the frame is an error.
  - Labels are checked for collisions and for leaving the safe area.
- **Evaluation:** `evaluateDistributionStage(spec, frame)` returns the beat, the reveal progress, the revealed sample count, per-bin fill, and the opacity of each area and interval. It is pure, so seeks are exact.
- **Component:** `DistributionStageView` owns no clock.
  - **Props:** `spec`, `frame`, `width` / `height`, `safe?`, `baseFontPx?`, `minFontPx?`, `family?`, `onDiagnostics`, plus forwarded `div` props and ref.
  - Root attributes: `data-km-distribution-stage`, `data-distribution-beat`, `data-distribution-status` (`ready`, `pending` while fonts load, or `error`).
  - Text carries `data-distribution-text`, shading carries `data-distribution-area`, and intervals carry `data-distribution-interval`.
- **Diagnostics** (stable codes; errors refuse the spec, warnings do not):
  - **Errors:** `distribution-axis-mismatch`, `distribution-sample-outside-bins`, `distribution-sample-invalid`, `distribution-no-samples`, `distribution-bins-invalid`, `distribution-count-not-integer`, `distribution-density-invalid`, `distribution-density-not-normalized`, `distribution-normal-invalid`, `distribution-area-zero-width`, `distribution-area-inverted`, `distribution-area-unbounded`, `distribution-area-invalid`, `distribution-area-off-bins`, `distribution-area-unknown`, `distribution-interval-unknown`, `distribution-interval-invalid`, `distribution-level-invalid`, `distribution-interval-inverted`, `distribution-interval-excludes-estimate`, `distribution-range-invalid`, `distribution-range-clips`, `distribution-reveal-repeated`, `distribution-id-duplicate`, `distribution-beat-invalid`, `distribution-font-small`, `distribution-label-overflow`, `distribution-plot-too-small`, `distribution-text-outside`.
  - **Warnings:** `distribution-few-samples` (under 30 samples), `distribution-beat-short`, `distribution-text-small`, `distribution-text-overlap`.

## Normal CDF approximation
- `normalCdf(z)` uses the Abramowitz and Stegun 7.1.26 erf approximation with Φ = (1 + erf(z/√2)) / 2.
- **Stated maximum absolute error:** `NORMAL_CDF_MAX_ABS_ERROR` = 1e-7. The erf bound is 1.5e-7, and halving it for Φ gives 7.5e-8, so 1e-7 holds with margin.
- The density is closed form (`normalPdf`), with no approximation.

## Limits
- Samples are displayed as stacked blocks. Large samples (thousands) would need a binned view; the stage does not switch automatically.
- Interval brackets are placed under the plot, at their x position. They are not drawn inside the plot.
- Normal probabilities for open-ended areas use the full tail, but the drawn curve stops at the x range; shading runs to the edge of the drawn range.
- Labels are measured with the injected measurer. Without a canvas measurer (for example in jsdom), widths are zero and wrapping is not checked.
- The stage does not check whether a sample, model or interval is valid for its real-world meaning. It checks only consistency with the stated data.

## Verification (2026-10-23)
- **Unit tests:** `tests/tmp-distribution-stage.test.ts`, describe block `DistributionStage`, 9 cases. Run with `npx vitest run tests/tmp-distribution-stage.test.ts`: 9 passed.
  - Normal CDF at nine reference points within the stated error, and symmetric.
  - Normal probability areas from the CDF; sample and bin areas with exact labels.
  - Exact histogram counts; density heights integrate to 1.
  - Refusals: samples outside bins, axis mismatches in both directions, non-normalized and fractional data, zero-width, inverted and unbounded areas, off-edge bin areas, invalid levels, inverted and non-containing intervals, and clipped x ranges.
  - Reveal: seeded order, monotone stacking, exact end state, pure frames.
  - Seek parity via `inspectSeekParity` for sample, normal and bin sources, plus a layout that refuses an undersized font.
- **Static checks:** `npx tsc --noEmit -p .` reports no errors in this slice's files. The only errors are in another agent's `map-stage` files. `npx eslint` on this slice's files reports nothing.
- **Storybook (headless, Playwright):** all three domains were seeked to frames 60, 200, 300 and 380 (finance to 350, healthcare to 410). Every stage reached `ready`, and the console had no errors or warnings.
- **Rendered bounds:** `getBBox` on every visible label in 24 stage renders found no label outside the canvas and no overlapping labels. The smallest rendered label is 33 units on the 1080-short-side canvas.
- **Fixed after review:**
  - Area and interval labels overflowed the right edge in portrait output. They now wrap onto extra rows.
  - A reveal reached only 39 of 40 samples on its last frame. It now reaches 1 on the beat's last frame.
  - Sample histograms now say "each block is one sample" on the y axis.
  - The refusal rows inherited an unrelated area, which added errors. Each row now shows only its intended error.
- **Screenshots:** `/private/tmp/claude-501/-Users-yukiumetsu-Documents-projects-services-kumiki-ui/de2e49eb-cf27-4b2a-98ac-b7e32e5a8a21/scratchpad/distribution-stage/`.
- **Human visual review:** pending. All data is fictional or illustrative and generated in the story with fixed seeds.
