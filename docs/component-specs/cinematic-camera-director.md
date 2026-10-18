# Cinematic Camera Director

Implemented development slice: semantic camera planning, existing MG1 evaluation and
optional existing Three.js viewport. No second clock, renderer, audio or export engine.
See [verification](../verification/2026-10-17-cinematic-camera-director.md) for actual evidence.

## Authoring and use

Install `cinematic-camera-director` from the reviewed registry. It includes the typed
CC1 authoring fragment, compiler, targets, trajectories, constraints and React preview.
The separately installable `camera-pose-3d` evaluator has no engine import. Existing
`camera-rig-3d` and default orbit viewport behavior remain compatible.

```tsx
import { CameraSequence, CameraShotRecipe } from "./camera-shot-recipes";
import { createCameraTargetRegistry } from "./camera-targets";
import { compileCinematicCamera, cameraSequenceGroup } from "./cinematic-camera-director";
import { CinematicCameraDirector } from "./cinematic-camera-react";

const targets = createCameraTargetRegistry({ revision: "geometry-v1", targets: [
  { id: "subject", frames: [{ frame: 0, bounds: { min: [-1,-1,-1], max: [1,1,1] } }] },
] });
const source = CameraSequence({ id: "inspection", title: "Inspect a subject",
  fps: { num: 30, den: 1 }, durationFrames: 300,
  output: { width: 1600, height: 900 }, profile: "technical",
  shots: [
    CameraShotRecipe("establish", { id: "overview", target: "subject", durationFrames: 150 }),
    CameraShotRecipe("inspect", { id: "detail", target: "subject", durationFrames: 150,
      transition: { kind: "continuous", durationFrames: 40, allowPartialFraming: true } }),
  ],
});
const result = compileCinematicCamera(source, targets); // run when inputs change
if (result.ok) {
  const group = cameraSequenceGroup(result.plan); // existing MotionDirector children
  // createScene returns the existing CameraScene3D lifecycle contract.
  // <CinematicCameraDirector plan={result.plan} frame={frame} createScene={createScene} />
}
```

Compile outside render or memoize by source, output and target revision. Invalid input
or unsatisfied hard constraints returns `{ok:false, diagnostics}` without a runnable plan.
`serializeCameraSequence` / `parseCameraSequence` save/load bounded, validated JSON.
Scene callbacks and Object3D instances never enter CC1. Persist scene assets/definitions
separately, then rebuild the versioned target registry before recompiling.

## Planning workflow and boundaries

1. Validate CC1; resolve shot occupancy and `at`/`after`/named anchors with the existing
   MotionDirector dependency scheduler. Existing Storyboard validation checks coverage.
2. Resolve absolute world bounds/focus for every integer frame, including moving
   subjects and follow lookahead. Cache snapshots within this compilation only.
3. Plan semantic shots. Existing CameraRig3D supplies orbit directions. Isolated Three
   math supplies quaternion slerp, projection, linear/Bezier/centripetal Catmull-Rom paths
   and arc-length traversal. No renderer is instantiated while planning.
4. Fit all eight corners of the world AABB with an 18-step bounded distance/scale search.
   Evaluate hard/soft constraints at every frame. Choose one fixed correction variant
   across the entire shot from at most 24 deterministic angle/distance candidates.
   This avoids accidental cuts from switching corrections at individual frames.
5. Bake fourteen numeric channels and one discrete projection channel into existing
   MG1. Runtime evaluates channels only; geometry fitting/raycasting never runs there.

`cameraSequenceGroup` imports these same MG1 channels and shot cues into MotionDirector.
Pass its shared evaluation to the preview; targets, camera and assembly use the same
absolute frame. Do not rescale the baked group with intensity/pacing: author camera
profile/timing and recompile first. Changing projection requires an intentional cut.

## Target and pose contracts

`CameraTargetRegistry` supports portable world-bound samples or `createThreeCameraTargets`.
The latter owns no resources. Its absolute updater must reset **all** animated transforms
before measurement. It updates world matrices and measures only registered target subtrees;
precise vertex bounds include supported deformation. Declare collision/occlusion objects
explicitly. Change `revision` when geometry or frame definitions change. Empty bounds,
ambiguous IDs, missing subjects and invalid sample data produce actionable errors.

Portable bounds/focus interpolate linearly; rotation uses shortest-arc quaternion slerp.
Exact samples preserve authored matrices. Intermediate matrices interpolate decomposed TRS;
shear/non-rigid deformation requires dense samples or an absolute Three adapter. Portable
interpolation is not a conservative envelope for geometry that was never sampled.

Poses use world XYZ, normalized XYZW quaternions, local -Z forward/+Y up, perspective
vertical FOV in degrees or orthographic **vertical world span**, positive near/far and
focusDistance metadata. Roll is composed into orientation. The renderer uses these poses
exactly; the legacy orbit portrait-FOV adjustment does not run in pose mode. Frame queries
are integer, clamped to the timeline; no playback history or accumulated deltas are used.

