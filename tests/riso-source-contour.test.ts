import {describe,it,expect} from "vitest";
import {
  flattenRisoSvgPath,selectRisoSourceContour,risoContourSignedArea,
  triangulateRisoContour,risoPointInContour,
} from "../registry/video/riso-path-geometry";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {risoMeshContourCentroid} from "../registry/video/riso-proportion-mesh";
import {evaluateRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "../src/video/riso-character-mesh-sheets";
const area=(p:readonly (readonly number[])[])=>Math.abs(risoContourSignedArea(p as readonly (readonly [number,number])[]));
const triangleArea=(t:readonly (readonly number[])[])=>area(t);
describe("RISO7 exact source-path topology",()=>{
  it("measures an area-weighted source centroid instead of a guessed bounding-box midpoint",()=>{
    const triangle:[[number,number],[number,number],[number,number]]=[[0,0],[6,0],[0,3]];
    const centroid=risoMeshContourCentroid(triangle);
    expect(centroid[0]).toBeCloseTo(2,6);
    expect(centroid[1]).toBeCloseTo(1,6);
    const winding=risoMeshContourCentroid([...triangle].reverse());
    expect(winding[0]).toBeCloseTo(2,6);
    expect(winding[1]).toBeCloseTo(1,6);
  });
  it("adapts Bezier curves to detail without replacing curved source with rectangles",()=>{
    const path="M0 0 C0 60 80 60 80 0 Q100 -20 120 0 L120 40 L0 40 Z";
    const loose=flattenRisoSvgPath(path,2)[0],fine=flattenRisoSvgPath(path,.2)[0];
    expect(fine.closed).toBe(true);
    expect(fine.points.length).toBeGreaterThan(loose.points.length);
    expect(fine.points.length).toBeGreaterThan(12);
    expect(Math.abs(risoContourSignedArea(fine.points))).toBeGreaterThan(100);
  });
  it("handles absolute/relative instructions and multi-island animated eyes",()=>{
    const p=flattenRisoSvgPath("M1 1 l10 0 v10 h-10 z m20 0 l10 0 l0 10 l-10 0 z");
    expect(p).toHaveLength(2);
    expect(area(p[0].points)).toBeCloseTo(100,5);
    expect(area(p[1].points)).toBeCloseTo(100,5);
    const eyes=COURIER.parts.find(p=>p.id==="eye-line")!.d;
    const left=selectRisoSourceContour(eyes,0),right=selectRisoSourceContour(eyes,1);
    expect(Math.max(...left.map(p=>p[0]))).toBeLessThan(Math.min(...right.map(p=>p[0])));
  });
  it("samples SVG elliptical arcs rather than fabricating square eye contours",()=>{
    const eye=PAPER_BIRD.parts.find(p=>p.id==="eye")!.d;
    const contour=selectRisoSourceContour(eye);
    expect(contour.length).toBeGreaterThan(10);
    const xs=contour.map(p=>p[0]),ys=contour.map(p=>p[1]);
    expect(Math.max(...xs)-Math.min(...xs)).toBeGreaterThan(6);
    expect(Math.max(...ys)-Math.min(...ys)).toBeGreaterThan(6);
    expect(Math.abs(area(contour)-Math.PI*16)).toBeLessThan(5);
  });
  it("does not triangulate across the missing notch of a concave artistic contour",()=>{
    const L:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
      [0,0],[20,0],[20,5],[5,5],[5,20],[0,20],
    ];
    const tris=triangulateRisoContour(L);
    expect(tris).toHaveLength(4);
    const sum=tris.reduce((a,t)=>a+triangleArea(t),0);
    expect(sum).toBeCloseTo(175,4);
    for(const t of tris){
      const centroid:[number,number]=[(t[0][0]+t[1][0]+t[2][0])/3,(t[0][1]+t[1][1]+t[2][1])/3];
      expect(risoPointInContour(centroid,L)).toBe(true);
    }
  });
  it("triangulation respects hand-drawn wing and sleeve contours at different poses",()=>{
    for(const {spec,sheet,frames,id} of [
      {spec:COURIER,sheet:RISO_COURIER_SHEET,frames:[0,46,160],id:"sleeve-left"},
      {spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET,frames:[0,84,160],id:"left-wing"},
    ]){
      for(const frame of frames){
        const part=evaluateRisoCharacterMesh(spec,sheet,frame).regions.find(p=>p.id===id)!;
        expect(part.triangles.length,id+" "+frame).toBeGreaterThan(5);
        expect(part.triangleArea/part.contourArea,id+" "+frame).toBeGreaterThan(.98);
        expect(part.triangleArea/part.contourArea,id+" "+frame).toBeLessThan(1.02);
      }
    }
  });
  it("refuses malformed path flags, missing islands and unsafe numeric coordinates",()=>{
    expect(()=>flattenRisoSvgPath("M0 0 A10 10 0 2 0 10 10Z")).toThrow();
    expect(()=>selectRisoSourceContour("M0 0L5 0L0 5Z",1)).toThrow();
    expect(()=>flattenRisoSvgPath("M0 0<script>")).toThrow();
    expect(()=>flattenRisoSvgPath("M0 0L999999999999 0L0 1Z")).toThrow();
  });
});
