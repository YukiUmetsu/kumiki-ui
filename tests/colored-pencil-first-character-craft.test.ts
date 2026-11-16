import {describe,it,expect} from "vitest";
import {newCharacterHeadStageOne,NEW_CHARACTER_01_ID} from
  "../src/video/colored-pencil-first-character";
import {pencilLivingStudyDrawing} from
  "../src/video/colored-pencil-living-studies";

/** Not a source-photo fidelity fixture. All controls compare the SAME actual
 * anonymous head: the whole cranial outline and all previously authored
 * micro-elements MUST survive the new contour-anchored dry contacts.
 */
const values=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>t.id?.startsWith("newhead-value-"));
const other=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>!t.id?.startsWith("newhead-value-"));

describe("ArtCraft head-only perimeter-connected dry-pencil fidelity",()=>{
  it("adds independent multi-pressure ANAT1 + cranial-vault contacts without erasing any original art",()=>{
    const enhanced=newCharacterHeadStageOne(271,true);
    const earlier=newCharacterHeadStageOne(271,false);
    expect(enhanced).toHaveLength(1);
    expect(enhanced[0].id).toBe(NEW_CHARACTER_01_ID);
    // The actual 23 lower contour points, 11 sculpted vault anchors and
    // all existing five-value skin and six pigment planes must be preserved.
    expect(enhanced[0].path).toBe(earlier[0].path);
    expect(enhanced[0].bounds).toEqual(earlier[0].bounds);
    // Registry enforces <=80 traces; head already has 77. Six separate
    // material subpasses attach to existing three original value traces,
    // leaving every preexisting ID, path prefix and pressure untouched.
    expect(enhanced[0].details).toHaveLength(77);
    expect(earlier[0].details).toHaveLength(77);
    expect(other(enhanced)).toEqual(other(earlier));
    const before=values(earlier),after=values(enhanced);
    expect(after).toHaveLength(3);
    expect(after.map(t=>t.id)).toEqual(before.map(t=>t.id));
    for(let i=0;i<3;i++){
      const original=before[i],enhancedTrace=after[i];
      expect(enhancedTrace.path.startsWith(original.path+" ")).toBe(true);
      expect(enhancedTrace.path.match(/M/g)!.length)
        .toBeGreaterThan(original.path.match(/M/g)!.length+50);
      expect(enhancedTrace.path).not.toMatch(/NaN|Infinity|<svg|image|filter/);
      expect(enhancedTrace.color).toBe(original.color);
      expect(enhancedTrace.width).toBe(original.width);
      expect(enhancedTrace.opacity).toBe(original.opacity);
      expect(enhancedTrace.startFrame).toBe(original.startFrame);
      expect(enhancedTrace.durationFrames).toBe(original.durationFrames);
    }
  });
  it("is repeatable and seeded without changing unrelated anatomy or legacy geometries",()=>{
    const a=newCharacterHeadStageOne(75,true);
    const b=newCharacterHeadStageOne(75,true);
    const c=newCharacterHeadStageOne(76,true);
    expect(values(a)).toEqual(values(b));
    expect(values(a)[0].path).not.toBe(values(c)[0].path);
    expect(a[0].path).toEqual(c[0].path);
    expect(other(a).length).toBe(other(c).length);
  });
  it("provides an honest Storybook A/B switch on both output formats, not global stylization",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const base=pencilLivingStudyDrawing({
        subject:"portrait",aspect,seed:271,headContourCraft:false,
      });
      const changed=pencilLivingStudyDrawing({
        subject:"portrait",aspect,seed:271,headContourCraft:true,
      });
      expect(changed.width).toBe(base.width);
      expect(changed.height).toBe(base.height);
      expect(changed.regions).toHaveLength(base.regions.length);
      expect(changed.regions[0].path).toEqual(base.regions[0].path);
      const oldTrace=base.regions[0].details!.find(t=>t.id==="newhead-value-0")!;
      const newTrace=changed.regions[0].details!.find(t=>t.id==="newhead-value-0")!;
      expect(changed.regions[0].details).toHaveLength(base.regions[0].details!.length);
      expect(base.regions[0].details).toHaveLength(77);
      expect(newTrace.path.startsWith(oldTrace.path+" ")).toBe(true);
      // A colour-pencil subject change must never receive head-specific art.
      for(const subject of ["fox","valley"] as const){
        const x=pencilLivingStudyDrawing({
          subject,aspect,seed:13,headContourCraft:false,
        });
        const y=pencilLivingStudyDrawing({
          subject,aspect,seed:13,headContourCraft:true,
        });
        expect(x).toEqual(y);
      }
    }
  });
  it("rejects non-boolean switches and invalid drawing seeds",()=>{
    expect(()=>newCharacterHeadStageOne(271,"yes" as never))
      .toThrow(/boolean/i);
    expect(()=>newCharacterHeadStageOne(-1)).toThrow(/seed/i);
    expect(()=>pencilLivingStudyDrawing({subject:"portrait",
      aspect:"landscape",headContourCraft:1 as never}))
      .toThrow(/boolean/i);
  });
});
