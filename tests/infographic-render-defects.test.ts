import { describe, expect, it } from "vitest";

import {
  createIdFactory,
  diagramBlock,
  processFlowBlock,
  renderComparisonSection,
  renderStatisticSection,
  resolveStyle,
} from "../src/infographic";
import type {
  ComparisonSection,
  DiagramEdge,
  DiagramNode,
  InfographicDiagnostic,
  InfographicEvidence,
  ProcessStep,
  RectInfo,
  ResolvedStyle,
  SectionRenderContext,
  StatisticSection,
} from "../src/infographic";

/**
 * Regression guards for three rendering defects found in visual review of the
 * built Storybook. Each test pins the *geometry* the review complained about, so
 * a regression names the invariant it broke rather than hiding behind a
 * screenshot:
 *
 * 1. process-flow connectors floated below the step text with no visible shaft;
 * 2. diagram edges read as tick marks instead of a shaft plus an arrowhead;
 * 3. the statistic caption collided with its denominator, and the comparison
 *    emphasis panel covered the emphasised column's header while the first row
 *    jammed against the header band.
 */

function makeContext(options: { style?: ResolvedStyle } = {}): {
  context: SectionRenderContext;
  diagnostics: InfographicDiagnostic[];
} {
  const diagnostics: InfographicDiagnostic[] = [];
  const evidence = new Map<string, InfographicEvidence>();
  const context: SectionRenderContext = {
    style: options.style ?? resolveStyle("editorial"),
    language: "en",
    evidence,
    evidenceLabel: () => undefined,
    id: createIdFactory("defect"),
    report: (diagnostic) => diagnostics.push(diagnostic),
  };
  return { context, diagnostics };
}

const frame: RectInfo = { x: 0, y: 0, width: 1200, height: 600 };

describe("process-flow connector attachment", () => {
  const steps: ProcessStep[] = [
    { id: "s1", title: "Receive", description: "Keep the question verbatim.", nextIds: ["s2"] },
    { id: "s2", title: "Generate", description: "Answer from the passages." },
  ];

  it("attaches horizontal connectors at the step title band, not the box middle", () => {
    const { context } = makeContext();
    const result = processFlowBlock(context, frame, { id: "flow", direction: "horizontal", steps });
    const title = result.primitives.find((primitive) => primitive.role === "step-title" && primitive.kind === "text");
    const connector = result.primitives.find(
      (primitive) => primitive.role === "process-connector" && primitive.kind === "polyline"
    );
    expect(title).toBeDefined();
    expect(connector).toBeDefined();
    if (!title || title.kind !== "text" || !connector || connector.kind !== "polyline") return;

    // Every waypoint sits inside the title's vertical band, so the line meets
    // the words instead of hanging in the empty lower half of the tall box.
    for (const [, y] of connector.points) {
      expect(y).toBeGreaterThanOrEqual(title.y);
      expect(y).toBeLessThanOrEqual(title.y + title.height);
    }

    // The old anchor (the box's vertical middle) is far below that band, which
    // is what made the connector look detached.
    const anchor = result.anchors?.s1;
    expect(anchor).toBeDefined();
    if (!anchor) return;
    expect(title.y + title.height).toBeLessThan(anchor.y + anchor.height / 2);

    // The shaft is a visible run of line, longer than the arrowhead alone.
    const xs = connector.points.map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(context.style.connector.markerSize);
  });
});

