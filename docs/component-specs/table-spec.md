# Component: Table

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Data tables are rebuilt in every product, and the rebuild usually loses
the same things: a real `<table>` with scoped headers, a single sorted column announced
through `aria-sort`, a header that stays pinned over a long body, and honest
empty/loading rows. One foundation fixes the semantics, sort wiring and token styling
while leaving columns, alignment, formatting, actions and data fetching to the consumer.
Alternatives considered: a full data grid with selection, resizing and virtualization
(rejected for this phase — deferred in the catalog) and a per-product table (rejected
because semantics and keyboard expectations are shared, not brand-specific).

**Source:** [`registry/ui/table.tsx`](../registry/ui/table.tsx) (canonical).
[`src/ui/table.tsx`](../src/ui/table.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for tabular data with rows and columns — invoices, members,
  deployments, logs — including tables that must scroll horizontally on narrow screens.
  Do not use it for layout (use grid/flex) or for a one-dimensional list (use a list);
  do not use it as a spreadsheet: there is no virtualization, column resizing, cell
  editing, range selection or multi-column sort in this phase.
- **Public API:**
  - `Table` — root. Extends `ComponentPropsWithoutRef<"table">`. Props:
    `stickyHeader?: boolean` (default `false`), `maxHeight?: number | string` (default
    `undefined`), `className` (merged onto the `<table>`, consumer classes last),
    `ref` forwarded to the `<table>`; every other table prop (`aria-label`,
    `aria-labelledby`, `aria-busy`, `id`, `data-*`, …) spreads onto the `<table>`.
  - `Table.Caption` — `<caption>`; extra classes merge onto it. A caption also names
    the table, so prefer it over `aria-label`.
  - `Table.Header` / `Table.Body` / `Table.Footer` — `<thead>` / `<tbody>` / `<tfoot>`.
  - `Table.Row` — `<tr>`. Props: `selected?: boolean` (default `false`) and
    `interactive?: boolean` (default `false`) — visual hooks only, exposed as
    `data-selected` / `data-interactive`; no `aria-selected`, no click behavior.
  - `Table.Head` — `<th>`. Props: `scope?: "col" | "row" | "colgroup" | "rowgroup"`
    (default `"col"`), `sortDirection?: "ascending" | "descending" | "none"`,
    `onSortChange?: () => void`.
  - `TableCell` — `<td>` (also on the compound object as `Table.Cell`).
  - Exports: `Table` (named + default), `TableCaption`, `TableHeader`, `TableBody`,
    `TableFooter`, `TableRow`, `TableHead`, `TableCell`, and the types `TableProps`,
    `TableCaptionProps`, `TableHeaderProps`, `TableBodyProps`, `TableFooterProps`,
    `TableRowProps`, `TableHeadProps`, `TableCellProps`, `TableSortDirection`.
  - `className` on every part merges with the part's token classes; consumer classes
    win. `ref` forwards to that part's native element.
- **Composition:** a compound object (`Object.assign`) mirroring the DOM shape:
  `Table` → `Caption` + `Header` (→ `Row` → `Head`) + `Body` (→ `Row` → `Head`/`Cell`) +
  `Footer` (→ `Row` → `Cell`). `Table.Header` reads `stickyHeader` from the root through
  internal context, so the header part does not repeat the prop.
  - **Empty state:** render one row with a single full-width cell, e.g.
    `<Table.Row><Table.Cell colSpan={columns.length}>No invoices yet.</Table.Cell></Table.Row>`.
    The component does not add a dedicated `Empty` part, because `colSpan` is
    consumer-owned and a wrong default would produce a broken grid.
  - **Loading state:** mark the table `aria-busy="true"`, keep the real header, and
    render one row per pending item whose cells contain `<Skeleton>`s. `Skeleton` is
    `aria-hidden`, so announce the work once outside the table (`role="status"`) —
    see the `LoadingState` story. Do not fabricate placeholder numbers.
- **Semantics:** a real `<table>` inside a scroll container, so browsers and assistive
  technology get `table` / `rowgroup` / `row` / `columnheader` / `rowheader` / `cell`
  roles without ARIA role overrides. Header cells render `scope="col"` by default and
  accept `scope="row"` for row headers in the body. `aria-sort` is emitted only when
  the header is sortable **and** currently sorted; `"none"` and unsorted columns omit
  the attribute. The sort control is a native `<button type="button">` inside the
  `<th>`; the decorative arrow is `aria-hidden` and `focusable="false"`. Rows never
  claim `aria-selected` (invalid on a native table). The outer container is
  `data-km-table="container"`, the `<table>` is `data-km-table="root"`, and parts carry
  `data-part` (`caption`, `header`, `body`, `footer`, `row`, `head`, `cell`,
  `sort-button`).
- **Keyboard/focus:** no custom key handling. Sort buttons use native Enter/Space and
  take normal tab order; each has a 2px `ring-ring` `focus-visible` ring offset against
  `surface-subtle`. Horizontal scrolling follows the platform. The component does not
  add a `tabIndex` to the scroll container (that would create an unnamed tab stop); in
  Chromium/WebKit a focused cell scrolls into view, and browsers that expose scroll
  containers as focusable make the region reachable. If the consumer needs an explicit
  scroll affordance, wrap the table in their own named, focusable region.
- **Visual states:** default surface (`bg-surface`, `text-foreground`); header
  `bg-surface-subtle` with `text-muted-foreground` labels; rows separated by
  `border-border` rules (`last:border-b-0`); `data-[interactive]` rows tint on hover;
  `data-[selected]` rows use `bg-surface-subtle` (a background change, consistent in
  light/dark and not a colour-only severity signal); sticky header
  (`sticky top-0 z-10`) keeps an opaque `bg-surface-subtle` so rows cannot show through;
  sorted header labels switch to `text-foreground` and show a direction arrow.
  `stickyHeader` sticks inside the component's own scroll area, so pair it with
  `maxHeight`; without a bounded height the area never scrolls and the header behaves
  like a normal header.
- **Customization:** semantic tokens only (surface, border, text, ring, motion
  duration/easing); column alignment and width via `className` on `Table.Head` /
  `TableCell`; consumer `className` on every part; refs and arbitrary DOM props
  forwarded. Density, appearance, radii and motion come from the token layer, so no
  per-table overrides are required.
- **Dependencies:** `react` only. No Base UI, no cva, no virtualization library.
- **Limits:** no virtualization (deferred by the catalog); no column resizing,
  reordering, pinning beyond the sticky header, grouping, editing or multi-sort; sort
  is controlled — `onSortChange` is a signal and the consumer owns direction; a header
  with `sortDirection` but no `onSortChange` is not treated as sortable; `Table.Row`
  hooks are visual only and consumers must implement a real, keyboard-operable action
  inside a cell; the scroll container's `maxHeight` is the only height knob (margins
  belong on a consumer wrapper); `className` targets the `<table>`, so the inner
  scroll shell itself is not styleable; long unbroken tokens widen the table and rely
  on the scroll container rather than breaking (add `break-words`/`whitespace-nowrap`
  per cell as needed); horizontal scroll reachability without `tabIndex` depends on
  the browser as described above.

