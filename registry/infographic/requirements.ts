/**
 * Content requirements: how much room a section actually needs.
 *
 * The layout engines could pack purely by aesthetic weights, and that is exactly
 * how a beautiful template silently clips a paragraph. `docs/12` §5 requires the
 * opposite order: measure first, then choose a layout policy, then reject — never
 * shrink below a legibility floor and never crop essential copy.
 *
 * This module is the "measure" half of that contract. It answers, before any
 * renderer runs, "what is the smallest frame this section can live in, and what
 * would it prefer?" using the same deterministic text model as the renderers, so
 * a frame that satisfies a requirement is a frame that fits.
 *
 * The estimates are deliberately conservative: rounding up costs whitespace,
 * rounding down costs a broken panel.
 */
import { lineMetrics, measureText, wrapText } from "./measure";
import { diagramLayers } from "./visualizers";
import type {
  ChartSection,
  ComparisonSection,
  DiagramSection,
  HierarchyNode,
  HierarchySection,
  InfographicSection,
  ProcessSection,
  QuoteSection,
  RectInfo,
  ResolvedStyle,
  StatisticSection,
  TextSection,
  TimelineSection,
} from "./types";

/** Two numbers per section: the floor and the comfortable size. */
export interface SectionRequirement {
  /** Below this the section cannot be rendered legibly. */
  minHeight: number;
  /** Size at which the section looks composed rather than merely fitting. */
  preferredHeight: number;
}

function step(fontSize: number, lineHeight: number): number {
  return lineMetrics(fontSize, lineHeight).lineStep;
}

/**
 * Chrome reserved around a section body: the heading block and the evidence
 * footnote. Mirrors `sectionChrome` in `blocks.ts`; if that changes, this must
 * change with it, which is why the constants live here rather than being inlined
 * at each call site.
 */
export function sectionChromeHeight(
  style: ResolvedStyle,
  options: { heading?: boolean; evidence?: boolean } = {}
): number {
  let height = 0;
  if (options.heading) height += step(style.type.h3, style.lineHeight.heading) + style.spacing[2];
  if (options.evidence) height += step(style.type.caption, style.lineHeight.body) + style.spacing[1];
  return height;
}

/** Lines a paragraph needs at a given measure, using the shared text model. */
function textLines(text: string, width: number, fontSize: number, family: string, style: ResolvedStyle): number {
  if (text.trim().length === 0) return 0;
  return wrapText(text, {
    text,
    maxWidth: Math.max(width, 1),
    fontSize,
    family,
    lineHeight: style.lineHeight.body,
  }).lines.length;
}

function measureOk(width: number, style: ResolvedStyle): number {
  const capped = style.measureMax > 0 ? Math.min(width, style.measureMax) : width;
  return Math.max(capped, 1);
}

function textRequirement(section: TextSection, width: number, style: ResolvedStyle): SectionRequirement {
  const body = style.type.body;
  const bodyStep = step(body, style.lineHeight.body);
  const measure = measureOk(width, style);
  const gap = style.density === "dense" ? style.spacing[1] : style.spacing[2];
  let lines = 0;
  let blocks = 0;
  for (const paragraph of section.paragraphs) {
    const count = textLines(paragraph, measure, body, style.font.body, style);
    if (count === 0) continue;
    lines += count;
    blocks += 1;
  }
  if (section.bullets?.length) {
    // Bullets hang under an accent marker, so they get a slightly narrower
    // measure than the paragraph they follow.
    for (const bullet of section.bullets) {
      lines += textLines(bullet, measure - style.spacing[3], body, style.font.body, style);
      blocks += 1;
    }
  }
  if (blocks === 0) return { minHeight: bodyStep, preferredHeight: bodyStep * 2 };
  const height = lines * bodyStep + (blocks - 1) * gap;
  return { minHeight: Math.round(height), preferredHeight: Math.round(height * 1.18 + gap) };
}

function statisticRequirement(section: StatisticSection, style: ResolvedStyle): SectionRequirement {
  const hero = (section.importance ?? "supporting") === "hero";
  const valueRole = hero ? "statHuge" : "statLarge";
  const preferredValueStep = step(style.type[valueRole], style.lineHeight.display);
  // The value may shrink; the floor is the legibility floor the block enforces.
  const floorSize = Math.max(style.type.statLarge * 0.6, style.type.h2);
  const minValueStep = step(floorSize, style.lineHeight.display);
  const metaStep = step(style.type.label, style.lineHeight.body);
  const changeStep =
    section.baseline !== undefined && Number.isFinite(section.baseline)
      ? step(style.type.body, style.lineHeight.body)
      : 0;
  const min = Math.round(minValueStep + metaStep + changeStep + style.spacing[1]);
  return {
    minHeight: min,
    preferredHeight: Math.round(preferredValueStep + metaStep + changeStep + style.spacing[2]),
  };
}

