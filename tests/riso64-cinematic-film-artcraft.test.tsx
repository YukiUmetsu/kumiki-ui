import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import {RISO_CINEMATIC_FILM} from "../src/video/riso-cinematic-film";
import {
  RISO_CINEMATIC_BEATS,cinematicDuration,evaluateRisoCinematic,risoCinematicCamera,
} from "../src/video/riso-cinematic-timeline";
import type {RisoCinematicBeat} from "../src/video/riso-cinematic-timeline";
import {renderRisoCinematicFilmSlot} from "../src/video/riso-cinematic-slot";
import portable from "../examples/film/riso-cinematic-two-plate.film.json";

const ctx=(w:number,h:number,frame:number,duration:number,reducedMotion=false)=>({
  width:w,height:h,frame,durationFrames:duration,
  fps:{num:24,den:1},reducedMotion,
});
const slot=(beat:RisoCinematicBeat,frame:number,w=960,h=540,reducedMotion=false)=>{
  return renderToStaticMarkup(<>{renderRisoCinematicFilmSlot({
    slot:"riso-dry-brush-cinematic",label:"RISO64",props:{beat,seed:62},
  },ctx(w,h,frame,cinematicDuration(beat),reducedMotion))}</>);
};
const paths=(html:string)=>[...html.matchAll(
  /data-km-riso62-source-path="" d="([^"]+)"/g,
)].map(m=>m[1]);

