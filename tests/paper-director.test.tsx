import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaperDirectorStage } from "../registry/video/paper-director-react";
import { compilePaperDirector, inspectPaperDirector, paperCut, resolvePaperDirector } from "../registry/video/paper-director";
import { evaluatePaperCraft, inspectPaperCraft, paperAffinePoint, PAPER_STYLES } from "../registry/video/paper-craft";
import { paperDirectorDemo } from "../src/video/paper-director-demo";
import { compileFilm } from "../registry/video/film-document";
import { loadFilmSlots } from "../src/film/film-slots";
import fixture from "../examples/film/paper-craft-director.film.json";

describe("PAPER-D1 reusable paper director",()=>{
  it("composes four distinct cuts with two aspect-native paper stocks",()=>{
    for(const medium of PAPER_STYLES){
      const film=paperDirectorDemo(medium,37,.7);
      expect(inspectPaperDirector(film)).toEqual([]);
      const plan=compilePaperDirector(film);
      expect(plan.durationFrames).toBe(960);
      expect(plan.shots.map(s=>s.startFrame)).toEqual([0,240,480,720]);
      expect(plan.shots.map(s=>s.id)).toEqual([
        "woodland-light","botanical-wing","city-layering","constructed-device"]);
      for(const aspect of ["landscape","portrait"] as const){
        for(const frame of [0,98,239,240,359,479,480,701,720,959,1500]){
          const shot=resolvePaperDirector(plan,frame,aspect);
          expect(inspectPaperCraft(shot.spec)).toEqual([]);
          expect(shot.localFrame).toBeGreaterThanOrEqual(0);
          expect(shot.localFrame).toBeLessThan(240);
          expect(shot.spec.width).toBe(aspect==="landscape"?960:540);
          expect(shot.spec.height).toBe(aspect==="landscape"?540:960);
        }
        expect(resolvePaperDirector(plan,239,aspect).shotId).toBe("woodland-light");
        expect(resolvePaperDirector(plan,240,aspect).shotId).toBe("botanical-wing");
        const entering=resolvePaperDirector(plan,240,aspect);
        const assembled=evaluatePaperCraft(entering.spec,entering.localFrame);
        // No blank purple canvas or single isolated paper ellipse at a cut.
        expect(assembled.layers.every(l=>l.progress===1&&l.opacity===1)).toBe(true);
        expect(resolvePaperDirector(plan,720,aspect).shotId).toBe("constructed-device");
      }
    }
  });
  it("moves attached butterfly stock together while keeping opaque pigment",()=>{
    const plan=compilePaperDirector(paperDirectorDemo("layered",43,1));
    for(const aspect of ["landscape","portrait"] as const){
      const shot=resolvePaperDirector(plan,370,aspect);
      const moth=shot.spec.layers.filter(l=>l.id.startsWith("moth-"));
      expect(moth.length).toBeGreaterThan(8);
      const root=moth.find(l=>l.id==="moth-abdomen");
      expect(root?.poseKeys).toHaveLength(3);
      expect(root?.parentId).toBeUndefined();
      expect(moth.filter(l=>l.id!=="moth-abdomen")
        .every(l=>l.parentId==="moth-abdomen" && l.pivot?.length===2 && !l.poseKeys)).toBe(true);
      expect(moth.every(l=>/^#[0-9a-fA-F]{6}$/.test(l.color))).toBe(true);
      const rigFrame=evaluatePaperCraft(shot.spec,150);
      const body=rigFrame.layers.find(l=>l.id==="moth-abdomen")!;
      const wing=rigFrame.layers.find(l=>l.id==="moth-left-fore") ??
        rigFrame.layers.find(l=>l.id.includes("fore"))!;
      const wingSource=shot.spec.layers.find(l=>l.id===wing.id)!;
      const pivot=wingSource.pivot!;
      const expected=paperAffinePoint(body.worldMatrix!,pivot);
      const actual=paperAffinePoint(wing.worldMatrix!,pivot);
      expect(actual[0]).toBeCloseTo(expected[0],5);
      expect(actual[1]).toBeCloseTo(expected[1],5);
      const first=evaluatePaperCraft(shot.spec,34);
      evaluatePaperCraft(shot.spec,210);
      expect(evaluatePaperCraft(shot.spec,34)).toEqual(first);
      const a=evaluatePaperCraft(shot.spec,20).camera;
      const b=evaluatePaperCraft(shot.spec,219).camera;
      expect(a).not.toEqual(b);
      expect(evaluatePaperCraft(shot.spec,219,true).camera)
        .toEqual(evaluatePaperCraft(shot.spec,0,true).camera);
    }
  });
  it("uses opaque physical curtains across shot cuts without transparent pictures",()=>{
    const plan=compilePaperDirector(paperDirectorDemo("layered",37,.7,true));
    const seam=[
      [228,"closing",0],[233,"closing",5/11],[239,"closing",1],
      [240,"opening",0],[245,"opening",5/11],[251,"opening",1],
    ] as const;
    for(const aspect of ["landscape","portrait"] as const){
      for(const [frame,phase,progress] of seam){
        const shot=resolvePaperDirector(plan,frame,aspect);
        expect(shot.curtain?.phase).toBe(phase);
        expect(shot.curtain?.progress).toBeCloseTo(progress,6);
        const html=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
          film:paperDirectorDemo("layered",37,.7,true),aspect,frame,
        }));
        expect(html).toContain('data-km-paper-curtain=""');
        expect(html).toContain('data-km-paper-phase="'+phase+'"');
        expect(html).toContain('data-km-paper-frame="'+(frame<240?frame:frame-240)+'"');
        expect(html).toContain('fill="#E8CEAA"');
      }
      expect(resolvePaperDirector(plan,252,aspect).curtain).toBeUndefined();
      const staticHtml=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
        film:paperDirectorDemo("layered",37,.7,true),aspect,frame:240,reducedMotion:true,
      }));
      expect(staticHtml).not.toContain("data-km-paper-curtain");
    }
    const noCurtain=compilePaperDirector(paperDirectorDemo("layered",37,.7,false));
    expect(resolvePaperDirector(noCurtain,239,"landscape").curtain).toBeUndefined();
    expect(resolvePaperDirector(noCurtain,240,"portrait").curtain).toBeUndefined();
  });
  it("rejects missing/cyclic joints and invalid paper film transitions",()=>{
    const film=paperDirectorDemo("layered",37,.6,true);
    const spec=film.shots[1].scenes.landscape;
    const root=spec.layers.find(l=>l.id==="moth-abdomen")!;
    expect(inspectPaperCraft({...spec,layers:spec.layers.map(l=>
      l.id===root.id?{...l,parentId:"missing-parent"}:l)}).map(e=>e.path))
      .toContain("layers["+spec.layers.findIndex(l=>l.id===root.id)+"].parentId");
    const cyclic={...spec,layers:spec.layers.map(l=>l.id==="moth-abdomen"
      ? {...l,parentId:"moth-thorax"}:l)};
    expect(inspectPaperCraft(cyclic).some(e=>e.message.includes("cycle"))).toBe(true);
    const malformed={...film,shots:film.shots.map((s,i)=>
      i===0?{...s,transitionOut:{kind:"paper-curtain" as const,
        durationFrames:25,color:"#FFFFFF",direction:"left-to-right" as const}}:s)};
    expect(inspectPaperDirector(malformed).some(e=>e.path.includes("transitionOut"))).toBe(true);
    expect(inspectPaperDirector({...film,shots:film.shots.map((s,i)=>
      i===3?{...s,transitionOut:film.shots[0].transitionOut}:s)})
      .some(e=>e.message.includes("final shot"))).toBe(true);
  });
  it("cuts a real custom authored polygon and ellipse instead of a raster effect",()=>{
    const source=paperDirectorDemo("layered",37,0);
    const path=paperCut.polygon([[0,0],[100,0],[120,40],[35,100]]);
    const hole=paperCut.ellipse(45,35,8,5);
    const modified={...source,shots:source.shots.map((shot,i)=>i!==0?shot:{
      ...shot,scenes:{
        landscape:{...shot.scenes.landscape,layers:[
          ...shot.scenes.landscape.layers.slice(1),
          {...shot.scenes.landscape.layers[0],path,holes:[hole]},
        ]},
        portrait:shot.scenes.portrait,
      },
    })};
    expect(inspectPaperDirector(modified)).toEqual([]);
    const html=renderToStaticMarkup(React.createElement(PaperDirectorStage,{
      film:modified,aspect:"landscape",frame:224,
      "aria-label":"Original cut paper architecture",
    }));
    expect(html).toContain('data-km-paper-shot="woodland-light"');
    expect(html).toContain("clip-rule=\"evenodd\"");
    expect(html).toContain("data-km-paper-camera");
    expect(html).not.toContain("fill-opacity=\"0.");
  });
  it("validates paper motion and camera key track monotonicity, bounds and numbers",()=>{
    const orig=paperDirectorDemo("layered",37,.7);
    const spec=orig.shots[1].scenes.landscape;
    const bad={...spec,cameraKeys:[{frame:150,x:0,y:0,zoom:1},
      {frame:120,x:0,y:0,zoom:1.7}]};
    expect(inspectPaperCraft(bad).map(x=>x.path)).toContain("cameraKeys[1].frame");
    expect(inspectPaperCraft(bad).map(x=>x.path)).toContain("cameraKeys[1].zoom");
    expect(inspectPaperCraft({...spec,startAssembled:"yes" as never}).map(x=>x.path))
      .toContain("startAssembled");
    const wrong={...spec,layers:spec.layers.map((l,i)=>i===0?
      {...l,poseKeys:[{frame:0,x:0,y:0,angle:0},{frame:0,x:0,y:0,angle:0}]}:l)};
    expect(inspectPaperCraft(wrong).map(x=>x.path)).toContain("layers[0].poseKeys[1].frame");
    expect(()=>resolvePaperDirector(compilePaperDirector(orig),-1,"landscape")).toThrow(RangeError);
    expect(()=>paperCut.ellipse(3,4,0,2)).toThrow(RangeError);
    expect(()=>paperCut.polygon([[0,0],[1,1]])).toThrow(RangeError);
  });
  it("accepts a portable 960-frame FD1 paper-film and renders the real slot",async()=>{
    for(const outputId of ["landscape","portrait"] as const){
      const compiled=compileFilm(fixture,{outputId});
      expect(compiled.ok).toBe(true);
      if (!compiled.ok)continue;
      const slot=await loadFilmSlots(fixture as never);
      const node=slot(fixture.scenes[0].content,{
        frame:740, fps:{num:30,den:1},durationFrames:960,
        width:outputId==="landscape"?960:540,
        height:outputId==="landscape"?540:960,reducedMotion:false,
      });
      const html=renderToStaticMarkup(React.createElement(React.Fragment,null,node));
      expect(html).toContain('data-km-paper-shot="constructed-device"');
      expect(html).toContain('data-km-paper-frame="20"');
      expect(html).toContain('data-km-paper-director="material-paper-tour"');
    }
  });
});
