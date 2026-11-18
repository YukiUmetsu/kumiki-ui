import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";

import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_NARIS_ANAT1,CRAYON_F1_V23_RIMS,
  CRAYON_F1_V23_IDS,crayonF1NarisSourceOcclusion}
  from "../src/video/crayon-artcraft-f1-naris-occlusion";
import {Cc0NarisOcclusionV23} from "../src/video/crayon-artcraft-adult-face.stories";
describe("F1 V23 source-joined 3/4 nostril undercuts",()=>{
  const ids=new Set<string>(CRAYON_F1_V23_IDS);
  const find=(scene:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
    scene.elements.find(x=>x.id===id);
  it("cross-references named ANAT1 structure, not a generic oval nose",()=>{
    expect(CRAYON_F1_NARIS_ANAT1).toEqual({
      root:"sellion",tip:"pronasale",septum:"subnasale",
      nearAla:"alare.R",farAla:"alare.L",
    });
    expect(new Set(Object.values(CRAYON_F1_NARIS_ANAT1)).size).toBe(5);
  });
  it("preserves V22 negatives, every unrelated wax, paper and 300-frame timing",()=>{
    const a=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    const b=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    expect(inspectCrayonScene(a)).toEqual([]);
    expect(inspectCrayonScene(b)).toEqual([]);
    expect(b.elements).toHaveLength(a.elements.length);
    for(const key of ["durationFrames","seed","camera","paper","paperTooth",
      "width","height"] as const)expect(b[key]).toEqual(a[key]);
    expect(b.elements.filter(x=>!ids.has(x.id))).toEqual(
      a.elements.filter(x=>!ids.has(x.id)));
    for(const id of CRAYON_F1_V23_IDS){
      const old=find(a,id),next=find(b,id);
      if(old?.kind!=="wax"||next?.kind!=="wax")throw Error(id);
      expect(next.d).not.toBe(old.d);
      expect(next.timing).toEqual(old.timing);
      expect(next.parentId).toBe(old.parentId);
      expect(next.clipToParent).toBe(old.clipToParent);
      expect(next.deposition).toBe("stroke-built");
      expect(next.outlineOpacity).toBe(0);
    }
    expect(Cc0NarisOcclusionV23.name).toContain("!dev");
  });
  it("connects each asymmetric dark cavity to its exact reversed skin rim",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    for(const side of ["near","far"] as const){
      const dark=find(scene,"naris-shadow-"+side);
      const skin=find(scene,"alar-roof-"+side);
      if(dark?.kind!=="wax"||skin?.kind!=="wax")throw Error(side);
      expect(dark.d.startsWith(CRAYON_F1_V23_RIMS[side].forward)).toBe(true);
      expect(skin.d).toContain(CRAYON_F1_V23_RIMS[side].reverse);
      expect(skin.featherContacts).toBe(true);
      expect(skin.coverage).toBe("open");
      expect(dark.coverage).toBe("opaque");
      expect(dark.opaqueBurnish).toBeLessThan(.7);
      expect(scene.elements.findIndex(x=>x.id===dark.id)).toBeLessThan(
        scene.elements.findIndex(x=>x.id===skin.id));
    }
    const n=find(scene,"naris-shadow-near"),f=find(scene,"naris-shadow-far");
    if(n?.kind!=="wax"||f?.kind!=="wax")throw Error("Missing wings");
    expect(n.bounds.width).toBeGreaterThan(f.bounds.width);
    expect(n.d).not.toBe(f.d);
  });
  it("fails closed on missing, doubled or repeated source geometry",()=>{
    const before=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    const after=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    expect(()=>crayonF1NarisSourceOcclusion(before.elements.filter(
      x=>x.id!=="naris-shadow-near"))).toThrow(RangeError);
    const near=find(before,"naris-shadow-near");
    if(!near)throw Error("Missing near");
    expect(()=>crayonF1NarisSourceOcclusion([...before.elements,near]))
      .toThrow(RangeError);
    expect(()=>crayonF1NarisSourceOcclusion(after.elements))
      .toThrow(RangeError);
  });
  it("draws native CRAYON1 paper-contact wax, never a photo overlay",()=>{
    const study=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    const html=renderToStaticMarkup(<CrayonScene spec={study} frame={299}/>);
    for(const id of CRAYON_F1_V23_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).not.toContain("<image");
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
  });
});
