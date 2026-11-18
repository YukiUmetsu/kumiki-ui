import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V26_REFERENCE_CAVITIES,CRAYON_F1_V26_CAVITY_IDS,
 crayonF1CarveNarisRecess} from "../src/video/crayon-artcraft-f1-carved-naris";
import {Cc0CarvedNarisV26} from "../src/video/crayon-artcraft-adult-face.stories";
describe("F1 V26 source-registered rearmost native cavities (unapproved)",()=>{
 const ids=new Set<string>(CRAYON_F1_V26_CAVITY_IDS);
 const find=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
   s.elements.find(x=>x.id===id);
 it("preserves V25, paper, all untouched anatomy and 300-frame character",()=>{
   const a=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   const b=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   expect(inspectCrayonScene(a)).toEqual([]);
   expect(inspectCrayonScene(b)).toEqual([]);
   expect(b.elements).toHaveLength(a.elements.length);
   for(const key of ["seed","durationFrames","paper","paperTooth",
     "camera","width","height"] as const)expect(b[key]).toEqual(a[key]);
   expect(b.elements.filter(e=>!ids.has(e.id)))
     .toEqual(a.elements.filter(e=>!ids.has(e.id)));
   expect(Cc0CarvedNarisV26.name).toContain("!dev");
 });
 it("puts near/far actual pigment cavities *after* the alar roof",()=>{
   const a=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   const b=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   for(const side of ["near","far"] as const){
     const key="naris-shadow-"+side,roof="alar-roof-"+side;
     const old=find(a,key),current=find(b,key);
     if(old?.kind!=="wax"||current?.kind!=="wax")throw Error(key);
     expect(old.d).not.toBe(current.d);
     expect(current.timing).toEqual(old.timing);
     expect(current.parentId).toBe(old.parentId);
     expect(current.coverage).toBe("opaque");
     expect(current.opaqueBurnish).toBeGreaterThan(.85);
     expect(b.elements.findIndex(x=>x.id===roof))
       .toBeLessThan(b.elements.findIndex(x=>x.id===key));
   }
   expect(CRAYON_F1_V26_REFERENCE_CAVITIES.near.source[0])
     .toBeLessThan(CRAYON_F1_V26_REFERENCE_CAVITIES.near.v25[0]);
 });
 it("fails closed on missing/duplicate/repeated anatomy",()=>{
   const a=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   const b=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   expect(()=>crayonF1CarveNarisRecess(a.elements.filter(x=>
     x.id!=="naris-shadow-near"))).toThrow(RangeError);
   const n=find(a,"naris-shadow-near");
   if(!n)throw Error("No near");
   expect(()=>crayonF1CarveNarisRecess([...a.elements,n])).toThrow(RangeError);
   expect(()=>crayonF1CarveNarisRecess(b.elements)).toThrow(RangeError);
 });
 it("draws genuine CRAYON1 wax without photo overlay",()=>{
   const spec=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
   for(const id of CRAYON_F1_V26_CAVITY_IDS)
     expect(html).toContain('data-km-crayon-element="'+id+'"');
   expect(html).not.toContain("<image");
   expect(html).toContain('data-km-crayon-paper-contact-wax');
 });
});
