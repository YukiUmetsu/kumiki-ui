import {describe,expect,it} from "vitest";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {selectRisoSourceContour,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {inspectRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "../src/video/riso-character-mesh-sheets";

const courierFeatures=[
  "coat-underarm-creases","coat-hem-pleats","mouth-corner-creases",
  "left-glove-thumb-fold","right-glove-thumb-fold",
] as const;
const birdFeatures=[
  "wing-left-barbs","wing-right-barbs","wing-left-covert-row",
  "wing-right-covert-row","breast-contour-feathers","tail-feather-barbs",
] as const;
const frameParts=(actor:typeof COURIER,frame:number)=>
  new Map(evaluateRisoCharacter(actor,frame).parts.map(p=>[p.id,p]));

describe("RISO11 handcrafted ink topology and motion",()=>{
  for(const [actor,sheet,features] of [
    [COURIER,RISO_COURIER_SHEET,courierFeatures],
    [PAPER_BIRD,RISO_PAPER_BIRD_SHEET,birdFeatures],
  ] as const){
    it(actor.id+": validates every detailed source contour and mapped construction region",()=>{
      expect(inspectRisoCharacter(actor)).toEqual([]);
      expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
      const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
      for(const id of features){
        const part=actor.parts.find(p=>p.id===id)!;
        expect(part,id).toBeDefined();
        expect(mapped.has(id),id).toBe(true);
        expect(part.opacity??1,id).toBe(1);
        expect(selectRisoSourceContour(part.d).length,id).toBeGreaterThan(2);
      }
    });
  }

  it("wing engraving is tapered and materially subordinate to its parent mass",()=>{
    for(const side of ["left","right"] as const){
      const wing=PAPER_BIRD.parts.find(p=>p.id==="wing-"+side)!;
      const quills=PAPER_BIRD.parts.find(p=>p.id==="wing-"+side+"-quills")!;
      const wingArea=Math.abs(risoContourSignedArea(selectRisoSourceContour(wing.d)));
      const quillArea=Math.abs(risoContourSignedArea(selectRisoSourceContour(quills.d)));
      expect(wingArea).toBeGreaterThan(75);
      expect(quillArea,side).toBeGreaterThan(.12);
      expect(quillArea/wingArea,side).toBeLessThan(.055);
      expect(quills.paint).toBe("solid");
    }
  });

  it("barbs and coverts inherit their wing orientation across flight keys",()=>{
    for(const frame of [0,16,36,58,84,112,150,180,214,239]){
      const parts=frameParts(PAPER_BIRD,frame);
      for(const side of ["left","right"]){
        for(const feature of ["barbs","covert-row","quills"]){
          expect(parts.get("wing-"+side+"-"+feature)!.transform)
            .toBe(parts.get("wing-"+side)!.transform);
        }
      }
      expect(parts.get("tail-feather-barbs")!.transform)
        .toBe(parts.get("tail-feathers")!.transform);
    }
  });

  it("articulated glove creases and costume marks follow their parent joints",()=>{
    for(const frame of [0,46,160,198,239]){
      const parts=frameParts(COURIER,frame);
      for(const side of ["left","right"]){
        expect(parts.get(side+"-glove-thumb-fold")!.transform)
          .toBe(parts.get(side+"-glove")!.transform);
      }
      expect(parts.get("coat-underarm-creases")!.transform)
        .toBe(parts.get("coat")!.transform);
      expect(parts.get("coat-hem-pleats")!.transform)
        .toBe(parts.get("coat")!.transform);
      expect(parts.get("mouth-corner-creases")!.transform)
        .toBe(parts.get("mouth")!.transform);
    }
    const normal=frameParts(COURIER,46).get("mouth-corner-creases")!.d;
    const speech=frameParts(COURIER,160).get("mouth-corner-creases")!.d;
    const smile=frameParts(COURIER,198).get("mouth-corner-creases")!.d;
    expect(speech).not.toBe(normal);
    expect(smile).not.toBe(speech);
    expect(smile).not.toBe(normal);
    const speakMouth=COURIER.parts.find(p=>p.id==="mouth")!.expressions?.speak;
    expect(speakMouth).toBeDefined();
    expect(selectRisoSourceContour(speakMouth!).length).toBeGreaterThan(5);
  });
});
