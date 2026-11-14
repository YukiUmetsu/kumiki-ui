import { createElement } from "react";
import { makeInkRockTexture } from "../registry/video/ink-wash-marks";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compileFilm } from "../registry/video/film-document";
import { InkWashScene, InkMediaReveal } from "../registry/video/ink-wash-story-react";
import { INK_LOOKS, createInkFilmDocument, inkCameraAt, inkLayerProgress,
  inkLook, inkRevealPath, inspectInkFilm } from "../registry/video/ink-wash-story";
import type { InkFilmPlan, InkLayerPlan } from "../registry/video/ink-wash-story";
import { inspectInkWash, inkHoldFrame, inkOutline } from "../registry/video/ink-wash";
import type { InkWashSpec } from "../registry/video/ink-wash";

const size = { id: "wide", width: 960, height: 540 };
const textLayer: InkLayerPlan = {
  id: "headline", startFrame: 0, durationFrames: 20, reveal: "brush",
  direction: "right", seed: 72, parallax: 0, treatment: "original",
};
const videoLayer: InkLayerPlan = {
  id: "film-footage", startFrame: 38, durationFrames: 48, reveal: "bloom",
  seed: 7, origin: [.35, .45], parallax: .8, treatment: "wash",
};
const plan: InkFilmPlan = {
  id: "ink-neutral-story", fps: 30, outputs: [size, { id: "tall", width: 540, height: 960 }],
  shots: [
    { id: "chapter-one", label: "Brush draws a readable title", durationFrames: 100,
      camera: {keyframes:[{frame:0,x:0,y:0,zoom:1},{frame:99,x:-18,y:9,zoom:1.1}]},
      layers: [textLayer,videoLayer],
    },
    { id: "chapter-two", label: "The subject resolves through an ink bloom", durationFrames: 110,
      layers: [{ id: "figure", startFrame: 1, durationFrames: 42, reveal: "bloom" }],
    },
  ],
};
const paper: InkWashSpec = {
  version:1,width:960,height:540,paper:"#F3EFE3",ink:"#242720",seed:19,absorption:.84,
  grain:.72,strokes:[],
};

