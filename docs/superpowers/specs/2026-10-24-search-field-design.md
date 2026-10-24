# SearchField — Design

**Approved:** 2026-10-24 (user approved the proposed contract)

## Intent

Provide a self-contained, source-installable search input suitable for compact
toolbars and full-width search forms. Existing `Input`/`Field` provide semantics
but do not supply search-specific affordances; `SearchableResults` couples a
basic search input to a results collection. A dedicated `SearchField` provides
one consistent search affordance without owning any results or networking.

## Contract

- Controlled `query: string`, `onQueryChange(query: string)`, optional
  `onSearch(query: string)`, `onClear()`, a visible `label` (default `Search`),
  `placeholder`, `description`, `hint`, and `error`.
- Native `<input type="search">`, forwarded `HTMLInputElement` ref, native
  input attributes and consumer `className` for the field container.
- Search icon inside the field. A clear control appears only when the query is
  nonempty and the field is enabled; clicking it clears the controlled query
  via `onQueryChange("")`, calls `onClear`, and returns focus to the input.
- Pressing Enter invokes `onSearch` if provided. Escape clears an existing
  query, except during IME composition; neither shortcut interferes with
  normal typing. An optional visible submit button calls the same action.
- Optional consumer-owned filter action (a React node) sits next to the field.
  It is not tied to a particular menu or dataset.
- `loading` displays a stable, politely announced busy state and prevents
  duplicate search submissions; text entry remains possible. `disabled`
  prevents all interaction. Validation uses existing `Field` ARIA wiring.
- Tokens govern the background, border, text, focus, spacing and motion.
  The field remains legible across light/dark, narrow widths, CJK and zoom.
- No automatic requests, debounce, result rendering, sample data, routing or
  business logic. No added package dependencies.

## Composition and visual direction

Compose the existing Kumiki `Field`/`Input` semantics and `Button`. The input
is visually a single quiet, rounded control with a leading search glyph and
trailing clear affordance, not a stack of nested cards. The submit and filter
controls are optional and responsive; focus is always obvious.

## Evidence

Vitest/Testing Library keyboard, control, loading/disabled, IME and a11y
coverage; Storybook state examples; registry validation, source-install smoke,
typecheck, lint, build and available visual checks. Any check not run must be
reported honestly.
