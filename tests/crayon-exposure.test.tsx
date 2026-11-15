import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { crayonExposureAt,crayonExposureStrokes,crayonWaxEdgeDashes } from "../registry/video/materials/crayon-exposure";
import { CrayonScene } from "../registry/video/materials/crayon-scene-react";
import { crayonDrawingAt,inspectCrayonScene } from "../registry/video/materials/crayon-scene";
import { crayonDragonVillageScene } from "../src/video/crayon-dragon-village-fixtures";
import { crayonPerformanceScene } from "../src/video/crayon-performance-fixtures";
import { crayonCharacterDrawScene } from "../src/video/crayon-character-draw-fixtures";

describe("CRAYON1 held hand-painted exposure and anatomical redraw",()=>{
  it("samples frame-addressed exposures without temporal drift or sequence dependence",()=>{
    const style={holdFrames:3 as const,strength:.62,beginFrame:184};
    expect(crayonExposureAt(0,269,style)).toBe(0);
    expect(crayonExposureAt(184,269,style)).toBe(0);
    expect(crayonExposureAt(185,269,style)).toBe(0);
    expect(crayonExposureAt(186,269,style)).toBe(0);
    expect(crayonExposureAt(187,269,style)).toBe(1);
    const a=crayonExposureAt(234,269,style);
    crayonExposureAt(90,269,style);
    crayonExposureAt(280,269,style);
    expect(crayonExposureAt(234,269,style)).toBe(a);
    expect(crayonExposureAt(234,269,style,true)).toBe(0);
    expect(()=>crayonExposureAt(-1,269,style)).toThrow();
    expect(()=>crayonExposureAt(234,269,{...style,holdFrames:0 as 3})).toThrow();
    expect(()=>crayonExposureAt(234,269,{...style,strength:Infinity})).toThrow();
    expect(()=>crayonExposureAt(234,269,{...style,beginFrame:-1})).toThrow();
  });
  it("repaints small deterministic local marks rather than translating whole characters",()=>{
    const bounds={x:-70,y:-200,width:180,height:280};
    const v=crayonExposureStrokes(bounds,198,8,.7);
    expect(v).toHaveLength(14);
    expect(v).toEqual(crayonExposureStrokes(bounds,198,8,.7));
    expect(v).not.toEqual(crayonExposureStrokes(bounds,198,9,.7));
    expect(crayonExposureStrokes(bounds,198,8,0)).toEqual([]);
    expect(v.every(mark=>mark.d.startsWith("M")&&mark.width<=3&&mark.opacity<=.3)).toBe(true);
    expect(()=>crayonExposureStrokes({...bounds,width:5000},198,8,.7)).toThrow();
    expect(()=>crayonExposureStrokes(bounds,198,-1,.7)).toThrow();
    expect(()=>crayonExposureStrokes(bounds,198,8,2)).toThrow();
    const edge=crayonWaxEdgeDashes(131,.7);
    expect(edge).toEqual(crayonWaxEdgeDashes(131,.7));
    expect(edge.split(" ")).toHaveLength(24);
    expect(()=>crayonWaxEdgeDashes(131,1.1)).toThrow();
  });
  for(const aspect of ["landscape","portrait"] as const){
    it("deforms wing geometry and linked bones on four drawing exposures in "+aspect,()=>{
      const scene=crayonDragonVillageScene(aspect);
      expect(inspectCrayonScene(scene)).toEqual([]);
      const wing=scene.elements.find(n=>n.id==="dragon-wing-near");
      const ribs=scene.elements.find(n=>n.id==="dragon-wing-near-ribs");
      const neck=scene.elements.find(n=>n.id==="dragon-neck");
      expect(wing?.kind).toBe("wax");
      expect(ribs?.kind).toBe("contour");
      if(!wing||wing.kind!=="wax"||!ribs||ribs.kind!=="contour"||
        !neck||neck.kind!=="wax")throw Error("missing deforming parts");
      expect(wing.drawings).toHaveLength(5);
      expect(ribs.drawings).toHaveLength(5);
      expect(neck.drawings).toHaveLength(3);
      expect(crayonDrawingAt(wing,137).d).not.toEqual(crayonDrawingAt(wing,138).d);
      expect(crayonDrawingAt(wing,181).d).not.toEqual(crayonDrawingAt(wing,182).d);
      expect(crayonDrawingAt(wing,271).d).not.toEqual(crayonDrawingAt(wing,272).d);
      expect(crayonDrawingAt(wing,138).d).not.toEqual(crayonDrawingAt(wing,182).d);
      expect(crayonDrawingAt(ribs,137).d).not.toEqual(crayonDrawingAt(ribs,138).d);
      expect(crayonDrawingAt(neck,167).d).not.toEqual(crayonDrawingAt(neck,168).d);
      expect(wing.redraw).toMatchObject({strength:.68,holdFrames:3,beginFrame:180});
      expect(wing.coverage).toBe("opaque");
      expect(wing.edgeRoughness).toBeGreaterThan(.6);
      expect(scene.elements.find(n=>n.id==="sky-paper")).toMatchObject({coverage:"open"});
      const a=renderToStaticMarkup(<CrayonScene spec={scene} frame={221}/>);
      const b=renderToStaticMarkup(<CrayonScene spec={scene} frame={221}/>);
      expect(a).toEqual(b);
      expect(a).toContain('data-km-crayon-repaint=""');
      expect(a).toContain('data-km-crayon-frayed-rim=""');
      expect(a).toContain('data-km-crayon-underpaint="opaque"');
    });
  }
  it("preserves original sculpt and permits no-redraw motion for static materials",()=>{
    const none=crayonDragonVillageScene("landscape",{redrawStrength:0});
    expect(inspectCrayonScene(none)).toEqual([]);
    const wing=none.elements.find(n=>n.id==="dragon-wing-near");
    expect(wing?.kind==="wax"&&wing.redraw?.strength).toBe(0);
    const scene=crayonDragonVillageScene("landscape",{exposureFrames:2,redrawStrength:1});
    expect(inspectCrayonScene(scene)).toEqual([]);
    expect(()=>crayonDragonVillageScene("landscape",{exposureFrames:7 as 3})).toThrow();
    expect(()=>crayonDragonVillageScene("landscape",{redrawStrength:-1})).toThrow();
  });
  it("retimes independent actor-surface exposures after character construction",()=>{
    const performance=crayonPerformanceScene("landscape");
    const drawIn=crayonCharacterDrawScene("landscape");
    expect(inspectCrayonScene(performance)).toEqual([]);
    expect(inspectCrayonScene(drawIn)).toEqual([]);
    const performanceBody=performance.elements.find(n=>n.id==="body");
    const drawBody=drawIn.elements.find(n=>n.id==="body");
    expect(performanceBody?.kind==="wax"&&performanceBody.redraw?.beginFrame).toBe(184);
    expect(drawBody?.kind==="wax"&&drawBody.redraw?.beginFrame).toBe(408);
  });
});
