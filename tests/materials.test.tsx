import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MATERIALS, WEATHERING, WET } from "../registry/materials/materials-data";
import { f0, findMaterial, fromHex, highlightSpread, lightness, toHex, toStandardMaterial, valueLadder, weathered, wetMaterial } from "../registry/materials/materials-physics";
import { MaterialsSheet } from "../registry/materials/materials-react";

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
