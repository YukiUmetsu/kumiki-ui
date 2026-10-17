# Component: Infographic System (slice)

**Status:** Implementing — the P0 data path and static export are present; the installed-item
evidence (dedicated tests, stories, screenshots, clean-install smoke) is **pending**.
**Catalog phase:** docs/12 P0 slices I0–I4; registry item `infographic-system`.
**Why shared:** Every infographic surface needs one validated, versioned semantic record
(`InfographicSource`) that is resolved once into a renderer-neutral primitive tree
(`InfographicLayout`) which the DOM preview and the static exporter both read. Without that single
contract the same facts would be laid out twice — once on screen, once in the export — and the two
would drift in line breaks, labels and paint order. Alternatives considered: render directly from
the DOM (rejected — no renderer-neutral layout to diff, no deterministic round-trip) and a separate
chart engine per recipe (rejected — docs/12 §C requires one shared chart grammar).

**Source:** [`registry/infographic/types.ts`](../../registry/infographic/types.ts),
[`registry/infographic/validate.ts`](../../registry/infographic/validate.ts),
[`registry/infographic/measure.ts`](../../registry/infographic/measure.ts),
[`registry/infographic/primitives.ts`](../../registry/infographic/primitives.ts),
[`registry/infographic/art-direction.ts`](../../registry/infographic/art-direction.ts),
[`registry/infographic/grids.ts`](../../registry/infographic/grids.ts),
[`registry/infographic/requirements.ts`](../../registry/infographic/requirements.ts),
[`registry/infographic/blocks.ts`](../../registry/infographic/blocks.ts),
[`registry/infographic/visualizers.ts`](../../registry/infographic/visualizers.ts),
[`registry/infographic/chart.ts`](../../registry/infographic/chart.ts),
[`registry/infographic/annotations.ts`](../../registry/infographic/annotations.ts),
[`registry/infographic/templates.ts`](../../registry/infographic/templates.ts),
[`registry/infographic/layout.ts`](../../registry/infographic/layout.ts),
[`registry/infographic/svg.ts`](../../registry/infographic/svg.ts); the `infographic-system`
slice. `src/infographic/*` re-exports them for the showcase.

## Contract

- **Use / not use:** use to author, validate, measure, plan and render one infographic panel — or a
  paginated carousel — from semantic content, then export it deterministically to SVG (and, in a
  browser, PNG). It is data and pure functions; only the separate `infographic-view` item
  (`react.tsx`) touches the DOM. Do not store pixel positions, callbacks, DOM nodes or timers in the
  source; do not fetch assets or fonts; do not treat it as a charting framework, an editor or a
  motion system (timing belongs to docs/11 M2). A source that does not validate must not be rendered
  as if complete.
