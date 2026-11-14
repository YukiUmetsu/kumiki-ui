import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  assertRisoCharacterScene, evaluateRisoCharacterScene, inspectRisoCharacterScene,
  sampleRisoMotion,
} from "../registry/video/riso-performance";
import { RisoCharacterStage } from "../registry/video/riso-performance-react";
import type { RisoCharacterSceneSpec, RisoJointSpec, RisoPoseKey } from "../registry/video/riso-performance";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import { risoPerformanceScene, risoPerformanceSceneStable } from "../src/video/riso-performance-fixtures";
import { RISO_CHARACTER_FILM } from "../src/video/riso-performance-film";
import portable from "../examples/film/riso-animated-characters.film.json";

const scene = () => risoPerformanceScene("postcard", "landscape");
describe("RISC1 generic print-native character rigs and authored cinema", () => {
  for (const subject of ["postcard", "night-garden"] as const) {
    for (const aspect of ["landscape", "portrait"] as const) {
      it("validates two actors and print geometry: " + subject + "/" + aspect, () => {
        const s = risoPerformanceScene(subject, aspect);
        expect(inspectRisoCharacterScene(s)).toEqual([]);
        expect(s.actors.length).toBe(2);
        expect(s.print.plates).toHaveLength(2);
        expect(s.layers.length).toBeGreaterThan(7);
        expect(s.actors.every(a => a.joints.length >= 4)).toBe(true);
        expect(s.print.width).toBe(aspect === "portrait" ? 540 : 960);
        expect(s.print.height).toBe(aspect === "portrait" ? 960 : 540);
        expect(risoPerformanceSceneStable(subject,aspect))
          .toBe(risoPerformanceSceneStable(subject,aspect));
        assertRisoCharacterScene(s);
      });
      it("renders actual native spot-ink layers with acting and captions: " + subject + "/" + aspect, () => {
        const s = risoPerformanceSceneStable(subject,aspect);
        const html = renderToStaticMarkup(createElement(RisoCharacterStage, {
          spec:s,frame:154,misregistration:.35,paperGrain:.45,
        }));
        expect(html).toContain('data-km-riso-scene="'+s.id+'"');
        expect(html).toContain('data-km-riso-scene-frame="154"');
        expect(html).toContain("data-km-riso-actor=");
        expect(html).toContain("data-km-riso-joint=");
        expect(html).toContain('data-km-riso-plate="blue"');
        expect(html).toContain('data-km-riso-plate="red"');
        expect(html).toContain("patternUnits=\"userSpaceOnUse\"");
        expect(html).toContain("THE ");
        expect(html).toContain("viewBox=\"0 0 "+s.print.width+" "+s.print.height+"\"");
      });
    }
  }

  it("is exact under arbitrary seek order, at held intervals and under reduced motion", () => {
    const s=scene();
    const at=(f:number)=>evaluateRisoCharacterScene(s,f);
    const before=at(152), after=at(253), end=at(299);
    at(0);at(297);at(46);at(240);at(1);
    expect(at(152)).toEqual(before);
    expect(at(253)).toEqual(after);
    expect(at(400)).toEqual(end);
    expect(evaluateRisoCharacterScene(s,0,true)).toEqual({
      ...end,frame:299,
    });
    expect(at(100).actors[0].poseFrame).toBe(at(101).actors[0].poseFrame);
    expect(at(100).camera).not.toEqual(at(101).camera);
  });

  it("switches physical expression shapes at authored discrete frames",()=>{
    const s=scene();
    const mouth=(f:number)=>evaluateRisoCharacterScene(s,f).actors[0].joints
      .find(p=>p.id==="mouth")?.marks.red?.d;
    expect(mouth(0)).not.toBe(mouth(144));
    expect(mouth(144)).toBe(mouth(145));
    expect(mouth(144)).not.toBe(mouth(152));
    const eye=(f:number)=>evaluateRisoCharacterScene(s,f).actors[0].joints
      .find(p=>p.id==="eyes")?.marks.blue?.d;
    expect(eye(96)).not.toBe(eye(94));
    expect(eye(100)).toBe(eye(94));
    const bird=(f:number)=>evaluateRisoCharacterScene(s,f).actors[1].joints
      .find(p=>p.id==="beak")?.marks.red?.d;
    expect(bird(128)).not.toBe(bird(100));
  });

  it("samples authored anticipation/gesture and seamless repeat without state",()=>{
    const s=scene();
    const left=(f:number)=>evaluateRisoCharacterScene(s,f).actors[0].joints
      .find(p=>p.id==="right-arm")?.pose.rotate;
    expect(left(125)).toBeLessThan(-80);
    expect(left(175)).toBeLessThan(-100);
    expect(left(250)).toBe(0);
    const keys:RisoPoseKey[]=[
      {frame:0,x:0,y:0,rotate:0,scale:1},
      {frame:12,x:0,y:0,rotate:40,scale:1},
      {frame:24,x:0,y:0,rotate:0,scale:1},
    ];
    expect(sampleRisoMotion(keys,1,24)).toEqual(sampleRisoMotion(keys,25,24));
    expect(sampleRisoMotion(keys,24,24).rotate).toBe(0);
    expect(sampleRisoMotion([{...keys[0],ease:"hold"},keys[1]],6).rotate).toBe(0);
  });

  it("rejects malformed JSON, cycles, hostile SVG paths and incorrect plates with actionable errors",()=>{
    const s=scene();
    const first=s.actors[0];
    const changed=(mutator:(a:RisoJointSpec[])=>RisoJointSpec[]):RisoCharacterSceneSpec=>({
      ...s,actors:[{...first,joints:mutator([...first.joints])},...s.actors.slice(1)],
    });
    const cycle=changed(parts=>parts.map((j,i)=>i===0?{...j,parent:"body"}:j));
    expect(inspectRisoCharacterScene(cycle).some(e=>e.code==="cycle")).toBe(true);
    const missing=changed(parts=>parts.map((j,i)=>i===0?{...j,parent:"absent"}:j));
    expect(inspectRisoCharacterScene(missing).some(e=>e.code==="parent")).toBe(true);
    const unknown=changed(parts=>parts.map((j,i)=>i===0?{
      ...j,marks:{not-a-plate:{d:"M0 0 L12 4 Z",ink:"solid"}},
    }:j));
    expect(inspectRisoCharacterScene(unknown).some(e=>e.code==="unknown-plate")).toBe(true);
    const unsafe=changed(parts=>parts.map((j,i)=>i===0?{
      ...j,marks:{blue:{d:'M0 0" onload="evil()',ink:"solid"}},
    }:j));
    expect(inspectRisoCharacterScene(unsafe).some(e=>e.code==="path")).toBe(true);
    expect(inspectRisoCharacterScene({...s,layers:[null]}).map(e=>e.path)).toContain("/layers/0");
    expect(() => assertRisoCharacterScene(unsafe)).toThrow(/joints/);
    expect(() => evaluateRisoCharacterScene(s,-1)).toThrow(RangeError);
    const unsorted=changed(parts=>parts.map((j,i)=>i===0?{
      ...j,motion:[{frame:40,x:0,y:0,rotate:0,scale:1},
        {frame:20,x:0,y:0,rotate:1,scale:1}],
    }:j));
    expect(inspectRisoCharacterScene(unsorted).some(e=>e.code==="motion-key")).toBe(true);
  });

  it("compiles a portable 4-shot 600-frame film and production uses identical two-aspect scenes",async()=>{
    expect(portable).toEqual(RISO_CHARACTER_FILM);
    for(const aspect of ["landscape","portrait"] as const){
      const compiled=compileFilm(portable,{outputId:aspect});
      expect(compiled.ok).toBe(true);
      if(!compiled.ok)continue;
      expect(compiled.film.durationFrames).toBe(600);
      expect(compiled.film.scenes).toHaveLength(4);
      const render=await loadFilmSlots(compiled.film);
      const result=render(
        {slot:"riso-character-story",label:"Original printed actors",
          props:{subject:"postcard",offsetFrame:150}},
        {frame:20,fps:{num:30,den:1},durationFrames:150,width:compiled.film.width,
          height:compiled.film.height,reducedMotion:false},
      );
      const html=renderToStaticMarkup(createElement("div",null,result));
      expect(html).toContain('data-km-riso-scene-frame="170"');
      expect(html).toContain('data-km-riso-actor="courier"');
      expect(html).toContain('data-km-riso-actor="little-bird"');
    }
  });
});
