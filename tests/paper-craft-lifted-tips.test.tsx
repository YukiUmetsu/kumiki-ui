import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS } from "../registry/video/paper-craft";
import type { PaperLiftedTip } from "../registry/video/paper-craft";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { paperObjectSpec } from "../registry/video/paper-object-kit";

describe("Paper lifted stock: genuine separated hinged cutout",()=>{
  const make=(aspect:"landscape"|"portrait"="landscape",relief=1)=>
    paperObjectSpec("layered",aspect,{object:"kingfisher",palette:"jewel",
      seed:37,detail:1,relief,motion:.5,curl:1});
  it("makes exactly 18 physical wing feather bases and distinct attached tips in both formats",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const spec=make(aspect);
      expect(inspectPaperCraft(spec)).toEqual([]);
      expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      const wing=spec.layers.filter(x=>/^wing-feather-\d+$/.test(x.id));
      expect(wing).toHaveLength(18);
      expect(wing.every(x=>x.liftedTip&&x.path!==x.liftedTip.path)).toBe(true);
      const allHinges=new Set(wing.map(x=>x.liftedTip!.hinge.join(",")));
      expect(allHinges.size).toBe(18);
      const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{
        spec,frame:198,liftStrength:1,shadowStrength:1,edgeStrength:.7,
      }));
      expect((html.match(/data-km-paper-lift-tip="wing-feather-\d+"/g)||[])).toHaveLength(18);
      expect(html).toContain('data-km-paper-lift-tip="wing-feather-0"');
      expect(html).toContain('data-km-paper-stock="#');
      expect(html).toContain('clip-rule="evenodd"');
      expect(html).not.toContain('fill-opacity="0.');
    }
  });
  it("honors relief=0 and stage intensity without changing cut bases or layer budgets",()=>{
    const full=make("landscape",1),flat=make("landscape",0);
    expect(full.layers.map(x=>x.path)).toEqual(flat.layers.map(x=>x.path));
    expect(full.layers.length).toBe(flat.layers.length);
    expect(inspectPaperCraft(flat)).toEqual([]);
    const tip=flat.layers.find(x=>x.id==="wing-feather-0")!.liftedTip!;
    expect(tip.lift).toBe(0);
    expect(tip.rotateDegrees).toBe(0);
    const still=renderToStaticMarkup(React.createElement(PaperCraftStage,{
      spec:full,frame:198,liftStrength:0,
    }));
    expect(still).toContain('data-km-paper-fold-angle="0.000"');
    expect(still).toContain('data-km-paper-lift-tip="wing-feather-0"');
    const folded=renderToStaticMarkup(React.createElement(PaperCraftStage,{
      spec:full,frame:198,liftStrength:1,
    }));
    expect(folded).not.toBe(still);
    expect(folded).toContain('data-km-paper-fold-angle="');
    for(const v of [NaN,Infinity,-.01,1.01])
      expect(()=>make("landscape",v)).toThrow(RangeError);
  });
  it("keeps all attached feather roots synchronized while bends remain independent",()=>{
    const spec=make();
    for(const f of [176,188,201,215]){
      const frame=evaluatePaperCraft(spec,f);
      const id=spec.layers.findIndex(x=>x.id==="kingfisher-wing-base");
      const rotations=spec.layers.map((x,i)=>x.rigGroup==="kingfisher-wing"
        ?frame.layers[i].rotation:null).filter(x=>x!==null);
      expect(new Set(rotations).size).toBe(1);
      expect(frame.layers[id].rotation).toBeTypeOf("number");
    }
    const r=renderToStaticMarkup(React.createElement(PaperCraftStage,{
      spec,frame:20,reducedMotion:true,liftStrength:1,
    }));
    const r2=renderToStaticMarkup(React.createElement(PaperCraftStage,{
      spec,frame:210,reducedMotion:true,liftStrength:1,
    }));
    expect(r.replace('data-km-paper-frame="20"','data-km-paper-frame="210"')).toBe(r2);
  });
  it("rejects malformed geometry, unbounded shadow projection and unsafe fold hinges",()=>{
    const spec=make();
    const i=spec.layers.findIndex(x=>x.id==="wing-feather-0");
    const base=spec.layers[i];
    const tests=[
      {path:"M12 12 L20 20"},
      {hinge:[NaN,20]},
      {hinge:[1]},
      {rotateDegrees:26},
      {rotateDegrees:-26},
      {lift:19},
      {lift:-1},
      {lift:Infinity},
    ];
    for(const replacement of tests){
      const layers=[...spec.layers];
      // Deliberately submit malformed runtime input to the validator.
      layers[i]={...base,liftedTip:{...base.liftedTip!,...replacement} as unknown as PaperLiftedTip};
      expect(inspectPaperCraft({...spec,layers}).some(x=>x.path.includes("liftedTip"))).toBe(true);
    }
  });
  it("folds roof eaves and napkin corners without additional full paper sheets",()=>{
    for(const object of ["canal-houses","teacup"] as const){
      const spec=paperObjectSpec("layered","portrait",{object,relief:1});
      expect(inspectPaperCraft(spec)).toEqual([]);
      expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      const tips=spec.layers.filter(x=>x.liftedTip);
      expect(tips.length).toBe(object==="canal-houses"?3:1);
      const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{spec,frame:210}));
      for(const tip of tips)expect(html).toContain('data-km-paper-lift-tip="'+tip.id+'"');
    }
  });
});
