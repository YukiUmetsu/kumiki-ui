import {describe,expect,it} from "vitest";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {riso31Inspect} from "../src/video/riso31-finger-phalanges";
import {RISO48_RECEIVER_PROJECTION,riso48ProjectedPivot} from "../src/video/riso48-projected-support";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso42SupportingDigits} from "../src/video/riso42-support-digits-gesture";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {evaluateRisoCharacter} from "../registry/video/riso-character";

describe("RISO48 original receiver 3/4 editorial support-finger projection",()=>{
  it("changes only original receiver ulnar PIP/DIP stations, not clinic angles, source paths or index",()=>{
    const references=COURIER.joints;
    for(const j of references){
      const projected=riso48ProjectedPivot(j);
      if(!/^left-(middle|ring|pinky)-(pip|dip)$/.test(j.id)){
        expect(projected).toBeNull();
        continue;
      }
      expect(projected).not.toBeNull();
      const original=j.keys??[],actual=projected!.keys??[];
      expect(actual).toHaveLength(original.length);
      for(let i=0;i<actual.length;i++){
        expect(actual[i].frame).toBe(original[i].frame);
        expect(actual[i].rotate).toBe(original[i].rotate);
        expect(actual[i].x).toBe(original[i].x);
        expect(actual[i].easing).toBe(original[i].easing);
        const amount=(actual[i].y??0)-(original[i].y??0);
        if(original[i].frame<160)expect(amount).toBe(0);
        else expect(amount).toBeLessThan(0);
      }
    }
    expect(RISO48_RECEIVER_PROJECTION.minimumVisibleBoneRatio).toBeGreaterThan(.5);
  });

  it("physically shortens only the source projection after approach while retaining all red anatomy",()=>{
    const source=riso31Inspect(COURIER,160,"left");
    const rest=riso31Inspect(PAPER_ARTIST,0,"left");
    const contact=riso31Inspect(PAPER_ARTIST,160,"left");
    for(let i=0;i<contact.length;i++){
      expect(contact[i].digit).toBe(source[i].digit);
      if(contact[i].digit==="index"){
        expect(contact[i].rootLength).toBeCloseTo(source[i].rootLength,4);
        expect(contact[i].intermediateLength).toBeCloseTo(source[i].intermediateLength,4);
      }else{
        expect(contact[i].rootLength).toBeLessThan(rest[i].rootLength-1.2);
        expect(contact[i].intermediateLength).toBeLessThan(rest[i].intermediateLength-1.0);
        expect(contact[i].rootLength/rest[i].rootLength).toBeGreaterThan(.57);
        expect(contact[i].intermediateLength/rest[i].intermediateLength).toBeGreaterThan(.57);
      }
      expect(contact[i].exactRedSource).toBe(true);
      expect(contact[i].phalanxPathCount).toBe(3);
    }
    for(const frame of [0,126,144,154,156,160,166,186,205,239]){
      const support=inspectRiso42SupportingDigits(PAPER_ARTIST,frame,"left");
      expect(support.movingRedSourceCount).toBe(9);
      expect(support.digits.every(x=>x.animatedTransformsUnique)).toBe(true);
    }
  });

  it("preserves source centerline white corridors for both actors at the exact 2-frame film cadence",()=>{
    for(const actor of [COURIER,PAPER_ARTIST] as const)
      for(const side of ["left","right"] as const)
        for(let frame=0;frame<240;frame+=2){
          const fan=inspectRiso33HandFan(actor,frame,side);
          expect(fan.intersectingAxisPairs,actor.id+"/"+side+"/"+frame).toEqual([]);
          expect(fan.minimumAxisGap,actor.id+"/"+side+"/"+frame).toBeGreaterThan(3);
        }
  });

  it.each(["landscape","portrait"] as const)("original physical index-over/thumb-under grip remains in %s",aspect=>{
    for(const frame of [160,166]){
      const state=evaluateRisoHumanEnsemble(frame,aspect);
      const donor=inspectRiso44PrintedIndexContact(COURIER,frame,"right",state.first,state.sheet);
      const receiver=inspectRiso44PrintedIndexContact(PAPER_ARTIST,frame,"left",state.second,state.sheet);
      expect(donor.redIndexAreaTouchesPaper).toBe(true);
      expect(receiver.redIndexAreaTouchesPaper).toBe(true);
      expect(receiver.thumbUnderPaper).toBe(true);
      const actor=evaluateRisoCharacter(PAPER_ARTIST,frame);
      expect(actor.parts.filter(p=>p.plate==="red"&&p.id.startsWith("left-glove-")).length)
        .toBeGreaterThanOrEqual(12);
    }
  });
});
