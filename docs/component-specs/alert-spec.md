# Component: Alert

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Persistent inline messages (validation summaries, permission notices,
partial-failure banners) are re-implemented per product with inconsistent severity
signalling, dismiss behaviour and live-region handling. One alert centralizes the tokens,
the non-colour-only severity cue and the `status`/`alert` live-region contract, while
leaving copy, placement and the action control to the consumer. Alternatives considered:
compound parts (rejected, below) and a dismiss-managing stateful component (rejected —
visibility belongs to the caller's data).

**Source:** [`registry/ui/alert.tsx`](../registry/ui/alert.tsx) (canonical).
[`src/ui/alert.tsx`](../src/ui/alert.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a message that stays in the page flow until the state it
  describes changes — a form-level error, a degraded-mode notice, a partially failed
  operation. Do not use it for transient confirmations (use `Toast`), for a modal decision
  (use `Dialog`), or as a generic page section (use `Surface`). An alert that never
  changes its severity should usually be static (`live="off"`).
- **Public API:**
  - `variant?: "info" | "success" | "warning" | "danger"` — default `"info"`
  - `title?: ReactNode` — short heading; rendered as required-to-understand context
  - `children?: ReactNode` — description text
  - `icon?: ReactNode` — leading glyph; defaults to a per-variant shape. Custom nodes are
    wrapped `aria-hidden`, so any necessary meaning must live in `title`/`children`
  - `action?: ReactNode` — action slot (e.g. a retry button) rendered below the description
  - `dismissible?: boolean` — default `false`; shows a dismiss button
  - `onDismiss?: () => void` — called when the dismiss button is pressed
  - `dismissLabel?: string` — accessible name of the dismiss button, so it can be localised;
    default `"Dismiss"`
  - `live?: "off" | "polite" | "assertive"` — default `"off"`
  - all `HTMLAttributes<HTMLDivElement>` except `title`/`children` (redeclared), including
    `className`, `id` and event handlers; `className` is merged (consumer classes win)
  - `ref` forwards to the root `<div>`
  - exports: `Alert` (named + default), `AlertProps`, `AlertVariant`, `AlertLive`
- **Composition:** **prop-based, not compound parts.** An alert has one bounded content
  region plus one optional action, so `Alert.Title`/`Alert.Action` parts would add import
  ceremony and nesting without enabling any layout a prop cannot express; props also keep
  the required ARIA wiring (title/description association, live role) inside the component
  where it cannot be forgotten. `action` accepts any node, so richer actions still compose.
- **Semantics:** a `<div>` with `data-km-alert`, `data-variant` and `data-live`. Severity
  is signalled by the shape-distinct icon, the accent rule and the visible text, never by
  colour alone. With `live="polite"` the root gets `role="status"`; with `live="assertive"`
  it gets `role="alert"`; with `live="off"` it gets no role. **Exactly one role is ever
  applied** (`role` is a single attribute), and it is never both. `aria-atomic="true"` is
  set on the live variants so the whole notice is announced once.
- **Keyboard/focus:** the root is not focusable. When `dismissible`, the dismiss button is
  a native `<button type="button">` with the accessible name **"Dismiss"**, in DOM order
  after the content and action, reached by Tab and activated by Enter/Space. Dismissing
  does **not** move focus (the consumer decides where focus goes next).
- **Visual states:** default (`bg-surface`, `rounded-surface`, `border-border`, left status
  accent); per-variant accent + icon colour; optional action row; dismiss button states
  (hover `bg-surface-subtle`, active `bg-surface-inset`, `focus-visible` ring). There is
  no disabled state — a notice is informational, not an input.
- **Customization:** `variant`, `title`, `children`, `icon`, `action`, `dismissible`,
  `dismissLabel`, `live`, `className`, and the semantic tokens the Tailwind bridge consumes (`bg-surface`,
  `bg-status-*`, `text-status-*`, `text-foreground`, `text-muted-foreground`,
  `border-border`, `rounded-surface`, `rounded-control`, `--km-duration-short`). The left
  accent is a decorative element, so theming it never changes the meaning.
- **Dependencies:** `react` only. No Base UI (native button), no `cva`, no motion.
- **Limits:** the component does not manage its own visibility — with `dismissible` the
  consumer must hide the alert in `onDismiss`, otherwise the button appears to do nothing;
  the dismiss label is fixed to "Dismiss"; `icon` is always treated as decorative; the
  accent rule is a redundant cue, never the sole signal; `live="assertive"` interrupts
  assistive technology, so reserve it for genuine failures.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/alert.test.tsx`
  → **1 file, 12 tests passed**. Covers: non-live default with no role; title +
  description rendering; default `aria-hidden` per-variant icon and custom icon; accent +
  icon colour for all four variants; `live="polite"` → `role="status"`, `live="off"` → no
  role, `live="assertive"` → `role="alert"` and never both; action slot; dismissible
  button named "Dismiss" (absent by default) invoking `onDismiss` via keyboard-operable
  `userEvent.click`; `className` merge and DOM prop forwarding; `ref` to the root; CJK
  description. (The dismiss button is a native `<button>`, so Enter/Space activation is
  platform behaviour.)
- [ ] **axe-core output and manual a11y checks recorded** — automated `axe.run` over a
  complex state (assertive danger with dismiss + action, polite success with custom icon)
  reports 0 violations in this suite; manual screen-reader and live-region behaviour in a
  real browser were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/alert.stories.tsx` provides Default, Info, Success, Warning, Danger, WithAction,
  Dismissible (stateful demo), WithCustomIcon, LiveRegions and `LongAndLocalizedText`
  (CJK + URL + 再試行 action); `npm run build-storybook` → exit 0, all stories compile.
  Disabled is intentionally N/A (no disabled state). Per-story visual inspection was not
  run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density** —
  gallery-level browser review performed by the coordinator (see coordinator report);
  per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  per-component browser-level verification was **not run**; only the gallery-level pass
  applies (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no
  new dependency; React-only (MIT), no runtime effect. Bundle impact was not separately
  measured.
- [x] **Blockers resolved; known limitations named honestly** — consumer-owned visibility
  and the fixed dismiss label are documented in *Limits*.

## Evidence (verified)

- `npx vitest run tests/alert.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 12 passed (12)`.
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

**Links to evidence:** `tests/alert.test.tsx`, `src/ui/alert.stories.tsx`,
`registry/ui/alert.tsx`, and the *Evidence (verified)* section above.
