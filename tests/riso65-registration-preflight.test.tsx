import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {evaluateRisoRegistration} from "../registry/video/riso-registration-preflight";
import type {RisoPrintSpec} from "../registry/video/print-plates";
import {RisoBrushArt} from "../src/video/riso-brush-studio";
import {RisoRegistrationPreflightStudio} from "../src/video/riso-registration-proof-studio";

const spec:RisoPrintSpec={
  version:1,width:960,height:540,paper:"#F2E9D6",seed:62,
  startFrame:0,passFrames:60,gapFrames:15,plates:[
    {id:"blue",color:"#2362A0",opacity:1,dotCell:7,dotAngle:17,registration:[0,0]},
    {id:"red",color:"#DD593D",opacity:.9,dotCell:6,dotAngle:-19,registration:[4,-3]},
  ],
};
const render=(registration:readonly [number,number],aspect:"landscape"|"portrait"="landscape",
  frame=140)=>renderToStaticMarkup(<RisoBrushArt aspect={aspect} frame={frame}
  printFrame={239} animate plate="both" dryness={.73} seed={62}
  inkScale={1} registration={0} secondPlateRegistration={registration}
  grain={.58} layout="film"/>);
describe("RISO65 original physical plate register preflight",()=>{
  it("measures true pairwise relative offsets and compares a DECLARED, unapplied budget",()=>{
    const p=evaluateRisoRegistration(spec,0,5);
    expect(p.plates.map(v=>v.id)).toEqual(["blue","red"]);
    expect(p.pairs).toHaveLength(1);
    expect(p.worstPair.delta).toEqual([4,-3]);
    expect(p.worstPair.magnitude).toBe(5);
    expect(p.worstPair.excess).toBe(0);
    expect(p.withinAllowance).toBe(true);
    expect(evaluateRisoRegistration(spec,0,4).worstPair.excess).toBe(1);
    expect(evaluateRisoRegistration(spec,0,4).withinAllowance).toBe(false);
  });
  it("audits every pair in three-spot films, not just the first and last drums",()=>{
    const three:RisoPrintSpec={...spec,plates:[
      ...spec.plates,
      {id:"third",color:"#23936D",opacity:1,dotCell:5,dotAngle:45,registration:[-3,4]},
    ]};
    const p=evaluateRisoRegistration(three,0,0);
    expect(p.pairs).toHaveLength(3);
    expect(p.worstPair.first).toBe("red");
    expect(p.worstPair.second).toBe("third");
    expect(p.worstPair.delta).toEqual([-7,7]);
    expect(p.worstPair.magnitude).toBeCloseTo(Math.sqrt(98),8);
    expect(p.worstPair.excess).toBe(p.worstPair.magnitude);
  });
  it("locks seeded registration to paper, not time or painter order",()=>{
    const a=evaluateRisoRegistration(spec,.7,2);
    const b=evaluateRisoRegistration(spec,.7,2);
    expect(a).toEqual(b);
    expect(a.pairs[0].delta).not.toEqual(evaluateRisoRegistration(spec,0,2).pairs[0].delta);
    expect(evaluateRisoRegistration({...spec,seed:66},.7,2).pairs[0].delta)
      .not.toEqual(a.pairs[0].delta);
  });
  it("keeps all original native pressure paths and evenodd paper-open channels under drift",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const nominal=render([.65,-.45],aspect);
      const moved=render([6,-4],aspect);
      expect(moved).toContain('transform="translate(6.000 -4.000)"');
      expect(nominal).toContain('transform="translate(0.650 -0.450)"');
      expect(moved.match(/data-km-riso62-source-path=""/g)).toHaveLength(20);
      expect(nominal.match(/data-km-riso62-source-path=""/g)).toHaveLength(20);
      expect(moved.match(/fill-rule="evenodd"/g)).toHaveLength(20);
      expect(moved).toContain('data-km-riso-plate="blue"');
      expect(moved).toContain('data-km-riso-plate="red"');
      expect(moved).not.toMatch(/<image|<foreignObject|feGaussianBlur/);
      // Changing registration cannot alter the exact path geometry, any seed,
      // paper-opening material, or retained original witness paths.
      const shapes=(s:string)=>[...s.matchAll(/<path[^>]*data-km-riso62-source-path=""[^>]*>/g)]
        .map(m=>m[0]);
      expect(shapes(moved)).toEqual(shapes(nominal));
    }
  });
  it("leaves existing RISO64 default output byte-identical to explicit legacy register",()=>{
    const props={aspect:"landscape" as const,frame:155,printFrame:239,
      animate:true,plate:"both" as const,dryness:.73,seed:62,
      inkScale:1,registration:.25,grain:.58,layout:"film" as const};
    const original=renderToStaticMarkup(<RisoBrushArt {...props}/>);
    const explicit=renderToStaticMarkup(<RisoBrushArt {...props}
      secondPlateRegistration={[.65,-.45]}/>);
    expect(explicit).toBe(original);
  });
  it("supports deterministic absolute source frames and an SSR interactive inspection story",()=>{
    const a=render([4,-3],"landscape",20),b=render([4,-3],"landscape",20);
    expect(a).toBe(b);
    expect(render([4,-3],"landscape",190)).not.toBe(a);
    const story=renderToStaticMarkup(<RisoRegistrationPreflightStudio/>);
    expect(story).toContain('data-km-riso65-studio=""');
    expect(story).toContain('data-km-riso65-panel="nominal"');
    expect(story).toContain('data-km-riso65-panel="drift"');
    expect(story).toContain('data-km-riso65-preflight="review"');
    expect(story.match(/data-km-riso62-source-path=""/g)).toHaveLength(40);
    expect(story).not.toMatch(/<image|<foreignObject/);
  });
  it("rejects impossible ink geometry, budgets or second-master overrides",()=>{
    for(const value of [NaN,Infinity,-.01,1.01])
      expect(()=>evaluateRisoRegistration(spec,value,2)).toThrow(RangeError);
    for(const value of [NaN,Infinity,-.5,12.01])
      expect(()=>evaluateRisoRegistration(spec,0,value)).toThrow(RangeError);
    expect(()=>evaluateRisoRegistration({...spec,plates:[]},0,2)).toThrow(RangeError);
    for(const bad of [[Infinity,0],[0,-13],[NaN,0],[0,13],[]] as number[][]){
      expect(()=>renderToStaticMarkup(<RisoBrushArt aspect="landscape" frame={120}
        plate="both" dryness={.73} printFrame={239} seed={62} inkScale={1}
        registration={0} grain={.58} animate layout="film"
        secondPlateRegistration={bad as unknown as readonly [number,number]}/>))
        .toThrow(RangeError);
    }
  });
});
