import { describe, expect, it } from "vitest";
import type {
  GroupLayer,
  Layer,
  LayerTransform,
  MediaDocument,
  ShapeLayer,
  TextLayer,
  TextSpec,
} from "../src/media/document";
import {
  buildLayerTree,
  createDocument,
  documentHash,
  overflowLayers,
  parseDocument,
  resolveLayerOrder,
  retargetArtboard,
  serializeDocument,
  validateDocument,
  visibleLayersInPaintOrder,
} from "../src/media/document";
import {
  FIXTURE_DOCUMENTS,
  NEGATIVE_FIXTURES,
  overflowDocument,
  wideHeroDocument,
} from "../src/media/fixtures";

interface LayerOptions {
  z?: number;
  parentId?: string | null;
  visible?: boolean;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function transform(x: number, y: number, width: number, height: number, options: LayerOptions): LayerTransform {
  const mapped: LayerTransform = { x, y, width, height };
  if (options.rotation !== undefined) mapped.rotation = options.rotation;
  if (options.anchorX !== undefined) mapped.anchorX = options.anchorX;
  if (options.anchorY !== undefined) mapped.anchorY = options.anchorY;
  return mapped;
}

function shapeLayer(id: string, options: LayerOptions = {}): ShapeLayer {
  return {
    id,
    name: id,
    kind: "shape",
    parentId: options.parentId ?? null,
    transform: transform(options.x ?? 0, options.y ?? 0, options.width ?? 10, options.height ?? 10, options),
    z: options.z ?? 0,
    visible: options.visible ?? true,
    locked: false,
    opacity: 1,
    blend: "normal",
    clip: false,
    shape: { kind: "rect", fill: "#000000" },
  };
}

function groupLayer(id: string, options: LayerOptions = {}): GroupLayer {
  return {
    id,
    name: id,
    kind: "group",
    parentId: options.parentId ?? null,
    transform: transform(options.x ?? 0, options.y ?? 0, options.width ?? 100, options.height ?? 100, options),
    z: options.z ?? 0,
    visible: options.visible ?? true,
    locked: false,
    opacity: 1,
    blend: "normal",
    clip: false,
  };
}

function textSpec(overrides: Partial<TextSpec> = {}): TextSpec {
  return {
    spans: [{ text: "Sample" }],
    fontId: "font-sans",
    size: 76,
    lineHeight: 1.2,
    letterSpacing: 0,
    align: "start",
    direction: "auto",
    fit: "wrap",
    as: "p",
    ...overrides,
  };
}

function textLayer(id: string, text: TextSpec, options: LayerOptions = {}): TextLayer {
  return {
    id,
    name: id,
    kind: "text",
    parentId: options.parentId ?? null,
    transform: transform(options.x ?? 0, options.y ?? 0, options.width ?? 100, options.height ?? 40, options),
    z: options.z ?? 0,
    visible: options.visible ?? true,
    locked: false,
    opacity: 1,
    blend: "normal",
    clip: false,
    text,
  };
}

/** The `TextSpec` of a named text layer, failing loudly if the layer is missing. */
function textOf(document: MediaDocument, id: string): TextSpec {
  const layer = document.layers.find((entry) => entry.id === id);
  if (!layer || layer.kind !== "text") throw new Error(`Expected a text layer named ${id}`);
  return layer.text;
}

/**
 * A 16:9 composition with three known text layers: a root headline, a headline
 * nested in a group, and a headline with a genuine `shrink` range. Every box is
 * sized so the 16:9 → 9:16 `contain` scale is exactly 1080/1280 = 0.84375.
 */
function retargetTextSource(): MediaDocument {
  return createDocument({
    id: "retarget-text-source",
    artboard: { preset: "16:9" },
    layers: [
      textLayer(
        "retarget-title",
        textSpec({ size: 76, minSize: 44, maxSize: 76, letterSpacing: 4, fit: "shrink", as: "h1" }),
        { x: 80, y: 168, width: 520, height: 220, z: 0 }
      ),
      groupLayer("retarget-group", { x: 0, y: 0, width: 1280, height: 720, z: 1 }),
      textLayer(
        "retarget-nested",
        textSpec({ size: 76, minSize: 44, maxSize: 76, letterSpacing: 4, fit: "shrink", as: "h1" }),
        { x: 80, y: 400, width: 520, height: 220, parentId: "retarget-group", z: 2 }
      ),
      textLayer(
        "retarget-shrink",
        textSpec({ size: 76, minSize: 40, maxSize: 76, fit: "shrink", as: "h2" }),
        { x: 640, y: 168, width: 480, height: 200, z: 3 }
      ),
    ],
  });
}

describe("media document: construction", () => {
  it("builds a valid document from a partial input", () => {
    const document = createDocument({ id: "partial-document", artboard: { preset: "1:1" } });

    expect(document.schemaVersion).toBe(1);
    expect(document.layers).toEqual([]);
    expect(document.guides).toEqual([]);
    expect(validateDocument(document).filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  });

  for (const [id, document] of Object.entries(FIXTURE_DOCUMENTS)) {
    it(`validates the ${id} fixture without errors`, () => {
      const errors = validateDocument(document).filter((diagnostic) => diagnostic.severity === "error");
      expect(errors).toEqual([]);
    });
  }
});

describe("media document: negative fixtures trip their named detectors", () => {
  for (const fixture of NEGATIVE_FIXTURES) {
    it(`${fixture.id} reports ${fixture.expectedCodes.join(", ")}`, () => {
      const codes = validateDocument(fixture.document).map((diagnostic) => diagnostic.code);
      for (const expected of fixture.expectedCodes) {
        expect(codes, `${fixture.id} must report ${expected}`).toContain(expected);
      }
    });
  }
});

describe("media document: deterministic serialization", () => {
  for (const [id, document] of Object.entries(FIXTURE_DOCUMENTS)) {
    it(`round-trips the ${id} fixture byte-identically`, () => {
      const first = serializeDocument(document);
      const parsed = parseDocument(first);
      expect(parsed.document).not.toBeNull();
      const second = serializeDocument(parsed.document!);
      expect(second).toBe(first);
    });
  }

  it("is stable across repeat calls and independent of key insertion order", () => {
    const first = serializeDocument(wideHeroDocument);
    expect(serializeDocument(wideHeroDocument)).toBe(first);

    const reparsed = parseDocument(first).document!;
    expect(serializeDocument(reparsed)).toBe(first);

    const reordered: MediaDocument = {
      guides: wideHeroDocument.guides,
      layers: wideHeroDocument.layers,
      assets: wideHeroDocument.assets,
      fonts: wideHeroDocument.fonts,
      artboard: wideHeroDocument.artboard,
      metadata: wideHeroDocument.metadata,
      grid: wideHeroDocument.grid,
      id: wideHeroDocument.id,
      schemaVersion: wideHeroDocument.schemaVersion,
    };
    expect(serializeDocument(reordered)).toBe(first);
  });

  it("hashes stably and changes when a layer coordinate changes", () => {
    const first = documentHash(wideHeroDocument);
    expect(documentHash(wideHeroDocument)).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}$/);

    const moved: MediaDocument = {
      ...wideHeroDocument,
      layers: wideHeroDocument.layers.map((layer) =>
        layer.id === "hero-title"
          ? { ...layer, transform: { ...layer.transform, x: layer.transform.x + 1 } }
          : layer
      ),
    };
    expect(documentHash(moved)).not.toBe(first);
  });
});

