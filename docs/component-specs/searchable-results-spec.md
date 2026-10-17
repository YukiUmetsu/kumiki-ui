# Component: Searchable Results

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** A search or filter view shows the same three fragile pieces in every
product — a controlled query field, a list of results with the match highlighted, and
honest loading/empty states — each re-implemented with its own markup and accessibility
bugs (unlabelled inputs, colour-only highlighting, blank areas while loading, fabricated
result counts). One component with a bounded contract removes that duplication while
leaving filtering, debouncing, routing and copy to the consumer.

**Source:** [`registry/ui/searchable-results.tsx`](../registry/ui/searchable-results.tsx)
(canonical).
[`src/ui/searchable-results.tsx`](../src/ui/searchable-results.tsx) re-exports it for the
showcase.

## Contract

- **Use / not use:** use for a visible search/filter view that owns a query field and a
  result list. Do not use it as a data-fetching or routing layer — it renders the
  `results` it is given and calls back on every keystroke; the consumer owns filtering,
  debounce, pagination requests and navigation. Do not use it as a navigation landmark
  (wrap it in a `<nav>`/`<section>` yourself) or as a static list without a query.
- **Public API:**
  - `query: string` — required, controlled. The consumer owns the value.
  - `onQueryChange: (query: string) => void` — required; called with the next value on
    every keystroke.
  - `results: SearchableResult[]` — required. `SearchableResult` is
    `{ id: string; title: ReactNode; subtitle?: ReactNode; group?: string; href?: string;
    disabled?: boolean }`. `id` must be unique and stable.
  - `highlightQuery?: boolean` — default `true`; wraps matches inside **string** titles.
  - `loading?: boolean` — default `false`; shows placeholder rows, `aria-busy` and a
    polite status message.
  - `emptyMessage?: ReactNode` — shown when not loading and there are no results;
    defaults to a clear "No results found.".
  - `onLoadMore?: () => void` — together with `hasMore` renders the "Load more" button.
  - `hasMore?: boolean` — default `false`.
  - `label?: string` — visible label for the query field; defaults to `"Search"` (used as
    `aria-label` when no visible label is requested).
  - `className?: string` — merged onto the root (consumer classes win).
  - all `HTMLDivElement` props except `children`/`onChange`; `ref` forwards to the root.
  - exports: `SearchableResults` (named + default), `SearchableResultsProps`,
    `SearchableResult`.
- **Composition:** data-driven; there are no child components to nest. The consumer maps
  its own data into `results` and owns the surrounding page (heading, filters, footer).
  `label` names the field, `emptyMessage` supplies the empty copy, and `onLoadMore`
  delegates pagination.
- **Semantics:** the root is a plain container (`data-km-searchable-results`). The query
  field is a native `<input type="search">` named by the visible `label` (or `label` as
  `aria-label` when no visible label is requested). Results render as a `<ul>` of `<li>`
  rows: a row with `href` (and not `disabled`) is a real `<a>`; every other row is inert
  text, so unavailable results are never focusable and never navigate. Consecutive rows
  sharing a `group` render inside a named `role="group"` (heading wired through
  `aria-labelledby`). The results region carries `aria-busy` while loading and a
  screen-reader-only `role="status"` (`aria-live="polite"`) announces "Loading results…".
  Any visible count is derived from `results.length` and is never fabricated.
- **Keyboard/focus:** the query field is a normal text field reached with Tab. Available
  result links are in the natural Tab order after the field; there is no roving tabindex
  or activedescendant. The "Load more" button is a native `<button type="button">`. Focus
  rings are the token `focus-visible` ring on the field, links and button.
- **Visual states:** field default/hover/focus-visible; result link default/hover
  (`bg-surface-subtle`)/active (`bg-surface-inset`)/focus-visible; disabled result (muted
  text, not a link); highlight `mark` (token surface + `font-medium`, never colour alone);
  loading (placeholder bars); empty (bordered message); load-more default/hover/focus and
  disabled while loading. Long and CJK titles, subtitles and URLs wrap with `break-words`
  and never clip or force horizontal overflow.
- **Customization:** `highlightQuery`, `emptyMessage`, `label`, `hasMore`/`onLoadMore`,
  `className`, forwarded `style`/DOM props, and the semantic tokens for surfaces, text,
  border, ring, radii, spacing and motion. Width is consumer-controlled. Styling hooks
  are exposed as `data-km-searchable-results`, `data-loading`, and `data-part`
  (`label`, `input`, `results`, `skeleton`, `group`, `group-label`, `result`, `count`,
  `empty`, `load-more`, `loading-status`). `className` lands on the root.
- **Dependencies:** `react` only. No new package and no Base UI primitive are used; the
  registry item declares no extra runtime dependency.
- **Limits:** no filtering, debounce or fetching — the component renders exactly the
  `results` it is given; highlighting applies only to plain-string titles (element titles
  are rendered as-is); a single query string is matched as a whole (no multi-term or
  fuzzy matching); no virtualization, so very large lists must be windowed by the
  consumer; no custom row renderer or per-row trailing slots; a disabled row is rendered
  as inert text rather than a disabled link; group sections are formed from consecutive
  results, so a group name that reappears after another group starts a new section.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/searchable-results.test.tsx`
  → 1 file, 10 tests passed. Covers: labelled controlled field and
  `onQueryChange` payloads, results as links vs inert rows, accessible groups, `<mark>`
  highlighting (and `highlightQuery={false}`), empty state and override, loading
  (`aria-busy` + polite status + placeholder rows), `onLoadMore` and disabled-while-loading,
  ref/`className`/div-prop forwarding, and an axe run in a grouped mixed state.
- [ ] **axe-core output and manual a11y checks recorded** — axe runs in the test file
  above (0 violations, verified); manual screen-reader and zoom checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** — stories
  exist for Default, WithGroups, WithDisabledResult, Loading, Empty, WithLoadMore,
  Controlled and LongAndLocalizedText; `npm run build-storybook` → exit 0, all stories
  compile. Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — gallery-level browser review performed by the coordinator (see
  coordinator report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  per-component visual verification was **not run**; only the gallery-level pass applies
  (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no
  dependency added; the item imports only `react` (MIT). Bundle/performance impact was not
  separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above;
  registry, gallery and index wiring were completed by the coordinator.

## Evidence (verified)

- `npx vitest run tests/searchable-results.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 10 passed (10)`.
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

**Links to evidence:** `tests/searchable-results.test.tsx`,
`src/ui/searchable-results.stories.tsx`, `registry/ui/searchable-results.tsx`, and the
*Evidence (verified)* section above.
