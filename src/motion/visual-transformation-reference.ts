import {
  createAssemblyTransformation, createDiagramEquationTransformation, createDiagramTransformation,
  createEquationCodeTransformation, createLayoutTransformation, createShapeTransformation,
  createSharedSceneTransformation,
} from "../../registry/motion/transformation-recipes";
import type { TransformationPair } from "../../registry/motion/transformation-recipes";
import type { ColorValue, Rect } from "../../registry/motion/types";
import type { VisualElement, VisualScene, VisualTransformationSpec } from "../../registry/motion/visual-transformation-types";
import type { Storyboard } from "../../registry/motion/storyboard";

export interface TransformationReferenceTheme {
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  secondary: string;
}

export const TRANSFORMATION_REFERENCE_THEMES: Record<"theme-a" | "theme-b", TransformationReferenceTheme> = {
  "theme-a": { surface: "#edf1f7", ink: "#182d49", muted: "#536882", accent: "#3058bd", secondary: "#899dbb" },
  "theme-b": { surface: "#192532", ink: "#eff5fb", muted: "#b2c5d7", accent: "#8fc8ef", secondary: "#607e9b" },
};

export const TRANSFORMATION_REFERENCE_BEATS = [
  ["Form", "Three identities begin as simple contours. Their color and order establish a visual memory."],
  ["Reshape", "Compatible contours change silhouette while their semantic identities remain attached."],
  ["Connect", "The same three elements become an authored diagram. Connector geometry is introduced explicitly."],
  ["Express", "Diagram elements correspond to authored equation terms. This correspondence makes no claim of mathematical inference."],
  ["Describe", "Equation terms correspond to code fragments. Changed text uses a deliberate dissolve, preserving legibility."],
  ["Construct", "The same identities become three physical-looking layers. This is a 2D authored representation."],
  ["Separate", "Part identities persist while the assembly opens into distinct inspection positions."],
  ["Arrange", "Those same parts settle into a new reading order. Identity survives the change in composition."],
] as const;

export interface VisualTransformationReference {
  width: number;
  height: number;
  theme: TransformationReferenceTheme;
  scenes: VisualScene[];
  specs: VisualTransformationSpec[];
  storyboard: Storyboard;
}

