import {describe,expect,it} from "vitest";
import {
  ROSE_CENTER_VALUE_FIELDS,
  roseCenterValueDetails,
  inspectRoseCenterValueFields,
} from "../src/video/colored-pencil-rose-center-local-value";
import {ROSE_CENTER_KNOT_SURFACES}
  from "../src/video/colored-pencil-rose-center-knot";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",value=false,full=false,seed=389)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,roseInnerWhorlStudy:true,roseCenterKnotStudy:true,
    roseCenterValueStudy:value,
    rosePhysicalFolds:full,roseFrontLaminaVolumeStudy:full,
    roseFrontValueStudy:full,rosePetalRimStudy:full,
    roseBackCupReliefStudy:full,roseCalyxStudy:full,
    rosePinnateStudy:full,roseLaminaStudy:full,
    roseLipStudy:full,roseMiddleCupStudy:full,
  });
const sourceIds=ROSE_CENTER_KNOT_SURFACES.map(s=>s.id);
const sourceIdSet=new Set<string>(sourceIds);

describe("CP-F1 FLORA1 rose center local value fibres",()=>{
  it("has twelve source-authored distinct cubic axes (shadow/return for each independent center petal)",()=>{
    expect(inspectRoseCenterValueFields()).toEqual([]);
    expect(ROSE_CENTER_VALUE_FIELDS).toHaveLength(12);
    const ids=new Set<string>(),axisStrings=new Set<string>();
    for(const field of ROSE_CENTER_VALUE_FIELDS){
      expect(sourceIdSet.has(field.petal)).toBe(true);
      expect(ids.has(field.id)).toBe(false);
      ids.add(field.id);
      const axis=JSON.stringify(field.axis);
      expect(axisStrings.has(axis)).toBe(false);
      axisStrings.add(axis);
      expect(field.axis).toHaveLength(4);
      expect(field.contacts).toBeGreaterThanOrEqual(40);
      expect(field.contacts).toBeLessThanOrEqual(90);
      expect(field.halfWidth).toBeLessThanOrEqual(8);
      expect(field.pigment).toHaveLength(3);
      expect(field.nibs.every(n=>n<=.6)).toBe(true);
      expect(field.opacity.every(n=>n<=.4)).toBe(true);
    }
    for(const petal of sourceIds){
      const entries=ROSE_CENTER_VALUE_FIELDS.filter(f=>f.petal===petal);
      expect(entries.map(x=>x.role)).toEqual(["occlusion","diffuse-return"]);
      const strokes=roseCenterValueDetails(petal,389);
      expect(strokes).toHaveLength(6);
      expect(new Set(strokes.map(t=>t.id)).size).toBe(6);
      for(const t of strokes){
        expect(t.path).toMatch(/^M/);
        expect(t.path).toContain(" Q");
        expect(t.path.length).toBeGreaterThan(1000);
        expect(t.path.length).toBeLessThan(12000);
        expect(t.width).toBeLessThan(.61);
        expect(t.opacity).toBeLessThan(.41);
        expect(t.startFrame).toBeGreaterThanOrEqual(170);
        expect(t.startFrame+t.durationFrames).toBeLessThanOrEqual(335);
        expect(t.path).not.toMatch(/NaN|Infinity|url\(|<image/);
      }
    }
  });

  it.each(["landscape","portrait"] as const)(
    "adds source-clipped interior dry values without editing a single existing path, graphite stroke or pigment seed in %s",aspect=>{
      const before=rose(aspect);
      const after=rose(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const old of before.regions){
        const next=after.regions.find(r=>r.id===old.id);
        expect(next).toBeDefined();
        const expected=sourceIdSet.has(old.id)?
          {...old,interiorDetails:roseCenterValueDetails(
            old.id as typeof sourceIds[number],389)}:old;
        expect(next).toEqual(expected);
        if(sourceIdSet.has(old.id)){
          expect(next?.interiorDetails).toHaveLength(6);
          expect(next?.details).toEqual(old.details);
          expect(next?.path).toBe(old.path);
          expect(next?.opaqueSupport).toBe(true);
          expect(next?.layers.map(l=>l.seed)).toEqual(old.layers.map(l=>l.seed));
        }else{
          expect(next?.interiorDetails).toEqual(old.interiorDetails);
        }
      }
    });

  it("preserves all 45 regions with earlier frontal volume, cuticle and botanical options",()=>{
    const original=rose("portrait",false,true);
    const valued=rose("portrait",true,true);
    expect(original.regions).toHaveLength(45);
    expect(valued.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(valued)).toEqual([]);
    for(const prior of original.regions){
      const next=valued.regions.find(r=>r.id===prior.id);
      if(!sourceIdSet.has(prior.id))expect(next).toEqual(prior);
      else{
        expect(next?.interiorDetails).toHaveLength(6);
        expect(next?.details).toEqual(prior.details);
        expect(next?.path).toEqual(prior.path);
        expect(next?.layers).toEqual(prior.layers);
      }
    }
    expect(valued.regions.find(r=>r.id==="petal-front-left")?.interiorDetails)
      .toEqual(original.regions.find(r=>r.id==="petal-front-left")?.interiorDetails);
    expect(valued.regions.find(r=>r.id==="petal-front-right")?.interiorDetails)
      .toEqual(original.regions.find(r=>r.id==="petal-front-right")?.interiorDetails);
  });

  it("is stable across extreme seeds and isolated from unrelated subjects",()=>{
    for(const seed of [0,389,2147483000]){
      expect(rose("landscape",true,true,seed)).toEqual(
        rose("landscape",true,true,seed));
      expect(roseCenterValueDetails("rose-whorl-scroll",seed)).toEqual(
        roseCenterValueDetails("rose-whorl-scroll",seed));
    }
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"landscape" as const,seed:389};
      expect(pencilObjectStudyDrawing({...options,roseCenterValueStudy:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    for(const invalid of ["true",1,null,{}]){
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",roseInnerWhorlStudy:true,
        roseCenterKnotStudy:true,roseCenterValueStudy:invalid as never,
      })).toThrow(RangeError);
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseCenterValueStudy:true,
    })).toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseCenterKnotStudy:true,
      roseCenterValueStudy:true,
    })).toThrow(RangeError);
    expect(()=>roseCenterValueDetails("unknown" as never,389)).toThrow(RangeError);
    expect(()=>roseCenterValueDetails("heart",-1)).toThrow(RangeError);
    const plain=pencilObjectStudyDrawing({subject:"rose",aspect:"landscape"});
    expect(plain.regions).toHaveLength(11);
    expect(plain.regions.every(r=>!r.interiorDetails)).toBe(true);
  });
});
