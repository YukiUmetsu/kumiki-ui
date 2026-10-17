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

**Source:** [`registry/motion/react.tsx`](../../registry/motion/react.tsx) and its companion SVG
scene renderer [`registry/motion/graphic-composition.tsx`](../../registry/motion/graphic-composition.tsx);
`src/motion/react.tsx` re-exports both for the showcase. It composes the primitives from
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
  `label?`); `GraphicComposition` (`GraphicCompositionProps`: `timeline`, `frame`, `reducedMotion?`,
  `ariaLabel?` + `div` props, from the companion `graphic-composition.tsx` renderer). Manifest
  `MOTION_COMPONENT_NAMES` (seven entries; the companion `GraphicComposition` is **not** listed in it
  — it is exported from its own module and re-exported by `src/motion/react.tsx`).
- **Composition / boundary:** `MotionStage` evaluates its `timeline` at `frame` and provides the
  result through `MotionContext`; children (`MotionBox`, `KineticText`) read samples via
  `useMotionSample`/`useMotionEvaluation`. `MotionBox` reads only the `transform` and `opacity`
  samples and a pivot from `timeline.transforms` (matched by `targetId`); it ignores other
  properties. Each component forwards `className`, `style` and remaining DOM props, and emits a
  stable data attribute for testing/themeing: `data-km-motion-stage`, `data-km-motion-box={targetId}`,
  `data-km-kinetic-text={spec.id}` / `data-km-kinetic-token={index}`, `data-km-vector-draw` +
  `data-progress`, `data-km-shape-morph` + `data-morph-mode`, `data-km-mask-reveal` +
  `data-mask-kind` + `data-mask-capability` + `data-mask-mode` + `data-mask-order` +
  `data-mask-feather` + `data-mask-feather-applied`, `data-km-motion-scrubber`,
  `data-km-graphic-composition`. `GraphicComposition` evaluates its whole `timeline` at `frame` (no
  `MotionStage` required) and reads the samples of a fixed, documented set of targets
  (`graphic-path.data`, `graphic-trim.data`, `reveal-length.revealLength`, `packet.position`,
  `graphic-morph.from`/`to`, `morph.progress`, `graphic-mask.clip`/`alpha`, `mask.progress`,
  `accent-dot.opacity`) to draw one coordinated SVG scene.
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
  `MaskRevealView` draws the **resolved polygon** (`MaskSample.polygon`, so a transformed mask is a
  real polygon, not an axis-aligned rect): `clip` uses `clip-path: polygon(…)`, `alpha`/`luma` use an
  SVG `<mask>`; the effective kind is resolved against `CSS.supports` at runtime and reported in
  `data-mask-kind`, with the declared capability in `data-mask-capability`. `data-mask-mode` reports
  the resolved matte (`clip`/`alpha`/`luminance`); `data-mask-order` reports the resolved paint order
  (`order` maps to `z-index` for stacked masked siblings, lower draws first); `data-mask-feather`
  reports the clamped px feather and `data-mask-feather-applied` reports `"true"` only when a soft
  edge was actually composited — a feathered `clip` is promoted to an SVG alpha matte when
  `CSS.supports` allows it, and when alpha masking is unavailable the clip still renders with the
  feather **honestly dropped** (`"false"`). A non-zero feather becomes an SVG Gaussian blur on the
  matte (standard deviation = half the px width). `GraphicComposition` is one `role="img"` SVG scene
  that composes a path route + trim reveal, staggered stations, a traveling packet, a masked detail
  panel and a shape morph on a fixed 1920×1080 `viewBox`; under reduced motion it samples the last
  authored frame like the other components. Every component has a reduced-motion state. Hover/focus
  styling beyond the shared Button/Slider is intentionally absent.
- **Customization:** `className`/`style` and all remaining DOM props are forwarded; colours are
  literal props (`stroke`, `fill`, `background`) or consumer CSS variables (the showcase passes
  `var(--km-*)` tokens); `as` changes the host element for `MotionBox`/`KineticText`; `ariaLabel`
  names each surface; `reducedMotion` overrides the media query. Motion itself is customized in the
  data it renders, not here.
- **Dependencies:** **React only** — `registry/motion/react.tsx` imports React, sibling `./…` motion
  modules, and two sibling Kumiki UI components (`../ui/button`, `../ui/slider`).
  `registry/motion/graphic-composition.tsx` imports React and sibling `./…` motion modules
  (`./types`, `./timeline`, `./masks`, `./morph`, `./paths`, `./trim`, `./matrix`, `./springs`,
  `./react`, `./svg-mask`) and no direct Kumiki UI component import. Both rendering paths share the
  internal `svg-mask.tsx` adapter. No third-party package was added.
  (Honest note: the *showcase* pages `src/main.tsx` and `src/pages/motion-gallery.tsx` additionally
  wrap the app in `motion`'s `MotionConfig reducedMotion="user"`; that is showcase wiring, not part of
  the registry item.)
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
  `MaskRevealView` cannot express a soft edge through `clip-path`, so a feathered `clip` is promoted
  to an SVG alpha matte (`data-mask-feather-applied="true"`) only when `CSS.supports` allows alpha
  masking; otherwise the clip renders with the feather **dropped** and reports `"false"` rather than
  silently pretending the edge is soft. `MaskRevealView` draws `MaskSample.polygon` (the transformed
  mask corners), so a rotated/skewed mask shows the true polygon. `GraphicComposition` expects a
  timeline authored against its fixed target names (see Composition/boundary): a missing track simply
  draws nothing for that layer, and the component owns no fallback scene. It renders one
  `viewBox="0 0 1920 1080"` SVG scaled with `preserveAspectRatio="xMidYMid meet"`, so the host box
  letterboxes rather than reflows; the showcase's "Graphic composition" section reads its fixture,
  wraps it in a 16:9 `aspect-video` stage card so the scene fills it, and drives it with a
  `MotionScrubber` (a consumer container that is not 16:9 still letterboxes).

## Acceptance evidence

Current execution evidence is authoritative in the [2026-10-17 V1 report](../verification/2026-10-17-motion-v1.md).

- [x] Full suite: `npm test -- --reporter=dot` — **119 files / 1,387 tests passed**.
- [x] Renderer regressions: **6 passed**, after reproducing the original failures.
- [x] Motion browser suite: `npx playwright test tests/e2e/motion-gallery.spec.ts` — **9 passed**;
  light/dark axe, overflow, keyboard seeks, native mask styling, painted soft-edge alpha samples,
  arbitrary-frame seeks and live system reduced-motion changes included.
- [x] Typecheck, lint and diff whitespace checks passed; the existing unrelated lint warning remains.
- [x] Storybook build passed; composition scene, narrow/dark and transformed-feather stories exist.
- [x] Registry validation/staging passed: **56 items / 281 staged files**. Fresh `motion-react`
  consumer: **11 items / 26 compiled files**, including an explicit `GraphicComposition` import.
  Fresh `motion-track` and `scene-storyboard` consumers also compiled.
- [x] No new dependencies or lockfile changes; native SVG adapter shared by both rendering paths.
- [ ] Current visual inspection/approval — deferred to the user, per their stated preference.
  Existing light/dark/narrow screenshot comparisons passed; no baselines were updated. No manual
  screen-reader, WebKit, zoom or two-palette visual approval is claimed. See the V1 report for exact
  commands, failures, bundle measurement, limitations and next steps.
