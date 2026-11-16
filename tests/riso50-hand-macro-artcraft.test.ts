import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO50_MCP_PLANES} from "../src/video/riso37-anatomical-engraving";
import {RISO50_PALM_CRAFT,riso47PalmContour} from "../src/video/riso47-palmar-cup";
import {riso31Inspect} from "../src/video/riso31-finger-phalanges";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const contactFrames=[144,154,156,160,166,178,186,205] as const;

describe("RISO50 ArtCraft: real tilted MCP planes and carpal wrist contour",()=>{
  it("reconstructs a connected, asymmetric 16-cubic RED palm without dropping a source mark",()=>{
    expect(RISO50_PALM_CRAFT.authoredCubicCount).toBe(16);
    for(const actor of actors)for(const side of sides){
      expect(inspectRisoCharacter(actor)).toEqual([]);
      const glove=actor.parts.find(p=>p.id===side+"-glove")!;
      expect(glove.joint).toBe(side+"-hand");
      expect(glove.plate).toBe("red");
      expect(glove.paint).toBe("solid");
      expect(glove.d).toBe(riso47PalmContour(actor.id as "courier"|"paper-artist",side));
      expect((glove.d.match(/C/g)??[])).toHaveLength(16);
      const shape=flattenRisoSvgPath(glove.d,.12);
      expect(shape).toHaveLength(1);
      expect(shape[0].closed).toBe(true);
      expect(shape[0].points.length).toBeGreaterThan(40);
      expect(Math.abs(risoContourSignedArea(shape[0].points))).toBeGreaterThan(180);
      for(const p of ["thenar-plane","thenar-fold","knuckle-arc","wrist-crease"]){
        expect(actor.parts.find(q=>q.id===side+"-glove-"+p)?.d.length).toBeGreaterThan(24);
      }
    }
  });

  it("substitutes four source-printed oblique MCP facet contours for four smiling eyebrow arches",()=>{
    for(const actor of actors)for(const side of sides){
      const seeds=RISO50_MCP_PLANES[actor.id as "courier"|"paper-artist"];
      expect(seeds).toHaveLength(4);
      expect(new Set(seeds.map(seed=>seed[3]>0?"positive":"negative")).size).toBe(2);
      const ink=actor.parts.find(p=>p.id===side+"-glove-knuckle-arc")!;
      expect(ink.joint).toBe(side+"-palm-surface");
      expect(ink.plate).toBe("blue");
      expect(ink.paint).toBe("solid");
      const contours=flattenRisoSvgPath(ink.d,.1);
      expect(contours).toHaveLength(4);
      contours.forEach((contour,index)=>{
        expect(contour.closed).toBe(true);
        // A compact <3.2-unit authentic print facet correctly flattens
        // into 10 samples at .1 precision; retain geometric density and
        // independently count all 4 original cubic shape bends below.
        expect(contour.points.length).toBeGreaterThanOrEqual(8);
        const area=Math.abs(risoContourSignedArea(contour.points));
        expect(area).toBeGreaterThan(.08);
        expect(area).toBeLessThan(4.5);
        const xs=contour.points.map(p=>p[0]);
        const width=Math.max(...xs)-Math.min(...xs);
        expect(width).toBeGreaterThan(1.3);
        // Existing RISO37 had four near-identical 3.7-unit
        // giant arcs. This is NOT a deleted embellishment: each
        // narrower oblique etched facet retains 4+ authored cubics.
        expect(width).toBeLessThan(3.2);
        expect(Math.abs(seeds[index][3])).toBeGreaterThan(.2);
      });
      expect(ink.d.match(/C/g)?.length).toBe(16);
    }
  });

  it("deepens all six true original PIP/DIP projection stations, without shortening the INDEX pinch",()=>{
    for(const [actor,side] of [[COURIER,"right"],[PAPER_ARTIST,"left"]] as const){
      const before=riso31Inspect(actor,0,side);
      const after=riso31Inspect(actor,160,side);
      for(let i=0;i<4;i++){
        const original=before[i],projected=after[i];
        if(projected.digit==="index"){
          expect(projected.rootLength).toBeCloseTo(original.rootLength,2);
          expect(projected.intermediateLength).toBeCloseTo(original.intermediateLength,2);
        }else{
          const rootRatio=projected.rootLength/original.rootLength;
          const midRatio=projected.intermediateLength/original.intermediateLength;
          expect(rootRatio).toBeGreaterThan(.58);
          expect(midRatio).toBeGreaterThan(.58);
          expect(rootRatio).toBeLessThan(.8);
          expect(midRatio).toBeLessThan(.8);
        }
        expect(projected.exactRedSource).toBe(true);
      }
    }
  });

  it("keeps both actual ink plates, every individual finger source and page-edge holding contract",()=>{
    for(const actor of actors)for(const side of sides)for(const frame of contactFrames){
      const sample=evaluateRisoCharacter(actor,frame);
      const selected=sample.parts.filter(p=>p.id.startsWith(side+"-glove"));
      expect(new Set(selected.map(x=>x.plate))).toEqual(new Set(["red","blue"]));
      expect(sample.parts.find(p=>p.id===side+"-glove")?.d.match(/C/g)?.length).toBe(16);
      expect(inspectRiso36RedFingerSilhouettes(actor,frame,side).sourcePartCount).toBe(12);
      expect(inspectRiso33HandFan(actor,frame,side).minimumAxisGap).toBeGreaterThan(3);
    }
    for(const aspect of ["landscape","portrait"] as const)for(const frame of [160,166]){
      const film=evaluateRisoHumanEnsemble(frame,aspect);
      for(const [actor,side,placement] of [
        [COURIER,"right",film.first],
        [PAPER_ARTIST,"left",film.second],
      ] as const){
        const grip=inspectRiso44PrintedIndexContact(actor,frame,side,placement,film.sheet);
        expect(grip.redIndexAreaTouchesPaper).toBe(true);
        expect(grip.thumbUnderPaper).toBe(true);
      }
    }
  });
});
