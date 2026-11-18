import {describe,expect,it} from "vitest";
import {ROSE_INNER_WHORL_ORGANS,inspectRoseInnerWhorl}
  from "../src/video/colored-pencil-rose-inner-whorl";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",inner=false,full=false,seed=291)=>
  pencilObjectStudyDrawing({subject:"rose",aspect,seed,
    roseInnerWhorlStudy:inner,rosePhysicalFolds:full,
    roseLaminaStudy:full,roseLipStudy:full,rosePinnateStudy:full,
    roseCalyxStudy:full});

describe("ArtCraft CP-F1 rose independently nested and opaque central whorl",()=>{
  it("has four original physical laminae with four individually timed pencil passes",()=>{
    expect(inspectRoseInnerWhorl()).toEqual([]);
    expect(ROSE_INNER_WHORL_ORGANS.map(o=>o.id)).toEqual([
      "rose-whorl-recess","rose-whorl-left","rose-whorl-right","rose-whorl-scroll",
    ]);
    expect(new Set(ROSE_INNER_WHORL_ORGANS.map(o=>o.path)).size).toBe(4);
    const recess=ROSE_INNER_WHORL_ORGANS.find(o=>o.id==="rose-whorl-recess")!;
    const scroll=ROSE_INNER_WHORL_ORGANS.find(o=>o.id==="rose-whorl-scroll")!;
    // Value-first silhouette guard: a narrow, off-axis recess and a larger
    // foreground convex face, rather than a compact concentric ring.
    expect(recess.path).toContain("M252 159");
    expect(scroll.bounds[2]*scroll.bounds[3]).toBeGreaterThan(3000);
    expect(scroll.bounds[0]+scroll.bounds[2]).toBeGreaterThan(266);
    expect(scroll.bounds[1]+scroll.bounds[3]).toBeGreaterThan(188);
    const centres=ROSE_INNER_WHORL_ORGANS.map(o=>[
      o.bounds[0]+o.bounds[2]/2,o.bounds[1]+o.bounds[3]/2,
    ].join(","));
    expect(new Set(centres).size).toBe(4);
    for(const organ of ROSE_INNER_WHORL_ORGANS){
      expect(organ.surface).toBe("petal");
      expect(organ.path).toMatch(/^M.* Z$/);
      expect(organ.path).toContain("C");
      expect(organ.bounds[2]*organ.bounds[3]).toBeGreaterThan(400);
      expect(organ.details).toHaveLength(4);
      expect(organ.details.every(t=>t.path.length<=180)).toBe(true);
      expect(organ.details.map(t=>t.startFrame)).toEqual(expect.arrayContaining([expect.any(Number)]));
      expect(organ.details.map(t=>t.id)).toHaveLength(4);
      expect(new Set(organ.details.map(t=>t.id)).size).toBe(4);
      for(const trace of organ.details){
        expect(trace.path).toMatch(/^M/);
        expect(trace.width).toBeGreaterThan(0);
        expect(trace.opacity).toBeGreaterThan(0);
        expect(trace.startFrame).toBeGreaterThanOrEqual(160);
        expect(trace.startFrame).toBeLessThanOrEqual(280);
      }
    }
  });
  it.each(["landscape","portrait"] as const)(
    "preserves every original petal/detail/seed while inserting nested surfaces in %s",aspect=>{
      const before=rose(aspect);
      const after=rose(aspect,true);
      expect(before).toEqual(pencilObjectStudyDrawing({subject:"rose",aspect,seed:291}));
      expect(before.regions).toHaveLength(11);
      expect(after.regions).toHaveLength(15);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      expect(after.foundation?.surfaces).toHaveProperty("rose-whorl-scroll","petal");
      expect(after.foundation?.references.length).toBe(2);
      for(const old of before.regions)
        expect(after.regions.find(region=>region.id===old.id)).toEqual(old);
      for(const o of ROSE_INNER_WHORL_ORGANS){
        const material=after.regions.find(r=>r.id===o.id);
        expect(material?.path).toBe(o.path);
        expect(material?.bounds).toEqual(o.bounds);
        expect(material?.opaqueSupport).toBe(true);
        expect(material?.details).toEqual(o.details);
        expect(material?.layers.length).toBeGreaterThanOrEqual(3);
      }
      const ids=after.regions.map(r=>r.id);
      expect(ids.indexOf("inner-fold")).toBeLessThan(ids.indexOf("rose-whorl-recess"));
      expect(ids.indexOf("rose-whorl-recess")).toBeLessThan(ids.indexOf("rose-whorl-left"));
      expect(ids.indexOf("rose-whorl-left")).toBeLessThan(ids.indexOf("rose-whorl-right"));
      expect(ids.indexOf("rose-whorl-right")).toBeLessThan(ids.indexOf("heart"));
      expect(ids.indexOf("heart")).toBeLessThan(ids.indexOf("rose-whorl-scroll"));
    });
  it("composes with all preexisting leaf, calyx, physical fold and optical detail studies",()=>{
    const before=rose("landscape",false,true);
    const after=rose("landscape",true,true);
    expect(before.regions).toHaveLength(35);
    expect(after.regions).toHaveLength(39);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const old of before.regions)
      expect(after.regions.find(r=>r.id===old.id)).toEqual(old);
  });
  it("is deterministic under high seeds, isolated to rose, and fail-closed for non-booleans",()=>{
    for(const seed of [0,291,2147483000])
      expect(rose("portrait",true,true,seed)).toEqual(rose("portrait",true,true,seed));
    for(const subject of ["glass","architecture","fabric"] as const){
      const spec={subject,aspect:"portrait" as const};
      expect(pencilObjectStudyDrawing({...spec,roseInnerWhorlStudy:true}))
        .toEqual(pencilObjectStudyDrawing(spec));
    }
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",roseInnerWhorlStudy:"true" as never,
    })).toThrow(RangeError);
  });
});