- **Public API (grouped by module):**
  - **`types.ts`** — the source contract `InfographicSource` (`kind: "infographic-source"`,
    `version: 1`, `id`, `title`, `subtitle?`, `thesis?`, `language`, `sections`, `evidence`,
    `annotations?`, `charts?`, `diagrams?`, `assetRefs?`, `metadata?`); the discriminated section
    union `InfographicSection` (`TextSection`, `StatisticSection`, `ProcessSection`,
    `ComparisonSection`, `TimelineSection`, `HierarchySection`, `ChartSection`, `DiagramSection`,
    `QuoteSection`) and `SectionKind`; supporting shapes `InfographicEvidence`, `SectionBase`,
    `Importance`, `ProcessStep`/`ProcessStepMode`, `ComparisonCase`/`ComparisonValue`,
    `TimelineMilestone`/`TimelineScale`, `HierarchyNode`,
    `ChartSpec`/`ChartRecipe`/`ChartScale`/`ChartSeries`/`ChartValue`/`MissingPolicy`,
    `DiagramSpec`/`DiagramNode`/`DiagramEdge`, `QuoteSectionData`, `AnnotationSpec`. The IR
    `InfographicLayout`, `InfographicCanvasSpec`, `InfographicPrimitive`
    (`RectPrimitive`, `EllipsePrimitive`, `LinePrimitive`, `PolylinePrimitive`, `PathPrimitive`,
    `TextPrimitive`), `PrimitiveKind`, `RectInfo`, `MarkerKind`, `DashPattern`, `TextAlign`. Tokens
    and profiles `ArtDirectionId`, `ResolvedStyle`, `OutputProfile`/`OutputProfileId`, `TemplateId`.
    Renderer contract `InfographicDiagnostic`, `SectionFrame`, `RenderResult`, `SectionRenderContext`,
    `SectionRenderer`.
  - **`validate.ts`** — `SECTION_KINDS`, `SOURCE_TEMPLATES`, `validateSource(input) → ValidationResult`,
    `assertSource(input)`, `canonicalJson`, `sourceDigest`.
  - **`measure.ts`** — `measureText`, `wrapText`, `lineMetrics`, `baselineOffset`, `blockHeight`,
    `formatNumber`, `formatPercent`, `formatSigned`, `formatMilestoneLabel`, `hasTemporalScale`,
    `milestoneSortKey`; types `TextStyleRef`, `WrapOptions`, `WrapResult`, `NumberFormatOptions`,
    `TextLineMetrics`.
  - **`primitives.ts`** — primitive factories (`rectPrimitive`, `ellipsePrimitive`, `linePrimitive`,
    `polylinePrimitive`, `pathPrimitive`, `rulePrimitive`, `accentBar`, `connectorPrimitives`,
    `routePoints`), geometry (`round`, `clamp`, `insetRect`, `clampRect`, `splitRows`, `splitColumns`,
    `rows`, `columns`, `gridCells`, `rectCenter`/`rectRight`/`rectBottom`, `rectsOverlap`,
    `overlapArea`, `mapRange`, `lerp`, `niceStep`, `overflowOf`), text (`layoutText`,
    `layoutTextForRole`, `typeStyle`, `lineHeightForRole`, `textBaseline`, `textLineWidth`,
    `headingBlock`, `labelCase`, `evidenceNote`) and surfaces/ids (`surfacePrimitives`,
    `chipPrimitives`, `createIdFactory`).
  - **`art-direction.ts`** — `ART_DIRECTIONS`, `ART_DIRECTION_IDS`, `getArtDirection`, `resolveStyle`,
    `DeepPartial`, `LAYOUT_VERSION` (`"infographic-1.0.0"`); `OUTPUT_PROFILES`, `OUTPUT_PROFILE_IDS`,
    `getOutputProfile`, `safeInset`.
  - **`grids.ts`** — `editorialGrid`, `bentoGrid`, `bentoCellRects`, `bentoOverlap`, `bentoRowHeight`,
    `editorialCellCount`, `snapToBaseline`, `baselineTops`; specs `EditorialGridSpec`/
    `EditorialGridResult`/`EditorialGridCell`/`EditorialFocal`, `BentoGridSpec`/`BentoGridResult`/
    `BentoTile`/`BentoTilePlacement`/`BentoSpan`.
  - **`requirements.ts`** — `estimateSectionHeight(section, width, style)`,
    `sectionChromeHeight(style, { heading, evidence })`, `allocateBands(rect, requirements, gap)`;
    `SectionRequirement` (`minHeight`, `preferredHeight`).
  - **`blocks.ts`** — `BLOCK_RENDERERS`, `BLOCK_SECTION_KINDS`, `renderTextSection`,
    `renderStatisticSection`, `renderComparisonSection`, `renderQuoteSection`, `metricCardBlock`,
    `metricStackBlock`, `chipRowBlock`, `insightCalloutBlock`, `numberedStepBlock`, `sectionChrome`,
    `isPercentLikeUnit`; types `InsightCalloutSpec`, `MetricCardSpec`, `NumberedStepSpec`,
    `StepState`.
  - **`visualizers.ts`** — `VISUALIZER_RENDERERS`, `VISUALIZER_SECTION_KINDS`, `renderProcessSection`,
    `renderTimelineSection`, `renderHierarchySection`, `renderDiagramSection`, `processFlowBlock`,
    `timelineBlock`, `timelinePolicy`, `hierarchyBlock`, `hierarchyLayout`, `diagramBlock`,
    `diagramLayers`, `edgePorts`.
  - **`chart.ts`** — `CHART_RECIPES`, `CHART_RENDERER`, `renderChart`, `renderChartSection`,
    `chartDomain`, `chartTicks`, `chartValueExtent`, `chartSummary`, `resolveSeriesValues`,
    `domainTransform`, `isUsableDomain`, `mixHex`.
  - **`annotations.ts`** — `renderAnnotations`, `measureAnnotationBox`.
  - **`templates.ts`** — `TEMPLATE_IDS`, `TEMPLATE_INFO`, `selectTemplate`, `scoreTemplate`,
    `planTemplate`, `frameFor`; types `TemplateContext` (which also carries optional `columns`,
    `density`, `emphasis` and `orientation` presentation hints for the multi-column and layered
    families), `TemplateFrame`, `TemplateInfo`, `TemplatePlan`, `TemplateScore`, `TemplateSelection`,
    `TemplateViolation`.
  - **`layout.ts`** — `SECTION_RENDERERS`, `buildInfographic`, `buildInfographicPages`,
    `chooseTemplate`, `buildLabelIndex`; `BuildInfographicOptions`.
  - **`svg.ts`** — `layoutToSvg`, `layoutToSvgFile`, `layoutToDataUri`, `layoutToPng`,
    `primitiveToSvg`, `layoutBounds`, `escapeXml`; `SvgLayoutOptions`, `PngLayoutOptions`,
    `SvgLayoutResult`.
