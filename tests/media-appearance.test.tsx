import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayerStack } from "../registry/media/layer-stack";
import { validateDocument, type MediaDocument } from "../registry/media/document";
import { documentToSvg } from "../registry/media/svg-export";
import { wideHeroDocument } from "../src/media/fixtures";

const shadow = { dx: 12, dy: 18, blur: 24, color: "#142536", opacity: 0.65 };

function documentWithShadow(effect = shadow): MediaDocument {
  return {
    ...wideHeroDocument,
    layers: wideHeroDocument.layers.map((layer) => layer.kind === "media"
      ? { ...layer, appearance: { dropShadow: effect } }
      : layer),
  } as MediaDocument;
}

describe("portable media appearance", () => {
  it("validates finite, bounded shadow values and SVG-compatible colors", () => {
    expect(validateDocument(documentWithShadow()).filter((issue) => issue.severity === "error")).toEqual([]);
    for (const invalid of [
      { ...shadow, dx: Number.NaN },
      { ...shadow, blur: -1 },
      { ...shadow, blur: Number.POSITIVE_INFINITY },
      { ...shadow, opacity: 1.1 },
      { ...shadow, color: "url(javascript:alert(1))" },
    ]) {
      expect(validateDocument(documentWithShadow(invalid)).some((issue) =>
        issue.severity === "error" && issue.path?.includes("appearance.dropShadow"))).toBe(true);
    }
  });

  it("exports one stable drop shadow filter and applies it to the image layer", () => {
    const doc = documentWithShadow();
    const first = documentToSvg(doc);
    const second = documentToSvg(doc);
    expect(first.svg).toBe(second.svg);
    // feDropShadow is not supported by some desktop SVG readers (including
    // the Inkscape renderer used by the still-image visual QA). Unsupported
    // filters can make an otherwise valid hero image disappear entirely.
    expect(first.svg).not.toContain("feDropShadow");
    expect(first.svg).toContain('<feGaussianBlur in="SourceAlpha" stdDeviation="24" result="shadow-blur"/>');
    expect(first.svg).toContain('<feOffset in="shadow-blur" dx="12" dy="18" result="shadow-offset"/>');
    expect(first.svg).toContain('<feFlood flood-color="#142536" flood-opacity="0.65" result="shadow-color"/>');
    expect(first.svg).toContain('<feMergeNode in="SourceGraphic"/>');
    expect(first.svg).toMatch(/<filter id="km-shadow-[^"]+"/);
    expect(first.svg).toMatch(/<g [^>]*filter="url\(#km-shadow-[^)]*\)"/);
    expect(first.diagnostics.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("expands a small subject's SVG filter bounds enough for offset, blurred shadows", () => {
    const small = {
      ...documentWithShadow({ ...shadow, dx: 40, dy: 30 }),
      layers: documentWithShadow({ ...shadow, dx: 40, dy: 30 }).layers.map((layer) =>
        layer.kind === "media" ? { ...layer, transform: { x: 200, y: 200, width: 20, height: 20 } } : layer),
    } as MediaDocument;
    const svg = documentToSvg(small).svg;
    const bounds = /<filter id="km-shadow-[^"]+" x="(-?[\d.]+)%" y="(-?[\d.]+)%" width="([\d.]+)%" height="([\d.]+)%"/.exec(svg);
    expect(bounds).not.toBeNull();
    expect(Number(bounds?.[1])).toBeLessThan(-50);
    expect(Number(bounds?.[2])).toBeLessThan(-50);
    expect(Number(bounds?.[3])).toBeGreaterThan(200);
    expect(Number(bounds?.[4])).toBeGreaterThan(200);
  });

  it("renders equivalent CSS drop-shadow in the editable layer preview", () => {
    const doc = documentWithShadow();
    const html = renderToStaticMarkup(<LayerStack layers={doc.layers} fonts={doc.fonts} assets={doc.assets} />);
    expect(html).toContain("drop-shadow(12px 18px 24px rgba(20, 37, 54, 0.65))");
  });

  it("leaves a document without appearances completely unchanged", () => {
    const originalSvg = documentToSvg(wideHeroDocument).svg;
    expect(originalSvg).not.toContain("km-shadow-");
    expect(documentToSvg({ ...wideHeroDocument, layers: wideHeroDocument.layers.map((layer) => ({ ...layer })) }).svg).toBe(originalSvg);
  });
});
