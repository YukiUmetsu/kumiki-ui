# Pattern: Data + details workspace

**Status:** Verified
**Catalog phase:** Reusable application pattern (composes v0.2 `Table` + `SplitPane`)
**Why shared:** Scanning a sortable list and inspecting one record beside it is the same
task in every data-heavy product, and its hard parts never change: a table that sorts
honestly, a resizable divider that also works from the keyboard, a detail panel that
never clips, and selection that survives resizing and a narrow viewport. Rebuilt by hand
each time, those pieces produce the same defects — a header that scrolls away, a divider
no keyboard user can move, a panel that hides content at 320 px, and a selection lost
when the layout stacks. This pattern keeps columns, rows, sort state, selection and the
detail renderer as consumer props and reuses the verified `Table` and `SplitPane`
primitives for the interaction quality; the alternative of re-implementing the layout
alongside the primitives was rejected because it duplicates their accessibility and
overflow contracts.

**Source:** [`registry/patterns/data-details-workspace.tsx`](../registry/patterns/data-details-workspace.tsx)
(canonical). [`src/patterns/data-details-workspace.tsx`](../src/patterns/data-details-workspace.tsx)
re-exports it for the showcase.

## Pattern contract

### (a) User task

Scan a sortable table, select a row, and inspect or edit its details in an adjacent
panel without losing context.

### (b) Entry / exit states

- **Entry:** table loaded, no selection, detail panel shows the empty state.
- **Selecting:** row highlighted (`data-selected` on the `<tr>` + a start-edge indicator) and
  its per-row radio checked; detail panel populates.
- **Resizing:** divider moved by pointer or keyboard; selection persists because it is
  controlled by `selectedId`, not stored inside the pattern.
- **Loading:** skeleton rows replace the body, table `aria-busy`, polite status.
- **Empty table:** one full-width body cell with `emptyMessage` / `labels.emptyList`.
- **Error:** danger `Alert` with a retry action in place of the rows.
- **Empty detail:** centered muted block with `renderEmptyDetail` or
  `labels.emptyDetail`.

### (c) Composition

- `Table` (semantic `<table>`, `stickyHeader`, bounded `maxHeight`, its own horizontal
  and vertical overflow) as the primary pane.
- Sortable `Table.Head` columns (`aria-sort` on the sorted column only).
- `SplitPane` (percent units, primary default 40 %) with its built-in pointer **and**
  keyboard divider.
- `Alert` for the error state, `Button` for the retry action.
- `Skeleton` rows for loading; detail panel is a plain `<section>` using
  `bg-surface` / `bg-canvas` from the `SplitPane` panes (no nested `Surface` cards).

### (d) Keyboard behaviour + focus management

- The divider is the focusable `role="separator"` supplied by `SplitPane`: arrow keys
  resize by one percent, `Home`/`End` jump to the bounds, pointer drag keeps selection
  stable.
- Table rows themselves are **not** pushed into the tab order (matching the brief); instead
  every selectable row renders a native radio (`data-part="select"`, named from
  `labels.selectRow` → “Select <row label>”), so the same selection is reachable and
  committed entirely by keyboard. Row click and the radio both call `onSelect`, keeping a
  single selection tab stop per row while the sort buttons and the divider stay reachable.
- The detail region is a named landmark (`role="region"`, `aria-label` from
  `labels.detail`) and is `tabIndex={-1}`, so a consumer may move focus to it after a
  selection with `detailRef`-free `document`/`ref` access. The pattern never steals
  focus on selection.

### (e) Loading / error / cancel / retry / restore

- Loading: skeleton rows inside `<Table.Body>` with `aria-busy="true"` on the table and a
  polite `role="status"` message; stale rows are never shown while a request is in
  flight.
- Error: a danger `Alert` (`live="polite"`) in a full-width body cell, with a **Retry**
  button wired to `onRetry`.
- Selection is preserved across pane resize and orientation changes.
- No clipped panels: `SplitPane`'s panes both use `min-h-0 min-w-0 overflow-auto`; long
  identifiers, CJK values and narrow widths scroll instead of clipping.

### (f) Responsive fallback

- **< 768 px:** the `SplitPane` switches to `orientation="vertical"` automatically
  (detected with `matchMedia`); selection is preserved through the re-layout.
- **≥ 768 px:** horizontal `SplitPane` with a recommended primary size of 40 %.
- `orientation` may be forced (used by the stacked story and tests) and degrades to the
  wide layout when `matchMedia` is unavailable.

### (g) Exposed callbacks / slots

