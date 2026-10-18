import { describe, expect, it } from "vitest";

import {
  createIdFactory,
  diagramBlock,
  diagramLayers,
  edgePorts,
  hierarchyBlock,
  hierarchyLayout,
  processFlowBlock,
  renderProcessSection,
  resolveStyle,
  timelineBlock,
  timelinePolicy,
  VISUALIZER_RENDERERS,
  VISUALIZER_SECTION_KINDS,
} from "../src/infographic";
import type {
  DiagramEdge,
  DiagramNode,
  InfographicDiagnostic,
  InfographicEvidence,
  RectInfo,
  ResolvedStyle,
  SectionRenderContext,
} from "../src/infographic";
import { RAG_EXPLAINER, RELEASE_JOURNEY, TECHNICAL_DIAGRAM } from "../src/infographic/fixtures";

/**
 * Structure-visualizer geometry and IR contract.
 *
 * These renderers own the geometry of a relationship graph and emit the same
 * renderer-neutral primitives as every other block. The tests assert on the
 * returned IR (anchors, roles, diagnostics) rather than a snapshot, so a
 * regression names the invariant it broke: a step without an anchor, a connector
 * that vanished, or a missing accessibility disclosure.
 */

function makeContext(options: { style?: ResolvedStyle; evidenceIds?: readonly string[] } = {}): {
  context: SectionRenderContext;
  diagnostics: InfographicDiagnostic[];
} {
  const diagnostics: InfographicDiagnostic[] = [];
  const evidence = new Map<string, InfographicEvidence>();
  for (const id of options.evidenceIds ?? []) evidence.set(id, { id, label: id });
  const context: SectionRenderContext = {
    style: options.style ?? resolveStyle("editorial"),
    language: "en",
    evidence,
    evidenceLabel: (id) => (evidence.has(id) ? "1" : undefined),
    id: createIdFactory("test"),
    report: (diagnostic) => diagnostics.push(diagnostic),
  };
  return { context, diagnostics };
}

function processSection() {
  const section = RAG_EXPLAINER.sections.find((entry) => entry.kind === "process");
  if (!section || section.kind !== "process") throw new Error("fixture is missing a process section");
  return section;
}

const frame: RectInfo = { x: 0, y: 0, width: 1200, height: 600 };

describe("edgePorts", () => {
  it("returns the rounded midpoint of each edge", () => {
    const ports = edgePorts({ x: 0, y: 0, width: 100, height: 50 });
    expect(ports.top).toEqual({ x: 50, y: 0 });
    expect(ports.right).toEqual({ x: 100, y: 25 });
    expect(ports.bottom).toEqual({ x: 50, y: 50 });
    expect(ports.left).toEqual({ x: 0, y: 25 });
  });

  it("quantises fractional midpoints to the shared rounding precision", () => {
    const ports = edgePorts({ x: 1, y: 1, width: 11, height: 7 });
    expect(ports.top).toEqual({ x: 6.5, y: 1 });
    expect(ports.bottom).toEqual({ x: 6.5, y: 8 });
    expect(ports.left).toEqual({ x: 1, y: 4.5 });
    expect(ports.right).toEqual({ x: 12, y: 4.5 });
  });
});

describe("processFlowBlock", () => {
  it("reports an empty process and draws nothing", () => {
    const { context, diagnostics } = makeContext();
    const result = processFlowBlock(context, frame, { id: "empty", direction: "horizontal", steps: [] });
    expect(result.primitives).toEqual([]);
    expect(result.anchors).toEqual({});
    expect(diagnostics.map((entry) => entry.code)).toContain("process-empty");
    expect(diagnostics[0].severity).toBe("error");
  });

  it("lays out every step, anchors each one and emits connectors", () => {
    const { context } = makeContext();
    const section = processSection();
    const result = processFlowBlock(context, frame, {
      id: "pipeline",
      direction: "horizontal",
      steps: section.steps,
    });

    expect(result.primitives.length).toBeGreaterThan(section.steps.length);
    for (const step of section.steps) {
      const anchor = result.anchors![step.id];
      expect(anchor, `${step.id} has an anchor`).toBeDefined();
      expect(anchor.width).toBeGreaterThan(0);
      expect(anchor.height).toBeGreaterThan(0);
    }
    // Every primitive carries a stable id so the preview and SVG exporter agree.
    for (const primitive of result.primitives) {
      expect(typeof primitive.id).toBe("string");
      expect(primitive.id.length).toBeGreaterThan(0);
    }
    // Consecutive steps are joined by a connector primitive.
    expect(result.primitives.some((primitive) => primitive.role === "process-connector")).toBe(true);
  });

  it("renders a vertical process without overlapping its rows", () => {
    const { context } = makeContext();
    const section = processSection();
    const result = processFlowBlock(context, frame, {
      id: "pipeline",
      direction: "vertical",
      steps: section.steps,
    });
    const boxes = section.steps.map((step) => result.anchors![step.id]).filter(Boolean);
    expect(boxes).toHaveLength(section.steps.length);
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index].y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height);
    }
  });

  it("warns when every step declares a successor so no step is terminal", () => {
    const { context, diagnostics } = makeContext();
    const result = processFlowBlock(context, frame, {
      id: "cycle",
      direction: "horizontal",
      steps: [
        { id: "a", title: "A", nextIds: ["b"] },
        { id: "b", title: "B", nextIds: ["a"] },
      ],
    });
    expect(result.anchors!.a).toBeDefined();
    const cycle = diagnostics.find((entry) => entry.code === "process-cycle");
    expect(cycle?.severity).toBe("warning");
  });
});

