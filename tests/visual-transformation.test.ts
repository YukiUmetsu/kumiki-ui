import { describe, expect, it } from "vitest";
import { compileVisualTransformation, evaluateVisualTransformation, createVisualTransformationProgram, evaluateVisualTransformationProgram, retargetVisualTransformation, parseVisualTransformation, serializeVisualTransformation } from "../registry/motion/visual-transformation";
import { IDENTITY, translationMatrix } from "../registry/motion/matrix";
import type { VisualElement, VisualTransformationSpec } from "../registry/motion/visual-transformation-types";

const square = { contours: [{ closed: true, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] }] };
const element = (id: string, x = 0): VisualElement => ({ id, semanticId: id, content: { kind: "shape", bounds: { x: 0, y: 0, width: 100, height: 100 }, shape: square }, transform: translationMatrix(x, 0) });
const spec = (changes: Partial<VisualTransformationSpec> = {}): VisualTransformationSpec => ({ schemaVersion: 1, id: "move", fps: { num: 30, den: 1 }, durationFrames: 121, range: { startFrame: 20, endFrame: 100 }, from: { id: "a", elements: [element("token")] }, to: { id: "b", elements: [element("token", 200)] }, easing: "linear", ...changes });

describe("VisualTransformation MG1 compiler", () => {
  it("owns boundaries exactly and compiles typed kernel tracks", () => {
    const compiled = compileVisualTransformation(spec());
    expect(compiled.timeline.nodes.length).toBeGreaterThan(0);
    for (const frame of [0, 19, 20]) expect(evaluateVisualTransformation(compiled, frame).layers[0].transform).toEqual(IDENTITY);
    expect(evaluateVisualTransformation(compiled, 60).layers[0].transform.e).toBeCloseTo(100);
    expect(evaluateVisualTransformation(compiled, 100).layers[0].transform.e).toBe(200);
    expect(evaluateVisualTransformation(compiled, 120).layers).toHaveLength(1);
  });
  it("seeks deterministically without mutating input or accumulating state", () => {
    const input = spec({ strategy: "particle-handoff", particles: { count: 23, seed: 8 } });
    const before = JSON.stringify(input);
    const compiled = compileVisualTransformation(input);
    const expected = evaluateVisualTransformation(compiled, 60);
    for (const frame of [120, 0, 99, 22, 60]) evaluateVisualTransformation(compiled, frame);
    expect(evaluateVisualTransformation(compiled, 60)).toEqual(expected);
    expect(JSON.stringify(input)).toBe(before);
    expect(expected.layers.filter(l => l.id.includes("particle"))).toHaveLength(23);
  });
  it("uses an honest two-layer fallback for incompatible topology and changed text", () => {
    const target = element("token", 200);
    if (target.content.kind === "shape") target.content.shape = { contours: [...square.contours, ...square.contours] };
    const compiled = compileVisualTransformation(spec({ to: { id: "b", elements: [target] }, strategy: "geometric-morph" }));
    expect(compiled.decisions[0].selected).toBe("crossfade");
    expect(compiled.diagnostics.some(d => d.code === "transformation-fallback")).toBe(true);
    const layers = evaluateVisualTransformation(compiled, 60).layers;
    expect(layers).toHaveLength(2);
    expect(layers.map(l => l.opacity)).toEqual([0.5, 0.5]);
    const text = { ...element("token"), content: { kind: "text" as const, bounds: target.content.bounds, text: "new" } };
    expect(compileVisualTransformation(spec({ to: { id: "b", elements: [text] } })).decisions[0].selected).toBe("crossfade");
  });
  it("merges and splits without painting any endpoint twice", () => {
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [element("a"), element("b", 50)] }, mappings: [{ id: "merge", semanticId: "token", kind: "many-to-one", from: ["a", "b"], to: "token" }] }));
    const middle = evaluateVisualTransformation(compiled, 60).layers;
    expect(middle.filter(l => l.id.endsWith(":to"))).toHaveLength(1);
    expect(evaluateVisualTransformation(compiled, 20).layers).toHaveLength(2);
    expect(evaluateVisualTransformation(compiled, 100).layers).toHaveLength(1);
    expect(middle.every(l => l.lineage.includes("token"))).toBe(true);
  });
  it("resolves animated local parents before children and inherits clipping", () => {
    const group = { ...element("group"), content: { kind: "group" as const, bounds: { x: 0, y: 0, width: 100, height: 100 } }, clips: [{ space: "local" as const, mask: { kind: "clip" as const, rect: { x: 0, y: 0, width: 80, height: 80 } } }] };
    const child = { ...element("token", 10), parentId: "group" };
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [group, child] }, to: { id: "b", elements: [{ ...group, transform: translationMatrix(200, 0) }, { ...child, transform: translationMatrix(30, 0) }] } }));
    const layer = evaluateVisualTransformation(compiled, 60).layers[0];
    expect(layer.transform.e).toBeCloseTo(120);
    expect(layer.clips[0].polygon[0].x).toBeCloseTo(100);
  });
  it("handles missing elements and rejects ambiguous or invalid references with actionable errors", () => {
    const compiled = compileVisualTransformation(spec({ to: { id: "b", elements: [element("other")] } }));
    expect(evaluateVisualTransformation(compiled, 60).layers.map(l => l.opacity)).toEqual([0.5, 0.5]);
    expect(() => compileVisualTransformation(spec({ from: { id: "a", elements: [element("x"), { ...element("y"), semanticId: "x" }] } }))).toThrow(/semantic/i);
    expect(() => compileVisualTransformation(spec({ mappings: [{ id: "bad", semanticId: "x", kind: "one-to-one", from: "absent", to: "token" }] }))).toThrow(/absent/);
  });
  it("crossfades reflected or singular transforms instead of flipping at the midpoint", () => {
    const target = { ...element("token"), transform: { ...IDENTITY, a: -1 } };
    const compiled = compileVisualTransformation(spec({ to: { id: "b", elements: [target] } }));
    expect(compiled.decisions[0].selected).toBe("crossfade");
    expect(evaluateVisualTransformation(compiled, 60).layers.map(l => l.transform.a)).toEqual([1, -1]);
  });
  it("preserves all previous frames and the exact rendered interruption state", () => {
    const program = createVisualTransformationProgram([spec({ strategy: "mask-reveal" })]);
    const before = evaluateVisualTransformationProgram(program, 60);
    const retargeted = retargetVisualTransformation(program, { frame: 60, to: { id: "c", elements: [element("token", -100)] }, durationFrames: 40 });
    expect(evaluateVisualTransformationProgram(retargeted, 59)).toEqual(evaluateVisualTransformationProgram(program, 59));
    const pixels = (layers: typeof before.layers) => layers.map(layer => ({ content: layer.content, transform: layer.transform, opacity: layer.opacity, fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth, clips: layer.clips }));
    expect(pixels(evaluateVisualTransformationProgram(retargeted, 60).layers)).toEqual(pixels(before.layers));
    expect(evaluateVisualTransformationProgram(retargeted, 100).layers[0].transform.e).toBe(-100);
    const repeated = retargetVisualTransformation(retargeted, { frame: 75, to: spec().to, durationFrames: 20 });
    expect(evaluateVisualTransformationProgram(repeated, 61)).toEqual(evaluateVisualTransformationProgram(retargeted, 61));
  });
  it("validates finite integer frames and serializable scene data", () => {
    expect(() => compileVisualTransformation(spec({ range: { startFrame: 20, endFrame: 20 } }))).toThrow(/range/i);
    expect(() => evaluateVisualTransformation(compileVisualTransformation(spec()), NaN)).toThrow(/frame/i);
    expect(evaluateVisualTransformation(compileVisualTransformation(JSON.parse(JSON.stringify(spec()))), 60).layers[0].transform.e).toBeCloseTo(100);
    expect(evaluateVisualTransformation(parseVisualTransformation(serializeVisualTransformation(spec())), 60)).toEqual(evaluateVisualTransformation(compileVisualTransformation(spec()), 60));
    expect(() => parseVisualTransformation("bad")).toThrow(/JSON/);
    expect(() => parseVisualTransformation('{"schemaVersion":9}')).toThrow(/schemaVersion/);
  });
  it("preserves declaration paint order even when explicit mapping order is reversed", () => {
    const scene = { id: "ordered", elements: [element("a"), element("b")] };
    const compiled = compileVisualTransformation(spec({ from: scene, to: scene, mappings: [{ id: "b", kind: "one-to-one", semanticId: "b", from: "b", to: "b" }, { id: "a", kind: "one-to-one", semanticId: "a", from: "a", to: "a" }] }));
    for (const frame of [20, 21, 99, 100]) expect(evaluateVisualTransformation(compiled, frame).layers.map(l => l.semanticId)).toEqual(["a", "b"]);
  });
  it("retains complementary source and destination mattes when a child is reparented", () => {
    const parent = (id: string, x: number): VisualElement => ({ ...element(id, x), content: { kind: "group", bounds: element(id).content.bounds }, clips: [{ space: "local", mask: { kind: "clip", rect: { x: 0, y: 0, width: 100, height: 100 } } }] });
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [parent("old", 0), { ...element("token"), parentId: "old" }] }, to: { id: "b", elements: [parent("new", 200), { ...element("token"), parentId: "new" }] } }));
    const sample = evaluateVisualTransformation(compiled, 60);
    expect(sample.layers).toHaveLength(2);
    expect(sample.layers.map(l => l.clips[0].bounds.x)).toEqual([0, 200]);
    expect(sample.layers.map(l => l.transform.e)).toEqual([0, 200]);
    expect(sample.layers.map(l => l.opacity)).toEqual([0.5, 0.5]);
  });
  it("uses kernel RGB units and transforms layout, rotation, scale, color and opacity together", () => {
    const from = { ...element("token"), fill: { space: "srgb" as const, r: 255, g: 0, b: 0, alpha: 1 } };
    const to = { ...element("token"), layout: { x: 50, y: 50, width: 200, height: 200 }, transform: { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }, fill: { space: "srgb" as const, r: 0, g: 0, b: 255, alpha: 1 }, opacity: 0.4 };
    const sample = evaluateVisualTransformation(compileVisualTransformation(spec({ from: { id: "a", elements: [from] }, to: { id: "b", elements: [to] } })), 60).layers[0];
    expect(sample.fill.r).toBe(127.5);
    expect(sample.fill.b).toBe(127.5);
    expect(sample.opacity).toBeCloseTo(0.7);
    expect(sample.transform.a).toBeCloseTo(Math.SQRT1_2 * 1.5);
  });
  it.each(["geometric-morph", "shared-element", "mask-reveal", "particle-handoff", "crossfade"] as const)("retargets %s without changing the painted interruption frame", strategy => {
    const program = createVisualTransformationProgram([spec({ strategy })]);
    const snapshot = evaluateVisualTransformationProgram(program, 60).layers;
    const retargeted = retargetVisualTransformation(program, { frame: 60, to: spec().from, durationFrames: 20 });
    expect(evaluateVisualTransformationProgram(retargeted, 60).layers.map(l => [l.content, l.transform, l.fill, l.opacity, l.clips])).toEqual(snapshot.map(l => [l.content, l.transform, l.fill, l.opacity, l.clips]));
    expect(evaluateVisualTransformationProgram(retargeted, 80).layers).toEqual(evaluateVisualTransformationProgram(program, 0).layers);
  });
  it("splits a representation once and coordinates grouped independent identities", () => {
    const split = compileVisualTransformation(spec({ to: { id: "b", elements: [element("b", 100), element("c", 200)] }, mappings: [{ id: "split", semanticId: "token", kind: "one-to-many", from: "token", to: ["b", "c"] }] }));
    expect(evaluateVisualTransformation(split, 60).layers.filter(l => l.id.endsWith(":from"))).toHaveLength(1);
    expect(evaluateVisualTransformation(split, 60).layers.filter(l => l.id.endsWith(":to"))).toHaveLength(2);
    const grouped = compileVisualTransformation(spec({ from: { id: "a", elements: [element("a"), element("b")] }, to: { id: "b", elements: [element("a", 100), element("b", 300)] }, mappings: [{ id: "group", semanticId: "pair", kind: "group", pairs: [{ from: "a", to: "a", semanticId: "a" }, { from: "b", to: "b", semanticId: "b" }] }] }));
    expect(evaluateVisualTransformation(grouped, 60).layers.map(l => l.transform.e)).toEqual([50, 150]);
  });
  it("rejects duplicated merge/split ownership and overflowing derived layouts", () => {
    expect(() => compileVisualTransformation(spec({ mappings: [{ id: "bad", semanticId: "token", kind: "many-to-one", from: ["token", "token"], to: "token" }] }))).toThrow(/repeats a source/);
    expect(() => compileVisualTransformation(spec({ mappings: [{ id: "bad", semanticId: "token", kind: "one-to-many", from: "token", to: ["token", "token"] }] }))).toThrow(/repeats a destination/);
    expect(() => compileVisualTransformation(spec({ from: { id: "a", elements: [{ ...element("token"), content: { ...element("token").content, bounds: { x: 0, y: 0, width: 1e-300, height: 1 } }, layout: { x: 0, y: 0, width: 1e300, height: 1 } }] } }))).toThrow(/overflows/);
  });
  it("multiplies animated parent and child opacity after sampling local channels", () => {
    const group: VisualElement = { ...element("g"), content: { kind: "group", bounds: element("g").content.bounds }, opacity: 0 };
    const child = { ...element("token"), parentId: "g", opacity: 1 };
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [group, child] }, to: { id: "b", elements: [{ ...group, opacity: 1 }, { ...child, opacity: 0 }] } }));
    expect(evaluateVisualTransformation(compiled, 60).layers[0].opacity).toBeCloseTo(0.25);
  });
  it("keeps a foreground identity above both changing background representations", () => {
    const background = { ...element("background"), content: { kind: "text" as const, bounds: element("background").content.bounds, text: "old" } };
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [background, element("token")] }, to: { id: "b", elements: [{ ...background, content: { ...background.content, text: "new" } }, element("token")] } }));
    expect(evaluateVisualTransformation(compiled, 99).layers.map(l => l.semanticId)).toEqual(["background", "background", "token"]);
    const renamed = compileVisualTransformation(spec({ to: { id: "b", elements: [{ ...element("renamed", 200), semanticId: "token" }] } }));
    expect(evaluateVisualTransformation(renamed, 60).layers).toHaveLength(1);
  });
  it("keeps foreground particles above an opaque background and honors exact mapping easing IDs", () => {
    const compiled = compileVisualTransformation(spec({ from: { id: "a", elements: [element("back"), element("token")] }, to: { id: "b", elements: [element("back"), element("token", 200)] }, mappings: [{ id: "a", semanticId: "back", kind: "one-to-one", from: "back", to: "back", easing: "step-end" }, { id: "a:b", semanticId: "token", kind: "one-to-one", from: "token", to: "token", strategy: "particle-handoff", particles: { count: 5 }, easing: "linear" }] }));
    const layers = evaluateVisualTransformation(compiled, 60).layers;
    expect(layers[0].semanticId).toBe("back");
    expect(layers.slice(1).every(l => l.id.includes("particle"))).toBe(true);
    expect(layers[1].transform.e).toBeCloseTo(100);
  });
  it("keeps clipped retarget snapshots visible during their explicit endpoint-pose fallback", () => {
    const from = { ...element("token"), clips: [{ space: "local" as const, mask: { kind: "clip" as const, rect: { x: 0, y: 0, width: 100, height: 100 } } }] };
    const original = createVisualTransformationProgram([spec({ from: { id: "a", elements: [from] }, to: { id: "b", elements: [{ ...from, transform: translationMatrix(200, 0) }] } })]);
    const retargeted = retargetVisualTransformation(original, { frame: 60, to: { id: "c", elements: [element("token", 400)] }, durationFrames: 40 });
    const snapshot = evaluateVisualTransformationProgram(retargeted, 60).layers[0];
    const middle = evaluateVisualTransformationProgram(retargeted, 80).layers;
    expect(middle[0].transform).toEqual(snapshot.transform);
    expect(middle[0].clips).toEqual(snapshot.clips);
    expect(middle[0].opacity).toBeGreaterThan(0);
    expect(middle[1].transform.e).toBe(400);
  });
  it("supports particle merge and explicit mask split while preserving endpoint ownership", () => {
    const merge = compileVisualTransformation(spec({ from: { id: "a", elements: [element("a"), element("b", 50)] }, strategy: "particle-handoff", particles: { count: 5 }, mappings: [{ id: "merge", semanticId: "token", kind: "many-to-one", from: ["a", "b"], to: "token" }] }));
    expect(evaluateVisualTransformation(merge, 60).layers.filter(l => l.id.includes("particle"))).toHaveLength(10);
    expect(evaluateVisualTransformation(merge, 99).layers.filter(l => l.id.endsWith(":to"))).toHaveLength(1);
    const split = compileVisualTransformation(spec({ to: { id: "b", elements: [element("a"), element("b")] }, strategy: "mask-reveal", mappings: [{ id: "split", semanticId: "token", kind: "one-to-many", from: "token", to: ["a", "b"] }] }));
    expect(evaluateVisualTransformation(split, 60).layers.filter(l => l.id.endsWith(":from"))).toHaveLength(1);
    expect(evaluateVisualTransformation(split, 60).layers.every(l => l.clips.length > 0)).toBe(true);
  });
});
