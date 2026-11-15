import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS, PAPER_STYLES } from "../registry/video/paper-craft";
import { paperBotanicalSpec } from "../registry/video/paper-botanical-kit";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/paper-craft-botanical.film.json";
import chromaticFilm from "../examples/film/paper-craft-chromatic.film.json";

describe("PAPER1 ArtCraft botanical construction", () => {
  for(const aspect of ["landscape","portrait"] as const){
    for(const palette of ["nocturne","ivory","rainforest","wildflower"] as const){
      it("validates original stock and real cutout holes for "+palette+" "+aspect,()=>{
        const spec=paperBotanicalSpec("layered",aspect,{palette,detail:1,seed:37});
        expect(inspectPaperCraft(spec)).toEqual([]);
        expect(spec.layers.length).toBeGreaterThan(60);
        expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
        expect(spec.layers.length).toBeGreaterThan(106);
        expect(new Set(spec.layers.map(l=>l.id)).size).toBe(spec.layers.length);
        // The peripheral floral sprays must overlap the round cardstock disk,
        // not float independently in either aspect.
        for(const name of ["aspect-spray-a","aspect-spray-b"]){
          const spray=spec.layers.find(l=>l.id===name)!;
          const start=/^M(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(spray.path);
          expect(start).not.toBeNull();
          const radius=Math.hypot(Number(start![1])-spec.width/2,
            Number(start![2])-spec.height/2);
          expect(radius).toBeLessThan(322*Math.min(spec.width,spec.height)/720);
          // Four physically cut leaf blades join each soft S-shaped tendril.
          expect((spray.path.match(/M/g)||[]).length).toBe(5);
        }
        expect(spec.layers.filter(l=>l.id.startsWith("flower-"))).toHaveLength(35);
        expect(spec.layers.find(l=>l.id==="fern-0-chroma")).toBeDefined();
        expect(spec.layers.find(l=>l.id==="moth-left-fore-lining")?.depth)
          .toBeLessThan(spec.layers.find(l=>l.id==="moth-left-fore")!.depth);
        for(const side of ["left","right"]){
          const hind=spec.layers.find(l=>l.id==="moth-"+side+"-hind-panel")!;
          const fore=spec.layers.find(l=>l.id==="moth-"+side+"-fore-panel")!;
          expect(hind.path).toMatch(/^M/);
          expect(fore.path).toMatch(/Z$/);
          expect(fore.pivot).toHaveLength(2);
          expect(fore.depth).toBeGreaterThan(spec.layers.find(l=>l.id==="moth-"+side+"-fore")!.depth);
        }
        expect(spec.layers.find(l=>l.id==="flower-0-inner-stock")?.depth)
          .toBeGreaterThan(spec.layers.find(l=>l.id==="flower-0-top")!.depth);
        expect(new Set(spec.layers.map(l=>l.color)).size).toBeGreaterThan(18);
        expect(spec.layers.find(l=>l.id==="flower-0-top")?.holes).toHaveLength(9);
        expect(spec.layers.find(l=>l.id==="moth-left-fore")?.holes).toHaveLength(13);
        expect(spec.layers.find(l=>l.id==="moth-right-fore")?.holes).toHaveLength(13);
        expect(spec.layers.find(l=>l.id==="moth-left-hind")?.holes).toHaveLength(8);
        expect(spec.layers.find(l=>l.id==="moth-right-hind")?.holes).toHaveLength(8);
        const markup=renderToStaticMarkup(React.createElement(PaperCraftStage,{
          spec,frame:194,tooth:.7,shadowStrength:.9,edgeStrength:.7,
        }));
        expect(markup).toContain('data-km-paper-layer="fern-0"');
        expect(markup).toContain('data-km-paper-layer="moth-thorax"');
        expect(markup).toContain('clip-rule="evenodd"');
        expect((markup.match(/data-km-paper-layer=/g)||[]).length).toBe(spec.layers.length);
      });
    }
  }
  it("keeps absolute seeks, seed and density deterministic",()=>{
    const plain=paperBotanicalSpec("layered","landscape",{detail:0,colorLayers:0,seed:7});
    const rich=paperBotanicalSpec("layered","landscape",{detail:1,colorLayers:1,seed:7});
    expect(plain.layers.length).toBeLessThan(rich.layers.length);
    expect(inspectPaperCraft(plain)).toEqual([]);
    expect(inspectPaperCraft(rich)).toEqual([]);
    const same=evaluatePaperCraft(rich,146);
    evaluatePaperCraft(rich,7);evaluatePaperCraft(rich,65);
    expect(evaluatePaperCraft(rich,146)).toEqual(same);
    expect(evaluatePaperCraft(rich,0,true).layers)
      .toEqual(evaluatePaperCraft(rich,211,true).layers);
    expect(paperBotanicalSpec("layered","landscape",{detail:1,colorLayers:1,seed:7})).toEqual(rich);
    expect(paperBotanicalSpec("layered","landscape",{detail:1,colorLayers:1,seed:8}).layers).not.toEqual(rich.layers);
    expect(()=>paperBotanicalSpec("layered","landscape",{seed:NaN})).toThrow(RangeError);
    expect(()=>paperBotanicalSpec("layered","landscape",{colorLayers:NaN})).toThrow(RangeError);
    expect(()=>paperBotanicalSpec("layered","landscape",{palette:"unsafe" as never})).toThrow(RangeError);
    expect(plain.layers.length).toBeLessThanOrEqual(80);
    expect(rich.layers.length-plain.layers.length).toBeGreaterThan(30);
    expect(inspectPaperCraft({...rich,layers:[...rich.layers,...Array.from({length:20},(_,i)=>({
      ...rich.layers[0],id:"overflow-"+i,
    }))]}).some(x=>x.path==="layers")).toBe(true);
    for(const medium of PAPER_STYLES)
      expect(inspectPaperCraft(paperBotanicalSpec(medium,"portrait"))).toEqual([]);
  });
  it("compiles native three-scene FilmStage outputs and renders installed slot",async()=>{
    for(const outputId of ["landscape","portrait"]){
      const richFilm=compileFilm(chromaticFilm,{outputId});
      expect(richFilm.ok).toBe(true);
      if(richFilm.ok) expect(richFilm.film.scenes).toHaveLength(3);
      const result=compileFilm(film,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.scenes).toHaveLength(3);
      const renderSlot=await loadFilmSlots(result.film);
      const rendered=renderToStaticMarkup(React.createElement(React.Fragment,null,
        renderSlot({slot:"paper-craft-study",label:"Paper botanical",props:{
          artwork:"botanical",medium:"layered",palette:"ivory",detail:1,seed:37,
        }},{frame:160,fps:{num:30,den:1},durationFrames:180,
          width:outputId==="landscape"?960:540,height:outputId==="landscape"?540:960,
          reducedMotion:false})));
      expect(rendered).toContain('data-km-paper-layer="moth-left-fore"');
      expect(rendered).toContain('data-km-paper-layer="flower-3-top"');
    }
  });
});

