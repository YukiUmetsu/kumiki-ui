# Component: Button

**Status:** Verified (Phase 0)
**Catalog phase:** 0
**Why shared:** Nearly every interface needs a trigger for an action, and each product
re-invents loading, disabled, icon and focus behaviour inconsistently. A single button
with a bounded variant set removes that duplication while leaving palette, density,
copy and layout to the consumer. Alternatives considered: shipping a fully custom
`asChild`-style renderer (rejected for Phase 0 — no consumer need yet) and exposing
per-product variants (rejected in [docs/03](03-component-standards.md)).

**Source:** [`registry/ui/button.tsx`](../registry/ui/button.tsx) (canonical).
[`src/ui/button.tsx`](../src/ui/button.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for a single, labelled action. Do not use it as a link
  (use an anchor), as a navigation item, or as an icon-only control without an
  accessible name (`aria-label`) — the component cannot infer a name for an icon.
- **Public API:**
  - `variant?: "primary" | "secondary" | "subtle" | "destructive" | "outline"` — default `"primary"`
  - `size?: "sm" | "md" | "lg" | "icon"` — default `"md"`
  - `icon?: ReactNode` — leading icon, hidden while loading
  - `isLoading?: boolean` — default `false`
  - `loadingLabel?: string` — label shown while loading
  - `children?: ReactNode`
  - all `ButtonHTMLAttributes<HTMLButtonElement>` (`type` defaults to `"button"`)
  - `className` is merged (consumer classes win); `ref` forwards to the `<button>`
  - exports: `Button` (named + default) and `buttonVariants` for custom composition
- **Composition:** no slots beyond `children`/`icon`; any standard DOM attribute and
  event handler passes through. `buttonVariants({ variant, size, className })` is
  exported so a consumer can style a non-button element with the same treatment.
- **Semantics:** a real `<button>` element — Enter/Space activation, implicit form
  semantics and screen-reader "button" role come from the platform. While loading it
  sets `disabled`, `aria-busy="true"` and `data-loading=""`; the spinner is
  `aria-hidden="true"` and `focusable="false"` so it is never announced.
  `type` defaults to `"button"` so an accidental form submit cannot happen.
- **Keyboard/focus:** native tab order; `focus-visible` paints a 2px ring
  (`--km-focus-ring`) with a 2px offset against the canvas. Focus is never removed
  programmatically, and `isLoading` does not steal focus.
- **Visual states:** default; hover (opacity step on filled variants, `hover:bg-surface-subtle`
  on `outline`); `focus-visible`; `disabled` (`opacity-50` + `pointer-events-none`, so
  it is genuinely non-interactive); loading. The label stays mounted when `loadingLabel`
  is omitted, so the button width does not jump between states.
- **Customization:** variant/size, `className`, and the semantic tokens consumed by the
  Tailwind bridge (`bg-primary`, `text-primary-foreground`, `rounded-control`,
  `--km-control-height`, `--km-control-space-x`, `--km-control-font`, `--km-duration-short`).
  Density changes the `md`/`icon` height, the `md` horizontal padding and the `md` font
  size. Under `prefers-reduced-motion: reduce` the global stylesheet zeroes the
  transition and the spinner animation; the loading state stays visible (static spinner
  + `aria-busy`) rather than disappearing, so no information is lost.
- **Dependencies:** `class-variance-authority` (variant composition, declared in the
  registry item) and `react`. No other runtime dependency.
- **Limits:** no `asChild`/polymorphic rendering; no built-in tooltip or badge slot;
  an icon-only button must be named by the consumer; `isLoading` replaces the leading
  icon and cannot show both at once; `outline` is a fifth variant added for
  low-emphasis actions — the catalog text lists four, and this is the documented
  tradeoff; a `destructive` button is distinguished by colour **and** by its label, so
  copy must stay explicit ("Delete") rather than relying on the colour alone.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed** — `npx vitest run tests/button.test.tsx`
  → 11 tests pass. Covers: default render as a native `<button>` with `type="button"`;
  `type="submit"` inside a form; click + Enter + Space all fire `onClick`; `disabled`
  blocks `onClick`; loading sets `aria-busy="true"`, `disabled`, `data-loading=""` and
  renders `svg.animate-spin`; the original label stays mounted for stable width while
  `loadingLabel` becomes the accessible name; `icon` is hidden during loading; icon-only
  usage named via `aria-label`; variant/size classes applied and consumer `className`
  merged; `ref` resolves to the `<button>`; arbitrary DOM props forwarded.
- [x] **axe-core output and manual a11y checks recorded** — `npx playwright test`
  (chromium, real build) runs axe with the `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa`
  rule tags in light **and** dark appearance: 0 violations. Same run asserts every
  button's box is ≥24×24 CSS px and that Tab paints a visible focus indicator.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/button.stories.tsx` (Primary, Secondary, Subtle, Outline, Destructive,
  Loading, Disabled, Sizes, IconOnly); `npx storybook build` succeeds. The showcase in
  `src/main.tsx` covers loading with `loadingLabel`, disabled and icon-only inside a
  realistic page.
- [x] **Screenshots reviewed: light/dark, narrow/wide** —
  `tests/e2e/showcase.spec.ts` captures and compares committed baselines
  (`tests/e2e/showcase.spec.ts-snapshots/showcase-{light,dark}-1440-*.png`,
  `showcase-light-320-*.png`). Baselines are platform-suffixed (`-darwin`).
- [x] **No accidental overlap, clipping, contrast, focus or animation failures** — the
  e2e run asserts no horizontal document overflow at 320/375/768/1440, that the button
  boundary/text contrast is checked via axe, that focus is visible, and that
  reduced-motion reduces the spinner animation duration to <0.05s.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  (`3 item(s) valid`), `npm run registry:smoke` (`3 file(s) staged`) and
  `npm run registry:fixture` (`3 item(s), 4 file(s) compiled in a clean fixture`) all
  pass; the button item declares `class-variance-authority`.
- [x] **Dependencies/licenses reviewed** — `class-variance-authority` 0.7.1 (MIT),
  already required by the registry item; no dependency was added for this component.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above.

**Links to evidence:** `tests/button.test.tsx`, `tests/e2e/showcase.spec.ts`,
`src/ui/button.stories.tsx`, `registry.json` (item `button`).