describe("media document: tolerant parsing", () => {
  it("never throws on garbage and reports an error for unrecoverable input", () => {
    for (const input of ["", "{", "null", "[]"]) {
      const result = parseDocument(input);
      expect(result.document).toBeNull();
      expect(result.diagnostics.some((diagnostic) => diagnostic.severity === "error")).toBe(true);
    }
  });

  it("reports an error when a layer holds a number that is not finite", () => {
    const nanDocument = createDocument({
      id: "nan-document",
      artboard: { preset: "1:1" },
      layers: [shapeLayer("nan-shape", { x: Number.NaN, z: Number.NaN })],
    });

    // JSON has no NaN, so a stringify pass turns it into null; the hand-built
    // string is the same shape authored by hand.
    const fromStringify = JSON.stringify(nanDocument);
    expect(fromStringify).toContain('"x":null');
    const handBuilt =
      '{"schemaVersion":1,"id":"nan-document","artboard":{"id":"artboard","width":1080,"height":1080,"aspect":"1:1","background":"#000000","safeRegion":{"top":54,"right":54,"bottom":54,"left":54},"bleed":{"top":0,"right":0,"bottom":0,"left":0},"crop":{"top":0,"right":0,"bottom":0,"left":0}},"fonts":{},"assets":{},"layers":[{"id":"nan-shape","name":"nan-shape","kind":"shape","parentId":null,"transform":{"x":null,"y":0,"width":10,"height":10},"z":null,"visible":true,"locked":false,"opacity":1,"blend":"normal","clip":false,"shape":{"kind":"rect","fill":"#000000"}}],"guides":[]}';

    for (const input of [fromStringify, handBuilt]) {
      const result = parseDocument(input);
      expect(result.document).toBeNull();
      expect(
        result.diagnostics.some(
          (diagnostic) => diagnostic.code === "number-not-finite" && diagnostic.severity === "error"
        )
      ).toBe(true);
    }
  });
});