describe("renderProcessSection", () => {
  it("renders the section chrome (heading) plus the flow", () => {
    const { context } = makeContext();
    const section = processSection();
    const result = renderProcessSection(section, frame, context);
    expect(result.primitives.some((primitive) => primitive.role === "heading")).toBe(true);
    for (const step of section.steps) {
      expect(result.anchors![step.id], `${step.id} anchor`).toBeDefined();
    }
  });
});

describe("timelinePolicy", () => {
  it("uses proportional positions for fully dated milestones", () => {
    const milestones = RELEASE_JOURNEY.sections.find((entry) => entry.kind === "timeline");
    if (!milestones || milestones.kind !== "timeline") throw new Error("fixture missing timeline");
    const policy = timelinePolicy(milestones.milestones);
    expect(policy.policy).toBe("proportional");
    expect(policy.caption).toBe("Positions proportional to time");
  });

  it("uses even positions for an ordinal or non-date label set", () => {
    expect(timelinePolicy([{ id: "a", label: "A", at: "2026-01-01" }], "ordinal").policy).toBe("even");
    expect(timelinePolicy([{ id: "a", label: "A", at: "2026-01-01" }], "ordinal").caption).toBe(
      "Positions evenly spaced · not to scale"
    );

    const undated = [
      { id: "a", label: "A", at: "Q3 2025" },
      { id: "b", label: "B", at: "Q4 2025" },
    ];
    expect(timelinePolicy(undated).policy).toBe("even");
    expect(timelinePolicy(undated).caption).toBe("Positions evenly spaced · not to scale");
  });

  it("DOCUMENTS a defect: a relative label that V8 can parse is treated as a date", () => {
    // `hasTemporalScale` (and `milestoneSortKey`) rely on `new Date(value)` with no
    // ISO guard, unlike `formatMilestoneLabel`, which explicitly checks the
    // `YYYY-MM-DD` shape. V8 leniently parses "T+2", "Phase 1" and "sprint 4" as
    // real dates, so a plain relative label is classified as a temporal scale and
    // the timeline claims "Positions proportional to time" instead of the honest
    // "evenly spaced · not to scale". Reported, not fixed (tests-only task).
    expect(timelinePolicy([{ id: "a", label: "A", at: "T+2" }]).policy).toBe("proportional");
    expect(timelinePolicy([{ id: "a", label: "A", at: "Phase 1" }]).policy).toBe("proportional");
  });

  it("uses logarithmic positions only for dated, log-scaled milestones", () => {
    const dated = [
      { id: "a", label: "A", at: "2026-01-01" },
      { id: "b", label: "B", at: "2026-06-01" },
    ];
    expect(timelinePolicy(dated, "log").policy).toBe("logarithmic");
    expect(timelinePolicy(dated, "log").caption).toBe("Positions scaled logarithmically");
  });
});

