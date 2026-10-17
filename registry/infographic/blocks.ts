/**
 * Information blocks: the content-bearing renderers that most infographic
 * templates are assembled from.
 *
 * These map 1:1 onto the docs/12 §A inventory — `hero-statistic`,
 * `metric-card`, `insight-callout`, `numbered-step`, `comparison-column` and the
 * plain prose block — and are deliberately **template-agnostic**: a template
 * decides *where* a block goes, never *how* the block reads. That split is what
 * lets the same source render as an editorial spread, a bento summary or a
 * carousel panel without the content code changing.
 *
 * Three invariants run through every block:
 * - **Meaning is never color-only.** A change carries an explicit sign and a
 *   direction word; an emphasis treatment carries a text marker; a state is
 *   stated in words as well as weight.
 * - **Unknown is not zero.** `null`/absent comparison values render as an
 *   explicit em dash and raise a diagnostic; they never become `0`.
 * - **Units are declared once.** A percentage-point change is never reported as
 *   a percent-of-percent (docs/12 §8 "mixed units").
 *
 * Everything here emits IR primitives only — no DOM, no strings of markup — so
 * the preview and the SVG exporter necessarily agree.
 */

import {
  chipPrimitives,
  evidenceNote,
  headingBlock,
  insetRect,
  layoutText,
  layoutTextForRole,
  labelCase,
  linePrimitive,
  rectBottom,
  rectPrimitive,
  rectRight,
  round,
  lineHeightForRole,
  typeStyle,
  surfacePrimitives,
  splitColumns,
} from "./primitives";
import { formatNumber, formatPercent, measureText } from "./measure";
import type {
  ComparisonSection,
  InfographicPrimitive,
  QuoteSection,
  RectInfo,
  RenderResult,
  SectionKind,
  SectionRenderContext,
  SectionRenderer,
  StatisticSection,
  TextSection,
} from "./types";

/** Units that already *are* a proportion; a change in these is in points. */
const PERCENT_LIKE_UNITS = new Set(["%", "percent", "pct", "percentage", "pp"]);

export function isPercentLikeUnit(unit: string | undefined): boolean {
  return unit !== undefined && PERCENT_LIKE_UNITS.has(unit.trim().toLocaleLowerCase("en-US"));
}

interface SectionChrome {
  primitives: InfographicPrimitive[];
  /** Region left for the section body after heading and evidence footnote. */
  content: RectInfo;
  style: SectionRenderContext["style"];
}

/**
 * Reserve the shared chrome around a section body: an optional heading (with the
 * art direction's accent treatment) at the top and the evidence footnote pinned
 * to the bottom. Returns the remaining body region so blocks never have to guess
 * how much room the chrome took.
 */
export function sectionChrome(
  section: { id: string; heading?: string; evidenceRefs?: string[] },
  frame: RectInfo,
  context: SectionRenderContext,
  options?: { typeRole?: "h2" | "h3"; accent?: boolean; eyebrow?: string }
): SectionChrome {
  const style = context.style;
  const primitives: InfographicPrimitive[] = [];
  let cursor = frame.y;

  if (section.heading) {
    const heading = headingBlock(
      { x: frame.x, y: cursor, width: frame.width, height: frame.height },
      section.heading,
      style,
      context,
      {
        typeRole: options?.typeRole ?? "h3",
        accent: options?.accent ?? false,
        eyebrow: options?.eyebrow,
        role: "heading",
        semanticId: section.id,
      }
    );
    primitives.push(...heading.primitives);
    cursor += heading.height + style.spacing[2];
  }

  let bottom = rectBottom(frame);
  const note = evidenceNote({ x: frame.x, y: 0, width: frame.width, height: 0 }, section.evidenceRefs ?? [], style, context);
  if (note) {
    const noteHeight = note.height;
    note.y = round(bottom - noteHeight);
    primitives.push(note);
    bottom -= noteHeight + style.spacing[1];
  }

  const content: RectInfo = {
    x: frame.x,
    y: round(cursor),
    width: frame.width,
    height: round(Math.max(0, bottom - cursor)),
  };
  return { primitives, content, style };
}

/** Report a body that exceeds its frame, with the px overflow the QA gates want. */
function reportOverflow(
  context: SectionRenderContext,
  sectionId: string,
  overflow: number,
  message: string
): void {
  context.report({
    code: "section-overflow",
    severity: "error",
    message,
    sectionId,
    overflow: round(overflow),
  });
}

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

