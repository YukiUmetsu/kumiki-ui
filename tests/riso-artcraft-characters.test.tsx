import {describe,it,expect} from "vitest";
import {inspectRisoCharacter,evaluateRisoCharacter} from "../registry/video/riso-character";
import {selectRisoSourceContour,risoContourSignedArea,risoPointInContour} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacterMesh,inspectRisoCharacterMesh} from "../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "../src/video/riso-character-demo";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "../src/video/riso-character-mesh-sheets";

/** ArtCraft structural checks are deliberately independent of its visual-quality review. */
const frameParts=(actor:typeof COURIER,frame:number)=>
  new Map(evaluateRisoCharacter(actor,frame).parts.map(p=>[p.id,p]));
describe("RISO9 reference-led hand-authored character detail",()=>{
  for(const {actor,sheet} of [
    {actor:COURIER,sheet:RISO_COURIER_SHEET},
    {actor:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET},
  ]){
    it(actor.id+": the entire new art region hierarchy is mapped and source-valid",()=>{
      expect(inspectRisoCharacter(actor)).toEqual([]);
      expect(inspectRisoCharacterMesh(actor,sheet)).toEqual([]);
      const ink=new Set(actor.parts.map(p=>p.id));
      const mapped=new Set(sheet.regions.flatMap(r=>r.parts));
      expect([...ink].filter(p=>!mapped.has(p))).toEqual([]);
      for(const part of actor.parts){
        expect(part.opacity??1,part.id).toBe(1);
        expect(selectRisoSourceContour(part.d).length,part.id).toBeGreaterThan(2);
      }
    });
  }
  it("Courier face: restored pupils, lower lids, root-connected hair, nostril and expression redraws",()=>{
    const ids=new Set(COURIER.parts.map(p=>p.id));
    for(const id of ["hair-forelock","hair-temple","hair-strand-ink","eye-lower-lids",
      "iris-left","iris-right","nostril","cheek-plane","lip-shadow"])
      expect(ids.has(id),id).toBe(true);
    const a=frameParts(COURIER,46),blink=frameParts(COURIER,78),
      speak=frameParts(COURIER,160),smile=frameParts(COURIER,198);
    expect(a.get("iris-left")!.d).not.toEqual(blink.get("iris-left")!.d);
    expect(a.get("iris-right")!.d).not.toEqual(blink.get("iris-right")!.d);
    expect(a.get("mouth")!.d).not.toEqual(speak.get("mouth")!.d);
    expect(a.get("lip-shadow")!.d).not.toEqual(speak.get("lip-shadow")!.d);
    expect(a.get("mouth")!.d).not.toEqual(smile.get("mouth")!.d);
    expect(a.get("hair-temple")!.transform).toBe(a.get("hair")!.transform);
    const head=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,46,{maxEdgeLength:8});
    for(const id of ["iris-left","iris-right","eye-lower-lids","hair-forelock"]){
      const region=head.regions.find(p=>p.id===id)!;
      expect(region.triangles.length).toBeGreaterThan(0);
      expect(region.referenceBounds.width).toBeGreaterThan(1);
    }
  });
  it("Courier wearables: visible thumb opposition and creases follow the right and left hand",()=>{
    for(const id of ["cuff-left","cuff-right","sleeve-left-fold","sleeve-right-fold",
      "coat-shoulder-fold","coat-waist-dart","pocket-welt","satchel-flap-stitch"])
      expect(COURIER.parts.some(p=>p.id===id),id).toBe(true);
    const p=frameParts(COURIER,46);
    expect(p.get("left-glove")!.transform).toBe(p.get("left-glove-detail")!.transform);
    expect(p.get("right-glove")!.transform).toBe(p.get("right-glove-detail")!.transform);
    // IK-skinned forearm contour already occupies world space (identity SVG
    // matrix); cuff is a separate rigid joint-local part on the same elbow.
    expect(COURIER.parts.find(part=>part.id==="cuff-right")?.joint).toBe("right-elbow");
    expect(COURIER.parts.find(part=>part.id==="right-forearm")?.skin?.tipJoint).toBe("right-hand");
    expect(p.get("right-forearm")!.transform).toBe("matrix(1 0 0 1 0 0)");
    expect(p.get("cuff-right")!.transform).toMatch(/^matrix\(/);
    for(const id of ["left-glove","right-glove","coat","hair"]){
      const d=COURIER.parts.find(p=>p.id===id)!.d;
      expect((d.match(/[CQ]/g)??[]).length,id).toBeGreaterThanOrEqual(2);
    }
  });
  it("Paper Bird: wing tips, roots and detail accents rotate with distinct wing joints",()=>{
    const ids=new Set(PAPER_BIRD.parts.map(p=>p.id));
    for(const id of ["wing-left-coverts","wing-right-coverts","wing-left-quills",
      "wing-right-quills","head-nape","body-feather-hatching","eye-ring",
      "eye-brow","beak-divider","beak-nostril"])expect(ids.has(id),id).toBe(true);
    const calm=frameParts(PAPER_BIRD,0),flap=frameParts(PAPER_BIRD,84);
    for(const side of ["left","right"]){
      const wing=side==="left"?"wing-left":"wing-right";
      for(const id of [`wing-${side}-coverts`,`wing-${side}-quills`]){
        expect(calm.get(id)!.transform).toBe(calm.get(wing)!.transform);
        expect(flap.get(id)!.transform).toBe(flap.get(wing)!.transform);
        expect(flap.get(id)!.transform).not.toEqual(calm.get(id)!.transform);
      }
      const d=PAPER_BIRD.parts.find(p=>p.id===wing)!.d;
      expect((d.match(/[CQ]/g)??[]).length,wing).toBeGreaterThan(7);
    }
    expect(risoContourSignedArea(selectRisoSourceContour(PAPER_BIRD.parts.find(p=>p.id==="beak")!.d))).not.toBe(0);
  });
  it("Paper Bird: head is not obscured by a giant dark second-ink body overlap",()=>{
    const body=selectRisoSourceContour(PAPER_BIRD.parts.find(p=>p.id==="body")!.d);
    const head=selectRisoSourceContour(PAPER_BIRD.parts.find(p=>p.id==="head")!.d);
    let face=0,overprint=0;
    // Equal-scale local-space grid; both parts share the same root joint.
    for(let x=8;x<=54;x+=1.4)for(let y=-34;y<=27;y+=1.4){
      if(!risoPointInContour([x,y],head))continue;
      face++;
      if(risoPointInContour([x,y],body))overprint++;
    }
    expect(face).toBeGreaterThan(200);
    expect(overprint/face).toBeLessThan(.15);
  });
  it("source-contour eyes, wing tips and mouth remain measurably different across animation stress poses",()=>{
    for(const {actor,sheet,frames,feature} of [
      {actor:COURIER,sheet:RISO_COURIER_SHEET,frames:[46,78,160,198],feature:"mouth"},
      {actor:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET,frames:[0,84,160,210],feature:"left-wing"},
    ]){
      const [a,...other]=frames.map(frame=>evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:10}));
      const source=a.regions.find(r=>r.id===feature)!;
      expect(source.triangleArea).toBeGreaterThan(0);
      expect(other.some(r=>r.regions.find(x=>x.id===feature)!.outline.some(
        (p,i)=>JSON.stringify(p)!==JSON.stringify(source.outline[i])))).toBe(true);
      for(const mesh of [a,...other]){
        for(const id of feature==="mouth"?["mouth","iris-left","iris-right"]:["left-wing","right-wing","tail"]){
          const region=mesh.regions.find(r=>r.id===id)!;
          expect(region.triangleArea,feature+id).toBeGreaterThan(0);
          expect(Math.abs(region.triangleArea-region.contourArea),feature+id)
            .toBeLessThan(region.contourArea*.04);
        }
      }
    }
  });
});
