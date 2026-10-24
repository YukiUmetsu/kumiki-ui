import { describe, expect, it } from "vitest";
import type { FontAsset, ImageAsset } from "../registry/media/document";
import { composeEditorialThumbnail, type EditorialThumbnailInput } from "../registry/media/thumbnail-art-direction";
import { composeEditorialVariants } from "../registry/media/thumbnail-variants";
import { inspectThumbnail } from "../registry/media/thumbnail-preflight";

const font: FontAsset = { id: "display", family: "Arial", weight: 800,
  style: "normal", fallback: ["sans-serif"], availability: "system" };
const image = (id: string): ImageAsset => ({ id, mediaType: "image/png", uri: `data:image/png;base64,${id}`,
  width: 1600, height: 900, alt: id, licenseId: "owned", attribution: "test fixture" });
function sample(patch: Partial<EditorialThumbnailInput> = {}): EditorialThumbnailInput {
  return { id: "variation", layout: "subject-left", font, primary: image("subject"),
    headline: [{ text: "THE REAL", tone: "foreground" }, { text: "COST", tone: "accent" }], ...patch };
}

describe("editorial variants", () => {
  it("generates stable distinct IDs for the two subject placements without mutating the input", () => {
    const input = sample();
    const original = JSON.stringify(input);
    const first = composeEditorialVariants(input);
    expect(first.map((candidate) => candidate.layout)).toEqual(["subject-left", "subject-right"]);
    expect(first.map((candidate) => candidate.document.id)).toEqual(["variation-subject-left", "variation-subject-right"]);
    expect(composeEditorialVariants(input)).toEqual(first);
    expect(JSON.stringify(input)).toBe(original);
  });

  it("defaults comparison designs to one comparison variant and permits explicit alternate placements", () => {
    const source = sample({ layout: "split-comparison", secondary: image("comparison") });
    expect(composeEditorialVariants(source).map((candidate) => candidate.layout)).toEqual(["split-comparison"]);
    expect(composeEditorialVariants(source, ["subject-right", "split-comparison"]).map((candidate) => candidate.document.id))
      .toEqual(["variation-subject-right", "variation-split-comparison"]);
  });

  it("rejects comparison variants without a second source image", () => {
    expect(() => composeEditorialVariants(sample(), ["split-comparison"]))
      .toThrow(/second|distinct/i);
  });

  it("checks every critical line for clipping, reserved region, collision and glyph scale", () => {
    const result = composeEditorialThumbnail(sample({ headline: [
      { text: "家の費用", tone: "foreground" },
      { text: "EXPENSIVE", tone: "accent" },
    ] }));
    const line = result.document.layers.find((layer) => layer.id === "headline-1")!;
    line.transform = { ...line.transform, x: 1040, y: 645, width: 230, height: 70 };
    const subject = result.document.layers.find((layer) => layer.id === result.roles.primaryId)!;
    subject.transform = { ...subject.transform, x: 1030, y: 625, width: 200, height: 80 };
    if (line.kind !== "text") throw new Error("headline-1 should be text");
    line.text.size = 12;
    const checks = inspectThumbnail(result);
    expect(checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "thumbnail-reserved-region", layerId: "headline-1" }),
      expect.objectContaining({ code: "thumbnail-text-subject-overlap", layerId: "headline-1" }),
      expect.objectContaining({ code: "thumbnail-text-too-small", layerId: "headline-1" }),
    ]));
    const intentional = inspectThumbnail(result, { intentionalOverlaps: [["headline-1", result.roles.primaryId]] });
    expect(intentional.some((item) => item.code === "thumbnail-text-subject-overlap" && item.layerId === "headline-1")).toBe(false);
  });

  it("identifies overflow on long second lines rather than only inspecting the first", () => {
    const result = composeEditorialThumbnail(sample());
    const line = result.document.layers.find((layer) => layer.id === "headline-1");
    if (line?.kind !== "text") throw new Error("headline-1 should be text");
    line.text.spans = [{ text: "SUPERCALIFRAGILISTICEXPIALIDOCIOUS".repeat(5), color: "#fff" }];
    expect(inspectThumbnail(result)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "thumbnail-text-overflow", layerId: "headline-1" }),
    ]));
  });
});
