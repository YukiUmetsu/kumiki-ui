# Component: Listbox

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Lists of selectable options appear in menus, command palettes, search
results, filters and settings, yet each product re-implements the same fragile ARIA,
type-ahead and disabled-option logic. A standalone listbox with one documented
selection contract gives later composites (Command palette, Searchable results) a
stable foundation instead of coupling every list to a select or combobox. Base UI has
no standalone listbox primitive, so the full ARIA and keyboard model is implemented
and tested here rather than inherited.

**Source:** [`registry/ui/listbox.tsx`](../registry/ui/listbox.tsx) (canonical).
[`src/ui/listbox.tsx`](../src/ui/listbox.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a visible, persistent list of options where one or many
  values are chosen. Do not use it as a menu of actions (use Dropdown Menu), as a
  navigation landmark, or as a free-text input. It owns no popup, no filtering and no
  async loading — compose those around it (Searchable results supplies the field and
  filtering; Command palette supplies the dialog and command actions). A `label` (or an
  `aria-label`) is required for an accessible name; the component cannot infer one.
- **Public API:**
  - `options: ListboxOption[]` — required, ordered rows. `ListboxOption` is
    `{ value: string; label: ReactNode; description?: ReactNode; disabled?: boolean;
    group?: string }`. `value` must be unique and stable.
  - `selectionMode?: "single" | "multiple"` — default `"single"`.
  - `value` / `defaultValue` / `onValueChange` — narrow from the mode:
    - single: `value?: string | null`, `defaultValue?: string | null`,
      `onValueChange?: (value: string | null) => void`
    - multiple: `value?: string[]`, `defaultValue?: string[]`,
      `onValueChange?: (value: string[]) => void` (complete next selection, in the order
      values were added)
  - `disabled?: boolean` — default `false`; makes the whole list non-interactive.
  - `label?: ReactNode` — visible label; exposed as the accessible name through
    `aria-labelledby`.
  - `className?: string` — merged **on the listbox element itself** (consumer classes
    win), so width, max-height and scroll can be controlled by the consumer.
  - all `HTMLDivElement` props except `children`/`defaultValue`/`value`; `ref` forwards
    to the `role="listbox"` element. `id`, `style` and event handlers pass through.
  - exports: `Listbox` (named + default), `ListboxProps`, `ListboxOption`,
    `ListboxSelectionMode`, `ListboxSingleProps`, `ListboxMultipleProps`.
- **Composition:** data-driven only — there are no option child components to nest.
  Future composites pass a derived `options` array and own filtering/loading outside
  the component; the listbox stays a pure selection surface. `description` adds a
  supporting line that becomes part of the option's accessible name (the name is derived
  from the row content, so it can never drift from the visible text). `group` turns the
  option into a member of a named `role="group"`.
- **Semantics:** the interactive root is a real `role="listbox"` (`data-km-listbox`).
  Multiple mode sets `aria-multiselectable="true"`; the root is named with
  `aria-labelledby` (the visible `label` is preferred; `aria-label` is used only when no
  label is rendered). Every row is `role="option"` with `aria-selected` (always present)
  and `aria-disabled="true"` when disabled. The row's accessible name is derived from its
  content (label plus any `description`), so it always contains the visible text; there is
  no name override to drift out of sync (WCAG 2.5.3).
  Group headings render as `role="group"` with `aria-labelledby` pointing at the visible
  heading. Selection is carried by `aria-selected`, a font-weight step **and** a check
  glyph, so it never depends on colour alone. Disabled options are never selected and
  never call `onValueChange`.
- **Keyboard/focus:** a single tab stop. DOM focus stays on the listbox and the active
  option is communicated with `aria-activedescendant` (not roving tabindex), so an
  enclosing overlay keeps one predictable focus target. ArrowDown/ArrowUp move the
  active option and skip disabled rows; movement clamps at the ends rather than wrapping.
  Home/End jump to the first/last enabled option. Enter and Space select the active
  option in single mode and toggle it in multiple mode. Printable characters run
  type-ahead over string labels; pressing the same character repeatedly cycles through
  matches, and disabled options are skipped. IME composition keys (`isComposing`,
  `Process`) are ignored. Escape is intentionally not handled — enclosing dialogs,
  popovers and command palettes own it. `focus-visible` paints the token focus ring on
  the listbox.
- **Visual states:** default, hover, active (`bg-surface-subtle`), selected
  (`bg-surface-subtle` + `font-medium` + check), disabled option (muted text, no hover,
  `cursor-not-allowed`), disabled listbox (muted surface, `aria-disabled`, `tabIndex=-1`);
  focus-visible ring. The list has a token border/surface and a `max-h-80` scroll
  container so long sets never push the page. A missing option active state is derived,
  so a removed/disabled option cannot leave a dangling `aria-activedescendant`.
  Long and CJK labels wrap (`break-words`), descriptions wrap independently, and URLs
  do not force horizontal overflow.
- **Customization:** `selectionMode`, `disabled`, the documented option fields,
  `className` on the listbox, forwarded `style`/DOM props, and semantic tokens for
  surfaces, text, border, ring, radii, spacing and motion. Width and max-height are
  consumer-controlled; density does not remap listbox metrics. There is no theme or
  palette in the component. Consumers may target the exposed `data-*` hooks
  (`data-selected`, `data-active`, `data-disabled`, `data-part`) for additional styling.
- **Dependencies:** `react` only. No Base UI primitive is used (the package ships no
  standalone listbox) and no new package was added. The registry item therefore declares
  no extra runtime dependency.
- **Limits:** no virtualization — very large lists must be windowed by the consumer;
  no async/loading/empty state (later composites own those states); no form submission
  or hidden input; no option icons/slots beyond `label`/`description`; no custom
  `renderOption`; type-ahead only reads string/number labels and arrays of those, so a
  label built from arbitrary elements needs a string child to be findable; values must
  be unique (duplicate values would collide in selection); single mode does not
  deselect on re-activation; groups are formed from consecutive options, so a group
  name that reappears after another group starts a new section; the list is not
  draggable and has no multi-column layout.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/listbox.test.tsx`
  → 1 file, 17 tests passed. Covers roles/names, grouped sections, accessible
  descriptions, single and multiple payloads, arrow/Home/End movement, type-ahead
  (including disabled matches), Enter/Space activation, disabled option and disabled
  root blocking callbacks, `aria-activedescendant` movement, controlled and
  uncontrolled values, ref forwarding, `className` merge and an axe run in a grouped,
  multiple, described state (0 violations).
- [ ] **axe-core output and manual a11y checks recorded** — axe runs in the test file
  above (0 violations, verified); manual screen-reader and zoom checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** — stories
  exist for Default, Multiple, WithGroups, WithDisabledOption, WithDescription, Disabled,
  LongAndLocalizedText and Controlled; `npm run build-storybook` → exit 0, all stories
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
  dependency added; `@base-ui/react` (MIT) and `react` (MIT) already present. Bundle/
  performance impact was not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above;
  registry, gallery and index wiring were completed by the coordinator.

## Evidence (verified)

- `npx vitest run tests/listbox.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 17 passed (17)`.
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

**Links to evidence:** `tests/listbox.test.tsx`, `src/ui/listbox.stories.tsx`,
`registry/ui/listbox.tsx`, and the *Evidence (verified)* section above.
