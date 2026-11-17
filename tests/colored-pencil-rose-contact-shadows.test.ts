import {describe,it,expect} from "vitest";
import {
  ROSE_CONTACT_SHADOWS,roseContactShadowDetails,inspectRoseContactShadows,
} from "../src/video/colored-pencil-rose-contact-shadows";
import {ROSE_CENTER_KNOT_SURFACES}
  from "../src/video/colored-pencil-rose-center-knot";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";
import type {RoseCenterKnotId}
  from "../src/video/colored-pencil-rose-center-knot";

const centerIds=ROSE_CENTER_KNOT_SURFACES.map(x=>x.id);
const rose=(aspect:"portrait"|"landscape",opt=false,full=false,seed=391,values=false)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,roseInnerWhorlStudy:true,
    roseCenterKnotStudy:true,roseContactShadowStudy:opt,
    roseCenterValueStudy:values,
    rosePhysicalFolds:full,roseFrontLaminaVolumeStudy:full,
    roseOuterFormStudy:full,roseOuterRippleStudy:full,roseFrontValueStudy:full,
    rosePetalRimStudy:full,roseBackCupReliefStudy:full,
    roseCalyxStudy:full,rosePinnateStudy:full,
    roseLaminaStudy:full,roseLipStudy:full,roseMiddleCupStudy:full,
  });

describe("CP-F1 FLORA1 original nested rose contact-shadow valleys",()=>{
  it("authenticates five nonmirrored physical lower/upper source relations and no unrelated shadow stamp",()=>{
    expect(inspectRoseContactShadows()).toEqual([]);
    expect(ROSE_CONTACT_SHADOWS).toHaveLength(5);
    const seen=new Set<string>();
    const axisSeen=new Set<string>();
    for(const field of ROSE_CONTACT_SHADOWS){
      expect(seen.has(field.id)).toBe(false);
      seen.add(field.id);
      const axis=JSON.stringify(field.axis);
      expect(axisSeen.has(axis)).toBe(false);
      axisSeen.add(axis);
      expect(centerIds.indexOf(field.lower)).toBeGreaterThanOrEqual(0);
      expect(centerIds.indexOf(field.upper)).toBeGreaterThan(centerIds.indexOf(field.lower));
      expect(field.axis).toHaveLength(4);
      expect(field.contacts).toBeGreaterThanOrEqual(40);
      expect(field.contacts).toBeLessThanOrEqual(90);
      expect(field.halfWidth).toBeLessThan(5);
      expect(field.pigments).toHaveLength(3);
      expect(field.nibs.every(x=>x>=.2&&x<=.6)).toBe(true);
      expect(field.opacity.every(x=>x>0&&x<=.5)).toBe(true);
    }
    const expected:Record<string,number>={
      "inner-fold":3,"rose-whorl-recess":6,
      "rose-whorl-right":3,"heart":3,
      "rose-whorl-left":0,"rose-whorl-scroll":0,
    };
    for(const id of centerIds){
      const details=roseContactShadowDetails(id,391);
      expect(details).toHaveLength(expected[id]);
      for(const trace of details){
        expect(trace.id).toMatch(/^rco-/);
        expect(trace.path).toMatch(/^M/);
        expect(trace.path).toContain(" Q");
        expect(trace.path.length).toBeGreaterThan(1000);
        expect(trace.path.length).toBeLessThan(12000);
        expect(trace.path).not.toMatch(/NaN|Infinity|url\(|<image/);
        expect(trace.width).toBeLessThan(.61);
        expect(trace.opacity).toBeLessThan(.51);
        expect(trace.startFrame).toBeGreaterThanOrEqual(176);
        expect(trace.startFrame+trace.durationFrames).toBeLessThanOrEqual(335);
      }
    }
  });
  it.each(["portrait","landscape"] as const)(
    "retains all source petals, geometry, paper, old graphite and pigment seeds when adding contact shadow in %s",aspect=>{
      for(const existingValues of [false,true]){
        const before=rose(aspect,false,false,391,existingValues);
        const after=rose(aspect,true,false,391,existingValues);
        expect(after.regions).toHaveLength(16);
        expect(after.regions.map(x=>x.id)).toEqual(before.regions.map(x=>x.id));
        expect(inspectPencilFoundationDrawing(after)).toEqual([]);
        for(const prior of before.regions){
          const current=after.regions.find(x=>x.id===prior.id);
          expect(current).toBeDefined();
          const extra=centerIds.includes(prior.id as RoseCenterKnotId)?
            roseContactShadowDetails(prior.id as RoseCenterKnotId,391):[];
          if(extra.length){
            expect(current).toEqual({
              ...prior,interiorDetails:[...(prior.interiorDetails??[]),...extra],
            });
          }else expect(current).toEqual(prior);
          expect(current?.path).toBe(prior.path);
          expect(current?.bounds).toEqual(prior.bounds);
          expect(current?.layers).toEqual(prior.layers);
          expect(current?.details).toEqual(prior.details);
        }
      }
    });
  it("composes with every previously merged rose organ and optical study, without extra 49th parts or paper pinholes",()=>{
    const before=rose("portrait",false,true,391,true);
    const after=rose("portrait",true,true,391,true);
    expect(before.regions).toHaveLength(45);
    expect(after.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    expect(after.paper).toBe(before.paper);
    expect(after.paperTooth).toBe(before.paperTooth);
    for(const older of before.regions){
      const next=after.regions.find(x=>x.id===older.id);
      expect(next?.path).toBe(older.path);
      expect(next?.layers).toEqual(older.layers);
      const extra=centerIds.includes(older.id as RoseCenterKnotId)?
        roseContactShadowDetails(older.id as RoseCenterKnotId,391):[];
      expect(next?.interiorDetails).toEqual(
        extra.length?[...(older.interiorDetails??[]),...extra]:older.interiorDetails);
    }
    for(const id of ["outer-left","outer-right","petal-front-left",
      "petal-front-right","rose-center-scroll-underturn",
      "rose-rim-front-left","rose-rim-front-right","back-cup",
      "rose-turn-back-cup","rose-mid-right-tuck"]){
      expect(after.regions.find(x=>x.id===id)).toEqual(
        before.regions.find(x=>x.id===id));
    }
  });
  it("gates the physical reference state to real center-knot laminae and behaves deterministically under extreme seeds",()=>{
    for(const seed of [0,391,2147483000]){
      expect(rose("landscape",true,true,seed,true)).toEqual(
        rose("landscape",true,true,seed,true));
      expect(roseContactShadowDetails("rose-whorl-recess",seed))
        .toEqual(roseContactShadowDetails("rose-whorl-recess",seed));
    }
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"landscape" as const,seed:391};
      expect(pencilObjectStudyDrawing({...options,roseContactShadowStudy:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    for(const invalid of ["true",1,null,{},[]]){
      expect(()=>pencilObjectStudyDrawing({
        subject:"rose",aspect:"landscape",roseInnerWhorlStudy:true,
        roseCenterKnotStudy:true,roseContactShadowStudy:invalid as never,
      })).toThrow(RangeError);
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseContactShadowStudy:true,
    })).toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseCenterKnotStudy:true,
      roseContactShadowStudy:true,
    })).toThrow(RangeError);
    expect(()=>roseContactShadowDetails("nonexistent" as never,391)).toThrow(RangeError);
    expect(()=>roseContactShadowDetails("heart",-1)).toThrow(RangeError);
    expect(pencilObjectStudyDrawing({subject:"rose",aspect:"portrait"}).regions)
      .toHaveLength(11);
  });
});
