import {describe,expect,it} from "vitest";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {compilePaperDirector,inspectPaperDirector,resolvePaperDirector} from "../registry/video/paper-director";
import {PaperDirectorStage} from "../registry/video/paper-director-react";
import {paperDirectorDemo} from "../src/video/paper-director-demo";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import fixture from "../examples/film/paper-craft-page-turn.film.json";

const make=()=>paperDirectorDemo("layered",37,.7,true,"page-turn");
describe("PAPER-D3 printed leaf and book-gutter transition",()=>{
  it("resolves previous and next complete paper sets continuously across the edit in both aspects",()=>{
    const film=make(),plan=compilePaperDirector(film);
    expect(inspectPaperDirector(film)).toEqual([]);
    for(const aspect of ["landscape","portrait"] as const){
      const pre=resolvePaperDirector(plan,227,aspect);
      expect(pre.pageTurn).toBeUndefined();
      for(const [frame,phase] of [[228,"closing"],[233,"closing"],[239,"closing"],
        [240,"opening"],[246,"opening"],[251,"opening"]] as const){
        const shot=resolvePaperDirector(plan,frame,aspect);
        expect(shot.curtain).toBeUndefined();
        expect(shot.pageTurn?.phase).toBe(phase);
        expect(shot.pageTurn?.spec.kind).toBe("paper-page-turn");
        expect(shot.pageTurn?.outgoing.id).toContain("paper-scenery");
        expect(shot.pageTurn?.incoming.id).toContain("paper-botanical");
        expect(shot.pageTurn?.outgoingFrame).toBe(frame<240?frame:239);
        expect(shot.pageTurn?.incomingFrame).toBe(frame<240?0:frame-240);
      }
      expect(resolvePaperDirector(plan,239,aspect).pageTurn?.progress).toBe(1);
      expect(resolvePaperDirector(plan,240,aspect).pageTurn?.progress).toBe(0);
      expect(resolvePaperDirector(plan,252,aspect).pageTurn).toBeUndefined();
      // The next edit is written in the opposite direction.
      expect(resolvePaperDirector(plan,479,aspect).pageTurn?.spec.direction).toBe("right-to-left");
    }
  });
  it("prints the outgoing artwork onto a 3D hinged page over the live incoming diorama",()=>{
    const film=make();
    for(const aspect of ["landscape","portrait"] as const){
      for(const [frame,phase,angle] of [
        [228,"closing",0],[239,"closing",88.75],
        [240,"opening",91.25],[251,"opening",180],
      ] as const){
        const html=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
          film,frame,aspect,
        }));
        expect(html).toContain('data-km-paper-page-turn=""');
        expect(html).toContain('data-km-paper-phase="'+phase+'"');
        expect(html).toContain('data-km-paper-angle="'+angle.toFixed(3)+'"');
        expect(html).toContain('data-km-paper-printed-front=""');
        expect(html).toContain('data-km-paper-leaf-verso=""');
        expect(html).toContain('data-km-paper-spine=""');
        expect(html).toContain('data-km-paper-fore-edge=""');
        if(phase==="opening")expect(html).toContain('data-km-paper-reverse-tuck=""');
        else expect(html).not.toContain('data-km-paper-reverse-tuck=""');
        expect(html).toContain('data-km-paper-next-page=""');
        expect((html.match(/data-km-paper-craft=""/g)||[]).length).toBe(2);
        expect(html).not.toContain('data-km-paper-curtain=""');
      }
      const staticHtml=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
        film,frame:239,aspect,reducedMotion:true,
      }));
      expect(staticHtml).not.toContain('data-km-paper-page-turn=""');
      expect((staticHtml.match(/data-km-paper-craft=""/g)||[]).length).toBe(1);
    }
  });
  it("rejects malformed page changes and maintains the original curtain API",()=>{
    const source=make();
    const bad=(transitionOut:unknown)=>({...source,shots:source.shots.map((shot,i)=>i===0
      ? {...shot,transitionOut:transitionOut as never}:shot)});
    for(const candidate of [
      {kind:"page-turn",durationFrames:24,color:"#FFFFFF",direction:"left-to-right"},
      {kind:"paper-page-turn",durationFrames:23,color:"#FFFFFF",direction:"left-to-right"},
      {kind:"paper-page-turn",durationFrames:24,color:"#FF00FF44",direction:"left-to-right"},
      {kind:"paper-page-turn",durationFrames:24,color:"#FFFFFF",direction:"unknown"},
    ]) expect(inspectPaperDirector(bad(candidate)).some(e=>e.path.endsWith("transitionOut"))).toBe(true);
    const original=paperDirectorDemo("layered",37,.7,true,"curtain");
    expect(resolvePaperDirector(compilePaperDirector(original),239,"landscape").curtain?.phase)
      .toBe("closing");
    const noEdit=paperDirectorDemo("layered",37,.7,false,"page-turn");
    expect(resolvePaperDirector(compilePaperDirector(noEdit),239,"landscape").pageTurn)
      .toBeUndefined();
  });
  it("exports a portable FD1 film in both native output formats",async()=>{
    for(const outputId of ["landscape","portrait"] as const){
      const compiled=compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      const render=await loadFilmSlots(fixture as never);
      const node=render(fixture.scenes[0].content,{
        frame:239,fps:{num:30,den:1},durationFrames:960,
        width:outputId==="landscape"?960:540,height:outputId==="landscape"?540:960,
        reducedMotion:false,
      });
      const html=renderToStaticMarkup(React.createElement(React.Fragment,null,node));
      expect(html).toContain('data-km-paper-page-turn=""');
      expect(html).toContain('data-km-paper-director="material-paper-tour"');
      expect((html.match(/data-km-paper-craft=""/g)||[]).length).toBe(2);
    }
  });
});
