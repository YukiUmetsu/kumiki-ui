# Component: Accordion

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Disclosure lists appear in settings, summaries, FAQs and long forms, and each
product re-implements the same heading/button/panel wiring, height measurement and disabled
handling. One implementation keeps the ARIA contract, keyboard behaviour and motion policy
consistent while leaving content, layout and copy to the consumer.

**Source:** [`registry/ui/accordion.tsx`](../registry/ui/accordion.tsx) (canonical).
[`src/ui/accordion.tsx`](../src/ui/accordion.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a list of independently collapsible sections, especially when
  several headings should stay readable at once. Do not use it for navigation (use links), for
  a single disclosure (a plain button + conditional content is simpler), or to hide content
  that must always be found by page search — the panel unmounts when closed by default.
- **Public API:**
  - `Accordion`: `openMultiple?: boolean` (default `false`), `value?: string[]`,
    `defaultValue?: string[]` (default `[]`), `onValueChange?: (value: string[]) => void`,
    `disabled?: boolean` (default `false`), `orientation?: "horizontal" | "vertical"`
    (default `"vertical"`), `className?`, all native `<div>` props, `ref` to the root.
  - `Accordion.Item`: `value: string` (required), `disabled?: boolean` (default `false`),
    `className?`, native `<div>` props, `ref` to the item wrapper.
  - `Accordion.Header`: native `<h3>` props and `ref`; renders Base UI's heading.
  - `Accordion.Trigger`: native `<button>` props and `ref`; `children` form the visible label.
  - `Accordion.Panel`: native `<div>` props and `ref`; content is wrapped in a padded inner
    element so the panel itself can collapse to `0`.
  - exports: `Accordion` (compound, named + default), `AccordionItem`, `AccordionHeader`,
    `AccordionTrigger`, `AccordionPanel`, and the types `AccordionProps`,
    `AccordionItemProps`, `AccordionHeaderProps`, `AccordionTriggerProps`,
    `AccordionPanelProps`, `AccordionOrientation`.
- **Composition:** compound form (`Accordion`, `.Item`, `.Header`, `.Trigger`, `.Panel`) or the
  named parts; `Object.assign` mirrors Base UI's shape. Each item owns exactly one header,
  trigger and panel. `className` is merged on every part with consumer classes last.
- **Semantics:** the root is a plain `<div>`; each item pairs an `<h3>` with a native
  `<button>` trigger carrying `aria-expanded` and `aria-controls` (when open). The panel is a
  `role="region"` labelled by its trigger (`aria-labelledby`). Disabled items use the native
  `disabled` attribute plus `data-disabled`; the whole accordion can be disabled at the root.
  Open items expose `data-open` on the panel and `data-panel-open` on the trigger for styling.
- **Keyboard/focus:** Enter and Space toggle through the native button. ArrowDown/ArrowRight
  move focus to the next enabled trigger and ArrowUp/ArrowLeft to the previous one, wrapping at
  the ends; Home/End jump to the first/last enabled trigger. Both arrow pairs are accepted
  regardless of `orientation`, so the control remains usable when the layout is turned
  sideways. Disabled triggers are skipped and cannot be focused. Every trigger is a natural tab
  stop — Base UI follows the current APG guidance and does not implement roving `tabindex`.
  Focus is drawn with a 2px inset ring so it is never clipped by the card corners.
- **Visual states:** closed; hover (`bg-surface-subtle`); active (`bg-surface-inset`); open
  (chevron rotates 180° via `group-data-[panel-open]`, text remains `text-foreground`);
  `focus-visible`; disabled (`text-muted-foreground`, not-allowed cursor, no hover fill). The
  panel animates `height` from `--accordion-panel-height` with `data-starting-style` /
  `data-ending-style` collapsing to zero. Motion uses `--km-duration-short` + `ease-continuity`
  and is removed under `prefers-reduced-motion: reduce`; the panel then opens instantly.
- **Customization:** semantic tokens only — `bg-surface`, `bg-surface-subtle`,
  `bg-surface-inset`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `ring-ring`, `rounded-surface`, `--km-control-height`, `--km-control-space-x`,
  `--km-duration-short`, `ease-continuity`. `className` on the root styles the card, on the
  panel the animated outer element (not the padded content wrapper); the trigger's `className`
  composes with the built-in layout. No consumer CSS selector or global is required.
- **Dependencies:** `@base-ui/react` (Accordion primitive, already present) and `react`. No
  motion library is used; animation is CSS-only so it disappears cleanly without JavaScript.
- **Limits:** item values are typed `string`; non-string value identities are not supported.
  Server-side rendering of measured height is not attempted (closed panels simply do not
  render). The heading level is fixed at `<h3>`; consumers needing another level should render
  their own heading around the trigger. `hiddenUntilFound` and `keepMounted` are not exposed,
  so closed panels are not discoverable by find-in-page. The panel's padded content wrapper is
  internal, so vertical spacing inside a panel is not individually customizable without a
  child element. CSS animation cannot be verified in jsdom; it requires a visual/browser check.

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded —
  `npx vitest run tests/accordion.test.tsx` → **1 file, 14 tests passed**. Covers: heading/button/region
  roles and `aria-controls`/`aria-expanded`; single-mode open/close and exact callback payloads
  (`["shipping"]`, `[]`); `openMultiple` accumulation and release; Enter/Space toggling;
  ArrowUp/ArrowDown navigation with wrap, Home/End, and disabled-item skipping; disabled item
  non-interactive with no callback; uncontrolled `defaultValue`; controlled value with parent
  state; root and trigger ref forwarding; `className` merge on every part; axe run on the
  expanded state (`document.body`).
- [ ] axe-core output and manual a11y checks recorded — automated axe in jsdom reports 0
  violations; manual screen-reader and real-browser focus checks were **not run**.
- [x] Storybook states complete, including realistic and CJK/long content — stories are written
  (`Default`, `OpenMultiple`, `WithDisabledItem`, `Controlled`, `LongAndLocalizedText`);
  `npm run build-storybook` → exit 0, all stories compile. Per-story visual inspection was not run.
- [ ] Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable
  — gallery-level browser review performed by the coordinator (see coordinator report);
  per-component captures were **not run**.
- [ ] No accidental overlap, clipping, contrast, focus or animation failures — per-component
  browser verification was **not run**; only the gallery-level pass applies (see coordinator report).
- [x] Test registry install into fresh fixture passed — `npm run registry:validate` →
  "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary fixture (removed)".
- [x] Dependencies/licenses reviewed; performance and bundle impact documented — no new
  dependency; the item depends on `@base-ui/react` (MIT) and `react` (MIT), both already present.
  Bundle impact was not separately measured.
- [x] Blockers resolved; known limitations named honestly — limitations are listed above;
  registry and gallery wiring were completed by the coordinator.

## Evidence (verified)

- `npx vitest run tests/accordion.test.tsx` → `Test Files 1 passed (1)`,
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

**Links to evidence:** `tests/accordion.test.tsx`, `src/ui/accordion.stories.tsx`,
`registry/ui/accordion.tsx`, and the *Evidence (verified)* section above.
