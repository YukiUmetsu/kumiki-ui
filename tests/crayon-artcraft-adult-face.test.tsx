import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
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
        "nose-sidewall","nose-alar-wing","lip-upper-volume","lip-lower-volume",
        "left-eye-aperture","right-eye-aperture","left-upper-lid","right-upper-lid"]){
        const node=nodes.get(id);
        if(node?.kind!=="wax")throw new Error("No semantic wax: "+id);
        expect(node.coverage).toBe("opaque");
        expect((node.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(2);
      }
      const face=nodes.get("adult-face");
      if(face?.kind!=="wax")throw new Error("No adult cranium");
      expect(face.bounds.height/face.bounds.width).toBeGreaterThan(1.45);
      const bg=nodes.get("paper-value");
      expect(bg?.kind==="wax"&&bg.coverage).toBe("open");
      expect(nodes.get("hair-back")?.parentId).toBe("adult-face");
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
});
