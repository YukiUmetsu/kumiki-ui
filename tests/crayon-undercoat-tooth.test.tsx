import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {Paper,WaxRegion} from "../registry/video/materials/crayon-react";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonBotanicalDrawing} from "../src/video/crayon-drawing-system-fixtures";

const d="M-31 -42Q0 -75 38 -39Q70 0 32 51Q-27 75 -31 -42Z";
const bounds={x:-42,y:-78,width:130,height:165};
const palette=["#d6aa5b","#7b6654","#f2d9a4"] as const;
function region(grain:number,frame=119,seed=75,pressure=.84,coverage:"open"|"opaque"="opaque",
  strength=.9){
 return renderToStaticMarkup(<svg>
   <Paper seed={seed} width={180} height={180}
     tooth="wax-test-paper" strength={strength} pigmentRelief={grain>0}/>
   <rect width="180" height="180" fill="#254868"/>
   <WaxRegion d={d} bounds={bounds} colors={palette}
     pressure={pressure} coverage={coverage}
     tooth="wax-test-paper" seed={1004} underpaintTooth={grain}
     frame={frame} first={1} last={118} reduced={false}/>
 </svg>);
}
describe("opaque wax relief color contact",()=>{
 it("preserves prior undercoat visuals when grain is disabled",()=>{
   const before=region(0);
   expect(before).toContain('data-km-crayon-underpaint="opaque"');
   expect(before).not.toContain('data-km-crayon-underpaint-grain=""');
   expect(before).not.toContain('data-km-crayon-pigment-paper="dark"');
   expect(before).not.toContain('data-km-crayon-pigment-paper="light"');
   expect(before).not.toContain('data-km-crayon-undercoat-pits=""');
   expect(before).not.toContain('data-km-crayon-undercoat-ridges=""');
   expect(region(0)).toBe(before);
 });
 it("tints surface relief but never exposes a transparent silhouette",()=>{
   const html=region(.91);
   expect(html).toContain('data-km-crayon-underpaint-tooth="0.91"');
   expect(html).toContain('data-km-crayon-underpaint-grain=""');
   expect(html).toContain('data-km-crayon-undercoat-pits=""');
   expect(html).toContain('data-km-crayon-undercoat-ridges=""');
   expect(html).toContain('data-km-crayon-pigment-paper="dark"');
   expect(html).toContain('data-km-crayon-pigment-paper="light"');
   const tag=html.slice(html.lastIndexOf("<path",html.indexOf('data-km-crayon-underpaint="opaque"')),
     html.indexOf(">",html.indexOf('data-km-crayon-underpaint="opaque"'))+1);
   expect(tag).not.toContain("mask=");
   expect(tag).not.toContain("opacity=");
   expect(html).toMatch(/mask(?:ContentUnits|-content-units)="userSpaceOnUse"/);
   expect(html).not.toEqual(region(0));
   // Only a bounded number of compound paths, not a separate SVG node per pit.
   const paper=html.slice(0,html.indexOf('data-km-crayon-paper-relief=""'));
   expect((paper.match(/<path /g)??[]).length).toBeLessThan(8);
 });
 it("shares the paper seed across all wax layers and respects tooth strength",()=>{
   const a=region(1,119,71,.42),b=region(1,119,72,.42);
   expect(a).not.toEqual(b);
   const clear=region(1,119,71,.42, "opaque",0);
   expect(clear).not.toEqual(a);
   const soft=region(1,119,71,.25);
   const firm=region(1,119,71,.94);
   const strength=(markup:string)=>Number(markup.match(/data-km-crayon-paper-contact="([0-9.]+)"/)?.[1]);
   expect(strength(soft)).toBeGreaterThan(strength(firm));
   expect(soft).not.toEqual(firm);
 });
 it("does not reveal fully formed texture before wax is deposited",()=>{
   expect(region(.8,1)).not.toContain('data-km-crayon-underpaint-grain=""');
   const partial=region(.8,69);
   expect(partial).toContain('data-km-crayon-deposit-mask=""');
   expect(partial).toContain('data-km-crayon-underpaint-grain=""');
   region(.8,119);region(.8,19);
   expect(region(.8,69)).toBe(partial);
 });
 it("enforces 0..1 and solid opacity at scene and direct WaxRegion boundaries",()=>{
   for(const value of [-.01,1.01,NaN,Infinity]){
     const html=()=>region(value);
     expect(html).toThrow(/underpaintTooth/);
   }
   expect(()=>region(.5,119,12,.7,"open")).toThrow(/underpaintTooth/);
   const {scene}=crayonBotanicalDrawing({
     aspect:"landscape",detail:1,pressure:.83,paperTooth:.8,underpaintTooth:.88
   });
   expect(inspectCrayonScene(scene)).toEqual([]);
   for(const value of [-1,1.1,NaN]){
     const invalid={...scene,elements:scene.elements.map(n=>
       n.id==="pear-body"&&n.kind==="wax"?{...n,underpaintTooth:value}:n)};
     expect(inspectCrayonScene(invalid).join(" ")).toMatch(/underpaintTooth/);
   }
   const exposed={...scene,elements:scene.elements.map(n=>
     n.id==="pear-body"&&n.kind==="wax"?
       {...n,coverage:"open" as const,underpaintGradient:undefined}:n)};
   expect(inspectCrayonScene(exposed).join(" ")).toMatch(/underpaintTooth/);
   for(const aspect of ["portrait","landscape"] as const){
     const src=crayonBotanicalDrawing({aspect,detail:.6,pressure:.82,
       paperTooth:.81,underpaintTooth:.88}).scene;
     expect(inspectCrayonScene(src)).toEqual([]);
     const html=renderToStaticMarkup(<CrayonScene spec={src} frame={239}/>);
     expect(html).toContain('data-km-crayon-undercoat-pits=""');
     expect(html).toContain('data-km-crayon-underpaint="opaque"');
     expect(html).toContain('data-km-crayon-clipped-to="pear-body"');
   }
 });
});
