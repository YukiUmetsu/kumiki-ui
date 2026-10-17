# Component: Media Document (slice)

**Status:** Implementing
**Catalog phase:** M0 (media foundation)
**Why shared:** Every media component needs one renderer-neutral record of a fixed-size still —
geometry, stable identity, typed typography, referenced assets and non-exporting guides — that the
preview and the exporter read from the same source. Without a single document contract, line
breaking, colour and paint order drift between what is inspected and what ships. Alternatives
considered: render directly from DOM (rejected — no round-trip, no deterministic export) and a
motion-era schema now (rejected — timing is deferred to docs/11 M2).

**Source:** [`registry/media/document.ts`](../../registry/media/document.ts),
[`registry/media/text-layout.ts`](../../registry/media/text-layout.ts),
[`registry/media/svg-export.ts`](../../registry/media/svg-export.ts); the `media-document` slice.
`src/media/*` re-exports them for the showcase.

## Contract

- **Use / not use:** use to author, validate, serialize and export a single still (`MediaDocument`).
  It is data and pure functions, not a React component. Do not store functions, DOM nodes, prompts
  or timers in the record, and do not use it for multi-frame timing (`fps`/scenes/clips) — those
  belong to docs/11 M2. A partially-valid document must never be rendered as if complete.
- **Public API:** types `MediaDocument`, `ArtboardSpec`, `Diagnostic`, `Layer` (union of
  `TextLayer`/`MediaLayer`/`ShapeLayer`/`GroupLayer`), `TextSpec`, `TextSpan`, `MediaSpec`,
  `ShapeSpec`, `FontAsset`, `ImageAsset`, `Guide`, `GridSpec`; enums `AspectPreset`, `TextFit`,
  `TextAlign`, `TextDirection`, `MediaFit`, `MediaMaskKind`, `ShapeKind`, `BlendMode`,
  `ExportProfile = "still-svg" | "still-png"`. Document functions: `createDocument`, `createArtboard`,
  `normalizeDocument`, `serializeDocument(document, space = 2)`, `stableStringify`,
  `parseDocument(input) → { document \| null, diagnostics }`, `documentHash` (FNV‑1a, 8 hex),
  `validateDocument`, `countBySeverity`, `hasBlockingDiagnostics`,
  `retargetArtboard(document, target, { strategy = "contain", anchor = "center", preserveAspect = true, reflow? })`,
  plus geometry/tree/snap helpers and `layerAccessibleName`/`layerKindLabel`. Layout:
  `layoutText(spec, box, fonts, measure)`, `measureTextWidth`, `fontString`, `fontFamilyChain`,
  `createCanvasMeasurer`, `segmentText`. Export:
  `documentToSvg(document, { profile = "still-svg", scale = 1, includeBackground = true, precision = 3, textMode = "text", attributes?, resolveAssetHref?, fontCss? }) → { svg, diagnostics, size }`,
  `preflightExport`,
  `documentToPng(document, { pixelRatio = 1, background = artboard.background, signal?, … })`,
  `EXPORT_PROFILES`. Constants: `MEDIA_SCHEMA_VERSION = 1`, `ASPECT_PRESETS`,
  `DEFAULT_SAFE_INSET_RATIO = 0.05`, `MIN_LAYER_SIZE = 0`, `MAX_LAYER_COUNT = 10000`.
- **Composition / boundary:** the record is plain JSON. A finding is
  `Diagnostic { code, severity: "error" | "warning", message, sceneId?, layerId?, frame?, capability?, fallback?, path? }`
  (mirrors docs/11 §4). `validateDocument` emits `schema-version-unsupported`, `id-invalid`,
  `number-not-finite`, `artboard-invalid-size`, `artboard-inset-invalid`, `layer-id-duplicate`,
  `enum-invalid`, `opacity-out-of-range`, `layer-parent-missing`, `text-spans-missing`,
  `text-font-missing`, `text-size-invalid`, `text-shrink-range-invalid`, `layer-size-invalid`,
  `layer-count-exceeded`, `layer-parent-cycle`, `guide-id-duplicate` (errors) and
  `text-summary-missing`, `media-alt-missing`, `group-empty`, `layer-overflow` (warnings).
  `parseDocument` adds `document-parse-failed` / `document-shape-invalid` and returns `document:
  null` when any error exists. `retargetArtboard` adds warning `retarget-crop`. Export adds
  `export-profile-unsupported`, `export-text-outline-unsupported`, `export-asset-missing` (errors)
  and `export-font-not-embedded`, `export-font-unavailable`, `export-asset-not-inlined`,
  `export-blend-unsupported` (warnings).