- **Composition / boundary:** `buildInfographic` runs the fixed order docs/12 §5 requires —
  (1) validate the source; (2) resolve the art direction and output profile, then derive the safe
  region from the profile inset; (3) choose a template (authored or scored by content shape) and plan
  its frames; (4) render each frame by dispatching on section kind through `SECTION_RENDERERS` (the
  only dispatch table in the subsystem, `BLOCK_RENDERERS` ∪ `VISUALIZER_RENDERERS` ∪
  `{ chart: CHART_RENDERER }`); (5) annotate last against the anchors the renderers returned;
  (6) return `InfographicLayout` with primitives, `SectionFrame`s, deduped `diagnostics`,
  `provenance` (`sourceDigest`, `template`, `artDirection`, `profile`, `layoutVersion`) and an
  accessible `summary`. `buildInfographicPages` repeats it for every page. Renderers emit only
  `InfographicPrimitive`s — never markup — so preview and export draw the same geometry.
- **Semantics:** the layout is a pure function of its inputs — no clock, no `Math.random`, no I/O;
  ids come from `createIdFactory("ig-<layout id>")` and are stable for the same source; geometry is
  rounded once at the primitive boundary. `validateSource` **returns** findings and never throws
  (errors mean the document cannot be laid out; warnings mean it is questionable but renderable);
  `assertSource` throws for pipelines that want to stop. `sourceDigest` is FNV‑1a over
  `canonicalJson` of the source, so key order does not change the digest. Config lives in tokens:
  six art directions (`editorial`, `minimal-technical`, `cinematic`, `scientific`, `illustrated`,
  `sketch`) and six output profiles (`youtube-landscape`, `short-portrait`, `social-square`,
  `social-portrait`, `pinterest-vertical`, `article-inline`); profiles with
  `pagination: "paginate"` split content across pages, while a non-paginating profile reports the
  excess as errors instead of compressing it.
- **Failure behaviour / diagnostics:** structural findings (`invalid-source`,
  `invalid-source-kind`, `unsupported-version`, `missing-source-id`, `missing-title`,
  `missing-language`, `missing-sections`, `invalid-evidence`, `invalid-evidence-entry`,
  `duplicate-evidence-id`, `invalid-section`, `missing-section-id`, `unknown-section-kind`,
  `missing-section-summary`, `unknown-evidence-ref`, `duplicate-section-id`, `invalid-annotations`,
  `invalid-annotation`, `annotation-missing-label`, `annotation-orphan`, `duplicate-annotation-id`,
  and per-kind errors such as `text-missing-paragraphs`, `statistic-missing-value`,
  `process-empty`, `unknown-next-step`, `comparison-missing-cases`, `timeline-empty`,
  `hierarchy-empty`, `chart-empty`, `diagram-empty`, `unknown-diagram-node`, `quote-incomplete`) and
  warnings (`invalid-importance`, `process-cycle`, `comparison-unknown-criterion`). The engine adds
  `renderer-unavailable` (error) and `section-unplaced` (error) and surfaces template violations as
  warnings (`template-capacity`, `template-few-metrics`, `template-few-sections`,
  `template-requires-process`, `template-requires-chart`). The export adds `svg-marker-ignored`
  (warning — arrowheads are baked into paths and not re-emitted) and `svg-unsupported-primitive`
  (error). Every diagnostic names the offending id and path where the shape allows.
