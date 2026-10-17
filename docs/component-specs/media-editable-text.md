# Component: Editable Text

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** Compositions need rich text that stays text: measured, wrapping, styled per run, and
editable without rasterising. One component that shares the same layout engine as the SVG exporter
keeps the preview and the export from drifting, and keeps headings as headings for assistive
technology. Alternatives considered: a full rich-text editor framework (rejected — heavy and
DOM-coupled) and letting CSS wrap alone (rejected — the exporter cannot reproduce browser wrapping
deterministically).

**Source:** [`registry/media/editable-text.tsx`](../../registry/media/editable-text.tsx) (canonical).
`src/media/editable-text.tsx` re-exports it for the showcase.

## Contract

- **Use / not use:** use to render (and optionally edit) a `TextSpec` inside a design-px box. Do not
  use it to size a layer — the caller (`LayerStack`) owns the box. Do not expect it to reconstruct
  rich inline structure from a live edit (see Limits).
- **Public API:**
  - `text: TextSpec` — required: spans, font, size, alignment, direction and fit policy.
  - `fonts: Record<string, FontAsset>` — required font registry keyed by `FontAsset.id`.
  - `box?: Size` — design-space layout box; defaults to the enclosing canvas artboard size, and to
    `{ width: text.size * 20, height: text.size * 4 }` when neither is usable.
  - `editable?: boolean` — default `false`; in-place editing via a single `contentEditable` block.
  - `placeholder?: string` — shown only when `editable` and the plain text is empty.
  - `onChange?: (next: TextSpec) => void` — controlled; called with the next spec on an accepted edit.
  - `onLayoutChange?: (result: TextLayoutResult) => void` — reports
    size/lineCount/overflow/truncated/fallback by value signature.
  - `measure?: MeasureText` — default `createCanvasMeasurer(fonts)`.
  - `showDiagnostics?: boolean` — default `true`; surfaces missing-font/overflow/truncated captions.
  - extends `Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange">`; `ref` forwards to the
    root `<div>`. exports `EditableText` (named + default), `EditableTextProps`.
- **Composition:** root `data-km-text="root"` with `data-km-text-fit`, `data-km-text-overflow`,
  `data-km-text-truncated`, `data-km-text-font-missing` and `data-km-text-diagnostic` (space-joined
  diagnostic tokens, present only once an edit has collapsed spans — see Limits). Read-only:
  `data-km-text="content"` holds one `data-km-text="line"` block (tag = `text.as`) per laid-out line,
  each with one `<span>` per run. Editable: `data-km-text="editor"` (the `contentEditable` block)
  with a `data-km-text="placeholder"` overlay. Caption diagnostics render in a
  `data-km-text-diagnostics` region (a `useId`-derived id) only while at least one diagnostic exists.
- **Semantics:** the read-only line tag is `text.as` (`h1`/`h2`/`h3`/`p`/`span`/`div`), so headings
  stay headings. The editable block is `role="textbox"` with `aria-multiline="true"`, `dir`/`lang`
  from the spec, `spellCheck`, and the caller's `aria-label`; it also carries `aria-placeholder` when
  a placeholder is supplied (the visible placeholder is decorative and `aria-hidden="true"`) and
  `aria-describedby` pointing at the diagnostics region **only while at least one diagnostic renders**
  (so the reference is never dangling). Diagnostic captions
  (`data-km-text-diagnostic="overflow" | "truncated" | "font-missing"`) render **outside** the
  clipped content so a clip can never swallow the message. A non-editable root with an `aria-label`
  gains `role="group"` (deliberately not `role="region"`, to avoid landmark spam).
- **Keyboard/focus:** editing is native — the browser owns the caret, selection, tab stop and IME.
  `onInput` ignores events while composing (`InputEvent.isComposing`), so a controlled re-render never
  interrupts a candidate window, and it reports nothing for an unchanged value.
- **Visual states:** `fit: "clip"` sets `overflow: hidden` on the content; `wrap`/`none` never clip
  and instead expose `data-km-text-overflow` and a caption. `focus-visible` on the editable block
  paints a `ring-ring` ring. The root has a tokenised colour transition with a `motion-reduce`
  fallback.
- **Customization:** colours/decoration come from spans (`color`, `underline`) and the resolved
  `FontAsset`; `className` merges last; `measure` lets a consumer inject a deterministic measurer
  shared with the export.
- **Dependencies:** `react` only (plus local `./document`, `./text-layout`, `./media-context`).
- **Limits:** the editable write-back is a single-`contentEditable` simplification — `handleInput`
  cannot reconstruct runs from `textContent`, so a multi-span spec collapses into the **first span**
  (which keeps its styling and owns the whole edited string) and the remaining spans are **dropped**,
  not blanked, so no dead empty spans are emitted. The root `data-km-text-diagnostic` attribute gains
  a `spans-collapsed` token (space-joined with any other root tokens) once an accepted edit has
  flattened a multi-span spec, so the loss is machine-readable; an unedited render gains nothing. A
  fully-cleared edit still leaves one empty span so typing can continue (a zero-span spec is never
  emitted). While `editable`, wrapping is browser-driven, so the deterministic per-line layout applies
  only to read-only display; the editor's wrapping may differ from the exporter's. With no `box` and a
  malformed canvas context the box falls back to a size estimate derived from `text.size`.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-components.test.tsx` → passed. Covers per-line blocks with exact text,
  clip + truncation flag, overflow-without-clip, `text.as` element selection, missing-font flag,
  controlled edit (accepted once, no-op ignored), typed text retained while editable, and
  `onLayoutChange`.
- [ ] **axe-core output and manual a11y checks recorded** — `npx vitest run tests/media-a11y.test.tsx`
  → passed; axe reports no violations for read-only and editable modes (contrast/document rules
  disabled in jsdom). A manual real-browser/IME/screen-reader pass was **not run**; the IME path is
  asserted only through the `onInput` guard.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/editable-text.stories.tsx` (FitPolicies, per-policy, MultiSpan, Editable, MissingFont,
  LongAndLocalizedText with Japanese/RTL/emoji/URL). `npm run build-storybook` **not run (owned by the
  integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**; jsdom cannot judge geometry.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — `react` only; no
  new dependency. `measure`/`fonts` are memoised so layout is not recomputed per render. Bundle impact
  was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — the single-`contentEditable`
  write-back and the editable-vs-export wrapping split are named above.

**Links to evidence:** `../../tests/media-components.test.tsx`, `../../tests/media-a11y.test.tsx`,
`../../src/media/editable-text.stories.tsx`, `../../tests/media-text-layout.test.ts`,
`../../src/pages/media-compositions.tsx`.
