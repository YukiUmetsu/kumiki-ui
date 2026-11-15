import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonMarks} from "../registry/video/materials/crayon";
import {Paper,WaxRegion} from "../registry/video/materials/crayon-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonDemoScene} from "../src/video/crayon-scene-fixtures";

const bounds={x:0,y:0,width:500,height:280};
const opts={seed:913,pressure:.85,spacing:10};
describe("CRAYON1 broad wax-rubbing gesture craftsmanship",()=>{
 it("uses longer hand-contact gestures with lower path clutter",()=>{
   const long=crayonMarks(bounds,{...opts,markLength:"long"});
   const short=crayonMarks(bounds,{...opts,markLength:"short"});
   const arcs=(m:typeof long)=>m.reduce((n,mark)=>n+mark.nibArcs.length,0);
   expect(long).toHaveLength(short.length);
   expect(arcs(long)).toBeLessThan(arcs(short)*.8);
   expect(long.some(m=>m.nibArcs.length>=4)).toBe(true);
   expect(new Set(long.map(m=>m.index)).size).toBe(long.length);
   expect(long.every(m=>m.nibD.includes("Z"))).toBe(true);
   const averageLength=(m:typeof long)=>m.reduce((sum,mark)=>
     sum+mark.nibArcs.reduce((s,a)=>s+Math.hypot(a[4]-a[0],a[5]-a[1]),0),0)/arcs(m);
   expect(averageLength(long)).toBeGreaterThan(averageLength(short)*1.25);
   expect(long).toEqual(crayonMarks(bounds,{...opts,markLength:"long"}));
   expect(short).toEqual(crayonMarks(bounds,{...opts,markLength:"short"}));
   expect(long).not.toEqual(short);
 });
 it("works with the opaque contact coating, exact frame seeks and short-mode fallback",()=>{
   const render=(markLength:"long"|"short",frame:number)=>renderToStaticMarkup(<svg>
    <Paper width={310} height={260} tooth="waxmarks" strength={.8} seed={19}/>
    <WaxRegion d="M10 20H270V225H10Z" bounds={{x:10,y:20,width:260,height:205}}
      colors={["#d27f60","#8e535f","#f0ae82"]} tooth="waxmarks"
      seed={91} pressure={.9} frame={frame} first={0} last={140}
      reduced={false} coverage="opaque" markLength={markLength}/>
   </svg>);
   const long=render("long",140), short=render("short",140);
   expect(long).toContain('data-km-crayon-mark-length="long"');
   expect(short).toContain('data-km-crayon-mark-length="short"');
   expect(long).toContain('data-km-crayon-underpaint="opaque"');
   expect(long).not.toEqual(short);
   const partial=render("long",75);
   render("long",140);render("long",0);
   expect(render("long",75)).toBe(partial);
   expect(()=>render("invalid" as "long",60)).toThrow(/mark length/);
 });
 it("enforces portable scene authoring in both aspects",()=>{
   for(const aspect of ["landscape","portrait"] as const){
     const base=crayonDemoScene("city",aspect);
     const wax=base.elements.find(n=>n.kind==="wax");
     if(!wax||wax.kind!=="wax")throw Error("fixture has no wax");
     const scene={...base,elements:base.elements.map(n=>n.id===wax.id
       ? {...wax,markLength:"long" as const}:n)};
     expect(inspectCrayonScene(scene)).toEqual([]);
     expect(renderToStaticMarkup(<CrayonScene spec={scene} frame={178}/>))
       .toContain('data-km-crayon-mark-length="long"');
     const broken={...scene,elements:scene.elements.map(n=>n.id===wax.id
       ? {...wax,markLength:"digital"}:n)};
     expect(inspectCrayonScene(broken).join(" ")).toContain(".markLength");
   }
 });
});
