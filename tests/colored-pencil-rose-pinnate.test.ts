import {describe,expect,it} from "vitest";
import {ROSE_LEAFLET_AXES,ROSE_PINNATE_ORGANS,inspectRosePinnateOrgans}
  from "../src/video/colored-pencil-rose-pinnate";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";
import {inspectPencilDrawing} from "../registry/video/colored-pencil";

const rose=(aspect:"landscape"|"portrait",leaves=false,calyx=false,
  lamina=false,lips=false,seed=291)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,rosePinnateStudy:leaves,
    roseCalyxStudy:calyx,roseLaminaStudy:lamina,roseLipStudy:lips});

describe("CP-F1/FLORA1 original serrated odd-pinnate rose leaves",()=>{
  it("has two five-leaflet axes with genuine individually toothed contours",()=>{
    expect(inspectRosePinnateOrgans()).toEqual([]);
    expect(ROSE_LEAFLET_AXES).toHaveLength(10);
    expect(ROSE_PINNATE_ORGANS).toHaveLength(16);
    expect(new Set(ROSE_PINNATE_ORGANS.map(o=>o.id)).size).toBe(16);
    for(const side of ["left","right"] as const){
      const leaves=ROSE_LEAFLET_AXES.filter(a=>a.spray===side);
      expect(leaves).toHaveLength(5);
      expect(leaves.filter(a=>a.id.endsWith("terminal"))).toHaveLength(1);
      expect(ROSE_PINNATE_ORGANS.filter(o=>o.id==="rose-"+side+"-rachis")).toHaveLength(1);
      expect(ROSE_PINNATE_ORGANS.filter(o=>o.id.startsWith("rose-"+side+"-stipule-"))).toHaveLength(2);
    }
    for(const axis of ROSE_LEAFLET_AXES){
      const organ=ROSE_PINNATE_ORGANS.find(o=>o.id==="rose-"+axis.id);
      expect(organ).toBeDefined();
      expect(organ!.path).toMatch(/^M/);
      expect(organ!.path).toMatch(/ Z$/);
      expect((organ!.path.match(/ L/g)??[]).length)
        .toBeGreaterThanOrEqual(axis.teeth*6);
      expect(organ!.details).toHaveLength(3);
      expect(organ!.details[1].path.split(" M").length).toBeGreaterThanOrEqual(14);
      expect(organ!.bounds[2]).toBeGreaterThan(12);
      expect(organ!.bounds[3]).toBeGreaterThan(12);
    }
  });

  it.each(["landscape","portrait"] as const)(
    "preserves original flower, calyx and stem materials exactly under leaf study (%s)",aspect=>{
      const base=rose(aspect);
      const foliage=rose(aspect,true);
      expect(base).toEqual(pencilObjectStudyDrawing({subject:"rose",aspect,seed:291}));
      expect(base.regions).toHaveLength(11);
      expect(foliage.regions).toHaveLength(25);
      expect(foliage.regions.some(r=>r.id==="leaf-left")).toBe(false);
      expect(foliage.regions.some(r=>r.id==="leaf-right")).toBe(false);
      expect(inspectPencilFoundationDrawing(foliage)).toEqual([]);
      for(const original of base.regions.filter(r=>!r.id.startsWith("leaf-"))){
        expect(foliage.regions.find(r=>r.id===original.id)).toEqual(original);
      }
      for(const side of ["left","right"] as const){
        expect(foliage.regions.filter(r=>r.id.startsWith("rose-"+side+"-"))).toHaveLength(8);
      }
    }
  );

  it("composes with the prior five-sepal calyx, lamina and rolled-lip A/B opt-ins",()=>{
    const base=rose("landscape",false,true,true,true);
    const combined=rose("landscape",true,true,true,true);
    expect(combined.regions).toHaveLength(30);
    expect(inspectPencilFoundationDrawing(combined)).toEqual([]);
    for(const original of base.regions.filter(r=>!r.id.startsWith("leaf-")))
      expect(combined.regions.find(r=>r.id===original.id)).toEqual(original);
    for(const old of combined.regions.filter(r=>r.id.startsWith("rose-")&&
      !r.id.startsWith("rose-lam-")&&!r.id.startsWith("rose-lip-"))){
      expect(old.path).toMatch(/^M/);
    }
  });

  it("bounds the richer native region graph at 48, rejecting unbounded 49th facets",()=>{
    const base=rose("landscape",true,true);
    expect(base.regions).toHaveLength(30);
    const sample=base.regions.find(r=>r.id==="rose-left-terminal")!;
    const expand=(n:number)=>({...base,
      regions:[...base.regions,...Array.from({length:n},(_,i)=>({
        ...sample,id:"extra-leaf-qa-"+i,
      }))],
    });
    expect(inspectPencilDrawing(expand(18))).toEqual([]);
    expect(inspectPencilDrawing(expand(19)))
      .toContain("regions: 1–48 named specimens or facets required.");
  });
  it("keeps material seed stable at extremes and leaves unrelated subjects untouched",()=>{
    for(const seed of [0,291,2147483000]){
      expect(rose("portrait",true,true,true,true,seed))
        .toEqual(rose("portrait",true,true,true,true,seed));
    }
    for(const subject of ["glass","architecture","fabric"] as const){
      const opts={subject,aspect:"landscape" as const,seed:291};
      expect(pencilObjectStudyDrawing({...opts,rosePinnateStudy:true}))
        .toEqual(pencilObjectStudyDrawing(opts));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",rosePinnateStudy:1 as never,
    })).toThrow(RangeError);
  });
});
