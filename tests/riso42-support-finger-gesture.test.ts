import {describe,it,expect} from "vitest";
import {HAND_POSES,JOINTS} from "../registry/anatomy/anatomy-pose";
import {inspectRisoCharacter} from "../registry/video/riso-character";
import {COURIER} from "../src/video/riso-character-demo";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {inspectRiso42SupportingDigits,RISO42_SUPPORT_DIGITS}
  from "../src/video/riso42-support-digits-gesture";
import {RISO42_SUPPORT_CURL} from "../src/video/riso31-finger-phalanges";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso41InkPressure} from "../src/video/riso41-contact-pressure";

const actors=[COURIER,PAPER_ARTIST] as const;
const hands=["left","right"] as const;
describe("RISO42 ArtCraft: three independently curled supporting digits",()=>{
  it("ANAT1 grip geometry is the non-rigid construction reference, not three pasted sticker folds",()=>{
    const grip=HAND_POSES.grip(".R");
    expect(RISO42_SUPPORT_DIGITS).toEqual(["middle","ring","pinky"]);
    const index={middle:3,ring:4,pinky:5} as const;
    for(const digit of RISO42_SUPPORT_DIGITS){
      const finger=index[digit],projection=RISO42_SUPPORT_CURL[digit];
      const maxPip=JOINTS.find(j=>j.id===`finger${finger}-pip`)!.dofs.flex!.max;
      const maxDip=JOINTS.find(j=>j.id===`finger${finger}-dip`)!.dofs.flex!.max;
      const pip=grip[`finger${finger}-pip.R`]!.flex!*projection.pipProjection;
      const dip=grip[`finger${finger}-dip.R`]!.flex!*projection.dipProjection;
      expect(pip).toBeGreaterThan(30);
      expect(pip).toBeLessThan(maxPip*.6);
      expect(dip).toBeGreaterThan(12);
      expect(dip).toBeLessThan(maxDip*.6);
      expect(projection.lateReceiveFactor).toBeGreaterThan(.65);
      expect(projection.lateReceiveFactor).toBeLessThan(.85);
    }
  });
  it.each(actors)("%s: curl support digits rather than leaving 3 red tines extended",actor=>{
    expect(inspectRisoCharacter(actor)).toEqual([]);
    for(const side of hands){
      const relaxed=inspectRiso42SupportingDigits(actor,0,side);
      const contact=inspectRiso42SupportingDigits(actor,side==="left"?166:160,side);
      expect(relaxed.movingRedSourceCount).toBe(9);
      expect(relaxed.meanSupportFlex).toBeCloseTo(0,2);
      expect(contact.meanSupportFlex).toBeGreaterThan(32);
      expect(contact.meanSupportFlex).toBeLessThan(55);
      expect(contact.digits).toHaveLength(3);
      for(const finger of contact.digits){
        expect(finger.sourceRedInkCount).toBe(3);
        expect(finger.animatedTransformsUnique).toBe(true);
        expect(Math.abs(finger.pipAngle)).toBeGreaterThan(30);
        expect(Math.abs(finger.dipAngle)).toBeGreaterThan(12);
      }
      const red=inspectRiso36RedFingerSilhouettes(actor,contact.frame,side);
      expect(red.sourcePartCount).toBe(12);
      expect(red.minimumDistalGap).toBeGreaterThan(0);
    }
  });
  it.each(actors)("%s: no new finger-centerline crossing anywhere in moving 240-frame film",actor=>{
    for(const side of hands){
      for(let frame=0;frame<240;frame+=2){
        const source=inspectRiso42SupportingDigits(actor,frame,side);
        expect(source.movingRedSourceCount).toBe(9);
        expect(source.digits.every(x=>Number.isFinite(x.pipAngle)&&Number.isFinite(x.dipAngle))).toBe(true);
        const fan=inspectRiso33HandFan(actor,frame,side);
        expect(fan.intersectingAxisPairs,actor.id+"/"+side+"/frame"+frame).toEqual([]);
        expect(fan.minimumAxisGap,actor.id+"/"+side+"/frame"+frame).toBeGreaterThan(3);
      }
    }
  });
  it("received paper remains held by thumb/index while support digits settle into palm",()=>{
    for(const frame of [166,178,186,198,205,220,239]){
      const receiver=inspectRiso42SupportingDigits(PAPER_ARTIST,frame,"left");
      const donor=inspectRiso42SupportingDigits(COURIER,frame,"right");
      const grip=evaluateRisoHumanEnsemble(frame);
      const receiverPress=inspectRiso41InkPressure(PAPER_ARTIST,frame,"left");
      expect(receiver.meanSupportFlex).toBeGreaterThan(20);
      expect(grip.receiver).toEqual(grip.paperEnd);
      expect(grip.receiverContactPressure).toBeGreaterThanOrEqual(0);
      expect(grip.receiverInk.pressure).toBeCloseTo(receiverPress.pressure,6);
      if(frame>=205){
        expect(donor.meanSupportFlex).toBeLessThan(9);
        expect(grip.owner).toBe("receiver");
      }
    }
  });
});
