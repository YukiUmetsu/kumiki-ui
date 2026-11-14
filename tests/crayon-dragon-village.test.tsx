import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { crayonDragonVillageScene } from "../src/video/crayon-dragon-village-fixtures";
import {
  crayonElementPlacement,crayonElementTransform,crayonDrawingAt,
  crayonWorldPoint,inspectCrayonScene,
} from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";

describe("multi-actor crayon dragon village",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("validates a detailed three-actor original scene in "+aspect,()=>{
      const scene=crayonDragonVillageScene(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      expect(scene.elements.length).toBeGreaterThan(155);
      expect(scene.elements.length).toBeLessThanOrEqual(240);
      expect(scene.durationFrames).toBe(330); // Faster than the older 450-frame draw-in film.
      expect(scene.width).toBe(aspect==="portrait"?540:960);
      expect(scene.height).toBe(aspect==="portrait"?960:540);
      expect(scene.elements.some(n=>n.id==="dragon-wing-near")).toBe(true);
      expect(scene.elements.some(n=>n.id==="dragon-tail-tip")).toBe(true);
      expect(scene.elements.some(n=>n.id==="owl-head")).toBe(true);
      expect(scene.elements.some(n=>n.id==="friend-head")).toBe(true);
      expect(scene.elements.some(n=>n.id==="castle-clock")).toBe(true);
      expect(scene.elements.some(n=>n.id==="castle-railing-0")).toBe(true);
      const ids=new Set(scene.elements.map(n=>n.id));
      expect(ids.size).toBe(scene.elements.length);
      for(const node of scene.elements){
        if(node.parentId)expect(ids.has(node.parentId)).toBe(true);
      }
    });
    it("uses stable lag and expressive deformation in "+aspect,()=>{
      const scene=crayonDragonVillageScene(aspect);
      const tip=scene.elements.find(e=>e.id==="dragon-tail-tip");
      const wing=scene.elements.find(e=>e.id==="dragon-wing-near");
      const friend=scene.elements.find(e=>e.id==="friend-body");
      if(!tip||!wing||!friend)throw Error("missing actor rig");
      const at=(n:typeof tip,frame:number)=>crayonElementTransform(scene,n,frame);
      const a=at(tip,165),b=at(tip,224);
      expect(a).not.toEqual(b);
      at(tip,329);at(tip,0);
      expect(at(tip,165)).toEqual(a);
      const wingPose=crayonElementPlacement(wing,140);
      expect(wingPose.scaleX).not.toBe(wingPose.scaleY);
      const friendPose=crayonElementPlacement(friend,153);
      expect(friendPose.scaleX).toBeGreaterThan(friendPose.scaleY);
      const p=crayonWorldPoint(scene,tip,165,{x:-225,y:-138});
      expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);
      expect(crayonElementPlacement(tip,0,true))
        .toEqual(crayonElementPlacement(tip,329,true));
      const lid=scene.elements.find(e=>e.id==="dragon-eyelid");
      if(!lid||lid.kind!=="contour")throw Error("missing dragon lid");
      expect(crayonDrawingAt(lid,207).poseId).toBe("blink");
      expect(crayonDrawingAt(lid,278).poseId).toBe("smile");
    });
  }
  it("turns off an entire actor safely and supports alternate creature palettes",()=>{
    const scene=crayonDragonVillageScene("landscape",
      {cast:"duo",detail:.25,wingPower:.5,palette:"copper",followThrough:0});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(scene.elements.some(n=>n.id.startsWith("owl-"))).toBe(false);
    const dragon=scene.elements.find(n=>n.id==="dragon-body");
    if(!dragon||dragon.kind!=="wax")throw Error("dragon missing");
    expect(dragon.colors).toEqual(["#c27f67","#a4625b","#e2a58b"]);
    const title=scene.elements.find(n=>n.id==="dragon-village-subtitle");
    if(!title||title.kind!=="lettering")throw Error("title missing");
    expect(title.lines[0]).toContain("TWO LITTLE LIVES");
  });
  it("keeps source nodes unchanged between seeks and rendered film frames",()=>{
    const scene=crayonDragonVillageScene("landscape",{wingPower:1.3,detail:.55});
    expect(inspectCrayonScene(scene)).toEqual([]);
    const material=(frame:number,reducedMotion=false)=>
      renderToStaticMarkup(<CrayonScene spec={scene} frame={frame} reducedMotion={reducedMotion}/>);
    const a=material(165),final=material(329);
    expect(a).toContain('data-km-crayon-element="dragon-body"');
    expect(a).toContain('data-km-crayon-element="owl-body"');
    expect(a).toContain('data-km-crayon-element="friend-body"');
    expect(a).toContain('data-km-crayon-motion-lag="');
    expect(final).not.toEqual(a);
    material(0);material(329);
    expect(material(165)).toEqual(a);
    expect(material(0,true)).toContain('data-km-crayon-scene="crayon-dragon-village-landscape"');
  });
  it("rejects invalid authored secondary rig and composition values",()=>{
    expect(()=>crayonDragonVillageScene("portrait",{wingPower:2})).toThrow(/settings/);
    expect(()=>crayonDragonVillageScene("landscape",{detail:NaN})).toThrow(/settings/);
    expect(()=>crayonDragonVillageScene("landscape",{followThrough:19})).toThrow(/settings/);
    expect(()=>crayonDragonVillageScene("landscape",{cast:"quartet" as "trio"})).toThrow(/settings/);
    const scene=crayonDragonVillageScene("landscape");
    const part=scene.elements.find(n=>n.id==="dragon-tail-tip");
    const root=scene.elements.find(n=>n.id==="dragon-body");
    if(!part||!root)throw Error("missing test actors");
    const replace=(id:string,data:unknown)=>inspectCrayonScene({
      ...scene,elements:scene.elements.map(n=>n.id===id?data:n),
    }).join("\n");
    expect(replace(part.id,{...part,motionLagFrames:-1})).toMatch(/motionLagFrames/);
    expect(replace(part.id,{...part,motionLagFrames:25})).toMatch(/motionLagFrames/);
    expect(replace(root.id,{...root,placement:{x:120,y:90,scale:1,scaleY:2.3}}))
      .toMatch(/placement/);
    expect(replace(root.id,{...root,placement:{x:120,y:90,scale:1,scaleX:0.1}}))
      .toMatch(/placement/);
    if(root.motion?.length){
      expect(replace(root.id,{...root,motion:[{...root.motion[0],scaleX:3}]}))
        .toMatch(/motion/);
    }
  });
  it("motion lag is a pure delay rather than a mutable spring",()=>{
    const scene=crayonDragonVillageScene("landscape",{followThrough:8});
    const node=scene.elements.find(n=>n.id==="dragon-tail-base");
    if(!node)throw Error("no tail");
    const unchanged={...node,motionLagFrames:0};
    expect(crayonElementPlacement(node,165).rotate)
      .toBeLessThan(crayonElementPlacement(unchanged,165).rotate);
    expect(crayonElementPlacement(node,165))
      .toEqual(crayonElementPlacement(node,165));
  });
});
