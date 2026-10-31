import { describe, expect, it, vi } from "vitest";
import { Mesh } from "three";

vi.mock("troika-three-text", () => ({
  Text: class MockText extends Mesh {
    text = ""; font = ""; fontSize = 0; maxWidth = 0;
    anchorX = ""; anchorY = ""; textAlign = "";
    color = 0; outlineWidth = 0; outlineColor = 0;
    unicodeFontsURL: string | null = null;
    disposed = false;
    sync(callback: () => void) { queueMicrotask(callback); }
    dispose() { this.disposed = true; }
  },
}));

import { createCraftTextLabel, validateCraftTextLabelSpec } from "../registry/craft/text-label";
import type { CraftTextLabelSpec } from "../registry/craft/text-label";

const spec: CraftTextLabelSpec = {
  schemaVersion: 1, id: "hardware-label", text: "INPUT 12V / DC",
  fontUrl: "/fonts/ApprovedSans.ttf", fontSize: .18, at: [0, 1, .2],
  anchorX: "center", anchorY: "middle", color: 0xecf1ea,
  outline: { width: .008, color: 0x09111a },
};

describe("crisp world-space text labels", () => {
  it("prepares an exact text mesh and awaits sync before export", async () => {
    const label = createCraftTextLabel(spec);
    expect(label.mesh.text).toBe("INPUT 12V / DC");
    expect(label.mesh.font).toBe(spec.fontUrl);
    expect(label.mesh.position.toArray()).toEqual([0, 1, .2]);
    expect(label.mesh.anchorX).toBe("center");
    expect(label.mesh.outlineWidth).toBe(.008);
    await label.ready;
    label.dispose(); label.dispose();
    expect(label.mesh).toHaveProperty("disposed", true);
  });

  it("requires a real, explicit font, not Troika's remote default or unsupported woff2", () => {
    expect(() => validateCraftTextLabelSpec({ ...spec, fontUrl: "" })).toThrow(/approved/);
    expect(() => validateCraftTextLabelSpec({ ...spec, fontUrl: "https://cdn/fonts/font.woff2" })).toThrow(/woff/);
    expect(() => validateCraftTextLabelSpec({ ...spec, fontUrl: "javascript:alert(1)" })).toThrow(/approved/);
  });

  it("requires explicit fallback metadata for non-ASCII typography", () => {
    expect(() => validateCraftTextLabelSpec({ ...spec, text: "温度 27°" })).toThrow(/Unicode/);
    expect(() => validateCraftTextLabelSpec({ ...spec, text: "温度 27°", unicodeFontsURL: "/fonts/unicode-data" })).not.toThrow();
  });

  it("rejects invalid pose, sizes, styles and unbounded text", () => {
    expect(() => validateCraftTextLabelSpec({ ...spec, at: [NaN, 1, 0] })).toThrow(/finite/);
    expect(() => validateCraftTextLabelSpec({ ...spec, text: "a".repeat(301) })).toThrow(/300/);
    expect(() => validateCraftTextLabelSpec({ ...spec, outline: { width: .2, color: 0xffffff } })).toThrow(/outline/);
    expect(() => validateCraftTextLabelSpec({ ...spec, maxWidth: 0 })).toThrow(/maxWidth/);
  });
});
