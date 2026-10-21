# FlowPath (V04) — illustrative flow along authored paths

**Scope:** One renderer-neutral grammar for directional motion of air, heat, water, refrigerant, rain, power, money or goods. Shares MG1's absolute frames and `samplePath` for 2D motion paths; adds an N-D polyline sampler for 3D. No timeline, audio or physics.

## Install and inspect
- Registry items: `flow-path` (core + `FlowPathSvg`) and `flow-path-three`.
- Storybook: **House Math → Flow Path** (house HVAC / water / rain in 3D across presets and five styles; solar, conveyor and cash-flow schematics in 2D) and **House Math → Home Kit 2D** (flows on the cross-section).

## Minimal usage
~~~ts
const plan = compileFlowPath({ id: "supply", path: points, cornerRadius: .15, style: "particles", speed: 1.4, spacing: .6, drawOnFrames: 24,
  jitter: { amount: .04, seed: 3 } });
const frame = evaluateFlowPath(plan, f);           // pure, any seek order
<FlowPathSvg frame={frame} color="#58b7ff" />;      // 2D
flowThree.update(frame);                           // 3D (createFlowPathThree)
~~~

## Contracts
- **Paths:** 2D/3D point lists, an MG1 `MotionPath` (flattened with `samplePath`) or `(frame) => points` for moving anchors. Optional fillet radius rounds orthogonal routes. Mixed dimensions, fewer than two points or zero length throw.
- **Styles:** `arrows`, `particles`, `pulse` (markers with position + tangent), `streaks` (path intervals), `ribbon` (phase-driven dash/stripe). `direction: "reverse"` flips travel; the drawn interval follows the source end.
- **Determinism and bounds:** marker *k* sits at `phase + k·spacing`; each carries a stable `id` (spacings travelled) that persists across frames, so seeded jitter never shimmers. `maxMarkers` (≤ 512, default 64) caps output and reports `density-capped`; the Three.js adapter has fixed instance capacity.
- **Honesty:** frames carry `semantics: "illustrative"` unless a magnitude with `meaning: "measured"`, unit **and** source is supplied; a measured value without a source is a `magnitude-unsourced` error diagnostic. Speed and spacing never encode physical rates by themselves.
- **House adapter:** `houseFlowSpecs(layout)` / `houseSectionFlows(section)` produce flows on the same routes the ducts and pipes are built from (refrigerant split into liquid out / suction back).

## Limitations
- Per-marker opacity is expressed as scale in Three.js (single-material instancing).
- No collision between parallel flows; offset parallel lines explicitly (as the line set does).
