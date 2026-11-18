import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {DEFAULT_SHANSHUI} from "../registry/video/ink-shanshui";
import {InkShanshuiStage} from "../registry/video/ink-shanshui-react";
import {fuchunPineFibreFringe} from
  "../registry/video/ink-shanshui-pine-fringe";

describe("Fuchun ridge-rooted pine hairline calligraphy",()=>{
  it("uses exact original lobe positions, non-repeating pressure and seeded flow",()=>{
    const points=[[10,10],[13,8],[15,11],[19,7],[23,10],[26,8]] as const;
    const a=fuchunPineFibreFringe(points,1,71);
    const b=fuchunPineFibreFringe(points,-1,71);
    expect(a).toHaveLength(6);
    expect(a.map((strand)=>strand.root)).toEqual(points);
    expect(a).toEqual(fuchunPineFibreFringe(points,1,71));
    expect(a).not.toEqual(fuchunPineFibreFringe(points,1,72));
    expect(a).not.toEqual(b);
    expect(new Set(a.map(f=>f.tip.join(","))).size).toBe(6);
    expect(new Set(a.map(f=>f.width.toFixed(3))).size).toBeGreaterThan(4);
    for(const strand of a){
      expect(strand.width).toBeGreaterThan(.2);
      expect(strand.width).toBeLessThan(.65);
      expect(Number.isFinite(strand.tip[0])).toBe(true);
      expect(Number.isFinite(strand.control[1])).toBe(true);
    }
    expect(()=>fuchunPineFibreFringe(points,0,71)).toThrow(RangeError);
    expect(()=>fuchunPineFibreFringe([],1,71)).toThrow(RangeError);
    expect(()=>fuchunPineFibreFringe([[NaN,2],[1,2],[2,3]],1,71))
      .toThrow(RangeError);
    expect(()=>fuchunPineFibreFringe(points,1,-1)).toThrow(RangeError);
  });
  it("adds true silhouette-rooted fine brush to 40 Fuchun fans, not other schools",()=>{
    const draw=(inkSchool:"fuchun"|"early-spring",detail=1,seed=71)=>
      renderToStaticMarkup(createElement(InkShanshuiStage,{
        frame:145,controls:{...DEFAULT_SHANSHUI,scene:"mountain-trail",
          inkSchool,seed,detail},
      }));
    const full=draw("fuchun");
    const lop=[...full.matchAll(/data-km-cliff-pine-fan-lobes="(\d+)"/g)]
      .map(match=>Number(match[1]));
    expect(lop).toHaveLength(40);
    const sum=lop.reduce((a,b)=>a+b,0);
    expect(sum).toBeGreaterThanOrEqual(240);
    expect(sum).toBeLessThanOrEqual(320);
    const fringe=[...full.matchAll(
      /data-km-cliff-pine-fringe="" data-km-cliff-pine-fringe-root="([^"]+)" data-km-cliff-pine-fringe-tip="([^"]+)" data-km-cliff-pine-fringe-lobe="(\d+)" data-km-cliff-pine-fringe-width="([^"]+)" d="([^"]+)"/g,
    )];
    expect(fringe).toHaveLength(sum);
    for(const match of fringe){
      expect(match[5]).toMatch(/^M/);
      expect(match[5].startsWith("M"+match[1].replace(","," "))).toBe(true);
      expect(Number(match[3])).toBeLessThan(8);
      expect(Number(match[4])).toBeGreaterThan(.2);
      expect(match[5]).not.toMatch(/NaN|Infinity/);
    }
    expect(full).toEqual(draw("fuchun"));
    expect(full).not.toEqual(draw("fuchun",1,72));
    expect(draw("early-spring")).not.toContain("data-km-cliff-pine-fringe");
    expect(draw("fuchun",.5)).not.toContain("data-km-cliff-pine-fringe");
    expect((full.match(/data-km-cliff-pine-needle=""/g)??[]).length).toBe(310);
    expect((full.match(/data-km-cliff-pine-ink-island=""/g)??[]).length).toBe(40);
  });
});
