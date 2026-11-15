import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {createElement} from "react";
import {SHANSHUI_SCENES,DEFAULT_SHANSHUI} from
  "../registry/video/ink-shanshui";
import {validateCharacterDefinition} from "../registry/character/validate";
import {inkPressureStroke,inkSilkFold,inkHatching,shanshuiFacialCraft} from
  "../src/video/ink-shanshui-fine-craft";
import {shanshuiBodyFit} from "../src/video/ink-shanshui-full-body";
import {shanshuiFaceAssets} from "../src/video/ink-shanshui-face-plates";
import {shanshuiGarmentCraft} from "../src/video/ink-shanshui-garment-craft";
import {InkShanshuiFilm,makeShanshuiScholar,shanshuiScholarInstance} from
  "../src/video/ink-shanshui-film";

describe("Chinese ink painting figure craftsmanship",()=>{
  it("uses deterministic, non-constant pressure outlines instead of uniform filtered paths",()=>{
    const sample={
      from:{x:10,y:10},c1:{x:22,y:15},
      c2:{x:24,y:40},to:{x:34,y:60},
      width:3.8,seed:7,opacity:.68,samples:16,
    };
    const a=inkPressureStroke(sample);
    expect(a).toEqual(inkPressureStroke(sample));
    expect(a.type).toBe("path");
    expect(a.fill).toBe("$shadow");
    expect(a.stroke).toBe("none");
    expect(a.opacity).toBeCloseTo(.68);
    expect(a.d.startsWith("M")).toBe(true);
    expect(a.d.endsWith(" Z")).toBe(true);
    expect(a.d.includes("L")).toBe(true);
    const coords=a.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
    expect(coords.length).toBeGreaterThan(50);
    expect(coords.every(Number.isFinite)).toBe(true);
    expect(new Set(coords.map(n=>n.toFixed(2))).size).toBeGreaterThan(30);
    expect(inkSilkFold(sample.from,sample.c1,sample.c2,sample.to,.8,2)).toHaveLength(3);
    expect(inkHatching({x:12,y:15},36,8,4)).toHaveLength(8);
    expect(()=>inkPressureStroke({...sample,width:NaN})).toThrow(RangeError);
    expect(()=>inkPressureStroke({...sample,width:26})).toThrow(RangeError);
    expect(()=>inkPressureStroke({...sample,samples:3})).toThrow(RangeError);
    // Invalid optional values previously produced "NaN" inside SVG path data.
    for(const bad of [
      {...sample,opacity:NaN},
      {...sample,opacity:Infinity},
      {...sample,startWeight:NaN},
      {...sample,startWeight:-Infinity},
      {...sample,seed:NaN},
      {...sample,seed:Infinity},
      {...sample,seed:.5},
    ])expect(()=>inkPressureStroke(bad)).toThrow(RangeError);
    expect(()=>inkPressureStroke({...sample,seed:0,opacity:0,startWeight:0}))
      .not.toThrow();
    expect(()=>inkHatching({x:3,y:5},-1,3,1)).toThrow(RangeError);
  });
  it("keeps the expressive face/body marks attached to each character's real animated parts",()=>{
    for(const scene of SHANSHUI_SCENES){
      const figure=makeShanshuiScholar(1,.91,scene);
      const instance=shanshuiScholarInstance(scene,.7);
      expect(validateCharacterDefinition(figure)
        .filter(d=>d.severity==="error")).toEqual([]);
      expect(figure.revision).toEqual(instance.revision);
      expect(figure.capabilities).toContain("pressure-brush-linecraft");
      expect(figure.capabilities).toContain("part-native-figure-fine-detail");
      const detail=shanshuiGarmentCraft(scene,shanshuiBodyFit(scene),1);
      const expected=[
        ["robe-fine","body"],["sleeve-fine-near","near-sleeve"],
        ["sleeve-fine-far","far-sleeve"],["hand-fine-near","near-hand"],
        ["hand-fine-far","far-hand"],["collar-fine","collar"],
        ["belt-fine","sash"],["shoe-fine-left","shoe-left"],
        ["shoe-fine-right","shoe-right"],["hem-fine","body"],
        ["scroll-fine","scroll"],
      ] as const;
      for(const [partId,parentId] of expected){
        const part=figure.parts.find(p=>p.id===partId);
        expect(part?.parent).toBe(parentId);
        expect(figure.assets[partId]).toEqual(detail[partId]);
        const asset=figure.assets[partId];
        if(asset.kind!=="shapes")throw new Error("Figure detail must be a vector");
        expect(asset.provenance.license).toBe("CC0-1.0");
        expect(asset.shapes.every(s=>s.type==="path")).toBe(true);
      }
      const oldFace=shanshuiFaceAssets(scene,.15);
      const face=shanshuiFaceAssets(scene,1);
      for(const key of ["face","hair","brow","eyes-open","mouth-rest"]){
        const low=oldFace[key],high=face[key];
        if(low.kind!=="shapes"||high.kind!=="shapes")throw new Error("Expected face cels");
        expect(high.shapes.length).toBeGreaterThan(low.shapes.length);
      }
      expect(shanshuiFacialCraft(scene,1))
        .toEqual(shanshuiFacialCraft(scene,1));
      expect(figure.assets.hair).toEqual(face.hair);
      expect(figure.assets["eyes-open"]).toEqual(face["eyes-open"]);
      const html=renderToStaticMarkup(createElement(InkShanshuiFilm,{
        frame:125,controls:{...DEFAULT_SHANSHUI,scene,detail:1},
      }));
      expect(html).toContain('data-km-ink-character-part="robe-fine"');
      expect(html).toContain('data-km-ink-character-part="sleeve-fine-near"');
      expect(html).toContain('data-km-ink-character-part="hand-fine-near"');
      expect(html).toContain('data-km-ink-character-part="shoe-fine-left"');
    }
  });
  it("low detail has fewer material strokes without changing any anatomy or source aspect",()=>{
    for(const scene of SHANSHUI_SCENES){
      const fit=shanshuiBodyFit(scene);
      const high=shanshuiGarmentCraft(scene,fit,1);
      const low=shanshuiGarmentCraft(scene,fit,.17);
      const robeHigh=high["robe-fine"],robeLow=low["robe-fine"];
      if(robeHigh.kind!=="shapes"||robeLow.kind!=="shapes")throw new Error("Expected line art");
      expect(robeHigh.shapes.length).toBeGreaterThan(robeLow.shapes.length);
      expect(shanshuiBodyFit(scene)).toEqual(fit);
      const fine=makeShanshuiScholar(1,.9,scene);
      const coarse=makeShanshuiScholar(.17,.9,scene);
      expect(fine.parts.map(p=>p.id)).toEqual(coarse.parts.map(p=>p.id));
      expect(fine.parts.find(p=>p.id==="head")?.rest)
        .toEqual(coarse.parts.find(p=>p.id==="head")?.rest);
      expect(fine.assets.robe).toEqual(coarse.assets.robe);
    }
  });
  it("garments and facial variants do not acquire floating detail or impossible drawn concealed hands",()=>{
    const walker=shanshuiGarmentCraft("mountain-trail",
      shanshuiBodyFit("mountain-trail"),1);
    const hand=walker["hand-fine-far"];
    if(hand.kind!=="shapes")throw new Error("Expected hand art");
    expect(hand.shapes).toHaveLength(0);
    const reader=shanshuiGarmentCraft("river-scholar",
      shanshuiBodyFit("river-scholar"),1);
    const scroll=reader["scroll-fine"];
    if(scroll.kind!=="shapes")throw new Error("Expected scroll art");
    expect(scroll.shapes.length).toBeGreaterThan(9);
    const hermit=shanshuiGarmentCraft("misty-hermit",
      shanshuiBodyFit("misty-hermit"),1);
    const noScroll=hermit["scroll-fine"];
    if(noScroll.kind!=="shapes")throw new Error("Expected empty scroll");
    expect(noScroll.shapes).toHaveLength(0);
    const facial=shanshuiFacialCraft("misty-hermit");
    expect(facial.beard.length).toBeGreaterThan(8);
    expect(shanshuiFacialCraft("river-scholar").beard).toHaveLength(0);
    expect(()=>shanshuiGarmentCraft("mountain-trail",
      shanshuiBodyFit("mountain-trail"),2)).toThrow(RangeError);
  });
});
