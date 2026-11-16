import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ERAS, GARMENTS, OUTFITS, REGIONS } from "../registry/costume/costume-data";
import { findGarments, findOutfits, garmentTags, outfitGarments, parseCostumeQuery, regionWithin } from "../registry/costume/costume-query";
import { garmentShape } from "../registry/costume/costume-shapes";
import { FABRIC_BENDING, PEIRCE_BENDING, bendingLength, foldSpacing, hangingFolds, swagFolds } from "../registry/costume/costume-drape";
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
  it("folds cloth by its stiffness: soft cloth in many narrow folds, stiff cloth in few broad ones", () => {
    for (const r of Object.values(FABRIC_BENDING)) { expect(r.typical).toBeGreaterThanOrEqual(PEIRCE_BENDING.extended[0] - .3); expect(r.typical).toBeLessThanOrEqual(PEIRCE_BENDING.extended[1]); }
    const at = (fabric: string) => hangingFolds({ top: 1, hem: .1, topHalf: .15, hemHalf: .45, bend: bendingLength({ fabrics: [fabric] }), seed: 2 });
    expect(at("silk").count).toBeGreaterThan(at("denim").count);
    expect(at("silk").spacing).toBeCloseTo(foldSpacing(.02), 6);
    // A flared hem folds deeper than a straight tube of the same cloth.
    expect(at("wool").depth).toBeGreaterThan(hangingFolds({ top: 1, hem: .1, topHalf: .45, hemHalf: .45, bend: .03 }).depth);
    // A swag sags most in its middle.
    const sw = swagFolds([0, 1], [1, 1], .2, 1)[0];
    expect(Math.min(...sw.map(p => p[1]))).toBeCloseTo(.8, 6);
  });
  it("wraps left over right, drapes over the left shoulder and gives hakama five front pleats", () => {
    // The top panel's collar is the second collar band; its centreline starts on the viewer's right and goes down to the left.
    for (const id of ["kimono", "yukata", "hanbok", "deel"]) {
      const s = garmentShape(GARMENTS.find(g => g.id === id)!), bands = s.collar.split("M").filter(Boolean).map(x => "M" + x);
      expect(s.neckline, id).toBe("crossed");
      const pts = bands[1].slice(1).replace(/Z$/, "").split("L").map(p => p.trim().split(" ").map(Number));
      const half = pts.length / 2, top = [(pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2], low = [(pts[half - 1][0] + pts[half][0]) / 2, (pts[half - 1][1] + pts[half][1]) / 2];
      expect(top[0], id).toBeGreaterThan(0);
      expect(low[0], id).toBeLessThan(0);
      expect(low[1], id).toBeLessThan(top[1]);
    }
    // The drape's highest point is on the wearer's left shoulder: the viewer's right.
    const highest = (d: string) => { const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number), pairs: number[][] = []; for (let i = 0; i + 1 < n.length; i += 2) pairs.push([n[i], n[i + 1]]); return pairs.reduce((m, p) => (p[1] > m[1] ? p : m)); };
    for (const id of ["sari", "toga"]) expect(highest(garmentShape(GARMENTS.find(g => g.id === id)!).drape)[0], id).toBeGreaterThan(0);
    expect(garmentShape(GARMENTS.find(g => g.id === "hakama")!).pleats.split("M").filter(Boolean)).toHaveLength(5);
    expect(garmentShape(GARMENTS.find(g => g.id === "kilt")!).pattern).toBe("tartan");
  });
});
