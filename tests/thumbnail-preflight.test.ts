import { describe, expect, it } from "vitest";
import type { FontAsset, ImageAsset, Layer } from "../registry/media/document";
import { composeThumbnail, type ThumbnailCompositionResult } from "../registry/media/thumbnail-composition";
import { inspectThumbnail } from "../registry/media/thumbnail-preflight";

const font: FontAsset = {
  id: "display", family: "Arial", weight: 700, style: "normal", fallback: ["sans-serif"], availability: "system",
};
const asset: ImageAsset = {
  id: "primary", uri: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
  mediaType: "image/svg+xml", width: 1600, height: 900, alt: "A prominent object", licenseId: "CC0-1.0",
};
function sample(): ThumbnailCompositionResult {
  return composeThumbnail({ id: "thumb", recipe: "hero-fact", primary: asset,
    headline: "THE REAL COST", cue: "$14,000?", font });
}
function move(result: ThumbnailCompositionResult, id: string, patch: Partial<Layer["transform"]>) {
  const layer = result.document.layers.find((candidate) => candidate.id === id)!;
  layer.transform = { ...layer.transform, ...patch };
}
function codes(result: ThumbnailCompositionResult, options?: Parameters<typeof inspectThumbnail>[1]) {
  return inspectThumbnail(result, options).map((diagnostic) => diagnostic.code);
}

describe("thumbnail preflight", () => {
  it("does not flag a valid hero composition as clipped, tiny or colliding", () => {
    const detected = codes(sample());
    expect(detected).not.toContain("thumbnail-primary-too-small");
    expect(detected).not.toContain("thumbnail-subject-clipped");
    expect(detected).not.toContain("thumbnail-text-subject-overlap");
    expect(detected).not.toContain("thumbnail-reserved-region");
  });

  it("flags an undersized focal visual using declared subject geometry", () => {
    const result = sample();
    move(result, result.roles.primaryId, { width: 100, height: 100 });
    expect(codes(result)).toContain("thumbnail-primary-too-small");
  });

  it("reports clipped critical imagery with the relevant layer ID", () => {
    const result = sample();
    move(result, result.roles.primaryId, { x: 1180 });
    const issues = inspectThumbnail(result);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "thumbnail-subject-clipped", layerId: result.roles.primaryId }),
    ]));
  });

  it("protects headline and cue text from a configurable lower-right reserved zone", () => {
    const result = sample();
    move(result, result.roles.cueId!, { x: 1090, y: 650, width: 170, height: 65 });
    expect(codes(result)).toContain("thumbnail-reserved-region");
    expect(codes(result, { reservedCorner: null })).not.toContain("thumbnail-reserved-region");
  });

  it("detects accidental text/subject overlap and permits explicit intentional layering", () => {
    const result = sample();
    move(result, result.roles.headlineId, { x: 610, y: 160, width: 320, height: 170 });
    expect(codes(result)).toContain("thumbnail-text-subject-overlap");
    expect(codes(result, { intentionalOverlaps: [[result.roles.headlineId, result.roles.primaryId]] }))
      .not.toContain("thumbnail-text-subject-overlap");
  });

  it("warns when the headline is unreadably small at feed widths", () => {
    const result = sample();
    const layer = result.document.layers.find((candidate) => candidate.id === result.roles.headlineId);
    if (layer?.kind === "text") layer.text.size = 18;
    expect(codes(result)).toContain("thumbnail-text-too-small");
  });

  it("checks the smallest requested feed width regardless of order, including 96px", () => {
    const result = sample();
    expect(codes(result, { inspectionWidths: [160], minHeadlineDisplayPx: 7 }))
      .not.toContain("thumbnail-text-too-small");
    expect(codes(result, { inspectionWidths: [160, 96], minHeadlineDisplayPx: 7 }))
      .toContain("thumbnail-text-too-small");
    expect(codes(result, { inspectionWidths: [96, 160], minHeadlineDisplayPx: 7 }))
      .toContain("thumbnail-text-too-small");
  });

  it("explicitly reports approximate text metrics when a real canvas measurement is unavailable", () => {
    expect(codes(sample())).toContain("thumbnail-text-metrics-estimated");
  });

  it("rejects invalid inspection and threshold options instead of silently disabling checks", () => {
    for (const options of [
      { inspectionWidths: [] }, { minPrimaryAreaRatio: -1 }, { minHeadlineDisplayPx: Infinity },
      { minCueDisplayPx: -1 }, { maxEssentialLayers: 1.2 },
    ]) expect(() => inspectThumbnail(sample(), options)).toThrow(RangeError);
  });

  it("flags text that cannot fit its box even at the minimum font size", () => {
    const result = sample();
    const layer = result.document.layers.find((candidate) => candidate.id === result.roles.headlineId);
    if (layer?.kind === "text") {
      layer.text.spans = [{ text: "SUPERCALIFRAGILISTICEXPIALIDOCIOUS".repeat(4) }];
    }
    expect(codes(result)).toContain("thumbnail-text-overflow");
  });

  it("calls out excessive essential content density", () => {
    const result = sample();
    const title = result.document.layers.find((layer) => layer.id === result.roles.headlineId)!;
    for (let index = 0; index < 8; index++) result.document.layers.push({ ...title, id: `extra-${index}` });
    expect(codes(result)).toContain("thumbnail-density-risk");
  });

  it("excludes explicitly decorative image layers from the essential density count", () => {
    const result = sample();
    const subject = result.document.layers.find((layer) => layer.id === result.roles.primaryId);
    if (subject?.kind !== "media") throw new Error("Missing primary media");
    for (let index = 0; index < 9; index++) {
      result.document.layers.push({ ...subject, id: `ornament-${index}`,
        media: { ...subject.media, decorative: true } });
    }
    expect(codes(result)).not.toContain("thumbnail-density-risk");
  });

  it("preserves export diagnostics for missing assets and unavailable fonts", () => {
    const result = sample();
    result.document.assets = {};
    expect(codes(result)).toContain("export-asset-missing");
    const withFont = sample();
    withFont.document.fonts.display.availability = "unknown";
    expect(codes(withFont, { availableFontFamilies: [] })).toContain("export-font-unavailable");
  });
});
