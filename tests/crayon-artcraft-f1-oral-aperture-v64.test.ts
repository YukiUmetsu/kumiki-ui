import {describe,expect,it} from "vitest";
import {crayonCc0FaceStudy} from "../src/video/crayon-artcraft-cc0-face";
import type {CrayonElement} from "../registry/video/materials/crayon-scene";
import {
  CRAYON_F1_ORAL_APERTURE_V64_IDS,
  crayonF1RefineOralApertureV64,
} from "../src/video/crayon-artcraft-f1-oral-aperture-v64";

const ids=["mouth-aperture-depth","dental-arch-connected-wax",
  "dental-surface-left","dental-surface-center","dental-surface-far",
  "upper-vermilion-incisor-overhang","lip-upper","labial-upper-value",
  "lip-lower","labial-lower-value","lip-lower-wax-ribs"] as const;
const byId=(elements:readonly CrayonElement[],id:string)=>
  elements.find(element=>element.id===id);
const rgb=(hex:string)=>hex.replace("#","").match(/.{2}/g)!.map(x=>parseInt(x,16));

describe("ArtCraft F1 V64 source-led oral aperture",()=>{
  it("rebuilds a narrow connected enamel band with smaller warm-grey contacts",()=>{
    const v63=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v63",detail:1,
    });
    const next=crayonF1RefineOralApertureV64(v63.elements);
    const found=next.filter(element=>CRAYON_F1_ORAL_APERTURE_V64_IDS.includes(
      element.id as typeof CRAYON_F1_ORAL_APERTURE_V64_IDS[number]));
    expect(found).toHaveLength(ids.length);
    expect(new Set(found.map(element=>element.id)).size).toBe(ids.length);
    const aperture=byId(next,"mouth-aperture-depth");
    expect(aperture?.kind).toBe("wax");
    if(aperture?.kind!=="wax")throw new Error("V64 aperture missing");
    expect(aperture.bounds.width).toBeLessThanOrEqual(118);
    expect(aperture.bounds.height).toBeLessThanOrEqual(34);
    expect(aperture.d).toContain("C");
    for(const id of ["dental-surface-left","dental-surface-center",
      "dental-surface-far"]){
      const tooth=byId(next,id);
      expect(tooth?.kind).toBe("wax");
      if(tooth?.kind!=="wax")throw new Error("V64 enamel missing: "+id);
      expect(tooth.bounds.height).toBeLessThanOrEqual(12);
      expect(tooth.bounds.width/tooth.bounds.height).toBeGreaterThanOrEqual(1.8);
      expect(tooth.colors.every(color=>Math.max(...rgb(color))<=190)).toBe(true);
    }
  });

  it("keeps the incisor overhang clipped and increases lower-vermilion microstructure",()=>{
    const v63=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v63",detail:1,
    });
    const next=crayonF1RefineOralApertureV64(v63.elements);
    const overhang=byId(next,"upper-vermilion-incisor-overhang");
    expect(overhang?.kind).toBe("wax");
    if(overhang?.kind!=="wax")throw new Error("V64 overhang missing");
    expect(overhang.parentId).toBe("mouth-aperture-depth");
    expect(overhang.clipToParent).toBe(true);
    const ribs=byId(next,"lip-lower-wax-ribs");
    expect(ribs?.kind).toBe("contour");
    if(ribs?.kind!=="contour")throw new Error("V64 lip ribs missing");
    expect(ribs.width).toBeGreaterThanOrEqual(.44);
    expect(ribs.opacity).toBeGreaterThanOrEqual(.48);
    expect(ribs.d.match(/M/g)?.length??0).toBeGreaterThanOrEqual(10);
  });

  it("changes only the mouth region and preserves unrelated elements by reference",()=>{
    const v63=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v63",detail:1,
    });
    const next=crayonF1RefineOralApertureV64(v63.elements);
    const nextById=new Map(next.map(element=>[element.id,element]));
    for(const element of v63.elements){
      if((CRAYON_F1_ORAL_APERTURE_V64_IDS as readonly string[]).includes(element.id))
        continue;
      expect(nextById.get(element.id)).toBe(element);
    }
    expect(next).toHaveLength(v63.elements.length);
  });

  it("exposes V64 over V63 without changing geometry outside the mouth",()=>{
    const v63=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v63",detail:1,
    });
    const v64=crayonCc0FaceStudy({
      midfaceForm:"source-anat1-connected-face-v64",detail:1,
    });
    const changed=new Set(CRAYON_F1_ORAL_APERTURE_V64_IDS);
    const base=new Map(v63.elements.map(element=>[element.id,element]));
    for(const element of v64.elements){
      if(changed.has(element.id))expect(element).not.toEqual(base.get(element.id));
      else expect(element).toEqual(base.get(element.id));
    }
  });
});
