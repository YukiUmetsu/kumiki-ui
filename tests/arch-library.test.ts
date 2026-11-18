import { describe, expect, it } from "vitest";
import { ARCH_LIBRARY, LIBRARY_GROUPS } from "../registry/anatomy/arch-library";
import { paintArchScene } from "../registry/anatomy/arch-paint";
import { revolve, sphere, spire, union } from "../registry/anatomy/arch-sdf";
import { SceneBuilder, crag } from "../registry/anatomy/arch-kit";

describe("ARCH1 storybook library", () => {
  it("closes a turned part at its own end radius, with no phantom disc", () => {
    // a vase from radius 0.1 at the foot to 0.3 at the belly and 0.05 at the top
    const n = revolve(0, 0, 0, 1, t => 0.1 + 0.2 * Math.sin(Math.PI * t) - 0.05 * t, 0.3, 1);
    expect(n.f(0.2, 1.01, 0)).toBeGreaterThan(0.1);
    expect(n.f(0.0, 1.01, 0)).toBeCloseTo(0.01, 6);
    expect(n.f(0.0, 0.5, 0)).toBeLessThan(0);
  });
  it("bounds a pyramid by its corners, and never reports a far box as a surface", () => {
    // a square pyramid's corners lie at r·√2 from its axis
    const p = spire(100, 0, 0, 10, 10, 4, 1);
    expect(p.hi[0] - 100).toBeGreaterThanOrEqual(10 * Math.SQRT2 - 1e-6);
    // half a metre outside the pyramid's box, near its apex, the surface is metres away: the union must not answer 0.5
    const both = union([sphere(0, 0, 0, 1, 2), p]);
    expect(both.f(100 + 10 * Math.SQRT2 + 0.5, 9, 0)).toBeGreaterThan(1);
  });
  it("builds a crag with a flat top, a wider foot and a distance that never overshoots", () => {
    const b = new SceneBuilder(4);
    crag(b, { x: 0, z: 0, top: 20, base: 0, rx: 12, rz: 8, bench: 0.8, back: { dir: 90, slope: 0.8 }, cap: null, talus: 0, scrub: 0 });
    const f = b.scene({ x: 0, y: 2, z: 60 }, "noon").root.f;
    expect(f(0, 20.2, 0)).toBeGreaterThan(0);
    expect(f(0, 19.8, 0)).toBeLessThan(0);
    // the foot reaches further out than the top along the same line
    let topEdge = 0, footEdge = 0;
    for (let x = 0; x < 40; x += 0.05) { if (f(x, 19.5, 0) < 0) topEdge = x; if (f(x, 1, 0) < 0) footEdge = x; }
    expect(footEdge).toBeGreaterThan(topEdge + 1);
    // a safe step: from any point outside, nothing within the distance the field reports is inside the rock
    let seed = 7, bad = 0, tried = 0;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 3000; k++) {
      const p = [rnd() * 60 - 30, rnd() * 26 - 3, rnd() * 50 - 25], fp = f(p[0], p[1], p[2]);
      if (fp <= 0.01) continue;
      tried++;
      for (let j = 0; j < 12; j++) {
        const dx = rnd() * 2 - 1, dy = rnd() * 2 - 1, dz = rnd() * 2 - 1, l = Math.hypot(dx, dy, dz) || 1, r = fp * 0.999 * Math.cbrt(rnd());
        if (f(p[0] + (dx / l) * r, p[1] + (dy / l) * r, p[2] + (dz / l) * r) < 0) bad++;
      }
    }
    expect(tried).toBeGreaterThan(1000);
    expect(bad).toBe(0);
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
