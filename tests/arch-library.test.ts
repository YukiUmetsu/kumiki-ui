import { describe, expect, it } from "vitest";
import { ARCH_LIBRARY, LIBRARY_GROUPS } from "../registry/anatomy/arch-library";
import { paintArchScene } from "../registry/anatomy/arch-paint";

describe("ARCH1 storybook library", () => {
  it("has 100 distinct entries in known traditions, each with its story", () => {
    expect(ARCH_LIBRARY).toHaveLength(100);
    expect(new Set(ARCH_LIBRARY.map(e => e.id)).size).toBe(100);
    const groups = new Set(LIBRARY_GROUPS.map(g => g.id));
    for (const e of ARCH_LIBRARY) {
      expect(groups.has(e.group)).toBe(true);
      expect(e.materials.length).toBeGreaterThan(0);
      expect(e.story.length).toBeGreaterThan(0);
    }
  });
  it("builds every scene with a level camera and its surfaces", () => {
    for (const e of ARCH_LIBRARY) {
      const s = e.build();
      expect(s.surfaces.length, e.id).toBeGreaterThan(0);
      expect(Number.isFinite(s.camera.x) && Number.isFinite(s.camera.z), e.id).toBe(true);
      expect(s.camera.pitch ?? 0, e.id).toBe(0);
    }
  });
  it("paints a plate with a sky, a subject and a lit window at dusk", () => {
    const e = ARCH_LIBRARY.find(x => x.id === "coaching-inn")!;
    const r = paintArchScene(e.build(), { width: 64, height: 36, draft: true });
    let min = 255, max = 0;
    for (let i = 0; i < r.rgba.length; i += 4) { const L = r.rgba[i] + r.rgba[i + 1] + r.rgba[i + 2]; min = Math.min(min, L / 3); max = Math.max(max, L / 3); }
    expect(max - min).toBeGreaterThan(60);
    expect(r.meta.hits).toBeGreaterThan(200);
  });
});
