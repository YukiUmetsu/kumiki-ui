# Component: Motion Preset (slice)

**Status:** Implementing
**Catalog phase:** M1-A (docs/07 §6), docs/08 §2 `motion-preset` / §3, §12 **MG1**. Registry items
**`motion-preset`** and **`animated-text`** (kinetic typography).
**Why shared:** A motion preset is a *named, versioned, theme-overridable* piece of library code that
expands a compact serializable record (`PresetInstance`) into concrete tracks, so a consumer
serializes only data (`{ preset, version?, targetId, startFrame, timing?, intensity?, params? }`) and
never a function (docs/08 §1). Kinetic typography composes those presets into a per-token
`stagger` run. Alternatives considered: hard-code an animation per component (rejected — no shared,
tunable vocabulary); store the expanded keyframes by hand (rejected — duplicated, unversioned, and
drifts from the preset's intent); depend on a browser player's spring at runtime (rejected — the
value must be a pure function of the frame, so spring-shaped presets are pre-sampled from the
kernel's analytic `springValue`).

**Source:** [`registry/motion/presets.ts`](../../registry/motion/presets.ts) (`motion-preset`),
[`registry/motion/kinetic-text.ts`](../../registry/motion/kinetic-text.ts) (`animated-text`);
the preset lane of `registry/motion`. `src/motion/index.ts` re-exports them for the showcase.

## Contract

- **Use / not use:** use to expand a serializable `PresetInstance` into `MotionNode`s and to build a
  deterministic per-token kinetic-text timeline. It is data + pure functions, not a React component.
  Do not store a `build` function in a document, do not depend on playback state, and do not treat a
  preset as a brand/theme choice — parameters are numeric and theme-overridable, never hard-coded
  colour or copy (docs/08 §2 `motion-preset`).
- **Public API (grouped by module):**
  - **`presets.ts`** — types `MotionRole` (`"reveal" | "emphasis" | "exit" | "handoff" | "kinetic"`),
    `MotionPresetParam` (`name`, `default`, `min?`, `max?`, `unit?`), `PresetBuildArgs`,
    `MotionPreset` (`name`, `version`, `role`, `description`, `params`, `defaults`, `build`),
    `PresetInstance`; the catalogue `MOTION_PRESETS`; functions `getPreset`, `listPresets`,
    `presetDefaults`, `resolveTiming`, `resolveIntensity`, `materializePreset`.
    The seven registered presets (each `version: 1`) are **`fade-reveal`** (reveal, opacity),
    **`rise-reveal`** (reveal, `position` + `opacity`), **`scale-pop`** (emphasis, `transform`),
    **`slide-exit`** (exit, `position` + `opacity`), **`wipe-reveal`** (reveal, normalized `length`),
    **`track-in`** (kinetic, `letterSpacing`) and **`handoff-swap`** (handoff, opacity).
  - **`kinetic-text.ts`** — type `KineticGranularity` (`"grapheme" | "word" | "line"`), type
    `KineticTextSpec` (`id`, `text`, `granularity?`, `startFrame`, `durationFrames`, `fps?`,
    `stagger?`, `direction?`, `preset?`, `intensity?`, `timing?`, `distance?`, `gap?`); functions
    `segmentText`, `glyphTargetId`, `glyphRunIds`, `buildKineticTextTimeline`.
- **Composition / boundary:** `materializePreset` resolves timing (`resolveTiming`), intensity
  (`resolveIntensity`) and params (clamped to each declared `[min, max]`), then calls the preset's
  `build`. `buildKineticTextTimeline` segments the text, animates one target per token
  (`glyphTargetId`) with the chosen preset and places every glyph track inside **one** `stagger`
  node. Findings: `preset-unknown` (error — returns no nodes), `preset-version-mismatch` (warning —
  the registered revision is built), `preset-param-unknown` (warning — the key is ignored),
  `preset-target-missing` (error — returns no nodes); `kinetic-text-empty` (error),
  `kinetic-text-overrun` (error) and `kinetic-text-stagger-clamped` (warning). Any diagnostic the
  preset surfaces (e.g. `preset-unknown`) is propagated per glyph.
- **Semantics:** **determinism** — every preset is a pure function of its arguments; there is no wall
  clock, no `Math.random` and no dependency on the `motion` player. **Timing** is the frame span the
  preset occupies (`resolveTiming`, floored at `1`, defaulting to the preset's
  `defaults.durationFrames`). **Intensity** is in `[0, 1]` and scales **amplitude only** — travel
  distance, overshoot, scale delta — never duration; out-of-range values are clamped silently (a
  documented normalisation, not an authoring error). **Version pinning** — `getPreset(name, version)`
  returns `null` when the version does not match, so a caller falls back deliberately rather than
  silently running a different revision. **Segmentation** — `grapheme` uses the platform
  `Intl.Segmenter` when present, else a documented fallback that never splits inside a cluster
  (base code point + combining marks, variation selectors, emoji modifiers and ZWJ continuations);
  `word` keeps word-like tokens and discards whitespace; `line` splits on `\n` only. **Never
  interpolate arbitrary JSON** — a preset only produces typed tracks. **Declared fallbacks** — an
  unknown param warns and is ignored; an unknown preset errors rather than guessing.
- **Keyboard/focus:** not applicable — a data module with no interactive surface.
- **Visual states:** not applicable — state lives in the components that render the tracks.
- **Customization:** `PresetInstance.timing` (frame span) and `.intensity` (amplitude) are the two
  primary knobs; `.params` tunes declared parameters within their bounds; `getPreset`/`MOTION_PRESETS`
  support version-pinned selection. Kinetic text exposes `granularity`, `stagger`, `direction`,
  `preset`, `intensity`, `timing`, and maps `distance`/`gap` onto a target preset's declared
  `distance`/`spacing` params only (so the kinetic layer never manufactures `preset-param-unknown`
  noise). No colours or copy are baked in; the caller theme styles the rendered tokens.
- **Dependencies:** no external runtime dependency — `presets.ts` imports only sibling motion modules
  (including `springs.ts` and `easing.ts`); `kinetic-text.ts` imports `presets.ts` and siblings.
- **Limits:** **`scale-pop` samples its spring at 30 fps.** A `PresetInstance` carries no fps, so
  `materializePreset` passes `fps: DEFAULT_FPS` (`{30,1}`) to every `build`; the spring-shaped
  `scale-pop` is therefore baked into dense integer-frame keyframes at 30 fps regardless of the
  composition's real fps. This is deterministic and independent of playback state, but a non-30 fps
  composition gets a spring shape sampled on a 30 fps grid. `resolveTiming` floors at `1` and rounds
  to an integer. `resolveIntensity` clamps silently (no diagnostic). Params are clamped to their
  declared bounds; a supplied key the preset does not declare is ignored with a warning. Kinetic
  text's overrun check compares `startFrame + timing + stagger·(count − 1)` against
  `durationFrames`; a negative stagger is clamped to `0`; empty text is an error; and every glyph
  re-runs `materializePreset`, so an unknown preset yields one error per token.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/motion-core.test.ts tests/motion-geometry.test.ts tests/motion-presets.test.ts
  tests/motion-serialize.test.ts tests/motion-storyboard.test.ts tests/motion-fixtures.test.ts`
  → **6 files, 257 tests passed**, including `tests/motion-presets.test.ts` (stable serializable
  catalogue, name/version resolution, fresh defaults, builds matching declared value types,
  determinism, timing-as-duration-only, intensity scaling amplitude not duration, travel distance
  scaling, param clamping + unknown-key warning, every `materializePreset` diagnostic, `segmentText`
  for Latin/CJK/emoji-ZWJ/combining marks and the no-`Intl.Segmenter` fallback, and the kinetic-text
  builder: glyph ids, single stagger node, exact stagger spacing, direction ordering, determinism,
  default/custom preset, `distance`/`gap` mapping, empty text, negative-stagger clamp, overrun, and
  unknown-preset propagation). Typecheck and lint also passed: `npx tsc --noEmit` → exit 0 (no
  output); `npx eslint registry/motion src/motion src/pages/motion-gallery.tsx
  tests/e2e/motion-gallery.spec.ts` → exit 0 (no output). Keyboard tests are **not applicable**.
- [ ] **axe-core output and manual a11y checks recorded** — not applicable to a data-only slice, and
  **no dedicated motion a11y vitest suite exists**. Manual screen-reader checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `npx storybook build --output-dir /tmp/kumiki-storybook-motion` completed successfully;
  `src/motion/motion.stories.tsx` includes kinetic text for English, CJK, RTL and a long wrapping
  string. (The preset *catalogue* is exercised in the showcase's Presets section rather than a
  dedicated story.)
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run.** Playwright asserts committed baselines (it passed); the images were not inspected here.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the Playwright
  motion-gallery run passed, including the *kinetic typography: granularity and direction controls
  change the render* test and the no-horizontal-overflow check, scoped to the showcase page.
- [ ] **Test registry install into fresh fixture passed** — **not run.** `npm run registry:validate`
  passes (47 items) but `registry.json` does not yet contain `motion-preset`/`animated-text`; the
  wiring lane owns it.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — relative
  imports only, so no new licence surface; bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue in the checks run;
  the `scale-pop` 30 fps spring sampling and the timing/intensity/param normalisations are named above.

**Links to evidence:** `../../registry/motion/presets.ts`,
`../../registry/motion/kinetic-text.ts`, `../../tests/motion-presets.test.ts`,
`../../src/motion/motion.stories.tsx`, `../../examples/motion/kinetic-title-30s.json`.
