# Component: Split Pane

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Two-pane workspaces are re-built per product, usually with a mouse-only drag handle, no keyboard alternative, no announced value and no reliable clamping. A shared split pane keeps the pointer, touch and keyboard contracts identical everywhere while leaving panel content, persistence and responsive policy to the consumer. Alternatives considered: adopting a third-party resizable-panels package (rejected — it adds a dependency for one layout primitive and hides the ARIA contract) and a CSS-only `resize` handle (rejected — not keyboard-operable, not announced, and not clampable).

**Source:** [`registry/ui/split-pane.tsx`](../registry/ui/split-pane.tsx) (canonical).
[`src/ui/split-pane.tsx`](../src/ui/split-pane.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a two-region workspace where the user needs more room on one
  side — editor/preview, list/detail, navigation/content. Do not use it for equal fixed
  columns (use a grid), for content that must reflow at every breakpoint (a split pane is
  an explicit user choice, not a responsive substitute), or for more than two regions
  (compose nested panes deliberately and keep the tab order sensible). The primary panel
  is the resized side; the secondary panel takes the remainder.
- **Public API:**
  - `primarySize?: number` — controlled size of the primary panel, in `unit`.
  - `defaultPrimarySize?: number` — initial size when uncontrolled; default `50`
    (`"percent"`) or `240` (`"pixels"`).
  - `onPrimarySizeChange?: (size: number) => void` — next clamped size after a drag or
    key press.
  - `minPrimarySize?: number` — default `10` (`"percent"`) or `0` (`"pixels"`).
  - `maxPrimarySize?: number` — default `90` (`"percent"`) or the measured panel space
    (`"pixels"`); pixel values are additionally capped to the measured space.
  - `unit?: "percent" | "pixels"` — default `"percent"`.
  - `orientation?: "horizontal" | "vertical"` — default `"horizontal"`; horizontal places
    the panels side by side.
  - `aria-label?: string` — accessible name of the divider; default `"Resize panels"`.
  - `primary: ReactNode`, `secondary: ReactNode` — panel content.
  - `disabled?: boolean` — default `false`; removes the divider from tab order and ignores
    all resizing input.
  - `className`, `style`, standard `<div>` attributes and `ref` (forwarded to the root).
  - exports: `SplitPane` (named + default), `SplitPaneProps`, `SplitPaneUnit`,
    `SplitPaneOrientation`.
- **Composition:** one root grid with exactly three children: the primary panel, the
  divider and the secondary panel. Both panels are scroll containers
  (`overflow-auto`, `min-w-0`/`min-h-0`), so long content scrolls inside a pane instead of
  widening it. There are no slot props for the divider; customize it through tokens and
  the documented states, and put application chrome inside `primary`/`secondary`. The
  divider keeps an `--km-border-subtle` track and paints a centred 1px grip in
  `--km-border-strong` (`bg-input`, ≈4.3:1 light / ≈3.1:1 dark against either panel), so
  the handle is identifiable at rest — clearing the 3:1 non-text bar — without depending
  on a hover state or a heavy band.
- **Semantics:** the divider is a focusable `role="separator"` with `aria-orientation`
  matching the divider itself (a side-by-side layout has a vertical divider), plus
  `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and a formatted `aria-valuetext`
  (`"50%"`, `"240 pixels"`). `aria-controls` points at the primary panel. Percentage
  bounds are clamped to 0–100; pixel bounds are clamped to the measured panel space. The
  primary panel takes `size` share of the space left after the divider and the secondary
  panel takes the remainder, so the two panels can never overflow their container.
- **Keyboard/focus:** the divider is in the tab order (`tabIndex=0`). In a horizontal
  layout Left/Right decrease/increase the primary size by 1 percentage point or 10 pixels;
  in a vertical layout Up/Down do the same. `Home`/`End` jump to the resolved minimum and
  maximum. Arrow presses at a bound do nothing and do not emit a redundant callback. The
  divider is not a button: no collapse toggle is exposed, so Enter/Space intentionally do
  nothing. A visible `focus-visible` ring is painted on the divider. When disabled, the
  divider keeps its role and value information, gains `aria-disabled="true"`, and leaves
  the tab order (`tabIndex=-1`).
- **Visual states:** default (`bg-border` divider, `bg-surface` primary panel,
  `bg-canvas` secondary panel); hover (`bg-ring`); active drag (`bg-primary`, root
  `select-none`); `focus-visible` (`ring-ring` with a 2px offset); disabled (dimmed root,
  `cursor-not-allowed`, hover/active colours suppressed). The divider also exposes
  `data-dragging`, `data-disabled`, `data-orientation` and `data-unit` hooks. Text
  selection is prevented on pointer-down and the divider uses `touch-none`, so dragging
  never selects panel text or scrolls the page.
- **Customization:** all colours, radii, motion and focus styling come from semantic
  tokens. `className` is merged onto the root last, so consumer layout classes win against
  the component's own utilities. A consumer `style` object is merged after the internal
  grid template, so an explicit `gridTemplateColumns`/`gridTemplateRows` can replace the
  size math when a project needs a different layout model. Size, bounds, unit, orientation
  and disabled state are all props; persistence is left to the consumer via the controlled
  `primarySize` pair.
- **Dependencies:** `react` only. The implementation is self-contained — it imports no
  other registry file, no Base UI package and no new dependency.
- **Limits:** no collapse/restore affordance (and therefore no Enter/Space toggle); no
  double-click reset; no responsive auto-stacking (the catalog mentions a breakpoint
  fallback, which is not implemented in this pass); vertical orientation needs a bounded
  height on the root or an ancestor — the component does not impose one;
  `primarySize`/`defaultPrimarySize` are read as a share of the space after the divider
  in percentage mode; the fixed
  keyboard steps (1% / 10px) are not configurable; `aria-valuetext` is generated in
  English units and is not localizable; pointer drag direction assumes left-to-right
  layout (RTL mirrors the panels visually but not the drag sign); pixel maximum relies on
  measured geometry, so jsdom and a zero-sized container fall back to a 600px ceiling
  (and to a 100-unit drag length for percentages) until a real measurement exists; the
  divider's pointer hit area extends 8px into each panel (24px total) to meet target-size
  guidance, so controls flush against a panel edge lose that strip to the divider.

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded —
  `npx vitest run tests/split-pane.test.tsx` → 1 file, 11 tests passed. Covers: separator role,
  name, `aria-orientation` and the full value contract; horizontal and vertical key
  mapping; arrow movement with exact callback payloads; Home/End and clamping at both
  bounds; disabled inertness for keys and pointer events; controlled and uncontrolled
  sizes with an out-of-range controlled value; pointer drag (geometry mocked to 408px,
  8px divider) with clamping, focus and text-selection state; pixel unit and pixel value
  text; ref/`className`/DOM-prop forwarding; axe scan of a vertical pane.
- [ ] axe-core output and manual a11y checks recorded — the automated axe scan is part
  of the test file and reports 0 violations in jsdom (verified); manual browser,
  screen-reader and zoom checks were **not run**.
- [x] Storybook states complete, including realistic and CJK/long content — stories for
  Default, Vertical, Pixels, WithMinMax, Disabled, Controlled and
  LongAndLocalizedText are authored; `npm run build-storybook` → exit 0, all stories
  compile. Per-story visual inspection was not run.
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
- [x] Dependencies/licenses reviewed; performance and bundle impact documented — no
  dependency was added; the component imports only `react` (MIT) and adds no runtime
  package, no observer beyond a guarded `ResizeObserver` used for pixel bounds. Bundle
  impact was not separately measured.
- [x] Blockers resolved; known limitations named honestly — see *Limits* above; the
  missing collapse toggle, responsive stacking and RTL drag sign are explicit gaps rather
  than hidden behaviour.

## Evidence (verified)

- `npx vitest run tests/split-pane.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 11 passed (11)`.
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

**Links to evidence:** `tests/split-pane.test.tsx`, `src/ui/split-pane.stories.tsx`,
`registry/ui/split-pane.tsx`, and the *Evidence (verified)* section above.
