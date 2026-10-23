import { describe, expect, it } from "vitest";
import { serializeDocument, validateDocument, type FontAsset, type ImageAsset } from "../registry/media/document";
import { documentToSvg } from "../registry/media/svg-export";
import {
  composeThumbnail,
  ThumbnailCompositionError,
  type ThumbnailCompositionInput,
  type ThumbnailRecipeId,
} from "../registry/media/thumbnail-composition";

const font: FontAsset = {
  id: "display",
  family: "Arial",
  weight: 700,
  style: "normal",
  fallback: ["sans-serif"],
  availability: "system",
};
const primary: ImageAsset = {
  id: "subject-a",
  uri: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
  mediaType: "image/svg+xml",
  width: 1600,
  height: 1000,
  licenseId: "CC0-1.0",
  alt: "First object",
};
const secondary: ImageAsset = {
  ...primary,
  id: "subject-b",
  alt: "Second object",
};

function input(recipe: ThumbnailRecipeId, overrides: Partial<ThumbnailCompositionInput> = {}): ThumbnailCompositionInput {
  return {
    id: `story-${recipe}`,
    recipe,
    primary,
    secondary,
    font,
    headline: "THE REAL COST",
    cue: "$14,000?",
    ...overrides,
  };
}

describe("thumbnail composition", () => {
  it.each<ThumbnailRecipeId>(["hero-fact", "comparison", "hidden-mechanism", "before-after", "scale-surprise"])(
    "%s produces a valid editable 16:9 document with stable semantic IDs",
    (recipe) => {
      const result = composeThumbnail(input(recipe));
      expect(validateDocument(result.document).filter((issue) => issue.severity === "error")).toEqual([]);
      expect(result.document.artboard).toMatchObject({ width: 1280, height: 720, aspect: "16:9" });
      expect(result.document.layers.find((layer) => layer.id === result.roles.primaryId)?.kind).toBe("media");
      expect(result.document.layers.find((layer) => layer.id === result.roles.headlineId)?.kind).toBe("text");
      expect(result.document.assets[primary.id].licenseId).toBe("CC0-1.0");
      expect(serializeDocument(result.document)).toEqual(serializeDocument(composeThumbnail(input(recipe)).document));
    }
  );

  it("uses genuinely different visual compositions for five semantic recipes", () => {
    const renders = (["hero-fact", "comparison", "hidden-mechanism", "before-after", "scale-surprise"] as const)
      .map((recipe) => composeThumbnail(input(recipe)));
    const frames = renders.map(({ document, roles }) => {
      const primaryLayer = document.layers.find((layer) => layer.id === roles.primaryId)!;
      const headlineLayer = document.layers.find((layer) => layer.id === roles.headlineId)!;
      return [primaryLayer.transform.x, primaryLayer.transform.y, primaryLayer.transform.width,
        headlineLayer.transform.x, headlineLayer.transform.y];
    });
    expect(new Set(frames.map((frame) => frame.join(","))).size).toBe(5);
    expect(frames[0][0]).toBeGreaterThan(450); // hero image occupies the right side
    expect(frames[1][0]).toBeLessThan(300); // comparison's first subject is left
    const compared = renders[1];
    const comparedSecond = compared.document.layers.find((layer) => layer.id === compared.roles.secondaryId)!;
    expect(comparedSecond.transform.x).toBeGreaterThan(frames[1][0]);
  });

  it("requires a second real subject for comparison and before-after, but not other recipes", () => {
    for (const recipe of ["comparison", "before-after"] as const) {
      expect(() => composeThumbnail(input(recipe, { secondary: undefined }))).toThrow(ThumbnailCompositionError);
      try { composeThumbnail(input(recipe, { secondary: undefined })); } catch (error) {
        expect((error as ThumbnailCompositionError).diagnostics.map((item) => item.code)).toContain("thumbnail-secondary-required");
      }
    }
    expect(composeThumbnail(input("hero-fact", { secondary: undefined })).document.assets).toHaveProperty(primary.id);
  });

  it("rejects empty claims, non-16:9 canvases and duplicate asset IDs without synthesizing content", () => {
    const cases: Array<[Partial<ThumbnailCompositionInput>, string]> = [
      [{ headline: "  " }, "thumbnail-headline-required"],
      [{ size: { width: 1024, height: 768 } }, "thumbnail-aspect-invalid"],
      [{ secondary: { ...primary } }, "thumbnail-asset-id-duplicate"],
      [{ primary: { ...primary, uri: "" } }, "thumbnail-asset-invalid"],
      [{ primary: { ...primary, mediaType: "application/pdf" } }, "thumbnail-asset-invalid"],
      [{ secondary: { ...secondary, mediaType: "text/plain" } }, "thumbnail-secondary-invalid"],
      [{ id: "my thumbnail" }, "thumbnail-id-invalid"],
      [{ size: { width: 1280.5, height: 720.28125 } }, "thumbnail-aspect-invalid"],
    ];
    for (const [override, code] of cases) {
      try {
        composeThumbnail(input("comparison", override));
        expect.fail(`Expected ${code}`);
      } catch (error) {
        expect(error).toBeInstanceOf(ThumbnailCompositionError);
        expect((error as ThumbnailCompositionError).diagnostics.map((item) => item.code)).toContain(code);
      }
    }
  });

  it("supports an intentional cover crop and normalized focal points without distorting no-crop examples", () => {
    const covered = composeThumbnail(input("comparison", {
      primaryFit: "cover", secondaryFit: "contain",
      primaryFocalPoint: { x: .8, y: .2 },
    }));
    const primaryLayer = covered.document.layers.find((layer) => layer.id === covered.roles.primaryId);
    const secondaryLayer = covered.document.layers.find((layer) => layer.id === covered.roles.secondaryId);
    expect(primaryLayer?.kind).toBe("media");
    expect(secondaryLayer?.kind).toBe("media");
    if (primaryLayer?.kind === "media") expect(primaryLayer.media).toMatchObject({ fit: "cover", focalPoint: { x: .8, y: .2 } });
    if (secondaryLayer?.kind === "media") expect(secondaryLayer.media.fit).toBe("contain");
    const rendered = documentToSvg(covered.document, { resolveAssetHref: (_assetId, uri) => uri });
    expect(rendered.svg).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(rendered.svg).toContain('preserveAspectRatio="xMidYMid meet"');
    const defaultPrimary = composeThumbnail(input("hero-fact")).document.layers.find((layer) => layer.id === "subject-primary");
    if (defaultPrimary?.kind === "media") expect(defaultPrimary.media.fit).toBe("contain");
  });

  it("keeps long Japanese text editable and unmodified", () => {
    const headline = "この家の本当の修理費用はいくらになるのか？";
    const result = composeThumbnail(input("hidden-mechanism", { headline }));
    const title = result.document.layers.find((layer) => layer.id === result.roles.headlineId);
    expect(title?.kind).toBe("text");
    if (title?.kind === "text") expect(title.text.spans.map((span) => span.text).join("")).toBe(headline);
  });
});
