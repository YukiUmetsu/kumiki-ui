# Component: SearchField

**Status:** Implementing — targeted behavior, install and build checks passing; browser visual review pending

**Catalog phase:** v0.1 UI primitive
**Why shared:** A search text field requires consistent icon, clear, submit, loading and error affordances independent of a particular result list. `SearchableResults` is a larger list pattern, not a reusable standalone input.

## Contract

- **Use / not use:** Use for a controlled search in a toolbar or form. Do not use it as a results list, data-fetcher, combobox, or autocomplete.
- **Public API:** `query: string`, `onQueryChange(query)`, `onSearch?(query)`, `onClear?()`, `label?`, `placeholder?`, `description?`, `hint?`, `error?`, `loading?`, `showSubmit?`, `submitLabel?`, `filterAction?`, `containerClassName?`; native input props except `type`, `value`, `defaultValue`, `onChange`, `children`.
- **Composition:** An `Input` with tokenized adornments and a standard Kumiki `Button` for optional submit; `filterAction` accepts a consumer-owned element. `className` styles input; `containerClassName` styles root; style/DOM props forward to input. Ref targets the native search input.
- **Semantics:** Native `type=search`, visible label (`Search` by default), `aria-describedby` for persisted descriptions plus error or hint; error is a `role=alert` and sets `aria-invalid`. Busy state has polite `role=status` announcement and `aria-busy`.
- **Keyboard/focus:** Enter submits nonblank query if `onSearch` exists. Escape clears and returns focus, except while IME is composing. Clear button has an accessible name; consumer `onKeyDown` runs first and can prevent behavior.
- **Visual states:** Quiet outlined field with integrated magnifier, clear affordance when query nonempty, loading glyph, disabled treatment, descriptive error, optional responsive submit and filter actions.
- **Customization:** Existing semantic field/button tokens. CSS motion respects reduced-motion for the spinner; CSS hover/focus follow library conventions. No per-app styles.
- **Dependencies:** Only existing `button` and `field-input` registry items. No new package dependencies or icons package.
- **Limits:** Query state and search lifecycle belong to consumer. The optional filter action is not itself a filtering system. Loading prevents duplicate submits but permits editing and clearing. A hidden native WebKit cancel control avoids duplicate clears.

## Example

```tsx
<SearchField
  label="Search documents"
  query={query}
  onQueryChange={setQuery}
  onSearch={search}
  showSubmit
  loading={isSearching}
  filterAction={<FilterPopover />}
/>
```

## Acceptance evidence

- [x] Targeted 10-case Vitest behavior/keyboard/axe tests: `npx vitest run tests/search-field.test.tsx` — 10 passed on 2026-10-24, including a live-status announcement check outside the busy input.
- [x] `npm run catalog:check` — 323 entries and 642 linked stories verified; `npm run registry:validate` and `npm run registry:smoke` — 153 items valid and staged.
- [x] `npm run registry:fixture -- --item=search-field` — SearchField and its dependencies compiled in a clean temporary consumer.
- [x] Targeted ESLint — exit 0; `npm run build-storybook` — completed successfully.
- [ ] Whole-repository `npm run typecheck`, `npm run lint`, `npm test`, and unscoped `npm run registry:fixture` currently fail in unrelated existing files (`causal-system-stage`, `map-stage`, and `finance-sculpture-3d`). Full Vitest result: 1692 passing, 1 failing; browser project cannot launch without the absent Chromium binary.
- [ ] Storybook browser visual review: pending light/dark, narrow/wide, CJK and theme variants. The browser download endpoint returned an incomplete archive.
- [ ] Manual keyboard/screen reader spot check: pending.

**Stories:** `Components / Search Field` (Default, With Query, With Filters, Loading, Error, Disabled, Compact, Long and Localized).
