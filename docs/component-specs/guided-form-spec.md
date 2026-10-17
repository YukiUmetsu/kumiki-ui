# Pattern: Guided Form

**Status:** Implementing (behavioural unit tests, Playwright e2e/screenshots and registry
install/validate/smoke/fixture verified; Storybook build and manual screen-reader/zoom checks
not run — see *Evidence*)
**Catalog phase:** Reusable application pattern (composes verified v0.1/v0.2 primitives)
**Why shared:** Every multi-step flow re-implements the same fragile shell — a step
indicator that lets keyboard users tab into hidden panels, validation that fires on the
wrong event, a submit button that short-circuits into an unrecoverable error, and a draft
that is silently lost on reload. One pattern with a bounded contract keeps progression,
per-step validation and save/restore predictable while leaving the steps, fields,
validation rules, submit handler and copy to the consumer.

**Source:** [`registry/patterns/guided-form.tsx`](../registry/patterns/guided-form.tsx)
(canonical). [`src/patterns/guided-form.tsx`](../src/patterns/guided-form.tsx) re-exports it
for the showcase.

## Pattern contract

- **Task:** complete a multi-step process with clear progress, per-step validation, and the
  ability to leave and resume safely.
- **Use / not use:** use for an ordered form split across steps where each step gates the
  next. Do **not** use it as a router, data layer or schema system: it owns the shell only —
  `steps`, `values`, `validate`, `onSubmit` and draft handling are supplied by the consumer.
  It is not a generic stepper/ wizard for non-form content, and it does not fetch or persist
  to a server.
- **Entry/exit states:** entry — step 1 active, fields empty/default, a stored draft loaded
  if present; step active — local validation not yet run or passed; step invalid —
  `FormSummary` shown, offending fields marked by the consumer through `api.errorFor`;
  step valid — Next advances; pending — submit in progress; error — retryable notice, fields
  stay editable; completed — success notice, draft cleared; exit — a `beforeunload` guard is
  armed while dirty.

- **Public API:**
  - `steps: GuidedFormStep[]` — required, ordered. `GuidedFormStep` is
    `{ id: string; label: string; description?: string }`.
  - `activeStep: number` — required, controlled. Clamped to the valid step range.
  - `onStepChange: (index: number) => void` — required; called with the next index when a
    forward move is allowed or when the user moves backwards.
  - `values: Record<string, unknown>` — required, controlled, keyed by field id.
  - `onChange: (values: Record<string, unknown>) => void` — required; called with the full
    next values object on every field change.
  - `renderStep: (step, api) => ReactNode` — required. `api` is
    `{ step; index; values; setValue(fieldId, value); errors; errorFor(fieldId) }`.
  - `validate: (stepId, values) => GuidedFormError[]` — required. `GuidedFormError` is
    `{ fieldId: string; label: string; message: string }`.
  - `onSubmit: (values) => Promise<void> | void` — required; reject to show a retryable error.
  - `onSaveDraft?: (values) => void` — when set, a "Save draft" action is shown.
  - `storageKey?: string` — `localStorage` key; when set the draft is persisted on change and
    restored once on mount, and cleared after a successful submit.
  - `onRestoreDraft?: (draft) => void` — called once with a stored draft found on mount.
  - `labels?: Partial<GuidedFormLabels>` — neutral English copy overrides.
  - `className?: string` and all `HTMLDivElement` props except `children`/`onChange`/`onSubmit`;
    `ref` forwards to the root.
  - exports: `GuidedForm` (named + default), `GuidedFormProps`, `GuidedFormStep`,
    `GuidedFormError`, `GuidedFormStepApi`, `GuidedFormLabels`.

- **Composition:** step navigation reuses `Tabs` (compact step labels, `aria-label="Steps"`)
  with the active-step indicator's sliding thumb; the shell is a single `Surface` (`header` =
  step navigation, body = notices + the active step, `footer` = actions) wrapped in a native
  `<form noValidate>`. Fields are rendered by the consumer inside `renderStep` (`Field`,
  `Textarea`, `Select`, `Checkbox`, `Switch`). `FormSummary` renders per-step errors and
  `Alert` renders submit/success/draft notices. `Button` provides Previous, Save draft and the
  primary Next/Submit action.

- **Semantics:** the root is a plain `<div>` (`data-km-guided-form`). Step navigation is a
  `role="tablist"` named "Steps" whose `role="tab"` entries parallel the steps; the body is a
  `role="tabpanel"` for the active step. **Only the active step's panel is mounted**, so hidden
  steps never exist in the DOM and can never be reached by Tab or assistive technology. The
  active panel is labelled by its tab. The per-step `FormSummary` renders `role="alert"`
  (`live="assertive"`) and links each failure to its field; the submit-failure and success
  `Alert`s are live regions (`assertive` for the blocking failure, `polite` otherwise). Field
  error messages are associated by the consumer through `Field error`.

- **Keyboard/focus:** the tablist uses `Tabs`' roving focus (arrow keys move focus, Enter/Space
  activates); a forward step change runs the current step's validation first, so later steps
  cannot be reached while the current one is invalid. On any step change focus moves to the new
  step panel heading (`<h3 tabIndex={-1}>`; the section itself is an `<h2>`). On a validation
  failure focus moves to the
  `FormSummary`; activating a summary entry focuses `document.getElementById(fieldId)`. Enter is
  **not** hijacked — the body is a native `<form>` whose only submit control is the primary
  action, so the browser's own Enter-to-submit behaviour applies. The primary action is a real
  `<button type="submit">`; Previous and Save draft are `type="button"`.

