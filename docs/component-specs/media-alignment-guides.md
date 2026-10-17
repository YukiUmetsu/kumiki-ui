# Component: Alignment Guides

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** Authoring needs snapping, grids, safe-region/centre axes, measurement rulers and live
snap indicators — all of which must never leak into an export. One non-exporting overlay keeps them
aligned to the shared design space and out of the accessibility tree, instead of each editor bolting
its own guides onto the artwork. Alternatives considered: drawing guides as layers in the document
(rejected — they would export) and DOM guides at real scale (rejected — thousands of grid lines would
balloon the tree).

**Source:** [`registry/media/alignment-guides.tsx`](../../registry/media/alignment-guides.tsx)
(canonical). `src/media/alignment-guides.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** use as authoring chrome above an `Artboard`/`LayerStack`; it reads design px from
  the surrounding canvas. Do not use it to convey information to end users (it is `aria-hidden`) and
  never treat it as part of the exported artwork.
- **Public API:**
  - `AlignmentGuidesProps` (extends `HTMLAttributes<HTMLDivElement>`, `ref` forwarded to the root):
    `visible?: boolean` default `true`; `showGuides?` default `true`; `showGrid?` default `true`;
    `showSafeRegion?` default `false`; `showCenterAxes?` default `false`; `showMeasurements?` default
    `true`; `guides?: readonly Guide[]`; `grid?: GridSpec`; `measurements?: readonly MeasurementTarget[]`
    default `[]`; `activeSnaps?: readonly SnapHit[]` default `[]`; `minimumScale?: number` default `0.5`.
  - `MeasurementTarget = { id: string; rect: Rect; label?: string }`.
  - `useAlignmentGuides(layers, options?: SnapOptions)` →
    `{ targets: SnapTarget[]; snap: (rect: Rect) => SnapResult }`, memoised on canvas artboard/guides
    and the caller's `layers`/`options` identity.
  - `ALIGNMENT_GUIDES_EXPORTABLE: false` — the export contract asserted in code.
- **Composition:** one `data-km-guides="root"` overlay rendering, under their flags:
  `data-km-guides="grid"` (two `repeating-linear-gradient`s per axis — no per-line DOM), `"safe-region"`,
  `"guide"` (with `data-km-guide-id`/`data-km-guide-axis`), `"center-axis"` + `"center-axis-label"`
  ("50%"), `"measurement"` + `"measurement-ruler"` + `"measurement-label"`, and `"snap"`
  (`data-km-snap-axis`/`data-km-snap-kind`).
- **Semantics:** the whole overlay is `aria-hidden="true"` and `pointer-events-none`; it is never
  focusable and never announced. The root carries `data-km-guides-exportable="false"`.
- **Keyboard/focus:** no tab stop and no key handling — it is pure chrome; snapping is driven by the
  caller's pointer-drag session through `useAlignmentGuides().snap`.
- **Visual states:** renders `null` when `visible` is false or the canvas `scale` is below
  `minimumScale`; hairlines and tick marks are sized to a constant CSS thickness at any zoom. Grid
  lines use `--km-border-strong`/`--km-border-subtle`; snap indicators use `border-status-info`.
  Guide/measurement label chips are clamped inside the artboard so the frame's `overflow: hidden`
  never clips them.
- **Customization:** every overlay kind is an opt-in flag; `guides`/`grid`/`measurements`/`activeSnaps`
  are caller data; `minimumScale` tunes when the overlay is suppressed; `className` merges onto the root.
- **Dependencies:** `react` only (plus local `./document`, `./media-context`).
- **Limits:** the surrounding canvas is authoritative — canvas `guides` win over the `guides` prop, and
  the canvas `grid` is used when no `grid` prop is given. Label-chip width is a conservative estimate
  (`length × 7 + 12` CSS px) so a long Arabic/CJK label could still be a few pixels off before
  clamping. The overlay renders nothing at all below `minimumScale`, so a sub-pixel grid becomes
  invisible rather than noisy.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-components.test.tsx` → passed. Covers the non-exporting contract,
  suppression when hidden/below `minimumScale`, one line per guide with its id,
  safe-region/centre-axis/measurement/snap gating by flag, and `useAlignmentGuides` producing targets
  and snapping a near miss onto a real layer edge.
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for the overlay with guides/measurements/snaps (document/contrast
  rules disabled in jsdom). A manual browser/screen-reader pass was **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/alignment-guides.stories.tsx` (Overlays, Hidden, BelowMinimumScale). `npm run
  build-storybook` **not run (owned by the integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**; jsdom cannot judge geometry.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. The grid is encoded analytically (no per-line nodes) and `snapTargets` is memoised.
  Bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — the canvas-precedence and
  label-width-estimate limits are named above.

**Links to evidence:** `../../tests/media-components.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/alignment-guides.stories.tsx`, `../../src/pages/media-compositions.tsx`.
