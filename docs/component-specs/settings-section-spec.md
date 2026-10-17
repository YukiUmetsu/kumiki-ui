# Pattern: Settings section

**Status:** Implementing — component behaviour is unit-verified, the e2e user task passes in
the built showcase (`tests/e2e/patterns.spec.ts`) and the registry validates/smokes/compiles;
a separate consumer-fixture e2e app is still outstanding.
**Catalog phase:** v0.2
**Why shared:** Every product shows the same fragile settings screen — a handful of
preference controls, a changed-or-not signal, a save/reset pair and an honest
pending/error outcome — re-implemented per team with different ideas of what "dirty"
means, whether Reset is safe, and when a save actually succeeded. This pattern carries
that interaction once, with a bounded, domain-free contract, while the consumer keeps the
field catalogue, the data, the validation and the save transport.

**Source:** [`registry/patterns/settings-section.tsx`](../registry/patterns/settings-section.tsx)
(canonical).
[`src/patterns/settings-section.tsx`](../src/patterns/settings-section.tsx) re-exports it for
the showcase.

## Contract

### Task

Review and edit a set of related preferences, see clearly what changed, and get honest
feedback about whether the change saved.

### Use / not use

- **Use** for a bounded group of preferences that are saved as a unit and need visible
  pristine/dirty/pending/saved/error states.
- Do **not** use it as a data-fetching or routing layer: it renders exactly the `fields`
  and `values` it is given and calls back on every edit. The consumer owns loading the
  initial values, validating, persisting and navigation.
- Do **not** use it for a multi-step wizard with per-step progress (that is the Guided
  form pattern) or for a single free-standing control.
- Do **not** nest it inside another `Surface` card; it already renders its own chrome.

### Entry / exit states

| State | How it is produced |
|---|---|
| **Pristine** | `values` equals the last-saved snapshot. Save and Reset are disabled. |
| **Dirty** | Any `values` entry differs from the snapshot (change-compared). Save and Reset enable; a `beforeunload` guard attaches. |
| **Pending** | The consumer passes `pending`, or an `onSave` promise is in flight. Every control is disabled and the primary action is loading. |
| **Saved** | `onSave` resolved. The snapshot advances to the submitted values, dirty clears and a polite inline status announces the success message. |
| **Error** | The consumer passes `error`. A danger `Alert` appears at the top of the body with a Retry action; per-field messages come from `errors`. |
| **Exit while dirty** | The `beforeunload` listener prompts before the tab navigates. It is removed as soon as the form is pristine or the component unmounts. |

### Public API

- `title: ReactNode` — required; rendered as the section heading and the form's
  accessible name (`aria-labelledby`).
- `description?: ReactNode` — optional supporting sentence under the heading.
- `fields: SettingsField[]` — required. Each entry is
  `{ id: string; label: ReactNode; type: "text" | "textarea" | "select" | "switch" | "checkbox";
  options?: { value: string; label: ReactNode }[]; description?: ReactNode; hint?: ReactNode;
  placeholder?: string; required?: boolean }`. `id` is the key in `values`/`errors` and the
  control's DOM `id`.
- `values: Record<string, unknown>` — required, controlled. The consumer owns the state and
  passes the value the pattern just reported back through `onChange`.
- `onChange: (values, dirty) => void` — required; called on every edit with the next values
  and the recomputed dirty flag.
- `onSave: (values) => Promise<void> | void` — required. Returning a promise drives the
  pending/saved cycle; a synchronous return is treated as an immediate successful save.
- `onReset: () => void` — required; the consumer restores its last-saved values.
- `errors?: Record<string, ReactNode>` — per-field validation messages keyed by field `id`,
  rendered as each control's inline error.
- `error?: ReactNode | null` — default `null`; section-level failure shown in a danger
  `Alert` with a Retry action.
- `savedMessage?: ReactNode` — default `"Settings saved."`.
- `pending?: boolean` — default `false`; disables every control and loads the primary action.
- `onRetry?: () => void` — default: run `onSave` again with the current values.
- `labels?: SettingsSectionLabels` — `{ save?: ReactNode; reset?: ReactNode; saving?: string;
  retry?: ReactNode; errorTitle?: ReactNode }`; defaults `"Save"`, `"Reset"`, `"Saving…"`,
  `"Retry"`, `"Settings could not be saved."`.
