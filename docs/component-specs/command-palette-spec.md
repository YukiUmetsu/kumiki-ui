# Component: Command palette

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** A command launcher is the keyboard-first counterpart of navigation, and
its hard parts are always the same: a modal surface that returns focus, a search field
that owns the accessible relationship to the results, a highlight that must skip
disabled commands, grouping that survives filtering, and a close path that runs each
action exactly once. Every product otherwise rebuilds that fragile combobox/listbox
wiring. This component keeps the data, labels, shortcuts and actions as consumer props
and reuses Base UI's proven modal dialog for the focus trap; alternatives considered
were a free-form popover (rejected — no scroll lock or focus discipline) and a
generic combobox component (deferred — the palette needs a command/run contract, not a
value contract).

**Source:** [`registry/ui/command-palette.tsx`](../registry/ui/command-palette.tsx) (canonical).
[`src/ui/command-palette.tsx`](../src/ui/command-palette.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a keyboard-first launcher over a known, consumer-supplied
  command list — navigation, document actions, settings jumps. Do not use it as a
  general search page (no async query, cancellation or result ranking is built in),
  as a menu attached to a trigger (use `DropdownMenu`), or as a form (no fields other
  than the filter).
- **Public API:**
  - `open: boolean` — required, controlled open state
  - `onOpenChange: (open: boolean) => void` — called with `false` after a command runs,
    on Escape, on the close button, and on an outside press
  - `commands: CommandPaletteCommand[]` — display order is preserved; `id` must be
    unique, `label` is the visible text and primary match target, `group` groups
    consecutive commands, `keywords` adds search synonyms, `shortcut` is a trailing
    visual hint, `disabled` keeps a command visible but not runnable, `onSelect` runs
    the command once
  - `placeholder?: string` — search placeholder, default `"Search commands…"`
  - `emptyMessage?: ReactNode` — shown when nothing matches, default `"No commands found."`
  - `loading?: boolean` — default `false`; replaces results with a truthful busy state
  - `label?: string` — accessible name of the dialog and the search field, default
    `"Command palette"`
  - `closeLabel?: string` — accessible name of the close button, so it can be localised;
    default `"Close"`
  - `className?: string` — merged onto the panel surface only
  - exports: `CommandPalette` (named + default), `CommandPaletteProps`,
    `CommandPaletteCommand`
  - forwarded ref: the search input (`HTMLInputElement`), the only tab stop inside the
    panel
- **Composition:** the component is one flat API, not a compound. The consumer owns the
  trigger, the open state, the command data and the actions; the palette owns the
  modal shell, the search field, result grouping and keyboard navigation. There is no
  header/footer slot. Shortcuts and `emptyMessage` accept `ReactNode` so consumers can
  supply `<kbd>` markup or localised copy.
- **Semantics:** the panel is Base UI's `Dialog.Popup` (`role="dialog"`, explicit
  `aria-modal="true"`) named by a visually hidden `Dialog.Title` carrying `label`. The
  search field is `role="combobox"` with `aria-expanded`, `aria-controls` (the result
  listbox, only when it exists), `aria-autocomplete="list"` and
  `aria-activedescendant` pointing at the highlighted option; DOM focus never leaves
  the field. Results are a `role="listbox"` whose options are `role="option"` with
  `aria-selected` on the highlighted one and `aria-disabled` plus `data-disabled` on
  disabled ones. Groups are `role="group"` labelled by their visible heading. The
  shortcut hint is `aria-hidden`, so it never becomes the command's only name. Empty
  and loading rows are `role="status"`; while `loading` is set the panel is
  `aria-busy="true"` and no stale options are rendered.
- **Keyboard/focus:** on open, focus moves to the search field. Typing filters
  case-insensitively over `label` and `keywords`. ArrowDown/ArrowUp move the highlight
  and skip disabled commands, clamping at the first/last enabled result (no wrap).
  Home/End jump to the first/last enabled result. Enter runs the highlighted command,
  calls its `onSelect` exactly once and requests closing. Escape, the close button and
  an outside press close the palette; Base UI returns focus to the element that was
  focused before the palette opened. The modal dialog traps Tab/Shift+Tab and locks
  page scroll. IME composition (`isComposing`) is ignored.
- **Visual states:** closed (renders nothing); open with results (grouped rows,
  highlighted row uses both a surface change and `font-medium` so it is not
  colour-only); filtered to no matches (status message, combobox reports
  `aria-expanded="false"` and drops `aria-controls`); loading (spinner + status,
  `aria-busy`); disabled row (`text-muted-foreground`, not focusable through the
  keyboard); long/CJK labels wrap (`break-words`) while shortcuts stay on one line;
  the panel is capped at `calc(100dvh - 8rem)` and the result area scrolls
  independently.
