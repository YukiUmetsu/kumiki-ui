import {describe,expect,it} from "vitest";
import {
  ROSE_CENTER_KNOT_SURFACES,ROSE_CENTER_SCROLL_BACKFACE,
  inspectRoseCenterKnot,
} from "../src/video/colored-pencil-rose-center-knot";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",knot=false,complete=false,seed=371)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,roseInnerWhorlStudy:true,roseCenterKnotStudy:knot,
    rosePhysicalFolds:complete,roseFrontLaminaVolumeStudy:complete,roseFrontValueStudy:complete,
    rosePetalRimStudy:complete,roseBackCupReliefStudy:complete,
    roseCalyxStudy:complete,rosePinnateStudy:complete,roseLaminaStudy:complete,
    roseLipStudy:complete,roseMiddleCupStudy:complete,
  });
const remodeled=new Set<string>(ROSE_CENTER_KNOT_SURFACES.map(s=>s.id));

describe("CP-F1 FLORA1 six-source rose centre and real curled underturn",()=>{
  it("locates six distinct nonmirrored original center lamina silhouettes and a shared physical scroll cuticle hinge",()=>{
    expect(inspectRoseCenterKnot()).toEqual([]);
    expect(ROSE_CENTER_KNOT_SURFACES.map(x=>x.id)).toEqual([
      "inner-fold","rose-whorl-recess","rose-whorl-left",
      "rose-whorl-right","heart","rose-whorl-scroll",
    ]);
    expect(new Set(ROSE_CENTER_KNOT_SURFACES.map(x=>x.path)).size).toBe(6);
    const centres=ROSE_CENTER_KNOT_SURFACES.map(x=>[
      x.bounds[0]+x.bounds[2]/2,x.bounds[1]+x.bounds[3]/2,
    ].join(","));
    expect(new Set(centres).size).toBe(6);
    expect(ROSE_CENTER_KNOT_SURFACES.find(x=>x.id==="inner-fold")?.replacementBaseDetails)
      .toHaveLength(2);
    expect(ROSE_CENTER_KNOT_SURFACES.find(x=>x.id==="heart")?.replacementBaseDetails)
      .toHaveLength(2);
    for(const s of ROSE_CENTER_KNOT_SURFACES){
      expect(s.path).toMatch(/^M.+ Z$/);
      expect(s.path.split("C").length).toBeGreaterThanOrEqual(3);
      expect(s.bounds[2]*s.bounds[3]).toBeGreaterThan(900);
      expect(s.dryContours).toHaveLength(4);
      expect(new Set(s.dryContours.map(t=>t.id)).size).toBe(4);
      expect(s.dryContours.every(t=>t.path.length<=180)).toBe(true);
      for(const trace of [...(s.replacementBaseDetails??[]),...s.dryContours]){
        expect(trace.path).toMatch(/^M/);
        expect(trace.opacity).toBeLessThan(.65);
        expect(trace.width).toBeLessThan(.7);
        expect(trace.startFrame+trace.durationFrames).toBeLessThanOrEqual(335);
      }
    }
    expect(ROSE_CENTER_SCROLL_BACKFACE.path.startsWith(
      ROSE_CENTER_SCROLL_BACKFACE.hinge)).toBe(true);
    expect(ROSE_CENTER_KNOT_SURFACES[ROSE_CENTER_KNOT_SURFACES.length-1]?.path.startsWith(
      ROSE_CENTER_SCROLL_BACKFACE.hinge)).toBe(true);
    expect(ROSE_CENTER_SCROLL_BACKFACE.details).toHaveLength(4);
  });

  it.each(["landscape","portrait"] as const)(
    "reconstructs only six historical source surfaces and attaches one underturn, preserving unrelated regions at %s",aspect=>{
      const before=rose(aspect),after=rose(aspect,true);
      expect(before.regions).toHaveLength(15);
      expect(after.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const prior of before.regions){
        const current=after.regions.find(r=>r.id===prior.id);
        expect(current).toBeDefined();
        expect(current?.layers.map(l=>l.seed)).toEqual(prior.layers.map(l=>l.seed));
        if(!remodeled.has(prior.id)){
          expect(current).toEqual(prior);
        }else{
          const revised=ROSE_CENTER_KNOT_SURFACES.find(o=>o.id===prior.id)!;
          expect(current?.path).toBe(revised.path);
          expect(current?.bounds).toEqual(revised.bounds);
          const baseDetails=revised.replacementBaseDetails??prior.details??[];
          expect(current?.details?.slice(0,baseDetails.length)).toEqual(baseDetails);
          expect(current?.details?.slice(baseDetails.length))
            .toEqual(revised.dryContours);
          expect(current?.opaqueSupport).toBe(true);
          expect(current?.craft).toBeDefined();
        }
      }
      const under=after.regions.find(r=>r.id===ROSE_CENTER_SCROLL_BACKFACE.id);
      expect(under?.path).toBe(ROSE_CENTER_SCROLL_BACKFACE.path);
      expect(under?.bounds).toEqual(ROSE_CENTER_SCROLL_BACKFACE.bounds);
      expect(under?.details).toEqual(ROSE_CENTER_SCROLL_BACKFACE.details);
      expect(under?.layers).toHaveLength(3);
      expect(under?.opaqueSupport).toBe(true);
      const ids=after.regions.map(r=>r.id);
      expect(ids.indexOf("inner-fold")).toBeLessThan(ids.indexOf("rose-whorl-recess"));
      expect(ids.indexOf("rose-whorl-right")).toBeLessThan(ids.indexOf("heart"));
      expect(ids.indexOf("heart")).toBeLessThan(ids.indexOf(under!.id));
      expect(ids.indexOf(under!.id)).toBeLessThan(ids.indexOf("rose-whorl-scroll"));
      expect(under?.layers[0].seed).toBeGreaterThanOrEqual(0);
    });

  it("composes with the entire 44-region frontal-volume/sidewall/calyx/rear-cup ecosystem without re-seeding it",()=>{
    const before=rose("portrait",false,true);
    const after=rose("portrait",true,true);
    expect(before.regions).toHaveLength(44);
    expect(after.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const previous of before.regions){
      const current=after.regions.find(r=>r.id===previous.id);
      expect(current).toBeDefined();
      expect(current?.layers.map(l=>l.seed)).toEqual(previous.layers.map(l=>l.seed));
      if(!remodeled.has(previous.id))expect(current).toEqual(previous);
      else expect(current?.details?.length).toBe(
        (ROSE_CENTER_KNOT_SURFACES.find(x=>x.id===previous.id)!
          .replacementBaseDetails??previous.details??[]).length+4);
    }
    for(const id of ["rose-rim-front-left","rose-rim-front-right","back-cup",
                     "rose-turn-back-cup","rose-mid-right-tuck",
                     "petal-front-left","petal-front-right"])
      expect(after.regions.find(r=>r.id===id))
        .toEqual(before.regions.find(r=>r.id===id));
  });

  it("is deterministic under maximal source seeds, gated to inner whorl, and isolated from non-rose subjects",()=>{
    for(const seed of [0,371,2147483000]){
      expect(rose("portrait",true,true,seed)).toEqual(rose("portrait",true,true,seed));
      expect(rose("landscape",true,false,seed)).toEqual(rose("landscape",true,false,seed));
    }
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"landscape" as const,seed:371};
      expect(pencilObjectStudyDrawing({...options,roseCenterKnotStudy:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseCenterKnotStudy:true,
    })).toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseInnerWhorlStudy:true,
      roseCenterKnotStudy:"on" as never,
    })).toThrow(RangeError);
    expect(pencilObjectStudyDrawing({subject:"rose",aspect:"portrait"}).regions)
      .toHaveLength(11);
  });
});