```text
title?: ReactNode
description?: ReactNode
columns: { key; header; sortable?; render? }[]
rows: { id; [key]: unknown }[]
sort: { key; direction } | null
onSortChange(key): void
selectedId?: string
onSelect(row): void
primarySize?: number
onPrimarySizeChange(size): void
primaryMinSize?: number        // default 20
primaryMaxSize?: number        // default 80
renderDetail?(row): ReactNode
renderEmptyDetail?(): ReactNode
loading?: boolean
error?: ReactNode | null
onRetry?(): void
emptyMessage?: ReactNode
maxHeight?: number | string    // default "100%"
orientation?: "horizontal" | "vertical"
labels?: { list; detail; resize; loading; retry; errorTitle; emptyDetail; emptyList; selectRow }
```

The consumer supplies columns, rows, sort state, selection and the detail renderer.

### (h) Neutral sample + empty copy

- Columns: “Name”, “Status”, “Updated”.
- Rows: “Item 01”, “Item 02”.
- Empty detail: “Select an item to view details.”
- Empty table: “No items found.”
- Row select label: “Select {label}” (e.g. “Select Item 01”).

### (i) Motion

- Row selection background: `transition-colors duration-[var(--km-duration-short)]`
  (`Table.Row`).
- Divider hover/active: colour transition with `data-dragging` disabling text selection
  (`SplitPane`).
- Detail panel content: `motion.div` fade-in (opacity 0 → 1, translateY 4px → 0, 180 ms,
  `ease-continuity`) keyed on the selected row; suppressed under `useReducedMotion()`.

## Contract details

- **Use / not use:** use for a two-pane “list + inspect” task where the list is tabular
  and one row is open at a time. Do not use it as a data-fetching layer (it renders the
  `rows` it is given), as a routable master/detail with URL state (the consumer owns
  routing), as a multi-select grid, or as a form (the detail renderer is arbitrary
  consumer content).
- **Public API:** as listed above. `columns`, `rows`, `sort`, `selectedId` and
  `primarySize` are controlled; `onSortChange`, `onSelect`, `onPrimarySizeChange` report
  changes. `renderDetail` is required for the detail pane to show anything; without it a
  selection leaves the empty state in place. Exports: `DataDetailsWorkspace` (named +
  default), `DataDetailsWorkspaceProps`, `DataDetailsColumn`, `DataDetailsRow`,
  `DataDetailsSort`, `DataDetailsSortDirection`, `DataDetailsWorkspaceLabels`.
  `ref` forwards to the root `HTMLDivElement`; arbitrary div props (minus `onSelect` and
  `title`) and `className` are merged onto it.
- **Composition:** data-driven; there are no child components to nest. The header
  (`title`/`description`) uses the shared region shell (`font-serif text-heading
  font-normal tracking-heading text-foreground` + `font-sans text-body
  text-muted-foreground`, `gap-1`, `mb-8`). Columns are declared, not children.
- **Semantics:** the root is a plain `div` (`data-km-data-details-workspace`). The list
  is a real `<table>` named by `labels.list` (default “Items”) with `scope="col"` headers
  and `aria-sort` on the sorted column only. The detail pane is a named `region`
  landmark. Loading is `aria-busy` plus a polite `role="status"`; the error `Alert` is
  `live="polite"`. Each selectable row renders a native radio (`type="radio"`,
  `data-part="select"`, `aria-label` from `labels.selectRow`) in its first cell; the row
  keeps `data-selected` and the radio mirrors it with `checked`. The pattern does not add
  `aria-selected` to `<tr>`, which is invalid on a native table row.
- **Visual states:** header present/absent; row default/hover (`interactive`)/selected
  (`data-selected`, `font-medium`, a `bg-checked` start-edge indicator bar and a checked
  radio)/`data-row-id`; sortable header default/ascending/descending/plain (no dead button
  when no handler is supplied); loading skeleton rows; error alert; empty table; empty
  detail; long and CJK cell values wrap with `break-words` and otherwise scroll inside the
  table's own container.
- **Customization:** `labels` localises every built-in string; `emptyMessage`,
  `renderDetail`, `renderEmptyDetail`, `columns[].render`, `primarySize`/
  `primaryMinSize`/`primaryMaxSize`, `maxHeight` and `orientation` tune behaviour;
  `className` lands on the root and is merged last. Styling uses semantic tokens only:
  `bg-surface`, `bg-canvas`, `bg-surface-subtle`, `border-border`, `rounded-surface`,
  `text-foreground`, `text-muted-foreground`, `ring-ring`, `--km-duration-short`,
  `ease-continuity`. No global CSS or app-specific selectors are required.
