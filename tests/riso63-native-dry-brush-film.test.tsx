import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import {renderRisoBrushFilmSlot} from "../src/video/riso-brush-film-slot";
import {RISO_DRY_BRUSH_FILM} from "../src/video/riso-dry-brush-film";
import portable from "../examples/film/riso-dry-brush-native.film.json";

const context=(width:number,height:number,frame:number,reducedMotion=false)=>({
  frame,fps:{num:24,den:1},durationFrames:240,width,height,reducedMotion,
});
const sample=(width:number,height:number,frame:number,
  props:Record<string,unknown>={},reducedMotion=false)=>
  renderToStaticMarkup(<>{renderRisoBrushFilmSlot(
    {slot:"riso-dry-brush",label:"Dry-brush film",props},
    context(width,height,frame,reducedMotion))}</>);
const originalPaths=(html:string)=>[...html.matchAll(
  /data-km-riso62-source-path="" d="([^"]+)"/g
)].map(m=>m[1]);

describe("RISO63 physical two-spot ink: portable FD1 production film",()=>{
  it("matches authored portable JSON and compiles exact 10s/24fps outputs",()=>{
    expect(portable).toEqual(RISO_DRY_BRUSH_FILM);
    for(const [id,w,h] of [["landscape",960,540],["portrait",540,960]] as const){
      const result=compileFilm(RISO_DRY_BRUSH_FILM,{outputId:id});
      expect(result.ok).toBe(true);
      if(!result.ok)throw Error("RISO63 compiled film required");
      expect([result.film.width,result.film.height,result.film.durationFrames])
        .toEqual([w,h,240]);
      expect(result.film.scenes).toHaveLength(1);
      expect(result.film.scenes[0].kind).toBe("slot");
    }
  });
  for(const [name,w,h] of [["landscape",960,540],["portrait",540,960]] as const){
    it("resolves real source masters in FD1 at 0/120/239 for "+name,async()=>{
      const compiled=compileFilm(portable,{outputId:name});
      if(!compiled.ok)throw Error("RISO63 film did not compile");
      const production=await loadFilmSlots(compiled.film);
      const content=portable.scenes[0].content;
      const html=renderToStaticMarkup(<>{production(content,context(w,h,120))}</>);
      const direct=sample(w,h,120,content.props);
      expect(html).toBe(direct);
      expect(html).toContain('data-km-riso63-film-layout="true"');
      expect(html).toContain('data-km-riso62-absolute-frame="120"');
      expect(html).toContain('data-km-riso-plate="blue"');
      expect(html).toContain('data-km-riso-plate="red"');
      expect(html.match(/data-km-riso62-brush=""/g)).toHaveLength(20);
      expect(html).toContain('fill-rule="evenodd"');
      const source=originalPaths(html);
      expect(source).toHaveLength(20);
      expect(source.every(x=>x.includes(" Q")&&x.includes(" Z"))).toBe(true);
      const zero=sample(w,h,0,content.props);
      const tail=sample(w,h,239,content.props);
      expect(originalPaths(zero)).not.toEqual(source);
      expect(originalPaths(tail)).not.toEqual(source);
      expect(originalPaths(zero)).toEqual(originalPaths(tail));
      expect(sample(w,h,120,content.props)).toBe(direct);
    });
  }
  it("paper masters remain disjoint under separation and hold shape in reduced motion",()=>{
    const both=sample(960,540,60);
    const blue=sample(960,540,60,{plate:"blue"});
    const red=sample(960,540,60,{plate:"red"});
    expect(both).toContain('data-km-riso-plate="blue"');
    expect(both).toContain('data-km-riso-plate="red"');
    expect(blue).toContain('data-km-riso-plate="blue"');
    expect(blue).not.toContain('data-km-riso-plate="red"');
    expect(red).toContain('data-km-riso-plate="red"');
    expect(red).not.toContain('data-km-riso-plate="blue"');
    const staticA=sample(960,540,5,{},true);
    const staticB=sample(960,540,231,{},true);
    expect(originalPaths(staticA)).toEqual(originalPaths(staticB));
    expect(staticA).toContain('data-km-riso62-stroke-motion="false"');
    expect(staticA).not.toMatch(/<image|<foreignObject|feGaussianBlur/);
  });
  it("rejects invalid frames, unknown source ink and unbounded film arguments",()=>{
    for(const props of [
      {offsetFrame:-1},{offsetFrame:241},{offsetFrame:.5},
      {plate:"rgb"},{seed:-1},{seed:NaN},{dryness:1.01},
      {inkScale:Infinity},{registration:1.1},{grain:NaN},
    ]){
      expect(()=>sample(960,540,20,props)).toThrow(RangeError);
    }
    expect(()=>sample(960,540,-1)).toThrow(RangeError);
    expect(()=>sample(960,540,240)).toThrow(RangeError);
    expect(()=>sample(960,540,230,{offsetFrame:11})).toThrow(RangeError);
    expect(()=>renderToStaticMarkup(<>{renderRisoBrushFilmSlot(
      {slot:"wrong",label:"No"},context(960,540,20))}</>)).toThrow(RangeError);
  });
});