describe("media document: layer order and tree", () => {
  it("orders by z ascending with a deterministic id tie-break", () => {
    const layers: Layer[] = [
      shapeLayer("b", { z: 1 }),
      shapeLayer("a", { z: 1 }),
      shapeLayer("c", { z: 0 }),
    ];
    expect(resolveLayerOrder(layers).map((layer) => layer.id)).toEqual(["c", "a", "b"]);
  });

  it("skips hidden layers and children of a hidden group", () => {
    const layers: Layer[] = [
      shapeLayer("a", { z: 2 }),
      shapeLayer("b", { z: 2 }),
      shapeLayer("c", { z: 2 }),
      shapeLayer("hidden", { z: 0, visible: false }),
      groupLayer("hidden-group", { z: 0, visible: false }),
      shapeLayer("hidden-group-child", { z: 0, parentId: "hidden-group", visible: true }),
    ];

    expect(resolveLayerOrder(layers).map((layer) => layer.id)).toEqual([
      "hidden",
      "hidden-group",
      "hidden-group-child",
      "a",
      "b",
      "c",
    ]);
    expect(visibleLayersInPaintOrder(layers).map((layer) => layer.id)).toEqual(["a", "b", "c"]);
  });

  it("nests children under their parent and reports depth", () => {
    const layers: Layer[] = [
      groupLayer("g", { z: 0 }),
      shapeLayer("child-1", { z: 0, parentId: "g" }),
      shapeLayer("child-2", { z: 1, parentId: "g" }),
      shapeLayer("grandchild", { z: 0, parentId: "child-1" }),
      shapeLayer("root", { z: 1 }),
    ];

    const tree = buildLayerTree(layers);
    expect(tree.map((node) => node.layer.id)).toEqual(["g", "root"]);
    expect(tree.map((node) => node.depth)).toEqual([0, 0]);

    const group = tree[0];
    expect(group.children.map((node) => node.layer.id)).toEqual(["child-1", "child-2"]);
    expect(group.children.map((node) => node.depth)).toEqual([1, 1]);
    expect(group.children.map((node) => node.order)).toEqual([0, 1]);
    expect(group.children[0].children.map((node) => node.layer.id)).toEqual(["grandchild"]);
    expect(group.children[0].children[0].depth).toBe(2);
  });
});

