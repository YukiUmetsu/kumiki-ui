# SearchField Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tokenized, accessible, standalone SearchField registry component with documentation and tests.

**Architecture:** Source component composes Kumiki's existing Field and Button primitives; controlled data flow and native input semantics keep search requests out of the library. The showcase simply re-exports registry source. No new dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind v4 semantic tokens, Vitest, Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-10-24-search-field-design.md`

## Global Constraints

- Keep network, result rendering and consumer state external.
- Use existing Field/Button and semantic tokens; no new dependencies.
- Preserve keyboard, IME, disabled, loading and error accessibility.
- Public registry install must work independently of showcase internals.

## Review Focus

- Empty search query + Enter: no accidental duplicate submit, explicitly tested.
- IME composition + Escape/Enter: no clearing or early submission, explicitly tested.
- Disabled + nonempty query: no operable clear/search controls, explicitly tested.
- Busy + editable query: no duplicate submit while entry remains possible, explicitly tested.
- Long CJK query + narrow container: input remains available and layout avoids clipping, inspected in a Storybook example.

---

### Task 1: Public component behavior

**Files:** `tests/search-field.test.tsx`, `registry/ui/search-field.tsx`, `src/ui/search-field.tsx`.

**Interfaces:** `SearchFieldProps` extends native search input props (excluding value/change), adds `query`, `onQueryChange`, `onSearch?`, `onClear?`, `label?`, `description?`, `hint?`, `error?`, `loading?`, `showSubmit?`, `submitLabel?`, `filterAction?`, `containerClassName?`.

- [ ] Write failing controlled/clear/focus/submit tests.
- [ ] Run `npx vitest run tests/search-field.test.tsx` — missing SearchField is expected failure.
- [ ] Implement `SearchField` with existing Field, Input/Button semantics and a forwarded input ref.
- [ ] Run targeted test to confirm green; add tests for IME, busy, disabled, validation, optional actions and axe.
- [ ] Run targeted test again; verify no failures.

### Task 2: Installability and showcase

**Files:** `registry.json`, `src/ui/search-field.stories.tsx`, `docs/component-specs/search-field-spec.md`, `docs/INDEX.md`.

**Interfaces:** `search-field` registry item depends on `field-input` and `button`; src alias exports public props.

- [ ] Add stories for empty, populated, loading, error, disabled, long/CJK and responsive layouts.
- [ ] Document contracts, limits and evidence; register component and index the spec.
- [ ] Run `npm run catalog:find -- --query="search field" --format=json`, `npm run catalog:check`, `npm run registry:validate`, `npm run registry:smoke`.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build-storybook`; run clean fixture and a browser visual review if available. Record gaps explicitly.
- [ ] Commit a feature branch and open a Kumiki-UI PR without merging it.
