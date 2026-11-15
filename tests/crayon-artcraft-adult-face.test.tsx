import {describe,expect,it} from "vitest";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene,crayonWorldPoint} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonAdultFaceStudy,portraitCriticalParts} from "../src/video/crayon-artcraft-adult-face-fixtures";
import faceMeta,{AdultFaceThreeQuarter,AdultFacePortrait} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft v6 reference-led adult portrait construction (not visual approval)",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("has independently painted semantic anatomy and solid wax in "+aspect,()=>{
      const scene=crayonAdultFaceStudy(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const nodes=new Map(scene.elements.map(x=>[x.id,x]));
      expect(new Set(scene.elements.map(x=>x.id)).size).toBe(scene.elements.length);
      for(const id of portraitCriticalParts)expect(nodes.has(id),id).toBe(true);
      expect(scene.elements.length).toBeLessThan(240);
      for(const id of ["adult-face","hair-back","nose-bridge",
        "nose-alar-wing","lip-upper-volume","lip-lower-volume",
        "left-eye-aperture","right-eye-aperture","left-upper-lid","right-upper-lid"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("No semantic wax: "+id);
        expect(node.coverage).toBe("opaque");
        expect((node.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(2);
      }
      const firstEye=nodes.get("left-eye-aperture");
      const iris=nodes.get("left-eye-iris");
      const pupil=nodes.get("left-eye-pupil");
      const lid=nodes.get("left-upper-lid");
      if(firstEye?.kind!=="wax"||iris?.kind!=="wax"||
        pupil?.kind!=="wax"||lid?.kind!=="wax")
        throw new Error("Unstructured eye paint");
      expect(firstEye.timing.start).toBeLessThan(iris.timing.start);
      expect(lid.timing.start).toBeLessThan(pupil.timing.start);
      expect(firstEye.timing.end).toBeLessThan(pupil.timing.end);
      const face=nodes.get("adult-face");
      if(face?.kind!=="wax")throw new Error("No adult cranium");
      expect(face.bounds.height/face.bounds.width).toBeGreaterThan(1.45);
      const near=nodes.get("left-eye-aperture");
      const far=nodes.get("right-eye-aperture");
      if(near?.kind!=="wax"||far?.kind!=="wax")throw new Error("Missing eyes");
      // Eye symbols must not overwhelm adult face construction.
      expect(near.bounds.width/face.bounds.width).toBeLessThan(.3);
      expect(far.bounds.width/face.bounds.width).toBeLessThan(.23);
      expect(nodes.get("near-iris-radials")?.parentId).toBe("left-eye-iris");
      expect(nodes.get("far-iris-radials")?.parentId).toBe("right-eye-iris");
      const bg=nodes.get("paper-value");
      expect(bg?.kind==="wax"&&bg.coverage).toBe("open");
      // Tonal masses are now translucent rubs OVER solid human underpainting.
      // This is physically layered wax, not a see-through character mask.
      for(const tonal of ["temple-cool","forehead-ochre","left-cheek-volume",
        "right-cheek-receding","malar-reflection","mandible-plane",
        "left-supraorbital","right-supraorbital","nose-sidewall"]){
        const patch=nodes.get(tonal);
        if(patch?.kind!=="wax")throw new Error("Missing tonal wax "+tonal);
        expect(patch.coverage).toBe("open");
        expect(patch.parentId).toBe("adult-face");
        expect(patch.clipToParent).toBe(true);
        expect(patch.blendRadius).toBeGreaterThanOrEqual(6);
      }
      const human=nodes.get("adult-face");
      expect(human?.kind==="wax"&&human.coverage).toBe("opaque");
      expect(nodes.get("hair-back")?.parentId).toBe("adult-face");
      const hair=nodes.get("hair-back");
      const torso=nodes.get("coat-silhouette");
      if(!hair||!torso)throw new Error("Missing framing masses");
      const crown=crayonWorldPoint(scene,hair,299,{x:-25,y:-318});
      const hem=crayonWorldPoint(scene,torso,299,{x:120,y:326});
      expect(crown.y).toBeGreaterThan(8);
      expect(hem.y).toBeLessThan(scene.height-8);
      expect(crown.x).toBeGreaterThan(8);
      expect(crown.x).toBeLessThan(scene.width-8);
      for(const id of ["rooted-crown-direction","rooted-temple-direction",
        "rooted-far-wave","left-cheek-layered-wax",
        "nose-sidewall-wax","coat-wool-broken-rub"]){
        const node=nodes.get(id);
        if(node?.kind!=="contour")throw new Error("No local line: "+id);
        expect(node.clipToParent).toBe(true);
        expect(node.d.length).toBeGreaterThan(100);
      }
      const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
      expect(html).toContain('data-km-crayon-scene="'+scene.id+'"');
      expect(html).toContain('data-km-crayon-element="adult-face"');
      expect(html).toContain('data-km-crayon-element="left-upper-lid"');
      expect(html).toContain('data-km-crayon-underpaint="opaque"');
      expect(html).toContain('data-km-crayon-soft-glaze="');
      expect(html).toContain('data-km-crayon-clipped-to="adult-face"');
      expect(html).not.toContain('data-km-crayon-lettering=');
      expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>)).toBe(html);
    });
  }
  it("keeps unfinished face studies out of public Storybook",()=>{
    expect(faceMeta.tags).toContain("!dev");
    expect(faceMeta.title).toMatch(/^Video production\/Film Looks\/Crayon\//);
    expect(AdultFaceThreeQuarter.args??{}).toEqual({});
    expect(AdultFacePortrait.args?.aspect).toBe("portrait");
  });
  it("rejects invalid detail and animates wax at separate stages",()=>{
    expect(()=>crayonAdultFaceStudy("landscape",{detail:-.1})).toThrow();
    expect(()=>crayonAdultFaceStudy("portrait",{detail:NaN})).toThrow();
    const scene=crayonAdultFaceStudy("landscape",{detail:.7});
    expect(inspectCrayonScene(scene)).toEqual([]);
    const start=renderToStaticMarkup(<CrayonScene spec={scene} frame={3}/>);
    const end=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    expect(start).not.toEqual(end);
    expect(end).toContain('data-km-crayon-anatomical-mask=');
  });
  it("exports actual React renderer SVGs for 1x/3x ArtCraft inspection when explicitly requested",()=>{
    if(process.env.KUMIKI_CRAYON_ARTCRAFT_PROOF!=="1")return;
    const dir="dist/crayon-artcraft-face-proof";
    mkdirSync(dir,{recursive:true});
    for(const aspect of ["landscape","portrait"] as const){
      const scene=crayonAdultFaceStudy(aspect);
      for(const frame of [1,75,160,235,299]){
        const svg=renderToStaticMarkup(<CrayonScene spec={scene} frame={frame}/>);
        writeFileSync(join(dir,"adult-face-"+aspect+"-"+frame+".svg"),svg);
      }
    }
  });
});
