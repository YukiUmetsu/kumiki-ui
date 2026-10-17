# Component: Slider

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Many products re-implement value selection with a mouse-only track, missing
keyboard support, an accessible value announcement, or a truthful range contract. One
tokenized slider with a real `<input type="range">` per thumb keeps pointer, keyboard and
assistive-technology behavior consistent while letting each consumer own its value
semantics and formatting. Alternatives considered: a custom drag-only thumb (rejected —
loses native range semantics and keyboard behavior) and a charting library (rejected for
scope and bundle weight).

**Source:** [`registry/ui/slider.tsx`](../registry/ui/slider.tsx) (canonical).
[`src/ui/slider.tsx`](../src/ui/slider.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use to select one value or a bounded range along a continuous or
  stepped scale. Do not use it for discrete choices with named options (use a Select or
  Radio Group), for progress reporting (use Progress), or for an unbounded numeric entry
  (use a number field). A slider always needs a visible `label` or an `aria-label`.
- **Public API:**
  - `value?: number | number[]` / `defaultValue?: number | number[]` — controlled and
    uncontrolled value; an array renders one thumb per entry.
  - `onValueChange?: (value: number | number[]) => void` — next value, shaped like the
    input (number for one thumb, array for a range).
  - `min?: number` — default `0`; `max?: number` — default `100`; `step?: number` —
    default `1`.
  - `disabled?: boolean` — default `false`.
  - `orientation?: "horizontal" | "vertical"` — default `"horizontal"`.
  - `label?: ReactNode` — visible label and accessible name of the thumb(s).
  - `formatValue?: (value: number) => string` — used for `aria-valuetext` and the visible
    readout; defaults to locale number formatting.
  - `showValue?: boolean` — default `false`; renders an `<output>` linked to the thumbs.
  - `"aria-label"?: string` — accessible name when no visible label is rendered.
  - `className`, standard `<div>` attributes, and `ref` (forwarded to the root group).
  - exports: `Slider` (named + default), `SliderProps`, `SliderValue`.
- **Composition:** one `Slider` renders a labelled group containing the label row, the
  interactive control, the track, the range indicator and one thumb per value. There are
  no slots; consumers customize through tokens and `className`. Base UI's primitive parts
  are internal so the DOM contract stays stable.
- **Semantics:** each thumb is a native `<input type="range">` exposed as `role="slider"`
  with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` and
  `aria-orientation`. The root is `role="group"` named by the visible label. A visible
  readout is an `<output>` with `aria-live="off"` (the value is already announced through
  `aria-valuetext`; a live region would repeat every drag step). Range thumb accessible
  names append “minimum”, “maximum” or “value N” when `label` is a string.
- **Keyboard/focus:** the native range input owns focus. Arrow keys move by `step`
  (Left/Down decrease, Right/Up increase), Home/End jump to the ends, and Page Up/Page
  Down move by about one tenth of the range snapped to `step` (never less than two
  steps). In a range, Home/End stop at the neighbouring thumb so values cannot cross.
  Tab moves between thumbs. The focus ring is painted on the visible thumb with a 2px
  `ring-ring` offset against the surface; disabled sliders remove their inputs from the
  tab order.
- **Visual states:** default; hover/pressed while dragging (`cursor-grab` →
  `cursor-grabbing`); `focus-visible` ring on the thumb; `disabled` (dimmed root, muted
  track fill and thumb, `cursor-not-allowed`, no input). The track uses `bg-track`, the
  fill uses `bg-primary`, and the thumb uses `bg-surface` with a `border-border` edge.
  The fill is driven by the actual value — it never displays progress that the value does
  not support.
- **Customization:** all colors, radii, borders and focus rings use semantic tokens;
  `className` lands on the root (documented placement) and consumer classes win.
  `formatValue` controls both the announcement and the readout. `showValue` and label
  composition are opt-in so dense layouts can omit the header row.
- **Dependencies:** `@base-ui/react` (Slider primitive) and `react`. No added
  dependency, no `class-variance-authority`.
- **Limits:** optional marks/ticks from the catalog are not implemented (the base
  contract is step/min/max only). Vertical orientation is implemented and unit-tested
  for ARIA and arrow behavior, but jsdom cannot verify pixel geometry; visual review is
  still required. A range's Home/End stops at the adjacent thumb rather than `min`/`max`
  (the outermost thumbs reach the ends). Range suffix naming only applies to string
  labels; rich labels fall back to a shared `aria-labelledby`, so prefer a string label
  for ranges. Base UI exposes minimum and maximum as native `min`/`max` on the range
  input; this component mirrors them as explicit `aria-valuemin`/`aria-valuemax` so the
  ARIA contract is complete in every test environment.

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded —
  `npx vitest run tests/slider.test.tsx` → 1 file, 14 tests passed. Covers role/name and
  aria-value attributes, arrow step, Home/End, Page Up/Page Down, custom fractional
  step, two-thumb range and non-crossing, disabled inertness, controlled and
  uncontrolled updates with exact payloads, vertical orientation ARIA and arrows, ref
  forwarding, className/DOM-prop forwarding, CJK label with a long formatted value, and
  an axe scan.
- [ ] axe-core output and manual a11y checks recorded — the same test file runs axe over
  `document.body` for the range slider with a visible readout: 0 violations (verified).
  Focus reach and accessible naming were asserted through the DOM contract in jsdom;
  a manual real-browser/screen-reader pass was **not run**.
- [x] Storybook states complete, including realistic and CJK/long content —
  `src/ui/slider.stories.tsx`; `npm run build-storybook` → exit 0, all stories compile.
  Per-story visual inspection was not run.
- [ ] Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable — gallery-level browser review performed by the coordinator (see coordinator
  report); per-component captures were **not run**.
- [ ] No accidental overlap, clipping, contrast, focus or animation failures —
  per-component visual verification was **not run**; only the gallery-level pass applies
  (see coordinator report).
- [x] Test registry install into fresh fixture passed — `npm run registry:validate` →
  "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] Dependencies/licenses reviewed; performance and bundle impact documented — no new
  dependency; `@base-ui/react` (MIT) and `react` (MIT) already present. Bundle impact was
  not separately measured.
- [x] Blockers resolved; known limitations named honestly — see *Limits* above.

## Evidence (verified)

- `npx vitest run tests/slider.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 14 passed (14)`.
- `npx tsc --noEmit` → exit 0.
- `npm run lint` → exit 0.
- `npm run build` → exit 0.
- `npm run build-storybook` → exit 0 (all stories compile).
- `npm run registry:validate` → "OK — 32 item(s) valid".
- `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)".
- `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- `npm run test:e2e` → 8 passed, 2 failed. Both failures are pre-existing and unrelated:
  (a) axe `label-content-name-mismatch` on the Button loading state rendered by the
  Phase-0 demo page (`src/main.tsx:62`, `registry/ui/button.tsx` — both untouched by this
  work); (b) a visual-baseline pixel drift on that same Phase-0 page. The e2e target page
  does not render any of these 16 components (the gallery is a Storybook page), so these
  failures are not attributable to this component.
- Browser screenshot review of the gallery Storybook page (light + dark, 1440px; all six
  tabs) was performed by the coordinator; the outcome is recorded in the coordinator
  report. Per-component pixel/screen-reader review: **not run**.

**Links to evidence:** `tests/slider.test.tsx`, `src/ui/slider.stories.tsx`,
`registry/ui/slider.tsx`, and the *Evidence (verified)* section above.
