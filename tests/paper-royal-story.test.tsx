import {describe,expect,it} from "vitest";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {evaluatePaperCraft,inspectPaperCraft,MAX_PAPER_LAYERS,PAPER_STYLES} from "../registry/video/paper-craft";
import {compilePaperDirector,inspectPaperDirector,resolvePaperDirector} from "../registry/video/paper-director";
import {PaperDirectorStage} from "../registry/video/paper-director-react";
import {ROYAL_STORY_BEATS,paperRoyalLanternFilm,paperRoyalStoryScene} from "../src/video/paper-royal-story";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import fixture from "../examples/film/paper-royal-lantern.film.json";

describe("PAPER-R1 — original princess-prince woodland fairy tale",()=>{
  it("delivers three visible beats with coherent native 16:9/9:16 sets",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const style of PAPER_STYLES){
        const film=paperRoyalLanternFilm(style,37,.75);
        expect(inspectPaperDirector(film)).toEqual([]);
        const plan=compilePaperDirector(film);
        expect(plan.durationFrames).toBe(720);
        expect(plan.shots.map(s=>s.id)).toEqual(ROYAL_STORY_BEATS.map(b=>b.id));
        for(const frame of [0,90,239,240,350,479,480,620,719]){
          const scene=resolvePaperDirector(plan,frame,aspect);
          expect(inspectPaperCraft(scene.spec)).toEqual([]);
          expect(scene.spec.width).toBe(aspect==="portrait"?540:960);
          expect(scene.spec.height).toBe(aspect==="portrait"?960:540);
          expect(scene.spec.startAssembled).toBe(true);
          expect(scene.spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
          const at=evaluatePaperCraft(scene.spec,scene.localFrame);
          expect(at.layers.every(l=>l.progress===1&&l.opacity===1)).toBe(true);
        }
      }
    }
  });
  it("contains distinct opaque royal and animal anatomy, real holes and connected joints",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=paperRoyalStoryScene("layered",aspect,1,37,1);
      const id=new Set(scene.layers.map(l=>l.id));
      expect(id.size).toBe(scene.layers.length);
      expect(scene.layers.length).toBeGreaterThan(88);
      for(const name of [
        "princess-bodice","princess-head","princess-lashes","princess-tiara",
        "princess-hair-braid","princess-right-sleeve","prince-coat",
        "prince-left-arm","prince-crown","prince-head","prince-belt-clasp",
        "fox-body","fox-tail","rabbit-body","rabbit-ear-left",
        "deer-body","deer-antlers","owl-body","owl-wing-right",
        "lantern-outer","lantern-star","moon-face","castle-walls",
        "forest-left-wood","forest-right-foliage"]){
        expect(id.has(name),name).toBe(true);
      }
      expect(scene.layers.every(l=>/^#[0-9a-fA-F]{6}$/.test(l.color))).toBe(true);
      expect(scene.layers.filter(l=>l.parentId).length).toBeGreaterThan(40);
      expect(scene.layers.find(l=>l.id==="lantern-outer")?.holes?.length).toBe(1);
      expect(scene.layers.find(l=>l.id==="stage-frame")?.holes?.length).toBe(1);
      for(const sheet of scene.layers.filter(l=>l.parentId)){
        expect(id.has(sheet.parentId!),sheet.id).toBe(true);
        expect(sheet.pivot?.length,sheet.id).toBe(2);
      }
    }
  });
  it("is deterministic, has meaningful body/arm motion and supports a static reduced-motion pose",()=>{
    const spec=paperRoyalStoryScene("layered","landscape",2,37,1);
    const a=evaluatePaperCraft(spec,44);
    evaluatePaperCraft(spec,221);
    expect(evaluatePaperCraft(spec,44)).toEqual(a);
    const paused=evaluatePaperCraft(spec,17,true);
    expect(evaluatePaperCraft(spec,204,true).layers).toEqual(paused.layers);
    const ids=spec.layers.map(l=>l.id);
    const princess=ids.indexOf("princess-bodice");
    const prince=ids.indexOf("prince-coat");
    const arm=ids.indexOf("princess-right-sleeve");
    expect(evaluatePaperCraft(spec,0).layers[princess].worldMatrix)
      .not.toEqual(evaluatePaperCraft(spec,120).layers[princess].worldMatrix);
    expect(evaluatePaperCraft(spec,0).layers[prince].worldMatrix)
      .not.toEqual(evaluatePaperCraft(spec,120).layers[prince].worldMatrix);
    expect(evaluatePaperCraft(spec,0).layers[arm].worldMatrix)
      .not.toEqual(evaluatePaperCraft(spec,120).layers[arm].worldMatrix);
    expect(paperRoyalStoryScene("layered","landscape",2,37,1)).toEqual(spec);
  });
  it("keeps every scene rendered as a physical paper puppet rather than ghosted alpha",()=>{
    const film=paperRoyalLanternFilm("layered",37,.75);
    for(const aspect of ["landscape","portrait"] as const){
      const html=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
        film,aspect,frame:610,shadowStrength:.92,tooth:.65,edgeStrength:.55,
      }));
      expect(html).toContain('data-km-paper-director="the-moonlit-lantern"');
      expect(html).toContain('data-km-paper-parent="princess-bodice"');
      expect(html).toContain('data-km-paper-parent="fox-body"');
      expect(html).toContain('data-km-paper-layer="lantern-star"');
      expect(html).toContain('clip-rule="evenodd"');
      expect(html).not.toContain('fill-opacity="0.');
    }
  });
  it("rejects bad authoring and invalid film controls",()=>{
    expect(()=>paperRoyalStoryScene("bad" as never,"landscape",0)).toThrow();
    expect(()=>paperRoyalStoryScene("layered","landscape",3)).toThrow();
    expect(()=>paperRoyalStoryScene("layered","square" as never,1)).toThrow();
    expect(()=>paperRoyalLanternFilm("layered",NaN)).toThrow();
    expect(()=>paperRoyalLanternFilm("layered",37,1.3)).toThrow();
  });
  it("exports the native 24s story into FilmStage for both orientations",async()=>{
    for(const outputId of ["landscape","portrait"] as const){
      const compilation=compileFilm(fixture,{outputId});
      expect(compilation.ok).toBe(true);
      if(!compilation.ok)continue;
      const render=await loadFilmSlots(compilation.film);
      const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
        render({slot:"paper-craft-director",label:"Royal lantern",props:{
          preset:"royal-lantern",medium:"layered",seed:37,motion:.75,
        }},{
          frame:615,durationFrames:720,fps:{num:30,den:1},
          width:outputId==="portrait"?540:960,
          height:outputId==="portrait"?960:540,reducedMotion:false,
        })));
      expect(html).toContain("data-km-paper-craft");
      expect(html).toContain("the-moonlit-lantern");
    }
  });
});