/** An authored film: portrait composition has its own geometry, spacing and typography. */
export function createVisualTransformationReference({
  aspect = "landscape", theme = TRANSFORMATION_REFERENCE_THEMES["theme-a"],
}: { aspect?: "landscape" | "portrait"; theme?: TransformationReferenceTheme } = {}): VisualTransformationReference {
  const portrait = aspect === "portrait";
  const width = portrait ? 720 : 1280;
  const height = portrait ? 1280 : 720;
  const ink = color(theme.ink);
  const muted = color(theme.muted);
  const accents = [color(theme.accent), color(theme.secondary), ink];
  const ids = ["a", "b", "c"];
  const fps = { num: 30, den: 1 };
  const durationFrames = 1260;
  const rect = (x: number, y: number, w: number, h = w): Rect => ({ x, y, width: w, height: h });
  const pairs = (from: VisualScene, to: VisualScene): TransformationPair[] => from.elements
    .filter((element) => to.elements.some((target) => target.id === element.id))
    .map((element) => ({ from: element.id, to: element.id, semanticId: element.semanticId,
      ...(element.id === "film-caption" ? { strategy: "mask-reveal" as const } : {}),
    }));
  const timing = (index: number) => ({
    id: `reference-${aspect}-${index}`, fps, durationFrames,
    range: { startFrame: index * 150 + 90, endFrame: index * 150 + 150 },
    easing: "ease-in-out-cubic" as const,
  });
  const text = (id: string, value: string, bounds: Rect, fontSize: number, fill = ink, serif = false): VisualElement => ({
    id, semanticId: id, layout: bounds, fill,
    content: { kind: "text", bounds: rect(0, 0, bounds.width, bounds.height), text: value, fontSize,
      fontFamily: serif ? '"Newsreader Variable", Georgia, serif' : '"Geist Variable", Arial, sans-serif' },
  });
  const heading = (index: number): VisualElement[] => [
    text("film-title", "An idea in motion", rect(56, 45, width - 112, 74), portrait ? 56 : 64, ink, true),
    text("film-caption", TRANSFORMATION_REFERENCE_BEATS[index][0], rect(58, 130, width - 116, 40), 26, muted),
    text("film-footer", "a, b, c / persistent identities", rect(58, height - 66, width - 116, 32), 22, muted),
  ];
  const shape = (id: string, bounds: Rect, index: number, diamond = false): VisualElement => ({
    id, semanticId: id, layout: bounds, fill: accents[index],
    content: { kind: "shape", bounds: rect(0, 0, 100), shape: { contours: [{ closed: true,
      points: diamond ? [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }]
        : Array.from({ length: 32 }, (_, point) => ({ x: 50 + 50 * Math.sin(point / 32 * Math.PI * 2), y: 50 - 50 * Math.cos(point / 32 * Math.PI * 2) })),
    }] } },
  });
  const initialBounds = portrait
    ? [rect(100, 420, 140), rect(380, 420, 140), rect(240, 760, 140)]
    : [rect(255, 285, 170), rect(555, 285, 170), rect(855, 285, 170)];
  const diagramBounds = portrait
    ? [rect(120, 390, 130), rect(440, 390, 130), rect(280, 780, 130)]
    : [rect(220, 310, 140), rect(570, 310, 140), rect(920, 310, 140)];
  const scenes: VisualScene[] = [
    { id: "form", elements: [...heading(0), ...ids.map((id, index) => shape(id, initialBounds[index], index))] },
    { id: "reshape", elements: [...heading(1), ...ids.map((id, index) => shape(id, initialBounds[index], index, true))] },
  ];
  const connector = (id: string, d: string): VisualElement => ({
    id, semanticId: id, content: { kind: "svg-path", bounds: rect(0, 0, width, height), d },
    fill: { ...ink, alpha: 0 }, stroke: muted, strokeWidth: 2,
  });
  const diagram: VisualScene = { id: "diagram", elements: [
    ...heading(2),
    connector("connector-ab", portrait ? "M250 455 L440 455" : "M360 380 L570 380"),
    connector("connector-bc", portrait ? "M505 520 L345 780" : "M710 380 L920 380"),
    ...ids.map((id, index) => shape(id, diagramBounds[index], index, true)),
    ...ids.map((id, index) => text(`label-${id}`, id, { ...diagramBounds[index], y: diagramBounds[index].y + 150, height: 40 }, 28, accents[index], true)),
  ] };
  scenes.push(diagram);
  const equationBounds = portrait
    ? [rect(100, 535, 110, 110), rect(320, 535, 110, 110), rect(540, 535, 110, 110)]
    : [rect(285, 295, 120, 130), rect(605, 295, 120, 130), rect(925, 295, 120, 130)];
  const equation: VisualScene = { id: "equation", elements: [
    ...heading(3), ...ids.map((id, index) => text(id, id, equationBounds[index], portrait ? 112 : 128, accents[index], true)),
    text("operator-plus", "+", rect(portrait ? 225 : 455, portrait ? 565 : 325, 70, 85), 64, muted, true),
    text("operator-equals", "=", rect(portrait ? 445 : 775, portrait ? 565 : 325, 70, 85), 64, muted, true),
  ] };
  scenes.push(equation);
  const code: VisualScene = { id: "code", elements: [
    ...heading(4), ...["a = read()", "b = transform(a)", "c = combine(a, b)"].map((line, index) => text(ids[index], line,
      rect(portrait ? 82 : 300, (portrait ? 450 : 260) + index * (portrait ? 140 : 90), portrait ? 560 : 820, 65), portrait ? 42 : 48, accents[index])),
  ] };
  scenes.push(code);
  const assembled = portrait
    ? [rect(120, 560, 480, 94), rect(150, 636, 420, 94), rect(180, 712, 360, 94)]
    : [rect(365, 280, 550, 80), rect(405, 345, 470, 80), rect(445, 410, 390, 80)];
  const separated = portrait
    ? [rect(120, 340, 480, 94), rect(150, 640, 420, 94), rect(180, 940, 360, 94)]
    : [rect(365, 220, 550, 80), rect(405, 370, 470, 80), rect(445, 520, 390, 80)];
  const assembly: VisualScene = { id: "assembly", elements: [...heading(5), ...ids.map((id, index) => ({
    ...shape(id, assembled[index], index), content: { kind: "shape" as const, bounds: rect(0, 0, 100, 20),
      shape: { contours: [{ closed: true, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 20 }, { x: 0, y: 20 }] }] } },
  }))] };
  scenes.push(assembly);

  const specs: VisualTransformationSpec[] = [
    createShapeTransformation({ ...timing(0), from: scenes[0], to: scenes[1],
      shapes: pairs(scenes[0], scenes[1]).filter((pair) => ids.includes(pair.from)),
      shared: pairs(scenes[0], scenes[1]).filter((pair) => !ids.includes(pair.from)) }),
    createDiagramTransformation({ ...timing(1), from: scenes[1], to: diagram, nodes: pairs(scenes[1], diagram) }),
    createDiagramEquationTransformation({ ...timing(2), from: diagram, to: equation,
      terms: pairs(diagram, equation).map((pair) => ({ ...pair, from: [pair.from] })) }),
    createEquationCodeTransformation({ ...timing(3), from: equation, to: code, strategy: "mask-reveal", symbols: pairs(equation, code) }),
    createSharedSceneTransformation({ ...timing(4), from: code, to: assembly, shared: pairs(code, assembly) }),
    createAssemblyTransformation({ ...timing(5), scene: assembly, direction: "disassemble",
      parts: ids.map((id, index) => ({ id, assembled: assembled[index], separated: separated[index] })) }),
  ];
  // The assembly recipe copies scene IDs; restore the authored endpoint object exactly.
  specs[5] = { ...specs[5], from: assembly,
    mappings: specs[5].mappings?.map((mapping) => mapping.semanticId === "film-caption" ? { ...mapping, strategy: "mask-reveal" } : mapping),
    to: { ...specs[5].to, id: "separated", elements: [...heading(6), ...specs[5].to.elements.filter((element) => ids.includes(element.id))] } };
  scenes.push(specs[5].to);
  const layouts: Record<string, Rect> = Object.fromEntries(ids.map((id, index) => [id, portrait
    ? rect(96, 420 + index * 220, 528, 110)
    : rect(140 + index * 360, 300, 280, 145)]));
  const rearrange = createLayoutTransformation({ ...timing(6), scene: scenes[6], layouts, sceneId: "arranged" });
  rearrange.mappings = rearrange.mappings?.map((mapping) => mapping.semanticId === "film-caption" ? { ...mapping, strategy: "mask-reveal" } : mapping);
  rearrange.to = { ...rearrange.to, elements: [...heading(7), ...rearrange.to.elements.filter((element) => ids.includes(element.id))] };
  specs.push(rearrange);
  scenes.push(rearrange.to);
  const storyboard: Storyboard = {
    schemaVersion: 1, id: `transformation-study-${aspect}`, title: "An idea in motion", fps, durationFrames,
    shots: TRANSFORMATION_REFERENCE_BEATS.map(([claim, visualObjective], index) => ({
      id: `transformation-beat-${index}`, sceneRef: scenes[index].id, startFrame: index === 0 ? 0 : (index - 1) * 150 + 90,
      durationFrames: index === 0 ? 90 : index === 7 ? durationFrames - 990 : 150,
      claim, visualObjective, focusTarget: "a", onScreenLabels: [claim], staticFallback: visualObjective,
    })),
  };
  return { width, height, theme, scenes, specs, storyboard };
}

function color(hex: string): ColorValue {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Reference color "${hex}" must be a six-digit hex value, for example #3058bd.`);
  return { space: "srgb", r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16), alpha: 1 };
}
