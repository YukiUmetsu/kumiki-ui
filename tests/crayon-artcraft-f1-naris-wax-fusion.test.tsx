import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V27_FUSED_IDS,CRAYON_F1_V27_SOURCE_OBSERVATION,
  crayonF1FuseNarisIntoAlarSkin}
  from "../src/video/crayon-artcraft-f1-naris-wax-fusion";
import {Cc0FusedNarisV27} from "../src/video/crayon-artcraft-adult-face.stories";

describe("F1 V27 native alar wax/cavity alpha continuity: experimental",()=>{
 const changed=new Set<string>(CRAYON_F1_V27_FUSED_IDS);
 const select=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
   s.elements.find(x=>x.id===id);
 it("preserves V26 exact source geometry, original strokes and 300 frames",()=>{
   const prev=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   const next=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   expect(inspectCrayonScene(prev)).toEqual([]);
   expect(inspectCrayonScene(next)).toEqual([]);
   expect(next.elements).toHaveLength(prev.elements.length);
   for(const key of ["width","height","seed","durationFrames","paper",
      "paperTooth","camera"] as const)
      expect(next[key]).toEqual(prev[key]);
   expect(next.elements.filter(x=>!changed.has(x.id))).toEqual(
     prev.elements.filter(x=>!changed.has(x.id)));
   for(const id of CRAYON_F1_V27_FUSED_IDS){
     const old=select(prev,id),cur=select(next,id);
     if(old?.kind!=="wax"||cur?.kind!=="wax")throw Error(id);
     expect(cur.d).toBe(old.d);
     expect(cur.timing).toEqual(old.timing);
     expect(cur.parentId).toBe(old.parentId);
     expect(cur.coverage).toBe(old.coverage);
     expect(cur.featherContacts).toBe(true);
     expect(cur.deposition).toBe("stroke-built");
     expect(cur.blendRadius).toBeGreaterThan(0);
     expect(cur.nibStyle).toBe("dry");
     expect(cur.outlineOpacity).toBe(0);
   }
   expect(Cc0FusedNarisV27.name).toContain("!dev");
 });
 it("uses deliberately asymmetric physical wax, never a mirrored stamp",()=>{
   const s=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   const a=select(s,"naris-shadow-near"),b=select(s,"naris-shadow-far");
   if(a?.kind!=="wax"||b?.kind!=="wax")throw Error("Missing nose");
   expect(a.bounds.width).toBeGreaterThan(b.bounds.width);
   expect(a.blendRadius).toBeLessThan(b.blendRadius??0);
   expect(a.markStrength).toBeLessThan(.25);
   expect(b.markStrength).toBeLessThan(.25);
   expect(a.underpaintGradient?.focusX).not.toBe(b.underpaintGradient?.focusX);
   expect(CRAYON_F1_V27_SOURCE_OBSERVATION.near.darkRgb[0])
     .toBeLessThan(CRAYON_F1_V27_SOURCE_OBSERVATION.far.darkRgb[0]);
   for(const side of ["near","far"] as const)
     expect(s.elements.findIndex(el=>el.id==="alar-roof-"+side)).toBeLessThan(
       s.elements.findIndex(el=>el.id==="naris-shadow-"+side));
 });
 it("fails closed on missing/doubled/reapplied native cavities",()=>{
   const before=crayonCc0FaceStudy({midfaceForm:"source-carved-naris"});
   const after=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   expect(()=>crayonF1FuseNarisIntoAlarSkin(before.elements.filter(el=>
     el.id!=="naris-shadow-far"))).toThrow(RangeError);
   const near=select(before,"naris-shadow-near");
   if(!near)throw Error("Missing near");
   expect(()=>crayonF1FuseNarisIntoAlarSkin([...before.elements,near]))
      .toThrow(RangeError);
   expect(()=>crayonF1FuseNarisIntoAlarSkin(after.elements))
      .toThrow(RangeError);
 });
 it("SSR wax feathers alpha, not texture, with no source raster overlay",()=>{
   const s=crayonCc0FaceStudy({midfaceForm:"source-fused-naris"});
   const html=renderToStaticMarkup(<CrayonScene spec={s} frame={299}/>);
   for(const id of CRAYON_F1_V27_FUSED_IDS)
     expect(html).toContain('data-km-crayon-element="'+id+'"');
   expect(html).toContain('data-km-crayon-feather-contacts="opaque-wax"');
   expect(html).toContain('data-km-crayon-underpaint="opaque"');
   expect(html).toContain('data-km-crayon-paper-contact-wax');
   expect(html).not.toContain("<image");
 },20_000);
});
