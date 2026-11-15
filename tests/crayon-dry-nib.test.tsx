import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonMarks,crayonNibPath,crayonDryNibPath} from "../registry/video/materials/crayon";
import {Paper,WaxRegion} from "../registry/video/materials/crayon-react";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {crayonBotanicalDrawing} from "../src/video/crayon-drawing-system-fixtures";
import {crayonDrawingInspectionSpec} from "../src/video/crayon-drawing-system.stories";

const path="M5 3Q67 -15 100 55Q69 120 5 101Z";
const bounds={x:0,y:0,width:110,height:115};
function wax(nibStyle:"rounded"|"tapered"|"dry",frame=120,pressure=.85){
 return renderToStaticMarkup(<svg>
   <Paper width={160} height={150} seed={17} tooth="shared-paper" strength={.9}/>
   <rect width="160" height="150" fill="#315f93"/>
   <WaxRegion d={path} bounds={bounds} colors={["#dc8569","#a15e64","#eeb58b"]}
     coverage="opaque" tooth="shared-paper" nibStyle={nibStyle}
     seed={409} pressure={pressure} spacing={7} frame={frame}
     first={0} last={120} reduced={false}/>
 </svg>);
}
describe("CRAYON1 fractured dry-wax contact",()=>{
 it("uses seeded interrupted micro-bands inside real quadratic nib arcs",()=>{
   const mark=crayonMarks(bounds,{seed:371,pressure:.95,spacing:9})[3];
   const whole=crayonDryNibPath(mark),again=crayonDryNibPath(mark);
   expect(whole).toBe(again);
   expect(whole).toContain("Z");
   expect(whole).not.toMatch(/NaN|Infinity/);
   expect(whole).not.toBe(crayonNibPath(mark));
   const fragments=(whole.match(/Z/g)??[]).length;
   expect(fragments).toBeGreaterThan(mark.nibArcs.length);
   expect(fragments).toBeLessThanOrEqual(6*mark.nibArcs.length);
   for(const piece of whole.split("Z").filter(Boolean)){
     // Four pressure-varying samples across the contacted paper ridge.
     expect((piece.match(/L/g)??[]).length).toBe(7);
   }
   const mid=crayonDryNibPath(mark,.35);
   expect(mid.length).toBeGreaterThan(0);
   expect(mid.length).toBeLessThan(whole.length);
   expect(crayonDryNibPath(mark,0)).toBe("");
   expect(()=>crayonDryNibPath(mark,NaN)).toThrow(RangeError);
   expect(()=>crayonDryNibPath(mark,-.001)).toThrow(RangeError);
   expect(()=>crayonDryNibPath(mark,1.01)).toThrow(RangeError);
 });
 it("pressure determines number of disjoint nib contact bands",()=>{
   const low=crayonMarks(bounds,{seed:571,pressure:.12,spacing:9})[2];
   const high=crayonMarks(bounds,{seed:571,pressure:.98,spacing:9})[2];
   const a=crayonDryNibPath(low),b=crayonDryNibPath(high);
   expect((b.match(/Z/g)??[]).length).toBeGreaterThan((a.match(/Z/g)??[]).length);
   expect(crayonDryNibPath(high)).toBe(b);
 });
 it("preserves occlusion and source shared paper without contaminating legacy nibs",()=>{
   const dry=wax("dry"),tapered=wax("tapered"),rounded=wax("rounded");
   expect(dry).toContain('data-km-crayon-nib="dry"');
   expect(dry).toContain('data-km-crayon-dry-binder=""');
   expect(dry).toContain('data-km-crayon-dry-ribbons=""');
   expect(dry).toContain('data-km-crayon-paper-contact="');
   expect(dry).toContain('data-km-crayon-underpaint="opaque"');
   expect(dry).not.toContain('data-km-crayon-sgraffito="subtractive"');
   expect(tapered).not.toContain("data-km-crayon-nib=\"dry\"");
   expect(rounded).not.toContain("data-km-crayon-nib=\"dry\"");
   expect(tapered).toContain('data-km-crayon-nib="tapered"');
   expect(rounded).toContain('data-km-crayon-nib="rounded"');
   expect(dry).not.toEqual(tapered);
   expect(tapered).toBe(wax("tapered"));
   const frame=wax("dry",67);
   wax("dry",119);wax("dry",3);
   expect(wax("dry",67)).toBe(frame);
   expect(wax("dry",120,.3)).not.toEqual(wax("dry",120,.95));
   expect(()=>wax("spray" as "dry")).toThrow(/nib style/);
 });
 for(const aspect of ["portrait","landscape"] as const){
   it("keeps every dry contact on source geometry and camera-independent at "+aspect,()=>{
     const {scene,plan}=crayonBotanicalDrawing({
       aspect,detail:1,pressure:.86,paperTooth:.84,nibStyle:"dry",
     });
     expect(plan.subjects).toHaveLength(1);
     expect(inspectCrayonScene(scene)).toEqual([]);
     expect(scene.elements.filter(x=>x.kind==="wax").every(x=>x.nibStyle==="dry")).toBe(true);
     const focused=crayonDrawingInspectionSpec(scene,"surface");
     expect(focused.elements).toBe(scene.elements);
     expect(focused.seed).toBe(scene.seed);
     const html=renderToStaticMarkup(<CrayonScene spec={focused} frame={239}/>);
     expect(html).toContain('data-km-crayon-nib="dry"');
     expect(html).toContain('data-km-crayon-underpaint="opaque"');
     expect(html).toContain('data-km-crayon-clipped-to="pear-body"');
     const original=crayonBotanicalDrawing({
       aspect,detail:1,pressure:.86,paperTooth:.84,nibStyle:"tapered",
     }).scene;
     expect(original.seed).toBe(scene.seed);
     expect(original.elements.map(x=>x.id)).toEqual(scene.elements.map(x=>x.id));
     expect(renderToStaticMarkup(<CrayonScene spec={original} frame={239}/>))
       .not.toContain('data-km-crayon-nib="dry"');
     const wrong={...scene,elements:scene.elements.map(x=>
       x.kind==="wax"?{...x,nibStyle:"pixel-glitter"}:x)};
     expect(inspectCrayonScene(wrong).join(" ")).toMatch(/\.nibStyle/);
   });
 }
});