describe("INK2 reusable material-native film grammar", () => {
  it("offers genuinely distinct Xuan sizing, ink-loading and artistic direction presets",()=>{
    expect(Object.keys(INK_LOOKS)).toHaveLength(5);
    expect(inkLook("splash-ink").absorption).toBeGreaterThan(inkLook("meticulous").absorption);
    expect(inkLook("literati").paperKind).toBe("raw-xuan");
    expect(() => inkLook("unknown" as never)).toThrow(RangeError);
  });
  it("makes textured rock marks with deterministic geology-oriented axe cuts, hemp strokes and moss",()=>{
    const options={idPrefix:"rock-study",seed:81,kind:"axe-cut" as const,
      x:42,y:80,width:120,height:90,count:17,startFrame:16,angle:58};
    const a=makeInkRockTexture(options),b=makeInkRockTexture(options);
    expect(a).toEqual(b);
    expect(a).toHaveLength(17);
    expect(a.every(stroke=>stroke.brush==="oblique")).toBe(true);
    expect(a.every(stroke=>stroke.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))).toBe(true);
    const hemp=makeInkRockTexture({...options,idPrefix:"hemp",kind:"hemp-fiber"});
    const dots=makeInkRockTexture({...options,idPrefix:"dots",kind:"moss-dot"});
    expect(hemp[0].width).toBeLessThan(a[0].width);
    expect(dots[0].points).toHaveLength(3);
    expect(()=>makeInkRockTexture({...options,count:500})).toThrow(RangeError);
    expect(()=>makeInkRockTexture({...options,seed:-5})).toThrow(RangeError);
  });
  it("lets arbitrary media exist on genuinely blank paper",()=>{
    expect(inspectInkWash(paper)).toEqual([]);
    expect(inkHoldFrame(paper)).toBe(0);
  });
  it("keeps side-brush parameters valid while rejecting wrong brush angles and speeds",()=>{
    const stroke={ id:"oblique", width: 32, tone:.75, water:.3,load:.9,brush:"oblique" as const,
      tipInk:.8,drag:.7, points:[{x:20,y:40,pressure:.2},{x:200,y:190,pressure:.9}],
      startFrame:0,drawFrames:30,spreadFrames:9,dryFrames:12 };
    const withBrush={...paper,strokes:[stroke]};
    expect(inspectInkWash(withBrush)).toEqual([]);
    expect(inkOutline(stroke,19,1)).toMatch(/^M/);
    expect(inspectInkWash({...paper,strokes:[{...stroke,tipInk:2,drag:-1,brush:"wrong" as never}]})
      .map(x=>x.code)).toEqual(expect.arrayContaining(["brush-tipInk","brush-drag","brush-orientation"]));
    expect(inspectInkWash({...paper,paper:"oops"}).map(x=>x.code)).toContain("color");
  });
  it("refuses scene collisions, unsupported reveals, invalid camera sequences and out-of-shot layers",()=>{
    expect(inspectInkFilm(plan)).toEqual([]);
    const broken: InkFilmPlan = {...plan,shots:[{
      id:"wrong",label:"",durationFrames:38,
      layers:[{...videoLayer,durationFrames:70,reveal:"spin" as never,origin:[4,1]}],
      camera:{keyframes:[{frame:20,x:0,y:0,zoom:1},{frame:10,x:0,y:0,zoom:0}]},
    }]};
    expect(inspectInkFilm(broken).map(d=>d.path)).toEqual(expect.arrayContaining([
      "/shots/0/label","/shots/0/layers/0/startFrame","/shots/0/layers/0/durationFrames",
      "/shots/0/layers/0/reveal","/shots/0/layers/0/origin","/shots/0/camera/keyframes/1",
    ]));
  });
  it("compiles using the established FD1 slot/FilmStage contract and both output sizes",()=>{
    const film=createInkFilmDocument(plan);
    expect(film.scenes).toHaveLength(2);
    for(const outputId of ["wide","tall"]){
      const compiled=compileFilm(film,{outputId});
      expect(compiled.ok).toBe(true);
      if(compiled.ok) {
        expect(compiled.film.durationFrames).toBe(210);
        expect(compiled.film.scenes.every(scene=>scene.kind==="slot")).toBe(true);
      }
    }
  });
  it("does not read wall-clock time; every camera and layer state is a pure frame function",()=>{
    const shot=plan.shots[0];
    const finish=inkCameraAt(shot.camera,99);
    const middle=inkCameraAt(shot.camera,46);
    expect(middle.zoom).toBeGreaterThan(1);
    expect(middle.zoom).toBeLessThan(1.1);
    inkCameraAt(shot.camera,12);
    expect(inkCameraAt(shot.camera,99)).toEqual(finish);
    expect(inkLayerProgress(textLayer,0)).toBe(0);
    expect(inkLayerProgress(textLayer,10)).toBe(.5);
    expect(inkLayerProgress(textLayer,25)).toBe(1);
    expect(inkLayerProgress(videoLayer,0,true)).toBe(1);
    expect(()=>inkLayerProgress(textLayer,-1)).toThrow(RangeError);
  });
  it("gives a complete, bounded matte at exact 0 and 1 across all transition directions",()=>{
    for(const kind of ["brush","bloom","instant"] as const) {
      expect(inkRevealPath(960,540,0,kind)).toBe("M0 0 Z");
      expect(inkRevealPath(960,540,1,kind)).toBe("M0 0 H960 V540 H0 Z");
    }
    for(const direction of ["left","right","up","down"] as const){
      const middle=inkRevealPath(960,540,.42,"brush",7,direction);
      expect(middle).toMatch(/^M/);
      expect(middle).not.toContain("NaN");
      expect(middle).toBe(inkRevealPath(960,540,.42,"brush",7,direction));
      expect(middle).not.toEqual(inkRevealPath(960,540,.64,"brush",7,direction));
    }
    const first=inkRevealPath(960,540,.47,"bloom",19,"right",[.2,.7]);
    expect(first).toBe(inkRevealPath(960,540,.47,"bloom",19,"right",[.2,.7]));
    expect(()=>inkRevealPath(960,540,Number.NaN,"bloom")).toThrow(RangeError);
  });
  it("composes independently rendered media, optional wash and fixed reading-plane captions",()=>{
    const shot=plan.shots[0];
    const mark=(frame:number)=>renderToStaticMarkup(createElement(InkWashScene,{
      spec:paper,shot,frame,label:"Original editorial study",
      renderLayer:(layer)=>createElement("span",null,"Source: "+layer.id),
      children:createElement("strong",null,"Accessible fixed caption"),
    }));
    const early=mark(4),later=mark(78);
    expect(early).toContain("Source: headline");
    expect(early).not.toContain("Source: film-footage");
    expect(later).toContain("Source: film-footage");
    expect(later).toContain('data-km-ink-reading-plane=""');
    expect(later).toContain("Accessible fixed caption");
    expect(later).toContain("kminkclip");
    expect(later).toBe(mark(78));
    expect(()=>renderToStaticMarkup(createElement(InkWashScene,{
      spec:paper,shot,frame:100,renderLayer:()=>null,
    }))).toThrow(RangeError);
  });
  it("supports interactive quiz and video controls only when explicitly opted in",()=>{
    const clickable:InkLayerPlan={...textLayer,id:"quiz-controls",interactive:true};
    const shot={id:"quiz",label:"A controlled interaction",durationFrames:60,layers:[clickable]};
    const markup=renderToStaticMarkup(createElement(InkWashScene,{
      spec:paper,shot,frame:40,renderLayer:()=>createElement("button",{type:"button"},"Choose answer"),
    }));
    expect(markup).toContain("pointer-events:auto");
    expect(markup).toContain("Choose answer");
    expect(inspectInkFilm({...plan,shots:[{...shot,layers:[{...clickable,interactive:"yes" as never}]}]})
      .some(x=>x.path.endsWith("/interactive"))).toBe(true);
  });
  it("preserves arbitrary child HTML without unexpectedly painting its colors",()=>{
    const image=renderToStaticMarkup(createElement(InkMediaReveal,{
      layer:videoLayer,width:960,height:540,frame:64,treatment:"original",
      children:createElement("video",{"aria-label":"Source footage",src:"/test-only.mp4"}),
    }));
    expect(image).toContain("Source footage");
    expect(image).toContain("foreignObject");
    expect(image).not.toContain("grayscale(1)");
    const wash=renderToStaticMarkup(createElement(InkMediaReveal,{
      layer:videoLayer,width:960,height:540,frame:64,
      children:createElement("div",null,"Neutral silhouette"),
    }));
    expect(wash).toContain("grayscale(1)");
  });
});
