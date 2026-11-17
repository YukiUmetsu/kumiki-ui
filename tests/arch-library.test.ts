import { describe, expect, it } from "vitest";
import { ARCH_LIBRARY, LIBRARY_GROUPS } from "../registry/anatomy/arch-library";
import { paintArchScene } from "../registry/anatomy/arch-paint";
import { revolve } from "../registry/anatomy/arch-sdf";

describe("ARCH1 storybook library", () => {
  it("closes a turned part at its own end radius, with no phantom disc", () => {
    // a vase from radius 0.1 at the foot to 0.3 at the belly and 0.05 at the top
    const n = revolve(0, 0, 0, 1, t => 0.1 + 0.2 * Math.sin(Math.PI * t) - 0.05 * t, 0.3, 1);
    expect(n.f(0.2, 1.01, 0)).toBeGreaterThan(0.1);
    expect(n.f(0.0, 1.01, 0)).toBeCloseTo(0.01, 6);
    expect(n.f(0.0, 0.5, 0)).toBeLessThan(0);
  });
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

describe("ARCH1 module showcase", () => {
  it("has distinct modules in every family, each building a studio scene", async () => {
    const { ARCH_MODULES, MODULE_GROUPS, moduleScene } = await import("../registry/anatomy/arch-modules");
    expect(new Set(ARCH_MODULES.map(m => m.id)).size).toBe(ARCH_MODULES.length);
    for (const g of MODULE_GROUPS) expect(ARCH_MODULES.some(m => m.group === g.id), g.id).toBe(true);
    for (const m of ARCH_MODULES) { const s = moduleScene(m.id); expect(s.mood, m.id).toBe("studio"); expect(s.camera.pitch ?? 0, m.id).toBe(0); }
  });
});
