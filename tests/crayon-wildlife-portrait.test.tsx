import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {
  crayonDrawingAt,crayonElementTransform,inspectCrayonScene,
} from "../registry/video/materials/crayon-scene";
import {compileFilm} from "../registry/video/film-document";
import manifest from "../examples/film/crayon-wildlife-portrait.film.json";

describe("CRAYON1 mature naturalistic wildlife portrait",()=>{
 for(const aspect of ["landscape","portrait"] as const) {
   const scene=crayonWildlifePortraitScene(aspect);
   const find=(id:string)=>{const n=scene.elements.find(n=>n.id===id);
     if(!n)throw new Error("missing "+id);return n;};
   it("builds grounded original anatomy on dark paper in "+aspect,()=>{
     expect(inspectCrayonScene(scene)).toEqual([]);
     expect(scene.paper).toBe("#1e3039");
     expect(scene.durationFrames).toBe(240);
     expect(scene.width).toBe(aspect==="landscape"?960:540);
     expect(scene.height).toBe(aspect==="landscape"?540:960);
     const required=[
       "head","shoulder-silhouette","neck-ruff","neck-chest-light",
       "far-ear","near-ear","cheek-warm-plane","cheek-light-reflection",
       "temple-shadow-plane","muzzle-projection","muzzle-light",
       "eye-dark-rim","eye-amber-iris","eye-pupil","nose","cheek-cool-shadow",
     ];
     required.forEach(id=>{
       const node=find(id);
       expect(node.kind).toBe("wax");
       if(node.kind==="wax")expect(node.coverage).toBe("opaque");
     });
     expect(find("far-ear-inner").parentId).toBe("far-ear");
     expect(find("near-ear-inner").parentId).toBe("near-ear");
     expect(find("eye-amber-iris").parentId).toBe("head");
     expect(find("near-ear").motionLagFrames).toBe(5);
     expect(find("long-whiskers").parentId).toBe("head");
     const marks=scene.elements.filter(n=>n.kind==="contour"&&n.id.endsWith("-fur"));
     expect(marks.length).toBeGreaterThan(5);
     const fur=scene.elements.filter(n=>n.kind==="contour"&&
       /fur|fibers|scratches/.test(n.id));
     expect(fur.length).toBeGreaterThan(7);
     expect(fur.reduce((n,node)=>n+node.d.split("M").length-1,0)).toBeGreaterThan(600);
   });
   it("animates blink, ear overlap and head in exact held frames in "+aspect,()=>{
     const blink=find("eyelid-blink");
     if(blink.kind!=="contour")throw new Error("eyelid expected contour");
     expect(crayonDrawingAt(blink,89).poseId).toBe("blink");
     expect(crayonDrawingAt(blink,96).poseId).toBe("base");
     const ear=find("near-ear");
     expect(crayonElementTransform(scene,ear,92)).not.toEqual(
       crayonElementTransform(scene,ear,178));
     expect(crayonElementTransform(scene,ear,178)).toBe(
       crayonElementTransform(scene,ear,178));
     const low=crayonWildlifePortraitScene(aspect,{detail:0});
     const high=crayonWildlifePortraitScene(aspect,{detail:1});
     expect(inspectCrayonScene(low)).toEqual([]);
     expect(low.elements.find(n=>n.id==="head")).toEqual(high.elements.find(n=>n.id==="head"));
     const findFur=(spec:typeof low)=>{
       const n=spec.elements.find(e=>e.id==="neck-ruff-fur");
       if(!n||n.kind!=="contour")throw new Error("missing fur");
       return n.d.split("M").length-1;
     };
     expect(findFur(high)).toBeGreaterThan(findFur(low)+100);
     expect(()=>crayonWildlifePortraitScene(aspect,{detail:-.1})).toThrow(/settings/);
     expect(()=>crayonWildlifePortraitScene(aspect,{earMotion:3})).toThrow(/settings/);
   });
   it("compiles the real film document for "+aspect,()=>{
     const compiled=compileFilm(manifest,{outputId:aspect});
     expect(compiled.ok).toBe(true);
     if(compiled.ok){
       expect(compiled.film.durationFrames).toBe(240);
       expect(compiled.film.scenes).toHaveLength(1);
     }
   });
 }
 it("renders authored naturalistic layers using the existing CRAYON1 renderer",()=>{
   const scene=crayonWildlifePortraitScene("landscape",{detail:.7});
   const html=renderToStaticMarkup(<CrayonScene spec={scene} frame={156}/>);
   expect(html).toContain('data-km-crayon-scene="crayon-wildlife-portrait-landscape"');
   expect(html).toContain('data-km-crayon-element="eye-amber-iris"');
   expect(html).toContain('data-km-crayon-element="cheek-silvery-fur"');
   expect(html).toContain('data-km-crayon-coverage="opaque"');
   expect(html).toContain('data-km-crayon-underpaint="opaque"');
   expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={156}/>)).toBe(html);
 });
});
