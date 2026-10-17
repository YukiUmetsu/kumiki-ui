# Component: Form Summary

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Every form with more than one field eventually needs to explain, in one
place, what failed and where to go next. Hand-built summaries usually miss at least one
of the pieces that make them usable: a live region so the failure is announced, a heading
so the announcement has intent, an entry that names both the field and the reason, and an
activation path that actually moves focus. One small, consumer-driven summary keeps that
behaviour consistent without coupling the library to a validation or form-state library.
Alternatives considered: a schema/validation-bound summary (rejected — it would force a
form library), a generic alert wrapper (rejected — it cannot link to fields), and
auto-focusing the first invalid field on mount (rejected — stealing focus on render is
hostile, especially with `live="assertive"`).

**Source:** [`registry/ui/form-summary.tsx`](../registry/ui/form-summary.tsx) (canonical).
[`src/ui/form-summary.tsx`](../src/ui/form-summary.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use at the top of a form after a submit attempt (or an aggregate
  validation pass) when more than one field can fail. Keep the per-field messages as
  well — the summary is a navigation aid, not a replacement for inline errors. Do not use
  it for transient notifications (use a toast), for a single field that already has a
  visible inline error, or with ids that do not exist in the document. Do not rely on it
  to validate anything; the consumer decides what an error is.
- **Public API:**
  - `errors: Array<{ fieldId: string; label: string; message: string }>` — ordered list
    of failures. `fieldId` is the `id` of the target field, `label` its visible label and
    `message` the validation text. An empty array renders nothing.
  - `title?: ReactNode` — heading that labels the summary; default
    `"Please fix the following errors"`. Pass `null`/`""` to omit it.
  - `onNavigate?: (fieldId: string) => void` — called when an entry is activated. When
    supplied, the consumer owns moving focus (and any scrolling); the component only
    calls it.
  - `live?: "off" | "polite" | "assertive"` — default `"polite"`. `polite` renders
    `role="status"`, `assertive` renders `role="alert"`, `off` renders no live role.
  - `className?: string` — merged onto the root (consumer classes last).
  - all `HTMLAttributes<HTMLDivElement>` except the props above; `ref` forwards to the
    root `<div>`.
  - exports: `FormSummary` (named + default), `FormSummaryProps`,
    `FormSummaryError`, `FormSummaryLive`.
- **Composition:** prop-driven, not compound: the summary is one bounded region with a
  heading and a list, so parts would add ceremony without enabling new layouts. Each
  entry renders as a native `<a>` inside `<li>`; the link's accessible name is
  `${label}: ${message}`. `title` accepts any node. No render-prop for entries — the
  three strings are the contract, and any richer per-field content belongs next to the
  field itself.
- **Semantics:** exactly one live role is applied to the root (`status` for `polite`,
  `alert` for `assertive`, none for `off`) with `aria-atomic="true"` so the list is
  announced as one unit. The heading is a real `<h2>` with a stable `useId()` id, and the
  root points at it with `aria-labelledby` (omitted only when the consumer removes the
  title). Entries sit in a `<ul>`/`<li>` list. Activation is handled explicitly: the
  anchor's default hash jump is prevented so the component can delegate to `onNavigate`
  or focus `document.getElementById(fieldId)`; that fallback is guarded for server
  rendering and for fields that are not mounted. Tabbing to entries and activating them
  with Enter uses native anchor behaviour.
- **Keyboard/focus:** native tab order through the summary links; Enter activates the
  focused link (Space is the platform's scroll gesture for links, not an activation key —
  this is why the entry is an anchor rather than a button). Every link paints the 2px
  `--km-focus-ring` with a 2px offset on `focus-visible`. After activation, focus lands
  on the target field through the consumer's `onNavigate` or the built-in fallback; the
  summary never traps focus, roves tabindex, or moves focus on mount.
- **Visual states:** empty (renders nothing, so it can stay mounted); populated with the
  `status-danger` accent rule, `bg-surface` panel and `border-border` boundary; heading;
  hover (`bg-surface-subtle` on an entry); `focus-visible`; long and CJK messages wrap
  (`break-words`, block-level spans) instead of clipping or widening the card; `live`
  state is exposed as `data-live` for styling and tests.
- **Customization:** `className` on the root and the semantic tokens consumed by the
  Tailwind bridge (`bg-surface`, `border-border`, `bg-status-danger`, `text-danger`,
  `text-muted-foreground`, `text-foreground`, `rounded-surface`, `rounded-sm`,
  `ring-ring`, `--km-duration-short`). Internal parts are addressable via
  `data-part="accent|title|list|item|link|label|message"`; root state hooks are
  `data-km-form-summary` and `data-live`. Because only the root accepts `className`,
  consumers who need deeper overrides can target those data attributes in their own
  stylesheet. Colours are token-driven, so appearance, density and reduced motion are
  handled centrally.
- **Dependencies:** `react` only. No form library, validation library, icon package or
  Base UI primitive.
- **Limits:** the consumer owns ids, labels, messages and ordering; duplicate `fieldId`s
  render as separate entries (keyed by id + index) and each activates the same field.
  The fallback only calls `.focus()` — it does not scroll the field into view, open a
  collapsed section, or expand a step; consumers that need that must use `onNavigate`.
  When `onNavigate` is supplied the built-in focus is deliberately skipped, so a consumer
  that forgets to focus leaves the user where they were. The heading level is fixed at
  `<h2>` (no `asChild`/level prop), and the default title and the `": "` separator in the
  accessible name are English-centric — pass a localized `title` and localize the label
  strings accordingly. There is no error count, no per-entry severity, no collapse
  control and no automatic re-announcement when the same array identity is re-rendered.

## Acceptance evidence

- [x] Behavior and keyboard tests executed; commands/results recorded — `npx vitest run
  tests/form-summary.test.tsx` → 1 file, 9 tests passed. Activation is native anchor
  behaviour (`onNavigate` payload and id-based focus fallback are asserted); no separate
  keyboard-event test exists.
- [ ] axe-core output and manual a11y checks recorded — automated axe runs inside the
  test file on a populated `role="alert"` state with 0 violations (verified); manual
  browser/screen-reader checks were **not run**.
- [x] Storybook states complete, including realistic and CJK/long content —
  `src/ui/form-summary.stories.tsx`; `npm run build-storybook` → exit 0, all stories
  compile. Per-story visual inspection was not run.
- [ ] Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable — gallery-level browser review performed by the coordinator (see coordinator
  report); per-component captures were **not run**.
- [ ] No accidental overlap, clipping, contrast, focus or animation failures —
  per-component visual verification was **not run**; only the gallery-level pass applies
  (see coordinator report).
- [x] Test registry install into fresh fixture passed — `npm run registry:validate` →
  "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] Dependencies/licenses reviewed; performance and bundle impact documented — no
  dependency added; the item imports only `react` (MIT). Bundle impact was not separately
  measured.
- [x] Blockers resolved; known limitations named honestly — see *Limits* above.

## Evidence (verified)

- `npx vitest run tests/form-summary.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 9 passed (9)`. Covers: empty array renders nothing; every entry exposes label
  and message in its accessible name; activation calls `onNavigate(fieldId)`; fallback
  focuses the element by id; `live` maps to exactly one of `status`/`alert`/none with
  `aria-atomic` only when live; default/custom/omitted title and the `aria-labelledby`
  heading association; `ref`, `className` and DOM-prop forwarding; long CJK/URL text
  preservation; axe run on a populated `role="alert"` state with zero violations.
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

**Links to evidence:** `tests/form-summary.test.tsx`,
`src/ui/form-summary.stories.tsx`, `registry/ui/form-summary.tsx`, and the
*Evidence (verified)* section above.
