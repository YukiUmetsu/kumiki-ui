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
        "princess-bodice","princess-head","princess-neck","princess-face-planes","princess-eye-white",
        "princess-lashes","princess-tiara",
        "princess-hair-braid","princess-right-sleeve","prince-coat",
        "prince-left-arm","prince-crown","prince-head","prince-neck",
        "prince-face-planes","prince-eye-white","prince-belt-clasp",
        "fox-body","fox-tail","fox-fur-shingles","rabbit-body","rabbit-ear-left",
        "deer-body","deer-antlers","owl-body","owl-wing-right",
        "lantern-outer","lantern-star","moon-face","castle-walls",
        "forest-left-wood","forest-right-foliage"]){
        expect(id.has(name),name).toBe(true);
      }
      expect(scene.layers.every(l=>/^#[0-9a-fA-F]{6}$/.test(l.color))).toBe(true);
      expect(scene.layers.filter(l=>l.parentId).length).toBeGreaterThan(40);
      expect(scene.layers.find(l=>l.id==="lantern-outer")?.holes?.length).toBe(1);
      expect(scene.layers.find(l=>l.id==="stage-frame")?.holes?.length).toBe(1);
      expect(scene.layers.find(l=>l.id==="moon-face")?.holes?.length).toBe(1);
      if(aspect==="portrait"){
        expect(id.has("portrait-hanging-left-wood")).toBe(true);
        expect(id.has("portrait-hanging-right-leaves")).toBe(true);
      }
      expect(id.has("lantern-rays")).toBe(true);
      for(const sheet of scene.layers.filter(l=>l.parentId)){
        expect(id.has(sheet.parentId!),sheet.id).toBe(true);
        expect(sheet.pivot?.length,sheet.id).toBe(2);
      }
    }
  });
  it("uses finer but still visible paper fibre on both faces",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const scene=paperRoyalStoryScene("layered",aspect,2,37,.85);
      for(const id of ["princess-head","princess-ear","princess-neck","prince-head","prince-ear","prince-neck"]){
        const sheet=scene.layers.find(layer=>layer.id===id)!;
        expect(sheet.fibreScale).toBe(.5);
        expect(sheet.fibreIntensity).toBe(.45);
      }
      expect(scene.layers.find(layer=>layer.id==="princess-tiara")?.fibreScale).toBeUndefined();
      expect(inspectPaperCraft(scene)).toEqual([]);
    }
  });
  it("preserves the prince ear edge while softening the facial-plane rims",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const phase of [0,1,2]){
        const scene=paperRoyalStoryScene("layered",aspect,phase,37,.85);
        const ear=scene.layers.find(layer=>layer.id==="prince-ear");
        const plane=scene.layers.find(layer=>layer.id==="prince-face-planes");
        expect(ear?.parentId).toBe("prince-head");
        expect(ear?.edgeIntensity).toBeUndefined();
        expect(plane?.edgeIntensity).toBe(0);
        expect(inspectPaperCraft(scene)).toEqual([]);
      }
    }
  });
  it("keeps the princess iris and upper lid on separate, attached sheets",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const phase of [0,1,2]){
        const scene=paperRoyalStoryScene("layered",aspect,phase,37,.85);
        const aperture=scene.layers.find(layer=>layer.id==="princess-eye-white")!;
        const iris=scene.layers.find(layer=>layer.id==="princess-iris");
        const lid=scene.layers.find(layer=>layer.id==="princess-lashes")!;
        expect(iris?.parentId).toBe("princess-head");
        expect(iris!.depth).toBeGreaterThan(aperture.depth);
        expect(iris!.depth).toBeLessThan(lid.depth);
        expect(scene.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
        expect(inspectPaperCraft(scene)).toEqual([]);
        const headIndex=scene.layers.findIndex(layer=>layer.id==="princess-head");
        const irisIndex=scene.layers.findIndex(layer=>layer.id==="princess-iris");
        for(const frame of [0,120,239]){
          const pose=evaluatePaperCraft(scene,frame);
          expect(pose.layers[irisIndex].worldMatrix).toEqual(pose.layers[headIndex].worldMatrix);
        }
      }
    }
  });
  it("keeps the princess ear separately edged and attached to the head",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const phase of [0,1,2]){
        const scene=paperRoyalStoryScene("layered",aspect,phase,37,.85);
        const ear=scene.layers.find(layer=>layer.id==="princess-ear");
        const plane=scene.layers.find(layer=>layer.id==="princess-face-planes");
        expect(ear?.parentId).toBe("princess-head");
        expect(ear?.edgeIntensity).toBeUndefined();
        expect(plane?.edgeIntensity).toBe(0);
        expect(inspectPaperCraft(scene)).toEqual([]);
        const headIndex=scene.layers.findIndex(layer=>layer.id==="princess-head");
        const earIndex=scene.layers.findIndex(layer=>layer.id==="princess-ear");
        for(const frame of [0,120,239]) {
          const pose=evaluatePaperCraft(scene,frame);
          expect(pose.layers[earIndex].worldMatrix).toEqual(pose.layers[headIndex].worldMatrix);
        }
      }
    }
  });
  it("compresses both adult cranial frames and avoids long giraffe neck gaps",()=>{
    const extent=(d:string)=>{
      const numbers=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
      const x=numbers.filter((_,i)=>i%2===0);
      const y=numbers.filter((_,i)=>i%2===1);
      return {minX:Math.min(...x),maxX:Math.max(...x),
        minY:Math.min(...y),maxY:Math.max(...y)};
    };
    for(const aspect of ["landscape","portrait"] as const){
      for(const phase of [0,1,2]){
        const spec=paperRoyalStoryScene("layered",aspect,phase,37,.85);
        const byId=(id:string)=>spec.layers.find(l=>l.id===id)!;
        const bodyHeight=aspect==="portrait"?1.16:.0+1.03;
        for(const name of ["princess","prince"]){
          const head=extent(byId(name+"-head").path);
          const neck=extent(byId(name+"-neck").path);
          // The sheet also carries a separately connected ear and
          // nostril. Bound the cheek's *first contour*, not the union of
          // all semantic features cut into that same physical stock.
          const cheek=byId(name+"-face-planes").path.split(" Z")[0]+" Z";
          const plane=extent(cheek);
          const headHeight=head.maxY-head.minY;
          const headWidth=head.maxX-head.minX;
          const neckHeight=neck.maxY-neck.minY;
          expect(headWidth/headHeight).toBeGreaterThan(.65);
          expect(headWidth/headHeight).toBeLessThan(1.15);
          expect(neckHeight/headHeight,name+" neck too long").toBeLessThan(.65);
          expect(neck.maxY-head.maxY,name+" jaw/collar gap").toBeLessThan(20*bodyHeight);
          expect(neck.maxY).toBeGreaterThan(head.maxY);
          expect(plane.maxX-plane.minX).toBeLessThan(headWidth*.72);
          expect(byId(name+"-head").parentId).toBe(
            name==="princess"?"princess-bodice":"prince-coat");
          for(const detail of name==="princess"
            ? ["forelock","hair-braid","brow","eye-white","lashes","lips","tiara","tiara-jewels"]
            : ["hair","hair-strands","ear","eye-white","eye-brow","mouth","crown","crown-stones"]){
            expect(byId(name+"-"+detail).parentId).toBe(name+"-head");
          }
        }
      }
    }
  });
  it("joins anatomically sculpted hands, sleeves and tailored costume stock without broken rig parents",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      for(const act of [0,1,2]){
        const spec=paperRoyalStoryScene("layered",aspect,act,37,.9);
        const sheets=new Map(spec.layers.map(l=>[l.id,l]));
        expect(spec.layers.length).toBeLessThanOrEqual(128);
        for(const [name,parent] of [
          ["princess-left-hand","princess-left-sleeve"],
          ["princess-right-hand","princess-right-sleeve"],
          ["prince-left-hand","prince-left-arm"],
          ["prince-right-hand","prince-right-arm"],
          ["princess-gold-seams","princess-bodice"],
          ["princess-dress-inset","princess-bodice"],
          ["princess-collar","princess-bodice"],
          ["prince-gold-braid","prince-coat"],
        ] as const){
          const part=sheets.get(name);
          expect(part,name).toBeDefined();
          expect(part?.parentId,name).toBe(parent);
          expect(part?.pivot?.length,name).toBe(2);
          expect(part?.color,name).toMatch(/^#[0-9A-Fa-f]{6}$/);
          // Finger, sleeve and costume contours are authored curves,
          // never one triangular joint placeholder.
          expect(part?.path.includes("C")||part?.path.includes("Q"),name).toBe(true);
        }
        // Rich details are independent closed contours on existing opaque
        // sheets rather than extra semi-transparent layers.
        const collar=sheets.get("princess-collar")!;
        expect(collar.holes).toHaveLength(3);
        expect(sheets.get("princess-dress-inset")!.path.match(/M/g)?.length).toBeGreaterThan(3);
        expect(sheets.get("princess-gold-seams")!.path.match(/M/g)?.length).toBeGreaterThan(4);
        expect(sheets.get("prince-gold-braid")!.path.match(/M/g)?.length).toBeGreaterThan(9);
        const opening=evaluatePaperCraft(spec,0),mid=evaluatePaperCraft(spec,120);
        const handIndex=spec.layers.findIndex(l=>l.id==="princess-right-hand");
        expect(opening.layers[handIndex].worldMatrix).not.toEqual(mid.layers[handIndex].worldMatrix);
      }
    }
  });
  it("keeps preview-study profiles anatomy-led rather than cartoon eye wedges",()=>{
    const width=(path:string)=>{
      const values=Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g),v=>Number(v[0]));
      const xs=values.filter((_,index)=>index%2===0);
      return Math.max(...xs)-Math.min(...xs);
    };
    for(const aspect of ["landscape","portrait"] as const){
      for(const phase of [0,1,2]){
        const s=paperRoyalStoryScene("layered",aspect,phase,37,.85);
        const get=(id:string)=>s.layers.find(layer=>layer.id===id)!;
        for(const who of ["princess","prince"] as const){
          const relative=width(get(who+"-eye-white").path)/width(get(who+"-head").path);
          expect(relative,who+" pupil aperture vs head width").toBeGreaterThan(.10);
          expect(relative,who+" pupil aperture vs head width").toBeLessThan(.20);
          expect(get(who+"-face-planes").path.match(/M/g)?.length)
            .toBeGreaterThanOrEqual(3);
          expect(get(who+"-face-planes").parentId).toBe(who+"-head");
        }
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