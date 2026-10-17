/**
 * `chart-stage` — a chart is *decoded*, not decorated.
 *
 * The renderer takes a typed {@link ChartSpec} (categories, series, scale,
 * missing-value policy, unit, source note) and produces plot primitives plus the
 * disclosures that make the encoding honest. Three rules drive the design:
 *
 * 1. **One plot grammar, six recipes.** Bar, line, area, donut, scatter and
 *    heatmap share the same chrome (title → plot → legend → captions), the same
 *    axis construction and the same missing-value resolution, so a chart gains a
 *    recipe without gaining a new set of edge cases.
 * 2. **Disclosure is not optional.** A truncated value axis, an inferred point or
 *    a suppressed series always ships with a legible caption and a diagnostic
 *    (docs/12 §8). Nothing about the encoding is implied.
 * 3. **`null` is missing, never zero.** {@link resolveSeriesValues} is the only
 *    place a missing value becomes a number, and it reports what it did.
 *
 * Static export parity holds by construction: every mark is a rect, ellipse,
 * polyline or path, and every label goes through `layoutText`, so the SVG
 * exporter and the DOM preview draw the identical geometry.
 */

import { formatNumber, measureText } from "./measure";
import { sectionChrome } from "./blocks";
import {
  clamp,
  ellipsePrimitive,
  layoutText,
  layoutTextForRole,
  linePrimitive,
  niceStep,
  pathPrimitive,
  polylinePrimitive,
  rectPrimitive,
  round,
  typeStyle,
} from "./primitives";
import type {
  ChartRecipe,
  ChartSection,
  ChartSeries,
  ChartSpec,
  InfographicPrimitive,
  MissingPolicy,
  RectInfo,
  RenderResult,
  SectionRenderContext,
  SectionRenderer,
  TextPrimitive,
} from "./types";

// ---------------------------------------------------------------------------
// Pure value helpers
// ---------------------------------------------------------------------------

export interface ChartValueExtent {
  /** Smallest finite value (0 when there is none). */
  min: number;
  /** Largest finite value (1 when there is none). */
  max: number;
  /** Smallest strictly-positive finite value, if any. */
  minPositive: number | null;
  /** How many finite values were seen. */
  count: number;
  /** How many entries were `null`/non-finite. */
  missing: number;
}

/**
 * Extent of a series list. Nulls and non-finite numbers are counted as missing
 * and excluded from the extent — this is the function that keeps "missing" from
 * silently reading as "zero".
 */
export function chartValueExtent(series: readonly ChartSeries[]): ChartValueExtent {
  let min = Infinity;
  let max = -Infinity;
  let minPositive = Infinity;
  let count = 0;
  let missing = 0;

  for (const entry of series) {
    for (const value of entry.values) {
      if (value === null || value === undefined || !Number.isFinite(value)) {
        missing += 1;
        continue;
      }
      count += 1;
      if (value < min) min = value;
      if (value > max) max = value;
      if (value > 0 && value < minPositive) minPositive = value;
    }
  }

  return {
    min: count === 0 ? 0 : min,
    max: count === 0 ? 1 : max,
    minPositive: Number.isFinite(minPositive) ? minPositive : null,
    count,
    missing,
  };
}

export interface ChartDomain {
  min: number;
  max: number;
  /** True when the domain includes its zero point. */
  zero: boolean;
  kind: "linear" | "log";
}

/**
 * Resolve the value-axis domain. Bars and areas default to a zero baseline
 * because their length is the encoding; lines, dots and heatmaps do not, because
 * their *position* is. An authored `scale.domain` always wins.
 */
export function chartDomain(spec: ChartSpec): ChartDomain {
  const kind = spec.scale?.kind ?? "linear";
  const zeroByRecipe = spec.recipe === "bar" || spec.recipe === "area";
  const zero = spec.scale?.zero ?? zeroByRecipe;
  const extent = chartValueExtent(spec.series);

  let min = spec.scale?.domain?.[0] ?? extent.min;
  let max = spec.scale?.domain?.[1] ?? extent.max;

  if (kind === "log") {
    const floor = extent.minPositive ?? 1;
    if (!Number.isFinite(min) || min <= 0) min = floor;
    min = Math.max(min, floor);
    if (!Number.isFinite(max) || max <= min) max = min * 10;
  } else {
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 1;
    if (zero) min = Math.min(0, min);
    if (max - min < Number.EPSILON * Math.max(1, Math.abs(max))) {
      const pad = Math.abs(max) > 0 ? Math.abs(max) * 0.1 : 1;
      max = max + pad;
      if (zero) min = Math.min(0, min);
    }
  }

  return { min: round(min, 6), max: round(max, 6), zero, kind };
}

/** True when the axis is usable for plotting. */
export function isUsableDomain(domain: ChartDomain): boolean {
  return (
    Number.isFinite(domain.min) &&
    Number.isFinite(domain.max) &&
    domain.max > domain.min &&
    (domain.kind === "linear" || domain.min > 0)
  );
}

/** Value → scaled space (log10 for logarithmic axes, identity otherwise). */
export function domainTransform(domain: ChartDomain): (value: number) => number {
  return domain.kind === "log" ? (value) => Math.log10(value) : (value) => value;
}

/**
 * Round, human-readable axis ticks inside `domain`. Log axes tick at powers of
 * ten in log space, which is the only reading of a logarithmic axis people
 * actually parse.
 */
