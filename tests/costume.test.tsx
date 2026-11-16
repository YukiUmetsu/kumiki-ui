import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ERAS, GARMENTS, OUTFITS, REGIONS } from "../registry/costume/costume-data";
import { findGarments, findOutfits, garmentTags, outfitGarments, parseCostumeQuery, regionWithin } from "../registry/costume/costume-query";
import { garmentShape } from "../registry/costume/costume-shapes";
import { CostumeSheet } from "../registry/costume/costume-react";

describe("COSTUME1 data", () => {
  it("keeps ids unique, regions known, periods ordered and sources cited", () => {
    expect(new Set(GARMENTS.map(g => g.id)).size).toBe(GARMENTS.length);
    const regions = new Set(REGIONS.map(r => r.id));
    for (const g of GARMENTS) {
      expect(regions.has(g.region)).toBe(true);
      expect(g.period.to === null || g.period.to >= g.period.from).toBe(true);
      expect(g.source).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      for (const c of g.countries) expect(c).toMatch(/^[A-Z]{2}$/);
      for (const e of g.eras ?? []) expect(ERAS.some(x => x.id === e)).toBe(true);
    }
    for (const o of OUTFITS) expect(outfitGarments(o)).toHaveLength(o.garments.length);
  });
});

describe("COSTUME1 tags", () => {
  it("parses facets and free words", () => {
    expect(parseCostumeQuery("region:eastern-asia year:1700 worn:women silk")).toEqual({ region: "eastern-asia", year: 1700, worn: "women", text: "silk" });
    expect(parseCostumeQuery("country:jp").country).toBe("JP");
  });
  it("finds by place through the region tree, by time and by wearer", () => {
    expect(regionWithin("eastern-asia", "asia")).toBe(true);
    const ids = findGarments("region:eastern-asia year:1700 worn:women").map(g => g.id);
    expect(ids).toEqual(expect.arrayContaining(["kosode", "furisode", "chima"]));
    expect(ids).not.toContain("sokutai");
    expect(ids).not.toContain("cheongsam");
    expect(findGarments("region:asia").some(g => g.id === "sari")).toBe(true);
    expect(findGarments("era:victorian").map(g => g.id)).toEqual(expect.arrayContaining(["crinoline", "bustle", "frock-coat"]));
    expect(findGarments("climate:cold").map(g => g.id)).toEqual(expect.arrayContaining(["parka", "poncho", "deel"]));
    expect(findOutfits("era:victorian").every(o => o.year >= 1812 && o.year <= 1926)).toBe(true);
  });
  it("exports every garment's tags as facet:value strings", () => {
    const tags = garmentTags(GARMENTS.find(g => g.id === "kimono")!);
    expect(tags).toEqual(expect.arrayContaining(["region:eastern-asia", "country:JP", "slot:full", "cut:straight-cut"]));
  });
});

describe("COSTUME1 silhouettes", () => {
  it("draws every garment without NaN and renders the sheet", () => {
    for (const g of GARMENTS) { const s = garmentShape(g); expect(`${s.body}${s.sleeves}${s.details}${s.legs}`).not.toMatch(/NaN/); }
    const html = renderToStaticMarkup(<CostumeSheet />);
    expect(html).toContain("Jūnihitoe");
    expect(html).not.toMatch(/NaN|undefined/);
  });
});
