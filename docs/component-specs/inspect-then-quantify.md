# InspectThenQuantify (R01) — from the object to the numbers

**Scope:** A composition recipe, not a new timeline. It establishes the whole object, pushes the camera to a semantic part, reveals the inside with the asset's own action, anchors a callout, then gives the screen to a linked chart, which plays its own reveal. Every piece is an existing component: `HeroAssetViewer` views, asset actions, the economic charts.

## Install and inspect
- Registry item: `inspect-then-quantify` (`compileInspectThenQuantify`, `evaluateInspectThenQuantify`, `projectWithHeroView`).
- Storybook: **House Math → Inspect Then Quantify**, with three recipes in 16:9 and 9:16:
  - roof → `roof-peel` → CostWaterfall;
  - outdoor condenser → `condenser-run` → BreakEvenComparison;
  - tankless water heater → callout → tank-vs-tankless break-even.

## Minimal usage
~~~ts
const plan = compileInspectThenQuantify({ id: "roof", subject: asset.bounds, target: { id: "roof", label: "the roof", bounds: roofBounds },
  reveal: { action: "roof-peel", frames: 90 }, annotation: { text: "Shingles, underlayment and decking" },
  chart: { title: "Roof cost", revealFrames: chart.revealEnd }, aspect: "16:9" });
const f = evaluateInspectThenQuantify(plan, frame);
// <HeroAssetViewer {...f.view} action={f.action?.id} actionFrame={f.action?.frame} />, chart at f.chart rect with frame f.chartFrame
~~~

## Contracts
- **Beats:** `overview`, then `focus`, then `reveal` (if an action is given), then `annotate` (if text is given), then `transition`, then `quantify`. The default lengths can be overridden with `timing`.
- **Camera.** The view interpolates from the overview (subject center, zoom 1) to the focus (target center; zoom fitted to the target unless authored). Zoom interpolates geometrically, so the push feels even.
- **Checks.**
  - `target-outside-subject` and `chart-missing` are errors.
  - `hold-short` flags labeled beats shorter than `minHold` (default 24 frames).
  - `target-offscreen` projects the target's corners with the viewer's own `fitHeroCamera` at the focus beat, for the declared aspect.
- **Layout.** During the transition the scene shrinks toward the left (16:9) or the top (9:16), and the chart takes the rest. `scene` and `chart` rects are normalized, so any stage size works.
- **Final state.** `final` is true at the end of the quantify beat; the composition holds on the chart.
- **Determinism.** Evaluation is pure per frame; `chartFrame` is the chart's own reveal clock.

## Limitations
- The callout is a simple anchored label. Use SemanticCalloutLayer for collision-aware multi-label scenes.
- Occlusion of the target is not tested, only framing; choose views where the part is visible, or reveal it first.
