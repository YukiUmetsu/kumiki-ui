import { describe, expect, it } from "vitest";
import {
  ArtboardDocumentError,
  addLayer,
  applyLayoutVariant,
  childrenOf,
  createArtboardDocument,
  descendantsOf,
  deserializeDocument,
  documentDigest,
  groupLayer,
  imageLayer,
  layerTree,
  layerWorldRect,
  moveLayer,
  normalizeDocument,
  orderLayers,
  patchLayer,
  reflowToPreset,
  removeLayer,
  reorderLayer,
  serializeDocument,
  shapeLayer,
  textLayer,
  validateDocument,
} from "../src/media/media-document";
import type { ArtboardDocument, Layer } from "../src/media/media-document";
import {
  boundsOf,
  fitMedia,
  fitScale,
  getAspectPreset,
  insetRect,
  safeRegion,
  snapRect,
  snapToGrid,
  snapValue,
} from "../src/media/media-geometry";

function textData(text = "Hello") {
  return { spans: [{ text }], fontFamily: "Geist Variable", fontSize: 64, lineHeight: 1.2 };
}

const ASSETS = {
  "hero.png": { uri: "assets/hero.png", mediaType: "image/png", width: 1600, height: 900 },
};

function baseDocument(): ArtboardDocument {
  return createArtboardDocument({
    id: "doc-1",
    width: 1280,
    height: 720,
    background: "#101014",
    assets: ASSETS,
    layers: [
      textLayer("title", { x: 64, y: 64, width: 600, height: 120 }, textData("Title")),
      imageLayer(
        "hero",
        { x: 0, y: 0, width: 1280, height: 720 },
        { assetRef: "hero.png", fit: "cover", alt: "Abstract backdrop" }
      ),
      shapeLayer("rule", { x: 64, y: 200, width: 400, height: 4 }, { shape: "rectangle", fill: "#fff" }),
    ],
  });
}

describe("media-document: creation and ordering", () => {
  it("creates a document and normalizes z per sibling group", () => {
    const document = baseDocument();
    expect(document.schemaVersion).toBe(1);
    expect(document.layers.map((layer) => layer.z)).toEqual([0, 1, 2]);
    expect(childrenOf(document, null).map((layer) => layer.id)).toEqual(["title", "hero", "rule"]);
  });

  it("orders layers by z and rewrites duplicates", () => {
    const document = baseDocument();
    const shuffled: ArtboardDocument = {
      ...document,
      layers: document.layers.map((layer) => ({ ...layer, z: layer.id === "rule" ? 0 : 5 })),
    };
    const ordered = orderLayers(shuffled);
    const zs = ordered.layers.map((layer) => layer.z).sort((a, b) => a - b);
    expect(zs).toEqual([0, 1, 2]);
  });
});