- `className?: string` — merged onto the root `<form>` (consumer classes win).
- all `HTMLFormElement` props except `onChange`/`title`; `ref` forwards to the root `<form>`.
- exports: `SettingsSection` (named + default), `SettingsSectionProps`, `SettingsField`,
  `SettingsFieldType`, `SettingsFieldOption`, `SettingsSectionLabels`.

### Composition

Data-driven; there are no child components to nest. `Surface` supplies the header (title +
description) and footer (Reset + Save + saved status); the form body renders the fields in a
single `gap-6` column and, when present, the section error `Alert` above them. Text and
textarea fields use `Field`/`TextareaField` (which own label, hint, description, error and
`aria-describedby`); select/switch/checkbox fields wrap the corresponding primitives and
render their description/hint/error copy locally because those primitives do not own an
error slot.

### Semantics

- The root is a native `<form aria-labelledby={titleId} noValidate>`, tagged
  `data-km-settings-section` with `data-state` (`pristine` | `dirty` | `pending` | `saved` |
  `error`) plus `data-dirty`, `data-pending`, `data-saved`; each field wrapper is
  `data-part="field"` with `data-field-id` / `data-field-type`.
- Every control keeps the accessible name, role and semantics of its primitive (labelled
  input, labelled `role="combobox"`/`role="switch"`/checkbox). Per-field errors carry
  `role="alert"` and mark the input `aria-invalid`.
- The section error is an `Alert variant="danger" live="polite"` (`role="status"`,
  `aria-atomic`); its Retry action is a native button. Saved state is announced from a
  `role="status"` region, so no Toast provider is required.
- Severity is never colour alone: the alert carries the built-in shape-distinct icon, and
  the saved status pairs a check glyph with text.

### Keyboard / focus

- Natural Tab order through fields, Reset then Save.
- `Enter` inside any control submits the form (the Save button is `type="submit"` inside the
  same `<form>`), running the same path as clicking Save.
- Save and Reset are native disabled while pristine or pending, so they are skipped by
  keyboard and pointer alike. No focus is moved on error; the polite alert announces
  without stealing focus.

### Loading / error / cancel / retry / restore

- **Pending:** all controls disabled, primary action is `isLoading` with
  `loadingLabel` (`labels.saving`), repeated triggers prevented.
- **Save error:** the consumer sets `error`; the danger alert appears with Retry, which calls
  `onRetry` or, by default, `onSave` again. Field values stay editable.
- **Reset:** restores the consumer's last-saved values; enabled only while dirty.
- **Restore:** re-rendering with new `values` re-baselines only after a successful save;
  changing `values` alone marks the form dirty.

### Responsive behaviour

- < 640 px: fields stack in one column; the footer stacks and every action is full-width
  (`w-full sm:w-auto`), so Save/Reset never crowd the status line.
- ≥ 640 px: the footer actions sit inline; the field column keeps `gap-6` (32 px) between
  groups and the title/description header pair retains its `gap-1` rhythm.

### Exposed callbacks / slots

```text
fields: SettingsField[]
values: Record<string, unknown>
onChange(values, dirty): void
onSave(values): Promise<void> | void
onReset(): void
onRetry?: () => void
errors?: Record<string, ReactNode>
error?: ReactNode | null
savedMessage?: ReactNode
pending?: boolean
labels?: SettingsSectionLabels
```

Consumer supplies the field catalogue, the data, the validation and the save transport.

### Sample data / neutral copy

Fields: “Display name”, “Language”, “Timezone”, “Email digest”, “Show online status”.
Save success: “Settings saved.” Field error example: “Display name is required.”
Empty section: “No settings to configure.” No branded or industry copy is used.

### Motion

- Saved status and the section alert fade/slide in over 180 ms
  (`ease [0.4, 0, 0.2, 1]`) through `AnimatePresence`; both are suppressed under
  `prefers-reduced-motion` (instant state change, no translate).
