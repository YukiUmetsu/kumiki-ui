# Component: Artboard

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** Every media composition needs one authoritative design space — explicit dimensions,
background, safe region, bleed and crop — plus one zoom/pan/selection model so overlays and layers
stay aligned. Without it, each media component re-invents an origin and coordinates drift.
Alternatives considered: a full editor shell (rejected — authoring chrome must not become a
dependency of the primitives) and CSS-only sizing (rejected — the frame must carry exact
design-pixel geometry for measurement and export parity).

**Source:** [`registry/media/artboard.tsx`](../../registry/media/artboard.tsx) (canonical).
`src/media/artboard.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** use as the fixed-size authoring frame that owns design-space geometry and
  publishes it to `LayerStack`, `EditableText`, `MediaFrame` and `AlignmentGuides`. Do not use it to
  lay out ordinary page content: its viewport scrolls an oversized authoring frame, but it is not a
  general-purpose page scroll region. Authoring affordances (zoom/pan/fit/overlays) are never
  exported geometry.
- **Public API:**
  - `artboard: ArtboardSpec` — required design-space definition.
  - `zoom?: number` — authoring zoom, default `1`.
  - `pan?: MediaCanvasPoint` — authoring pan in CSS px, default `{ x: 0, y: 0 }`.
  - `fit?: "none" | "contain" | "actual"` — authoring display mode, default `"none"`. `"none"`
    renders at the raw `zoom` and ignores the container, so the frame may overflow the viewport;
    `"contain"` scales the frame down to fit the container's content box and never upscales the fit
    factor — `min(1, containerWidth / artboard.width, containerHeight / artboard.height) * zoom`;
    `"actual"` renders at true 1:1, ignoring both `zoom` and the container (the zoom shortcuts still
    report through `onZoomChange` but do not change the rendered scale).
  - `showSafeRegion?`, `showBleed?`, `showCrop?: boolean` — default `false`; draw the dashed/inset
    overlays.
  - `selectedIds?: readonly string[]` — default `[]`, shared through the canvas context.
  - `onSelect?: (id: string | null) => void`, `onZoomChange?: (zoom: number) => void`,
    `onPanChange?: (pan: MediaCanvasPoint) => void`.
  - `editing?: boolean` — default `false`; `guides?: readonly Guide[]` — default `[]`; `grid?:
    GridSpec`; `diagnostics?: readonly Diagnostic[]` — default `[]`; `renderLayer?: (layer: Layer) =>
    ReactNode`; `children?: ReactNode`.
  - extends `Omit<HTMLAttributes<HTMLDivElement>, "onSelect">`; `ref` forwards to the viewport
    `<div>`. exports `Artboard` (named + default), `ArtboardProps`, `ArtboardFit`, `useArtboardContext`.
- **Composition:** one viewport `<div>` (`data-km-artboard="viewport"`) that is a scroll container
  (`overflow-auto` with a `min-w-0` shrink floor and a `max-w-full` cap) containing a non-clipping
  scale wrapper (`m-auto shrink-0`, centring on both axes through auto margins rather than flex
  alignment, which collapse to zero under negative free space), the trim frame
  (`data-km-artboard="root"`, exact design-px size, background, `overflow: hidden`,
  `data-km-artboard-fit` and `data-km-artboard-dimensions`), the `MediaCanvasContext.Provider`, and
  optional `data-km-artboard="bleed" | "crop" | "safe-region"` overlays. `className` merges onto
  the viewport.
- **Semantics:** the viewport is a focusable `<div>` (`tabIndex={0}`) with a `ring-ring` focus-visible
  ring and no ARIA role. The trim frame carries `data-km-artboard-fit` (the resolved `fit` mode) and
  `data-km-artboard-dimensions` (`"{width}x{height}"`). Overlays are `aria-hidden="true"` authoring
  chrome and are stacked at `zIndex` `9999` so layers cannot paint over them.
- **Keyboard/focus:** while focused, `+`/`=` and `-`/`_` step the fixed zoom ladder
  (`0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4`) through `onZoomChange`; `0` resets zoom to `1` and pan to the
  origin; Arrow keys pan by `8` design px (`Shift` → `40`) times the effective scale. A consumer
  `onKeyDown` runs first and `event.defaultPrevented` short-circuits. Every shortcut is inert when
  its handler is absent, so a static artboard leaves the keys to the page.
- **Visual states:** default frame with `bg-canvas`; `focus-visible` ring on the viewport; optional
  dashed safe-region, outset bleed and inset crop outlines. `fit="contain"` measures the viewport's
  content box (its border box minus its own padding and border) in a layout effect and re-measures
  on `ResizeObserver`; the scrollbar gutter is deliberately **not** subtracted, because folding it
  in would make the measured box depend on the overflow the scale itself determines. The effective
  scale is clamped by `clampZoom` (`0.02`–`64`). No disabled/loading state.
- **Customization:** geometry is data-driven from `ArtboardSpec` (no hardcoded palette); the frame
  background is `artboard.background`; `className` lands on the viewport; the whole design space is
  re-published to descendants through `MediaCanvasContext`, and `useArtboardContext()` reads it
  (falling back to a standalone 1280×720 default).
- **Dependencies:** `react` only (plus the local `./media-context` and `./document` modules).
- **Limits:** zoom and pan are controlled — with no `onZoomChange`/`onPanChange` the shortcuts do
  nothing. `fit="contain"` depends on a measurable container: it measures once in a layout effect
  and then on `ResizeObserver`; jsdom supplies no `ResizeObserver` (tests install a no-op stub) and
  reports a zero-size box, so the fit factor clamps to the `clampZoom` floor unless a test mocks
  `getBoundingClientRect`. Because the viewport is the scroll container, its origin is coordinate
  zero and nothing scrolls to a negative offset: when the frame exactly fills or overflows the
  viewport, the leading (left/top) bleed pixels fall at negative coordinates and are clipped at the
  scroll origin. Those pixels are never hidden or removed, only clipped, and the artboard origin
  itself stays reachable in every case. `fit` and overlays affect only display, never the exported
  document. The overlays are `aria-hidden` by design and thus invisible to assistive technology.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-components.test.tsx` → passed; Artboard cases assert declared
  dimensions, overlay gating/stacking, ref forwarding, `fit="contain"` scale, and zoom/pan shortcuts
  (including "leaves the keys to the page" when no handlers are supplied).
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for `Artboard` with safe-region/bleed/crop and a `LayerStack`
  (document/contrast/region rules disabled in jsdom). A manual browser/screen-reader pass was
  **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/artboard.stories.tsx` (Default, WithOverlays, Contained, Vertical, ControlledZoomPan).
  `npm run build-storybook` **not run (owned by the integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**; jsdom cannot judge geometry.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. Bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — the controlled-handler and
  `ResizeObserver` limits are named above.

**Links to evidence:** `../../tests/media-components.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/artboard.stories.tsx`, `../../src/media/media-context.tsx`,
`../../src/pages/media-compositions.tsx`.
