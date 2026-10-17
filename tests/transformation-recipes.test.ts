import { describe, expect, it } from "vitest";
import {
  createAssemblyTransformation, createDiagramEquationTransformation, createDiagramTransformation, createEquationCodeTransformation,
  createLayoutTransformation, TRANSFORMATION_RECIPES,
} from "../registry/motion/transformation-recipes";
import {
  compileVisualTransformation, createVisualTransformationProgram, evaluateVisualTransformationProgram,
} from "../registry/motion/visual-transformation";
import { createVisualTransformationReference, TRANSFORMATION_REFERENCE_THEMES } from "../src/motion/visual-transformation-reference";
import type { VisualScene } from "../registry/motion/visual-transformation-types";

const bounds = { x: 0, y: 0, width: 100, height: 50 };
const scene: VisualScene = { id: "parts", elements: ["a", "b"].map((id, index) => ({
  id, semanticId: id, layout: { ...bounds, x: index * 200 },
  content: { kind: "text", text: id, bounds, fontSize: 20 },
})) };
const timing = { id: "recipe", fps: { num: 30, den: 1 }, durationFrames: 120, range: { startFrame: 20, endFrame: 80 } };

describe("transformation recipes", () => {
  it("authors different connector and node strategies without inferring correspondence", () => {
    const spec = createDiagramTransformation({ ...timing, from: scene, to: scene,
      nodes: [{ from: "a", to: "a", semanticId: "a" }], connectors: [{ from: "b", to: "b", semanticId: "connection" }],
    });
    expect(spec.mappings?.map((mapping) => mapping.strategy)).toEqual(["auto", "crossfade"]);
    expect(spec.mappings?.map((mapping) => mapping.semanticId)).toEqual(["a", "connection"]);
  });

  it("accepts an authored many-to-one equation term without inventing equivalence", () => {
    const target: VisualScene = { id: "expression", elements: [{ ...scene.elements[0], id: "sum", semanticId: "sum" }] };
    const spec = createDiagramEquationTransformation({ ...timing, from: scene, to: target,
      terms: [{ from: ["a", "b"], to: "sum", semanticId: "authored-sum" }],
    });
    expect(spec.mappings).toEqual([{ id: "recipe-term-0", kind: "many-to-one", from: ["a", "b"], to: "sum", semanticId: "authored-sum", strategy: "crossfade" }]);
    expect(() => compileVisualTransformation(spec)).not.toThrow();
  });

  it("lets authors choose a mask instead of the default text dissolve", () => {
    const spec = createEquationCodeTransformation({ ...timing, from: scene, to: scene, strategy: "mask-reveal",
      symbols: [{ from: "a", to: "a", semanticId: "a" }, { from: "b", to: "b", semanticId: "b", strategy: "crossfade" }],
    });
    expect(spec.mappings?.map((mapping) => mapping.strategy)).toEqual(["mask-reveal", "crossfade"]);
  });

  it("reverses assembly endpoints and respects caller-supplied part positions", () => {
    const parts = [{ id: "a", assembled: bounds, separated: { ...bounds, x: 320, y: 170 } }];
    const assembly = createAssemblyTransformation({ ...timing, scene, parts, direction: "assemble" });
    const disassembly = createAssemblyTransformation({ ...timing, scene, parts, direction: "disassemble" });
    expect(assembly.from.elements).toEqual(disassembly.to.elements);
    expect(assembly.to.elements).toEqual(disassembly.from.elements);
    expect(disassembly.to.elements[0].layout).toEqual(parts[0].separated);
    expect(disassembly.to.elements[1].layout).toEqual(scene.elements[1].layout);
  });

  it("copies layout bounds, preserves content and reports missing or repeated part IDs", () => {
    const relocated = { ...bounds, x: 480 };
    const snapshot = JSON.stringify(scene);
    const spec = createLayoutTransformation({ ...timing, scene, layouts: { a: relocated } });
    relocated.x = 999;
    expect(spec.to.elements[0].layout?.x).toBe(480);
    expect(spec.to.elements[0].content).toEqual(scene.elements[0].content);
    expect(JSON.stringify(scene)).toBe(snapshot);
    expect(() => createLayoutTransformation({ ...timing, scene, layouts: { missing: bounds } })).toThrow(/missing element "missing".*correct the part\/layout ID/);
    const part = { id: "a", assembled: bounds, separated: bounds };
    expect(() => createAssemblyTransformation({ ...timing, scene, parts: [part, part], direction: "assemble" })).toThrow(/repeats a part/);
  });

  for (const aspect of ["landscape", "portrait"] as const) {
    it(`connects every ${aspect} reference handoff with persistent identity and deterministic seeking`, () => {
      const film = createVisualTransformationReference({ aspect });
      const snapshot = JSON.stringify(film.specs);
      expect(film.specs).toHaveLength(TRANSFORMATION_RECIPES.length);
      for (let index = 0; index < film.specs.length; index++) {
        const spec = film.specs[index];
        expect(spec.from.elements.filter((element) => ["a", "b", "c"].includes(element.semanticId))).toHaveLength(3);
        expect(spec.to.elements.filter((element) => ["a", "b", "c"].includes(element.semanticId))).toHaveLength(3);
        if (index > 0) expect(spec.from).toEqual(film.specs[index - 1].to);
      }
      const program = createVisualTransformationProgram(film.specs);
      const frames = [0, 120, 299, 420, 570, 720, 870, 1020, 1259];
      const samples = frames.map((frame) => evaluateVisualTransformationProgram(program, frame));
      for (const frame of [...frames].reverse()) {
        expect(evaluateVisualTransformationProgram(program, frame)).toEqual(samples[frames.indexOf(frame)]);
      }
      for (const sample of samples) for (const layer of sample.layers) {
        expect(Object.values(layer.transform).every(Number.isFinite)).toBe(true);
        expect(layer.opacity).toBeGreaterThanOrEqual(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      }
      expect(JSON.stringify(film.specs)).toBe(snapshot);
    });
  }

  it("authors portrait geometry independently and accepts custom color roles", () => {
    const landscape = createVisualTransformationReference();
    const portrait = createVisualTransformationReference({ aspect: "portrait", theme: { ...TRANSFORMATION_REFERENCE_THEMES["theme-b"], accent: "#ce90df" } });
    expect(portrait.width).toBeLessThan(portrait.height);
    expect(portrait.scenes[0].elements.find((element) => element.id === "c")?.layout?.y).not.toBe(landscape.scenes[0].elements.find((element) => element.id === "c")?.layout?.y);
    expect(portrait.scenes[0].elements.find((element) => element.id === "a")?.fill?.r).toBe(206);
  });
});