## Acceptance evidence

- [x] **Behavior tests executed** — `npx vitest run tests/table.test.tsx` → 1
  file, 11 tests passed. Covers: table/rowgroup/row/columnheader/rowheader/cell roles,
  `scope="col"` defaults and `scope="row"`, `aria-sort` only on the sorted column,
  sort button click + Enter/Space, sticky header class/attribute and `maxHeight`,
  the full-width empty row, ref/`className`/prop forwarding, selected/interactive row
  hooks, compound/named exports, and CJK/long-URL content.
- [ ] **axe-core automated check** — runs inside the same vitest file on the most
  complex state (caption, two sortable columns, selected row, row headers, footer):
  0 violations. jsdom cannot evaluate color contrast or layout, so this is an
  automated semantics check only. Recorded for this component; no separate manual pass.
- [ ] **Manual a11y checks** — **not run**: screen-reader announcement
  of sort, focus order across the scroll area, and horizontal-scroll reachability in
  Safari remain to be verified.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  written (`Default`, `WithCaption`, `Sortable`, `StickyHeader`, `EmptyState`,
  `LoadingState`, `NarrowOverflow`, `LongAndLocalizedText`); `npm run build-storybook`
  → exit 0, all stories compile. Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density** —
  gallery-level browser review performed by the coordinator (see coordinator report);
  per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  per-component visual verification was **not run**; the 320px `NarrowOverflow` story is
  prepared for that review.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed** — no dependency added; the item imports only
  `react` (MIT). Audit/bundle measurement was not separately performed.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above; the
  remaining unchecked item is the manual browser/screen-reader pass noted above.

## Evidence (verified)

- `npx vitest run tests/table.test.tsx` → `Test Files 1 passed (1)`,
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

**Links to evidence:** `tests/table.test.tsx`, `src/ui/table.stories.tsx`,
`registry/ui/table.tsx`, and the *Evidence (verified)* section above.
