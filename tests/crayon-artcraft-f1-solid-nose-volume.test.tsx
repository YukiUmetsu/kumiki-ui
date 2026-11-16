import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V25_VOLUME_IDS,crayonF1FeatheredSolidNose}
  from "../src/video/crayon-artcraft-f1-solid-nose-volume";
import {Cc0OpaqueNasalVolumeV25} from "../src/video/crayon-artcraft-adult-face.stories";
describe("ArtCraft V25 opt-in real opaque wax undercoat / soft edge",()=>{
 const ids=new Set<string>(CRAYON_F1_V25_VOLUME_IDS);
 const get=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
   s.elements.find(x=>x.id===id);
 it("preserves V24 original nose contour, all 300 cels, paper and unrelated anatomy",()=>{
   const a=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
   const b=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   expect(inspectCrayonScene(a)).toEqual([]);
   expect(inspectCrayonScene(b)).toEqual([]);
   expect(b.elements).toHaveLength(a.elements.length);
   for(const key of ["width","height","seed","durationFrames","paper",
     "paperTooth","camera"] as const)expect(b[key]).toEqual(a[key]);
   expect(b.elements.filter(x=>!ids.has(x.id)))
     .toEqual(a.elements.filter(x=>!ids.has(x.id)));
   for(const id of CRAYON_F1_V25_VOLUME_IDS){
     const old=get(a,id),next=get(b,id);
     if(old?.kind!=="wax"||next?.kind!=="wax")throw Error("Missing "+id);
     expect(old.coverage).toBe("open");
     expect(next.coverage).toBe("opaque");
     expect(next.d).toBe(old.d);
     expect(next.timing).toEqual(old.timing);
     expect(next.featherContacts).toBe(true);
     expect(next.blendRadius).toBeGreaterThan(6);
     expect(next.underpaintGradient).toBeDefined();
     expect(next.underpaintTooth).toBeGreaterThan(0);
   }
   expect(Cc0OpaqueNasalVolumeV25.name).toContain("!dev");
 });
 it("rejects opaque radius without real explicit contact feather and stroke-built wax",()=>{
   const candidate=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   for(const change of [{featherContacts:false},{deposition:"smooth" as const}]){
     const modified=candidate.elements.map(x=>x.id==="nose-tip"&&x.kind==="wax"?
       {...x,...change}:x);
     expect(inspectCrayonScene({...candidate,elements:modified}).length)
       .toBeGreaterThan(0);
   }
 });
 it("combines source early wax deposit AND alpha boundary, never premature plastic shape",()=>{
   const spec=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   for(const frame of [175,210,299]){
     const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={frame}/>);
     expect(html).toContain('data-km-crayon-feather-contacts="opaque-wax"');
     expect(html).toContain('data-km-crayon-underpaint="opaque"');
     expect(html).toContain("data-km-crayon-underpaint-gradient");
     expect(html).toContain("data-km-crayon-paper-contact-wax");
     expect(html).not.toContain("<image");
     if(frame===175)expect(html).toContain("data-km-crayon-solid-feather-deposit");
   }
 });
 it("fails closed on duplicate, missing or reapplied existing anatomy",()=>{
   const before=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
   const after=crayonCc0FaceStudy({midfaceForm:"source-solid-relief"});
   expect(()=>crayonF1FeatheredSolidNose(before.elements.filter(x=>
     x.id!=="nose-tip"))).toThrow(RangeError);
   const t=get(before,"nose-tip");if(!t)throw Error("No tip");
   expect(()=>crayonF1FeatheredSolidNose([...before.elements,t]))
     .toThrow(RangeError);
   expect(()=>crayonF1FeatheredSolidNose(after.elements))
     .toThrow(RangeError);
 });
});
