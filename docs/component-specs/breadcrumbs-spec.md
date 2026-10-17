# Component: Breadcrumbs

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Every multi-level product needs to show where the current page sits in the
hierarchy, and each product re-invents the same trail with different markup — sometimes a
row of `div`s with no landmark, sometimes an `<ol>` without `aria-current`, sometimes an
interactive ellipsis that goes nowhere. One tokenized trail with real list semantics, a
labelled landmark and a documented collapse rule removes that duplication while leaving
the routes, labels and separators to the consumer. Alternatives considered: adapting a
menu primitive (rejected — a trail is static navigation, not a menu, and an interactive
ellipsis would need a full overflow menu we do not have) and making the ellipsis a
button (rejected — it would be a dead control without consumer-supplied hidden items).

**Source:** [`registry/ui/breadcrumbs.tsx`](../registry/ui/breadcrumbs.tsx) (canonical).
[`src/ui/breadcrumbs.tsx`](../src/ui/breadcrumbs.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use to show the path from the top of a hierarchy to the current page
  in a static, ordered trail. Do not use it as a primary navigation, a progress indicator,
  a tab set or a step wizard; do not use it for a trail of only one crumb (there is nothing
  to navigate back to), and do not rely on it to carry state that the page heading does not
  already state.
- **Public API:**
  - `items: Array<{ label: ReactNode; href?: string; onClick?: (event) => void; current?: boolean }>`
    — ordered from the highest ancestor to the current page.
    - `label` is visible content and doubles as the accessible name of the crumb.
    - `href` makes the crumb an `<a>`; without `href` the crumb is plain text.
    - `onClick` is attached to that link (use it for client-side routing with
      `event.preventDefault()`). It is ignored when `href` is omitted.
    - `current` marks the current page explicitly. When no item sets it, the last item is
      current. An explicit flag wins over the last-item default, so a trail never emits two
      `aria-current="page"` elements.
  - `separator?: ReactNode` — default `"/"`. Rendered in an `aria-hidden` span between
    crumbs; custom glyphs (chevrons, SVG) inherit the same presentational treatment.
  - `aria-label?: string` — default `"Breadcrumb"`. Name the landmark distinctly when a
    page contains more than one `<nav>`.
  - `maxItems?: number` — default `undefined` (no collapse). When `items.length` exceeds
    `maxItems`, the trail renders the **first**, the **last** and the **current** crumb,
    with decorative `…` markers standing in for the hidden runs. The current crumb is
    always kept (and always carries `aria-current="page"`), even when it is a middle item
    the collapsing would otherwise drop. Values below `2` disable collapsing (a trail
    cannot show fewer than first + last and still be a trail).
  - `className?: string` — merged onto the root `<nav>`, composed last so consumer classes
    win.
  - all `nav` props (`id`, `data-*`, event handlers, `style`, …); `ref` forwards to the
    `<nav>` element.
  - exports: `Breadcrumbs` (named + default), `BreadcrumbsProps`, `BreadcrumbItem`.
- **Composition:** a single component with a data-only `items` prop; there are no slots or
  compound parts. Custom separators are the only injected content, and they are always
  presentational. Consumers who need richer crumbs (icons, truncated labels, badges) put
  them in `label`.
- **Semantics:** `<nav aria-label>` → `<ol>` → `<li>`, so assistive technology hears a
  labelled landmark containing an ordered list of crumbs. The current crumb renders a
  `<span aria-current="page">` and is never a link, even when `href` is set. Links are real
  anchors. Separators are `aria-hidden` and add no tab stop; the collapse ellipsis is also
  `aria-hidden`, so collapsing never inserts a fake link or an unlabeled control into the
  landmark. State hooks: `data-km-breadcrumbs` on the root; `data-part` values `list`,
  `item`, `link`, `text`, `current`, `separator` and `ellipsis` on the parts; `data-current`
  on the current `<li>`; and `data-hidden-items` (the collapsed count) on the ellipsis
  `<li>`.
- **Keyboard/focus:** native anchor tab order, no roving focus and no key handling.
  Focus-visible paints the shared 2px `ring-ring` with a 2px offset (`ring-offset-canvas`);
  the current crumb is not focusable because it is not interactive.
- **Visual states:** link (muted foreground, hover → full foreground + underline,
  focus-visible ring), plain-text crumb without `href` (muted foreground, no hover
  affordance), current page (full foreground, medium weight, no underline or hover),
  separator and ellipsis (muted foreground, non-selectable). The list wraps
  (`flex-wrap` + `break-words` + `min-w-0`), so long and CJK labels grow the landmark
  instead of clipping it; there is no hover, loading or disabled state.
- **Customization:** `items`, `separator`, `aria-label`, `maxItems` and `className`, plus
  the semantic tokens the Tailwind bridge consumes: `text-foreground`,
  `text-muted-foreground`, `ring-ring` and `--km-duration-short` for the colour transition.
  Appearance, density and reduced motion are handled centrally; the transition is a colour
  fade, so reduced motion removes nothing meaningful.
- **Dependencies:** `react` only. No Base UI, no `class-variance-authority`, no new package.
- **Limits:** collapsing is display-only and irreversible — the `…` is decorative, not a
  button, so a screen-reader user hears the first and last crumb without being told that
  pages were skipped, and there is no way to expand the hidden middle in place. Use
  `maxItems` only when the full trail is also reachable elsewhere (e.g. the parent page
  lists its children). Collapsing always keeps exactly the first and last crumb; it cannot
  keep the immediate parent visible. There is no router integration (`href` +
  `onClick` is the seam), no JSON-LD/structured-data output, no automatic truncation of a
  single very long label (the consumer controls the label content and width), and no
  `aria-current` value other than `"page"` (e.g. `"step"` or `"location"` are out of scope).

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/breadcrumbs.test.tsx` → **1 file, 11 tests passed**. Covers:
  default and custom landmark label; `nav > ol > li` structure; `aria-current="page"` and
  non-link current crumb; explicit `current` flag; href vs plain-text crumbs and the link
  `onClick` payload; collapse to first + last with a decorative ellipsis and
  `data-hidden-items="6"`; no collapse when the trail fits; default and custom separators
  `aria-hidden`; `flex-wrap`/`break-words` for long and CJK labels; ref/`className`/nav prop
  forwarding. The trail has no keyboard behavior of its own — anchors use native tab order.
- [ ] **axe-core output and manual a11y checks recorded** — the same file runs axe on
  `document.body` with a long collapsed trail and a custom separator: 0 violations
  (verified). Manual browser/screen-reader checks were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** —
  `src/ui/breadcrumbs.stories.tsx` defines Default, CustomSeparator, LongTrail (collapse via
  `maxItems`), LongAndLocalizedText (CJK + long URL) and CurrentItemIsNotALink;
  `npm run build-storybook` → exit 0, all stories compile. Per-story visual inspection was
  not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — gallery-level browser review performed by the coordinator (see coordinator
  report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — verified
  only in jsdom (structure/class assertions) and the gallery-level pass; per-component
  visual review was **not run**.
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — only
  `react` (MIT), already required by every registry item; no dependency added. Formal
  license review and bundle measurement were not performed.
- [x] **Blockers resolved; known limitations named honestly** — see *Limits* above. The
  decorative, non-expandable ellipsis is the deliberate tradeoff.

## Evidence (verified)

- `npx vitest run tests/breadcrumbs.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 11 passed (11)`.
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

**Links to evidence:** `tests/breadcrumbs.test.tsx`, `src/ui/breadcrumbs.stories.tsx`,
`registry/ui/breadcrumbs.tsx`, and the *Evidence (verified)* section above.
