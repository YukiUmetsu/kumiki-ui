import {describe,expect,it} from "vitest";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO31_GEOMETRY} from "../src/video/riso31-finger-phalanges";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {
 RISO52_FOLDED_TERMINALS,riso52ExpectedOriginalSourceIds,
 riso52FoldedTerminalContact,riso52ProjectNailContour,riso52TerminalReach,
} from "../src/video/riso52-folded-terminal-source";

const actors=[
 {actor:COURIER,side:"right",inactive:"left"} as const,
 {actor:PAPER_ARTIST,side:"left",inactive:"right"} as const,
];

describe("RISO52 original distal foreshortening / two physical Risograph ink masters",()=>{
 it("rejects invalid nail coordinates and preserves exact source stroke topology",()=>{
   const d="M0 -1 Q1 1 2 4 L1 5 C1 4 0 3 0 2 Z";
   expect(RISO52_FOLDED_TERMINALS.plates).toEqual(["blue","red"]);
   expect(riso52ProjectNailContour(d,.5)).toBe(
     "M 0 -1 Q 1 0.5 2 2 L 1 2.5 C 1 2 0 1.5 0 1 Z");
   expect(()=>riso52ProjectNailContour(d,.2)).toThrow(/\.4/);
   expect(()=>riso52ProjectNailContour("M0 0 <script/>",.8)).toThrow();
   expect(()=>riso52ProjectNailContour("M0 0 A2 2 0 0 1 4 4 Z",.8)).toThrow();
 });
 it.each(actors)("$actor.id has separate original moving cobalt nail + red pulp, not a flat sticker",({actor,side,inactive})=>{
   expect(inspectRisoCharacter(actor,["blue","red"])).toEqual([]);
   expect(riso52ExpectedOriginalSourceIds(side)).toHaveLength(6);
   for(const id of riso52ExpectedOriginalSourceIds(side)){
     const source=actor.parts.find(p=>p.id===id)!;
     expect(source).toBeDefined();
     const contact=riso52FoldedTerminalContact(source,actor.id as "courier"|"paper-artist");
     expect(contact).not.toBeNull();
     expect(source.pathKeys?.map(k=>k.frame)).toEqual([0,146,160,180,205,239]);
     expect(source.pathKeys?.[0].d).toBe(source.d);
     expect(source.pathKeys?.[2].d).toBe(contact);
     expect(source.joint).toMatch(new RegExp("^"+side+"-(middle|ring|pinky)-dip$"));
     const frame0=evaluateRisoCharacter(actor,0).parts.find(p=>p.id===id)!;
     const f160=evaluateRisoCharacter(actor,160).parts.find(p=>p.id===id)!;
     expect(frame0.d).toBe(source.d);
     expect(f160.d).toBe(contact);
     expect(f160.plate).toBe(source.plate);
     expect(f160.transform).toMatch(/^matrix\\(/);
     if(id.endsWith("-nail")){
       expect(source.plate).toBe("blue");
       expect(source.paint).toBe("screen");
       expect((f160.d.match(/M/g)??[]).length).toBe((source.d.match(/M/g)??[]).length);
       expect((f160.d.match(/C/g)??[]).length).toBe((source.d.match(/C/g)??[]).length);
       expect((f160.d.match(/Q/g)??[]).length).toBe((source.d.match(/Q/g)??[]).length);
     }else{
       expect(source.plate).toBe("red");
       expect(source.paint).toBe("solid");
       const loops=flattenRisoSvgPath(f160.d,.18);
       expect(loops).toHaveLength(1);
       expect(loops[0].closed).toBe(true);
       expect(Math.abs(risoContourSignedArea(loops[0].points))).toBeGreaterThan(4);
     }
   }
   for(const id of riso52ExpectedOriginalSourceIds(inactive)){
     const p=actor.parts.find(p=>p.id===id)!;
     expect(p.pathKeys).toBeUndefined();
   }
   for(const digit of ["middle","ring","pinky"] as const){
     const {ratio,original,projected}=riso52TerminalReach(actor.id as "courier"|"paper-artist",digit);
     expect(ratio).toBeGreaterThanOrEqual(.49);
     expect(ratio).toBeLessThan(.60);
     expect(projected).toBeCloseTo(original*ratio,3);
     expect(projected).toBeLessThan(RISO31_GEOMETRY[digit].distal*.61);
   }
 });
 it("keeps each cobalt nail physically attached to its moving red distal joint through 240 frames",()=>{
   for(const {actor,side} of actors)for(let frame=0;frame<240;frame+=2){
     const parts=new Map(evaluateRisoCharacter(actor,frame).parts.map(p=>[p.id,p]));
     for(const digit of ["middle","ring","pinky"] as const){
       const red=parts.get(side+"-glove-"+digit+"-distal-phalanx")!;
       const blue=parts.get(side+"-glove-"+digit+"-nail")!;
       expect(blue.transform).toBe(red.transform);
       expect(red.paint).toBe("solid");
       expect(blue.paint).toBe("screen");
       expect(red.plate).toBe("red");
       expect(blue.plate).toBe("blue");
     }
     expect(inspectRiso36RedFingerSilhouettes(actor,frame,side).sourcePartCount).toBe(12);
     const fan=inspectRiso33HandFan(actor,frame,side);
     expect(fan.intersectingAxisPairs).toEqual([]);
     expect(fan.minimumAxisGap).toBeGreaterThan(3);
   }
 });
 it.each(["landscape","portrait"] as const)(
   "%s: both original actors keep RISO43–44 true index-above/thumb-below paper edge",
   aspect=>{
     for(const frame of [160,166,177,186,202,239]){
       const film=evaluateRisoHumanEnsemble(frame,aspect);
       for(const {actor,side} of actors){
         const probe=inspectRiso44PrintedIndexContact(actor,frame,side,
           actor.id==="courier"?film.first:film.second,film.sheet);
         expect(probe.thumbUnderPaper).toBe(true);
         expect(probe.indexRedSourceCount).toBe(3);
         if(frame===160||frame===166)
           expect(probe.redIndexAreaTouchesPaper).toBe(true);
       }
     }
   });
});
