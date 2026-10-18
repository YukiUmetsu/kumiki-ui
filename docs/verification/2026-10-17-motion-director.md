# MotionDirector execution evidence — 2026-10-17

The user requested implementation and Storybook first, deferring the broad new
unit-test suite. Delivered a choreography compiler and reference preview over
existing MG1/VT1, not full MD1 video/audio/hybrid release qualification.

## View the implementation

Running Storybook: [Reference Production](http://localhost:6006/?path=/story/motion-motion-director--reference-production).
Other stories: Opening, Sequential Flow, Diagram Construction, Concurrent Groups,
Visual Continuity, Cinematic Reveal, Portrait, Alternative Theme, Reduced Motion,
Optional 3D Adapter.

Source: `src/motion/director-reference.ts`, `director-demo.tsx`,
`director-3d-demo.tsx`; reusable APIs: `registry/motion/motion-director.ts`,
`director-authoring.ts`, `director-recipes.ts`, `motion-director-react.tsx`.
[Component contract](../component-specs/motion-director.md).

The default film is **1,620 frames / 54 s / 30 fps**, 36 independently animated
subjects plus six packet objects, six 9-second shots, five identity-preserving
main scene handoffs and two additional simultaneous VT1 shape transformations.
There are **519 expanded authored nodes / 1,641 compiled channels**; inactive
VT1 channels sit behind existing MG1 hold scopes. Both 1280×720 and 720×1280
arrangements have authored geometry. Three lanes run concurrently; the reveal
recipe is reused with different targets and parameters. Assembly fades reuse
the existing version-1 `fade-reveal` preset.

## Commands and actual results

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with one existing unused eslint-disable warning at `tests/e2e/probe-overflow.spec.ts:64` |
| `git diff --check` | Passed |
| `npm run build` | Passed; existing >500 kB chunk warning, including optional Three.js viewport; log `/tmp/kumiki-director-build.log` |
| `npm run build-storybook` | Passed; log `/tmp/kumiki-director-storybook-build.log`; existing MDX-pattern, Vite config-loader and bundle warnings remain |
| `npm run registry:validate` | 66 items valid |
| `npm run registry:smoke` | 66 items / 554 staged files |
| `node scripts/registry-fixture.js --item=motion-director-react --keep` | 14 dependency-closure items / 38 source files compiled in a fresh consumer; last fixture `/var/folders/kn/148pypnd47n11h_vmhs6sjtw0000gn/T/kumiki-fixture-xLcIp4` |
| `npm test -- --reporter=dot tests/motion-core.test.ts tests/visual-transformation.test.ts tests/visual-transformation-react.test.tsx tests/camera-stage.test.tsx tests/camera-rig-3d.test.tsx` | 5 existing files / 131 tests passed. The negative viewport test intentionally logs its invalid-configuration error. |
| `node /tmp/kumiki-director-check.mjs` | 12 focused integration smoke checks, 36 reference configurations, 27 shuffled-seek frames; passed. Temporary script, not a committed replacement for unit tests. |

The temporary smoke run covers null keyframes, unknown value types, cycles,
missing references, impossible deadlines, conflicting writers, imported linear
easing, pre-interruption eased history/event continuity, sequence holds, JSON
round-trip, reverse-order frame queries and shared camera/VT samples. Its variant
matrix is 2 aspects × 3 pacing values × 3 personalities × 2 intensities. These
are targeted numerical checks, not a claim of complete negative-input coverage.

Review found and corrected: malformed keyframes reaching MG1's less defensive
validator; unknown value kinds silently becoming discrete; imported unspecified
MG1 easing changing from linear to director easing; and an interruption seed
rewriting the earlier part of an eased segment. The last fix scopes untouched
history and the MG1-seeded future separately, preserving all prior sampled frames.

## Performance measurement

[Raw measurements](2026-10-17-motion-director-metrics.json), Node v24.15.0,
Darwin arm64, Apple M4. 100 warmup evaluations, then 1,000 deterministic dispersed
frame queries per case, `performance.now()` around `evaluateMotionDirector`:

| Input | Median | p95 | Maximum |
|---|---:|---:|---:|
| Reference, 1,641 channels with inactive VT scopes | 0.096 ms | 0.244 ms | 0.554 ms |
| 500 independent subjects / 1,500 persistent MG1 tracks | 0.508 ms | 1.097 ms | 4.582 ms |

These numbers measure **kernel evaluation only**, excluding React reconciliation,
VT1 paint construction, SVG layout/paint, GPU work, browser playback and memory.
No browser FPS guarantee, allocation-free claim or 500-object render benchmark
is made. MG1 still creates its ordinary per-evaluation collections; the director
does not add a per-element state loop, RAF, scheduler or alternate evaluator.

A [repeat during the final concurrent Storybook build/lint](2026-10-17-motion-director-concurrent-metrics.json)
was slower: reference p95 **0.953 ms**, 500-subject p95 **4.560 ms**, maximum
**102.031 ms**. This is an uncontrolled shared-host measurement, and the cause
of the largest spike was not profiled. The lower baseline is not a worst-case
frame-time guarantee; browser/GC/load qualification remains open.

## Visual evidence and remaining acceptance

Native Arc/Storybook screenshots were inspected in the tool transcript:

- Landscape opening at frame 145: restrained palette, visible independent
  assembly trajectories, stable title/footer hierarchy and stage framing.
- Portrait flow at frame 365, including a **390×896** Storybook viewport:
  separately authored 2-column/3-row arrangement and wrapping outer controls.
  Inspection caught packets offset from connector routes; both now use cluster
  centers, and the corrected narrow screenshot shows packets on their paths.
- Existing Three.js sculpture rendered through the optional directed adapter;
  the camera/subject playback control progressed in the live UI. No new 3D
  renderer or scene engine was introduced.
- Reference playback was observed progressing across flow, construction,
  parallel groups and reveal into the resolved frame **1619**, where the player
  stopped at the authored end. The final portrait recap was inspected as well.

Screenshots are observations in this session, not committed pixel baselines.
The entire 54-second film has **not** been frame-by-frame visually accepted.
Automated browser console/axe sweeps, full playback frame-time measurement,
screen-reader/IME/CJK/RTL, 200% zoom, multiple browser/GPU stacks and every
aspect/theme/transition boundary remain deferred. Storybook's accessibility
panel showed **0 violations / 29 passes / 1 inconclusive rule** after fixing a
format-control group that lacked `role="group"`. The remaining inconclusive
contrast rule cannot infer the background behind SVG image text. Calculated
ink/muted-on-surface ratios are **12.56 / 5.45** for Theme A and **13.87 / 8.60**
for Theme B; this checks explicit palette pairs, not every painted overlap.
Final art direction and visual approval remain with the user, as requested.
Small scene labels still require delivery-size review.

Five compile warnings are intentional VT1 crossfade fallbacks for changed opaque
connector paths in the second handoff. No invalid compilation is rendered.
Narration/speech markers are editorial metadata, not measured speech alignment;
no recorded voice/music/SFX assets, audio engine or video exporter are supplied.

Known API limits: imported clipping/repeat/constraint/transform scopes are
rejected rather than approximated; pacing collisions fail explicitly; one
unblended top-level compiled channel can be retargeted into an immutable runtime
history/future timeline. Repeated retargeting of that split timeline or blended
scopes remains a consumer MG1 operation. Scene safety/framing/occlusion stay at
existing scene/renderer boundaries. See the contract for complete semantics.

One redundant local Storybook start exited with `EADDRINUSE` because the existing
server already owned port 6006; that server continues serving the stories. An
early Vite-loader socket initialization and process-list read needed sandbox
approval; both subsequently succeeded. No packages or lockfiles changed.
