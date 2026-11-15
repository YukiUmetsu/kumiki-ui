import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import { InkCinematicScene } from "../registry/video/ink-cinematic-scene-react";
import { assertInkCinematicSpec,inspectInkCinematicSpec,inkCinematicAt,
  makeInkCinematicSpec } from "../registry/video/ink-cinematic-scene";
import type { InkCinematicMotif } from "../registry/video/ink-cinematic-scene";

describe("INK7 shan-shui film engine",()=>{
 it("provides reusable validated original-landscape recipes with independent code-painted motifs",()=>{
  for(const preset of ["mountain-path","riverside-scroll"] as const)
   for(const output of ["landscape","portrait"] as const){
    const scene=makeInkCinematicSpec(preset,{output});
    expect(inspectInkCinematicSpec(scene)).toEqual([]);
    expect(scene.motifs.length).toBeGreaterThan(10);
    expect(new Set(scene.motifs.map(m=>m.id)).size).toBe(scene.motifs.length);
    expect(scene.actor.gesture).toBe(preset==="mountain-path"?"contemplate":"read-scroll");
    expect(scene.output).toBe(output);
    expect(scene.art.detail).toBeGreaterThan(.5);
   }
 });
 it("rejects unsupported motifs, malformed paint inputs and dangerous duplicate IDs",()=>{
  const spec=makeInkCinematicSpec("mountain-path");
  expect(inspectInkCinematicSpec({...spec,seed:-3})).toContain("seed: expected a bounded integer");
  expect(()=>assertInkCinematicSpec({...spec,art:{...spec.art,wind:NaN}})).toThrow(RangeError);
  expect(()=>assertInkCinematicSpec({...spec,actor:{...spec.actor,scale:0}})).toThrow(RangeError);
  expect(()=>assertInkCinematicSpec({...spec,actor:{...spec.actor,startFrame:190}})).toThrow(RangeError);
  expect(()=>assertInkCinematicSpec({...spec,motifs:[...spec.motifs,spec.motifs[0]]})).toThrow(RangeError);
  expect(()=>assertInkCinematicSpec({...spec,motifs:[{...spec.motifs[0],kind:"spyware" as InkCinematicMotif["kind"]}]})).toThrow(RangeError);
  expect(()=>assertInkCinematicSpec({...spec,motifs:[{...spec.motifs[0],id:"__proto__"}]})).toThrow(RangeError);
 });
 it("seeks absolutely and holds the actor grounded with an independent wind/camera clock",()=>{
  const scene=makeInkCinematicSpec("riverside-scroll");
  const rest=inkCinematicAt(scene,0);
  const walk=inkCinematicAt(scene,84);
  const arrive=inkCinematicAt(scene,179);
  expect(walk.actorX).toBeGreaterThan(rest.actorX);
  expect(arrive.actorX).toBeCloseTo(scene.actor.x+scene.actor.travel,7);
  expect(arrive.gaitWeight).toBe(0);
  expect(arrive.actorStep).toBe(0);
  expect(walk.gaitWeight).toBeGreaterThan(0);
  inkCinematicAt(scene,179);inkCinematicAt(scene,13);
  expect(inkCinematicAt(scene,84)).toEqual(walk);
  const reduced=inkCinematicAt(scene,0,true);
  expect(reduced.actorX).toBe(arrive.actorX);
  expect(reduced.foliageSway).toBe(0);
  expect(reduced.cameraX).toBe(0);
  expect(()=>inkCinematicAt(scene,-1)).toThrow(RangeError);
  expect(()=>inkCinematicAt(scene,180)).toThrow(RangeError);
  expect(()=>inkCinematicAt(scene,NaN)).toThrow(RangeError);
 });
 it("renders genuine SVG paint layers and separated actor parts without full-frame image or mask video",()=>{
  for(const preset of ["mountain-path","riverside-scroll"] as const){
    const scene=makeInkCinematicSpec(preset);
    const render=(frame:number)=>renderToStaticMarkup(createElement(InkCinematicScene,{spec:scene,frame}));
    const initial=render(0),moving=render(90),hold=render(179);
    expect(initial).toContain('data-km-ink-cinematic-scene="ink-cinema-'+preset+'"');
    expect(initial).toContain('data-km-ink-cinema-plane="far"');
    expect(initial).toContain('data-km-ink-cinema-plane="middle"');
    expect(initial).toContain('data-km-ink-cinema-plane="foreground"');
    expect(initial).toContain('data-km-ink-actor-part="head"');
    expect(initial).toContain('data-km-ink-actor-part="robe-hem"');
    expect(initial).toContain('data-km-ink-cinema-brush=');
    expect(initial).not.toMatch(/<(?:image|img|video|foreignObject)\b/i);
    expect(moving).not.toEqual(initial);
    expect(hold).not.toEqual(moving);
    expect(render(90)).toEqual(moving);
    if(preset==="riverside-scroll"){
      expect(initial).toContain('data-km-ink-cinema-kind="water"');
      expect(initial).toContain('data-km-ink-cinema-kind="bridge"');
      expect(initial).toContain('data-km-ink-actor-part="scroll"');
    }else{
      expect(initial).toContain('data-km-ink-cinema-kind="pine"');
      expect(initial).toContain('data-km-ink-actor-part="contemplating-hand"');
    }
  }
 });
 it("supports portrait re-composition, lowered brush density and arbitrary safe motif additions",()=>{
  const scene=makeInkCinematicSpec("riverside-scroll",{
    output:"portrait",seed:121,art:{detail:.20,wind:0,grain:0},
    motifs:[...makeInkCinematicSpec("riverside-scroll").motifs,
      {id:"extra-sky-bird",kind:"birds",x:800,y:140,scale:.7,depth:0}],
  });
  const html=renderToStaticMarkup(createElement(InkCinematicScene,{spec:scene,frame:48}));
  expect(html).toContain('width="540" height="960"');
  expect(html).toContain('data-km-ink-cinema-motif="extra-sky-bird"');
  expect(html).toContain('data-km-ink-cinematic-output="portrait"');
  expect(html).toContain('data-km-ink-cinema-plane="atmosphere"');
 });
});
