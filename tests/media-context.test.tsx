import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  clampZoom,
  cssToDesign,
  DEFAULT_MEDIA_CANVAS,
  designToCss,
  MediaCanvasContext,
  useMediaCanvas,
  useMediaCanvasOrDefault,
} from "../src/media/media-context";
import type { MediaCanvasContextValue } from "../src/media/media-context";
import { createArtboard } from "../src/media/document";

/**
 * The shared media-canvas context contract.
 *
 * Every media component must render standalone, so these tests pin the two
 * behaviours a consumer depends on: `useMediaCanvas` returns `null` with no
 * ancestor (letting a component opt into authoring chrome), and
 * `useMediaCanvasOrDefault` never throws, falling back to a 16:9 standalone
 * artboard. The pure zoom/coordinate helpers are the geometry both overlays and
 * layers share, so their clamping and inverse relationship are asserted directly.
 */

const custom: MediaCanvasContextValue = {
  artboard: createArtboard({ id: "custom", preset: "4:5", background: "#ffffff" }),
  zoom: 2,
  pan: { x: 5, y: 6 },
  scale: 2,
  offset: { x: 10, y: 20 },
  editing: true,
  selectedIds: ["layer-1"],
  guides: [],
  diagnostics: [],
};

function wrapper({ children }: { children: ReactNode }) {
  return <MediaCanvasContext.Provider value={custom}>{children}</MediaCanvasContext.Provider>;
}

describe("useMediaCanvas", () => {
  it("returns null when there is no Artboard ancestor", () => {
    const { result } = renderHook(() => useMediaCanvas());
    expect(result.current).toBeNull();
  });

  it("returns the surrounding canvas value when provided", () => {
    const { result } = renderHook(() => useMediaCanvas(), { wrapper });
    expect(result.current).toBe(custom);
  });
});

describe("useMediaCanvasOrDefault", () => {
  it("falls back to the standalone default and never throws", () => {
    const { result } = renderHook(() => useMediaCanvasOrDefault());
    expect(result.current).toBe(DEFAULT_MEDIA_CANVAS);
  });

  it("prefers the surrounding canvas when one exists", () => {
    const { result } = renderHook(() => useMediaCanvasOrDefault(), { wrapper });
    expect(result.current).toBe(custom);
  });
});

describe("DEFAULT_MEDIA_CANVAS", () => {
  it("describes a 1280×720 standalone artboard at 1× with nothing selected", () => {
    expect(DEFAULT_MEDIA_CANVAS.artboard.width).toBe(1280);
    expect(DEFAULT_MEDIA_CANVAS.artboard.height).toBe(720);
    expect(DEFAULT_MEDIA_CANVAS.artboard.aspect).toBe("16:9");
    expect(DEFAULT_MEDIA_CANVAS.zoom).toBe(1);
    expect(DEFAULT_MEDIA_CANVAS.scale).toBe(1);
    expect(DEFAULT_MEDIA_CANVAS.pan).toEqual({ x: 0, y: 0 });
    expect(DEFAULT_MEDIA_CANVAS.offset).toEqual({ x: 0, y: 0 });
    expect(DEFAULT_MEDIA_CANVAS.editing).toBe(false);
    expect(DEFAULT_MEDIA_CANVAS.selectedIds).toEqual([]);
    expect(DEFAULT_MEDIA_CANVAS.guides).toEqual([]);
  });
});

describe("clampZoom", () => {
  it("clamps a finite zoom into the safe range", () => {
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(1000)).toBe(64);
    expect(clampZoom(0)).toBe(0.02);
    expect(clampZoom(-5)).toBe(0.02);
  });

  it("returns 1 for a non-finite zoom", () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampZoom(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("designToCss / cssToDesign", () => {
  const canvas = { scale: 2, offset: { x: 10, y: 20 } };

  it("applies the scale then the offset", () => {
    expect(designToCss({ x: 2, y: 3 }, canvas)).toEqual({ x: 14, y: 26 });
  });

  it("is the exact inverse of designToCss", () => {
    const css = designToCss({ x: 7, y: 11 }, canvas);
    expect(cssToDesign(css, canvas)).toEqual({ x: 7, y: 11 });
  });

  it("treats a zero scale as 1 instead of producing Infinity", () => {
    expect(cssToDesign({ x: 10, y: 20 }, { scale: 0, offset: { x: 10, y: 20 } })).toEqual({ x: 0, y: 0 });
  });
});
