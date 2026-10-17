# Component: Motion React (slice)

**Status:** Implementing — the React rendering layer and its `motion-react` registry item are present
and installable; the installed-item evidence is recorded below, with the visual screenshot review
still **pending**.
**Catalog phase:** M1-A (docs/07 §6), docs/08 §12 **MG1**. Registry item **`motion-react`** — the
React rendering layer for the motion primitives.
**Why shared:** The evaluator returns renderer-neutral samples; a shared React layer turns those
samples into DOM/SVG at an explicit `frame` prop, so every consumer gets the same reduced-motion
handling, ARIA labelling and controlled/uncontrolled scrubber behaviour instead of re-deriving it.
Every component is a pure function of `frame`; the only clock-driven code is `MotionScrubber`, which
uses `requestAnimationFrame` solely to advance the integer frame by wall-clock delta. Alternatives
considered: ship only the data primitives (rejected — every consumer would re-implement the same
reduced-motion and a11y wiring); use the `motion` player for rendering (rejected — the frame must be
explicit and deterministic, and the primitive slice must carry no player dependency).

**Source:** [`registry/motion/react.tsx`](../../registry/motion/react.tsx);
`src/motion/react.tsx` re-exports it for the showcase. It composes the primitives from
[`registry/motion`](../../registry/motion/index.ts).

## Contract

- **Use / not use:** use to render a motion timeline, a kinetic-text run, a vector-draw reveal, a
  shape morph or a mask reveal inside React, and to scrub a timeline with a real, keyboard-operable
  control. Do not treat these components as the motion *system* — authoring, validation and
  serialization are the data primitives ([Motion Track](motion-track.md),
  [Motion Geometry](motion-geometry.md), [Motion Preset](motion-preset.md),
  [Scene Storyboard](scene-storyboard.md)). Do not expect them to run their own playback: pass an
  explicit `frame` (or drive `MotionScrubber`).
