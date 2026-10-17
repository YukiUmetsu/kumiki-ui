# Component: Sidebar

**Status:** Verified
**Catalog phase:** v0.2
**Why shared:** Application shells repeat the same navigation rail in every product — a labelled
landmark, a scrollable item list, a current-page marker, a collapsed icon mode and disabled
destinations. Rebuilding it per product usually loses accessible names in collapsed mode or
couples the component to a router. One implementation owns the structure and state contract
while URLs, routing, branding, layout and responsive strategy stay with the consumer.

**Source:** [`registry/ui/sidebar.tsx`](../registry/ui/sidebar.tsx) (canonical).
[`src/ui/sidebar.tsx`](../src/ui/sidebar.tsx) re-exports it for the showcase.

## Contract

- **Use / not use:** use for persistent application navigation (a rail or sidebar of
  destinations) that may collapse to icons. Do not use it for in-page section links (use
  `Tabs` or plain anchors), for a table of contents, or as a modal mobile drawer — the
  component is a static `<nav>` landmark, not an overlay. Do not put routing, analytics or
  business logic inside it: it renders plain anchors and never navigates on its own.
- **Public API:**
  - `Sidebar` (root, `<nav>`): `collapsed?: boolean` (controlled), `defaultCollapsed?: boolean`
    (default `false`), `onCollapsedChange?: (collapsed: boolean) => void`, `aria-label?: string`
    (default `"Sidebar"`), `className?`, all native `<nav>` props, `ref` to the `<nav>`.
  - `Sidebar.Header`: native `<div>` props, `className?`, `ref`; top region for brand identity
    and the optional collapse control.
  - `Sidebar.Nav`: native `<ul>` props, `className?`, `ref`; the scrollable list that fills the
    rail between header and footer.
  - `Sidebar.Item`: `href?: string`, `active?: boolean` (default `false`), `icon?: ReactNode`,
    `disabled?: boolean` (default `false`), `children` (label or a consumer-rendered anchor),
    `className?`, all native `<a>` props, `ref` to the `<li>`.
  - `Sidebar.Group`: `label?: ReactNode`, native `<li>` props, `className?`, `ref`; a labelled
    section inside `Sidebar.Nav`.
  - `Sidebar.Footer`: native `<ul>` props, `className?`, `ref`; bottom region for account or
    secondary links. It is a list, so its children are `Sidebar.Item`/`Sidebar.Group` (or your
    own `<li>`), never a bare element.
  - `Sidebar.Toggle`: `collapseLabel?: string` (default `"Collapse sidebar"`),
    `expandLabel?: string` (default `"Expand sidebar"`), native `<button>` props, `className?`,
    `ref`. Optional; flips the rail through the root state contract.
  - Exports: `Sidebar` (compound, named + default), `SidebarHeader`, `SidebarNav`, `SidebarItem`,
    `SidebarGroup`, `SidebarFooter`, `SidebarToggle`, and the types `SidebarProps`,
    `SidebarHeaderProps`, `SidebarNavProps`, `SidebarItemProps`, `SidebarGroupProps`,
    `SidebarFooterProps`, `SidebarToggleProps`.
- **Composition:** compound parts (`Sidebar.Header`, `.Nav`, `.Item`, `.Group`, `.Footer`,
  `.Toggle`) or the named exports; `Object.assign` attaches them to the root. `Sidebar.Nav`
  is the `<ul>` and its direct children are `Sidebar.Item` or `Sidebar.Group` (which renders
  `<li>` → label + nested `<ul>`). `Sidebar.Footer` is a second `<ul>` for the pinned bottom
  region, so it also takes `Sidebar.Item`/`Sidebar.Group` (or your own `<li>`) as children.
  Consumers may pass their own anchor/router link as
  `Sidebar.Item`'s `children` when `href` is omitted; the element is cloned with the rail's
  layout classes and current/disabled hooks. Every part forwards `ref`, merges `className`
  with consumer classes last and passes arbitrary DOM props through.
- **Semantics:** the root is a labelled `<nav>` landmark. `Sidebar.Nav` is a real `<ul>` and
  every built-in item is `<li><a href>…</a></li>`. `active` sets `aria-current="page"`,
  `data-active` and a filled surface plus a leading marker — the current page is never
  signalled by colour alone. `disabled` drops `href`, sets `aria-disabled="true"` on the
  `role="link"` anchor, removes it from the tab order (`tabindex="-1"`) and suppresses
  activation. `Sidebar.Group` names its nested list through `aria-labelledby`. The collapse
  control is a native `<button>` whose accessible name flips between "Collapse sidebar" and
  "Expand sidebar"; its chevron is `aria-hidden`. State hooks: `data-km-sidebar` on every part,
  `data-collapsed` on the root and toggle, `data-active` / `data-disabled` on items.
- **Keyboard/focus:** items are native links, so Tab/Shift+Tab traverse them in DOM order and
  Enter activates them. No roving `tabindex`, no arrow-key navigation and no focus move on
  collapse — the current focus stays where it was, and collapsing does not remove any item
  from the tab order. Disabled items are skipped. `Sidebar.Toggle` is a normal button
  (Enter/Space). Every interactive part paints the shared 2px `focus-visible` ring against
  `--km-surface`.
