import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V28_PLANES,CRAYON_F1_V28_SOURCE_VALUE_SAMPLES,
  crayonF1CalibrateFacialValues}
  from "../src/video/crayon-artcraft-f1-face-values";
import {Cc0FacialValuePlanesV28}
  from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 V28 authentic source facial value planes (experimental)",()=>{
 const changed=new Set<string>(CRAYON_F1_V28_PLANES);
 const find=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
   s.elements.find(x=>x.id===id);
 it("records independently observed CC0 five-zone photometry",()=>{
   const vals=Object.values(CRAYON_F1_V28_SOURCE_VALUE_SAMPLES)
     .filter(v=>typeof v==="object");
   expect(vals).toHaveLength(5);
   for(const v of vals){
     expect(v.source).toHaveLength(3);
     expect(v.point).toHaveLength(2);
     expect(v.source).not.toEqual(v.v26);
   }
 });
 it("keeps V27 skin geometry, all other nodes, original paper/300-frame camera",()=>{
   const prev=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   const current=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
   expect(inspectCrayonScene(prev)).toEqual([]);
   expect(inspectCrayonScene(current)).toEqual([]);
   expect(current.elements).toHaveLength(prev.elements.length);
   for(const k of ["width","height","durationFrames","seed","paper",
     "paperTooth","camera"] as const)expect(current[k]).toEqual(prev[k]);
   expect(current.elements.filter(el=>!changed.has(el.id))).toEqual(
     prev.elements.filter(el=>!changed.has(el.id)));
   for(const id of CRAYON_F1_V28_PLANES){
     const a=find(prev,id),b=find(current,id);
     if(a?.kind!=="wax"||b?.kind!=="wax")throw Error(id);
     expect(b.d).toBe(a.d);
     expect(b.parentId).toBe(a.parentId);
     expect(b.timing).toEqual(a.timing);
     expect(b.clipToParent).toBe(a.clipToParent);
     expect(b.deposition).toBe("stroke-built");
     expect(b.featherContacts).toBe(true);
     expect(b.blendRadius).toBeGreaterThan(9);
     expect(b.nibStyle).toBe("dry");
     expect(b.outlineOpacity).toBe(0);
   }
   expect(Cc0FacialValuePlanesV28.name).toContain("!dev");
 });
 it("distinguishes cheek cast, lit bounce, far occlusion and two orbits",()=>{
   const current=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
   expect(CRAYON_F1_V28_PLANES).toHaveLength(5);
   for(const id of ["cheek-malar-cast","cheek-far","socket-near","socket-far"]){
     const el=find(current,id);
     if(el?.kind!=="wax")throw Error(id);
     expect(el.coverage).toBe("opaque");
     expect(el.underpaintGradient).toBeDefined();
     expect(el.underpaintTooth).toBeGreaterThan(0);
   }
   const lit=find(current,"cheek-malar-bounce");
   if(lit?.kind!=="wax")throw Error("No cheek bounce");
   expect(lit.coverage).toBe("open");
   expect(lit.underpaintGradient).toBeUndefined();
 });
 it("rejects missing/doubled/reapplied source value regions",()=>{
   const prev=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   const current=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
   expect(()=>crayonF1CalibrateFacialValues(prev.elements.filter(el=>
     el.id!=="socket-far"))).toThrow(RangeError);
   const a=find(prev,"socket-far");
   if(!a)throw Error("Missing orbit");
   expect(()=>crayonF1CalibrateFacialValues([...prev.elements,a]))
     .toThrow(RangeError);
   expect(()=>crayonF1CalibrateFacialValues(current.elements))
     .toThrow(RangeError);
 });
 it("renders original paper-native film wax, never source pixels or raster",()=>{
   const scene=crayonCc0FaceStudy({midfaceForm:"source-face-values"});
   const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
   for(const id of CRAYON_F1_V28_PLANES)
     expect(html).toContain('data-km-crayon-element="'+id+'"');
   expect(html).toContain('data-km-crayon-feather-contacts="opaque-wax"');
   expect(html).toContain('data-km-crayon-paper-contact-wax');
   expect(html).not.toContain("<image");
 },20_000);
});
