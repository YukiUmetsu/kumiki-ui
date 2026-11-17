import {describe,expect,it} from "vitest";
import {ROSE_PROXIMAL_HEELS,inspectRoseProximalHeels}
  from "../src/video/colored-pencil-rose-proximal-heels";
import {ROSE_FRONT_LAMINA_VOLUME}
  from "../src/video/colored-pencil-rose-front-lamina-volume";
import {ROSE_PHYSICAL_FOLDS}
  from "../src/video/colored-pencil-rose-physical-folds";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",heels=false,complete=false,seed=373)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    rosePhysicalFolds:true,roseFrontLaminaVolumeStudy:true,
    roseCalyxStudy:true,roseHypanthiumAttachmentStudy:true,
    roseProximalHeelStudy:heels,
    roseOuterRippleStudy:complete,roseOuterFormStudy:complete,
    roseFrontValueStudy:complete,rosePetalRimStudy:complete,
    roseBackCupReliefStudy:complete,roseInnerWhorlStudy:complete,
    roseCenterKnotStudy:complete,roseCenterValueStudy:complete,
    roseContactShadowStudy:complete,roseMiddleCupStudy:complete,
    rosePinnateStudy:complete,roseLaminaStudy:complete,
    roseLipStudy:complete,
  });

describe("CP-F1 / FLORA1 continuous proximal rose heels",()=>{
  it("sculpts two complete independently curved facing petals with preserved underturn hinges",()=>{
    expect(inspectRoseProximalHeels()).toEqual([]);
    expect(ROSE_PROXIMAL_HEELS.map(h=>h.id)).toEqual(
      ["petal-front-left","petal-front-right"]);
    for(const h of ROSE_PROXIMAL_HEELS){
      const source=ROSE_FRONT_LAMINA_VOLUME.find(v=>v.id===h.id)!;
      const underside=ROSE_PHYSICAL_FOLDS.find(v=>v.id===h.id)!;
      expect(h.hinge).toEqual(source.hinge);
      expect(h.hinge).toEqual(underside.hinge);
      expect(h.face.startsWith(h.hinge)).toBe(true);
      expect(h.face).not.toBe(source.face);
      expect(h.contacts).toHaveLength(3);
      expect(new Set(h.contacts.map(x=>x.id)).size).toBe(3);
      expect(h.contacts.every(x=>x.startFrame+x.durationFrames<=335)).toBe(true);
      expect(h.bounds[3]).toBeGreaterThan(source.bounds[3]);
    }
  });

  it.each(["landscape","portrait"] as const)(
    "replaces exactly two existing opaque laminae and nothing else in %s",aspect=>{
      const original=draw(aspect),next=draw(aspect,true);
      expect(original.regions).toHaveLength(21);
      expect(next.regions).toHaveLength(21);
      expect(next.regions.map(x=>x.id)).toEqual(original.regions.map(x=>x.id));
      expect(inspectPencilFoundationDrawing(next)).toEqual([]);
      for(const old of original.regions){
        const changed=next.regions.find(x=>x.id===old.id)!;
        const heel=ROSE_PROXIMAL_HEELS.find(x=>x.id===old.id);
        if(!heel){expect(changed).toEqual(old);continue;}
        expect(changed.path).toBe(heel.face);
        expect(changed.bounds).toEqual(heel.bounds);
        expect(changed.details).toEqual([...(old.details??[]),...heel.contacts]);
        expect(changed.layers).toEqual(old.layers);
        expect(changed.craft).toEqual(old.craft);
        expect(changed.opaqueSupport).toBe(true);
      }
    });

  it("coexists with all45 original paint regions and source-rooted calyx without modifying other organs",()=>{
    const baseline=draw("landscape",false,true);
    const revised=draw("landscape",true,true);
    expect(baseline.regions).toHaveLength(45);
    expect(revised.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(revised)).toEqual([]);
    for(const old of baseline.regions){
      const next=revised.regions.find(x=>x.id===old.id)!;
      const heel=ROSE_PROXIMAL_HEELS.find(x=>x.id===old.id);
      if(!heel){expect(next).toEqual(old);continue;}
      expect(next.path).toEqual(heel.face);
      expect(next.layers).toEqual(old.layers);
      expect(next.interiorDetails).toEqual(old.interiorDetails);
    }
    expect(revised.regions.find(x=>x.id==="calyx-receptacle"))
      .toEqual(baseline.regions.find(x=>x.id==="calyx-receptacle"));
  });

  it("requires original physical underside, rounded front, calyx, and continuous hypanthium",()=>{
    for(const missing of [
      {rosePhysicalFolds:false},{roseFrontLaminaVolumeStudy:false},
      {roseCalyxStudy:false},{roseHypanthiumAttachmentStudy:false},
    ]){
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",rosePhysicalFolds:true,
        roseFrontLaminaVolumeStudy:true,roseCalyxStudy:true,
        roseHypanthiumAttachmentStudy:true,roseProximalHeelStudy:true,
        ...missing,
      })).toThrow(/Rose proximal heels need/);
    }
    for(const bad of [1,null,"yes",{}])
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"portrait",
        roseProximalHeelStudy:bad as never,
      })).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"portrait" as const,seed:373};
      expect(pencilObjectStudyDrawing({...options,roseProximalHeelStudy:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    for(const seed of [0,373,2147483000])
      expect(draw("portrait",true,true,seed)).toEqual(draw("portrait",true,true,seed));
  });
});
