# Component: Radio Group

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Single-choice selection recurs in every product, and the same
defects recur with it: a group with no accessible name, options that cannot be
reached or are announced incorrectly, a selected state carried only by colour,
and a control that does not participate in form submission. One compound
primitive with native radio inputs, roving focus, automatic label/description/
error wiring and a filled-dot indicator removes that class of bug while leaving
layout and content to the consumer. Alternatives considered: a native
`<fieldset>` wrapper with hand-written radio markup (rejected — roving focus and
disabled-item skipping would be reimplemented in every consumer) and a
form-library-bound group (rejected — couples the library to one state manager).

**Source:** [`registry/ui/radio-group.tsx`](../registry/ui/radio-group.tsx) (canonical).
[`src/ui/radio-group.tsx`](../src/ui/radio-group.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a mutually exclusive set of options where exactly
  one value may be selected, including required form choices. Do not use it for
  independent settings (use `Checkbox` or `Switch`) or for a single boolean. Do
  not use it as a navigation menu; use links with appropriate semantics. Every
  item needs a visible `label`; the component deliberately does not support
  unlabelled items.
- **Public API:**
  - `RadioGroup` (root; named + default export):
    - `value?: string` — controlled selected value
    - `defaultValue?: string` — initial value when uncontrolled
    - `onValueChange?: (value: string) => void` — next selected value only
    - `orientation?: "vertical" | "horizontal"` — default `"vertical"`
    - `disabled?: boolean` — default `false`; disables every item
    - `label?: ReactNode` — visible group label and accessible name
    - `description?: ReactNode` — supporting text, associated via `aria-describedby`
    - `error?: ReactNode` — inline validation message; sets `aria-invalid` and
      `role="alert"`, associated via `aria-describedby`
    - `name?: string` — form field name for native submission
    - `className?: string` — extra classes for the outer field wrapper
    - remaining `<div>` attributes are forwarded to the group element
  - `RadioGroup.Item` / `RadioGroupItem`:
    - `value: string` — required, unique within the group
    - `label: ReactNode` — required; visible text and accessible name
    - `description?: ReactNode` — associated with the radio via `aria-describedby`
    - `disabled?: boolean` — default `false`; ignored while the group is disabled
    - `className?: string` — extra classes for the item wrapper
    - remaining `<span>` attributes are forwarded to the radio control
  - Exported types: `RadioGroupProps`, `RadioGroupItemProps`, `RadioGroupOrientation`.
- **Composition:** `RadioGroup.Item` children are placed directly inside the
  root. `RadioGroup` is the root with `Item` attached via `Object.assign`, and
  both parts are also named exports. The root wraps the field's label,
  description and error in one column; each item wraps its control, label and
  optional description in one row block.
- **Semantics:** the root is Base UI's `role="radiogroup"` element; every item
  renders `role="radio"` plus a native `<input type="radio">`. `name` is applied
  to the group so the checked input submits `name=value` in a normal form. The
  wrapping `<label>` gives each radio its accessible name and makes the whole
  row clickable. `aria-orientation` reflects `orientation`; `aria-disabled` is
  set on the group; disabled items expose `data-disabled` and are non-interactive.
  The error paragraph uses `role="alert"`, and `aria-describedby` always keeps the
  persistent description while appending the error. A consumer-supplied
  `aria-describedby`/`aria-invalid` is preserved; the component's values are used
  only when the consumer does not provide them (the description is merged).
- **Keyboard/focus:** Tab enters the group at the checked item (or the first
  enabled item when nothing is selected); only one radio is in the tab order.
  Arrow keys move focus and selection and wrap past the ends; disabled items are
  skipped in both directions. Space selects the focused item. Home/End are not
  wired. Focus paints a 2px `ring-ring` with a 2px offset; focus is never moved
  programmatically on mount.
- **Visual states:** unselected (`bg-field` + `border-input`); hover strengthens
  the boundary on an enabled unselected control; selected (`bg-primary` with a
  filled `bg-current` dot, so selection is not colour-only); focus-visible ring;
  disabled item and disabled group (`bg-surface-subtle`, muted label, not
  clickable); error (danger message + `aria-invalid` on the group); long/CJK
  labels and descriptions wrap without clipping or changing control size.
- **Customization:** `orientation`, `className` on the field wrapper and on each
  item wrapper, and semantic tokens consumed through the Tailwind bridge
  (`bg-field`, `bg-primary`, `bg-disabled`, `border-input`, `border-border-subtle`,
  `text-primary-foreground`, `text-disabled-foreground`, `ring-ring`,
  `--km-duration-short`). Colour roles, density, radii and motion are global.
  `className` placement is explicit: root `className` styles the outer column;
  item `className` styles that item's row block, never the circular control.
- **Dependencies:** `@base-ui/react` (Radio Group and Radio primitives) and
  `react`. No other runtime dependency; no icon package (the indicator is a
  token-sized filled span).
- **Limits:** Home/End are not implemented (arrow keys cover the required
  roving behaviour). Base UI's composite navigates both axes by default, so the
  perpendicular arrow pair also moves focus even though `aria-orientation`
  declares the primary axis. There is no `readOnly` or `required` prop exposed,
  and no per-item `aria-label`: a visible label is required. The group label is
  associated with `aria-labelledby` rather than a `<fieldset>`/`<legend>` pair;
  screen readers announce the group correctly but browser form UIs will not
  expose a legend. No `aria-errormessage` (the error uses `aria-describedby` plus
  `role="alert"`, which is more widely supported). Item descriptions are
  associated with the radio, not the group.

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded —
  `npx vitest run tests/radio-group.test.tsx` → 1 file, 14 tests passed. Covers
  `radiogroup`/`radio` roles and accessible names, click and label-click
  selection with the exact callback payload, vertical and horizontal arrow
  roving with wrapping, disabled group and disabled item (no callback), disabled
  item skipped by the keyboard, controlled and uncontrolled values, native form
  submission, group and item description/error ARIA association, ref forwarding,
  `className` merging, and an axe-core run.
- [ ] axe-core output and manual a11y checks recorded — the vitest file runs
  axe-core against the most complete state with 0 violations; manual screen
  reader and browser checks were **not run**.
- [x] Storybook states complete, including realistic and CJK/long content —
  stories present (Default, Horizontal, WithDescription, WithError, DisabledGroup,
  DisabledItem, Controlled, LongAndLocalizedText); `npm run build-storybook` →
  exit 0, all stories compile. Per-story visual inspection was not run.
- [ ] Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density
  where applicable — gallery-level browser review performed by the coordinator
  (see coordinator report); per-component captures were **not run**.
- [ ] No accidental overlap, clipping, contrast, focus or animation failures —
  per-component visual verification was **not run**; only the gallery-level pass
  applies (see coordinator report).
- [x] Test registry install into fresh fixture passed — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] Dependencies/licenses reviewed; performance and bundle impact documented —
  `@base-ui/react` 1.9.0 (MIT) is already a project dependency and is declared by
  the registry item; no new package was added. Bundle impact was not separately
  measured.
- [x] Blockers resolved; known limitations named honestly — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/radio-group.test.tsx` → `Test Files 1 passed (1)`,
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

**Links to evidence:** `tests/radio-group.test.tsx`, `src/ui/radio-group.stories.tsx`,
`registry/ui/radio-group.tsx`, and the *Evidence (verified)* section above.
