import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS, PAPER_STYLES } from "../registry/video/paper-craft";
import { PaperCraftStage } from "../registry/video/paper-craft-react";
import { PAPER_SCENERIES, PAPER_SCENERY_PALETTES, paperScenerySpec } from "../registry/video/paper-scenery-kit";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import film from "../examples/film/paper-craft-scenery.film.json";

describe("PAPER1 original hand-cut scenery worlds",()=>{
  for(const scenery of PAPER_SCENERIES){
    for(const aspect of ["landscape","portrait"] as const){
      for(const palette of PAPER_SCENERY_PALETTES){
        it(scenery+" "+aspect+" "+palette+" produces opaque layered cut-paper",()=>{
          const spec=paperScenerySpec("layered",aspect,{scenery,palette,detail:1,breeze:.5,seed:37});
          expect(inspectPaperCraft(spec)).toEqual([]);
          expect(spec.layers.length).toBeGreaterThan(38);
          expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
          expect(new Set(spec.layers.map(layer=>layer.id)).size).toBe(spec.layers.length);
          expect(spec.layers.every(layer=>/^#[a-fA-F0-9]{6}$/.test(layer.color))).toBe(true);
          expect(new Set(spec.layers.map(layer=>layer.color)).size).toBeGreaterThan(8);
          expect(spec.layers.find(layer=>layer.id==="scenery-frame")?.holes).toHaveLength(1);
          expect(spec.layers.find(layer=>layer.id==="scenery-edge-inlay")?.holes).toHaveLength(1);
          const page=renderToStaticMarkup(React.createElement(PaperCraftStage,{
            spec,frame:220,shadowStrength:.98,edgeStrength:.75,tooth:.7
          }));
          expect(page).toContain('data-km-paper-craft');
          expect(page).toContain('viewBox="0 0 '+spec.width+' '+spec.height+'"');
          expect(page).toContain('data-km-paper-layer="scenery-frame"');
          expect(page).toContain('clip-rule="evenodd"');
          expect((page.match(/data-km-paper-layer=/g)||[])).toHaveLength(spec.layers.length);
          expect(page).not.toContain('fill-opacity="0.');
        });
      }
    }
  }
  it("uses authored foliage, creek and tree connectivity instead of a flat terrain band",()=>{
    const world=paperScenerySpec("layered","landscape",{
      scenery:"woodland",palette:"sage",detail:1,seed:37,breeze:.5});
    const names=world.layers.map(layer=>layer.id);
    for(const part of ["woodland-hill-0","woodland-hill-4","woodland-stream",
      "woodland-trunk-0","woodland-trunk-1","woodland-bough-0-1",
      "woodland-foliage-1-2","woodland-far-pines","woodland-fern-0",
      "woodland-flower-0","woodland-stream-tail","woodland-bank-pebble-0","scenery-frame"]){
      expect(names).toContain(part);
    }
    expect(names.filter(id=>id.startsWith("woodland-fern-")).length).toBeGreaterThan(8);
    expect(names.filter(id=>id.startsWith("woodland-water-cut-"))).toHaveLength(6);
    const crowns=world.layers.filter(layer=>layer.id.startsWith("woodland-foliage-"));
    expect(crowns).toHaveLength(6);
    expect(crowns.every(layer=>layer.motion==="flutter"&&!!layer.pivot)).toBe(true);
    expect(crowns.every(layer=>(layer.path.match(/C/g)||[]).length>=6)).toBe(true);
  });
  it("constructs mountains, snow plates, terraces and far-shore reflections",()=>{
    const world=paperScenerySpec("layered","portrait",{
      scenery:"alpine-lake",palette:"moonlight",detail:1,seed:37,breeze:.4});
    const names=world.layers.map(layer=>layer.id);
    for(const part of ["alpine-peak-0","alpine-peak-1","alpine-peak-2",
      "alpine-snowcap-0","alpine-snowcap-2","alpine-scree-0-1",
      "alpine-lake","alpine-lake-bank","alpine-distant-pines",
      "alpine-ledge-0","alpine-ledge-1","alpine-reflection-0",
      "alpine-moss-0","alpine-bird-0","scenery-frame"]){
      expect(names).toContain(part);
    }
    expect(names.filter(id=>id.startsWith("alpine-reflection-")).length).toBeGreaterThan(10);
  });
  it("detail changes actual geometry, while frame seeks are deterministic",()=>{
    for(const scenery of PAPER_SCENERIES){
      const sparse=paperScenerySpec("layered","landscape",{scenery,detail:0,breeze:.3,seed:12});
      const fine=paperScenerySpec("layered","landscape",{scenery,detail:1,breeze:.3,seed:12});
      expect(inspectPaperCraft(sparse)).toEqual([]);
      expect(inspectPaperCraft(fine)).toEqual([]);
      expect(fine.layers.length).toBeGreaterThan(sparse.layers.length);
      const same=paperScenerySpec("layered","landscape",{scenery,detail:1,breeze:.3,seed:12});
      expect(same).toEqual(fine);
      const frame=evaluatePaperCraft(fine,183);
      evaluatePaperCraft(fine,11);evaluatePaperCraft(fine,234);
      expect(evaluatePaperCraft(fine,183)).toEqual(frame);
      expect(evaluatePaperCraft(fine,0,true).layers)
        .toEqual(evaluatePaperCraft(fine,237,true).layers);
    }
  });
  it("breeze affects tree and pine rigs but never opacity or paper geometry",()=>{
    const calm=paperScenerySpec("layered","landscape",{scenery:"woodland",breeze:0,detail:1,seed:8});
    const lively=paperScenerySpec("layered","landscape",{scenery:"woodland",breeze:1,detail:1,seed:8});
    expect(calm.layers.map(({id,path,color})=>({id,path,color})))
      .toEqual(lively.layers.map(({id,path,color})=>({id,path,color})));
    expect(calm.layers.filter(layer=>layer.motion==="flutter").every(layer=>layer.swingDegrees===0)).toBe(true);
    expect(lively.layers.filter(layer=>layer.motion==="flutter").some(layer=>(layer.swingDegrees??0)>1)).toBe(true);
  });
  it("supports all PAPER1 media without hidden shape deformation",()=>{
    for(const style of PAPER_STYLES){
      const spec=paperScenerySpec(style,"portrait",{scenery:"woodland",detail:.7});
      expect(inspectPaperCraft(spec)).toEqual([]);
      expect(spec.layers.length).toBeLessThanOrEqual(128);
    }
  });
  it("rejects invalid scenery, palette, seed and out-of-range controls",()=>{
    expect(()=>paperScenerySpec("layered","landscape",{scenery:"bad" as never})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{palette:"bad" as never})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","square" as never)).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{seed:NaN})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{detail:Infinity})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{breeze:-.1})).toThrow(RangeError);
    expect(()=>paperScenerySpec("layered","landscape",{breeze:1.1})).toThrow(RangeError);
  });
  it("renders both film landscape subjects through native FilmStage in both outputs",async()=>{
    for(const outputId of ["landscape","portrait"]){
      const result=compileFilm(film,{outputId});
      expect(result.ok).toBe(true);
      if(!result.ok)continue;
      expect(result.film.scenes).toHaveLength(2);
      const renderer=await loadFilmSlots(result.film);
      for(const scenery of PAPER_SCENERIES){
        const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
          renderer({slot:"paper-craft-study",label:scenery,props:{
            artwork:"scenery",scenery,sceneryPalette:"moonlight",detail:1,breeze:.3,
            medium:"lightbox",seed:37,
          }},{frame:220,durationFrames:240,fps:{num:30,den:1},
             width:outputId==="landscape"?960:540,
             height:outputId==="landscape"?540:960,
             reducedMotion:false})));
        expect(html).toContain("data-km-paper-craft");
        expect(html).toContain('data-km-paper-layer="scenery-frame"');
      }
    }
  });
});