describe("RISO64 five-beat native two-drum cinematic ArtCraft film",()=>{
  it("compiles a portable 288-frame 12s, 24fps film for both native orientations",()=>{
    expect(portable).toEqual(RISO_CINEMATIC_FILM);
    expect(RISO_CINEMATIC_BEATS.map(b=>b.duration)).toEqual([48,52,74,48,66]);
    const total=RISO_CINEMATIC_BEATS.reduce((sum,b)=>sum+b.duration,0);
    expect(total).toBe(288);
    for(const [id,w,h] of [["landscape",960,540],["portrait",540,960]] as const){
      const result=compileFilm(portable,{outputId:id});
      expect(result.ok).toBe(true);
      if(!result.ok)throw new Error("RISO64 compile rejected authored film");
      expect([result.film.width,result.film.height,result.film.durationFrames])
        .toEqual([w,h,total]);
      expect(result.film.scenes.map(scene=>scene.kind))
        .toEqual(Array(5).fill("slot"));
      expect(result.film.scenes.map(scene=>scene.id))
        .toEqual(RISO_CINEMATIC_BEATS.map(x=>x.id));
    }
  });
  it("has intentional continuous physical press progress and continuous camera scale across cuts",()=>{
    let previous:ReturnType<typeof evaluateRisoCinematic>|null=null;
    for(const beat of RISO_CINEMATIC_BEATS){
      const beginning=evaluateRisoCinematic(beat.id,0);
      const ending=evaluateRisoCinematic(beat.id,beat.duration-1);
      expect(beginning.printFrame).toBeGreaterThanOrEqual(previous?.printFrame??0);
      if(previous){
        expect(beginning.zoom).toBeCloseTo(previous.zoom,5);
        expect(beginning.focusX).toBeCloseTo(previous.focusX,5);
        expect(beginning.focusY).toBeCloseTo(previous.focusY,5);
      }
      expect(ending.printFrame).toBeGreaterThanOrEqual(beginning.printFrame);
      for(let t=0;t<beat.duration;t++){
        const pose=evaluateRisoCinematic(beat.id,t);
        const camera=risoCinematicCamera(pose,960,540);
        expect(camera.scale).toBeGreaterThanOrEqual(1);
        expect(camera.scale).toBeLessThanOrEqual(4);
        expect(camera.x).toBeGreaterThanOrEqual(-960*(camera.scale-1)-1e-6);
        expect(camera.y).toBeGreaterThanOrEqual(-540*(camera.scale-1)-1e-6);
        expect(camera.x).toBeLessThanOrEqual(0);
        expect(camera.y).toBeLessThanOrEqual(0);
      }
      previous=ending;
    }
    expect(previous?.printFrame).toBe(239);
    expect(previous?.zoom).toBe(1);
    expect(evaluateRisoCinematic("vermilion-pass",0).printFrame).toBe(105);
    expect(evaluateRisoCinematic("vermilion-pass",73).printFrame).toBe(228);
    expect(evaluateRisoCinematic("original-hold",65).sourceFrame)
      .toBeGreaterThan(evaluateRisoCinematic("original-hold",0).sourceFrame);
  });
  it("renders the original source splinters inside two actual separate masters and stable paper",()=>{
    for(const [w,h] of [[960,540],[540,960]]){
      const macro=slot("cobalt-macro",24,w,h);
      const red=slot("vermilion-pass",56,w,h);
      const finish=slot("original-hold",65,w,h);
      expect(macro).toContain('data-km-riso64-shot="cobalt-macro"');
      expect(macro).toContain('data-km-riso64-master="blue"');
      expect(macro).toContain('data-km-riso-plate="blue"');
      expect(macro).not.toContain('data-km-riso-plate="red"');
      expect(red).toContain('data-km-riso-plate="red"');
      expect(red).toContain('data-km-riso-plate="blue"');
      expect(finish).toContain('data-km-riso64-camera-zoom="1.00000"');
      expect(finish).toContain('data-km-riso64-press-frame="239"');
      expect(finish).toContain('data-km-riso62-stroke-motion="true"');
      expect(paths(finish)).toHaveLength(20);
      expect(finish.match(/data-km-riso62-brush=""/g)).toHaveLength(20);
      expect(finish).toContain('fill-rule="evenodd"');
      expect(finish).not.toMatch(/<image|<foreignObject|feGaussianBlur/);
    }
  });
  it("production loadFilmSlots uses the same original source adapter as Storybook",async()=>{
    for(const [id,w,h] of [["landscape",960,540],["portrait",540,960]] as const){
      const compiled=compileFilm(portable,{outputId:id});
      if(!compiled.ok)throw Error("RISO64 requires compiled FilmStage");
      const render=await loadFilmSlots(compiled.film);
      for(const beat of RISO_CINEMATIC_BEATS){
        const content={slot:"riso-dry-brush-cinematic",label:"RISO64",
          props:{beat:beat.id,seed:62}};
        const context=ctx(w,h,Math.floor(beat.duration/2),beat.duration);
        expect(renderToStaticMarkup(<>{render(content,context)}</>)).toEqual(
          renderToStaticMarkup(<>{renderRisoCinematicFilmSlot(content,context)}</>),
        );
      }
    }
  });
  it("a nonsequential source seek is exact and reduced motion shows completed still print",()=>{
    const a=slot("overprint-macro",20);
    slot("original-hold",65);
    slot("cobalt-pullback",0);
    expect(slot("overprint-macro",20)).toBe(a);
    for(const beat of RISO_CINEMATIC_BEATS){
      const first=slot(beat.id,0,960,540,true);
      const last=slot(beat.id,beat.duration-1,960,540,true);
      expect(first).toBe(last.replace(
        /data-km-riso64-frame="\d+"/, 'data-km-riso64-frame="0"'
      ));
      expect(first).toContain('data-km-riso64-camera-zoom="1.00000"');
      expect(first).toContain('data-km-riso64-press-frame="239"');
      expect(first).toContain('data-km-riso62-stroke-motion="false"');
    }
  });
  it("rejects unknown beat, frame, aspect and invalid stock controls",()=>{
    expect(()=>evaluateRisoCinematic("invalid" as RisoCinematicBeat,0))
      .toThrow(RangeError);
    expect(()=>evaluateRisoCinematic("cobalt-macro",-1)).toThrow(RangeError);
    expect(()=>evaluateRisoCinematic("cobalt-macro",48)).toThrow(RangeError);
    for(const bad of [{seed:-1},{grain:1.1},{dryness:NaN},
      {inkScale:0},{registration:Infinity}]){
      expect(()=>renderToStaticMarkup(<>{renderRisoCinematicFilmSlot(
        {slot:"riso-dry-brush-cinematic",label:"bad",
          props:{beat:"cobalt-macro",...bad}},ctx(960,540,0,48),
      )}</>)).toThrow(RangeError);
    }
    expect(()=>risoCinematicCamera({...evaluateRisoCinematic("cobalt-macro",0),
      zoom:5},960,540)).toThrow(RangeError);
  });
});
