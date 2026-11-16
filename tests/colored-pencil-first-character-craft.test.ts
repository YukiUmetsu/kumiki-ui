import {describe,it,expect} from "vitest";
import {newCharacterHeadStageOne,NEW_CHARACTER_01_ID} from
  "../src/video/colored-pencil-first-character";
import {pencilLivingStudyDrawing} from
  "../src/video/colored-pencil-living-studies";

/** Not a source-photo fidelity fixture. All controls compare the SAME actual
 * anonymous head: the whole cranial outline and all previously authored
 * micro-elements MUST survive the new contour-anchored dry contacts.
 */
const contours=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>t.id?.startsWith("newhead-contour-contact-"));
const rest=(head:ReturnType<typeof newCharacterHeadStageOne>)=>
  head[0].details!.filter(t=>!t.id?.startsWith("newhead-contour-contact-"));

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
    expect(rest(enhanced)).toEqual(earlier[0].details);
    const passes=contours(enhanced);
    expect(passes.map(p=>p.id)).toEqual([
      "newhead-contour-contact-cold-turn-0",
      "newhead-contour-contact-cold-turn-1",
      "newhead-contour-contact-warm-scumble-0",
      "newhead-contour-contact-warm-scumble-1",
      "newhead-contour-contact-lit-tooth-0",
      "newhead-contour-contact-lit-tooth-1",
    ]);
    for(const trace of passes){
      expect(trace.path).toMatch(/^M/);
      expect(trace.path.match(/M/g)!.length).toBeGreaterThan(25);
      expect(trace.path).toMatch(/Q/);
      expect(trace.path).not.toMatch(/NaN|Infinity|<svg|image|filter/);
      expect(trace.width).toBeGreaterThan(0);
      expect(trace.opacity).toBeGreaterThan(0);
      expect(trace.opacity).toBeLessThan(1);
      expect(trace.startFrame).toBeGreaterThan(100);
      expect(trace.startFrame).toBeLessThan(350);
    }
    expect(passes.some(p=>p.color==="#735E69")).toBe(true);
    expect(passes.some(p=>p.color==="#E3BEA9")).toBe(true);
  });
  it("is repeatable and seeded without changing unrelated anatomy or legacy geometries",()=>{
    const a=newCharacterHeadStageOne(75,true);
    const b=newCharacterHeadStageOne(75,true);
    const c=newCharacterHeadStageOne(76,true);
    expect(contours(a)).toEqual(contours(b));
    expect(contours(a)[0].path).not.toBe(contours(c)[0].path);
    expect(a[0].path).toEqual(c[0].path);
    expect(rest(a).length).toBe(rest(c).length);
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
      const traceIds=(which:typeof base)=>which.regions[0].details!
        .filter(t=>t.id?.startsWith("newhead-contour-contact-"));
      expect(traceIds(base)).toHaveLength(0);
      expect(traceIds(changed)).toHaveLength(6);
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
