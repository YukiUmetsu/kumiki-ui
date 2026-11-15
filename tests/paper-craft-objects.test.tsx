import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS, PAPER_STYLES } from "../registry/video/paper-craft";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { PAPER_OBJECTS, PAPER_OBJECT_PALETTES, paperObjectSpec } from "../registry/video/paper-object-kit";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/paper-craft-objects.film.json";

describe("Paper sculpture objects: original reference-led cut-stock construction",()=>{
  for(const object of PAPER_OBJECTS){
    for(const aspect of ["landscape","portrait"] as const){
      it(object+" "+aspect+" has real bounded, opaque and valid anatomy",()=>{
        const spec=paperObjectSpec("layered",aspect,{object,palette:"jewel",seed:47,detail:1});
        expect(inspectPaperCraft(spec)).toEqual([]);
        expect(spec.layers.length).toBeGreaterThan(35);
        expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
        expect(new Set(spec.layers.map(x=>x.id)).size).toBe(spec.layers.length);
        expect(spec.layers.every(x=>x.color.startsWith("#")&&x.color.length===7)).toBe(true);
        expect(spec.layers.filter(x=>x.depth>=12).length).toBeGreaterThan(15);
        expect(spec.layers.find(x=>x.id==="stage-frame")?.holes?.length).toBe(1);
        expect(spec.layers.find(x=>x.id==="stage-carved-border")?.holes?.length).toBe(1);
        expect(new Set(spec.layers.map(x=>x.color)).size).toBeGreaterThan(8);
        const markup=renderToStaticMarkup(React.createElement(PaperCraftStage,{
          spec,frame:195,tooth:.6,shadowStrength:.94,edgeStrength:.72,
        }));
        expect(markup).toContain('viewBox="0 0 '+spec.width+' '+spec.height+'"');
        expect(markup).toContain('data-km-paper-layer="stage-frame"');
        expect(markup).toContain('clip-rule="evenodd"');
        expect((markup.match(/data-km-paper-layer=/g)||[]).length).toBe(spec.layers.length);
        const expected:Record<string,string[]>={
          kingfisher:["kingfisher-body-shadow","kingfisher-head","kingfisher-beak-upper","kingfisher-eye","kingfisher-talon-0-0","kingfisher-wing-base"],
          dragonfly:["dragonfly-wing-0-lace","dragonfly-wing-3-lace","dragonfly-abdomen-segment-10","dragonfly-head"],
          "canal-houses":["house-left-facade","house-center-roof","house-right-door","canal-parapet"],
          camera:["camera-main-body","camera-viewfinder-glass","camera-lens-ring-0","camera-lens-ring-6","camera-shutter"],
          teacup:["tea-handle-back","tea-cup-body","tea-liquid","tea-citrus-segment-0","tea-spoon-bowl"],
        };
        for(const id of expected[object])expect(markup).toContain('data-km-paper-layer="'+id+'"');
        if(object==="kingfisher"){
          expect(spec.layers.filter(x=>x.id.startsWith("head-crown-feather-")).length).toBe(10);
          expect(spec.layers.filter(x=>x.id.startsWith("breast-scale-")).length).toBe(12);
        }
        if(object==="teacup"){
          const deco=spec.layers.find(x=>x.id==="tea-botanical-emblem-rim")!;
          const cup=spec.layers.find(x=>x.id==="tea-cup-body")!;
          expect(deco.depth).toBeGreaterThan(cup.depth);
        }
      });
    }
  }
  it("preserves deterministic seeks and motion-free stills for every object",()=>{
    for(const object of PAPER_OBJECTS){
      const spec=paperObjectSpec("layered","landscape",{object,detail:.85,seed:12});
      const before=evaluatePaperCraft(spec,140);
      evaluatePaperCraft(spec,22);evaluatePaperCraft(spec,210);
      expect(evaluatePaperCraft(spec,140)).toEqual(before);
      const paused=evaluatePaperCraft(spec,0,true);
      expect(evaluatePaperCraft(spec,225,true).layers).toEqual(paused.layers);
      expect(paperObjectSpec("layered","landscape",{object,detail:.85,seed:12}))
        .toEqual(spec);
    }
  });
  it("supports every paper medium, stock and detail limit without unbounded layers",()=>{
    for(const medium of PAPER_STYLES){
      for(const palette of PAPER_OBJECT_PALETTES){
        const spec=paperObjectSpec(medium,"portrait",{object:"dragonfly",palette,detail:1});
        expect(inspectPaperCraft(spec)).toEqual([]);
        expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      }
    }
    for(const object of PAPER_OBJECTS){
      const simple=paperObjectSpec("layered","landscape",{object,detail:0});
      const ornate=paperObjectSpec("layered","landscape",{object,detail:1});
      expect(simple.layers.length).toBeLessThanOrEqual(ornate.layers.length);
      expect(inspectPaperCraft(simple)).toEqual([]);
    }
  });
  it("rejects incorrect object, aspect, stock, bad seed/detail",()=>{
    expect(()=>paperObjectSpec("layered","landscape",{object:"fake" as never})).toThrow(RangeError);
    expect(()=>paperObjectSpec("layered","landscape",{palette:"invalid" as never})).toThrow(RangeError);
    expect(()=>paperObjectSpec("layered","diagonal" as never)).toThrow(RangeError);
    expect(()=>paperObjectSpec("layered","landscape",{seed:NaN})).toThrow(RangeError);
    expect(()=>paperObjectSpec("layered","landscape",{detail:Infinity})).toThrow(RangeError);
    expect(()=>paperObjectSpec("layered","landscape",{detail:1.2})).toThrow(RangeError);
  });
  it("compiles every actual FilmStage slot in both 16:9 and 9:16",async()=>{
    for(const outputId of ["landscape","portrait"]){
      const comp=compileFilm(film,{outputId});
      expect(comp.ok).toBe(true);
      if(!comp.ok)continue;
      expect(comp.film.scenes).toHaveLength(5);
      const renderer=await loadFilmSlots(comp.film);
      for(const object of PAPER_OBJECTS){
        const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
          renderer({slot:"paper-craft-study",label:object,props:{
            artwork:"object",object,objectPalette:"pastel",detail:1,medium:"layered",seed:37,
          }},{
            frame:175,durationFrames:180,fps:{num:30,den:1},
            width:outputId==="landscape"?960:540,
            height:outputId==="landscape"?540:960,reducedMotion:false,
          })));
        expect(html).toContain('data-km-paper-craft');
        expect(html).toContain('data-km-paper-layer="stage-frame"');
      }
    }
  });
});
