import { describe, expect, it } from "vitest";
import { documentToPng, documentToSvg, preflightExport } from "../src/media/svg-export";
import type { MediaDocument, Rect, ShapeLayer } from "../src/media/document";
import { createDocument, rotatedBounds, serializeDocument } from "../src/media/document";
import {
  FIXTURE_DOCUMENTS,
  danglingReferenceDocument,
  editorialSpreadDocument,
  multilingualDocument,
  wideHeroDocument,
} from "../src/media/fixtures";

/** The attribute string of the root `<svg>` element. */
function rootAttributes(svg: string): string {
  const match = /^<svg\s([^>]*)>/.exec(svg);
  if (!match) throw new Error("SVG root element was not found.");
  return match[1];
}

/** The markup after the root `<svg …>` element, i.e. everything `scale` must not touch. */
function bodyAfterRoot(svg: string): string {
  return svg.slice(svg.indexOf(">") + 1);
}

function attributeValue(attributes: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes);
  return match?.[1];
}

describe("svg export: every valid fixture", () => {
  for (const [id, document] of Object.entries(FIXTURE_DOCUMENTS)) {
    it(`emits a well-formed SVG for ${id}`, () => {
      const { svg } = documentToSvg(document);
      expect(svg.length).toBeGreaterThan(0);
      expect(svg.startsWith("<svg ")).toBe(true);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain(`viewBox="0 0 ${document.artboard.width} ${document.artboard.height}"`);
    });
  }
});

describe("svg export: guides never export", () => {
  it("keeps the wide hero's three guides out of the output", () => {
    const { svg } = documentToSvg(wideHeroDocument);

    expect(svg).not.toContain("data-km-guides");
    for (const id of ["guide-x-margin", "guide-x-media", "guide-y-baseline"]) {
      expect(svg).not.toContain(id);
    }

    // Wide hero has no line shape, so any `<line>` would have to be a guide.
    expect(svg).not.toContain("<line");

    // The concrete guide geometry a naive overlay would have drawn is absent.
    for (const markup of [
      '<line x1="80" y1="0" x2="80" y2="720"',
      '<line x1="640" y1="0" x2="640" y2="720"',
      '<line x1="0" y1="96" x2="1280" y2="96"',
    ]) {
      expect(svg).not.toContain(markup);
    }

    // Removing the guides changes nothing: they have zero effect on emitted elements.
    expect(documentToSvg({ ...wideHeroDocument, guides: [] }).svg).toBe(svg);
  });

  it("keeps the editorial spread's two guides out of the output", () => {
    const { svg } = documentToSvg(editorialSpreadDocument);

    expect(svg).not.toContain("data-km-guides");
    for (const id of ["guide-y-gutter", "guide-x-column"]) {
      expect(svg).not.toContain(id);
    }

    for (const markup of [
      '<line x1="800" y1="0" x2="800" y2="1000"',
      '<line x1="0" y1="640" x2="1600" y2="640"',
    ]) {
      expect(svg).not.toContain(markup);
    }

    expect(documentToSvg({ ...editorialSpreadDocument, guides: [] }).svg).toBe(svg);
  });
});

describe("svg export: text stays textual", () => {
  it("emits real <text>/<tspan> and never rasterises a heading", () => {
    const { svg } = documentToSvg(wideHeroDocument);

    expect(svg).toContain("<text");
    expect(svg).toContain("<tspan");
    for (const word of ["Compose", "render", "anywhere", "measured"]) {
      expect(svg).toContain(word);
    }

    // Only the single media layer becomes an <image>: text is never rasterised.
    expect((svg.match(/<image/g) ?? []).length).toBe(1);
    const imageHrefs = [...svg.matchAll(/<image[^>]*href="([^"]*)"/g)].map((match) => match[1]);
    expect(imageHrefs).toHaveLength(1);
    expect(imageHrefs[0].startsWith("data:image/svg+xml")).toBe(true);
    for (const word of ["Compose", "render", "anywhere"]) {
      expect(imageHrefs[0]).not.toContain(word);
    }
  });
});

