import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO57_PALMAR_ANATOMY,riso57PalmLandmarks,riso57PositivePalmContour}
  from "../src/video/riso57-palm-contact-silhouette";
import {riso47PalmContour} from "../src/video/riso47-palmar-cup";
import {riso51ProjectPalmarPath} from "../src/video/riso51-view-conditioned-source";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";

const subjects=[
  {spec:COURIER,actor:"courier",active:"right",other:"left"},
  {spec:PAPER_ARTIST,actor:"paper-artist",active:"left",other:"right"},
] as const;
const sides=["right","left"] as const;
type Pt=readonly [number,number];
const cross=(a:Pt,b:Pt,c:Pt)=>
 (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const intersects=(a:Pt,b:Pt,c:Pt,d:Pt)=>
 cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;

function inspectPath(d:string){
  const tokens=d.match(/[MCZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g)!;
  expect(tokens[0]).toBe("M");
  const start:[number,number]=[Number(tokens[1]),Number(tokens[2])];
  expect(tokens[tokens.length-1]).toBe("Z");
  let last:Pt=start;
  const cubics:{begin:Pt;c1:Pt;c2:Pt;end:Pt}[]=[];
  for(let i=3;i<tokens.length-1;){
    expect(tokens[i++]).toBe("C");
    const v=tokens.slice(i,i+6).map(Number);
    expect(v).toHaveLength(6);
    const control1:[number,number]=[v[0],v[1]];
    const control2:[number,number]=[v[2],v[3]];
    const end:[number,number]=[v[4],v[5]];
    cubics.push({begin:last,c1:control1,c2:control2,end});
    last=end;i+=6;
  }
  expect(cubics).toHaveLength(16);
  expect(last).toEqual(start);
  return cubics;
}
describe("RISO57 original 3/4 index/thenar and four-MCP positive skin topology",()=>{
  it("constructs 16 named individually sculpted anatomical landmarks with visible first-web concavity, not an inflated circle",()=>{
    expect(RISO57_PALMAR_ANATOMY.sourceCubicCount).toBe(16);
    expect(RISO57_PALMAR_ANATOMY.sourceLandmarkCount).toBe(16);
    expect(RISO57_PALMAR_ANATOMY.nonPhotoTrace).toBe(true);
    for(const {actor} of subjects)for(const side of sides){
      const landmarks=riso57PalmLandmarks(actor,side);
      expect(landmarks).toHaveLength(16);
      expect(new Set(landmarks.map(p=>p.landmark)).size).toBe(16);
      const at=(name:string)=>landmarks.find(p=>p.landmark===name)!;
      const sign=side==="right"?1:-1;
      expect(sign*at("first-web-inset").x).toBeLessThan(sign*at("thenar-bulge").x-.5);
      expect(sign*at("first-web-inset").x).toBeLessThan(sign*at("index-mcp").x-.9);
      expect(at("first-web-inset").tension).toBeLessThan(.5);
      expect(at("middle-mcp").y).toBeGreaterThan(at("ring-mcp").y+.25);
      expect(at("middle-mcp").y).toBeGreaterThan(at("fifth-mcp").y+1.8);
      expect(sign*at("fifth-mcp").x).toBeLessThan(-6.5);
      expect(at("ulnar-wrist").y).toBeLessThan(0);
      expect(at("radial-wrist").y).toBeLessThan(0);
      const path=riso57PositivePalmContour(actor,side);
      expect(path).toBe(riso47PalmContour(actor,side));
      const flattened=flattenRisoSvgPath(path,.12);
      expect(flattened).toHaveLength(1);
      expect(flattened[0].closed).toBe(true);
      const points=flattened[0].points;
      expect(points.length).toBeGreaterThan(40);
      const area=Math.abs(risoContourSignedArea(points));
      expect(area).toBeGreaterThan(225);
      expect(area).toBeLessThan(360);
      // Exterior is one uninterrupted positive red carpal skin boundary:
      // no crossing odd/even raster silhouette, no fake floating patch.
      for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){
        if(i===0&&j===points.length-1)continue;
        expect(intersects(points[i],points[(i+1)%points.length],
          points[j],points[(j+1)%points.length])).toBe(false);
      }
      const cubics=inspectPath(path);
      // Hermite / Catmull-Rom connected tangents MUST be aligned at every
      // anatomical landmark (no sharp detached seam at metacarpal base).
      for(let i=0;i<cubics.length;i++){
        const before=cubics[(i+15)%16],after=cubics[i];
        const p=after.begin;
        const incoming:[number,number]=[p[0]-before.c2[0],p[1]-before.c2[1]];
        const outgoing:[number,number]=[after.c1[0]-p[0],after.c1[1]-p[1]];
        const dot=incoming[0]*outgoing[0]+incoming[1]*outgoing[1];
        expect(dot).toBeGreaterThan(.02);
        expect(Math.abs(incoming[0]*outgoing[1]-incoming[1]*outgoing[0])).toBeLessThan(.016);
      }
    }
  });
  it("retains the same original RED glove part id and all named BLUE/RED anatomy while its true Bézier turns 3/4 in a real moving two-person sheet",()=>{
    for(const {spec,actor,active,other} of subjects){
      expect(inspectRisoCharacter(spec,["red","blue"])).toEqual([]);
      const base=spec.parts.find(p=>p.id===active+"-glove")!;
      const untouched=spec.parts.find(p=>p.id===other+"-glove")!;
      expect(base.joint).toBe(active+"-hand");
      expect(base.plate).toBe("red");
      expect(base.paint).toBe("solid");
      expect(base.d).toBe(riso57PositivePalmContour(actor,active));
      expect(untouched.d).toBe(riso57PositivePalmContour(actor,other));
      expect(untouched.pathKeys).toBeUndefined();
      for(const frame of [0,142,146,148,154,156,160,166,180,202,206,239]){
        const actual=evaluateRisoCharacter(spec,frame);
        const red=actual.parts.find(p=>p.id===active+"-glove")!;
        const blue=actual.parts.find(p=>p.id===active+"-glove-knuckle-arc")!;
        expect(red.plate).toBe("red");
        expect(blue.plate).toBe("blue");
        expect(red.d.match(/C/g)).toHaveLength(16);
        expect(blue.d.match(/C/g)).toHaveLength(16);
        if(frame===160){
          const cameraProjected=riso51ProjectPalmarPath(base.d,active,actor,1);
          expect(red.d).toBe(cameraProjected);
          const area=Math.abs(risoContourSignedArea(
            flattenRisoSvgPath(red.d,.12)[0].points));
          expect(area).toBeGreaterThan(170);
        }
      }
      for(const id of ["thenar-plane","thenar-fold","index-nail",
        "middle-nail","ring-nail","pinky-nail","wrist-crease"]){
        expect(spec.parts.find(p=>p.id===active+"-glove-"+id)).toBeDefined();
      }
      for(const frame of [160,166])for(const aspect of ["landscape","portrait"] as const){
        const film=evaluateRisoHumanEnsemble(frame,aspect);
        const material=inspectRiso44PrintedIndexContact(spec,frame,active,
          actor==="courier"?film.first:film.second,film.sheet);
        expect(material.redIndexAreaTouchesPaper).toBe(true);
        expect(material.thumbUnderPaper).toBe(true);
      }
    }
  });
});
