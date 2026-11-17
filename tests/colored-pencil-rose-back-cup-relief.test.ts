import {describe,expect,it} from "vitest";
import {ROSE_BACK_CUP_RELIEF,roseBackCupFaceDetails,
  roseBackCupUndersideDetails,inspectRoseBackCupRelief}
  from "../src/video/colored-pencil-rose-back-cup-relief";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const drawing=(aspect:"landscape"|"portrait",crown=false,full=false,seed=371)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,rosePhysicalFolds:true,
    roseBackCupReliefStudy:crown,roseFrontValueStudy:full,
    roseCalyxStudy:full,rosePinnateStudy:full,
    roseLaminaStudy:full,roseLipStudy:full,
    roseInnerWhorlStudy:full,roseMiddleCupStudy:full,
  });

describe("CP-F1 / FLORA1 source-native rear rose cup physical relief",()=>{
  it("authored irregular nonzero-area front, underside and shared hinge carry distinct contacts",()=>{
    expect(inspectRoseBackCupRelief()).toEqual([]);
    const r=ROSE_BACK_CUP_RELIEF;
    expect(r.face).toMatch(/^M.+ Z$/);
    expect(r.underside).toMatch(/^M.+ Z$/);
    expect(r.face.startsWith(r.hinge)).toBe(true);
    expect(r.face).not.toBe(r.underside);
    expect(r.face.split("C").length).toBeGreaterThanOrEqual(10);
    expect(r.underside.split("C").length).toBeGreaterThanOrEqual(10);
    expect(r.undersideBounds[2]*r.undersideBounds[3]).toBeGreaterThan(10000);
    expect(roseBackCupUndersideDetails()).toHaveLength(5);
    expect(roseBackCupFaceDetails()).toHaveLength(5);
    const details=[...roseBackCupUndersideDetails(),...roseBackCupFaceDetails()];
    expect(new Set(details.map(d=>d.id)).size).toBe(10);
    expect(details.every(d=>d.startFrame>=160&&d.startFrame<=280)).toBe(true);
    expect(details.every(d=>d.path.startsWith("M")&&d.color.startsWith("#"))).toBe(true);
  });
  it.each(["landscape","portrait"] as const)(
    "replaces only the source rear cup/underturn while retaining all other seeded art in %s",aspect=>{
      const original=drawing(aspect);
      const alternate=drawing(aspect,true);
      expect(original.regions).toHaveLength(16);
      expect(alternate.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(alternate)).toEqual([]);
      for(const initial of original.regions){
        const revised=alternate.regions.find(x=>x.id===initial.id);
        expect(revised).toBeDefined();
        if(initial.id==="back-cup"){
          expect(revised!.path).toBe(ROSE_BACK_CUP_RELIEF.face);
          expect(revised!.bounds).toEqual(ROSE_BACK_CUP_RELIEF.faceBounds);
          expect(revised!.details?.slice(0,initial.details?.length??0))
            .toEqual(initial.details??[]);
          expect(revised!.details?.slice(initial.details?.length??0))
            .toEqual(roseBackCupFaceDetails());
          expect(revised!.layers.map(l=>l.seed)).toEqual(initial.layers.map(l=>l.seed));
        }else if(initial.id==="rose-turn-back-cup"){
          expect(revised!.path).toBe(ROSE_BACK_CUP_RELIEF.underside);
          expect(revised!.details).toEqual(roseBackCupUndersideDetails());
          expect(revised!.layers.map(l=>l.seed)).toEqual(initial.layers.map(l=>l.seed));
          expect(revised!.opaqueSupport).toBe(true);
        }else expect(revised).toEqual(initial);
      }
      const names=alternate.regions.map(x=>x.id);
      expect(names.indexOf("rose-turn-back-cup")).toBe(names.indexOf("back-cup")-1);
    });
  it("all 42 floral organ combinations remain byte-identical except physical back cup",()=>{
    const original=drawing("landscape",false,true);
    const revised=drawing("landscape",true,true);
    expect(original.regions).toHaveLength(42);
    expect(revised.regions).toHaveLength(42);
    expect(inspectPencilFoundationDrawing(revised)).toEqual([]);
    for(const part of original.regions)
      if(part.id!=="back-cup"&&part.id!=="rose-turn-back-cup")
        expect(revised.regions.find(x=>x.id===part.id)).toEqual(part);
    const front=revised.regions.find(x=>x.id==="back-cup")!;
    const old=original.regions.find(x=>x.id==="back-cup")!;
    expect(front.interiorDetails).toEqual(old.interiorDetails);
    expect(front.details?.slice(0,old.details?.length??0))
      .not.toEqual(old.details); // existing face traces are followed by new relief contacts
  });
  it("composes independently with the two genuine frontal cuticle sidewalls",()=>{
    const common={
      subject:"rose" as const,aspect:"portrait" as const,seed:371,
      rosePhysicalFolds:true,rosePetalRimStudy:true,
      roseCalyxStudy:true,rosePinnateStudy:true,
      roseInnerWhorlStudy:true,roseMiddleCupStudy:true,
      roseFrontValueStudy:true,
    };
    const before=pencilObjectStudyDrawing(common);
    const after=pencilObjectStudyDrawing({...common,roseBackCupReliefStudy:true});
    expect(before.regions).toHaveLength(44);
    expect(after.regions).toHaveLength(44);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const id of ["rose-rim-front-left","rose-rim-front-right"])
      expect(after.regions.find(r=>r.id===id))
        .toEqual(before.regions.find(r=>r.id===id));
  });
  it("remains OFF for old drawings/other subjects; refuses detached geometry or wrong flags",()=>{
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseBackCupReliefStudy:true,
    })).toThrow(/physical fold/);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseBackCupReliefStudy:1 as never,
    })).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const base={subject,aspect:"portrait" as const};
      expect(pencilObjectStudyDrawing({...base,roseBackCupReliefStudy:true}))
        .toEqual(pencilObjectStudyDrawing(base));
    }
    for(const seed of [0,371,2147483000])
      expect(drawing("portrait",true,true,seed)).toEqual(drawing("portrait",true,true,seed));
  });
});
