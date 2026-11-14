import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { completedRisoFrame, evaluateRisoSheetFeed, RisoSheetFeed } from "../registry/video/riso-sheet-feed";
import { compileFilm } from "../registry/video/film-document";
import { risoExampleArtworks, risoExampleSpec } from "../src/video/riso-print-demo";
import { risoSecondSheetArtworks } from "../src/video/riso-print-demo-alt";
import { RISO_SHEET_FEED_FILM } from "../src/video/riso-print-film";

describe("Risograph sheet feed between film scenes", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    it("compiles five shot scene handoff to " + aspect + " using the existing FD1 slots", () => {
      const result = compileFilm(RISO_SHEET_FEED_FILM, { outputId: aspect });
      expect(result.ok).toBe(true);
      expect(result.diagnostics.filter(x => x.severity === "error")).toEqual([]);
      if (!result.ok) return;
      expect(result.film.scenes).toHaveLength(5);
      expect(result.film.durationFrames).toBe(690);
      expect(result.film.scenes.every(s => s.kind === "slot")).toBe(true);
    });
    it("renders both independent artworks during an intermediate " + aspect + " sheet feed", () => {
      const from = { spec: risoExampleSpec(aspect), artworks: risoExampleArtworks(aspect) };
      const into = { spec: risoExampleSpec(aspect, 37), artworks: risoSecondSheetArtworks(aspect) };
      const html = renderToStaticMarkup(React.createElement(RisoSheetFeed,
        { outgoing: from, incoming: into, frame: 85, startFrame: 0, durationFrames: 170 }));
      expect(html).toContain("data-km-riso-sheet-feed");
      expect(html).toContain("data-km-riso-sheet-incoming");
      expect(html).toContain("data-km-riso-feed-edge");
      expect(html).toContain("HIDDEN");
      expect(html).toContain("FOLLOW");
    });
  }
  it("has exact endpoints with no sheet snapback when seeking backwards", () => {
    const a = risoExampleSpec("landscape"), b = risoExampleSpec("landscape", 37);
    const first = evaluateRisoSheetFeed(a, b, 0, 0, 170);
    expect(first.reveal).toBe(0);
    expect(first.printFrame).toBe(0);
    expect(first.holdFrame).toBe(completedRisoFrame(a));
    const last = evaluateRisoSheetFeed(a, b, 170, 0, 170);
    expect(last.reveal).toBe(1);
    expect(last.printFrame).toBe(completedRisoFrame(b));
    expect(evaluateRisoSheetFeed(a, b, 85, 0, 170).reveal).toBe(.5);
    expect(evaluateRisoSheetFeed(a, b, 170, 0, 170)).toEqual(last);
    expect(evaluateRisoSheetFeed(a, b, 0, 0, 170)).toEqual(first);
    expect(evaluateRisoSheetFeed(a, b, 0, 0, 170, true).reveal).toBe(1);
  });
  it("rejects invalid clocks, mismatched output sizes and different paper stocks", () => {
    const from = risoExampleSpec("landscape"), into = risoExampleSpec("portrait");
    expect(() => evaluateRisoSheetFeed(from, into, 60, 0, 180)).toThrow(/sizes/);
    expect(() => evaluateRisoSheetFeed(from, from, 60, 0, 0)).toThrow(RangeError);
    expect(() => evaluateRisoSheetFeed(from, { ...from, paper: "#AABBCC" }, 60, 0, 180)).toThrow(/paper/);
  });
});