describe("timelineBlock", () => {
  const timelineSection = (() => {
    const section = RELEASE_JOURNEY.sections.find((entry) => entry.kind === "timeline");
    if (!section || section.kind !== "timeline") throw new Error("fixture missing timeline");
    return section;
  })();

  it("reports an empty timeline and draws nothing", () => {
    const { context, diagnostics } = makeContext();
    const result = timelineBlock(context, frame, { id: "empty", orientation: "horizontal", milestones: [] });
    expect(result.primitives).toEqual([]);
    expect(diagnostics.map((entry) => entry.code)).toContain("timeline-empty");
  });

  it("anchors each milestone, draws the axis, the interval bar and the policy caption", () => {
    const { context } = makeContext();
    const result = timelineBlock(context, frame, {
      id: "milestones",
      orientation: "horizontal",
      milestones: timelineSection.milestones,
    });

    for (const milestone of timelineSection.milestones) {
      expect(result.anchors![milestone.id], `${milestone.id} anchor`).toBeDefined();
    }
    expect(result.primitives.some((primitive) => primitive.role === "timeline-axis")).toBe(true);
    // The staged rollout is an interval, so it draws a bar rather than a dot.
    expect(result.primitives.some((primitive) => primitive.role === "timeline-interval-bar")).toBe(true);
    expect(result.primitives.some((primitive) => primitive.role === "timeline-marker")).toBe(true);
    const caption = result.primitives.find((primitive) => primitive.role === "timeline-policy-caption");
    expect(caption).toBeDefined();
    expect((caption as { lines: string[] }).lines.join(" ")).toContain("proportional");
  });

  it("warns when dated and non-date-parseable milestones are mixed", () => {
    const { context, diagnostics } = makeContext();
    timelineBlock(context, frame, {
      id: "mixed",
      orientation: "horizontal",
      milestones: [
        { id: "a", label: "A", at: "2026-01-01" },
        { id: "b", label: "B", at: "Q3 2025" },
      ],
    });
    expect(diagnostics.map((entry) => entry.code)).toContain("timeline-mixed-scale");
  });
});

describe("hierarchyLayout", () => {
  const root = (() => {
    const section = RELEASE_JOURNEY.sections.find((entry) => entry.kind === "hierarchy");
    if (!section || section.kind !== "hierarchy") throw new Error("fixture missing hierarchy");
    return section.root;
  })();

  const options = { nodeHeight: 40, nodeGap: 8, rowGap: 16, width: 800 };

  it("allocates horizontal extent by leaf count and reports the real depth", () => {
    const layout = hierarchyLayout(root, options);
    expect(layout.leafCount).toBe(4);
    expect(layout.depth).toBe(2);
    expect(layout.nodes).toHaveLength(7);
    expect(layout.edges).toHaveLength(6);
    expect(layout.width).toBe(800);
  });

  it("never overlaps two nodes at the same depth", () => {
    const layout = hierarchyLayout(root, options);
    const byDepth = new Map<number, Array<{ x: number; width: number }>>();
    for (const entry of layout.nodes) {
      const bucket = byDepth.get(entry.depth) ?? [];
      bucket.push(entry.box);
      byDepth.set(entry.depth, bucket);
    }
    for (const [depth, boxes] of byDepth) {
      const sorted = [...boxes].sort((a, b) => a.x - b.x);
      for (let index = 1; index < sorted.length; index += 1) {
        expect(
          sorted[index].x,
          `depth ${depth} sibling ${index} starts after the previous ends`
        ).toBeGreaterThanOrEqual(sorted[index - 1].x + sorted[index - 1].width);
      }
    }
  });

  it("is deterministic for the same tree and options", () => {
    expect(hierarchyLayout(root, options)).toEqual(hierarchyLayout(root, options));
  });
});

describe("hierarchyBlock", () => {
  const section = (() => {
    const found = RELEASE_JOURNEY.sections.find((entry) => entry.kind === "hierarchy");
    if (!found || found.kind !== "hierarchy") throw new Error("fixture missing hierarchy");
    return found;
  })();

  it("anchors every node and states the depth in text", () => {
    const { context } = makeContext();
    const result = hierarchyBlock(context, frame, { id: section.id, root: section.root });
    expect(result.anchors!["node-release"]).toBeDefined();
    expect(result.primitives.some((primitive) => primitive.role === "hierarchy-node")).toBe(true);
    const depths = result.primitives.filter((primitive) => primitive.role === "hierarchy-depth");
    // One depth caption per node, so the tree survives without the visual.
    expect(depths.length).toBe(Object.keys(result.anchors ?? {}).length);
  });

  it("reports a hierarchy-depth-overflow when the frame is too short", () => {
    const { context, diagnostics } = makeContext();
    hierarchyBlock(context, { x: 0, y: 0, width: 800, height: 40 }, { id: section.id, root: section.root });
    const overflow = diagnostics.find((entry) => entry.code === "hierarchy-depth-overflow");
    expect(overflow?.severity).toBe("error");
    expect(overflow?.overflow).toBeGreaterThan(0);
  });
});

