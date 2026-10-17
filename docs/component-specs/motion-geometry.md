# Component: Motion Geometry (slice)

**Status:** Implementing — the geometry primitives and their `motion-path` / `mask-reveal` /
`shape-morph` / `shared-element` registry items are present and installable; the installed-item
evidence is recorded below, with the visual screenshot review still **pending**.
**Catalog phase:** M1-A (docs/07 §6), docs/08 §3 / §12 **MG1**. Registry items
**`motion-path`**, **`mask-reveal`**, **`shape-morph`**, **`shared-element`** (with the
`path-trim`/vector-draw primitive from `trim.ts`).
**Why shared:** These are the geometric primitives that make a motion graphic legible rather than
decorative: a curve a packet travels along, a genuine vector stroke reveal, a topology-checked
shape morph with an honest fallback, a deterministic matte sweep, and a semantic identity carried
across a cut. Each is pure geometry over the frozen [Motion Track](motion-track.md) contract, so the
same data drives the DOM/SVG preview and any future canvas/video renderer. Alternatives considered:
a dash-offset "trim" (rejected — not a real vector reveal, docs/08 §3 `path-trim`); morphing any two
paths point-wise (rejected — self-intersects when topology differs, so an explicit dissolve/cut is
declared instead); a per-renderer mask (rejected — matte order and capability fallback must be data).

**Source:** [`registry/motion/paths.ts`](../../registry/motion/paths.ts) (`motion-path`),
[`registry/motion/trim.ts`](../../registry/motion/trim.ts) (`path-trim` / vector-draw),
[`registry/motion/morph.ts`](../../registry/motion/morph.ts) (`shape-morph`),
[`registry/motion/masks.ts`](../../registry/motion/masks.ts) (`mask-reveal`),
[`registry/motion/shared-element.ts`](../../registry/motion/shared-element.ts) (`shared-element`);
the geometry lane of `registry/motion`. `src/motion/index.ts` re-exports them for the showcase.

## Contract

- **Use / not use:** use to compute a motion path, a path-trim window, a contour morph, a mask
  sample and a shared-element handoff as plain data. These are pure functions and JSON-safe shapes,
  not React components (the views are in [Motion React](motion-react.md)). Do not store functions or
  DOM nodes, do not mutate a path/spec/contour in place (the modules copy their inputs), and do not
  expect a point-wise morph between incompatible topology — the module refuses and returns a declared
  fallback instead.
- **Public API (grouped by module):**
  - **`paths.ts`** — types `PathAnchor` (`x`, `y`, optional absolute `in`/`out` cubic handles),
    `PathKind` (`"linear" | "cubic"`), `MotionPath` (`id`, `anchors`, `closed`, `kind`),
    `PathSamples` (`pathId`, `points`, `cumulativeLengths`, `totalLength`); functions
    `createMotionPath`, `samplePath`, `pointOnPath`, `tangentOnPath`, `angleOnPath`, `pathToSvgD`,
    `pathBounds`, `pathTransformPoint`.
  - **`trim.ts`** — types `PathTrimSpec` (`start`, `end`, `offset?`, `direction?`), `TrimResult`
    (`pathId`, `points`, `svg`, `startT`, `endT`); functions `normalizeTrimWindow`, `trimPath`,
    `pathLength`, `trimRevealProgress`.
  - **`morph.ts`** — types `PathContour` (`points`, `closed`, `holes?`), `ContourShape`
    (`contours`), `MorphMode` (`"morph" | "dissolve" | "cut"`), `MorphResult`; functions
    `contourArea`, `contourWinding`, `contourIsClosed`, `resampleContour`, `validateMorph`,
    `morphShapes`.
  - **`masks.ts`** — `MASK_KINDS`, type `MaskAxis` (`left-to-right | right-to-left | top-to-bottom |
    bottom-to-top | radial`), types `MaskSpec` (`id?`, `kind`, `rect`, `feather?`, `order?`,
    `transform?`), `MaskSpecLocal` (adds `axis`), `MaskSample` (`kind`, `rect`, `polygon`, `bounds`,
    `feather`, `softness`, `opacity`, `order`, `axis`, `transform?`); functions `evaluateMask`,
    `resolveMaskOrder`, `maskCapability`.
  - **`shared-element.ts`** — types `SharedElementEndpoint` (`transform`, `opacity?`, `range`),
    `SharedElementCollision` (`"cross-fade" | "cut" | "hold-old"`), `SharedElementSpec`,
    `SharedElementPhase` (`"before" | "handoff" | "after"`), `SharedElementSample`; functions
    `createSharedElement`, `validateSharedElement`, `evaluateSharedElement`, `sharedElementContacts`.
