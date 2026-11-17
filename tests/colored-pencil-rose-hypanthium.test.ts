import {describe,it,expect} from "vitest";
import {
  ROSE_HYPANTHIUM_ATTACHMENT,inspectRoseHypanthiumAttachment,
} from "../src/video/colored-pencil-rose-hypanthium";
import {ROSE_CALYX_ORGANS,ROSE_CALYX_SEPAL_IDS}
  from "../src/video/colored-pencil-rose-calyx";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",study=false,all=false,seed=373)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,rosePhysicalFolds:true,
    roseCalyxStudy:true,roseHypanthiumAttachmentStudy:study,
    roseOuterRippleStudy:all,roseOuterFormStudy:all,roseFrontLaminaVolumeStudy:all,
    roseFrontValueStudy:all,rosePetalRimStudy:all,roseBackCupReliefStudy:all,
    roseInnerWhorlStudy:all,roseCenterKnotStudy:all,
    roseCenterValueStudy:all,roseContactShadowStudy:all,
    roseMiddleCupStudy:all,rosePinnateStudy:all,
    roseLaminaStudy:all,roseLipStudy:all,
  });

describe("CP-F1 / FLORA1 continuous Rosa hypanthium, sepal and corolla root",()=>{
  it("has an asymmetrical joined corolla-supporting source face, not a second floating sticker",()=>{
    expect(inspectRoseHypanthiumAttachment()).toEqual([]);
    const original=ROSE_CALYX_ORGANS.find(o=>o.id==="calyx-receptacle")!;
    const newShape=ROSE_HYPANTHIUM_ATTACHMENT;
    expect(newShape.id).toBe("calyx-receptacle");
    expect(newShape.path).toContain(newShape.originalFloralAxis);
    expect(original.path).toContain(newShape.originalFloralAxis);
    expect(newShape.path).not.toBe(original.path);
    expect(newShape.bounds[0]).toBeLessThan(original.bounds[0]);
    expect(newShape.bounds[1]).toBeLessThan(original.bounds[1]);
    expect(newShape.bounds[2]).toBeGreaterThan(original.bounds[2]);
    expect(newShape.bounds[3]).toBeGreaterThan(original.bounds[3]);
    expect(newShape.details).toHaveLength(5);
    expect(new Set(newShape.details.map(x=>x.id)).size).toBe(5);
    expect(newShape.details.every(x=>x.id?.startsWith("rhyp-"))).toBe(true);
    expect(newShape.details.every(x=>x.startFrame+x.durationFrames<=335)).toBe(true);
    expect(ROSE_CALYX_SEPAL_IDS).toHaveLength(5);
  });

  it.each(["landscape","portrait"] as const)(
    "replaces exactly ONE existing physical receptacle and preserves five rooted sepals in %s",aspect=>{
      const previous=draw(aspect),changed=draw(aspect,true);
      expect(previous.regions).toHaveLength(21);
      expect(changed.regions).toHaveLength(21);
      expect(changed.regions.map(x=>x.id)).toEqual(previous.regions.map(x=>x.id));
      expect(inspectPencilFoundationDrawing(changed)).toEqual([]);
      for(const older of previous.regions){
        const newer=changed.regions.find(r=>r.id===older.id)!;
        if(older.id!=="calyx-receptacle"){
          expect(newer).toEqual(older);
          continue;
        }
        expect(newer.path).toBe(ROSE_HYPANTHIUM_ATTACHMENT.path);
        expect(newer.bounds).toEqual(ROSE_HYPANTHIUM_ATTACHMENT.bounds);
        expect(newer.details).toEqual(
          [...(older.details??[]),...ROSE_HYPANTHIUM_ATTACHMENT.details]);
        expect(newer.contour.path).toBe(newer.path);
        expect(newer.layers).toEqual(older.layers);
        expect(newer.opaqueSupport).toBe(true);
        expect(newer.craft).toEqual(older.craft);
      }
      for(const id of ROSE_CALYX_SEPAL_IDS){
        expect(changed.regions.find(x=>x.id===id)).toEqual(
          previous.regions.find(x=>x.id===id));
      }
    });

  it("coexists with 45 physical source parts, all contour relief and 10 optical-value recipient surfaces",()=>{
    const before=draw("landscape",false,true);
    const after=draw("landscape",true,true);
    expect(before.regions).toHaveLength(45);
    expect(after.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const region of before.regions){
      const next=after.regions.find(r=>r.id===region.id)!;
      if(region.id!=="calyx-receptacle")expect(next).toEqual(region);
      else{
        expect(next.layers).toEqual(region.layers);
        expect(next.path).toBe(ROSE_HYPANTHIUM_ATTACHMENT.path);
        expect(next.details).toEqual(
          [...(region.details??[]),...ROSE_HYPANTHIUM_ATTACHMENT.details]);
      }
    }
    expect(after.regions.filter(r=>r.interiorDetails?.length)).toHaveLength(10);
    expect(after.regions.find(r=>r.id==="stem")).toEqual(
      before.regions.find(r=>r.id==="stem"));
  });

  it("requires physically attached calyx and petals and leaves default subjects/pigments intact",()=>{
    const plain=pencilObjectStudyDrawing({subject:"rose",aspect:"landscape"});
    expect(plain.regions).toHaveLength(11);
    for(const missing of [
      {rosePhysicalFolds:true},
      {roseCalyxStudy:true},
      {},
    ]){
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",...missing,
        roseHypanthiumAttachmentStudy:true,
      })).toThrow(/calyx organs and folded front petals/);
    }
    for(const invalid of ["true",1,null,{}])
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",
        roseHypanthiumAttachmentStudy:invalid as never,
      })).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"portrait" as const,seed:373};
      expect(pencilObjectStudyDrawing({
        ...options,roseHypanthiumAttachmentStudy:true,
      })).toEqual(pencilObjectStudyDrawing(options));
    }
    for(const seed of [0,373,2147483000]){
      expect(draw("landscape",true,true,seed)).toEqual(
        draw("landscape",true,true,seed));
      expect(draw("portrait",true,false,seed)).toEqual(
        draw("portrait",true,false,seed));
    }
  });
});
