import {describe,expect,it} from "vitest";
import {
  NEW_CHARACTER_01_ID,newCharacterHeadInspectionAnchors,
  newCharacterHeadStageOne,
} from "../src/video/colored-pencil-first-character";
import {pencilLivingStudyDrawing} from
  "../src/video/colored-pencil-living-studies";
import {inspectPencilDrawing} from "../registry/video/colored-pencil";

const head=(study:boolean,seed=291)=>
  newCharacterHeadStageOne(seed,true,true,study)[0];
const idList=(study:boolean)=>
  head(study).details!.map(t=>t.id);
const contourCommands=(d:string)=>(d.match(/[CQ]/g)??[]).length;

describe("ArtCraft new Human #01: original photo-led 3/4 cranial outline experiment",()=>{
  it("retains the exact old 77 + 15 head baseline when the study is off",()=>{
    const implicit=newCharacterHeadStageOne(291,true,true);
    const explicit=newCharacterHeadStageOne(291,true,true,false);
    expect(implicit).toEqual(explicit);
    expect(implicit).toHaveLength(1);
    expect(implicit[0].id).toBe(NEW_CHARACTER_01_ID);
    expect(implicit[0].details).toHaveLength(92);
  });
  it("builds more cranial points, reduces stretched aspect and preserves every pigment trace",()=>{
    const baseline=head(false),study=head(true);
    expect(study.path).not.toBe(baseline.path);
    const oldRatio=baseline.bounds![2]/baseline.bounds![3];
    const newRatio=study.bounds![2]/study.bounds![3];
    expect(newRatio).toBeGreaterThan(oldRatio+.015);
    expect(contourCommands(study.path)).toBeGreaterThan(
      contourCommands(baseline.path));
    expect(study.details).toHaveLength(92);
    expect(idList(true)).toEqual(idList(false));
    for(let i=0;i<92;i++){
      const old=baseline.details![i],candidate=study.details![i];
      expect(candidate.id).toBe(old.id);
      expect(candidate.color).toBe(old.color);
      expect(candidate.width).toBe(old.width);
      expect(candidate.opacity).toBe(old.opacity);
      expect(candidate.startFrame).toBe(old.startFrame);
      expect(candidate.durationFrames).toBe(old.durationFrames);
      expect(candidate.path).not.toMatch(/NaN|Infinity|<image|<svg|filter/);
      expect(candidate.path.length).toBeGreaterThan(20);
      expect(candidate.path.length).toBeLessThan(12000);
    }
    expect(study.details!.filter(t=>t.id?.startsWith("newhead-cranium-")))
      .toHaveLength(15);
    expect(study.details!.filter(t=>t.id?.startsWith("newhead-anat1-")))
      .toHaveLength(15);
  });
  it("reprojects all nine semantic ANAT1 construction anchors at consistent camera yaw",()=>{
    const old=newCharacterHeadInspectionAnchors();
    const projected=newCharacterHeadInspectionAnchors(true);
    expect(projected.map(x=>x.id)).toEqual(old.map(x=>x.id));
    expect(projected).toHaveLength(9);
    expect(projected.some((p,i)=>p.point[0]!==old[i].point[0]))
      .toBe(true);
    for(const p of projected){
      expect(p.point).toHaveLength(2);
      expect(p.point.every(Number.isFinite)).toBe(true);
    }
    expect(()=>newCharacterHeadInspectionAnchors("yes" as never))
      .toThrow(/boolean/);
  });
  it("keeps native 16:9 and 9:16 renderer contracts with isolated A/B and no source approval",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const base=pencilLivingStudyDrawing({
        subject:"portrait",aspect,headContourCraft:true,
        headVolumeWeave:true,headSilhouetteStudy:false,
      });
      const study=pencilLivingStudyDrawing({
        subject:"portrait",aspect,headContourCraft:true,
        headVolumeWeave:true,headSilhouetteStudy:true,
      });
      expect(study.regions).toHaveLength(1);
      expect(study.regions[0].id).toBe(NEW_CHARACTER_01_ID);
      expect(study.regions[0].details).toHaveLength(92);
      expect(study.regions[0].path).not.toEqual(base.regions[0].path);
      expect(study.width).toBe(aspect==="landscape"?960:540);
      expect(study.height).toBe(aspect==="landscape"?540:960);
      expect(inspectPencilDrawing(study)).toEqual([]);
      for(const subject of ["fox","valley"] as const){
        const a=pencilLivingStudyDrawing({
          subject,aspect,headSilhouetteStudy:true,
        });
        const b=pencilLivingStudyDrawing({
          subject,aspect,headSilhouetteStudy:false,
        });
        expect(a).toEqual(b);
      }
    }
  });
  it("rejects malformed style switch and preserves seeded reproducibility",()=>{
    expect(head(true)).toEqual(head(true));
    expect(head(true,291).path).toEqual(head(true,301).path);
    expect(head(true,291).details![0].path)
      .not.toEqual(head(true,301).details![0].path);
    expect(()=>newCharacterHeadStageOne(271,true,true,"yes" as never))
      .toThrow(/boolean/);
    expect(()=>pencilLivingStudyDrawing({
      subject:"portrait",aspect:"landscape",
      headSilhouetteStudy:1 as never,
    })).toThrow(/boolean/);
  });
});
