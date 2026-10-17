# Component: Layer Stack

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** A composition needs one paint surface that draws the document's `z`-ordered layers
without regenerating ids, and one management panel to toggle visibility/lock and request reorder.
Product teams otherwise re-implement absolute positioning, group nesting, hidden-branch skipping and
a focusable reorder UI each time. Alternatives considered: a canvas renderer (rejected for M0 — DOM
keeps text editable and accessible) and a drag-only reorder handle (rejected — needs a keyboard path).

**Source:** [`registry/media/layer-stack.tsx`](../../registry/media/layer-stack.tsx) (canonical,
exports `LayerStack` and `LayerList`). `src/media/layer-stack.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** `LayerStack` is the paint surface; `LayerList` is the authoring panel. Use them
  over a document's `layers`. Do not mutate `layers`, `z` or ids inside either — both are controlled
  and report intent only. Do not use `LayerStack` for ordinary page layout.
- **Public API:**
  - `LayerStack`: `layers: readonly Layer[]` (required); `fonts?: Record<string, FontAsset>` default
    `{}`; `assets?: Record<string, ImageAsset>` default `{}`; `renderLayer?: (layer, context:
    LayerRenderContext) => ReactNode`; `excludeIds?: readonly string[]` default `[]`; `selectedIds?:
    readonly string[]` (default the surrounding canvas selection, `[]` standalone); `onSelect?: (id:
    string | null) => void` (default the canvas handler); `multiSelect?: boolean` default `false`;
    `onSelectionChange?: (ids: string[]) => void` (default `undefined`) — the full resulting
    selection reported after a layer/key/background activation while `multiSelect` is on and never
    called in single-select mode; `headingSemantics?: "authored" | "neutral"` default `"authored"`;
    `clipGroups?: boolean` default `true`. `LayerRenderContext` = `{ index, depth, editing, hidden,
    locked, fonts, assets }`.
  - `LayerList`: `layers: readonly Layer[]`; `selectedIds?: readonly string[]` default `[]`;
    `onSelect?`, `onVisibilityChange?: (id, visible) => void`, `onLockChange?: (id, locked) => void`,
    `onReorder?: (id, direction: "up" | "down" | "top" | "bottom") => void`; `interactive?: boolean`
    default `true`; `disabledIds?: readonly string[]` default `[]`.
  - both extend `Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onSelect">` and forward `ref`.
    exports `LayerStack`, `LayerList`, `LayerStackProps`, `LayerListProps`, `LayerRenderContext`.
- **Composition:** `LayerStack` root is `data-km-layer-stack="root"` (`pointer-events-none absolute
  inset-0`); each layer is an absolutely-positioned box carrying `data-km-layer="group" | "root"`,
  `data-layer-id/kind/visible/locked/selected/depth` and an inline `zIndex` equal to its resolved
  paint index. `renderLayer` replaces the built-in painter (text → `EditableText`, media →
  `MediaFrame`, shape → tokenized box or stretched SVG, group → its children). `LayerList` is
  `data-km-layer-list="root"` with `role="tree"`.
- **Semantics:** in `LayerStack`, a selectable (unlocked) layer becomes `role="group"` with
  `tabIndex={0}` and `aria-label={layerAccessibleName(layer)}` — deliberately **not** `role="button"`,
  because the subtree legitimately contains interactive and heading content (`contentEditable`,
  `<img>`, `<video>`, authored `h1`–`h3`) that a button role must not own — and carries no pressed
  state. Locked or unselectable layers get no role and are `pointer-events-none`. `LayerList` is a
  `role="tree"` (name defaults to "Layers") of `role="treeitem"` rows with `aria-level`,
  `aria-selected`, `aria-disabled`; each row control is a real `<button>` carrying
  `data-km-layer-control` and `tabIndex={-1}` (reached only from the focused row), with `aria-pressed`
  on the visibility/lock toggles and a name that includes the layer (e.g. `Hide "Headline"`,
  `Move "Headline" up`).