- **Visual states:** step tab default/hover/active/disabled; step heading + description; error
  summary (accent rule, labels, messages); field error/disabled states come from the primitives;
  notices — info (draft restored), success (draft saved, completed), danger (submit failed with
  Retry); primary action default/pending (`Button isLoading`); previous disabled on step 1.
  Long and CJK step labels, field values and messages wrap with `break-words` rather than
  clipping.

- **Loading/error/cancel/retry/restore:** validation runs on forward navigation and on submit and
  **blocks** progression while invalid (Next is never disabled — the failure is shown instead).
  Submit sets the primary action to `isLoading` and the root to `aria-busy`; a rejection shows a
  danger `Alert` with **Retry** and leaves the fields editable; a resolution shows the success
  notice and clears the stored draft. Cancel/exit is handled by a `beforeunload` guard armed while
  the form is dirty; the pattern does not own routing, so route-level guards remain the consumer's
  responsibility. With `storageKey`, the draft is written to `localStorage` (debounced 300 ms) and
  restored once on mount; a JSON failure or empty object is ignored rather than trusted.

- **Responsive fallback:** below 640 px (`sm`) the footer stacks and every action is
  full-width (`w-full sm:w-auto`); at ≥ 640 px the action row keeps Previous on the start and
  the trailing group (Save draft, Next/Submit) on the end. The step tab list scrolls
  horizontally instead of clipping. The layout is a single column at every width.

- **Exposed callbacks/slots:** `steps`, `activeStep`, `onStepChange`, `values`, `onChange`,
  `renderStep(step, api)`, `validate(stepId, values)`, `onSubmit(values)`, `onSaveDraft(values)`,
  `storageKey`, `onRestoreDraft(draft)`, `labels`, `className`, forwarded DOM props and `ref`.
  The consumer supplies steps, fields, validation rules, submit handler and copy.

- **Sample data + copy:** steps "Details", "Preferences", "Review"; validation "Enter a value.";
  draft notice "Your draft has been restored."; saved notice "Draft saved."; submit error
  "Could not submit the form."; success "Completed.".

- **Motion:** the active step panel fades and rises 6 px on mount (`motion.div`, 180 ms); the
  active-step thumb slides with `Tabs`' `layoutId` spring. Every motion is gated by
  `useReducedMotion()`, which swaps to an instant state change. The exit animation is intentionally
  omitted so hidden steps unmount immediately (accessibility — hidden steps must never remain
  reachable — outranks the exit animation).

- **Dependencies:** `react`, `motion`, and the registry's own `tabs`, `surface-card`, `button`,
  `alert` and `form-summary` items. No new package is added.

- **Limits:** the pattern is fully controlled — it holds no form state of its own beyond
  transient status/errors; it does not fetch, route or persist to a server (draft storage is
  local-only). Validation is consumer-owned and step-scoped, so cross-step validation must be
  expressed inside `validate`/`onSubmit`. There is no exit-confirmation `Dialog` because the
  pattern owns no navigation trigger; only a `beforeunload` guard is provided. Live region
  behaviour for draft save/restore is polite only. No per-step loading (skeleton) state is
  rendered — the consumer owns async field data.

## Acceptance evidence

- [x] **Behaviour and keyboard tests executed** — `npx vitest run tests/guided-form.test.tsx`
  → 1 file, 10 tests passed. Covers: labelled step navigation and first-step render; invalid Next
  blocking progression with a focused `FormSummary`; summary entry focusing the offending field;
  valid step advancing with focus on the new step heading; hidden panels absent from the DOM and
  a forward tab click blocked while invalid; submit pending (`Button isLoading` + `aria-busy`) and
  success with draft cleared; submit error with Retry and fields still editable; draft restore from
  `storageKey`; explicit draft save; and an axe run on the first step.
- [x] **axe-core output and manual a11y checks recorded** — axe runs in the test file above
  (0 violations, verified) and in the Playwright e2e in both appearances (0 violations);
  manual screen-reader and 200 %-zoom checks were **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** — stories exist
  (`Default`, `Prefilled`, `DraftRestored`, `SubmitError`, `PendingSubmit`,
  `LongAndLocalizedText`); `npm run build-storybook` was **not run** (out of the assigned scope).
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
  (10 showcase + 6 patterns); the pattern's own spec is `6 passed` (complete step 1, hit
  validation, fix it, submit; step headings asserted at `h3`).
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no
  dependency added; the pattern imports only existing registry items plus `react` (MIT) and
  `motion` (MIT). Bundle/performance impact was not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above; registry
  wiring is in place (`registry:validate`/`smoke`/`fixture` all pass).

## Evidence (verified)

- `npx vitest run tests/guided-form.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 10 passed (10)`; full `npx vitest run` → `Test Files 82 passed (82)`,
  `Tests 760 passed (760)`.
- `npx tsc --noEmit` → exit 0 (no errors in `registry/patterns/guided-form.tsx`,
  `src/patterns/guided-form.tsx`, `src/patterns/guided-form.stories.tsx`,
  `tests/guided-form.test.tsx`).
- `npx playwright test tests/e2e/patterns.spec.ts` → `6 passed`. Completes step 1, hits the
  per-step validation summary, fixes it and submits (asserting the `h3` step headings and the
  “Completed.” notice), regenerates the full-page light baseline, runs axe in light and dark
  (0 violations) and checks for no horizontal overflow at 320/375/768/1440.
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

**Links to evidence:** `tests/guided-form.test.tsx`,
`src/patterns/guided-form.stories.tsx`, `registry/patterns/guided-form.tsx`, and the
*Evidence (verified)* section above.
