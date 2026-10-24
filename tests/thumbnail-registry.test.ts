import { describe, expect, it } from "vitest";
import manifest from "../registry.json";
import { validateDocument } from "../registry/media/document";
import { documentToSvg } from "../registry/media/svg-export";
import { thumbnailShowcaseCases } from "../src/media/thumbnail-fixtures";

describe("thumbnail source distribution", () => {
  it("offers two isolated 2D registry entries and one optional browser capture adapter", () => {
    const entries = new Map(manifest.items.map((entry) => [entry.name, entry]));
    for (const name of ["thumbnail-composition", "thumbnail-preflight", "hero-still-bridge"]) {
      expect(entries.has(name)).toBe(true);
      expect(entries.get(name)?.files.length).toBeGreaterThan(0);
    }
    const composition = entries.get("thumbnail-composition")!;
    const preflight = entries.get("thumbnail-preflight")!;
    const bridge = entries.get("hero-still-bridge")!;
    expect(composition.registryDependencies).toContain("media-document");
    expect(preflight.registryDependencies).toContain("thumbnail-composition");
    expect(bridge.registryDependencies).toContain("media-document");
    expect(composition.dependencies ?? []).not.toContain("three");
    expect(preflight.dependencies ?? []).not.toContain("three");
  });

  it("shares the exact M0 SVG renderer for all five recipes and three educational demonstrations", () => {
    expect(thumbnailShowcaseCases).toHaveLength(8);
    expect(thumbnailShowcaseCases.filter((item) => item.group === "recipe")).toHaveLength(5);
    expect(thumbnailShowcaseCases.filter((item) => item.group === "educational-demo")).toHaveLength(3);
    for (const scenario of thumbnailShowcaseCases) {
      const { document } = scenario.result;
      expect(validateDocument(document).filter((issue) => issue.severity === "error")).toEqual([]);
      const rendered = documentToSvg(document);
      expect(rendered.svg).toContain("<svg");
      const svg = new DOMParser().parseFromString(rendered.svg, "image/svg+xml");
      expect(svg.querySelector("title")?.textContent).toBe(document.metadata?.title);
    }
  });
});
