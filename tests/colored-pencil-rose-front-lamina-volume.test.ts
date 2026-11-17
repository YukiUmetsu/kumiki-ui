import {describe,expect,it} from "vitest";
import {ROSE_FRONT_LAMINA_VOLUME,inspectRoseFrontLaminaVolume}
  from "../src/video/colored-pencil-rose-front-lamina-volume";
import {ROSE_PHYSICAL_FOLDS} from "../src/video/colored-pencil-rose-physical-folds";
import {ROSE_PETAL_RIM_SIDEWALLS} from "../src/video/colored-pencil-rose-rim-thickness";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",volume=false,complete=false,seed=197)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    rosePhysicalFolds:true,roseFrontLaminaVolumeStudy:volume,
    roseFrontValueStudy:complete,rosePetalRimStudy:complete,
    roseBackCupReliefStudy:complete,roseInnerWhorlStudy:complete,
    roseMiddleCupStudy:complete,roseCalyxStudy:complete,rosePinnateStudy:complete,
    roseLaminaStudy:complete,roseLipStudy:complete,
  });

describe("CP-F1 / FLORA1 frontal lamina rounded physical silhouettes",()=>{
  it("authors two nonmirrored original bounded faces with untouched physical rim hinges",()=>{
    expect(inspectRoseFrontLaminaVolume()).toEqual([]);
    expect(ROSE_FRONT_LAMINA_VOLUME).toHaveLength(2);
    expect(ROSE_FRONT_LAMINA_VOLUME.map(x=>x.id))
      .toEqual(["petal-front-left","petal-front-right"]);
    for(const face of ROSE_FRONT_LAMINA_VOLUME){
      const old=ROSE_PHYSICAL_FOLDS.find(x=>x.id===face.id)!;
      const rim=ROSE_PETAL_RIM_SIDEWALLS.find(x=>x.faceId===face.id)!;
      expect(face.hinge).toBe(old.hinge);
      expect(face.hinge).toBe(rim.hinge);
      expect(face.face.startsWith(face.hinge)).toBe(true);
      expect(face.face).not.toBe(old.face);
      expect(face.contacts).toHaveLength(4);
      expect(new Set(face.contacts.map(x=>x.id)).size).toBe(4);
      expect(face.contacts.every(x=>x.startFrame+x.durationFrames<=335)).toBe(true);
      expect(face.bounds[2]*face.bounds[3]).toBeGreaterThan(12000);
    }
  });

  it.each(["landscape","portrait"] as const)(
    "changes only two parent facing laminae, not original organ, material, seed or sidewall in %s",aspect=>{
      const baseline=draw(aspect);
      const revised=draw(aspect,true);
      expect(baseline.regions).toHaveLength(16);
      expect(revised.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(revised)).toEqual([]);
      for(const original of baseline.regions){
        const next=revised.regions.find(x=>x.id===original.id);
        expect(next).toBeDefined();
        const face=ROSE_FRONT_LAMINA_VOLUME.find(x=>x.id===original.id);
        if(!face){expect(next).toEqual(original);continue;}
        expect(next!.path).toBe(face.face);
        expect(next!.bounds).toEqual(face.bounds);
        expect(next!.details?.slice(0,original.details?.length??0))
          .toEqual(original.details??[]);
        expect(next!.details?.slice(original.details?.length??0))
          .toEqual(face.contacts);
        expect(next!.opaqueSupport).toBe(true);
        expect(next!.layers).toEqual(original.layers);
        expect(next!.craft).toEqual(original.craft);
      }
    });

  it("composes new broad faces, optical values, turned undersides and both opaque cuticle sidewalls",()=>{
    const previous=draw("landscape",false,true);
    const newLook=draw("landscape",true,true);
    expect(previous.regions).toHaveLength(44);
    expect(newLook.regions).toHaveLength(44);
    expect(inspectPencilFoundationDrawing(newLook)).toEqual([]);
    for(const old of previous.regions){
      const candidate=newLook.regions.find(x=>x.id===old.id)!;
      if(ROSE_FRONT_LAMINA_VOLUME.some(x=>x.id===old.id)){
        expect(candidate.interiorDetails).toEqual(old.interiorDetails);
        expect(candidate.layers).toEqual(old.layers);
        expect(candidate.craft).toEqual(old.craft);
      }else expect(candidate).toEqual(old);
    }
    for(const side of ROSE_PETAL_RIM_SIDEWALLS){
      const newRim=newLook.regions.find(x=>x.id===side.id)!;
      const oldRim=previous.regions.find(x=>x.id===side.id)!;
      expect(newRim).toEqual(oldRim);
      expect(newRim.opaqueSupport).toBe(true);
    }
  });
  it("fails closed on detached front faces, wrong flags or non-rose subjects",()=>{
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseFrontLaminaVolumeStudy:true,
    })).toThrow(/physical fold/);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseFrontLaminaVolumeStudy:1 as never,
    })).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const base={subject,aspect:"landscape" as const};
      expect(pencilObjectStudyDrawing({...base,roseFrontLaminaVolumeStudy:true}))
        .toEqual(pencilObjectStudyDrawing(base));
    }
    for(const seed of [0,197,2147483000])
      expect(draw("portrait",true,true,seed)).toEqual(draw("portrait",true,true,seed));
  });
});
