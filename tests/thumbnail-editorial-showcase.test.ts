import { describe, expect, it } from "vitest";
import { validateDocument } from "../registry/media/document";
import { inspectThumbnail } from "../registry/media/thumbnail-preflight";
import { editorialShowcaseCases } from "../src/media/thumbnail-editorial-fixtures";

describe("House Math editorial story fixtures", () => {
  it("provides three photo-led full-bleed compositions with actual editable titles", () => {
    expect(editorialShowcaseCases.map((entry) => entry.id)).toEqual([
      "house-cost-editorial", "hvac-editorial", "rent-buy-editorial",
    ]);
    for (const entry of editorialShowcaseCases) {
      const { document, roles } = entry.result;
      const media = document.layers.filter((layer) => layer.kind === "media");
      const title = document.layers.filter((layer) => layer.kind === "text");
      expect(entry.result.layout).toBe("full-bleed");
      expect(document.artboard).toMatchObject({ width: 1280, height: 720, aspect: "16:9" });
      expect(media.length).toBeGreaterThanOrEqual(1);
      expect(title.length).toBeGreaterThanOrEqual(2);
      expect(roles.headlineIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(media.map((layer) => layer.media.assetId)).size).toBe(media.length);
      expect(media.find((layer) => layer.id === roles.primaryId)).toMatchObject({
        transform: { x: 0, y: 0, width: 1280, height: 720 }, media: { fit: "cover" },
      });
      expect(title.some((layer) => layer.text.size >= 90)).toBe(true);
      expect(title.every((layer) => layer.text.fit === "none" && layer.text.lineBreak === "explicit-only")).toBe(true);
      expect(title.every((layer) => layer.text.spans.every((span) => span.text.trim().length > 0))).toBe(true);
      expect(validateDocument(document).filter((issue) => issue.severity === "error")).toEqual([]);
      expect(inspectThumbnail(entry.result).filter((issue) => issue.severity === "error"))
        .toEqual([]);
      for (const asset of Object.values(document.assets)) {
        expect(asset.uri).toMatch(/^data:image\/(?:jpeg;base64|png;base64|svg\+xml[;,])/);
        expect(asset.attribution?.toLowerCase()).toMatch(/generated|authored/);
        expect(asset.licenseId).not.toBe("CC0-1.0");
      }
    }
    expect(editorialShowcaseCases[0].result.document.layers.filter((layer) => layer.kind === "text")
      .map((layer) => layer.kind === "text" ? layer.text.spans[0].text : "")).toEqual(["$500K", "ISN'T THE COST"]);
    expect(editorialShowcaseCases[1].result.document.layers.filter((layer) => layer.kind === "text")
      .map((layer) => layer.kind === "text" ? layer.text.spans[0].text : "")).toEqual(["WHY SO", "EXPENSIVE?"]);
    expect(editorialShowcaseCases[2].result.document.layers.filter((layer) => layer.kind === "text")
      .map((layer) => layer.kind === "text" ? layer.text.spans[0].text : "")).toEqual(["RENT", "BUY", "VS"]);
  });
});
