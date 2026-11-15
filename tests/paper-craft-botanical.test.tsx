import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { evaluatePaperCraft, inspectPaperCraft, PAPER_STYLES } from "../registry/video/paper-craft";
import { paperBotanicalSpec } from "../registry/video/paper-botanical-kit";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/paper-craft-botanical.film.json";

describe("PAPER1 ArtCraft botanical construction", () => {
  for(const aspect of ["landscape","portrait"] as const){
    for(const palette of ["nocturne","ivory"] as const){
      it("validates original stock and real cutout holes for "+palette+" "+aspect,()=>{
        const spec=paperBotanicalSpec("layered",aspect,{palette,detail:1,seed:37});
        expect(inspectPaperCraft(spec)).toEqual([]);
        expect(spec.layers.length).toBeGreaterThan(60);
        expect(spec.layers.length).toBeLessThanOrEqual(80);
        expect(new Set(spec.layers.map(l=>l.id)).size).toBe(spec.layers.length);
        expect(spec.layers.filter(l=>l.id.startsWith("flower-"))).toHaveLength(20);
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
    const plain=paperBotanicalSpec("layered","landscape",{detail:0,seed:7});
    const rich=paperBotanicalSpec("layered","landscape",{detail:1,seed:7});
    expect(plain.layers.length).toBeLessThan(rich.layers.length);
    expect(inspectPaperCraft(plain)).toEqual([]);
    expect(inspectPaperCraft(rich)).toEqual([]);
    const same=evaluatePaperCraft(rich,146);
    evaluatePaperCraft(rich,7);evaluatePaperCraft(rich,65);
    expect(evaluatePaperCraft(rich,146)).toEqual(same);
    expect(evaluatePaperCraft(rich,0,true).layers)
      .toEqual(evaluatePaperCraft(rich,211,true).layers);
    expect(paperBotanicalSpec("layered","landscape",{detail:1,seed:7})).toEqual(rich);
    expect(paperBotanicalSpec("layered","landscape",{detail:1,seed:8}).layers).not.toEqual(rich.layers);
    expect(()=>paperBotanicalSpec("layered","landscape",{seed:NaN})).toThrow(RangeError);
    for(const medium of PAPER_STYLES)
      expect(inspectPaperCraft(paperBotanicalSpec(medium,"portrait"))).toEqual([]);
  });
  it("compiles native three-scene FilmStage outputs and renders installed slot",async()=>{
    for(const outputId of ["landscape","portrait"]){
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
