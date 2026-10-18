# MotionDirector implementation

The user requested implementation and Storybook first, deferring a broad unit-test
suite. Work in the current checkout so its running Storybook can show the result.

1. Add a versioned, data-only choreography fragment: animation leaves, nested
   sequence/parallel/stagger groups, holds, named cues, shots and VT1 transitions.
   Reuse MG1 value types, validation, stagger ordering and interpolation.
2. Resolve start/end dependency vertices once. Reject cycles, missing references,
   negative/out-of-bounds timing and conflicting property writers. Join successive
   writes into one MG1 channel, preserving holds and requiring explicit cuts.
   Return diagnostics, schedule/source maps, scene references and storyboard data.
3. Supply typed recipe construction with configurable parameters and conditional
   authoring. Persist expanded data and provenance, never executable builders.
   Independent intensity (opt-in amplitude), pacing and personality controls.
4. Add a single-evaluation React boundary, passing its MG1 samples to existing
   camera and VT1 adapters. No clock, renderer, audio transport or event dispatcher.
   Reuse applyInterruption for C0 retargeting and report velocity separately.
5. Build a 54-second reference, 36 independent subjects, six editorial beats,
   seven reusable recipes, separately authored landscape/portrait arrangements,
   shot navigation, cue inspection and parameter controls. Include an optional
   existing 3D camera-adapter example without importing Three.js into core.
6. Register installable compiler/builders and adapter. Update authoritative docs.
   Run TypeScript, lint/build, relevant existing regressions and clean consumer
   compilation. Inspect Storybook frames and playback; record actual evidence and
   remaining release gates, without claiming full MD1 video/audio qualification.
