# MotionDirector — declarative choreography

Implemented development slice, with Storybook and clean-consumer compilation.
The user prioritized implementation and visual feedback; the broad new unit-test
suite and production release qualification remain deferred. This is not full
MD1 video/audio/hybrid release acceptance. [Execution evidence](../verification/2026-10-17-motion-director.md).

## Installation and ownership

`motion-director` installs the compiler, authoring builders and seven recipes;
`motion-director-react` adds the `MotionDirector` evaluation boundary and hooks.
`AnimationGroup`, `CinematicShot`, `EffectSequence`, `MotionRecipe` and
`ScenePreset` are data builders, not React elements with private clocks.
There is one expanded JSON fragment (`MotionDirection`, schemaVersion 1), compiled
to existing MG1 timelines, VT1 scene snapshots, storyboard records and diagnostics.
No scene wire format, renderer, animation engine, event dispatcher or exporter is
added. No npm dependencies were added. Optional Three.js remains in the existing
`camera-viewport-3d` item.

```tsx
import { compileMotionDirector } from "./components/motion/motion-director";
import { AnimationGroup } from "./components/motion/director-authoring";
import { particleAssemblyRecipe } from "./components/motion/director-recipes";
import { MotionDirector } from "./components/motion/motion-director-react";

const result = compileMotionDirector({
  schemaVersion: 1, id: "assembly", title: "Two pieces become a whole",
  fps: { num: 30, den: 1 }, durationFrames: 180,
  targets: ["part-a", "part-b"],
  children: [AnimationGroup({ id: "opening", mode: "sequence", children: [
    particleAssemblyRecipe.create({ id: "gather", durationFrames: 60,
      subjects: [
        { targetId: "part-a", offset: { x: -80, y: 30 } },
        { targetId: "part-b", offset: { x: 80, y: -30 } },
      ],
    }),
    { kind: "hold", id: "read", durationFrames: 90 },
  ] })],
});
// Show result.diagnostics when !result.ok; never render an invalid compilation.
// A consumer adapter applies samples to its own subject geometry:
if (result.ok) {
  <MotionDirector director={result.director} frame={frame}>
    {({ evaluation }) => renderScene(evaluation.samples)}
  </MotionDirector>;
}
```

`frame` and `renderScene` above are caller inputs, not library globals. The
complete working renderer example is `src/motion/director-demo.tsx`: it passes
one `evaluation` to existing `CameraStage` and `VisualTransformation`, using the
existing `VisualGeometry` slot for per-object offsets/rotation/opacity/emphasis.

## Timing and channel contracts

- Frames are integer and end-exclusive at a positive rational FPS. Numeric `at`
  is parent-local. `{ ref, edge: "start" | "end", offsetFrames }` references a
  globally unique node/cue ID; offsets may be negative. Forward references work.
- `after: [ids]` constrains the start to dependency ends. Without `at`, the start
  moves later as necessary. With `at`, starting before a dependency ends is an
  impossible schedule and fails compilation.
- Sequence uses previous end; `overlapFrames` moves that start earlier. Parallel
  children share the parent start. Stagger uses existing MG1 ordering and an
  integer `intervalFrames`. Explicit child `at` overrides automatic placement.
  Groups nest; `durationFrames` reserves a bounded container or hold. Children
  cannot escape their parent or film. A child's dependency on its inferred
  parent end is a cycle.
- Animation leaves contain existing MG1 `AnimationTrack` data beginning at local
  keyframe 0. Their duration is last keyframe + 1. The compiler places keys into
  global frames and joins disjoint writes of the same target/property. Gaps hold
  the prior value. A changed first value requires explicit `entry: "cut"`.
- Overlapping writers require every writer to select the same MG1 `priority` or
  `additive` policy. Equal overlapping priorities fail. These explicit blend
  channels are **clip-scoped** with MG1 holds: they emit only inside their
  ranges. Author the resting state separately if it must outlive the clips.
- `motionTimelineGroup` imports existing camera/preset/effect channels, preserving
  explicit or implicit MG1 easing. It supports track, sequence, parallel,
  stagger and empty hold nodes. Source FPS must match the host rational rate.
  Clipping holds, wrapping repeat, constraints and transform hierarchies are
  rejected with instructions to keep those scopes in MG1 or supply baked tracks.
  Their semantics are not silently approximated.

## Scenes, shots and effects

Scenes are existing VT1 `VisualScene` snapshots. A transformation names
`fromScene`, `toScene`, duration and optional existing VT1 mappings/strategy/
fallback. Its first frame is exactly the source; its last is the destination.
Private lanes are namespaced, and their active ranges use MG1 hold scopes.
Simultaneous transformations cannot own the same semantic identity. Disjoint
transformations can run concurrently. VT1's own explicit fallback diagnostics
remain visible. Its 2D geometry/paint/identity limits still apply.

