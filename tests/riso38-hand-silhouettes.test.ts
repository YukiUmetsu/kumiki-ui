import {describe,expect,it} from "vitest";
import {flattenRisoSvgPath,risoContourSignedArea} from "../registry/video/riso-path-geometry";
import {evaluateRisoCharacter,inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {RISO31_GEOMETRY,RISO38_SOURCE_SHAPE,riso31FingerParts} from "../src/video/riso31-finger-phalanges";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const fingers=["index","middle","ring","pinky"] as const;
const frames=[0,46,96,126,144,156,160,166,178,186,198,239] as const;

describe("RISO38 / ArtCraft source silhouette craftsmanship",()=>{
  it("uses the photographed anatomy guide for 3 truly differentiated phalanx shapes",()=>{
    expect(RISO38_SOURCE_SHAPE.curveStage).toEqual([
      "proximal-fleshy","intermediate-flat","distal-pulp-wedge"
    ]);
    expect(RISO38_SOURCE_SHAPE.midsectionTaper).toBeLessThan(1);
    expect(RISO38_SOURCE_SHAPE.finalTipTaper).toBeLessThan(1);
    for(const side of sides)for(const finger of fingers){
      const g=RISO31_GEOMETRY[finger];
      const parts=riso31FingerParts(side,finger);
      expect(parts).toHaveLength(3);
      expect(parts.map(p=>p.joint)).toEqual([
        side+"-"+finger,side+"-"+finger+"-pip",side+"-"+finger+"-dip"
      ]);
      expect(parts.map(p=>p.plate)).toEqual(["red","red","red"]);
      expect(parts.map(p=>p.paint)).toEqual(["solid","solid","solid"]);
      for(let i=0;i<3;i++){
        const part=parts[i],contours=flattenRisoSvgPath(part.d,.15);
        expect(contours).toHaveLength(1);
        expect(contours[0].closed,part.id).toBe(true);
        expect(contours[0].points.length,part.id).toBeGreaterThan(8);
        expect((part.d.match(/C/g)??[]).length,part.id).toBeGreaterThanOrEqual(4);
        const inkArea=Math.abs(risoContourSignedArea(contours[0].points));
        expect(inkArea,part.id).toBeGreaterThan(g.width*2.3);
        expect(inkArea,part.id).toBeLessThan(g.width*90);
      }
      expect(new Set(parts.map(p=>p.d)).size).toBe(3);
    }
  });
  it("proportion order preserves actual four unequal digital lengths and widths",()=>{
    const d=RISO31_GEOMETRY;
    expect(d.middle.proximal+d.middle.intermediate+d.middle.distal)
      .toBeGreaterThan(d.index.proximal+d.index.intermediate+d.index.distal);
    expect(d.pinky.proximal+d.pinky.intermediate+d.pinky.distal)
      .toBeLessThan(d.ring.proximal+d.ring.intermediate+d.ring.distal);
    expect(d.middle.width).toBeGreaterThan(d.pinky.width);
  });
  it.each(actors)("%s: all 48 animated red phalanges are the actual authored source, no fake overlays",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const side of sides)for(const finger of fingers){
      const expected=riso31FingerParts(side,finger);
      for(const part of expected){
        const got=actor.parts.find(p=>p.id===part.id);
        expect(got?.joint).toBe(part.joint);
        expect(got?.d).toBe(part.d);
      }
    }
    for(const frame of frames){
      const posed=evaluateRisoCharacter(actor,frame);
      for(const side of sides){
        const red=inspectRiso36RedFingerSilhouettes(actor,frame,side);
        expect(red.sourcePartCount).toBe(12);
        expect(Number.isFinite(red.minimumDistalGap)).toBe(true);
        expect(red.pairs.every(p=>Number.isFinite(p.sourceInkGap))).toBe(true);
        for(const finger of fingers){
          const phalanx=posed.parts.find(p=>p.id===side+"-glove-"+finger+"-distal-phalanx")!;
          expect(phalanx.transform).toMatch(/^matrix\(/);
          expect(phalanx.plate).toBe("red");
        }
      }
    }
  });
});
