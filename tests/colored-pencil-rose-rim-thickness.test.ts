import {describe,it,expect} from "vitest";
import {
  ROSE_PETAL_RIM_SIDEWALLS,inspectRosePetalRimSidewalls,rosePetalRimContacts,
} from "../src/video/colored-pencil-rose-rim-thickness";
import {ROSE_PHYSICAL_FOLDS} from "../src/video/colored-pencil-rose-physical-folds";
import {pencilObjectStudyDrawing} from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing} from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",rim=false,full=false,seed=291)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,rosePhysicalFolds:true,rosePetalRimStudy:rim,
    roseFrontValueStudy:full,roseInnerWhorlStudy:full,roseMiddleCupStudy:full,
    roseCalyxStudy:full,rosePinnateStudy:full,roseLaminaStudy:full,roseLipStudy:full,
  });

describe("FLORA1 CP-F1 real upper petal rim sidewalls",()=>{
  it("has two *different* folded, bounded, hinge-connected sidewall silhouettes and 4 dry contacts per side",()=>{
    expect(inspectRosePetalRimSidewalls()).toEqual([]);
    expect(ROSE_PETAL_RIM_SIDEWALLS).toHaveLength(2);
    for(const side of ROSE_PETAL_RIM_SIDEWALLS){
      const face=ROSE_PHYSICAL_FOLDS.find(f=>f.id===side.faceId)!;
      expect(side.hinge).toBe(face.hinge);
      expect(side.path.startsWith(face.hinge)).toBe(true);
      expect(side.path).toMatch(/^M.* Z$/);
      expect(side.path.slice(face.hinge.length)).toContain(" C");
      expect(side.path.slice(face.hinge.length)).toContain(" Q");
      expect(side.bounds[2]*side.bounds[3]).toBeGreaterThan(2000);
      expect(side.palette).toHaveLength(3);
      const contacts=rosePetalRimContacts(side);
      expect(contacts.map(c=>c.id)).toEqual([
        side.id+"-recess",side.id+"-light",side.id+"-fibres",side.id+"-bounce",
      ]);
      for(const trace of contacts){
        expect(trace.path).toMatch(/^M/);
        expect(trace.width).toBeLessThan(.65);
        expect(trace.opacity).toBeLessThan(.62);
        expect(trace.startFrame).toBeGreaterThanOrEqual(168);
        expect(trace.startFrame+trace.durationFrames).toBeLessThanOrEqual(335);
      }
    }
    expect(ROSE_PETAL_RIM_SIDEWALLS[0].path)
      .not.toBe(ROSE_PETAL_RIM_SIDEWALLS[1].path);
    expect(ROSE_PETAL_RIM_SIDEWALLS[0].flow)
      .not.toBe(ROSE_PETAL_RIM_SIDEWALLS[1].flow);
  });

  it.each(["landscape","portrait"] as const)(
    "adds only genuine new sidewall source regions after owners at %s and restores all original seed/pigment/detail bytes",aspect=>{
      const before=rose(aspect);
      const after=rose(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(18);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const original of before.regions)
        expect(after.regions.find(r=>r.id===original.id)).toEqual(original);
      for(const side of ROSE_PETAL_RIM_SIDEWALLS){
        const next=after.regions.find(r=>r.id===side.id);
        expect(next).toBeDefined();
        expect(next?.path).toBe(side.path);
        expect(next?.bounds).toEqual(side.bounds);
        expect(next?.details).toEqual(rosePetalRimContacts(side));
        expect(next?.layers).toHaveLength(3);
        expect(next?.opaqueSupport).toBe(true);
        expect(next?.craft).toBeDefined();
        const idx=after.regions.findIndex(r=>r.id===side.faceId);
        expect(after.regions[idx-1]?.id).toBe("rose-turn-"+side.faceId);
        expect(after.regions[idx+1]?.id).toBe(side.id);
        // The cuticle occupies its own unique, stable material index 40/41.
        expect(next?.layers[0].seed).toBeGreaterThanOrEqual(0);
      }
    });

  it("remains compatible with the complete existing 42 region botanical + value stack",()=>{
    const before=rose("portrait",false,true);
    const after=rose("portrait",true,true);
    expect(before.regions).toHaveLength(42);
    expect(after.regions).toHaveLength(44);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const original of before.regions)
      expect(after.regions.find(r=>r.id===original.id)).toEqual(original);
    for(const side of ROSE_PETAL_RIM_SIDEWALLS){
      expect(after.regions.find(r=>r.id===side.id)?.details).toHaveLength(4);
      expect(after.regions.find(r=>r.id===side.faceId)?.interiorDetails)
        .toHaveLength(9);
    }
  });

  it("enforces experimental opt-in and finite source, stable even for extreme seeds",()=>{
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",rosePetalRimStudy:true,
    })).toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"portrait",rosePhysicalFolds:true,
      rosePetalRimStudy:1 as never,
    })).toThrow(RangeError);
    for(const seed of [0,291,2147483000])
      expect(rose("landscape",true,true,seed))
        .toEqual(rose("landscape",true,true,seed));
    for(const subject of ["glass","architecture","fabric"] as const){
      const options={subject,aspect:"portrait" as const,seed:291};
      expect(pencilObjectStudyDrawing({...options,rosePetalRimStudy:true}))
        .toEqual(pencilObjectStudyDrawing(options));
    }
    const plain=pencilObjectStudyDrawing({subject:"rose",aspect:"landscape"});
    expect(plain.regions).toHaveLength(11);
    expect(plain.regions.some(r=>r.id.startsWith("rose-rim-"))).toBe(false);
  });
});
