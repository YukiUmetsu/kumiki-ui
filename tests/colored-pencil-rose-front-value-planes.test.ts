import {describe,expect,it} from "vitest";
import {ROSE_FRONT_VALUE_PLANES,inspectRoseFrontValuePlanes}
  from "../src/video/colored-pencil-rose-front-value-planes";
import {pencilObjectStudyDrawing}
  from "../src/video/colored-pencil-object-studies";
import {inspectPencilFoundationDrawing}
  from "../registry/video/colored-pencil-foundation";

const rose=(aspect:"landscape"|"portrait",value=false,full=false,seed=233)=>
  pencilObjectStudyDrawing({
    subject:"rose",aspect,seed,
    rosePhysicalFolds:true,roseFrontValueStudy:value,
    roseLaminaStudy:full,roseLipStudy:full,roseCalyxStudy:full,
    rosePinnateStudy:full,roseInnerWhorlStudy:full,roseMiddleCupStudy:full,
  });
const ids=ROSE_FRONT_VALUE_PLANES.map(p=>p.id);

describe("CP-F1 source-area dry pencil value planes for frontal rose",()=>{
  it("authors two different transparent color envelopes per independent physical petal",()=>{
    expect(inspectRoseFrontValuePlanes()).toEqual([]);
    expect(ROSE_FRONT_VALUE_PLANES.map(p=>p.surface)).toEqual([
      "cast-shadow","glaze","cast-shadow","glaze",
    ]);
    expect(new Set(ids).size).toBe(4);
    expect(new Set(ROSE_FRONT_VALUE_PLANES.map(p=>p.path)).size).toBe(4);
    for(const plane of ROSE_FRONT_VALUE_PLANES){
      expect(plane.bounds[2]*plane.bounds[3]).toBeGreaterThan(1000);
      expect(plane.details).toHaveLength(2);
      expect(new Set(plane.details.map(d=>d.id)).size).toBe(2);
      expect(plane.details.every(d=>d.startFrame>=200&&d.startFrame<=280))
        .toBe(true);
    }
  });
  it.each(["landscape","portrait"] as const)(
    "adds exactly four non-opaque area regions while preserving old physical petal bytes in %s",aspect=>{
      const before=rose(aspect,false);
      const after=rose(aspect,true);
      expect(before.regions).toHaveLength(16);
      expect(after.regions).toHaveLength(20);
      expect(inspectPencilFoundationDrawing(after)).toEqual([]);
      for(const original of before.regions)
        expect(after.regions.find(r=>r.id===original.id)).toEqual(original);
      for(const plane of ROSE_FRONT_VALUE_PLANES){
        const parentIndex=after.regions.findIndex(r=>r.id===plane.parent);
        const index=after.regions.findIndex(r=>r.id===plane.id);
        expect(index).toBeGreaterThan(parentIndex);
        expect(index).toBeLessThan(parentIndex+3);
        const zone=after.regions[index];
        expect(zone.opaqueSupport).toBe(false);
        expect(zone.craft).toBeUndefined();
        expect(zone.path).toBe(plane.path);
        expect(zone.bounds).toEqual(plane.bounds);
        expect(zone.details).toEqual(plane.details);
        expect(zone.contour.opacity).toBe(0);
        expect(zone.underpaintOpacity).toBe(plane.surface==="cast-shadow"?.28:.13);
        expect(zone.layers[0].spacing).toBeLessThan(4);
        expect(zone.layers[0].pressure).toBeGreaterThan(.30);
        expect(zone.layers.length).toBeGreaterThanOrEqual(3);
        expect(after.foundation?.surfaces[plane.id]).toBe(plane.surface);
      }
    });
  it("composes with all previously authored optical and botanical studies under cap",()=>{
    const before=rose("landscape",false,true);
    const after=rose("landscape",true,true);
    expect(before.regions).toHaveLength(42);
    expect(after.regions).toHaveLength(46);
    expect(inspectPencilFoundationDrawing(after)).toEqual([]);
    for(const original of before.regions)
      expect(after.regions.find(r=>r.id===original.id)).toEqual(original);
    expect(after.regions.findIndex(r=>r.id==="rose-front-right-warm-bounce"))
      .toBeLessThan(after.regions.findIndex(r=>r.id==="inner-fold"));
  });
  it("rejects value study without a physical folded parent, ignores other subjects and keeps seeks deterministic",()=>{
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",roseFrontValueStudy:true,
    })).toThrow(/physical fold/);
    expect(()=>pencilObjectStudyDrawing({
      subject:"rose",aspect:"landscape",rosePhysicalFolds:true,
      roseFrontValueStudy:"yes" as never,
    })).toThrow(RangeError);
    for(const subject of ["glass","architecture","fabric"] as const){
      const base={subject,aspect:"portrait" as const};
      expect(pencilObjectStudyDrawing({...base,roseFrontValueStudy:true}))
        .toEqual(pencilObjectStudyDrawing(base));
    }
    for(const seed of [0,233,2147483000])
      expect(rose("portrait",true,true,seed)).toEqual(rose("portrait",true,true,seed));
  });
});
