import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {RisoCharacterInk} from "../registry/video/riso-character-react";
import {evaluateRisoCharacterMesh,inspectRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {risoPointInContour,selectRisoSourceContour} from "../registry/video/riso-path-geometry";
import {COURIER} from "../src/video/riso-character-demo";
import {RISO_COURIER_SHEET} from "../src/video/riso-character-mesh-sheets";

const newHead=[
  "ear-left","face-temple-shadow","eye-socket-planes","hair-root-whorls",
  "eye-upper-lid-folds","nose-bridge-plane","nose-ala-right","philtrum","chin-plane",
] as const;
const newCloth=["coat-collar-underfold","coat-back-pleat"] as const;
const fingers=["thumb","index","middle","ring"] as const;
const frames=[46,78,92,160,198] as const;
const frameMap=(frame:number)=>new Map(evaluateRisoCharacter(COURIER,frame).parts.map(p=>[p.id,p]));

describe("RISO13 human anatomy source and FK/IK",()=>{
  it("all new semantic planes and digits pass source-mesh and character validation",()=>{
    expect(inspectRisoCharacter(COURIER)).toEqual([]);
    expect(inspectRisoCharacterMesh(COURIER,RISO_COURIER_SHEET)).toEqual([]);
    const mapped=new Set(RISO_COURIER_SHEET.regions.flatMap(r=>r.parts));
    const ids=new Set(COURIER.parts.map(p=>p.id));
    for(const id of [...newHead,...newCloth]){
      expect(ids.has(id),id).toBe(true);
      expect(mapped.has(id),id).toBe(true);
    }
    for(const side of ["left","right"]){
      expect(ids.has(side+"-finger-joint-lines"),side).toBe(true);
      for(const digit of fingers){
        expect(ids.has(side+"-glove-"+digit),side+digit).toBe(true);
        expect(mapped.has(side+"-glove-"+digit),side+digit).toBe(true);
      }
    }
    expect(COURIER.parts.every(p=>(p.opacity??1)===1)).toBe(true);
  });

  it("eight independently movable finger joints retain palm-root connections",()=>{
    const joints=new Map(COURIER.joints.map(j=>[j.id,j]));
    for(const side of ["left","right"]){
      const hand=COURIER.parts.find(p=>p.id===side+"-glove")!;
      const palm=selectRisoSourceContour(hand.d);
      for(const digit of fingers){
        const joint=joints.get(side+"-"+digit)!;
        expect(joint.parent).toBe(side+"-hand");
        expect(risoPointInContour([joint.x,joint.y],palm),side+"-"+digit)
          .toBe(true);
        const posed=frames.map(at=>frameMap(at).get(side+"-glove-"+digit)!.transform);
        expect(new Set(posed).size).toBeGreaterThan(2);
        expect(posed[0]).not.toBe(frameMap(46).get(side+"-glove")!.transform);
      }
    }
  });

  it("facial planes use the expression-linked head transform and mouth/eye changes",()=>{
    for(const at of frames){
      const parts=frameMap(at);
      for(const id of newHead){
        const actual=parts.get(id)!;
        expect(actual.transform,id).toBe(parts.get("face-outline")!.transform);
        expect(selectRisoSourceContour(actual.d).length,id).toBeGreaterThanOrEqual(3);
      }
      expect(parts.get("coat-back-pleat")!.transform).toBe(parts.get("coat")!.transform);
    }
    const neutral=frameMap(46),blink=frameMap(78),speaking=frameMap(160),smile=frameMap(198);
    expect(blink.get("eye-upper-lid-folds")!.d).not.toEqual(neutral.get("eye-upper-lid-folds")!.d);
    expect(smile.get("eye-upper-lid-folds")!.d).not.toEqual(neutral.get("eye-upper-lid-folds")!.d);
    expect(speaking.get("mouth")!.d).not.toEqual(neutral.get("mouth")!.d);
    expect(smile.get("mouth")!.d).not.toEqual(speaking.get("mouth")!.d);
  });

  it("every stress pose triangulates new eye, mouth, hand and coat contours",()=>{
    for(const at of frames){
      const mesh=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,at,{maxEdgeLength:9});
      for(const id of ["eye-upper-lid-folds","nose-bridge-plane","chin-plane",
        "glove-right-thumb","glove-right-index","glove-right-middle","glove-right-ring",
        "coat-collar-underfold","coat-back-pleat"]){
        const region=mesh.regions.find(p=>p.id===id)!;
        expect(region,id).toBeDefined();
        expect(region.contourArea,id).toBeGreaterThan(.01);
        expect(region.triangleArea,id).toBeGreaterThan(0);
        expect(region.triangleArea,id).toBeLessThan(region.contourArea*1.05);
      }
      expect(mesh.measurements.find(x=>x.id==="right-grip-span")?.distance).toBeGreaterThan(0);
      expect(mesh.measurements.find(x=>x.id==="eye-mouth")?.distance).toBeGreaterThan(0);
    }
  });

  it("independent ink plates preserve paper-clearance masks and separate digits",()=>{
    for(const plateId of ["blue","red"]){
      const markup=renderToStaticMarkup(createElement(RisoCharacterInk,{
        spec:COURIER,frame:160,plateId,paint:{solid:"#225D90",dots:"url(#test-dots)"},
      }));
      expect(markup).toContain('data-km-riso-paper-clearance="face"');
      expect(markup).toContain('data-km-riso-character="courier"');
      if(plateId==="red"){
        expect(markup).toContain('data-km-riso-part="right-glove-index"');
        expect(markup).toContain('data-km-riso-part="right-glove-middle"');
        expect(markup).toContain('data-km-riso-part="right-glove-ring"');
        expect(markup).toContain('data-km-riso-part="right-glove-thumb"');
        expect(markup).toContain('data-km-riso-part="nose-bridge-plane"');
      }else{
        expect(markup).toContain('data-km-riso-part="eye-upper-lid-folds"');
        expect(markup).not.toContain('data-km-riso-part="right-glove-index"');
      }
    }
  });
});
