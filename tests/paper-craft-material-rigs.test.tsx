import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperCraft, inspectPaperCraft } from "../registry/video/paper-craft";
import { paperShade, PaperCraftStage } from "../registry/video/paper-craft-react";
import { paperObjectSpec } from "../registry/video/paper-object-kit";

const find=(spec:ReturnType<typeof paperObjectSpec>,id:string)=>
  spec.layers.findIndex(layer=>layer.id===id);
describe("PAPER1 opaque material curl and coordinated paper rigs",()=>{
  it("creates bounded solid-color curvature stops, no translucency",()=>{
    expect(paperShade("#000000",1)).toBe("#FFFFFF");
    expect(paperShade("#FFFFFF",-1)).toBe("#000000");
    expect(paperShade("#51afcd",0)).toBe("#51AFCD");
    const spec=paperObjectSpec("layered","landscape",{
      object:"kingfisher",curl:1,motion:1,seed:37});
    expect(inspectPaperCraft(spec)).toEqual([]);
    const html=renderToStaticMarkup(React.createElement(PaperCraftStage,
      {spec,frame:195,curlStrength:1,tooth:.7}));
    expect(html).toContain('data-km-paper-curl="wing-feather-0"');
    expect(html).toContain('data-km-paper-rig="kingfisher-wing"');
    expect(html).toContain('data-km-paper-stock="#');
    expect(html).toContain('fill="url(#');
    expect(html).toContain('clip-rule="evenodd"');
    expect(html).not.toContain('fill-opacity="0.');
    const noCurl=renderToStaticMarkup(React.createElement(PaperCraftStage,
      {spec,frame:195,curlStrength:0}));
    expect(noCurl).not.toContain('data-km-paper-curl=');
    expect(noCurl).not.toContain('fill="url(#');
  });
  it("uses the same absolute-frame waveform for bird body, coverts and feathers",()=>{
    const spec=paperObjectSpec("layered","landscape",{
      object:"kingfisher",detail:1,curl:1,motion:1});
    const wingIds=["kingfisher-wing-base","kingfisher-wing-coverts",
      "wing-feather-0","wing-feather-5","wing-feather-17"];
    for(const frame of [175,189,195,203]){
      const result=evaluatePaperCraft(spec,frame);
      const rotations=wingIds.map(id=>result.layers[find(spec,id)].rotation);
      expect(new Set(rotations).size).toBe(1);
      const widths=wingIds.map(id=>result.layers[find(spec,id)].scaleX);
      expect(new Set(widths).size).toBe(1);
      const first=spec.layers[find(spec,wingIds[0])];
      for(const id of wingIds){
        const layer=spec.layers[find(spec,id)];
        expect(layer.rigGroup).toBe("kingfisher-wing");
        expect(layer.pivot).toEqual(first.pivot);
      }
    }
    const a=evaluatePaperCraft(spec,181).layers[find(spec,"kingfisher-wing-base")].rotation;
    const b=evaluatePaperCraft(spec,197).layers[find(spec,"kingfisher-wing-base")].rotation;
    expect(a).not.toBe(b);
    expect(evaluatePaperCraft(spec,197)).toEqual(evaluatePaperCraft(spec,197));
  });
  it("moves all paper dragonfly wing membranes and vein stocks on the same pivot",()=>{
    const spec=paperObjectSpec("layered","portrait",{object:"dragonfly",detail:1,motion:1});
    expect(inspectPaperCraft(spec)).toEqual([]);
    for(const wi of [0,1,2,3]){
      const ids=[`dragonfly-wing-${wi}-rear`,`dragonfly-wing-${wi}-lace`,
        `dragonfly-wing-${wi}-vein-0`,`dragonfly-wing-${wi}-vein-7`];
      for(const f of [155,174,198]){
        const state=evaluatePaperCraft(spec,f);
        expect(new Set(ids.map(id=>state.layers[find(spec,id)].rotation)).size).toBe(1);
      }
      expect(new Set(ids.map(id=>spec.layers[find(spec,id)].rigGroup)).size).toBe(1);
      expect(new Set(ids.map(id=>spec.layers[find(spec,id)].pivot?.join(","))).size).toBe(1);
      expect(spec.layers[find(spec,ids[1])].holes).toHaveLength(7);
    }
    const still=evaluatePaperCraft(spec,0,true).layers;
    expect(evaluatePaperCraft(spec,215,true).layers).toEqual(still);
  });
  it("motion=0 and curl=0 produce flat stationary stock without altering geometry",()=>{
    const still=paperObjectSpec("layered","landscape",{object:"dragonfly",motion:0,curl:0});
    const moving=paperObjectSpec("layered","landscape",{object:"dragonfly",motion:1,curl:1});
    expect(still.layers.map(x=>x.path)).toEqual(moving.layers.map(x=>x.path));
    expect(still.layers.every(x=>x.curl===undefined||x.curl===0)).toBe(true);
    expect(inspectPaperCraft(still)).toEqual([]);
    for(const frame of [165,189,211]){
      const state=evaluatePaperCraft(still,frame);
      const rigs=state.layers.filter((_,i)=>still.layers[i].rigGroup);
      expect(rigs.every(x=>x.rotation===0&&x.scaleX===1)).toBe(true);
    }
    for(const invalid of [-.01,1.01,NaN,Infinity]){
      expect(()=>paperObjectSpec("layered","landscape",{curl:invalid})).toThrow(RangeError);
      expect(()=>paperObjectSpec("layered","landscape",{motion:invalid})).toThrow(RangeError);
    }
  });
  it("rejects invalid curl and inconsistent rig pivots/phase, preserves old scenes",()=>{
    const spec=paperObjectSpec("layered","landscape",{object:"kingfisher"});
    const first=find(spec,"kingfisher-wing-coverts");
    const variants=[
      {...spec.layers[first],curl:1.1},
      {...spec.layers[first],flapHz:0},
      {...spec.layers[first],flapPhase:361},
      {...spec.layers[first],rigGroup:"bad rig"},
      {...spec.layers[first],flapPhase:90},
      {...spec.layers[first],pivot:[0,0] as const},
    ];
    for(const replacement of variants){
      const layers=[...spec.layers];layers[first]=replacement;
      expect(inspectPaperCraft({...spec,layers}).length).toBeGreaterThan(0);
    }
  });
});
