# Component: Search + Results (pattern)

**Status:** Verified
**Catalog phase:** specialized (reusable application pattern, not a primitive)
**Why shared:** A search view repeats the same fragile pieces in every product — a
controlled query field, a facet layer, dismissible active-filter chips, and honest
loading/empty/error states — each re-implemented with its own markup and accessibility
bugs (a search field that is not reachable by the `/` shortcut, stale results shown while a
new request is in flight, a colour-only error). One pattern with a bounded contract removes
that duplication while leaving fetching, filtering, debouncing, routing and copy to the
consumer.

**Source:** [`registry/patterns/search-and-results.tsx`](../registry/patterns/search-and-results.tsx)
(canonical). [`src/patterns/search-and-results.tsx`](../src/patterns/search-and-results.tsx)
re-exports it for the showcase. The pattern **composes** the existing
[`SearchableResults`](../registry/ui/searchable-results.tsx) primitive and does **not**
modify it.

## Contract

- **Use / not use:** use for a search or filter view that combines a query field with one or
  more facets and owns its own loading/empty/error presentation. Do not use it as a
  data-fetching, filtering or routing layer — it renders the `results` it is given, reports
  filter intent through `onFiltersChange`, and calls back on every keystroke. Do not use it
  when there is no query (use a plain list) or when you need per-row trailing actions or a
  custom row renderer (neither `SearchableResults` nor this pattern exposes one).
- **Public API:**
  - `query: string` — required, controlled. The consumer owns the value.
  - `onQueryChange: (query: string) => void` — required; called with the next value on every
    keystroke.
  - `results: SearchableResult[]` — required. `SearchableResult` is
    `{ id: string; title: ReactNode; subtitle?: ReactNode; group?: string; href?: string;
    disabled?: boolean }`; `id` must be unique and stable.
  - `filters?: SearchFilter | SearchFilter[]` — zero or more filters; a single filter may be
    passed directly. `SearchFilter` is a discriminated union of
    `{ id; label; type: "select"; options; placeholder? }` and
    `{ id; label; type: "checkbox"; options }`; each option is `{ value: string; label:
    string }`.
  - `activeFilters?: Record<string, string[]>` — default `{}`; controlled active values keyed
    by filter id. A `select` filter holds at most one value; a `checkbox` filter holds every
    checked value.
  - `onFiltersChange?: (next: Record<string, string[]>) => void` — called with the complete
    next filter state whenever a filter changes. An id whose values become empty is removed
    from the map.
  - `loading?: boolean` — default `false`; shows the loading state and **withholds** the
    previous result set.
  - `error?: ReactNode | null` — default `null`; renders an `Alert variant="danger"` with a
    Retry action in place of the result set while the field stays editable.
  - `onRetry?: () => void` — called by the Retry button.
  - `onLoadMore?: () => void`, `hasMore?: boolean` — default `false`; forwarded to
    `SearchableResults`' "Load more".
  - `onSelect?: (result: SearchableResult) => void` — called when a result row is activated.
  - `emptyMessage?: ReactNode` — defaults to `"No items found."`, gaining
    `"No items found. Try removing a filter."` while filters are active.
  - `label?: string` — default `"Search"`; visible label of the search field.
  - `className?: string` — merged onto the root surface (consumer classes win).
  - all `HTMLElement` attributes except `children`/`onChange`/`onSelect`/`results`; `ref`
    forwards to the root surface.
  - exports: `SearchAndResults` (named + default), `SearchAndResultsProps`, `SearchFilter`,
    `SearchSelectFilter`, `SearchCheckboxFilter`, `SearchFilterOption`.
- **Composition:** `Surface` (chrome) → filters (`Select` / `Checkbox` group) → active filter
  chips (`Badge variant="neutral"` with a dismiss button) → `SearchableResults` (field,
  grouped result rows, loading skeleton, empty state, "Load more"). The error is rendered as
  the `SearchableResults` empty content, because the primitive couples the query field and
  the results region and must stay unmodified; forcing the result set empty on error
  guarantees the notice is the only thing shown there.
- **Semantics:** the root is a `Surface` carrying `data-km-search-and-results`, plus
  `data-loading` and `data-error` state attributes. The query field, result rows, groups,
  `aria-busy` and the polite loading status all come from `SearchableResults`. A `select`
  filter is a Base UI single-select with a visible label; a `checkbox` filter is a
  `<fieldset>` with a `<legend>` and native checkboxes. Active filters render as a `<ul>` of
  `Badge` chips, each with a dismiss `<button>` whose accessible name is
  `Remove <filter>: <value>`. The error notice is an `Alert variant="danger" live="polite"`
  (severity carried by a shape-distinct icon and text, never colour alone).
- **Keyboard/focus:** `/` pressed anywhere outside an `input`/`textarea`/`select`/
  contenteditable moves focus to the search field and is prevented so it is not inserted.
  Inside the field, `Escape` clears a non-empty query and blurs the field on a second press;
  `Escape` never hijacks keys from elsewhere in the pattern. Filters and chips are ordinary
  tab stops with the token `focus-visible` ring. Result links are in the natural Tab order
  (from `SearchableResults`). Moving focus from the field into the result list with
  `ArrowDown` is intentionally **not** implemented (it is optional in the brief; the
  component keeps the grid deterministic).
- **Visual states:** field default/hover/focus-visible; select/checkbox default/hover/focus
  and disabled; active filter chip default and dismiss hover/focus; loading (placeholder
  rows + polite status, no stale rows); empty (neutral message, with a filter-removal hint
  when filters are active); error (danger alert with Retry). Long and CJK titles, subtitles
  and labels wrap (`break-words` in the primitive; `flex-wrap` on the filter row and chips)
  without clipping or horizontal overflow.
