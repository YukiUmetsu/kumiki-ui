# Component: Separator

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Every interface needs to divide related groups — sections, list rows,
toolbars — and each product re-invents the same 1px rule, usually with ad-hoc colors and
inconsistent semantics. One tokenized rule with an explicit semantic/decorative choice
removes that duplication while leaving all spacing, size and layout decisions to the
consumer. Alternatives considered: shipping a divider that bakes margins (rejected — it
cannot satisfy dense lists and roomy marketing pages at once) and always emitting
`role="separator"` (rejected — purely visual dividers then add noise for screen readers).

**Source:** [`registry/ui/separator.tsx`](../registry/ui/separator.tsx) (canonical).
[`src/ui/separator.tsx`](../src/ui/separator.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use to divide related groups of content — page sections, list rows,
  toolbar clusters. Do not use it as a spacing device (margins belong to the layout), do
  not rely on it to convey meaning that the surrounding structure does not already state,
  and do not use it as a border substitute around interactive controls whose focus ring
  must own the edge.
- **Public API:**
  - `orientation?: "horizontal" | "vertical"` — default `"horizontal"`. Horizontal spans
    the available width; vertical is one pixel wide and stretches to the flex row height.
  - `decorative?: boolean` — default `true`. Presentational rule: no `separator` role and
    hidden from the accessibility tree. `false` exposes a semantic separator.
  - `className?: string` — merged onto the root (consumer classes win).
  - Base UI `Separator` props pass through (`render`, `style`, arbitrary div props,
    event handlers); `ref` forwards to the root `<div>`.
  - exports: `Separator` (named + default), `SeparatorProps`, `SeparatorOrientation`.
- **Composition:** a single element. There are no slots; the rule is the whole component.
  It renders through Base UI's `Separator`, which sets `role="separator"` and
  `aria-orientation` by default; the decorative branch overrides both with
  `role="none"` and `aria-hidden="true"`.
- **Semantics:** with `decorative` (default) the rule is presentational and never enters the
  accessibility tree. With `decorative={false}` assistive technology announces a separator
  with the correct `aria-orientation`. The component exposes `data-km-separator`,
  `data-orientation` and `data-decorative` hooks for styling and tests.
- **Keyboard/focus:** not focusable and not interactive; it adds no tab stop and no key
  handling.
- **Visual states:** one tokenized color (`bg-border`) and one thickness class per axis
  (`h-px w-full` horizontal, `w-px self-stretch` vertical). There is intentionally no
  hover, focus, disabled or loading state. Consumer `className` is composed last, so
  state or layout styles the consumer adds win.
- **Customization:** `orientation`, `decorative`, `className` and the semantic tokens the
  Tailwind bridge consumes (`bg-border`). Theme appearance changes the border token; there
  are no size variants — thickness is the hairline by design.
- **Dependencies:** `@base-ui/react` (MIT) and `react`. No other runtime dependency.
- **Limits:** thickness is fixed at one pixel (no `size` prop) so it can never be
  mistaken for a content boundary; there is no label/label-position support (that is a
  different component); `decorative` flips role and `aria-hidden` together, so a consumer
  wanting only one of the two must pass the DOM attribute explicitly; a vertical rule only
  looks right inside a stretched flex row (it does not know the container height).

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/separator.test.tsx`
  → 1 file, 6 tests passed (decorative default, semantic role, vertical orientation, no
  baked outer spacing, ref/`className`/prop forwarding, mixed-composition axe run). The
  rule has no keyboard behavior to test.
- [ ] **axe-core output and manual a11y checks recorded** — axe runs inside the test file
  above (0 violations on `document.body`); manual browser/screen-reader checks were
  **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/separator.stories.tsx` (Default, Vertical, Semantic, InList,
  ConsumerOwnedSpacing, LongAndLocalizedText); `npm run build-storybook` → exit 0, all
  stories compile. Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — gallery-level browser review performed by the coordinator (see
  coordinator report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** —
  per-component browser verification **not run**; only the gallery-level pass applies
  (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — only
  `@base-ui/react` and `react`, both MIT and already required by other registry items; no
  new dependency added. Bundle impact was not separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

## Evidence (verified)

- `npx vitest run tests/separator.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 6 passed (6)`.
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

**Links to evidence:** `tests/separator.test.tsx`, `src/ui/separator.stories.tsx`,
`registry/ui/separator.tsx`, and the *Evidence (verified)* section above.
