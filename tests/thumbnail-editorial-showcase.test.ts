import { describe, expect, it } from "vitest";
import { validateDocument } from "../registry/media/document";
import { inspectThumbnail } from "../registry/media/thumbnail-preflight";
import { editorialShowcaseCases } from "../src/media/thumbnail-editorial-fixtures";

describe("House Math editorial story fixtures", () => {
  it("provides three authored photoreal examples with separate, editable source imagery and type", () => {
    expect(editorialShowcaseCases.map((entry) => entry.id)).toEqual([
      "house-cost-editorial", "hvac-editorial", "rent-buy-editorial",
    ]);
    for (const entry of editorialShowcaseCases) {
      const { document, roles } = entry.result;
      const media = document.layers.filter((layer) => layer.kind === "media");
      const title = document.layers.filter((layer) => layer.kind === "text");
      expect(document.artboard).toMatchObject({ width: 1280, height: 720, aspect: "16:9" });
      expect(media.length).toBeGreaterThanOrEqual(2);
      expect(title.length).toBeGreaterThanOrEqual(2);
      expect(roles.headlineIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(media.map((layer) => layer.media.assetId)).size).toBe(media.length);
      expect(media.some((layer) => layer.id === "background")).toBe(true);
      expect(media.some((layer) => layer.id.startsWith("prop-"))).toBe(true);
      expect(title.every((layer) => layer.text.spans.every((span) => span.text.trim().length > 0))).toBe(true);
      expect(validateDocument(document).filter((issue) => issue.severity === "error")).toEqual([]);
      expect(inspectThumbnail(entry.result).filter((issue) => issue.severity === "error"))
        .toEqual([]);
      for (const asset of Object.values(document.assets)) {
        expect(asset.uri).toMatch(/^data:image\/(?:png;base64|svg\+xml[;,])/);
        expect(asset.attribution?.toLowerCase()).toMatch(/generated|authored/);
        expect(asset.licenseId).not.toBe("CC0-1.0");
      }
    }
  });
});
