# Component: Field + Input

**Status:** Verified (Phase 0)
**Catalog phase:** 0
**Why shared:** Text entry is the most repeated interaction in an application, and the
recurring defects are always the same: a label that is not programmatically associated,
an error that is visible but not announced, a hint that collides with an error, and a
focus/disabled treatment that differs per form. One field with automatic
`htmlFor`/`id`/`aria-describedby`/`aria-invalid` wiring removes that class of bug.
Alternatives considered: a form-library-bound field (rejected — couples the library to a
specific form state manager) and a fully headless compound API (deferred — no consumer
need in Phase 0).

**Source:** [`registry/ui/input.tsx`](../registry/ui/input.tsx) (canonical).
[`src/ui/input.tsx`](../src/ui/input.tsx) re-exports it for the showcase.
Exports: `Field` (named + default) and `Input` (bare element for custom layouts).

## Contract

- **Use / not use:** use `Field` for labelled text entry with hint/error; use the bare
  `Input` inside a layout you own — in that case you are responsible for the label and
  the accessible name (`aria-label` / `aria-labelledby`). Do not use `Field` for
  non-text content, and do not fake an error with colour alone.
- **Public API** (`Input`, a bare `<input>`):
  - all `InputHTMLAttributes<HTMLInputElement>`; `className` merged; `ref` forwards to
    the `<input>`.
- **Public API** (`Field`, same attributes inherited plus):
  - `label?: ReactNode` — visible label, associated through `htmlFor`/`id`
  - `hint?: ReactNode` — helper text, rendered only while there is no error
  - `error?: ReactNode` — when non-empty the input becomes invalid and the message is
    announced
  - `containerClassName?: string` — extra classes for the wrapping element
  - `className?: string` — extra classes for the `<input>`
  - `id?: string` — supply one to own the generated ids (otherwise `useId()` is used)
  - controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage are both
    supported — this is plain React state over native input semantics
- **Composition:** `label`/`hint`/`error` accept any node; the input's `type`, `name`,
  `autoComplete`, `inputMode`, `required`, `readOnly`, `onBlur`, etc. pass straight
  through. Slots are intentionally minimal: no prefix/suffix/icon slot in Phase 0.
- **Semantics:** native `<label htmlFor>` + `<input>`; the hint or the error is wired
  through `aria-describedby` (the error wins when both exist, so a stale hint is never
  read with a failure); `error` sets `aria-invalid="true"` unless the consumer sets
  `aria-invalid` explicitly (a consumer value always wins); the error paragraph carries
  `role="alert"` so it is announced when it appears; the disabled state is the native
  `disabled` attribute (non-interactive, not merely dimmed).
- **Keyboard/focus:** entirely native input behaviour — Tab order, IME composition,
  caret/selection, Enter submission inside a form and touch/pointer selection are
  provided by the platform and are not intercepted. `focus-visible` paints a 2px ring
  (`--km-focus-ring`) with a 2px offset; the invalid state additionally switches the
  border to the `danger` role.
- **Visual states:** default; `hover`/pressed (native); `focus-visible`; `disabled`
  (`opacity-50` + `cursor-not-allowed` + native non-interactivity); invalid/error
  (danger border + `role="alert"` message, hint suppressed); hint; empty (placeholder is
  `text-muted-foreground`); long and CJK values scroll inside the input without resizing
  the layout.
- **Customization:** `className`/`containerClassName`, and the semantic tokens consumed
  by the Tailwind bridge (`bg-surface`, `border-input`, `rounded-control`,
  `text-foreground`, `placeholder:text-muted-foreground`, `text-danger`,
  `--km-control-height`, `--km-control-space-x`, `--km-type-size-base`). Input font size
  is 16px at the default density specifically to avoid the mobile zoom-on-focus
  behaviour of smaller inputs; compact density lowers it via `--km-control-font`. All
  motion comes from `--km-duration-short` and is neutralised under
  `prefers-reduced-motion: reduce`.
- **Dependencies:** `react` only. No form library, no validation library, no icon
  package.
- **Limits:** no built-in validation rules (the consumer decides what an error is — the
  component only communicates it); no `aria-errormessage` (Phase 0 uses
  `aria-describedby`, which is more widely supported); no prefix/suffix slots; no
  autosize (that belongs to the catalog's separate `Textarea` entry); `role="alert"` is
  assertive — for high-frequency inline validation a consumer may prefer
  `aria-live="polite"` on their own message, and that tradeoff is not configurable here.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/input.test.tsx`
  → passes (part of the 37-test unit suite: `button` 10, `input` 12, `dialog` 9,
  `a11y` 3, `theme` 3). Covers: `label` associated via `htmlFor`/`id`;
  generated ids are unique per instance; a non-empty `error` sets `aria-invalid="true"`,
  renders the message with `role="alert"` and exposes it through `aria-describedby`;
  hint is wired when there is no error and suppressed when there is one; an explicit
  `aria-invalid`/`aria-describedby` from the consumer is preserved and merged; disabled
  input is non-interactive; the bare `Input` renders without a wrapper; `ref` forwards
  to the `<input>`; typing fires `onChange` (controlled usage).
- [x] **axe-core output and manual a11y checks recorded** — `npx playwright test` runs
  axe (WCAG 2.0/2.1/2.2 A+AA tags) on the built showcase in light and dark: 0 violations.
  The same run asserts the input boundary is ≥3:1 against its own background
  (WCAG 1.4.11) and that hint/error text is ≥4.5:1 in both appearances, and that a long
  CJK value typed into the field stays inside its section (no clipping/overflow).
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/input.stories.tsx` (Default, WithHint, WithError, Disabled, LongCJKValue,
  BareInput); `npx storybook build` succeeds. The showcase also renders a controlled
  email field with a hint, a password field with an error, a disabled field and a bare
  input.
- [x] **Screenshots reviewed: light/dark, narrow/wide** — the light/dark 1440 and light
  320 baselines include the field rows
  (`tests/e2e/showcase.spec.ts-snapshots/showcase-{light,dark}-1440-*.png`,
  `showcase-light-320-*.png`).
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — no
  document overflow at 320/375/768/1440; measured border/text contrast as above; focus
  indicator asserted; the 14px/16px type sizes come from tokens
  (`--km-type-size-sm`/`-base`) rather than ad-hoc values.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`,
  `npm run registry:smoke` and `npm run registry:fixture` (`3 item(s), 4 file(s) compiled
  in a clean fixture`) all pass; the `input` item declares no dependencies.
- [x] **Dependencies/licenses reviewed** — no new dependency; the component uses `react`
  only, which keeps the registry item a single file.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

**Links to evidence:** `tests/input.test.tsx`, `tests/e2e/showcase.spec.ts`,
`src/ui/input.stories.tsx`, `registry.json` (item `input`).
