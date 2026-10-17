# Component: Motion Track (slice)

**Status:** Implementing — the typed 2D motion evaluator and the `motion-track` registry item are
present and installable; the installed-item evidence is recorded below, with the visual screenshot
review still **pending**.
**Catalog phase:** M1-A (docs/07 §6 "Keyframe primitives + title + transitions"), docs/08 §12
**MG1** (typed 2D motion evaluator). Registry item **`motion-track`**.
**Why shared:** Every animated surface needs one deterministic, renderer-neutral evaluator:
a timeline is plain data, `evaluateTimeline(timeline, frame)` is a pure function of that data,
and any renderer (DOM/SVG, canvas, a future video adapter) reads the same samples. Without a
single evaluator the same keyframes would be re-interpreted per renderer and drift in easing,
conflict resolution and cue timing. Alternatives considered: drive motion from a playback library's
wall-clock timeline (rejected — the value at a frame would depend on seek history, breaking
docs/11's "seeking directly to a frame cannot change output"); store per-renderer animation objects
in the document (rejected — a scene must round-trip as JSON with no executable code, docs/08 §1).

**Source:** [`registry/motion/types.ts`](../../registry/motion/types.ts),
[`registry/motion/constants.ts`](../../registry/motion/constants.ts),
[`registry/motion/diagnostics.ts`](../../registry/motion/diagnostics.ts),
[`registry/motion/matrix.ts`](../../registry/motion/matrix.ts),
[`registry/motion/easing.ts`](../../registry/motion/easing.ts),
[`registry/motion/springs.ts`](../../registry/motion/springs.ts),
[`registry/motion/interpolate.ts`](../../registry/motion/interpolate.ts),
[`registry/motion/stagger.ts`](../../registry/motion/stagger.ts),
[`registry/motion/timeline.ts`](../../registry/motion/timeline.ts),
[`registry/motion/serialize.ts`](../../registry/motion/serialize.ts),
[`registry/motion/validate.ts`](../../registry/motion/validate.ts),
[`registry/motion/storyboard.ts`](../../registry/motion/storyboard.ts); the `motion-track` slice
(twelve modules). `registry/motion/storyboard.ts` is intentionally declared by **both** `motion-track`
and [`scene-storyboard`](scene-storyboard.md) (same target `components/motion/storyboard.ts`):
`validate.ts` and `serialize.ts` import `./storyboard` at runtime, so giving it a single separate owner
would create a `registryDependencies` cycle; the registry tolerates the duplicate path.
[`registry/motion/index.ts`](../../registry/motion/index.ts) is the barrel, and `src/motion/index.ts`
re-exports it for the showcase.

## Contract

- **Use / not use:** use to author, validate, serialize and evaluate a 2D motion timeline — typed
  keyframes, cues, `sequence`/`parallel`/`hold`/`repeat`/`stagger` nesting, constraints, a transform
  hierarchy and interruption. It is data and pure functions, not a React component and not a
  player. Do not store functions, DOM nodes, `Date`/`Math.random`, wall-clock time or arbitrary
  JSON in a timeline, and do not use it for 3D, audio, or a frame source (no video adapter here —
  docs/08 §12 MG2+). A timeline that does not validate must not be evaluated as if complete.
- **Public API (grouped by module):**
  - **`types.ts`** — the frozen interface. Time `RationalFps`, `FrameRange`; geometry `Vec2`,
    `Rect`, `AffineMatrix`; values `MotionValueType` (`number | opacity | length | angle | vec2 |
    transform | color | path | boolean | discrete`), `ColorSpace`, `ColorValue`, `MotionValue`;
    easing `EasingName`, `CubicBezierTuple`, `StepsEasing`, `EasingSpec`, `AngleMode`; tracks
    `Keyframe`, `ConflictPolicy` (`error` default, `additive`, `priority`), `AnimationTrack`;
    cues/scopes `MotionCue`, `MotionOffset`, `StaggerDirection`, `StaggerItem`, and the node union
    `TrackNode | SequenceNode | ParallelNode | HoldNode | RepeatNode | StaggerNode` = `MotionNode`;
    resolution `MotionConstraint` (`look-at | follow | distance-anchor | bounds`), `TransformNode`,
    `MotionTimeline`; diagnostics `Diagnostic`, `MotionSample`, `EvaluationResult`, `PinnedValues`.
  - **`constants.ts`** — `MOTION_SCHEMA_VERSION` (`1`), `DEFAULT_FPS` (`{30,1}`),
    `framesToSeconds`, `secondsToFrames`, `roundFrameToNearest`, `floorFrame`, `ceilFrame`,
    `clampFrame`, `isFrameInRange`, `normalizeFps`, `fpsRatio`.
  - **`diagnostics.ts`** — `createDiagnostic`, `countBySeverity`, `hasBlockingDiagnostics`,
    `sortDiagnostics`.
  - **`matrix.ts`** — `IDENTITY`, `translationMatrix`, `rotationMatrix`, `scaleMatrix`,
    `multiplyMatrix`, `invertMatrix`, `applyMatrixToPoint`, `applyMatrixToVector`, `composeMatrix`,
    `decomposeMatrix`, `interpolateMatrix`, `resolveWorldTransforms`, `normalizeAngle`,
    `shortestAngleDelta`, `lerpNumber`.
  - **`easing.ts`** — `EASING_NAMES` (19 names), `isEasingSpec`, `cubicBezier`, `evaluateEasing`.
  - **`springs.ts`** — `SpringParams`, `springValue`, `springIsSettled`, `springSettleFrames`,
    `SPRING_PRESETS` (`gentle`, `snappy`, `bouncy`, `settle`, `heavy`), `resolveSpringPreset`.
  - **`interpolate.ts`** — `isDiscreteValueType`, `parseColor`, `formatColor`, `interpolateColor`,
    `interpolateValue`, `validateValue`, `sampleTrack`.
  - **`stagger.ts`** — `staggerOrder`, `staggerStartFrames`.
  - **`timeline.ts`** — `EvalContext`, `outputKey`, `resolveCueFrames`, `offsetFrames`,
    `nodeDuration`, `evaluateNode`, `blendValues`, `evaluateTimeline`, `applyInterruption`.
  - **`serialize.ts`** — `stableStringify`, `normalizeTimeline`, `serializeTimeline`,
    `timelineHash` (FNV‑1a, 8 lowercase hex), `TimelineParseResult`, `parseTimeline`;
    `serializeStoryboard`, `StoryboardParseResult`, `parseStoryboard`, `storyboardHash` (the
    storyboard wire helpers; see [Scene Storyboard](scene-storyboard.md)).
  - **`validate.ts`** — `isMotionTimeline`, `validateTimeline`, `validateMotionDocument`.
- **Composition / boundary:** a finding is `Diagnostic { code, severity, message, sceneId?, layerId?,
  frame?, capability?, fallback?, path? }` (mirrors docs/11 §4). `validateTimeline` emits
  `motion-schema-version-unsupported`, `motion-id-invalid`, `motion-fps-invalid`,
  `motion-duration-invalid`, `motion-cue-invalid`, `motion-cue-duplicate`,
  `motion-node-missing`, `motion-node-id-missing`, `motion-node-id-duplicate`,
  `motion-node-empty`, `motion-offset-cue-missing`, `motion-keyframe-empty`,
  `motion-keyframe-frame-invalid`, `motion-keyframe-duplicate-frame`, `motion-value-type-mismatch`,
  `motion-value-not-finite`, `motion-duplicate-writer`, `motion-constraint-target-missing`,
  `motion-repeat-count-invalid`, `motion-transform-duplicate-id`, `motion-transform-parent-missing`,
  `motion-transform-parent-cycle` (errors) and `motion-no-duration`, `motion-frame-out-of-range`,
  `motion-node-unreachable`, `motion-keyframe-unordered`, `motion-cue-unused`,
  `motion-hold-child-overflow`, `motion-priority-tie`, `motion-constraint-clamped` (warnings).
  Evaluation adds `motion-cue-missing`, `motion-fps-invalid`, `motion-duration-invalid`,
  `motion-frame-out-of-range`, `motion-duplicate-writer`, `motion-constraint-violated`,
  `motion-interrupted` and `motion-pinned-override`; `resolveWorldTransforms` adds
  `transform-duplicate-id` (warning), `transform-parent-missing` (error) and
  `transform-parent-cycle` (error). `parseTimeline` adds `timeline-parse-failed` /
  `timeline-shape-invalid` and returns `timeline: null` when any error exists.
  `validateMotionDocument` dispatches by shape and adds `motion-document-unknown`.
- **Semantics:** **determinism** — nothing reads a clock or `Math.random`; `evaluateTimeline` is a
  pure function of `(timeline, frame, pinned)`, so a frame may be sought in any order (asserted by
  the fixtures suite). **End-exclusive ranges** — a range covers `[startFrame, endFrame)`;
  `clampFrame` clamps to `[0, durationFrames - 1]`. **Identity** — every node/track has a stable
  `id`; identity that survives a cut/morph/handoff is carried by `semanticId` (docs/08 §1.3).
  **Typed values only** — `interpolateValue` switches on `MotionValueType`; `discrete`, `boolean`
  and `path` are **step** value types that cut at the segment boundary and are never blended
  (arbitrary JSON/strings are never interpolated). **Composition order** — a matrix is column-major
  `(a b c d e f)`, `multiplyMatrix(a, b)` means *apply `a`, then `b`*, and world transforms resolve
  parent-before-child. **Angle** — `angle` interpolates along the shortest arc by default;
  `full-turn` is opt-in via `AnimationTrack.angleMode`. **Springs** — `springValue` is a closed-form
  unit-step (all three damping regimes) that is exactly `0` at `t = 0`, so springs are
  order-independent. **Conflict policy** — multiple writers of one `${targetId}.${property}` are an
  `error` unless a writer declares `additive` or `priority`; `priority` ties warn and the first
  wins. **Order of resolution** — fps/duration → cues → world transforms → node sampling → conflict
  resolution → pinned overrides → constraints. **Round-trip** —
  `serializeTimeline(normalizeTimeline(doc))` is byte-stable (keys sorted at every depth, keyframes
  sorted and de-duplicated last-wins, cues ordered by frame then id) and `parseTimeline`
  re-validates it. **Declared fallbacks** — `normalizeFps` falls back to `DEFAULT_FPS` on an invalid
  fps, and `resolveWorldTransforms` treats a missing/cyclic parent as identity while reporting it.
- **Keyboard/focus:** not applicable — a data module with no interactive surface. The scrubber and
  stages are in [Motion React](motion-react.md).
- **Visual states:** not applicable — state lives in the components that render samples.
- **Customization:** values are typed and validated, so a consumer customizes through data, not
  CSS: the 19 named easings plus `{ cubicBezier }` and `{ steps }`; five versioned `SPRING_PRESETS`;
  `AnimationTrack.easing` as a segment default; `ConflictPolicy`/`priority`; `angleMode`; cue offsets
  and `PinnedValues` (which override authored values and report `motion-pinned-override`).
  `MOTION_SCHEMA_VERSION` is stamped on the document.
- **Dependencies:** no external runtime dependency — every module imports only sibling modules via
  relative `./…` specifiers, and no module imports React or a third-party package.
- **Limits:** `stableStringify` **throws** (with a path) on non-finite numbers (`NaN`/`±Infinity`),
  `function`/`symbol`/`bigint` values and cyclic object graphs rather than emitting `null`.
  `applyInterruption` **seeds a new track**: it evaluates the timeline at `event.frame` (and
  `frame - 1` for a numeric velocity) and returns a *new* timeline whose nodes gain a `track` node
  carrying the current value as a keyframe at `event.frame` — the original is never mutated and no
  existing track is rewritten. Three severities differ between the authoring gate and evaluation:
  `motion-cue-duplicate` is an **error** in `validateTimeline` but a **warning** in `resolveCueFrames`;
  `motion-keyframe-duplicate-frame` is an **error** in `validateTimeline` but a **warning** in
  `sampleTrack`; and `motion-keyframe-unordered` is a **warning** in `validateTimeline` but an
  **error** in `sampleTrack` (which then applies a stable sort and keeps sampling).
  `sampleTrack` sorts unsorted keyframes and lets the last duplicate win (a discrete cut). Springs
  settle within a **600-frame cap** (`springSettleFrames`). `decomposeMatrix` has a documented
  degenerate fallback (a collapsed X basis becomes a pure Y scale). This slice is 2D screen-space
  only: there is no vec3/quaternion/material track and no camera (docs/08 §10, docs/11 §3 v2).

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/motion-core.test.ts tests/motion-geometry.test.ts tests/motion-presets.test.ts
  tests/motion-serialize.test.ts tests/motion-storyboard.test.ts tests/motion-fixtures.test.ts`
  → **6 files, 257 tests passed** (constants/rational fps, diagnostics ordering, matrix
  compose/decompose/interpolate/parent resolution, easing, springs, interpolation, `sampleTrack`,
  stagger, cues/offsets, `nodeDuration`, nested evaluation, conflict policies, pinned overrides,
  constraints, determinism/order-independence, `applyInterruption`, byte-stable serialization and
  tolerant parsing, and `validateTimeline`'s documented codes). The full suite is **118 files / 1370
  tests passed** (`npx vitest run`). Typecheck and lint also passed: `npx tsc --noEmit` → exit 0 (no
  output); `npm run lint` → exit 0, **0 errors, 1 pre-existing warning** unrelated to motion
  (`tests/e2e/probe-overflow.spec.ts:64:3 Unused eslint-disable directive`). Keyboard tests are
  **not applicable** to this data module.
- [ ] **axe-core output and manual a11y checks recorded** — not applicable to a data-only slice: the
  only axe run is the Playwright gallery test *"has no axe violations in light and dark appearance"*
  (passed in light and dark, recorded under [Motion React](motion-react.md)), and **no dedicated
  motion a11y vitest suite exists** (`tests/motion*` resolves to the six `.test.ts` files above, none
  of which mount React). Manual screen-reader checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `npx storybook build --output-dir /tmp/kumiki-storybook-motion` completed successfully and
  `index.json` contains the `Motion/React` title; the motion stories include CJK, RTL, long and
  narrow fixtures (`src/motion/motion.stories.tsx`).
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run.** The Playwright e2e asserts committed light/dark/375 px baselines (it passed), but the
  images were not visually inspected in this task.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the Playwright
  motion-gallery run passed, including *"never scrolls horizontally, from 320px up"* and *"has no
  axe violations in light and dark appearance"* (scoped to the showcase page, not this data module).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate` →
  `registry:validate OK — 56 item(s) valid.`; `npm run registry:smoke` → `registry:smoke OK —
  56 item(s), 279 file(s) staged into an isolated directory.`; and
  `node scripts/registry-fixture.js --item=motion-track` → `registry:fixture OK — 1 item(s),
  13 file(s) compiled in a temporary fixture (removed)` (exit 0; it runs `npm install`, so it needs
  network access).
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — `motion-track`
  declares `dependencies: []` and every module imports only sibling modules (relative `./…`), so
  there is no new third-party licence surface. The demo app bundle was measured:
  `dist/assets/index-*.js` ≈ 1.14 MB minified (gzip ≈ 345 kB), with the pre-existing "chunks larger
  than 500 kB" Vite warning; no separate motion budget was set.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue was found in the
  checks run; the authoring/evaluation severity differences, the `stableStringify` rejections and the
  `applyInterruption` seeding behaviour are named above.

**Links to evidence:** `../../registry/motion/types.ts`, `../../registry/motion/timeline.ts`,
`../../registry/motion/validate.ts`, `../../registry/motion/serialize.ts`,
`../../registry/motion/springs.ts`, `../../tests/motion-core.test.ts`,
`../../tests/motion-serialize.test.ts`, `../../tests/motion-fixtures.test.ts`,
`../../src/motion/motion-fixtures.ts`, `../../examples/motion/kinetic-title-30s.json`,
`../../examples/motion/interruption-demo.json`.
