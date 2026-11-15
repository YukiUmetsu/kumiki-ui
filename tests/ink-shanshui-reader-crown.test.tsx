import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {READER_CROWN_STRUCTURE,readerCrownRegions,readerCrownShapes} from
  "../src/video/ink-shanshui-reader-crown";
import {scrollReaderFacePortrait} from "../src/video/ink-shanshui-reader-face";
import {shanshuiFaceAssets} from "../src/video/ink-shanshui-face-plates";
import {makeShanshuiScholar,shanshuiScholarInstance,InkShanshuiFilm} from
  "../src/video/ink-shanshui-film";
import {DEFAULT_SHANSHUI} from "../registry/video/ink-shanshui";
import {validateCharacterDefinition} from "../registry/character/validate";
const A=(k:string):string=>JSON.stringify(scrollReaderFacePortrait(1)[k]);
describe("ArtCraft: isolated scroll-reader crown (no other part edits)",()=>{
  it("uses nine observed semantic regions in source-informed back-to-front order",()=>{
    const regions=readerCrownRegions(1);
    expect(Object.keys(regions)).toEqual([
      "trailing-silk","rear-tie-wing","sideburn","rear-topknot",
      "front-topknot","cap-shell","forehead-band","fold-lines","dry-ink-grain",
    ]);
    expect(READER_CROWN_STRUCTURE.map(r=>r.id)).toEqual(Object.keys(regions));
    for(const region of READER_CROWN_STRUCTURE){
      expect(region.description.length).toBeGreaterThan(30);
      expect(region.attachments.length).toBeGreaterThan(0);
      expect(["observed","interpreted"]).toContain(region.confidence);
      expect(regions[region.id].length).toBeGreaterThanOrEqual(
        region.id==="dry-ink-grain"?1:2);
      for(const p of region.attachments){
        expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(260);
        expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(340);
      }
    }
    expect(readerCrownShapes(1)).toEqual(
      Object.values(regions).flatMap(x=>x));
  });
  it("renders full-opacity, connected main cap masses and a properly sloping band",()=>{
    const r=readerCrownRegions(1);
    for(const name of ["rear-tie-wing","sideburn","rear-topknot",
      "front-topknot","cap-shell","forehead-band"] as const){
      const base=r[name][0];
      expect(base.type).toBe("path");
      if(base.type!=="path")throw Error("Expected silhouette path");
      expect(base.fill).not.toBe("none");
      expect(base.opacity).toBe(1);
      expect(base.d).toMatch(/C/);
      expect(base.d).toMatch(/Z/);
    }
    // Source band slopes down toward RIGHT brow, unlike former rigid helmet.
    const front=READER_CROWN_STRUCTURE.find(x=>x.id==="forehead-band")!;
    expect(front.attachments[0].y).toBeLessThan(front.attachments[1].y);
    const band=r["forehead-band"][0];
    if(band.type!=="path")throw Error("Expected band silhouette");
    expect(band.d).toContain("168.6 90.2");
    const silk=r["trailing-silk"][0];
    if(silk.type!=="path")throw Error("Expected ribbon geometry");
    expect(silk.d).toContain("45.3 111.1");
    expect(silk.d).toContain("122.6 74.7");
    expect(r["trailing-silk"][0].opacity).toBeGreaterThan(.85);
  });
  it("restricts pigment microdetail to higher tier while retaining complete base cap",()=>{
    const low=readerCrownRegions(.05),mid=readerCrownRegions(.55),
      high=readerCrownRegions(1);
    expect(low["dry-ink-grain"]).toHaveLength(0);
    expect(mid["dry-ink-grain"].length).toBeGreaterThan(0);
    expect(high["dry-ink-grain"].length).toBeGreaterThan(mid["dry-ink-grain"].length);
    for(const id of ["front-topknot","rear-topknot","forehead-band",
      "trailing-silk","cap-shell"] as const){
      expect(low[id].length).toBeGreaterThan(0);
      expect(high[id].length).toBeGreaterThanOrEqual(low[id].length);
    }
    expect(readerCrownShapes(1)).toEqual(readerCrownShapes(1));
    for(const invalid of [NaN,Number.POSITIVE_INFINITY,-.2,1.5]){
      expect(()=>readerCrownShapes(invalid)).toThrow(RangeError);
    }
    const face=scrollReaderFacePortrait(1);
    if(face.hair.kind!=="shapes")throw Error("Expected vector hair");
    expect(face.hair.shapes).toEqual(readerCrownShapes(1));
  });
  it("keeps the reader face/eyes/mouth and BOTH other scholars unchanged by crown construction",()=>{
    const reader=makeShanshuiScholar(1,.9,"river-scholar");
    expect(validateCharacterDefinition(reader)
      .filter(x=>x.severity==="error")).toEqual([]);
    for(const id of ["face","brow","eyes-open","eyes-soft","eyes-closed",
      "mouth-rest","mouth-aa","mouth-oh","mouth-mm","mouth-smile","reader-ear"]){
      expect(reader.assets[id]).toEqual(shanshuiFaceAssets("river-scholar",1)[id]);
      expect(A(id).length).toBeGreaterThan(25);
    }
    for(const scene of ["misty-hermit","mountain-trail"] as const){
      const a=makeShanshuiScholar(1,.9,scene);
      expect(a.assets.hair).toEqual(shanshuiFaceAssets(scene,1).hair);
      expect(a.parts.some(p=>p.id==="reader-ear")).toBe(false);
    }
    expect(shanshuiScholarInstance("river-scholar").revision)
      .toEqual(reader.revision);
    const html=renderToStaticMarkup(createElement(InkShanshuiFilm,{
      frame:125,controls:{...DEFAULT_SHANSHUI,scene:"river-scholar",detail:1},
    }));
    expect(html).toContain('data-km-ink-character-part="hair"');
  });
});
