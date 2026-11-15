import {describe,expect,it} from "vitest";
import {buildBrushRibbon,sampleBrushCenterline} from "../registry/video/watercolour-brush";
import type {PaintStroke} from "../registry/video/watercolour-brush";

/** The old WM1 hashed a new random width at each small sampled point,
 * visibly creating stair-step serration around broad watercolor strokes.
 * This tests a real brush ribbon, NOT the artistic quality of a face.
 */
const make=(water:number,dryBrush:number):PaintStroke=>({
  id:"edge-test",color:"#786B67",tone:3,width:96,water,load:.67,
  dryBrush,startFrame:0,drawFrames:50,spreadFrames:38,dryFrames:140,
  points:[
    {x:35,y:180,pressure:.79,speed:.16},
    {x:160,y:180,pressure:.79,speed:.16},
    {x:320,y:180,pressure:.79,speed:.16},
    {x:470,y:180,pressure:.79,speed:.16},
    {x:605,y:180,pressure:.79,speed:.16},
  ],
});
const leftYs=(path:string,count:number)=>{
  const nums=[...path.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)/g)].map(m=>Number(m[0]));
  return Array.from({length:count},(_,i)=>nums[2*i+1]);
};
describe("WM1 continuous watercolor-edge geometry",()=>{
  it("keeps broad wet edges locally continuous rather than random saw-tooth",()=>{
    const stroke=make(.96,.08);
    const full=buildBrushRibbon(stroke,1,0,93);
    const center=sampleBrushCenterline(stroke);
    const ys=leftYs(full.path,center.length);
    expect(ys.length).toBeGreaterThan(95);
    // Exclude intentional tip tapers: the main contact edge should not
    // fluctuate 3+ pixels every 4px as the previous implementation did.
    const edge=ys.slice(Math.floor(ys.length*.13),Math.floor(ys.length*.87));
    const changes=edge.slice(1).map((v,i)=>Math.abs(v-edge[i]));
    const max=Math.max(...changes);
    const mean=changes.reduce((a,b)=>a+b,0)/changes.length;
    expect(max).toBeLessThan(1.8);
    expect(mean).toBeLessThan(.48);
    expect(max).toBeGreaterThan(.03); // not unnaturally perfect straight edge
  });
  it("is deterministic, seed-variable and preserves old pressure tapers",()=>{
    const s=make(.85,.2);
    const first=buildBrushRibbon(s,1,0,31);
    expect(buildBrushRibbon(s,1,0,31)).toEqual(first);
    expect(buildBrushRibbon(s,1,0,32).path).not.toBe(first.path);
    const samples=first.centerline;
    expect(samples.length).toBeGreaterThan(80);
    expect(first.path).toMatch(/^M/);
    expect(first.path.endsWith(" Z")).toBe(true);
    const partial=buildBrushRibbon(s,.54,0,31);
    expect(partial.centerline.length).toBeLessThan(samples.length);
    expect(partial.path).not.toBe(first.path);
    // Material front can swell at its newly deposited tip, but the
    // already-painted first quarter MUST remain paper-stationary.
    const fullEdge=leftYs(first.path,samples.length);
    const partEdge=leftYs(partial.path,partial.centerline.length);
    expect(partEdge.slice(3,30)).toEqual(fullEdge.slice(3,30));
  });
  it("retains distinct wet and dry mark contours",()=>{
    const wet=buildBrushRibbon(make(.96,.08),1,0,19);
    const dry=buildBrushRibbon(make(.21,.86),1,0,19);
    expect(wet.path).not.toBe(dry.path);
  });
});