export function chartTicks(domain: ChartDomain, targetCount = 5): number[] {
  if (!isUsableDomain(domain)) return [];
  const toT = domainTransform(domain);
  const tMin = toT(domain.min);
  const tMax = toT(domain.max);
  const step = niceStep((tMax - tMin) / Math.max(1, targetCount - 1));
  const fromT = domain.kind === "log" ? (t: number) => 10 ** t : (t: number) => t;

  const ticks: number[] = [];
  const start = Math.ceil(tMin / step) * step;
  for (let t = start; t <= tMax + step * 1e-6 && ticks.length < 64; t += step) {
    ticks.push(round(fromT(t), 6));
  }
  return ticks;
}

export const CHART_RECIPES: readonly ChartRecipe[] = [
  "bar",
  "line",
  "area",
  "donut",
  "scatter",
  "heatmap",
];

const RECIPE_LABELS: Record<ChartRecipe, string> = {
  bar: "Bar chart",
  line: "Line chart",
  area: "Area chart",
  donut: "Donut chart",
  scatter: "Scatter plot",
  heatmap: "Heatmap",
};

const MISSING_POLICY_CAPTIONS: Record<MissingPolicy, string> = {
  gap: "Missing values are shown as gaps — no mark is drawn for them.",
  zero: "Missing values are plotted as zero.",
  interpolate: "Missing values are interpolated between the nearest reported values.",
  suppress: "Series with missing values are omitted from the plot.",
};

