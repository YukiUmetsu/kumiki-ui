import {describe,expect,it} from "vitest";
import {evaluateRisoTransferSheet} from "../registry/video/riso-transfer-sheet";
import {evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";

type Detailed = ReturnType<typeof evaluateRisoTransferSheet> & {
  outline?: string;
};

const firstPoint = (path: string): {x:number;y:number} => {
  const match = /^M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/.exec(path);
  if (!match) throw new Error("Expected a finite first SVG move");
  return {x:Number(match[1]),y:Number(match[2])};
};

describe("RISO16 physically linked two-hand print surface",()=>{
  it("unfurls from a narrow stroke rather than teleporting a full-height card at 28 units",()=>{
    const source={x:40,y:60};
    const tiny=evaluateRisoTransferSheet(source,{x:52,y:60},.4);
    const fully=evaluateRisoTransferSheet(source,{x:80,y:60},.8);
    expect(tiny.outline).toMatch(/^M.+Z$/);
    expect(fully.outline).toMatch(/^M.+Z$/);
    const narrowTop=firstPoint(tiny.outline);
    const wideTop=firstPoint(fully.outline);
    expect(Math.abs(narrowTop.y-source.y)).toBeGreaterThan(2);
    expect(Math.abs(narrowTop.y-source.y)).toBeLessThan(Math.abs(wideTop.y-source.y));
    expect(evaluateRisoTransferSheet(source,source,0).outline).toBe("");
  });

  it("constructs one continuous path from contact-aligned paper edge, not screen-aligned tape",()=>{
    for(const [source,end] of [
      [{x:40,y:60},{x:230,y:60}],
      [{x:40,y:60},{x:230,y:170}],
      [{x:230,y:170},{x:40,y:60}],
    ] as const){
      const result=evaluateRisoTransferSheet(source,end,1) as Detailed;
      expect(result.outline).toMatch(/^M.+Z$/);
      const first=firstPoint(result.outline!);
      const dx=end.x-source.x,dy=end.y-source.y,len=Math.hypot(dx,dy);
      const along=((first.x-source.x)*dx+(first.y-source.y)*dy)/len;
      const across=((first.x-source.x)*(-dy)+(first.y-source.y)*dx)/len;
      expect(along).toBeCloseTo(0,1); // initial edge projects onto the hand anchor
      expect(across).toBeLessThan(-10); // oriented top edge, not screen-space Y
      expect(Math.abs(across)).toBeLessThan(24);
      expect(result.outline!.includes("NaN")).toBe(false);
      expect(result.border.startsWith("M")).toBe(true);
      expect(result.ruling).toHaveLength(3);
    }
  });

  it("reconciles the SAME paper outline used by ink and knockout in both aspect outputs",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const frame of [126,140,160,198,239]){
        const stage=evaluateRisoHumanEnsemble(frame,aspect);
        const path=(stage.printDetails as Detailed).outline;
        expect(path).toBe(stage.sheet);
        expect(stage.sheet==="").toBe(frame===126);
        expect(evaluateRisoHumanEnsemble(frame,aspect).printDetails)
          .toEqual(stage.printDetails);
      }
    }
  });

  it("keeps optional authored bow and grip compression frame-pure without losing detail",()=>{
    const a={x:30,y:55},b={x:230,y:115};
    const sample = evaluateRisoTransferSheet as (source:{x:number;y:number},end:{x:number;y:number},p:number,
      options?:{curl?:number;gripPinch?:number})=>Detailed;
    const straight=sample(a,b,1);
    const sculpted=sample(a,b,1,{curl:9,gripPinch:.7});
    expect(sculpted.outline).not.toBe(straight.outline);
    expect(sculpted.ruling).toHaveLength(3);
    expect(sculpted.fold).toMatch(/^M/);
    expect(sculpted.postmark).toMatch(/^M/);
    expect(sculpted.hatching).toMatch(/^M/);
    expect(sculpted).toEqual(sample(a,b,1,{curl:9,gripPinch:.7}));
    for(const options of [
      {curl:-1,gripPinch:.5},{curl:13,gripPinch:0},
      {curl:3,gripPinch:-.1},{curl:3,gripPinch:1.1},
      {curl:NaN},{curl:Infinity},{gripPinch:NaN},
    ])expect(()=>sample(a,b,1,options)).toThrow(RangeError);
  });
});