/** Plain prose: paragraphs plus optional bullets, flowing at the body rhythm. */
export function renderTextSection(
  section: TextSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const style = context.style;
  const gap = style.spacing[style.density === "dense" ? 1 : 2];
  let cursor = content.y;

  for (const paragraph of section.paragraphs) {
    const block = layoutTextForRole(
      {
        text: paragraph,
        box: { x: content.x, y: cursor, width: Math.min(content.width, style.measureMax), height: 0 },
        typeRole: "body",
        color: style.color.ink,
        role: "paragraph",
        semanticId: `${section.id}:paragraph`,
      },
      context
    );
    primitives.push(block.primitive);
    cursor += block.height + gap;
  }

  if (section.bullets && section.bullets.length > 0) {
    const markerSize = style.stroke.strong * 2;
    const markerGap = style.spacing[1];
    const bulletWidth = Math.min(content.width, style.measureMax);
    for (const bullet of section.bullets) {
      const text = layoutTextForRole(
        {
          text: bullet,
          box: {
            x: content.x + markerSize + markerGap,
            y: cursor,
            width: bulletWidth - markerSize - markerGap,
            height: 0,
          },
          typeRole: "body",
          color: style.color.ink,
          role: "bullet",
          semanticId: `${section.id}:bullet`,
        },
        context
      );
      primitives.push(
        rectPrimitive(
          {
            x: content.x,
            y: round(cursor + text.primitive.fontSize * 0.45),
            width: markerSize,
            height: markerSize,
          },
          { fill: style.color.accent, radius: style.radius.pill, role: "bullet-marker" },
          context
        )
      );
      primitives.push(text.primitive);
      cursor += text.height + style.spacing[1];
    }
  }

  const used = round(cursor - content.y - gap);
  if (used > content.height) {
    reportOverflow(
      context,
      section.id,
      used - content.height,
      `Text section "${section.id}" needs ${used}px but has ${round(content.height)}px.`
    );
  }

  return { primitives, anchors: { [section.id]: content } };
}

// ---------------------------------------------------------------------------
// statistic (hero-statistic)
// ---------------------------------------------------------------------------

/**
 * The hero statistic. Reading order is value → measure → context → change, so a
 * glance lands on the number and the following lines explain it.
 *
 * The change line is where data integrity is easiest to lose: a statistic
 * measured in percent changes in **percentage points**, never in
 * percent-of-percent. When the unit is percent-like, this renderer reports the
 * absolute difference in `pp`; otherwise it reports the relative change. Either
 * way the sentence names the baseline it is comparing against.
 */
export function renderStatisticSection(
  section: StatisticSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const style = context.style;
  const hero = (section.importance ?? "supporting") === "hero";
  const { primitives, content } = sectionChrome(section, frame, context, { accent: !hero, typeRole: "h3" });
  const language = context.language;

  const valueRole = hero ? "statHuge" : "statLarge";
  const valueText = formatNumber(section.value, {
    precision: section.precision ?? 0,
    language,
  });
  const value = layoutTextForRole(
    {
      text: valueText,
      box: { x: content.x, y: content.y, width: content.width, height: 0 },
      typeRole: valueRole,
      color: style.color.ink,
      role: "stat-value",
      semanticId: section.id,
      maxLines: 1,
      shrink: { floor: style.type.statLarge * 0.6 },
    },
    context
  );
  primitives.push(value.primitive);
  let cursor = content.y + value.height;

  // Unit: a smaller suffix beside the value when it fits, otherwise the next line.
  if (section.unit) {
    const unitStyle = typeStyle(style, "h2");
    const unitWidth = measureText(section.unit, unitStyle);
    const unit = layoutText(
      {
        text: section.unit,
        box: { x: content.x, y: 0, width: Math.max(unitWidth, 1), height: 0 },
        style: unitStyle,
        lineHeight: lineHeightForRole(style, "h2"),
        color: style.color.inkMuted,
        role: "stat-unit",
        semanticId: `${section.id}:unit`,
        maxLines: 1,
      },
      context
    );
    const gap = style.spacing[0];
    const valueWidth = measureText(valueText, {
      fontSize: value.primitive.fontSize,
      family: value.primitive.family,
      letterSpacing: value.primitive.letterSpacing,
    });
    const inline = valueWidth + gap + unitWidth <= content.width + 0.5;
    if (inline) {
      unit.primitive.x = round(content.x + valueWidth + gap);
      unit.primitive.y = round(content.y + value.height - unit.height);
    } else {
      unit.primitive.x = content.x;
      unit.primitive.y = round(cursor + style.spacing[0]);
      cursor += unit.height + style.spacing[1];
    }
    primitives.push(unit.primitive);
  }

  cursor += style.spacing[1];

  const measureLabel = layoutTextForRole(
    {
      text: labelCase(style, section.measureLabel),
      box: { x: content.x, y: round(cursor), width: Math.min(content.width, style.measureMax), height: 0 },
      typeRole: "label",
      color: style.color.accent,
      role: "stat-measure",
      semanticId: `${section.id}:measure`,
    },
    context
  );
  primitives.push(measureLabel.primitive);

  const contextParts: string[] = [];
  if (section.denominator !== undefined && Number.isFinite(section.denominator)) {
    contextParts.push(`of ${formatNumber(section.denominator, { language })}`);
  }
  if (section.period) contextParts.push(section.period);

  // The measure label and its context share one line whenever they fit, because
  // a statistic card that stacks four short lines is mostly whitespace between
  // fragments. Going to two lines is the fallback, not the default.
  let afterMeasure = cursor + measureLabel.height + style.spacing[1];
  if (contextParts.length > 0) {
    const contextText = contextParts.join(" · ");
    const captionStyle = typeStyle(style, "caption");
    const measureWidth = measureText(labelCase(style, section.measureLabel), typeStyle(style, "label"));
    const contextWidth = measureText(contextText, captionStyle);
    const inline = measureWidth + style.spacing[2] + contextWidth <= content.width + 0.5;
    const lineStep = lineHeightForRole(style, "caption") * captionStyle.fontSize;
    const note = layoutText(
      {
        text: contextText,
        box: inline
          ? {
              x: round(content.x + measureWidth + style.spacing[2]),
              y: round(cursor + measureLabel.height - lineStep),
              width: contextWidth,
              height: 0,
            }
          : { x: content.x, y: round(afterMeasure), width: Math.min(content.width, style.measureMax), height: 0 },
        style: captionStyle,
        lineHeight: lineHeightForRole(style, "caption"),
        color: style.color.inkMuted,
        role: "stat-context",
        semanticId: `${section.id}:context`,
      },
      context
    );
    primitives.push(note.primitive);
    if (!inline) afterMeasure = round(afterMeasure + note.height + style.spacing[1]);
  }
  cursor = afterMeasure;

  if (section.baseline !== undefined && Number.isFinite(section.baseline)) {
    const baseline = section.baseline;
    const delta = section.value - baseline;
    const percentLike = isPercentLikeUnit(section.unit);
    const direction = delta === 0 ? "no change" : delta > 0 ? "increase" : "decrease";
    const magnitude = percentLike
      ? `${formatNumber(Math.abs(delta), { precision: section.precision ?? 1, language })} pp`
      : Number.isFinite(baseline) && baseline !== 0
        ? formatPercent(Math.abs(delta / baseline), 1, language)
        : `${formatNumber(Math.abs(delta), { precision: section.precision ?? 0, language })}`;
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
    const baselineText = `${formatNumber(baseline, { precision: section.precision ?? 0, language })}${section.unit ?? ""}`;
    const change = layoutTextForRole(
      {
        text: `${sign}${magnitude} ${direction} vs ${baselineText} baseline`,
        box: { x: content.x, y: round(cursor), width: Math.min(content.width, style.measureMax), height: 0 },
        typeRole: "body",
        color: delta === 0 ? style.color.inkMuted : delta > 0 ? style.color.positive : style.color.negative,
        role: "stat-change",
        semanticId: `${section.id}:change:${percentLike ? "points" : "percent"}`,
      },
      context
    );
    primitives.push(change.primitive);
    cursor += change.height;
  }

  const used = round(cursor - content.y);
  if (used > content.height) {
    reportOverflow(
      context,
      section.id,
      used - content.height,
      `Statistic "${section.id}" needs ${used}px but has ${round(content.height)}px.`
    );
  }

  return {
    primitives,
    anchors: {
      [section.id]: { x: content.x, y: content.y, width: content.width, height: round(Math.max(value.height, used)) },
    },
  };
}

