import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonWorldPoint,crayonDrawingAt,inspectCrayonScene} from "../registry/video/materials/crayon-scene";

/**
 * ArtCraft construction checks, not a numerical aesthetic certification.
 * Source image URLs and observed local motifs are documented separately;
 * no external artist assets are copied or packed into the application.
 */
describe("ArtCraft anatomical hare source construction",()=>{
 for(const aspect of ["landscape","portrait"] as const){
  const scene=crayonWildlifePortraitScene(aspect,{detail:1,earMotion:1});
  const part=(id:string)=>{
    const el=scene.elements.find(x=>x.id===id);
    if(!el)throw new Error("Missing ArtCraft semantic subpart "+id);
    return el;
  };
  it("replaces simple mask with attached articulated ear, eye and nasal masses in "+aspect,()=>{
    expect(inspectCrayonScene(scene)).toEqual([]);
    for(const id of [
      "far-ear-crease-shadow","near-ear-outer-lip","near-ear-canal-shadow",
      "orbital-structure","eye-brow-bone","nasal-bridge-plane",
      "malar-ridge-shadow","maxillary-junction",
      "muzzle-underside","nasal-wax-luster",
    ]){
      const el=part(id);
      expect(el.kind).toBe("wax");
      if(el.kind==="wax"){
        expect(el.coverage).toBe("opaque");
        expect(el.d).toMatch(/[QC]/);
        expect(el.d).not.toMatch(/NaN|Infinity/);
      }
    }
    for(const id of [
      "far-ear-rim-fold","near-ear-rim-fold","eye-tear-duct",
      "eye-brow-feathering","whisker-follicles","malar-form-creases",
      "contour-rooted-cheek-tufts",
    ]){
      expect(part(id).kind).toBe("contour");
    }
    expect(part("near-ear-canal-shadow").parentId).toBe("near-ear");
    expect(part("near-ear-outer-lip").parentId).toBe("near-ear");
    expect(part("far-ear-crease-shadow").parentId).toBe("far-ear");
    expect(part("nasal-bridge-plane").parentId).toBe("head");
    expect(part("muzzle-underside").parentId).toBe("head");
    expect(part("maxillary-junction").parentId).toBe("head");
    // The hidden jaw/bridge underpaint must overlap both adjacent wax
    // masses, or paper could show through as a floating triangular gap.
    const join=part("maxillary-junction");
    const muzzle=part("muzzle-projection");
    const under=part("muzzle-underside");
    if(join.kind!=="wax"||muzzle.kind!=="wax"||under.kind!=="wax")
      throw new Error("Missing maxillary paint mass");
    const overlap=(a:typeof join,b:typeof join)=>{
      const x0=Math.max(a.bounds.x,b.bounds.x),y0=Math.max(a.bounds.y,b.bounds.y);
      const x1=Math.min(a.bounds.x+a.bounds.width,b.bounds.x+b.bounds.width);
      const y1=Math.min(a.bounds.y+a.bounds.height,b.bounds.y+b.bounds.height);
      return Math.max(0,x1-x0)*Math.max(0,y1-y0);
    };
    expect(overlap(join,muzzle)).toBeGreaterThan(4000);
    expect(overlap(join,under)).toBeGreaterThan(1000);
    for(const id of ["orbital-transition-fur","nasal-bridge-fur",
      "maxillary-connected-fur","whisker-pad-underfur","near-ear-root-fur"]){
      const ink=part(id);
      expect(ink.kind).toBe("contour");
      if(ink.kind==="contour"){
        expect(ink.clipToParent).toBe(true);
        expect((ink.d.match(/M/g)??[]).length).toBeGreaterThan(25);
      }
    }
    expect(part("eye-brow-bone").parentId).toBe("head");
    expect(part("whisker-follicles").parentId).toBe("head");
    expect(part("near-ear-inner").parentId).toBe("near-ear");
    expect(part("eye-amber-iris").parentId).toBe("head");
    // ArtCraft: the ocular aperture is built from contiguous, named
    // anatomical planes, never a huge black symbol with a small gold dot.
    for(const id of ["eye-bone-light-shelf","eye-upper-lid-overhang",
      "eye-lower-fur-fold","eye-medial-canthus"]){
      const node=part(id);
      expect(node.kind).toBe("wax");
      expect(node.parentId).toBe("head");
      if(node.kind==="wax"){
        expect(node.coverage).toBe("opaque");
        expect(node.d).toMatch(/[CQ]/);
      }
    }
    const limbus=part("eye-dark-rim"),iris=part("eye-amber-iris");
    const socket=part("eye-socket"),lid=part("eyelid-painted-occlusion");
    if(limbus.kind!=="wax"||iris.kind!=="wax"||
      socket.kind!=="wax"||lid.kind!=="wax")
      throw new Error("Missing layered ocular anatomy");
    // Authored source proportions, not a claim of pixel/reference fidelity.
    expect(iris.bounds.width/limbus.bounds.width).toBeGreaterThan(.58);
    expect(iris.bounds.width/limbus.bounds.width).toBeLessThan(.75);
    expect(limbus.bounds.width/socket.bounds.width).toBeGreaterThan(.56);
    expect(lid.drawings?.length).toBe(4);
    expect(lid.drawings?.[0].bounds.x).toBeLessThan(iris.bounds.x);
    expect((lid.drawings?.[0].bounds.x??0)+
      (lid.drawings?.[0].bounds.width??0))
      .toBeGreaterThan(iris.bounds.x+iris.bounds.width);
    expect(lid.drawings?.[0].bounds.y).toBeLessThan(iris.bounds.y);
    expect((lid.drawings?.[0].bounds.y??0)+
      (lid.drawings?.[0].bounds.height??0))
      .toBeGreaterThan(iris.bounds.y+iris.bounds.height);
    const lower=part("eye-lower-fur-fibers");
    expect(lower.kind).toBe("contour");
    expect(lower.parentId).toBe("eye-lower-fur-fold");
    if(lower.kind==="contour"){
      expect(lower.clipToParent).toBe(true);
      expect((lower.d.match(/Q/g)??[]).length).toBeGreaterThanOrEqual(3);
    }
    expect(scene.elements.length).toBeLessThan(240);
  });
  it("holds anatomical root, ear tips and muzzle entirely inside the rendered page in "+aspect,()=>{
    const body=part("shoulder-silhouette");
    expect(body.placement?.scale).toBe(.98);
    for(const frame of [0,85,135,181,239]){
      for(const [id,coordinate] of [
        ["far-ear",{x:-21,y:-328}],["near-ear",{x:139,y:-308}],
        ["nose",{x:-207,y:19}],["head",{x:-56,y:-57}],
      ] as const){
        const p=crayonWorldPoint(scene,part(id),frame,coordinate);
        expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(scene.width);
        expect(p.y).toBeGreaterThan(9);
        expect(p.y).toBeLessThan(scene.height);
      }
    }
  });
  it("does not break held eyelid redraw or motion parentage in "+aspect,()=>{
    const lid=part("eyelid-painted-occlusion");
    if(lid.kind!=="wax")throw new Error("Missing opaque eyelid");
    expect(lid.coverage).toBe("opaque");
    expect(crayonDrawingAt(lid,89).d).not.toBe(crayonDrawingAt(lid,95).d);
    expect(crayonDrawingAt(lid,203).d).not.toBe(crayonDrawingAt(lid,209).d);
    const root=part("shoulder-silhouette");
    expect(part("head").parentId).toBe(root.id);
    const iris=part("iris-gold-radials");
    expect(iris.parentId).toBe("eye-amber-iris");
    expect(iris.kind).toBe("contour");
    if(iris.kind==="contour")expect(iris.clipToParent).toBe(true);
  });
 }
 it("SSR renders true original wax elements and a solid body on the ArtCraft final frame",()=>{
   const scene=crayonWildlifePortraitScene("landscape");
   const out=renderToStaticMarkup(<CrayonScene spec={scene} frame={237}/>);
   for(const name of ["orbital-structure","nasal-bridge-plane","near-ear-canal-shadow",
     "muzzle-underside","maxillary-junction","whisker-follicles",
     "eye-upper-lid-overhang","eye-lower-fur-fold","eye-medial-canthus"]){
     expect(out).toContain('data-km-crayon-element="'+name+'"');
   }
   expect(out).toContain('data-km-crayon-underpaint="opaque"');
   expect(out).toContain('data-km-crayon-coverage="opaque"');
   expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={237}/>)).toBe(out);
 });
});
