import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST} from "../src/video/riso-human-ensemble";
import {RISO39_INDEX_OPPOSITION} from "../src/video/riso31-finger-phalanges";
import {RISO32_THUMB_GEOMETRY} from "../src/video/riso32-thumb-ip";
import {inspectRiso39OpposedPaperPinch} from "../src/video/riso39-opposed-paper-pinch";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRisoCharacter} from "../registry/video/riso-character";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;
const frames=[0,46,96,126,144,156,159,160,165,166,177,178,185,186,198,205,239];
describe("RISO39 ArtCraft anatomical opposed hand and actual paper-grip pose",()=>{
  it("keeps actual 3-bone index curl inside independently recorded clinical ANAT1 bounds",()=>{
    expect(RISO39_INDEX_OPPOSITION.fullProjectedPipFlex).toBeGreaterThan(80);
    expect(RISO39_INDEX_OPPOSITION.fullProjectedPipFlex)
      .toBeLessThanOrEqual(RISO39_INDEX_OPPOSITION.pipClinicalMax);
    expect(RISO39_INDEX_OPPOSITION.fullProjectedDipFlex)
      .toBeLessThanOrEqual(RISO39_INDEX_OPPOSITION.dipClinicalMax);
    expect(RISO39_INDEX_OPPOSITION.fullProjectedDipFlex).toBeGreaterThan(50);
    expect(RISO32_THUMB_GEOMETRY.ipY).toBeGreaterThan(0);
    expect(RISO32_THUMB_GEOMETRY.rootLength+RISO32_THUMB_GEOMETRY.distalReach)
      .toBeLessThan(10);
  });
  it.each(actors)("%s: index curls toward thumb at true donor and receiver contact",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const side of sides){
      const initial=inspectRiso39OpposedPaperPinch(actor,0,side);
      const contactFrame=side==="right"?160:166;
      const contact=inspectRiso39OpposedPaperPinch(actor,contactFrame,side);
      expect(contact.platePair).toEqual(["red","red"]);
      expect(contact.thumbRootToIp).toBeCloseTo(RISO32_THUMB_GEOMETRY.rootLength,4);
      expect(Math.abs(contact.indexLocalPipCurl),actor.id+"/"+side)
        .toBeGreaterThan(75);
      expect(Math.abs(contact.indexLocalDipCurl)).toBeGreaterThan(50);
      expect(contact.tipDistance,actor.id+"/"+side+" real fingertips not opposed")
        .toBeLessThan(initial.tipDistance*.75);
      expect(contact.tipDistance,actor.id+"/"+side+" thumb misses index at contact")
        .toBeLessThan(12);
      expect(contact.sourceInkGap).toBeGreaterThanOrEqual(0);
      const red=inspectRiso36RedFingerSilhouettes(actor,contactFrame,side);
      expect(red.sourcePartCount).toBe(12);
      // Red finger-to-finger isolation must not be sacrificed in order to
      // visually claim contact with the 5th, opposing thumb.
      expect(red.pairs.every(p=>Number.isFinite(p.distalInkGap))).toBe(true);
      const axes=inspectRiso33HandFan(actor,contactFrame,side);
      expect(axes.intersectingAxisPairs,actor.id+"/"+side+" finger bones cross").toEqual([]);
    }
  });
  it.each(actors)("%s: the source thumb/nail/index stays attached through full contact and release",actor=>{
    for(const side of sides)for(const frame of frames){
      const m=inspectRiso39OpposedPaperPinch(actor,frame,side);
      expect(m.sampledFrame).toBeGreaterThanOrEqual(0);
      expect(m.platePair).toEqual(["red","red"]);
      expect(m.thumbRootToIp).toBeCloseTo(RISO32_THUMB_GEOMETRY.rootLength,4);
      for(const key of ["tipDistance","sourceInkGap","indexLocalMcpCurl","indexLocalPipCurl","indexLocalDipCurl"] as const)
        expect(Number.isFinite(m[key])).toBe(true);
      expect(m.tipDistance).toBeGreaterThan(0);
      expect(m.sourceInkGap).toBeGreaterThanOrEqual(0);
      expect(Math.abs(m.indexLocalPipCurl)).toBeLessThanOrEqual(RISO39_INDEX_OPPOSITION.pipClinicalMax+2);
      expect(Math.abs(m.indexLocalDipCurl)).toBeLessThanOrEqual(RISO39_INDEX_OPPOSITION.dipClinicalMax+2);
      expect(inspectRiso39OpposedPaperPinch(actor,frame,side)).toEqual(m);
    }
  });
});
