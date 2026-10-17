# Component: Badge

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Status and counting pills appear in every surface — tables, lists, filters,
cards — and each product re-invents the same tokens, sizes and "is this colour-only?"
accessibility problem. One badge with a bounded variant set removes that duplication
while leaving the label, palette and placement to the consumer. Alternatives considered:
a compound badge with slots (rejected — a badge has exactly one label) and per-product
severity names (rejected — the four status roles are already semantic tokens).

**Source:** [`registry/ui/badge.tsx`](../registry/ui/badge.tsx) (canonical).
[`src/ui/badge.tsx`](../src/ui/badge.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a short, non-interactive status or category label attached
  to other content. Do not use it as a button or link (wrap it in one if the whole badge
  must be actionable), as a notification/announcement (use `Alert`/`Toast`), or as the
  only carrier of a message — the visible children must name the state.
- **Public API:**
  - `variant?: "neutral" | "info" | "success" | "warning" | "danger"` — default `"neutral"`
  - `size?: "sm" | "md"` — default `"md"` (`text-xs` / `text-sm`, tighter padding for `sm`)
  - `dot?: boolean` — default `false`; renders a small, colour-matched status dot before
    the children instead of the status glyph
  - `children?: ReactNode` (from `HTMLAttributes<HTMLSpanElement>`) — the visible label
  - all `HTMLAttributes<HTMLSpanElement>`, including `className`, `title`, `role`,
    `aria-*` and event handlers; `className` is merged (consumer classes win)
  - `ref` forwards to the root `<span>`
  - exports: `Badge` (named + default), `BadgeProps`, `BadgeVariant`, `BadgeSize`
- **Composition:** no parts and no slots — a badge is one label. Consumers compose
  richer content (icon + text) before or after the badge rather than inside it.
- **Semantics:** a `<span>` with `data-km-badge`, `data-variant` and (when set) `data-dot`.
  It is inline-flex and non-interactive, so it inherits the semantics of its parent.
  No live-region behaviour is added: a badge that must be announced can set
  `role="status"` or an `aria-label` itself.
- **Meaning is not colour-only:** each status variant renders a **shape-distinct glyph**
  (circled "i", check, warning triangle, cross) before the visible text, so severity is
  still readable without colour perception or on a monochrome display. With `dot`, the
  marker becomes a colour-matched dot; the visible children text still carries the
  meaning, so callers must write a descriptive label ("Failed", not "") — the component
  cannot infer a word for an empty badge. `neutral` renders no marker unless `dot` is set.
- **Keyboard/focus:** not focusable and not a tab stop. If the badge is placed inside an
  interactive element, that parent owns focus; the badge adds no handlers of its own.
- **Visual states:** default (resting pill); `dot` (dot marker, `aria-hidden`); status
  variants (glyph + `text-status-*`). There is no hover, press or disabled state — a
  badge is not interactive, so any such state belongs to the enclosing control.
- **Customization:** `variant`, `size`, `dot`, `className`, and the semantic tokens the
  Tailwind bridge consumes (`bg-surface-subtle`, `border-border`, `text-foreground`,
  `text-status-*`, `rounded-full`, `text-xs`/`text-sm`). No component-scoped CSS variables
  are needed. Long labels wrap inside the pill (`min-w-0 break-words`) so CJK and long
  URLs do not overflow their container.
- **Dependencies:** `react` only. No Base UI, no `cva`, no motion (the badge is static).
- **Limits:** one label per badge; the glyph set is fixed to the four status variants;
  `neutral` has no glyph, so a neutral badge conveys nothing beyond its text; `dot` and
  the status glyph are mutually exclusive (the marker is one or the other, never both);
  the component does not choose label copy, so an empty or colour-only label remains the
  consumer's responsibility.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/badge.test.tsx`
  → **1 file, 10 tests passed**. Covers: root `<span>` + `data-km-badge`; default
  `neutral`/`md` with no marker and no live role; each status variant renders an
  `aria-hidden` shape glyph and `text-status-*` while keeping its text; `dot` renders an
  `aria-hidden` dot (`bg-muted-foreground` for neutral, `bg-status-*` for status) and
  suppresses the glyph; `sm`/`md` footprints; `className` merge and DOM prop forwarding;
  `ref` to the root span; `role`/`aria-label` forwarding; CJK + URL content. (Badge is
  non-interactive, so there is no keyboard behaviour to test.)
- [ ] **axe-core output and manual a11y checks recorded** — automated `axe.run` over a
  compound badge set (all variants, dot, named `role="status"`) reports 0 violations in
  this suite; manual screen-reader and real-browser checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/badge.stories.tsx` provides Default, Neutral, Info, Success, Warning, Danger,
  WithDot, Sizes, StatusVariants and `LongAndLocalizedText` (CJK + URL);
  `npm run build-storybook` → exit 0, all stories compile. Per-story visual inspection was
  not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density** —
  gallery-level browser review performed by the coordinator (see coordinator report);
  per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — glyph
  and dot are `shrink-0` and labels wrap, but per-component browser-level verification was
  **not run**; only the gallery-level pass applies (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no
  new dependency; React-only (MIT), no runtime work beyond render. Bundle impact was not
  separately measured.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits*; choosing
  meaningful label copy remains the caller's responsibility.

## Evidence (verified)

- `npx vitest run tests/badge.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 10 passed (10)`.
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

**Links to evidence:** `tests/badge.test.tsx`, `src/ui/badge.stories.tsx`,
`registry/ui/badge.tsx`, and the *Evidence (verified)* section above.