- **Dependencies:** `react` and `motion` (MIT) only, both already required by the
  registry; the pattern composes existing registry items (`Table`, `SplitPane`, `Alert`,
  `Button`, `Skeleton`, `Badge` in examples). No new package, no icon package, no
  `clsx`/`tailwind-merge`.
- **Limits:** single-column sort only (`sort` is one `{ key, direction }`); the pattern
  does not sort, paginate or fetch — it renders the `rows` it is given and reports the
  requested sort key. `renderDetail` is required for the detail pane to render anything.
  A single `loading` flag drives the table only; the detail pane does not have its own
  skeleton (the consumer expresses detail loading inside `renderDetail`, or with
  `renderEmptyDetail`). Selection is by row click or the per-row radio; rows themselves are
  not focusable (a deliberate match to the pattern brief), and the radio supplies the
  keyboard path. The workspace does not implement Escape-to-clear-selection (consumer-owned). The `matchMedia` breakpoint is fixed at
  768 px; SSR renders the horizontal layout and upgrades after hydration. Sticky headers
  need a bounded workspace height for the table's own scroll area to engage.

## Acceptance evidence

- [x] **Behavior tests executed; commands/results recorded** — `npx vitest run
  tests/data-details-workspace.test.tsx` → 1 file, 11 tests passed. Covers: columns as
  headers and rows as cells; a sortable column without a handler renders no dead button;
  `onSortChange(key)` plus controlled `aria-sort`; selecting a row populates the detail
  panel and reports the row; empty detail state and custom `renderEmptyDetail`; loading
  skeleton rows + `aria-busy` + polite status with no stale rows; no skeletons when idle;
  empty-table message; error `Alert` with a working retry; ref/`className`/orientation
  forwarding; an axe run with a selected row.
- [x] **axe-core output and manual a11y checks recorded** — axe-core ran in jsdom in the
  selected state with 0 violations (verified) and in the Playwright e2e in both appearances
  (0 violations); manual screen-reader and 200 % zoom checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** — stories
  authored (`Default`, `WithSelection`, `Loading`, `Empty`, `Error`, `Stacked`,
  `LongAndLocalizedText`). Per-story visual inspection was not run; `npm run
  build-storybook` was not part of this task's validation scope.
- [x] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density** —
  `npx playwright test tests/e2e/patterns.spec.ts` regenerated and asserted the full-page
  light baseline; axe runs in light/dark and there is no horizontal overflow at
  320/375/768/1440 → `6 passed`.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — covered by
  the e2e overflow audit and the axe runs; a separate manual visual review was not performed.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:fixture` →
  `registry:fixture OK — 38 item(s), 40 file(s) compiled in a temporary fixture (removed)`;
  `npm run registry:smoke` → `38 item(s), 79 file(s)`; `npm run registry:validate` →
  `38 item(s) valid`.
- [x] **End-to-end user task verified in the built app** — `npm run test:e2e` → `16 passed`
  (10 showcase + 6 patterns); the pattern's own spec is `6 passed` (sort, select via row and
  via the per-row radio, detail follows selection).
- [x] **Dependencies/licenses reviewed** — no dependency added; imports only `react` and
  `motion` (MIT) plus sibling registry items. Bundle/performance impact was not separately
  measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/data-details-workspace.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 11 passed (11)`; full `npx vitest run` → `Test Files 82 passed (82)`,
  `Tests 760 passed (760)`.
- `npx tsc --noEmit` → exit 0 (no errors, including in this pattern's files).
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Sorts by the Updated column,
  selects a row (asserting the detail pane, the checked per-row radio and its accessible
  name), regenerates the full-page light baseline, runs axe in light and dark (0 violations)
  and checks for no horizontal overflow at 320/375/768/1440.
- `npm run test:e2e` → `16 passed` (10 showcase + 6 patterns), exit 0.
- `npm run registry:validate` → `registry:validate OK — 38 item(s) valid.`
- `npm run registry:smoke` → `registry:smoke OK — 38 item(s), 79 file(s) staged into an
  isolated directory.`
- `npm run registry:fixture` → `registry:fixture OK — 38 item(s), 40 file(s) compiled in a
  temporary fixture (removed)`.
- `npm run tokens:validate` → `tokens:validate OK`.
- `npm run contrast:audit` → `contrast:audit OK — 16 enforced pair(s) (+2 informational),
  3 theme(s)`.
- **Not run (unchanged):** manual screen-reader pass, manual 200 % zoom check and
  `npm run build-storybook`.

**Links to evidence:** `tests/data-details-workspace.test.tsx`,
`src/patterns/data-details-workspace.stories.tsx`,
`registry/patterns/data-details-workspace.tsx`, and the *Evidence (verified)* section
above.
