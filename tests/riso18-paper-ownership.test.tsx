import {describe,expect,it} from "vitest";
import {evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {evaluateRisoTransferSheet} from "../registry/video/riso-transfer-sheet";
import {evaluateRisoPropHandoff,RISO_HANDOFF_DEFAULTS} from "../registry/video/riso-prop-handoff";

type Point={x:number;y:number};
type Owner="source"|"both"|"receiver";
type Stage=ReturnType<typeof evaluateRisoHumanEnsemble> & {
  paperStart:Point; paperEnd:Point; phase:"unfurl"|"shared"|"release"|"received";
  owner:Owner; sourceGrip:number; receiverGrip:number; releaseProgress:number;
};
const at=(frame:number,aspect:"landscape"|"portrait"="landscape")=>
  evaluateRisoHumanEnsemble(frame,aspect) as Stage;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

describe("RISO18 deterministic, source-independent paper ownership transfer",()=>{
  it("has no history or donor-position dependence after completion",()=>{
    const releaseA={x:130,y:200},releaseB={x:290,y:190};
    const recipient={x:300,y:215};
    const held=evaluateRisoPropHandoff(177,{x:123,y:190},recipient,releaseA,releaseB);
    expect(held.owner).toBe("both");
    expect(held.sourceTouching).toBe(true);
    const after=evaluateRisoPropHandoff(208,{x:130,y:200},recipient,releaseA,releaseB);
    const alternate=evaluateRisoPropHandoff(208,{x:-500,y:400},recipient,releaseA,releaseB);
    expect(after.phase).toBe("received");
    expect(after.paperStart).toEqual(alternate.paperStart);
    expect(after.paperEnd).toEqual(alternate.paperEnd);
    expect(after.receiverTouching).toBe(true);
    expect(after.sourceTouching).toBe(false);
    expect(after).toEqual(evaluateRisoPropHandoff(208,{x:130,y:200},recipient,releaseA,releaseB));
  });

  it("rejects nonmonotonic timelines, nonsensical tilt and nonfinite anchors",()=>{
    const a={x:100,y:100},b={x:250,y:100};
    for(const bad of [
      {...RISO_HANDOFF_DEFAULTS,contactFrame:126},
      {...RISO_HANDOFF_DEFAULTS,releaseStart:160},
      {...RISO_HANDOFF_DEFAULTS,releaseEnd:178},
      {...RISO_HANDOFF_DEFAULTS,settleDegrees:90},
      {...RISO_HANDOFF_DEFAULTS,settleDegrees:NaN},
    ])expect(()=>evaluateRisoPropHandoff(180,a,b,a,b,bad)).toThrow(RangeError);
    expect(()=>evaluateRisoPropHandoff(180,{x:NaN,y:2},b,a,b)).toThrow(RangeError);
    expect(()=>evaluateRisoPropHandoff(-1,a,b,a,b)).toThrow(RangeError);
    expect(()=>evaluateRisoPropHandoff(1.5,a,b,a,b)).toThrow(RangeError);
  });


  it("holds both fingertips, releases the donor, then leaves sheet with recipient",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const unfolding=at(142,aspect), held=at(160,aspect), shared=at(177,aspect);
      const releasing=at(189,aspect), received=at(202,aspect), final=at(239,aspect);
      expect(unfolding.phase).toBe("unfurl");
      expect(held.phase).toBe("shared");
      expect(shared.owner).toBe("both");
      expect(shared.sourceGrip).toBe(1);
      expect(shared.receiverGrip).toBe(1);
      expect(releasing.phase).toBe("release");
      expect(releasing.releaseProgress).toBeGreaterThan(0);
      expect(releasing.releaseProgress).toBeLessThan(1);
      expect(received.phase).toBe("received");
      expect(received.owner).toBe("receiver");
      expect(received.sourceGrip).toBe(0);
      expect(received.receiverGrip).toBe(1);
      expect(final.owner).toBe("receiver");
      expect(distance(received.paperEnd,received.receiver)).toBeCloseTo(0,7);
      expect(distance(final.paperEnd,final.receiver)).toBeCloseTo(0,7);
      // Returning the giver's hand to their body must not yank the finished print.
      expect(distance(received.paperStart,received.source)).toBeGreaterThan(25);
      expect(distance(final.paperStart,final.source)).toBeGreaterThan(25);
      expect(received.sheet).toBe(received.printDetails.outline);
      expect(received.sheet).not.toMatch(/NaN|Infinity/);
      expect(final.sheet).not.toMatch(/NaN|Infinity/);
    }
  });

  it("stays continuous at first contact, start of release, and the receiver takeover",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const f of [159,160,177,178,201,202]){
        const now=at(f,aspect), next=at(f+1,aspect);
        expect(distance(now.paperStart,next.paperStart),aspect+" at "+f).toBeLessThan(30);
        expect(distance(now.paperEnd,next.paperEnd),aspect+" at "+f).toBeLessThan(30);
      }
      for(const f of [160,177,178,190,201,202,239]){
        const expected=at(f,aspect);
        at(0,aspect);at(239,aspect);at(112,aspect);
        expect(at(f,aspect)).toEqual(expected);
      }
    }
  });

  it("does not use a screen aligned paper once the receiver owns the print",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const state=at(202,aspect);
      const from={x:state.paperStart.x-state.paperEnd.x,y:state.paperStart.y-state.paperEnd.y};
      const early=at(178,aspect);
      const before={x:early.source.x-early.receiver.x,y:early.source.y-early.receiver.y};
      const angle=Math.atan2(from.y,from.x)-Math.atan2(before.y,before.x);
      expect(Math.abs(angle)).toBeGreaterThan(.15);
      expect(Math.hypot(from.x,from.y)).toBeGreaterThan(50);
    }
  });

  it("uses independent donor/receiver pressure in the actual material edge",()=>{
    const a={x:30,y:70},b={x:230,y:105};
    const render=(sourceGrip:number,receiverGrip:number)=>
      evaluateRisoTransferSheet(a,b,1,{sourceGrip,receiverGrip} as never);
    const original=render(1,1), released=render(0,1), reversed=render(1,0);
    expect(released.outline).not.toBe(original.outline);
    expect(released.outline).not.toBe(reversed.outline);
    expect(released.border).toBe(original.border);
    expect(released.ruling).toEqual(original.ruling);
    expect(released.hatching).toBe(original.hatching);
    for(const grip of [-.01,1.01,Infinity,NaN]){
      expect(()=>render(grip,1)).toThrow(RangeError);
      expect(()=>render(1,grip)).toThrow(RangeError);
    }
  });
});