describe("diagramLayers", () => {
  it("assigns a source to layer 0 and each node one past its deepest predecessor", () => {
    const nodes: DiagramNode[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ];
    const edges: DiagramEdge[] = [
      { id: "ab", from: "a", to: "b" },
      { id: "bc", from: "b", to: "c" },
    ];
    const { layerOf, maxLayer } = diagramLayers(nodes, edges);
    expect(layerOf.get("a")).toBe(0);
    expect(layerOf.get("b")).toBe(1);
    expect(layerOf.get("c")).toBe(2);
    expect(maxLayer).toBe(2);
  });

  it("places a join one past its deepest parent (diamond)", () => {
    const nodes: DiagramNode[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ];
    const edges: DiagramEdge[] = [
      { id: "ab", from: "a", to: "b" },
      { id: "ac", from: "a", to: "c" },
      { id: "bd", from: "b", to: "d" },
      { id: "cd", from: "c", to: "d" },
    ];
    const { layerOf, maxLayer } = diagramLayers(nodes, edges);
    expect(layerOf.get("d")).toBe(2);
    expect(maxLayer).toBe(2);
  });

  it("terminates on a cycle and assigns every node a layer", () => {
    const nodes: DiagramNode[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const edges: DiagramEdge[] = [
      { id: "ab", from: "a", to: "b" },
      { id: "ba", from: "b", to: "a" },
    ];
    const { layerOf, maxLayer } = diagramLayers(nodes, edges);
    expect(layerOf.size).toBe(2);
    expect(layerOf.get("a")).toBeTypeOf("number");
    expect(layerOf.get("b")).toBeTypeOf("number");
    expect(maxLayer).toBeGreaterThanOrEqual(0);
  });

  it("ignores edges that reference an unknown node", () => {
    const nodes: DiagramNode[] = [{ id: "a", label: "A" }];
    const edges: DiagramEdge[] = [{ id: "ghost", from: "a", to: "missing" }];
    const { layerOf } = diagramLayers(nodes, edges);
    expect(layerOf.get("a")).toBe(0);
    expect(layerOf.has("missing")).toBe(false);
  });

  it("assigns the fixture diagram's real layer depth", () => {
    const section = TECHNICAL_DIAGRAM.sections.find((entry) => entry.kind === "diagram");
    if (!section || section.kind !== "diagram") throw new Error("fixture missing diagram");
    const { layerOf, maxLayer } = diagramLayers(section.diagram.nodes, section.diagram.edges);
    expect(layerOf.get("n-client")).toBe(0);
    expect(layerOf.get("n-boundary")).toBe(1);
    expect(layerOf.get("n-store")).toBe(3);
    expect(maxLayer).toBe(3);
  });
});

describe("diagramBlock", () => {
  const section = (() => {
    const found = TECHNICAL_DIAGRAM.sections.find((entry) => entry.kind === "diagram");
    if (!found || found.kind !== "diagram") throw new Error("fixture missing diagram");
    return found;
  })();

  it("reports an empty diagram and draws nothing", () => {
    const { context, diagnostics } = makeContext();
    const result = diagramBlock(context, frame, { id: "empty", direction: "vertical", nodes: [], edges: [] });
    expect(result.primitives).toEqual([]);
    expect(diagnostics.map((entry) => entry.code)).toContain("diagram-empty");
  });

  it("anchors every node and labels the annotated edge", () => {
    const { context } = makeContext();
    const result = diagramBlock(context, frame, {
      id: section.id,
      direction: section.diagram.direction ?? "vertical",
      nodes: section.diagram.nodes,
      edges: section.diagram.edges,
    });

    for (const node of section.diagram.nodes) {
      expect(result.anchors![node.id], `${node.id} anchor`).toBeDefined();
    }
    expect(result.primitives.some((primitive) => primitive.role === "diagram-node")).toBe(true);
    const edgeLabel = result.primitives.find((primitive) => primitive.role === "diagram-edge-label");
    expect(edgeLabel).toBeDefined();
    expect((edgeLabel as { lines: string[] }).lines.join(" ")).toContain("appends");
  });
});

describe("visualizer registry wiring", () => {
  it("keeps VISUALIZER_SECTION_KINDS aligned with VISUALIZER_RENDERERS", () => {
    expect([...VISUALIZER_SECTION_KINDS].sort()).toEqual(Object.keys(VISUALIZER_RENDERERS).sort());
    for (const kind of VISUALIZER_SECTION_KINDS) {
      expect(typeof VISUALIZER_RENDERERS[kind], `${kind} renderer`).toBe("function");
    }
  });
});
