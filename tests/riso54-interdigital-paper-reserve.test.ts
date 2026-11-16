import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {flattenRisoSvgPath,risoContourSignedArea,risoPointInContour,selectRisoSourceContour}
  from "../registry/video/riso-path-geometry";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble}
  from "../src/video/riso-human-ensemble";
import {riso54WebReserveParts,inspectRiso54WebReserves,
  RISO54_WEB_REFERENCE,riso54ApplyWebReserves}
  from "../src/video/riso54-interdigital-paper-reserve";
import {inspectRiso44PrintedIndexContact}
  from "../src/video/riso44-source-index-paper-contact";
import {inspectRiso36RedFingerSilhouettes}
  from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso33HandFan}
  from "../src/video/riso33-hand-negative-space";

const actors=[{spec:COURIER,side:"right",inactive:"left"},
  {spec:PAPER_ARTIST,side:"left",inactive:"right"}] as const;

describe("RISO54 carved paper-white ulnar saddle: physical PRINT source not red layer ordering",()=>{
  it("requires two original non-ink reserves after the real palm, with genuine animated C geometry",()=>{
    for(const {spec,side,inactive} of actors){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      const partSet=new Set(spec.parts.map(p=>p.id));
      expect(partSet.size).toBe(spec.parts.length);
      const source=riso54WebReserveParts(spec.id as "courier"|"paper-artist");
      expect(source).toHaveLength(RISO54_WEB_REFERENCE.count);
      expect(()=>riso54ApplyWebReserves(spec.parts,spec.id as "courier"|"paper-artist"))
        .toThrow(/duplicate/);
      for(const p of source){
        const actual=spec.parts.find(x=>x.id===p.id)!;
        expect(actual).toBeDefined();
        expect(actual.knockoutOnly).toBe(true);
        expect(actual.paint).toBe("solid");
        expect(actual.plate).toBe("red");
        expect(actual.joint).toBe(side+"-hand");
        expect(actual.d).toBe(p.d);
        expect(actual.pathKeys?.map(x=>x.frame))
          .toEqual([0,146,160,180,205,239]);
        expect(actual.pathKeys?.[0].d).toBe(actual.d);
        expect(actual.pathKeys?.[2].d).not.toBe(actual.d);
        expect((actual.d.match(/C/g)??[]).length)
          .toBe(RISO54_WEB_REFERENCE.topologicalSegments);
      }
      expect(spec.parts.some(p=>p.id.startsWith(inactive+"-glove-web-reserve-")))
        .toBe(false);
      expect(spec.parts.slice(-2).map(p=>p.id))
        .toEqual(source.map(p=>p.id));
    }
  });

  it("carves FROM outside each animated original palm edge, not an isolated punched-through hole",()=>{
    for(const {spec,side} of actors){
      const f0=evaluateRisoCharacter(spec,0);
      const f160=evaluateRisoCharacter(spec,160);
      const palm160=selectRisoSourceContour(f160.parts.find(p=>p.id===side+"-glove")!.d,undefined,.15);
      const qa=inspectRiso54WebReserves(spec,160);
      expect(qa.sourceCount).toBe(2);
      for(const v of qa.reserves){
        expect(v.paperReserve).toBe(true);
        expect(v.sourceKeys).toBe(6);
        expect(v.curveCount).toBe(4);
        const rest=f0.parts.find(p=>p.id===v.id)!;
        const cut=f160.parts.find(p=>p.id===v.id)!;
        expect(rest.d).not.toBe(cut.d);
        expect(cut.transform).toBe(f160.parts.find(p=>p.id===side+"-glove")!.transform);
        // The first open-hand reserve collapses to ZERO paper area, not
        // an isolated white hole cut through the relaxed original fingers.
        expect(flattenRisoSvgPath(rest.d,.15)).toHaveLength(0);
        const cutPoly=selectRisoSourceContour(cut.d,undefined,.15);
        // RISO54 first native 7.4× proof rejected 8-unit white gouges.
        // Keep true negative edge legible but prevent print-white removing
        // a whole articulated finger or turning into a punched palm hole.
        const removedInkArea=Math.abs(risoContourSignedArea(cutPoly));
        expect(removedInkArea,spec.id+"/"+v.id).toBeGreaterThan(.7);
        expect(removedInkArea,spec.id+"/"+v.id).toBeLessThan(9);
        const inside=cutPoly.filter(p=>risoPointInContour(p,palm160)).length;
        const outside=cutPoly.length-inside;
        expect(inside,spec.id+"/"+v.id+" actual lip").toBeGreaterThan(1);
        expect(outside,spec.id+"/"+v.id+" actual edge").toBeGreaterThan(1);
      }
    }
  });

  it("protects the 240-frame true original red phalanges, two inks and rigid no-crossing finger-axis contract",()=>{
    for(const {spec,side} of actors)for(let frame=0;frame<240;frame+=2){
      const qa=inspectRiso54WebReserves(spec,frame);
      expect(qa.reserves).toHaveLength(2);
      const original=inspectRiso36RedFingerSilhouettes(spec,frame,side);
      expect(original.sourcePartCount).toBe(12);
      const fan=inspectRiso33HandFan(spec,frame,side);
      expect(fan.intersectingAxisPairs).toEqual([]);
      expect(fan.minimumAxisGap).toBeGreaterThan(3);
      const parts=evaluateRisoCharacter(spec,frame).parts;
      expect(parts.filter(p=>p.id.startsWith(side+"-glove")&&p.paint==="solid"
        &&p.plate==="red"&&!p.knockoutOnly).length).toBeGreaterThan(12);
    }
  });

  it.each(["landscape","portrait"] as const)(
    "%s: actual paper stays between true moving index and thumb, unopposed web stays with hand",
    aspect=>{
      for(const frame of [160,166,177,186,202,239]){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        for(const {spec,side} of actors){
          const source=inspectRiso44PrintedIndexContact(spec,frame,side,
            spec.id==="courier"?film.first:film.second,film.sheet);
          expect(source.thumbUnderPaper).toBe(true);
          expect(source.indexRedSourceCount).toBe(3);
          if(frame===160||frame===166)
            expect(source.redIndexAreaTouchesPaper).toBe(true);
        }
      }
    });
});
