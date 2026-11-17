import {describe,expect,it} from "vitest";
import {
  ROSE_OUTER_FORM_ENVELOPES,ROSE_OUTER_FORM_FACE_PALETTES,
  roseOuterFormDeposits,inspectRoseOuterForm,
} from "../src/video/colored-pencil-rose-outer-form";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",outer=false,complete=false,seed=291)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,rosePhysicalFolds:true,
    roseOuterFormStudy:outer,
    roseFrontLaminaVolumeStudy:complete,roseFrontValueStudy:complete,
    rosePetalRimStudy:complete,roseBackCupReliefStudy:complete,
    roseInnerWhorlStudy:complete,roseCenterKnotStudy:complete,
    roseMiddleCupStudy:complete,roseCalyxStudy:complete,
    rosePinnateStudy:complete,roseLaminaStudy:complete,roseLipStudy:complete,
  });

const sides=["outer-left","outer-right"] as const;

describe("FLORA1 rose source-native dry coloured-pencil outer petal form",()=>{
  it("has 3 separate anatomical tonal fields per petal, six independent cubic axes, no mirrored template",()=>{
    expect(inspectRoseOuterForm()).toEqual([]);
    expect(ROSE_OUTER_FORM_ENVELOPES).toHaveLength(6);
    expect(new Set(ROSE_OUTER_FORM_ENVELOPES.map(b=>b.id)).size).toBe(6);
    expect(new Set(ROSE_OUTER_FORM_ENVELOPES.map(b=>JSON.stringify(b.axis))).size).toBe(6);
    for(const side of sides){
      const fields=ROSE_OUTER_FORM_ENVELOPES.filter(x=>x.petal===side);
      expect(fields.map(f=>f.role)).toEqual(
        ["fold-occlusion","convex-velvet","edge-return"]);
      expect(ROSE_OUTER_FORM_FACE_PALETTES[side]).toHaveLength(3);
      const marks=roseOuterFormDeposits(side,291);
      expect(marks).toHaveLength(9);
      expect(new Set(marks.map(x=>x.id)).size).toBe(9);
      for(const [i,mark] of marks.entries()){
        expect(mark.path).toMatch(/^M[\d.]+ [\d.]+ Q/);
        expect(mark.path.length).toBeLessThanOrEqual(12000);
        expect(mark.path.split("M").length).toBeGreaterThan(91);
        expect(mark.opacity).toBeGreaterThan(.15);
        expect(mark.width).toBeGreaterThan(.5);
        expect(mark.startFrame+mark.durationFrames).toBeLessThanOrEqual(335);
        expect(mark.color).toBe(fields[Math.floor(i/3)].colors[i%3]);
      }
    }
  });

  it.each(["landscape","portrait"] as const)(
    "changes only outer-petal dry pigment palettes and clipped optical contacts, not other source artwork at %s",aspect=>{
      const before=rose(aspect),after=rose(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(16);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const old of before.regions){
        const changed=after.regions.find(x=>x.id===old.id);
        expect(changed).toBeDefined();
        if(!sides.includes(old.id as typeof sides[number])){
          expect(changed).toEqual(old);
        }else{
          const side=old.id as typeof sides[number];
          expect(changed!.path).toBe(old.path);
          expect(changed!.bounds).toEqual(old.bounds);
          expect(changed!.details).toEqual(old.details);
          expect(changed!.craft).toEqual(old.craft);
          expect(changed!.contour).toEqual(old.contour);
          expect(changed!.layers.map(x=>x.seed)).toEqual(old.layers.map(x=>x.seed));
          expect(changed!.layers.map(x=>x.color)).toEqual(
            [...ROSE_OUTER_FORM_FACE_PALETTES[side]]);
          expect(changed!.interiorDetails).toEqual(roseOuterFormDeposits(side,291));
          expect(changed!.opaqueSupport).toBe(true);
          const underside=after.regions.find(x=>x.id==="rose-turn-"+side)!;
          expect(underside).toEqual(before.regions.find(x=>x.id==="rose-turn-"+side));
        }
      }
    });

  it("supports all 45 original floral parts, central knot, front face/sidewalls and both local-value families",()=>{
    const baseline=rose("portrait",false,true);
    const revised=rose("portrait",true,true);
    expect(baseline.regions).toHaveLength(45);
    expect(revised.regions).toHaveLength(45);
    expect(inspectPencilFoundationDrawing(revised)).toEqual([]);
    for(const old of baseline.regions){
      const now=revised.regions.find(r=>r.id===old.id)!;
      if(!sides.includes(old.id as typeof sides[number]))
        expect(now).toEqual(old);
      else {
        expect(now.path).toBe(old.path);
        expect(now.layers.map(l=>l.seed)).toEqual(old.layers.map(l=>l.seed));
        expect(now.interiorDetails).toHaveLength(9);
      }
    }
    for(const front of ["petal-front-left","petal-front-right"]){
      const p=revised.regions.find(r=>r.id===front)!;
      expect(p.interiorDetails).toHaveLength(9);
    }
  });

  it("keeps old default drawings intact and rejects unhinged rose and invalid flags",()=>{
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseOuterFormStudy:true,
    })).toThrow(/physical fold/);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseOuterFormStudy:"yes" as never,
    })).toThrow(RangeError);
    expect(()=>roseOuterFormDeposits("heart" as never,291)).toThrow(RangeError);
    expect(()=>roseOuterFormDeposits("outer-left",2147483647)).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const base={subject,aspect:"portrait" as const,seed:291};
      expect(pencilObjectStudyDrawing({...base,roseOuterFormStudy:true}))
        .toEqual(pencilObjectStudyDrawing(base));
    }
    for(const seed of [0,291,2147483000]){
      expect(rose("landscape",true,true,seed)).toEqual(
        rose("landscape",true,true,seed));
      expect(rose("portrait",true,false,seed)).toEqual(
        rose("portrait",true,false,seed));
    }
    expect(pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",
    }).regions).toHaveLength(11);
  });
});
