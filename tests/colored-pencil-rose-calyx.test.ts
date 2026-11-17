import {describe,expect,it} from "vitest";
import {
  ROSE_CALYX_ORGANS,ROSE_CALYX_SEPAL_IDS,validateRoseCalyxOrgans,
} from "../src/video/colored-pencil-rose-calyx";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const draw=(aspect:"landscape"|"portrait",calyx=false,lamina=false,lip=false,seed=291)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    roseCalyxStudy:calyx,roseLaminaStudy:lamina,roseLipStudy:lip});

describe("FLORA1 / CP-F1 original rose calyx and five-sepal receptacle",()=>{
  it("defines six unique closed material organs with five independent sepals",()=>{
    expect(validateRoseCalyxOrgans()).toEqual([]);
    expect(ROSE_CALYX_ORGANS).toHaveLength(6);
    expect(ROSE_CALYX_SEPAL_IDS).toHaveLength(5);
    expect(new Set(ROSE_CALYX_ORGANS.map(o=>o.id)).size).toBe(6);
    expect(ROSE_CALYX_ORGANS[0].id).toBe("calyx-receptacle");
    for(const o of ROSE_CALYX_ORGANS){
      expect(o.path).toMatch(/^M/);
      expect(o.path).toMatch(/Z$/);
      expect(o.details.length).toBeGreaterThanOrEqual(2);
      expect(o.palette).toHaveLength(3);
      expect(o.bounds[2]*o.bounds[3]).toBeGreaterThan(100);
    }
  });
  it.each(["landscape","portrait"] as const)(
    "remaps only the calyx while preserving all original flower/leaf regions in %s",aspect=>{
      const base=draw(aspect);
      const studied=draw(aspect,true);
      expect(base).toEqual(pencilObjectStudyDrawing({subject:"rose",aspect,seed:291}));
      expect(base.regions).toHaveLength(11);
      expect(studied.regions).toHaveLength(16);
      expect(studied.regions.map(r=>r.id)).not.toContain("sepal");
      for(const id of ROSE_CALYX_ORGANS.map(o=>o.id))
        expect(studied.regions.some(r=>r.id===id)).toBe(true);
      expect(inspectPencilFoundationDrawing(studied)).toEqual([]);
      for(const before of base.regions.filter(r=>r.id!=="sepal")){
        const after=studied.regions.find(r=>r.id===before.id);
        expect(after).toBeDefined();
        // The calyx must never perturb petal source, texture, material or timing.
        expect(after).toEqual(before);
      }
    });
  });
  it("composes independently with the existing seven-petal fibre and lip studies",()=>{
    const baseline=draw("landscape",false,true,true);
    const studied=draw("landscape",true,true,true);
    for(const source of baseline.regions.filter(r=>r.id!=="sepal"))
      expect(studied.regions.find(r=>r.id===source.id)).toEqual(source);
    expect(studied.regions.filter(r=>r.id.startsWith("calyx-"))).toHaveLength(6);
  });
  it("is independently deterministic, rejects malformed flags and never leaks into other subjects",()=>{
    expect(draw("portrait",true,false,false,0)).toEqual(draw("portrait",true,false,false,0));
    expect(draw("portrait",true,false,false,2147483000)).toEqual(
      draw("portrait",true,false,false,2147483000));
    for(const subject of ["glass","architecture","fabric"] as const){
      const opts={subject,aspect:"landscape" as const,seed:291};
      expect(pencilObjectStudyDrawing({...opts,roseCalyxStudy:true})).toEqual(
        pencilObjectStudyDrawing(opts));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseCalyxStudy:1 as never,
    })).toThrow(RangeError);
  });
});