- **Composition / boundary:** each module owns its own geometry types (they are deliberately kept
  out of the frozen, data-only `types.ts`) but they are plain JSON-safe data, preserving docs/11
  "safe data". Findings: `morph.ts` emits `morph-contour-count-mismatch`,
  `morph-degenerate-contour`, `morph-holes-mismatch`, `morph-closed-mismatch`,
  `morph-winding-mismatch` (errors) and `morph-fallback-dissolve` / `morph-fallback-cut`
  (warnings); `shared-element.ts` emits `shared-element-id-missing`,
  `shared-element-range-invalid` (errors) and `shared-element-handoff-empty`,
  `shared-element-range-overlap` (warnings). `masks.ts` reports capability/fallback as a string pair
  (`maskCapability` → `{ capability, fallback }`) rather than a diagnostic. `evaluateMask` sanitizes
  its inputs into renderer-ready geometry: `feather` is clamped (absent/negative/non-finite → `0`),
  `order` is normalized to a finite number (`0` when absent/non-finite), a transform with any
  non-finite coefficient is **ignored** (the sample omits `transform` and resolves as identity),
  `polygon` is the freshly-computed resolved geometry and `bounds` its axis-aligned box.
- **Semantics:** **determinism** — sampling is fixed-count, ordering is explicit, and no function
  reads a clock or `Math.random`; inputs are never mutated (verified by the geometry tests' copy
  assertions). **End-exclusive time** — `trimRevealProgress(frame, range, easing)` shapes
  `[startFrame, endFrame)` and clamps the eased result to `[0, 1]` so an overshooting easing still
  yields a valid stroke fraction. **Identity** — `shared-element` carries a durable `semanticId`
  (docs/08 §1.3) across a representation change; the phase is `before`/`handoff`/`after` and
  continuity is exact at the handoff boundaries (progress `0` at the first handoff frame, exactly
  `to` at the first post-handoff frame). **Never interpolate arbitrary JSON** — a `MotionPath` or
  `ContourShape` travels as a `discrete` carrier value, so it holds rather than blends. **Declared
  fallbacks** — an incompatible morph is never performed; `maskCapability` declares the matte
  degradation (`luma → alpha → clip`).
- **Keyboard/focus:** not applicable — a data module with no interactive surface.
- **Visual states:** not applicable — state lives in the views that draw these samples.
- **Customization:** the shapes are the API. `createMotionPath` accepts partial anchors (a missing
  handle makes that segment linear); `MotionPath.closed`/`kind`; `PathTrimSpec.direction` reverses
  the emitted order without moving the window; `morphShapes` accepts `fallback: "dissolve" | "cut"`
  and `resampleCount`; `MaskSpec.kind`/`feather`/`order`/`transform` and `MaskSpecLocal.axis`;
  `SharedElementSpec.collision` selects `cross-fade` (default), `cut` or `hold-old`. A caller theme
  supplies the stroke/fill colours at the view layer.
- **Dependencies:** no external runtime dependency — every module imports only sibling motion modules
  via relative `./…` specifiers.