- **Data integrity:** `null` is missing, never zero — chart values resolve through
  `resolveSeriesValues` under an explicit `missingPolicy` (`"gap"`, the default, plus `zero`,
  `interpolate`, `suppress`), change is reported with an explicit sign and direction word, and
  unknown comparison cells render as an explicit em dash. `null` is never coerced to `0`.
- **Keyboard / focus:** not applicable — a data module with no interactive surface. The preview's
  focus and accessibility behaviour lives in `infographic-view`.
- **Visual states:** not applicable — state lives in the components that render a layout.
- **Customization:** `BuildInfographicOptions` accepts `template`, `artDirection`, `profile`, `size`,
  `styleOverride`, `page`, `id`, `annotations` and the template presentation hints `columns`,
  `density`, `emphasis` and `orientation`; `resolveStyle` deep-merges `styleOverride` over the
  chosen art direction per token group but replaces arrays (`spacing`, `color.series`) wholesale;
  `getOutputProfile(id, size)` overrides the canvas; colours are **literal** strings on the resolved
  style so an export is byte-stable regardless of the embedding page's `data-km-appearance`.
- **Dependencies:** no external runtime dependency — every module imports only sibling modules via
  relative `./…` specifiers, and no non-React module imports React or a third-party package.
- **Limits:** the installed item ships the modules individually and has **no barrel** (`index.ts` is
  not part of the slice), so a consumer imports from the specific file, e.g.
  `components/infographic/layout`. `measureText` uses a documented per-character advance model rather
  than real font metrics (deterministic across machines, at a small approximation cost), so layout
  decisions are exact but glyph widths are estimated. `TemplateId` (in `types.ts`) and
  `SOURCE_TEMPLATES` (in `validate.ts`) enumerate the same seven template ids — five P0 plus the two
  P1 families `visual-cheat-sheet` and `layered-architecture` — and must be kept in sync (see
  `infographic-templates`). PNG export (`layoutToPng`) needs a real DOM
  (`Image`, `<canvas>`, `toBlob`) and throws `svg-png-unavailable` rather than returning a blank
  image elsewhere. `estimateSectionHeight`/`allocateBands` estimates are deliberately conservative;
  when minimums cannot fit, bands are scaled proportionally (never silently clipped) and the
  renderers report the overflow with px attached.

## Acceptance evidence

- [ ] **Behavior tests executed; commands/results recorded** — **Acceptance evidence: pending.**
  No dedicated infographic test file exists yet; only ad-hoc `tests/tmp-*.test.ts` probes touch
  `src/infographic`. No `validateSource`, `buildInfographic`, chart, grid or `layoutToSvg`
  determinism suite has been recorded.
- [ ] **axe-core output and manual a11y checks recorded** — **not run.** This slice is data-only, so
  axe applies to the preview surface (`infographic-view`), not here; the text-recoverability
  contract of the visualizers was **not** verified by a screen reader.
- [ ] **Storybook states complete, including realistic and CJK/long content** —
  **not run.** `src/infographic/fixtures.ts` holds typed sources (including a `MIXED_SCRIPT`
  fixture), but no `.stories.tsx` for the system exists yet.
- [ ] **Screenshots reviewed: light/dark, profile and art-direction matrix** — **not run.**
- [ ] **No accidental overlap, clipping, contrast, focus or animation failures** — **not run.**
- [ ] **Test registry install into fresh fixture passed** — **not run**; the
  `infographic-system`/`infographic-view` items were added to `registry.json` and the
  `registry:validate`/`registry:smoke` checks pass, but `registry:fixture` (isolated-consumer
  `tsc`) has not been recorded as passing.
- [ ] **Dependencies/licenses reviewed; performance and bundle impact documented** — the modules
  import no external package (relative imports only), so there is no new licence surface. Bundle
  impact was **not measured**.
- [ ] **Blockers resolved; known limitations named honestly** — the limitations above are named; the
  missing barrel, the approximated text measure and the not-yet-registered P1 families are open.

**Links to evidence:** `../../registry/infographic/` (implementation),
`../../src/infographic/fixtures.ts` (typed fixtures), `../../docs/12-infographic-system.md`
(design contract). Dedicated tests, stories and screenshots are **pending**.
