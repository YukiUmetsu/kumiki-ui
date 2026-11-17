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
const fields=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>t.id?.startsWith("newhead-plane-"));
const other=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>!t.id?.startsWith("newhead-plane-"));

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
    // All added microcontacts occupy the same existing 54 physical colour
    // planes. The existing 15 ANAT1 values and three 114-mark guide fans
    // must be byte-identical and the 80-trace limit never exceeded.
    expect(enhanced[0].details).toHaveLength(77);
    expect(earlier[0].details).toHaveLength(77);
    expect(other(enhanced)).toEqual(other(earlier));
    const before=fields(earlier),after=fields(enhanced);
    expect(before).toHaveLength(54);
    expect(after.map(t=>t.id)).toEqual(before.map(t=>t.id));
    let extraTotal=0;
    for(let i=0;i<after.length;i++){
      const original=before[i],extra=after[i];
      expect(extra.path.startsWith(original.path)).toBe(true);
      expect(extra.path.length).toBeLessThanOrEqual(12000);
      expect(extra.path).not.toMatch(/NaN|Infinity|<svg|image|filter/);
      expect(extra.color).toBe(original.color);
      expect(extra.width).toBe(original.width);
      expect(extra.opacity).toBe(original.opacity);
      expect(extra.startFrame).toBe(original.startFrame);
      expect(extra.durationFrames).toBe(original.durationFrames);
      extraTotal+=(extra.path.match(/M/g)??[]).length-
        (original.path.match(/M/g)??[]).length;
    }
    // No stroke is silently truncated to stay under the per-trace budget.
    expect(extraTotal).toBeGreaterThan(250);
    expect(values(enhanced).map(t=>(t.path.match(/M/g)??[]).length))
      .toEqual([114,114,114]);
  });
  it("is repeatable and seeded without changing unrelated anatomy or legacy geometries",()=>{
    const a=newCharacterHeadStageOne(75,true);
    const b=newCharacterHeadStageOne(75,true);
    const c=newCharacterHeadStageOne(76,true);
    expect(fields(a)).toEqual(fields(b));
    expect(fields(a)[0].path).not.toBe(fields(c)[0].path);
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
      const orig=base.regions[0].details!;
      const next=changed.regions[0].details!;
      expect(orig).toHaveLength(77);
      expect(next).toHaveLength(77);
      expect(next.filter(t=>t.id?.startsWith("newhead-value-")))
        .toEqual(orig.filter(t=>t.id?.startsWith("newhead-value-")));
      const oldField=orig.find(t=>t.id==="newhead-plane-cranial-0-0")!;
      const newField=next.find(t=>t.id==="newhead-plane-cranial-0-0")!;
      expect(newField.path.startsWith(oldField.path)).toBe(true);
      expect(next.some(t=>t.id?.startsWith("newhead-plane-")&&
        t.path.length>orig.find(p=>p.id===t.id)!.path.length)).toBe(true);
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
