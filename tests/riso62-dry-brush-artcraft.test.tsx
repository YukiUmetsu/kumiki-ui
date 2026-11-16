import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  createRisoBrushGeometry,risoBrushInkPath,risoBrushPressureAt,
} from "../registry/video/riso-dry-brush";
import type {RisoBrushOptions} from "../registry/video/riso-dry-brush";
import {RisoDryBrushInk} from "../registry/video/riso-dry-brush-react";
import {RisoPrint} from "../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../registry/video/print-plates";

const pressure=[
  {at:0,width:.02},{at:.18,width:.56},{at:.42,width:1},
  {at:.72,width:.62},{at:1,width:.015},
] as const;
const sample:RisoBrushOptions={
  start:{x:35,y:95},control1:{x:75,y:15},
  control2:{x:190,y:165},end:{x:270,y:60},
  width:23,pressure,dryness:.8,seed:62,steps:80,
};
const build=(p:Partial<RisoBrushOptions>={})=>createRisoBrushGeometry({...sample,...p});
const spec:RisoPrintSpec={
  version:1,width:320,height:260,paper:"#F2E9D6",seed:62,
  startFrame:0,passFrames:2,gapFrames:0,
  plates:[
    {id:"blue",color:"#2362A0",opacity:1,dotCell:7,dotAngle:17,registration:[0,0]},
    {id:"red",color:"#DD593D",opacity:1,dotCell:6,dotAngle:-19,registration:[.5,-.4]},
  ],
};
describe("RISO62 native dry-brush ArtCraft source",()=>{
  it("retains a continuous original 3D-feeling pressure flow with independent fine paper openings",()=>{
    const art=build();
    expect(art.centerline).toHaveLength(81);
    expect(art.widthProfile).toHaveLength(81);
    expect(art.widthProfile[0]).toBeLessThan(art.widthProfile[25]);
    expect(art.widthProfile[80]).toBeLessThan(art.widthProfile[45]);
    expect(art.outerPath).toMatch(/^M[-\d. ]+ Q/);
    expect(art.outerPath.endsWith(" Z")).toBe(true);
    expect(art.dryPaths.length).toBeGreaterThan(6);
    // The original 11-slot proof looked smooth at 1×. Physical dry fibre
    // must include many separate elongated openings AND fine stock pores.
    expect(art.dryPaths.length).toBeGreaterThan(50);
    expect(art.dryPaths.filter(path=>(path.match(/ Q/g)||[]).length>20).length)
      .toBeGreaterThan(20);
    expect(art.dryPaths.filter(path=>(path.match(/ Q/g)||[]).length===8).length)
      .toBeGreaterThan(20);
    expect(new Set(art.dryPaths).size).toBe(art.dryPaths.length);
    expect(art.dryPaths.every(x=>x.startsWith("M")&&x.endsWith(" Z"))).toBe(true);
    expect(risoBrushInkPath(art).match(/ Q/g)?.length).toBeGreaterThan(170);
    expect(risoBrushInkPath(art)).not.toMatch(/(?:<image|filter|opacity|mask|NaN|Infinity)/);
    expect(art.centerline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
  });
  it("preserves source trajectory and stroke knots across dryness, and never flattens details",()=>{
    const a=build(),b=build(),wet=build({dryness:0}),dust=build({dryness:1});
    expect(a).toEqual(b);
    expect(wet.dryPaths).toHaveLength(0);
    expect(dust.dryPaths.length).toBeGreaterThan(a.dryPaths.length);
    // Source centreline geometry cannot drift with stock dryness.
    expect(dust.dryPaths.length).toBeGreaterThan(70);
    expect(a.outerPath.match(/ Q/g)?.length).toBe(wet.outerPath.match(/ Q/g)?.length);
    expect(wet.centerline).toEqual(a.centerline);
    expect(dust.centerline).toEqual(a.centerline);
    expect(wet.outerPath).not.toBe(a.outerPath);
    expect(build({seed:64}).dryPaths).not.toEqual(a.dryPaths);
    expect(risoBrushPressureAt(pressure,0)).toBeCloseTo(.02);
    expect(risoBrushPressureAt(pressure,.42)).toBeCloseTo(1);
    expect(risoBrushPressureAt(pressure,1)).toBeCloseTo(.015);
    expect(build({width:37}).outerPath).not.toBe(a.outerPath);
  });
  it("rejects invalid controls and degenerate stems rather than inventing fake paths",()=>{
    for(const part of [
      {dryness:NaN},{dryness:1.1},{width:0},{width:97},{seed:-1},
      {steps:6},{steps:300},{start:{x:Infinity,y:0}},
      {end:{x:35,y:95}},{pressure:[{at:0,width:1},{at:1,width:1.1}]},
      {pressure:[{at:.2,width:.1},{at:1,width:.1}]},
      {pressure:[{at:0,width:.1},{at:0,width:.2},{at:1,width:1}]},
    ] as Partial<RisoBrushOptions>[])
      expect(()=>build(part)).toThrow(RangeError);
    expect(()=>risoBrushPressureAt(pressure,Infinity)).toThrow(RangeError);
  });
  it("prints BOTH original pigments through source-native evenodd holes and untouched RisoPrint paper",()=>{
    const markup=renderToStaticMarkup(
      <RisoPrint spec={spec} frame={239} paperGrain={.6} artworks={{
        blue:p=><RisoDryBrushInk {...sample} color={p.solid}/>,
        red:p=><RisoDryBrushInk {...sample} seed={43}
          start={{x:50,y:125}} end={{x:240,y:85}} color={p.solid}/>,
      }}/>
    );
    expect(markup).toContain('data-km-riso-plate="blue"');
    expect(markup).toContain('data-km-riso-plate="red"');
    expect(markup.match(/data-km-riso62-source-path=""/g)).toHaveLength(2);
    expect(markup.match(/fill-rule="evenodd"/g)).toHaveLength(2);
    expect(markup).toContain('mix-blend-mode:multiply');
    expect(markup).not.toMatch(/<image|<foreignObject|feGaussianBlur/);
    expect(()=>renderToStaticMarkup(<RisoDryBrushInk {...sample}
      color="linear-gradient(red,blue)"/>)).toThrow(RangeError);
  });
});
