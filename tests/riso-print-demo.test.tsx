import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import { RisoPrint, printRevealPath } from "../registry/video/print-plates-react";
import { RISO_PRINT_FILM } from "../src/video/riso-print-film";
import { RISO_STAMP, RISO_TEXT_ZONES, risoExampleArtworks, risoExampleSpec } from "../src/video/riso-print-demo";
import { inspectRisoPrint } from "../registry/video/print-plates";

type Bounds = { x: number; y: number; width: number; height: number };
const overlaps = (a: Bounds, b: Bounds) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const rotatedBounds = (stamp: Bounds): Bounds => {
  const radians = Math.PI * 5 / 180;
  return { x: stamp.x, y: stamp.y - stamp.width * Math.sin(radians),
    width: stamp.width * Math.cos(radians) + stamp.height * Math.sin(radians),
    height: stamp.height * Math.cos(radians) + stamp.width * Math.sin(radians) };
};
describe("Risograph film art and Storybook layout contracts", () => {
  it.each(["landscape", "portrait"] as const)("validates the %s poster and stays inside reserved reading regions", aspect => {
    const spec = risoExampleSpec(aspect), zones = RISO_TEXT_ZONES[aspect], stamp = RISO_STAMP[aspect], bounds = rotatedBounds(stamp);
    expect(inspectRisoPrint(spec)).toEqual([]);
    expect(stamp.textLeft + stamp.textMaxWidth).toBeLessThan(stamp.width - 8);
    expect(stamp.textTop).toBeLessThan(stamp.height - 5);
    for (const zone of Object.values(zones)) expect(overlaps(bounds, zone), "stamp should not collide with a title, subtitle or footer").toBe(false);
    expect(bounds.x + bounds.width).toBeLessThan(spec.width - 15);
    expect(bounds.y + bounds.height).toBeLessThan(spec.height - 15);
  });
  it("produces distinct SVG ink groups, a real halftone pattern, a seeded paper mask and an accessible name", () => {
    const spec = risoExampleSpec("landscape");
    const markup = renderToStaticMarkup(React.createElement(RisoPrint, {
      spec, frame: 190, artworks: risoExampleArtworks("landscape"), misregistration: .6, paperGrain: .4,
      label: "Spot ink print",
    }));
    expect(markup).toContain("Spot ink print");
    expect(markup).toContain("mix-blend-mode:multiply");
    expect(markup).toContain("<pattern");
    expect(markup).toContain("maskUnits=");
    expect(markup).toContain("RISO / 02");
    expect(markup).toContain("THE");
    expect(markup).toContain("CURRENT");
  });
  it("keeps print reveal fully empty at 0 and fully covered at 1", () => {
    expect(printRevealPath(960, 540, 0, 7)).toBe("M0 0 H0 V0 Z");
    expect(printRevealPath(960, 540, 1, 7)).toBe("M0 0 H960 V540 H0 Z");
    expect(printRevealPath(960, 540, .4, 7)).toBe(printRevealPath(960, 540, .4, 7));
  });
  it("compiles a three-scene two-output film using the existing FD1 slot and cut system", () => {
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(RISO_PRINT_FILM, { outputId });
      expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.film.scenes).toHaveLength(3);
      expect(result.film.durationFrames).toBe(390);
      expect(result.film.scenes.every(scene => scene.kind === "slot")).toBe(true);
    }
  });
});
