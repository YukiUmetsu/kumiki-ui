import {describe,expect,it} from "vitest";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import {
  CRAYON_F1_ORAL_APERTURE_V65_IDS,
  crayonF1DeepenOralCavityV65,
} from "../src/video/crayon-artcraft-f1-oral-aperture-v65";
import {crayonF1NativeCaptureWorksheetV60} from "../src/video/crayon-artcraft-f1-candidate-landmarks-v59";

type Wax=Extract<CrayonElement,{kind:"wax"}>;
const v64Elements=()=>crayonCc0FaceStudy({
  midfaceForm:"source-anat1-connected-face-v64",detail:1,
}).elements;
function wax(elements:readonly CrayonElement[],id:string):Wax{
  const matches=elements.filter(element=>element.id===id);
  if(matches.length!==1||matches[0].kind!=="wax")
    throw new Error("Expected one wax anchor: "+id);
  return matches[0];
}
function luminance(value:string):number{
  const hex=value.replace("#","");
  const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}

describe("ArtCraft F1 V65 source-led oral cavity and vermilion",()=>{
  it("deepens the cavity without changing its source-registered aperture or parent",()=>{
    const before=v64Elements();
    const after=crayonF1DeepenOralCavityV65(before);
    const oldMouth=wax(before,"mouth-aperture-depth");
    const mouth=wax(after,"mouth-aperture-depth");
    expect(mouth.d).toBe(oldMouth.d);
    expect(mouth.bounds).toBe(oldMouth.bounds);
    expect(mouth.parentId).toBe(oldMouth.parentId);
    expect(mouth.clipToParent).toBe(oldMouth.clipToParent);
    expect(mouth.coverage).toBe("opaque");
    expect(mouth.deposition).toBe("stroke-built");
    expect(mouth.pressure).toBeGreaterThanOrEqual(.95);
    expect(mouth.opaqueBurnish).toBeGreaterThanOrEqual(.95);
    expect(mouth.underpaintTooth).toBeLessThanOrEqual(.05);
    expect(mouth.blendRadius).toBeGreaterThan(0);
    expect(mouth.featherContacts).toBe(true);
    expect(mouth.underpaintGradient).toBeDefined();
    const gradient=mouth.underpaintGradient!;
    expect(luminance(String(gradient.light)))
      .toBeLessThan(luminance(String(gradient.shadow)));
  });

  it("narrows the connected enamel underlayer while retaining its parent clipping",()=>{
    const before=v64Elements();
    const after=crayonF1DeepenOralCavityV65(before);
    const oldArch=wax(before,"dental-arch-connected-wax");
    const arch=wax(after,"dental-arch-connected-wax");
    expect(arch.bounds.height).toBeLessThanOrEqual(15);
    expect(arch.d).not.toBe(oldArch.d);
    expect(arch.parentId).toBe(oldArch.parentId);
    expect(arch.clipToParent).toBe(oldArch.clipToParent);
    for(const id of ["dental-surface-left","dental-surface-center","dental-surface-far"])
      expect(wax(after,id).d).toBe(wax(before,id).d);
  });

  it("changes only named oral nodes and preserves every non-mouth element by identity",()=>{
    const before=v64Elements();
    const after=crayonF1DeepenOralCavityV65(before);
    expect(after).toHaveLength(before.length);
    const changed=before.filter((element,index)=>after[index]!==element)
      .map(element=>element.id).sort();
    expect(changed).toEqual([...CRAYON_F1_ORAL_APERTURE_V65_IDS].sort());
    for(let i=0;i<before.length;i++)
      if(!CRAYON_F1_ORAL_APERTURE_V65_IDS.includes(
        before[i].id as typeof CRAYON_F1_ORAL_APERTURE_V65_IDS[number]))
        expect(after[i]).toBe(before[i]);
  });

  it("fails closed for missing or duplicate oral anchors",()=>{
    const before=v64Elements();
    expect(()=>crayonF1DeepenOralCavityV65(
      before.filter(element=>element.id!=="mouth-aperture-depth"),
    )).toThrow(RangeError);
    expect(()=>crayonF1DeepenOralCavityV65([
      ...before,before.find(element=>element.id==="mouth-aperture-depth")!,
    ])).toThrow(RangeError);
  });

  it("keeps the V65 native capture separate and explicitly unapproved",()=>{
    const record=crayonF1NativeCaptureWorksheetV60({
      variant:"source-anat1-connected-face-v65",
      nativePngSha256:"a".repeat(64),
      checkoutCommitSha:"b".repeat(40),
      pngFileName:"v65-native-V65-299.png",
    });
    expect(record.native.variant).toBe("source-anat1-connected-face-v65");
    expect(record.audit.status).toBe("INCOMPLETE");
    expect(record.audit.measured).toBe(0);
    expect(record.releaseApproved).toBe(false);
  });
});