describe("media document: overflow", () => {
  it("finds the off-canvas layers and reports zero for the wide hero", () => {
    const reference = {
      x: 0,
      y: 0,
      width: overflowDocument.artboard.width,
      height: overflowDocument.artboard.height,
    };
    expect(overflowLayers(overflowDocument.layers, reference)).toEqual([
      {
        layerId: "over-visual",
        beyond: { top: 0, right: 540, bottom: 340, left: 0 },
        area: 880,
      },
    ]);

    expect(
      overflowLayers(wideHeroDocument.layers, { x: 0, y: 0, width: 1280, height: 720 })
    ).toEqual([]);
  });
});

describe("media document: retargeting", () => {
  it("reframes the wide hero to 9:16 with a uniform, non-mutating scale", () => {
    const snapshot = serializeDocument(wideHeroDocument);

    const result = retargetArtboard(wideHeroDocument, { preset: "9:16" });

    // (a) the artboard is the 9:16 preset.
    expect(result.document.artboard.width).toBe(1080);
    expect(result.document.artboard.height).toBe(1920);
    expect(result.document.artboard.aspect).toBe("9:16");

    // (b) one uniform scale explains every layer and no aspect is distorted.
    expect(result.scale).toBeCloseTo(1080 / 1280, 6);
    const sourceById = new Map(wideHeroDocument.layers.map((layer) => [layer.id, layer]));
    for (const layer of result.document.layers) {
      const source = sourceById.get(layer.id);
      expect(source).toBeDefined();
      expect(layer.transform.width).toBeCloseTo(source!.transform.width * result.scale, 3);
      expect(layer.transform.height).toBeCloseTo(source!.transform.height * result.scale, 3);
      expect(layer.transform.width / layer.transform.height).toBeCloseTo(
        source!.transform.width / source!.transform.height,
        6
      );
    }

    // (c) nothing grows past the new artboard unless it was already past the old one.
    for (const layer of result.document.layers) {
      const source = sourceById.get(layer.id)!;
      if (layer.transform.width > result.document.artboard.width) {
        expect(source.transform.width).toBeGreaterThan(1280);
      }
    }

    // (d) cover retargeting reports cropping instead of silently dropping content.
    const covered = retargetArtboard(wideHeroDocument, { preset: "9:16" }, { strategy: "cover" });
    const crops = covered.diagnostics.filter((diagnostic) => diagnostic.code === "retarget-crop");
    expect(crops.length).toBeGreaterThan(0);
    const field = crops.find((diagnostic) => diagnostic.layerId === "hero-field");
    expect(field).toBeDefined();
    expect(field!.severity).toBe("warning");
    expect(field!.message).toContain("cropped");

    // the input document is untouched by every call above.
    expect(serializeDocument(wideHeroDocument)).toBe(snapshot);
  });
});