- **Visual states:** default (transparent, muted text); hover (`bg-surface-subtle`,
  `text-foreground`); active (`bg-surface-subtle`, medium weight, `text-foreground`, 2px leading
  marker); `focus-visible` ring; disabled (muted text, not-allowed cursor, no hover fill);
  collapsed (icons centered, labels `sr-only`, rail narrows from `w-64` to `w-16` with a width
  transition); group label visible above its list and `sr-only` when collapsed. Motion uses
  `--km-duration-short` + `ease-continuity` and is disabled under reduced motion.
- **Customization:** semantic tokens only — `bg-surface`, `bg-surface-subtle`,
  `bg-surface-inset`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`,
  `rounded-control`, `h-[var(--km-control-height)]`, `--km-duration-short`, `ease-continuity`.
  `className` on the root styles the rail; it is appended after the built-in width, so a width
  utility competes with `w-64`/`w-16` in CSS source order — to set a different rail width per
  state, target `[data-km-sidebar="root"][data-collapsed]` instead of forcing a width class. On
  an item `className` composes after the built-in anchor layout (for a consumer-rendered anchor
  it composes before the consumer's own class, so the consumer wins); on
  header/footer/nav/group it is appended last. There is no mandatory global stylesheet,
  selector or provider.
- **Dependencies:** `react` only. No router, icon, motion or Base UI dependency — links are
  plain anchors and the chevron is an inline SVG.
- **Responsive:** the rail exposes `data-collapsed` and is CSS-driven only. A narrow layout
  should hide the rail (or a duplicate mobile nav) with a media/container query, or the
  consumer can drive `collapsed` from its own viewport hook. The component installs no window
  listeners and makes no viewport assumptions.
- **Limits:** no nested submenu/disclosure items yet — `Sidebar.Group` provides grouping only,
  so the catalog's "nested items" line is only partially covered and is documented as
  deferred; no mobile drawer/overlay fallback; `Sidebar.Group` must be a direct child of
  `Sidebar.Nav`; items need an `icon` to be meaningful in collapsed mode (an item without one
  renders an empty-looking but still named control); a consumer-rendered anchor does not get
  its label auto-hidden on collapse, so it must handle collapsed styling itself; no tooltip is
  built in for the icon-only rail (pair with `Tooltip` for sighted guidance); no persistence of
  the collapsed preference; no built-in routing, active-route detection or analytics; no
  roving keyboard model (intentionally native Tab order); width is a default (`w-64` / `w-16`)
  that consumers can override, not a token-driven rail width.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/sidebar.test.tsx` → **1 file, 14 tests passed**. Covers: labelled
  navigation landmark plus custom label; `aria-current="page"` only on the active item;
  uncontrolled collapse/expand with exact callback payloads (`true`, `false`) and width/state
  hooks; controlled state owned by the parent plus proof that a controlled rail ignores its own
  toggle until the parent updates; every accessible name preserved when collapsed (label moved
  to `sr-only`, toggle renamed); native Tab order including disabled-item skipping; group list
  named by `aria-labelledby` with correct nesting and collapsed label; root ref/`className`/DOM
  prop forwarding; item ref forwarding; disabled item (`aria-disabled`, no `href`,
  `tabindex="-1"`, no click handler); consumer-rendered anchor receiving `aria-current`/data
  hooks.
- [x] **axe-core output and manual a11y checks recorded** — the same run executes axe on
  `document.body` in the collapsed state (header, labelled group, active item, disabled item,
  footer): 0 violations with `color-contrast`, `region` and page-level rules disabled. DOM-level
  checks covered accessible names in collapsed mode, icon `aria-hidden`, disabled semantics
  and the absence of colour-only active state. Browser zoom, screen-reader speech and
  real-browser focus painting were **not run**.
- [x] **Storybook states complete, including realistic and CJK/long content** — stories exist
  (`Default`, `Collapsed`, `WithActiveItem`, `WithGroups`, `WithHeaderFooter`,
  `WithDisabledItem`, `Controlled`, `LongAndLocalizedText`); `npm run build-storybook` →
  exit 0, all stories compile. Per-story visual inspection was not run.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where
  applicable** — gallery-level browser review performed by the coordinator (see coordinator
  report); per-component captures were **not run**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — not
  verified per-component; truncation/CJK behaviour is asserted only through markup, and only
  the gallery-level browser pass applies (see coordinator report).
- [x] **Test registry install into fresh fixture passed** — `npm run registry:validate`
  → "OK — 32 item(s) valid"; `npm run registry:smoke` → "OK — 32 item(s), 33 file(s)";
  `npm run registry:fixture` → "OK — 32 item(s), 34 file(s) compiled in a temporary
  fixture (removed)".
- [x] **Dependencies/licenses reviewed; performance and bundle impact documented** — no new
  dependency; React only (MIT), no runtime package added. Bundle impact was not separately
  measured.
- [x] **Blockers resolved; known limitations named honestly** — known limitations are listed
  above; nested items, mobile fallback and per-component visual verification remain open but
  documented.

## Evidence (verified)

- `npx vitest run tests/sidebar.test.tsx` → `Test Files 1 passed (1)`,
  `Tests 14 passed (14)`.
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

**Links to evidence:** `tests/sidebar.test.tsx`, `src/ui/sidebar.stories.tsx`,
`registry/ui/sidebar.tsx`, and the *Evidence (verified)* section above.
