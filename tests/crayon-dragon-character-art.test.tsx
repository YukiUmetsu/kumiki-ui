import {describe,expect,it} from "vitest";
import {crayonDragonVillageScene} from "../src/video/crayon-dragon-village-fixtures";
import {
  crayonDrawingAt,crayonElementTransform,crayonVisiblePoint,inspectCrayonScene,
} from "../registry/video/materials/crayon-scene";

describe("CRAYON1 multi-actor mature illustration continuity",()=>{
  for (const aspect of ["landscape","portrait"] as const){
    const scene=crayonDragonVillageScene(aspect,{detail:1});
    const node=(id:string)=>{
      const match=scene.elements.find(n=>n.id===id);
      if(!match)throw new Error("Missing "+id);
      return match;
    };
    it("inherits the full source art for the companion in "+aspect,()=>{
      expect(inspectCrayonScene(scene)).toEqual([]);
      const components=["shin-front","shin-back","coat-left-panel",
        "coat-right-panel","coat-lapel-left","coat-lapel-right",
        "coat-pocket-structure","coat-seam-architecture",
        "face-temple-shadow","face-cheek-light","muzzle-jowl-shadow",
        "nose-bridge-anatomy","near-eye-iris","near-eye-pupil",
        "left-coat-weave","right-coat-weave","left-ear-fur",
        "right-ear-fur","brow-left","brow-right",
        "scarf-tail-stitch","hand-glove","boot-wear"];
      components.forEach(name=>node("friend-"+name));
      for(const part of scene.elements.filter(n=>n.id.startsWith("friend-"))){
        if(part.parentId)expect(scene.elements.some(x=>x.id===part.parentId)).toBe(true);
        if(part.kind==="wax")expect(part.coverage).toBe("opaque");
      }
      expect(node("friend-near-eye-pupil").parentId).toBe("friend-head");
      expect(node("friend-scarf-tail-stitch").parentId).toBe("friend-scarf-tail");
      expect(node("friend-left-ear-inner").parentId).toBe("friend-left-ear");
      expect(node("friend-right-ear-inner").parentId).toBe("friend-right-ear");
      // The botanical specimen is for the main film, not the companion.
      expect(scene.elements.some(n=>n.id==="friend-flower-petals")).toBe(false);
      expect(scene.elements.length).toBeLessThan(300);
    });
    it("keeps painted boots inside the frame, synchronized with the body",()=>{
      for(const id of ["friend-foot-front","friend-foot-back"]){
        const part=node(id);
        expect(part.kind).toBe("wax");
        expect(part.contacts?.[0]).toMatchObject({start:0,end:269});
        const anchor=part.contacts![0].anchor;
        for(const frame of [0,68,153,204,269]){
          const p=crayonVisiblePoint(scene,part,frame,anchor);
          expect(p.x).toBeGreaterThan(0);
          expect(p.x).toBeLessThan(scene.width);
          expect(p.y).toBeGreaterThan(0);
          expect(p.y).toBeLessThan(scene.height);
        }
      }
    });
    it("keeps subtle facial/ear acting keyed to the companion's scene beats",()=>{
      for(const name of ["friend-left-ear","friend-right-ear","friend-scarf-tail"]){
        const part=node(name);
        expect(part.motionLagFrames).toBeGreaterThanOrEqual(3);
        expect(crayonElementTransform(scene,part,206))
          .not.toBe(crayonElementTransform(scene,part,268));
      }
      for(const name of ["friend-left-eye","friend-near-eye-pupil",
        "friend-near-eye-iris"]){
        const part=node(name);
        if(part.kind!=="contour")throw new Error("Missing contour "+name);
        expect(crayonDrawingAt(part,200).poseId).toBe("blink");
        expect(crayonDrawingAt(part,271).poseId).toBe("smile");
      }
      const brow=node("friend-brow-right");
      if(brow.kind!=="contour")throw new Error("Missing brow");
      expect(crayonDrawingAt(brow,183).poseId).toBe("wonder");
      expect(crayonDrawingAt(brow,268).poseId).toBe("smile");
    });
    it("uses material-native anatomy on the dragon and owl",()=>{
      for(const name of ["dragon-flank-contour-hatching",
        "dragon-cheek-directional-hatching","dragon-neck-form-hatching",
        "owl-cervical-feather-grain","owl-breast-form-grain"]){
        const part=node(name);
        expect(part.kind).toBe("contour");
        if(part.kind==="contour")expect(part.d.match(/M/g)?.length).toBeGreaterThan(20);
      }
      const lid=node("dragon-eye-opaque-lid");
      if(lid.kind!=="wax")throw Error("Missing painted dragon eyelid");
      expect(lid.coverage).toBe("opaque");
      const closed=crayonDrawingAt(lid,208),open=crayonDrawingAt(lid,213);
      expect(closed.d).not.toBe(open.d);
      expect(closed.bounds!.width).toBeGreaterThan(open.bounds!.width*5);
      expect(crayonDrawingAt(lid,208)).toEqual(closed);
      expect(crayonDrawingAt(lid,213)).toEqual(open);
      expect(node("owl-face-left").kind).toBe("wax");
    });
  }
  it("keeps cinematic detail adjustable without altering the original subject shape",()=>{
    const low=crayonDragonVillageScene("landscape",{detail:.25});
    const high=crayonDragonVillageScene("landscape",{detail:1});
    expect(inspectCrayonScene(low)).toEqual([]);
    expect(low.elements.find(n=>n.id==="dragon-head"))
      .toEqual(high.elements.find(n=>n.id==="dragon-head"));
    const density=(scene:typeof low)=>{
      const n=scene.elements.find(n=>n.id==="dragon-cheek-directional-hatching");
      if(!n||n.kind!=="contour")throw Error("Missing cheek");
      return (n.d.match(/M/g)??[]).length;
    };
    expect(density(high)).toBeGreaterThan(density(low));
  });
});
