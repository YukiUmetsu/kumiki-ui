import { describe,expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { compileFilm } from "../registry/video/film-document";
import { inspectRisoCharacter,evaluateRisoCharacter } from "../registry/video/riso-character";
import { RisoCharacterInk } from "../registry/video/riso-character-react";
import { COURIER,PAPER_BIRD,RisoCharacterPerformance,risoPerformanceSpec } from "../src/video/riso-character-demo";
import { RISO_CHARACTER_FILM } from "../src/video/riso-character-film";
import { loadFilmSlots } from "../src/film/film-slots";
import portable from "../examples/film/riso-character-performance.film.json";

describe("RISO2 ink-separated, expressive rig performance", () => {
  for (const spec of [COURIER,PAPER_BIRD]) {
    it("validates anatomy-agnostic rig "+spec.id+" against real spot plates",()=>{
      expect(inspectRisoCharacter(spec,["blue","red"])).toEqual([]);
      expect(new Set(spec.joints.map(j=>j.id)).size).toBe(spec.joints.length);
      expect(new Set(spec.parts.map(p=>p.id)).size).toBe(spec.parts.length);
      const render=evaluateRisoCharacter(spec,130,{allowedPlates:["blue","red"]});
      expect(render.parts).toHaveLength(spec.parts.length);
      expect(new Set(render.parts.map(p=>p.plate))).toEqual(new Set(["blue","red"]));
      expect(render.parts.every(p=>p.transform.startsWith("matrix("))).toBe(true);
    });
    it("seeks exactly, holds printed frames and supports reduced motion "+spec.id,()=>{
      const at=(frame:number)=>evaluateRisoCharacter(spec,frame);
      const sample=at(108),hold=at(239);
      at(0);at(200);at(45);at(239);
      expect(at(108)).toEqual(sample);
      expect(at(500)).toEqual(hold);
      expect(evaluateRisoCharacter(spec,0,{reducedMotion:true})).toEqual(hold);
      expect(at(108).sampledFrame).toBe(108);
      expect(at(109).sampledFrame).toBe(108);
    });
  }
  it("supports animated mouth, eye blink, smile and parent-linked joint transforms",()=>{
    const at=(frame:number)=>evaluateRisoCharacter(COURIER,frame);
    expect(at(79).expression).toBe("blink");
    expect(at(160).expression).toBe("speak");
    expect(at(210).expression).toBe("smile");
    const eyes=(frame:number)=>at(frame).parts.find(p=>p.id==="eye-line")!.d;
    expect(eyes(79)).not.toBe(eyes(60));
    const mouth=(frame:number)=>at(frame).parts.find(p=>p.id==="mouth")!.d;
    expect(mouth(160)).not.toBe(mouth(100));
    expect(mouth(210)).not.toBe(mouth(160));
    const arm=(frame:number)=>at(frame).parts.find(p=>p.id==="left-arm-ink")!.transform;
    expect(arm(20)).not.toBe(arm(60));
  });
  it("rejects parent cycles, unknown plate, injection and out-of-order animation",()=>{
    const invalid={...COURIER,joints:COURIER.joints.map(j=>j.id==="root"?{...j,parent:"head"}:j)};
    expect(inspectRisoCharacter(invalid).map(e=>e.message).join(" ")).toMatch(/cycle/);
    const unsafe={...COURIER,parts:COURIER.parts.map((p,i)=>i? p:{...p,d:"M0 0 <script>"})};
    expect(inspectRisoCharacter(unsafe).some(e=>e.path.endsWith("/d"))).toBe(true);
    expect(inspectRisoCharacter(COURIER,["blue"]).some(e=>e.path.endsWith("/plate"))).toBe(true);
    const reversed={...COURIER,joints:COURIER.joints.map((j,i)=>i?j:{...j,keys:[{frame:45},{frame:12}]})};
    expect(inspectRisoCharacter(reversed).some(e=>e.path.includes("/keys/"))).toBe(true);
    expect(()=>evaluateRisoCharacter(COURIER,-1)).toThrow(RangeError);
  });
  it("isolates blue and red artwork and places expressive parts inside the physical plates",()=>{
    const spec=risoPerformanceSpec("landscape");
    const blue=renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:COURIER,frame:160,plateId:"blue",paint:{solid:spec.plates[0].color,dots:"url(#blue)"},
    }));
    expect(blue).toContain('data-km-riso-character="courier"');
    expect(blue).toContain('data-km-riso-part="eye-line"');
    expect(blue).not.toContain('data-km-riso-part="mouth"');
    expect(blue).not.toContain("<script");
    expect(blue).toContain("matrix(");
    const red=renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:COURIER,frame:160,plateId:"red",paint:{solid:spec.plates[1].color,dots:"url(#red)"},
    }));
    expect(red).toContain('data-km-riso-part="mouth"');
    expect(red).not.toContain('data-km-riso-part="eye-line"');
    expect(()=>renderToStaticMarkup(createElement(RisoCharacterInk,{
      spec:COURIER,frame:160,plateId:"green",paint:{solid:"#008800",dots:"#008800"},
    }))).toThrow(/no authored ink/);
  });
  for(const aspect of ["landscape","portrait"] as const){
    it("renders two moving characters with correct spot-ink separation and authored aspect "+aspect,()=>{
      const html=renderToStaticMarkup(createElement(RisoCharacterPerformance,{
        aspect,frame:160,visiblePlateIds:["red"],misregistration:.3,grain:.5,
      }));
      expect(html).toContain('data-km-riso-performance=""');
      expect(html).toContain('data-km-riso-plate="red"');
      expect(html).not.toContain('data-km-riso-plate="blue"');
      expect(html).toContain('data-km-riso-character="paper-bird"');
      expect(html).toContain('data-km-riso-character="courier"');
      expect(html).toContain('data-km-riso-expression="speak"');
      expect(html).toContain(aspect==="portrait"?'viewBox="0 0 540 960"':'viewBox="0 0 960 540"');
    });
  }
  it("uses the existing six-second-plus FilmStage clock with portable three-scene FD1",async()=>{
    expect(portable).toEqual(RISO_CHARACTER_FILM);
    for(const aspect of ["landscape","portrait"] as const){
      const compiled=compileFilm(portable,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(240);
      expect(compiled.film.scenes).toHaveLength(3);
      const render=await loadFilmSlots(compiled.film);
      const html=renderToStaticMarkup(createElement("div",null,render(
        {slot:"riso-character-performance",label:"Actor study",props:{offsetFrame:90}},
        {frame:67,fps:{num:30,den:1},durationFrames:85,width:compiled.film.width,
          height:compiled.film.height,reducedMotion:false},
      )));
      expect(html).toContain('data-km-riso-performance-frame="157"');
      expect(html).toContain('data-km-riso-character="courier"');
      expect(html).toContain('data-km-riso-character="paper-bird"');
    }
  });
});
