import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {crayonFurFlow,crayonIrisFlecks} from "../src/video/crayon-editorial-character-craft";
import {crayonWildlifePortraitScene} from "../src/video/crayon-wildlife-portrait-fixtures";
import {CrayonScene} from "../registry/video/materials/crayon-scene-react";
import {inspectCrayonScene} from "../registry/video/materials/crayon-scene";
import type {CrayonSceneSpec} from "../registry/video/materials/crayon-scene";

describe("wax crayon anatomical hair flow",()=>{
 const guide=[
  {x:0,y:0},{x:10,y:-95},{x:95,y:95},{x:180,y:30},
 ] as const;
 const options={seed:712,guide,count:120,spread:13,length:15,
   curvature:.21,forkRate:0};
 it("flows along the changing anatomy tangent instead of one uniform hatch angle",()=>{
   const d=crayonFurFlow(options);
   expect(d).toBe(crayonFurFlow(options));
   expect(d).not.toEqual(crayonFurFlow({...options,seed:713}));
   expect(d.match(/M/g)).toHaveLength(options.count);
   expect(d).not.toMatch(/Infinity|NaN|<|>/);
   const paths=[...d.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Q(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)];
   expect(paths).toHaveLength(options.count);
   const direction=(m:RegExpMatchArray)=>Math.atan2(
     Number(m[6])-Number(m[2]),Number(m[5])-Number(m[1]));
   expect(Math.abs(direction(paths[0])-direction(paths[paths.length-1]))).toBeGreaterThan(.2);
   expect(new Set(paths.map(m=>m[1]+"/"+m[2])).size).toBe(options.count);
 });
 it("locates every fork origin exactly on the painted quadratic (never an isolated mark)",()=>{
   const candidate=Array.from({length:100},(_,seed)=>
     crayonFurFlow({...options,count:1,seed,forkRate:.3}))
     .find(d=>(d.match(/M/g)??[]).length===2);
   expect(candidate).toBeDefined();
   const paths=[...candidate!.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Q(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)];
   expect(paths).toHaveLength(2);
   const p=paths[0].slice(1).map(Number),branch=paths[1].slice(1).map(Number);
   const t=.72,u=1-t;
   const x=u*u*p[0]+2*u*t*p[2]+t*t*p[4];
   const y=u*u*p[1]+2*u*t*p[3]+t*t*p[5];
   expect(Math.hypot(branch[0]-x,branch[1]-y)).toBeLessThan(.025);
 });
 it("uses connected forked nib tips but bounds the path budget",()=>{
   const forked=crayonFurFlow({...options,count:150,forkRate:.3});
   expect(forked.match(/M/g)!.length).toBeGreaterThan(150);
   expect(forked.match(/M/g)!.length).toBeLessThanOrEqual(220);
   expect(forked.length).toBeLessThan(25000);
   expect(crayonFurFlow({...options,count:0})).toBe("");
   expect(()=>crayonFurFlow({...options,count:161})).toThrow(/fur flow/);
   expect(()=>crayonFurFlow({...options,spread:-1})).toThrow(/fur flow/);
   expect(()=>crayonFurFlow({...options,length:101})).toThrow(/fur flow/);
   expect(()=>crayonFurFlow({...options,forkRate:.31})).toThrow(/fur flow/);
   expect(()=>crayonFurFlow({...options,guide:[guide[0],guide[0],guide[0],guide[0]]})).toThrow(/fur flow/);
 });
});
describe("directional iris wax engraving",()=>{
 it("lays irregular but repeatable radial pigment inside an ellipse",()=>{
   const opts={seed:19,cx:-56,cy:-57,rx:13.4,ry:12.8,count:38};
   const a=crayonIrisFlecks(opts);
   expect(a).toBe(crayonIrisFlecks(opts));
   expect(a.match(/M/g)).toHaveLength(38);
   expect(a).not.toBe(crayonIrisFlecks({...opts,seed:20}));
   expect(crayonIrisFlecks({...opts,count:0})).toBe("");
   expect(()=>crayonIrisFlecks({...opts,rx:0})).toThrow(/iris/);
   expect(()=>crayonIrisFlecks({...opts,maxRadius:1.4})).toThrow(/iris/);
   expect(()=>crayonIrisFlecks({...opts,count:81})).toThrow(/iris/);
   expect(a).not.toMatch(/NaN|Infinity/);
 });
});
describe("silhouette-aware wax crayon hatching",()=>{
 const base:CrayonSceneSpec={
  version:1,id:"anatomy-clip-proof",width:180,height:120,durationFrames:20,
  paper:"#e5d8bd",seed:71,
  elements:[
   {kind:"wax",id:"head",d:"M10 10H110V80H10Z",bounds:{x:10,y:10,width:100,height:70},
    colors:["#70524b","#3a302e","#c0a282"],coverage:"opaque",
    timing:{start:0,end:8},
    drawings:[{frame:10,d:"M20 20H85V85H20Z",
      bounds:{x:20,y:20,width:65,height:65}}]},
   {kind:"contour",id:"head-fur",parentId:"head",clipToParent:true,
    d:"M0 0Q50 100 130 115",width:2.3,color:"#f1dfc5",
    timing:{start:0,end:9}},
  ]
 };
 it("uses the actual moving wax parent silhouette at a source-frame redraw",()=>{
   expect(inspectCrayonScene(base)).toEqual([]);
   const a=renderToStaticMarkup(<CrayonScene spec={base} frame={9}/>);
   const b=renderToStaticMarkup(<CrayonScene spec={base} frame={11}/>);
   expect(a).toContain('data-km-crayon-anatomical-mask="head"');
   expect(a).toContain('clipPathUnits="userSpaceOnUse"');
   expect(a).toContain('data-km-crayon-clipped-to="head"');
   expect(a).toContain('<path d="M10 10H110V80H10Z"');
   expect(b).toContain('<path d="M20 20H85V85H20Z"');
   expect(a).not.toBe(b);
   expect(renderToStaticMarkup(<CrayonScene spec={base} frame={9}/>)).toBe(a);
   expect(a).toContain('data-km-crayon-underpaint="opaque"');
 });
 it("rejects non-wax parent, transformed clipping and invalid values",()=>{
   const valid=base.elements[1];
   if(valid.kind!=="contour")throw new Error("test contour");
   const update=(node:typeof valid):CrayonSceneSpec=>({
     ...base,elements:[base.elements[0],node],
   });
   expect(inspectCrayonScene(update({...valid,parentId:"missing"})).join(" "))
     .toMatch(/wax parent/);
   expect(inspectCrayonScene(update({...valid,clipToParent:"yes" as unknown as boolean})).join(" "))
     .toMatch(/boolean/);
   expect(inspectCrayonScene(update({...valid,motion:[{frame:0,x:0,y:0}]})).join(" "))
     .toMatch(/untransformed/);
   expect(inspectCrayonScene(update({...valid,screenSpace:true})).join(" "))
     .toMatch(/untransformed/);
   expect(inspectCrayonScene(update({...valid,clipToParent:false})))
     .toEqual([]);
   expect(()=>renderToStaticMarkup(<CrayonScene
     spec={update({...valid,parentId:"missing"})} frame={11}/>)).toThrow(/wax parent/);
 });
 for(const aspect of ["landscape","portrait"] as const){
  it("clips each real wildlife portrait fur layer with stable source geometry in "+aspect,()=>{
    const high=crayonWildlifePortraitScene(aspect,{detail:1});
    const low=crayonWildlifePortraitScene(aspect,{detail:0});
    expect(inspectCrayonScene(high)).toEqual([]);
    expect(inspectCrayonScene(low)).toEqual([]);
    const fur=high.elements.filter(x=>x.kind==="contour"&&
      x.clipToParent===true&&!x.id.startsWith("iris-"));
    expect(fur.length).toBeGreaterThan(20);
    expect(fur.every(x=>x.kind==="contour"&&x.clipToParent===true))
      .toBe(true);
    const dark=high.elements.find(x=>x.id==="forehead-undercoat");
    const light=high.elements.find(x=>x.id==="forehead-bright-filaments");
    expect(dark?.parentId).toBe("head");
    expect(light?.parentId).toBe("head");
    const density=(id:string,spec:typeof high)=>{
      const node=spec.elements.find(x=>x.id===id);
      if(!node||node.kind!=="contour")throw new Error("missing fur field");
      return (node.d.match(/M/g)??[]).length;
    };
    expect(density("cheek-silvery-fur",high))
      .toBeGreaterThan(density("cheek-silvery-fur",low)*6);
    expect(high.elements.find(x=>x.id==="head"))
      .toEqual(low.elements.find(x=>x.id==="head"));
    expect(high.durationFrames).toBe(240);
    for(const id of ["iris-deep-radials","iris-gold-radials"]){
      const node=high.elements.find(n=>n.id===id);
      expect(node?.kind).toBe("contour");
      if(node?.kind==="contour"){
        expect(node.parentId).toBe("eye-amber-iris");
        expect(node.clipToParent).toBe(true);
        expect((node.d.match(/M/g)??[]).length).toBeGreaterThan(18);
      }
    }
   });
 }
});