describe("media document: retargeting scales typography with the geometry", () => {
  it("scales every text size by round(original * result.scale) by default", () => {
    const result = retargetArtboard(retargetTextSource(), { preset: "9:16" });

    // 16:9 (1280x720) → 9:16 (1080x1920) with `contain`: the limiting axis is
    // width, so the uniform scale is exactly 1080 / 1280.
    expect(result.scale).toBe(0.84375);

    const title = textOf(result.document, "retarget-title");
    expect(title.size).toBe(64.125); // round(76 * 0.84375)
    expect(title.minSize).toBe(37.125); // round(44 * 0.84375)
    expect(title.maxSize).toBe(64.125); // round(76 * 0.84375)
    expect(title.letterSpacing).toBe(3.375); // round(4 * 0.84375)
  });

  it("leaves all four typography values untouched when scaleText is false", () => {
    const source = retargetTextSource();
    const result = retargetArtboard(source, { preset: "9:16" }, { scaleText: false });

    const title = textOf(result.document, "retarget-title");
    expect(title.size).toBe(76);
    expect(title.minSize).toBe(44);
    expect(title.maxSize).toBe(76);
    expect(title.letterSpacing).toBe(4);

    // Geometry is still scaled, so only the type is left alone.
    const mapped = result.document.layers.find((layer) => layer.id === "retarget-title")!;
    expect(mapped.transform.width).toBe(438.75); // round(520 * 0.84375)
  });

  it("scales a text layer nested in a group exactly once", () => {
    const result = retargetArtboard(retargetTextSource(), { preset: "9:16" });

    const nested = textOf(result.document, "retarget-nested");
    // Applying the scale twice would yield round(64.125 * 0.84375) = 54.105; the
    // exact single-application value proves the ancestor group did not scale it.
    expect(nested.size).toBe(64.125);
    expect(nested.size).not.toBe(54.105);
  });

  it("keeps minSize <= size <= maxSize after scaling a genuine shrink range", () => {
    const result = retargetArtboard(retargetTextSource(), { preset: "9:16" });
    const spec = textOf(result.document, "retarget-shrink");

    expect(spec.minSize).toBe(33.75); // round(40 * 0.84375)
    expect(spec.size).toBe(64.125); // round(76 * 0.84375)
    expect(spec.maxSize).toBe(64.125); // round(76 * 0.84375)
    expect(spec.minSize!).toBeLessThanOrEqual(spec.size);
    expect(spec.size).toBeLessThanOrEqual(spec.maxSize!);
  });

  it("returns each text size to its original value after reframing to 9:16 and back to 16:9", () => {
    // The showcase reframes the pristine base to each preset, so "back to 16:9"
    // is a reframe of the same source rather than of the 9:16 result.
    const source = retargetTextSource();

    const portrait = retargetArtboard(source, { preset: "9:16" });
    expect(textOf(portrait.document, "retarget-title").size).toBe(64.125);

    const landscape = retargetArtboard(source, { preset: "16:9" });
    expect(landscape.scale).toBe(1);
    const title = textOf(landscape.document, "retarget-title");
    expect(title.size).toBe(76);
    expect(title.minSize).toBe(44);
    expect(title.maxSize).toBe(76);
    expect(title.letterSpacing).toBe(4);
  });

  it("is exactly reversible through a proportional reframe, so the scale does not drift", () => {
    const source = retargetTextSource();

    // Same aspect family (16:9), so the forward scale and its inverse compose to 1.
    const enlarged = retargetArtboard(source, { width: 2560, height: 1440 });
    expect(enlarged.scale).toBe(2);
    expect(textOf(enlarged.document, "retarget-title").size).toBe(152);

    const restored = retargetArtboard(enlarged.document, { preset: "16:9" });
    expect(restored.scale).toBe(0.5);
    const title = textOf(restored.document, "retarget-title");
    expect(title.size).toBe(76);
    expect(title.minSize).toBe(44);
    expect(title.maxSize).toBe(76);
    expect(title.letterSpacing).toBe(4);
  });

  it("composes a chained 9:16 then 16:9 reframe exactly, with no accumulated drift", () => {
    // The two frames have different aspects, so `contain` scales by the limiting
    // axis each way: 1080/1280 forward and 720/1920 back. The factors multiply
    // rather than invert, and the text tracks their product exactly.
    const source = retargetTextSource();

    const portrait = retargetArtboard(source, { preset: "9:16" });
    expect(portrait.scale).toBe(0.84375);

    const landscape = retargetArtboard(portrait.document, { preset: "16:9" });
    expect(landscape.scale).toBe(0.375);

    const title = textOf(landscape.document, "retarget-title");
    expect(title.size).toBe(24.047); // round(round(76 * 0.84375) * 0.375)
    expect(title.minSize).toBe(13.922); // round(round(44 * 0.84375) * 0.375)
    expect(title.maxSize).toBe(24.047); // round(round(76 * 0.84375) * 0.375)
    expect(title.letterSpacing).toBe(1.266); // round(round(4 * 0.84375) * 0.375)
  });

  it("does not mutate the input document", () => {
    const source = retargetTextSource();
    const snapshot = serializeDocument(source);

    retargetArtboard(source, { preset: "9:16" });
    retargetArtboard(source, { preset: "1:1" });
    retargetArtboard(source, { preset: "9:16" }, { scaleText: false });

    expect(textOf(source, "retarget-title").size).toBe(76);
    expect(textOf(source, "retarget-nested").size).toBe(76);
    expect(serializeDocument(source)).toBe(snapshot);
  });
});
