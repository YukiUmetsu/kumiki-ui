import { describe, expect, it } from "vitest";
import { inspectSeekParity } from "../registry/visual/explainer-principles";
import {
  causalSystemDuration, checkCausalGeometry, evaluateCausalSystem, findFeedbackLoops, layoutCausalStage,
  propagateIntervention, segmentHitsRect, validateCausalSystem, wrapCausalText, type CausalSystemSpec,
} from "../registry/visual/causal-system-stage";

/* Fake measurer: 0.55 em per character, so widths are checkable by hand. The view uses the canvas measurer. */
const measure = (font: string, text: string) => [...text].length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.55;
const portrait = { width: 1080, height: 1920 };
const landscape = { width: 1920, height: 1080 };

const climate: CausalSystemSpec = {
  id: "climate-fixture", title: "Simplified climate loop", eyebrow: "Test model", modelNote: "Simplified model", fps: { num: 30, den: 1 },
  nodes: [
    { id: "warming", label: "Global warming" }, { id: "ice", label: "Sea-ice cover" }, { id: "albedo", label: "Surface reflectivity" },
    { id: "emitted", label: "Heat radiated" }, { id: "imbalance", label: "Energy imbalance" }, { id: "storms", label: "Storm counts" },
  ],
  links: [
    { id: "l1", from: "warming", to: "ice", sign: "-", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l2", from: "ice", to: "albedo", sign: "+", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l3", from: "albedo", to: "imbalance", sign: "-", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l4", from: "imbalance", to: "warming", sign: "+", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l5", from: "warming", to: "emitted", sign: "+", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l6", from: "emitted", to: "imbalance", sign: "-", evidence: "mechanism", source: "Fixture citation A" },
    { id: "l7", from: "warming", to: "storms", sign: "+", evidence: "observational", source: "Fictional sample S-1" },
  ],
  beats: [
    { id: "establish", kind: "establish", caption: "Nodes only. Nothing is asserted yet.", headline: "Five variables", durationFrames: 30 },
    { id: "reveal", kind: "reveal", linkIds: ["l1", "l2", "l3", "l4", "l5", "l6"], caption: "Model links, drawn in order.", headline: "Six links", durationFrames: 90 },
    { id: "causal", kind: "causal", linkIds: ["l1", "l2"], caption: "Mechanism: warmer conditions reduce sea-ice cover.", headline: "Warmer, less ice", durationFrames: 60 },
    { id: "loops", kind: "loops", caption: "Two loops close on the model.", headline: "Two loops", durationFrames: 120 },
    { id: "held", kind: "intervene", nodeId: "ice", change: "increase", state: "raised", caption: "Holding ice cover higher cuts the warming link into it.", headline: "Ice held higher", durationFrames: 120 },
  ],
};

const cooling: CausalSystemSpec = {
  id: "cooling-fixture", title: "Cooling", eyebrow: "Test model", modelNote: "Fictional, simplified model", fps: { num: 30, den: 1 },
  nodes: [{ id: "fan", label: "Fan speed" }, { id: "airflow", label: "Airflow" }, { id: "chip", label: "Chip temp" }, { id: "power", label: "Power draw" }],
  links: [
    { id: "f1", from: "fan", to: "airflow", sign: "+", evidence: "mechanism", source: "Fixture spec" },
    { id: "f2", from: "airflow", to: "chip", sign: "-", evidence: "mechanism", source: "Fixture spec" },
    { id: "f3", from: "fan", to: "power", sign: "+", evidence: "mechanism", source: "Fixture spec" },
    { id: "f4", from: "chip", to: "fan", sign: "+", evidence: "mechanism", source: "Fixture spec" },
  ],
  beats: [{ id: "fan-up", kind: "intervene", nodeId: "fan", change: "increase", state: "fixed high", caption: "Fan fixed high.", durationFrames: 90 }],
};

describe("CausalSystemStage", () => {
  it("derives reinforcing and balancing loops from the product of signs and refuses unsigned cycles", () => {
    const { loops, diagnostics } = findFeedbackLoops(climate);
    expect(loops.map(loop => [loop.id, loop.kind, loop.negatives, loop.linkIds])).toEqual([
      ["R1", "R", 2, ["l1", "l2", "l3", "l4"]],
      ["B1", "B", 1, ["l5", "l6", "l4"]],
    ]);
    expect(diagnostics).toEqual([]);
    const unsigned = { ...climate, links: climate.links.map(l => (l.id === "l3" ? { ...l, sign: undefined } : l)) };
    expect(findFeedbackLoops(unsigned).loops.find(loop => loop.linkIds.includes("l3"))?.kind).toBe("U");
    expect(validateCausalSystem(unsigned)).toContainEqual(expect.objectContaining({ code: "loop-unsigned-link", severity: "error" }));
  });

  it("refuses causal claims over observational or assumed evidence and observational arrows", () => {
    const causalOverAssociation = { ...climate, beats: [...climate.beats, {
      id: "bad", kind: "causal" as const, linkIds: ["l7"], caption: "Storms are caused by warming.", durationFrames: 60,
    }] };
    const assumedClaim = { ...climate, links: climate.links.map(l => (l.id === "l2" ? { ...l, evidence: "assumed" as const, source: undefined } : l)) };
    const arrowAssociation = { ...climate, links: climate.links.map(l => (l.id === "l7" ? { ...l, presentation: "arrow" as const } : l)) };
    expect(validateCausalSystem(causalOverAssociation)).toContainEqual(expect.objectContaining({
      code: "causal-claim-unsupported", severity: "error", beatId: "bad", linkId: "l7",
    }));
    expect(validateCausalSystem(assumedClaim).filter(d => d.code === "causal-claim-unsupported")).toEqual([
      expect.objectContaining({ linkId: "l2", beatId: "causal" }),
    ]);
    expect(validateCausalSystem(arrowAssociation)).toContainEqual(expect.objectContaining({ code: "link-observational-arrow", linkId: "l7" }));
    expect(validateCausalSystem(climate).filter(d => d.severity === "error")).toEqual([]);
  });

  it("refuses interventions on unknown nodes and flags interventions with no incoming links as no-ops", () => {
    const root = { ...climate, nodes: [...climate.nodes, { id: "sun", label: "Solar output" }],
      links: [...climate.links, { id: "l9", from: "sun", to: "imbalance", sign: "+" as const, evidence: "mechanism" as const, source: "Fixture citation A" }] };
    const unknown = { ...climate, beats: [{ id: "x", kind: "intervene" as const, nodeId: "ocean", change: "increase" as const, state: "fixed", caption: "x", durationFrames: 60 }] };
    const noInput = { ...root, beats: [{ id: "x", kind: "intervene" as const, nodeId: "sun", change: "decrease" as const, state: "fixed low", caption: "x", durationFrames: 60 }] };
    expect(validateCausalSystem(unknown)).toContainEqual(expect.objectContaining({ code: "intervention-node-unknown", severity: "error", beatId: "x" }));
    expect(validateCausalSystem(noInput).find(d => d.code === "intervention-no-incoming")).toMatchObject({ severity: "warning", beatId: "x" });
  });

  it("propagates do() by sign products, cuts links into the fixed node, flags conflicts and never crosses association", () => {
    const ice = propagateIntervention(climate, "ice", "increase");
    expect(ice.effects).toMatchObject({
      ice: "fixed", albedo: "increase", imbalance: "decrease", warming: "decrease", emitted: "decrease",
      storms: "not-identified",
    });
    expect(ice.cutLinkIds).toEqual(["l1"]);
    expect(propagateIntervention(cooling, "fan", "increase").effects).toMatchObject({ airflow: "increase", chip: "decrease", power: "increase" });
    expect(validateCausalSystem(cooling).filter(d => d.severity !== "error")).toEqual([]);
    const split = { ...cooling, links: [...cooling.links, { id: "f5", from: "power", to: "chip", sign: "+" as const, evidence: "mechanism" as const, source: "Fixture spec" }] };
    expect(propagateIntervention(split, "fan", "increase").effects.chip).toBe("ambiguous");
    expect(validateCausalSystem(split)).toContainEqual(expect.objectContaining({ code: "propagation-ambiguous", nodeId: "chip", severity: "warning" }));
  });

  it("lays out automatically with no authored positions: no edge through a node, no overlapping boxes, arcs for loops", () => {
    for (const output of [portrait, landscape]) {
      const layout = layoutCausalStage(climate, output, { measure });
      expect(layout.diagnostics.filter(d => d.severity === "error")).toEqual([]);
      expect(layout.diagram.edges.filter(e => e.back).map(e => e.id)).toEqual(["l4"]);
      expect(layout.diagram.byEdge.get("l7")).toMatchObject({ style: "association", arrow: undefined });
      expect(layout.diagram.byEdge.get("l1")).toMatchObject({ style: "causal" });
      expect(layout.diagram.byEdge.get("l1")?.arrow).toBeDefined();
      expect(layout.diagram.loops.size).toBe(2);
      expect(layout.legend.map(i => i.key)).toEqual(["causal", "association", "assumed", "raises", "reduces", "chip", "cut"]);
    }
  });

  it("refuses crowded specs: too many layers, and labels that cannot wrap into two lines", () => {
    const chain: CausalSystemSpec = {
      id: "chain", title: "Chain", eyebrow: "Test model", modelNote: "Fictional", fps: { num: 30, den: 1 },
      nodes: Array.from({ length: 14 }, (_, i) => ({ id: `s${i}`, label: `Step ${i + 1}` })),
      links: Array.from({ length: 13 }, (_, i) => ({ id: `k${i}`, from: `s${i}`, to: `s${i + 1}`, sign: "+" as const, evidence: "mechanism" as const, source: "Fixture" })),
      beats: [{ id: "all", kind: "establish", caption: "Fourteen steps.", durationFrames: 30 }],
    };
    expect(layoutCausalStage(chain, portrait, { measure }).diagnostics).toContainEqual(expect.objectContaining({ code: "causal-crowded", severity: "error" }));
    const wide: CausalSystemSpec = {
      id: "wide", title: "Wide", eyebrow: "Test model", modelNote: "Fictional", fps: { num: 30, den: 1 },
      nodes: Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: "Supercalifragilisticexpialidocious" })),
      links: [{ id: "w1", from: "n0", to: "n1", sign: "+", evidence: "mechanism", source: "Fixture" }],
      beats: [{ id: "all", kind: "establish", caption: "Nine wide labels.", durationFrames: 30 }],
    };
    expect(layoutCausalStage(wide, portrait, { measure }).diagnostics.map(d => d.code)).toContain("causal-label-overflow");
  });

  it("guards rendered geometry: an edge through a node and two overlapping boxes are errors", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 1000 };
    const through = checkCausalGeometry({
      bounds,
      nodes: [{ id: "a", rect: { x: 0, y: 0, width: 100, height: 100 } }, { id: "b", rect: { x: 800, y: 0, width: 100, height: 100 } },
        { id: "mid", rect: { x: 400, y: 0, width: 100, height: 100 } }],
      edges: [{ id: "e", from: "a", to: "b", points: [{ x: 100, y: 50 }, { x: 800, y: 50 }] }],
      items: [],
    });
    expect(through).toContainEqual(expect.objectContaining({ code: "causal-edge-through-node", linkId: "e", nodeId: "mid" }));
    const overlap = checkCausalGeometry({
      bounds,
      nodes: [{ id: "a", rect: { x: 0, y: 0, width: 100, height: 100 } }, { id: "b", rect: { x: 300, y: 0, width: 100, height: 100 } }],
      edges: [],
      items: [{ id: "tag", kind: "tag", rect: { x: 90, y: 40, width: 50, height: 20 } }],
    });
    expect(overlap.map(d => d.code)).toEqual(["causal-overlap"]);
    expect(segmentHitsRect({ x: -10, y: 50 }, { x: 10, y: 50 }, { x: 0, y: 0, width: 100, height: 100 })).toBe(true);
    expect(segmentHitsRect({ x: -10, y: 150 }, { x: 10, y: 150 }, { x: 0, y: 0, width: 100, height: 100 })).toBe(false);
  });

  it("evaluates frames purely: links reveal in order, loops take turns, interventions cut and morph counterfactuals", () => {
    expect(causalSystemDuration(climate)).toBe(420);
    expect(Object.values(evaluateCausalSystem(climate, 0).linkVisible).every(v => v === 0)).toBe(true);
    expect(evaluateCausalSystem(climate, 119).linkVisible.l1).toBe(1);
    expect(evaluateCausalSystem(climate, 119).linkVisible.l7).toBe(0);
    expect(evaluateCausalSystem(climate, 150).linkEmphasis.l1).toBe(1);
    expect(evaluateCausalSystem(climate, 180 + 70).activeLoop?.loop.id).toBe("B1");
    const held = evaluateCausalSystem(climate, 300 + 100);
    expect(held.intervention).toMatchObject({ nodeId: "ice", change: "increase", amount: 1 });
    expect(held.linkCut.l1).toBe(1);
    expect(held.linkCut.l2).toBe(0);
    const counterfactual: CausalSystemSpec = { ...climate, beats: [...climate.beats.slice(0, 3), {
      id: "branch", kind: "counterfactual" as const, nodeId: "ice", change: "increase" as const, state: "held higher",
      caption: "What if ice cover were held higher?", durationFrames: 120,
    }] };
    expect(evaluateCausalSystem(counterfactual, 180 + 5).morph).toBeLessThan(0.5);
    expect(evaluateCausalSystem(counterfactual, 180 + 100).morph).toBe(1);
    expect(evaluateCausalSystem(counterfactual, 180 + 100).revealed.l1).toBe(1);
  });

  it("keeps seek parity over every beat kind, including loops, cuts and counterfactual morphs", () => {
    const withBranch: CausalSystemSpec = { ...climate, beats: [...climate.beats, {
      id: "branch", kind: "counterfactual", nodeId: "ice", change: "decrease", state: "held lower",
      caption: "Counterfactual under the stated model.", durationFrames: 90,
    }] };
    const result = inspectSeekParity(() => frame => evaluateCausalSystem(withBranch, frame), {
      durationFrames: causalSystemDuration(withBranch), sampleCount: 96, seed: 7,
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("wraps measured text and refuses lines that cannot fit", () => {
    expect(wrapCausalText("alpha beta gamma delta epsilon", 120, "600 40px x", measure).lines.length).toBeGreaterThan(1);
    expect(wrapCausalText("Wide", 10, "600 40px x", measure).fits).toBe(false);
  });
});
