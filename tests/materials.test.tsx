import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MATERIALS, WEATHERING, WET } from "../registry/materials/materials-data";
import { f0, findMaterial, fromHex, highlightSpread, lightness, toHex, toStandardMaterial, valueLadder, weathered, wetMaterial } from "../registry/materials/materials-physics";
import { MaterialsSheet } from "../registry/materials/materials-react";
import { renderMaterialSwatch } from "../registry/materials/materials-render";
import { TEXTURE_CALIBRATION, TEXTURE_FACTS, materialTexture, textureStats } from "../registry/materials/materials-texture";

describe("MATL1 data", () => {
  it("gives every material a unique id, a colour in range, a grade and a source", () => {
    expect(new Set(MATERIALS.map(m => m.id)).size).toBe(MATERIALS.length);
    for (const m of MATERIALS) {
      expect(m.albedo.every(c => c >= 0 && c <= 1)).toBe(true);
      expect(m.roughness.min).toBeLessThanOrEqual(m.roughness.typical);
      expect(m.roughness.typical).toBeLessThanOrEqual(m.roughness.max);
      expect(m.source.length).toBeGreaterThan(10);
      expect(["reported", "measured", "estimated"]).toContain(m.grade);
    }
  });
  it("keeps weathering stages in time order", () => {
    for (const w of Object.values(WEATHERING)) for (let i = 1; i < w.stages.length; i++) expect(w.stages[i].at).toBeGreaterThan(w.stages[i - 1].at);
  });
});

describe("MATL1 physics", () => {
  it("round-trips sRGB and puts white near L* 100 and black near 0", () => {
    expect(toHex(fromHex("#5c817f"))).toBe("#5c817f");
    expect(lightness([1, 1, 1])).toBeCloseTo(100, 5);
    expect(lightness([0, 0, 0])).toBe(0);
    expect(lightness(findMaterial("snow")!.albedo)).toBeGreaterThan(lightness(findMaterial("charcoal")!.albedo) + 60);
    { const ladder = valueLadder(); expect(ladder[0].L).toBeLessThan(ladder[ladder.length - 1].L); }
  });
  it("reflects about 4% for glass-like dielectrics and the metal's colour for metals", () => {
    expect(f0(findMaterial("brick")!)[0]).toBeCloseTo(.04, 3);
    expect(f0(findMaterial("gold")!)).toEqual(findMaterial("gold")!.albedo);
    expect(highlightSpread(.1)).toBeLessThan(highlightSpread(.6));
    const p = toStandardMaterial(findMaterial("copper")!);
    expect(p.metalness).toBe(1);
    expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("darkens porous materials when wet, near Ångström's measured sand, and leaves metals' colour alone", () => {
    const sand = { ...findMaterial("sand")!, albedo: [WET.measured[0].dry, WET.measured[0].dry, WET.measured[0].dry] as const };
    expect(wetMaterial(sand, 1).albedo[0]).toBeCloseTo(WET.measured[0].wet, 1);
    expect(wetMaterial(findMaterial("terracotta")!, 1).darkening).toBeLessThan(.75);
    expect(wetMaterial(findMaterial("gold")!, 1).albedo).toEqual(findMaterial("gold")!.albedo);
    expect(wetMaterial(findMaterial("plaster-white")!, 1).roughness).toBeLessThan(findMaterial("plaster-white")!.roughness.typical);
  });
  it("ages copper to green on its reported clocks, faster by the sea", () => {
    expect(weathered("copper", 0).metal).toBe(1);
    expect(weathered("copper", 25).label).toMatch(/green/);
    expect(weathered("copper", 8, "marine").label).toMatch(/green/);
    expect(weathered("copper", 8, "rural").label).not.toMatch(/green/);
    expect(lightness(weathered("wood", 2).albedo)).toBeLessThan(lightness(weathered("wood", 0).albedo));
  });
  it("renders the sheet without NaN", () => {
    const html = renderToStaticMarkup(<MaterialsSheet />);
    expect(html).toContain("verdigris");
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe("MATL1 textures and rendered swatches", () => {
  it("gives every material a texture with finite samples, a scale and known facts", () => {
    for (const m of MATERIALS) {
      const t = materialTexture(m.id);
      expect(t.extentMm).toBeGreaterThan(0);
      expect(t.ballMm).toBeGreaterThan(0);
      for (const f of t.facts) expect(TEXTURE_FACTS[f]).toBeDefined();
      for (const [x, y] of [[0, 0], [7.3, -11.1], [-23.5, 31.7]]) {
        const s = t.sample(x, y);
        expect([...s.a, s.h, s.r].every(Number.isFinite)).toBe(true);
        expect(s.r).toBeGreaterThanOrEqual(0);
      }
      if (t.solid) expect(Number.isFinite(t.solid(3, 4, 5).h)).toBe(true);
    }
  });
  it("matches the tone spread measured on the CC0 maps it is calibrated to", () => {
    for (const [id, c] of Object.entries(TEXTURE_CALIBRATION)) {
      const s = textureStats(id, undefined, 72);
      expect(Math.abs(s.pct[0] - c.pct[0]), `${id} p10`).toBeLessThan(0.14);
      expect(Math.abs(s.pct[2] - c.pct[2]), `${id} p90`).toBeLessThan(0.14);
    }
  }, 60000);
  it("builds the structure at its reported size: tatami wales about 1.5 cm, weathered latewood standing above earlywood", () => {
    const tatami = materialTexture("tatami"), ys = Array.from({ length: 600 }, (_, i) => i * 0.1), h = ys.map(y => tatami.sample(0.71, y).h);
    const grooves = ys.filter((_, i) => i > 0 && i < ys.length - 1 && h[i] < h[i - 1] && h[i] <= h[i + 1] && h[i] < Math.min(...h) + 0.05);
    const gaps = grooves.slice(1).map((y, i) => y - grooves[i]).filter(g => g > 5);
    expect(gaps.length).toBeGreaterThan(1);
    for (const g of gaps) expect(g).toBeCloseTo(14.2, 0);
    const wood = materialTexture("wood-weathered"), across = Array.from({ length: 400 }, (_, i) => wood.sample(5, -20 + i * 0.1).h);
    const relief = Math.max(...across) - Math.min(...across);
    expect(relief).toBeGreaterThan(0.5); // 25 years at the reported earlywood and latewood erosion rates: about 0.9 mm
    expect(relief).toBeLessThan(4);
  });
  it("renders a ball and a raking-light tile, the same every time, darker when wet", () => {
    const a = renderMaterialSwatch("terracotta", { view: "tile", size: 24, supersample: 1 }), b = renderMaterialSwatch("terracotta", { view: "tile", size: 24, supersample: 1 });
    expect(a.rgba.length).toBe(24 * 24 * 4);
    expect(Array.from(a.rgba)).toEqual(Array.from(b.rgba));
    const wet = renderMaterialSwatch("terracotta", { view: "tile", size: 24, supersample: 1, wet: 1 });
    const mean = (px: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; return s / (px.length / 4); };
    expect(mean(wet.rgba)).toBeLessThan(mean(a.rgba) * 0.92);
    const ball = renderMaterialSwatch("wood-light", { view: "ball", size: 24, supersample: 1 });
    expect(ball.rgba.length).toBe(24 * 24 * 4);
    expect(ball.extentMm).toBe(materialTexture("wood-light").ballMm);
  });
});