// ---------------------------------------------------------------------------
// comparison (comparison-column)
// ---------------------------------------------------------------------------

const UNKNOWN_GLYPH = "—";

/** Format one comparison cell. `null`/absent is unknown and stays unknown. */
function comparisonCellText(value: string | number | null | undefined, language: string): string {
  if (value === null || value === undefined) return UNKNOWN_GLYPH;
  if (typeof value === "number") {
    return Number.isFinite(value) ? formatNumber(value, { language }) : UNKNOWN_GLYPH;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? UNKNOWN_GLYPH : trimmed;
}

function isUnknown(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim().length === 0);
}

/**
 * Side-by-side comparison with **synchronized row alignment**: every criterion
 * gets one row whose height is the tallest cell in that row, so a reader can
 * scan horizontally and compare like with like. Without that, differing value
 * lengths would silently break the comparison the block exists to enable.
 *
 * Unknown values are rendered as an explicit {@link UNKNOWN_GLYPH} and reported,
 * because a blank cell reads as "zero" to most audiences.
 */
export function renderComparisonSection(
  section: ComparisonSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const style = context.style;
  const { primitives, content } = sectionChrome(section, frame, context, { accent: true });
  const anchors: Record<string, RectInfo> = {};
  const rowGap = style.spacing[1];
  const columnGap = style.spacing[2];

  const labelColumnWeight = 1.1;
  const weights = [labelColumnWeight, ...section.cases.map(() => 1)];
  const gridColumns = splitColumns(content, weights, columnGap);
  const labelColumn = gridColumns[0];
  const caseColumns = gridColumns.slice(1);

  if (section.cases.length === 0) {
    context.report({
      code: "comparison-empty",
      severity: "error",
      message: `Comparison "${section.id}" has no cases to compare.`,
      sectionId: section.id,
    });
    return { primitives, anchors };
  }

  const headerStyle = typeStyle(style, "label", { family: style.font.heading });
  const cellStyle = typeStyle(style, "body");
  const unitSuffix = section.unit ? ` (${section.unit})` : "";

  // Header row: case labels, measured first so rows can start beneath them.
  let headerHeight = 0;
  const headerPrimitives: InfographicPrimitive[] = [];
  for (const [index, item] of section.cases.entries()) {
    const box = caseColumns[index];
    const label = layoutText(
      {
        text: labelCase(style, `${item.label}${unitSuffix}`),
        box: { x: box.x, y: content.y, width: box.width, height: 0 },
        style: headerStyle,
        color: item.emphasis ? style.color.accent : style.color.ink,
        role: "comparison-case-label",
        semanticId: item.id,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    headerPrimitives.push(label.primitive);
    headerHeight = Math.max(headerHeight, label.height);
  }

  const markHeader = layoutText(
    {
      text: labelCase(style, "Dimension"),
      box: { x: labelColumn.x, y: content.y, width: labelColumn.width, height: 0 },
      style: headerStyle,
      color: style.color.inkSubtle,
      role: "comparison-corner-label",
      lineHeight: style.lineHeight.annotation,
    },
    context
  );
  headerPrimitives.push(markHeader.primitive);
  headerHeight = Math.max(headerHeight, markHeader.height);

  // Emphasis panels are drawn behind the header and all rows, so compute the
  // full column extent first by measuring every row.
  const rowLayouts = section.criteria.map((criterion) => {
    const cells = section.cases.map((item) => {
      const raw = item.values[criterion];
      const text = comparisonCellText(raw, context.language);
      const unknown = isUnknown(raw);
      if (unknown) {
        context.report({
          code: "comparison-unknown",
          severity: "warning",
          message: `Comparison "${section.id}" has no value for "${item.label}" / "${criterion}"; rendered as unknown rather than zero.`,
          sectionId: section.id,
          targetId: item.id,
          path: `/sections/${section.id}/cases/${item.id}/values/${criterion}`,
        });
      }
      return { item, text, unknown };
    });
    return { criterion, cells };
  });

  let cursor = content.y + headerHeight;

  for (const row of rowLayouts) {
    let rowHeight = 0;
    const measured = row.cells.map((cell, index) => {
      const box = caseColumns[index];
      const text = layoutText(
        {
          text: cell.text,
          box: { x: box.x, y: cursor, width: box.width, height: 0 },
          style: cellStyle,
          color: cell.unknown ? style.color.inkSubtle : style.color.ink,
          role: "comparison-value",
          semanticId: `${cell.item.id}:${row.criterion}`,
          lineHeight: style.lineHeight.body,
        },
        context
      );
      rowHeight = Math.max(rowHeight, text.height);
      return { ...cell, text: text.primitive, index };
    });

    const label = layoutText(
      {
        text: row.criterion,
        box: { x: labelColumn.x, y: cursor, width: labelColumn.width, height: 0 },
        style: headerStyle,
        color: style.color.inkMuted,
        role: "comparison-criterion-label",
        semanticId: row.criterion,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    rowHeight = Math.max(rowHeight, label.height);

    primitives.push(label.primitive);
    measured.forEach((cell) => primitives.push(cell.text));
    primitives.push(
      linePrimitive(
        { x: content.x, y: round(cursor + rowHeight + rowGap / 2) },
        { x: rectRight(content), y: round(cursor + rowHeight + rowGap / 2) },
        { stroke: style.color.grid, strokeWidth: style.stroke.hairline, role: "comparison-row-rule" },
        context
      )
    );
    cursor += rowHeight + rowGap;
  }

  // Emphasis: a panel per emphasised case plus an explicit textual marker, so
  // the emphasis is not communicated by fill alone.
  const emphasised = section.cases.filter((item) => item.emphasis);
  const panels: InfographicPrimitive[] = [];
  section.cases.forEach((item, index) => {
    const box = caseColumns[index];
    const columnBox: RectInfo = {
      x: round(box.x - columnGap / 2),
      y: round(content.y - style.spacing[1]),
      width: round(box.width + columnGap),
      height: round(cursor - content.y + style.spacing[1] - rowGap),
    };
    anchors[item.id] = columnBox;
    if (item.emphasis) {
      panels.push(
        rectPrimitive(
          { ...columnBox },
          { fill: style.color.surfaceAlt, radius: style.radius.md, role: "comparison-emphasis-panel" },
          context
        )
      );
      panels.push(
        linePrimitive(
          { x: columnBox.x, y: columnBox.y },
          { x: rectRight(columnBox), y: columnBox.y },
          { stroke: style.color.accent, strokeWidth: style.stroke.strong, role: "comparison-emphasis-rule" },
          context
        )
      );
    }
  });

  const output = [...panels, ...primitives];

  if (emphasised.length > 0) {
    const marker = layoutText(
      {
        text: `Highlighted: ${emphasised.map((item) => item.label).join(", ")}`,
        box: { x: content.x, y: round(cursor + style.spacing[1]), width: content.width, height: 0 },
        style: typeStyle(style, "caption"),
        color: style.color.inkMuted,
        role: "comparison-emphasis-note",
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    output.push(marker.primitive);
  }

  const used = round(cursor - content.y);
  if (used > content.height) {
    reportOverflow(
      context,
      section.id,
      used - content.height,
      `Comparison "${section.id}" needs ${used}px but has ${round(content.height)}px; reduce rows or paginate.`
    );
  }

  return { primitives: [...headerPrimitives, ...output], anchors };
}

// ---------------------------------------------------------------------------
// quote
// ---------------------------------------------------------------------------

/** Pull quote with attribution placement options. */
export function renderQuoteSection(
  section: QuoteSection,
  frame: RectInfo,
  context: SectionRenderContext
): RenderResult {
  const style = context.style;
  const { primitives, content } = sectionChrome(section, frame, context, { accent: false });
  const placement = section.data.attributionPlacement ?? "below";
  const attributionStyle = typeStyle(style, "label");

  const attributionWidth = Math.min(
    content.width,
    measureText(section.data.attribution, attributionStyle) + style.spacing[2]
  );
  const quoteBox: RectInfo =
    placement === "right"
      ? {
          x: content.x,
          y: content.y,
          width: Math.max(0, content.width - attributionWidth - style.spacing[2]),
          height: content.height,
        }
      : content;

  const quote = layoutTextForRole(
    {
      text: section.data.quote,
      box: { x: quoteBox.x, y: quoteBox.y, width: Math.min(quoteBox.width, style.measureMax), height: 0 },
      typeRole: "h2",
      color: style.color.ink,
      role: "quote-text",
      semanticId: section.id,
    },
    context
  );
  primitives.push(quote.primitive);

  if (placement === "inline") {
    const lastLine = quote.wrap.lines[quote.wrap.lines.length - 1] ?? "";
    const lastLineWidth = measureText(lastLine, {
      fontSize: quote.primitive.fontSize,
      family: quote.primitive.family,
      letterSpacing: quote.primitive.letterSpacing,
    });
    const attributionText = `— ${section.data.attribution}`;
    const attributionWidth = measureText(attributionText, attributionStyle);
    const fitsInline = lastLineWidth + style.spacing[1] + attributionWidth <= quoteBox.width;
    const attribution = layoutText(
      {
        text: attributionText,
        box: {
          x: fitsInline ? round(quoteBox.x + lastLineWidth + style.spacing[1]) : quoteBox.x,
          y: fitsInline
            ? round(quoteBox.y + quote.height - style.type.label * style.lineHeight.annotation)
            : round(quoteBox.y + quote.height + style.spacing[0]),
          width: quoteBox.width,
          height: 0,
        },
        style: attributionStyle,
        color: style.color.inkMuted,
        role: "quote-attribution",
        semanticId: `${section.id}:attribution`,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    primitives.push(attribution.primitive);
  } else if (placement === "right") {
    const attribution = layoutText(
      {
        text: section.data.attribution,
        box: { x: round(rectRight(quoteBox) + style.spacing[2]), y: content.y, width: attributionWidth, height: 0 },
        style: attributionStyle,
        color: style.color.inkMuted,
        role: "quote-attribution",
        semanticId: `${section.id}:attribution`,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    primitives.push(attribution.primitive);
  } else {
    const attribution = layoutText(
      {
        text: `— ${section.data.attribution}`,
        box: { x: quoteBox.x, y: round(quoteBox.y + quote.height + style.spacing[2]), width: quoteBox.width, height: 0 },
        style: attributionStyle,
        color: style.color.inkMuted,
        role: "quote-attribution",
        semanticId: `${section.id}:attribution`,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    primitives.push(attribution.primitive);
  }

  return { primitives, anchors: { [section.id]: { x: content.x, y: content.y, width: content.width, height: Math.min(content.height, quote.height) } } };
}

// ---------------------------------------------------------------------------
// Reusable blocks (used by templates and by consumers directly)
// ---------------------------------------------------------------------------

export interface MetricCardSpec {
  id: string;
  label: string;
  value: number;
  unit?: string;
  change?: number;
  /** How `change` should be read. `"points"` prints percentage points. */
  changeKind?: "absolute" | "percent" | "points";
  period?: string;
  baseline?: number;
  precision?: number;
  /** Optional raw series for a trend sparkline; needs ≥ 2 finite points. */
  sparkline?: number[];
  evidenceRefs?: string[];
  semanticId?: string;
}

/** Deterministic sparkline polyline across a small box. */
function sparklinePrimitives(
  box: RectInfo,
  values: readonly number[],
  context: SectionRenderContext
): InfographicPrimitive[] {
  const style = context.style;
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) return [];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const step = box.width / (finite.length - 1);
  const points: Array<[number, number]> = finite.map((value, index) => [
    box.x + index * step,
    box.y + box.height - ((value - min) / span) * box.height,
  ]);
  // The polyline carries the trend shape; the dots mark the actual observations,
  // so a reader can tell a measured point from the line drawn between them.
  const primitives: InfographicPrimitive[] = [
    {
      kind: "polyline",
      id: context.id("sparkline"),
      role: "sparkline",
      points: points.map(([x, y]) => [round(x), round(y)] as [number, number]),
      fill: "none",
      stroke: style.color.accent,
      strokeWidth: style.stroke.rule,
    },
  ];
  points.forEach(([x, y]) => {
    primitives.push(
      rectPrimitive(
        {
          x: round(x - style.stroke.hairline),
          y: round(y - style.stroke.hairline),
          width: style.stroke.strong,
          height: style.stroke.strong,
        },
        { fill: style.color.accent, radius: style.radius.pill, role: "sparkline-point" },
        context
      )
    );
  });
  return primitives;
}

/**
 * A metric card: one measurement, its change, its reference period and an
 * optional trend. Card-level chrome (fill/border/shadow) follows the art
 * direction's `surface` flags, so the same block reads flat under `editorial`
 * and panelised under `minimal-technical`.
 */
export function metricCardBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: MetricCardSpec
): RenderResult {
  const style = context.style;
  const padding = style.spacing[2];
  const inner = insetRect(frame, padding);
  const primitives: InfographicPrimitive[] = [
    ...surfacePrimitives(frame, style, context, { role: "metric-card-surface", semanticId: spec.semanticId ?? spec.id }),
  ];

  const label = layoutTextForRole(
    {
      text: labelCase(style, spec.label),
      box: { x: inner.x, y: inner.y, width: inner.width, height: 0 },
      typeRole: "label",
      color: style.color.inkMuted,
      role: "metric-label",
      semanticId: `${spec.id}:label`,
    },
    context
  );
  primitives.push(label.primitive);

  const valueText = formatNumber(spec.value, { precision: spec.precision ?? 0, language: context.language });
  const value = layoutTextForRole(
    {
      text: spec.unit ? `${valueText}${isPercentLikeUnit(spec.unit) ? spec.unit : ` ${spec.unit}`}` : valueText,
      box: { x: inner.x, y: round(inner.y + label.height + style.spacing[0]), width: inner.width, height: 0 },
      typeRole: "statLarge",
      color: style.color.ink,
      role: "metric-value",
      semanticId: spec.id,
      maxLines: 1,
      shrink: { floor: style.type.h3 },
    },
    context
  );
  primitives.push(value.primitive);
  let cursor = value.primitive.y + value.height + style.spacing[1];

  if (spec.change !== undefined && Number.isFinite(spec.change)) {
    const kind = spec.changeKind ?? (isPercentLikeUnit(spec.unit) ? "points" : "absolute");
    const magnitude =
      kind === "percent"
        ? formatPercent(Math.abs(spec.change), 1, context.language)
        : `${formatNumber(Math.abs(spec.change), { precision: spec.precision ?? 1, language: context.language })}${kind === "points" ? " pp" : ""}`;
    const sign = spec.change > 0 ? "+" : spec.change < 0 ? "−" : "±";
    const direction = spec.change === 0 ? "no change" : spec.change > 0 ? "up" : "down";
    const change = layoutTextForRole(
      {
        text: `${sign}${magnitude} ${direction}`,
        box: { x: inner.x, y: round(cursor), width: inner.width, height: 0 },
        typeRole: "body",
        color: spec.change === 0 ? style.color.inkMuted : spec.change > 0 ? style.color.positive : style.color.negative,
        role: "metric-change",
        semanticId: `${spec.id}:change:${kind}`,
        maxLines: 1,
      },
      context
    );
    primitives.push(change.primitive);
    cursor += change.height + style.spacing[0];
  }

  if (spec.period) {
    const period = layoutText(
      {
        text: spec.period,
        box: { x: inner.x, y: round(cursor), width: inner.width, height: 0 },
        style: typeStyle(style, "caption"),
        color: style.color.inkSubtle,
        role: "metric-period",
        semanticId: `${spec.id}:period`,
        lineHeight: style.lineHeight.annotation,
      },
      context
    );
    primitives.push(period.primitive);
    cursor += period.height + style.spacing[0];
  }

  if (spec.sparkline && spec.sparkline.length > 0) {
    const finiteCount = spec.sparkline.filter((value) => Number.isFinite(value)).length;
    if (finiteCount < 2) {
      context.report({
        code: "sparkline-insufficient-data",
        severity: "warning",
        message: `Metric "${spec.id}" has ${finiteCount} usable sparkline point(s); a trend needs at least 2. The value is still shown.`,
        targetId: spec.id,
      });
    } else {
      const chartHeight = Math.min(style.spacing[5], Math.max(style.spacing[3], inner.height - (cursor - inner.y) - style.spacing[1]));
      if (chartHeight > style.spacing[2]) {
        const chartBox: RectInfo = { x: inner.x, y: round(cursor), width: inner.width, height: round(chartHeight) };
        primitives.push(...sparklinePrimitives(chartBox, spec.sparkline, context));
      }
    }
  }

  const note = evidenceNote(
    { x: inner.x, y: round(rectBottom(inner) - style.type.caption * style.lineHeight.annotation), width: inner.width, height: 0 },
    spec.evidenceRefs ?? [],
    style,
    context
  );
  if (note) primitives.push(note);

  return {
    primitives,
    anchors: { [spec.id]: { x: inner.x, y: value.primitive.y, width: inner.width, height: value.height } },
  };
}

export interface InsightCalloutSpec {
  id: string;
  claim: string;
  evidenceRefs?: string[];
  emphasis?: "primary" | "secondary";
  /** Explicit citation line when the caller does not use evidence refs. */
  evidenceNoteText?: string;
  semanticId?: string;
}

/**
 * A key claim with its evidence reference. docs/12 is explicit that a callout
 * must never float unlabeled over a data series, so a callout without evidence
 * is rendered *and* reported — the author sees the problem instead of shipping it.
 */
export function insightCalloutBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: InsightCalloutSpec
): RenderResult {
  const style = context.style;
  const emphasis = spec.emphasis ?? "primary";
  const padding = style.spacing[2];
  const inner = insetRect(frame, padding);
  const primitives: InfographicPrimitive[] = [
    ...surfacePrimitives(frame, style, context, {
      role: "callout-surface",
      fill: emphasis === "primary" ? style.color.surfaceAlt : style.color.surface,
      semanticId: spec.semanticId ?? spec.id,
    }),
    rectPrimitive(
      { x: frame.x, y: frame.y, width: style.stroke.strong, height: frame.height },
      { fill: style.color.accent, role: "callout-accent-bar" },
      context
    ),
  ];

  const headline = layoutTextForRole(
    {
      text: labelCase(style, emphasis === "primary" ? "Key insight" : "Note"),
      box: { x: inner.x, y: inner.y, width: inner.width, height: 0 },
      typeRole: "label",
      color: style.color.accent,
      role: "callout-eyebrow",
      semanticId: `${spec.id}:eyebrow`,
    },
    context
  );
  primitives.push(headline.primitive);

  const claim = layoutTextForRole(
    {
      text: spec.claim,
      box: {
        x: inner.x,
        y: round(inner.y + headline.height + style.spacing[1]),
        width: Math.min(inner.width, style.measureMax),
        height: 0,
      },
      typeRole: emphasis === "primary" ? "h3" : "body",
      color: style.color.ink,
      role: "callout-claim",
      semanticId: spec.id,
    },
    context
  );
  primitives.push(claim.primitive);

  const refs = spec.evidenceRefs ?? [];
  const note = refs.length > 0
    ? evidenceNote(
        { x: inner.x, y: round(inner.y + headline.height + claim.height + style.spacing[1] * 2), width: inner.width, height: 0 },
        refs,
        style,
        context
      )
    : spec.evidenceNoteText
      ? layoutText(
          {
            text: spec.evidenceNoteText,
            box: { x: inner.x, y: round(inner.y + headline.height + claim.height + style.spacing[1] * 2), width: inner.width, height: 0 },
            style: typeStyle(style, "caption", { family: style.font.mono }),
            color: style.color.inkSubtle,
            role: "callout-evidence",
            semanticId: `${spec.id}:evidence`,
            lineHeight: style.lineHeight.annotation,
          },
          context
        ).primitive
      : null;

  if (note) primitives.push(note);

  if (refs.length === 0 && !spec.evidenceNoteText) {
    context.report({
      code: "callout-without-evidence",
      severity: "warning",
      message: `Callout "${spec.id}" states a claim with no evidence reference. Add evidenceRefs or evidenceNoteText.`,
      targetId: spec.id,
    });
  }

  return {
    primitives,
    anchors: { [spec.id]: { x: inner.x, y: claim.primitive.y, width: inner.width, height: claim.height } },
  };
}

export type StepState = "default" | "active" | "done" | "optional";

export interface NumberedStepSpec {
  id: string;
  /** 1-based position. Kept explicit so numbering survives reflow and reorder. */
  index: number;
  total: number;
  title: string;
  description?: string;
  state?: StepState;
  /** Draw a card surface behind the step. @default false */
  surface?: boolean;
  semanticId?: string;
}

const STEP_STATE_WORDS: Record<StepState, string | null> = {
  default: null,
  active: "current",
  done: "complete",
  optional: "optional",
};

/**
 * A numbered step. The number is an explicit `index`, never an array position,
 * so numbering stays correct when a template reflows or the author reorders
 * steps (docs/12: "consistent numbering through reflow").
 *
 * The step also exposes `:start` and `:end` anchor keys — small connector port
 * rects at the leading and trailing mid-edges — which is the convention the
 * process-flow visualizer and the annotation pass use to attach lines without
 * re-measuring the block.
 */
export function numberedStepBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  spec: NumberedStepSpec
): RenderResult {
  const style = context.style;
  const state = spec.state ?? "default";
  const padding = style.spacing[1] + style.spacing[0] / 2;
  const primitives: InfographicPrimitive[] = [];

  if (spec.surface) {
    primitives.push(
      ...surfacePrimitives(frame, style, context, { role: "step-surface", semanticId: spec.semanticId ?? spec.id })
    );
  }

  const inner = insetRect(frame, padding);
  const badgeSize = round(Math.max(style.type.label * 1.9, style.spacing[3]));
  const badgeFilled = state === "active" || state === "done";
  const badgeBox: RectInfo = { x: inner.x, y: inner.y, width: badgeSize, height: badgeSize };

  primitives.push(
    rectPrimitive(
      badgeBox,
      {
        fill: badgeFilled ? style.color.accent : "none",
        stroke: badgeFilled ? undefined : style.color.rule,
        strokeWidth: badgeFilled ? undefined : style.stroke.hairline,
        radius: style.radius.pill,
        role: "step-badge",
        semanticId: spec.id,
      },
      context
    )
  );

  const badgeLabel = layoutText(
    {
      text: String(spec.index),
      box: badgeBox,
      style: typeStyle(style, "label", { family: style.font.mono }),
      color: badgeFilled ? style.color.onAccent : style.color.ink,
      role: "step-number",
      semanticId: `${spec.id}:number`,
      align: "center",
      valign: "middle",
      maxLines: 1,
      lineHeight: style.lineHeight.annotation,
    },
    context
  );
  primitives.push(badgeLabel.primitive);

  const textX = round(rectRight(badgeBox) + style.spacing[1]);
  const textWidth = Math.max(0, rectRight(inner) - textX);
  const title = layoutTextForRole(
    {
      text: spec.title,
      box: { x: textX, y: inner.y, width: textWidth, height: 0 },
      typeRole: "h3",
      color: style.color.ink,
      role: "step-title",
      semanticId: `${spec.id}:title`,
    },
    context
  );
  primitives.push(title.primitive);
  let cursor = inner.y + title.height;

  const stateWord = STEP_STATE_WORDS[state];
  const metaText = [`Step ${spec.index} of ${spec.total}`, stateWord].filter(Boolean).join(" · ");
  const meta = layoutText(
    {
      text: metaText,
      box: { x: textX, y: round(cursor + style.spacing[0] / 2), width: textWidth, height: 0 },
      style: typeStyle(style, "caption", { family: style.font.mono }),
      color: style.color.inkSubtle,
      role: "step-meta",
      semanticId: `${spec.id}:meta`,
      lineHeight: style.lineHeight.annotation,
    },
    context
  );
  primitives.push(meta.primitive);
  cursor += meta.height + style.spacing[1];

  if (spec.description) {
    const description = layoutTextForRole(
      {
        text: spec.description,
        box: { x: textX, y: round(cursor), width: textWidth, height: 0 },
        typeRole: "body",
        color: style.color.inkMuted,
        role: "step-description",
        semanticId: `${spec.id}:description`,
      },
      context
    );
    primitives.push(description.primitive);
    cursor += description.height;
  }

  const bodyHeight = round(Math.max(cursor - inner.y, badgeSize));
  return {
    primitives,
    anchors: {
      [spec.id]: { x: inner.x, y: inner.y, width: inner.width, height: bodyHeight },
      [`${spec.id}:start`]: { x: frame.x, y: round(frame.y + frame.height / 2), width: style.stroke.hairline, height: style.stroke.hairline },
      [`${spec.id}:end`]: { x: round(rectRight(frame) - style.stroke.hairline), y: round(frame.y + frame.height / 2), width: style.stroke.hairline, height: style.stroke.hairline },
    },
  };
}

/** A vertical stack of metric cards, used by the bento and summary templates. */
export function metricStackBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  cards: readonly MetricCardSpec[],
  options?: { gap?: number }
): RenderResult {
  const gap = options?.gap ?? context.style.spacing[2];
  const primitives: InfographicPrimitive[] = [];
  const anchors: Record<string, RectInfo> = {};
  if (cards.length === 0) return { primitives, anchors };
  const height = (frame.height - gap * (cards.length - 1)) / cards.length;
  cards.forEach((card, index) => {
    const box: RectInfo = { x: frame.x, y: round(frame.y + index * (height + gap)), width: frame.width, height: round(height) };
    const result = metricCardBlock(context, box, card);
    primitives.push(...result.primitives);
    Object.assign(anchors, result.anchors);
  });
  return { primitives, anchors };
}

/** A row of chips summarizing tags/units; used by headers and footers. */
export function chipRowBlock(
  context: SectionRenderContext,
  frame: RectInfo,
  labels: readonly string[],
  options?: { gap?: number }
): RenderResult {
  const gap = options?.gap ?? context.style.spacing[1];
  const primitives: InfographicPrimitive[] = [];
  let x = frame.x;
  for (const label of labels) {
    if (x >= rectRight(frame)) break;
    const chip = chipPrimitives({ x, y: frame.y, width: rectRight(frame) - x, height: frame.height }, label, context.style, context);
    primitives.push(...chip.primitives);
    x += chip.width + gap;
  }
  return { primitives };
}

/** Everything this module can render as a section. */
export const BLOCK_RENDERERS: Partial<Record<SectionKind, SectionRenderer>> = {
  text: renderTextSection as SectionRenderer,
  statistic: renderStatisticSection as SectionRenderer,
  comparison: renderComparisonSection as SectionRenderer,
  quote: renderQuoteSection as SectionRenderer,
};

/** The section kinds handled by {@link BLOCK_RENDERERS}. */
export const BLOCK_SECTION_KINDS: readonly SectionKind[] = ["text", "statistic", "comparison", "quote"];
