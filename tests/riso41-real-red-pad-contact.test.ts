import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {RISO41_INK_PRESSURE,inspectRiso41InkPressure} from "../src/video/riso41-contact-pressure";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes,riso36ContourClearance,riso36WorldContour} from "../src/video/riso36-red-silhouette-gate";
import {evaluateRisoCharacter} from "../registry/video/riso-character";
import {inspectRiso32ThumbIp,RISO32_THUMB_GEOMETRY} from "../src/video/riso32-thumb-ip";
import {inspectRiso39OpposedPaperPinch} from "../src/video/riso39-opposed-paper-pinch";

const hands=[
  {actor:COURIER,side:"right" as const,peak:160},
  {actor:PAPER_ARTIST,side:"left" as const,peak:166},
];
const aspects=["landscape","portrait"] as const;
describe("RISO41 genuine thumb/index closed-red pad contact / paper pressure",()=>{
  it("uses source-red stencil surface distances, never a hand-root distance",()=>{
    expect(RISO41_INK_PRESSURE.pressGap).toBeGreaterThan(0);
    expect(RISO41_INK_PRESSURE.pressGap).toBeLessThan(RISO41_INK_PRESSURE.releaseGap);
    for(const {actor,side,peak} of hands){
      const open=inspectRiso41InkPressure(actor,0,side);
      const contact=inspectRiso41InkPressure(actor,peak,side);
      expect(contact.inkGap,actor.id+"/"+side+" original red pads STILL not near each other")
        .toBeLessThan(1.5);
      expect(contact.tipDistance,actor.id+"/"+side+" opposed joint tips still detached")
        .toBeLessThan(3.8);
      expect(contact.inkGap).toBeLessThan(open.inkGap*.5);
      expect(contact.tipDistance).toBeLessThan(open.tipDistance*.6);
      expect(contact.pressure).toBeGreaterThan(0);
      expect(contact.pressure).toBeLessThanOrEqual(1);
      expect(contact.inkGap).toBeCloseTo(
        inspectRiso39OpposedPaperPinch(actor,peak,side).sourceInkGap,7);
      expect(open.pressure).toBe(0);
      expect(open.pressureCategory).toBe("open");
      expect(contact.meaning).toMatch(/NOT clinical/);
    }
  });
  it("keeps red thumb, index and palm actually ink-connected at every contact/release cel",()=>{
    // This is real source contour intersection, NOT a count of named SVGs.
    // A bone can be attached while its stamped artwork breaks at a joint.
    for(const {actor,side} of hands){
      for(let frame=126;frame<=205;frame+=2){
        const posed=evaluateRisoCharacter(actor,frame);
        const get=(id:string)=>{
          const p=posed.parts.find(part=>part.id===side+"-"+id);
          if(!p||p.plate!=="red"||p.paint!=="solid")throw new Error("missing source "+id);
          return riso36WorldContour(p.d,p.transform,.25);
        };
        const palm=get("glove");
        const thumb=get("glove-thumb");
        const thumbDistal=get("glove-thumb-distal-phalanx");
        const index=get("glove-index");
        const middle=get("glove-index-middle-phalanx");
        const distal=get("glove-index-distal-phalanx");
        expect(riso36ContourClearance(palm,thumb),actor.id+"/"+side+"/CMC/f"+frame).toBe(0);
        expect(riso36ContourClearance(palm,index),actor.id+"/"+side+"/MCP/f"+frame).toBe(0);
        expect(riso36ContourClearance(thumb,thumbDistal),actor.id+"/"+side+"/IP/f"+frame).toBe(0);
        expect(riso36ContourClearance(index,middle),actor.id+"/"+side+"/PIP/f"+frame).toBe(0);
        expect(riso36ContourClearance(middle,distal),actor.id+"/"+side+"/DIP/f"+frame).toBe(0);
      }
    }
  });
  it("receiver continues to physically pinch the letter after donor releases",()=>{
    for(const frame of [202,205,220,238]){
      const receiver=inspectRiso41InkPressure(PAPER_ARTIST,frame,"left");
      const donor=inspectRiso41InkPressure(COURIER,frame,"right");
      expect(receiver.inkGap,"receiver lost original red paper pinch by f"+frame).toBeLessThan(1.5);
      expect(receiver.tipDistance).toBeLessThan(3.8);
      expect(receiver.pressure).toBeGreaterThan(0);
      expect(donor.inkGap,"donor retained impossible contact after the sheet moved away")
        .toBeGreaterThan(receiver.inkGap);
      const film=evaluateRisoHumanEnsemble(frame);
      expect(film.owner).toBe("receiver");
      expect(film.sourceContactPressure).toBe(0);
      expect(film.receiverContactPressure).toBeGreaterThan(0);
    }
  });
  it("preserves actual ANAT1 thumb-IP and original finger-fan continuity",()=>{
    for(const {actor,side,peak} of hands){
      const ip=inspectRiso32ThumbIp(actor,peak,side);
      expect(ip.rootToIp).toBeCloseTo(RISO32_THUMB_GEOMETRY.rootLength,4);
      expect(ip.independentRedSegments).toBe(true);
      for(let frame=126;frame<=205;frame+=2){
        const red=inspectRiso36RedFingerSilhouettes(actor,frame,side);
        expect(red.sourcePartCount).toBe(12);
        expect(red.pairs.every(p=>Number.isFinite(p.distalInkGap))).toBe(true);
        const fan=inspectRiso33HandFan(actor,frame,side);
        expect(fan.minimumAxisGap,actor.id+"/"+side+" frame "+frame).toBeGreaterThan(3);
        expect(fan.intersectingAxisPairs,actor.id+"/"+side+" frame "+frame).toEqual([]);
      }
    }
  });
  it.each(aspects)("physically embossed paper responds to the real printed pad gap (%s)",aspect=>{
    for(const frame of [0,126,144,156,160,166,178,186,198,205,239]){
      const film=evaluateRisoHumanEnsemble(frame,aspect);
      for(const [person,ink,pressure] of [
        [COURIER,film.donorInk,film.sourceContactPressure],
        [PAPER_ARTIST,film.receiverInk,film.receiverContactPressure],
      ] as const){
        expect(ink.actor).toBe(person.id);
        expect(pressure).toBeGreaterThanOrEqual(0);
        expect(pressure).toBeLessThanOrEqual(1.00001);
        expect(pressure).toBeLessThanOrEqual(ink.pressure+1e-8);
        expect(Number.isFinite(ink.inkGap)).toBe(true);
      }
      if(frame===0||frame===126)expect(film.receiverContactPressure).toBe(0);
      if(frame>=205)expect(film.sourceContactPressure).toBe(0);
    }
    const f160=evaluateRisoHumanEnsemble(160,aspect);
    expect(f160.sourceTouching).toBe(true);
    expect(f160.receiverTouching).toBe(true);
    // Visual-only quality cannot be certified by a proximity metric,
    // but the original print creases must actually depend on that metric.
    expect(f160.sourceContactPressure).toBeCloseTo(f160.donorInk.pressure,6);
    expect(f160.receiverContactPressure).toBeCloseTo(f160.receiverInk.pressure,6);
    expect(f160.sheet).toMatch(/^M.+Z$/);
    const saved=f160;
    evaluateRisoHumanEnsemble(239,aspect);
    expect(evaluateRisoHumanEnsemble(160,aspect)).toEqual(saved);
  });
});