function comparisonRequirement(section: ComparisonSection, width: number, style: ResolvedStyle): SectionRequirement {
  const headerStep = step(style.type.h3, style.lineHeight.body);
  const cell = style.type.body;
  const cellStep = step(cell, style.lineHeight.body);
  const caseCount = Math.max(section.cases.length, 1);
  const criterionWidth = Math.max(width / (caseCount + 1), 1) - style.spacing[2] * 2;
  // A row is as tall as its tallest cell; two lines per cell is the realistic
  // default for numeric or short phrase values at these widths.
  const cellLines = criterionWidth < measureText("0000000", { fontSize: cell, family: style.font.body }) ? 2 : 1;
  const rowHeight = Math.max(cellStep * cellLines + style.spacing[2], style.spacing[5]);
  const rows = Math.max(section.criteria.length, 1);
  const height = Math.round(headerStep + style.spacing[2] + rows * rowHeight + style.spacing[2]);
  return { minHeight: height, preferredHeight: Math.round(height * 1.2) };
}

function chartRequirement(section: ChartSection, style: ResolvedStyle): SectionRequirement {
  const captionStep = step(style.type.caption, style.lineHeight.body);
  const captions = 1 + (section.chart.sourceNote ? 1 : 0) + (section.chart.missingPolicy && section.chart.missingPolicy !== "gap" ? 1 : 0);
  const legend = section.chart.series.length > 1 ? step(style.type.caption, style.lineHeight.body) + style.spacing[2] : 0;
  const axis = step(style.type.caption, style.lineHeight.body) + style.spacing[2];
  const plot = 140;
  const min = Math.round(plot + axis + legend + captions * captionStep + style.spacing[2]);
  return { minHeight: min, preferredHeight: Math.round(min + 120) };
}

function processRequirement(section: ProcessSection, width: number, style: ResolvedStyle): SectionRequirement {
  const badge = style.spacing[5];
  const titleStep = step(style.type.h3, style.lineHeight.body);
  const bodyStep = step(style.type.body, style.lineHeight.body);
  const metaStep = step(style.type.caption, style.lineHeight.body);
  const descriptions = section.steps.filter((entry) => entry.description).length;
  const stepHeight = Math.round(
    badge + style.spacing[2] + titleStep + (descriptions > 0 ? bodyStep * 2 : 0) + metaStep + style.spacing[2]
  );
  const vertical = section.layout === "vertical" || width < style.spacing[6] * 6;
  if (vertical) {
    const height = section.steps.length * stepHeight + Math.max(0, section.steps.length - 1) * style.spacing[3];
    return { minHeight: Math.round(height), preferredHeight: Math.round(height * 1.25) };
  }
  // Horizontal wraps: assume two rows are needed for anything above three steps
  // at a comfortable step width.
  const minStepWidth = Math.max(style.spacing[6], style.type.h3 * 8);
  const perRow = Math.max(1, Math.floor((width + style.spacing[3]) / (minStepWidth + style.spacing[3])));
  const rows = Math.ceil(section.steps.length / perRow);
  const height = rows * stepHeight + Math.max(0, rows - 1) * style.spacing[4];
  return { minHeight: Math.round(height), preferredHeight: Math.round(height * 1.2) };
}

function timelineRequirement(section: TimelineSection, style: ResolvedStyle, width: number): SectionRequirement {
  const labelStep = step(style.type.label, style.lineHeight.body);
  const captionStep = step(style.type.caption, style.lineHeight.body);
  const horizontal = width >= style.spacing[7] * 4;
  const labelTiers = section.milestones.length > 3 ? 2 : 1;
  if (horizontal) {
    const min = Math.round(style.spacing[5] + labelTiers * labelStep + captionStep + style.spacing[4]);
    return { minHeight: min, preferredHeight: Math.round(min + style.spacing[5]) };
  }
  const perMilestone = labelStep + captionStep + style.spacing[3];
  const min = Math.round(section.milestones.length * perMilestone + captionStep + style.spacing[3]);
  return { minHeight: min, preferredHeight: Math.round(min * 1.15) };
}

function hierarchyDepth(node: HierarchyNode): number {
  if (!node.children || node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(hierarchyDepth));
}

function hierarchyRequirement(section: HierarchySection, style: ResolvedStyle): SectionRequirement {
  const nodeHeight = style.spacing[6];
  const rowGap = style.spacing[3];
  const levels = hierarchyDepth(section.root) + 1;
  const min = Math.round(levels * nodeHeight + (levels - 1) * rowGap);
  return { minHeight: min, preferredHeight: Math.round(min * 1.15) };
}

