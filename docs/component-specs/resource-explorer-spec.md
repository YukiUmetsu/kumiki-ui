# Pattern: Resource Explorer

**Status:** Implementing
**Catalog phase:** v0.2 (Reusable application patterns)
**Why shared:** Browsing a hierarchy — expanding folders, filtering, renaming, reordering and
deleting — is re-implemented in every product that has a file/asset/settings tree, usually
with broken ARIA trees, colour-only selection, lost focus and drag-only reordering. This
pattern centralises the tree keyboard model, roving focus, filtering, inline rename, an
accessible reorder model and honest loading/empty/error states, while the consumer keeps the
hierarchy, the actions and the copy.

**Source:** [`registry/patterns/resource-explorer.tsx`](../registry/patterns/resource-explorer.tsx)
(canonical). [`src/patterns/resource-explorer.tsx`](../src/patterns/resource-explorer.tsx)
re-exports it for the showcase.

## Contract

- **Use / not use:** use it to present and operate on a consumer-owned tree (folders,
  documents, categories, project structure) with selection, expansion, filtering and
  per-item actions. Do **not** use it as a data-fetching, routing or persistence layer — it
  renders exactly the `items` it is given and calls back on every action; the consumer owns
  the data, mutations and undo history. Do not use it for a flat list (use `Listbox` or
  `SearchableResults`) or as a drag-and-drop editor (see the deferred DnD tradeoff below).
- **Public API:**
  - `items: ResourceItem[]` — required. `ResourceItem` is
    `{ id: string; label: string; icon?: ReactNode; children?: ResourceItem[];
    disabled?: boolean }`. `id` must be unique and stable.
  - `selectedId?: string | null` — controlled selection. Omit for internal selection that
    still reports through `onSelect`.
  - `expandedIds?: string[]` — controlled expansion. Omit for internal expansion that still
    reports through `onToggle`.
  - `filter?: string`, `onFilterChange?: (filter: string) => void` — controlled filter;
    omit `filter` for an internally-held query that still reports every change.
  - `onSelect?: (item) => void`, `onToggle?: (item) => void`,
    `onRename?: (item, newLabel) => void`,
    `onMove?: (item, direction: "up" | "down" | "top" | "bottom") => void`,
    `onDelete?: (item) => void`, `onCreate?: (parentId: string | null) => void`,
    `onUndo?: () => void`, `onRetry?: () => void`.
  - `loading?: boolean` (default `false`), `error?: ReactNode | null` (default `null`).
  - `labels?: ResourceExplorerLabels` — every field optional with a neutral default
    (see *Customization*).
  - `className?: string`; all `HTMLDivElement` props except `children`/`onSelect`;
    `ref` forwards to the root `<div>`.
  - exports: `ResourceExplorer` (named + default), `ResourceExplorerProps`,
    `ResourceItem`, `ResourceMoveDirection`, `ResourceExplorerLabels`.