describe("svg export: determinism and scale", () => {
  it("is byte-identical across calls and does not mutate the document", () => {
    const snapshot = serializeDocument(wideHeroDocument);
    const first = documentToSvg(wideHeroDocument).svg;
    const second = documentToSvg(wideHeroDocument).svg;

    expect(second).toBe(first);
    expect(serializeDocument(wideHeroDocument)).toBe(snapshot);
  });

  it("scales only the output size, never the layout", () => {
    const one = documentToSvg(wideHeroDocument, { scale: 1 });
    const two = documentToSvg(wideHeroDocument, { scale: 2 });

    expect(attributeValue(rootAttributes(one.svg), "viewBox")).toBe("0 0 1280 720");
    expect(attributeValue(rootAttributes(two.svg), "viewBox")).toBe("0 0 1280 720");
    expect(attributeValue(rootAttributes(one.svg), "width")).toBe("1280");
    expect(attributeValue(rootAttributes(one.svg), "height")).toBe("720");
    expect(attributeValue(rootAttributes(two.svg), "width")).toBe("2560");
    expect(attributeValue(rootAttributes(two.svg), "height")).toBe("1440");

    // Everything behind the root tag — every layer coordinate — is unchanged.
    expect(bodyAfterRoot(two.svg)).toBe(bodyAfterRoot(one.svg));
    expect(one.size).toEqual({ width: 1280, height: 720 });
    expect(two.size).toEqual({ width: 2560, height: 1440 });
  });
});

describe("svg export: diagnostics", () => {
  it("names the missing asset and layer for a dangling reference", () => {
    const { diagnostics } = documentToSvg(danglingReferenceDocument);
    const missing = diagnostics.find((diagnostic) => diagnostic.code === "export-asset-missing");

    expect(missing).toBeDefined();
    expect(missing!.severity).toBe("error");
    expect(missing!.layerId).toBe("dangling-media");
    expect(missing!.message).toContain("asset-does-not-exist");
  });

  it("refuses outline text with an explicit error", () => {
    const { diagnostics } = documentToSvg(wideHeroDocument, { textMode: "outline" });
    const refusal = diagnostics.find(
      (diagnostic) => diagnostic.code === "export-text-outline-unsupported"
    );

    expect(refusal).toBeDefined();
    expect(refusal!.severity).toBe("error");
    expect(refusal!.capability).toBe("svg-text-outline");
  });

  it("preflight flags only the unavailable font families", () => {
    const diagnostics = preflightExport(multilingualDocument, {
      availableFontFamilies: ["Geist Variable"],
    });
    const unavailable = diagnostics.filter((diagnostic) => diagnostic.code === "export-font-unavailable");

    expect(unavailable.some((diagnostic) => diagnostic.message.includes("Unpinned Grotesk"))).toBe(true);
    expect(unavailable.some((diagnostic) => diagnostic.path === "fonts.font-unpinned")).toBe(true);
    expect(unavailable.some((diagnostic) => diagnostic.message.includes("Geist Variable"))).toBe(false);
  });

  it("rejects PNG rasterisation with an actionable error in jsdom", async () => {
    await expect(documentToPng(wideHeroDocument)).rejects.toThrow(/PNG export needs/);
  });
});

/** A document with one rotated shape layer, so the emitted `<g transform>` is the only thing under test. */
function rotatedShapeDocument(transform: ShapeLayer["transform"]): MediaDocument {
  const layer: ShapeLayer = {
    id: "rotated-rect",
    name: "Rotated rect",
    kind: "shape",
    parentId: null,
    transform,
    z: 0,
    visible: true,
    locked: false,
    opacity: 1,
    blend: "normal",
    clip: false,
    shape: { kind: "rect", fill: "#000000" },
  };
  return createDocument({ id: "rotation-parity", layers: [layer] });
}

/** The `transform` attribute of the first `<g>` the exporter emits. */
function firstGroupTransform(svg: string): string {
  const match = /<g transform="([^"]*)"/.exec(svg);
  if (!match) throw new Error("No <g transform> was emitted.");
  return match[1];
}

/** `rotate(angle cx cy)` split into its concrete emitted number strings. */
function emittedRotate(transform: string): { angle: string; cx: string; cy: string } {
  const match = /rotate\((\S+) (\S+) (\S+)\)/.exec(transform);
  if (!match) throw new Error(`No rotate() in "${transform}".`);
  return { angle: match[1], cx: match[2], cy: match[3] };
}

/**
 * Re-apply the exported `translate` + `rotate` to the rect's local corners and
 * return the world-space AABB, exactly as a renderer would rasterise the SVG.
 */