function diagramRequirement(section: DiagramSection, style: ResolvedStyle): SectionRequirement {
  const { maxLayer } = diagramLayers(section.diagram.nodes, section.diagram.edges);
  const nodeHeight = style.spacing[6];
  const gap = style.spacing[3];
  const levels = maxLayer + 1;
  const min = Math.round(levels * nodeHeight + (levels - 1) * gap);
  return { minHeight: min, preferredHeight: Math.round(min * 1.2) };
}

function quoteRequirement(section: QuoteSection, width: number, style: ResolvedStyle): SectionRequirement {
  const quoteStep = step(style.type.h2, style.lineHeight.heading);
  const lines = Math.max(2, textLines(section.data.quote, measureOk(width, style), style.type.h2, style.font.heading, style));
  const attribution = step(style.type.body, style.lineHeight.body);
  const min = Math.round(lines * quoteStep + attribution + style.spacing[2]);
  return { minHeight: min, preferredHeight: Math.round(min * 1.15) };
}

/**
 * Minimum and preferred height for a section at a given frame width.
 *
 * Width matters because wrapping does: the same paragraph needs more height in a
 * narrow column than in a wide one, and that is the whole reason a template
 * cannot pick its own frame sizes from a fixed table.
 */
export function estimateSectionHeight(
  section: InfographicSection,
  width: number,
  style: ResolvedStyle
): SectionRequirement {
  const safeWidth = Math.max(width, style.spacing[4]);
  let body: SectionRequirement;
  switch (section.kind) {
    case "text":
      body = textRequirement(section, safeWidth, style);
      break;
    case "statistic":
      body = statisticRequirement(section, style);
      break;
    case "comparison":
      body = comparisonRequirement(section, safeWidth, style);
      break;
    case "chart":
      body = chartRequirement(section, style);
      break;
    case "process":
      body = processRequirement(section, safeWidth, style);
      break;
    case "timeline":
      body = timelineRequirement(section, style, safeWidth);
      break;
    case "hierarchy":
      body = hierarchyRequirement(section, style);
      break;
    case "diagram":
      body = diagramRequirement(section, style);
      break;
    case "quote":
      body = quoteRequirement(section, safeWidth, style);
      break;
    default:
      body = { minHeight: style.spacing[6], preferredHeight: style.spacing[7] };
  }
  const chrome = sectionChromeHeight(style, {
    heading: Boolean(section.heading),
    evidence: (section.evidenceRefs?.length ?? 0) > 0,
  });
  return {
    minHeight: Math.round(body.minHeight + chrome),
    preferredHeight: Math.round(body.preferredHeight + chrome),
  };
}

/**
 * Split a region into bands sized from what the sections actually need.
 *
 * A plain proportional split ignores floors: a 600px paragraph next to a 100px
 * caption can still hand the paragraph 30% of a short column and crack the copy.
 * This allocator gives every band its minimum first, then shares the leftover
 * space by preference, so generous space goes where it is useful and tight space
 * is tight *everywhere* rather than only where the math happened to fall.
 *
 * When even the minimums do not fit, the bands are scaled down proportionally
 * (never clipped silently) and the renderers report the overflow with px
 * attached — which is what `docs/12` §5 asks for: fail with an actionable
 * diagnostic instead of shrinking text below the legibility floor.
 */
export function allocateBands(
  rect: RectInfo,
  requirements: readonly SectionRequirement[],
  gap: number
): RectInfo[] {
  const count = requirements.length;
  if (count === 0) return [];
  const available = Math.max(0, rect.height - gap * (count - 1));
  const minSum = requirements.reduce((sum, entry) => sum + entry.minHeight, 0);
  const preferredSum = requirements.reduce((sum, entry) => sum + Math.max(entry.preferredHeight, entry.minHeight), 0);

  let heights: number[];
  if (minSum <= available) {
    const slack = available - minSum;
    const weightSum = preferredSum - minSum;
    heights = requirements.map((entry) => {
      const share = weightSum > 0 ? ((entry.preferredHeight - entry.minHeight) / weightSum) * slack : slack / count;
      return entry.minHeight + share;
    });
  } else {
    const factor = minSum > 0 ? available / minSum : 0;
    heights = requirements.map((entry) => entry.minHeight * factor);
  }

  // Integer rounding without drift: the last band absorbs the remainder so the
  // bands always tile the region exactly.
  const bands: RectInfo[] = [];
  let cursor = rect.y;
  let consumed = 0;
  heights.forEach((height, index) => {
    const rounded = index === count - 1 ? Math.max(0, available - consumed) : Math.round(height);
    consumed += rounded;
    bands.push({ x: rect.x, y: round(cursor), width: rect.width, height: rounded });
    cursor += rounded + gap;
  });
  return bands;
}