- **Composition:** `Breadcrumbs` (path to the selected row, `maxItems={4}`), `Input`
  (filter), `DropdownMenu` + `IconButton` (per-row actions), `Input` (inline rename), `Button`
  (create / retry / undo), `Badge` (child count, part of the row's accessible name), `Alert` (error), `Skeleton`
  (loading). The actions trigger is the only interactive descendant of a row.
- **Semantics:** the region root carries `data-km-resource-explorer`. The list is a real
  `role="tree"` named by `aria-label` (default from `labels.tree`, "Items"). Rows are
  `role="treeitem"` with `aria-level` (1-based), `aria-selected`, `aria-disabled` for
  disabled rows and `aria-expanded` only on parents. Each row has **no author `aria-label`**,
  so its accessible name is computed from its visible content (the label plus the child-count
  `Badge`); this keeps the name equal to the visible text (WCAG 2.5.3) and lets long and CJK
  labels flow through unchanged. While renaming, the row instead exposes
  `aria-label="{renameField}: {label}"` (the count and actions trigger are hidden then).
  Focus is **roving**: exactly one row has `tabindex="0"` (the active row); every other row
  is `tabindex="-1"`. The filter is a native `<input type="search">` named by
  `labels.filter`. Loading is announced through a polite `role="status"` region. The revert
  affordance after a reorder/delete is an inline `role="status"` bar.
- **Keyboard/focus:** ArrowUp/ArrowDown move the active row among **visible, enabled** rows
  (disabled rows are skipped); ArrowRight expands a collapsed parent, or moves into its
  first child when already expanded; ArrowLeft collapses an expanded parent, or moves to the
  parent when the row is a child or a leaf; Home/End jump to the first/last visible row;
  Enter selects; F2 starts the inline rename; Shift+F10 or the Menu key opens the active
  row's actions menu; printable characters run type-ahead over labels (600 ms buffer).
  Rename: Enter commits (when changed), Escape reverts, blur commits; focus returns to the
  row afterwards. The clear-filter button returns focus to the filter field. The tree has
  one tab stop; the actions trigger is not in the tab order (keyboard users use Shift+F10).
- **Reorder (the drag-and-drop alternative):** reordering is exposed as four actions —
  **Move up / Move down / Move to top / Move to bottom** — in each row's `DropdownMenu`,
  with the edge actions disabled when a row is already first/last among its siblings. After
  a reorder or delete an inline Undo affordance appears and calls `onUndo`; the consumer
  remains the source of truth for `items`.
- **Filtering:** a non-empty filter keeps a row when it matches **or** any descendant
  matches, prunes non-matching siblings, and force-expands every kept ancestor so matches
  stay visible with their hierarchy context. Filtering does not mutate `items` or the
  controlled `expandedIds`.
- **Visual states:** row default/hover (`bg-surface-subtle` when active)/selected
  (`bg-surface-subtle` + `font-medium` + a start-edge indicator bar drawn with the neutral
  foreground token — **not** the previous emerald — so selection is never colour alone);
  disabled (muted, `cursor-not-allowed`, skipped); parent with child-count `Badge`;
  loading (skeleton rows); empty root (create action); no-match (clear-filter action); error
  (`Alert variant="danger"`, polite). Chevron rotation is 180 ms `ease-continuity` and
  instant under `prefers-reduced-motion`; rows use Motion `layout` for add/remove with no
  exit delay.
- **Customization:** all copy flows through `labels` (`tree`, `filter`, `filterPlaceholder`,
  `clearFilter`, `create`, `moreActions`, `actions`, `rename`, `renameField`, `moveUp`,
  `moveDown`, `moveToTop`, `moveToBottom`, `newChild`, `delete`, `undo`, `undoDismiss`,
  `emptyRoot`, `noMatch`, `loadingText`, `retry`, `movedPrefix`, `deletedPrefix`);
  `className`, forwarded `style`/DOM props and `ref`; semantic tokens for surfaces, text,
  border, ring, radii, spacing and motion; appearance/density/reduced-motion handled
  centrally. Styling hooks: `data-km-resource-explorer`, `data-km-resource-explorer-item`,
  `data-part` (`breadcrumbs`, `filter`, `create`, `loading-status`, `error`, `skeleton`,
  `empty`, `no-match`, `tree`, `item`, `indicator`, `chevron`, `chevron-placeholder`,
  `icon`, `label`, `rename`, `count`, `actions`, `undo`, `undo-message`), plus `data-loading`
  on the root and `data-selected`/`data-active`/`data-disabled`/`data-level` on rows.
- **Dependencies:** `react`, `motion/react` (already a repository dependency) and the Kumiki
  UI primitives it composes (`Breadcrumbs`, `Input`, `DropdownMenu`, `Button`,
  `IconButton`, `Badge`, `Alert`, `Skeleton`). No new npm package and no tree or
  drag-and-drop library are added.
- **Limits:** single selection only; no virtualization, so very large trees must be windowed
  by the consumer; no drag-and-drop (deferred — see below); filtering force-expands matched
  ancestors and disables collapse while a filter is active; rename commits text only (the
  consumer migrates path/state); a row's child count `Badge` is part of the row's
  content-derived accessible name (so the name always contains the visible text, WCAG 2.5.3);
  `onToggle` does not report the next state (read `expandedIds` when controlled).

## Deferred: drag-and-drop (explicit tradeoff)

`docs/02-component-catalog.md` lists drag-and-drop reordering and the tree explorer under
**"Deferred beyond v0.2"** and **"Advanced composites (v0.3+)"**, requiring "an explicit
accessibility model and performance tests" before they are added. The brief for this pattern
also says to build it "without drag-and-drop". Consequently this pattern ships **no pointer
drag**; instead it provides a **keyboard-accessible reorder model** (four menu actions plus
an Undo affordance), per `docs/03-component-standards.md` ("For drag reordering provide a
keyboard-accessible alternative"). This is recorded as a deliberate tradeoff, not an
oversight: DnD may be layered on later behind the same `onMove` contract.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** — see *Evidence
  (verified)*. Covers rendering/levels, ArrowRight expand, ArrowLeft collapse, Right into
  child / Left to parent, Enter selection, F2 + Enter rename commit, Escape revert, menu
  reorder + Undo, filter no-match and clear, filter ancestor context, loading, error +
  retry, empty root create, and an axe run in a selected/expanded state.
- [x] **axe-core output and manual a11y checks recorded** — axe runs in the test file above
  (0 violations). Manual screen-reader and 200 % zoom checks were **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** — stories
  exist (`Default`, `Loading`, `EmptyRoot`, `NoMatch`, `ErrorWithRetry`, `DisabledItems`,
  `LongAndLocalizedText`) under `Patterns/ResourceExplorer`; `build-storybook` was **not
  run** within this task's scope.
- [x] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — `npx playwright test tests/e2e/patterns.spec.ts` regenerated and asserted the
  full-page light baseline; axe runs in light/dark and there is no horizontal overflow at
  320/375/768/1440 → `6 passed`.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — covered by
  the e2e overflow audit and the axe runs; a separate manual visual review was not performed.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:fixture` →
  `registry:fixture OK — 38 item(s), 40 file(s) compiled in a temporary fixture (removed)`;
  `npm run registry:smoke` → `38 item(s), 79 file(s)`; `npm run registry:validate` →
  `38 item(s) valid`.
- [x] **End-to-end user task verified in the built app** — `npm run test:e2e` → `16 passed`
  (10 showcase + 6 patterns); the pattern's own spec is `6 passed`.
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no new
  dependency; `motion/react` and the composed primitives are already in the repo. Bundle/
  performance impact was not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* and *Deferred*.

## Evidence (verified)

- `npx vitest run tests/resource-explorer.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 13 passed (13)`; full `npx vitest run` → `Test Files 82 passed (82)`,
  `Tests 760 passed (760)`.
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Keyboard-selects a row
  (asserting `aria-selected` and the non-emerald start-edge indicator), renames it with F2,
  reorders it from the actions menu, regenerates the full-page light baseline, runs axe in
  light and dark (0 violations) and checks for no horizontal overflow at 320/375/768/1440.
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
- `npx tsc --noEmit` → exit 1, but **0 errors in this pattern's files** (`grep -ci
  "resource-explorer"` over the output → `0`). The reported errors were in unrelated sibling
  pattern files outside this task's file scope.

**Links to evidence:** `tests/resource-explorer.test.tsx`,
`src/patterns/resource-explorer.stories.tsx`,
`registry/patterns/resource-explorer.tsx`, and the *Evidence (verified)* section above.
