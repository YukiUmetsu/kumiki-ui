import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_V24_SURFACE_IDS,CRAYON_F1_V24_SOURCE_PATCHES,
  crayonF1SourceTonalRelief} from "../src/video/crayon-artcraft-f1-source-nose-relief";
import {Cc0NasalTonalReliefV24} from "../src/video/crayon-artcraft-adult-face.stories";

describe("ArtCraft F1 V24 native nasofacial source values",()=>{
  const changed=new Set<string>(CRAYON_F1_V24_SURFACE_IDS);
  const lookup=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
    s.elements.find(e=>e.id===id);
  it("retains 300-frame figure, V23 negative controls, paper, and unrelated microstrokes",()=>{
    const v23=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    const v24=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
    for(const scene of [v23,v24])
      expect(inspectCrayonScene(scene)).toEqual([]);
    expect(v24.elements).toHaveLength(v23.elements.length);
    for(const key of ["durationFrames","width","height","paper","seed",
      "paperTooth","camera"] as const)expect(v24[key]).toEqual(v23[key]);
    expect(v24.elements.filter(e=>!changed.has(e.id))).toEqual(
      v23.elements.filter(e=>!changed.has(e.id)));
    for(const id of CRAYON_F1_V24_SURFACE_IDS){
      const a=lookup(v23,id),b=lookup(v24,id);
      if(a?.kind!=="wax"||b?.kind!=="wax")throw Error(id);
      expect(b.d).not.toBe(a.d);
      expect(b.parentId).toBe(a.parentId);
      expect(b.clipToParent).toBe(a.clipToParent);
      expect(b.timing).toEqual(a.timing);
      expect(b.coverage).toBe("open");
      expect(b.deposition).toBe("stroke-built");
      expect(b.featherContacts).toBe(true);
      expect(b.nibStyle).toBe("dry");
      expect(b.markLength).toBe("short");
      expect(b.strokeOrder).toBe("patches");
      expect(b.outlineOpacity).toBe(0);
      expect(b.markStrength).toBeGreaterThan(.35);
      expect(b.spacing).toBeGreaterThanOrEqual(4);
    }
    expect(Cc0NasalTonalReliefV24.name).toContain("!dev");
  });
  it("attaches lit source bulb and far dorsal shadow with unequal angles",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
    const bright=lookup(scene,"nose-tip-reflected-light");
    const dark=lookup(scene,"nose-sidewall-form");
    const shaft=lookup(scene,"nose-dorsum");
    if(bright?.kind!=="wax"||dark?.kind!=="wax"||shaft?.kind!=="wax")
      throw Error("Missing source nasal mass");
    expect(bright.bounds.x).toBeLessThan(dark.bounds.x);
    expect(bright.pressure).toBeGreaterThan(dark.pressure??0);
    expect(bright.angle).not.toBe(dark.angle);
    expect(shaft.bounds.y).toBeLessThan(bright.bounds.y);
    expect(CRAYON_F1_V24_SOURCE_PATCHES.noseBulbHigh.rgb[0])
      .toBeGreaterThan(CRAYON_F1_V24_SOURCE_PATCHES.farSidewall.rgb[0]);
    for(const id of ["alar-roof-near","alar-roof-far",
      "naris-shadow-near","naris-shadow-far"]){
      const prev=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
      expect(lookup(scene,id)).toEqual(lookup(prev,id));
    }
  });
  it("fails closed on duplicate, removed or repeated source-value planes",()=>{
    const prev=crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
    expect(()=>crayonF1SourceTonalRelief(prev.elements.filter(e=>
      e.id!=="nose-dorsum"))).toThrow(RangeError);
    const one=lookup(prev,"nose-tip");
    if(!one)throw Error("No nasal tip");
    expect(()=>crayonF1SourceTonalRelief([...prev.elements,one]))
      .toThrow(RangeError);
    expect(()=>crayonF1SourceTonalRelief(next.elements)).toThrow(RangeError);
  });
  it("native SSR dry wax, paper fiber and no new image/filter",()=>{
    const spec=crayonCc0FaceStudy({midfaceForm:"source-nasal-relief"});
    const html=renderToStaticMarkup(<CrayonScene spec={spec} frame={299}/>);
    for(const id of CRAYON_F1_V24_SURFACE_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).not.toContain("<image");
    // The inherited CRAYON1 renderer has its own common material filters.
    // V24 may not add ANY filter relative to the exact original V23 scene;
    // don't incorrectly assert that the unchanged shared renderer has none.
    const previous=renderToStaticMarkup(<CrayonScene
      spec={crayonCc0FaceStudy({midfaceForm:"source-naris-occlusion"})}
      frame={299}/>);
    expect((html.match(/<feGaussianBlur\\b/g)??[]).length)
      .toBe((previous.match(/<feGaussianBlur\\b/g)??[]).length);
  });
});
