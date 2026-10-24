import { describe, expect, it } from "vitest";
import { serializeDocument, validateDocument, type FontAsset, type ImageAsset } from "../registry/media/document";
import { composeEditorialThumbnail, type EditorialThumbnailInput } from "../registry/media/thumbnail-art-direction";
import { ThumbnailCompositionError } from "../registry/media/thumbnail-composition";

const font: FontAsset = {
  id: "display", family: "Arial", weight: 800, style: "normal", fallback: ["sans-serif"], availability: "system",
};
const asset = (id: string): ImageAsset => ({
  id, mediaType: "image/png", uri: `data:image/png;base64,${id}`, width: 1600, height: 900,
  alt: `Visual ${id}`, attribution: "Authored test fixture", licenseId: "CC0-1.0",
});
const primary = asset("hero");
const secondary = asset("other");
const background = asset("backdrop");

function input(layout: EditorialThumbnailInput["layout"], patch: Partial<EditorialThumbnailInput> = {}): EditorialThumbnailInput {
  return {
    id: "editorial-demo", layout, primary, secondary, background, font,
    headline: [{ text: "WHY SO", tone: "foreground" }, { text: "EXPENSIVE?", tone: "accent" }],
    cue: "$18,000?", ...patch,
  };
}

describe("editorial thumbnail composition", () => {
  it("authors full-bleed photo and freely placed editable typography without flattening copy", () => {
    const result = composeEditorialThumbnail(input("full-bleed", {
      headline: [
        { text: "$500K", tone: "foreground", placement: {
          frame: { x: .035, y: .15, width: .43, height: .26 }, fontSize: 218,
          minFontSize: 170, letterSpacing: -5, lineHeight: .92,
          shadow: { dx: 4, dy: 9, blur: 12, color: "#000000", opacity: .6 },
        } },
        { text: "ISN'T THE COST", tone: "accent", placement: {
          frame: { x: .035, y: .41, width: .48, height: .18 }, fontSize: 91, align: "start",
        } },
      ],
      cue: "30 YEARS?", cuePlacement: {
        frame: { x: .06, y: .76, width: .26, height: .1 }, fontSize: 46,
      },
    }));
    expect(result.document.layers.find((layer) => layer.id === result.roles.primaryId)).toMatchObject({
      kind: "media", transform: { x: 0, y: 0, width: 1280, height: 720 }, media: { fit: "cover" },
    });
    expect(result.document.layers.find((layer) => layer.id === "headline-0")).toMatchObject({
      kind: "text", transform: { x: 44.8, y: 108, width: 550.4, height: 187.2 },
      text: { size: 218, minSize: 170, letterSpacing: -5, lineHeight: .92,
        fit: "none", lineBreak: "explicit-only" },
      appearance: { dropShadow: { blur: 12, opacity: .6 } },
    });
    expect(result.document.layers.find((layer) => layer.id === "cue")).toMatchObject({
      kind: "text", transform: { x: 76.8, y: 547.2, width: 332.8, height: 72 }, text: { size: 46 },
    });
    expect(result.document.assets.hero).toEqual(primary);
    expect(result.document.layers.filter((layer) => layer.kind === "text")).toHaveLength(3);
    expect(validateDocument(result.document).filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("rejects invalid full-bleed text placements and numeric styles before export", () => {
    const valid = { frame: { x: .1, y: .2, width: .3, height: .2 }, fontSize: 90 };
    const cases = [
      { ...valid, frame: { ...valid.frame, x: .8 } },
      { ...valid, frame: { ...valid.frame, width: 0 } },
      { ...valid, frame: { ...valid.frame, y: Number.NaN } },
      { ...valid, fontSize: -1 },
      { ...valid, letterSpacing: Number.NaN },
      { ...valid, minFontSize: 100 },
    ];
    for (const placement of cases) {
      try {
        composeEditorialThumbnail(input("full-bleed", {
          headline: [{ text: "WRONG", tone: "foreground", placement }], cue: undefined,
        }));
        expect.fail("Expected an invalid-placement diagnostic");
      } catch (error) {
        expect(error).toBeInstanceOf(ThumbnailCompositionError);
        expect((error as ThumbnailCompositionError).diagnostics.map((item) => item.code))
          .toContain("thumbnail-text-placement-invalid");
      }
    }
    expect(() => composeEditorialThumbnail(input("full-bleed", {
      headline: [{ text: "MISSING", tone: "foreground" }], cue: undefined,
    }))).toThrow(ThumbnailCompositionError);
  });

  it("preserves full-bleed CJK text as independently editable spans", () => {
    const result = composeEditorialThumbnail(input("full-bleed", {
      headline: [{ text: "家の本当の費用", tone: "foreground", placement: {
        frame: { x: .05, y: .1, width: .75, height: .2 }, fontSize: 82,
      } }], cue: undefined,
    }));
    const title = result.document.layers.find((layer) => layer.id === "headline-0");
    expect(title?.kind).toBe("text");
    if (title?.kind === "text") expect(title.text.spans[0].text).toBe("家の本当の費用");
  });

  it.each(["subject-left", "subject-right", "split-comparison"] as const)(
    "%s yields separate editable subject, backdrop, headline and cue layers", (layout) => {
      const result = composeEditorialThumbnail(input(layout));
      expect(result.recipe).toBe("editorial");
      expect(result.layout).toBe(layout);
      expect(result.document.artboard).toMatchObject({ width: 1280, height: 720, aspect: "16:9" });
      expect(validateDocument(result.document).filter((issue) => issue.severity === "error")).toEqual([]);
      expect(result.document.layers.find((layer) => layer.id === "background")?.kind).toBe("media");
      expect(result.document.layers.find((layer) => layer.id === result.roles.primaryId)?.kind).toBe("media");
      expect(result.roles.headlineIds).toEqual(["headline-0", "headline-1"]);
      for (const line of result.roles.headlineIds) {
        expect(result.document.layers.find((layer) => layer.id === line)?.kind).toBe("text");
      }
      expect(result.document.layers.find((layer) => layer.id === result.roles.cueId)?.kind).toBe("text");
      expect(serializeDocument(result.document)).toBe(serializeDocument(composeEditorialThumbnail(input(layout)).document));
    }
  );

  it("places the focal subject opposite the headline in left/right layouts", () => {
    const left = composeEditorialThumbnail(input("subject-left"));
    const right = composeEditorialThumbnail(input("subject-right"));
    const x = (id: string, result: typeof left) => result.document.layers.find((layer) => layer.id === id)!.transform.x;
    expect(x(left.roles.primaryId, left)).toBeLessThan(x(left.roles.headlineId, left));
    expect(x(right.roles.primaryId, right)).toBeGreaterThan(x(right.roles.headlineId, right));
    expect(left.document.layers.find((layer) => layer.id === left.roles.primaryId)).toMatchObject({ appearance: { dropShadow: { blur: 24 } } });
  });

  it("puts one comparison subject on each side and preserves different headline emphasis", () => {
    const result = composeEditorialThumbnail(input("split-comparison"));
    const left = result.document.layers.find((layer) => layer.id === result.roles.primaryId)!;
    const right = result.document.layers.find((layer) => layer.id === result.roles.secondaryId)!;
    expect(left.transform.x).toBeLessThan(right.transform.x);
    expect(left.transform.y).toBeGreaterThan(100);
    const line0 = result.document.layers.find((layer) => layer.id === "headline-0");
    const line1 = result.document.layers.find((layer) => layer.id === "headline-1");
    if (line0?.kind !== "text" || line1?.kind !== "text") throw new Error("Expected two editable headline text layers");
    expect(line0.text.spans[0].color).not.toBe(line1.text.spans[0].color);
    expect(line0.transform.x).toBeLessThan(line1.transform.x);
  });

  it("keeps graphic props individually editable, normalized and decoratively classified", () => {
    const result = composeEditorialThumbnail(input("subject-right", {
      props: [{ id: "receipt", image: asset("paper"), frame: { x: 0.08, y: 0.56, width: 0.34, height: 0.32 }, z: 28, opacity: .9 }],
    }));
    const prop = result.document.layers.find((layer) => layer.id === "prop-receipt");
    expect(prop?.transform).toMatchObject({ x: 102.4, y: 403.2, width: 435.2, height: 230.4 });
    expect(prop).toMatchObject({ kind: "media", z: 28, opacity: .9, media: { decorative: true } });
    expect(result.document.assets.paper).toBeDefined();
  });

  it("rejects missing required roles and invalid props with actionable composition errors", () => {
    const cases: Array<[Partial<EditorialThumbnailInput>, string]> = [
      [{ secondary: undefined, layout: "split-comparison" }, "thumbnail-secondary-required"],
      [{ headline: [] }, "thumbnail-headline-required"],
      [{ headline: [{ text: " ", tone: "accent" }] }, "thumbnail-headline-required"],
      [{ id: "space in id" }, "thumbnail-id-invalid"],
      [{ primary: { ...primary, uri: "" } }, "thumbnail-asset-invalid"],
      [{ props: [{ id: "bad", image: asset("paper"), frame: { x: -.1, y: 0, width: .4, height: .4 } }] }, "thumbnail-prop-frame-invalid"],
      [{ props: [{ id: "dupe", image: primary, frame: { x: 0, y: 0, width: .4, height: .4 } }] }, "thumbnail-asset-id-duplicate"],
      [{ props: [{ id: "bad", image: asset("paper"), frame: { x: .1, y: .1, width: .3, height: .4 }, opacity: Number.NaN }] }, "thumbnail-prop-opacity-invalid"],
      [{ headline: [{ text: 42 as unknown as string, tone: "accent" }] }, "thumbnail-headline-required"],
      [{ props: [{ id: "no-frame", image: asset("paper"), frame: null as never }] }, "thumbnail-prop-frame-invalid"],
      [{ primary: { ...primary, uri: 123 as unknown as string } }, "thumbnail-asset-invalid"],
      [{ font: { ...font, id: 42 as unknown as string } }, "thumbnail-font-invalid"],
    ];
    for (const [patch, code] of cases) {
      try {
        composeEditorialThumbnail(input("subject-right", patch));
        expect.fail(`Expected ${code}`);
      } catch (error) {
        expect(error).toBeInstanceOf(ThumbnailCompositionError);
        expect((error as ThumbnailCompositionError).diagnostics.map((issue) => issue.code)).toContain(code);
      }
    }
  });

  it("rejects headline counts that collide with the cue or overrun the artboard", () => {
    const longHeadline = [
      { text: "ONE", tone: "foreground" as const },
      { text: "TWO", tone: "accent" as const },
      { text: "THREE", tone: "foreground" as const },
      { text: "FOUR", tone: "accent" as const },
    ];
    for (const [layout, lines] of [
      ["subject-left", longHeadline],
      ["subject-right", longHeadline],
      ["split-comparison", longHeadline.slice(0, 3)],
    ] as const) {
      expect(() => composeEditorialThumbnail(input(layout, { headline: lines }))).toThrowError(ThumbnailCompositionError);
      try {
        composeEditorialThumbnail(input(layout, { headline: lines }));
      } catch (error) {
        expect((error as ThumbnailCompositionError).diagnostics.map((item) => item.code))
          .toContain("thumbnail-headline-layout-limit");
      }
    }
  });

  it("keeps Japanese headline text intact in separate editable lines", () => {
    const line = "家の本当の費用";
    const result = composeEditorialThumbnail(input("subject-left", { headline: [{ text: line, tone: "foreground" }] }));
    const title = result.document.layers.find((layer) => layer.id === result.roles.headlineId);
    expect(title?.kind).toBe("text");
    if (title?.kind === "text") expect(title.text.spans.map((span) => span.text).join("")).toBe(line);
  });
});
