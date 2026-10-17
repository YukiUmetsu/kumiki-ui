# Component: Infographic View

**Status:** Implementing — the preview component is present; the installed-item evidence (tests,
stories, screenshots, clean-install smoke) is **pending**.
**Catalog phase:** docs/12 P0 (DOM adapter for the resolved layout); registry item
`infographic-view`.
**Why shared:** The system needs one preview that draws an already-resolved `InfographicLayout`
without re-solving it, so a consumer can inspect exactly what the engine laid out and trust that the
static export will match. Keeping the renderer thin — no layout, measurement or art direction — is
what stops the on-screen result and the exported file from diverging. Alternatives considered: render
from the semantic source inside the component (rejected — it would re-run layout on every render and
hide the frozen geometry the exporter uses) and expose per-section React components (rejected — it
would fork the IR into a second rendering model).

**Source:** [`registry/infographic/react.tsx`](../../registry/infographic/react.tsx); the
`infographic-view` slice. It imports `./measure`, `./primitives` and `./types` from the
`infographic-system` slice via `registryDependencies`. `src/infographic/react.tsx` re-exports it for
the showcase.

## Contract

- **Use / not use:** use to render a `InfographicLayout` produced by `buildInfographic` /
  `buildInfographicPages` as an accessible SVG preview. It is a thin renderer: it owns no layout,
  measurement or art direction, and it never refetches or re-resolves content. Do not pass a semantic
  `InfographicSource` (build a layout first), and do not expect it to resize by reflowing content —
  `fit` and `zoom` only scale the existing artboard.
- **Public API:** `InfographicView` (a `forwardRef<HTMLDivElement, InfographicViewProps>`, also the
  default export), `PrimitiveShape({ primitive })` (renders one IR primitive as SVG and is exported
  for reuse), and the types `InfographicFit = "none" | "contain" | "width"` and
  `InfographicViewProps`. Props: `layout: InfographicLayout` (required); `fit` (default `"contain"`);
  `zoom: number` (default `1`, applied on top of `fit`); `accessible` (default `true`, renders the
  title/description); `includeBackground` (default `true`, draws the artboard background rectangle);
  plus every other `HTMLAttributes<HTMLDivElement>` except `children` — so `className`, `style`,
  `data-*`, `aria-*`, event handlers and the forwarded `ref` are all supported.
- **Composition / boundary:** the outer element is a `<div data-km-infographic="view"
  data-km-infographic-fit={fit} data-km-infographic-zoom={zoom}>` whose class list merges
  `"relative w-full"` with `overflow-auto` when `fit="none"` and `overflow-hidden` otherwise, then the
  consumer's `className`. Inside it a single `<svg role="img">` carries
  `viewBox="0 0 {canvas.width} {canvas.height}"`, `preserveAspectRatio="xMidYMid meet"`,
  `data-km-infographic-template={layout.template}` and
  `data-km-infographic-art-direction={layout.artDirection}`. Every primitive is wrapped in
  `<g id={primitive.id} data-km-primitive={kind} data-km-role={role} data-km-semantic-id={semanticId}>`
  and drawn by `PrimitiveShape`, which switches on `kind` across `rect`, `ellipse`, `line`,
  `polyline`, `path` and `text` (unknown kinds render nothing). It is deliberately kept structurally
  parallel to `svg.ts` so preview and export draw the same geometry.
- **Sizing:** with `fit="none"` the `<svg>` gets fixed pixel `width`/`height`
  (`round(canvas.* × zoom)`) and the wrapper scrolls; with `"contain"`/`"width"` the `width`
  attribute is `"100%"`, the `height` attribute is omitted entirely (intrinsic-aspect sizing comes
  from `viewBox` plus the inline `height: auto`), and the inline style sets
  `width: round(zoom × 100)%`, `height: auto`. `preserveAspectRatio="xMidYMid meet"` keeps the
  artboard proportional at any container size.
- **Typography:** text primitives are emitted as `<text>` with one `<tspan>` per laid-out line at
  `round(primitive.y + baselineOffset(index, fontSize, lineHeight))`, `text-anchor` derived from
  `primitive.align`, `white-space: pre`, and font family/size/weight/style/letter-spacing from the
  primitive. Lines were wrapped during layout, so the preview never re-wraps.
