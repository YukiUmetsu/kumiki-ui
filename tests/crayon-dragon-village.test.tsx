import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { crayonDragonVillageScene } from "../src/video/crayon-dragon-village-fixtures";
import { crayonScaleField, crayonMasonryCourses, crayonRoofCourses } from "../src/video/crayon-craft-detail-patterns";
import {
  crayonElementPlacement,crayonElementTransform,crayonDrawingAt,
  crayonWorldPoint,inspectCrayonScene,
} from "../registry/video/materials/crayon-scene";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";

describe("material-native grouped craft detail",()=>{
  it("repeats a deterministic, staggered field of anatomical wax scales",()=>{
    const opts={x:-55,y:-40,rows:5,columns:7,stepX:13,stepY:12,width:9,depth:5,seed:99};
    const a=crayonScaleField(opts);
    crayonScaleField({...opts,seed:101});
    expect(crayonScaleField(opts)).toEqual(a);
    expect(a.match(/M-?\d/g)?.length).toBe(35);
    expect(a).toMatch(/q/);
    expect(crayonScaleField({...opts,seed:101})).not.toEqual(a);
    expect(()=>crayonScaleField({...opts,rows:30})).toThrow(/bounded/);
    expect(()=>crayonScaleField({...opts,width:Infinity})).toThrow(/bounded/);
    expect(()=>crayonScaleField({...opts,seed:1.4})).toThrow(/bounded/);
    expect(()=>crayonScaleField({...opts,rows:18,columns:22})).toThrow(/bounded/);
  });
  it("constructs finite staggered masonry and triangular roof tiles",()=>{
    const mortar={x:-100,y:-150,rows:7,columns:2,courseWidth:28,courseHeight:16,seed:18};
    const a=crayonMasonryCourses(mortar);
    expect(a).toEqual(crayonMasonryCourses(mortar));
    expect(a.match(/M-?\d/g)?.length).toBeGreaterThanOrEqual(14);
    expect(()=>crayonMasonryCourses({...mortar,rows:23})).toThrow(/bounded/);
    const roof={apexX:0,apexY:-267,halfWidth:65,height:85,rows:9,seed:55};
    const d=crayonRoofCourses(roof);
    expect(d).toEqual(crayonRoofCourses(roof));
    expect(d.match(/M-?\d/g)?.length).toBeGreaterThan(30);
    expect(()=>crayonRoofCourses({...roof,halfWidth:-10})).toThrow(/bounded/);
    // The tile endpoints stay within the triangle, including the 9th row.
    for(const m of d.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)q(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)){
      const x=Number(m[1]),y=Number(m[2]),endX=x+Number(m[5]);
      const endY=y+Number(m[6]);
      const half=roof.halfWidth*(y-roof.apexY)/roof.height;
      expect(Math.abs(x-roof.apexX)).toBeLessThan(half);
      expect(Math.abs(endX-roof.apexX)).toBeLessThan(half+2);
      expect(endY).toBeGreaterThan(y);
    }
  });
});
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
      expect(scene.elements.some(n=>n.id==="dragon-flank-scale-field")).toBe(true);
      expect(scene.elements.some(n=>n.id==="dragon-neck-overlapping-scutes")).toBe(true);
      expect(scene.elements.some(n=>n.id==="dragon-wing-near-membrane-veins")).toBe(true);
      expect(scene.elements.some(n=>n.id==="owl-layered-breast-feathers")).toBe(true);
      expect(scene.elements.some(n=>n.id==="castle-center-roof-tiles")).toBe(true);
      expect(scene.elements.some(n=>n.id==="castle-carved-voussoir-arch")).toBe(true);
      expect(scene.elements.some(n=>n.id==="castle-clock-engraved-ticks")).toBe(true);
      const bodyScale=scene.elements.find(n=>n.id==="dragon-flank-scale-field");
      if(!bodyScale||bodyScale.kind!=="contour")throw Error("missing scales");
      expect(bodyScale.d.match(/M-?\d/g)?.length).toBeGreaterThan(35);

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
  it("keeps maximum architecture detail within bounded renderer budgets",()=>{
    const scene=crayonDragonVillageScene("landscape",
      {detail:1,wingPower:1.6,followThrough:18,palette:"plum"});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(scene.elements.length).toBeLessThanOrEqual(240);
    expect(scene.elements.filter(e=>e.id.startsWith("castle-")).length)
      .toBeGreaterThan(30);
    expect(scene.elements.some(e=>e.id==="village-moon")).toBe(true);
    expect(scene.elements.some(e=>e.id==="castle-door-lamp-left")).toBe(true);
    const highField=scene.elements.find(e=>e.id==="dragon-flank-scale-field");
    const lowScene=crayonDragonVillageScene("landscape",{detail:.25});
    const lowField=lowScene.elements.find(e=>e.id==="dragon-flank-scale-field");
    if(!highField||highField.kind!=="contour"||!lowField||lowField.kind!=="contour")
      throw new Error("scale density missing");
    expect((highField.d.match(/M-?\d/g)??[]).length)
      .toBeGreaterThan((lowField.d.match(/M-?\d/g)??[]).length);

  });
  it("authors inspectable close-up shots without changing actor rigs or render timing",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const base=crayonDragonVillageScene(aspect,{detail:1});
      const dragon=crayonDragonVillageScene(aspect,{detail:1,shot:"dragon"});
      const castle=crayonDragonVillageScene(aspect,{detail:1,shot:"architecture"});
      expect(inspectCrayonScene(dragon)).toEqual([]);
      expect(inspectCrayonScene(castle)).toEqual([]);
      expect(dragon.camera?.[0].zoom).toBeGreaterThan(1.5);
      expect(castle.camera?.[0].zoom).toBeGreaterThan(1.5);
      expect(dragon.camera?.[0].focusX).not.toEqual(castle.camera?.[0].focusX);
      expect(dragon.elements).toEqual(base.elements.filter(e=>
        e.kind!=="lettering" &&
        !/^(castle|western-shop|eastern-shop|owl|friend)-/.test(e.id)));
      expect(castle.elements).toEqual(base.elements.filter(e=>
        e.kind!=="lettering" && !/^(dragon|owl|friend)-/.test(e.id)));
      expect(castle.elements.some(e=>e.id==="castle-main")).toBe(true);
      expect(castle.elements.some(e=>e.id==="dragon-body")).toBe(false);
      expect(dragon.elements.some(e=>e.id==="dragon-body")).toBe(true);
      expect(dragon.elements.some(e=>e.id==="castle-main")).toBe(false);
      expect(base.elements.some(e=>e.id==="dragon-village-title")).toBe(true);
      expect(dragon.elements.some(e=>e.id==="dragon-village-title")).toBe(false);
      expect(dragon.durationFrames).toBe(330);
      expect(dragon.camera?.[0].zoom).toBe(dragon.camera?.[2].zoom);
    }
    expect(()=>crayonDragonVillageScene("landscape",
      {shot:"unknown" as "wide"})).toThrow(/settings/);
  });
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