- **Public API:** hooks `usePrefersReducedMotion()`, `useMotionEvaluation()` (the nearest
  `MotionStage`'s `EvaluationResult` or `null`), `useMotionSample(targetId, property)`
  (`MotionSample | null`). Components and their props: `MotionStage` (`MotionStageProps`:
  `timeline`, `frame`, `width`, `height`, `background?`, `children?`, `ariaLabel?`,
  `reducedMotion?`, `onEvaluation?` + `div` props); `MotionBox` (`MotionBoxProps`: `targetId`,
  `as?: "div" | "span"` + `div` props); `KineticText` (`KineticTextProps`: `spec: KineticTextSpec`,
  `frame`, `as?: "span" | "div" | "p"`, `ariaLabel?`, `reducedMotion?`); `VectorDraw`
  (`VectorDrawProps`: `path`, `frame`, `range`, `easing?`, `stroke`, `strokeWidth?`, `fill?`,
  `ariaLabel?`, `reducedMotion?`); `ShapeMorphView` (`ShapeMorphViewProps`: `from`, `to`, `frame`,
  `range`, `fill?`, `stroke?`, `ariaLabel?`, `reducedMotion?`); `MaskRevealView`
  (`MaskRevealViewProps`: `spec: MaskSpecLocal`, `progress`, `children`, `reducedMotion?`);
  `MotionScrubber` (`MotionScrubberProps`: `timeline`, `playing?`, `onFrame`, `frame?`, `fps?`,
  `label?`). Manifest `MOTION_COMPONENT_NAMES`.
- **Composition / boundary:** `MotionStage` evaluates its `timeline` at `frame` and provides the
  result through `MotionContext`; children (`MotionBox`, `KineticText`) read samples via
  `useMotionSample`/`useMotionEvaluation`. `MotionBox` reads only the `transform` and `opacity`
  samples and a pivot from `timeline.transforms` (matched by `targetId`); it ignores other
  properties. Each component forwards `className`, `style` and remaining DOM props, and emits a
  stable data attribute for testing/themeing: `data-km-motion-stage`, `data-km-motion-box={targetId}`,
  `data-km-kinetic-text={spec.id}` / `data-km-kinetic-token={index}`, `data-km-vector-draw` +
  `data-progress`, `data-km-shape-morph` + `data-morph-mode`, `data-km-mask-reveal` +
  `data-mask-kind` + `data-mask-capability`, `data-km-motion-scrubber`.
- **Semantics:** reduced motion is behaviour, not styling — `usePrefersReducedMotion` reads
  `(prefers-reduced-motion: reduce)` through `useSyncExternalStore`; each component accepts an
  explicit `reducedMotion` override and, when reduced, evaluates the **last** authored frame
  (`durationFrames − 1`), resolves masks to `progress 1`, morphs to `t = 1` and the vector draw to
  full progress. **Determinism** is preserved: rendering is a pure function of the `frame` prop.
- **Keyboard/focus:** the real behaviour is small and specific.
  - **`MotionScrubber`** exposes two native `<button>`s from the shared Kumiki Button — **Play/Pause**
    (`aria-label` "Play"/"Pause", `aria-pressed`) and **Restart** (`aria-label` "Restart timeline") —
    and a Kumiki `Slider` (label prop, default `"Frame"`) with `min 0`, `max durationFrames − 1`,
    `step 1` and `showValue`. The **slider is the keyboard surface** (arrow keys, `Home`/`End`); the
    e2e spec focuses it and presses `End`, observing the scrubber read `89` for a 90-frame timeline.
    Play is **disabled when `playing` is controlled** by the caller. `frame` is clamped to
    `[0, durationFrames − 1]` (and to `0` when the duration is `0`).
  - **`MotionStage`** is `role="img"` with an `aria-label` (default `"Motion stage"`); its inner
    `<svg>` and the DOM layer are decorative, so the stage announces as one image.
  - **`KineticText`** renders the **full text once** in a visually-hidden span and marks every
    animated token `aria-hidden="true"`, so a screen reader reads the whole string rather than a
    stutter of fragments; an optional `aria-label` names the run.
  - **`VectorDraw`**, **`ShapeMorphView`** and (via the caller) the morph/draw SVGs are `role="img"`
    with an `aria-label`. **`MaskRevealView`** is a plain `div`; its children remain the accessible
    content. There is no focus trap, roving tabindex or drag-scrub in this layer.
- **Visual states:** `MotionScrubber` has playing/paused and controlled/uncontrolled `frame` states
  (the Play button is disabled while `playing` is controlled). `ShapeMorphView` renders three visual
  modes — a real `morph`, a `dissolve` cross-fade, or a `cut` — surfaced as `data-morph-mode`.
  `MaskRevealView` renders `clip` (via `clip-path`), `alpha` or `luma` (via an SVG mask); the
  effective kind is resolved against `CSS.supports` at runtime and reported in `data-mask-kind`,
  with the declared capability in `data-mask-capability`. Every component has a reduced-motion state.
  Hover/focus styling beyond the shared Button/Slider is intentionally absent.
- **Customization:** `className`/`style` and all remaining DOM props are forwarded; colours are
  literal props (`stroke`, `fill`, `background`) or consumer CSS variables (the showcase passes
  `var(--km-*)` tokens); `as` changes the host element for `MotionBox`/`KineticText`; `ariaLabel`
  names each surface; `reducedMotion` overrides the media query. Motion itself is customized in the
  data it renders, not here.
- **Dependencies:** **React only** — `registry/motion/react.tsx` imports React, sibling `./…` motion
  modules, and two sibling Kumiki UI components (`../ui/button`, `../ui/slider`). No third-party
  package. (Honest note: the *showcase* pages `src/main.tsx` and `src/pages/motion-gallery.tsx`
  additionally wrap the app in `motion`'s `MotionConfig reducedMotion="user"`; that is showcase
  wiring, not part of the registry item.)
- **Limits:** `MotionScrubber` is the only clock-driven code: it advances the integer frame by
  `floor(elapsed / frameDurationMs)` and calls `onFrame(integerFrame)` immediately, so seeking and
  interruption stay deterministic; it stops at `durationFrames − 1`. It is a scrubber, not a player
  with easing — playback is frame-quantised at the timeline's rational fps. Under reduced motion the
  components sample the last frame's **values** but report the requested `frame` in the evaluation
  result (`{ ...end, frame }`). `supportsMaskKind` returns `true` during SSR (no `window`) and
  otherwise probes `CSS.supports`; the fallback chain is `luma → alpha → clip` (`fallbackKindFor`
  maps `alpha → clip`, `luma → alpha`). `KineticText` appends a non-breaking space between tokens
  only at `word` granularity. `ShapeMorphView` bounds the viewBox over the union of the `from`/`to`
  contours (defaulting to a 100×100 box when empty) rather than over the interpolated result.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** — the six motion vitest
  files are data-only (no React mount) and passed (6 files / 257 tests). The React **keyboard and
  behaviour** acceptance is the Playwright suite:
  `npx playwright test tests/e2e/motion-gallery.spec.ts` → **8 passed**, including the
  *timelines: deterministic frame evaluation updates the sample table* test (focuses the
  `"Timeline frame"` slider, presses `End`, expects `89`) and the kinetic/mask/storyboard interaction
  tests. The full suite is **118 files / 1370 tests passed** (`npx vitest run`); the six motion files
  are 257 of them. Typecheck and lint also passed: `npx tsc --noEmit` → exit 0 (no output);
  `npm run lint` → exit 0, **0 errors, 1 pre-existing warning** unrelated to motion
  (`tests/e2e/probe-overflow.spec.ts:64:3 Unused eslint-disable directive`). There is **no dedicated
  motion a11y vitest suite**: `tests/motion*` resolves to the
  six `.test.ts` files above, none of which mount React (the only `motion/react` import in `tests/`
  is `theme.test.tsx`, which mocks the npm `motion` package, not `registry/motion`).
- [x] **axe-core output and manual a11y checks recorded** — the Playwright test
  *"has no axe violations in light and dark appearance"* ran `axe-core` (WCAG 2A/2AA/2.1/2.2 tags)
  over the `#/motion` page and passed in both appearances (exit 0). Manual screen-reader checks were
  **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `npx storybook build --output-dir /tmp/kumiki-storybook-motion` completed successfully and
  `index.json` contains the `Motion/React` title; `src/motion/motion.stories.tsx` covers kinetic text
  (English/CJK/RTL/long/narrow), vector draw (partial/complete), compatible/incompatible morph,
  clip/alpha/luma/reduced-motion masks, `MotionBox` at keyframes, the scrubber, light/dark and narrow.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run.** The Playwright *visual baselines: light, dark and narrow* test asserted the committed
  `motion-gallery-light-1440`, `motion-gallery-dark-1440` and `motion-gallery-light-375` screenshots
  and passed, but the images were **not visually inspected** in this task.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the Playwright run
  passed *"never scrolls horizontally, from 320px up"* (320/375/768/1440) and the axe light/dark test,
  and every interaction test asserts no console/page errors.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate` →
  `registry:validate OK — 56 item(s) valid.`; `npm run registry:smoke` → `registry:smoke OK —
  56 item(s), 279 file(s) staged into an isolated directory.`; and
  `node scripts/registry-fixture.js --item=motion-react` → `registry:fixture OK — 11 item(s),
  24 file(s) compiled in a temporary fixture (removed)` (exit 0). The 11 items are `motion-react`
  plus its eight motion `registryDependencies` plus `button` and `slider`; the fixture runs
  `npm install`, so it needs network access.
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — `motion-react`
  declares `dependencies: []` and imports only React, sibling `./…` motion modules and two sibling
  Kumiki UI components (`../ui/button`, `../ui/slider`), so there is no new third-party licence
  surface (React is already a peer). The demo app bundle was measured: `dist/assets/index-*.js`
  ≈ 1.14 MB minified (gzip ≈ 345 kB), with the pre-existing "chunks larger than 500 kB" Vite warning;
  no separate motion budget was set.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue in the checks run;
  the frame-quantised scrubber, SSR mask detection and reduced-motion reporting are named above.

**Links to evidence:** `../../registry/motion/react.tsx`, `../../tests/e2e/motion-gallery.spec.ts`,
`../../src/pages/motion-gallery.tsx`, `../../src/motion/motion.stories.tsx`,
`../../src/motion/react.tsx`, `../../examples/motion/graphic-composition.json`.
