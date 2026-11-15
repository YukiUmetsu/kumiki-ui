import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonPerformanceScene} from "../src/video/crayon-performance-fixtures";
import {crayonFormHatching} from "../src/video/crayon-editorial-character-craft";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonDrawingAt,inspectCrayonScene} from "../registry/video/materials/crayon-scene";

describe("Editorial crayon field-naturalist character",()=>{
 it("renders deterministic, bounded, form-directed hatch curves",()=>{
   const form={seed:87,cx:0,cy:-10,rx:18,ry:26,count:65,angle:-62,length:10};
   const d=crayonFormHatching(form);
   expect(d.match(/M/g)).toHaveLength(65);
   expect(d).toContain(" Q");
   expect(d).not.toMatch(/NaN|Infinity/);
   expect(crayonFormHatching(form)).toBe(d);
   expect(crayonFormHatching({...form,seed:88})).not.toEqual(d);
   expect(crayonFormHatching({...form,count:0})).toBe("");
   expect(()=>crayonFormHatching({...form,count:300})).toThrow(/hatching/);
   expect(()=>crayonFormHatching({...form,rx:Infinity})).toThrow(/hatching/);
 });
 for(const aspect of ["landscape","portrait"] as const){
  const scene=crayonPerformanceScene(aspect);
  const byId=(id:string)=>{const n=scene.elements.find(e=>e.id===id);
    if(!n)throw new Error("missing "+id);return n;};
  it("has opaque anatomical volumes and tailored garments in "+aspect,()=>{
    expect(inspectCrayonScene(scene)).toEqual([]);
    for(const id of ["head","body","shin-back","shin-front","foot-back",
      "foot-front","coat-left-panel","coat-right-panel","coat-lapel-left",
      "coat-lapel-right","face-temple-shadow","face-cheek-light",
      "muzzle-jowl-shadow","hand-glove","flower-petals"]){
      const n=byId(id);
      expect(n.kind).toBe("wax");
      if(n.kind==="wax")expect(n.coverage).toBe("opaque");
    }
    for(const id of ["ear-left-fold","ear-right-fold","nose-bridge-anatomy",
      "coat-seam-architecture","coat-pocket-structure","iris-petal-hatching"]){
      expect(byId(id).kind).toBe("contour");
    }
    expect(byId("left-ear-inner").parentId).toBe("left-ear");
    expect(byId("right-ear-inner").parentId).toBe("right-ear");
    expect(byId("face-cheek-grain").parentId).toBe("head");
    expect(byId("iris-petal-hatching").parentId).toBe("front-arm");
    expect(byId("foot-front").contacts?.[0]?.anchor.y).toBe(166);
  });
  it("preserves pose and opacity while hatching density changes in "+aspect,()=>{
    const low=crayonPerformanceScene(aspect,{editorialDetail:0});
    const high=crayonPerformanceScene(aspect,{editorialDetail:1});
    expect(inspectCrayonScene(low)).toEqual([]);
    const head=byId("head"),headLow=low.elements.find(e=>e.id==="head");
    expect(headLow).toEqual(head);
    const lowHatch=low.elements.find(e=>e.id==="face-fur-grain");
    const highHatch=high.elements.find(e=>e.id==="face-fur-grain");
    if(!lowHatch||!highHatch||lowHatch.kind!=="contour"||highHatch.kind!=="contour")
      throw new Error("missing hatching");
    expect(lowHatch.d.match(/M/g)).toHaveLength(4);
    expect(highHatch.d.match(/M/g)?.length).toBeGreaterThan(20);
    const mouth=byId("mouth");
    if(mouth.kind!=="contour")throw new Error("missing mouth");
    expect(crayonDrawingAt(mouth,83).poseId).toBe("ah");
    const html=renderToStaticMarkup(<CrayonScene spec={high} frame={176}/>);
    expect(html).toContain('data-km-crayon-element="coat-right-panel"');
    expect(html).toContain('data-km-crayon-element="face-cheek-grain"');
    expect(html).toContain('data-km-crayon-underpaint="opaque"');
    expect(html).toEqual(renderToStaticMarkup(<CrayonScene spec={high} frame={176}/>));
    expect(()=>crayonPerformanceScene(aspect,{editorialDetail:2})).toThrow(/detail/);
  });
 }
});
