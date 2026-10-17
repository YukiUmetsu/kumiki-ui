/**
 * Kumiki infographic system — public entry point.
 *
 * The system turns a validated, semantic `InfographicSource` (information first)
 * into a renderer-neutral `InfographicLayout` primitive tree (layout second) that
 * can be drawn by the DOM preview, exported to SVG/PNG, or consumed by a motion
 * adapter later. Nothing in this barrel depends on React for the data path.
 *
 * Re-exports are listed explicitly rather than star-exported because several
 * modules intentionally re-surface types they consume (`chart.ts` re-exports the
 * `ChartSection` shape it renders, for example). Explicit lists keep a single
 * authoritative origin per name.
 */

// --- Semantic source contract -------------------------------------------------
export type {
  AnnotationSpec,
  ArtDirectionId,
  ChartRecipe,
  ChartScale,
  ChartSection,
  ChartSeries,
  ChartSpec,
  ChartValue,
  ComparisonCase,
  ComparisonSection,
  ComparisonValue,
  DashPattern,
  DiagramEdge,
  DiagramNode,
  DiagramSection,
  DiagramSpec,
  EllipsePrimitive,
  HierarchyNode,
  HierarchySection,
  Importance,
  InfographicCanvasSpec,
  InfographicDiagnostic,
  InfographicEvidence,
  InfographicLayout,
  InfographicPrimitive,
  InfographicSection,
  InfographicSource,
  LinePrimitive,
  MarkerKind,
  MissingPolicy,
  OutputProfile,
  OutputProfileId,
  PathPrimitive,
  PolylinePrimitive,
  PrimitiveKind,
  ProcessSection,
  ProcessStep,
  ProcessStepMode,
  QuoteSection,
  QuoteSectionData,
  RectInfo,
  RectPrimitive,
  RenderResult,
  ResolvedStyle,
  SectionBase,
  SectionFrame,
  SectionKind,
  SectionRenderContext,
  SectionRenderer,
  StatisticSection,
  TextAlign,
  TextPrimitive,
  TextSection,
  TimelineMilestone,
  TimelineScale,
  TimelineSection,
  TemplateId,
} from "./types";

// --- Measurement & formatting -------------------------------------------------
export type { NumberFormatOptions, TextLineMetrics, TextStyleRef, WrapOptions, WrapResult } from "./measure";
export {
  baselineOffset,
  blockHeight,
  formatMilestoneLabel,
  formatNumber,
  formatPercent,
  formatSigned,
  hasTemporalScale,
  lineMetrics,
  measureText,
  milestoneSortKey,
  wrapText,
} from "./measure";

// --- Art direction & output profiles -----------------------------------------
export type { DeepPartial } from "./art-direction";
export {
  ART_DIRECTIONS,
  ART_DIRECTION_IDS,
  OUTPUT_PROFILES,
  OUTPUT_PROFILE_IDS,
  LAYOUT_VERSION,
  getArtDirection,
  getOutputProfile,
  resolveStyle,
  safeInset,
} from "./art-direction";

// --- Primitives & text layout -------------------------------------------------
export type {
  ConnectorOptions,
  ConnectorRoute,
  FitState,
  HeadingBlockOptions,
  HeadingBlockResult,
  Insets,
  LayoutTextInput,
  LayoutTextResult,
  LineOptions,
  PathOptions,
  Point,
  PolylineOptions,
  SurfaceOptions,
  TypeRole,
} from "./primitives";
export {
  accentBar,
  chipPrimitives,
  clamp,
  clampRect,
  columns,
  connectorPrimitives,
  createIdFactory,
  ellipsePrimitive,
  evidenceNote,
  gridCells,
  headingBlock,
  insetRect,
  labelCase,
  layoutText,
  layoutTextForRole,
  lerp,
  lineHeightForRole,
  linePrimitive,
  mapRange,
  niceStep,
  overflowOf,
  overlapArea,
  pathPrimitive,
  polylinePrimitive,
  rectBottom,
  rectCenter,
  rectPrimitive,
  rectRight,
  rectsOverlap,
  round,
  routePoints,
  rows,
  rulePrimitive,
  splitColumns,
  splitRows,
  surfacePrimitives,
  textBaseline,
  textLineWidth,
  typeStyle,
} from "./primitives";

