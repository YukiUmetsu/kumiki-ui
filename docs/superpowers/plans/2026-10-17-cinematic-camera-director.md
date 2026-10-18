# CinematicCameraDirector implementation plan

**Goal:** turn semantic target/shot instructions into deterministic, constrained
camera choreography and a 30-second inspectable Storybook production.

**Architecture:** existing MotionDirector resolves shot timing; compile-time
target sampling, Three.js math and bounded framing/geometry checks produce baked
numeric MG1 pose channels. The existing CameraViewport3D gains an additive pose
mode. Its orbit mode, renderer lifecycle and frame clock remain intact.

**Spec:** the user's attached CinematicCameraDirector brief, sections 1–21.
**Stack:** existing React/TypeScript, MG1, Three.js 0.186.1; no new packages.

## Constraints and review focus

- Scene/theme-specific content stays in the showcase; public APIs use semantic IDs.
- Portable specifications contain data, never Object3D instances or callbacks.
- Geometry/absolute-frame updates stay in an isolated Three target adapter.
- Hard failures return diagnostics and no runnable plan; corrections are bounded.
- Test moving parents, absent/deformed geometry, narrow aspects, contradictory
  manual overrides, quaternion antipodes and continuous boundary constraints.
- Preserve compatibility of existing orbit viewport and exploded annotations.
- Do not claim scene-wide collision avoidance, physical C1 or exported video.

## A. Targets and generalized pose

- [ ] Add failing tests for perspective/orthographic pose sampling, normalized
  quaternions, arbitrary-order moving targets, missing/ambiguous identities.
- [ ] Implement camera pose types/evaluation using existing MG1 numeric channels;
  target registries accept serialized frame bounds or isolated Three adapters.
- [ ] Check old camera tests before extending the viewport.

## B. Shot definitions and trajectories

- [ ] Add tests for ten semantic recipe kinds, splines, arc-length traversal,
  target-relative paths and manual position/orientation/lens overrides.
- [ ] Reuse CameraRig3D for orbit trajectories, Three curve/quaternion math at the
  boundary, and MotionDirector for start/end/anchor dependency resolution.

## C. Framing and constraints

- [ ] Test projected box corners, portrait/square re-planning, safe regions,
  subject placement, captions and multi-target weighted bounds.
- [ ] Implement bounded distance fitting and candidate correction with explicit
  hard/soft priorities. Test collisions, segment clearance, occlusion and failure.
- [ ] Preserve manual locks. Report transparent/skinned/raycast limitations.

## D. Compilation and continuity

- [ ] Test cuts, continuous handoffs, unavailable C1, frame-seek determinism and
  serialization. Bake every integer-frame pose into existing MG1 tracks.
- [ ] Add the existing viewport's pose mode and general-camera annotation hook;
  preserve legacy callbacks and orbit framing policy.
- [ ] Expose camera cues and a MotionDirector group import through public APIs.

## E. Reference and delivery

- [ ] Build five motivated shots over a procedural computer architecture with
  15+ independently moving objects, tracked signals and existing exploded-view
  separation. All camera positions come from public planning APIs.
- [ ] Add Storybook playback/shot navigation, both aspects, recipes, diagnostics,
  manual controls and a static reduced-motion state. Inspect actual playback.
- [ ] Review code, run focused tests/typecheck/lint/build, validate registry and
  compile a clean consumer. Record measurements, screenshots and limitations.
- [ ] Update the component contract and authoritative inventory/roadmap/schema
  and adapter decision notes. Leave full production release gates honest.