`CinematicShot` retains claim, objective, focus, camera reference, labels,
narration cue, static fallback and bounded children. Shots must tile the film
when supplied, using the existing storyboard validator. Camera references need
declared targets and supplied channels. Import cameras from `createCameraTimeline`
or `createCameraRig3D`; no camera engine is reproduced here. Effects are ordinary
existing MG1 tracks composed with `EffectSequence`/`motionTimelineGroup`.

The compiler resolves identities and timing, not visibility or automatic camera
framing. Consumers author safe regions, caption placement and occlusion policies
using their renderer/scene contracts. An arbitrary declared target is not proof
that a renderer paints it or that its labels fit.

## Recipes, presets and independent controls

`MotionRecipe<P>({ id, version, build }).create(parameters)` provides a typed,
trusted local construction function. Conditional construction occurs here.
Persist the expanded data, not the function; provenance retains recipe ID,
version and scalar parameters. Full object/content parameters are embodied in
the expanded tracks and scenes. No executable recipe registry is loaded from JSON.

Seven reusable builders: `particleAssemblyRecipe`, `sequentialDataFlowRecipe`,
`diagramConstructionRecipe`, `cinematicRevealRecipe`,
`synchronizedTransformationsRecipe`, `technicalExplanationRecipe`, and
`sceneContinuityRecipe`. All accept content/target IDs and timing. `ScenePreset`
holds separately authored aspect variants and merges caller profile overrides.

`profile.intensity` (0..1) changes only channels explicitly marked with a typed
`intensityOrigin`; it never scales time, semantic visibility or factual values.
`pacing` (0.25..4) scales the entire authored frame domain once with nearest-frame
rounding, including cues, camera keys and holds. Collapsed keys are errors.
External audio alignment must be regenerated for a changed pace; no audio is
stretched automatically. `personality` selects precise/gentle/expressive easing
where none is authored; opacity uses bounded easing. Explicit easing and imported
MG1 easing take precedence, including camera movement. Pacing may change total
length outside the default reference's 54 seconds.

## Cues, interruption and persistence

Typed payloads cover event names, narration text/language/optional asset reference,
speech markers referencing a narration span, sound effects with asset/gain, and
music beat/bar references. Cue IDs are timeline anchors. `useDirectorCues(kind)`
returns active, narrowed payloads; `directorCuesBetween` queries an interval.
Queries never fire side effects. The consumer owns seek/replay/deduplication,
audio asset resolution, timing import and playback. The reference uses editorial
narration and speech markers, with no recorded voice or soundtrack.

`interruptDirectorChannel` uses MG1 `applyInterruption` for the seed and measured
velocity, preserving the complete original eased curve under a history hold and
activating the replacement in a future hold. Before/event frames are unchanged.
It returns a runtime timeline: serialize that timeline with `serializeTimeline`.
The original source recipe remains immutable. It targets a single unblended
top-level compiled channel; subsequent retargeting of an already split runtime
timeline or blended scopes requires consumer-authored MG1 scope handling.
This is C0 continuity; reported velocity is available for a caller spring, and
C1 is not guaranteed. VT1 retains its own immutable scene-retargeting API.

`serializeMotionDirection` validates and stably serializes the authoring fragment;
`parseMotionDirection` validates unknown JSON and recompiles it. Non-finite,
executable, cyclic, reserved-key, excessively deep/large or malformed data fail
with structured diagnostics. Unknown schema/node/value kinds fail. Arbitrary
field extensions are not interpreted as executable instructions or fetched URLs.
Dependencies, property conflicts and source provenance appear in `schedule`,
`sourceMap`, `diagnostics`, `cues`, `shots` and `transformations`.

## Rendering, accessibility and current limits

`MotionDirector` forwards native div props/className/style/ref, owns no clock and
evaluates MG1 once per requested frame. Its render function receives the whole
scene's samples; hundreds of children need no independent React state or RAF.
It still renders a React tree for that frame; it is not a GPU batching engine.
MG1's evaluator and VT1's painter retain their existing per-evaluation allocations.
Compiled schedules/maps/scenes are reused and inactive VT channels are gated.

System reduced motion selects the final complete composition. Pass its resolved
frame and sample to adapters with `reducedMotion={false}` so they use that same
selection. The existing scrubber owns playback and keyboard seeking. Storybook
includes shot navigation, two themes, both aspects, reduced motion, shared-sample
3D camera/subject movement and a schedule/cue inspector. Scene figures have text
descriptions; no per-frame live announcements occur. Full screen-reader, CJK/RTL,
zoom, automated browser/a11y and cross-device GPU acceptance remain unqualified.
No encoded video, audio synthesis/mixing or exporter was built.
