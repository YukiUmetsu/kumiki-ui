import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {riso59PreviewContact} from "../src/video/riso59-continuous-hand-envelope";
import {inspectRiso60NegativeSpace,riso60CountBoundaryCrossings,
  RISO60_ARTCRAFT} from "../src/video/riso60-native-hand-negative-space";

describe("RISO60: original native two-spot-print hand negative-space audit",()=>{
  it("distinguishes an intersecting exterior reserve from a wholly internal white hole",()=>{
    const palm=[[0,0],[10,0],[10,10],[0,10]] as const;
    const edge=[[8,3],[12,3],[12,7],[8,7]] as const;
    const hole=[[2,2],[4,2],[4,4],[2,4]] as const;
    const missed=[[12,2],[14,2],[14,4],[12,4]] as const;
    expect(riso60CountBoundaryCrossings(palm,edge)).toBe(2);
    expect(riso60CountBoundaryCrossings(palm,hole)).toBe(0);
    expect(riso60CountBoundaryCrossings(palm,missed)).toBe(0);
    expect(riso60CountBoundaryCrossings(palm,[])).toBe(0);
  });

  it("preserves exact original authored rest and moving print master geometry for both actors",()=>{
    for(const {actor,spec} of [
      {actor:"courier" as const,spec:COURIER},
      {actor:"paper-artist" as const,spec:PAPER_ARTIST},
    ]){
      const before=JSON.stringify(spec.parts);
      const candidate=riso59PreviewContact(spec,actor).spec;
      for(const model of [spec,candidate]){
        for(const frame of [0,146,154,156,160,166,180,205,239]){
          const qa=inspectRiso60NegativeSpace(model,actor,frame);
          expect(qa.actor).toBe(actor);
          expect(qa.positiveClosed).toBe(true);
          expect(qa.positiveCubicCount).toBe(16);
          expect(qa.positiveArea).toBeGreaterThan(50);
          expect(qa.webs).toHaveLength(2);
          expect(qa.webs.map(x=>x.cubicCount)).toEqual([4,4]);
          expect(qa.webs.every(x=>Number.isFinite(x.cutterArea)&&
            Number.isInteger(x.boundaryCrossings)&&x.boundaryCrossings>=0)).toBe(true);
          expect(qa.requiresArtistReview).toBe(true);
          if(frame===0||frame===146)
            expect(qa.webs.every(x=>x.state==="unprinted-rest")).toBe(true);
          if(frame===160)
            expect(qa.webs.every(x=>x.cutterArea>0&&x.state!=="unprinted-rest")).toBe(true);
          expect(inspectRiso60NegativeSpace(model,actor,frame)).toEqual(qa);
        }
      }
      expect(JSON.stringify(spec.parts)).toBe(before);
    }
    expect(RISO60_ARTCRAFT.noRasterSampling).toBe(true);
    expect(RISO60_ARTCRAFT.doesNotApproveAnatomy).toBe(true);
  },15000);

  it("rejects actor identity mismatch and invalid film times",()=>{
    expect(()=>inspectRiso60NegativeSpace(COURIER,"paper-artist",160)).toThrow(/actor/);
    expect(()=>inspectRiso60NegativeSpace(COURIER,"courier",-1)).toThrow(/cel/);
    expect(()=>inspectRiso60NegativeSpace(COURIER,"courier",240)).toThrow(/cel/);
    expect(()=>inspectRiso60NegativeSpace(COURIER,"courier",1.5)).toThrow(/cel/);
  });
});
