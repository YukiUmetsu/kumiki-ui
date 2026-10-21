# AnimatedMetric (E06) — numbers that change without misleading

**Scope:** Count-ups, steps and changing quantities for costs, energy, efficiency, savings and percentages. The plan is pure; the React view renders it with a stable layout.

## Install and inspect
- Registry item: `animated-metric` (`compileAnimatedMetric`, `evaluateAnimatedMetric`, `AnimatedMetricView`). It depends on `motion-track` for MG1 easing.
- Storybook: **House Math → Animated Metric**. Examples: savings, kWh, AFUE percent, discrete repair counts, a pending insurance quote, yen with a Japanese label, and compact headlines. It also shows a narrow portrait column.

## Minimal usage
~~~tsx
const plan = compileAnimatedMetric({ id: "savings", label: "Lifetime savings", format: { kind: "currency", currency: "USD" },
  keyframes: [{ frame: 0, value: 0 }, { frame: 60, value: 14200 }], delta: "both" });
<AnimatedMetricView plan={plan} frame={frame} size="hero" goodDirection="up" />;
evaluateAnimatedMetric(plan, frame); // { display, transitioning, settled, status, delta, target, label }
~~~

## Contracts
- **Facts are keyframes.**
  - `interpolate` counts between two **known** values, eased (default `ease-out-cubic`), within an optional `countFrames` window that ends at the keyframe.
  - `step` jumps at each keyframe. Use it for discrete facts such as counts of events or a quoted price.
- **Exact rest values.** At a keyframe the display is the authored value at the declared precision. A count never shows the target before it reaches it, and never overshoots.
- **One precision per metric.** Currency uses whole units unless an authored value has minor units. Percent takes fractions (`0.961` → `96.1%`). `tickStep` calms in-between digits.
- **Labeled transitions.** Every frame reports `transitioning` and `settled`. The view dims in-between values by default (`transitions: "dim"`). Screen readers get the target value, not each tick.
- **Unknown is not zero.** A `null` keyframe shows `unknownText` (default "Unknown") and is never counted to or from; this raises a `value-unknown` warning. An invalid currency code is an error, and the value is shown as a plain number. Empty, out-of-order or non-finite keyframes throw.
- **Change badges.** `delta: "absolute" | "percent" | "both"` compares with the previous known value. `goodDirection` colors the badge (for costs, down is good). Direction is also shown with an arrow and a sign, not by color alone.
- **Stable width.** `plan.reserve` and `plan.reserveDelta` are the widest strings the metric can show. The view reserves them invisibly, with tabular digits.

## Limitations
- The width reserve compares string lengths, then lets the font render the widest candidate. Proportional fonts can still vary by a pixel or two between glyphs.
- No odometer or rolling-digit effect; the digits change in place.