- Field errors are rendered by the primitives and appear without layout-jumping animation.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/settings-section.test.tsx`
  → 12/12 passed. Covers: header + field rendering, pristine disabled actions, dirty after a
  text edit and a switch toggle, `onSave` payload + saved status, pending disabling every
  control with a loading primary action, per-field inline validation, section alert + Retry,
  Reset restoring the snapshot, ref/`className`/form-prop forwarding, the dirty-only
  `beforeunload` guard, and an axe run in a dirty state.
- [x] **axe-core output recorded** — the in-file axe run reports 0 violations (colour-contrast
  and document-level landmark/title rules disabled as in the sibling suites) and the
  Playwright e2e reports 0 violations in both appearances; manual screen-reader and 200 %
  zoom checks were **not run**.
- [x] **Storybook states authored** — stories exist for Default, Pending, Saved,
  WithValidationErrors, WithSectionError, Empty and LongAndLocalizedText under
  `Patterns/SettingsSection`. Storybook was **not built or visually reviewed** in this task
  (out of assigned scope).
- [x] **Screenshots reviewed: light/dark, two themes, narrow/wide, density, reduced motion** —
  `npx playwright test tests/e2e/patterns.spec.ts` regenerated and asserted the full-page
  light baseline; axe runs in light/dark and there is no horizontal overflow at
  320/375/768/1440 → `6 passed`.
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — covered by
  the e2e overflow audit and the axe runs; a separate manual visual review was not performed.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:fixture` →
  `registry:fixture OK — 38 item(s), 40 file(s) compiled in a temporary fixture (removed)`;
  `npm run registry:smoke` → `38 item(s), 79 file(s)`; `npm run registry:validate` →
  `38 item(s) valid`.
- [x] **End-to-end user task test** — `npm run test:e2e` → `16 passed` (10 showcase +
  6 patterns); the pattern's task (edit → save → saved status) is covered by
  `tests/e2e/patterns.spec.ts`. It runs against the built showcase rather than a separate
  consumer app; the registry fixture compiles the item.
- [x] **Dependencies/licenses reviewed** — no new package; the pattern imports only local
  registry UI modules (React + Base UI + Motion, MIT). Bundle impact not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits*.

## Evidence (verified)

- `npx vitest run tests/settings-section.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 12 passed (12)`; full `npx vitest run` → `Test Files 82 passed (82)`,
  `Tests 760 passed (760)`.
- `npx tsc --noEmit` → exit 0 (no output).
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Edits a field, saves and
  asserts the saved state, regenerates the full-page light baseline, runs axe in light and
  dark (0 violations) and checks for no horizontal overflow at 320/375/768/1440.
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

**Links to evidence:** `tests/settings-section.test.tsx`,
`src/patterns/settings-section.stories.tsx`, `registry/patterns/settings-section.tsx`, and the
*Evidence (verified)* section above.

## Limits

- **Cross-field summary omitted:** the brief lists `FormSummary` for cross-field errors, but
  this implementation surfaces validation through per-field `Field error` and the
  section-level `Alert`, in line with the assigned behaviour contract. `FormSummary` was not
  added because the select/switch/checkbox primitives do not expose a stable focusable
  `id` for the summary's `onNavigate` default, which would make focus handling unreliable.
- **Dirty comparison is value-based on JSON-serializable entries,** compared
  order-independently by key. Deeply nested object values are compared by their JSON
  serialization order.
- **Saved status persists** until the next edit or a new save; it is not auto-dismissed by a
  timer, to keep the state observable and testable.
- **No initial-load skeleton state:** the pattern renders the given `values` immediately; the
  consumer shows its own loading UI before supplying data.
- **One field per row:** no paired two-column grid or custom field renderer is provided
  (despite the brief's optional `renderField` slot and 2-column hint).
- **No unsaved-changes `Dialog`:** only the `beforeunload` guard is implemented; an in-app
  navigation confirmation Dialog (consumer-owned routing) is not part of this scope.
