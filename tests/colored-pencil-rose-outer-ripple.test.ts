import {describe,expect,it} from "vitest";
import {ROSE_PHYSICAL_FOLDS} from "../src/video/colored-pencil-rose-physical-folds";
import {ROSE_OUTER_RIPPLE_SURFACES,inspectRoseOuterRippleSurfaces}
  from "../src/video/colored-pencil-rose-outer-ripple";
import {ROSE_OUTER_FORM_FACE_PALETTES}
  from "../src/video/colored-pencil-rose-outer-form";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",ripple=false,complete=false,seed=277)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,rosePhysicalFolds:true,
    roseOuterRippleStudy:ripple,roseOuterFormStudy:complete,
    roseFrontLaminaVolumeStudy:complete,roseFrontValueStudy:complete,
    rosePetalRimStudy:complete,roseBackCupReliefStudy:complete,
    roseInnerWhorlStudy:complete,roseCenterKnotStudy:complete,
    roseCenterValueStudy:complete,roseMiddleCupStudy:complete,
    roseCalyxStudy:complete,rosePinnateStudy:complete,
    roseLaminaStudy:complete,roseLipStudy:complete,
  });

const organs=["outer-left","outer-right"] as const;

describe("CP-F1 × FLORA1 source-native outer petal physical edge relief",()=>{
  it("has two separately authored nonmirrored convex scalloped source faces that share the real abaxial fold",()=>{
    expect(inspectRoseOuterRippleSurfaces()).toEqual([]);
    expect(ROSE_OUTER_RIPPLE_SURFACES.map(o=>o.id)).toEqual([...organs]);
    expect(new Set(ROSE_OUTER_RIPPLE_SURFACES.map(o=>o.face)).size).toBe(2);
    for(const face of ROSE_OUTER_RIPPLE_SURFACES){
      const original=ROSE_PHYSICAL_FOLDS.find(o=>o.id===face.id)!;
      expect(face.hinge).toEqual(original.hinge);
      expect(face.face).not.toBe(original.face);
      expect(face.face.includes(original.hinge.slice(1))).toBe(true);
      expect(face.face).toMatch(/^M.+ Z$/);
      expect(face.face.split("C").length).toBeGreaterThanOrEqual(11);
      expect(face.contacts).toHaveLength(5);
      expect(new Set(face.contacts.map(m=>m.id)).size).toBe(5);
      expect(face.contacts.every(t=>t.startFrame+t.durationFrames<=335)).toBe(true);
      expect(face.bounds[2]*face.bounds[3]).toBeGreaterThan(17000);
    }
  });

  it.each(["landscape","portrait"] as const)(
    "reprofiles only two physically attached full-surface petal faces at %s",aspect=>{
      const before=draw(aspect),after=draw(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const old of before.regions){
        const now=after.regions.find(r=>r.id===old.id)!;
        const source=ROSE_OUTER_RIPPLE_SURFACES.find(s=>s.id===old.id);
        if(!source){expect(now).toEqual(old);continue;}
        expect(now.path).toEqual(source.face);
        expect(now.bounds).toEqual(source.bounds);
        expect(now.details).toEqual([...(old.details??[]),...source.contacts]);
        expect(now.contour.path).toEqual(source.face);
        expect(now.contour.color).toEqual(old.contour.color);
        expect(now.opaqueSupport).toBe(true);
        expect(now.layers).toEqual(old.layers);
        expect(now.craft).toEqual(old.craft);
        const reverse="rose-turn-"+source.id;
        expect(after.regions.find(r=>r.id===reverse))
          .toEqual(before.regions.find(r=>r.id===reverse));
      }
    });

  it("composes with original outer-petal palettes, center value, frontal values, rims and all 45 botanical source regions",()=>{
    const old=draw("landscape",false,true);
    const updated=draw("landscape",true,true);
    expect(old.regions).toHaveLength(45);
    expect(updated.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(updated)).toEqual([]);
    for(const item of old.regions){
      const now=updated.regions.find(r=>r.id===item.id)!;
      const source=ROSE_OUTER_RIPPLE_SURFACES.find(s=>s.id===item.id);
      if(!source){expect(now).toEqual(item);continue;}
      expect(now.path).toBe(source.face);
      expect(now.layers.map(l=>l.seed)).toEqual(item.layers.map(l=>l.seed));
      expect(now.layers.map(l=>l.color)).toEqual(
        [...ROSE_OUTER_FORM_FACE_PALETTES[source.id]]);
      expect(now.interiorDetails).toEqual(item.interiorDetails);
      expect(now.details?.filter(t=>!t.id?.startsWith("ripple-")))
        .toEqual(item.details);
      expect(now.details?.filter(t=>t.id?.startsWith("ripple-")))
        .toEqual(source.contacts);
    }
    expect(updated.regions.filter(r=>r.interiorDetails?.length)).toHaveLength(10);
  });

  it("retains deterministic multi-aspect film seed and stops detached/invalid flags before drawing",()=>{
    for(const seed of [0,277,2147483000]){
      expect(draw("landscape",true,true,seed)).toEqual(draw("landscape",true,true,seed));
      expect(draw("portrait",true,false,seed)).toEqual(draw("portrait",true,false,seed));
    }
    for(const subject of ["glass","architecture","fabric"] as const){
      const base={subject,aspect:"portrait" as const,seed:277};
      expect(pencilObjectStudyDrawing({...base,roseOuterRippleStudy:true}))
        .toEqual(pencilObjectStudyDrawing(base));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseOuterRippleStudy:true,
    })).toThrow(/physically attached/);
    for(const wrong of [1,"yes",null,{}])
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",rosePhysicalFolds:true,
        roseOuterRippleStudy:wrong as never,
      })).toThrow(RangeError);
    expect(pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",
    }).regions).toHaveLength(11);
  });
});
