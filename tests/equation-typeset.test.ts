// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import MathJax from "mathjax";
import {
  compileTermTransition, equationTex, evaluateTermTransition, typesetEquation,
  type MathJaxLike, type TypesetEquation,
} from "../registry/visual/equation-typeset";

const mortgage = [
  { id: "principal", tex: "P" }, { id: "rate", tex: "r" }, { id: "periods", tex: "n" },
];
const payment = [
  { id: "principal", tex: "P" }, { id: "times", tex: "\\cdot" }, { id: "rate", tex: "r" },
];
const withLabel = [{ id: "label", tex: "\\text{Payment}=" }, ...payment];

let mj: MathJaxLike;
beforeAll(async () => {
  await MathJax.init({ loader: { load: ["input/tex", "output/svg"] } });
  mj = MathJax as unknown as MathJaxLike;
});

describe("equation typesetting adapter", () => {
  it("builds one identified group per term and refuses unsafe identities before typesetting", () => {
    expect(equationTex(mortgage)).toBe("\\cssId{principal}{P}\\cssId{rate}{r}\\cssId{periods}{n}");
  });

  it("typesets with MathJax and returns each term's position in the viewBox", async () => {
    const eq = await typesetEquation(mj, mortgage);
    expect(eq.ok).toBe(true);
    expect(eq.diagnostics).toEqual([]);
    expect(eq.svg.startsWith("<svg")).toBe(true);
    expect(eq.viewBox.width).toBeGreaterThan(0);
    expect(eq.terms.map(t => t.id)).toEqual(["principal", "rate", "periods"]);
    const xs = eq.terms.map(t => t.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    for (const term of eq.terms) expect(term.width).toBeGreaterThan(0);
    const last = eq.terms[eq.terms.length - 1];
    expect(last.x + last.width).toBeCloseTo(eq.viewBox.x + eq.viewBox.width, 6);
  });

  it("is deterministic: the same terms give the same SVG and positions", async () => {
    const a = await typesetEquation(mj, mortgage);
    const b = await typesetEquation(mj, mortgage);
    // MathJax numbers its SVG <defs> per call; the drawing itself must be identical.
    const normalise = (svg: string) => svg.replace(/MJX-\d+-/g, "MJX-N-");
    expect(normalise(b.svg)).toBe(normalise(a.svg));
    expect(b.terms).toEqual(a.terms);
  });

  it("refuses invalid identities and duplicates with diagnostics, not exceptions", async () => {
    const bad = await typesetEquation(mj, [{ id: "1st", tex: "P" }, { id: "p", tex: "P" }, { id: "p", tex: "Q" }]);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(["term-id-invalid", "term-id-duplicate"]));
    const empty = await typesetEquation(mj, []);
    expect(empty.diagnostics.map(d => d.code)).toContain("equation-empty");
  });

  it("reports TeX that MathJax cannot typeset instead of throwing", async () => {
    const broken = await typesetEquation(mj, [{ id: "frac", tex: "\\frac{" }]);
    expect(broken.ok).toBe(false);
    expect(broken.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("term transitions through shared-element", () => {
  let from: TypesetEquation, to: TypesetEquation;
  const handoff = { startFrame: 10, endFrame: 40 };
  beforeAll(async () => {
    from = await typesetEquation(mj, mortgage);
    to = await typesetEquation(mj, withLabel);
  });

  it("matches shared identities and classifies entering and exiting terms", () => {
    const compiled = compileTermTransition(from, to, { handoff });
    expect(compiled.moves.map(m => m.semanticId)).toEqual(["principal", "rate"]);
    expect(compiled.entering).toEqual(["label", "times"]);
    expect(compiled.exiting).toEqual(["periods"]);
    expect(compiled.diagnostics).toEqual([]);
  });

  it("moves a matched term from its old position to its new one, eased inside the handoff", () => {
    const compiled = compileTermTransition(from, to, { handoff });
    const oldX = from.terms.find(t => t.id === "principal")!.x;
    const newX = to.terms.find(t => t.id === "principal")!.x;
    expect(newX).toBeGreaterThan(oldX);
    const at = (frame: number) => evaluateTermTransition(compiled, from, to, handoff, frame).find(s => s.id === "principal")!;
    expect(at(0).x).toBeCloseTo(oldX, 6);
    expect(at(10).x).toBeCloseTo(oldX, 6);
    expect(at(40).x).toBeCloseTo(newX, 6);
    expect(at(25).x).toBeGreaterThan(oldX);
    expect(at(25).x).toBeLessThan(newX);
  });

  it("fades unmatched terms in and out over the same handoff and seeks identically", () => {
    const compiled = compileTermTransition(from, to, { handoff });
    const opacity = (frame: number, id: string) => evaluateTermTransition(compiled, from, to, handoff, frame).find(s => s.id === id)?.opacity;
    expect(opacity(0, "periods")).toBe(1);
    expect(opacity(40, "periods")).toBeCloseTo(0, 6);
    expect(opacity(40, "rate")).toBe(1);
    expect(opacity(40, "label")).toBeCloseTo(1, 6);
    expect(opacity(25, "label")).toBeGreaterThan(0);
    expect(evaluateTermTransition(compiled, from, to, handoff, 25)).toEqual(evaluateTermTransition(compiled, from, to, handoff, 25));
  });

  it("refuses an empty or inverted handoff and steps that did not typeset", () => {
    const inverted = compileTermTransition(from, to, { handoff: { startFrame: 40, endFrame: 10 } });
    expect(inverted.diagnostics.map(d => d.code)).toContain("handoff-invalid");
    const broken = { ...to, ok: false };
    expect(compileTermTransition(from, broken, { handoff }).diagnostics.map(d => d.code)).toContain("step-not-typeset");
  });
});
