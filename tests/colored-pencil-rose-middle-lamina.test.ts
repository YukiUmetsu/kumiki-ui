import {describe,expect,it} from "vitest";
import {ROSE_MIDDLE_LAMINAE,inspectRoseMiddleLaminae}
  from "../src/video/colored-pencil-rose-middle-lamina";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",middle=false,full=false,seed=181)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    roseMiddleCupStudy:middle,roseInnerWhorlStudy:full,rosePhysicalFolds:full,
    roseCalyxStudy:full,rosePinnateStudy:full,
    roseLaminaStudy:full,roseLipStudy:full});

describe("FLORA1/CP-F1 source-authored intermediate rose corolla",()=>{
  it("keeps three individually bounded, rooted curved petal planes and four independent pencil passes",()=>{
    expect(inspectRoseMiddleLaminae()).toEqual([]);
    expect(ROSE_MIDDLE_LAMINAE.map(o=>o.id)).toEqual([
      "rose-mid-left-shoulder","rose-mid-right-tuck","rose-mid-center-guard",
    ]);
    expect(new Set(ROSE_MIDDLE_LAMINAE.map(o=>o.path)).size).toBe(3);
    for(const o of ROSE_MIDDLE_LAMINAE){
      expect(o.surface).toBe("petal");
      expect(o.bounds[2]*o.bounds[3]).toBeGreaterThan(1200);
      expect(o.details).toHaveLength(4);
      expect(new Set(o.details.map(d=>d.id)).size).toBe(4);
      expect(o.details.map(d=>d.startFrame).every(frame=>frame>=160&&frame<=280))
        .toBe(true);
      expect(new Set(o.palette).size).toBe(3);
    }
  });
  it.each(["landscape","portrait"] as const)(
    "preserves original 11 regions and inserts middle petals in physical z-order at %s",aspect=>{
      const before=draw(aspect);
      const after=draw(aspect,true);
      expect(before.regions).toHaveLength(11);
      expect(after.regions).toHaveLength(14);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const old of before.regions)
        expect(after.regions.find(r=>r.id===old.id)).toEqual(old);
      const ids=after.regions.map(r=>r.id);
      expect(ids.indexOf("back-cup")).toBeLessThan(ids.indexOf("rose-mid-left-shoulder"));
      expect(ids.indexOf("rose-mid-left-shoulder")).toBeLessThan(ids.indexOf("rose-mid-right-tuck"));
      expect(ids.indexOf("rose-mid-right-tuck")).toBeLessThan(ids.indexOf("rose-mid-center-guard"));
      expect(ids.indexOf("rose-mid-center-guard")).toBeLessThan(ids.indexOf("petal-front-left"));
      for(const o of ROSE_MIDDLE_LAMINAE){
        const r=after.regions.find(region=>region.id===o.id);
        expect(r?.opaqueSupport).toBe(true);
        expect(r?.path).toBe(o.path);
        expect(r?.bounds).toEqual(o.bounds);
        expect(r?.details).toEqual(o.details);
        expect(r?.layers.length).toBeGreaterThanOrEqual(3);
        expect(after.foundation?.surfaces[o.id]).toBe("petal");
      }
    });
  it("composes with inner four petals, prior underturns, foliage, and calyx without reseeding originals",()=>{
    const before=draw("landscape",false,true);
    const after=draw("landscape",true,true);
    expect(before.regions).toHaveLength(39);
    expect(after.regions).toHaveLength(42);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const old of before.regions)
      expect(after.regions.find(r=>r.id===old.id)).toEqual(old);
    expect(after.regions.map(r=>r.id).indexOf("rose-turn-back-cup"))
      .toBeLessThan(after.regions.map(r=>r.id).indexOf("rose-mid-left-shoulder"));
  });
  it("retains arbitrary seed determinism, subject isolation and fail-closed flag semantics",()=>{
    for(const seed of [0,181,2147483000])
      expect(draw("portrait",true,true,seed)).toEqual(draw("portrait",true,true,seed));
    for(const subject of ["glass","architecture","fabric"] as const){
      const spec={subject,aspect:"portrait" as const};
      expect(pencilObjectStudyDrawing({...spec,roseMiddleCupStudy:true}))
        .toEqual(pencilObjectStudyDrawing(spec));
    }
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"landscape",
      roseMiddleCupStudy:"true" as never})).toThrow(RangeError);
  });
});