## Recipes and art direction

`CameraShotRecipe` supports establish, dolly, orbit, inspect, follow, crane, fly-through,
turntable, exploded, detail-to-overview and multi-object. `inspect` is a restrained orbit
shorthand. Ordinary shots need semantic targets and duration only. Fly-through needs an
authored `CameraPath`; path control points are intentional spatial art direction.

Profiles editorial/technical/cinematic/expressive expose numeric easing, intensity,
margin, hold fraction, orbit arc, smoothing frames and handoff duration. Optional world
travel/acceleration limits fail explicitly when exceeded. Shot timing controls pacing;
`holdFrames` preserves a reading pause. Follow has leading/trailing placement, symmetric
frame-window smoothing and lookahead. This is offline deterministic smoothing, not a
real-time predictive controller. Multi-target bounds include every required subject;
importance weights affect focal placement and occlusion cost, not permission to clip.

Composition exposes normalized subjectPosition, safeMargin/safeRegion, headroom,
reserveRight and caption exclusion rectangles. Bounds conservatively include empty
space inside the world AABB. Aspect outputs are replanned, never cropped. `aspects`
allows only framing/composition/overrides, keyed by output.variant or ratio (16:9,
9:16, 1:1, or width:height). Position/orientation/focus start/end overrides, independent
focus and position paths, FOV endpoints, orthographic scale, clip planes, roll and
focus-distance endpoints preserve control over unspecified automatic properties.
Manual positions/orientations/distances/paths are locked unless allowCorrections is true.

For **contextual shots** following tiny moving targets, `overrides.distanceScale`
(1–12) scales the solver's fitted camera distance while retaining the authored
screen-space subject placement. It is context-widening only; prefer `wide` or
`medium` establishing views and reserve `close` for a demonstrated detail.
Do not combine `distanceScale` with fixed `distance` or `orthographicScale`
overrides: those conflicting projection controls are rejected.


## Constraints, continuity and limits

Each constraint declares stable ID, hard/soft strength, priority and tolerance. All hard
constraints must pass. Soft priorities compare lexicographically across whole-shot
violation totals. Defaults are hard safe framing, hard declared-box camera clearance
when available, and soft sampled visibility when available. Placement, distance,
clipping, text exclusion and user-specified framing regions are also supported.

Diagnostics include shot, subject, frame/range, constraint, correction attempts and
remaining limitation. Successful corrections are reported. Reports are bounded, but
truncation **cannot** turn a hard failure into success. Solver exhaustion is an error;
it does not certify that no geometric solution exists outside the candidate family.

Continuous transitions repeat the previous final pose exactly at the next first frame
(position, quaternion, focus, lens, clipping and focusDistance), then use smoothstep
translation/optical interpolation and quaternion slerp. Explicit allowPartialFraming
relaxes subject framing only during the declared handoff and emits a warning. Collision
checks remain active. General C1 velocity matching is not inferred: C1 entry requires a
stationary preceding hold and repeats its pose for the first two frames. This is a
frame-domain zero-velocity boundary, not a physical continuous-time C1 guarantee.

Collision checks use camera clearance against declared expanded world boxes and camera
segments at sampled frames. They do not guarantee continuous-time clearance against
moving/deforming obstacles, lens-volume clearance, full-scene navigation or obstacle
completeness. Occlusion uses nine geometric rays per target (focus plus AABB corners),
with perspective or parallel orthographic origins. It is not a pixel/depth visibility
percentage. Transparent/alpha-tested/skinned/morphed occluders are excluded with explicit
diagnostics; hard visibility rejects that incomplete adapter. Volumes, depth of field,
motion blur and physically continuous motion are outside this slice.

## Preview behavior and accessibility

`CinematicCameraDirector` forwards native div props/ref, className, style and existing
viewport options/overlay. Its plan fixes width/height, camera ID and pose mode. A stable
createScene factory retains geometry across frames. Existing resource disposal, WebGL
errors/retry, context recovery, exposure, bounded pixel ratio and reduced-motion final
frame remain. `afterCameraRender` supports perspective and orthographic; legacy
`afterRender` remains perspective-only. Assembly annotations accept either camera.

Provide a meaningful ariaLabel and equivalent caption/transcript; a canvas alone cannot
expose geometric relationships. Storybook uses the existing keyboard-operable scrubber
and shot strip. Projected labels use existing assembly packing and declare show-through
leaders. Their accessibility equivalent is the adjacent explanation. No per-object React
animation loops exist; one scene updater applies independently compiled subject channels.

Reference: **Motion / Cinematic Camera Director / Reference Production**. Five six-second
shots, eighteen independently phased signals, existing four-part exploded CPU, studio/warm
lighting, portrait/square/orthographic and reduced-motion stories. All camera planning uses
the public APIs. The procedural scene is showcase content, not a library-specific preset.
