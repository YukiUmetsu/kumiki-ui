import {describe,expect,it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {compileFilm} from "../registry/video/film-document";
import {loadFilmSlots} from "../src/film/film-slots";
import manifest from "../examples/film/crayon-character-performances.film.json";

const outputs=[
  {id:"landscape" as const,width:960,height:540},
  {id:"portrait" as const,width:540,height:960},
];
describe("CRAYON1 20-second original character/dragon film proof",()=>{
 it("compiles a portable two-aspect sequence with exact shot lengths",()=>{
   for(const output of outputs){
     const compiled=compileFilm(manifest,{outputId:output.id});
     expect(compiled.ok).toBe(true);
     if(!compiled.ok)continue;
     expect(compiled.film.durationFrames).toBe(600);
     expect(compiled.film.scenes.map(s=>s.id)).toEqual(["the-little-flower","dragon-and-village"]);
   }
 });
 it("renders the same authored character rig as Storybook in both film outputs",async()=>{
   for(const output of outputs){
     const result=compileFilm(manifest,{outputId:output.id});
     if(!result.ok)throw new Error("film not compilable");
     const render=await loadFilmSlots(result.film);
     const sample=(subject:"performance"|"dragon-village",frame:number,durationFrames:number,options?:Record<string,unknown>)=>
       renderToStaticMarkup(<>{render(
         {slot:"crayon-character-film",label:"Proof",props:{subject,...(options?{options}:{})}},
         {frame,fps:{num:30,den:1},durationFrames,width:output.width,
           height:output.height,reducedMotion:false}
       )}</>);
     const face=sample("performance",176,270);
     const dragon=sample("dragon-village",207,330,{palette:"plum",cast:"duo"});
     expect(face).toContain('data-km-crayon-scene="crayon-performance-'+output.id+'"');
     expect(face).toContain('data-km-crayon-element="brow-left"');
     expect(face).toContain('data-km-crayon-underpaint="opaque"');
     expect(dragon).toContain('data-km-crayon-scene="crayon-dragon-village-'+output.id+'"');
     expect(dragon).toContain('data-km-crayon-wax=""');
     expect(sample("performance",176,270)).toBe(face);
     expect(sample("performance",176,270)).not.toBe(sample("performance",88,270));
     expect(()=>sample("performance",0,330)).toThrow(/dimensions and duration/);
     expect(()=>sample("missing" as "performance",0,270)).toThrow(/subject/);
     expect(()=>sample("performance",0,270,{detail:.7})).toThrow(/options/);
     expect(()=>sample("dragon-village",0,330,{unknown:true})).toThrow(/unknown field/);
   }
 });
});