describe("diagram directed edges", () => {
  const nodes: DiagramNode[] = [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ];
  const edges: DiagramEdge[] = [{ id: "e1", from: "a", to: "b" }];

  it("draws a shaft plus an arrowhead even when the art direction's marker is a bar", () => {
    const style = resolveStyle("scientific");
    const { context } = makeContext({ style });
    const result = diagramBlock(context, frame, { id: "d", direction: "horizontal", nodes, edges });

    expect(result.primitives.some((primitive) => primitive.role === "connector-arrow")).toBe(true);
    expect(result.primitives.some((primitive) => primitive.role === "connector-bar")).toBe(false);

    const edge = result.primitives.find((primitive) => primitive.role === "diagram-edge" && primitive.kind === "polyline");
    expect(edge).toBeDefined();
    if (!edge || edge.kind !== "polyline") return;
    const xs = edge.points.map(([x]) => x);
    // The inter-layer gap reserves room for the head and a comparable shaft.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(style.connector.markerSize * 2);
  });

  it("leaves an undirected edge without a head", () => {
    const { context } = makeContext();
    const result = diagramBlock(context, frame, {
      id: "d",
      direction: "horizontal",
      nodes,
      edges: [{ id: "e1", from: "a", to: "b", directed: false }],
    });
    expect(result.primitives.some((primitive) => primitive.role === "connector-arrow")).toBe(false);
  });
});

describe("comparison header layout", () => {
  const section: ComparisonSection = {
    id: "compare",
    kind: "comparison",
    summary: "Two cases across two dimensions.",
    criteria: ["Grounding", "Citations"],
    cases: [
      {
        id: "rag",
        label: "Retrieval",
        emphasis: true,
        values: { Grounding: "Passages", Citations: "Passage-level" },
      },
      { id: "memory", label: "Memory only", values: { Grounding: "Parametric", Citations: null } },
    ],
  };

  it("paints the emphasis panel behind every column header", () => {
    const { context } = makeContext();
    const result = renderComparisonSection(section, frame, context);
    const panelIndex = result.primitives.findIndex((primitive) => primitive.role === "comparison-emphasis-panel");
    const emphasisedHeaderIndex = result.primitives.findIndex(
      (primitive) => primitive.role === "comparison-case-label" && primitive.semanticId === "rag"
    );
    expect(panelIndex).toBeGreaterThanOrEqual(0);
    expect(emphasisedHeaderIndex).toBeGreaterThan(panelIndex);

    // Dimension + both case headers are present; the middle header is not lost.
    const headers = result.primitives.filter(
      (primitive) => primitive.role === "comparison-case-label" || primitive.role === "comparison-corner-label"
    );
    expect(headers).toHaveLength(3);
  });

  it("separates the header band from the first data row", () => {
    const { context } = makeContext();
    const result = renderComparisonSection(section, frame, context);
    const header = result.primitives.find((primitive) => primitive.role === "comparison-corner-label");
    const firstRow = result.primitives.find((primitive) => primitive.role === "comparison-value");
    expect(header).toBeDefined();
    expect(firstRow).toBeDefined();
    if (!header || header.kind !== "text" || !firstRow || firstRow.kind !== "text") return;
    expect(firstRow.y).toBeGreaterThanOrEqual(header.y + header.height + 8);
  });
});

describe("statistic caption and denominator", () => {
  const section: StatisticSection = {
    id: "stat",
    kind: "statistic",
    summary: "78% of lookups served from cache.",
    value: 78,
    unit: "%",
    measureLabel: "of lookups served from cache",
    denominator: 4_180_000,
    period: "Q1 2026",
    baseline: 62,
    precision: 0,
  };

  it("gives the caption and the denominator distinct, non-overlapping lines", () => {
    const { context } = makeContext();
    const result = renderStatisticSection(section, frame, context);
    const measure = result.primitives.find((primitive) => primitive.role === "stat-measure");
    const contextLine = result.primitives.find((primitive) => primitive.role === "stat-context");
    expect(measure).toBeDefined();
    expect(contextLine).toBeDefined();
    if (!measure || measure.kind !== "text" || !contextLine || contextLine.kind !== "text") return;
    // Separate lines: the denominator starts at or below the caption's bottom, so
    // the two runs cannot overlap regardless of the real font's advance width.
    expect(contextLine.y).toBeGreaterThanOrEqual(measure.y + measure.height);
  });
});
