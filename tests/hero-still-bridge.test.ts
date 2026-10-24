import { describe, expect, it, vi } from "vitest";
import { captureHeroStill } from "../registry/craft/hero-still-bridge";

function canvas(result: string | Error | DOMException): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = 1280;
  element.height = 720;
  vi.spyOn(element, "toDataURL").mockImplementation(() => {
    if (typeof result !== "string") throw result;
    return result;
  });
  return element;
}

describe("hero still bridge", () => {
  it("turns a captured WebGL still into a self-contained editable-media asset", () => {
    const still = captureHeroStill(canvas("data:image/png;base64,iVBORw0KGgo="), {
      id: "3d-object", alt: "Crafted 3D object", licenseId: "CC0-1.0", attribution: "Owner-made model",
    });
    expect(still).toEqual({
      id: "3d-object", uri: "data:image/png;base64,iVBORw0KGgo=", mediaType: "image/png",
      width: 1280, height: 720, alt: "Crafted 3D object", licenseId: "CC0-1.0", attribution: "Owner-made model",
    });
  });

  it("does not invent redistribution rights when none were supplied", () => {
    const still = captureHeroStill(canvas("data:image/png;base64,iVBORw0KGgo="), { id: "visual", alt: "Hero" });
    expect(still.licenseId).toBeUndefined();
    expect(still.attribution).toBeUndefined();
  });

  it("rejects zero-area canvases and empty capture payloads", () => {
    const empty = canvas("data:image/png;base64,iVBORw0KGgo=");
    empty.width = 0;
    expect(() => captureHeroStill(empty, { id: "zero", alt: "Subject" })).toThrow(/nonzero/);
    expect(() => captureHeroStill(canvas("data:,"), { id: "empty", alt: "Subject" })).toThrow(/empty PNG/);
  });

  it("explains a cross-origin or tainted WebGL canvas error", () => {
    const tainted = canvas(new DOMException("Security violation", "SecurityError"));
    expect(() => captureHeroStill(tainted, { id: "unsafe", alt: "Subject" })).toThrow(/tainted|cross-origin/i);
  });

  it("requires stable identity and accessible description", () => {
    expect(() => captureHeroStill(canvas("data:image/png;base64,iVBORw0KGgo="), { id: " ", alt: "Hero" })).toThrow(/id/);
    expect(() => captureHeroStill(canvas("data:image/png;base64,iVBORw0KGgo="), { id: "hero", alt: " " })).toThrow(/alt/);
  });
});
