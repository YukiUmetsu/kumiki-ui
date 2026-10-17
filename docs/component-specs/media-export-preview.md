# Component: Export Preview

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** "Check before you ship" is one closed loop: the same `Artboard`/`LayerStack` render
the preview, the same `documentToSvg` string drives the small-format strip and the download, and
blocking diagnostics disable export. One component keeps inspection and deliverable from drifting;
re-implementing it per product loses the preview/export parity guarantee. Alternatives considered: a
separate raster thumbnailer (rejected — a second renderer can diverge) and deferring all QA to an
external tool (rejected — the warnings must be visible where the author works).

**Source:** [`registry/media/export-preview.tsx`](../../registry/media/export-preview.tsx) (canonical).
`src/media/export-preview.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** use to inspect and export one `MediaDocument` at its artboard size or a requested
  `outputSize`. Do not use it to edit the document; treat the document as immutable data. PNG export
  needs a real browser (see Limits).
- **Public API:**
  - `ExportPreviewProps` (extends `Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "title">`, `ref`
    forwarded to the root): `document: MediaDocument` (required); `scale?: number` default `1`;
    `outputSize?: Size`; `showBleed?`/`showCrop?`/`showSafeRegion?` default `true`; `inspectionSizes?:
    readonly number[]` default `[320, 160, 96]`; `availableFontFamilies?: readonly string[]` default
    `[]`; `resolveAssetHref?`; `fontCss?`; `onExport?: (payload: { profile: ExportProfile; size: Size;
    svg: string; blob?: Blob }) => boolean | void` (return `false` to cancel a download);
    `showActions?: boolean` default `true`; `titleAs?: "h1" | "h2" | "h3" | "div"` default `"h2"` — the
    element the title renders as, so an embedded preview can fit the host outline (pass `"h3"` under a
    page section that is already an `<h2>`, or `"div"` for a non-heading title); `scopedPreviewHeadings?:
    boolean` default `true` — expose the preview region as a single labelled image and neutralise the
    composition's own heading tags.
  - `useExportPreview(document, options?)` → `{ size, svg, diagnostics, blocking, canExport, exportPng,
    downloadSvg, downloadPng }`. The export scale is `scale × (outputSize.width / artboard.width)`.
  - exports `ExportPreview` (named + default), `ExportPreviewProps`, `useExportPreview`.
- **Composition:** `data-km-export="root"` containing `"header"` (title + `size`/aspect +
  `data-status="ready" | "warning" | "blocking"`), `"preview"` (a real `Artboard` at `fit="contain"`
  with the selected overlays around a `LayerStack`), a `"preview-scope"` wrapper (the outline
  boundary; see Semantics), `"inspection"` (the small-format strip), `"diagnostics"` (each item
  `data-severity="error" | "warning"`, plus an `"error"` line for a failed PNG), and optional
  `"actions"` with **Download SVG** / **Download PNG** buttons.
- **Semantics:** the title renders as `titleAs` (default `<h2>`) from `metadata.title` or the document
  id; the two sections are always `<h3>` (`Small-format check`, `Export issues`). With
  `scopedPreviewHeadings` (the default) the preview region is exposed as a single labelled image
  (`role="img"`, named `Preview of {title}`) and the composition's authored heading tags render as
  neutral elements, so a previewed composition cannot enter the host page's heading outline. The
  small-format strip is a list named "Small-format previews" of `<img>`s whose `alt` includes the
  target width; diagnostics are a list named "Export diagnostics". Status is conveyed as text
  (`Ready to export` / `N warning(s)` / `N blocking issue(s)`), not by colour alone. PNG failure is
  announced in an `aria-live="polite"` region.
- **Keyboard/focus:** the download controls are the project's own `Button` component, rendered as
  native `<button>`s (tab order preserved) with `focus-visible` rings; both are `disabled` when a
  blocking diagnostic exists so an invalid document cannot be exported. The PNG button shows a
  visible, announced pending state while an export is in flight: `Button`'s `isLoading` sets
  `disabled` + `aria-busy="true"`, swaps in an `aria-hidden` spinner and uses `loadingLabel`
  (`Exporting PNG…`) as the accessible name, and the visible label stays mounted so the control width
  does not jump. No custom key handling.
- **Visual states:** a ready/warning/blocking status chip whose label counts the diagnostics the
  component actually renders (the same `displayedDiagnostics` list shown below), so the chip and the
  list can never disagree; the inspection strip degrades to an "unavailable" notice (dimmed,
  `pointer-events-none`) rather than emptying when there are blocking issues. The small-format
  `<img>`s are byte-identical to the exported SVG (same `viewBox`). The strip cannot widen its
  container — the container and each row are `min-w-0`, items are capped by `min(100%, Npx)`, and each
  box is `overflow-hidden` with an explicit `aspect-ratio` — so the page never overflows even before
  measurement. When the strip forces a preview narrower than requested, the item label discloses it as
  `{N}px · shown at {n}px` instead of claiming a size it is not showing.
- **Customization:** preview scale, `outputSize`, overlay flags and `inspectionSizes` are all props;
  `resolveAssetHref`/`fontCss` are passed through to the exporter; `onExport` gates downloads;
  `className` merges onto the root.
- **Dependencies:** `react` only (plus local `./document`, `./artboard`, `./layer-stack`,
  `./svg-export`).
- **Limits:** PNG export requires a real browser (Blob, `URL.createObjectURL`, canvas/`toBlob`); in
  jsdom/Node the failure is surfaced as a visible `data-km-export="error"` line rather than thrown
  away. `useExportPreview` memoises on `document` identity, so nested mutation will re-run the export
  on every render — replace the document as a whole. The component adds one advisory the exporter
  cannot: when the caller's `outputSize` aspect disagrees with the artboard's beyond
  `OUTPUT_ASPECT_TOLERANCE` (`0.005`), only the width can be honoured, so a local
  `output-size-aspect-mismatch` warning is computed here. It is merged **only** into the list the
  component renders; `useExportPreview`'s returned `diagnostics` still mirror `preflightExport`
  exactly.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-export-preview.test.tsx` → passed. Covers rendering through the real
  `Artboard`/`LayerStack`, the byte-identical small-format strip, blocked downloads + degraded
  inspection for a document with blocking errors, clean-export reporting, the unpinned-font warning,
  object-URL release on SVG download, and the visible PNG failure line.
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for `ExportPreview` with `squarePromoDocument` (document/contrast
  rules disabled in jsdom). The `h1`-composition case is skipped because of the heading-order defect
  named above. A manual browser/screen-reader pass was **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/export-preview.stories.tsx` (CleanExport, UnpinnedFontWarning, BlockingErrors,
  EmptyDocument, WidenedInspection). `npm run build-storybook` **not run (owned by the integration
  step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. `svg`/`diagnostics` are memoised by value-stable inputs. Bundle impact was **not
  measured**.
- [x] **Blockers resolved; known limitations named honestly** — the PNG environment requirement and
  the heading-order defect (with its skipped test) are named above.

**Links to evidence:** `../../tests/media-export-preview.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/export-preview.stories.tsx`, `../../src/pages/media-compositions.tsx`,
`../../examples/media/wide-hero.json`.
