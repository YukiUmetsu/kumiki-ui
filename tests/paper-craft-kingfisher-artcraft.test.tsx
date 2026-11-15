import {describe, expect, it} from "vitest";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {evaluatePaperCraft, inspectPaperCraft, MAX_PAPER_LAYERS} from "../registry/video/paper-craft";
import {paperObjectSpec} from "../registry/video/paper-object-kit";
import {PaperCraftStage} from "../registry/video/paper-craft-react";

describe("Common kingfisher ArtCraft anatomy reconstruction",()=>{
  const make=(aspect:"landscape"|"portrait"="landscape",palette:"jewel"|"pastel"|"heritage"="jewel")=>
    paperObjectSpec("layered",aspect,{object:"kingfisher",palette,
      detail:1,curl:1,relief:1,motion:.5,seed:37});
  it("has a cohesive anatomically layered silhouette instead of a circular cartoon",()=>{
    for(const aspect of ["landscape","portrait"] as const){
      const spec=make(aspect);
      expect(inspectPaperCraft(spec)).toEqual([]);
      expect(spec.layers.length).toBeGreaterThan(105);
      expect(spec.layers.length).toBeLessThanOrEqual(MAX_PAPER_LAYERS);
      const ids=new Set(spec.layers.map(x=>x.id));
      for(const id of ["kingfisher-body-shadow","kingfisher-back","kingfisher-belly-russet",
        "kingfisher-head","kingfisher-head-brow","kingfisher-eye","kingfisher-pupil",
        "kingfisher-cheek","kingfisher-face-band","kingfisher-throat",
        "kingfisher-beak-upper","kingfisher-beak-lower","kingfisher-nostril",
        "kingfisher-wing-base","kingfisher-wing-coverts","bird-branch-knot",
        "kingfisher-ankle-0","kingfisher-talon-1-2","kingfisher-crown-bar-2"]){
          expect(ids.has(id),id).toBe(true);
        }
      expect(spec.layers.filter(x=>x.id.startsWith("kingfisher-tail-"))).toHaveLength(7);
      expect(spec.layers.filter(x=>x.id.startsWith("wing-feather-"))).toHaveLength(18);
      const primary=spec.layers.filter(x=>x.id.startsWith("wing-feather-"));
      expect(primary.every(x=>x.holes?.length===1)).toBe(true);
      expect(primary.every(x=>x.holes![0].endsWith("Z"))).toBe(true);
      expect(spec.layers.filter(x=>x.id.startsWith("head-crown-feather-"))).toHaveLength(10);
      expect(spec.layers.filter(x=>x.id.startsWith("breast-scale-"))).toHaveLength(12);
      expect(spec.layers.filter(x=>x.id.startsWith("kingfisher-breast-tract-"))).toHaveLength(3);
      expect(spec.layers.filter(x=>x.id.startsWith("back-shingles-"))).toHaveLength(3);
      const html=renderToStaticMarkup(React.createElement(PaperCraftStage,{
        spec,frame:205,shadowStrength:.95,edgeStrength:.55,tooth:.6}));
      expect(html).toContain("data-km-paper-lift-tip");
      expect(html).toContain("data-km-paper-rig");
      expect(html).not.toContain('fill-opacity="0.');
      expect((html.match(/data-km-paper-lift-tip=/g)||[])).toHaveLength(18);
    }
  });
  it("preserves the 18-piece anatomical wing rig with joined tips across random frame seeks",()=>{
    const spec=make();
    for(const frame of [195,221,173,199,205]){
      const state=evaluatePaperCraft(spec,frame);
      const rotations=spec.layers.map((x,i)=>x.rigGroup==="kingfisher-wing"?state.layers[i].rotation:null)
        .filter(x=>x!==null);
      expect(new Set(rotations).size).toBe(1);
    }
    expect(evaluatePaperCraft(spec,194)).toEqual(evaluatePaperCraft(spec,194));
    expect(evaluatePaperCraft(spec,194,true).layers)
      .toEqual(evaluatePaperCraft(spec,219,true).layers);
  });
  it("packs hundreds of feather micro-contours without adding semi-transparent sheets",()=>{
    const spec=make();
    const micro=spec.layers.filter(x=>/^(back-shingles-|kingfisher-crown-bar-|kingfisher-breast-tract-|kingfisher-wing-spot-)/.test(x.id));
    expect(micro).toHaveLength(12);
    for(const layer of micro){
      expect((layer.path.match(/ Z/g)||[]).length).toBeGreaterThanOrEqual(7);
      expect(/^#[0-9A-Fa-f]{6}$/.test(layer.color)).toBe(true);
    }
    expect(new Set(spec.layers.map(x=>x.id)).size).toBe(spec.layers.length);
    expect(make()).toEqual(spec);
  });
  it("cuts asymmetric V-notches into actual feather stock only when detail is requested",()=>{
    const plain=paperObjectSpec("layered","landscape",{
      object:"kingfisher",palette:"jewel",detail:0,curl:1,relief:1,motion:.5,seed:37,
    });
    const intricate=make();
    expect(inspectPaperCraft(plain)).toEqual([]);
    expect(inspectPaperCraft(intricate)).toEqual([]);
    expect(intricate.layers.length).toBe(plain.layers.length);
    const plainFeathers=plain.layers.filter(x=>x.id.startsWith("wing-feather-"));
    const detailedFeathers=intricate.layers.filter(x=>x.id.startsWith("wing-feather-"));
    expect(plainFeathers).toHaveLength(18);
    expect(detailedFeathers).toHaveLength(18);
    for(let i=0;i<18;i++){
      const a=plainFeathers[i],b=detailedFeathers[i];
      // Five shallow V-cuts on each vane edge: three contour segments per cut.
      expect((b.path.match(/L/g)||[]).length-(a.path.match(/L/g)||[]).length).toBe(30);
      expect(a.liftedTip).toEqual(b.liftedTip);
      expect(a.pivot).toEqual(b.pivot);
      expect(a.rigGroup).toBe(b.rigGroup);
      expect(b.path.endsWith("Z")).toBe(true);
      expect(b.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(paperObjectSpec("layered","landscape",{
      object:"kingfisher",detail:1,curl:1,relief:1,motion:.5,seed:37,
    })).toEqual(intricate);
  });
  it("supports jewel, pastel and heritage sheets with equal silhouette topology",()=>{
    const jewel=make("portrait","jewel");
    for(const p of ["pastel","heritage"] as const){
      const stock=make("portrait",p);
      expect(inspectPaperCraft(stock)).toEqual([]);
      expect(stock.layers.map(x=>x.path)).toEqual(jewel.layers.map(x=>x.path));
      expect(stock.layers.map(x=>x.id)).toEqual(jewel.layers.map(x=>x.id));
    }
  });
});