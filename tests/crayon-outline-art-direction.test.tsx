import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {WaxRegion,Paper} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";

const draw=(outlineOpacity:number)=>renderToStaticMarkup(<svg viewBox="0 0 150 130">
  <Paper width={150} height={130} seed={44} tooth="book-paper" strength={.7}/>
  <WaxRegion d="M10 12Q72 -5 119 27Q139 104 32 118Z"
    bounds={{x:8,y:0,width:135,height:128}}
    colors={["#bc916f","#514044","#f5d3a1"]} tooth="book-paper"
    coverage="opaque" pressure={.8} seed={44} frame={119}
    first={0} last={110} reduced={false} outlineOpacity={outlineOpacity}/>
</svg>);

describe("CRAYON1 restrained contour hierarchy",()=>{
 it("varies decorative outline only, never a solid body's pigment coverage",()=>{
   const silent=draw(0),heavy=draw(1);
   expect(silent).toContain('data-km-crayon-outline-opacity="0"');
   expect(heavy).toContain('data-km-crayon-outline-opacity="1"');
   expect(silent).toContain('data-km-crayon-underpaint="opaque"');
   expect(heavy).toContain('data-km-crayon-underpaint="opaque"');
   expect(silent).toContain('data-km-crayon-coverage="opaque"');
   expect(heavy).toContain('data-km-crayon-coverage="opaque"');
   expect(silent).not.toBe(heavy);
   expect(draw(0)).toBe(silent);
   expect(()=>draw(-.1)).toThrow(/outline opacity/);
   expect(()=>draw(1.1)).toThrow(/outline opacity/);
   expect(()=>draw(Infinity)).toThrow(/outline opacity/);
 });
 for(const aspect of ["landscape","portrait"] as const) {
   it("preserves stronger silhouette than internal fur planes in "+aspect,()=>{
     const scene=crayonWildlifePortraitScene(aspect,{detail:1});
     expect(inspectCrayonScene(scene)).toEqual([]);
     const wax=(id:string)=>{
       const node=scene.elements.find(n=>n.id===id);
       if(node?.kind!=="wax")throw new Error("Missing painted region "+id);
       return node;
     };
     expect(wax("head").outlineOpacity).toBeGreaterThan(
       wax("temple-shadow-plane").outlineOpacity!);
     expect(wax("shoulder-silhouette").outlineOpacity).toBeGreaterThan(
       wax("cheek-warm-plane").outlineOpacity!);
     expect(wax("head").coverage).toBe("opaque");
     expect(wax("cheek-warm-plane").coverage).toBe("opaque");
     const broken={...scene,elements:scene.elements.map(n=>n.id==="head"?
       {...n,outlineOpacity:1.2}:n)};
     expect(inspectCrayonScene(broken).join(" ")).toContain("outlineOpacity");
   });
 }
});
