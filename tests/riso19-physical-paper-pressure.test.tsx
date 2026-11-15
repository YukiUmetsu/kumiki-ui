import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {
  evaluateRisoTransferSheet,RisoTransferSheetPlate,
} from "../registry/video/riso-transfer-sheet";
import {evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";

type Detailed=ReturnType<typeof evaluateRisoTransferSheet>&{
  contactCreases:{source:readonly string[];receiver:readonly string[]};
  contactShadows:{source:string;receiver:string};
};
const a={x:30,y:90},b={x:240,y:155};
const geometry=(sourceGrip:number,receiverGrip:number,imprintDepth=1):Detailed=>
  evaluateRisoTransferSheet(a,b,1,{sourceGrip,receiverGrip,imprintDepth} as never) as Detailed;
const coords=(path:string):number[] => (path.match(/-?\d+(?:\.\d+)?/g)??[]).map(Number);
const along=(x:number,y:number)=>
  ((x-a.x)*(b.x-a.x)+(y-a.y)*(b.y-a.y))/Math.hypot(b.x-a.x,b.y-a.y);

describe("RISO19 material-native pressure creases",()=>{
  it("produces distinct hand-rooted creases and screened compression, never a generic overlay",()=>{
    const held=geometry(1,1);
    expect(held.contactCreases.source).toHaveLength(3);
    expect(held.contactCreases.receiver).toHaveLength(3);
    expect(held.contactShadows.source).toMatch(/^M.+Z$/);
    expect(held.contactShadows.receiver).toMatch(/^M.+Z$/);
    expect(new Set(held.contactCreases.source).size).toBe(3);
    expect(new Set(held.contactCreases.receiver).size).toBe(3);
    for(const [side,paths] of Object.entries(held.contactCreases)){
      for(const path of paths){
        expect(path).toMatch(/^M.+Q.+$/);
        const values=coords(path);
        expect(values).toHaveLength(6);
        expect(values.every(Number.isFinite)).toBe(true);
        for(let i=0;i<values.length;i+=2){
          const position=along(values[i],values[i+1]);
          expect(position,side+" folded ink should stay near its owner").toBeGreaterThan(side==="source"?-1:170);
          expect(position).toBeLessThan(side==="source"?50:Math.hypot(b.x-a.x,b.y-a.y)+1);
        }
      }
    }
    expect(held).toEqual(geometry(1,1));
  });

  it("lets go without floating remnants and keeps independent recipient imprint",()=>{
    const double=geometry(1,1);
    const sourceReleased=geometry(0,1);
    const recipientReleased=geometry(1,0);
    expect(sourceReleased.contactCreases.source).toHaveLength(0);
    expect(sourceReleased.contactShadows.source).toBe("");
    expect(sourceReleased.contactCreases.receiver).toEqual(double.contactCreases.receiver);
    expect(sourceReleased.contactShadows.receiver).toBe(double.contactShadows.receiver);
    expect(recipientReleased.contactCreases.receiver).toHaveLength(0);
    expect(recipientReleased.contactShadows.receiver).toBe("");
    expect(recipientReleased.contactCreases.source).toEqual(double.contactCreases.source);
    expect(sourceReleased.border).toBe(double.border);
    expect(sourceReleased.ruling).toEqual(double.ruling);
    expect(sourceReleased.postmark).toBe(double.postmark);
  });

  it("gates all imprints when suppressed and avoids giant detail on unfurled stub",()=>{
    const off=geometry(1,1,0);
    expect(off.contactCreases.source).toHaveLength(0);
    expect(off.contactCreases.receiver).toHaveLength(0);
    expect(off.contactShadows.source).toBe("");
    expect(off.contactShadows.receiver).toBe("");
    const stub=evaluateRisoTransferSheet(a,{x:58,y:95},1,{
      sourceGrip:1,receiverGrip:1,imprintDepth:1,
    } as never) as Detailed;
    expect(stub.contactCreases.source).toHaveLength(0);
    expect(stub.contactCreases.receiver).toHaveLength(0);
    const full=geometry(1,1);
    expect(full.outline).toBe(off.outline);
    expect(full.fold).toBe(off.fold);
    for(const depth of [-.01,1.01,NaN,Infinity])
      expect(()=>geometry(1,1,depth)).toThrow(RangeError);
  });

  it("prints crease fans and screened pinch shadows only on the blue ink master",()=>{
    const g=geometry(1,1);
    const props={
      outline:g.outline,geometry:g,
      paint:{solid:"#255B8E",dots:"url(#riso-screen)"},
    };
    const blue=renderToStaticMarkup(createElement(RisoTransferSheetPlate,{
      ...props,plateId:"blue",
    }));
    const red=renderToStaticMarkup(createElement(RisoTransferSheetPlate,{
      ...props,plateId:"red",
    }));
    const flat=renderToStaticMarkup(createElement(RisoTransferSheetPlate,{
      ...props,plateId:"blue",detail:false,
    }));
    expect((blue.match(/data-km-riso-contact-crease=/g)??[])).toHaveLength(6);
    expect((blue.match(/data-km-riso-contact-shadow=/g)??[])).toHaveLength(2);
    expect(blue).toContain('fill="url(#riso-screen)"');
    expect(red).not.toContain("data-km-riso-contact-crease");
    expect(red).toContain("data-km-riso-transfer-postmark");
    expect(flat).not.toContain("data-km-riso-contact-crease");
    expect(flat).not.toContain("data-km-riso-contact-shadow");
  });

  it("derives local pressure art directly from actual source and receiving grip in both frame outputs",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const shared=evaluateRisoHumanEnsemble(177,aspect);
      const accepted=evaluateRisoHumanEnsemble(239,aspect);
      expect((shared.printDetails as Detailed).contactCreases.source).toHaveLength(3);
      expect((shared.printDetails as Detailed).contactCreases.receiver).toHaveLength(3);
      expect((accepted.printDetails as Detailed).contactCreases.source).toHaveLength(0);
      expect((accepted.printDetails as Detailed).contactCreases.receiver).toHaveLength(3);
      expect(evaluateRisoHumanEnsemble(239,aspect).printDetails).toEqual(accepted.printDetails);
    }
  });
});
