import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0NearEyeStudy} from "../src/video/crayon-artcraft-cc0-near-eye";
import faceMeta,{SourceMeasuredCc0Eye,SourceMeasuredCc0EyePortrait}
  from "../src/video/crayon-artcraft-adult-face.stories";
describe("ArtCraft CC0 near-eye source-crop study (not art approval)",()=>{
  for(const aspect of ["landscape","portrait"] as const){
    it("constructs topologically attached ocular pigment without transparency in "+aspect,()=>{
      const spec=crayonCc0NearEyeStudy(aspect);
      expect(inspectCrayonScene(spec)).toEqual([]);
      expect(spec.elements.length).toBeGreaterThan(18);
      expect(new Set(spec.elements.map(x=>x.id)).size).toBe(spec.elements.length);
      const nodes=new Map(spec.elements.map(x=>[x.id,x]));
      for(const part of ["eye-skin","eye-sclera","eye-iris","eye-pupil",
        "upper-lid-overhang","lower-lid-flesh","tear-duct"]){
        const n=nodes.get(part);
        if(n?.kind!=="wax")throw new Error("Missing sourced ocular mass "+part);
        expect(n.coverage).toBe("opaque");
        expect((n.d.match(/[CQ]/g)??[]).length).toBeGreaterThanOrEqual(3);
        expect(n.bounds.width).toBeGreaterThan(0);
      }

      // The root is never a rectangular 210x200 patch visible at 1×.
      const undercoat=nodes.get("eye-skin");
      if(undercoat?.kind!=="wax"||!undercoat.placement)
        throw new Error("Missing photo-crop undercoat");
      expect(undercoat.bounds.x).toBeLessThan(-100);
      expect(undercoat.bounds.width).toBeGreaterThan(440);
      const brow=nodes.get("brow-root");
      expect(brow).toMatchObject({kind:"wax",coverage:"open",
        clipToParent:true,parentId:"eye-skin"});
      const hairs=nodes.get("brow-rooted-fibres");
      if(hairs?.kind!=="contour")throw Error("Missing tangent-led eyebrow hairs");
      expect(hairs.parentId).toBe("brow-root");
      expect(hairs.clipToParent).toBe(true);
      expect((hairs.d.match(/Q/g)??[]).length).toBeGreaterThanOrEqual(91);
      expect(nodes.get("eye-sclera")?.parentId).toBe("eye-skin");
      expect(nodes.get("eye-iris")?.parentId).toBe("eye-sclera");
      expect(nodes.get("eye-pupil")?.parentId).toBe("eye-iris");
      for(const name of ["upper-orbital-turn","eye-socket-umbra",
        "lower-orbital-hollow","upper-sclera-occlusion","lower-lid-groove"]){
        const n=nodes.get(name);
        expect(n).toMatchObject({kind:"wax",coverage:"open",clipToParent:true});
      }
      for(const name of ["upper-lashes","lower-lashes","lid-margin","brow-wax"]){
        const n=nodes.get(name);
        expect(n).toMatchObject({kind:"contour",clipToParent:true});
        if(n?.kind==="contour")expect((n.d.match(/M/g)??[]).length).toBeGreaterThan(1);
      }
      const final=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
      expect(final).toContain('data-km-crayon-underpaint="opaque"');
      expect(final).toContain('data-km-crayon-element="upper-lid-overhang"');
      expect(final).toContain('data-km-crayon-clipped-to="eye-sclera"');
      expect(final).not.toContain('data-km-crayon-lettering=');
    });
  }
  it("does not create a new Storybook folder or approve unverified source art",()=>{
    expect(faceMeta.tags).toContain("!dev");
    expect(faceMeta.title).toBe("Video production/Film Looks/Crayon/ArtCraft Adult Face Lab");
    expect(SourceMeasuredCc0Eye.args?.aspect).toBe("landscape");
    expect(SourceMeasuredCc0EyePortrait.args?.aspect).toBe("portrait");
    expect(()=>crayonCc0NearEyeStudy("portrait",0)).toThrow();
    expect(()=>crayonCc0NearEyeStudy("portrait",1.01)).toThrow();
  });
});