// --- Validation ---------------------------------------------------------------
export type { ValidationResult } from "./validate";
export { SECTION_KINDS, SOURCE_TEMPLATES, assertSource, canonicalJson, sourceDigest, validateSource } from "./validate";

// --- Information blocks -------------------------------------------------------
export type { InsightCalloutSpec, MetricCardSpec, NumberedStepSpec, StepState } from "./blocks";
export {
  BLOCK_RENDERERS,
  BLOCK_SECTION_KINDS,
  chipRowBlock,
  insightCalloutBlock,
  isPercentLikeUnit,
  metricCardBlock,
  metricStackBlock,
  numberedStepBlock,
  renderComparisonSection,
  renderQuoteSection,
  renderStatisticSection,
  renderTextSection,
  sectionChrome,
} from "./blocks";

// --- Visualizers --------------------------------------------------------------
export type {
  DiagramSpecInput,
  HierarchyLayoutOptions,
  HierarchyLayoutResult,
  HierarchySpec,
  ProcessFlowSpec,
  TimelineOrientation,
  TimelineSpec,
} from "./visualizers";
export {
  VISUALIZER_RENDERERS,
  VISUALIZER_SECTION_KINDS,
  diagramBlock,
  diagramLayers,
  edgePorts,
  hierarchyBlock,
  hierarchyLayout,
  processFlowBlock,
  renderDiagramSection,
  renderHierarchySection,
  renderProcessSection,
  renderTimelineSection,
  timelineBlock,
  timelinePolicy,
} from "./visualizers";

// --- Charts -------------------------------------------------------------------
export type { ChartDomain, ChartRenderOptions, ChartRenderResult, ChartValueExtent, ResolvedSeries } from "./chart";
export {
  CHART_RECIPES,
  CHART_RENDERER,
  chartDomain,
  chartSummary,
  chartTicks,
  chartValueExtent,
  domainTransform,
  isUsableDomain,
  mixHex,
  renderChart,
  renderChartSection,
  resolveSeriesValues,
} from "./chart";

// --- Annotations --------------------------------------------------------------
export type { AnnotationMeasurement, AnnotationOptions, AnnotationRenderResult, AnnotationSide } from "./annotations";
export { measureAnnotationBox, renderAnnotations } from "./annotations";

// --- Layout engines -----------------------------------------------------------
export type { BentoGridResult, BentoGridSpec, BentoSpan, BentoTile, BentoTilePlacement, EditorialFocal, EditorialGridCell, EditorialGridResult, EditorialGridSpec } from "./grids";
export { baselineTops, bentoCellRects, bentoGrid, bentoOverlap, bentoRowHeight, editorialCellCount, editorialGrid, snapToBaseline } from "./grids";

// --- Templates ----------------------------------------------------------------
export type { TemplateContext, TemplateFrame, TemplateInfo, TemplatePlan, TemplateScore, TemplateSelection, TemplateViolation } from "./templates";
export { TEMPLATE_IDS, TEMPLATE_INFO, frameFor, planTemplate, scoreTemplate, selectTemplate } from "./templates";

// --- Engine -------------------------------------------------------------------
export type { BuildInfographicOptions } from "./layout";
export { SECTION_RENDERERS, buildInfographic, buildInfographicPages, buildLabelIndex, chooseTemplate } from "./layout";

// --- Static export ------------------------------------------------------------
export type { PngLayoutOptions, SvgLayoutOptions, SvgLayoutResult } from "./svg";
export { escapeXml, layoutBounds, layoutToDataUri, layoutToPng, layoutToSvg, layoutToSvgFile, primitiveToSvg } from "./svg";

// --- DOM preview --------------------------------------------------------------
export type { InfographicFit, InfographicViewProps } from "./react";
export { InfographicView, PrimitiveShape } from "./react";
