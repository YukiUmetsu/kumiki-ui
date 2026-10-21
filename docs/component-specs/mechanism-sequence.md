# MechanismSequence (V08) — coordinated operations on moving parts

**Scope:** Frame-addressed operations across an assembly's pivots: valves, doors, drawers, fans, compressors and indicator lights. The plan is pure; the Three.js rig applies it to any HeroAsset's named pivots. There are no physics, forces or flow rates.

## Install and inspect
- Registry items: `mechanism-sequence` (plan + evaluator) and `mechanism-sequence-three` (`createMechanismRig`). The equipment pivots come from `createHomeEquipment3D` (`domain-home-3d`): condenser `unit.fan` and `unit.status-light`, tankless `unit.valve-gas|cold|hot` and `unit.display`.
- Storybook: **House Math → Mechanism Sequence**, with three examples:
  - condenser start-up and coast-down;
  - tankless heater commissioning and shutdown;
  - kitchen appliances opening and closing in a real house interior.

## Minimal usage
~~~ts
const plan = compileMechanism({ id: "start", joints: [
  { id: "unit.fan", motion: { type: "spin", axis: [0, 1, 0], rpm: 1075, visualScale: .12, spinUp: 45 } },
  { id: "unit.valve-gas", motion: { type: "declared" } }],
  operations: [{ id: "gas", joint: "unit.valve-gas", at: 10, to: "open" }, { id: "fan", joint: "unit.fan", after: "gas", to: "on" }] });
const rig = createMechanismRig(asset.parts, plan);
// HeroAssetViewer onPose: (a, s) => { a.pose?.({ id: null, frame: 0 }); rig.apply(s.frame); }
evaluateMechanism(plan, frame); // { joints: { id: { value, rpm?, moving } }, active, labels }
~~~

## Contracts
- **Motions:**
  - `rotate` and `slide`, with an explicit axis and `range`;
  - `declared`, which drives the pivot's own `userData.motion` from 0 to 1 (the home-kit convention for doors and drawers);
  - `spin`, at an authored `rpm` with `spinUp` and `spinDown` ramps;
  - `toggle`, shown as visibility or by scaling the emissive intensity toward `material.userData.onIntensity`.
- **Scheduling.** Operations start at `at` or `after` other operations, plus `delay`.
  - Unknown joints, unknown dependencies and cycles throw.
  - Targets outside a joint's range are clamped and reported (`joint-limit`).
  - Overlapping operations on one joint are errors (`operation-overlap`).
  - `open`/`close` on a non-declared joint is a warning.
- **Determinism.** Rotations and slides ease between authored values. Spin phase is the exact integral of a piecewise-linear rpm curve, so any frame, in any seek order, gives the same angle (verified against the closed form).
- **Honest speed.** The real rpm is reported per frame. A `visualScale` (to avoid strobing at video frame rates) is declared as a `spin-scaled` diagnostic and stated in the story.
- **Rig.** Rest transforms are captured at creation, and every apply starts from rest. Missing pivots, or declared joints without `userData.motion`, fail with the available part list. `reset()` restores transforms, visibility and emissive levels.

## Limitations
- Joints are independent; there are no kinematic chains, gears or linkages (author a joint per pivot and coordinate them with `after`).
- Emissive toggles change material intensity; share a material between pivots only when they should light together.
