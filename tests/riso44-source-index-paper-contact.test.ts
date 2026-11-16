import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";

describe("RISO44 full-film index red print intersects actual opaque paper",()=>{
  it.each(["landscape","portrait"] as const)("%s actual moving sheet and real 3-bone red ink",aspect=>{
    for(const frame of [0,126,142,156,160,166,177,186,202,239]){
      const e=evaluateRisoHumanEnsemble(frame,aspect);
      for(const [spec,side,stage] of [
        [COURIER,"right",e.first],
        [PAPER_ARTIST,"left",e.second],
      ] as const){
        const m=inspectRiso44PrintedIndexContact(spec,frame,side,stage,e.sheet);
        expect(m.indexRedSourceCount).toBe(3);
        expect(m.thumbUnderPaper).toBe(true);
        expect(m.overPaperParts.every(id=>id.startsWith(side+"-glove-index"))).toBe(true);
        expect(m.nearestIndexPaperInkGap).toBeGreaterThanOrEqual(0);
        expect(m.nearestIndexPaperInkGap).toBeLessThanOrEqual(Number.POSITIVE_INFINITY);
        if(frame===0||frame===126)expect(m.overPaperParts).toHaveLength(0);
        if(frame===160||frame===166){
          expect(m.redIndexAreaTouchesPaper,aspect+"/"+spec.id+" f"+frame).toBe(true);
          expect(m.nearestIndexPaperInkGap).toBe(0);
        }
      }
    }
  });
  it("rejects replacing actual source film sheet with unrelated distant paper",()=>{
    const fake="M9000 9000 L9100 9000 L9100 9040 L9000 9040 Z";
    const m=inspectRiso44PrintedIndexContact(COURIER,160,"right",
      {x:120,y:445,scale:1.05},fake);
    expect(m.redIndexAreaTouchesPaper).toBe(false);
    expect(m.overPaperParts).toEqual([]);
    expect(m.nearestIndexPaperInkGap).toBeGreaterThan(100);
    expect(m.thumbUnderPaper).toBe(true);
  });
});
