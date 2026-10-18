import { describe, expect, it } from "vitest";

import {
  BLOCK_RENDERERS,
  BLOCK_SECTION_KINDS,
  chipRowBlock,
  createIdFactory,
  insightCalloutBlock,
  isPercentLikeUnit,
  metricCardBlock,
  metricStackBlock,
  numberedStepBlock,
  resolveStyle,
} from "../src/infographic";
import type {
  InfographicDiagnostic,
  InfographicEvidence,
  RectInfo,
  ResolvedStyle,
  SectionRenderContext,
} from "../src/infographic";

/**
 * Reusable information blocks.
 *
 * The three invariants from `blocks.ts` are what these tests pin down: meaning is
 * never color-only (a change carries a sign and a direction word), unknown is not
 * zero (a missing value is reported, not silently rendered), and units are
 * declared once (a percent-like unit changes in points).
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

function textOf(primitive: { lines?: string[] } | undefined): string {
  return (primitive?.lines ?? []).join(" ");
}

function findRole(
  primitives: ReadonlyArray<{ role?: string }>,
  role: string
): { role?: string; lines?: string[] } | undefined {
  return primitives.find((primitive) => primitive.role === role);
}

const frame: RectInfo = { x: 0, y: 0, width: 900, height: 320 };

describe("isPercentLikeUnit", () => {
  it("recognises percent-like units regardless of case or surrounding space", () => {
    for (const unit of ["%", "percent", "pct", "percentage", "pp", " PP ", "Percent"]) {
      expect(isPercentLikeUnit(unit), `${unit} is percent-like`).toBe(true);
    }
  });

  it("rejects undefined and units that are not proportions", () => {
    for (const unit of [undefined, "", "ms", "USD", "count"]) {
      expect(isPercentLikeUnit(unit), `${String(unit)} is not percent-like`).toBe(false);
    }
  });
});

describe("metricCardBlock", () => {
  it("renders the label, value, unit and period", () => {
    const { context } = makeContext();
    const result = metricCardBlock(context, frame, {
      id: "card",
      label: "Monthly revenue",
      value: 1200,
      unit: "USD",
      period: "Q1 2026",
    });

    expect(textOf(findRole(result.primitives, "metric-value"))).toContain("1,200 USD");
    expect(findRole(result.primitives, "metric-label")).toBeDefined();
    expect(textOf(findRole(result.primitives, "metric-period"))).toBe("Q1 2026");
    expect(result.anchors!.card).toBeDefined();
    expect(result.anchors!.card.height).toBeGreaterThan(0);
  });

  it("reports a percent-like change in percentage points", () => {
    const { context } = makeContext();
    const result = metricCardBlock(context, frame, {
      id: "card",
      label: "Coverage",
      value: 32,
      unit: "%",
      change: 5,
    });
    const change = findRole(result.primitives, "metric-change");
    expect(textOf(change)).toContain("pp");
    expect(textOf(change)).toContain("up");
    expect(change?.role).toBe("metric-change");
  });

  it("reports a non-percent change as an absolute amount", () => {
    const { context } = makeContext();
    const result = metricCardBlock(context, frame, {
      id: "card",
      label: "Requests",
      value: 100,
      unit: "req",
      change: -12,
    });
    const change = findRole(result.primitives, "metric-change");
    expect(textOf(change)).toContain("down");
    expect(textOf(change)).not.toContain("pp");
  });

  it("warns but still shows the value when a sparkline has too few points", () => {
    const { context, diagnostics } = makeContext();
    const result = metricCardBlock(context, frame, {
      id: "card",
      label: "Trend",
      value: 10,
      sparkline: [1],
    });
    expect(diagnostics.map((entry) => entry.code)).toContain("sparkline-insufficient-data");
    expect(findRole(result.primitives, "metric-value")).toBeDefined();
  });
});

describe("insightCalloutBlock", () => {
  it("renders an accent bar, eyebrow and claim, and cites its evidence", () => {
    const { context, diagnostics } = makeContext({ evidenceIds: ["ev-1"] });
    const result = insightCalloutBlock(context, frame, {
      id: "callout",
      claim: "Retrieval replaces recall with something checkable.",
      evidenceRefs: ["ev-1"],
    });

    expect(findRole(result.primitives, "callout-accent-bar")).toBeDefined();
    expect(findRole(result.primitives, "callout-eyebrow")).toBeDefined();
    expect(textOf(findRole(result.primitives, "callout-claim"))).toContain("Retrieval replaces recall");
    expect(findRole(result.primitives, "evidence-note")).toBeDefined();
    expect(diagnostics.map((entry) => entry.code)).not.toContain("callout-without-evidence");
    expect(result.anchors!.callout).toBeDefined();
  });

  it("labels a secondary callout as a note", () => {
    const { context } = makeContext({ evidenceIds: ["ev-1"] });
    const result = insightCalloutBlock(context, frame, {
      id: "note",
      claim: "A caveat.",
      emphasis: "secondary",
      evidenceRefs: ["ev-1"],
    });
    expect(textOf(findRole(result.primitives, "callout-eyebrow")).toLowerCase()).toContain("note");
  });

  it("reports a callout that states a claim with no evidence", () => {
    const { context, diagnostics } = makeContext();
    insightCalloutBlock(context, frame, { id: "bare", claim: "An uncited claim." });
    const warning = diagnostics.find((entry) => entry.code === "callout-without-evidence");
    expect(warning?.severity).toBe("warning");
  });
});

describe("numberedStepBlock", () => {
  it("draws the badge, number, title, meta and description with connector ports", () => {
    const { context } = makeContext();
    const result = numberedStepBlock(context, frame, {
      id: "step",
      index: 2,
      total: 4,
      title: "Retrieve passages",
      description: "Re-rank and deduplicate the candidates.",
      state: "active",
    });

    expect(findRole(result.primitives, "step-badge")).toBeDefined();
    expect(textOf(findRole(result.primitives, "step-number"))).toBe("2");
    expect(textOf(findRole(result.primitives, "step-title"))).toContain("Retrieve passages");
    const meta = textOf(findRole(result.primitives, "step-meta"));
    expect(meta).toContain("Step 2 of 4");
    expect(meta).toContain("current");
    expect(findRole(result.primitives, "step-description")).toBeDefined();

    // Connector ports so the process-flow visualizer can attach without re-measuring.
    expect(result.anchors!.step).toBeDefined();
    expect(result.anchors!["step:start"]).toBeDefined();
    expect(result.anchors!["step:end"]).toBeDefined();
  });

  it("states each step state in words, not colour alone", () => {
    const { context } = makeContext();
    for (const [state, word] of [
      ["default", null],
      ["done", "complete"],
      ["optional", "optional"],
    ] as const) {
      const result = numberedStepBlock(context, frame, { id: `s-${state}`, index: 1, total: 2, title: "Step", state });
      const meta = textOf(findRole(result.primitives, "step-meta"));
      expect(meta).toContain("Step 1 of 2");
      if (word) expect(meta).toContain(word);
    }
  });

  it("draws a card surface when the art direction requests one", () => {
    const { context } = makeContext({ style: resolveStyle("minimal-technical") });
    const result = numberedStepBlock(context, frame, {
      id: "surface-step",
      index: 1,
      total: 1,
      title: "Panel step",
      surface: true,
    });
    expect(findRole(result.primitives, "step-surface")).toBeDefined();
  });
});

describe("metricStackBlock", () => {
  it("stacks cards top to bottom and anchors each one", () => {
    const { context } = makeContext();
    const result = metricStackBlock(context, frame, [
      { id: "a", label: "A", value: 1 },
      { id: "b", label: "B", value: 2 },
      { id: "c", label: "C", value: 3 },
    ]);
    expect(result.anchors!.a).toBeDefined();
    expect(result.anchors!.b).toBeDefined();
    expect(result.anchors!.c).toBeDefined();
    expect(result.anchors!.b.y).toBeGreaterThan(result.anchors!.a.y);
    expect(result.anchors!.c.y).toBeGreaterThan(result.anchors!.b.y);
  });

  it("returns nothing for an empty card list", () => {
    const { context } = makeContext();
    expect(metricStackBlock(context, frame, [])).toEqual({ primitives: [], anchors: {} });
  });
});

describe("chipRowBlock", () => {
  it("lays out one chip per label inside a wide frame", () => {
    const { context } = makeContext();
    const result = chipRowBlock(context, { x: 0, y: 0, width: 600, height: 40 }, ["Alpha", "Beta", "Gamma"]);
    const chips = result.primitives.filter((primitive) => primitive.role === "chip");
    expect(chips).toHaveLength(3);
  });

  it("returns nothing for an empty label list", () => {
    const { context } = makeContext();
    expect(chipRowBlock(context, frame, []).primitives).toEqual([]);
  });
});

describe("block registry wiring", () => {
  it("keeps BLOCK_SECTION_KINDS aligned with BLOCK_RENDERERS", () => {
    expect([...BLOCK_SECTION_KINDS].sort()).toEqual(Object.keys(BLOCK_RENDERERS).sort());
    for (const kind of BLOCK_SECTION_KINDS) {
      expect(typeof BLOCK_RENDERERS[kind], `${kind} renderer`).toBe("function");
    }
  });
});
