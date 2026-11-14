import {describe,expect,it} from "vitest";
import {refineRisoContourTriangles,triangulateRisoContour,risoContourSignedArea,risoPointInContour}
  from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET}
  from "../src/video/riso-character-mesh-sheets";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {RisoCharacterModelSheet} from "../registry/video/riso-character-sheet-react";
import type {RisoContourPoint,RisoContourTriangle} from "../registry/video/riso-path-geometry";

const area=(t:RisoContourTriangle)=>{
 const [a,b,c]=t;
 return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*.5;
};
const sum=(tris:readonly RisoContourTriangle[])=>tris.reduce((a,t)=>a+area(t),0);
describe("RISO8 measured, finite microfacets instead of oversized triangles",()=>{
 it("subdivides large faces into bounded small facets with exact area conservation",()=>{
   const outline:readonly RisoContourPoint[]=[[0,0],[20,0],[20,20],[0,20]];
   const original=triangulateRisoContour(outline);
   const fine=refineRisoContourTriangles(original,5,384,6);
   expect(original.length).toBe(2);
   expect(fine.length).toBeGreaterThan(70);
   expect(fine.length).toBeLessThanOrEqual(384);
   expect(sum(fine)).toBeCloseTo(Math.abs(risoContourSignedArea(outline)),6);
   expect(Math.max(...fine.map(area))).toBeLessThanOrEqual(5.00001);
   fine.forEach(tri=>{
     const center:RisoContourPoint=[
       (tri[0][0]+tri[1][0]+tri[2][0])/3,
       (tri[0][1]+tri[1][1]+tri[2][1])/3,
     ];
     expect(risoPointInContour(center,outline)).toBe(true);
   });
 });
 it("preserves concavities, winding, source edge and ink silhouette",()=>{
   const l:readonly RisoContourPoint[]=[[0,0],[20,0],[20,5],[5,5],[5,20],[0,20]];
   for(const polygon of [l,[...l].reverse()]){
     const tris=triangulateRisoContour(polygon);
     const micro=refineRisoContourTriangles(tris,2,384);
     expect(sum(micro)).toBeCloseTo(175,5);
     expect(micro.length).toBeGreaterThan(tris.length);
     for(const t of micro){
       const m:RisoContourPoint=[
         (t[0][0]+t[1][0]+t[2][0])/3,
         (t[0][1]+t[1][1]+t[2][1])/3,
       ];
       expect(risoPointInContour(m,polygon)).toBe(true);
     }
   }
 });
 it("bounds exceptional facet sizes and refuses runaway mesh requests",()=>{
   const tri:RisoContourTriangle=[[0,0],[500,0],[0,500]];
   expect(refineRisoContourTriangles([tri],.1,111,8).length).toBeLessThanOrEqual(111);
   expect(()=>refineRisoContourTriangles([tri],0)).toThrow();
   expect(()=>refineRisoContourTriangles([tri],1,5000)).toThrow();
   expect(()=>refineRisoContourTriangles([tri],1,1)).toThrow();
   expect(()=>refineRisoContourTriangles([tri],1,300,20)).toThrow();
 });
 for(const {spec,sheet} of [
   {spec:COURIER,sheet:RISO_COURIER_SHEET},
   {spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET},
 ]){
   it(`${spec.id} has finer, source-faithful triangles without changing bounds or proportions`,()=>{
     const samples=[0,sheet.poses[1].frame];
     for(const frame of samples){
       const fine=evaluateRisoCharacterMesh(spec,sheet,frame,"fine");
       const balanced=evaluateRisoCharacterMesh(spec,sheet,frame,"balanced");
       const coarse=evaluateRisoCharacterMesh(spec,sheet,frame,"coarse");
       expect(fine.detail).toBe("fine");
       expect(fine.overallBounds).toEqual(coarse.overallBounds);
       expect(fine.headUnit).toBe(coarse.headUnit);
       const ids=spec.id==="courier"
         ? ["head-shape","hair-mass","coat-shell","sleeve-left","thigh-left","mouth"]
         : ["head","body","left-wing","right-wing","tail"];
       for(const id of ids){
         const f=fine.regions.find(r=>r.id===id)!;
         const b=balanced.regions.find(r=>r.id===id)!;
         const c=coarse.regions.find(r=>r.id===id)!;
         expect(f.triangles.length,id).toBeGreaterThanOrEqual(b.triangles.length);
         expect(b.triangles.length,id).toBeGreaterThanOrEqual(c.triangles.length);
         expect(f.triangles.length,id).toBeLessThanOrEqual(384);
         expect(f.outline,id).toEqual(c.outline);
         expect(f.referenceBounds,id).toEqual(c.referenceBounds);
         expect(f.contourArea,id).toBeCloseTo(f.triangleArea,3);
       }
     }
   });
   it(`${spec.id} prints fine diagnostic mesh without enlarging ink silhouette`,()=>{
     const markup=renderToStaticMarkup(createElement(RisoCharacterModelSheet,{
       spec,sheet,frame:sheet.poses[1].frame,meshDetail:"fine",showMesh:true,
       selectedRegion:sheet.headRegion,
     }));
     expect(markup).toContain('data-km-riso-mesh-detail="fine"');
     expect(markup).toContain('data-km-riso-selected-source-triangle=""');
     expect(markup).toContain(`data-km-riso-character-knockout="${spec.id}"`);
     expect(markup).not.toContain("NaN");
     expect(markup).not.toContain("Infinity");
   });
 }
 it("rejects unknown rendering detail instead of silently crashing Storybook",()=>{
   expect(()=>evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,0,"invalid" as "fine"))
     .toThrow(/detail/);
 });
});