- **Keyboard/focus:** a selectable `LayerStack` layer selects on Enter/Space, honouring the same
  modifiers the browser reports on the key event. `LayerList` is a composite widget with a roving
  tabindex: exactly one operable, non-disabled, non-locked row is the tab stop (the active row) and
  every other row is `tabIndex={-1}`; before any interaction the first operable row takes the tab
  stop, and a row that stops being focusable hands it back to the first operable row. `ArrowDown`/
  `ArrowUp` move the active row and real DOM focus by one row and call `onSelect` for the newly
  focused row (so focus and the reported selection agree); `Home`/`End` jump to the first/last
  operable row; `ArrowRight` moves focus into the row's own controls and then steps right between
  them; `ArrowLeft` steps left and, on the first control, returns focus to the row; `Escape` returns
  focus to the row; `Enter`/`Space` select the focused row. Reorder shortcuts never move focus or the
  active row: `Alt+ArrowUp`/`Alt+ArrowDown` request one step and `Alt+Home`/`Alt+End` request
  `bottom`/`top`.
- **Visual states:** paint order is `visibleLayersInPaintOrder` (hidden layers and hidden branches are
  not rendered); `opacity`/`mix-blend-mode`/`rotation` (with `transform-origin` at the normalised
  anchor) are applied inline; a group with `clipGroups` gets `overflow: hidden`; selected rows use
  `data-[selected]:bg-surface-subtle` **and** a non-colour cue — an `aria-hidden` 2px inset bar
  (`data-km-layer-selected-indicator`) pinned to the inline-start edge, so selection never relies on
  colour alone. Row controls size to `size-[var(--km-control-height)]` so they follow the density
  scale. `LayerList` shows an honest empty state (`No layers yet. Add a layer to start composing.`)
  when `layers` is empty.
- **Customization:** colours/typography come from tokens via Tailwind classes; per-layer `className`
  is composed last; `renderLayer` is the full painter override. Selection is a controlled, documented
  contract through `selectedIds`/`onSelect`/`onSelectionChange`. `headingSemantics="neutral"` rewrites
  authored `h1`/`h2`/`h3` text tags to a neutral `div` **for the rendered preview only**: the remap
  builds a shallow copy of the `TextSpec` and never mutates `layer.text`, so the caller's document and
  the exporter keep the authored tag. That is what lets a host page embed a composition without
  polluting its own heading outline. Only the default text painter is affected, and only
  `h1`/`h2`/`h3`; a custom `renderLayer` receives the original layer unchanged.
- **Dependencies:** `react` only (plus local `./document`, `./media-context`, `./editable-text`,
  `./media-frame`).
- **Limits:** group clipping is **rectangular only** — `clipGroups` sets `overflow: hidden`, so
  non-rectangular clipping is explicitly out of scope. `LayerStack`'s root is `pointer-events-none`,
  so its background `onSelect(null)` fires only when the stack itself is the hit target; empty
  artboard space normally reaches the `Artboard`, which owns deselection there. `multiSelect` adds no
  selection *storage*: the component computes the resulting selection from `selectedIds` and reports
  it through `onSelectionChange` (plain click selects one, Ctrl/Cmd-click toggles, `Shift`-click
  selects the contiguous paint-order range from the last-clicked anchor, a background click clears),
  keeping only the anchor in a ref; `onSelect` still reports the clicked id (the range anchor on a
  `Shift` activation) and is ignored while `multiSelect` is `false`. `LayerList` stores no state and
  no order: it is controlled twice over. A documented deviation: `LayerListProps` omits `"onSelect"`
  (as well as `"onChange"`) because the DOM handler would clash with the layer-id callback (TS2430).

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-components.test.tsx` → passed. Covers z-order/paint, hidden-branch
  skipping, identity data attributes, click/background selection and locked-layer skipping,
  `excludeIds`, group nesting + clip, stretched SVG shapes, the `LayerList` tree with
  levels/selection/top-most-first, named visibility/lock toggles, `Alt+ArrowUp` reorder, `disabledIds`,
  and the empty state.
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for `LayerStack` + `LayerList` together (document/contrast rules
  disabled in jsdom). A manual browser/screen-reader pass was **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/layer-stack.stories.tsx` (PaintOrder, HiddenAndLocked, ExcludedLayers, CustomRenderLayer,
  EmptyDocument). CJK/RTL content is exercised through the fixtures elsewhere. `npm run build-storybook`
  **not run (owned by the integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**; jsdom cannot judge geometry.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. `fonts`/`assets`/`excludeIds`/`selectedIds` defaults use stable identities so memos
  are not invalidated. Bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — rectangular-only clipping, the
  pointer-events pass-through selection rule and the `multiSelect` no-op are named above.

**Links to evidence:** `../../tests/media-components.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/layer-stack.stories.tsx`, `../../src/pages/media-compositions.tsx`.