- **Semantics / accessibility:** when `accessible` is true the `<svg>` is labelled by a generated
  `<title>` (from `layout.metadata?.title ?? layout.sourceId`) and `<desc>` (from `layout.summary`,
  used verbatim; the summary already carries the page marker for paginated profiles) via
  `aria-labelledby`. When `accessible` is false the `<svg>` is `aria-hidden="true"` and no
  title/desc is emitted. `includeBackground={false}` filters out the primitive whose
  `role === "infographic-background"` and paints `layout.canvas.background` on the `<svg>` instead,
  so the surface stays truthful about the full-size artboard.
- **Keyboard / focus:** the component is non-interactive (an image surface with no focusable
  children). The `ref` points at the wrapper `<div>` so a consumer can add `tabIndex` and focus it
  programmatically; it does not create a tab stop on its own.
- **Visual states:** none beyond `fit`/`zoom` — there is no hover, focus, disabled or loading state,
  and no animation (reduced-motion is therefore unaffected). Long or CJK content is handled by the
  layout engine, not here.
- **Customization:** `fit`, `zoom`, `accessible` and `includeBackground` cover presentation;
  `className`/`style` and all forwarded `<div>` props let a consumer theme the frame, and the
  `data-km-*` attributes on the wrapper, `<svg>` and each `<g>` give stable styling and test hooks.
  Colours come from the layout's art direction, not from the surrounding app cascade.
- **Dependencies:** `react` (the item declares no extra npm dependency) plus the sibling
  `infographic-system` modules (`./measure`, `./primitives`, `./types`) resolved through
  `registryDependencies`. Its default classes (`relative w-full overflow-*`) assume a Tailwind-style
  utility layer, consistent with the rest of the registry.
- **Limits:** the component takes a resolved layout, so changing content requires rebuilding the
  layout first. `fit="none"` scrolls but does not pan or zoom-to-cursor. Preview/export parity for
  dashed and dotted strokes is shared: both backends route through the single `strokeDashArray`
  helper in `primitives.ts` (dashed `3×/2×`, dotted `1×/2×`, width fallback `strokeWidth > 0 ?
  strokeWidth : 1`) and both emit `stroke-linecap`/`stroke-linejoin="round"` whenever a stroke width
  is present. Rendering the same `InfographicLayout` through `<InfographicView>` and through
  `layoutToSvg` therefore produces the same `stroke-dasharray`, `stroke-linecap` and
  `stroke-linejoin` for every primitive.

## Acceptance evidence

- [ ] **Behavior and keyboard tests executed; commands/results recorded** — **Acceptance
  evidence: pending.** No preview test file exists yet (`tests/infographic-view.*` is absent).
- [ ] **axe-core output and manual a11y checks recorded** — **not run.** The component emits
  `role="img"` with `<title>`/`<desc>` wiring, but this has not been verified with axe or a screen
  reader.
- [ ] **Storybook states complete, including realistic and CJK/long content** — **not run.** No
  `react.stories.tsx` exists for the preview.
- [ ] **Screenshots reviewed: light/dark, art-direction matrix, narrow/wide** — **not run.**
- [ ] **No accidental overlap, clipping, contrast or focus failures** — **not run.**
- [ ] **Test registry install into fresh fixture passed** — **not run**; the item was added to
  `registry.json` with `registryDependencies: ["infographic-system"]` and the
  `registry:validate`/`registry:smoke` checks pass, but `registry:fixture` has not been recorded as
  passing.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — imports are
  `react` plus sibling relative modules; no new package or licence surface. Bundle impact was
  **not measured**.
- [ ] **Blockers resolved; known limitations named honestly** — named above (layout required up
  front, no pan; the preview/export dash and linecap divergence is now resolved through the shared
  `strokeDashArray` helper).

**Links to evidence:** `../../registry/infographic/react.tsx` (implementation),
`../../registry/infographic/svg.ts` (the sibling exporter it parallels). Dedicated tests, stories,
screenshots and the isolated-consumer `tsc` result are **pending**.
