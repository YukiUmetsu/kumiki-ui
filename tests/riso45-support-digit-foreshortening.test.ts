import {describe,expect,it} from "vitest";
import {PAPER_ARTIST,evaluateRisoHumanEnsemble} from "../src/video/riso-human-ensemble";
import {COURIER} from "../src/video/riso-character-demo";
import {inspectRiso42SupportingDigits} from "../src/video/riso42-support-digits-gesture";
import {inspectRiso33HandFan} from "../src/video/riso33-hand-negative-space";
import {inspectRiso36RedFingerSilhouettes} from "../src/video/riso36-red-silhouette-gate";
import {inspectRiso44PrintedIndexContact} from "../src/video/riso44-source-index-paper-contact";
import {RISO42_SUPPORT_CURL} from "../src/video/riso31-finger-phalanges";
import {HAND_POSES,JOINTS} from "../registry/anatomy/anatomy-pose";
import {evaluateRisoCharacter} from "../registry/video/riso-character";

const actors=[COURIER,PAPER_ARTIST] as const;
const sides=["left","right"] as const;

describe("RISO45 ArtCraft early support-digit foreshortening at true sheet contact",()=>{
  it("uses stronger but bounded ANAT1 PIP/DIP, asymmetrically by actual digit",()=>{
    const n={middle:3,ring:4,pinky:5} as const;
    for(const digit of ["middle","ring","pinky"] as const){
      const c=RISO42_SUPPORT_CURL[digit],i=n[digit];
      const grip=HAND_POSES.grip(".R");
      const pip=grip[`finger${i}-pip.R`]!.flex!*c.pipProjection;
      const dip=grip[`finger${i}-dip.R`]!.flex!*c.dipProjection;
      expect(pip).toBeGreaterThan(37);
      expect(pip).toBeLessThan(JOINTS.find(j=>j.id===`finger${i}-pip`)!.dofs.flex!.max*.6);
      expect(dip).toBeGreaterThan(18);
      expect(dip).toBeLessThan(JOINTS.find(j=>j.id===`finger${i}-dip`)!.dofs.flex!.max*.6);
    }
  });
  it("receiver support fingers are already tucked at initial paper contact, not six frames late",()=>{
    for(const actor of actors){
      const f0=inspectRiso42SupportingDigits(actor,0,"left");
      const f154=inspectRiso42SupportingDigits(actor,154,"left");
      const f160=inspectRiso42SupportingDigits(actor,160,"left");
      const f166=inspectRiso42SupportingDigits(actor,166,"left");
      expect(f0.meanSupportFlex).toBeCloseTo(0,4);
      expect(f154.meanSupportFlex).toBeGreaterThan(15);
      expect(f160.meanSupportFlex).toBeGreaterThan(37);
      expect(f160.meanSupportFlex).toBeLessThan(55);
      expect(f166.meanSupportFlex).toBeGreaterThan(35);
      expect(f160.meanSupportFlex-f166.meanSupportFlex).toBeLessThan(3);
      expect(f160.movingRedSourceCount).toBe(9);
      expect(f160.digits.every(x=>x.animatedTransformsUnique)).toBe(true);
    }
  });
  it("Paper Artist's *actual MCP source bones* tuck support under paper, independently of Courier",()=>{
    const sample=(actor:typeof COURIER|typeof PAPER_ARTIST)=>{
      const pose=evaluateRisoCharacter(actor,160);
      const map=new Map(pose.joints.map(j=>[j.id,j]));
      const hand=map.get("left-hand")!;
      return (["middle","ring","pinky"] as const).map(d=>{
        const j=map.get("left-"+d)!;
        return ((j.angle-hand.angle+540)%360)-180;
      });
    };
    const artist=sample(PAPER_ARTIST),courier=sample(COURIER);
    expect(artist[0]).toBeGreaterThan(25);
    expect(artist[1]).toBeGreaterThan(15);
    expect(artist[2]).toBeGreaterThan(9);
    expect(artist[0]).toBeGreaterThan(artist[1]);
    expect(artist[1]).toBeGreaterThan(artist[2]);
    for(let i=0;i<3;i++)
      expect(artist[i]-courier[i]).toBeGreaterThan(20);
  });
  it.each(actors)("%s: protect all real finger-axis paper-white tunnels in the complete film",actor=>{
    for(const side of sides)for(let frame=0;frame<240;frame+=2){
      const fan=inspectRiso33HandFan(actor,frame,side);
      expect(fan.intersectingAxisPairs,actor.id+"/"+side+"/"+frame).toEqual([]);
      expect(fan.minimumAxisGap,actor.id+"/"+side+"/"+frame).toBeGreaterThan(3);
      const support=inspectRiso42SupportingDigits(actor,frame,side);
      expect(support.movingRedSourceCount).toBe(9);
      expect(support.digits.every(x=>Number.isFinite(x.pipAngle)&&Number.isFinite(x.dipAngle)))
        .toBe(true);
    }
  });
  it.each(["landscape","portrait"] as const)("%s: live page-edge contact and source two-ink occlusion survive the improved support curls",aspect=>{
    for(const frame of [160,166,177,186,202,239]){
      const film=evaluateRisoHumanEnsemble(frame,aspect);
      const source=inspectRiso44PrintedIndexContact(COURIER,frame,"right",
        film.first,film.sheet);
      const receiver=inspectRiso44PrintedIndexContact(PAPER_ARTIST,frame,"left",
        film.second,film.sheet);
      expect(source.thumbUnderPaper).toBe(true);
      expect(receiver.thumbUnderPaper).toBe(true);
      expect(source.indexRedSourceCount).toBe(3);
      expect(receiver.indexRedSourceCount).toBe(3);
      if(frame===160||frame===166){
        expect(source.redIndexAreaTouchesPaper).toBe(true);
        expect(receiver.redIndexAreaTouchesPaper).toBe(true);
      }
      const red=inspectRiso36RedFingerSilhouettes(PAPER_ARTIST,frame,"left");
      expect(red.sourcePartCount).toBe(12);
    }
  });
});
