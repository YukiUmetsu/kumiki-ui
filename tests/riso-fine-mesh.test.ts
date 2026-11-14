import {describe,expect,it} from "vitest";
import {refineRisoContourMesh,triangulateRisoContour,risoPointInContour} from "../registry/video/riso-path-geometry";
import type {RisoContourPoint,RisoContourTriangle} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "../src/video/riso-character-mesh-sheets";

const area=(t:RisoContourTriangle)=>Math.abs(
  (t[1][0]-t[0][0])*(t[2][1]-t[0][1])-
  (t[1][1]-t[0][1])*(t[2][0]-t[0][0]))/2;
const length=(a:RisoContourPoint,b:RisoContourPoint)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const longest=(tris:readonly RisoContourTriangle[])=>Math.max(...tris.flatMap(t=>
  [length(t[0],t[1]),length(t[1],t[2]),length(t[2],t[0])]));
const key=(p:RisoContourPoint)=>p.join(",");
const edge=(a:RisoContourPoint,b:RisoContourPoint)=>[key(a),key(b)].sort().join("|");
describe("RISO8 small, conforming construction mesh",()=>{
  it("replaces coarse 20-unit cells with small edge-bounded triangles",()=>{
    const original=triangulateRisoContour([[0,0],[20,0],[20,20],[0,20]]);
    expect(original).toHaveLength(2);
    const refined=refineRisoContourMesh(original,{maxEdgeLength:4,maxTriangles:300});
    expect(refined.length).toBeGreaterThan(64);
    expect(refined.length).toBeLessThanOrEqual(300);
    expect(longest(refined)).toBeLessThanOrEqual(4.000001);
    expect(refined.reduce((sum,t)=>sum+area(t),0)).toBeCloseTo(400,5);
    const twice=refineRisoContourMesh(original,{maxEdgeLength:4,maxTriangles:300});
    expect(refined).toEqual(twice);
  });
  it("splits adjacent faces along identical shared edges with no T-junctions",()=>{
    const original=triangulateRisoContour([[0,0],[28,0],[28,9],[9,9],[9,24],[0,24]]);
    const refined=refineRisoContourMesh(original,{maxEdgeLength:4,maxTriangles:600});
    const counts=new Map<string,number>();
    for(const [a,b,c] of refined)for(const [p,q] of [[a,b],[b,c],[c,a]] as const)
      counts.set(edge(p,q),(counts.get(edge(p,q))??0)+1);
    expect([...counts.values()].every(n=>n===1||n===2)).toBe(true);
    expect(refined.reduce((sum,t)=>sum+area(t),0)).toBeCloseTo(387,5);
    for(const t of refined){
      const centroid:RisoContourPoint=[(t[0][0]+t[1][0]+t[2][0])/3,
        (t[0][1]+t[1][1]+t[2][1])/3];
      expect(risoPointInContour(centroid,[[0,0],[28,0],[28,9],[9,9],[9,24],[0,24]])).toBe(true);
    }
    const distinct=new Map<string,RisoContourPoint>();
    for(const t of refined)for(const p of t)distinct.set(key(p),p);
    // Every vertex must be a real endpoint when it lies on any other mesh edge:
    // this detects hanging midpoints that would crack under mesh deformation.
    for(const [a,b,c] of refined){
      for(const [u,v] of [[a,b],[b,c],[c,a]] as const){
        const d=length(u,v);
        for(const p of distinct.values()){
          if(key(p)===key(u)||key(p)===key(v))continue;
          const cross=(v[0]-u[0])*(p[1]-u[1])-(v[1]-u[1])*(p[0]-u[0]);
          if(Math.abs(cross)>1e-7*d)continue;
          const dot=(p[0]-u[0])*(p[0]-v[0])+(p[1]-u[1])*(p[1]-v[1]);
          expect(dot).toBeGreaterThanOrEqual(-1e-7);
        }
      }
    }
  });
  it("constrains fine mesh size even on very large source shapes",()=>{
    const original=triangulateRisoContour([[0,0],[200,0],[200,120],[0,120]]);
    const refined=refineRisoContourMesh(original,{maxEdgeLength:1,maxTriangles:80});
    expect(refined.length).toBeLessThanOrEqual(80);
    expect(refined.reduce((a,t)=>a+area(t),0)).toBeCloseTo(24000,4);
    expect(refineRisoContourMesh(original,{maxEdgeLength:1,maxTriangles:80}))
      .toEqual(refined);
    expect(()=>refineRisoContourMesh(original,{maxEdgeLength:0})).toThrow(RangeError);
    expect(()=>refineRisoContourMesh(original,{maxEdgeLength:7,maxTriangles:0})).toThrow(RangeError);
    expect(()=>refineRisoContourMesh(original,{maxEdgeLength:7,maxTriangles:1})).toThrow(RangeError);
  });
  it("preserves actual Courier eyes, moving sleeves and Bird feather silhouettes under refinement",()=>{
    for(const {spec,sheet,frame,parts} of [
      {spec:COURIER,sheet:RISO_COURIER_SHEET,frame:46,
        parts:["eye-left","eye-right","mouth","sleeve-left","thigh-right","hair-mass"]},
      {spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET,frame:84,
        parts:["left-wing","right-wing","tail","eye"]},
    ]){
      const coarse=evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:18});
      const fine=evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:4});
      expect(coarse.headUnit).toBe(fine.headUnit);
      for(const id of parts){
        const a=coarse.regions.find(r=>r.id===id)!;
        const b=fine.regions.find(r=>r.id===id)!;
        expect(a.outline).toEqual(b.outline);
        expect(b.triangles.length).toBeGreaterThanOrEqual(a.triangles.length);
        expect(b.triangles.length).toBeLessThanOrEqual(950);
        expect(Number.isFinite(b.maxTriangleEdgeLength)).toBe(true);
        expect(b.maxTriangleEdgeLength).toBeGreaterThan(0);
        expect(b.maxTriangleEdgeLength).toBeLessThanOrEqual(a.maxTriangleEdgeLength+1e-6);
        if(b.refinementTargetMet)expect(b.maxTriangleEdgeLength).toBeLessThanOrEqual(4.000001);
        expect(Math.abs(a.triangleArea-b.triangleArea)).toBeLessThan(.0001);
        expect(b.landmarks).toEqual(a.landmarks);
      }
      expect(fine.regions.some(r=>r.triangles.length>coarse.regions.find(p=>p.id===r.id)!.triangles.length)).toBe(true);
    }
  });
  it("spends the larger focused budget on truly smaller Bird wing facets",()=>{
    const limited=evaluateRisoCharacterMesh(PAPER_BIRD,RISO_PAPER_BIRD_SHEET,84,{
      focusRegionId:"left-wing",maxEdgeLength:5,maxTrianglesPerRegion:950,
    }).regions.find(r=>r.id==="left-wing")!;
    const detailed=evaluateRisoCharacterMesh(PAPER_BIRD,RISO_PAPER_BIRD_SHEET,84,{
      focusRegionId:"left-wing",maxEdgeLength:5,maxTrianglesPerRegion:3600,
    }).regions.find(r=>r.id==="left-wing")!;
    expect(detailed.triangles.length).toBeGreaterThan(limited.triangles.length);
    expect(detailed.triangles.length).toBeLessThanOrEqual(3600);
    expect(detailed.maxTriangleEdgeLength).toBeLessThan(limited.maxTriangleEdgeLength);
    expect(detailed.outline).toEqual(limited.outline);
    expect(detailed.contourArea).toBeCloseTo(detailed.triangleArea,4);
  });
  it("focused microcells remain conforming and preserve all other source measurements",()=>{
    for(const {spec,sheet,frame,focus} of [
      {spec:COURIER,sheet:RISO_COURIER_SHEET,frame:46,focus:"head-shape"},
      {spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET,frame:84,focus:"left-wing"},
    ]){
      const full=evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:5});
      const focusReport=evaluateRisoCharacterMesh(spec,sheet,frame,{
        maxEdgeLength:5,focusRegionId:focus,
      });
      const base=evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:200});
      expect(focusReport.overallBounds).toEqual(full.overallBounds);
      expect(focusReport.measurements).toEqual(full.measurements);
      expect(focusReport.headUnit).toBe(full.headUnit);
      for(const r of focusReport.regions){
        const source=full.regions.find(p=>p.id===r.id)!;
        const cheap=base.regions.find(p=>p.id===r.id)!;
        expect(r.outline).toEqual(source.outline);
        expect(r.landmarks).toEqual(source.landmarks);
        expect(r.contourArea).toBeCloseTo(source.contourArea,6);
        expect(r.triangleArea).toBeCloseTo(source.triangleArea,6);
        if(r.id===focus)expect(r.triangles).toEqual(source.triangles);
        else expect(r.triangles).toEqual(cheap.triangles);
      }
      const detailed=focusReport.regions.reduce((sum,r)=>sum+r.triangles.length,0);
      const allDetailed=full.regions.reduce((sum,r)=>sum+r.triangles.length,0);
      expect(detailed).toBeLessThan(allDetailed);
      expect(()=>evaluateRisoCharacterMesh(spec,sheet,frame,{
        focusRegionId:"not-a-real-feature",
      })).toThrow(/Focused Riso mesh region/);
    }
  });
});