- **Customization:** `filters`, `activeFilters`/`onFiltersChange`, `loading`, `error`/
  `onRetry`, `onSelect`, `emptyMessage`, `label`, `className`, forwarded `style`/DOM props and
  the semantic tokens for surfaces, text, border, ring, radii, spacing and motion. Styling
  hooks are `data-km-search-and-results`, `data-loading`, `data-error` and `data-part`
  (`content`, `filters`, `filter` + `data-filter-type`, `active-filters`, `shortcut-hint`,
  `chip-dismiss`). `className` lands on the root surface.
- **Dependencies:** `react` plus the already-published primitives (`SearchableResults`,
  `Select`, `Checkbox`, `Badge`, `Button`, `Alert`, `Surface`) and `motion`. No new package is
  added; the pattern introduces no dependency of its own.
- **Limits:** no filtering, debounce or fetching — the pattern renders exactly the `results`
  it is given; `select` filters prepend a clearing option with the reserved value `""`, so a
  consumer option must not use `""`; `onSelect` is derived from row activation inside the
  primitive (row order maps back to `results`), so a row with `href` both navigates and fires
  the callback, and the inert (no-`href`) rows are not keyboard-operable; the results
  appearance motion is a single mount fade of the pattern content because re-keying the
  primitive's results region would remount the controlled query field and drop focus; no
  virtualization.

## Pattern contract

- **Task:** find an item in a large set by typing a query and narrowing it with one or more
  facets.
- **Entry / exit states:** entry = empty query, no active filters. Active search = query
  typed and/or filters applied, loading or results shown. Exit = the user selects a result,
  clears the query, or navigates away; the search field keeps focus after a clear so typing
  continues.
- **Keyboard:** `/` focuses the search field from anywhere outside a text field; `Escape`
  clears then blurs; filters/chips/result links are Tab stops with visible focus.
- **Loading / error / cancel / retry / restore:** while `loading`, the previous result set is
  withheld (never shown as current) and a polite status announces progress; an `error`
  replaces the result set with a danger alert whose Retry calls `onRetry` while the field
  stays editable; the consumer owns request identity, cancellation (`AbortController`) and
  re-running the current query + filters on retry.
- **Responsive:** below 640px the filter group stacks vertically and each filter is
  full-width; at 640px and above filters sit in a wrapping row. Results remain a single
  column and never truncate titles.
- **Exposed callbacks / slots:** `onQueryChange`, `onFiltersChange`, `onSelect`, `onLoadMore`,
  `onRetry`, and the `emptyMessage` slot. The consumer supplies data, filter definitions,
  copy and actions.
- **Sample data:** “Project Alpha”, “Budget 2025”, “Meeting notes”, “Theming and tokens”.
- **Empty copy:** “No items found.” (plus “No items found. Try removing a filter.” while
  filters are active).
- **Accessibility semantics:** labelled native search field, grouped result rows, a
  fieldset/legend checkbox group, labelled select, dismiss buttons with descriptive names,
  a polite danger live region for the error, and a `data-*` state contract on the root.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/search-and-results.test.tsx`
  → 1 file, 11 tests passed. Covers: result rendering, `onQueryChange` payloads, `/` focusing
  the field, `Escape` clear-then-blur, chip dismiss, checkbox filter toggling, loading
  (no stale rows + `data-loading`), empty state, error + Retry (`data-error`), `onSelect`
  activation, and an axe run with filters + chips.
- [x] **axe-core output and manual a11y checks recorded** — axe runs in the test file above
  (0 violations) and in the Playwright e2e in both appearances (0 violations); manual
  screen-reader and 200 % zoom checks were **not run**.
- [ ] **Storybook states complete** — stories exist under `Patterns/SearchAndResults`
  (Default, WithFilters, ActiveFilters, WithLoadMore, Loading, Empty, ErrorWithRetry,
  LongAndLocalizedText, DarkAppearance); the Storybook build was **not run** in this lane.
- [x] **Screenshots reviewed** — `npx playwright test tests/e2e/patterns.spec.ts` regenerated
  and asserted the full-page light baseline (axe in light/dark; no horizontal overflow at
  320/375/768/1440) → `6 passed`.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — covered by
  the e2e overflow audit and the axe runs above; a separate manual visual review was not
  performed.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:fixture` →
  `registry:fixture OK — 38 item(s), 40 file(s) compiled in a temporary fixture (removed)`;
  `npm run registry:smoke` → `38 item(s), 79 file(s)`; `npm run registry:validate` →
  `38 item(s) valid`.
- [x] **End-to-end user task verified in the built app** — `npm run test:e2e` → `16 passed`
  (10 showcase + 6 patterns); the pattern's own spec is `6 passed`.
- [x] **Dependencies/licenses reviewed** — no dependency added; the pattern imports only
  workspace primitives and `react`/`motion` (MIT).
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

## Evidence (verified)

- `npx vitest run tests/search-and-results.test.tsx` →
  `Test Files 1 passed (1)`, `Tests 11 passed (11)`; full `npx vitest run` →
  `Test Files 82 passed (82)`, `Tests 760 passed (760)`.
- `npx tsc --noEmit` → exit 0 (whole repository clean at time of run).
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Drives the pattern in the
  built app (query, single-choice + checkbox filters, chip dismiss, both empty-copy variants),
  regenerates the full-page light baseline, runs axe in light and dark (0 violations) and
  checks for no horizontal overflow at 320/375/768/1440.
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

**Links to evidence:** `tests/search-and-results.test.tsx`,
`src/patterns/search-and-results.stories.tsx`,
`registry/patterns/search-and-results.tsx`, and the *Evidence (verified)* section above.