- **Customization:** `className` merges onto the panel surface (last, after the
  component's own classes) — not onto the input or rows. The consumer supplies all
  labels, shortcuts and actions. Styling uses semantic tokens only:
  `bg-surface-floating`, `bg-surface-subtle`, `border-border`, `text-foreground`,
  `text-muted-foreground`, `bg-overlay`, `rounded-surface`, `rounded-control`,
  `shadow-lg`, `ring-ring`, `--km-control-height`, `--km-duration-short`. No global
  CSS, `!important` or app-specific selectors are required. In compact or high-density
  contexts consumers should keep the component mounted conditionally rather than
  overriding its positioning.
- **Dependencies:** `@base-ui/react` (MIT) for the modal dialog, focus trap, scroll lock,
  dismissal and focus return; `motion` (MIT) for the enter/exit transition
  (`AnimatePresence`, `useReducedMotion`). Both are already required by existing
  registry items. No new dependency, no `clsx`/`tailwind-merge`, no icon package.
- **Limits:** controlled only — there is no `defaultOpen`/uncontrolled mode because a
  palette without a trigger cannot close itself meaningfully. Filtering is synchronous
  substring matching over `label` + `keywords` (no fuzzy scoring, no async search, no
  query cancellation); `loading` intentionally hides previous results rather than
  showing them as current. The palette does not virtualize: very large command lists
  are all in the DOM, bounded by a scrolling result area (a few hundred commands is
  fine; tens of thousands is not). Home/End are consumed by the result highlight, so
  they do not move the text caret while the palette is open — deliberate, and the
  tradeoff for one-key first/last navigation. Duplicate command `id`s are not detected
  and would make the highlight ambiguous. The `"Loading commands…"` string is fixed
  (unlike `placeholder`, `emptyMessage`, `label` and `closeLabel`). Focus return depends on Base UI
  having a previously focused element; opening programmatically while nothing is
  focused returns focus to the document body. Storybook build and the registry fixture
  install are covered in the coordinator-run evidence below; per-component screenshots
  remain unverified (see *Evidence (verified)*).

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded —
  `npx vitest run tests/command-palette.test.tsx` → 1 file, 14 tests passed. Covers: nothing
  rendered while closed; labelled modal with `aria-modal="true"`, named combobox and
  close button; initial focus in the field; grouped results with accessible group
  names; case-insensitive label + keyword filtering; ArrowUp/Down (disabled skipped,
  clamped), Home/End; `aria-activedescendant`/`aria-selected` wiring and combobox
  `aria-controls`/`aria-expanded`/`aria-autocomplete`; Enter runs the highlighted
  command exactly once and closes; click runs exactly once and closes; a disabled
  command is never runnable by click or Enter; Escape closes and restores focus to the
  previously focused trigger; empty state hides the listbox and reports
  `aria-expanded="false"`; loading is `aria-busy` with no stale options; ref forwards
  to the input and `className` merges onto the panel; axe-core run in the open state
  with 0 violations.
- [ ] axe-core output and manual a11y checks recorded — axe-core ran in jsdom (open
  state, grouped + disabled + shortcut + active option) with zero violations (verified);
  manual screen reader, zoom and real-browser checks were **not run**.
- [x] Storybook states complete, including realistic and CJK/long content — stories are
  authored (`Default`, `Open`, `WithGroups`, `WithShortcuts`, `EmptyResult`, `Loading`,
  `LongAndLocalizedText`); `npm run build-storybook` → exit 0, all stories compile.
  Per-story visual inspection was not run.
- [ ] Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide — gallery-level
  browser review performed by the coordinator (see coordinator report); per-component
  captures were **not run**.
- [ ] No accidental overlap, clipping, contrast, focus or animation failures —
  per-component visual verification was **not run**; the panel is viewport-capped and the
  result area scrolls, but only the gallery-level pass applies (see coordinator report).
- [x] Test registry install into fresh fixture passed — `npm run registry:validate` →
  "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)"; the item is self-contained (imports only `@base-ui/react`, `motion`
  and React) and declares both dependencies.
- [x] Dependencies/licenses reviewed; performance and bundle impact documented — no new
  packages; `@base-ui/react` and `motion` were already present (MIT). Bundle impact is the
  component module plus the already-loaded dialog/motion primitives; no icon library,
  no class-merging dependency.
- [x] Blockers resolved; known limitations named honestly — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/command-palette.test.tsx` → `Test Files 1 passed (1)`,
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

**Links to evidence:** `tests/command-palette.test.tsx`,
`src/ui/command-palette.stories.tsx`, `registry/ui/command-palette.tsx`, and the
*Evidence (verified)* section above.
