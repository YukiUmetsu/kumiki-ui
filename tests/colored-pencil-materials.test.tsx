import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PencilDrawing } from "../registry/video/colored-pencil-react";
import { inspectPencilDrawing, hatchPencilRegion } from "../registry/video/colored-pencil";
import { createPencilMaterialRegion, PENCIL_MATERIALS } from "../registry/video/colored-pencil-materials";
import { PENCIL_OBJECT_STUDIES, pencilObjectStudyDrawing } from "../src/video/colored-pencil-object-studies";

const materialInput = {
  id:"sample",path:"M0 0 L80 0 L70 65 L0 65 Z",
  bounds:[0,0,80,65] as const,palette:["#CCA090","#76544D","#F5D6B7"] as const,
  seed:42,startFrame:30,durationFrames:135,
};
describe("coloured-pencil universal material atlas", () => {
  it("exposes ten bounded semantic material recipes to arbitrary authored SVG geometry", () => {
    expect(PENCIL_MATERIALS).toHaveLength(10);
    const materials = PENCIL_MATERIALS.map(surface => createPencilMaterialRegion({
      ...materialInput,surface,
    }));
    for (const region of materials) {
      expect(region.path).toBe(materialInput.path);
      expect(region.layers).toHaveLength(3);
      expect(region.opaqueSupport).toBe(region.id==="glass"?false:region.opaqueSupport);
      expect(region.layers.every(p => p.pressure>=0 && p.pressure<=1)).toBe(true);
      expect(inspectPencilDrawing({
        version:1,seed:100,width:960,height:540,paper:"#FFFDF9",
        paperTooth:.75,regions:[region],
      })).toEqual([]);
    }
    expect(materials[3].opaqueSupport).toBe(false); // clear glass
    expect(materials.filter(region=>region.opaqueSupport)).toHaveLength(9);
    expect(materials[0].clipDetails).toBe(true);
    expect(materials[3].clipDetails).toBe(false);
    expect(materials[4].layers[2].texture).toBe("fiber");
    expect(materials[5].layers[1].texture).toBe("stipple");
    expect(materials[6].layers[1].texture).toBe("fiber");
  });

  it("rejects unsupported material types and invalid individual geometry / palette", () => {
    expect(() => createPencilMaterialRegion({
      ...materialInput,surface:"hologram" as "glass",
    })).toThrow(/Unknown coloured-pencil material/);
    expect(() => createPencilMaterialRegion({
      ...materialInput,surface:"petal",bounds:[1,1,-3,8],
    })).toThrow(RangeError);
    expect(() => createPencilMaterialRegion({
      ...materialInput,surface:"glass",palette:["red","#76544D","#F5D6B7"],
    })).toThrow(RangeError);
  });

  it("gives glass transparency without leaking backdrop through opaque paper-backed objects", () => {
    const original = pencilObjectStudyDrawing({subject:"glass",aspect:"landscape"});
    const vessel = original.regions.find(region=>region.id==="pitcher")!;
    const handle = original.regions.find(region=>region.id==="handle")!;
    const lemon = original.regions.find(region=>region.id==="lemon")!;
    expect(vessel.opaqueSupport).toBe(false);
    expect(handle.opaqueSupport).toBe(false);
    expect(lemon.opaqueSupport).toBe(true);
    const full=renderToStaticMarkup(<PencilDrawing drawing={original} frame={325}/>);
    expect(full).toContain('data-km-pencil-region="pitcher"');
    expect(full).toContain('data-km-pencil-support="lemon"');
    expect(full).not.toContain('data-km-pencil-support="pitcher"');
    expect(full).toContain('data-km-pencil-details');
  });

  for (const subject of PENCIL_OBJECT_STUDIES) {
    for(const aspect of ["landscape","portrait"] as const) {
      it("authors inspectable, deterministic "+subject+" material composition in "+aspect, () => {
        const paper = pencilObjectStudyDrawing({subject,aspect});
        expect(inspectPencilDrawing(paper)).toEqual([]);
        expect(paper.regions.length).toBeGreaterThan(3);
        expect(paper.regions.length).toBeLessThan(24);
        expect(paper.width).toBe(aspect==="landscape"?960:540);
        expect(paper.height).toBe(aspect==="landscape"?540:960);
        expect(paper.regions.every(region=>region.layers.length===3)).toBe(true);
        const first=paper.regions[0];
        expect(hatchPencilRegion(first,first.layers[0]))
          .toEqual(hatchPencilRegion(first,first.layers[0]));
        expect(pencilObjectStudyDrawing({subject,aspect})).toEqual(paper);
        const before=pencilObjectStudyDrawing({subject,aspect,seed:175});
        expect(before.regions[0].layers[0].seed).not.toBe(first.layers[0].seed);
        expect(inspectPencilDrawing(before)).toEqual([]);
      });
    }
  }

  it("protects source topology: overlapping rose petals, glazed glass, window recesses, cloth creases", () => {
    const rose=pencilObjectStudyDrawing({subject:"rose",aspect:"landscape"});
    expect(rose.regions.filter(r=>r.id.includes("petal")||r.id==="heart")).toHaveLength(4);
    expect(rose.regions.some(r=>r.id==="inner-fold")).toBe(true);
    expect(rose.regions.find(r=>r.id==="outer-left")!.clipDetails).toBe(true);
    const brick=pencilObjectStudyDrawing({subject:"architecture",aspect:"landscape"});
    expect(brick.regions.filter(r=>r.id.startsWith("recess-"))).toHaveLength(3);
    expect(brick.regions.filter(r=>r.id.startsWith("window-"))).toHaveLength(3);
    expect(brick.regions.find(r=>r.id==="facade")!.details![0].path.match(/M/g)!.length)
      .toBeGreaterThan(100);
    const textile=pencilObjectStudyDrawing({subject:"fabric",aspect:"landscape"});
    expect(textile.regions.filter(r=>r.id.includes("cloth")||r.id.includes("fold"))).toHaveLength(3);
    expect(textile.regions.filter(r=>r.id.startsWith("brass-"))).toHaveLength(2);
  });

  it("rejects malformed studio inputs and keeps material pressure in bounds", () => {
    expect(()=>pencilObjectStudyDrawing({subject:"unknown" as "rose",aspect:"landscape"}))
      .toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"other" as "portrait"}))
      .toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"landscape",paperTooth:-.01}))
      .toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"landscape",pressure:1.25}))
      .toThrow(RangeError);
    expect(()=>pencilObjectStudyDrawing({subject:"rose",aspect:"landscape",seed:-1}))
      .toThrow(RangeError);
    const high=pencilObjectStudyDrawing({subject:"rose",aspect:"portrait",pressure:1.2});
    expect(inspectPencilDrawing(high)).toEqual([]);
    expect(high.regions.every(r=>r.layers.every(l=>l.pressure<=1))).toBe(true);
  });
});