- **Semantics:** round-trip guarantee — `serializeDocument(normalizeDocument(doc))` is byte-stable
  and `parseDocument` re-validates it. **Guides never export:** `documentToSvg` builds from document
  layers, so guides/grid/safe-region/bleed/crop never appear. **Scale must not change layout:**
  `scale` multiplies only the root `width`/`height`; the `viewBox` and every coordinate stay in
  design px. **No implicit network fetch:** an asset is emitted as an `href` reference and never
  fetched; `resolveAssetHref` is the only inlining hook. **`attributes` are hardened in
  `svg-export.ts`:** a caller-supplied name must match a conservative XML attribute-name pattern
  (`/^[A-Za-z_][A-Za-z0-9_.:-]*$/`) or it is dropped rather than emitted (never thrown), and the
  exporter-owned `xmlns`, `width`, `height` and `viewBox` can never be overridden, so a stray entry
  cannot break the document's geometry or namespaces.
- **Keyboard/focus:** not applicable — a data module with no interactive surface.
- **Visual states:** not applicable — state lives in the components that render the document.
- **Customization:** colours are literal CSS strings (`ArtboardSpec.background`, `ShapeSpec.fill`/
  `stroke`, `TextSpan.color`), so a document serialises and renders outside the app cascade;
  `retargetArtboard`'s `reflow` callback is the authoring-time escape hatch, and
  `AspectPreset`/`safeRegion`/`bleed`/`crop` are inputs.
- **Dependencies:** no external runtime dependency. `text-layout` imports `./document`;
  `svg-export` imports `./document` and `./text-layout`.
- **Limits:** `LayerTransform` deliberately omits docs/11's `scaleX`/`scaleY` (uniform scaling
  happens at authoring time, never by stretching one aspect into another). PNG export requires a
  real browser (Blob, `URL.createObjectURL`, `HTMLCanvasElement`, `Image`, 2D context, `toBlob`);
  jsdom/Node reject with a clear message. Without a canvas 2D context, `createCanvasMeasurer`
  reports `0` and `svg-export` falls back to a coarse `estimateAdvance` (0.55 × size × length), and
  letter spacing is approximated as `letterSpacing × (length − 1)` over UTF‑16 units, not graphemes.
  `export-font-unavailable` fires only when the caller passes `availableFontFamilies` to
  `preflightExport`. The rotation anchor defaults to the layer's top-left: `documentToSvg`'s
  `layerTransformString` emits `rotate(a cx cy)` with `cx = width * (anchorX ?? 0)` and
  `cy = height * (anchorY ?? 0)` in the layer's own translated frame. Three places resolve that same
  pivot and must stay in sync — `document.ts`'s `rotatedBounds`/`layerBounds` (default `0`),
  `layer-stack.tsx`'s DOM `transform-origin` (defaults to `0% 0%`), and the exporter's emitted
  `rotate()` centre. Changing one without the others silently breaks preview/export parity.

## Acceptance evidence

- [x] **Behavior and keyboard tests executed; commands/results recorded** —
  `npx vitest run tests/media-core.test.ts tests/media-svg-export.test.ts tests/media-fixtures.test.ts tests/media-text-layout.test.ts`
  → 4 files, 43 tests passed (construction, negative fixtures, byte round-trip, hashing, tolerant
  parsing, order/tree, overflow, retarget, guides-never-export, text-stays-textual,
  determinism/scale, export diagnostics, fixture JSON baselines).
- [ ] **axe-core output and manual a11y checks recorded** — this slice is data-only, so axe does not
  apply; `layerAccessibleName` is covered indirectly by the component axe runs
  (`tests/media-a11y.test.tsx`). Manual screen-reader checks were **not run**.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  `src/media/document.stories.tsx` has Serialized, RoundTrip, ValidationReport; CJK/emoji/RTL
  fixtures live in `src/media/fixtures.ts` and are exercised elsewhere. `npm run build-storybook`
  **not run (owned by the integration step)**.
- [ ] **Screenshots reviewed: light/dark, theme-a/theme-b, narrow/wide, density where applicable** —
  **not run (owned by the integration step)**.
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run
  (owned by the integration step)**.
- [ ] **Test registry install into fresh fixture passed** — **not run (owned by the integration
  step)**.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — the three
  modules import no external package (relative imports only). Bundle impact was **not measured**.
- [x] **Blockers resolved; known limitations named honestly** — no blocking issue found in the
  checks run; the rotation-anchor defect and the environment/measurement limits are named above.

**Links to evidence:** `../../tests/media-core.test.ts`, `../../tests/media-svg-export.test.ts`,
`../../tests/media-fixtures.test.ts`, `../../tests/media-text-layout.test.ts`,
`../../src/media/document.stories.tsx`, `../../src/pages/media-compositions.tsx`,
`../../examples/media/wide-hero.json`, `../../examples/media/multilingual.json`.
