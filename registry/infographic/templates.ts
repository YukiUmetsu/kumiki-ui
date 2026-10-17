/**
 * Template catalog — where content shape decides composition.
 *
 * A template is a *layout policy*, not a skin: it reads the semantic source,
 * decides which section plays which role, and hands the engine frames with page
 * numbers attached. Three rules keep them honest (docs/12 §3):
 *
 * 1. **Selection is explainable.** {@link scoreTemplate} returns a score *and*
 *    the violations behind it, so the UI can show why `data-story` lost to
 *    `editorial-overview` instead of silently picking one.
 * 2. **Nothing is silently dropped.** Sections beyond a page's capacity either
 *    continue on the next page (when the output profile paginates) or are
 *    reported in `unplaced`.
 * 3. **Slots are semantic.** A frame is labelled `lead`, `focal`, `supporting-2`
 *    or `takeaway`, which is what keeps a reflow auditable: the same content
 *    lands in the same slot on every page size.
 */

import { getOutputProfile } from "./art-direction";
import { bentoGrid, editorialGrid } from "./grids";
import { round, splitRows } from "./primitives";
import type {
  ChartSection,
  DiagramSection,
  HierarchySection,
  Importance,
  InfographicCanvasSpec,
  InfographicSection,
  ProcessSection,
  ResolvedStyle,
  RectInfo,
  TemplateId,
  TimelineSection,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateContext {
  /** Style resolved from the art direction; templates read spacing/type from it. */
  style: ResolvedStyle;
  canvas: InfographicCanvasSpec;
  /** Safe region (canvas minus the profile's safe inset). */
  safe: RectInfo;
  sections: readonly InfographicSection[];
}

export interface TemplateFrame {
  sectionId: string;
  frame: RectInfo;
  page: number;
  /** Semantic slot name, e.g. `lead`, `focal`, `supporting-1`, `takeaway`. */
  slot: string;
  importance: Importance;
}

export interface TemplateViolation {
  code: string;
  message: string;
  sectionId?: string;
}

export interface TemplateScore {
  template: TemplateId;
  /** 0–1; higher is a better fit for this content. */
  score: number;
  /** False when a hard requirement is missing (the template would misrepresent). */
  feasible: boolean;
  violations: TemplateViolation[];
}

export interface TemplatePlan {
  template: TemplateId;
  pages: number;
  frames: TemplateFrame[];
  /** Region reserved for the source title/thesis — page 1 only. */
  header: RectInfo | null;
  /** Sections the template could not place. */
  unplaced: string[];
  /** Human-readable planning notes, surfaced in layout metadata. */
  notes: string[];
}

export interface TemplateInfo {
  id: TemplateId;
  label: string;
  description: string;
  /** Section kinds this template is designed around. */
  prefers: readonly string[];
  /** Hard requirement, surfaced when missing. */
  requires?: string;
  /** Sections per page before pagination or overflow. */
  capacity: number;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const TEMPLATE_INFO: Record<TemplateId, TemplateInfo> = {
  "editorial-overview": {
    id: "editorial-overview",
    label: "Editorial overview",
    description:
      "A claim, one hero visual and two to six supporting blocks on an asymmetric grid with evidence notes.",
    prefers: ["chart", "diagram", "process", "timeline", "hierarchy"],
    capacity: 6,
  },
  "bento-summary": {
    id: "bento-summary",
    label: "Bento summary",
    description:
      "One primary insight plus grouped secondary metrics and illustrations, packed by salience.",
    prefers: ["statistic", "chart"],
    capacity: 6,
  },
  "process-journey": {
    id: "process-journey",
    label: "Process journey",
    description: "A dominant ordered process with optional branches, plus supporting context blocks.",
    prefers: ["process", "chart", "diagram"],
    requires: "at least one process section with two or more steps",
    capacity: 5,
  },
  "data-story": {
    id: "data-story",
    label: "Data story",
    description: "A question, its source data as a chart, annotations on the marks and a takeaway.",
    prefers: ["chart", "statistic", "comparison"],
    requires: "exactly one chart section",
    capacity: 4,
  },
  "educational-carousel": {
    id: "educational-carousel",
    label: "Educational carousel",
    description:
      "Cover, then concept and evidence panels, then a recap — one idea per panel across pages.",
    prefers: ["text", "chart", "diagram", "quote"],
    capacity: 2,
  },
};

export const TEMPLATE_IDS: readonly TemplateId[] = Object.keys(TEMPLATE_INFO) as TemplateId[];

const VISUAL_KINDS = new Set(["chart", "diagram", "process", "timeline", "hierarchy"]);
const METRIC_KINDS = new Set(["statistic", "chart", "comparison"]);

function isVisual(section: InfographicSection): boolean {
  return VISUAL_KINDS.has(section.kind);
}

function isMetric(section: InfographicSection): boolean {
  return METRIC_KINDS.has(section.kind);
}

function countOf(sections: readonly InfographicSection[], kind: string): number {
  return sections.filter((section) => section.kind === kind).length;
}

function importanceOf(section: InfographicSection, fallback: Importance): Importance {
  return section.importance ?? fallback;
}

// ---------------------------------------------------------------------------
// Scoring and selection
// ---------------------------------------------------------------------------

/**
 * Score a template against the content. Scores are heuristic on purpose — the
 * point is a defensible ordering plus named violations, not a single truth.
 */
export function scoreTemplate(template: TemplateId, context: TemplateContext): TemplateScore {
  const sections = context.sections;
  const violations: TemplateViolation[] = [];
  const info = TEMPLATE_INFO[template];
  let score = 0.4;

  const visualCount = sections.filter(isVisual).length;
  const metricCount = sections.filter(isMetric).length;
  const textCount = countOf(sections, "text");

  switch (template) {
    case "editorial-overview": {
      score += 0.2;
      if (visualCount > 0) score += 0.2;
      score += Math.min(0.2, visualCount * 0.1);
      if (sections.length > info.capacity) {
        violations.push({
          code: "template-capacity",
          message: `${sections.length} sections exceed the ${info.capacity} slots of an editorial overview; the extras continue on another page.`,
        });
      }
      break;
    }
    case "bento-summary": {
      if (metricCount >= 2) score += 0.25;
      else
        violations.push({
          code: "template-few-metrics",
          message: "A bento summary reads best with at least two metric-bearing sections.",
        });
      score += Math.min(0.25, metricCount * 0.08);
      if (sections.length >= 4) score += 0.15;
      else
        violations.push({
          code: "template-few-sections",
          message: "Fewer than four sections leaves a bento grid looking empty.",
        });
      break;
    }
    case "process-journey": {
      const process = sections.find(
        (section): section is ProcessSection => section.kind === "process"
      );
      if (!process) {
        violations.push({
          code: "template-requires-process",
          message: `process-journey ${info.requires}.`,
        });
        return { template, score: 0.1, feasible: false, violations };
      }
      if (process.steps.length < 2) {
        violations.push({
          code: "template-requires-process",
          message: "A process journey needs at least two steps to show a journey.",
          sectionId: process.id,
        });
        return { template, score: 0.15, feasible: false, violations };
      }
      score += 0.35;
      score += Math.min(0.25, process.steps.length * 0.03);
      if (process.steps.some((step) => (step.nextIds?.length ?? 0) > 1)) score += 0.05;
      break;
    }
    case "data-story": {
      const charts = sections.filter((section) => section.kind === "chart");
      if (charts.length !== 1) {
        violations.push({
          code: "template-requires-chart",
          message: `data-story ${info.requires}; this source has ${charts.length}.`,
        });
        return { template, score: charts.length === 0 ? 0.05 : 0.2, feasible: false, violations };
      }
      score += 0.35;
      if (sections.some((section) => section.kind === "statistic")) score += 0.1;
      if (textCount >= 2) score += 0.1;
      break;
    }
    case "educational-carousel": {
      if (sections.length >= 4) score += 0.3;
      else
        violations.push({
          code: "template-few-sections",
          message: "A carousel needs at least four sections to be worth paginating.",
        });
      score += Math.min(0.2, sections.length * 0.04);
      score += Math.min(0.1, visualCount * 0.05);
      break;
    }
  }

  return {
    template,
    score: round(Math.max(0, Math.min(1, score)), 3),
    feasible: true,
    violations,
  };
}

export interface TemplateSelection {
  template: TemplateId;
  /** Total pages the chosen template needs. */
  pages: number;
  score: number;
  /** All candidates, best first, so a UI can show the ranking. */
  candidates: TemplateScore[];
}

/**
 * Rank every template (or the caller's shortlist) and return the highest-scoring
 * feasible one. Ties break on the catalog order, so selection is reproducible.
 */
export function selectTemplate(
  context: TemplateContext,
  options?: { candidates?: readonly TemplateId[] }
): TemplateSelection {
  const candidates = (options?.candidates ?? TEMPLATE_IDS).map((template) =>
    scoreTemplate(template, context)
  );
  const ranked = [...candidates].sort((a, b) => {
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return TEMPLATE_IDS.indexOf(a.template) - TEMPLATE_IDS.indexOf(b.template);
  });
  const best = ranked[0];
  const plan = planTemplate(best.template, context);
  return { template: best.template, pages: plan.pages, score: best.score, candidates: ranked };
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

function profilerPaginates(canvas: InfographicCanvasSpec): boolean {
  return getOutputProfile(canvas.profile).pagination === "paginate";
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output.length > 0 ? output : [[]];
}

/**
 * Build the frame plan for a template: which section sits where, on which page.
 * Deterministic for a given context — the same source always produces the same
 * frames, which is what makes golden-frame tests possible.
 */
export function planTemplate(template: TemplateId, context: TemplateContext): TemplatePlan {
  const info = TEMPLATE_INFO[template];
  const sections = context.sections;
  const paginate = profilerPaginates(context.canvas);
  const unplaced: string[] = [];
  const notes: string[] = [];

  const overflow = (excess: readonly InfographicSection[], page: number) => {
    if (excess.length === 0) return;
    if (paginate) {
      notes.push(
        `${excess.length} section(s) moved to page ${page + 1} to keep the layout legible.`
      );
    } else {
      unplaced.push(...excess.map((section) => section.id));
      notes.push(
        `${excess.length} section(s) did not fit and were not shown (the ${context.canvas.profile} profile does not paginate).`
      );
    }
  };

  const frames: TemplateFrame[] = [];
  const builder = BUILDERS[template];

  if (template === "educational-carousel") {
    const cover = sections[0];
    const recap = sections.length > 2 ? sections[sections.length - 1] : undefined;
    const middle = sections.slice(1, recap ? sections.length - 1 : sections.length);
    const middlePages = paginate ? chunks(middle, info.capacity) : [middle];

    if (cover) {
      frames.push(...builder({ context, sections: [cover], page: 1, pages: middlePages.length + 2, slotOffset: 0 }));
    }
    middlePages.forEach((pageSections, index) => {
      frames.push(
        ...builder({
          context,
          sections: pageSections,
          page: index + 2,
          pages: middlePages.length + 2,
          slotOffset: index * info.capacity,
        })
      );
    });
    if (recap) {
      frames.push(
        ...builder({
          context,
          sections: [recap],
          page: middlePages.length + 2,
          pages: middlePages.length + 2,
          slotOffset: middle.length,
        })
      );
    }
    return {
      template,
      pages: middlePages.length + 2,
      frames,
      header: null,
      unplaced,
      notes,
    };
  }

  if (!paginate && sections.length > info.capacity) {
    overflow(sections.slice(info.capacity), 1);
  }

  const pages = paginate ? chunks(sections, info.capacity) : [sections];
  let header: RectInfo | null = null;

  pages.forEach((pageSections, index) => {
    const result = builder({ context, sections: pageSections, page: index + 1, pages: pages.length, slotOffset: 0 });
    if (result.length > 0 && index === 0) {
      header = HEADER_OF[template](context) ?? null;
    }
    frames.push(...result);
  });

  if (pages.length > 1) {
    notes.push(
      `Content continues across ${pages.length} pages of ${info.capacity} sections to keep type above the legibility floor.`
    );
  }

  return { template, pages: pages.length, frames, header, unplaced, notes };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface BuildInput {
  context: TemplateContext;
  sections: readonly InfographicSection[];
  page: number;
  pages: number;
  slotOffset: number;
}

type TemplateBuilder = (input: BuildInput) => TemplateFrame[];

function headerBand(context: TemplateContext, ratio: number): { header: RectInfo; rest: RectInfo } {
  const style = context.style;
  const safe = context.safe;
  const headerHeight = round(safe.height * ratio);
  const gap = style.spacing[4];
  return {
    header: { x: safe.x, y: safe.y, width: safe.width, height: headerHeight },
    rest: {
      x: safe.x,
      y: round(safe.y + headerHeight + gap),
      width: safe.width,
      height: round(Math.max(0, safe.height - headerHeight - gap)),
    },
  };
}

function headerRect(context: TemplateContext, ratio: number): RectInfo {
  return headerBand(context, ratio).header;
}

const HEADER_OF: Record<TemplateId, (context: TemplateContext) => RectInfo | null> = {
  "editorial-overview": (context) => headerRect(context, 0.2),
  "bento-summary": (context) => headerRect(context, 0.18),
  "process-journey": (context) => headerRect(context, 0.18),
  "data-story": (context) => headerRect(context, 0.16),
  "educational-carousel": (context) => headerRect(context, 0.5),
};

/**
 * Editorial overview: a lead claim across the top, a hero visual pinned into an
 * asymmetric grid, and supporting blocks reading around it.
 */
const editorialOverview: TemplateBuilder = ({ context, sections, page }) => {
  const { rest } = headerBand(context, 0.2);
  const frames: TemplateFrame[] = [];
  const [lead, ...others] = sections;

  if (lead) {
    const leadHeight = round(rest.height * 0.26);
    frames.push({
      sectionId: lead.id,
      frame: { x: rest.x, y: rest.y, width: rest.width, height: leadHeight },
      page,
      slot: "lead",
      importance: importanceOf(lead, "hero"),
    });
    const body: RectInfo = {
      x: rest.x,
      y: round(rest.y + leadHeight + context.style.spacing[3]),
      width: rest.width,
      height: round(rest.height - leadHeight - context.style.spacing[3]),
    };

    const heroIndex = others.findIndex(isVisual);
    const hero = heroIndex >= 0 ? others[heroIndex] : undefined;
    const supporting = others.filter((section) => section !== hero);

    const grid = editorialGrid(
      body,
      { id: "editorial-overview", columns: [2, 2, 3], rows: [1, 1], gap: context.style.spacing[3] },
      renderContextStub(context)
    );

    // The hero owns the pinned focal cell; supporting blocks take the rest.
    if (hero && grid.focal) {
      frames.push({
        sectionId: hero.id,
        frame: grid.focal.box,
        page,
        slot: "focal",
        importance: importanceOf(hero, "hero"),
      });
    }

    const cells = grid.cells.filter((cell) => !cell.focal);
    const queue = hero ? supporting : others;
    queue.forEach((section, index) => {
      const cell = cells[index];
      if (!cell) return;
      frames.push({
        sectionId: section.id,
        frame: cell.box,
        page,
        slot: `supporting-${index + 1}`,
        importance: importanceOf(section, "supporting"),
      });
    });
  }

  return frames;
};

/**
 * Bento summary: a lead insight, then tiles packed by salience. Hero tiles claim
 * two columns and two rows, so the primary insight is structurally dominant.
 */
const bentoSummary: TemplateBuilder = ({ context, sections, page }) => {
  const { rest } = headerBand(context, 0.18);
  const frames: TemplateFrame[] = [];
  const [lead, ...others] = sections;

  if (lead) {
    const leadHeight = round(rest.height * 0.22);
    frames.push({
      sectionId: lead.id,
      frame: { x: rest.x, y: rest.y, width: rest.width, height: leadHeight },
      page,
      slot: "lead",
      importance: importanceOf(lead, "hero"),
    });

    const body: RectInfo = {
      x: rest.x,
      y: round(rest.y + leadHeight + context.style.spacing[3]),
      width: rest.width,
      height: round(rest.height - leadHeight - context.style.spacing[3]),
    };

    const grid = bentoGrid(
      body,
      {
        id: "bento-summary",
        columns: 4,
        gap: context.style.spacing[2],
        tiles: others.map((section, index) => ({
          id: section.id,
          importance: importanceOf(section, isMetric(section) ? "supporting" : "detail"),
          aspect: section.kind === "chart" ? 1.35 : section.kind === "statistic" ? 1.7 : 1.5,
          span: section.kind === "chart" ? { columns: 2, rows: 2 } : undefined,
          priority: Math.max(0, 10 - index),
        })),
      },
      renderContextStub(context)
    );

    for (const placement of grid.placements) {
      const section = others.find((entry) => entry.id === placement.id);
      if (!section) continue;
      frames.push({
        sectionId: section.id,
        frame: placement.box,
        page,
        slot: placement.importance === "hero" ? "focal" : `tile-${placement.column}:${placement.row}`,
        importance: placement.importance,
      });
    }
  }

  return frames;
};

/**
 * Process journey: the process takes the dominant band, context blocks sit above
 * and below it so the sequence is never interrupted by a paragraph.
 */
const processJourney: TemplateBuilder = ({ context, sections, page }) => {
  const { rest } = headerBand(context, 0.18);
  const frames: TemplateFrame[] = [];
  const processIndex = sections.findIndex((section) => section.kind === "process");
  const process = processIndex >= 0 ? sections[processIndex] : undefined;
  const surrounding = sections.filter((section) => section !== process);
  const above = process ? surrounding.slice(0, Math.ceil(surrounding.length / 2)) : surrounding;
  const below = process ? surrounding.slice(Math.ceil(surrounding.length / 2)) : [];

  const weights = [...above.map(() => 1), process ? 3.2 : 1, ...below.map(() => 1)];
  const rects = splitRows(rest, weights.length > 0 ? weights : [1], context.style.spacing[3]);

  let cursor = 0;
  above.forEach((section, index) => {
    frames.push({
      sectionId: section.id,
      frame: rects[cursor],
      page,
      slot: `context-above-${index + 1}`,
      importance: importanceOf(section, "detail"),
    });
    cursor += 1;
  });
  if (process) {
    frames.push({
      sectionId: process.id,
      frame: rects[cursor],
      page,
      slot: "focal",
      importance: importanceOf(process, "hero"),
    });
    cursor += 1;
  }
  below.forEach((section, index) => {
    frames.push({
      sectionId: section.id,
      frame: rects[cursor],
      page,
      slot: `context-below-${index + 1}`,
      importance: importanceOf(section, "detail"),
    });
    cursor += 1;
  });

  return frames;
};

/**
 * Data story: question at the top, the chart given the most room, the takeaway
 * closing the page. Annotations target the chart's marks, so the chart frame is
 * deliberately the largest region on the page.
 */
const dataStory: TemplateBuilder = ({ context, sections, page }) => {
  const { rest } = headerBand(context, 0.16);
  const frames: TemplateFrame[] = [];
  const chart = sections.find((section): section is ChartSection => section.kind === "chart");
  const question = sections.find((section) => section !== chart && section.kind === "text");
  const takeaway =
    [...sections].reverse().find((section) => section !== chart && section !== question) ?? undefined;
  const middle = sections.filter(
    (section) => section !== chart && section !== question && section !== takeaway
  );

  const weights = [
    question ? 1 : 0,
    chart ? 3.4 : 0,
    ...middle.map(() => 1),
    takeaway ? 1.2 : 0,
  ].filter((weight) => weight > 0);

  const rects = splitRows(rest, weights.length > 0 ? weights : [1], context.style.spacing[3]);
  let cursor = 0;

  if (question) {
    frames.push({
      sectionId: question.id,
      frame: rects[cursor],
      page,
      slot: "question",
      importance: importanceOf(question, "supporting"),
    });
    cursor += 1;
  }
  if (chart) {
    frames.push({
      sectionId: chart.id,
      frame: rects[cursor],
      page,
      slot: "focal",
      importance: importanceOf(chart, "hero"),
    });
    cursor += 1;
  }
  middle.forEach((section, index) => {
    frames.push({
      sectionId: section.id,
      frame: rects[cursor],
      page,
      slot: `evidence-${index + 1}`,
      importance: importanceOf(section, "supporting"),
    });
    cursor += 1;
  });
  if (takeaway) {
    frames.push({
      sectionId: takeaway.id,
      frame: rects[cursor],
      page,
      slot: "takeaway",
      importance: importanceOf(takeaway, "supporting"),
    });
  }

  return frames;
};

/**
 * Educational carousel: one idea per panel. The cover and recap pages reserve a
 * header for the source title/thesis because those pages are read as covers.
 */
const educationalCarousel: TemplateBuilder = ({ context, sections, page, pages }) => {
  const frames: TemplateFrame[] = [];
  const isCover = page === 1;
  const isRecap = page === pages && pages > 1;

  if (isCover) {
    const { rest } = headerBand(context, 0.5);
    const section = sections[0];
    if (section) {
      frames.push({
        sectionId: section.id,
        frame: rest,
        page,
        slot: "cover",
        importance: importanceOf(section, "hero"),
      });
    }
    return frames;
  }

  if (isRecap) {
    const section = sections[0];
    if (section) {
      frames.push({
        sectionId: section.id,
        frame: context.safe,
        page,
        slot: "recap",
        importance: importanceOf(section, "supporting"),
      });
    }
    return frames;
  }

  const rects = splitRows(
    context.safe,
    sections.map(() => 1),
    context.style.spacing[3]
  );
  sections.forEach((section, index) => {
    frames.push({
      sectionId: section.id,
      frame: rects[index],
      page,
      slot: `concept-${index + 1}`,
      importance: importanceOf(section, "supporting"),
    });
  });

  return frames;
};

const BUILDERS: Record<TemplateId, TemplateBuilder> = {
  "editorial-overview": editorialOverview,
  "bento-summary": bentoSummary,
  "process-journey": processJourney,
  "data-story": dataStory,
  "educational-carousel": educationalCarousel,
};

/**
 * Templates need a `SectionRenderContext` for the grid engines, which report
 * their own diagnostics. Planning happens before the engine's context exists, so
 * the plan gets a quiet stub: grid problems surface again when the engine
 * renders, where the diagnostics carry section ids.
 */
function renderContextStub(context: TemplateContext): Parameters<typeof editorialGrid>[2] {
  return {
    style: context.style,
    language: "en",
    evidence: new Map(),
    evidenceLabel: () => undefined,
    id: () => "plan",
    report: () => {},
  };
}

/** Sections a template will actually render on a given page. */
export function frameFor(
  plan: TemplatePlan,
  sectionId: string,
  page?: number
): TemplateFrame | undefined {
  return plan.frames.find(
    (frame) => frame.sectionId === sectionId && (page === undefined || frame.page === page)
  );
}

export type { DiagramSection, HierarchySection, TimelineSection };
