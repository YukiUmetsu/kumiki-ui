# ScaleComparisonStage — compare real size, time or quantity on one labelled scale

**Status:** Implementing, first vertical slice. Automated checks and agent screenshot review are recorded below. Human review is pending. Nothing here is verified production output.
**Catalog phase:** Phase 4 (subject breadth), in [17 — Explainer Visual Components](../17-explainer-visual-components.md#4-high-value-expansion-components-p1). Subjects shown: astronomy, architecture, economics.
**Scope (this slice):** Items of one dimension (length, time, count or quantity) on one shared scale: columns from a shared baseline, circles drawn to true linear scale, or dots on a linear or log track. Exact unit conversions. A compare beat that states an exact ratio and its rounding rule and shows it, by stacking the smaller item inside the larger. A convert beat that prints its arithmetic. Reveal in declared or size order.

Not in this slice: CJK or RTL line breaking (words are the wrap unit), per-item axes, broken or truncated axes, currency, uncertainty intervals, animated unit changes, and any claim that a sourced value is correct.

## Reuse and the gap it fills
- **Reused:**
  - `createCanvasMeasurer` (media-document): every label is measured with the real face.
  - `niceStep` (infographic-primitives): the 1/2/2.5/5 × 10ⁿ step for linear ticks.
  - `evaluateEasing` (motion-track): reveal and emphasis easing.
  - `Diagnostic`, `RationalFps`, `Rect` (motion-types).
- **Named adapters from the roadmap, and the decision for each:**
  - `DimensionOverlay`: not used. It draws dimension lines on 3D or 2D measured geometry. A shared scale of independent items is a different shape, so it is not reused.
  - `MeasureUnits`: not used. It formats metric or imperial only, with no exact conversion factors, so this slice carries its own exact unit catalog.
  - `ComparisonStage`: not used. It compares subjects at one scale in metres, drawn as objects. This slice compares values on an axis.
- **The gap:** no registry component puts values of different magnitudes on one labelled, unit-checked scale, with exact conversion arithmetic printed on screen.

## Install and inspect
- Registry item: `scale-comparison-stage` (`scale-comparison-stage.ts`, `scale-comparison-stage-react.tsx`). Dependencies are the registry items named above.
- Storybook: **Visual / Scale Comparison Stage**.
  - **Walkthrough:** three domains, one component, each at 9:16 (1080×1920) and 16:9 (1920×1080).
    - Astronomy: Earth, Jupiter and the Sun as circles at true linear scale, with a labelled ruler. The compare beat lays 109 Earths across the Sun, with a ×6 magnifier because the true-scale Earths are only a few pixels wide. Values are approximate, from named sources (NASA Planetary Fact Sheet; IAU 2015 Resolution B3).
    - Architecture: fictional building heights as columns. The compare beat stacks Mill House 13.3 times up Harbor Tower.
    - Economics: fictional regional grain quantities as columns, with a megatonnes-to-tonnes conversion.
  - **Refusals:** a length compared with a time, a real value without a source, bars on a log scale, circles on a log scale, labels that cannot share a lane, a unit not in the catalog, a conversion into another dimension, and a compare beat before any reveal.

## Minimal usage
~~~tsx
const spec: ScaleComparisonSpec = {
  id: "radii", fps: { num: 30, den: 1 }, axisUnit: "km", scale: "linear", marks: "circle",
  items: [
    { id: "earth", label: "Earth, mean radius", value: 6371, unit: "km", kind: "real", source: "NASA Planetary Fact Sheet" },
    { id: "sun", label: "Sun, nominal radius", value: 695700, unit: "km", kind: "real", source: "IAU 2015 Resolution B3" },
  ],
  beats: [
    { id: "reveal", kind: "reveal", order: "declared", durationFrames: 120 },
    { id: "compare", kind: "compare", a: "sun", b: "earth", sig: 3, durationFrames: 150 },
    { id: "convert", kind: "convert", itemId: "sun", unit: "mi", durationFrames: 150 },
  ],
};

<ScaleComparisonStageView spec={spec} frame={frame} width={1080} height={1920} onDiagnostics={report} />
~~~

## Contract
- **Units:**
  - Four dimensions: length (base m), time (base s), count (base item) and quantity (base kg).
  - Each unit has an exact factor to its base: an integer, a decimal, or `num/den`. Factors are BigInt rationals, so `1 mi = 1,609.344 m` and `1 ly = 9,460,730,472,580,800 m` print exactly.
  - Extra units can be added through `units`. A duplicate symbol or an unparseable factor is an error.
- **Items:** `{ id, label, value, unit, kind: "real" | "illustrative", source? }`.
  - A `real` item must name a source. Sources are listed once, in the footer.
  - Honesty is stated once, not on every item: a stage whose items are all illustrative shows an "Illustrative values" badge, and one whose items are all real shows "Values from named sources". Only a stage that mixes kinds labels each item ("Illustrative" or "Source: …").
  - Values are typed by the author and are never invented or rounded in the data.
- **Scale:**
  - One shared scale. `linear` starts at zero; `log` uses decades.
  - `marks: "bar"`: columns rising from one baseline, with gridlines and labels in a left gutter. Linear only.
  - `marks: "circle"`: each circle's radius is the value, drawn to one linear scale on one baseline. A labelled ruler (a nice length of about a third of the largest diameter) shows the scale. Linear only.
  - `marks: "dot"`: positions on one track, linear or log, with labels alternating above and below.
  - Ticks are nice steps on linear scales and decades on log scales. Tick labels are in `axisUnit`.
  - The layout reports `pxPerBaseUnit` on a linear scale.
- **Beats:**
  - `establish`: the scale, nothing revealed.
  - `reveal { order: "declared" | "size-ascending" | "size-descending", itemIds? }`: items appear one after another. Rows keep declared positions, so nothing reflows.
  - `compare { a, b, sig? }`: the readout card shows "≈ N×", the relation "A ÷ B", and the unrounded ratio with its rounding rule. `sig` defaults to 3. On the stage, the smaller item is stacked inside the larger: column bands of the smaller column's exact height, or beads of the smaller circle's exact diameter laid across the larger circle. Beads smaller than a few pixels get a magnifier that shows the same geometry enlarged by a stated whole factor ("×6"). Tiles are capped at 400; beyond that the readout alone carries the ratio.
  - `convert { itemId, unit, sig? }`: prints the factors and the arithmetic, then the rounded result. `sig` defaults to 4.
  - Any beat may carry a `caption`.
- **Layout:**
  - `layoutScaleComparison(spec, box, { measure, maxFontPx, minFontPx, readablePx?, family?, inset? })` picks the largest label size with no error.
  - Every label is measured and wrapped. A word too wide for its line is an error, never cut.
  - Text blocks keep a quarter of the font size between them. Overlaps are `scale-label-collision`.
  - Fixed regions: a header (eyebrow naming the scale, dimension and unit; the title; the honesty badge), the stage, a readout card (a right-hand column on wide outputs, a band above the footer on tall ones, sized for its longest beat), and a footer with sources and the footnote.
  - Units are never re-cased (Mt is not MT). Numbers and their units are joined by a non-breaking space and never wrap apart. A large readout shrinks to fit its card on one line, never below the caption size.
  - Secondary text never goes below `minFontPx`.
- **Evaluation:** `evaluateScaleComparison(spec, frame)` returns the beat, the local frame, reveal per item and any emphasis. It is pure: no clock and no randomness.
- **Validation:** `validateScaleComparison(spec, layout?)`.
  - **Errors:** `scale-unit-unknown`, `scale-unit-dimension`, `scale-unit-duplicate`, `scale-unit-factor-invalid`, `scale-mixed-dimension`, `scale-real-unsourced`, `scale-log-bars`, `scale-log-circles`, `scale-log-nonpositive`, `scale-value-invalid`, `scale-value-negative`, `scale-item-duplicate`, `scale-item-unknown`, `scale-beat-duplicate`, `scale-beat-invalid`, `scale-beat-item-unrevealed`, `scale-compare-same`, `scale-sig-invalid`, `scale-label-collision`, `scale-layout-overflow`, `scale-text-unbreakable`, `scale-plot-narrow`.
  - **Warnings:** `scale-text-small` (labels under the readable size) and `scale-beat-short` (a compare or convert beat shorter than two emphasis fades).
- **Component:** `ScaleComparisonStageView` owns no clock.
  - **Props:** `spec`, `frame`, `width`, `height`, `safe?`, `maxFontPx?`, `minFontPx?`, `family?`, `onDiagnostics`, plus forwarded `div` props and ref.
  - Root attributes: `data-km-scale-comparison`, `data-scale-comparison-beat`, `data-scale-comparison-status` (`ready`, `pending` until web fonts load, or `error`).
  - Labels carry `data-scale-text`; items carry `data-scale-item`.
  - Colours come from `--km-scale-*` tokens with fallbacks: surface, card, rule, grid, baseline, ink, muted, mark, mark-soft, tile and tile-soft. Marks are solid gradients. Items not being compared dim to 30%.
  - Circles smaller than 9 px get a dashed locator ring, so a true-to-scale speck can be found. The circle itself is still drawn at its true size.

## Limits and open questions
- Word wrapping is at spaces only. A CJK or unspaced label that exceeds its line is refused with `scale-text-unbreakable`; it is not broken.
- Values are JavaScript numbers. Ratios and conversions are computed from exact factors and float values, then rounded with the stated rule. Very large values lose precision beyond about 15 significant figures.
- Compare and convert beats are shown, not animated between values.
- The walkthrough's astronomy values were written from memory of the named sources. They are approximate and have not been checked against those sources in this work. A reviewer must check them before any use.
- Ratio rounding: the brief's example "≈ 109×" is three significant figures; two would give "110×". The default is 3 and is configurable per beat.
- No randomness is used, so no PRNG is needed. Seek parity is verified rather than assumed.
- Circles sit side by side. On a 9:16 output, the small items' label slots limit how large the biggest circle can be.
- The magnifier is a visual aid: its factor is a whole number chosen for visibility, and it is printed on the lens.
- Open: whether the readout column width (34%) should be a token, and whether dot labels should use leader lines when a label is clamped at the edge.

## Verification (2026-10-23)
- `npx vitest run tests/visual-constraints.test.ts`: nine cases in `describe("ScaleComparisonStage")`. Each case pins one behaviour:
  - exact units and conversion text;
  - ratio and rounding;
  - refusals;
  - one honesty badge, or per-item notes when kinds are mixed;
  - wrapping and collisions;
  - circles at true scale on one baseline, with the ruler;
  - no log circles;
  - unit case kept, and numbers kept with their units;
  - ticks;
  - reveal, and seek parity.

  The tests use a fixed-advance stand-in measurer, because jsdom has no canvas.
- `npx tsc --noEmit -p .`: no errors in this slice's files.
- `npx eslint` on the four files: clean.
- Storybook (headless, Playwright, 2× device scale): all three domains at frames 30, 120, 240 and 400, in both outputs, reached `ready` with no diagnostics and no console errors.
- Screenshot review by the agent (not human review): the walkthrough shows reveal, compare and convert in both outputs; labels do not overlap; the landscape beat panel sits in its own column. Fixes made after review: beat panel moved to a column in landscape (the convert beat had pushed the plot below the stage); tick labels and label-to-bar gaps were widened; base-unit factors are omitted from conversion arithmetic.
- **Redesign after user review (2026-10-23).** The first version was judged messy, and the stage was redesigned:
  - **Hero visuals:** columns and true-scale circles replace dashed bars and log dots.
  - **Readout card:** one card with a large exact number, instead of loose panel text.
  - **Labelling:** one honesty badge and one source footer, instead of a note under every item.
  - **The compare visual:** stacked bands, or beads with a magnifier.

  The redesign also fixed three defects found in review:
  - The eyebrow uppercased units ("Mt" became "MT").
  - "2,400,000 t" wrapped between the number and its unit.
  - The true-scale beads read as a single seam.

  After the redesign, all three domains rendered `ready` with no diagnostics and no console errors at the reveal, compare and convert beats in both outputs.
- **Human visual review:** pending. Astronomy values are not verified against their sources.