describe("media-document: serialization", () => {
  it("round-trips through JSON without loss", () => {
    const document = baseDocument();
    const json = serializeDocument(document, { pretty: true });
    const reloaded = deserializeDocument(json);
    expect(reloaded).toEqual(normalizeDocument(document));
    expect(serializeDocument(reloaded)).toBe(serializeDocument(document));
  });

  it("is byte-stable regardless of key insertion order", () => {
    const a = baseDocument();
    const b: ArtboardDocument = {
      layers: a.layers,
      assets: a.assets,
      canvas: a.canvas,
      id: a.id,
      schemaVersion: a.schemaVersion,
    };
    expect(serializeDocument(a)).toBe(serializeDocument(b));
    expect(documentDigest(a)).toBe(documentDigest(b));
    expect(documentDigest(a)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("rejects malformed JSON and invalid documents", () => {
    expect(() => deserializeDocument("{")).toThrow(ArtboardDocumentError);
    const invalid = { ...baseDocument(), schemaVersion: 2 };
    expect(() => deserializeDocument(JSON.stringify(invalid))).toThrow(/unsupported-schema-version/);
  });
});

describe("media-document: validation", () => {
  it("reports duplicate ids, cycles, bad parents and non-finite geometry", () => {
    const document = baseDocument();
    const broken = {
      ...document,
      layers: [
        { ...document.layers[0], id: "dup" },
        { ...document.layers[1], id: "dup" },
        groupLayer("g1", { x: 0, y: 0, width: 10, height: 10 }, {}, { parentId: "g2" }),
        groupLayer("g2", { x: 0, y: 0, width: 10, height: 10 }, {}, { parentId: "g1" }),
        textLayer("nan", { x: Number.NaN, y: 0, width: 10, height: 10 }, textData()),
        shapeLayer("bad-parent", { x: 0, y: 0, width: 10, height: 10 }, { shape: "rectangle" }, { parentId: "dup" }),
      ],
    };
    const codes = validateDocument(broken).map((diagnostic) => diagnostic.code);
    expect(codes).toContain("duplicate-layer-id");
    expect(codes).toContain("layer-cycle");
    expect(codes).toContain("parent-not-group");
    expect(codes).toContain("non-finite-transform");
  });

  it("warns about missing asset references and rejects missing alt text", () => {
    const document = createArtboardDocument({
      id: "warn",
      width: 100,
      height: 100,
      layers: [
        imageLayer("img", { x: 0, y: 0, width: 10, height: 10 }, { assetRef: "missing.png" }),
        imageLayer("ok", { x: 0, y: 0, width: 10, height: 10 }, { assetRef: "missing.png", alt: "A described image" }),
      ],
    });
    const diagnostics = validateDocument(document);
    const codes = diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toContain("referenced-asset-missing");
    expect(codes).toContain("missing-alt");
    expect(diagnostics.find((diagnostic) => diagnostic.code === "referenced-asset-missing")?.severity).toBe("warning");
    expect(diagnostics.find((diagnostic) => diagnostic.code === "missing-alt")?.severity).toBe("error");
  });

  it("accepts a valid document with no diagnostics", () => {
    expect(validateDocument(baseDocument())).toEqual([]);
  });
});

describe("media-document: operations", () => {
  it("adds, patches, reorders and moves layers immutably", () => {
    const document = baseDocument();
    const withLayer = addLayer(document, shapeLayer("dot", { x: 1, y: 2, width: 8, height: 8 }, { shape: "ellipse" }));
    expect(withLayer.layers).toHaveLength(4);
    expect(document.layers).toHaveLength(3);
    expect(withLayer.layers[3].z).toBe(3);

    const patched = patchLayer(withLayer, "title", { opacity: 2, blendMode: "screen" });
    expect(patched.layers.find((layer) => layer.id === "title")?.opacity).toBe(1);
    expect(patched.layers.find((layer) => layer.id === "title")?.blendMode).toBe("screen");

    const reordered = reorderLayer(withLayer, "dot", 0);
    expect(childrenOf(reordered, null)[0].id).toBe("dot");

    const front = moveLayer(withLayer, "title", "front");
    expect(childrenOf(front, null)[childrenOf(front, null).length - 1]?.id).toBe("title");
  });

  it("cascades and promotes children on removal", () => {
    const document = createArtboardDocument({
      id: "groups",
      width: 100,
      height: 100,
      layers: [
        groupLayer("group", { x: 0, y: 0, width: 50, height: 50 }),
        shapeLayer("child", { x: 0, y: 0, width: 10, height: 10 }, { shape: "rectangle" }, { parentId: "group" }),
      ],
    });
    expect(descendantsOf(document, "group").map((layer) => layer.id)).toEqual(["child"]);

    const cascaded = removeLayer(document, "group");
    expect(cascaded.layers.map((layer) => layer.id)).toEqual([]);

    const promoted = removeLayer(document, "group", { cascade: false });
    expect(promoted.layers.map((layer) => layer.id)).toEqual(["child"]);
    expect(promoted.layers[0].parentId).toBeUndefined();
  });

  it("refuses illegal re-parenting and unknown layers", () => {
    const document = baseDocument();
    expect(() => patchLayer(document, "title", { parentId: "hero" })).toThrow(/invalid-reparent/);
    expect(() => patchLayer(document, "nope", { z: 1 })).toThrow(ArtboardDocumentError);
  });

  it("nests groups into a render tree and surfaces orphans at the root", () => {
    const document = createArtboardDocument({
      id: "tree",
      width: 100,
      height: 100,
      layers: [
        groupLayer("group", { x: 0, y: 0, width: 50, height: 50 }),
        shapeLayer("child", { x: 0, y: 0, width: 10, height: 10 }, { shape: "rectangle" }, { parentId: "group" }),
        shapeLayer("orphan", { x: 0, y: 0, width: 10, height: 10 }, { shape: "rectangle" }, { parentId: "ghost" }),
      ],
    });
    const tree = layerTree(document);
    const groupNode = tree.find((node) => node.layer.id === "group");
    expect(groupNode?.children.map((node) => node.layer.id)).toEqual(["child"]);
    expect(tree.some((node) => node.layer.id === "orphan")).toBe(true);
  });

  it("accumulates ancestor translation and scale into world bounds", () => {
    const document = createArtboardDocument({
      id: "world",
      width: 200,
      height: 200,
      layers: [
        groupLayer("group", { x: 20, y: 40, width: 100, height: 100 }),
        shapeLayer("child", { x: 10, y: 10, width: 20, height: 20 }, { shape: "rectangle" }, { parentId: "group" }),
      ],
    });
    const withScale = patchLayer(document, "group", {
      transform: { x: 20, y: 40, width: 100, height: 100, scaleX: 2, scaleY: 2 },
    });
    expect(layerWorldRect(document, "child")).toEqual({ x: 30, y: 50, width: 20, height: 20 });
    expect(layerWorldRect(withScale, "child")).toEqual({ x: 40, y: 60, width: 40, height: 40 });
    expect(layerWorldRect(document, "nope")).toBeNull();
  });
});

describe("media-document: responsive reflow", () => {
  it("applies per-aspect overrides instead of stretching", () => {
    const document = createArtboardDocument({
      id: "responsive",
      width: 1280,
      height: 720,
      layers: [
        textLayer("title", { x: 64, y: 64, width: 600, height: 120 }, textData(), {
          layouts: { "9:16": { transform: { x: 48, y: 200, width: 900, height: 200 }, text: { fontSize: 48 } } },
        }),
      ],
    });
    const applied = applyLayoutVariant(document, "9:16");
    const layer = applied.layers[0] as Extract<Layer, { kind: "text" }>;
    expect(layer.transform.x).toBe(48);
    expect(layer.transform.width).toBe(900);
    expect(layer.payload.data.fontSize).toBe(48);
    // base document untouched
    expect(document.layers[0].transform.x).toBe(64);
  });

  it("reflows to a preset canvas and records the variant", () => {
    const preset = getAspectPreset("1:1");
    expect(preset).toBeDefined();
    const reflowed = reflowToPreset(baseDocument(), "1:1");
    expect(reflowed.canvas.width).toBe(1080);
    expect(reflowed.canvas.height).toBe(1080);
    expect(reflowed.metadata?.aspectVariant).toBe("1:1");
    expect(() => reflowToPreset(baseDocument(), "7:3")).toThrow(/unknown-aspect-preset/);
  });
});

describe("media-geometry", () => {
  it("insets, bounds and safe regions", () => {
    expect(insetRect({ x: 0, y: 0, width: 100, height: 100 }, { top: 10, right: 20, bottom: 0, left: 5 })).toEqual({
      x: 5,
      y: 10,
      width: 75,
      height: 90,
    });
    expect(boundsOf([{ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 5, width: 10, height: 10 }])).toEqual({
      x: 0,
      y: 0,
      width: 30,
      height: 15,
    });
    expect(boundsOf([])).toBeNull();
    expect(safeRegion({ width: 1000, height: 500 }, 0.05)).toEqual({ x: 25, y: 25, width: 950, height: 450 });
  });

  it("snaps values, grid steps and rectangles with guides", () => {
    expect(snapValue(48, [0, 50, 100], 5)).toEqual({ value: 50, guide: { axis: "x", position: 50, kind: "edge" } });
    expect(snapValue(20, [0, 50], 5)).toEqual({ value: 20 });
    expect(snapToGrid(23, 8)).toBe(24);
    const snapped = snapRect(
      { x: 48, y: 0, width: 10, height: 10 },
      { x: [0, 50], y: [0, 200] },
      4
    );
    expect(snapped.rect.x).toBe(50);
    expect(snapped.guides.length).toBeGreaterThan(0);
  });

  it("fits media without mutating source dimensions", () => {
    const source = { width: 1600, height: 900 };
    const frame = { width: 200, height: 200 };
    expect(fitScale(source, frame, "contain")).toBeCloseTo(0.125);
    const cover = fitMedia(source, frame, "cover");
    expect(cover.clipped).toBe(true);
    expect(cover.rect.width).toBeCloseTo(355.56, 1);
    const topLeft = fitMedia(source, frame, "cover", { x: 0, y: 0 });
    expect(topLeft.rect.x).toBe(0);
    expect(source).toEqual({ width: 1600, height: 900 });
  });
});
