import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {assertCrayonSgraffito} from "../registry/video/materials/crayon";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonSceneSpec} from "../registry/video/materials/crayon-scene";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {MaterialStudy} from "../src/video/crayon-material-studies.stories";

const scrape={d:"M21 30Q39 48 77 66M29 46Q58 59 90 70",width:1.4,first:15,last:23};
const scene:CrayonSceneSpec={
  version:1,id:"wax-sgraffito-proof",width:175,height:120,durationFrames:30,
  paper:"#f5e4d1",paperTooth:.8,seed:77,
  elements:[{kind:"wax",id:"pigment-plane",
    d:"M10 15Q75 -5 135 29L142 112L8 110Z",
    bounds:{x:7,y:0,width:145,height:119},
    colors:["#dfbd8d","#4e4650","#86717b"],
    coverage:"opaque",pressure:.89,spacing:7.4,
    timing:{start:0,end:10},sgraffito:scrape}],
};
const render=(frame:number,spec:CrayonSceneSpec=scene)=>
  renderToStaticMarkup(<CrayonScene spec={spec} frame={frame}/>);
describe("CRAYON1 actual subtractive wax sgraffito",()=>{
 it("validates an engraving after pigment fills, not unbounded drawing data",()=>{
   expect(inspectCrayonScene(scene)).toEqual([]);
   assertCrayonSgraffito(scrape);
   expect(()=>assertCrayonSgraffito({...scrape,width:0})).toThrow(/sgraffito/);
   expect(()=>assertCrayonSgraffito({...scrape,width:14})).toThrow(/sgraffito/);
   expect(()=>assertCrayonSgraffito({...scrape,d:"<script/>"})).toThrow(/sgraffito/);
   expect(()=>assertCrayonSgraffito({...scrape,last:14})).toThrow(/sgraffito/);
   const bad=(sgraffito:typeof scrape):CrayonSceneSpec=>({
     ...scene,elements:[{...scene.elements[0],sgraffito} as CrayonSceneSpec["elements"][number]],
   });
   expect(inspectCrayonScene(bad({...scrape,first:7})).join(" "))
     .toContain("follow wax deposition");
   expect(inspectCrayonScene(bad({...scrape,last:35})).join(" "))
     .toContain("fit duration");
   const open={...scene,elements:scene.elements.map(n=>n.kind==="wax"
     ? {...n,coverage:"open" as const}:n)};
   expect(inspectCrayonScene(open).join(" "))
     .toContain("opaque buried pigment");
   expect(()=>render(25,open)).toThrow(/opaque buried pigment/);
 });
 it("cuts the top tooth-layer MASK, leaving the opaque body as buried pigment",()=>{
   const before=render(14);
   const mid=render(19);
   const done=render(25);
   expect(before).not.toContain('data-km-crayon-sgraffito="subtractive"');
   expect(mid).toContain('data-km-crayon-sgraffito="subtractive"');
   expect(done).toContain('data-km-crayon-sgraffito="subtractive"');
   expect(mid).toContain('stroke="#000"');
   expect(done).toContain('data-km-crayon-scrape-progress="1"');
   expect(mid).toContain('data-km-crayon-underpaint="opaque"');
   expect(done).toContain('data-km-crayon-underpaint="opaque"');
   const p=done.indexOf('data-km-crayon-underpaint="opaque"');
   const tag=done.slice(done.lastIndexOf("<path",p),done.indexOf(">",p)+1);
   expect(tag).toContain('fill="#dfbd8d"');
   expect(tag).not.toContain("mask=");
   // The scratch is in the *tooth mask* definition, not a pale line painted
   // on top of the body, and the black area doesn't erase the underpainting.
   const mask=done.match(/<mask[^>]*>[\s\S]*?data-km-crayon-sgraffito="subtractive"[\s\S]*?<\/mask>/);
   expect(mask).toBeTruthy();
   expect(mask![0]).toContain('fill="url(#');
   expect(render(19)).toBe(mid);
   render(1);render(29);render(13);
   expect(render(19)).toBe(mid);
 });
 it("keeps untouched scenes unchanged unless the opt-in scrape is authored",()=>{
   const plain={...scene,elements:scene.elements.map(n=>n.kind==="wax"
     ? {...n,sgraffito:undefined}:n)};
   expect(inspectCrayonScene(plain)).toEqual([]);
   const html=render(25,plain);
   expect(html).not.toContain('data-km-crayon-sgraffito="subtractive"');
   expect(html).toContain('data-km-crayon-underpaint="opaque"');
   expect(html).not.toBe(render(25));
 });
 it("shows an honest before/after at the same wax seed in Storybook",()=>{
   const options={
     frame:117,pressure:.9,paperTooth:.83,left:"opaque" as const,
     right:"opaque" as const,underlay:"cobalt" as const,
     leftNib:"tapered" as const,rightNib:"tapered" as const,
     strokeOrder:"patches" as const,pressureSplit:false,
     compareStrokeOrder:false,sgraffitoComparison:true,
     leftLength:"long" as const,rightLength:"long" as const,
   };
   const html=renderToStaticMarkup(<MaterialStudy {...options}/>);
   expect(html).toContain("CARVED / BURIED COLOR");
   expect(html).toContain("INTACT TOP WAX");
   expect((html.match(/data-km-crayon-sgraffito="subtractive"/g)??[]))
     .toHaveLength(1);
   const before=renderToStaticMarkup(<MaterialStudy {...options} frame={93}/>);
   expect(before).not.toContain('data-km-crayon-sgraffito="subtractive"');
 });
 for(const aspect of ["landscape","portrait"] as const){
   it("scrapes real eye-adjacent, ear and cervical wax without transparency in "+aspect,()=>{
     const spec=crayonWildlifePortraitScene(aspect,{detail:.85});
     expect(inspectCrayonScene(spec)).toEqual([]);
     const ids=["near-ear-inner","cheek-warm-plane","neck-ruff"];
     for(const id of ids){
       const node=spec.elements.find(x=>x.id===id);
       expect(node?.kind).toBe("wax");
       if(node?.kind!=="wax")continue;
       expect(node.coverage).toBe("opaque");
       expect(node.sgraffito?.first).toBeGreaterThanOrEqual(node.timing.end);
       expect(node.sgraffito?.last).toBeLessThan(spec.durationFrames);
       expect(node.sgraffito?.d).toContain("Q");
     }
     const orig=spec.elements.find(x=>x.id==="head");
     expect(orig?.kind).toBe("wax");
     expect(orig?.sgraffito).toBeUndefined();
   });
 }
});