function exportedWorldBounds(transform: string, rect: Rect): Rect {
  const translate = /translate\((\S+) (\S+)\)/.exec(transform);
  if (!translate) throw new Error(`No translate() in "${transform}".`);
  const rotate = emittedRotate(transform);
  const tx = Number(translate[1]);
  const ty = Number(translate[2]);
  const cx = Number(rotate.cx);
  const cy = Number(rotate.cy);
  const rad = (Number(rotate.angle) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: Array<[number, number]> = [
    [0, 0],
    [rect.width, 0],
    [rect.width, rect.height],
    [0, rect.height],
  ];
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [lx, ly] of corners) {
    const dx = lx - cx;
    const dy = ly - cy;
    xs.push(tx + cx + dx * cos - dy * sin);
    ys.push(ty + cy + dx * sin + dy * cos);
  }
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

describe("svg export: rotation pivot matches the DOM preview and geometry helpers", () => {
  const rect = { x: 100, y: 50, width: 200, height: 100 };

  it("pivots an unanchored rotated layer at its top-left corner", () => {
    const { svg } = documentToSvg(rotatedShapeDocument({ ...rect, rotation: 30 }));
    const transform = firstGroupTransform(svg);

    // Concrete emitted numbers, not a substring: translate then pivot at (0, 0).
    expect(transform).toBe("translate(100 50) rotate(30 0 0)");
    const rotate = emittedRotate(transform);
    expect(rotate.angle).toBe("30");
    expect(rotate.cx).toBe("0");
    expect(rotate.cy).toBe("0");
  });

  it("pivots an explicit centre anchor at the bounds centre", () => {
    const { svg } = documentToSvg(
      rotatedShapeDocument({ ...rect, rotation: 30, anchorX: 0.5, anchorY: 0.5 })
    );

    expect(firstGroupTransform(svg)).toBe("translate(100 50) rotate(30 100 50)");
  });

  it("honours an explicit non-centre anchor as a fraction of the local bounds", () => {
    const { svg } = documentToSvg(
      rotatedShapeDocument({ ...rect, rotation: 30, anchorX: 0.25, anchorY: 0.75 })
    );
    const rotate = emittedRotate(firstGroupTransform(svg));

    expect(rotate.cx).toBe("50"); // 0.25 * width
    expect(rotate.cy).toBe("75"); // 0.75 * height
  });

  it("agrees with rotatedBounds on the pivot for the same unanchored rect", () => {
    // A contract test, not an implementation test: the world-space AABB implied by
    // the exported transform must equal what the geometry helper computes for the
    // same rect. If the exporter defaulted to a different pivot than
    // `rotatedBounds`, these bounds would diverge and this test would fail.
    const rotation = 30;
    const { svg } = documentToSvg(rotatedShapeDocument({ ...rect, rotation }));
    const exported = exportedWorldBounds(firstGroupTransform(svg), rect);
    const helper = rotatedBounds(rect, rotation);

    expect(exported.x).toBeCloseTo(helper.x, 3);
    expect(exported.y).toBeCloseTo(helper.y, 3);
    expect(exported.width).toBeCloseTo(helper.width, 3);
    expect(exported.height).toBeCloseTo(helper.height, 3);
  });
});

describe("svg export: caller attributes are hardened", () => {
  it("drops attribute names that are not conservative XML names", () => {
    const { svg } = documentToSvg(wideHeroDocument, {
      attributes: {
        "data-good": "kept",
        "bad name": "dropped",
        "<script>": "dropped",
        'x"onload="alert(1)': "dropped",
        "": "dropped",
      },
    });

    expect(svg).toContain('data-good="kept"');
    expect(svg).not.toContain("bad name");
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("onload");
    expect(svg).not.toContain('="dropped"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("cannot override the exporter-owned viewBox or xmlns", () => {
    const { svg } = documentToSvg(wideHeroDocument, {
      attributes: {
        viewBox: "0 0 1 1",
        xmlns: "urn:not-svg",
        width: "1",
        height: "1",
      },
    });
    const root = rootAttributes(svg);

    expect(attributeValue(root, "viewBox")).toBe(
      `0 0 ${wideHeroDocument.artboard.width} ${wideHeroDocument.artboard.height}`
    );
    expect(attributeValue(root, "xmlns")).toBe("http://www.w3.org/2000/svg");
    expect(attributeValue(root, "width")).toBe("1280");
    expect(attributeValue(root, "height")).toBe("720");
    expect(svg).not.toContain("urn:not-svg");
    expect(svg).not.toContain('viewBox="0 0 1 1"');
  });
});
