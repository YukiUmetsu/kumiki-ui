import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {CRAYON_F1_NASAL_VALUE_IDS,crayonF1ReconstructNasalValue}
  from "../src/video/crayon-artcraft-f1-photometric-nose";
import {Cc0NasalValue} from "../src/video/crayon-artcraft-adult-face.stories";
const changed=new Set<string>(CRAYON_F1_NASAL_VALUE_IDS);
describe("V22 CC0 contiguous nasal underplane wax (experimental)",()=>{
  const lookup=(s:ReturnType<typeof crayonCc0FaceStudy>,id:string)=>
    s.elements.find(e=>e.id===id);
  it("preserves negative controls, all other shapes, film, paper and source landmarks",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    expect(inspectCrayonScene(old)).toEqual([]);
    expect(inspectCrayonScene(next)).toEqual([]);
    expect(next.elements).toHaveLength(old.elements.length);
    for(const k of ["width","height","seed","durationFrames","paper","paperTooth",
      "camera"] as const)expect(next[k]).toEqual(old[k]);
    expect(next.elements.filter(e=>!changed.has(e.id))).toEqual(
      old.elements.filter(e=>!changed.has(e.id)));
    for(const id of CRAYON_F1_NASAL_VALUE_IDS){
      const a=lookup(old,id),b=lookup(next,id);
      if(a?.kind!=="wax"||b?.kind!=="wax")throw Error(id);
      expect(b.d).not.toBe(a.d);
      expect(b.timing).toEqual(a.timing);
      expect(b.parentId).toEqual(a.parentId);
      expect(b.clipToParent).toEqual(a.clipToParent);
      expect(b.coverage).toBe("open");
      expect(b.deposition).toBe("stroke-built");
      expect(b.markLength).toBe("short");
      expect(b.spacing).toBeGreaterThanOrEqual(4);
      expect(b.markStrength).toBeGreaterThan(.3);
      expect(b.featherContacts).toBe(true);
      expect(b.outlineOpacity).toBe(0);
    }
    expect(Cc0NasalValue.name).toContain("!dev");
  });
  it("retains both authentic asymmetric near/far native negative-space rims",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    for(const side of ["near","far"]){
      for(const prefix of ["naris-shadow-","alar-roof-"])
        expect(lookup(next,prefix+side)).toEqual(lookup(old,prefix+side));
    }
    const under=lookup(next,"nose-subalar-contact");
    const near=lookup(next,"nose-alar-near");
    const far=lookup(next,"nose-alar-far");
    const wall=lookup(next,"nose-sidewall");
    if(under?.kind!=="wax"||near?.kind!=="wax"||
       far?.kind!=="wax"||wall?.kind!=="wax")throw Error("Missing source wax");
    expect(under.bounds.x).toBeGreaterThan(375);
    expect(under.bounds.width).toBeLessThan(85);
    expect(under.bounds.y).toBeGreaterThan(620);
    expect(wall.bounds.height).toBeLessThan(90);
    expect(near.bounds.width).toBeGreaterThan(far.bounds.width);
    expect(near.angle).not.toBe(far.angle);
  });
  it("fails closed on absent, duplicate and already-valued anatomy",()=>{
    const old=crayonCc0FaceStudy({midfaceForm:"source-nasal-volume"});
    const next=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    expect(()=>crayonF1ReconstructNasalValue(old.elements.filter(e=>
      e.id!=="nose-sidewall"))).toThrow(RangeError);
    const a=lookup(old,"nose-sidewall");
    if(!a)throw Error("No sidewall");
    expect(()=>crayonF1ReconstructNasalValue([...old.elements,a]))
      .toThrow(RangeError);
    expect(()=>crayonF1ReconstructNasalValue(next.elements))
      .toThrow(RangeError);
  });
  it("SSR paints original dry-wax pigments, never a photo/filter",()=>{
    const scene=crayonCc0FaceStudy({midfaceForm:"source-nasal-value"});
    const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={299}/>);
    for(const id of CRAYON_F1_NASAL_VALUE_IDS)
      expect(html).toContain('data-km-crayon-element="'+id+'"');
    expect(html).not.toContain("<image");
    expect(html).toContain('data-km-crayon-feather-contacts="open-wax"');
    expect(html).toContain('data-km-crayon-paper-contact-wax');
  });
});
