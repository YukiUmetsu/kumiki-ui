# Component: Combobox

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Selecting from a long list needs a single field that both accepts a
query and commits a value; teams otherwise rebuild filtering, virtual focus,
`aria-activedescendant` and empty/loading states for every search field. This
component keeps that behavior in one place while leaving option data, copy,
labels and layout to the consumer. Alternatives considered: reusing `Select` with
a search field (rejected — the search text and the selected value are different
concerns and the trigger stays a button), and a free-form autocomplete (rejected
— every committed value must come from the option set).

**Source:** [`registry/ui/combobox.tsx`](../registry/ui/combobox.tsx) (canonical).
[`src/ui/combobox.tsx`](../src/ui/combobox.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use when a text field filters a predefined option set and
  only listed values may be committed. Do not use it for free-form search or
  command entry (use an autocomplete/search field), for short option sets where
  a native select is enough, or when no input should render (use `Select`).
- **Public API:**
  - `options: ComboboxOption[]` — `{ value, label, description?, disabled?, group? }`;
    values must be unique and stable.
  - `value?: string | string[]` / `defaultValue?: string | string[]` — `string`
    with `multiple: false`, `string[]` with `multiple: true`; single mode also
    accepts `null`.
  - `onValueChange?: (value: string | string[]) => void` — exact option values;
    multiple mode receives the full next selection in insertion order.
  - `multiple?: boolean` — default `false`; selected values render as removable chips.
  - `label?: ReactNode` — visible label, also the field's accessible name.
  - `placeholder?: string`, `disabled?: boolean` (default `false`),
    `loading?: boolean` (default `false`).
  - `emptyMessage?: ReactNode` — default `"No options found"`.
  - `filter?: (option, query) => boolean` — default case-insensitive substring
    match on `label`; the query is already trimmed by the field.
  - `className?: string` — merged onto the wrapping element.
  - `name?`, `required?`, `id?` and native input props (`aria-*`, `autoComplete`,
    `onFocus`, `onBlur`, input `onKeyDown`, …) pass through to the input.
  - exports: `Combobox` (named + default), `ComboboxOption`, `ComboboxProps`,
    `ComboboxSingleProps`, `ComboboxMultipleProps`.
- **Composition:** the field is `Combobox.Root` → `InputGroup` → `Input`, with the
  popup portaled through `Positioner`. There is no render-prop API for custom
  option markup in this version; `label` and `description` are strings so they
  can also be matched, announced and used as `title` text. Multiple mode owns
  the chip row, including an accessible remove button per chip.
- **Semantics:** the input is a native `<input>` with `role="combobox"`,
  `aria-expanded`, `aria-controls` and `aria-activedescendant` supplied by Base
  UI. The popup list is `role="listbox"`; every option is `role="option"` with
  `aria-selected` and, when disabled, `aria-disabled`. Group headings render as
  named `role="group"` sections. Selection is shown by a check glyph as well as
  `aria-selected`, so it is never color-only. Disabled options never commit and
  arrow navigation steps past them. While closed, the field is one tab stop; the
  popup is not in the tab order.
- **Keyboard/focus:** typing filters immediately. ArrowDown/ArrowUp open the list
  (when closed) and move the highlight, Home/End move the highlight to the first
  or last enabled option while the popup is open, Enter commits the highlighted
  option, Escape closes and leaves focus in the field, and Tab moves on without
  trapping focus. Type-ahead is inherent in the text field. With the popup
  closed, Home/End and clicks keep native caret behavior.
- **Visual states:** idle, hover, focus-visible (ring on the field wrapper),
  open (chevron rotates), highlighted option, selected option (check glyph and
  medium weight), disabled field, disabled option, loading (busy field and a
  polite status row), and empty (custom message, no options offered). Heights,
  radii, borders, text and motion come from semantic tokens, so density and
  light/dark appearance follow the theme. The popup uses
  `--available-height`/`--anchor-width` and a short scale/fade transition;
  `prefers-reduced-motion` is handled globally.
- **Customization:** semantic tokens (`bg-field`, `bg-surface-floating`,
  `border-input`, `ring-ring`, `text-foreground`, `text-muted-foreground`,
  `rounded-control`, `rounded-surface`, `--km-control-height`,
  `--km-control-space-x`, `--km-duration-short`), the public props above, and
  `className` on the wrapper. `ref` resolves to the text input. State hooks:
  `data-km-combobox` (root), `data-loading`, `data-disabled`,
  `data-km-combobox-field`, `data-km-combobox-input`, `data-km-combobox-popup`,
  `data-km-combobox-list`, `data-km-combobox-option`, `data-km-combobox-check`.
  Base UI's `data-[popup-open]`, `data-[disabled]`, `data-[highlighted]` and
  `data-[selected]` remain available for local styling.
- **Dependencies:** `react` and `@base-ui/react` (Combobox subpath). No
  additional package is required; the registry item lists `@base-ui/react`.
- **Limits:** `loading` reflects a pending state but does not fetch anything;
  there is no `open`/`onOpenChange`, clear-button or option-render prop in this
  version. Options must carry string labels and values; custom node labels would
  need a render API. Long and CJK labels truncate with `title` and keep the full
  text in the accessible name rather than wrapping indefinitely. Multiple chip
  labels are likewise truncated. Home/End move the highlight while open but also
  place the text caret at the field edge, because Base UI reserves those keys
  for editing; with the popup closed they remain pure caret keys. Base UI does
  not expose an imperative highlight setter, so Home/End are implemented by
  replaying its own arrow navigation (bounded by the option count); this is
  correct but makes a jump O(n) in keyboard events. Form submission through
  `name` follows Base UI's hidden-input behavior and was not separately
  exercised in this phase. No virtual scrolling: large sets rely on the browser
  and the consumer's data shaping.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/combobox.test.tsx`
  → 1 file, 18 tests passed. Covers: named combobox and collapsed state; open/filter;
  exact single payload; multiple payload and chips; ArrowDown/ArrowUp, Enter,
  Home/End, Escape with focus return; disabled option click and keyboard skip;
  empty message; grouped filtering; custom filter; disabled field; unlabeled
  `aria-label`; loading state; controlled and uncontrolled values; ref and
  `className` forwarding; axe in the open state over `document.body`.
- [ ] **axe-core output and manual a11y checks recorded** — the automated axe run
  is part of the test above and reports zero violations in the open state (verified); no
  manual screen-reader/browser pass was **run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/combobox.stories.tsx` defines Default, WithLabel, Multiple, WithGroups,
  WithDisabledOption, Loading, EmptyResult, Controlled, ManyOptions and
  LongAndLocalizedText; `npm run build-storybook` → exit 0, all stories compile.
  Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density
  where applicable** — gallery-level browser review performed by the coordinator (see
  coordinator report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  relies on the token classes and CSS truncation; per-component visual review was **not
  run**, only the gallery-level pass applies (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** —
  only existing `react` (MIT) and `@base-ui/react` (MIT); no new package. The Home/End
  replay is O(n) keyboard events and should be revisited if Base UI exposes a
  highlight setter; bundle impact was not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/combobox.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 18 passed (18)`.
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

**Links to evidence:** `tests/combobox.test.tsx`, `src/ui/combobox.stories.tsx`,
`registry/ui/combobox.tsx`, and the *Evidence (verified)* section above.