- **Limits:** the geometry lane's documented caveats:
  - **Trim seam-crossing.** `normalizeTrimWindow` clamps `start`/`end`, adds `offset` as a wrapped
    rotation, then orders the pair so `startT <= endT`. A rotation that **crosses the seam cannot be
    represented as one interval**, so after wrapping the endpoints the window is normalized
    (swapped); callers needing the seam-crossing split must issue **two** trims.
  - **Morph fallback semantics.** When `validateMorph` reports any error the shapes are **not**
    morphed: `morphShapes` returns the source contours for `t < 1` and the target contours at
    `t >= 1` (verbatim copies) and reports a warning; the cross-fade opacity is owned by the caller.
    `morphShapes`' default fallback is `"dissolve"`; `"cut"` is a hard hand-off.
  - **`resampleContour` chord spacing.** Resampling is an even **chord-length** walk along the
    flattened polyline (it accumulates `Math.hypot` between input vertices), not true curve arc
    length; `count` includes both endpoints; degenerate inputs (0 points, or zero total length)
    collapse to repeated copies of the first point rather than `NaN`. `MIN_RESAMPLE_COUNT` is 8, so a
    morph below that visibly loses shape.
  - **Winding sign.** In the top-left origin (y-down) frame, a positive `contourArea` is a
    **clockwise** visual winding; `contourWinding` returns `"cw" | "ccw" | "degenerate"` and
    `validateMorph` rejects a `morph-winding-mismatch`.
  - **Masks.** `clip` samples always report `opacity: 1`; only `alpha`/`luma` fade with progress.
    `MaskSpecLocal.axis` is intentionally outside the frozen `MaskSpec`, so a renderer that ignores
    it still consumes a valid spec. `resolveMaskOrder` is a stable sort by `order` then declaration
    index (ties keep declaration order; non-finite `order` resolves to `0`). `evaluateMask` reports
    two geometries: `rect` is the **pre-transform** swept rect (so rect-only callers keep working)
    and `polygon` is the swept rect's four corners `[top-left, top-right, bottom-right, bottom-left]`
    **after** `MaskSpec.transform` — an affine transform can rotate/skew, so the resolved shape is a
    polygon and `bounds` is its axis-aligned box. `polygon` and `bounds` are always present and
    always fresh arrays, so a consumer may mutate them without aliasing the spec. `feather` is the
    clamped soft edge width in px and `softness` is `feather` normalized to the resolved mask's
    shortest side (`[0, 1]`, `1` when the mask has collapsed to a point) for renderers that express
    softness as a fraction. A non-finite transform coefficient is ignored rather than propagating
    `NaN` into the geometry.
  - **Shared element.** Handoff shaping is fixed to `ease-in-out` (`HANDOFF_EASING`); `cut` jumps at
    the handoff midpoint; `hold-old` keeps the `from` opacity for the whole handoff.
    `sharedElementContacts` returns only `handoff`-phase samples, sorted by `semanticId` with a plain
    code-unit comparison (never `localeCompare`).

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/motion-geometry.test.ts` → **34 tests passed** (arc-length vs index spacing,
  clamping, tangent/angle, degenerate segment → `+x`, SVG `d` for linear/cubic, bounds and
  local→world, trim window slicing/reversal/clamping, arc length and reveal progress, signed area and
  winding, closedness detection, even resample, every topology mismatch, dissolve/cut fallback,
  compatible morph mid-point, holes preserved, mask sweep/monotonicity/clip opacity/order/capability,
  `polygon`/`bounds` after transform, feather clamping + `softness` normalization, non-finite
  transform ignored, order stability under ties/negatives/non-finite values, shared-element
  phase/continuity/collision/contact listing/validation/immutability) plus the geometry-invariant
  block in `tests/motion-fixtures.test.ts`. The full suite is **118 files / 1378 tests passed**
  (`npx vitest run`; was 1370 before these additions). Typecheck and lint also passed:
  `npm run typecheck` → exit 0 (no output); `npm run lint` → exit 0, **0 errors, 1 pre-existing
  warning** unrelated to motion (`tests/e2e/probe-overflow.spec.ts:64:3 Unused eslint-disable
  directive`). Keyboard tests are **not applicable**.
- [ ] **axe-core output and manual a11y checks recorded** — not applicable to a data-only slice: the
  only axe run is the Playwright gallery test *"has no axe violations in light and dark appearance"*
  (passed in both appearances in the earlier slice run, recorded under [Motion React](motion-react.md);
  **not re-run** in this task), and **no dedicated motion a11y vitest suite exists**. Manual
  screen-reader checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `npx storybook build --output-dir /tmp/kumiki-storybook-motion` completed successfully;
  `src/motion/motion.stories.tsx` includes compatible/incompatible morph, clip/alpha/luma mask,
  partial/complete vector draw and a reduced-motion mask state.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run.** Playwright asserts committed light/dark/375 px baselines (it passed); the images were
  not visually inspected here.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — from the earlier
  slice run, the Playwright motion-gallery run passed (no horizontal overflow 320–1440 px; axe clean
  light/dark), scoped to the showcase page. The mask-renderer fidelity changes were **not** re-run
  through Playwright in this task. The `polygon` geometry and clamping they consume are covered by
  `tests/motion-geometry.test.ts`.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate` →
  `registry:validate OK — 56 item(s) valid.`; `npm run registry:smoke` → `registry:smoke OK —
  56 item(s), 280 file(s) staged into an isolated directory.` (was 279). No individual `--item=`
  fixture was run for these four items; their install evidence is the validation, the smoke staging
  and the earlier `motion-react` fixture, which compiles them as `registryDependencies`:
  `node scripts/registry-fixture.js --item=motion-react` → `registry:fixture OK — 11 item(s),
  24 file(s) compiled in a temporary fixture (removed)` (exit 0; it runs `npm install`, so it needs
  network access; that per-item fixture was **not re-run** in this task).
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — all four items
  declare `dependencies: []` and every module imports only sibling `./…` motion modules, so there is
  no new third-party licence surface. The demo app bundle was measured: `dist/assets/index-*.js`
  ≈ 1.14 MB minified (gzip ≈ 345 kB), with the pre-existing "chunks larger than 500 kB" Vite warning;
  no separate motion budget was set.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue in the checks run;
  the trim seam-crossing, morph fallback, chord-resample, winding, mask and shared-element caveats
  are named above.

**Links to evidence:** `../../registry/motion/paths.ts`, `../../registry/motion/trim.ts`,
`../../registry/motion/morph.ts`, `../../registry/motion/masks.ts`,
`../../registry/motion/shared-element.ts`, `../../tests/motion-geometry.test.ts`,
`../../tests/motion-fixtures.test.ts`, `../../src/motion/motion.stories.tsx`,
`../../examples/motion/graphic-composition.json`.