/** One-line, screen-reader-friendly description of a chart. */
export function chartSummary(spec: ChartSpec, language?: string): string {
  const parts: string[] = [];
  const recipe = RECIPE_LABELS[spec.recipe] ?? "Chart";
  const categories = spec.categories ?? [];
  parts.push(`${recipe}: ${categories.length} categories, ${spec.series.length} series.`);

  for (const series of spec.series) {
    const shown = series.values.slice(0, 12).map((value) =>
      value === null || value === undefined ? "missing" : formatNumber(value, { language })
    );
    const suffix = series.values.length > 12 ? ", …" : "";
    const unit = spec.unit ? ` ${spec.unit}` : "";
    parts.push(`${series.label}: ${shown.join(", ")}${suffix}${unit}.`);
  }

  const policy = spec.missingPolicy ?? "gap";
  const missing = chartValueExtent(spec.series).missing;
  if (missing > 0) parts.push(`${missing} missing value(s); ${MISSING_POLICY_CAPTIONS[policy]}`);
  if (spec.categories.length > 0) parts.push(`Categories: ${spec.categories.join(", ")}.`);
  if (spec.sourceNote) parts.push(`Source: ${spec.sourceNote}`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Missing-value resolution
// ---------------------------------------------------------------------------

export interface ResolvedSeries {
  series: ChartSeries;
  /** Values aligned to categories; `null` still means "no mark". */
  values: (number | null)[];
  /** True where a value was produced rather than reported. */
  imputed: boolean[];
  /** True when the whole series was dropped by the `suppress` policy. */
  suppressed: boolean;
}

/**
 * Apply the missing-value policy. This is the single place where a `null`
 * becomes plottable, and every branch that invents a value marks it as imputed
 * so the mark can be drawn differently and disclosed.
 */
export function resolveSeriesValues(
  series: ChartSeries,
  categories: readonly string[],
  policy: MissingPolicy
): ResolvedSeries {
  const length = Math.min(series.values.length, categories.length);
  const values: (number | null)[] = [];
  const imputed: boolean[] = [];

  const read = (index: number): number | null => {
    const raw = series.values[index];
    return raw === null || raw === undefined || !Number.isFinite(raw) ? null : raw;
  };

  let hasMissing = false;
  for (let i = 0; i < length; i += 1) {
    if (read(i) === null) hasMissing = true;
  }

  if (policy === "suppress" && hasMissing) {
    return {
      series,
      values: new Array(length).fill(null),
      imputed: new Array(length).fill(false),
      suppressed: true,
    };
  }

  for (let i = 0; i < length; i += 1) {
    const value = read(i);
    if (value !== null) {
      values.push(value);
      imputed.push(false);
      continue;
    }
    if (policy === "zero") {
      values.push(0);
      imputed.push(true);
      continue;
    }
    if (policy === "interpolate") {
      let before = -1;
      for (let j = i - 1; j >= 0; j -= 1) {
        if (read(j) !== null) {
          before = j;
          break;
        }
      }
      let after = -1;
      for (let j = i + 1; j < length; j += 1) {
        if (read(j) !== null) {
          after = j;
          break;
        }
      }
      if (before >= 0 && after >= 0) {
        const a = read(before) as number;
        const b = read(after) as number;
        const t = (i - before) / (after - before);
        values.push(round(a + (b - a) * t, 6));
        imputed.push(true);
        continue;
      }
    }
    values.push(null);
    imputed.push(false);
  }

  return { series, values, imputed, suppressed: false };
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Blend two hex colours. Falls back to `from` when either side is not hex (e.g. a token var). */
export function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const amount = clamp(t, 0, 1);
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * amount);
  const hex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${hex(channel(0))}${hex(channel(1))}${hex(channel(2))}`;
}

function seriesColor(spec: ChartSpec, context: SectionRenderContext, index: number): string {
  const explicit = spec.series[index]?.color;
  if (explicit) return explicit;
  const ramps = context.style.color.series;
  if (ramps.length === 0) return context.style.color.accent;
  return ramps[index % ramps.length];
}

// ---------------------------------------------------------------------------
// Chrome: title, legend, captions
// ---------------------------------------------------------------------------

export interface ChartRenderOptions {
  /** Primitive-id hint prefix and semantic id for the plot. */
  id?: string;
  /** @default true when more than one series is present */
  showLegend?: boolean;
  /** @default true */
  showSourceNote?: boolean;
  /** Rendering title. Sections usually own their heading, so this is optional. */
  title?: string;
  /** Overrides the axis-tick target count. @default 5 */
  tickCount?: number;
}

export interface ChartRenderResult extends RenderResult {
  /** Accessible description of what was drawn. */
  summary: string;
  /** The plot rect marks were laid into (useful for annotation targets). */
  plot: RectInfo;
}

interface CaptionLine {
  text: string;
}

function buildCaptions(
  spec: ChartSpec,
  domain: ChartDomain,
  options: ChartRenderOptions,
  missingCount: number,
  suppressed: readonly string[]
): CaptionLine[] {
  const lines: CaptionLine[] = [];
  const policy = spec.missingPolicy ?? "gap";

  if (options.showSourceNote !== false && spec.sourceNote) {
    lines.push({ text: `Source: ${spec.sourceNote}` });
  }
  if (missingCount > 0) {
    lines.push({ text: MISSING_POLICY_CAPTIONS[policy] });
  }
  if (suppressed.length > 0) {
    lines.push({ text: `Omitted for missing data: ${suppressed.join(", ")}.` });
  }
  if (domain.kind === "linear" && domain.min > 0) {
    const barLike = spec.recipe === "bar" || spec.recipe === "area";
    const lead = barLike ? "Baseline" : "Value axis starts";
    lines.push({
      text: barLike
        ? `${lead} is ${formatNumber(domain.min)}, not zero — bar lengths are not proportional.`
        : `${lead} at ${formatNumber(domain.min)}, not zero.`,
    });
  }
  if (domain.kind === "log") {
    lines.push({ text: "Value axis is logarithmic; equal distances are equal ratios." });
  }
  return lines;
}

interface LegendItem {
  label: string;
  color: string;
  suppressed: boolean;
  semanticId: string;
  x: number;
  y: number;
}

interface LegendLayout {
  primitives: InfographicPrimitive[];
  height: number;
}

interface LegendRows {
  items: LegendItem[];
  rowHeight: number;
  rowCount: number;
  height: number;
}

function legendSwatch(style: SectionRenderContext["style"]): number {
  return round(style.type.caption * 0.75);
}

/**
 * Wrap legend entries into rows that fit `width`. Shared by the reservation
 * pass and the render pass so the reserved band and the drawn band always agree.
 */
function legendRows(
  spec: ChartSpec,
  playable: readonly ResolvedSeries[],
  originX: number,
  width: number,
  context: SectionRenderContext
): LegendRows {
  const style = context.style;
  const swatch = legendSwatch(style);
  const gap = style.spacing[2];
  const rowGap = style.spacing[1];
  const labelStyle = typeStyle(style, "caption");
  const rowHeight = round(Math.max(swatch, labelStyle.fontSize * 1.4));
  const items: LegendItem[] = [];
  let x = originX;
  let row = 0;
  let placed = 0;

  for (let index = 0; index < playable.length; index += 1) {
    const entry = playable[index];
    const suppressed = entry.suppressed;
    const label = suppressed ? `${entry.series.label} (omitted)` : entry.series.label;
    const itemWidth = swatch + gap * 0.5 + measureText(label, labelStyle);
    if (placed > 0 && x + itemWidth > originX + width) {
      x = originX;
      row += 1;
    }
    items.push({
      label,
      color: suppressed ? style.color.inkSubtle : seriesColor(spec, context, index),
      suppressed,
      semanticId: entry.series.id,
      x,
      y: round(row * (rowHeight + rowGap)),
    });
    placed += 1;
    x += itemWidth + gap;
  }

  const rowCount = items.length === 0 ? 0 : row + 1;
  return {
    items,
    rowHeight,
    rowCount,
    height: rowCount === 0 ? 0 : round(rowCount * rowHeight + (rowCount - 1) * rowGap),
  };
}

/**
 * Swatch + label legend laid out at `origin.y` in the band the caller reserved.
 * Always sits below the plot so narrow portrait artboards keep the encoding key.
 */
function legendLayout(
  rows: LegendRows,
  origin: RectInfo,
  width: number,
  context: SectionRenderContext
): LegendLayout {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const swatch = legendSwatch(style);
  const gap = style.spacing[2];

  for (const item of rows.items) {
    const y = round(origin.y + item.y);
    primitives.push(
      rectPrimitive(
        { x: item.x, y: round(y + (rows.rowHeight - swatch) / 2), width: swatch, height: swatch },
        {
          fill: item.color,
          radius: style.radius.sm,
          opacity: item.suppressed ? 0.5 : 1,
          role: "chart-legend-swatch",
          semanticId: item.semanticId,
        },
        context
      )
    );
    primitives.push(
      layoutText(
        {
          text: item.label,
          box: {
            x: round(item.x + swatch + gap * 0.5),
            y,
            width: round(Math.max(0, width - (item.x - origin.x + swatch + gap * 0.5))),
            height: rows.rowHeight,
          },
          style: typeStyle(style, "caption"),
          color: item.suppressed ? style.color.inkSubtle : style.color.inkMuted,
          role: "chart-legend-label",
          valign: "middle",
          maxLines: 1,
        },
        context
      ).primitive
    );
  }

  return { primitives, height: rows.height };
}

// ---------------------------------------------------------------------------
// Plot construction
// ---------------------------------------------------------------------------

interface PlotScales {
  /** Inner rect after axis label space. */
  area: RectInfo;
  /** Width of one category band. */
  band: number;
  /** Centre of a category band, in design px. */
  center: (index: number) => number;
  toT: (value: number) => number;
  yFor: (value: number) => number;
  ticks: number[];
}

function makeScales(
  area: RectInfo,
  count: number,
  domain: ChartDomain,
  tickCount: number
): PlotScales {
  const toT = domainTransform(domain);
  const tMin = toT(domain.min);
  const tMax = toT(domain.max);
  const band = count > 0 ? area.width / count : area.width;

  return {
    area,
    band,
    center: (index: number) => round(area.x + band * (index + 0.5)),
    toT,
    yFor: (value: number) => {
      const t = toT(value);
      const ratio = tMax === tMin ? 0 : (t - tMin) / (tMax - tMin);
      return round(area.y + area.height * (1 - clamp(ratio, 0, 1)));
    },
    ticks: chartTicks(domain, tickCount),
  };
}

interface AxisFrame {
  primitives: InfographicPrimitive[];
  area: RectInfo;
  categoryLabelHeight: number;
}

/**
 * Draw the value axis (grid, baseline, ticks) around `region` and reserve the
 * category-label strip at the bottom. Returns the inner plotting rect.
 */
function drawValueAxis(
  region: RectInfo,
  scales: PlotScales,
  domain: ChartDomain,
  style: SectionRenderContext["style"],
  context: SectionRenderContext,
  options: { tickLabelWidth: number; xAxisLabel?: string }
): AxisFrame {
  const primitives: InfographicPrimitive[] = [];
  const tickStyle = typeStyle(style, "annotation", { family: style.font.mono });
  const labelGap = style.spacing[1];

  for (const tick of scales.ticks) {
    const y = scales.yFor(tick);
    primitives.push(
      linePrimitive(
        { x: region.x, y },
        { x: round(region.x + region.width), y },
        {
          stroke: style.color.grid,
          strokeWidth: style.stroke.hairline,
          dash: style.dash.guide,
          role: "chart-grid",
          semanticId: "grid",
        },
        context
      )
    );
    primitives.push(
      layoutText(
        {
          text: formatNumber(tick, { precision: tickPrecision(scales.ticks) }),
          box: {
            x: round(region.x - labelGap - options.tickLabelWidth),
            y: round(y - tickStyle.fontSize * 0.7),
            width: options.tickLabelWidth,
            height: round(tickStyle.fontSize * 1.4),
          },
          style: tickStyle,
          color: style.color.inkSubtle,
          role: "chart-tick-label",
          align: "end",
          valign: "middle",
          maxLines: 1,
        },
        context
      ).primitive
    );
  }

  // Zero baseline, or the domain edge when the axis is truncated.
  const baselineValue = domain.zero ? 0 : domain.min;
  primitives.push(
    linePrimitive(
      { x: region.x, y: scales.yFor(baselineValue) },
      { x: round(region.x + region.width), y: scales.yFor(baselineValue) },
      {
        stroke: style.color.rule,
        strokeWidth: style.stroke.rule,
        dash: "solid",
        role: "chart-baseline",
        semanticId: domain.zero ? "zero" : "domain-min",
      },
      context
    )
  );

  const categoryLabelHeight = round(typeStyle(style, "caption").fontSize * 1.6);
  let bottom = round(region.y + region.height);
  if (options.xAxisLabel) {
    const axisTitle = layoutTextForRole(
      {
        text: options.xAxisLabel,
        box: { x: region.x, y: 0, width: region.width, height: 0 },
        typeRole: "annotation",
        overrides: { family: style.font.mono },
        color: style.color.inkSubtle,
        role: "chart-axis-title",
        align: "center",
        maxLines: 1,
      },
      context
    );
    axisTitle.primitive.y = round(bottom - axisTitle.primitive.height);
    primitives.push(axisTitle.primitive);
    bottom -= axisTitle.primitive.height + style.spacing[1];
  }

  const area: RectInfo = {
    x: region.x,
    y: region.y,
    width: region.width,
    height: round(Math.max(0, bottom - categoryLabelHeight - style.spacing[1] - region.y)),
  };

  return { primitives, area, categoryLabelHeight };
}

function tickPrecision(ticks: readonly number[]): number {
  if (ticks.length < 2) return 0;
  const step = Math.abs(ticks[1] - ticks[0]);
  if (step >= 1) return 0;
  return Math.min(4, Math.ceil(-Math.log10(step)) + 1);
}

interface CategoryLabelsResult {
  primitives: InfographicPrimitive[];
  truncated: number;
}

/** Category labels under the bands. Over-long labels truncate and are reported. */
function categoryLabels(
  area: RectInfo,
  categories: readonly string[],
  band: number,
  y: number,
  style: SectionRenderContext["style"],
  context: SectionRenderContext
): CategoryLabelsResult {
  const primitives: InfographicPrimitive[] = [];
  const textStyle = typeStyle(style, "caption");
  let truncated = 0;

  for (let index = 0; index < categories.length; index += 1) {
    const label = categories[index];
    const available = round(Math.max(0, band - style.spacing[1]));
    const measurement = measureText(label, textStyle);
    if (measurement > available) truncated += 1;
    primitives.push(
      layoutText(
        {
          text: label,
          box: { x: round(area.x + band * index), y, width: band, height: 0 },
          style: textStyle,
          color: style.color.inkMuted,
          role: "chart-category-label",
          align: "center",
          maxLines: 1,
        },
        context
      ).primitive
    );
  }

  return { primitives, truncated };
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

interface RecipeInput {
  spec: ChartSpec;
  playable: readonly ResolvedSeries[];
  domain: ChartDomain;
  scales: PlotScales;
  context: SectionRenderContext;
  colorOf: (index: number) => string;
}

interface RecipeOutput {
  primitives: InfographicPrimitive[];
  anchors: Record<string, RectInfo>;
}

function barMarks(input: RecipeInput): RecipeOutput {
  const { spec, playable, domain, scales, context, colorOf } = input;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const baseline = scales.yFor(domain.zero ? 0 : domain.min);
  const groupCount = Math.max(1, playable.length);
  const groupWidth = scales.band * 0.7;
  const barWidth = round(groupWidth / groupCount);
  const count = spec.categories.length;

  for (let i = 0; i < count; i += 1) {
    anchors[`category:${i}`] = {
      x: round(scales.area.x + scales.band * i),
      y: scales.area.y,
      width: round(scales.band),
      height: scales.area.height,
    };
  }

  playable.forEach((entry, seriesIndex) => {
    const color = colorOf(seriesIndex);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < count; i += 1) {
      const value = entry.values[i];
      if (value === null) continue;
      const x = round(scales.area.x + scales.band * i + (scales.band - groupWidth) / 2 + barWidth * seriesIndex);
      const y = scales.yFor(value);
      const top = Math.min(y, baseline);
      const height = Math.max(context.style.stroke.hairline * 2, round(Math.abs(y - baseline)));
      const box: RectInfo = { x, y: top, width: barWidth, height };
      primitives.push(
        rectPrimitive(
          box,
          {
            fill: color,
            radius: context.style.radius.sm,
            role: entry.imputed[i] ? "chart-mark-imputed" : "chart-mark",
            semanticId: `${entry.series.id}:${i}`,
          },
          context
        )
      );
      minX = Math.min(minX, box.x);
      maxX = Math.max(maxX, box.x + box.width);
      minY = Math.min(minY, box.y);
      maxY = Math.max(maxY, box.y + box.height);
    }

    if (Number.isFinite(minX)) {
      anchors[`series:${entry.series.id}`] = {
        x: round(minX),
        y: round(minY),
        width: round(maxX - minX),
        height: round(maxY - minY),
      };
    }
  });

  return { primitives, anchors };
}

/** Split a value run into contiguous non-null segments (gap policy). */
function segments(values: readonly (number | null)[]): { index: number; value: number }[][] {
  const runs: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) runs.push(current);
      current = [];
      return;
    }
    current.push({ index, value });
  });
  if (current.length > 0) runs.push(current);
  return runs;
}

function lineMarks(input: RecipeInput, withArea: boolean): RecipeOutput {
  const { spec, playable, scales, context, colorOf } = input;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const count = spec.categories.length;

  for (let i = 0; i < count; i += 1) {
    anchors[`category:${i}`] = {
      x: round(scales.area.x + scales.band * i),
      y: scales.area.y,
      width: round(scales.band),
      height: scales.area.height,
    };
  }

  playable.forEach((entry, seriesIndex) => {
    const color = colorOf(seriesIndex);
    const runs = segments(entry.values);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const run of runs) {
      const points: [number, number][] = run.map((point) => {
        const x = scales.center(point.index);
        const y = scales.yFor(point.value);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        return [x, y];
      });

      if (withArea && points.length > 1) {
        const baselineValue = input.domain.zero ? 0 : input.domain.min;
        const base = scales.yFor(baselineValue);
        primitives.push(
          polylinePrimitive(
            [...points, [points[points.length - 1][0], base], [points[0][0], base]],
            {
              closed: true,
              fill: color,
              opacity: 0.16,
              role: "chart-mark-area",
              semanticId: entry.series.id,
            },
            context
          )
        );
      }

      if (points.length > 1) {
        primitives.push(
          polylinePrimitive(
            points,
            {
              stroke: color,
              strokeWidth: context.style.stroke.strong,
              role: "chart-mark-line",
              semanticId: entry.series.id,
            },
            context
          )
        );
      }

      run.forEach((point) => {
        const markerSize = context.style.stroke.strong * 2;
        primitives.push(
          ellipsePrimitive(
            {
              x: round(scales.center(point.index) - markerSize / 2),
              y: round(scales.yFor(point.value) - markerSize / 2),
              width: markerSize,
              height: markerSize,
            },
            {
              fill: entry.imputed[point.index] ? context.style.color.canvas : color,
              stroke: color,
              strokeWidth: context.style.stroke.hairline,
              role: entry.imputed[point.index] ? "chart-mark-imputed" : "chart-mark",
              semanticId: `${entry.series.id}:${point.index}`,
            },
            context
          )
        );
      });
    }

    if (Number.isFinite(minX)) {
      anchors[`series:${entry.series.id}`] = {
        x: round(minX),
        y: round(minY),
        width: round(Math.max(1, maxX - minX)),
        height: round(Math.max(1, maxY - minY)),
      };
    }
  });

  return { primitives, anchors };
}

function scatterMarks(input: RecipeInput): RecipeOutput {
  const { spec, playable, scales, context, colorOf } = input;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const count = spec.categories.length;

  for (let i = 0; i < count; i += 1) {
    anchors[`category:${i}`] = {
      x: round(scales.area.x + scales.band * i),
      y: scales.area.y,
      width: round(scales.band),
      height: scales.area.height,
    };
  }

  playable.forEach((entry, seriesIndex) => {
    const color = colorOf(seriesIndex);
    const size = context.style.type.body;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    entry.values.forEach((value, index) => {
      if (value === null) return;
      const x = scales.center(index);
      const y = scales.yFor(value);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      primitives.push(
        ellipsePrimitive(
          { x: round(x - size / 2), y: round(y - size / 2), width: size, height: size },
          {
            fill: entry.imputed[index] ? context.style.color.canvas : color,
            stroke: color,
            strokeWidth: context.style.stroke.hairline,
            opacity: 0.9,
            role: entry.imputed[index] ? "chart-mark-imputed" : "chart-mark",
            semanticId: `${entry.series.id}:${index}`,
          },
          context
        )
      );
    });

    if (Number.isFinite(minX)) {
      anchors[`series:${entry.series.id}`] = {
        x: round(minX - size / 2),
        y: round(minY - size / 2),
        width: round(maxX - minX + size),
        height: round(maxY - minY + size),
      };
    }
  });

  return { primitives, anchors };
}

function heatmapMarks(input: RecipeInput): RecipeOutput {
  const { spec, playable, domain, scales, context } = input;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const count = spec.categories.length;
  const rowHeight = playable.length > 0 ? scales.area.height / playable.length : scales.area.height;
  const cellGap = context.style.spacing[0] * 0.5;
  const toT = domainTransform(domain);
  const tMin = toT(domain.min);
  const tMax = toT(domain.max);

  for (let i = 0; i < count; i += 1) {
    anchors[`category:${i}`] = {
      x: round(scales.area.x + scales.band * i),
      y: scales.area.y,
      width: round(scales.band),
      height: scales.area.height,
    };
  }

  playable.forEach((entry, rowIndex) => {
    const rowY = round(scales.area.y + rowHeight * rowIndex);
    anchors[`series:${entry.series.id}`] = {
      x: scales.area.x,
      y: rowY,
      width: scales.area.width,
      height: round(rowHeight),
    };

    entry.values.forEach((value, columnIndex) => {
      if (value === null) return;
      const t = tMax === tMin ? 0 : clamp((toT(value) - tMin) / (tMax - tMin), 0, 1);
      const box: RectInfo = {
        x: round(scales.area.x + scales.band * columnIndex + cellGap / 2),
        y: round(rowY + cellGap / 2),
        width: round(Math.max(1, scales.band - cellGap)),
        height: round(Math.max(1, rowHeight - cellGap)),
      };
      primitives.push(
        rectPrimitive(
          box,
          {
            fill: mixHex(context.style.color.surfaceAlt, context.style.color.accent, 0.12 + 0.88 * t),
            radius: context.style.radius.sm,
            role: entry.imputed[columnIndex] ? "chart-mark-imputed" : "chart-mark",
            semanticId: `${entry.series.id}:${columnIndex}`,
          },
          context
        )
      );
    });
  });

  return { primitives, anchors };
}

interface DonutSlice {
  index: number;
  label: string;
  value: number;
  share: number;
  start: number;
  end: number;
}

function donutSlicePath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number
): string {
  const sweep = end - start;
  if (sweep >= Math.PI * 2 - 1e-6) {
    // A full ring is two arcs; a single 360° arc collapses to nothing.
    const half = start + Math.PI;
    return `${ringArc(cx, cy, inner, outer, start, half)} ${ringArc(cx, cy, inner, outer, half, start + Math.PI * 2)}`;
  }
  return ringArc(cx, cy, inner, outer, start, end);
}

function ringArc(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const point = (radius: number, angle: number) => ({
    x: round(cx + Math.cos(angle) * radius),
    y: round(cy + Math.sin(angle) * radius),
  });
  const a = point(outer, start);
  const b = point(outer, end);
  const c = point(inner, end);
  const d = point(inner, start);
  return [
    `M ${a.x} ${a.y}`,
    `A ${round(outer)} ${round(outer)} 0 ${large} 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${round(inner)} ${round(inner)} 0 ${large} 0 ${d.x} ${d.y}`,
    "Z",
  ].join(" ");
}

function donutSlices(spec: ChartSpec, playable: readonly ResolvedSeries[]): DonutSlice[] {
  const entry = playable[0];
  if (!entry) return [];
  const total = entry.values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (!(total > 0)) return [];
  const slices: DonutSlice[] = [];
  let cursor = -Math.PI / 2;
  for (let index = 0; index < spec.categories.length; index += 1) {
    const value = entry.values[index] ?? 0;
    const share = value / total;
    const end = cursor + share * Math.PI * 2;
    slices.push({ index, label: spec.categories[index], value, share, start: cursor, end });
    cursor = end;
  }
  return slices;
}

function donutMarks(input: RecipeInput): RecipeOutput {
  const { spec, playable, context, colorOf } = input;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const slots = donutSlices(spec, playable);
  const plot = input.scales.area;
  const cx = round(plot.x + plot.width / 2);
  const cy = round(plot.y + plot.height / 2);
  const outer = round(Math.min(plot.width, plot.height) / 2);
  const inner = round(outer * 0.58);

  anchors["series:plot"] = {
    x: round(cx - outer),
    y: round(cy - outer),
    width: round(outer * 2),
    height: round(outer * 2),
  };

  for (const slice of slots) {
    if (slice.share <= 0) continue;
    primitives.push(
      pathPrimitive(
        donutSlicePath(cx, cy, inner, outer, slice.start, slice.end),
        {
          fill: colorOf(slice.index),
          role: "chart-mark",
          semanticId: `${playable[0].series.id}:${slice.index}`,
        },
        context
      )
    );
    const mid = (slice.start + slice.end) / 2;
    const radius = (inner + outer) / 2;
    const size = round(context.style.stroke.strong * 2);
    anchors[`category:${slice.index}`] = {
      x: round(cx + Math.cos(mid) * radius - size),
      y: round(cy + Math.sin(mid) * radius - size),
      width: round(size * 2),
      height: round(size * 2),
    };
  }

  return { primitives, anchors };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/**
 * Render a chart into `frame`. The caller owns the frame; the chart owns
 * everything inside it: chrome, axes, marks, legend, captions and diagnostics.
 */
export function renderChart(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: ChartSpec,
  options: ChartRenderOptions = {}
): ChartRenderResult {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  const language = context.language;
  const summary = chartSummary(spec, language);

  const categories = spec.categories ?? [];
  const policy = spec.missingPolicy ?? "gap";

  if (spec.series.length === 0 || categories.length === 0) {
    context.report({
      code: "chart-empty",
      severity: "error",
      message: "Chart has no categories or no series to draw.",
      targetId: options.id,
      path: "/sections",
    });
    const empty = layoutTextForRole(
      {
        text: "No data to display.",
        box: frame,
        typeRole: "body",
        color: style.color.inkMuted,
        role: "chart-empty",
        maxLines: 2,
      },
      context
    );
    return { primitives: [empty.primitive], summary, plot: frame, anchors };
  }

  for (const series of spec.series) {
    if (series.values.length !== categories.length) {
      context.report({
        code: "chart-series-length-mismatch",
        severity: "error",
        message: `Series "${series.label}" has ${series.values.length} values for ${categories.length} categories.`,
        targetId: options.id,
        path: `/series/${series.id}`,
      });
    }
  }

  const resolved = spec.series.map((series) => resolveSeriesValues(series, categories, policy));

  if (spec.recipe === "donut") {
    const negative = resolved[0]?.values.some((value) => value !== null && value < 0);
    if (negative) {
      context.report({
        code: "chart-invalid-scale",
        severity: "error",
        message: "A donut chart cannot encode negative values.",
        targetId: options.id,
      });
    }
  }

  const cropped: ResolvedSeries[] = resolved.map((entry) => ({
    ...entry,
    values: entry.values.slice(0, categories.length),
  }));

  const domain = chartDomain(spec);
  if (!isUsableDomain(domain)) {
    context.report({
      code: "chart-invalid-scale",
      severity: "error",
      message: `Value axis domain is not usable (min ${domain.min}, max ${domain.max}, kind ${domain.kind}).`,
      targetId: options.id,
    });
  }

  const missingCount = cropped.reduce(
    (sum, entry) => sum + entry.values.filter((value) => value === null).length,
    0
  );
  const suppressed = cropped.filter((entry) => entry.suppressed).map((entry) => entry.series.label);
  if (missingCount > 0 || suppressed.length > 0) {
    context.report({
      code: "chart-missing-data",
      severity: "warning",
      message: `${suppressed.length > 0 ? `${suppressed.length} series suppressed; ` : ""}${missingCount} missing value(s) handled by the "${policy}" policy.`,
      targetId: options.id,
    });
  }
  if ((spec.recipe === "bar" || spec.recipe === "area") && domain.kind === "linear" && domain.min > 0) {
    context.report({
      code: "chart-nonzero-baseline",
      severity: "warning",
      message: `Value axis starts at ${formatNumber(domain.min)}, not zero, so ${spec.recipe} lengths are not proportional.`,
      targetId: options.id,
    });
  }

  // ---- chrome -----------------------------------------------------------
  let cursor = frame.y;
  if (options.title) {
    const title = layoutTextForRole(
      {
        text: options.title,
        box: { x: frame.x, y: cursor, width: frame.width, height: 0 },
        typeRole: "h3",
        color: style.color.ink,
        role: "chart-title",
        semanticId: options.id,
        maxLines: 2,
      },
      context
    );
    primitives.push(title.primitive);
    cursor += title.height + style.spacing[2];
  }

  const captions = buildCaptions(spec, domain, options, missingCount, suppressed);
  const captionStyle = typeStyle(style, "caption", { family: style.font.mono });
  const captionGap = round(style.spacing[0] * 0.5);
  const captionPrimitives: InfographicPrimitive[] = [];
  let captionHeight = 0;
  if (captions.length > 0) {
    const lines: TextPrimitive[] = captions.map((caption) =>
      layoutText(
        {
          text: caption.text,
          box: { x: frame.x, y: 0, width: frame.width, height: 0 },
          style: captionStyle,
          color: style.color.inkSubtle,
          role: "chart-caption",
          maxLines: 2,
        },
        context
      ).primitive
    );
    // Place the caption block bottom-anchored but in reading order: the source
    // note first, then each disclosure beneath it.
    const blockHeight = round(
      lines.reduce((sum, line) => sum + line.height, 0) + captionGap * (lines.length - 1)
    );
    let y = round(frame.y + frame.height - blockHeight);
    for (const line of lines) {
      line.y = y;
      y = round(y + line.height + captionGap);
      captionPrimitives.push(line);
    }
    captionHeight = round(blockHeight + style.spacing[2]);
  }

  const legendWanted = options.showLegend ?? spec.series.length > 1;
  const legendRowsData = legendWanted
    ? legendRows(spec, cropped, frame.x, frame.width, context)
    : { items: [], rowHeight: 0, rowCount: 0, height: 0 };
  const legendTop = round(frame.y + frame.height - captionHeight - legendRowsData.height);
  const legend = legendWanted
    ? legendLayout(legendRowsData, { x: frame.x, y: legendTop, width: frame.width, height: 0 }, frame.width, context)
    : { primitives: [], height: 0 };

  const bottom = round(legendTop - style.spacing[2]);

  const plotRegion: RectInfo = {
    x: frame.x,
    y: round(cursor),
    width: frame.width,
    height: round(Math.max(0, bottom - cursor)),
  };

  primitives.push(...legend.primitives);
  primitives.push(...captionPrimitives);

  // ---- plot -------------------------------------------------------------
  const bandCount = categories.length;

  if (spec.recipe === "donut") {
    const scales = makeScales(plotRegion, bandCount, domain, options.tickCount ?? 5);
    const output = donutMarks({
      spec,
      playable: cropped,
      domain,
      scales,
      context,
      colorOf: (index) => seriesColor(spec, context, index),
    });
    primitives.push(...output.primitives);
    Object.assign(anchors, output.anchors);
    return { primitives, summary, plot: plotRegion, anchors };
  }

  const tickStyle = typeStyle(style, "annotation", { family: style.font.mono });
  const ticks = chartTicks(domain, options.tickCount ?? 5);
  const tickLabelWidth = round(
    Math.max(
      tickStyle.fontSize,
      ...ticks.map((tick) => measureText(formatNumber(tick, { precision: tickPrecision(ticks) }), tickStyle))
    ) + style.spacing[1]
  );

  const yAxisTitleWidth = spec.axisLabels?.y
    ? round(typeStyle(style, "annotation", { family: style.font.mono }).fontSize * 1.6 + style.spacing[0])
    : 0;

  const innerRegion: RectInfo = {
    x: round(plotRegion.x + tickLabelWidth + yAxisTitleWidth),
    y: plotRegion.y,
    width: round(Math.max(0, plotRegion.width - tickLabelWidth - yAxisTitleWidth)),
    height: plotRegion.height,
  };

  const preScales = makeScales(innerRegion, bandCount, domain, options.tickCount ?? 5);
  const axis = drawValueAxis(innerRegion, preScales, domain, style, context, {
    tickLabelWidth,
    xAxisLabel: spec.axisLabels?.x,
  });
  primitives.push(...axis.primitives);

  if (spec.axisLabels?.y) {
    const title = layoutTextForRole(
      {
        text: spec.axisLabels.y,
        box: { x: plotRegion.x, y: plotRegion.y, width: tickLabelWidth + yAxisTitleWidth, height: axis.area.height },
        typeRole: "annotation",
        overrides: { family: style.font.mono },
        color: style.color.inkSubtle,
        role: "chart-axis-title",
        align: "end",
        valign: "middle",
        maxLines: 3,
      },
      context
    );
    primitives.push(title.primitive);
  }

  const scales = makeScales(axis.area, bandCount, domain, options.tickCount ?? 5);
  const labels = categoryLabels(
    axis.area,
    categories,
    scales.band,
    round(axis.area.y + axis.area.height + style.spacing[1] * 0.5),
    style,
    context
  );
  primitives.push(...labels.primitives);
  if (labels.truncated > 0) {
    context.report({
      code: "chart-label-overflow",
      severity: "warning",
      message: `${labels.truncated} category label(s) were truncated to fit their band; shorten the labels or widen the frame.`,
      targetId: options.id,
    });
  }

  const recipeInput: RecipeInput = {
    spec,
    playable: cropped,
    domain,
    scales,
    context,
    colorOf: (index) => seriesColor(spec, context, index),
  };

  const output =
    spec.recipe === "bar"
      ? barMarks(recipeInput)
      : spec.recipe === "line"
        ? lineMarks(recipeInput, false)
        : spec.recipe === "area"
          ? lineMarks(recipeInput, true)
          : spec.recipe === "scatter"
            ? scatterMarks(recipeInput)
            : heatmapMarks(recipeInput);

  primitives.push(...output.primitives);
  Object.assign(anchors, output.anchors);
  anchors["plot"] = axis.area;

  return { primitives, summary, plot: axis.area, anchors };
}

/** Section renderer for `chart` sections: heading + evidence + the plot. */
export function renderChartSection(
  section: ChartSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const result = renderChart(context, content, section.chart, { id: section.id });
  return { primitives: [...primitives, ...result.primitives], anchors: result.anchors };
}

/** Section renderers owned by this module. */
export const CHART_RENDERER: SectionRenderer<ChartSection> = renderChartSection as SectionRenderer<ChartSection>;
